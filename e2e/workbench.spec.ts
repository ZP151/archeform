import { expect, test } from "@playwright/test";
import type { ApplicationGraphV1 } from "@factory/graph";

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
  await page.goto("/");

  await expect(page.locator('[data-theme="light"]')).toBeVisible();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();

  const routeSuffix = Date.now().toString();
  await page.getByLabel("New page").fill(`Journey ${routeSuffix}`);
  await page.getByRole("button", { name: "Add page" }).click();
  await expect(page.getByLabel("Path")).toHaveValue(`/journey-${routeSuffix}`);
  await page.getByLabel("Entity binding").selectOption("request");

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

  await page.getByLabel("Relation target").selectOption("request");
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
  await expect(page.getByText(/immutable outputs/)).toBeVisible();
  await page.getByRole("button", { name: "api/.dockerignore" }).click();
  await expect(page.getByLabel("Generated source snapshot")).toContainText(
    "verified snapshot",
  );
  await page
    .getByRole("button", { name: "capability-template-lock.json" })
    .click();
  await expect(page.getByLabel("Generated source snapshot")).toContainText(
    "factory.capability-template-lock/v1",
  );

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
