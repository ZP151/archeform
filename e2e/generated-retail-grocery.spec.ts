import { expect, test } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";

type PreviewRunResponse = {
  readonly id: string;
  readonly compilationId: string;
  readonly composeProjectName?: string;
  readonly status?: string;
};

const factoryE2eBaseUrl = process.env.FACTORY_E2E_BASE_URL;
const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const factoryE2eControlPlaneUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;

const profiles = [
  {
    profile: "retail-counter",
    product: "Reusable cup",
    checkoutRoute: "/counter/checkout",
    ordersLink: "Counter sales",
    operatorRole: "cashier",
    terminalEvents: ["issue-receipt"],
    expectedTerminalStatuses: ["receipt-issued"],
    terminalStatus: "receipt-issued",
  },
  {
    profile: "grocery-pickup",
    product: "Fuji apples",
    checkoutRoute: "/pickup/checkout",
    ordersLink: "Pickup orders",
    operatorRole: "fulfilment",
    terminalEvents: ["pick", "ready", "handoff"],
    expectedTerminalStatuses: ["picking", "pickup-ready", "handed-off"],
    terminalStatus: "handed-off",
  },
] as const;

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function dockerExitCode(args: readonly string[]): 0 | 1 {
  const result = spawnSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status === 0 || result.status === 1) return result.status;
  throw new Error("Docker command failed while checking preview cleanup.");
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
      "FACTORY_E2E_CONTROL_PLANE_URL is required for generated profile acceptance.",
    );
  }
  return new URL(path, `${factoryE2eControlPlaneUrl}/`).toString();
}

function previewRunResponse(
  value: unknown,
  operation: "start" | "stop",
): PreviewRunResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Control Plane preview ${operation} response is invalid.`);
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.compilationId !== "string" ||
    typeof record.composeProjectName !== "string" ||
    typeof record.status !== "string"
  ) {
    throw new Error(`Control Plane preview ${operation} response is invalid.`);
  }
  return {
    id: record.id,
    compilationId: record.compilationId,
    composeProjectName: record.composeProjectName,
    status: record.status,
  };
}

function previewCleanupIdentity(value: unknown): {
  readonly previewRunId: string;
  readonly composeProjectName: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const previewRunId = (value as Record<string, unknown>).id;
  if (
    typeof previewRunId !== "string" ||
    !/^preview-[a-z0-9-]+$/.test(previewRunId)
  ) {
    return null;
  }
  return {
    previewRunId,
    composeProjectName: `factory-preview-${previewRunId}`,
  };
}

async function stopPreviewRun(
  previewRunId: string,
  expectedCompilationId: string | null,
  composeProjectName: string,
): Promise<void> {
  const response = await fetch(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(previewRunId)}/stop`),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Control Plane preview stop response is not valid JSON.");
  }
  if (!response.ok) {
    throw new Error(
      `Control Plane preview stop request failed with ${response.status}.`,
    );
  }
  const stoppedPreview = previewRunResponse(payload, "stop");
  expect(stoppedPreview.id, "Stopped Preview Run ID").toBe(previewRunId);
  expect(
    stoppedPreview.compilationId,
    "Stopped Preview Run compilation ID",
  ).toMatch(/\S/);
  if (expectedCompilationId) {
    expect(
      stoppedPreview.compilationId,
      "Stopped Preview Run compilation ID",
    ).toBe(expectedCompilationId);
  }
  expect(
    stoppedPreview.composeProjectName,
    "Stopped Preview Run Compose project name",
  ).toBe(composeProjectName);
  expect(stoppedPreview.status, "Stopped Preview Run status").toMatch(
    /^(stopping|stopped)$/,
  );
}

function previewResourceState(
  previewRunId: string,
  composeProjectName: string,
): Record<"artifact" | "containers" | "networks" | "volumes", string> {
  if (!factoryE2eProject) {
    throw new Error(
      "FACTORY_E2E_FACTORY_PROJECT is required for isolated preview cleanup checks.",
    );
  }

  const workerContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryE2eProject}`,
    "--filter",
    "label=com.docker.compose.service=compiler-worker",
    "--quiet",
  ]);
  expect(workerContainer).toMatch(/\S/);
  return {
    artifact:
      dockerExitCode([
        "exec",
        workerContainer,
        "test",
        "-d",
        `/artifacts/.preview-runs/${previewRunId}`,
      ]) === 0
        ? "present"
        : "",
    containers: dockerOutput([
      "ps",
      "--all",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    networks: dockerOutput([
      "network",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
    volumes: dockerOutput([
      "volume",
      "ls",
      "--filter",
      `label=com.docker.compose.project=${composeProjectName}`,
      "--quiet",
    ]),
  };
}

async function expectPreviewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): Promise<void> {
  await expect
    .poll(() => previewResourceState(previewRunId, composeProjectName), {
      timeout: 60_000,
    })
    .toEqual({ artifact: "", containers: "", networks: "", volumes: "" });
}

async function cleanupPreviewRun(
  previewRunId: string,
  expectedCompilationId: string | null,
  composeProjectName: string,
): Promise<void> {
  const cleanupErrors: unknown[] = [];
  try {
    await stopPreviewRun(
      previewRunId,
      expectedCompilationId,
      composeProjectName,
    );
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await expectPreviewResourcesRemoved(previewRunId, composeProjectName);
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (cleanupErrors.length === 1) throw cleanupErrors[0];
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, "Preview cleanup failed.");
  }
}

for (const profile of profiles) {
  test(`generates and operates the ${profile.profile} profile`, async ({
    page,
  }) => {
    test.setTimeout(420_000);
    expect(
      factoryE2eBaseUrl,
      "FACTORY_E2E_BASE_URL is required for generated profile acceptance.",
    ).toBeTruthy();
    expect(
      factoryE2eControlPlaneUrl,
      "FACTORY_E2E_CONTROL_PLANE_URL is required for generated profile acceptance.",
    ).toBeTruthy();

    const name = `${profile.profile} acceptance ${Date.now().toString()}`;
    await page.goto(factoryE2eBaseUrl!);
    await page
      .getByRole("button", { name: "New application", exact: true })
      .click();
    await page.getByTestId(`guided-template-${profile.profile}`).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Application name").fill(name);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("guided-create").click();
    await expect(page.getByLabel("Current application")).toHaveText(name);
    await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
    await page
      .getByLabel("New page")
      .fill(`${profile.profile} acceptance page ${Date.now().toString()}`);
    await page.getByRole("button", { name: "Add page" }).click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(
      page.getByText("Control Plane ready", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Published" })).toBeVisible();
    await page.getByRole("button", { name: "Compile" }).click();
    await expect(
      page.getByText("Compile succeeded", { exact: true }),
    ).toBeVisible({
      timeout: 60_000,
    });

    let previewCompilationId: string | null = null;
    let previewCleanup: {
      readonly previewRunId: string;
      readonly composeProjectName: string;
    } | null = null;

    try {
      const startedPreview = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
      );
      await page.getByRole("button", { name: "Start preview" }).click();
      const startedPreviewPayload: unknown = await (
        await startedPreview
      ).json();
      previewCleanup = previewCleanupIdentity(startedPreviewPayload);
      const previewRun = previewRunResponse(startedPreviewPayload, "start");
      previewCompilationId = previewRun.compilationId;
      const composeProjectName = `factory-preview-${previewRun.id}`;

      expect(previewRun.id).toMatch(/^preview-[a-z0-9-]+$/);
      expect(previewRun.compilationId).toMatch(/\S/);
      expect(previewRun.composeProjectName).toBe(composeProjectName);

      await expect(
        page.getByText("Preview ready", { exact: true }),
      ).toBeVisible({
        timeout: 300_000,
      });
      generatedImageIds(composeProjectName);

      const previewPage = page.context().waitForEvent("page");
      await page.getByRole("button", { name: "Open preview" }).click();
      const preview = await previewPage;
      await expect(preview.locator("main.generated-app")).toBeVisible();
      await expect(preview.getByLabel("Puck Page Studio")).toHaveCount(0);

      const product = preview
        .locator("li")
        .filter({ hasText: profile.product });
      await expect(product).toBeVisible();
      await product.getByRole("button", { name: "Add to cart" }).click();
      await preview.getByRole("link", { name: "Continue to checkout" }).click();
      await expect(preview).toHaveURL(new RegExp(`${profile.checkoutRoute}$`));
      const payButton = preview.getByRole("button", {
        name: "Pay simulated payment",
      });
      await payButton.click();
      await expect(payButton).toHaveCount(0);

      await preview.getByRole("link", { name: profile.ordersLink }).click();
      await preview.getByLabel("Role").selectOption(profile.operatorRole);
      let record = preview
        .locator("li")
        .filter({ hasText: '"status":"paid"' })
        .last();
      await expect(record).toBeVisible({ timeout: 15_000 });
      for (const [index, terminalEvent] of profile.terminalEvents.entries()) {
        await record.getByRole("button", { name: terminalEvent }).click();
        record = preview
          .locator("li")
          .filter({
            hasText: `"status":"${profile.expectedTerminalStatuses[index]}"`,
          })
          .last();
        await expect(record).toBeVisible({ timeout: 15_000 });
      }
      await expect(preview.locator(".generated-records")).toContainText(
        profile.terminalStatus,
        { timeout: 15_000 },
      );
    } finally {
      if (previewCleanup) {
        await cleanupPreviewRun(
          previewCleanup.previewRunId,
          previewCompilationId,
          previewCleanup.composeProjectName,
        );
      }
    }
  });
}
