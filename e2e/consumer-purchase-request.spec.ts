import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  verifyApprovalAssets,
  verifyAssetFailureDetection,
  openApprovalNavigation,
  navigateApproval,
  verifyWorkspaceComposition,
  verifyDecisionHistory,
} from "./approval-presentation";
import {
  purchaseRequestFixtureBrief,
  purchaseRequestInterpretationFixture,
} from "../apps/workbench/test/consumer-generation-fixture";

// Only the interpretation is authored. Planning, composition, immutable
// compilation, verification, preview, form submission and persistence are real.
const evidence = resolve(
  process.cwd(),
  "docs/acceptance/evidence/consumer-approval-decision-history",
);
type Preview = {
  id: string;
  compilationId: string;
  status: string;
  previewUrl: string | null;
  composeProjectName: string;
};
function controlPlaneUrl(path: string): string {
  const base = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
  if (!base) throw new Error("Isolated Control Plane URL is required.");
  const url = new URL(base);
  if (url.hostname !== "127.0.0.1" || url.username || url.password)
    throw new Error("Control Plane must be loopback.");
  return new URL(path, url).toString();
}
function docker(args: string[]): string {
  return execFileSync("docker", args, {
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
  const value = (await response.json()) as Preview;
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
  expect(
    (
      await request.post(
        controlPlaneUrl(`/preview-runs/${encodeURIComponent(preview.id)}/stop`),
        { data: {} },
      )
    ).ok(),
  ).toBe(true);
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
        ...(resource === "container" ? ["--all"] : []),
        "--filter",
        `label=com.docker.compose.project=${preview.composeProjectName}`,
        "--quiet",
      ]),
    ).toBe("");
  }
  console.info(
    "FACTORY_PURCHASE_CLEANUP",
    JSON.stringify({
      compilationId,
      previewId: preview.id,
      project: preview.composeProjectName,
      status: "stopped",
      resources: 0,
    }),
  );
}
function field(row: Locator, label: string): Locator {
  return row
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .locator("..")
    .locator("dd");
}
function record(page: Page, item: string): Locator {
  return page.locator(".generated-records > li").filter({ hasText: item });
}
async function expectRequestValues(
  row: Locator,
  id: string,
  amount: string,
): Promise<void> {
  await expect(field(row, "Amount")).toHaveText(String(Number(amount)));
  await expect(field(row, "Category")).toHaveText("equipment");
  await expect(field(row, "Needed by")).toHaveText("2026-09-20");
  for (const label of ["Amount", "Category", "Needed by"])
    await expect(field(row, label)).toBeVisible();
  await expect(field(row, "ID")).not.toBeVisible();
  const summary = row.locator("details > summary");
  await summary.focus();
  await summary.press("Enter");
  await expect(field(row, "ID")).toHaveText(id);
  await expect(field(row, "Supplier")).toHaveText("Synthetic Office Supply");
  await expect(field(row, "Business justification")).toHaveText(
    "Synthetic replacement equipment for the shared workspace.",
  );
  for (const label of ["ID", "Supplier", "Business justification"])
    await expect(field(row, label)).toBeVisible();
  await summary.press("Enter");
  await expect(field(row, "ID")).not.toBeVisible();
}
async function expectDecisionOnlyActions(page: Page): Promise<void> {
  const forbidden =
    /purchase order|place order|pay(?:ment)?\b|checkout|invoice|inventory|fulfil|supplier management/i;
  await expect(page.getByRole("button", { name: forbidden })).toHaveCount(0);
  await expect(page.getByRole("link", { name: forbidden })).toHaveCount(0);
}
async function layout(page: Page, width: number): Promise<void> {
  const facts = await page.evaluate(() => {
    const select = document.querySelector<HTMLSelectElement>("#demo-role")!;
    const style = getComputedStyle(select);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return {
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      roleTextFits:
        select.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight) -
          24 >=
        context.measureText(select.selectedOptions[0]!.text).width,
      summariesFitRows: [
        ...document.querySelectorAll<HTMLElement>(".approval-record"),
      ].every((row) => {
        const summary = row
          .querySelector<HTMLElement>(".approval-summary")!
          .getBoundingClientRect();
        const bounds = row.getBoundingClientRect();
        return (
          summary.width > 0 &&
          summary.left >= bounds.left &&
          summary.right <= bounds.right + 1
        );
      }),
    };
  });
  console.info("FACTORY_PURCHASE_LAYOUT", JSON.stringify({ width, ...facts }));
  expect(facts).toEqual({
    overflow: false,
    roleTextFits: true,
    summariesFitRows: true,
  });
  const violations = (
    await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
  ).violations.map(({ id }) => id);
  expect(violations).toEqual([]);
  if (width === 390)
    for (const control of await page
      .locator("main.generated-app")
      .locator(
        "a:visible, button:visible, input:visible, select:visible, summary:visible",
      )
      .all()) {
      const box = await control.boundingBox();
      expect(box?.height, "mobile target height").toBeGreaterThanOrEqual(44);
      expect(box?.width, "mobile target width").toBeGreaterThanOrEqual(44);
    }
  console.info(
    "FACTORY_PURCHASE_PRESENTATION",
    JSON.stringify({ width, ...facts, violations }),
  );
}
async function verifyRecoverableListStates(page: Page): Promise<void> {
  // Inject only transport states; never substitute business success or records.
  const app = page.locator("main.generated-app");
  const pattern = "**/api/purchase-request";
  let mode: "loading" | "error" | "empty" = "loading";
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (mode === "loading") await held;
    await route.fulfill({
      status: mode === "empty" ? 200 : 503,
      contentType: "application/json",
      body:
        mode === "empty"
          ? "[]"
          : JSON.stringify({ error: "synthetic-service-failure" }),
    });
  });
  try {
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      app.getByRole("status").filter({ hasText: /^Loading records…$/ }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Search records", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Status filter", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clear filters", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeDisabled();
    mode = "error";
    release();
    await expect(app.getByRole("alert")).toHaveText(
      "The service is unavailable. Please try again.",
    );
    await expect(
      page.getByLabel("Search records", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Status filter", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clear filters", exact: true }),
    ).toBeVisible();
    mode = "empty";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      app
        .getByRole("status")
        .filter({ hasText: "No purchase request records yet." }),
    ).toBeVisible();
    await expect(
      app.getByText("No matching records.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Create Purchase request", exact: true }),
    ).toBeVisible();
  } finally {
    release();
    await page.unroute(pattern);
  }
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator(".generated-records > li")).toHaveCount(3);
  await expect(app.getByRole("alert")).toHaveCount(0);
}

async function verifyRecordFinding(
  page: Page,
  approvedItem: string,
): Promise<void> {
  const app = page.locator("main.generated-app");
  const search = app.getByLabel("Search records", { exact: true });
  const status = app.getByRole("combobox", {
    name: "Status filter",
    exact: true,
  });
  const clear = app.getByRole("button", { name: "Clear filters", exact: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await search.fill("  ADJUSTABLE DESK  ");
  await expect(search).toBeFocused();
  await status.selectOption("approved");
  await expect(app.locator(".generated-records > li")).toHaveCount(1);
  await expect(record(page, approvedItem)).toBeVisible();
  await expect(
    app.getByRole("status").filter({ hasText: /^1 of 3 records$/ }),
  ).toBeVisible();
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/purchase-request" &&
      response.request().headers()["x-factory-fixture-session"] ===
        "fixture-session-requester",
  );
  const refresh = app.getByRole("button", { name: "Refresh", exact: true });
  await refresh.click();
  expect((await refreshed).ok()).toBe(true);
  await expect(refresh).toBeEnabled();
  await expect(app.locator(".generated-records > li")).toHaveCount(1);
  await expect(record(page, approvedItem)).toBeVisible();
  await expect(search).toHaveValue("  ADJUSTABLE DESK  ");
  await expect(status).toHaveValue("approved");
  await layout(page, 390);
  await page.screenshot({
    path: resolve(evidence, "workspace-search-390.png"),
    fullPage: true,
  });
  await search.fill("No such synthetic item");
  await expect(
    app.getByText("No matching records.", { exact: true }),
  ).toBeVisible();
  await expect(
    app.getByRole("status").filter({ hasText: /^0 of 3 records$/ }),
  ).toBeVisible();
  await expect(app.locator(".generated-records > li")).toHaveCount(0);
  await expect(
    app.getByText("No purchase request records yet.", { exact: true }),
  ).toHaveCount(0);
  await expect(status.locator("option")).toHaveText([
    "All statuses",
    "Draft",
    "Submitted",
    "Approved",
    "Rejected",
  ]);
  await layout(page, 390);
  await page.screenshot({
    path: resolve(evidence, "workspace-no-match-390.png"),
    fullPage: true,
  });
  await clear.focus();
  await clear.press("Enter");
  await expect(search).toHaveValue("");
  await expect(status).toHaveValue("");
  await expect(app.locator(".generated-records > li")).toHaveCount(3);
  // A role change must clear the former view and fetch under the new role.
  await search.fill("No such synthetic item");
  await status.selectOption("submitted");
  let releaseRoleRead = () => {};
  const roleRead = new Promise<void>((resolve) => {
    releaseRoleRead = resolve;
  });
  const rolePattern = "**/api/purchase-request";
  let managerRead = false;
  await page.route(rolePattern, async (route) => {
    if (
      route.request().method() === "GET" &&
      route.request().headers()["x-factory-fixture-session"] ===
        "fixture-session-manager"
    ) {
      managerRead = true;
      await roleRead;
    }
    await route.continue();
  });
  try {
    await app.getByLabel("Demo role", { exact: true }).selectOption("manager");
    await expect.poll(() => managerRead).toBe(true);
    await expect(search).toHaveValue("");
    await expect(status).toHaveValue("");
    await expect(app.locator(".generated-records > li")).toHaveCount(0);
  } finally {
    releaseRoleRead();
    await page.unroute(rolePattern);
  }
  await expect(app.locator(".generated-records > li")).toHaveCount(3);
  await app.getByLabel("Demo role", { exact: true }).selectOption("requester");
  await expect(app.locator(".generated-records > li")).toHaveCount(3);
}

async function createRequest(
  page: Page,
  item: string,
  amount: string,
  captureForm: boolean,
): Promise<string> {
  await page
    .getByRole("link", { name: "New purchase request", exact: true })
    .click();
  await page.getByLabel("Demo role", { exact: true }).selectOption("requester");
  const form = page.locator("form");
  await expect(form.getByLabel("Item", { exact: true })).toHaveAttribute(
    "required",
    "",
  );
  await expect(
    form.getByLabel("Business justification", { exact: true }),
  ).toHaveAttribute("required", "");
  await page.getByLabel("Amount", { exact: true }).fill(amount);
  await page.getByLabel("Category", { exact: true }).selectOption("equipment");
  await page.getByLabel("Needed by", { exact: true }).fill("2026-09-20");
  await page.getByLabel("Item", { exact: true }).fill(item);
  await page
    .getByLabel("Supplier", { exact: true })
    .fill("Synthetic Office Supply");
  await page
    .getByLabel("Business justification", { exact: true })
    .fill("Synthetic replacement equipment for the shared workspace.");
  if (captureForm) {
    await mkdir(evidence, { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: resolve(evidence, `workspace-form-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      (
        await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()
      ).violations.map(({ id }) => id),
    ).toEqual([]);
  }
  const pending = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/purchase-request",
  );
  await page
    .getByRole("button", { name: "Create Purchase request", exact: true })
    .click();
  const response = await pending;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toMatchObject({
    amount: Number(amount),
    category: "equipment",
    neededBy: "2026-09-20T00:00:00.000Z",
    item,
    supplier: "Synthetic Office Supply",
    businessJustification:
      "Synthetic replacement equipment for the shared workspace.",
  });
  await expect(page.getByRole("status")).toHaveText(
    "Created Purchase request.",
  );
  await expect(page.getByLabel("Item", { exact: true })).toHaveValue("");
  const created = (await response.json()) as { id?: unknown };
  if (typeof created.id !== "string")
    throw new Error("Created request has no server identity.");
  await navigateApproval(page, "Purchase request list");
  const row = record(page, item);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("heading", { level: 3 })).toContainText(item);
  await expectRequestValues(row, created.id, amount);
  await expectDecisionOnlyActions(page);
  await expect(field(row, "Status")).toHaveText("Draft");
  const submitted = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname ===
        `/api/purchase-request/${created.id}/events/submit`,
  );
  await row.getByRole("button", { name: "Submit", exact: true }).click();
  expect((await submitted).ok()).toBe(true);
  await expect(field(row, "Status")).toHaveText("Submitted");
  return created.id;
}

test("Shared workspace supports a usable responsive Purchase approval application", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(30_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
  expect(factoryProject).toMatch(/^factory-t9-[a-z0-9-]+$/);
  const workbench = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryProject}`,
    "--filter",
    "label=com.docker.compose.service=workbench",
    "--quiet",
  ]);
  expect(workbench).toMatch(/^[a-f0-9]+$/);
  expect(
    docker([
      "exec",
      workbench,
      "node",
      "-e",
      "console.log(Boolean(process.env.OPENAI_API_KEY))",
    ]),
  ).toBe("false");
  const interpretation = await purchaseRequestInterpretationFixture(
    `purchase-${randomUUID()}`,
  );
  expect(interpretation.interpretation.spec.openQuestions).toHaveLength(0);
  await page.route("**/api/requirements/interpret", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(interpretation),
    });
  });
  let compilationId: string | null = null;
  let calls = 0;
  let productCreates = 0;
  const lifecycle: string[] = [];
  const pending: Promise<void>[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    if (path === "/api/requirements/interpret") calls++;
    if (path === "/product/requirements") productCreates++;
    if (path.endsWith("/published-revisions")) lifecycle.push("publish");
    if (path === "/compilations") {
      lifecycle.push("compile");
      pending.push(
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
      .fill(purchaseRequestFixtureBrief);
    await page.getByRole("button", { name: "Create product" }).click();
    const delivery = page.getByRole("region", { name: "Approval delivery" });
    await expect(delivery).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /Choose |Apply to Draft/ }),
    ).toHaveCount(0);
    stage = "delivery";
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
        { timeout: 1_500_000 },
      )
      .not.toBe("pending");
    expect(outcome).toBe("ready");
    const elapsedToReadyMs = Date.now() - start;
    expect(elapsedToReadyMs, "prepared local ready target").toBeLessThanOrEqual(
      300_000,
    );
    await Promise.all(pending);
    if (!compilationId) throw new Error("No immutable compilation observed.");
    console.info(
      "FACTORY_PURCHASE_READY",
      JSON.stringify({ compilationId, elapsedToReadyMs }),
    );
    const preview = await currentPreview(request, compilationId);
    const href = await openApp.getAttribute("href");
    expect(preview?.status).toBe("ready");
    expect(href).toBe(preview?.previewUrl);
    if (!href || new URL(href).hostname !== "127.0.0.1")
      throw new Error("No loopback generated app.");
    expect(lifecycle).toEqual(["publish", "compile", "verify", "preview"]);
    expect(calls).toBe(1);
    expect(productCreates).toBe(1);
    generated = await context.newPage();
    generated.on("pageerror", (error) => errors.push(error.name));
    await generated.goto(href);
    await verifyApprovalAssets(generated);
    await verifyAssetFailureDetection(generated);
    await expect(
      generated.getByText("Requests and approvals", { exact: true }),
    ).toBeVisible();
    await navigateApproval(generated, "Purchase request list");
    await expect(generated.locator(".generated-records > li")).toHaveCount(1);
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      const seed = generated.locator(".generated-records > li").first();
      await expect(seed.getByRole("heading", { level: 3 })).toBeInViewport();
      await expect(field(seed, "Needed by")).toBeInViewport();
      const box = await seed
        .getByRole("button", { name: "Submit", exact: true })
        .boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(650);
      console.info(
        "FACTORY_PURCHASE_FIRST_VIEW",
        JSON.stringify({
          width,
          firstActionBottom: Math.ceil(box!.y + box!.height),
        }),
      );
    }
    await generated.setViewportSize({ width: 390, height: 900 });
    stage = "requester-submit";
    const approvedItem = "Adjustable desk for the shared workspace";
    const rejectedItem = "Conference room display and installation accessories";
    const approvedId = await createRequest(
      generated,
      approvedItem,
      "450.50",
      true,
    );
    const rejectedId = await createRequest(
      generated,
      rejectedItem,
      "725.25",
      false,
    );
    const headers = (role: string) => ({
      "x-factory-fixture-session": `fixture-session-${role}`,
    });
    await verifyDecisionHistory(generated, {
      auditor: "procurement",
      requester: "requester",
      entity: "purchase-request",
    });
    const approveUrl = new URL(
      `/api/purchase-request/${approvedId}/events/approve`,
      href,
    ).toString();
    expect(
      (
        await request.post(approveUrl, {
          headers: headers("requester"),
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(new URL("/api/audit", href).toString(), {
          headers: headers("requester"),
        })
      ).status(),
    ).toBe(403);
    stage = "manager-decision";
    await navigateApproval(generated, "Approval queue");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("manager");
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await layout(generated, width);
      await verifyWorkspaceComposition(generated, width);
      if (width === 390) {
        await openApprovalNavigation(generated);
        await generated.screenshot({
          path: resolve(evidence, "workspace-navigation-390.png"),
          fullPage: true,
        });
        await generated
          .locator("details")
          .filter({
            has: generated.locator('nav[aria-label="Application routes"]'),
          })
          .locator(":scope > summary")
          .click();
      }
      await generated.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
    }
    await generated.setViewportSize({ width: 390, height: 900 });
    for (const [id, item, action, status] of [
      [approvedId, approvedItem, "approve", "Approved"],
      [rejectedId, rejectedItem, "reject", "Rejected"],
    ]) {
      await generated
        .getByLabel("Search records", { exact: true })
        .fill(`  ${item.toUpperCase()}  `);
      await generated
        .getByRole("combobox", { name: "Status filter", exact: true })
        .selectOption("submitted");
      await expect(generated.locator(".generated-records > li")).toHaveCount(1);
      const row = record(generated, item);
      await expect(field(row, "Status")).toHaveText("Submitted");
      await expectDecisionOnlyActions(generated);
      const decision = generated.waitForResponse(
        (r) =>
          r.request().method() === "POST" &&
          new URL(r.url()).pathname ===
            `/api/purchase-request/${id}/events/${action}`,
      );
      await row
        .getByRole("button", {
          name: action === "approve" ? "Approve" : "Reject",
          exact: true,
        })
        .click();
      expect((await decision).ok()).toBe(true);
      await expect(row).toHaveCount(0);
      await expect(
        generated
          .locator("main.generated-app")
          .getByRole("status")
          .filter({ hasText: `Purchase request: ${status}.` }),
      ).toBeVisible();
      await generated
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await expect(field(row, "Status")).toHaveText(status);
      await expect(row.getByRole("button")).toHaveCount(0);
    }
    expect(
      (
        await request.post(approveUrl, {
          headers: headers("manager"),
          data: {},
        })
      ).status(),
    ).toBe(403);
    stage = "procurement-audit";
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("procurement");
    await expect(field(record(generated, approvedItem), "Status")).toHaveText(
      "Approved",
    );
    await expect(
      record(generated, approvedItem).getByRole("button"),
    ).toHaveCount(0);
    await expectDecisionOnlyActions(generated);
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await layout(generated, width);
    }
    await generated.setViewportSize({ width: 390, height: 900 });
    const audit = await request.get(new URL("/api/audit", href).toString(), {
      headers: headers("procurement"),
    });
    expect(audit.ok()).toBe(true);
    const auditEvents = (await audit.json()) as {
      recordId: string;
      action: string;
      actor: string;
    }[];
    for (const [id, action] of [
      [approvedId, "approve"],
      [rejectedId, "reject"],
    ]) {
      expect(
        auditEvents.some(
          (event) =>
            event.recordId === id &&
            event.action === action &&
            event.actor === "manager",
        ),
      ).toBe(true);
    }
    stage = "results";
    await verifyDecisionHistory(generated, {
      auditor: "procurement",
      requester: "requester",
      entity: "purchase-request",
      identities: [approvedItem, rejectedItem],
      evidence,
    });
    await navigateApproval(generated, "Purchase request list");
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("requester");
    await generated.reload();
    for (const [id, item, amount, status] of [
      [approvedId, approvedItem, "450.50", "Approved"],
      [rejectedId, rejectedItem, "725.25", "Rejected"],
    ]) {
      const row = record(generated, item);
      await expect(field(row, "Status")).toHaveText(status);
      await expect(row.getByRole("heading", { level: 3 })).toContainText(item);
      await expectRequestValues(row, id, amount);
    }
    await openApprovalNavigation(generated);
    const nav = generated.getByRole("navigation", {
      name: "Application routes",
    });
    const labels = await nav.getByRole("link").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual([
      "Purchase request dashboard",
      "Purchase request list",
      "Approval queue",
      "Purchase request settings",
      "Requester",
    ]);
    for (const name of labels) {
      await navigateApproval(generated, name.trim());
      await openApprovalNavigation(generated);
      await expect(
        nav.getByRole("link", { name: name.trim(), exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expectDecisionOnlyActions(generated);
    }
    await navigateApproval(generated, "Purchase request list");
    stage = "record-finding";
    await verifyRecordFinding(generated, approvedItem);
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await generated.evaluate(() => window.scrollTo(0, 0));
      await expect(generated.locator(".generated-records > li")).toHaveCount(3);
      await layout(generated, width);
      await verifyWorkspaceComposition(generated, width);
      await generated.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      });
      await generated.screenshot({
        path: resolve(evidence, `workspace-results-${width}.png`),
        fullPage: true,
      });
    }
    stage = "recoverable-states";
    await verifyRecoverableListStates(generated);
    expect(errors).toEqual([]);
    console.info(
      "FACTORY_PURCHASE_BUSINESS",
      JSON.stringify({
        lane: "deterministic-selection-real-runtime",
        compilationId,
        requests: 2,
        approved: 1,
        rejected: 1,
        crossRoleDenied: true,
        invalidTransitionDenied: true,
        procurementAuditApi: true,
        reloadRetained: true,
        sharedRecordFinding: true,
        knownRecordInputChanges: 2,
        clearActions: 1,
        filteredMutationFeedback: true,
        refreshPreservesFilters: true,
        roleChangeClearsFilters: true,
        questions: 0,
        technicalHandoffs: 0,
        interpretationCalls: calls,
        elapsedToReadyMs,
        elapsedToTaskMs: Date.now() - start,
      }),
    );
  } catch (error) {
    console.info(
      "FACTORY_PURCHASE_FAILURE",
      JSON.stringify({
        stage,
        compilationId,
        calls,
        lifecycle,
        elapsedMs: Date.now() - start,
      }),
    );
    throw error;
  } finally {
    await Promise.allSettled(pending);
    await generated?.close();
    await page.close();
    if (compilationId) await stopExactPreview(request, compilationId);
  }
});
