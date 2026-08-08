import { RequirementInterpreterError } from "@factory/adapters";

import {
  ANSWER_LIMIT,
  ANSWER_MAX_LENGTH,
  BRIEF_MAX_LENGTH,
} from "./journey-model";

/**
 * The bounded interpretation request envelope and its failure statuses.
 * Kept outside the route module so the route file carries only HTTP handlers
 * and the helpers stay unit-testable; the brief and answers are transient
 * input that never persists and never appears in any response.
 */

export interface InterpretPayload {
  readonly brief: string;
  readonly answers: Readonly<Record<string, string>>;
}

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
  if (keys.some((key) => key !== "brief" && key !== "answers")) return null;
  const { brief, answers } = value;
  if (typeof brief !== "string" || brief.trim().length === 0) return null;
  if (brief.length > BRIEF_MAX_LENGTH) return null;
  if (answers === undefined) return { brief: brief.trim(), answers: {} };
  if (!isPlainRecord(answers)) return null;
  const entries = Object.entries(answers);
  if (entries.length > ANSWER_LIMIT) return null;
  const validated: Record<string, string> = {};
  for (const [key, answer] of entries) {
    if (typeof answer !== "string" || answer.length > ANSWER_MAX_LENGTH) {
      return null;
    }
    if (key.length === 0) return null;
    validated[key] = answer;
  }
  return { brief: brief.trim(), answers: validated };
}

/**
 * Bounded failure statuses: the client sees a category, never provider
 * material or the brief.
 */
export function classifyInterpretationError(error: unknown): {
  status: number;
  error: string;
} {
  if (!(error instanceof RequirementInterpreterError)) {
    return { status: 500, error: "Requirement interpretation failed." };
  }
  switch (error.code) {
    case "brief_invalid":
      return { status: 400, error: error.message };
    case "configuration_missing":
    case "model_unavailable":
    case "provider_rate_limited":
      return { status: 503, error: error.message };
    default:
      return { status: 502, error: error.message };
  }
}
