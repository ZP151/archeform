import { expect, test } from "@playwright/test";

const generatedApplicationUrl =
  process.env.FACTORY_GENERATED_RESTAURANT_E2E_URL;
const tableSessionToken =
  process.env.FACTORY_GENERATED_RESTAURANT_TABLE_SESSION_TOKEN;

test.skip(
  !generatedApplicationUrl || !tableSessionToken,
  "Set the generated Restaurant URL and opaque table-session token for an isolated generated-app journey.",
);

test("customer resolves a table session, adds notes, pays, and sees status and receipt", async ({
  page,
}) => {
  const tableUrl = new URL(generatedApplicationUrl!);
  tableUrl.pathname = `/table/${encodeURIComponent(tableSessionToken!)}`;
  await page.goto(tableUrl.toString());
  await expect(
    page.getByRole("heading", { name: "Restaurant ordering" }),
  ).toBeVisible();
  await expect(page.getByText("Table session active")).toBeVisible();

  await page.getByRole("link", { name: "Menu" }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await page.getByLabel("Search menu").fill("Margherita");
  await page.getByRole("button", { name: "Search" }).click();

  const pizza = page.locator("li").filter({ hasText: "Margherita pizza" });
  await expect(pizza).toHaveCount(1);
  await expect(page.getByText("Mushroom risotto")).toHaveCount(0);
  await pizza.getByLabel("Quantity").fill("2");
  await pizza.getByLabel("Item note").fill("No basil");
  await pizza.getByRole("button", { name: "Add Margherita pizza" }).click();

  await page.getByRole("link", { name: "Cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByLabel("Order note").fill("Please serve together");
  await page.getByRole("button", { name: "Pay simulated payment" }).click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Current order" }).click();
  await expect(page.getByText("Session order history")).toBeVisible();
  await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("navigation", { name: "Customer routes" })
    .getByRole("link", { name: "Receipt" })
    .click();
  await expect(page).toHaveURL(/\/receipt\//);
  await expect(page.getByRole("heading", { name: "Receipt" })).toBeVisible();
  await expect(page.getByText("Margherita pizza")).toBeVisible();
  await expect(page.getByText("No basil")).toBeVisible();
  await expect(page.getByText("Please serve together")).toBeVisible();
});
