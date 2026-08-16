import {
  assertRequirementInterpretation,
  type RequirementInterpretationV1,
} from "@factory/adapters/requirements/browser";

export type RequirementInterpretationFailureCode =
  | "requirement.request_invalid"
  | "requirement.output_invalid"
  | "requirement.provider_rejected"
  | "requirement.provider_not_configured"
  | "requirement.provider_unavailable"
  | "requirement.timeout"
  | "requirement.failed";

export type ProductJourneyFailurePhase =
  | "interpretation"
  | "clarification"
  | "review"
  | "planning"
  | "decision"
  | "apply";

export type ProductJourneyFailureCode =
  | RequirementInterpretationFailureCode
  | "journey.interpretation_cycle_bound"
  | "journey.clarification_exhausted"
  | "composition.request_envelope_invalid"
  | "composition.request_identity_invalid"
  | "composition.requirement_invalid"
  | "composition.blueprint_invalid"
  | "composition.requirement_blueprint_checksum_mismatch"
  | "product.review_timeout"
  | "product.review_reconciliation_timeout"
  | "product.planning_timeout"
  | "product.planning_reconciliation_timeout"
  | "product.not_found"
  | "product.conflict"
  | "product.unavailable"
  | "product.failed";

export interface ProductJourneyFailure {
  readonly phase: ProductJourneyFailurePhase;
  readonly code: ProductJourneyFailureCode;
  readonly message: string;
}

const ERROR_API_VERSION =
  "factory.requirement-interpretation-error/v1" as const;

const REQUIREMENT_FAILURE_STATUSES: Readonly<
  Record<RequirementInterpretationFailureCode, number>
> = {
  "requirement.request_invalid": 400,
  "requirement.output_invalid": 422,
  "requirement.provider_rejected": 502,
  "requirement.provider_not_configured": 503,
  "requirement.provider_unavailable": 503,
  "requirement.timeout": 504,
  "requirement.failed": 500,
};

const REQUIREMENT_FAILURE_MESSAGES: Readonly<
  Record<RequirementInterpretationFailureCode, string>
> = {
  "requirement.request_invalid": "Check the requirement and try again.",
  "requirement.output_invalid": "Requirement interpretation was rejected.",
  "requirement.provider_rejected":
    "Requirement interpretation could not start.",
  "requirement.provider_not_configured":
    "Requirement interpretation is not configured.",
  "requirement.provider_unavailable":
    "Requirement interpretation is temporarily unavailable.",
  "requirement.timeout": "Requirement interpretation timed out.",
  "requirement.failed": "Requirement interpretation failed.",
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isRequirementFailureCode(
  value: unknown,
): value is RequirementInterpretationFailureCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(REQUIREMENT_FAILURE_STATUSES, value)
  );
}

export function requirementFailure(
  phase: "interpretation" | "clarification",
  code: RequirementInterpretationFailureCode,
): ProductJourneyFailure {
  return {
    phase,
    code,
    message:
      phase === "clarification" && code === "requirement.timeout"
        ? "Requirement clarification timed out."
        : REQUIREMENT_FAILURE_MESSAGES[code],
  };
}

export function productJourneyFailure(
  phase: ProductJourneyFailurePhase,
  code: ProductJourneyFailureCode,
  message: string,
): ProductJourneyFailure {
  return { phase, code, message };
}

export type ParsedInterpretationResponse =
  | {
      readonly ok: true;
      readonly interpretation: RequirementInterpretationV1;
    }
  | { readonly ok: false; readonly failure: ProductJourneyFailure };

export function parseInterpretationResponse(
  status: number,
  body: unknown,
  phase: "interpretation" | "clarification",
): ParsedInterpretationResponse {
  if (status === 200) {
    if (!isPlainRecord(body) || !hasExactKeys(body, ["interpretation"])) {
      return {
        ok: false,
        failure: requirementFailure(phase, "requirement.failed"),
      };
    }
    try {
      const candidate = body.interpretation;
      if (
        !isPlainRecord(candidate) ||
        !hasExactKeys(candidate, ["spec", "blueprint", "clarifications"]) ||
        !Array.isArray(candidate.clarifications)
      ) {
        throw new Error("Invalid interpretation envelope.");
      }
      return {
        ok: true,
        interpretation: assertRequirementInterpretation({
          spec: candidate.spec,
          blueprint: candidate.blueprint,
          clarifications: candidate.clarifications,
        }),
      };
    } catch {
      return {
        ok: false,
        failure: requirementFailure(phase, "requirement.failed"),
      };
    }
  }

  if (!isPlainRecord(body) || !hasExactKeys(body, ["error"])) {
    return {
      ok: false,
      failure: requirementFailure(phase, "requirement.failed"),
    };
  }
  const error = body.error;
  if (
    !isPlainRecord(error) ||
    !hasExactKeys(error, ["apiVersion", "code"]) ||
    error.apiVersion !== ERROR_API_VERSION ||
    !isRequirementFailureCode(error.code) ||
    REQUIREMENT_FAILURE_STATUSES[error.code] !== status
  ) {
    return {
      ok: false,
      failure: requirementFailure(phase, "requirement.failed"),
    };
  }
  return { ok: false, failure: requirementFailure(phase, error.code) };
}

export { ERROR_API_VERSION, REQUIREMENT_FAILURE_STATUSES };
