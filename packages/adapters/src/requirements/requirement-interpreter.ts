import {
  hashRequirementSpec,
  parseCompositionClarification,
  parseProductBlueprint,
  parseRequirementSpec,
  type CompositionClarificationV1,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";

import {
  factoryClarificationDefault,
  SAFE_NONCRITICAL_CLARIFICATION_DEFAULT,
} from "./clarification-policy.js";

export {
  factoryClarificationDefault,
  SAFE_NONCRITICAL_CLARIFICATION_DEFAULT,
} from "./clarification-policy.js";

/**
 * One transient interpretation of a free-form business brief: a validated
 * RequirementSpec, a constrained semantic ProductBlueprint bound to that
 * spec's exact checksum, and any unanswered clarification questions. The
 * brief itself never appears here and no adapter may persist it.
 */
export interface RequirementInterpretationV1 {
  readonly spec: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly clarifications: readonly CompositionClarificationV1[];
}

export type ClarificationQuestionV1 =
  CompositionClarificationV1["questions"][number];

/**
 * Transient context for one answered clarification. It gives a provider the
 * question semantics that an opaque stable key alone cannot communicate.
 * This envelope is request-only and must never be persisted or logged.
 */
export interface ClarificationAnswerContextV1 extends ClarificationQuestionV1 {
  readonly answer: string;
}

export interface RequirementInterpreterAdapterV1 {
  interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
    readonly clarificationContext?: readonly ClarificationAnswerContextV1[];
    /** Validated transient baseline for an incremental clarification pass. */
    readonly priorInterpretation?: RequirementInterpretationV1;
    /** Caller cancellation is transient and must reach the provider request. */
    readonly signal?: AbortSignal;
  }): Promise<RequirementInterpretationV1>;
}

export type RequirementInterpreterErrorCode =
  | "request_invalid"
  | "output_invalid"
  | "provider_rejected"
  | "provider_not_configured"
  | "provider_unavailable"
  | "timeout"
  | "failed";

export class RequirementInterpreterError extends Error {
  public constructor(
    message: string,
    public readonly code: RequirementInterpreterErrorCode = "output_invalid",
  ) {
    super(message);
    this.name = "RequirementInterpreterError";
  }
}

const QUESTION_STOP_WORDS = new Set(["a", "an", "of", "the", "what", "which"]);

function questionTokens(question: string): readonly string[] {
  const normalized = question
    .normalize("NFKD")
    .toLowerCase()
    .replace(/what\s+number\s+of|how\s+many/g, "count")
    .replace(/approvals?|approved|approving/g, "approve")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return [
    ...new Set(
      normalized
        .split(/\s+/)
        .filter((token) => token.length > 0 && !QUESTION_STOP_WORDS.has(token))
        .map((token) =>
          token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token,
        ),
    ),
  ].sort();
}

/**
 * Deterministic semantic identity for a provider that rephrases an already
 * answered clarification. This deliberately has no fuzzy fallback: one
 * extra actor, negation, protected action, or resource makes the identities
 * different and therefore cannot inherit an authorization-sensitive answer.
 */
export function clarificationQuestionsMatch(
  left: string,
  right: string,
): boolean {
  const leftTokens = questionTokens(left);
  const rightTokens = questionTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  return leftTokens.join("|") === rightTokens.join("|");
}

/**
 * Resolves one bounded follow-up interpretation without another provider
 * call. Answers to stable keys or exact normalized repeated questions are
 * carried to the provider's new key. Only explicitly visual, noncritical
 * ambiguity receives a safe platform default; every other novel question
 * remains open for the journey's critical-ambiguity gate.
 */
export function resolveClarificationCycle(input: {
  readonly interpretation: RequirementInterpretationV1;
  readonly priorQuestions: readonly ClarificationQuestionV1[];
  readonly answers: Readonly<Record<string, string>>;
  readonly applySafeDefaults: boolean;
}): {
  readonly interpretation: RequirementInterpretationV1;
  readonly answers: Readonly<Record<string, string>>;
  readonly unresolved: readonly ClarificationQuestionV1[];
} {
  const answers = { ...input.answers };
  const currentQuestions = input.interpretation.clarifications.flatMap(
    (clarification) => clarification.questions,
  );
  const resolvedByQuestion = new Map<string, string>();

  for (const current of currentQuestions) {
    let answer: string | undefined = answers[current.key]?.trim();
    if (!answer) {
      const repeated = input.priorQuestions.find(
        (prior) =>
          Boolean(answers[prior.key]?.trim()) &&
          clarificationQuestionsMatch(prior.question, current.question),
      );
      if (repeated !== undefined) answer = answers[repeated.key]?.trim();
    }
    if (!answer && input.applySafeDefaults) {
      answer = factoryClarificationDefault(current) ?? undefined;
    }
    if (!answer) continue;
    answers[current.key] = answer;
    resolvedByQuestion.set(current.question, answer);
  }

  const spec = {
    ...input.interpretation.spec,
    openQuestions: input.interpretation.spec.openQuestions.map((item) => {
      if (item.answer !== undefined) return item;
      const resolved = [...resolvedByQuestion.entries()].find(([question]) =>
        clarificationQuestionsMatch(question, item.question),
      )?.[1];
      return resolved === undefined ? item : { ...item, answer: resolved };
    }),
  };
  const requirementChecksum = hashRequirementSpec(spec);
  const clarifications = input.interpretation.clarifications
    .map((clarification) => ({
      ...clarification,
      requirementChecksum,
      questions: clarification.questions.filter(
        (question) => !resolvedByQuestion.has(question.question),
      ),
    }))
    .filter((clarification) => clarification.questions.length > 0);
  const interpretation = assertRequirementInterpretation({
    spec,
    blueprint: {
      ...input.interpretation.blueprint,
      requirementChecksum,
    },
    clarifications,
  });
  return {
    interpretation,
    answers,
    unresolved: interpretation.clarifications.flatMap(
      (clarification) => clarification.questions,
    ),
  };
}

/**
 * Authoritative re-validation shared by every interpreter: the spec and
 * blueprint must be schema-valid, the blueprint must bind the exact
 * requirement checksum, and every clarification record must bind the same
 * checksum. Adapters may never construct an interpretation that skips this.
 */
export function assertRequirementInterpretation(input: {
  readonly spec: unknown;
  readonly blueprint: unknown;
  readonly clarifications: readonly CompositionClarificationV1[];
}): RequirementInterpretationV1 {
  const parse = <T>(work: () => T): T => {
    try {
      return work();
    } catch (error) {
      if (error instanceof RequirementInterpreterError) throw error;
      throw new RequirementInterpreterError(
        "Requirement interpretation output was invalid.",
        "output_invalid",
      );
    }
  };
  const spec = parse(() => parseRequirementSpec(input.spec));
  const blueprint = parse(() => parseProductBlueprint(input.blueprint));
  const checksum = hashRequirementSpec(spec);
  if (blueprint.requirementChecksum !== checksum) {
    throw new RequirementInterpreterError(
      "Requirement interpretation output was invalid.",
      "output_invalid",
    );
  }
  const clarifications = input.clarifications.map((clarification) => {
    const parsed = parse(() => parseCompositionClarification(clarification));
    if (parsed.requirementChecksum !== checksum) {
      throw new RequirementInterpreterError(
        "Requirement interpretation output was invalid.",
        "output_invalid",
      );
    }
    return parsed;
  });
  return { spec, blueprint, clarifications };
}

function slugify(question: string, index: number): string {
  const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? `q-${slug}` : `q-${index + 1}`;
}

/**
 * Projects unanswered open questions of a validated spec into a bounded
 * clarification record bound to the spec's checksum. Answer keys are
 * deterministic slugs of the question text, stable across interpretations of
 * the same spec.
 */
export function deriveClarifications(
  spec: RequirementSpecV1,
): readonly CompositionClarificationV1[] {
  const unanswered = spec.openQuestions
    .filter((question) => question.answer === undefined)
    .map((question, index) => ({
      key: slugify(question.question, index),
      category: question.category,
      defaultPolicy:
        question.category === "experience.visual-style"
          ? ("factory-standard-visual" as const)
          : ("required" as const),
      question: question.question,
    }))
    .filter((item) => item.question.length > 0);
  if (unanswered.length === 0) return [];
  const seen = new Set<string>();
  const questions = unanswered.map((item) => {
    let key = item.key;
    let suffix = 2;
    while (seen.has(key)) {
      key = `${item.key}-${suffix}`;
      suffix += 1;
    }
    seen.add(key);
    return { ...item, key };
  });
  return [
    {
      apiVersion: "factory.composition-clarification/v1",
      requirementChecksum: hashRequirementSpec(spec),
      questions,
    },
  ];
}
