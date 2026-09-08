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
    const questionCount = await questions.count();
    const questionCategories = await questions.evaluateAll((inputs) => {
      const allowed = new Set([
        "authorization",
        "visibility",
        "role",
        "business-rule",
        "data",
        "integration",
        "experience.visual-style",
      ]);
      return inputs.map((input) => {
        const category = input.getAttribute("data-clarification-category");
        return category !== null && allowed.has(category)
          ? category
          : "unknown";
      });
    });
    console.info(
      "FACTORY_RESTAURANT_SELECTION_NEGATIVE_EVIDENCE",
      JSON.stringify({
        elapsedToClarificationMs: Date.now() - submittedAt,
        questionCount,
        questionCategories,
        integrationQuestionCount,
        deliveryMutations,
      }),
    );
    // This authored brief has one unsupported capability. Other canonical
    // decisions are omitted and must not be reopened as unrelated questions.
    expect(integrationQuestionCount).toBe(1);
    expect(questionCount).toBe(1);
    await expect(
      page.getByRole("region", { name: "Restaurant delivery" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open local app" }),
    ).toHaveCount(0);
    expect(deliveryMutations).toBe(0);
  } finally {
    await page.close().catch(() => undefined);
    await finishDiagnostics();
  }
});
