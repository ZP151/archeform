import { expect, test } from "@playwright/test";

const generatedApplicationUrl =
  process.env.FACTORY_GENERATED_RESTAURANT_E2E_URL;

test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_RESTAURANT_E2E_URL for an isolated generated-app journey.",
);

test("runs the generated restaurant customer and kitchen journey", async ({
  page,
}) => {
  const menuUrl = new URL(generatedApplicationUrl!);
  menuUrl.pathname = "/menu";
  await page.goto(menuUrl.toString());
  await expect(page).toHaveURL(/\/menu$/);
  await expect(
    page.getByRole("heading", { name: "Restaurant ordering" }),
  ).toBeVisible();

  const pizza = page.locator("li").filter({ hasText: "Margherita pizza" });
  await expect(pizza).toHaveCount(1);
  await pizza.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByRole("button", { name: "Checkout cart" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Checkout cart" }).click();

  await page.getByRole("link", { name: "Cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("link", { name: "Kitchen" }).click();
  await expect(page).toHaveURL(/\/kitchen$/);
  await page.getByLabel("Role").selectOption("kitchen");
  const paidOrder = page.locator("li").filter({ hasText: '"status":"paid"' });
  await expect(paidOrder.last()).toBeVisible({ timeout: 10_000 });
  await paidOrder
    .last()
    .getByRole("button", { name: "start-preparing" })
    .click();
  const preparingOrder = page
    .locator("li")
    .filter({ hasText: '"status":"preparing"' });
  await expect(preparingOrder.last()).toBeVisible({ timeout: 10_000 });
  await preparingOrder
    .last()
    .getByRole("button", { name: "mark-ready" })
    .click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"ready"' }).last(),
  ).toBeVisible({ timeout: 10_000 });
});
