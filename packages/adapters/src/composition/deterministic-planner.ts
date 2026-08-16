import {
  parseRequirementSpec,
  type CompositionClarificationV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProfileRecipeCatalogV1,
  type RequirementSpecV1,
} from "@factory/graph";
import {
  planComposition,
  type CapabilityAssetV1,
  type PlanCompositionOutcomeV1,
} from "@factory/capabilities/node";

/**
 * A planning seam input: the structured or prose brief, the mutable Draft the
 * plan will bind to, the approved capability assets, the repository root for
 * fixture reads, and the authoritative recipe catalogue.
 */
export interface CompositionPlannerInputV1 {
  readonly brief: unknown;
  readonly baseDraft: DraftRevisionV1;
  readonly approvedAssets: readonly CapabilityAssetV1[];
  readonly repositoryRoot: string;
  readonly catalog: ProfileRecipeCatalogV1;
}

/**
 * A schema-valid proposal or a bounded clarification. Raw prompts, model
 * responses, and credentials never appear on the outcome.
 */
export type CompositionPlannerOutcomeV1 =
  | {
      readonly kind: "proposal";
      readonly requirement: RequirementSpecV1;
      readonly plan: CompositionPlanV1;
    }
  | {
      readonly kind: "clarification";
      readonly clarification: CompositionClarificationV1;
    };

export type CompositionPlannerErrorCode =
  | "brief_invalid"
  | "proposal_invalid"
  | "configuration_missing"
  | "provider_request_failed"
  | "provider_request_rejected"
  | "provider_authentication_failed"
  | "provider_access_denied"
  | "model_unavailable"
  | "provider_rate_limited";

export class CompositionPlannerError extends Error {
  public constructor(
    message: string,
    public readonly code: CompositionPlannerErrorCode = "proposal_invalid",
  ) {
    super(message);
    this.name = "CompositionPlannerError";
  }
}

export interface CompositionPlannerAdapterV1 {
  propose(
    input: CompositionPlannerInputV1,
  ): Promise<CompositionPlannerOutcomeV1>;
}

function planToOutcome(
  outcome: PlanCompositionOutcomeV1,
  requirement: RequirementSpecV1,
): CompositionPlannerOutcomeV1 {
  if (outcome.kind === "clarification") {
    return { kind: "clarification", clarification: outcome.clarification };
  }
  return { kind: "proposal", requirement, plan: outcome.plan };
}

/**
 * Deterministic planner adapter. The structured brief must parse as an exact
 * RequirementSpecV1 (fail-closed on unknown keys, URLs, paths, and prototype
 * material); the plan then comes entirely from the deterministic planner over
 * the approved assets and the recipe catalogue. It never invents capability
 * selections, versions, bindings, paths, or operations.
 */
export class DeterministicCompositionPlannerAdapter implements CompositionPlannerAdapterV1 {
  public async propose(
    input: CompositionPlannerInputV1,
  ): Promise<CompositionPlannerOutcomeV1> {
    let requirement: RequirementSpecV1;
    try {
      requirement = parseRequirementSpec(input.brief);
    } catch {
      throw new CompositionPlannerError(
        "The structured brief is not a schema-valid requirement.",
        "brief_invalid",
      );
    }
    const outcome = planComposition(
      requirement,
      input.catalog,
      input.baseDraft,
      input.repositoryRoot,
      input.approvedAssets,
    );
    return planToOutcome(outcome, requirement);
  }
}
