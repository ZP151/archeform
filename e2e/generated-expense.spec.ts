import { expect, test } from "@playwright/test";

const generatedApplicationUrl = process.env.FACTORY_GENERATED_EXPENSE_E2E_URL;

test.skip(
  !generatedApplicationUrl,
  "Set FACTORY_GENERATED_EXPENSE_E2E_URL for an isolated generated-app journey.",
);

test("enforces identity policy through the generated expense employee and manager journey", async ({
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

  const submittedExpense = page
    .locator("li")
    .filter({ hasText: '"status":"submitted"' })
    .last();
  await expect(submittedExpense).toBeVisible({ timeout: 10_000 });
  const submittedRecord = JSON.parse(
    (await submittedExpense.locator("code").textContent()) ?? "{}",
  ) as { readonly id?: string; readonly status?: string };
  expect(submittedRecord).toMatchObject({
    id: expect.any(String),
    status: "submitted",
  });

  const deniedApproval = await page.request.post(
    new URL(
      `/api/expense/${encodeURIComponent(submittedRecord.id!)}/events/approve`,
      generatedApplicationUrl!,
    ).toString(),
    {
      headers: {
        "x-factory-fixture-session": "fixture-session-employee",
      },
      data: {},
    },
  );
  expect(deniedApproval.status()).toBe(403);
  await expect(deniedApproval.text()).resolves.toContain(
    "Identity policy denied",
  );

  const managerRecords = await page.request.get(
    new URL("/api/expense", generatedApplicationUrl!).toString(),
    {
      headers: {
        "x-factory-fixture-session": "fixture-session-manager",
      },
    },
  );
  expect(managerRecords.ok()).toBeTruthy();
  await expect(managerRecords.json()).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: submittedRecord.id, status: "submitted" }),
    ]),
  );

  await page.getByLabel("Role").selectOption("manager");
  await submittedExpense.getByRole("button", { name: "approve" }).click();
  await expect(
    page.locator("li").filter({ hasText: '"status":"approved"' }).last(),
  ).toBeVisible({ timeout: 10_000 });
});
