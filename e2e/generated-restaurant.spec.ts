import { expect, test } from "@playwright/test";

const generatedApplicationUrl =
  process.env.FACTORY_GENERATED_RESTAURANT_E2E_URL;
const tableSessionToken =
  process.env.FACTORY_GENERATED_RESTAURANT_TABLE_SESSION_TOKEN;

test("customer resolves a table session, adds notes, pays, and sees status and receipt", async ({
  page,
}) => {
  test.skip(
    !generatedApplicationUrl,
    "Set the generated Restaurant URL for an isolated generated-app Customer journey.",
  );
  expect(
    tableSessionToken,
    "Set the opaque table-session token when the generated Restaurant URL is available.",
  ).toBeTruthy();
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

test("merchant manages inventory, kitchen, cashier, cancellation, and reporting", async ({
  page,
}) => {
  test.skip(
    !generatedApplicationUrl,
    "Set the generated Restaurant URL for an isolated generated-app Merchant journey.",
  );

  const merchantUrl = new URL(generatedApplicationUrl!);
  merchantUrl.pathname = "/merchant/tables";
  await page.goto(merchantUrl.toString());
  await expect(
    page.getByRole("heading", { name: "Table board" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Menu" }).click();
  await expect(page).toHaveURL(/\/merchant\/menu$/);
  const menuItem = page.locator("li").filter({ hasText: "Margherita pizza" });
  await expect(menuItem).toHaveCount(1);
  await menuItem.getByRole("button", { name: "Disable" }).click();
  await expect(menuItem.getByText("Disabled")).toBeVisible();
  await menuItem.getByRole("button", { name: "Enable" }).click();
  const stockMatch = /stock (\d+)/.exec(await menuItem.innerText());
  expect(stockMatch).not.toBeNull();
  const currentStock = Number(stockMatch![1]);
  expect(currentStock).toBeGreaterThan(4);
  await menuItem.getByLabel("Stock adjustment").fill(String(4 - currentStock));
  await menuItem.getByRole("button", { name: "Adjust stock" }).click();
  await expect(menuItem).toContainText("stock 4");

  await page.getByRole("link", { name: "Cashier" }).click();
  await expect(
    page.getByRole("heading", { name: "Cashier console" }),
  ).toBeVisible();
  const cashierOrder = page.locator("li").filter({ hasText: "Table 98" });
  await expect(cashierOrder).toHaveCount(1);
  await expect(cashierOrder).toContainText("submitted");
  await cashierOrder
    .getByRole("button", { name: "Capture simulated payment" })
    .click();
  await expect(cashierOrder).toContainText("paid");
  await cashierOrder.getByRole("button", { name: "View receipt" }).click();
  const browserReceipt = page.getByRole("article", {
    name: "Browser receipt",
  });
  await expect(browserReceipt).toBeVisible();
  await expect(
    browserReceipt.getByRole("heading", { name: "Receipt" }),
  ).toBeVisible();
  await expect(browserReceipt.getByText("Margherita pizza")).toBeVisible();
  await expect(browserReceipt.getByText("Total: 14.00")).toBeVisible();
  await expect(
    browserReceipt.getByRole("button", { name: "Print receipt" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Kitchen" }).click();
  await expect(
    page.getByRole("heading", { name: "Kitchen board" }),
  ).toBeVisible();
  const kitchenOrder = page.locator("li").filter({ hasText: "Table 98" });
  await expect(kitchenOrder).toHaveCount(1);
  const accept = kitchenOrder.getByRole("button", { name: "Accept order" });
  await expect(accept).toBeVisible();
  await accept.click();
  const prepare = kitchenOrder.getByRole("button", {
    name: "Start preparing",
  });
  await expect(prepare).toBeVisible();
  await prepare.click();
  const ready = kitchenOrder.getByRole("button", { name: "Mark ready" });
  await expect(ready).toBeVisible();
  await ready.click();

  await page.getByRole("link", { name: "Cashier" }).click();
  await expect(
    page.getByRole("heading", { name: "Cashier console" }),
  ).toBeVisible();
  const readyOrder = page.locator("li").filter({ hasText: "Table 98" });
  await expect(readyOrder).toHaveCount(1);
  await expect(readyOrder).toContainText("ready");
  const serve = readyOrder.getByRole("button", { name: "Mark served" });
  await expect(serve).toBeVisible();
  await serve.click();
  await expect(readyOrder).toHaveCount(0);

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(
    page.getByRole("heading", { name: "Restaurant dashboard" }),
  ).toBeVisible();
  const metric = (label: string) =>
    page
      .locator("dt")
      .filter({ hasText: new RegExp(`^${label}$`) })
      .locator("xpath=following-sibling::dd[1]");
  await expect(metric("Sales total")).toHaveText(/^\d+\.\d{2}$/);
  await expect(metric("Order count")).toHaveText(/^\d+$/);
  await expect(metric("Average preparation")).toHaveText(/^\d+ seconds$/);
  await expect(metric("Cancellations")).toHaveText("0");
  expect(
    Number(await metric("Sales total").innerText()),
  ).toBeGreaterThanOrEqual(14);
  expect(
    Number(await metric("Order count").innerText()),
  ).toBeGreaterThanOrEqual(2);
  expect(
    Number((await metric("Average preparation").innerText()).split(" ")[0]),
  ).toBeGreaterThanOrEqual(0);
  await expect(page.getByText("Margherita pizza: 4")).toBeVisible();
  const cancellationOrder = page.locator("li").filter({ hasText: "Table 99" });
  await expect(cancellationOrder).toHaveCount(1);
  await expect(cancellationOrder).toContainText("submitted");
  const cancellation = cancellationOrder.getByRole("button", {
    name: "Cancel order",
  });
  await expect(cancellation).toBeVisible();
  await cancellationOrder.getByLabel("Cancellation reason").fill("Guest left");
  await cancellation.click();
  await expect(
    page.getByText(/Inventory released|No inventory release required/),
  ).toBeVisible();
  await expect(page.getByText(/Guest left/)).toBeVisible();
  await expect(page.getByText(/Audit recorded/)).toBeVisible();
  await expect(metric("Cancellations")).toHaveText("1");
  await expect(page.getByText("Margherita pizza: 5")).toBeVisible();

  await page.getByRole("link", { name: "Tables" }).click();
  const lifecycleTable = page.locator("li").filter({ hasText: "Table 98" });
  await expect(lifecycleTable).toHaveCount(1);
  await expect(lifecycleTable).toContainText("open");
  await lifecycleTable.getByRole("button", { name: "Close table" }).click();
  await expect(lifecycleTable).toContainText("closed");
  await lifecycleTable.getByRole("button", { name: "Open table" }).click();
  await expect(lifecycleTable).toContainText("open");
  await lifecycleTable.getByRole("button", { name: "Seat table" }).click();
  await expect(lifecycleTable).toContainText("seated");
  await lifecycleTable.getByRole("button", { name: "Close table" }).click();
  await expect(lifecycleTable).toContainText("closed");
});
