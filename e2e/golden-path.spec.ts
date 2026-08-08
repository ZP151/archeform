import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Golden Path browser acceptance: the complete governed journey over the
 * immutable Draft lifecycle for the Expense Approval profile.
 *
 * Discuss -> Plan (>=2 alternatives + visual Graph Diff) -> Build (accepted
 * plan, one token and one layout adjustment) -> Simulate (employee submit,
 * manager approve/reject, finance audit, employee denial) -> Release
 * (one-action publish -> compile -> isolated verification -> local preview)
 * -> Stop preview, proving the journey and its preview resources are cleaned
 * up. The preview tab is a generated application, never the Workbench.
 *
 * Requires the factory compose stack (project `factory-pilot`) and
 * FACTORY_E2E_FACTORY_PROJECT for the docker-level cleanup proof.
 */

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const factoryE2eControlPlaneUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Whether every preview resource is demonstrably removed: the worker's copied
 * preview directory and the preview compose project's containers, network,
 * and volumes. The stop request returns as soon as the worker accepts it
 * (the API transitions the run to "stopping"), so teardown is eventually
 * consistent — the E2E polls this to prove the terminal state.
 */
function previewResourcesRemoved(
  previewRunId: string,
  composeProjectName: string,
): boolean {
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
  if (!/\S/.test(workerContainer)) return false;
  const artifactGone = dockerOutput([
    "exec",
    workerContainer,
    "sh",
    "-c",
    `test ! -d /artifacts/.preview-runs/${previewRunId} && echo removed || echo present`,
  ]);
  if (artifactGone.trim() !== "removed") return false;
  const composeResourceArgs: readonly (readonly string[])[] = [
    ["ps", "--all"],
    ["network", "ls"],
    ["volume", "ls"],
  ];
  return composeResourceArgs.every(
    (prefix) =>
      dockerOutput([
        ...prefix,
        "--filter",
        `label=com.docker.compose.project=${composeProjectName}`,
        "--quiet",
      ]).trim() === "",
  );
}

async function createExpenseApprovalApplication(
  page: Page,
  name: string,
): Promise<void> {
  await page.goto("/");
  // The compose stack starts the control plane cold; the workbench retries
  // its bootstrap on a bounded schedule, so allow the full cold-boot window.
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
  await page.getByTestId("guided-template-expense-approval").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Application name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("guided-create").click();
  await expect(page.getByLabel("Current application")).toHaveText(name);
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
}

test("runs the complete Golden Path journey over the immutable Draft lifecycle", async ({
  page,
}) => {
  test.setTimeout(900_000);
  const name = `Golden path ${Date.now().toString()}`;
  await createExpenseApprovalApplication(page, name);

  await page.getByRole("button", { name: "Golden Path" }).click();
  await expect(page.getByLabel("Golden Path workspace")).toBeVisible();

  // Discuss: answer the required clarifications and build the requirement spec.
  await page.getByLabel("Answer 'approval-threshold' with '1000'").click();
  await page.getByLabel("Answer 'manager-role' with 'manager'").click();
  await page.getByLabel("Answer 'audit-trail' with 'audit-required'").click();
  await page
    .getByLabel("Answer 'multi-level-approval' with 'no-escalation'")
    .click();
  await page.getByLabel("Build requirement spec").click();
  await expect(page.getByLabel("Requirement spec summary")).toContainText(
    "employee-submit",
  );
  await page.getByLabel("Proceed to Plan").click();

  // Plan: produce at least two alternatives, accept one, inspect the diff.
  await page.getByLabel("Produce plan alternatives").click();
  await expect(
    page.getByLabel("Plan the Expense Approval application"),
  ).toContainText("Standard approval");
  await page.getByLabel("Accept 'standard'").click();
  await expect(page.getByLabel("Visual Graph Diff")).toContainText(
    "submit: draft -> submitted",
  );
  await page.getByLabel("Proceed to Build").click();

  // Build: apply the accepted plan, adjust one token and one layout.
  await page.getByLabel("Apply plan to Draft").click();
  await page.getByLabel("Colour token value").fill("#146b8e");
  await page.getByLabel("Apply token adjustment").click();
  await page.getByLabel("Page layout variant").selectOption("dashboard");
  await page.getByLabel("Apply layout adjustment").click();
  await expect(
    page.getByLabel("Build the Expense Approval Draft"),
  ).toContainText("colour token brand");
  await page.getByLabel("Apply to Draft").click();
  await expect(
    page.getByLabel("Build the Expense Approval Draft"),
  ).toContainText(/Applied as revision \S+ · r\.\d+/);
  await page.getByLabel("Proceed to Simulate").click();

  // Simulate: employee submits, manager approves and rejects, finance audits,
  // an employee authorization denial is recorded.
  await page.getByLabel("Start simulation").click();
  await page.getByLabel("Apply submit to expense-100").click();
  await page.getByLabel("Switch role to manager").click();
  await page.getByLabel("Apply approve to expense-101").click();
  await page.getByLabel("Apply reject to expense-102").click();
  await page.getByLabel("Switch role to finance").click();
  await expect(page.getByLabel("Audit trail")).toContainText("approve");
  await expect(page.getByLabel("Audit trail")).toContainText("reject");
  await page.getByLabel("Switch role to employee").click();
  await page.getByLabel("Apply submit to expense-101").click();
  await expect(page.getByLabel("Denial trail")).toContainText("flow-state");
  await page.getByLabel("Proceed to Release").click();

  // Release: one action publishes, compiles, verifies, and previews.
  const previewStarted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/compilations\/[^/]+\/preview-runs$/.test(response.url()),
  );
  await page.getByLabel("Publish and release").click();
  const previewRun = (await (await previewStarted).json()) as {
    readonly id: string;
  };
  expect(previewRun.id).toMatch(/^preview-[a-z0-9-]+$/);
  const composeProjectName = `factory-preview-${previewRun.id}`;

  const openPreview = page.getByLabel("Open preview");
  await expect(openPreview).toBeVisible({ timeout: 600_000 });
  const previewUrl = await openPreview.getAttribute("href");
  expect(previewUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+/);

  const previewPage = page.context().waitForEvent("page");
  await openPreview.click();
  const preview = await previewPage;
  await expect(preview).toHaveURL(/127\.0\.0\.1/);
  await expect(preview.locator("main.generated-app")).toBeVisible({
    timeout: 60_000,
  });
  await expect(preview.getByLabel("Puck Page Studio")).toHaveCount(0);

  // Evidence: publish -> compile -> verify -> preview all recorded; the
  // simulation denial is part of the journey timeline.
  const timeline = page.getByLabel("Golden Path evidence timeline");
  await expect(timeline).toContainText("publish");
  await expect(timeline).toContainText("compile");
  await expect(timeline).toContainText("verify");
  await expect(timeline).toContainText("preview");
  await expect(timeline).toContainText("authorization-denial");

  // Cleanup: stop the preview; the journey completes and the preview project
  // (containers, networks, volumes, copied preview directory) is removed.
  await page.getByLabel("Stop preview").click();
  await expect(page.getByText("Golden Path journey complete")).toBeVisible({
    timeout: 60_000,
  });
  if (factoryE2eControlPlaneUrl) {
    await expect
      .poll(() => previewResourcesRemoved(previewRun.id, composeProjectName), {
        timeout: 120_000,
        message:
          "preview project containers, network, volumes, and worker artifact directory are removed",
      })
      .toBe(true);
  }
});
