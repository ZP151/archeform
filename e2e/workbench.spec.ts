import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { ApplicationGraphV1 } from "@factory/graph";

type PreviewRunResponse = {
  readonly id: string;
  readonly compilationId: string;
};

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function expectPreviewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): void {
  if (!factoryE2eProject)
    throw new Error(
      "FACTORY_E2E_FACTORY_PROJECT is required for isolated preview cleanup checks.",
    );

  expect(
    dockerOutput([
      "compose",
      "--project-name",
      factoryE2eProject,
      "-f",
      "infra/docker-compose.yml",
      "exec",
      "-T",
      "compiler-worker",
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
  ).toBe("");
  expect(
    dockerOutput([
      "network",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
  ).toBe("");
  expect(
    dockerOutput([
      "volume",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
  ).toBe("");
}

const expenseCapabilityTemplateLocks = [
  {
    assetKey: "core.audit",
    assetVersion: "1.0.1",
    source: "templates/api/capability-module.ts.tpl",
    target: "api/src/capabilities/core.audit.ts",
    outputSlot: "api.runtime",
    digest:
      "sha256:9bb2507b6d1e72605a9782257a6dd3e2cee130273391b331534005bb78c3a71f",
  },
  {
    assetKey: "core.crud",
    assetVersion: "1.0.1",
    source: "templates/api/capability-module.ts.tpl",
    target: "api/src/capabilities/core.crud.ts",
    outputSlot: "api.runtime",
    digest:
      "sha256:5e1bcc06560ccdd1062c786618a883de6df9234d2134c89361b3adaab0700955",
  },
  {
    assetKey: "core.notification",
    assetVersion: "1.0.1",
    source: "templates/api/capability-module.ts.tpl",
    target: "api/src/capabilities/core.notification.ts",
    outputSlot: "api.runtime",
    digest:
      "sha256:b9a745255d242339486fff29d6f7abd3f751e36df3e348f896956a31c6b53266",
  },
  {
    assetKey: "core.workflow",
    assetVersion: "1.0.1",
    source: "templates/api/capability-module.ts.tpl",
    target: "api/src/capabilities/core.workflow.ts",
    outputSlot: "api.runtime",
    digest:
      "sha256:209d5d649840437f334ac53aa593634c9cdb8fbfe5cc7525ed96f80ac91947bb",
  },
];

test("creates a named application Draft through the guided business-user journey", async ({
  page,
}) => {
  const name = `Travel approvals ${Date.now().toString()}`;
  await page.goto("/");

  await page.getByRole("button", { name: "New application" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create application left-side drawer" }),
  ).toBeVisible();
  await page.getByTestId("guided-template-expense-approval").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Draft only · light mode")).toBeVisible();
  await page.getByTestId("guided-create").click();

  await expect(
    page.getByRole("dialog", { name: "Create application left-side drawer" }),
  ).toBeHidden();
  await expect(page.getByLabel("Current application")).toHaveText(name);
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Published" })).toHaveCount(0);
});

test("creates an audit-free Expense Draft from the capability picker", async ({
  page,
}) => {
  const name = `Audit free expense ${Date.now().toString()}`;
  await page.goto("/");

  await page.getByRole("button", { name: "New application" }).click();
  await page.getByTestId("guided-template-expense-approval").click();
  await page.getByRole("button", { name: "Continue" }).click();
  const audit = page.getByTestId("guided-capability-core.audit");
  await expect(audit).toHaveAttribute("aria-pressed", "true");
  await audit.click();
  await expect(audit).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Selected capabilities")).toBeVisible();

  const persistedDraft = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/workspaces/local/application-graphs"),
  );
  await page.getByTestId("guided-create").click();
  const payload = (await persistedDraft).json() as Promise<{
    draftRevisions: Array<{ graph: ApplicationGraphV1 }>;
  }>;
  const graph = (await payload).draftRevisions[0]!.graph;

  expect(
    graph.integration.capabilities.map((capability) => capability.key),
  ).not.toContain("audit.record");
  expect(
    graph.flow.flows.flatMap((flow) =>
      flow.transitions.flatMap((transition) => transition.effects ?? []),
    ),
  ).not.toContainEqual(expect.objectContaining({ capability: "audit.record" }));
  expect(graph.integration.compositionProfile).toBe("expense-approval");
  expect(graph.integration.assetLocks).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ key: "core.crud", lifecycle: "golden" }),
      expect.objectContaining({ key: "core.workflow", lifecycle: "golden" }),
    ]),
  );
  expect(graph.integration.assetLocks).not.toContainEqual(
    expect.objectContaining({ key: "core.audit" }),
  );
  await expect(
    page.getByRole("dialog", { name: "Create application left-side drawer" }),
  ).toBeHidden();
  await expect(page.getByLabel("Current application")).toHaveText(name);
});

test("edits a Draft, publishes an immutable revision, and compiles it", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await page.goto("/");

  const name = `Executable expense ${Date.now().toString()}`;
  await page.getByRole("button", { name: "New application" }).click();
  await page.getByTestId("guided-template-expense-approval").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("guided-create").click();
  await expect(
    page.getByRole("dialog", { name: "Create application left-side drawer" }),
  ).toBeHidden();
  await expect(page.getByLabel("Current application")).toHaveText(name);

  await expect(page.locator('[data-theme="light"]')).toBeVisible();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();

  const routeSuffix = Date.now().toString();
  await page.getByLabel("New page").fill(`Journey ${routeSuffix}`);
  await page.getByRole("button", { name: "Add page" }).click();
  await expect(page.getByLabel("Path")).toHaveValue(`/journey-${routeSuffix}`);
  await page.getByLabel("Entity binding").selectOption("expense");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();

  await page.getByRole("button", { name: "Flow" }).click();
  await expect(page.getByLabel("React Flow Flow Studio")).toBeVisible();

  await page.getByRole("button", { name: "Domain" }).click();
  const entityKey = `journey-${routeSuffix}`;
  await page.getByLabel("Entity key").fill(entityKey);
  await page.getByLabel("Label").fill(`Journey ${routeSuffix}`);
  await page.getByRole("button", { name: "Add entity" }).click();
  await expect(page.getByTestId(`rf__node-domain:${entityKey}`)).toBeVisible();

  await page.getByLabel("Relation target").selectOption("expense");
  await page.getByRole("button", { name: "Add relation" }).click();
  await expect(page.getByText(/declared relation/)).toBeVisible();
  const fieldKey = `e2e${Date.now()}`;
  await page.getByLabel("Field key").fill(fieldKey);
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(
    page.locator(".domain-existing-field code", { hasText: fieldKey }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("button", { name: "Published" })).toBeVisible();
  await page.getByRole("button", { name: "Compile" }).click();

  await expect(page.getByLabel("Generated artifact manifest")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText("Compile succeeded", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/immutable outputs/)).toBeVisible();

  const startedPreview = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
  );
  await page.getByRole("button", { name: "Start preview" }).click();
  const previewRun = (
    await startedPreview
  ).json() as Promise<PreviewRunResponse>;
  const { id: previewRunId, compilationId: previewCompilationId } =
    await previewRun;
  expect(previewRunId).toMatch(/^preview-[a-z0-9-]+$/);
  expect(previewCompilationId).toMatch(/\S/);
  const composeProjectName = `factory-preview-${previewRunId}`;
  await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({
    timeout: 300_000,
  });

  const previewPage = page.context().waitForEvent("page");
  await page.getByRole("button", { name: "Open preview" }).click();
  const preview = await previewPage;
  await expect(preview).toHaveURL(/127\.0\.0\.1/);
  await expect(preview.locator("main.generated-app")).toBeVisible();
  await expect(preview.getByLabel("Puck Page Studio")).toHaveCount(0);
  await expect(
    preview.getByRole("link", { name: "New expense" }),
  ).toBeVisible();
  await preview.getByRole("link", { name: "New expense" }).click();
  await expect(preview).toHaveURL(/\/expenses\/new$/);
  await preview.getByLabel("amount").fill("125");
  await preview.getByLabel("description").fill("Preview lifecycle journey");
  const createdExpense = preview.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/expense",
  );
  await preview.getByRole("button", { name: "Create Expense" }).click();
  const createResponse = await createdExpense;
  expect(createResponse.status(), "Generated preview POST /api/expense").toBe(
    201,
  );
  await expect(preview.getByLabel("amount")).toHaveValue("");
  await expect(
    preview.locator(".generated-error[role='alert']"),
    "Generated preview application errors after POST /api/expense=201",
  ).toHaveCount(0);
  await preview.getByRole("link", { name: "Expenses" }).click();
  await expect(preview.getByRole("button", { name: "submit" })).toBeVisible();
  await preview.getByRole("button", { name: "submit" }).click();
  await preview.getByLabel("Role").selectOption("manager");
  await expect(preview.getByRole("button", { name: "approve" })).toBeVisible();
  await preview.getByRole("button", { name: "approve" }).click();
  await expect(preview.locator(".generated-records")).toContainText("approved");

  await page.getByRole("button", { name: "Stop preview" }).click();
  await expect(page.getByText("Preview stopped", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  expectPreviewResourcesRemoved(previewRunId, composeProjectName);

  await page.getByRole("button", { name: "api/.dockerignore" }).click();
  await expect(page.getByLabel("Generated source snapshot")).toContainText(
    "verified snapshot",
  );
  await page
    .getByRole("button", { name: "capability-template-lock.json" })
    .click();
  await expect(
    page.getByText("factory.capability-template-lock/v1"),
  ).toBeVisible();
  const lockArtifact = JSON.parse(
    (await page
      .getByLabel("Generated source snapshot")
      .locator("pre")
      .textContent()) ?? "{}",
  ) as { apiVersion: string; templates: unknown };
  expect(lockArtifact.apiVersion).toBe("factory.capability-template-lock/v1");
  expect(lockArtifact.templates).toEqual(expenseCapabilityTemplateLocks);

  await page.getByRole("button", { name: "History" }).click();
  await expect(
    page.getByLabel("Application Graph revision timeline"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page
      .getByLabel("Application Graph revision timeline")
      .getByText("Published", { exact: true })
      .first(),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Page" }).click();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
  await page.getByLabel("New page").fill(`After publish ${routeSuffix}`);
  await page.getByRole("button", { name: "Add page" }).click();
  await page.getByRole("button", { name: "Code" }).click();
  await expect(page.getByLabel("Application Graph diff")).toContainText(
    "semantic change",
  );
  await expect(page.getByLabel("Adapter metadata")).toContainText("Puck");
});
