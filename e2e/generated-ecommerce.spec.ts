import { expect, test } from "@playwright/test";

const generatedApplicationUrl = process.env.FACTORY_GENERATED_E2E_URL;

test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_E2E_URL for an isolated generated-app journey.",
);

test("enforces identity policy through the generated ecommerce customer and operator journey", async ({
  page,
}) => {
  await page.goto(generatedApplicationUrl!);
  await expect(page.getByRole("heading", { name: /ecommerce/i })).toBeVisible();

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
  const paymentCompleted = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/order\/[^/]+\/events\/pay$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await page.getByRole("button", { name: "Pay simulated payment" }).click();
  expect((await paymentCompleted).ok()).toBeTruthy();

  await page.getByRole("link", { name: "Orders" }).click();
  await expect(page).toHaveURL(/\/orders$/);
  const paidOrder = page.locator("li").filter({ hasText: '"status":"paid"' });
  await expect(paidOrder.last()).toBeVisible({ timeout: 10_000 });
  const paidRecord = JSON.parse(
    (await paidOrder.last().locator("code").textContent()) ?? "{}",
  ) as { readonly id?: string; readonly status?: string };
  expect(paidRecord).toMatchObject({
    id: expect.any(String),
    status: "paid",
  });

  const deniedFulfilment = await page.request.post(
    new URL(
      `/api/order/${encodeURIComponent(paidRecord.id!)}/events/fulfil`,
      generatedApplicationUrl!,
    ).toString(),
    {
      headers: {
        "x-factory-fixture-session": "fixture-session-shopper",
      },
      data: {},
    },
  );
  expect(deniedFulfilment.status()).toBe(403);
  await expect(deniedFulfilment.text()).resolves.toContain(
    "Identity policy denied",
  );

  await page.getByLabel("Role").selectOption("merchant");
  await paidOrder.last().getByRole("button", { name: "fulfil" }).click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"fulfilled"' }).last(),
  ).toBeVisible({ timeout: 10_000 });
});
