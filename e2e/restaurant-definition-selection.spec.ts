import { expect, test } from "@playwright/test";
import { observeInterpretation } from "./helpers/interpretation-diagnostics";

test.describe.configure({ retries: 0 });

test("a live-payment Restaurant request remains a business clarification", async ({
  page,
}) => {
  test.setTimeout(600_000);
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(process.env.FACTORY_E2E_FACTORY_PROJECT).toMatch(
    /^factory-t9-[a-z0-9-]+$/u,
  );
  const finishDiagnostics = observeInterpretation(page);
  let deliveryMutations = 0;
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const path = new URL(request.url()).pathname;
    if (
      /\/(?:published-revisions|compilations|verification-runs|preview-runs)$/u.test(
        path,
      ) ||
      /^\/product\/requirements(?:\/|$)/u.test(path)
    ) {
      deliveryMutations += 1;
    }
  });
  try {
    await page.goto("/");
    await page
      .getByLabel("Requirement brief")
      .fill(
        "Build a restaurant table-ordering app with live credit card payments. Customers must be charged real money through an external payment processor. Simulated payments do not meet this requirement.",
      );
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/requirements/interpret",
      { timeout: 570_000 },
    );
    void responsePromise.catch(() => undefined);
    const submittedAt = Date.now();
    await page.getByRole("button", { name: "Create product" }).click();
    const response = await responsePromise;
    expect(
      response.status(),
      "interpretation must return a usable clarification",
    ).toBe(200);
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeVisible();
    const questions = page.locator("ol.clarification-questions input");
    // Filter the inputs themselves; never record their labels or generated text.
    const integrationQuestionCount = await page
      .locator(
        'ol.clarification-questions input[data-clarification-category="integration"]',
      )
      .count();
    expect(integrationQuestionCount).toBeGreaterThan(0);
    expect(await questions.count()).toBeGreaterThan(0);
    await expect(
      page.getByRole("region", { name: "Restaurant delivery" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
    expect(deliveryMutations).toBe(0);
    console.info(
      "FACTORY_RESTAURANT_SELECTION_NEGATIVE_EVIDENCE",
      JSON.stringify({
        elapsedToClarificationMs: Date.now() - submittedAt,
        questionCount: await questions.count(),
        integrationQuestionCount,
        deliveryMutations,
      }),
    );
  } finally {
    await finishDiagnostics();
  }
});
