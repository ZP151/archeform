import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type Locator,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  navigateApproval,
  openApprovalNavigation,
  verifyApprovalAssets,
  verifyWorkspaceComposition,
  verifyDecisionHistory,
  verifyExpressiveRecovery,
} from "./approval-presentation";
import { observeInterpretation } from "./helpers/interpretation-diagnostics";
import { approvalIntakeFacts } from "./helpers/approval-intake-diagnostics";
import { assertRequirementInterpretationResult } from "../packages/adapters/src/requirements/requirement-interpreter";

import {
  approvalFixtureBrief,
  approvalInterpretationFixture,
} from "../apps/workbench/test/consumer-generation-fixture";

// Interpretation uses a fixture by default and an explicitly enabled provider
// lane separately. Composition, release, verification and runtime are real.
const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBase = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const timeoutMs = 1_800_000;
const realInterpretation = process.env.FACTORY_APPROVAL_REAL_ACCEPTANCE === "1";
const privacyProbe = process.env.FACTORY_APPROVAL_PRIVACY_ACCEPTANCE === "1";
const evidenceDirectory = resolve(
  process.cwd(),
  "docs/acceptance/evidence/consumer-expressive-approval/expense",
);
// One separately reported real request, never included in fixture pass counts.
const realApprovalBrief =
  approvalFixtureBrief +
  " Use a local demo with selectable employee, manager, and finance roles.";
const privateApprovalBrief =
  approvalFixtureBrief +
  " Each employee must sign in and only see their own expense records. Shared selectable demo roles and role-wide employee access are not acceptable.";
const localApprovalAnswer =
  "Use the standard local demo with role-wide reads and selectable employee, manager, and finance roles. Employees submit requests; managers approve or reject every submitted request; finance reads decisions. Use the standard categories and no amount thresholds or external integrations.";
type Preview = {
  id: string;
  compilationId: string;
  status: string;
  previewUrl: string | null;
  composeProjectName: string;
};

function controlPlaneUrl(path: string): string {
  if (!controlPlaneBase)
    throw new Error("Isolated Control Plane URL is required.");
  const url = new URL(controlPlaneBase);
  if (url.hostname !== "127.0.0.1" || url.username || url.password)
    throw new Error("Control Plane must be loopback.");
  return new URL(path, url).toString();
}

function docker(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function currentPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<Preview | null> {
  const response = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
    ),
  );
  if (!response.ok()) return null;
  const value = (await response.json().catch(() => null)) as Preview | null;
  return value?.compilationId === compilationId && typeof value.id === "string"
    ? value
    : null;
}

async function stopExactPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<void> {
  const preview = await currentPreview(request, compilationId);
  if (!preview) return;
  expect(preview.composeProjectName).toMatch(/^factory-preview-[a-z0-9-]+$/);
  const stopped = await request.post(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(preview.id)}/stop`),
    { data: {} },
  );
  expect(stopped.ok(), "exact approval preview stop").toBe(true);
  await expect
    .poll(async () => (await currentPreview(request, compilationId))?.status, {
      timeout: 120_000,
    })
    .toBe("stopped");
  for (const resource of ["container", "network", "volume"]) {
    expect(
      docker([
        resource,
        "ls",
        "--filter",
        `label=com.docker.compose.project=${preview.composeProjectName}`,
        "--quiet",
      ]),
    ).toBe("");
  }
}

function recordField(row: Locator, label: string): Locator {
  return row
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("dd");
}

async function expectReadableApprovalLayout(page: Page): Promise<void> {
  const facts = await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#demo-role")!;
    const selectStyle = getComputedStyle(select);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    context.font = `${selectStyle.fontWeight} ${selectStyle.fontSize} ${selectStyle.fontFamily}`;
    const textWidth = context.measureText(
      select.selectedOptions[0]!.text,
    ).width;
    const availableWidth =
      select.clientWidth -
      parseFloat(selectStyle.paddingLeft) -
      parseFloat(selectStyle.paddingRight) -
      24;
    const summariesFillCards = [
      ...document.querySelectorAll<HTMLElement>(".approval-record"),
    ].every((record) => {
      const bounds = record.getBoundingClientRect();
      const summary = record
        .querySelector<HTMLElement>(".approval-summary")!
        .getBoundingClientRect();
      return (
        summary.width > 0 &&
        summary.left >= bounds.left &&
        summary.right <= bounds.right + 1
      );
    });
    return { roleTextFits: availableWidth >= textWidth, summariesFillCards };
  });
  expect(
    facts.roleTextFits,
    "selected demo role is readable without clipping",
  ).toBe(true);
  expect(facts.summariesFillCards, "record summaries fit within each row").toBe(
    true,
  );
}

async function createExpense(
  page: Page,
  marker: string,
  amount: string,
): Promise<string> {
  await navigateApproval(page, "Expense list");
  if (marker === "D24 synthetic approved claim") {
    // The canonical composer starts with one untouched draft seed. Check the
    // first valid action before mutations, without depending on API row order.
    const records = page.locator(".generated-records > li");
    await expect(records).toHaveCount(1);
    const first = records.first();
    await expect(recordField(first, "Status")).toHaveText("Draft");
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(recordField(first, "Amount")).toBeInViewport();
      await expect(recordField(first, "Status")).toBeInViewport();
      await expect(recordField(first, "ID")).not.toBeVisible();
      await expectReadableApprovalLayout(page);
      const action = first.getByRole("button", { name: "Submit", exact: true });
      const box = await action.boundingBox();
      expect(box, "first draft action is visible").not.toBeNull();
      expect(
        box!.y + box!.height,
        "first draft action fits above fold",
      ).toBeLessThanOrEqual(650);
      console.info(
        "FACTORY_APPROVAL_FIRST_VIEW",
        JSON.stringify({
          width,
          firstActionBottom: Math.ceil(box!.y + box!.height),
        }),
      );
    }
    await page.setViewportSize({ width: 390, height: 900 });
  }
  await page.getByRole("link", { name: "New expense", exact: true }).click();
  await page.getByLabel("Demo role", { exact: true }).selectOption("employee");
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByLabel("Category", { exact: true }).selectOption("travel");
  await page.getByLabel("Date", { exact: true }).fill("2026-09-09");
  await page
    .getByLabel("Receipt", { exact: true })
    .fill("https://example.test/synthetic-receipt");
  await page.getByLabel("Notes", { exact: true }).fill(marker);
  if (marker === "D24 synthetic approved claim") {
    await page.setViewportSize({ width: 390, height: 900 });
    await mkdir(evidenceDirectory, { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: resolve(evidenceDirectory, `workspace-form-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 900 });
  }
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/expense",
  );
  await page
    .getByRole("button", { name: "Create Expense", exact: true })
    .click();
  const response = await createdResponse;
  expect(response.status(), "generated typed form creates expense").toBe(201);
  const payload = response.request().postDataJSON() as {
    amount: unknown;
    date: unknown;
  };
  expect(payload.amount).toBe(Number(amount));
  expect(payload.date).toBe("2026-09-09T00:00:00.000Z");
  await expect(page.getByRole("status")).toHaveText("Created Expense.");
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("");
  const created = (await response.json()) as { id?: unknown };
  if (typeof created.id !== "string")
    throw new Error("Created expense did not have a server identity.");
  await navigateApproval(page, "Expense list");
  const row = page
    .locator(".generated-records > li")
    .filter({ hasText: marker });
  await expect(row).toHaveCount(1);
  await expect(recordField(row, "Status")).toHaveText("Draft");
  await expect(recordField(row, "Date")).toHaveText("2026-09-09");
  await expect(row.getByRole("button")).toHaveCount(1);
  await expect(
    row
      .getByRole("button", { name: "Submit", exact: true })
      .locator("svg.lucide-receipt-text"),
  ).toHaveCount(1);
  const submittedResponse = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      new URL(candidate.url()).pathname ===
        `/api/expense/${created.id}/events/submit`,
  );
  await row.getByRole("button", { name: "Submit", exact: true }).click();
  expect((await submittedResponse).ok(), "requester submits expense").toBe(
    true,
  );
  await expect(recordField(row, "Status")).toHaveText("Submitted");
  await expect(
    recordField(row, "Status").locator("svg.lucide-clock"),
  ).toHaveCount(1);
  return created.id;
}

test(`D2.4 ${privacyProbe ? "real requester-privacy requirement stays material" : `${realInterpretation ? "real" : "deterministic"} interpretation delivers persisted approval decisions and history`}`, async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(timeoutMs);
  context.setDefaultTimeout(30_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  if (privacyProbe) expect(realInterpretation).toBe(true);
  expect(factoryProject).toMatch(/^factory-t9-[a-z0-9-]+$/);
  expect(
    docker([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${factoryProject}`,
      "--filter",
      "label=com.docker.compose.service=postgres",
      "--quiet",
    ]),
  ).not.toBe("");
  if (realInterpretation) {
    const workbench = docker([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${factoryProject}`,
      "--filter",
      "label=com.docker.compose.service=workbench",
      "--quiet",
    ]);
    expect(workbench).toMatch(/^[a-f0-9]+$/);
    const mode = JSON.parse(
      docker([
        "exec",
        workbench,
        "node",
        "-e",
        "console.log(JSON.stringify({providerConfigured:Boolean(process.env.OPENAI_API_KEY),fixtureMode:process.env.FACTORY_FIXTURE_MODE === '1',testMode:process.env.NODE_ENV === 'test'}))",
      ]),
    );
    expect(mode).toEqual({
      providerConfigured: true,
      fixtureMode: false,
      testMode: false,
    });
  }
  // Fixture replay owns a fresh application identity. The provider lane runs
  // against a separately initialized, isolated acceptance database.
  let interpretationCalls = 0;
  let productCreates = 0;
  let businessQuestions = 0;
  const finishDiagnostics = observeInterpretation(page);
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/product/requirements"
    )
      productCreates++;
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/requirements/interpret"
    )
      interpretationCalls++;
  });
  if (!realInterpretation) {
    const interpretation = await approvalInterpretationFixture(
      `expense-approval-${randomUUID()}`,
    );
    await page.route("**/api/requirements/interpret", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(interpretation),
      });
    });
  }
  let compilationId: string | null = null;
  let intakeFacts: ReturnType<typeof approvalIntakeFacts> | null = null;
  const pendingResponses: Promise<void>[] = [];
  const lifecycle: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.name));
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    if (path === "/api/requirements/interpret" && response.ok()) {
      pendingResponses.push(
        response
          .json()
          .then((body: unknown) => {
            intakeFacts = approvalIntakeFacts(body);
          })
          .catch(() => {
            intakeFacts = { schemaValid: false };
          }),
      );
      return;
    }
    if (path.endsWith("/published-revisions")) lifecycle.push("publish");
    if (path === "/compilations") {
      lifecycle.push("compile");
      pendingResponses.push(
        response.json().then((body: { id?: unknown }) => {
          if (typeof body.id === "string") compilationId = body.id;
        }),
      );
    }
    if (/\/compilations\/[^/]+\/verification-runs$/.test(path))
      lifecycle.push("verify");
    if (/\/compilations\/[^/]+\/preview-runs$/.test(path))
      lifecycle.push("preview");
  });
  let generated: Page | null = null;
  const start = Date.now();
  let stage = "describe";
  try {
    await page.goto("/");
    await page
      .getByLabel("Requirement brief")
      .fill(
        privacyProbe
          ? privateApprovalBrief
          : realInterpretation
            ? realApprovalBrief
            : approvalFixtureBrief,
      );
    const firstInterpretation = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: 570_000 },
    );
    void firstInterpretation.catch(() => undefined);
    await page.getByRole("button", { name: "Create product" }).click();
    const interpretationResponse = await firstInterpretation;
    if (privacyProbe) {
      stage = "requester-privacy";
      let outcome: "material-clarification" | "failed-closed";
      if (interpretationResponse.status() === 200) {
        const body: unknown = await interpretationResponse.json();
        const facts = approvalIntakeFacts(body);
        intakeFacts = facts;
        expect(facts.schemaValid, "privacy interpretation is valid").toBe(true);
        if (!facts.schemaValid)
          throw new Error("Invalid privacy interpretation.");
        businessQuestions = facts.questionCount;
        expect(
          facts.questionCount,
          "requester privacy remains a material decision",
        ).toBeGreaterThan(0);
        expect(
          assertRequirementInterpretationResult(
            body,
          ).interpretation.clarifications.some((group) =>
            group.questions.some(
              (question) =>
                question.category === "visibility" ||
                question.category === "authorization",
            ),
          ),
          "privacy or identity clarification is preserved",
        ).toBe(true);
        await expect(
          page.getByRole("region", { name: "Clarify the requirement" }),
        ).toBeVisible({ timeout: 10_000 });
        outcome = "material-clarification";
      } else {
        expect(
          [422, 503, 504],
          "privacy request fails closed with a public error",
        ).toContain(interpretationResponse.status());
        const failure = (await interpretationResponse
          .json()
          .catch(() => null)) as { error?: { code?: unknown } } | null;
        const allowedFailureCodes = [
          "requirement.output_invalid",
          "requirement.provider_rejected",
          "requirement.provider_not_configured",
          "requirement.provider_unavailable",
          "requirement.timeout",
          "requirement.failed",
        ];
        const failureRecognized =
          typeof failure?.error?.code === "string" &&
          allowedFailureCodes.includes(failure.error.code);
        expect(
          failureRecognized,
          "privacy failure has a recognized public code",
        ).toBe(true);
        outcome = "failed-closed";
      }
      await Promise.all(pendingResponses);
      expect(interpretationCalls).toBe(1);
      expect(
        productCreates,
        "unsupported privacy must not create a product",
      ).toBe(0);
      expect(
        lifecycle,
        "unsupported privacy must not start automatic delivery",
      ).toEqual([]);
      await expect(
        page.getByRole("region", { name: "Approval delivery" }),
      ).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^Choose / })).toHaveCount(
        0,
      );
      console.info(
        "FACTORY_APPROVAL_PRIVACY",
        JSON.stringify({
          caseId: "A10",
          lane: "real-interpretation-negative",
          outcome,
          status: interpretationResponse.status(),
          interpretationCalls,
          questions: businessQuestions,
          productCreates,
          lifecycle,
          elapsedMs: Date.now() - start,
          intakeFacts,
        }),
      );
      return;
    }
    expect(interpretationResponse.status(), "interpretation response").toBe(
      200,
    );
    const delivery = page.getByRole("region", { name: "Approval delivery" });
    if (realInterpretation) {
      const clarification = page.getByRole("region", {
        name: "Clarify the requirement",
      });
      await expect
        .poll(
          async () =>
            (await delivery.isVisible()) ||
            (await clarification.isVisible()) ||
            (await page.getByRole("button", { name: /^Choose / }).count()) > 0,
          { timeout: 60_000 },
        )
        .toBe(true);
      if (await clarification.isVisible()) {
        const answers = clarification.locator(
          "ol.clarification-questions input",
        );
        businessQuestions = await answers.count();
        console.info(
          "FACTORY_APPROVAL_ENTRY",
          JSON.stringify({
            lane: "real-interpretation",
            questions: businessQuestions,
          }),
        );
        expect(
          businessQuestions,
          "one consolidated material question at most",
        ).toBe(1);
        await answers.first().fill(localApprovalAnswer);
        const continued = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname === "/api/requirements/interpret",
          { timeout: 570_000 },
        );
        void continued.catch(() => undefined);
        await clarification
          .getByRole("button", { name: "Continue", exact: true })
          .click();
        expect(
          (await continued).status(),
          "clarification interpretation response",
        ).toBe(200);
      }
    }
    await expect(delivery).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /Choose |Apply to Draft/ }),
    ).toHaveCount(0);
    stage = "local-delivery";
    const openApp = delivery.getByRole("link", { name: "Open local app" });
    let outcome = "pending";
    await expect
      .poll(
        async () => {
          outcome = (await openApp.isVisible())
            ? "ready"
            : (await delivery.getByRole("status").textContent())?.startsWith(
                  "Delivery paused",
                )
              ? "failed"
              : "pending";
          return outcome;
        },
        { timeout: timeoutMs - 120_000 },
      )
      .not.toBe("pending");
    expect(outcome, "automatic approval delivery terminal outcome").toBe(
      "ready",
    );
    await Promise.all(pendingResponses);
    const elapsedToReadyMs = Date.now() - start;
    if (!compilationId)
      throw new Error("No immutable compilation was observed.");
    const preview = await currentPreview(request, compilationId);
    expect(preview?.status).toBe("ready");
    const href = await openApp.getAttribute("href");
    expect(href).toBe(preview?.previewUrl);
    if (!href || new URL(href).hostname !== "127.0.0.1")
      throw new Error("No loopback generated app.");
    expect(lifecycle).toEqual(["publish", "compile", "verify", "preview"]);
    expect(interpretationCalls).toBe(
      realInterpretation ? 1 + businessQuestions : 1,
    );
    generated = await context.newPage();
    generated.on("pageerror", (error) => pageErrors.push(error.name));
    await generated.goto(href);
    await verifyApprovalAssets(generated);
    await openApprovalNavigation(generated);
    await expect(generated.locator("main.generated-app")).toBeVisible();
    await expect(
      generated.getByText("Requests and approvals", { exact: true }),
    ).toBeVisible();
    await expect(
      generated.getByLabel("Demo role", { exact: true }),
    ).toBeVisible();
    await expect(
      generated
        .getByRole("navigation", { name: "Application routes" })
        .locator("svg.lucide-receipt-text")
        .first(),
    ).toBeVisible();
    stage = "requester-submit";
    const approvedId = await createExpense(
      generated,
      "D24 synthetic approved claim",
      "12.50",
    );
    const rejectedId = await createExpense(
      generated,
      "D24 synthetic rejected claim",
      "7.25",
    );
    const denied = await request.post(
      new URL(`/api/expense/${approvedId}/events/approve`, href).toString(),
      {
        headers: { "x-factory-fixture-session": "fixture-session-employee" },
        data: {},
      },
    );
    expect(denied.status(), "requester cannot decide a submitted expense").toBe(
      403,
    );
    stage = "reviewer-decision";
    await verifyDecisionHistory(generated, {
      auditor: "finance",
      requester: "employee",
      entity: "expense",
    });
    await navigateApproval(generated, "Approval queue");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("manager");
    for (const [id, marker, action, status] of [
      [approvedId, "D24 synthetic approved claim", "approve", "approved"],
      [rejectedId, "D24 synthetic rejected claim", "reject", "rejected"],
    ]) {
      const row = generated
        .locator(".generated-records > li")
        .filter({ hasText: marker });
      await expect(recordField(row, "Status")).toHaveText("Submitted");
      await expect(
        recordField(row, "Status").locator("svg.lucide-clock"),
      ).toHaveCount(1);
      const decision = generated.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname ===
            `/api/expense/${id}/events/${action}`,
      );
      await row
        .getByRole("button", {
          name: action === "approve" ? "Approve" : "Reject",
          exact: true,
        })
        .click();
      expect((await decision).ok(), "reviewer decision").toBe(true);
      await expect(recordField(row, "Status")).toHaveText(
        status === "approved" ? "Approved" : "Rejected",
      );
      await expect(row.getByRole("button")).toHaveCount(0);
    }
    stage = "requester-results";
    await verifyDecisionHistory(generated, {
      auditor: "finance",
      requester: "employee",
      entity: "expense",
      identities: ["Amount: 12.5", "Amount: 7.25"],
      evidence: evidenceDirectory,
    });
    await navigateApproval(generated, "Expense list");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("employee");
    await generated.reload();
    for (const [marker, status] of [
      ["D24 synthetic approved claim", "approved"],
      ["D24 synthetic rejected claim", "rejected"],
    ]) {
      const row = generated
        .locator(".generated-records > li")
        .filter({ hasText: marker });
      await expect(recordField(row, "Status")).toHaveText(
        status === "approved" ? "Approved" : "Rejected",
      );
      const details = row.locator("details");
      await expect(details).not.toHaveAttribute("open", "");
      await expect(recordField(row, "ID")).not.toBeVisible();
      const disclosure = details.locator("summary");
      await disclosure.focus();
      await disclosure.press("Enter");
      await expect(recordField(row, "ID")).toBeVisible();
      await expect(recordField(row, "Notes")).toBeVisible();
      await expect(recordField(row, "Receipt")).toBeVisible();
      await expect(recordField(row, "Notes")).toHaveText(marker);
      await expect(recordField(row, "Date")).toHaveText("2026-09-09");
      await expect(
        recordField(row, "Status").locator(
          status === "approved"
            ? "svg.lucide-circle-check"
            : "svg.lucide-circle-x",
        ),
      ).toHaveCount(1);
      await expect(row.locator("code")).toHaveCount(0);
      await disclosure.press("Enter");
      await expect(recordField(row, "ID")).not.toBeVisible();
    }
    await openApprovalNavigation(generated);
    const navigation = generated.getByRole("navigation", {
      name: "Application routes",
    });
    const declaredRoutes = await navigation
      .getByRole("link")
      .evaluateAll((links) =>
        links.map((link) => ({
          label: link.textContent!.trim(),
          route: link.getAttribute("href")!,
        })),
      );
    expect(declaredRoutes).toHaveLength(5);
    for (const item of declaredRoutes) {
      await navigateApproval(generated, item.label);
      await expect(generated).toHaveURL(new URL(item.route, href).toString());
      await openApprovalNavigation(generated);
      await expect(
        navigation.getByRole("link", { name: item.label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
    await navigateApproval(generated, "Expense list");
    expect(pageErrors).toEqual([]);
    const evidence = evidenceDirectory;
    await mkdir(evidence, { recursive: true });
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await generated.evaluate(() => window.scrollTo(0, 0));
      const firstRecord = generated.locator(".generated-records > li").first();
      await expect(recordField(firstRecord, "Amount")).toBeVisible();
      await expect(recordField(firstRecord, "Status")).toBeVisible();
      await expect(generated.locator(".generated-records > li")).toHaveCount(3);
      await expectReadableApprovalLayout(generated);
      await expect(
        generated.getByRole("link", { name: "New expense", exact: true }),
      ).toBeInViewport();
      if (width === 390) {
        for (const control of await generated
          .locator("main.generated-app")
          .locator("a:visible, button:visible, select:visible, summary:visible")
          .all()) {
          const box = await control.boundingBox();
          expect(
            box?.height,
            "mobile touch target height",
          ).toBeGreaterThanOrEqual(44);
          expect(
            box?.width,
            "mobile touch target width",
          ).toBeGreaterThanOrEqual(44);
        }
      }
      await verifyWorkspaceComposition(generated, width);
      await generated.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
      await generated.screenshot({
        path: resolve(
          evidence,
          `${realInterpretation ? "d24-real" : "d24"}-results-${width}.png`,
        ),
        fullPage: true,
      });
      // Presentation and business correctness are both required for this correction.
      const overflow = await generated.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      const violations = (
        await new AxeBuilder({ page: generated })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze()
      ).violations.map(({ id }) => id);
      expect(overflow, "generated approval must fit the viewport").toBe(false);
      expect(violations, "generated approval accessibility").toEqual([]);
      console.info(
        "FACTORY_APPROVAL_PRESENTATION",
        JSON.stringify({
          width,
          overflow,
          violationIds: violations,
          internalIdsCollapsed: true,
          keyboardDetails: true,
        }),
      );
    }
    await verifyExpressiveRecovery(generated, evidenceDirectory);
    if (!realInterpretation) {
      // Preserve only the emitted UI from this synthetic compilation for the
      // local design detector. Do not copy environment, API or provider files.
      const webContainer = docker([
        "ps",
        "--filter",
        `label=com.docker.compose.project=${preview!.composeProjectName}`,
        "--filter",
        "label=com.docker.compose.service=web",
        "--quiet",
      ]);
      expect(webContainer).toMatch(/^[a-f0-9]+$/);
      const emittedUi = resolve(
        process.cwd(),
        ".superpowers/sdd/2026-09-11-approval-workspace/emitted-ui",
      );
      await mkdir(emittedUi, { recursive: true });
      for (const file of ["page-runtime.tsx", "globals.css"]) {
        docker([
          "cp",
          `${webContainer}:/app/app/${file}`,
          resolve(emittedUi, file),
        ]);
      }
    }
    console.info(
      "FACTORY_APPROVAL_BUSINESS",
      JSON.stringify({
        lane: realInterpretation
          ? "real-interpretation-real-runtime"
          : "deterministic-interpretation-real-runtime",
        requests: 2,
        approved: 1,
        rejected: 1,
        crossRoleDenied: true,
        reloadRetained: true,
        questions: businessQuestions,
        technicalHandoffs: 0,
        interpretationCalls,
        elapsedToReadyMs,
        elapsedToTaskMs: Date.now() - start,
        rawRecordPresentation: false,
        typedDateSubmission: true,
        intakeFacts,
      }),
    );
  } catch (error) {
    await Promise.allSettled(pendingResponses);
    const manualChoicesVisible =
      (await page
        .getByRole("button", { name: /^Choose / })
        .count()
        .catch(() => 0)) > 0;
    console.info(
      "FACTORY_APPROVAL_FAILURE",
      JSON.stringify({
        stage,
        lane: realInterpretation
          ? "real-interpretation-real-runtime"
          : "deterministic-interpretation-real-runtime",
        questions: businessQuestions,
        elapsedMs: Date.now() - start,
        interpretationCalls,
        lifecycle,
        caseId: privacyProbe ? "A10" : "A02",
        productCreates,
        manualChoicesVisible,
        intakeFacts,
      }),
    );
    throw error;
  } finally {
    await Promise.allSettled(pendingResponses);
    await finishDiagnostics();
    await generated?.close();
    await page.close();
    if (compilationId) await stopExactPreview(request, compilationId);
  }
});
