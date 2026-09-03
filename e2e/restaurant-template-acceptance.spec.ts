import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { lstat, readFile, writeFile } from "node:fs/promises";

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
  readonly apiPort: number | null;
  readonly id: string;
  readonly compilationId: string;
  readonly composeProjectName: string;
  readonly previewUrl: string | null;
  readonly status: string;
};

type VerificationRunResponse = {
  readonly compilationId: string;
  readonly evidence: unknown;
  readonly status: string;
  readonly verificationRunId: string;
};

type LocalPreviewLease = {
  readonly apiVersion: "factory.local-preview-lease/v1";
  readonly compilationId: string;
  readonly composeProjectName: string;
  readonly factoryProjectName: string;
  readonly previewDirectoryRelativePath: string;
  readonly previewRunId: string;
};

type AccessibilityEvidence = {
  generatedDesktop: number;
  generatedNarrow: number;
  workbenchDesktop: number;
  workbenchNarrow: number;
};

const factoryProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const controlPlaneBaseUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
const requiredVerificationStepIds = [
  "customer-journey",
  "merchant-journey",
  "shared-state",
  "cleanup",
] as const;

test.describe.configure({ mode: "serial" });

function reportStage(stage: string): void {
  console.info("FACTORY_ACCEPTANCE_STAGE", stage);
}

function reportCleanupStage(stage: string): void {
  console.info("FACTORY_ACCEPTANCE_CLEANUP_STAGE", stage);
}

function hasExactPassedRequiredSteps(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return requiredVerificationStepIds.every((stepId) => {
    const matches = value.filter(
      (step) =>
        step &&
        typeof step === "object" &&
        !Array.isArray(step) &&
        (step as Record<string, unknown>).stepId === stepId,
    );
    return (
      matches.length === 1 &&
      (matches[0] as Record<string, unknown>).status === "passed"
    );
  });
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

function exactContainerId(output: string): string {
  const ids = output.split(/\r?\n/u).filter(Boolean);
  expect(ids).toHaveLength(1);
  expect(ids[0]).toMatch(/^[a-f0-9]{12,64}$/u);
  return ids[0]!;
}

function roleOrigin(
  composeProjectName: string,
  service: "cashier" | "kitchen",
  targetPort: 3002 | 3003,
): URL {
  const containerId = exactContainerId(
    dockerOutput([
      "ps",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--filter",
      `label=com.docker.compose.service=${service}`,
      "--format",
      "{{.ID}}",
    ]),
  );
  const binding = dockerOutput(["port", containerId, String(targetPort)]);
  expect(binding).toMatch(/^127\.0\.0\.1:(\d+)$/u);
  return new URL(`http://${binding}`);
}

function previewRequestPath(): string {
  const path = process.env.FACTORY_E2E_PREVIEW_REQUEST_PATH;
  if (!path) throw new Error("Runner-owned preview request path is required.");
  return path;
}

function previewLeasePath(): string {
  const path = process.env.FACTORY_E2E_PREVIEW_LEASE_PATH;
  if (!path) throw new Error("Runner-owned preview lease path is required.");
  return path;
}

async function requestRunnerOwnedPreview(compilationId: string): Promise<void> {
  await writeFile(previewRequestPath(), `${compilationId}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function exactLease(
  value: unknown,
  compilationId: string,
): value is LocalPreviewLease {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const lease = value as Record<string, unknown>;
  return (
    Object.keys(lease).sort().join(",") ===
      "apiVersion,compilationId,composeProjectName,factoryProjectName,previewDirectoryRelativePath,previewRunId" &&
    lease.apiVersion === "factory.local-preview-lease/v1" &&
    lease.compilationId === compilationId &&
    lease.factoryProjectName === factoryProject &&
    typeof lease.previewRunId === "string" &&
    /^preview-[a-z0-9-]+$/u.test(lease.previewRunId) &&
    lease.composeProjectName === `factory-preview-${lease.previewRunId}` &&
    lease.previewDirectoryRelativePath === `.preview-runs/${lease.previewRunId}`
  );
}

async function runnerOwnedLease(
  compilationId: string,
): Promise<LocalPreviewLease> {
  let lease: LocalPreviewLease | null = null;
  await expect
    .poll(
      async () => {
        try {
          const entry = await lstat(previewLeasePath());
          if (entry.isSymbolicLink() || !entry.isFile()) return false;
          const parsed = JSON.parse(await readFile(previewLeasePath(), "utf8"));
          if (!exactLease(parsed, compilationId)) return false;
          lease = parsed;
          return true;
        } catch {
          return false;
        }
      },
      { timeout: 315_000 },
    )
    .toBe(true);
  return lease!;
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
  const verificationStartedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname ===
        `/compilations/${queuedCompilation.id}/verification-runs`,
  );
  await runVerification.click();
  const startedVerification = (await (
    await verificationStartedResponse
  ).json()) as VerificationRunResponse;
  expect(startedVerification.compilationId).toBe(queuedCompilation.id);
  expect(startedVerification.verificationRunId).toMatch(/^verify-[a-z0-9-]+$/u);
  let completedVerification: VerificationRunResponse | null = null;
  await expect
    .poll(
      async () => {
        const response = await request.get(
          controlPlaneUrl(
            `/verification-runs/${encodeURIComponent(startedVerification.verificationRunId)}`,
          ),
        );
        if (!response.ok()) return null;
        const verification = (await response.json()) as VerificationRunResponse;
        completedVerification = verification;
        return verification.status;
      },
      { timeout: 910_000 },
    )
    .toBe("succeeded");
  const evidence = completedVerification?.evidence as
    | {
        readonly cleanup?: { readonly succeeded?: unknown };
        readonly steps?: unknown;
      }
    | undefined;
  expect(evidence?.cleanup?.succeeded).toBe(true);
  const duplicateConflictFixture = [
    ...requiredVerificationStepIds.map((stepId) => ({
      status: "passed",
      stepId,
    })),
    { status: "failed", stepId: "cleanup" },
  ];
  expect(hasExactPassedRequiredSteps(duplicateConflictFixture)).toBe(false);
  expect(hasExactPassedRequiredSteps(evidence?.steps)).toBe(true);

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

  let generated: Page | null = null;
  try {
    reportStage("preview-start");
    await requestRunnerOwnedPreview(queuedCompilation.id);
    const lease = await runnerOwnedLease(queuedCompilation.id);

    await expect
      .poll(
        async () => {
          const preview = await currentPreview(request, queuedCompilation.id);
          return preview?.id === lease.previewRunId ? preview.status : null;
        },
        { timeout: 315_000 },
      )
      .toBe("ready");
    const readyPreview = await currentPreview(request, queuedCompilation.id);
    expect(readyPreview?.id).toBe(lease.previewRunId);
    expect(readyPreview?.composeProjectName).toBe(lease.composeProjectName);
    expect(readyPreview?.previewUrl).toBeTruthy();
    const previewOrigin = new URL(readyPreview!.previewUrl!);
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

    expect(readyPreview!.apiPort).toEqual(expect.any(Number));
    const managerOrigin = new URL(`http://127.0.0.1:${readyPreview!.apiPort!}`);
    const cashierOrigin = roleOrigin(lease.composeProjectName, "cashier", 3003);
    const kitchenOrigin = roleOrigin(lease.composeProjectName, "kitchen", 3002);
    const merchantOrders = async (origin: URL) => {
      const response = await request.get(
        new URL("/api/merchant/orders", origin).toString(),
      );
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as {
        readonly orders?: readonly {
          readonly id: string;
          readonly status: string;
          readonly version: number;
        }[];
      };
      expect(body.orders).toEqual(expect.any(Array));
      return body.orders!;
    };
    const managerPaidOrder = (await merchantOrders(managerOrigin)).find(
      (order) => order.status === "paid",
    );
    expect(managerPaidOrder).toBeDefined();
    const orderId = managerPaidOrder!.id;
    expect(
      (await merchantOrders(cashierOrigin)).find(
        (order) => order.id === orderId,
      )?.status,
    ).toBe("paid");
    reportStage("merchant-observed");

    for (const [action, expectedVersion] of [
      ["accept", 1],
      ["start-preparing", 2],
      ["mark-ready", 3],
    ] as const) {
      const response = await request.post(
        new URL(
          `/api/merchant/kitchen/${encodeURIComponent(orderId)}/actions`,
          kitchenOrigin,
        ).toString(),
        {
          data: { action, expectedVersion },
          headers: {
            "content-type": "application/json",
            "idempotency-key": `acceptance-${action}`,
          },
        },
      );
      expect(response.ok(), `kitchen ${action}`).toBeTruthy();
    }
    reportStage("kitchen-ready");

    const customerKitchenDenied = await request.post(
      new URL(
        `/api/merchant/kitchen/${encodeURIComponent(orderId)}/actions`,
        previewOrigin,
      ).toString(),
      {
        data: { action: "accept", expectedVersion: 4 },
        headers: {
          "content-type": "application/json",
          "idempotency-key": "acceptance-customer-denied",
        },
      },
    );
    expect(customerKitchenDenied.status()).toBe(403);
    const customerReady = await generated.evaluate(async (id) => {
      const response = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      return { body: await response.json(), status: response.status };
    }, orderId);
    expect(customerReady.status).toBe(200);
    expect(customerReady.body.order?.status).toBe("ready");
    expect(
      (await merchantOrders(managerOrigin)).find(
        (order) => order.id === orderId,
      )?.status,
    ).toBe("ready");
    expect(
      (await merchantOrders(cashierOrigin)).find(
        (order) => order.id === orderId,
      )?.status,
    ).toBe("ready");
    reportStage("merchant-denial");

    reportStage("generated-accessibility");
    accessibility.generatedDesktop = await accessibilityViolations(generated);
    await generated.setViewportSize({ width: 390, height: 844 });
    accessibility.generatedNarrow = await accessibilityViolations(generated);
  } finally {
    try {
      await generated?.close();
    } catch {
      // The runner owns preview teardown even if the browser page already died.
    }
    reportCleanupStage("page-closed");
  }

  expect(Object.values(accessibility)).toEqual([0, 0, 0, 0]);
  reportStage("evidence");
  console.info(
    "FACTORY_ACCEPTANCE_EVIDENCE",
    JSON.stringify({
      accessibility,
      digests: {
        compilation: composeArtifact!.digest,
        publishedRevision: published.graphHash,
      },
    }),
  );
});
