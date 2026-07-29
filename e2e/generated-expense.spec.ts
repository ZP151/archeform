import { expect, test } from "@playwright/test";

const generatedApplicationUrl = process.env.FACTORY_GENERATED_EXPENSE_E2E_URL;

test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_EXPENSE_E2E_URL for an isolated generated-app journey.",
);

test("runs the generated expense employee and manager journey", async ({
  page,
}) => {
  const expensesUrl = new URL(generatedApplicationUrl!);
  expensesUrl.pathname = "/expenses";
  await page.goto(expensesUrl.toString());
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(
    page.getByRole("heading", { name: "Expense approval" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "New expense" }).click();
  await expect(page).toHaveURL(/\/expenses\/new$/);
  await page.getByLabel("amount").fill("128.50");
  await page
    .getByLabel("description")
    .fill("Generated browser journey expense");
  await page.getByRole("button", { name: "Create Expense" }).click();
  await expect(page.getByLabel("amount")).toHaveValue("");

  await page.getByRole("link", { name: "Expenses" }).click();
  await expect(page).toHaveURL(/\/expenses$/);

  const draftExpense = page
    .locator("li")
    .filter({ hasText: '"status":"draft"' })
    .last();
  await expect(draftExpense).toBeVisible({ timeout: 10_000 });
  await draftExpense.getByRole("button", { name: "submit" }).click();

  await page.getByLabel("Role").selectOption("manager");
  const submittedExpense = page
    .locator("li")
    .filter({ hasText: '"status":"submitted"' })
    .last();
  await expect(submittedExpense).toBeVisible({ timeout: 10_000 });
  await submittedExpense.getByRole("button", { name: "approve" }).click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"approved"' }).last(),
  ).toBeVisible({ timeout: 10_000 });
});
