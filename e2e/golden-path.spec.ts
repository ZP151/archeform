import { expect, test, type Page } from "@playwright/test";

/**
 * Honest Requirement-to-Product Closure browser acceptance: two unrelated
 * free-form prompts, each starting from an empty workspace with no Profile or
 * starter selection, must yield a validated Requirement Summary.
 *
 * Task 1 pins the reopened boundary: the fixed Expense replay (guided
 * template) is gone, and the requirement composer is the default Home
 * decision. Later tasks extend these two scenarios across plan alternatives,
 * visual Diff, multi-page studio, simulation, publish, compile, isolated
 * verification, preview, and cleanup.
 *
 * Requires the factory compose stack (project `factory-pilot`).
 */

/** Prompt A — Expense Approval (free-form requirement). */
const expenseApprovalBrief = [
  "Build an expense approval application. Employees submit expenses with",
  "amount, category, date, receipt, and notes. Managers approve or reject",
  "them, and finance can audit all decisions.",
].join(" ");

/** Prompt B — Appointment Booking (free-form requirement). */
const appointmentBookingBrief = [
  "Build an appointment booking application. Customers choose a service and",
  "an available time, staff confirm or reschedule appointments, and",
  "administrators manage services, schedules, and cancellations.",
].join(" ");

/**
 * Opens the Workbench and proves the primary frame offers the free-form
 * requirement composer — and no Profile card, starter, or guided template.
 */
async function openRequirementComposer(page: Page): Promise<void> {
  await page.goto("/");
  // The compose stack starts the control plane cold; the workbench retries
  // its bootstrap on a bounded schedule, so allow the full cold-boot window.
  await expect(
    page.getByText("Control Plane ready", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByLabel("Requirement brief")).toBeVisible();
  await expect(page.getByTestId(/guided-template-/)).toHaveCount(0);
}

async function interpretBrief(page: Page, brief: string): Promise<void> {
  await page.getByLabel("Requirement brief").fill(brief);
  await page
    .getByRole("button", { name: "Interpret requirement", exact: true })
    .click();
}

test("Prompt A — Expense Approval: a free-form brief yields a requirement summary", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await openRequirementComposer(page);
  await interpretBrief(page, expenseApprovalBrief);
  const summary = page.getByLabel("Requirement summary");
  await expect(summary).toBeVisible({ timeout: 120_000 });
  await expect(summary).toContainText("expense");
  await expect(summary).toContainText("manager");
  await expect(summary).toContainText("finance");
});

test("Prompt B — Appointment Booking: a different brief yields a different summary without a template", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await openRequirementComposer(page);
  await interpretBrief(page, appointmentBookingBrief);
  const summary = page.getByLabel("Requirement summary");
  await expect(summary).toBeVisible({ timeout: 120_000 });
  await expect(summary).toContainText("appointment");
  await expect(summary).toContainText("service");
  // The journey must never require a Profile or starter selection.
  await expect(page.getByTestId(/guided-template-/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /choose a template/i }),
  ).toHaveCount(0);
});
