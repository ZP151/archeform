import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Task 9C — Restaurant V3 acceptance: one environment-only real-model run.
 *
 * A single free-form restaurant brief routes through the Describe entry to the
 * deterministic Restaurant V3 composer, opens as a V3 Draft in the
 * template-draft workspace (dual-surface previews + Page/Data/Experience/Access
 * editors), then Publish an immutable revision, compile it through the
 * Restaurant V3 target, run the generated customer / merchant / shared-state
 * journeys through the V1/V3 verification queue, boot a local preview, and
 * clean up. Accessibility is asserted at desktop and 390px.
 *
 * Requires the isolated factory compose stack (a run-scoped `factory-t9-*`
 * project with rebuilt workbench / control-plane / compiler-worker images) and
 * an environment-only real-model key. This is NOT the stale V1 Expense/
 * Appointment golden-path and NOT the V1 restaurant runtime spec.
 */

const restaurantBrief = [
  "Build a restaurant ordering application. Customers browse a menu and place",
  "table orders. The kitchen accepts, starts, and marks orders ready. The",
  "manager manages the menu, tables, and settings.",
].join(" ");

const acceptanceClarificationAnswer = [
  "Customers place table orders and pay with simulated cards. The kitchen",
  "prepares accepted orders in priority order. The manager manages the menu,",
  "tables, users, settings, and exceptions. Use a single restaurant location",
  "with simulated payment and no regulated data.",
].join(" ");

const factoryE2eProject = process.env.FACTORY_E2E_FACTORY_PROJECT;
const factoryE2eControlPlaneUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;

const REQUIREMENT_OBSERVER_TIMEOUT_MS = 570_000;
const PLAN_OBSERVER_TIMEOUT_MS = 1_800_000;
const COMPILATION_TIMEOUT_MS = 315_000;
const VERIFICATION_TIMEOUT_MS = 910_000;

test.describe.configure({ mode: "serial" });

function dockerOutput(args: readonly string[]): string {
  return execFileSync("docker", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function controlPlaneUrl(path: string): string {
  if (!factoryE2eControlPlaneUrl) {
    throw new Error(
      "FACTORY_E2E_CONTROL_PLANE_URL is required for isolated acceptance.",
    );
  }
  return new URL(path, `${factoryE2eControlPlaneUrl}/`).toString();
}

test.beforeAll(async () => {
  expect(
    process.env.FACTORY_E2E_ISOLATED,
    "Restaurant V3 acceptance requires an explicitly isolated factory stack.",
  ).toBe("1");
  expect(factoryE2eProject).toMatch(/^factory-t9-[a-z0-9-]+$/);
  expect(factoryE2eProject).not.toBe("factory-pilot");
  const postgresContainer = dockerOutput([
    "ps",
    "--filter",
    `label=com.docker.compose.project=${factoryE2eProject}`,
    "--filter",
    "label=com.docker.compose.service=postgres",
    "--quiet",
  ]);
  expect(postgresContainer, "isolated PostgreSQL container").toMatch(/\S/);
});

async function visibleWithin(
  locator: Locator,
  timeoutMs: number,
): Promise<boolean> {
  return locator.waitFor({ state: "visible", timeout: timeoutMs }).then(
    () => true,
    () => false,
  );
}

async function waitForRequirementSummary(page: Page): Promise<void> {
  const summary = page.getByLabel("Requirement summary");
  const failed = page.locator(
    'section[aria-label="Product creation"][data-journey-outcome="failed"]',
  );
  const outcome = await Promise.race([
    summary
      .waitFor({ state: "visible", timeout: REQUIREMENT_OBSERVER_TIMEOUT_MS })
      .then(() => "ready" as const),
    failed
      .waitFor({ state: "visible", timeout: REQUIREMENT_OBSERVER_TIMEOUT_MS })
      .then(() => "failed" as const),
  ]);
  if (outcome === "failed")
    throw new Error("Requirement interpretation failed.");
}

async function waitForPlanChoice(page: Page): Promise<Locator> {
  const choose = page.getByRole("button", { name: /^Choose / }).first();
  const failed = page.locator(
    'section[aria-label="Product creation"][data-journey-outcome="failed"]',
  );
  const outcome = await Promise.race([
    choose
      .waitFor({ state: "visible", timeout: PLAN_OBSERVER_TIMEOUT_MS })
      .then(() => "ready" as const),
    failed
      .waitFor({ state: "visible", timeout: PLAN_OBSERVER_TIMEOUT_MS })
      .then(() => "failed" as const),
  ]);
  if (outcome === "failed") throw new Error("Product journey failed.");
  return choose;
}

test("Restaurant Describe yields a V3 Draft, edits, publishes, compiles, verifies, previews, and cleans up", async ({
  page,
}) => {
  test.setTimeout(1_800_000);
  await page.goto("/");

  // Describe: the interpreter routes a restaurant brief to the V3 composer.
  await page.getByLabel("Requirement brief").fill(restaurantBrief);
  await page.getByRole("button", { name: "Create product" }).click();
  await waitForRequirementSummary(page);

  const continueClarifying = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  const questionInputs = page.locator("ol.clarification-questions input");
  if (await visibleWithin(continueClarifying, 15_000)) {
    const count = await questionInputs.count();
    for (let index = 0; index < count; index += 1) {
      await questionInputs.nth(index).fill(acceptanceClarificationAnswer);
    }
    await continueClarifying.click();
    await expect(continueClarifying).toBeDisabled({ timeout: 10_000 });
  }

  const choose = await waitForPlanChoice(page);
  await choose.click();
  const apply = page.getByRole("button", { name: "Apply to Draft" });
  await expect(apply).toBeVisible({ timeout: 60_000 });
  await expect(apply).toBeEnabled({ timeout: 60_000 });
  await apply.click();

  // The Describe-composed V3 Draft opens in the template-draft workspace at
  // revision r.2 (the blank r.1 + the applied V3 Draft).
  await expect(page.getByText("Preview synced · Draft r.2")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText("8 customer pages")).toBeVisible();
  await expect(page.getByText("7 merchant pages")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish draft" }),
  ).toBeEnabled();

  // Page edit: rename the Menu page (r.2 -> r.3).
  await page.getByRole("button", { name: "Select Menu" }).click();
  await page.getByRole("button", { name: "Edit Menu" }).click();
  await expect(
    page.getByRole("region", { name: "Template Page workspace" }),
  ).toBeVisible();
  const pageTitle = page.getByRole("textbox", { name: "Page title" });
  await pageTitle.fill("Seasonal Menu");
  await pageTitle.press("Enter");
  await expect(page.getByText("Draft r.3 · Preview active")).toBeVisible();

  // Data edit: rename a seeded dish (r.3 -> r.4).
  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Data" })
    .click();
  await expect(
    page.getByRole("region", { name: "Template Data workspace" }),
  ).toBeVisible();
  const dishName = page.getByRole("textbox", { name: "Dish name" });
  await expect(dishName).toHaveValue("Margherita pizza");
  await dishName.fill("Heirloom tomato pizza");
  await page
    .getByRole("button", { name: "Save dish name as new Draft" })
    .click();
  await expect(page.getByText("Draft r.4 · Preview active")).toBeVisible();

  // Experience edit: dark theme (r.4 -> r.5).
  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Experience" })
    .click();
  await expect(
    page.getByRole("region", { name: "Template Experience workspace" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Dark" }).check();
  await page
    .getByRole("button", { name: "Save dark theme as new Draft" })
    .click();
  await expect(page.getByText("Draft r.5 · Preview active")).toBeVisible();

  // Access edit: declare a role (r.5 -> r.6).
  await page
    .getByRole("navigation", { name: "Builder navigation" })
    .getByRole("button", { name: "Access" })
    .click();
  await expect(
    page.getByRole("region", { name: "Template Access workspace" }),
  ).toBeVisible();
  const roleKey = page.getByRole("textbox", { name: "Role key" });
  await roleKey.fill("waiter");
  await page.getByRole("button", { name: "Save role as new Draft" }).click();
  await expect(page.getByText("Draft r.6 · Preview active")).toBeVisible();

  // Publish the immutable revision, then compile through the V3 target.
  const publishedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/published-revisions$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Publish draft" }).click();
  const published = (await (await publishedResponse).json()) as { id: string };
  expect(published.id).toBeTruthy();

  await expect(page.getByRole("button", { name: "Compile" })).toBeEnabled({
    timeout: 60_000,
  });
  const compileResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/compilations$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Compile" }).click();
  const compilation = (await (await compileResponse).json()) as { id: string };
  expect(compilation.id).toBeTruthy();

  // The controller polls the queued compilation; wait until the source canvas
  // enables the verification trigger (a succeeded compilation).
  const runVerification = page.getByRole("button", {
    name: "Run verification",
  });
  await expect(runVerification).toBeEnabled({
    timeout: COMPILATION_TIMEOUT_MS,
  });

  // Verify through the V1/V3 verification queue (generated journeys).
  await runVerification.click();
  const evidenceSteps = page.getByLabel("Verification evidence steps");
  await expect(evidenceSteps).toBeVisible({ timeout: VERIFICATION_TIMEOUT_MS });
  await expect(evidenceSteps).toContainText("customer-journey");
  await expect(evidenceSteps).toContainText("merchant-journey");
  await expect(evidenceSteps).toContainText("shared-state");
  await expect(evidenceSteps).toContainText("cleanup");
  await expect(evidenceSteps).toContainText("passed");

  // Preview: boot the compiled bundle and confirm both surfaces serve.
  await page.getByRole("button", { name: "Start preview" }).click();
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          controlPlaneUrl(
            `/compilations/${compilation.id}/preview-runs/current`,
          ),
        );
        const body = (await response.json()) as {
          status?: string;
          previewUrl?: string | null;
          apiPort?: number | null;
        };
        return body.status;
      },
      { timeout: COMPILATION_TIMEOUT_MS },
    )
    .toBe("ready");
  const preview = (await (
    await page.request.get(
      controlPlaneUrl(`/compilations/${compilation.id}/preview-runs/current`),
    )
  ).json()) as { previewUrl: string | null; apiPort: number | null };
  expect(preview.previewUrl).toBeTruthy();
  const customer = await page.request.get(preview.previewUrl!);
  expect(customer.ok()).toBeTruthy();
  const merchant = await page.request.get(
    `http://127.0.0.1:${preview.apiPort}/health`,
  );
  expect(merchant.ok()).toBeTruthy();

  // Accessibility at desktop and narrow viewports.
  const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  const desktop = await axe.analyze();
  expect(desktop.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await axe.analyze();
  expect(narrow.violations).toEqual([]);

  // Cleanup: stop the preview and confirm its isolated resources are removed.
  await page.getByRole("button", { name: "Stop preview" }).click();
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          controlPlaneUrl(
            `/compilations/${compilation.id}/preview-runs/current`,
          ),
        );
        const body = (await response.json()) as { status?: string };
        return body.status;
      },
      { timeout: 120_000 },
    )
    .toBe("stopped");
});
