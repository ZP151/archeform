import { expect, test } from "@playwright/test";

test("edits a Draft, publishes an immutable revision, and compiles it", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('[data-theme="light"]')).toBeVisible();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();

  await page.getByRole("button", { name: "Flow" }).click();
  await expect(page.getByLabel("React Flow Flow Studio")).toBeVisible();

  await page.getByRole("button", { name: "Domain" }).click();
  const fieldKey = `e2e${Date.now()}`;
  await page.getByLabel("Field key").fill(fieldKey);
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(page.getByText(fieldKey, { exact: true })).toBeVisible();

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

  await page.getByRole("button", { name: "History" }).click();
  await expect(
    page.getByLabel("Application Graph revision timeline"),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Application Graph revision timeline")
      .getByText("Published", { exact: true })
      .first(),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Page" }).click();
  await expect(page.getByLabel("Puck Page Studio")).toBeVisible();
});
