import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import {
  taskFixtureBrief,
  taskInterpretationFixture,
} from "./consumer-task-fixture";
import {
  immutableTaskFingerprint,
  navigateTask,
  openTaskNavigation,
  taskField,
  verifyTaskAssetFailureDetection,
  verifyTaskAssets,
  verifyTaskEmittedIconSupply,
  verifyTaskPresentation,
} from "./task-presentation";

const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBase = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const timeoutMs = 1_800_000;
const evidenceDirectory = resolve(
  process.cwd(),
  "docs/acceptance/evidence/consumer-task/team-task-tracking",
);

type Preview = {
  id: string;
  compilationId: string;
  status: string;
  previewUrl: string | null;
  composeProjectName: string;
};

type TaskValues = {
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

type TaskRecord = TaskValues & {
  id: string;
  status: "not-started" | "in-progress" | "completed";
  version: number;
};

function serializedValues(values: TaskValues) {
  return { ...values, dueDate: `${values.dueDate}T00:00:00.000Z` };
}

function expectTaskRecord(
  value: unknown,
  expected: TaskValues & {
    readonly id?: string;
    readonly status: TaskRecord["status"];
    readonly version: number;
  },
): asserts value is TaskRecord {
  expect(Object.keys(value as object).sort()).toEqual([
    "assignee",
    "description",
    "dueDate",
    "id",
    "priority",
    "status",
    "title",
    "version",
  ]);
  expect(value).toMatchObject({
    ...serializedValues(expected),
    status: expected.status,
    version: expected.version,
    ...(expected.id ? { id: expected.id } : {}),
  });
}

async function expectTaskError(
  response: Awaited<ReturnType<APIRequestContext["post"]>>,
  status: number,
  body: unknown,
) {
  expect(response.status()).toBe(status);
  expect(await response.json()).toEqual(body);
}

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

function dockerWithInput(args: readonly string[], input: string): string {
  return execFileSync("docker", [...args], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

type PersistedTaskMutationFacts = {
  auditCounts: number[];
  receiptCounts: number[];
  hashedKeyShape: boolean;
  rawKeyRetained: boolean;
};

function persistedTaskMutationFacts(
  previewProject: string,
  recordIds: readonly string[],
): PersistedTaskMutationFacts {
  expect(previewProject).toMatch(/^factory-preview-[a-z0-9-]+$/);
  expect(recordIds).toHaveLength(3);
  expect(recordIds.every((id) => typeof id === "string" && id.length > 0)).toBe(
    true,
  );
  const apiContainer = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${previewProject}`,
    "--filter",
    "label=com.docker.compose.service=api",
    "--format",
    "{{.ID}}",
  ]);
  expect(apiContainer).toMatch(/^[a-f0-9]{12,64}$/);
  const query = `
const { PrismaClient } = require("@prisma/client");
const recordIds = ${JSON.stringify(recordIds)};
const prisma = new PrismaClient();
(async () => {
  try {
    const [audits, receipts] = await Promise.all([
      prisma.factory_AuditEvent.findMany({
        where: { recordId: { in: recordIds } },
        select: { recordId: true },
      }),
      prisma.taskMutationReceipt.findMany({
        where: { recordId: { in: recordIds } },
        select: { recordId: true, idempotencyKey: true },
      }),
    ]);
    const countByRecord = (entries) =>
      recordIds.map((recordId) =>
        entries.filter((entry) => entry.recordId === recordId).length,
      );
    const keyPattern = /^sha256:[a-f0-9]{64}$/;
    process.stdout.write(JSON.stringify({
      auditCounts: countByRecord(audits),
      receiptCounts: countByRecord(receipts),
      hashedKeyShape: receipts.every((receipt) => keyPattern.test(receipt.idempotencyKey)),
      rawKeyRetained: receipts.some((receipt) => !keyPattern.test(receipt.idempotencyKey)),
    }));
  } catch {
    process.stderr.write("persisted task mutation evidence query failed");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
`;
  const output = dockerWithInput(["exec", "-i", apiContainer, "node"], query);
  const facts = JSON.parse(output) as PersistedTaskMutationFacts;
  expect(facts).toEqual({
    auditCounts: expect.any(Array),
    receiptCounts: expect.any(Array),
    hashedKeyShape: expect.any(Boolean),
    rawKeyRetained: expect.any(Boolean),
  });
  return facts;
}

function session(role: "member" | "viewer") {
  return { "x-factory-fixture-session": `fixture-session-${role}` };
}

function commandHeaders(role: "member" | "viewer", key = randomUUID()) {
  return { ...session(role), "x-factory-idempotency-key": key };
}

function record(page: Page, title: string): Locator {
  return page.locator(".task-records > li").filter({ hasText: title });
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
  expect(stopped.ok(), "exact task preview stop").toBe(true);
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

async function createTask(
  page: Page,
  values: TaskValues,
): Promise<{ id: string; version: number }> {
  await navigateTask(page, "All tasks");
  await page.getByRole("link", { name: "Create Task", exact: true }).click();
  if (values.priority === "high") {
    await mkdir(evidenceDirectory, { recursive: true });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByLabel("Title *", { exact: true })).toBeVisible();
      await expect(
        page.getByLabel("Due date *", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(evidenceDirectory, `task-form-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.getByLabel("Demo role", { exact: true }).selectOption("member");
  await page.getByLabel("Title *", { exact: true }).fill(values.title);
  await page
    .getByLabel("Description", { exact: true })
    .fill(values.description);
  await page.getByLabel("Assignee *", { exact: true }).fill(values.assignee);
  await page.getByLabel("Due date *", { exact: true }).fill(values.dueDate);
  await page
    .getByLabel("Priority *", { exact: true })
    .selectOption(values.priority);
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/task",
  );
  await page.getByRole("button", { name: "Create Task", exact: true }).click();
  const response = await created;
  expect(response.status(), "member creates task").toBe(201);
  expect(response.request().headers()["x-factory-idempotency-key"]).toMatch(
    /^[A-Za-z0-9._:-]{1,128}$/,
  );
  expect(response.request().postDataJSON()).toEqual({
    values: serializedValues(values),
  });
  const result: unknown = await response.json();
  expectTaskRecord(result, { ...values, status: "not-started", version: 0 });
  await expect(page.locator("main.task-v1").getByRole("status")).toHaveText(
    "Created Task.",
  );
  await navigateTask(page, "All tasks");
  const row = record(page, values.title);
  await expect(row).toHaveCount(1);
  await expect(taskField(row, "Priority")).toHaveText(values.priority);
  await expect(taskField(row, "Due date")).toHaveText(values.dueDate);
  await expect(taskField(row, "Assignee")).toHaveText(values.assignee);
  await expect(taskField(row, "Status")).toHaveText("Not started");
  return { id: result.id, version: result.version };
}

async function transitionTask(
  page: Page,
  title: string,
  id: string,
  version: number,
  action: "start" | "complete" | "reopen",
  label: "Start" | "Complete" | "Reopen",
  values: TaskValues,
): Promise<number> {
  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      new URL(candidate.url()).pathname === `/api/task/${id}/events/${action}`,
  );
  await record(page, title)
    .getByRole("button", { name: label, exact: true })
    .click();
  const mutation = await response;
  expect(mutation.status(), `member ${action}s task`).toBe(200);
  expect(mutation.request().headers()["x-factory-idempotency-key"]).toMatch(
    /^[A-Za-z0-9._:-]{1,128}$/,
  );
  expect(mutation.request().postDataJSON()).toEqual({
    expectedVersion: version,
  });
  const result: unknown = await mutation.json();
  const status = action === "complete" ? "completed" : "in-progress";
  expectTaskRecord(result, { ...values, id, status, version: version + 1 });
  return result.version;
}

async function verifyTaskFinding(
  page: Page,
  firstTitle: string,
  secondTitle: string,
) {
  const search = page.getByLabel("Search records", { exact: true });
  const status = page.getByRole("combobox", {
    name: "Status filter",
    exact: true,
  });
  await search.fill(`  ${firstTitle.toUpperCase()}  `);
  await status.selectOption("completed");
  await expect(record(page, firstTitle)).toHaveCount(1);
  await expect(record(page, secondTitle)).toHaveCount(0);
  await search.fill("no-matching-team-task");
  await expect(
    page.getByText("No matching records.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No task records yet.", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: resolve(evidenceDirectory, "task-no-match-390.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(status).toHaveValue("");
  await expect(record(page, firstTitle)).toHaveCount(1);
  await expect(record(page, secondTitle)).toHaveCount(1);
}

async function verifyRecovery(page: Page, title: string) {
  let failed = false;
  await page.route("**/api/task", async (route) => {
    if (!failed && route.request().method() === "GET") {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "service.unavailable" }),
      });
      return;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator("main.task-v1").getByRole("alert")).toBeVisible();
    await page.screenshot({
      path: resolve(evidenceDirectory, "task-recovery-390.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(record(page, title)).toHaveCount(1);
  } finally {
    await page.unroute("**/api/task");
  }
}

async function verifyStaleRoleCallback(page: Page, title: string) {
  let releaseViewerRead: (() => void) | undefined;
  const viewerRead = new Promise<void>((resolve) => {
    releaseViewerRead = resolve;
  });
  let viewerReadObserved: (() => void) | undefined;
  const viewerReadStarted = new Promise<void>((resolve) => {
    viewerReadObserved = resolve;
  });
  await page.route("**/api/task", async (route) => {
    if (
      route.request().method() === "GET" &&
      route.request().headers()["x-factory-fixture-session"] ===
        "fixture-session-viewer"
    ) {
      viewerReadObserved!();
      await viewerRead;
    }
    await route.continue();
  });
  try {
    const role = page.getByLabel("Demo role", { exact: true });
    await role.selectOption("viewer");
    await viewerReadStarted;
    await role.selectOption("member");
    await expect(
      page.getByRole("link", { name: "Create Task", exact: true }),
    ).toBeVisible();
    releaseViewerRead!();
    await expect(record(page, title)).toBeVisible();
    await expect(role).toHaveValue("member");
    await expect(
      page.getByRole("link", { name: "Create Task", exact: true }),
    ).toBeVisible();
  } finally {
    releaseViewerRead?.();
    await page.unroute("**/api/task");
  }
}

async function restartTaskApi(
  page: Page,
  previewProject: string,
  taskPath: string,
) {
  expect(previewProject).toMatch(/^factory-preview-[a-z0-9-]+$/);
  const apiContainer = docker([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${previewProject}`,
    "--filter",
    "label=com.docker.compose.service=api",
    "--format",
    "{{.ID}}",
  ]);
  expect(apiContainer).toMatch(/^[a-f0-9]{12,64}$/);
  const startedAt = () =>
    docker(["inspect", "--format", "{{.State.StartedAt}}", apiContainer]);
  const before = startedAt();
  docker(["restart", "--time", "5", apiContainer]);
  expect(startedAt()).not.toBe(before);
  await expect
    .poll(
      async () => {
        try {
          return (
            await page.request.get(new URL(taskPath, page.url()).toString(), {
              headers: session("member"),
            })
          ).status();
        } catch {
          return 0;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(200);
}

async function verifyUnknownCreateRetry(
  page: Page,
  values: TaskValues,
  previewProject: string,
): Promise<TaskRecord> {
  await navigateTask(page, "All tasks");
  await page.getByRole("link", { name: "Create Task", exact: true }).click();
  await page.getByLabel("Demo role", { exact: true }).selectOption("member");
  await page.getByLabel("Title *", { exact: true }).fill(values.title);
  await page
    .getByLabel("Description", { exact: true })
    .fill(values.description);
  await page.getByLabel("Assignee *", { exact: true }).fill(values.assignee);
  await page.getByLabel("Due date *", { exact: true }).fill(values.dueDate);
  await page
    .getByLabel("Priority *", { exact: true })
    .selectOption(values.priority);
  const keys: string[] = [];
  const bodies: unknown[] = [];
  let stored: TaskRecord | undefined;
  await page.route("**/api/task", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().headers()["x-factory-idempotency-key"]!);
    bodies.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    const body: unknown = await response.json();
    expectTaskRecord(body, { ...values, status: "not-started", version: 0 });
    if (keys.length === 1) {
      stored = body;
      await route.abort("connectionreset");
      return;
    }
    expect(body).toEqual(stored);
    await route.fulfill({ response });
  });
  try {
    const create = page.getByRole("button", {
      name: "Create Task",
      exact: true,
    });
    await create.click();
    await expect.poll(() => stored?.version).toBe(0);
    await expect(page.locator("main.task-v1").getByRole("alert")).toHaveText(
      "The outcome is unknown. Retry this action to recover its result.",
    );
    const retry = page.getByRole("button", { name: "Retry", exact: true });
    await expect(retry).toBeVisible();
    await page.screenshot({
      path: resolve(evidenceDirectory, "task-create-retry-390.png"),
      fullPage: true,
    });
    await restartTaskApi(page, previewProject, "/api/task");
    await retry.click();
    await navigateTask(page, "All tasks");
    await expect(record(page, values.title)).toHaveCount(1);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(bodies).toEqual([
      { values: serializedValues(values) },
      { values: serializedValues(values) },
    ]);
    if (!stored) throw new Error("Lost Create response was not stored.");
    return stored;
  } finally {
    await page.unroute("**/api/task");
  }
}

async function verifyPendingEventRetry(
  page: Page,
  title: string,
  id: string,
  version: number,
  values: TaskValues,
): Promise<number> {
  const path = `/api/task/${id}/events/start`;
  let releaseFirst: (() => void) | undefined;
  const firstHeld = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let firstSeen: (() => void) | undefined;
  const firstRequested = new Promise<void>((resolve) => {
    firstSeen = resolve;
  });
  const keys: string[] = [];
  let stored: TaskRecord | undefined;
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().headers()["x-factory-idempotency-key"]!);
    if (keys.length === 1) {
      firstSeen!();
      await firstHeld;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expectTaskRecord(body, {
      ...values,
      id,
      status: "in-progress",
      version: 1,
    });
    if (keys.length === 1) {
      stored = body;
      await route.abort("connectionreset");
      return;
    }
    expect(body).toEqual(stored);
    await route.fulfill({ response });
  });
  try {
    const start = record(page, title).getByRole("button", {
      name: "Start",
      exact: true,
    });
    await start.click();
    await firstRequested;
    await expect(start).toBeDisabled();
    await start.dispatchEvent("click");
    expect(keys).toHaveLength(1);
    await page.screenshot({
      path: resolve(evidenceDirectory, "task-pending-start-390.png"),
      fullPage: true,
    });
    releaseFirst!();
    await expect.poll(() => stored?.version).toBe(1);
    await expect(page.locator("main.task-v1").getByRole("alert")).toHaveText(
      "The outcome is unknown. Retry this action to recover its result.",
    );
    const retry = record(page, title).getByRole("button", {
      name: "Retry",
      exact: true,
    });
    await retry.click();
    await expect(taskField(record(page, title), "Status")).toHaveText(
      "In progress",
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    return stored!.version;
  } finally {
    releaseFirst?.();
    await page.unroute(`**${path}`);
  }
}

test("D2.5 deterministic Task selection publishes a safe shared board", async ({
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

  const interpretation = await taskInterpretationFixture(
    `team-task-tracking-${randomUUID()}`,
  );
  let interpretationCalls = 0;
  let compilationId: string | null = null;
  const lifecycle: string[] = [];
  const pageErrors: string[] = [];
  let generated: Page | null = null;
  let stage = "describe";
  const startedAt = Date.now();
  page.on("pageerror", (error) => pageErrors.push(error.name));
  page.on("request", (candidate) => {
    if (
      candidate.method() === "POST" &&
      new URL(candidate.url()).pathname === "/api/requirements/interpret"
    )
      interpretationCalls += 1;
  });
  page.on("response", (response) => {
    if (response.request().method() !== "POST") return;
    const path = new URL(response.url()).pathname;
    if (path.endsWith("/published-revisions")) lifecycle.push("publish");
    if (path === "/compilations") {
      lifecycle.push("compile");
      void response
        .json()
        .then((body: { id?: unknown }) => {
          if (typeof body.id === "string") compilationId = body.id;
        })
        .catch(() => undefined);
    }
    if (/\/compilations\/[^/]+\/verification-runs$/.test(path))
      lifecycle.push("verify");
    if (/\/compilations\/[^/]+\/preview-runs$/.test(path))
      lifecycle.push("preview");
  });
  await page.route("**/api/requirements/interpret", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(interpretation),
    });
  });

  try {
    await page.goto("/");
    await page.getByLabel("Requirement brief").fill(taskFixtureBrief);
    const interpreted = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
    );
    await page.getByRole("button", { name: "Create product" }).click();
    expect((await interpreted).status()).toBe(200);
    const delivery = page.getByRole("region", { name: "Task delivery" });
    await expect(delivery).toBeVisible({ timeout: 60_000 });
    const openApp = delivery.getByRole("link", { name: "Open local app" });
    await expect
      .poll(async () => await openApp.isVisible(), { timeout: 300_000 })
      .toBe(true);
    const elapsedToReadyMs = Date.now() - startedAt;
    expect(elapsedToReadyMs, "prepared local ready target").toBeLessThanOrEqual(
      300_000,
    );
    expect(interpretationCalls).toBe(1);
    expect(lifecycle).toEqual(["publish", "compile", "verify", "preview"]);
    if (!compilationId)
      throw new Error("No immutable compilation was observed.");
    const immutableBefore = await immutableTaskFingerprint(
      request,
      controlPlaneUrl(`/compilations/${compilationId}`),
    );
    const preview = await currentPreview(request, compilationId);
    const href = await openApp.getAttribute("href");
    expect(preview?.status).toBe("ready");
    expect(href).toBe(preview?.previewUrl);
    if (!href || new URL(href).hostname !== "127.0.0.1")
      throw new Error("No loopback generated app.");

    generated = await context.newPage();
    generated.on("pageerror", (error) => pageErrors.push(error.name));
    await generated.goto(href);
    await verifyTaskAssets(generated);
    await verifyTaskAssetFailureDetection(generated);
    await expect(
      generated.getByLabel("Demo role", { exact: true }),
    ).toBeVisible();
    await mkdir(evidenceDirectory, { recursive: true });
    await generated.setViewportSize({ width: 390, height: 900 });
    await generated.screenshot({
      path: resolve(evidenceDirectory, "task-home-390.png"),
      fullPage: true,
    });
    await expect(generated.getByText(/approval|expense/i)).toHaveCount(0);
    stage = "member-create";
    const first: TaskValues = {
      title: "Synthetic release checklist",
      description: "Verify the generated local task board.",
      assignee: "Taylor",
      dueDate: "2026-09-30",
      priority: "high",
    };
    const second: TaskValues = {
      title: "Synthetic handoff notes",
      description: "Capture the team handoff before the due date.",
      assignee: "Morgan",
      dueDate: "2026-10-02",
      priority: "medium",
    };
    const firstRecord = await createTask(generated, first);
    await createTask(generated, second);
    await generated.setViewportSize({ width: 390, height: 900 });
    await generated.evaluate(() => window.scrollTo(0, 0));
    await navigateTask(generated, "All tasks");
    const unfilteredRows = generated.locator(".task-records > li");
    const firstPermittedStart = unfilteredRows
      .filter({
        has: generated.getByRole("button", { name: "Start", exact: true }),
      })
      .first()
      .getByRole("button", { name: "Start", exact: true });
    await expect(firstPermittedStart).toBeVisible();
    const firstStartBounds = await firstPermittedStart.boundingBox();
    expect(
      firstStartBounds,
      "first permitted Start is measurable",
    ).not.toBeNull();
    expect(
      firstStartBounds!.y + firstStartBounds!.height,
      "first permitted member action fits above fold",
    ).toBeLessThanOrEqual(650);
    for (const index of [0, 1]) {
      const row = unfilteredRows.nth(index);
      const heading = row.getByRole("heading", { level: 3 });
      const summary = row.locator(".task-summary");
      await expect(heading).toBeVisible();
      await expect(summary).toBeVisible();
      expect((await heading.innerText()).trim(), "row identity").not.toBe("");
      for (const content of [heading, summary]) {
        const bounds = await content.boundingBox();
        expect(bounds, "first two row details are measurable").not.toBeNull();
        expect(
          bounds!.y + bounds!.height,
          "first two row identities and summaries fit at 390 by 900",
        ).toBeLessThanOrEqual(900);
      }
    }
    await generated.screenshot({
      path: resolve(evidenceDirectory, "task-list-unfiltered-390.png"),
      fullPage: true,
    });
    const visualSearch = generated.getByLabel("Search records", {
      exact: true,
    });
    await visualSearch.fill("Synthetic");
    await expect(unfilteredRows).toHaveCount(2);
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await expect(record(generated, first.title)).toHaveCount(1);
      await expect(record(generated, second.title)).toHaveCount(1);
      const action = record(generated, first.title).getByRole("button", {
        name: "Start",
        exact: true,
      });
      await expect(action).toBeInViewport();
      const bounds = await action.boundingBox();
      expect(
        bounds!.y + bounds!.height,
        "first member action fits above fold",
      ).toBeLessThanOrEqual(650);
      await verifyTaskPresentation(generated, width);
      await generated.screenshot({
        path: resolve(evidenceDirectory, `task-list-${width}.png`),
        fullPage: true,
      });
      if (width === 390) {
        await expect(
          taskField(record(generated, first.title), "Assignee"),
        ).toBeInViewport();
        await expect(
          taskField(record(generated, second.title), "Priority"),
        ).toBeInViewport();
        for (const control of await generated
          .locator("main.task-v1")
          .locator("a:visible, button:visible, select:visible, summary:visible")
          .all()) {
          const box = await control.boundingBox();
          expect(
            box!.height,
            "mobile touch target height",
          ).toBeGreaterThanOrEqual(44);
          expect(
            box!.width,
            "mobile touch target width",
          ).toBeGreaterThanOrEqual(44);
        }
      }
    }
    await generated
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(visualSearch).toHaveValue("");
    await generated.setViewportSize({ width: 390, height: 900 });
    const recoveredCreate = await verifyUnknownCreateRetry(
      generated,
      {
        title: "Synthetic retry receipt",
        description: "Recover a stored create result after a lost response.",
        assignee: "Casey",
        dueDate: "2026-10-03",
        priority: "low",
      },
      preview!.composeProjectName,
    );
    await navigateTask(generated, "All tasks");
    stage = "member-lifecycle";
    let version = await verifyPendingEventRetry(
      generated,
      first.title,
      firstRecord.id,
      firstRecord.version,
      first,
    );
    await expect(
      taskField(record(generated, first.title), "Status"),
    ).toHaveText("In progress");
    version = await transitionTask(
      generated,
      first.title,
      firstRecord.id,
      version,
      "complete",
      "Complete",
      first,
    );
    await expect(
      taskField(record(generated, first.title), "Status"),
    ).toHaveText("Completed");
    await generated
      .getByRole("combobox", { name: "Status filter", exact: true })
      .selectOption("completed");
    await expect(record(generated, first.title)).toHaveCount(1);
    version = await transitionTask(
      generated,
      first.title,
      firstRecord.id,
      version,
      "reopen",
      "Reopen",
      first,
    );
    await expect(record(generated, first.title)).toHaveCount(0);
    const mutationStatus = generated.locator(".task-list-mutation");
    await expect(mutationStatus).toHaveAttribute("role", "status");
    await expect(mutationStatus).toHaveText("Task: In progress.");
    await generated.screenshot({
      path: resolve(evidenceDirectory, "task-reopen-filtered-390.png"),
      fullPage: true,
    });
    await generated
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    version = await transitionTask(
      generated,
      first.title,
      firstRecord.id,
      version,
      "complete",
      "Complete",
      first,
    );
    await expect(
      taskField(record(generated, first.title), "Status"),
    ).toHaveText("Completed");
    await verifyTaskFinding(generated, first.title, second.title);
    await verifyRecovery(generated, first.title);
    await verifyStaleRoleCallback(generated, first.title);

    stage = "viewer-denials";
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("viewer");
    await expect(
      generated.getByRole("link", { name: "Create Task", exact: true }),
    ).toHaveCount(0);
    await expect(record(generated, first.title)).toBeVisible();
    await generated.screenshot({
      path: resolve(evidenceDirectory, "task-viewer-read-390.png"),
      fullPage: true,
    });
    const recordUrl = new URL(`/api/task/${firstRecord.id}`, href).toString();
    const eventUrl = (event: string) =>
      new URL(`/api/task/${firstRecord.id}/events/${event}`, href).toString();
    const deniedCreate = await request.post(
      new URL("/api/task", href).toString(),
      {
        headers: commandHeaders("viewer"),
        data: { values: serializedValues(first) },
      },
    );
    await expectTaskError(deniedCreate, 403, { code: "task.denied" });
    for (const event of ["start", "complete", "reopen"]) {
      const denied = await request.post(eventUrl(event), {
        headers: commandHeaders("viewer"),
        data: { expectedVersion: version },
      });
      await expectTaskError(denied, 403, { code: "task.denied" });
    }
    const invalid = await request.post(eventUrl("start"), {
      headers: commandHeaders("member"),
      data: { expectedVersion: version },
    });
    await expectTaskError(invalid, 403, { code: "task.denied" });
    const read = await request.get(recordUrl, { headers: session("viewer") });
    expect(read.status(), "viewer reads task").toBe(200);
    const viewerRead = (await read.json()) as Record<string, unknown>;
    expect(Object.keys(viewerRead).sort()).toEqual([
      "assignee",
      "createdAt",
      "description",
      "dueDate",
      "id",
      "priority",
      "status",
      "title",
      "updatedAt",
      "version",
    ]);
    expect(viewerRead).toMatchObject({
      ...serializedValues(first),
      id: firstRecord.id,
      status: "completed",
      version,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(Date.parse(String(viewerRead.createdAt))).toBeGreaterThan(0);
    expect(Date.parse(String(viewerRead.updatedAt))).toBeGreaterThan(0);
    const invalidCreate = await request.post(
      new URL("/api/task", href).toString(),
      {
        headers: commandHeaders("member"),
        data: {
          values: { ...serializedValues(first), status: "completed" },
        },
      },
    );
    await expectTaskError(invalidCreate, 400, { code: "task.invalid_request" });

    stage = "replay-and-conflict";
    const replayValues: TaskValues = {
      ...second,
      title: "Synthetic idempotent create",
    };
    const replayKey = randomUUID();
    const replay = await request.post(new URL("/api/task", href).toString(), {
      headers: commandHeaders("member", replayKey),
      data: { values: serializedValues(replayValues) },
    });
    expect(replay.status()).toBe(201);
    const replayRecord: unknown = await replay.json();
    expectTaskRecord(replayRecord, {
      ...replayValues,
      status: "not-started",
      version: 0,
    });
    const replayed = await request.post(new URL("/api/task", href).toString(), {
      headers: commandHeaders("member", replayKey),
      data: { values: serializedValues(replayValues) },
    });
    expect(replayed.status()).toBe(201);
    expect(await replayed.json()).toEqual(replayRecord);
    const keyReuseConflict = await request.post(
      new URL("/api/task", href).toString(),
      {
        headers: commandHeaders("member", replayKey),
        data: {
          values: serializedValues({
            ...replayValues,
            title: "Synthetic changed retry payload",
          }),
        },
      },
    );
    await expectTaskError(keyReuseConflict, 409, {
      code: "task.idempotency_conflict",
    });
    const competitors = await Promise.all(
      [randomUUID(), randomUUID()].map((key) =>
        request.post(
          new URL(`/api/task/${replayRecord.id}/events/start`, href).toString(),
          {
            headers: commandHeaders("member", key),
            data: { expectedVersion: 0 },
          },
        ),
      ),
    );
    expect(competitors.map((response) => response.status()).sort()).toEqual([
      200, 409,
    ]);
    const winner = competitors.find((response) => response.status() === 200)!;
    expectTaskRecord(await winner.json(), {
      ...replayValues,
      id: replayRecord.id,
      status: "in-progress",
      version: 1,
    });
    const loser = competitors.find((response) => response.status() === 409)!;
    await expectTaskError(loser, 409, {
      code: "task.version_conflict",
      current: {
        id: replayRecord.id,
        status: "in-progress",
        version: 1,
      },
    });
    const stale = await request.post(eventUrl("reopen"), {
      headers: commandHeaders("member"),
      data: { expectedVersion: version - 1 },
    });
    await expectTaskError(stale, 409, {
      code: "task.version_conflict",
      current: { id: firstRecord.id, status: "completed", version },
    });

    stage = "reload";
    await generated
      .getByLabel("Demo role", { exact: true })
      .selectOption("member");
    await generated.reload();
    const persisted = record(generated, first.title);
    await expect(
      persisted.getByRole("heading", { level: 3, name: first.title }),
    ).toBeVisible();
    await expect(taskField(persisted, "Assignee")).toHaveText(first.assignee);
    await expect(taskField(persisted, "Due date")).toHaveText(first.dueDate);
    await expect(taskField(persisted, "Priority")).toHaveText(first.priority);
    await expect(taskField(persisted, "Status")).toHaveText("Completed");
    await openTaskNavigation(generated);
    const navigation = generated.getByRole("navigation", {
      name: "Application routes",
    });
    for (const label of ["Task overview", "All tasks", "Task workflow"]) {
      await navigateTask(generated, label);
      await openTaskNavigation(generated);
      await expect(
        navigation.getByRole("link", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
    }
    await navigateTask(generated, "All tasks");
    await mkdir(evidenceDirectory, { recursive: true });
    for (const width of [390, 768, 1440]) {
      await generated.setViewportSize({ width, height: 900 });
      await generated.screenshot({
        path: resolve(evidenceDirectory, `task-results-${width}.png`),
        fullPage: true,
      });
    }
    expect(pageErrors).toEqual([]);
    expect(
      await immutableTaskFingerprint(
        request,
        controlPlaneUrl(`/compilations/${compilationId}`),
      ),
    ).toBe(immutableBefore);
    const webContainer = docker([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${preview!.composeProjectName}`,
      "--filter",
      "label=com.docker.compose.service=web",
      "--quiet",
    ]);
    expect(webContainer).toMatch(/^[a-f0-9]{12,64}$/);
    const emittedUi = resolve(
      process.cwd(),
      ".superpowers/sdd/2026-09-11-canonical-team-task-family/task-emitted-ui",
    );
    await mkdir(emittedUi, { recursive: true });
    for (const file of ["page-runtime.tsx", "globals.css"])
      docker([
        "cp",
        `${webContainer}:/app/app/${file}`,
        resolve(emittedUi, file),
      ]);
    await verifyTaskEmittedIconSupply(
      await readFile(resolve(emittedUi, "page-runtime.tsx"), "utf8"),
    );
    stage = "persistence-cardinality";
    const persistedMutationFacts = persistedTaskMutationFacts(
      preview!.composeProjectName,
      [firstRecord.id, replayRecord.id, recoveredCreate.id],
    );
    expect(persistedMutationFacts.auditCounts).toEqual([5, 2, 1]);
    expect(persistedMutationFacts.receiptCounts).toEqual([5, 2, 1]);
    expect(persistedMutationFacts.hashedKeyShape).toBe(true);
    expect(persistedMutationFacts.rawKeyRetained).toBe(false);
    console.info(
      "FACTORY_TASK_BUSINESS",
      JSON.stringify({
        lane: "deterministic-selection-real-runtime",
        tasks: 2,
        lifecycle: ["start", "complete", "reopen", "complete"],
        viewerDenied: ["create", "start", "complete", "reopen"],
        invalidTransitionDenied: true,
        idempotentCreateReplay: true,
        staleTransitionDenied: true,
        reloadRetained: true,
        persistedMutationFacts,
        interpretationCalls,
        elapsedToReadyMs,
        elapsedToTaskMs: Date.now() - startedAt,
      }),
    );
  } catch (error) {
    if (generated) {
      await mkdir(evidenceDirectory, { recursive: true }).catch(
        () => undefined,
      );
      await generated
        .screenshot({
          path: resolve(
            evidenceDirectory,
            `failure-generated-${Date.now()}.png`,
          ),
          fullPage: true,
        })
        .catch(() => undefined);
    }
    console.info(
      "FACTORY_TASK_FAILURE",
      JSON.stringify({
        stage,
        compilationId,
        interpretationCalls,
        lifecycle,
        elapsedMs: Date.now() - startedAt,
      }),
    );
    throw error;
  } finally {
    await generated?.close();
    if (compilationId) await stopExactPreview(request, compilationId);
  }
});
