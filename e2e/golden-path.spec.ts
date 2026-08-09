import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

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

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;

// Both scenarios share the compose stack and mutate the same database; run
// them serially so Prompt B's assertions can rely on Prompt A's outcomes.
test.describe.configure({ mode: "serial" });

// Prompt A's Published Graph hash, captured for the cross-test inequality:
// Prompt B must prove the two prompts produced materially different Graphs,
// not two copies of one template.
let promptAPublishedGraphHash: string | undefined;

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

async function interpretBrief(page: Page, brief: string): Promise<void> {
  await page.getByLabel("Requirement brief").fill(brief);
  await page
    .getByRole("button", { name: "Interpret requirement", exact: true })
    .click();
}

/**
 * Drives the journey past the requirement summary: answers clarifying
 * questions when the interpreter asks them, chooses a plan alternative, and
 * applies the approved Diff to the blank Draft. Ends with the composed
 * product open in the studio.
 */
async function acceptPlanAndCompose(page: Page): Promise<void> {
  // The interpreter may ask clarifying questions before proposing plans;
  // answer and continue, or skip straight to the plan review.
  const continueClarifying = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  try {
    await expect(continueClarifying).toBeVisible({ timeout: 15_000 });
    await continueClarifying.click();
  } catch {
    // No clarifying questions asked; the plan review follows directly.
  }
  const choose = page.getByRole("button", { name: /^Choose / });
  await expect(choose.first()).toBeVisible({ timeout: 180_000 });
  await choose.first().click();
  const apply = page.getByRole("button", { name: "Apply to Draft" });
  await expect(apply).toBeVisible({ timeout: 60_000 });
  await expect(apply).toBeEnabled({ timeout: 60_000 });
  await apply.click();
  // The composed product opens as the active local Draft in the studio.
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible({
    timeout: 90_000,
  });
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

/**
 * Proves the preview was cleaned up: no container, network, or volume of the
 * preview's compose project remains, and the worker's artifact directory for
 * the run is gone.
 */
function expectPreviewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): void {
  if (!factoryE2eProject)
    throw new Error(
      "FACTORY_E2E_FACTORY_PROJECT is required for isolated preview cleanup checks.",
    );
  const workerContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryE2eProject}`,
    "--filter",
    "label=com.docker.compose.service=compiler-worker",
    "--quiet",
  ]);
  expect(workerContainer).toMatch(/\S/);
  expect(
    dockerOutput([
      "exec",
      workerContainer,
      "test",
      "!",
      "-d",
      `/artifacts/.preview-runs/${previewRunId}`,
    ]),
  ).toBe("");
  expect(
    dockerOutput([
      "ps",
      "--all",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    "containers of the preview compose project must be gone after cleanup",
  ).toBe("");
  for (const kind of ["network", "volume"]) {
    expect(
      dockerOutput([
        kind,
        "ls",
        "--filter",
        `label=com.docker.compose.project=${composeProjectName}`,
        "--quiet",
      ]),
      `${kind} of ${composeProjectName} must be empty after cleanup`,
    ).toBe("");
  }
}

/**
 * Drives the Release surface through the full pipeline: publish -> compile
 * -> isolated verification (role journeys + authorization denial in the
 * count-first evidence, step details behind the Activity sheet) -> preview
 * -> Docker cleanup.
 */
async function releaseTheProduct(page: Page): Promise<string> {
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

  // Publish the Draft as an immutable revision.
  const publishedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/application-graphs\/[^/]+\/published-revisions$/.test(response.url()),
  );
  await workspace
    .getByRole("button", { name: "Publish Draft", exact: true })
    .click();
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
  const verify = workspace.getByRole("button", {
    name: "Run Isolated Verification",
    exact: true,
  });
  await expect(verify).toBeVisible({ timeout: 300_000 });
  await verify.click();
  const summary = workspace.locator(".release-evidence-summary");
  await expect(summary).toBeVisible({ timeout: 300_000 });
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
  await workspace
    .getByRole("button", { name: "View evidence", exact: true })
    .click();
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
  await startPreview.click();
  const previewRun = (await (
    await previewStartedResponse
  ).json()) as PreviewRunResponse;
  expect(previewRun.id).toMatch(/^preview-[a-z0-9-]+$/);
  const composeProjectName = `factory-preview-${previewRun.id}`;

  const urlCode = workspace.locator(".release-preview-url");
  await expect(urlCode).toBeVisible({ timeout: 300_000 });
  const previewUrl = (await urlCode.textContent())?.trim();
  expect(previewUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

  // The composed product answers as a generated application (never the
  // workbench itself).
  const previewPagePromise = page.context().waitForEvent("page");
  await workspace.getByRole("link", { name: "Open preview" }).click();
  const preview = await previewPagePromise;
  await expect(preview).toHaveURL(/127\.0\.0\.1/);
  await expect(preview.locator("main.generated-app")).toBeVisible({
    timeout: 90_000,
  });
  await preview.close();

  // Stop the preview and clean it up; every phase ends succeeded.
  await workspace
    .getByRole("button", { name: "Stop and clean up", exact: true })
    .click();
  await expect(
    workspace.getByText("Preview stopped and cleaned up."),
  ).toBeVisible({ timeout: 120_000 });
  await expect(workspace.locator(".release-phase-succeeded")).toHaveCount(5);
  expectPreviewResourcesRemoved(previewRun.id, composeProjectName);
  return published.graphHash;
}

test("Prompt A — Expense Approval: a free-form brief yields a released product", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await openRequirementComposer(page);
  await interpretBrief(page, expenseApprovalBrief);
  const summary = page.getByLabel("Requirement summary");
  await expect(summary).toBeVisible({ timeout: 120_000 });
  await expect(summary).toContainText("expense");
  await expect(summary).toContainText("manager");
  await expect(summary).toContainText("finance");
  await acceptPlanAndCompose(page);
  promptAPublishedGraphHash = await releaseTheProduct(page);
});

test("Prompt B — Appointment Booking: a different brief yields a different released product without a template", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await openRequirementComposer(page);
  await interpretBrief(page, appointmentBookingBrief);
  const summary = page.getByLabel("Requirement summary");
  await expect(summary).toBeVisible({ timeout: 120_000 });
  await expect(summary).toContainText("appointment");
  await expect(summary).toContainText("service");
  // The journey must never require a Profile or starter selection.
  await expect(page.getByTestId(/guided-template-/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /choose a template/i }),
  ).toHaveCount(0);
  await acceptPlanAndCompose(page);
  const promptBGraphHash = await releaseTheProduct(page);
  // Criterion: the two free-form prompts yielded materially different
  // composed Graphs — their Published Graph hashes must differ (serial mode
  // guarantees Prompt A's hash was captured above).
  expect(promptAPublishedGraphHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(promptBGraphHash).not.toBe(promptAPublishedGraphHash);
});
