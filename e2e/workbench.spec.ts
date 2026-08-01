import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { ApplicationGraphV1 } from "@factory/graph";

type PreviewRunResponse = {
  readonly id: string;
  readonly compilationId: string;
  readonly composeProjectName?: string;
  readonly webPort?: number | null;
  readonly apiPort?: number | null;
  readonly status?: string;
};

type PublishedRevisionResponse = {
  readonly id: string;
  readonly graphHash: string;
};

type CompilationResponse = {
  readonly id: string;
  readonly publishedRevisionId: string;
  readonly inputGraphHash: string;
  readonly result: { readonly status: string };
  readonly artifacts?: readonly {
    readonly path: string;
    readonly digest: string;
  }[];
};

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const factoryE2eControlPlaneUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function generatedImageIds(composeProjectName: string): Record<string, string> {
  const rows = dockerOutput([
    "ps",
    "--all",
    "--filter",
    `label=com.docker.compose.project=${composeProjectName}`,
    "--format",
    '{{.Label "com.docker.compose.service"}}|{{.Image}}',
  ]);
  const images = new Map<string, string>();
  for (const row of rows.split("\n").filter(Boolean)) {
    const [service, image] = row.split("|", 2);
    if (service && image) {
      images.set(
        service,
        dockerOutput(["image", "inspect", image, "--format", "{{.Id}}"]),
      );
    }
  }
  for (const service of ["web", "api", "migrate"]) {
    expect(images.get(service), `Generated ${service} image ID`).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
  }
  return Object.fromEntries(images);
}

function controlPlaneUrl(path: string): string {
  if (!factoryE2eControlPlaneUrl) {
    throw new Error(
      "FACTORY_E2E_CONTROL_PLANE_URL is required for isolated acceptance evidence.",
    );
  }
  return new URL(path, `${factoryE2eControlPlaneUrl}/`).toString();
}

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

async function createCompiledExpenseDraft(page: Page): Promise<string> {
  await page.goto("/");
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  const name = `Executable expense ${Date.now().toString()}`;
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
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
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/immutable outputs/)).toBeVisible();

  return routeSuffix;
}

test("creates a named application Draft through the guided business-user journey", async ({
  page,
}) => {
  const name = `Travel approvals ${Date.now().toString()}`;
  await page.goto("/");

  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
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

test("Home creates, publishes, compiles, previews, and operates a Restaurant application", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  const suffix = Date.now().toString();
  const name = `Home restaurant ${suffix}`;
  await page.goto("/");

  await expect(page.getByLabel("Workbench Home")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Restaurant ordering", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
  await page.getByTestId("guided-template-restaurant-ordering").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("guided-create").click();

  await expect(page.getByLabel("Current application")).toHaveText(name);
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
  await page.getByLabel("New page").fill(`Home verification ${suffix}`);
  await page.getByRole("button", { name: "Add page" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).click();
  const draftProject = page.getByRole("article").filter({ hasText: name });
  await expect(draftProject).toContainText("Draft r.2");
  await expect(
    draftProject.getByRole("button", { name: `Compile ${name}` }),
  ).toBeDisabled();
  await draftProject.getByRole("button", { name: `Open ${name}` }).click();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
  await page
    .getByLabel("Route")
    .selectOption({ label: `/home-verification-${suffix}` });
  await expect(page.getByLabel("Path")).toHaveValue(
    `/home-verification-${suffix}`,
  );

  const publishedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/application-graphs\/[^/]+\/published-revisions$/.test(response.url()),
  );
  await page.getByRole("button", { name: "Publish" }).click();
  const published = (await (
    await publishedResponse
  ).json()) as PublishedRevisionResponse;
  expect(published.id).toMatch(/\S/);
  expect(published.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  await expect(page.getByRole("button", { name: "Published" })).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const publishedProject = page.getByRole("article").filter({ hasText: name });
  await expect(publishedProject).toContainText("Published r.1");
  const compile = publishedProject.getByRole("button", {
    name: `Compile ${name}`,
  });
  await expect(compile).toBeEnabled();
  const compilationResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/compilations",
  );
  await compile.click();
  const queuedCompilation = (await (
    await compilationResponse
  ).json()) as CompilationResponse;
  expect(queuedCompilation.id).toMatch(/\S/);
  expect(queuedCompilation.publishedRevisionId).toBe(published.id);
  expect(queuedCompilation.inputGraphHash).toBe(published.graphHash);

  await expect(page.getByLabel("Generated artifact manifest")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText("Compile succeeded", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "api/.dockerignore" }).click();
  await expect(page.getByLabel("Generated source snapshot")).toContainText(
    "verified snapshot",
  );
  const compilationResult = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(queuedCompilation.id)}`,
    ),
  );
  expect(
    compilationResult.ok(),
    "Generated compilation evidence request",
  ).toBeTruthy();
  const completedCompilation =
    (await compilationResult.json()) as CompilationResponse;
  expect(completedCompilation.id).toBe(queuedCompilation.id);
  expect(completedCompilation.result.status).toBe("succeeded");
  const composeArtifact = completedCompilation.artifacts?.find(
    (artifact) => artifact.path === "docker-compose.yml",
  );
  expect(composeArtifact, "Generated Compose artifact").toBeDefined();
  expect(composeArtifact?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);

  const tableSessionToken = process.env.RESTAURANT_DEMO_TABLE_TOKEN;
  expect(
    tableSessionToken,
    "RESTAURANT_DEMO_TABLE_TOKEN is required for the generated Restaurant Customer journey.",
  ).toBeTruthy();

  let previewRunId: string | null = null;
  let composeProjectName: string | null = null;

  try {
    const startedPreview = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
    );
    await page.getByRole("button", { name: "Start preview" }).click();
    const { id, compilationId } = await ((
      await startedPreview
    ).json() as Promise<PreviewRunResponse>);
    expect(id).toMatch(/^preview-[a-z0-9-]+$/);
    expect(compilationId).toMatch(/\S/);
    previewRunId = id;
    composeProjectName = `factory-preview-${id}`;

    await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({
      timeout: 300_000,
    });
    const previewStatus = await request.get(
      controlPlaneUrl(
        `/compilations/${encodeURIComponent(queuedCompilation.id)}/preview-runs/current`,
      ),
    );
    expect(
      previewStatus.ok(),
      "Generated preview evidence request",
    ).toBeTruthy();
    const readyPreview = (await previewStatus.json()) as PreviewRunResponse;
    expect(readyPreview.id).toBe(previewRunId);
    expect(readyPreview.status).toBe("ready");
    expect(readyPreview.composeProjectName).toBe(composeProjectName);
    expect(readyPreview.webPort).toEqual(expect.any(Number));
    expect(readyPreview.apiPort).toEqual(expect.any(Number));
    const imageIds = generatedImageIds(composeProjectName);

    const previewPage = page.context().waitForEvent("page");
    await page.getByRole("button", { name: "Open preview" }).click();
    const preview = await previewPage;
    await expect(preview).toHaveURL(/127\.0\.0\.1/);
    const previewOrigin = new URL(preview.url()).origin;
    await expect(preview.locator("main.generated-app")).toBeVisible();
    await expect(preview.getByLabel("Puck Page Studio")).toHaveCount(0);

    const tableUrl = new URL(previewOrigin);
    tableUrl.pathname = `/table/${encodeURIComponent(tableSessionToken!)}`;
    await preview.goto(tableUrl.toString());
    await expect(preview.getByRole("heading", { name })).toBeVisible({
      timeout: 30_000,
    });
    await expect(preview.getByText("Table session active")).toBeVisible({
      timeout: 30_000,
    });
    await preview.getByRole("link", { name: "Menu", exact: true }).click();
    await expect(preview).toHaveURL(/\/menu$/);
    await preview.getByLabel("Search menu").fill("Margherita");
    await preview.getByRole("button", { name: "Search" }).click();
    const pizza = preview.locator("li").filter({ hasText: "Margherita pizza" });
    await expect(pizza).toHaveCount(1);
    await expect(preview.getByText("Mushroom risotto")).toHaveCount(0);
    await pizza.getByLabel("Quantity").fill("2");
    await pizza.getByLabel("Item note").fill("No basil");
    const lineAdded = preview.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/lines"),
    );
    await pizza.getByRole("button", { name: "Add Margherita pizza" }).click();
    expect((await lineAdded).ok()).toBeTruthy();
    await preview.getByRole("link", { name: "Cart" }).click();
    await expect(preview).toHaveURL(/\/cart$/);
    await expect(
      preview.getByRole("button", { name: "Pay simulated payment" }),
    ).toBeEnabled();
    await preview.getByLabel("Order note").fill("Please serve together");
    await preview
      .getByRole("button", { name: "Pay simulated payment" })
      .click();
    await expect(preview.getByText("Paid", { exact: true })).toBeVisible();
    await preview.getByRole("link", { name: "Current order" }).click();
    await expect(preview.getByText("Session order history")).toBeVisible();
    await preview
      .getByRole("navigation", { name: "Customer routes" })
      .getByRole("link", { name: "Receipt" })
      .click();
    await expect(preview).toHaveURL(/\/receipt\//);
    await expect(
      preview.getByRole("heading", { name: "Receipt" }),
    ).toBeVisible();
    await expect(preview.getByText("Margherita pizza")).toBeVisible();
    await expect(preview.getByText("No basil")).toBeVisible();
    await expect(preview.getByText("Please serve together")).toBeVisible();

    const merchantUrl = new URL(previewOrigin);
    merchantUrl.pathname = "/merchant/tables";
    await preview.goto(merchantUrl.toString());
    await expect(
      preview.getByRole("heading", { name: "Table board" }),
    ).toBeVisible();
    await preview.getByRole("link", { name: "Menu" }).click();
    await expect(preview).toHaveURL(/\/merchant\/menu$/);
    const menuItem = preview
      .locator("li")
      .filter({ hasText: "Margherita pizza" });
    await expect(menuItem).toHaveCount(1);
    await menuItem.getByRole("button", { name: "Disable" }).click();
    await expect(menuItem.getByText("Disabled")).toBeVisible();
    const availabilityChanged = preview.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname.endsWith("/availability"),
    );
    await menuItem.getByRole("button", { name: "Enable" }).click();
    expect((await availabilityChanged).ok()).toBeTruthy();
    await expect(menuItem.getByText("Available")).toBeVisible();
    const stockMatch = /stock (\d+)/.exec(await menuItem.innerText());
    expect(stockMatch).not.toBeNull();
    const currentStock = Number(stockMatch![1]);
    expect(currentStock).toBeGreaterThan(4);
    await menuItem
      .getByLabel("Stock adjustment")
      .fill(String(4 - currentStock));
    const stockAdjusted = preview.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/stock-adjustments"),
    );
    await menuItem.getByRole("button", { name: "Adjust stock" }).click();
    expect((await stockAdjusted).ok()).toBeTruthy();
    await expect(menuItem).toContainText("stock 4");

    await preview.getByRole("link", { name: "Cashier" }).click();
    await expect(
      preview.getByRole("heading", { name: "Cashier console" }),
    ).toBeVisible();
    const cashierOrder = preview.locator("li").filter({ hasText: "Table 98" });
    await expect(cashierOrder).toHaveCount(1);
    await expect(cashierOrder).toContainText("submitted");
    await cashierOrder
      .getByRole("button", { name: "Capture simulated payment" })
      .click();
    await expect(cashierOrder).toContainText("paid");
    await cashierOrder.getByRole("button", { name: "View receipt" }).click();
    const browserReceipt = preview.getByRole("article", {
      name: "Browser receipt",
    });
    await expect(browserReceipt).toBeVisible();
    await expect(
      browserReceipt.getByRole("heading", { name: "Receipt" }),
    ).toBeVisible();
    await expect(browserReceipt.getByText("Margherita pizza")).toBeVisible();
    await expect(browserReceipt.getByText("Total: 14.00")).toBeVisible();

    await preview.getByRole("link", { name: "Kitchen" }).click();
    await expect(
      preview.getByRole("heading", { name: "Kitchen board" }),
    ).toBeVisible();
    const kitchenOrder = preview.locator("li").filter({ hasText: "Table 98" });
    await expect(kitchenOrder).toHaveCount(1);
    await kitchenOrder.getByRole("button", { name: "Accept order" }).click();
    await kitchenOrder.getByRole("button", { name: "Start preparing" }).click();
    await kitchenOrder.getByRole("button", { name: "Mark ready" }).click();
    await preview.getByRole("link", { name: "Cashier" }).click();
    const readyOrder = preview.locator("li").filter({ hasText: "Table 98" });
    await expect(readyOrder).toContainText("ready");
    await readyOrder.getByRole("button", { name: "Mark served" }).click();
    await expect(readyOrder).toHaveCount(0);

    await preview.getByRole("link", { name: "Analytics" }).click();
    await expect(
      preview.getByRole("heading", { name: "Restaurant dashboard" }),
    ).toBeVisible();
    const metric = (label: string) =>
      preview
        .locator("dt")
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator("xpath=following-sibling::dd[1]");
    await expect(metric("Sales total")).toHaveText(/^\d+\.\d{2}$/);
    await expect(metric("Order count")).toHaveText(/^\d+$/);
    await expect(metric("Average preparation")).toHaveText(/^\d+ seconds$/);
    await expect(metric("Cancellations")).toHaveText("0");
    expect(
      Number(await metric("Sales total").innerText()),
    ).toBeGreaterThanOrEqual(14);
    expect(
      Number(await metric("Order count").innerText()),
    ).toBeGreaterThanOrEqual(2);
    await expect(preview.getByText("Margherita pizza: 4")).toBeVisible();
    const cancellationOrder = preview
      .locator("li")
      .filter({ hasText: "Table 99" });
    await expect(cancellationOrder).toHaveCount(1);
    await expect(cancellationOrder).toContainText("submitted");
    await cancellationOrder
      .getByLabel("Cancellation reason")
      .fill("Guest left");
    await cancellationOrder
      .getByRole("button", { name: "Cancel order" })
      .click();
    await expect(
      preview.getByText(/Inventory released|No inventory release required/),
    ).toBeVisible();
    await expect(preview.getByText(/Guest left/)).toBeVisible();
    await expect(preview.getByText(/Audit recorded/)).toBeVisible();
    await expect(metric("Cancellations")).toHaveText("1");
    await expect(preview.getByText("Margherita pizza: 5")).toBeVisible();
    console.info(
      "TASK7_ACCEPTANCE_EVIDENCE",
      JSON.stringify({
        factoryComposeProject: factoryE2eProject,
        publishedRevisionId: published.id,
        graphDigest: published.graphHash,
        compilationId: queuedCompilation.id,
        generatedComposeArtifactDigest: composeArtifact?.digest,
        previewRunId,
        generatedComposeProject: composeProjectName,
        generatedWebPort: readyPreview.webPort,
        generatedApiPort: readyPreview.apiPort,
        generatedImageIds: imageIds,
      }),
    );
  } finally {
    if (previewRunId && composeProjectName) {
      try {
        const stopPreview = page.getByRole("button", { name: "Stop preview" });
        await expect(stopPreview).toBeEnabled({ timeout: 60_000 });
        await stopPreview.click();
        await expect(
          page.getByText("Preview stopped", { exact: true }),
        ).toBeVisible({ timeout: 60_000 });
      } finally {
        expectPreviewResourcesRemoved(previewRunId, composeProjectName);
      }
    }
  }
});

test("Home creates, publishes, compiles, previews, and operates a Simple Ecommerce application", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const name = `Home ecommerce ${Date.now().toString()}`;
  await page.goto("/");
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
  await page.getByTestId("guided-template-simple-ecommerce").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("guided-create").click();

  await expect(page.getByLabel("Current application")).toHaveText(name);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("button", { name: "Published" })).toBeVisible();
  await page.getByRole("button", { name: "Compile" }).click();
  await expect(
    page.getByText("Compile succeeded", { exact: true }),
  ).toBeVisible({
    timeout: 60_000,
  });

  let previewRunId: string | null = null;
  let composeProjectName: string | null = null;

  try {
    const startedPreview = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
    );
    await page.getByRole("button", { name: "Start preview" }).click();
    const { id } = await ((
      await startedPreview
    ).json() as Promise<PreviewRunResponse>);
    previewRunId = id;
    composeProjectName = `factory-preview-${id}`;

    await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({
      timeout: 300_000,
    });
    generatedImageIds(composeProjectName);

    const previewPage = page.context().waitForEvent("page");
    await page.getByRole("button", { name: "Open preview" }).click();
    const preview = await previewPage;
    await expect(preview.locator("main.generated-app")).toBeVisible();

    const tote = preview.locator("li").filter({ hasText: "Everyday tote" });
    await expect(tote).toHaveCount(1);
    await tote.getByRole("button", { name: "Add to cart" }).click();
    await preview.getByRole("link", { name: "Continue to checkout" }).click();
    await expect(preview).toHaveURL(/\/checkout$/);
    const orderTransitions: Array<{
      readonly event: string;
      readonly status: number;
    }> = [];
    preview.on("response", (response) => {
      const pathname = new URL(response.url()).pathname;
      const match = /\/events\/(submit|pay)$/.exec(pathname);
      if (response.request().method() === "POST" && match) {
        orderTransitions.push({ event: match[1]!, status: response.status() });
      }
    });
    await preview
      .getByRole("button", { name: "Pay simulated payment" })
      .click();
    await expect
      .poll(() => orderTransitions, { timeout: 15_000 })
      .toEqual([
        { event: "submit", status: 201 },
        { event: "pay", status: 201 },
      ]);
    await preview.getByRole("link", { name: "Orders" }).click();
    await preview.getByLabel("Role").selectOption("merchant");

    const paidOrder = preview
      .locator("li")
      .filter({ hasText: '"status":"paid"' })
      .last();
    await expect(paidOrder).toBeVisible({ timeout: 15_000 });
    await paidOrder.getByRole("button", { name: "fulfil" }).click();
    await expect(
      preview.locator("li").filter({ hasText: '"status":"fulfilled"' }).last(),
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    if (previewRunId && composeProjectName) {
      try {
        const stopPreview = page.getByRole("button", { name: "Stop preview" });
        await expect(stopPreview).toBeEnabled({ timeout: 60_000 });
        await stopPreview.click();
        await expect(
          page.getByText("Preview stopped", { exact: true }),
        ).toBeVisible({ timeout: 60_000 });
      } finally {
        expectPreviewResourcesRemoved(previewRunId, composeProjectName);
      }
    }
  }
});

test("creates an audit-free Expense Draft from the capability picker", async ({
  page,
}) => {
  const name = `Audit free expense ${Date.now().toString()}`;
  await page.goto("/");

  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
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
  const selectedAssetKeys =
    graph.integration.compositionSelections?.map(
      (selection) => selection.lock.key,
    ) ?? [];
  expect(selectedAssetKeys).toEqual(
    expect.arrayContaining(["core.crud", "core.workflow"]),
  );
  expect(selectedAssetKeys).not.toContain("core.audit");
  await expect(
    page.getByRole("dialog", { name: "Create application left-side drawer" }),
  ).toBeHidden();
  await expect(page.getByLabel("Current application")).toHaveText(name);
});

test("edits a Draft, publishes an immutable revision, and compiles it", async ({
  page,
}) => {
  const routeSuffix = await createCompiledExpenseDraft(page);

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

test("runs an isolated generated preview employee and manager journey", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await createCompiledExpenseDraft(page);

  let previewRunId: string | null = null;
  let composeProjectName: string | null = null;

  try {
    const startedPreview = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
    );
    await page.getByRole("button", { name: "Start preview" }).click();
    const previewRun = (
      await startedPreview
    ).json() as Promise<PreviewRunResponse>;
    const { id, compilationId } = await previewRun;
    expect(id).toMatch(/^preview-[a-z0-9-]+$/);
    expect(compilationId).toMatch(/\S/);
    previewRunId = id;
    composeProjectName = `factory-preview-${id}`;

    await expect(page.getByText("Preview ready", { exact: true })).toBeVisible({
      timeout: 300_000,
    });

    const previewPage = page.context().waitForEvent("page");
    await page.getByRole("button", { name: "Open preview" }).click();
    const preview = await previewPage;
    await expect(preview).toHaveURL(/127\.0\.0\.1/);
    const previewOrigin = new URL(preview.url()).origin;
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
    expect(
      new URL(createResponse.url()).origin,
      "Generated preview POST /api/expense origin",
    ).toBe(previewOrigin);
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
    await expect(
      preview.getByRole("button", { name: "approve" }),
    ).toBeVisible();
    await preview.getByRole("button", { name: "approve" }).click();
    await expect(preview.locator(".generated-records")).toContainText(
      "approved",
    );
  } finally {
    if (previewRunId && composeProjectName) {
      try {
        const stopPreview = page.getByRole("button", { name: "Stop preview" });
        await expect(stopPreview).toBeEnabled({ timeout: 60_000 });
        await stopPreview.click();
        await expect(
          page.getByText("Preview stopped", { exact: true }),
        ).toBeVisible({ timeout: 60_000 });
      } finally {
        expectPreviewResourcesRemoved(previewRunId, composeProjectName);
      }
    }
  }
});
