import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";

type PublishedRevisionResponse = {
  readonly id: string;
  readonly graphHash: string;
};

type CompilationResponse = {
  readonly id: string;
  readonly publishedRevisionId: string;
  readonly inputGraphHash: string;
  readonly result?: { readonly status: string };
  readonly artifacts?: readonly {
    readonly path: string;
    readonly digest: string;
  }[];
};

type PreviewRunResponse = {
  readonly id: string;
  readonly compilationId: string;
  readonly composeProjectName: string;
  readonly previewUrl: string | null;
  readonly status: string;
};

type AccessibilityEvidence = {
  generatedDesktop: number;
  generatedNarrow: number;
  workbenchDesktop: number;
  workbenchNarrow: number;
};

const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBaseUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;

test.describe.configure({ mode: "serial" });

function reportStage(stage: string): void {
  console.info("FACTORY_ACCEPTANCE_STAGE", stage);
}

function reportCleanupStage(stage: string): void {
  console.info("FACTORY_ACCEPTANCE_CLEANUP_STAGE", stage);
}

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function controlPlaneUrl(path: string): string {
  if (!controlPlaneBaseUrl) {
    throw new Error(
      "FACTORY_E2E_CONTROL_PLANE_URL is required for local acceptance.",
    );
  }
  return new URL(path, `${controlPlaneBaseUrl}/`).toString();
}

async function accessibilityViolations(page: Page): Promise<number> {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  return result.violations.length;
}

function previewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): boolean {
  if (!factoryProject) {
    throw new Error(
      "FACTORY_E2E_FACTORY_PROJECT is required for cleanup evidence.",
    );
  }
  try {
    const workerContainer = dockerOutput([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${factoryProject}`,
      "--filter",
      "label=com.docker.compose.service=compiler-worker",
      "--quiet",
    ]);
    if (!/\S/u.test(workerContainer)) return false;
    dockerOutput([
      "exec",
      workerContainer,
      "test",
      "!",
      "-d",
      `/artifacts/.preview-runs/${previewRunId}`,
    ]);
    return (
      [
        [
          "ps",
          "--all",
          "--filter",
          `label=com.docker.compose.project=${composeProjectName}`,
          "--quiet",
        ],
        [
          "network",
          "ls",
          "--filter",
          `label=com.docker.compose.project=${composeProjectName}`,
          "--quiet",
        ],
        [
          "volume",
          "ls",
          "--filter",
          `label=com.docker.compose.project=${composeProjectName}`,
          "--quiet",
        ],
      ] as const
    ).every((args) => dockerOutput(args) === "");
  } catch {
    return false;
  }
}

async function expectPreviewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): Promise<void> {
  await expect
    .poll(() => previewResourcesRemoved(previewRunId, composeProjectName), {
      timeout: 60_000,
    })
    .toBe(true);
}

async function currentPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<PreviewRunResponse | null> {
  try {
    const response = await request.get(
      controlPlaneUrl(
        `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
      ),
    );
    if (!response.ok()) return null;
    const preview = (await response.json()) as Partial<PreviewRunResponse>;
    if (
      typeof preview.id !== "string" ||
      !/^preview-[a-z0-9-]+$/u.test(preview.id)
    ) {
      return null;
    }
    const composeProjectName = `factory-preview-${preview.id}`;
    if (
      preview.composeProjectName !== undefined &&
      preview.composeProjectName !== composeProjectName
    ) {
      return null;
    }
    return { ...preview, composeProjectName } as PreviewRunResponse;
  } catch {
    return null;
  }
}

async function waitForPreviewStopped(
  request: APIRequestContext,
  compilationId: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const preview = await currentPreview(request, compilationId);
        return preview?.status;
      },
      { timeout: 120_000 },
    )
    .toBe("stopped");
}

async function stopPreviewWithFallback(
  page: Page,
  request: APIRequestContext,
  compilationId: string,
  previewRunId: string,
): Promise<void> {
  try {
    const stopPreview = page.getByRole("button", { name: "Stop preview" });
    await expect(stopPreview).toBeEnabled({ timeout: 60_000 });
    await stopPreview.click();
    await waitForPreviewStopped(request, compilationId);
    return;
  } catch {
    const response = await request.post(
      controlPlaneUrl(`/preview-runs/${encodeURIComponent(previewRunId)}/stop`),
    );
    expect(response.ok(), "preview API cleanup fallback").toBeTruthy();
    await waitForPreviewStopped(request, compilationId);
  }
}

test.beforeAll(() => {
  expect(
    process.env.FACTORY_E2E_ISOLATED,
    "Local acceptance requires an explicitly isolated stack.",
  ).toBe("1");
  expect(factoryProject).toMatch(/^factory-local-[a-z0-9-]+$/);
  expect(factoryProject).not.toBe("factory-pilot");
  const postgresContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryProject}`,
    "--filter",
    "label=com.docker.compose.service=postgres",
    "--quiet",
  ]);
  expect(postgresContainer, "isolated PostgreSQL container").toMatch(/\S/);
});

test("Maison Aurelia edits, publishes, compiles, verifies, operates, and cleans up", async ({
  page,
  request,
}) => {
  test.setTimeout(1_200_000);
  reportStage("template-entry");
  await page.goto("/");
  reportStage("template-start");
  await page.getByRole("button", { name: "Start from Maison Aurelia" }).click();
  reportStage("template-opened");
  await expect(page.getByText("Preview synced · Draft r.1")).toBeVisible();
  reportStage("template-preview-ready");
  await page.getByRole("button", { name: "Select Menu" }).click();
  reportStage("template-menu-selected");
  await page.getByRole("button", { name: "Edit Menu" }).click();
  reportStage("template-menu-editor");
  const pageTitle = page.getByRole("textbox", { name: "Page title" });
  await pageTitle.fill("Seasonal Menu");
  await pageTitle.press("Enter");
  reportStage("template-title-saved");
  await expect(page.getByText("Draft r.2 · Preview active")).toBeVisible();

  reportStage("publish");
  const publishedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/published-revisions$/u.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Publish draft" }).click();
  const published = (await (
    await publishedResponse
  ).json()) as PublishedRevisionResponse;
  expect(published.id).toMatch(/\S/u);
  expect(published.graphHash).toMatch(/^sha256:[a-f0-9]{64}$/u);

  reportStage("compile");
  const compileButton = page.getByRole("button", { name: "Compile" });
  await expect(compileButton).toBeEnabled({ timeout: 60_000 });
  const compilationResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/compilations$/u.test(new URL(response.url()).pathname),
  );
  await compileButton.click();
  const queuedCompilation = (await (
    await compilationResponse
  ).json()) as CompilationResponse;
  expect(queuedCompilation.id).toMatch(/\S/u);
  expect(queuedCompilation.publishedRevisionId).toBe(published.id);
  expect(queuedCompilation.inputGraphHash).toBe(published.graphHash);

  const runVerification = page.getByRole("button", {
    name: "Run verification",
  });
  await expect(runVerification).toBeEnabled({ timeout: 315_000 });
  const completedResponse = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(queuedCompilation.id)}`,
    ),
  );
  expect(completedResponse.ok()).toBeTruthy();
  const completedCompilation =
    (await completedResponse.json()) as CompilationResponse;
  expect(completedCompilation.id).toBe(queuedCompilation.id);
  expect(completedCompilation.publishedRevisionId).toBe(published.id);
  expect(completedCompilation.inputGraphHash).toBe(published.graphHash);
  expect(completedCompilation.result?.status).toBe("succeeded");
  const composeArtifact = completedCompilation.artifacts?.find(
    (artifact) => artifact.path === "docker-compose.yml",
  );
  expect(composeArtifact?.digest).toMatch(/^sha256:[a-f0-9]{64}$/u);

  reportStage("verify");
  await runVerification.click();
  const verificationSteps = page.getByLabel("Verification evidence steps");
  await expect(verificationSteps).toBeVisible({ timeout: 910_000 });
  for (const step of [
    "customer-journey",
    "merchant-journey",
    "shared-state",
    "cleanup",
    "passed",
  ]) {
    await expect(verificationSteps).toContainText(step);
  }

  reportStage("workbench-accessibility");
  const accessibility: AccessibilityEvidence = {
    generatedDesktop: -1,
    generatedNarrow: -1,
    workbenchDesktop: await accessibilityViolations(page),
    workbenchNarrow: -1,
  };
  await page.setViewportSize({ width: 390, height: 844 });
  accessibility.workbenchNarrow = await accessibilityViolations(page);
  await page.setViewportSize({ width: 1280, height: 720 });

  let previewRunId: string | null = null;
  let previewProjectName: string | null = null;
  let generated: Page | null = null;
  let previewStartAttempted = false;
  try {
    reportStage("preview-start");
    const startResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/compilations\/[^/]+\/preview-runs$/u.test(
          new URL(response.url()).pathname,
        ),
    );
    previewStartAttempted = true;
    await page.getByRole("button", { name: "Start preview" }).click();
    const startedPreview = (await (
      await startResponse
    ).json()) as PreviewRunResponse;
    previewRunId = startedPreview.id;
    previewProjectName = startedPreview.composeProjectName;
    expect(previewRunId).toMatch(/^preview-[a-z0-9-]+$/u);
    expect(startedPreview.compilationId).toBe(queuedCompilation.id);
    expect(previewProjectName).toBe(`factory-preview-${previewRunId}`);

    await expect
      .poll(
        async () => {
          const response = await request.get(
            controlPlaneUrl(
              `/compilations/${encodeURIComponent(queuedCompilation.id)}/preview-runs/current`,
            ),
          );
          return ((await response.json()) as PreviewRunResponse).status;
        },
        { timeout: 315_000 },
      )
      .toBe("ready");
    const previewResponse = await request.get(
      controlPlaneUrl(
        `/compilations/${encodeURIComponent(queuedCompilation.id)}/preview-runs/current`,
      ),
    );
    const readyPreview = (await previewResponse.json()) as PreviewRunResponse;
    expect(readyPreview.previewUrl).toBeTruthy();
    const previewOrigin = new URL(readyPreview.previewUrl!);
    expect(previewOrigin.hostname).toBe("127.0.0.1");

    generated = await page.context().newPage();
    reportStage("customer-page-created");
    const rootResponse = await generated.goto(previewOrigin.toString());
    expect(rootResponse?.ok(), "generated customer root response").toBeTruthy();
    await expect(
      generated.getByRole("heading", { level: 1, name: "Maison Aurelia" }),
    ).toBeVisible();
    reportStage("customer-root");

    const dishUrl = new URL(previewOrigin);
    dishUrl.pathname = "/menu/margherita-pizza";
    const dishResponse = await generated.goto(dishUrl.toString());
    expect(dishResponse?.ok(), "generated dish response").toBeTruthy();
    await expect(
      generated.getByRole("heading", { name: "Margherita pizza" }),
    ).toBeVisible();
    reportStage("customer-dish");
    const lineAdded = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/cart/items",
    );
    const dishReloaded = generated.waitForNavigation();
    await generated.getByRole("button", { name: "Add to order" }).click();
    expect((await lineAdded).ok()).toBeTruthy();
    reportStage("customer-item-response");
    await dishReloaded;
    reportStage("customer-item-added");

    const cartUrl = new URL(previewOrigin);
    cartUrl.pathname = "/cart";
    await generated.goto(cartUrl.toString());
    await expect(
      generated.getByRole("heading", { name: "Cart item" }),
    ).toBeVisible();
    reportStage("customer-cart");

    const checkoutUrl = new URL(previewOrigin);
    checkoutUrl.pathname = "/checkout";
    await generated.goto(checkoutUrl.toString());
    reportStage("customer-checkout");
    const paid = generated.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/checkout",
    );
    const checkoutReloaded = generated.waitForNavigation();
    await generated.getByRole("button", { name: "Pay", exact: true }).click();
    expect((await paid).ok()).toBeTruthy();
    reportStage("customer-payment-response");
    await checkoutReloaded;
    reportStage("customer-checkout-reloaded");
    const ordersUrl = new URL(previewOrigin);
    ordersUrl.pathname = "/orders";
    await generated.goto(ordersUrl.toString());
    reportStage("customer-orders");
    await expect(generated.getByText("simulated-paid")).toBeVisible();
    reportStage("customer-paid");

    // The live V3 preview is intentionally customer-principal-bound. The
    // role-specific generated verifier above proves the merchant journey;
    // this browser boundary proves customer principals cannot invoke it.
    const kitchenUrl = new URL(previewOrigin);
    kitchenUrl.pathname = "/merchant/kitchen";
    const kitchenResponse = await generated.goto(kitchenUrl.toString());
    expect(kitchenResponse?.ok(), "generated kitchen response").toBeTruthy();
    await expect(
      generated.getByRole("heading", { name: "Kitchen ticket" }),
    ).toBeVisible();
    for (const action of ["Accept order", "Start preparing", "Mark ready"]) {
      await expect(
        generated.getByRole("button", { name: action }),
      ).toBeDisabled();
    }
    reportStage("merchant-denial");

    reportStage("generated-accessibility");
    accessibility.generatedDesktop = await accessibilityViolations(generated);
    await generated.setViewportSize({ width: 390, height: 844 });
    accessibility.generatedNarrow = await accessibilityViolations(generated);
  } finally {
    reportCleanupStage("start");
    try {
      await generated?.close();
    } catch {
      // Preview teardown must continue even if the browser page already died.
    }
    reportCleanupStage("page-closed");
    if (previewStartAttempted && (!previewRunId || !previewProjectName)) {
      const recovered = await currentPreview(request, queuedCompilation.id);
      if (recovered) {
        previewRunId = recovered.id;
        previewProjectName = recovered.composeProjectName;
      }
    }
    if (previewRunId && previewProjectName) {
      reportCleanupStage("stop");
      try {
        await stopPreviewWithFallback(
          page,
          request,
          queuedCompilation.id,
          previewRunId,
        );
        reportCleanupStage("stopped");
      } finally {
        reportCleanupStage("resource-proof");
        await expectPreviewResourcesRemoved(previewRunId, previewProjectName);
        reportCleanupStage("resources-removed");
      }
    }
  }

  expect(Object.values(accessibility)).toEqual([0, 0, 0, 0]);
  reportStage("evidence");
  console.info(
    "FACTORY_ACCEPTANCE_EVIDENCE",
    JSON.stringify({
      accessibility,
      cleanup: { previewDirectories: 0 },
      digests: {
        compilation: composeArtifact!.digest,
        publishedRevision: published.graphHash,
      },
    }),
  );
});
