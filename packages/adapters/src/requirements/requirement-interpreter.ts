import {
  CompositionError,
  hashRequirementSpec,
  parseCompositionClarification,
  parseProductBlueprint,
  parseRequirementSpec,
  type CompositionClarificationV1,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";

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

export interface RequirementInterpreterAdapterV1 {
  interpret(input: {
    readonly brief: string;
    readonly answers: Readonly<Record<string, string>>;
  }): Promise<RequirementInterpretationV1>;
}

export type RequirementInterpreterErrorCode =
  | "brief_invalid"
  | "interpretation_invalid"
  | "configuration_missing"
  | "provider_request_failed"
  | "provider_request_rejected"
  | "provider_authentication_failed"
  | "provider_access_denied"
  | "model_unavailable"
  | "provider_rate_limited";

export class RequirementInterpreterError extends Error {
  public constructor(
    message: string,
    public readonly code: RequirementInterpreterErrorCode = "interpretation_invalid",
  ) {
    super(message);
    this.name = "RequirementInterpreterError";
  }
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
      // Schema and cross-reference failures are bounded CompositionErrors;
      // every adapter surfaces them under the interpreter contract.
      if (error instanceof CompositionError) {
        throw new RequirementInterpreterError(error.message);
      }
      throw new RequirementInterpreterError(
        "Requirement interpretation is invalid.",
      );
    }
  };
  const spec = parse(() => parseRequirementSpec(input.spec));
  const blueprint = parse(() => parseProductBlueprint(input.blueprint));
  const checksum = hashRequirementSpec(spec);
  if (blueprint.requirementChecksum !== checksum) {
    throw new RequirementInterpreterError(
      "The blueprint must bind the exact requirement checksum.",
    );
  }
  const clarifications = input.clarifications.map((clarification) => {
    const parsed = parse(() => parseCompositionClarification(clarification));
    if (parsed.requirementChecksum !== checksum) {
      throw new RequirementInterpreterError(
        "Clarifications must bind the exact requirement checksum.",
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
    .map((question, index) => ({
      key: slugify(question.question, index),
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
    return { key, question: item.question };
  });
  return [
    {
      apiVersion: "factory.composition-clarification/v1",
      requirementChecksum: hashRequirementSpec(spec),
      questions,
    },
  ];
}
