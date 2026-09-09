import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { installConsumerGenerationFixture } from "../test/consumer-generation-fixture";

async function submitApproval(page: Page): Promise<void> {
  await page
    .getByLabel("Requirement brief")
    .fill("Create an expense approval app.");
  await page.getByRole("button", { name: "Create product" }).click();
}

test("Approval Describe completes one V1 local delivery without technical handoffs", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    family: "approval",
    holdAppliedDraft: true,
  });
  await page.goto("/");
  await submitApproval(page);
  await expect
    .poll(() => fixture.requests)
    .toEqual(["interpret", "review", "plan", "choice", "apply", "open-draft"]);
  const delivery = page.getByRole("region", { name: "Approval delivery" });
  await expect(delivery).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Choose |Apply to Draft/ }),
  ).toHaveCount(0);
  await expect(
    delivery.getByRole("link", { name: "Open local app" }),
  ).toHaveCount(0);
  fixture.releaseAppliedDraft();
  await expect(
    delivery.getByRole("link", { name: "Open local app" }),
  ).toHaveAttribute("href", "http://127.0.0.1:3210");
  await expect(delivery).toContainText(/local demo/i);
  await expect(delivery).toContainText(/role/i);
  await expect(delivery).not.toContainText(
    /Restaurant|menu items|simulated payments/,
  );
  await expect(page.getByLabel("Requirement brief")).toHaveCount(0);
  expect(fixture.selectedAlternativeKeys).toEqual(["standard"]);
  expect(fixture.requests).toEqual([
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
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  }
  expect(fixture.pageErrors).toEqual([]);
});

test("incomplete reviewer permissions leave the approval plan manual", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    family: "approval",
    approvalMissingRead: true,
  });
  await page.goto("/");
  await submitApproval(page);
  await expect(
    page.getByRole("button", { name: /Choose .*standard/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Approval delivery" }),
  ).toHaveCount(0);
  expect(fixture.requests).toEqual(["interpret", "review", "plan"]);
});

test("manual approval apply retains Page Studio without starting delivery", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    family: "approval",
  });
  await page.goto("/");
  await page.getByText("Advanced options", { exact: true }).click();
  await page.getByLabel("Review the plan and delivery steps myself").check();
  await submitApproval(page);
  await page.getByRole("button", { name: /Choose .*standard/i }).click();
  await page.getByRole("button", { name: "Apply to Draft" }).click();
  await expect
    .poll(() => fixture.requests)
    .toEqual(["interpret", "review", "plan", "choice", "apply", "open-draft"]);
  await expect(
    page.getByRole("region", { name: "Approval delivery" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Puck Page Studio" }),
  ).toBeVisible();
  expect(fixture.requests).not.toContain("publish");
});

test("a newer approval draft pauses delivery without publishing another revision", async ({
  page,
}) => {
  const fixture = await installConsumerGenerationFixture(page, {
    family: "approval",
    openedRevision: 3,
  });
  await page.goto("/");
  await submitApproval(page);
  const delivery = page.getByRole("region", { name: "Approval delivery" });
  await expect(delivery).toContainText("Delivery paused.");
  await expect(
    delivery.getByRole("link", { name: "Open local app" }),
  ).toHaveCount(0);
  expect(fixture.requests).toEqual([
    "interpret",
    "review",
    "plan",
    "choice",
    "apply",
    "open-draft",
  ]);
});
