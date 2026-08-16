import {
  assertRequirementInterpretation,
  RequirementInterpreterError,
  type ClarificationAnswerContextV1,
  type RequirementInterpretationV1,
} from "@factory/adapters";

import {
  ANSWER_LIMIT,
  ANSWER_MAX_LENGTH,
  BRIEF_MAX_LENGTH,
} from "./journey-model";
import {
  ERROR_API_VERSION,
  REQUIREMENT_FAILURE_STATUSES,
  type RequirementInterpretationFailureCode,
} from "./interpret-contract";

/**
 * The bounded interpretation request envelope and its failure statuses.
 * Kept outside the route module so the route file carries only HTTP handlers
 * and the helpers stay unit-testable; the brief and answers are transient
 * input that never persists and never appears in any response.
 */

export interface InterpretPayload {
  readonly brief: string;
  readonly answers: Readonly<Record<string, string>>;
  readonly clarificationContext?: readonly ClarificationAnswerContextV1[];
  readonly priorInterpretation?: RequirementInterpretationV1;
}

const CLARIFICATION_CATEGORIES = new Set([
  "experience.visual-style",
  "authorization",
  "visibility",
  "role",
  "business-rule",
  "data",
  "integration",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The bounded request envelope: exactly `brief` and optional `answers`.
 * Anything else — unknown fields, non-string values, over-long answers, or
 * more answers than the journey allows — is rejected.
 */
export function parseInterpretPayload(value: unknown): InterpretPayload | null {
  if (!isPlainRecord(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.some(
      (key) =>
        key !== "brief" &&
        key !== "answers" &&
        key !== "clarificationContext" &&
        key !== "priorInterpretation",
    )
  )
    return null;
  const { brief, answers, clarificationContext, priorInterpretation } = value;
  if (typeof brief !== "string" || brief.trim().length === 0) return null;
  if (brief.length > BRIEF_MAX_LENGTH) return null;
  const answerRecord = answers === undefined ? {} : answers;
  if (!isPlainRecord(answerRecord)) return null;
  const entries = Object.entries(answerRecord);
  if (entries.length > ANSWER_LIMIT) return null;
  const validated: Record<string, string> = {};
  for (const [key, answer] of entries) {
    if (typeof answer !== "string" || answer.length > ANSWER_MAX_LENGTH) {
      return null;
    }
    if (key.length === 0) return null;
    validated[key] = answer;
  }
  let validatedPrior: RequirementInterpretationV1 | undefined;
  if (priorInterpretation !== undefined) {
    if (!isPlainRecord(priorInterpretation)) return null;
    if (
      Object.keys(priorInterpretation).some(
        (key) => !["spec", "blueprint", "clarifications"].includes(key),
      ) ||
      !Array.isArray(priorInterpretation.clarifications)
    )
      return null;
    try {
      validatedPrior = assertRequirementInterpretation({
        spec: priorInterpretation.spec,
        blueprint: priorInterpretation.blueprint,
        clarifications: priorInterpretation.clarifications,
      });
    } catch {
      return null;
    }
  }
  if (clarificationContext === undefined) {
    return {
      brief: brief.trim(),
      answers: validated,
      ...(validatedPrior === undefined
        ? {}
        : { priorInterpretation: validatedPrior }),
    };
  }
  if (
    !Array.isArray(clarificationContext) ||
    clarificationContext.length > ANSWER_LIMIT
  )
    return null;
  const seen = new Set<string>();
  const validatedContext: ClarificationAnswerContextV1[] = [];
  for (const candidate of clarificationContext) {
    if (!isPlainRecord(candidate)) return null;
    if (
      Object.keys(candidate).some(
        (key) =>
          !["key", "category", "defaultPolicy", "question", "answer"].includes(
            key,
          ),
      )
    )
      return null;
    const { key, category, defaultPolicy, question, answer } = candidate;
    if (
      typeof key !== "string" ||
      key.length === 0 ||
      seen.has(key) ||
      typeof category !== "string" ||
      !CLARIFICATION_CATEGORIES.has(category) ||
      (defaultPolicy !== "required" &&
        defaultPolicy !== "factory-standard-visual") ||
      (defaultPolicy === "factory-standard-visual" &&
        category !== "experience.visual-style") ||
      typeof question !== "string" ||
      question.trim().length === 0 ||
      question.length > 500 ||
      typeof answer !== "string" ||
      answer.length === 0 ||
      answer.length > ANSWER_MAX_LENGTH ||
      validated[key] !== answer
    )
      return null;
    seen.add(key);
    validatedContext.push({
      key,
      category: category as ClarificationAnswerContextV1["category"],
      defaultPolicy,
      question,
      answer,
    });
  }
  return {
    brief: brief.trim(),
    answers: validated,
    clarificationContext: validatedContext,
    ...(validatedPrior === undefined
      ? {}
      : { priorInterpretation: validatedPrior }),
  };
}

/**
 * Bounded failure statuses: the client sees a category, never provider
 * material or the brief.
 */
export function classifyInterpretationError(error: unknown): {
  status: number;
  body: {
    readonly error: {
      readonly apiVersion: typeof ERROR_API_VERSION;
      readonly code: RequirementInterpretationFailureCode;
    };
  };
} {
  const candidate =
    error instanceof RequirementInterpreterError
      ? `requirement.${error.code}`
      : "requirement.failed";
  const code = Object.prototype.hasOwnProperty.call(
    REQUIREMENT_FAILURE_STATUSES,
    candidate,
  )
    ? (candidate as RequirementInterpretationFailureCode)
    : "requirement.failed";
  return interpretationError(code);
}

export function interpretationError(
  code: RequirementInterpretationFailureCode,
): {
  readonly status: number;
  readonly body: {
    readonly error: {
      readonly apiVersion: typeof ERROR_API_VERSION;
      readonly code: RequirementInterpretationFailureCode;
    };
  };
} {
  return {
    status: REQUIREMENT_FAILURE_STATUSES[code],
    body: { error: { apiVersion: ERROR_API_VERSION, code } },
  };
}
