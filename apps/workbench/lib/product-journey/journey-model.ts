import type { RequirementInterpretationV1 } from "@factory/adapters";
import type { ProductPlanAlternative } from "@factory/capabilities/node";
import type { CompositionPlanV1 } from "@factory/graph";

/**
 * The product creation journey state machine. The free-form brief is
 * transient input held only in this in-memory state; the persisted boundary
 * receives only the schema-valid RequirementSpec and its checksum-bound
 * ProductBlueprint via `createRequirementInput`. Every transition is pure and
 * guarded: a step cannot happen before its prerequisite, an unknown plan
 * alternative is refused, and failures close the journey with a bounded
 * message. Nothing here talks to a network or a store.
 */

export type ProductJourneyStage =
  "brief" | "clarifying" | "planning" | "reviewing" | "applied" | "failed";

export const BRIEF_MAX_LENGTH = 12_000;
export const ANSWER_MAX_LENGTH = 64;
export const ANSWER_LIMIT = 30;

export interface ProductJourneyReview {
  readonly id: string;
  readonly applicationGraphId: string;
  readonly status: string;
  readonly requirementChecksum: string;
  readonly draftBaseChecksum: string;
}

export interface ProductJourneyState {
  readonly kind: "product-journey";
  readonly stage: ProductJourneyStage;
  /** Transient business brief. Never persisted, logged, or reported. */
  readonly brief: string;
  readonly answers: Readonly<Record<string, string>>;
  readonly interpretation: RequirementInterpretationV1 | null;
  readonly review: ProductJourneyReview | null;
  readonly alternatives: readonly ProductPlanAlternative[] | null;
  readonly selectedAlternativeKey: string | null;
  readonly diffChecksum: string | null;
  readonly error: string | null;
}

export type ProductJourneyAction =
  | { type: "submit-brief"; brief: string }
  | {
      type: "interpretation-accepted";
      interpretation: RequirementInterpretationV1;
    }
  | { type: "clarify-answered"; answers: Readonly<Record<string, string>> }
  | { type: "review-created"; review: ProductJourneyReview }
  | {
      type: "alternatives-received";
      alternatives: readonly ProductPlanAlternative[];
    }
  | { type: "alternative-chosen"; key: string; diffChecksum: string }
  | { type: "applied" }
  | { type: "fail"; error: string }
  | { type: "reset" };

export function beginProductJourney(): ProductJourneyState {
  return {
    kind: "product-journey",
    stage: "brief",
    brief: "",
    answers: {},
    interpretation: null,
    review: null,
    alternatives: null,
    selectedAlternativeKey: null,
    diffChecksum: null,
    error: null,
  };
}

function requireInterpretation(
  state: ProductJourneyState,
): RequirementInterpretationV1 {
  if (state.interpretation === null) {
    throw new Error(
      "Interpret the requirement before creating a product review.",
    );
  }
  return state.interpretation;
}

function requireReview(state: ProductJourneyState): ProductJourneyReview {
  if (state.review === null) {
    throw new Error("Create the product review before planning.");
  }
  return state.review;
}

export function journeyTransition(
  state: ProductJourneyState,
  action: ProductJourneyAction,
): ProductJourneyState {
  switch (action.type) {
    case "submit-brief": {
      const brief = action.brief.trim();
      if (brief.length === 0) {
        throw new Error("The requirement brief must be non-empty prose.");
      }
      if (brief.length > BRIEF_MAX_LENGTH) {
        throw new Error(
          `The requirement brief must be at most ${BRIEF_MAX_LENGTH} characters.`,
        );
      }
      if (state.stage !== "brief" && state.stage !== "failed") {
        throw new Error("The requirement is already being created.");
      }
      return {
        ...beginProductJourney(),
        brief,
      };
    }
    case "interpretation-accepted": {
      if (state.stage !== "brief" && state.stage !== "clarifying") {
        throw new Error("Interpret the requirement from the brief stage.");
      }
      return {
        ...state,
        interpretation: action.interpretation,
        stage:
          action.interpretation.clarifications.length > 0
            ? "clarifying"
            : "planning",
        error: null,
      };
    }
    case "clarify-answered": {
      if (state.stage !== "clarifying") {
        throw new Error("Answer clarification questions when asked.");
      }
      const keys = Object.keys(action.answers);
      if (keys.length > ANSWER_LIMIT) {
        throw new Error(
          `Clarification answers are limited to ${ANSWER_LIMIT}.`,
        );
      }
      for (const value of Object.values(action.answers)) {
        if (value.length > ANSWER_MAX_LENGTH) {
          throw new Error(
            `Clarification answers are limited to ${ANSWER_MAX_LENGTH} characters.`,
          );
        }
      }
      return { ...state, answers: { ...action.answers } };
    }
    case "review-created": {
      const interpretation = requireInterpretation(state);
      if (
        action.review.requirementChecksum !==
        interpretation.blueprint.requirementChecksum
      ) {
        throw new Error(
          "The product review must bind the exact requirement checksum.",
        );
      }
      return { ...state, review: action.review };
    }
    case "alternatives-received": {
      requireInterpretation(state);
      requireReview(state);
      return { ...state, alternatives: action.alternatives };
    }
    case "alternative-chosen": {
      requireReview(state);
      if (state.alternatives === null) {
        throw new Error("Plan alternatives have not been produced.");
      }
      if (state.selectedAlternativeKey !== null) {
        throw new Error(
          "The plan decision is already accepted; start over to re-choose.",
        );
      }
      if (
        !state.alternatives.some(
          (alternative) => alternative.key === action.key,
        )
      ) {
        throw new Error(
          `Alternative '${action.key}' is not part of the plan surface.`,
        );
      }
      return {
        ...state,
        stage: "reviewing",
        selectedAlternativeKey: action.key,
        diffChecksum: action.diffChecksum,
      };
    }
    case "applied": {
      if (state.stage !== "reviewing") {
        throw new Error("Accept the plan Diff before applying it.");
      }
      return { ...state, stage: "applied" };
    }
    case "fail": {
      if (state.stage === "applied") {
        throw new Error("The product is already applied to the Draft.");
      }
      return { ...state, stage: "failed", error: action.error };
    }
    case "reset": {
      if (
        state.stage !== "brief" &&
        state.stage !== "applied" &&
        state.stage !== "failed"
      ) {
        throw new Error(
          "Cancel the in-flight requirement before starting a new product.",
        );
      }
      return beginProductJourney();
    }
  }
}

/** The open clarification questions of the current interpretation, if any. */
export function openClarificationQuestions(
  state: ProductJourneyState,
): readonly { key: string; question: string }[] {
  return (
    state.interpretation?.clarifications.flatMap(
      (clarification) => clarification.questions,
    ) ?? []
  );
}

/** A bounded comparison summary of one plan alternative (no raw plan fields). */
export function planAlternativeSummary(plan: CompositionPlanV1) {
  return {
    planId: plan.planId,
    capabilityLocks: plan.capabilityLocks.map(({ key, version }) => ({
      key,
      version,
    })),
    operations: plan.proposedOperations.length,
    complexity: plan.complexity,
    acceptanceJourneys: plan.acceptanceJourneys.length,
  };
}

/**
 * The exact persisted requirement boundary: only the validated spec and its
 * checksum-bound blueprint. The brief and answers never cross this boundary.
 */
export function createRequirementInput(state: ProductJourneyState): {
  requirement: RequirementInterpretationV1["spec"];
  blueprint: RequirementInterpretationV1["blueprint"];
} {
  const interpretation = requireInterpretation(state);
  return {
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
  };
}
