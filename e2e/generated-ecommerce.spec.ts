import { expect, test } from "@playwright/test";

const generatedApplicationUrl = process.env.FACTORY_GENERATED_E2E_URL;

test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_E2E_URL for an isolated generated-app journey.",
);

test("runs the generated ecommerce customer and operator journey", async ({
  page,
}) => {
  await page.goto(generatedApplicationUrl!);
  await expect(
    page.getByRole("heading", { name: "Simple ecommerce" }),
  ).toBeVisible();

  const tote = page.locator("li").filter({ hasText: "Everyday tote" });
  await expect(tote).toHaveCount(1);
  await tote.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByRole("link", { name: "Continue to checkout" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();

  const checkoutUrl = new URL(generatedApplicationUrl!);
  checkoutUrl.pathname = "/checkout";
  await page.goto(checkoutUrl.toString());
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByRole("button", { name: "Pay simulated payment" }).click();

  await page.getByRole("link", { name: "Orders" }).click();
  await expect(page).toHaveURL(/\/orders$/);
  await page.getByLabel("Role").selectOption("merchant");
  const paidOrder = page.locator("li").filter({ hasText: '"status":"paid"' });
  await expect(paidOrder.last()).toBeVisible({ timeout: 10_000 });
  await paidOrder.last().getByRole("button", { name: "fulfil" }).click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"fulfilled"' }).last(),
  ).toBeVisible({ timeout: 10_000 });
});
