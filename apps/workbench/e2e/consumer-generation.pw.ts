import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { installConsumerGenerationFixture } from "../test/consumer-generation-fixture";

async function expectNoHorizontalOverflow(page: Page, width: number) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ clientWidth: width, scrollWidth: width });
}

async function expectAccessibleAt(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 844 });
  await expectNoHorizontalOverflow(page, width);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

async function submitRestaurantDescribe(page: Page): Promise<void> {
  await page.getByLabel("Requirement brief").fill("Restaurant ordering.");
  const submit = page.getByRole("button", { name: "Create product" });
  await expect(submit).toBeEnabled();
  await submit.click();
}

test("fresh Restaurant Describe selects standard and completes one local delivery", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    holdChoice: true,
  });

  await page.goto("/");
  await submitRestaurantDescribe(page);

  await expect
    .poll(() => fixture.requests)
    .toEqual(["interpret", "review", "plan", "choice"]);
  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  await expect(delivery).toBeVisible();
  await expect(page.getByRole("button", { name: /Choose / })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Review the product plan" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Review the approved plan Diff" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Apply to Draft" }),
  ).toHaveCount(0);
  fixture.releaseChoice();
  await expect(delivery).toContainText(
    "This uses the standard Restaurant configuration in a local demo.",
  );
  await expect(delivery).toContainText(
    "sample menu items and simulated payments",
  );
  try {
    await expect
      .poll(() => fixture.requests)
      .toEqual([
        "interpret",
        "review",
        "plan",
        "choice",
        "apply",
        "open-draft",
        "publish",
        "compile",
        "compilation-status",
        "verify",
        "verification-status",
        "preview",
        "preview-status",
      ]);
  } catch (error) {
    const deliveryStatus = await delivery.getByRole("status").textContent();
    throw new Error(
      JSON.stringify({
        deliveryStatus,
        pageErrors: fixture.pageErrors,
        requests: fixture.requests,
      }),
      { cause: error },
    );
  }
  await expect(
    delivery.getByRole("link", { name: "Open local app" }),
  ).toHaveAttribute("href", "http://127.0.0.1:3210");
  expect(fixture.selectedAlternativeKeys).toEqual(["standard"]);
  await expect(page.getByLabel("Requirement brief")).toHaveCount(0);

  for (const width of [1440, 768, 390]) {
    await expectAccessibleAt(page, width);
  }
});

test("Advanced options keeps the Restaurant plan and Draft application manual", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page);

  await page.goto("/");
  await page.getByText("Advanced options", { exact: true }).click();
  await page.getByLabel("Review the plan and delivery steps myself").check();
  await submitRestaurantDescribe(page);

  const chooseStandard = page.getByRole("button", {
    name: /Choose .*standard/i,
  });
  await expect(chooseStandard).toBeVisible();
  expect(fixture.requests).toEqual(["interpret", "review", "plan"]);
  await chooseStandard.click();
  await expect(
    page.getByRole("button", { name: "Apply to Draft" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply to Draft" }).click();

  await expect(page.getByText("Preview synced · Draft r.2")).toBeVisible();
  expect(fixture.requests).toEqual([
    "interpret",
    "review",
    "plan",
    "choice",
    "apply",
    "open-draft",
  ]);
});

test("non-loopback delivery readiness never exposes a usable app link", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    previewUrl: "https://outside.example.test/ready",
  });

  await page.goto("/");
  await submitRestaurantDescribe(page);

  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  await expect(delivery).toContainText("Delivery paused.");
  await expect(
    delivery.getByRole("link", { name: "Open local app" }),
  ).toHaveCount(0);
  await expect(
    delivery.getByRole("button", { name: "Restart local delivery" }),
  ).toBeVisible();
  expect(fixture.requests).toContain("preview-status");
});

test("an unknown publish result restarts at Describe without replaying immutable work", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    publishUnavailable: true,
  });

  await page.goto("/");
  await submitRestaurantDescribe(page);

  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  await expect(delivery).toContainText("Delivery paused.");
  await expect(
    delivery.getByRole("button", { name: "Restart local delivery" }),
  ).toBeVisible();
  expect(fixture.requests).toEqual([
    "interpret",
    "review",
    "plan",
    "choice",
    "apply",
    "open-draft",
    "publish",
  ]);

  await delivery
    .getByRole("button", { name: "Restart local delivery" })
    .click();
  const brief = page.getByLabel("Requirement brief");
  await expect(brief).toBeVisible();
  await brief.fill("A new Restaurant request.");
  await expect(
    page.getByRole("button", { name: "Create product" }),
  ).toBeEnabled();
  expect(fixture.requests.filter((request) => request === "publish")).toEqual([
    "publish",
  ]);
  expect(fixture.requests).not.toContain("compile");
  expect(fixture.requests).not.toContain("verify");
});

test("duplicate standard alternatives remain in manual review without lifecycle calls", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    alternatives: "duplicate-standard",
  });

  await page.goto("/");
  await submitRestaurantDescribe(page);

  await expect(page.getByRole("button", { name: /Choose / })).toHaveCount(3);
  expect(fixture.requests).toEqual(["interpret", "review", "plan"]);
  await expect(
    page.getByRole("region", { name: "Restaurant delivery" }),
  ).toHaveCount(0);
});
