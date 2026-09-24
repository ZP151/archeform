import { expect, test } from "@playwright/test";
import { OpenAIRequirementInterpreterAdapter } from "@factory/adapters";
import {
  approvalInterpretationFixture,
  installConsumerGenerationFixture,
} from "../apps/workbench/test/consumer-generation-fixture";

// Authored, provider-free route evidence for the real Home, hook and parser.
// This case proves context retention and explicit recovery, not model quality.
const brief =
  "Build an expense approval app with private requester records and external identity.";
const privateAnswer = "Private requester records remain required.";
const identityAnswer = "External identity remains required.";
const acceptPrivate =
  "I accept shared local records instead of private requester records.";
const acceptIdentity =
  "I accept selectable demo roles instead of external identity.";
const refusal = {
  error: {
    apiVersion: "factory.requirement-interpretation-error/v2",
    code: "requirement.definition_scope_unresolved",
  },
};

async function priorFixture() {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "authored-fixture-only",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: "expense-approval",
              requirementId: "expense-approval-requirement",
              title: "Expense Approval",
              outcome:
                "Employees submit expenses and managers decide them; finance audits decisions.",
              disposition: "needs-clarification",
              materialQuestions: [
                {
                  category: "visibility",
                  question:
                    "Do you require private requester records instead of shared local records?",
                },
                {
                  category: "integration",
                  question:
                    "Do you require external identity instead of selectable demo roles?",
                },
              ],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({ brief, answers: {} });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`retains independent requirements through explicit recovery at ${viewport.width}px`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const started = Date.now();
    const origin = new URL(baseURL!).origin;
    let unhandledRequests = 0;
    // Fixture routes registered below take precedence. No unknown backend or
    // provider request is permitted to reach a local service or the network.
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname.startsWith("/api/")) {
        unhandledRequests += 1;
        await route.abort();
        return;
      }
      await route.continue();
    });
    const lifecycle = await installConsumerGenerationFixture(page, {
      family: "approval",
      holdChoice: true,
    });
    const prior = await priorFixture();
    const supported = await approvalInterpretationFixture();
    const questions = prior.interpretation.clarifications.flatMap(
      ({ questions }) => questions,
    );
    const [privacy, identity] = questions;
    let interpretationRequests = 0;
    let refusedRequests = 0;
    await page.route("**/api/requirements/interpret", async (route) => {
      interpretationRequests += 1;
      const body = route.request().postDataJSON();
      expect(body.brief).toBe(brief);
      if (interpretationRequests === 1) {
        expect(body.answers).toEqual({});
        expect(body.priorInterpretation).toBeUndefined();
        await route.fulfill({ json: prior });
        return;
      }
      expect(body.priorInterpretation).toEqual(prior);
      const expectedAnswers = {
        [privacy!.key]:
          interpretationRequests === 2 ? privateAnswer : acceptPrivate,
        [identity!.key]:
          interpretationRequests < 4 ? identityAnswer : acceptIdentity,
      };
      expect(body.answers).toEqual(expectedAnswers);
      expect(body.clarificationContext).toEqual(
        questions.map((question) => ({
          ...question,
          answer: expectedAnswers[question.key],
        })),
      );
      if (
        body.answers[privacy!.key] !== acceptPrivate ||
        body.answers[identity!.key] !== acceptIdentity
      ) {
        refusedRequests += 1;
        await route.fulfill({ status: 422, json: refusal });
        return;
      }
      await route.fulfill({ json: supported });
    });
    await page.goto("/");
    const product = page.getByRole("region", {
      name: "Product creation",
      exact: true,
    });
    await product
      .getByRole("textbox", { name: "Requirement brief" })
      .fill(brief);
    await product
      .getByRole("button", { name: "Create product", exact: true })
      .click();
    await product
      .getByRole("textbox", { name: privacy!.key, exact: true })
      .fill(privateAnswer);
    await product
      .getByRole("textbox", { name: identity!.key, exact: true })
      .fill(identityAnswer);
    await product
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    const recovery = product.getByRole("region", {
      name: "Revise unresolved requirement",
      exact: true,
    });
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole("alert")).toContainText(
      "No app has been created.",
    );
    await expect(
      recovery.getByRole("heading", { name: "Previous questions and answers" }),
    ).toBeVisible();
    await expect(recovery).toContainText(`Submitted answer: ${privateAnswer}`);
    await expect(recovery).toContainText(`Submitted answer: ${identityAnswer}`);
    const revise = recovery.getByRole("button", {
      name: "Start revised request",
      exact: true,
    });
    await expect(revise).toHaveCount(1);
    await expect(revise).toBeDisabled();
    await expect(
      product.getByRole("button", { name: "Create product", exact: true }),
    ).toHaveCount(0);
    expect(lifecycle.requests).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`recovery-${viewport.width}.png`),
      fullPage: true,
    });
    await recovery
      .getByRole("textbox", { name: privacy!.key, exact: true })
      .fill(acceptPrivate);
    await expect(recovery).toContainText(`Submitted answer: ${privateAnswer}`);
    await revise.focus();
    await expect(revise).toBeFocused();
    await revise.press("Enter");
    await expect(revise).toBeDisabled();
    await expect(recovery.getByRole("alert")).toContainText(
      "No app has been created.",
    );
    await expect(recovery).toContainText(`Submitted answer: ${acceptPrivate}`);
    await expect(
      recovery.getByRole("textbox", { name: identity!.key, exact: true }),
    ).toHaveValue(identityAnswer);
    expect(interpretationRequests).toBe(3);
    expect(refusedRequests).toBe(2);
    expect(lifecycle.requests).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(
        `independent-need-retained-${viewport.width}.png`,
      ),
      fullPage: true,
    });
    await recovery
      .getByRole("textbox", { name: identity!.key, exact: true })
      .fill(acceptIdentity);
    await revise.click();
    await expect.poll(() => lifecycle.requests.includes("plan")).toBe(true);
    expect(interpretationRequests).toBe(4);
    expect(unhandledRequests).toBe(0);
    expect(lifecycle.pageErrors).toEqual([]);
    await testInfo.attach("bounded-recovery-measurements", {
      contentType: "application/json",
      body: JSON.stringify({
        providerFree: true,
        viewport,
        questions: questions.length,
        pointerClicks: 3,
        keyboardSubmissions: 1,
        interpretationRequests,
        refusedRequests,
        explicitRevisions: 2,
        lifecycleCallsWhileUnresolved: 0,
        planningResumed: lifecycle.requests.includes("plan"),
        elapsedMs: Date.now() - started,
      }),
    });
  });
}
