import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type PreviewRun = {
  readonly apiPort: number | null;
  readonly id: string;
  readonly compilationId: string;
  readonly previewUrl: string | null;
  readonly status: string;
};

const controlPlaneBaseUrl = process.env.FACTORY_E2E_CONTROL_PLANE_URL;
export const interpretationTimeoutMs = 570_000;
export const lifecycleTimeoutMs = 1_800_000;
export const postResponseUiTimeoutMs = 30_000;
export const allowedQuestionCategories = new Set([
  "authorization",
  "business-rule",
  "data",
  "experience.visual-style",
  "integration",
  "role",
  "visibility",
]);
const allowedFailurePhases = new Set([
  "interpretation",
  "clarification",
  "review",
  "planning",
  "decision",
  "apply",
]);
const allowedFailureCodes = new Set([
  "requirement.request_invalid",
  "requirement.output_invalid",
  "requirement.provider_rejected",
  "requirement.provider_not_configured",
  "requirement.provider_unavailable",
  "requirement.timeout",
  "requirement.failed",
  "journey.interpretation_cycle_bound",
  "journey.clarification_exhausted",
  "composition.request_envelope_invalid",
  "composition.request_identity_invalid",
  "composition.requirement_invalid",
  "composition.blueprint_invalid",
  "composition.requirement_blueprint_checksum_mismatch",
  "product.review_timeout",
  "product.review_reconciliation_timeout",
  "product.planning_timeout",
  "product.planning_reconciliation_timeout",
  "product.not_found",
  "product.conflict",
  "product.unavailable",
  "product.failed",
]);

export function controlPlaneUrl(path: string): string {
  if (!controlPlaneBaseUrl) {
    throw new Error("FACTORY_E2E_CONTROL_PLANE_URL is required.");
  }
  return new URL(path, `${controlPlaneBaseUrl}/`).toString();
}

export function stringAt(
  value: unknown,
  keys: readonly string[],
): string | null {
  let current: unknown = value;
  for (const key of keys) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current) ||
      !(key in current)
    ) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

export function arrayLengthAt(
  value: unknown,
  keys: readonly string[],
): number | null {
  let current: unknown = value;
  for (const key of keys) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current) ||
      !(key in current)
    ) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return Array.isArray(current) ? current.length : null;
}

export function assertIsolatedProviderRun(): void {
  expect(process.env.FACTORY_E2E_ISOLATED).toBe("1");
  expect(process.env.FACTORY_E2E_FACTORY_PROJECT).toMatch(
    /^factory-t9-[a-z0-9-]+$/u,
  );
  expect(process.env.FACTORY_FIXTURE_MODE).toBe("");
}

export async function currentPreview(
  request: APIRequestContext,
  compilationId: string,
): Promise<PreviewRun | null> {
  const response = await request.get(
    controlPlaneUrl(
      `/compilations/${encodeURIComponent(compilationId)}/preview-runs/current`,
    ),
  );
  if (!response.ok()) return null;
  const payload = await response.text();
  if (!payload.trim()) return null;
  const body = JSON.parse(payload) as Partial<PreviewRun>;
  if (
    typeof body.id !== "string" ||
    typeof body.compilationId !== "string" ||
    typeof body.status !== "string" ||
    (body.apiPort !== null && typeof body.apiPort !== "number") ||
    (body.previewUrl !== null && typeof body.previewUrl !== "string")
  ) {
    return null;
  }
  return body as PreviewRun;
}

export async function stopPreview(
  request: APIRequestContext,
  compilationId: string,
  previewRunId: string,
): Promise<void> {
  const stopped = await request.post(
    controlPlaneUrl(`/preview-runs/${encodeURIComponent(previewRunId)}/stop`),
    { data: {} },
  );
  expect(stopped.ok(), "exact preview stop request").toBeTruthy();
  await expect
    .poll(async () => (await currentPreview(request, compilationId))?.status, {
      timeout: 120_000,
    })
    .toBe("stopped");
}

export type DirectRestaurantOutcome =
  "clarification" | "delivery" | "failed" | "manual-review" | "paused";

export type ProductCreationDiagnostic = {
  readonly failureCode: string;
  readonly failurePhase: string;
  readonly journeyOutcome: "failed" | "unknown";
  readonly requirementOutcome: "accepted" | "failed" | "unknown";
};

export type DirectRestaurantObservation = {
  readonly failureCode: string;
  readonly failurePhase: string;
  readonly journeyOutcome: "failed" | "unknown";
  readonly outcome: DirectRestaurantOutcome;
  readonly questionCategories: readonly string[];
  readonly questionCount: number;
  readonly requirementOutcome: string;
};

export async function readProductCreationDiagnostic(
  page: Page,
): Promise<ProductCreationDiagnostic> {
  const [raw] = await page
    .locator('section[aria-label="Product creation"]')
    .evaluateAll((elements) => {
      const productCreation = elements[0];
      if (productCreation === undefined) return [];
      return [
        {
          failureCode: productCreation.getAttribute(
            "data-journey-failure-code",
          ),
          failurePhase: productCreation.getAttribute(
            "data-journey-failure-phase",
          ),
          journeyOutcome: productCreation.getAttribute("data-journey-outcome"),
          requirementOutcome: productCreation.getAttribute(
            "data-requirement-outcome",
          ),
        },
      ];
    });
  return {
    failureCode:
      raw?.failureCode !== null && allowedFailureCodes.has(raw?.failureCode)
        ? raw.failureCode
        : "unknown",
    failurePhase:
      raw?.failurePhase !== null && allowedFailurePhases.has(raw?.failurePhase)
        ? raw.failurePhase
        : "unknown",
    journeyOutcome: raw?.journeyOutcome === "failed" ? "failed" : "unknown",
    requirementOutcome:
      raw?.requirementOutcome === "accepted" ||
      raw?.requirementOutcome === "failed"
        ? raw.requirementOutcome
        : "unknown",
  };
}

export async function hasManualReview(page: Page): Promise<boolean> {
  return (
    (await page
      .getByRole("region", { name: "Review the product plan" })
      .isVisible()) ||
    (await page
      .getByRole("region", { name: "Review the approved plan Diff" })
      .isVisible()) ||
    (await page.getByRole("button", { name: /^Choose /u }).isVisible()) ||
    (await page.getByRole("button", { name: "Apply to Draft" }).isVisible())
  );
}

export async function observeDirectRestaurantOutcome(
  page: Page,
): Promise<DirectRestaurantObservation> {
  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  const clarification = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  const deliveryStatus = delivery.getByRole("status");
  let outcome: DirectRestaurantOutcome | "pending" = "pending";
  await expect
    .poll(
      async () => {
        const productCreation = await readProductCreationDiagnostic(page);
        if (
          productCreation.requirementOutcome === "failed" ||
          productCreation.journeyOutcome === "failed"
        ) {
          outcome = "failed";
        } else if (await hasManualReview(page)) {
          outcome = "manual-review";
        } else if (await delivery.isVisible()) {
          outcome = (await deliveryStatus.textContent())?.startsWith(
            "Delivery paused",
          )
            ? "paused"
            : "delivery";
        } else if (await clarification.isVisible()) outcome = "clarification";
        return outcome;
      },
      { timeout: postResponseUiTimeoutMs },
    )
    .not.toBe("pending");
  if (outcome === "pending") {
    throw new Error("Restaurant delivery outcome was unavailable.");
  }
  const questions = page.locator("ol.clarification-questions input");
  const questionCategories = await questions.evaluateAll(
    (inputs, allowed) =>
      inputs.map((input) => {
        const category = input.getAttribute("data-clarification-category");
        return category !== null && allowed.includes(category)
          ? category
          : "unknown";
      }),
    [...allowedQuestionCategories],
  );
  const productCreation = await readProductCreationDiagnostic(page);
  return {
    failureCode: productCreation.failureCode,
    failurePhase: productCreation.failurePhase,
    journeyOutcome: productCreation.journeyOutcome,
    outcome,
    questionCategories,
    questionCount: questionCategories.length,
    requirementOutcome: productCreation.requirementOutcome,
  };
}

export async function deliveryFailureMarker(
  page: Page,
): Promise<"failed" | "paused" | null> {
  const productCreation = await readProductCreationDiagnostic(page);
  if (
    productCreation.requirementOutcome === "failed" ||
    productCreation.journeyOutcome === "failed"
  ) {
    return "failed";
  }
  const delivery = page.getByRole("region", { name: "Restaurant delivery" });
  if (
    (await delivery.isVisible()) &&
    (await delivery.getByRole("status").textContent())?.startsWith(
      "Delivery paused",
    )
  ) {
    return "paused";
  }
  return null;
}

export type PhaseMarker = false | true | "failed" | "paused";

export async function expectCompletedPhase(
  page: Page,
  observe: () => Promise<PhaseMarker>,
  timeout: number,
): Promise<void> {
  let marker: PhaseMarker = false;
  await expect
    .poll(
      async () => {
        marker = (await deliveryFailureMarker(page)) ?? (await observe());
        return marker;
      },
      { timeout },
    )
    .not.toBe(false);
  expect(marker === true).toBe(true);
}
