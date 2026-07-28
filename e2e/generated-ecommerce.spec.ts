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
    page.getByRole("button", { name: "Checkout cart" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Checkout cart" }).click();

  await page.getByLabel("Role").selectOption("operator");
  await page.getByRole("button", { name: "Order" }).click();
  const paidOrder = page.locator("li").filter({ hasText: '"status":"paid"' });
  await expect(paidOrder).toHaveCount(1);
  await paidOrder.getByRole("button", { name: "fulfil" }).click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"fulfilled"' }),
  ).toHaveCount(1);
});
