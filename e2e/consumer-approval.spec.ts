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
import { observeInterpretation } from "./helpers/interpretation-diagnostics";

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
// One separately reported real request, never included in fixture pass counts.
const realApprovalBrief =
  approvalFixtureBrief +
  " Use a local demo with selectable employee, manager, and finance roles.";
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

async function createExpense(
  page: Page,
  marker: string,
  amount: string,
): Promise<string> {
  await page.getByRole("link", { name: "Expense list", exact: true }).click();
  await page.getByRole("link", { name: "New expense", exact: true }).click();
  await page.getByLabel("Demo role", { exact: true }).selectOption("employee");
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByLabel("Category", { exact: true }).selectOption("travel");
  await page.getByLabel("Date", { exact: true }).fill("2026-09-09");
  await page
    .getByLabel("Receipt", { exact: true })
    .fill("https://example.test/synthetic-receipt");
  await page.getByLabel("Notes", { exact: true }).fill(marker);
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
  await page.getByRole("link", { name: "Expense list", exact: true }).click();
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

test(`D2.2 ${realInterpretation ? "real" : "deterministic"} interpretation delivers and serves a complete approval role journey`, async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(timeoutMs);
  context.setDefaultTimeout(30_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
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
  let businessQuestions = 0;
  const finishDiagnostics = observeInterpretation(page);
  page.on("request", (request) => {
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
  const pendingResponses: Promise<void>[] = [];
  const lifecycle: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.name));
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
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
      .fill(realInterpretation ? realApprovalBrief : approvalFixtureBrief);
    const firstInterpretation = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: 570_000 },
    );
    void firstInterpretation.catch(() => undefined);
    await page.getByRole("button", { name: "Create product" }).click();
    expect(
      (await firstInterpretation).status(),
      "interpretation response",
    ).toBe(200);
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
      "D22 synthetic approved claim",
      "12.50",
    );
    const rejectedId = await createExpense(
      generated,
      "D22 synthetic rejected claim",
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
    await generated
      .getByRole("link", { name: "Approval queue", exact: true })
      .click();
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("manager");
    for (const [id, marker, action, status] of [
      [approvedId, "D22 synthetic approved claim", "approve", "approved"],
      [rejectedId, "D22 synthetic rejected claim", "reject", "rejected"],
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
    await generated
      .getByRole("link", { name: "Expense list", exact: true })
      .click();
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("employee");
    await generated.reload();
    for (const [marker, status] of [
      ["D22 synthetic approved claim", "approved"],
      ["D22 synthetic rejected claim", "rejected"],
    ]) {
      const row = generated
        .locator(".generated-records > li")
        .filter({ hasText: marker });
      await expect(recordField(row, "Status")).toHaveText(
        status === "approved" ? "Approved" : "Rejected",
      );
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
    }
    expect(pageErrors).toEqual([]);
    const evidence = resolve(
      process.cwd(),
      "docs/acceptance/evidence/consumer-approval",
    );
    await mkdir(evidence, { recursive: true });
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await generated.screenshot({
        path: resolve(
          evidence,
          `${realInterpretation ? "d22-real" : "d22"}-results-${width}.png`,
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
        JSON.stringify({ width, overflow, violationIds: violations }),
      );
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
      }),
    );
  } catch (error) {
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
