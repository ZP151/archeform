import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanRequestedPreview } from "../apps/workbench/lib/product-journey/preview-cleanup";
import { normalizeReleaseDiagnosisCode } from "../apps/workbench/lib/product-journey/release-diagnosis";
import { factoryClarificationDefault } from "../packages/adapters/src/requirements/clarification-policy";

/**
 * Honest Requirement-to-Product Closure browser acceptance: two unrelated
 * free-form prompts, each starting from an empty workspace with no Profile or
 * starter selection, must yield a runnable product through the whole release
 * pipeline — publish the Draft as an immutable revision, compile the
 * Published Graph, run isolated verification (every declared role journey
 * plus an authorization denial, all visible in the count-first evidence),
 * boot the composed product as a local preview, and clean the preview up
 * (containers, network, volume, and artifact directory).
 *
 * Task 1 pins the reopened boundary: the fixed Expense replay (guided
 * template) is gone, and the requirement composer is the default Home
 * decision. Task 8 extends both scenarios across the full release pipeline
 * driven entirely from the new Release surface.
 *
 * Requires the factory compose stack (project `factory-pilot`) with rebuilt
 * workbench / control-plane / compiler-worker images.
 */

/** Prompt A — Expense Approval (free-form requirement). */
const expenseApprovalBrief = [
  "Build an expense approval application. Employees submit expenses with",
  "amount, category, date, receipt, and notes. Managers approve or reject",
  "them, and finance can audit all decisions.",
].join(" ");

/** Prompt B — Appointment Booking (free-form requirement). */
const appointmentBookingBrief = [
  "Build an appointment booking application. Customers choose a service and",
  "an available time, staff confirm or reschedule appointments, and",
  "administrators manage services, schedules, and cancellations.",
].join(" ");

const acceptanceClarificationAnswers = {
  "prompt-a": [
    "Employees submit expenses in USD. Managers approve or reject every",
    "submitted expense with no amount threshold. Finance has read-only access",
    "to every decision and its audit history. Use local authentication.",
  ].join(" "),
  "prompt-b": [
    "Use the venue's local time zone, 30-minute appointment slots, and business",
    "hours from 09:00 to 17:00. Prevent double-booking. Customers book, view,",
    "reschedule, and cancel only their own appointments up to 24 hours before",
    "the start time. Staff confirm or reschedule assigned appointments.",
    "Administrators manage all services, schedules, users, and cancellations.",
    "Use local email authentication, simulated in-app notifications, and retain",
    "appointment and audit records indefinitely for this prototype.",
  ].join(" "),
} as const;

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const factoryE2eControlPlaneUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const localVerificationObserverFixture =
  process.env.FACTORY_E2E_LOCAL_VERIFICATION_OBSERVER === "1";
const promptBOnlyJourney = process.env.FACTORY_E2E_PROMPT_B_ONLY === "1";
const themeEvidenceOnly = process.env.FACTORY_E2E_THEME_EVIDENCE_ONLY === "1";
const REQUIREMENT_OBSERVER_TIMEOUT_MS = 570_000;
const PRODUCT_JOURNEY_TIMEOUT_MS = 1_800_000;
const PLAN_OBSERVER_TIMEOUT_MS = PRODUCT_JOURNEY_TIMEOUT_MS;

/**
 * Acceptance-evidence screenshots: every acceptance surface at the desktop
 * and narrow viewports, stored under docs/acceptance/evidence.
 */
const evidenceRoot = resolve(process.cwd(), "docs/acceptance/evidence");

const evidenceViewports = [
  { label: "1440x900", width: 1440, height: 900 },
  { label: "1024x768", width: 1024, height: 768 },
];

async function captureSurface(page: Page, name: string): Promise<void> {
  await mkdir(evidenceRoot, { recursive: true });
  for (const viewport of evidenceViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.screenshot({
      path: resolve(evidenceRoot, `${name}-${viewport.label}.png`),
    });
  }
}

// Both scenarios share the compose stack and mutate the same database; run
// them serially so Prompt B's assertions can rely on Prompt A's outcomes.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (localVerificationObserverFixture && !themeEvidenceOnly) return;
  expect(
    process.env.FACTORY_E2E_ISOLATED,
    "Golden-path acceptance requires an explicitly isolated factory stack.",
  ).toBe("1");
  expect(
    factoryE2eProject,
    "Golden-path acceptance requires a run-scoped Compose project.",
  ).toMatch(/^factory-t9-[a-z0-9-]+$/);
  expect(factoryE2eProject).not.toBe("factory-pilot");
  const postgresContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryE2eProject}`,
    "--filter",
    "label=com.docker.compose.service=postgres",
    "--quiet",
  ]);
  expect(postgresContainer, "isolated PostgreSQL container").toMatch(/\S/);
  await expect
    .poll(
      () =>
        dockerOutput([
          "inspect",
          "--format",
          "{{.State.Health.Status}}",
          postgresContainer,
        ]),
      { timeout: 120_000 },
    )
    .toBe("healthy");
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(controlPlaneUrl("/health"))).ok;
        } catch {
          return false;
        }
      },
      { timeout: 120_000 },
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        dockerOutput([
          "exec",
          postgresContainer,
          "psql",
          "-U",
          "factory",
          "-d",
          "factory_pilot",
          "-Atc",
          `SELECT to_regclass('"ApplicationGraph"') IS NOT NULL;`,
        ]),
      { timeout: 120_000 },
    )
    .toBe("t");
  const graphCount = dockerOutput([
    "exec",
    postgresContainer,
    "psql",
    "-U",
    "factory",
    "-d",
    "factory_pilot",
    "-Atc",
    'SELECT COUNT(*) FROM "ApplicationGraph";',
  ]);
  expect(graphCount, "isolated acceptance database must start empty").toBe("0");
});

// Prompt A's Published Graph hash, captured for the cross-test inequality:
// Prompt B must prove the two prompts produced materially different Graphs,
// not two copies of one template.
let promptAPublishedGraphHash: string | undefined;

function expectPromptBGraphOutcome(
  promptAHash: string | undefined,
  promptBHash: string,
  promptBOnly: boolean,
): void {
  expect(promptBHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  if (promptBOnly) {
    expect(promptAHash).toBeUndefined();
    return;
  }
  expect(promptAHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(promptBHash).not.toBe(promptAHash);
}

/**
 * Opens the Workbench and proves the primary frame offers the free-form
 * requirement composer — and no Profile card, starter, or guided template.
 */
async function openRequirementComposer(page: Page): Promise<void> {
  await page.goto("/");
  // The compose stack starts the control plane cold; the workbench retries
  // its bootstrap on a bounded schedule, so allow the full cold-boot window.
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByLabel("Requirement brief")).toBeVisible();
  await expect(page.getByTestId(/guided-template-/)).toHaveCount(0);
}

async function expectVisibleKeyboardFocus(
  page: Page,
  target: Locator,
): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      await expect(target).toBeFocused();
      const focus = await target.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          focusVisible: element.matches(":focus-visible"),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
      expect(focus.focusVisible).toBe(true);
      expect(focus.outlineStyle).not.toBe("none");
      expect(focus.outlineWidth).not.toBe("0px");
      return;
    }
  }
  throw new Error("Primary action was not reachable by keyboard Tab.");
}

async function closeVisibleInspector(page: Page): Promise<void> {
  const inspector = page.getByLabel("Inspector", { exact: true });
  if (!(await inspector.isVisible())) return;

  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await expect(inspector).toBeHidden();
}

async function proveRetainedThemeControl(page: Page): Promise<void> {
  const workbench = page.locator("main.workbench");
  await expect(workbench).toHaveAttribute("data-theme", "light");
  await closeVisibleInspector(page);
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(workbench).toHaveAttribute("data-theme", "dark");
  await captureSurface(page, "prompt-a-theme-dark");
  await page.reload();
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.locator("main.workbench")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await closeVisibleInspector(page);
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page.locator("main.workbench")).toHaveAttribute(
    "data-theme",
    "light",
  );
}

function shouldProveRetainedThemeControl(slug: string): boolean {
  return slug === "prompt-a";
}

async function interpretBrief(
  page: Page,
  brief: string,
  slug: string,
): Promise<void> {
  const interpret = page.getByRole("button", {
    name: "Interpret requirement",
    exact: true,
  });
  if (shouldProveRetainedThemeControl(slug)) {
    await proveRetainedThemeControl(page);
  }
  // Requirement-surface evidence is captured while the composer is blank.
  // Raw briefs and provider material must never enter acceptance screenshots.
  await captureSurface(page, `${slug}-requirement`);
  // Exactly one initial provider call per prompt. A rejected model proposal
  // fails this acceptance run; retrying would hide stochastic product quality.
  await submitRequirementOnce(
    page,
    brief,
    REQUIREMENT_OBSERVER_TIMEOUT_MS,
    interpret,
  );
}

const requirementFailureCodes = new Set([
  "requirement.request_invalid",
  "requirement.output_invalid",
  "requirement.provider_rejected",
  "requirement.provider_not_configured",
  "requirement.provider_unavailable",
  "requirement.timeout",
  "requirement.failed",
]);

async function waitForRequirementOutcome(
  page: Page,
  timeoutMs = REQUIREMENT_OBSERVER_TIMEOUT_MS,
): Promise<void> {
  const accepted = page.locator(
    'section[aria-label="Product creation"][data-requirement-outcome="accepted"]',
  );
  const failed = page.locator(
    'section[aria-label="Product creation"][data-requirement-outcome="failed"]',
  );
  const outcome = await Promise.race([
    accepted.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "accepted" as const,
      () => "timeout" as const,
    ),
    failed.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "failed" as const,
      () => "timeout" as const,
    ),
  ]);
  if (outcome === "accepted") return;
  if (outcome === "failed") {
    const candidate = await failed.getAttribute(
      "data-requirement-failure-code",
    );
    const code =
      candidate !== null && requirementFailureCodes.has(candidate)
        ? candidate
        : "requirement.failed";
    throw new Error(`Requirement interpretation failed (${code}).`);
  }
  throw new Error("Requirement interpretation failed (requirement.timeout).");
}

async function submitRequirementOnce(
  page: Page,
  brief: string,
  timeoutMs = REQUIREMENT_OBSERVER_TIMEOUT_MS,
  interpret = page.getByRole("button", {
    name: "Interpret requirement",
    exact: true,
  }),
): Promise<void> {
  await page.getByLabel("Requirement brief").fill(brief);
  await expectVisibleKeyboardFocus(page, interpret);
  await interpret.click();
  await waitForRequirementOutcome(page, timeoutMs);
}

/**
 * Drives the journey past the requirement summary: answers clarifying
 * questions when the interpreter asks them, chooses a plan alternative, and
 * applies the approved Diff to the blank Draft. Ends with the composed
 * product open in the studio.
 */
/**
 * Bounded visibility check. A bare locator.isVisible()/isEnabled() has no
 * deadline of its own: if the workbench renderer's main thread ever blocks
 * (real-model payload rendering, runaway effect), the evaluate hangs with no
 * timeout and the 250s wall-clock round cap never fires — the acceptance run
 * then stalls until the 40-minute test timeout (seen 2026-08-09 23:18 run:
 * killed at line 201 after three clarification rounds). waitFor honors its
 * timeout client-side, so every poll stays bounded against a frozen page.
 */
async function visibleWithin(
  locator: Locator,
  timeoutMs: number,
): Promise<boolean> {
  return locator.waitFor({ state: "visible", timeout: timeoutMs }).then(
    () => true,
    () => false,
  );
}

async function waitForVerificationOutcome(
  workspace: Locator,
  timeoutMs = 910_000,
): Promise<Locator> {
  const summary = workspace.locator(".release-evidence-summary");
  const failure = workspace.locator(".release-failure-card");
  const outcome = await Promise.race([
    summary
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => "succeeded" as const),
    failure
      .waitFor({ state: "visible", timeout: timeoutMs })
      .then(() => "failed" as const),
  ]);
  if (outcome === "failed") {
    const diagnosis =
      (
        await failure
          .locator(".release-diagnosis")
          .textContent()
          .catch(() => null)
      )?.trim() ?? "";
    const boundedDiagnosis = normalizeReleaseDiagnosisCode(diagnosis);
    throw new Error(`Isolated verification failed (${boundedDiagnosis}).`);
  }
  return summary;
}

async function waitForCompilationOutcome(
  workspace: Locator,
  timeoutMs = 315_000,
): Promise<Locator> {
  const verify = workspace.getByRole("button", {
    name: "Run Isolated Verification",
    exact: true,
  });
  const failure = workspace.locator(".release-failure-card");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    verify.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "succeeded" as const,
      () => "timeout" as const,
    ),
    failure.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "failed" as const,
      () => "timeout" as const,
    ),
    new Promise<"timeout">((resolveTimeout) => {
      timeout = setTimeout(() => resolveTimeout("timeout"), timeoutMs);
    }),
  ]);
  if (timeout !== undefined) clearTimeout(timeout);
  if (outcome === "succeeded") return verify;
  let code = "compilation.timeout";
  if (outcome === "failed") {
    const diagnosis =
      (
        await failure
          .locator(".release-diagnosis")
          .textContent()
          .catch(() => null)
      )?.trim() ?? "";
    code =
      diagnosis === "compilation.failed" || diagnosis === "compilation.timeout"
        ? diagnosis
        : "compilation.failed";
  }
  throw new Error(`Compilation did not reach success (${code}).`);
}

const planFailurePhases = new Set(["clarification", "review", "planning"]);
const planFailureCodes = new Set([
  "requirement.request_invalid",
  "requirement.output_invalid",
  "requirement.provider_rejected",
  "requirement.provider_not_configured",
  "requirement.provider_unavailable",
  "requirement.timeout",
  "requirement.failed",
  "journey.interpretation_cycle_bound",
  "journey.clarification_exhausted",
  "composition.request_envelope_invalid",
  "composition.request_identity_invalid",
  "composition.requirement_invalid",
  "composition.blueprint_invalid",
  "composition.requirement_blueprint_checksum_mismatch",
  "product.review_timeout",
  "product.review_reconciliation_timeout",
  "product.planning_timeout",
  "product.planning_reconciliation_timeout",
  "product.not_found",
  "product.conflict",
  "product.unavailable",
  "product.failed",
]);

async function waitForPlanOutcome(
  page: Page,
  timeoutMs = PLAN_OBSERVER_TIMEOUT_MS,
): Promise<Locator> {
  const choose = page.getByRole("button", { name: /^Choose / }).first();
  const failure = page.locator(
    'section[aria-label="Product creation"][data-journey-outcome="failed"]',
  );
  const outcome = await Promise.race([
    choose.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "ready" as const,
      () => "timeout" as const,
    ),
    failure.waitFor({ state: "visible", timeout: timeoutMs }).then(
      () => "failed" as const,
      () => "timeout" as const,
    ),
  ]);
  if (outcome === "ready") return choose;
  if (outcome === "failed") {
    const phase = await failure.getAttribute("data-journey-failure-phase");
    const candidate = await failure.getAttribute("data-journey-failure-code");
    const code =
      phase !== null &&
      planFailurePhases.has(phase) &&
      candidate !== null &&
      planFailureCodes.has(candidate)
        ? candidate
        : "product.failed";
    throw new Error(`Product journey failed (${code}).`);
  }
  throw new Error("Product journey failed (product.planning_timeout).");
}

async function acceptPlanAndCompose(page: Page, slug: string): Promise<void> {
  // The interpreter may ask clarifying questions before proposing plans. Each
  // Continue is another genuine real-provider interpretation (~70-80s), so
  // the journey permits one user-visible clarification and at most two total
  // interpretation cycles. Answer every open question once, then wait for a
  // plan or the journey's bounded critical-ambiguity failure.
  const continueClarifying = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  const questionInputs = page.locator("ol.clarification-questions input");
  if (await visibleWithin(continueClarifying, 15_000)) {
    const questionCount = await questionInputs.count();
    for (let index = 0; index < questionCount; index += 1) {
      const input = questionInputs.nth(index);
      const question =
        (await input.evaluate((element) =>
          element instanceof HTMLInputElement
            ? element.labels?.item(0)?.textContent
            : undefined,
        )) ?? "";
      const answer =
        factoryClarificationDefault({
          key: (await input.getAttribute("aria-label")) ?? "missing-key",
          category: (await input.getAttribute(
            "data-clarification-category",
          )) as
            | "experience.visual-style"
            | "authorization"
            | "visibility"
            | "role"
            | "business-rule"
            | "data"
            | "integration",
          defaultPolicy: (await input.getAttribute(
            "data-clarification-default-policy",
          )) as "factory-standard-visual" | "required",
          question,
        }) ??
        acceptanceClarificationAnswers[
          slug as keyof typeof acceptanceClarificationAnswers
        ];
      if (!answer) throw new Error("No bounded acceptance answer is defined.");
      await input.fill(answer);
    }
    await continueClarifying.click();
    await expect(continueClarifying).toBeDisabled({ timeout: 10_000 });
  }
  const choose = await waitForPlanOutcome(page);
  await captureSurface(page, `${slug}-plan`);
  await choose.click();
  const apply = page.getByRole("button", { name: "Apply to Draft" });
  await expect(apply).toBeVisible({ timeout: 60_000 });
  await expect(apply).toBeEnabled({ timeout: 60_000 });
  await apply.click();
  // The composed product opens as the active local Draft in the studio.
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible({
    timeout: 90_000,
  });
  await captureSurface(page, `${slug}-studio`);
  // Simulation: the Flow surface mounts the RoleSimulator for the open
  // composed Draft; return to the Page surface afterwards.
  await page.getByRole("button", { name: "Flow", exact: true }).click();
  await expect(page.getByLabel("Role simulator")).toBeVisible();
  await captureSurface(page, `${slug}-simulation`);
  await page.getByRole("button", { name: "Page", exact: true }).click();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
}

type PublishedRevisionResponse = {
  readonly id: string;
  readonly graphHash: string;
};

type CompilationResponse = {
  readonly id: string;
  readonly publishedRevisionId: string;
};

type PreviewRunResponse = {
  readonly id: string;
  readonly compilationId?: string;
  readonly composeProjectName?: string;
  readonly status?: string;
  readonly webPort?: number | null;
  readonly apiPort?: number | null;
};

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function dockerExitCode(args: readonly string[]): 0 | 1 {
  const result = spawnSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status === 0 || result.status === 1) return result.status;
  throw new Error("Docker command failed while checking preview cleanup.");
}

function controlPlaneUrl(path: string): string {
  if (!factoryE2eControlPlaneUrl) {
    throw new Error(
      "FACTORY_E2E_CONTROL_PLANE_URL is required for isolated acceptance.",
    );
  }
  return new URL(path, `${factoryE2eControlPlaneUrl}/`).toString();
}

function previewIdentity(value: unknown): {
  readonly previewRunId: string;
  readonly composeProjectName: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  const composeProjectName = (value as Record<string, unknown>)
    .composeProjectName;
  if (typeof id !== "string" || !/^preview-[a-z0-9-]+$/.test(id)) {
    return null;
  }
  return {
    previewRunId: id,
    composeProjectName:
      typeof composeProjectName === "string"
        ? composeProjectName
        : `factory-preview-${id}`,
  };
}

async function currentPreviewIdentity(
  compilationId: string,
): Promise<ReturnType<typeof previewIdentity>> {
  const response = await fetch(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
    ),
  );
  if (!response.ok) return null;
  return previewIdentity(await response.json().catch(() => null));
}

async function recoverPreviewIdentity(
  compilationId: string,
): Promise<NonNullable<ReturnType<typeof previewIdentity>>> {
  let recovered: ReturnType<typeof previewIdentity> = null;
  await expect
    .poll(
      async () => {
        recovered = await currentPreviewIdentity(compilationId);
        return recovered?.previewRunId ?? null;
      },
      { timeout: 120_000 },
    )
    .toMatch(/^preview-[a-z0-9-]+$/);
  if (recovered === null) {
    throw new Error("Preview cleanup could not recover the requested run.");
  }
  return recovered;
}

async function requestPreviewStop(previewRunId: string): Promise<void> {
  const response = await fetch(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(previewRunId)}/stop`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) {
    throw new Error("Control Plane preview cleanup request failed.");
  }
}

function previewResourceState(
  previewRunId: string,
  composeProjectName: string,
): Record<"artifact" | "containers" | "networks" | "volumes", string> {
  if (!factoryE2eProject) {
    throw new Error(
      "FACTORY_E2E_FACTORY_PROJECT is required for isolated preview cleanup checks.",
    );
  }
  const workerContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryE2eProject}`,
    "--filter",
    "label=com.docker.compose.service=compiler-worker",
    "--quiet",
  ]);
  expect(workerContainer).toMatch(/\S/);
  return {
    artifact:
      dockerExitCode([
        "exec",
        workerContainer,
        "test",
        "-d",
        `/artifacts/.preview-runs/${previewRunId}`,
      ]) === 0
        ? "present"
        : "",
    containers: dockerOutput([
      "ps",
      "--all",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    networks: dockerOutput([
      "network",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    volumes: dockerOutput([
      "volume",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
  };
}

/**
 * Proves the preview was cleaned up: no container, network, or volume of the
 * preview's compose project remains, and the worker's artifact directory for
 * the run is gone.
 */
async function expectPreviewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): Promise<void> {
  await expect
    .poll(() => previewResourceState(previewRunId, composeProjectName), {
      timeout: 120_000,
    })
    .toEqual({ artifact: "", containers: "", networks: "", volumes: "" });
}

/**
 * Drives the Release surface through the full pipeline: publish -> compile
 * -> isolated verification (role journeys + authorization denial in the
 * count-first evidence, step details behind the Activity sheet) -> preview
 * -> Docker cleanup.
 */
async function releaseTheProduct(page: Page, slug: string): Promise<string> {
  // The rail item and the release workspace both carry the "Release" label;
  // the workspace section is the region, the rail item is the navigation.
  // Exact matching keeps the region distinct from the surface canvas board,
  // whose label is "<surface> canvas" and contains "Release" as a substring.
  const workspace = page.getByRole("region", {
    name: "Release",
    exact: true,
  });
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await expect(workspace).toBeVisible();
  await captureSurface(page, `${slug}-release`);
  const publishDraft = workspace.getByRole("button", {
    name: "Publish Draft",
    exact: true,
  });
  await expectVisibleKeyboardFocus(page, publishDraft);

  // Publish the Draft as an immutable revision.
  const publishedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/application-graphs\/[^/]+\/published-revisions$/.test(response.url()),
  );
  await publishDraft.click();
  const published = (await (
    await publishedResponse
  ).json()) as PublishedRevisionResponse;
  expect(published.id).toMatch(/\S/);
  expect(published.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/);

  // Compile the Published Graph into its immutable application bundle.
  const compile = workspace.getByRole("button", {
    name: "Compile Published Graph",
    exact: true,
  });
  await expect(compile).toBeVisible({ timeout: 60_000 });
  const compilationResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/compilations",
  );
  await compile.click();
  const compilation = (await (
    await compilationResponse
  ).json()) as CompilationResponse;
  expect(compilation.id).toMatch(/\S/);
  expect(compilation.publishedRevisionId).toBe(published.id);

  // Isolated verification: the worker derives the plan from the Published
  // Graph and probes every declared role journey plus an authorization
  // denial inside its own isolated preview.
  const verify = await waitForCompilationOutcome(workspace);
  await verify.click();
  const summary = await waitForVerificationOutcome(workspace);
  await expect(summary).toHaveText(/\d+ steps · \d+ passed · 0 failed/);
  const summaryText = (await summary.textContent()) ?? "";
  const countMatch = /(\d+) steps · (\d+) passed · 0 failed/.exec(summaryText);
  expect(countMatch, "count-first evidence summary").not.toBeNull();
  const stepCount = Number(countMatch![1]);
  const passedCount = Number(countMatch![2]);
  expect(stepCount).toBeGreaterThanOrEqual(2);
  expect(passedCount).toBe(stepCount);

  // The full step evidence lives behind the Activity sheet; the workspace
  // itself never renders the timeline or the steps.
  const evidenceTrigger = workspace.getByRole("button", {
    name: "View evidence",
    exact: true,
  });
  await evidenceTrigger.click();
  const sheet = page.getByLabel("Release evidence");
  await expect(sheet).toBeVisible();
  const steps = sheet.getByLabel("Verification evidence steps");
  await expect(steps).toBeVisible();
  await expect(steps.locator("li")).toHaveCount(stepCount);
  await expect(sheet.locator(".release-evidence-failed")).toHaveCount(0);
  // The authorization denial is a declared, passing evidence step: the
  // isolated bundle denied the unauthorized principal exactly as declared.
  const deniedStep = steps.locator("li").filter({ hasText: /-denied-/ });
  await expect(deniedStep.first()).toBeVisible();
  await expect(deniedStep.first()).toContainText("passed");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(evidenceTrigger).toBeFocused();

  // Boot the compiled bundle as a local preview runtime.
  const startPreview = workspace.getByRole("button", {
    name: "Start Preview",
    exact: true,
  });
  await expect(startPreview).toBeVisible();
  const previewStartedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
  );
  let preview: Page | undefined;
  let startRequested = false;
  let cleanupIdentity: ReturnType<typeof previewIdentity> = null;
  try {
    // From this point onward cleanup is mandatory even if the browser loses
    // the start response or a later assertion fails.
    startRequested = true;
    await startPreview.click();
    const previewRun = (await (
      await previewStartedResponse
    ).json()) as PreviewRunResponse;
    cleanupIdentity = previewIdentity(previewRun);
    expect(cleanupIdentity?.previewRunId).toMatch(/^preview-[a-z0-9-]+$/);
    expect(previewRun.compilationId).toBe(compilation.id);
    expect(previewRun.composeProjectName).toBe(
      cleanupIdentity?.composeProjectName,
    );
    const urlCode = workspace.locator(".release-preview-url");
    await expect(urlCode).toBeVisible({ timeout: 300_000 });
    const previewUrl = (await urlCode.textContent())?.trim();
    expect(previewUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    // The composed product answers as a generated application (never the
    // workbench itself).
    const previewPagePromise = page.context().waitForEvent("page");
    await workspace.getByRole("link", { name: "Open preview" }).click();
    preview = await previewPagePromise;
    await expect(preview).toHaveURL(/127\.0\.0\.1/);
    const generated = preview.locator("main.generated-app");
    await expect(generated).toBeVisible({ timeout: 90_000 });

    const violations = (await new AxeBuilder({ page: preview }).analyze())
      .violations;
    const blocking = violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );
    const blockingIds = blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
    }));
    expect(
      blockingIds,
      blocking.length > 0
        ? `axe blocking rules: ${blocking.map(({ id }) => id).join(", ")}`
        : "no serious/critical axe violations on the generated application",
    ).toEqual([]);

    await captureSurface(preview, `${slug}-generated`);
  } finally {
    await preview?.close().catch(() => undefined);
    if (startRequested) {
      await cleanRequestedPreview({
        knownIdentity: cleanupIdentity,
        recoverIdentity: () => recoverPreviewIdentity(compilation.id),
        stopViaUi: async () => {
          const stop = workspace.getByRole("button", {
            name: "Stop and clean up",
            exact: true,
          });
          if (!(await visibleWithin(stop, 5_000))) {
            throw new Error("Preview Stop action is unavailable.");
          }
          await stop.click();
        },
        stopViaApi: requestPreviewStop,
        assertAbsent: ({ previewRunId, composeProjectName }) =>
          expectPreviewResourcesRemoved(previewRunId, composeProjectName),
      });
    }
  }
  await expect(workspace.locator(".release-phase-succeeded")).toHaveCount(5);
  return published.graphHash;
}

if (localVerificationObserverFixture && !themeEvidenceOnly) {
  const graphHashA = `sha256:${"a".repeat(64)}`;
  const graphHashB = `sha256:${"b".repeat(64)}`;

  test("local fixture: canonical Prompt A owns retained-theme evidence", () => {
    expect(shouldProveRetainedThemeControl("prompt-a")).toBe(true);
    expect(shouldProveRetainedThemeControl("prompt-b")).toBe(false);
    expect(shouldProveRetainedThemeControl("expense-approval")).toBe(false);
  });

  test("local fixture: visible Inspector is closed before theme utilities", async ({
    page,
  }) => {
    await page.setContent(`
      <main class="workbench" data-theme="light">
        <button type="button" aria-label="Switch to dark theme">Theme</button>
      </main>
      <aside
        aria-label="Inspector"
        style="position: fixed; inset: 0; z-index: 10; background: white"
      >
        <button type="button" aria-label="Close inspector">Close</button>
      </aside>
      <script>
        document
          .querySelector('[aria-label="Close inspector"]')
          .addEventListener('click', () => {
            document.querySelector('[aria-label="Inspector"]').remove();
          });
      </script>
    `);

    await closeVisibleInspector(page);

    await expect(page.getByLabel("Inspector", { exact: true })).toHaveCount(0);
  });

  for (const [label, promptAHash, promptBHash] of [
    ["missing Prompt A", undefined, graphHashB],
    ["equal hashes", graphHashA, graphHashA],
    ["invalid Prompt A", "invalid", graphHashB],
    ["invalid Prompt B", graphHashA, "invalid"],
  ] as const) {
    test(`local fixture: paired graph outcome rejects ${label}`, () => {
      expect(() =>
        expectPromptBGraphOutcome(promptAHash, promptBHash, false),
      ).toThrow();
    });
  }

  test("local fixture: paired graph outcome accepts valid unequal hashes", () => {
    expect(() =>
      expectPromptBGraphOutcome(graphHashA, graphHashB, false),
    ).not.toThrow();
  });

  test("local fixture: Prompt B-only graph outcome accepts valid B without Prompt A", () => {
    expect(() =>
      expectPromptBGraphOutcome(undefined, graphHashB, true),
    ).not.toThrow();
  });

  test("local fixture: Prompt B-only graph outcome rejects present Prompt A", () => {
    expect(() =>
      expectPromptBGraphOutcome(graphHashA, graphHashB, true),
    ).toThrow();
  });

  test("local fixture: requirement observer accepts only the scoped success marker", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Product creation" data-requirement-outcome="accepted">
        <p class="error-banner">must-not-surface</p>
      </section>
    `);

    await expect(waitForRequirementOutcome(page, 50)).resolves.toBeUndefined();
  });

  for (const [code, message] of [
    [
      "requirement.timeout",
      "Requirement interpretation failed (requirement.timeout).",
    ],
    [
      "requirement.output_invalid",
      "Requirement interpretation failed (requirement.output_invalid).",
    ],
  ] as const) {
    test(`local fixture: requirement observer reports scoped ${code}`, async ({
      page,
    }) => {
      await page.setContent(`
        <section
          aria-label="Product creation"
          data-requirement-outcome="failed"
          data-requirement-failure-code="${code}"
        >
          <p class="error-banner">must-not-surface</p>
        </section>
      `);

      await expect(waitForRequirementOutcome(page, 50)).rejects.toThrow(
        message,
      );
    });
  }

  test("local fixture: plan observer cannot masquerade as interpretation failure", async ({
    page,
  }) => {
    await page.setContent(`
      <section
        aria-label="Product creation"
        data-requirement-outcome="accepted"
        data-journey-outcome="failed"
        data-journey-failure-phase="planning"
        data-journey-failure-code="product.planning_timeout"
      >
        <p class="error-banner">Product planning timed out.</p>
      </section>
    `);

    await expect(waitForRequirementOutcome(page, 50)).resolves.toBeUndefined();
    await expect(waitForPlanOutcome(page, 50)).rejects.toThrow(
      "Product journey failed (product.planning_timeout).",
    );
  });

  test("local fixture: requirement observer collapses malicious attributes and adjacent content", async ({
    page,
  }) => {
    await page.setContent(`
      <section
        aria-label="Product creation"
        data-requirement-outcome="failed"
        data-requirement-failure-code="HOSTILE-SENTINEL-MUST-NOT-SURFACE"
      >
        <p class="error-banner">HOSTILE-SENTINEL-MUST-NOT-SURFACE</p>
      </section>
    `);

    let observed: unknown;
    try {
      await waitForRequirementOutcome(page, 50);
    } catch (error) {
      observed = error;
    }
    expect((observed as Error).message).toBe(
      "Requirement interpretation failed (requirement.failed).",
    );
    expect((observed as Error).message).not.toContain("HOSTILE-SENTINEL");
  });

  test("local fixture: plan observer collapses malicious attributes to product.failed", async ({
    page,
  }) => {
    await page.setContent(`
      <section
        aria-label="Product creation"
        data-requirement-outcome="accepted"
        data-journey-outcome="failed"
        data-journey-failure-phase="planning"
        data-journey-failure-code="HOSTILE-SENTINEL-MUST-NOT-SURFACE"
      >
        <p class="error-banner">Product planning failed.</p>
      </section>
    `);

    let observed: unknown;
    try {
      await waitForPlanOutcome(page, 50);
    } catch (error) {
      observed = error;
    }
    expect((observed as Error).message).toBe(
      "Product journey failed (product.failed).",
    );
    expect((observed as Error).message).not.toContain("HOSTILE-SENTINEL");
  });

  test("local fixture: requirement observer owns the frozen 570-second deadline", () => {
    expect(REQUIREMENT_OBSERVER_TIMEOUT_MS).toBe(570_000);
  });

  test("local fixture: plan observer cannot undercut accepted review and planning maxima", () => {
    expect(PLAN_OBSERVER_TIMEOUT_MS).toBe(PRODUCT_JOURNEY_TIMEOUT_MS);
    expect(PLAN_OBSERVER_TIMEOUT_MS).toBeGreaterThanOrEqual(720_000);
  });

  test("local fixture: requirement submission clicks Interpret exactly once", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Product creation">
        <textarea aria-label="Requirement brief"></textarea>
        <button type="button">Interpret requirement</button>
      </section>
      <script>
        document.querySelector('button').addEventListener('click', () => {
          const region = document.querySelector('[aria-label="Product creation"]');
          region.dataset.clicks = String(Number(region.dataset.clicks || 0) + 1);
          region.dataset.requirementOutcome = 'accepted';
        });
      </script>
    `);

    await submitRequirementOnce(page, "A transient brief", 50);

    await expect(page.getByLabel("Product creation")).toHaveAttribute(
      "data-clicks",
      "1",
    );
  });

  test("local fixture: verification observer reports only the bounded failure diagnosis", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">verification.timeout</code>
          <span>must-not-surface</span>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    let observedError: unknown;
    try {
      await waitForVerificationOutcome(workspace, 50);
    } catch (error) {
      observedError = error;
    }

    expect(observedError).toBeInstanceOf(Error);
    expect((observedError as Error).message).toBe(
      "Isolated verification failed (verification.timeout).",
    );
    expect((observedError as Error).message).not.toContain("must-not-surface");
  });

  test("local fixture: verification observer rejects an unbounded diagnosis", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">UNBOUNDED must-not-surface</code>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    let observedError: unknown;
    try {
      await waitForVerificationOutcome(workspace, 50);
    } catch (error) {
      observedError = error;
    }

    expect(observedError).toBeInstanceOf(Error);
    expect((observedError as Error).message).toBe(
      "Isolated verification failed (verification.failed).",
    );
    expect((observedError as Error).message).not.toContain("must-not-surface");
  });

  test("local fixture: verification observer retains an allowlisted preview stage and no adjacent text", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">runtime.preview_compose_up_failed</code>
          <span>must-not-surface</span>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    await expect(waitForVerificationOutcome(workspace, 50)).rejects.toThrow(
      "Isolated verification failed (runtime.preview_compose_up_failed).",
    );
  });

  test("local fixture: verification observer collapses an unknown safe-shaped diagnosis", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">runtime.preview_not_allowlisted</code>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    await expect(waitForVerificationOutcome(workspace, 50)).rejects.toThrow(
      "Isolated verification failed (verification.failed).",
    );
  });

  test("local fixture: compilation observer returns the verification action on success", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <button>Run Isolated Verification</button>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    const verify = await waitForCompilationOutcome(workspace, 50);

    await expect(verify).toHaveText("Run Isolated Verification");
  });

  test("local fixture: compilation observer reports explicit bounded failure only", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">compilation.failed</code>
          <span>must-not-surface</span>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    await expect(waitForCompilationOutcome(workspace, 50)).rejects.toThrow(
      "Compilation did not reach success (compilation.failed).",
    );
  });

  test("local fixture: compilation observer reports its bounded timeout", async ({
    page,
  }) => {
    await page.setContent(`<section aria-label="Release"></section>`);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    await expect(waitForCompilationOutcome(workspace, 20)).rejects.toThrow(
      "Compilation did not reach success (compilation.timeout).",
    );
  });

  test("local fixture: compilation observer collapses malicious diagnosis and adjacent content", async ({
    page,
  }) => {
    await page.setContent(`
      <section aria-label="Release">
        <div class="release-failure-card">
          <code class="release-diagnosis">provider.secret must-not-surface</code>
          <span>adjacent must-not-surface</span>
        </div>
      </section>
    `);
    const workspace = page.getByRole("region", {
      name: "Release",
      exact: true,
    });

    let observed: unknown;
    try {
      await waitForCompilationOutcome(workspace, 50);
    } catch (error) {
      observed = error;
    }
    expect((observed as Error).message).toBe(
      "Compilation did not reach success (compilation.failed).",
    );
    expect((observed as Error).message).not.toContain("must-not-surface");
  });
}

if (themeEvidenceOnly) {
  test("Prompt A theme evidence — blank composer retains the selected theme", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    let interpretationRequestCount = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/requirements/interpret"
      ) {
        interpretationRequestCount += 1;
      }
    });

    await openRequirementComposer(page);
    await expect(page.getByLabel("Requirement brief")).toHaveValue("");
    await proveRetainedThemeControl(page);
    await expect(page.getByLabel("Requirement brief")).toHaveValue("");
    expect(interpretationRequestCount).toBe(0);
  });
} else {
  test("Prompt A — Expense Approval: a free-form brief yields a released product", async ({
    page,
  }) => {
    test.skip(
      localVerificationObserverFixture,
      "The local observer fixture excludes guarded real-model journeys.",
    );
    // The live provider and full release pipeline can exceed the suite default.
    test.setTimeout(PRODUCT_JOURNEY_TIMEOUT_MS);
    await openRequirementComposer(page);
    await interpretBrief(page, expenseApprovalBrief, "prompt-a");
    const summary = page.getByLabel("Requirement summary");
    await expect(summary).toBeVisible({ timeout: 120_000 });
    const summaryText = (await summary.textContent()) ?? "";
    expect(/expense/i.test(summaryText), "expense concept present").toBe(true);
    expect(/manager/i.test(summaryText), "manager concept present").toBe(true);
    expect(/finance/i.test(summaryText), "finance concept present").toBe(true);
    await acceptPlanAndCompose(page, "prompt-a");
    promptAPublishedGraphHash = await releaseTheProduct(page, "prompt-a");
  });

  test("Prompt B — Appointment Booking: a different brief yields a different released product without a template", async ({
    page,
  }) => {
    test.skip(
      localVerificationObserverFixture,
      "The local observer fixture excludes guarded real-model journeys.",
    );
    test.setTimeout(PRODUCT_JOURNEY_TIMEOUT_MS);
    await openRequirementComposer(page);
    await interpretBrief(page, appointmentBookingBrief, "prompt-b");
    const summary = page.getByLabel("Requirement summary");
    await expect(summary).toBeVisible({ timeout: 120_000 });
    const summaryText = (await summary.textContent()) ?? "";
    expect(
      /appointment/i.test(summaryText),
      "appointment concept present",
    ).toBe(true);
    expect(/service/i.test(summaryText), "service concept present").toBe(true);
    // The journey must never require a Profile or starter selection.
    await expect(page.getByTestId(/guided-template-/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /choose a template/i }),
    ).toHaveCount(0);
    await acceptPlanAndCompose(page, "prompt-b");
    const promptBGraphHash = await releaseTheProduct(page, "prompt-b");
    // Normal paired acceptance proves the Published Graph hashes differ. The
    // explicitly authorized Prompt B-only mode instead proves no Prompt A state
    // leaked into the isolated single-journey run.
    expectPromptBGraphOutcome(
      promptAPublishedGraphHash,
      promptBGraphHash,
      promptBOnlyJourney,
    );
  });
}
