import {
  CompositionError,
  assertCompositionPlan,
  assertProductBlueprint,
  assertRequirementSpec,
  hashApplicationGraph,
  hashRequirementSpec,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";

import {
  assertProductCapabilityCatalogue,
  currentCapabilityCatalogue,
  type CatalogueAssetRefV1,
  type ProductCapabilityCatalogueV1,
} from "./capability-catalogue.js";
import {
  composeProductIntegration,
  deriveProductOperations,
  hasApprovalDecision,
  primaryListPage,
} from "./product-composer.js";

/**
 * Two meaningful plan alternatives for an accepted blueprint over a blank
 * Draft: `standard` (required capabilities plus every optional capability
 * the blueprint triggers) and `minimal` (required capabilities only). When
 * nothing optional triggers, the alternatives collapse to one. Alternatives
 * differ only by deterministic trigger evaluation — never by model choice.
 * Plans can never carry derived page routes: their proposedOperations are
 * the derivation minus `/page/pages/` operations, and the composer
 * re-derives the complete Diff against the accepted plan at apply time.
 */

export type ProductPlanAlternativeKey = "standard" | "minimal";

export interface ProductPlanAlternative {
  readonly key: ProductPlanAlternativeKey;
  readonly label: string;
  readonly plan: CompositionPlanV1;
}

export interface PlanProductAlternativesInput {
  readonly requirement: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly baseDraft: DraftRevisionV1;
  readonly catalogue?: unknown;
}

function assertBlankBase(draft: DraftRevisionV1): void {
  if (draft.status !== "draft") {
    throw new CompositionError(
      "Product planning requires a mutable Draft base.",
    );
  }
  const graph = draft.graph;
  if (
    graph.page.pages.length > 0 ||
    graph.domain.entities.length > 0 ||
    graph.policy.roles.length > 0 ||
    graph.flow.flows.length > 0
  ) {
    throw new CompositionError(
      "Product planning requires a blank Draft base; the base Draft already carries product content.",
    );
  }
}

function catalogueAssets(
  catalogue: ProductCapabilityCatalogueV1,
): readonly CatalogueAssetRefV1[] {
  return [
    ...catalogue.required,
    ...catalogue.optional.map((entry) => entry.asset),
  ];
}

function locksForKeys(
  catalogue: ProductCapabilityCatalogueV1,
  keys: readonly string[],
): CompositionPlanV1["capabilityLocks"] {
  const assets = catalogueAssets(catalogue);
  return keys.map((key) => {
    const asset = assets.find((candidate) => candidate.key === key);
    if (asset === undefined) {
      throw new CompositionError(
        `Capability '${key}' is not selectable from the approved catalogue.`,
      );
    }
    return {
      key: asset.key,
      version: asset.version,
      manifestDigest: asset.manifestDigest,
    };
  });
}

function bindingsForKeys(
  blueprint: ProductBlueprintV1,
  applicationId: string,
  keys: ReadonlySet<string>,
): CompositionPlanV1["graphBindings"] {
  const bindings: CompositionPlanV1["graphBindings"] = [];
  if (keys.has("core.crud")) {
    const primary = blueprint.entities[0];
    bindings.push(
      {
        capabilityKey: "core.crud",
        inputKey: "entityKey",
        graphSymbol: `graph.domain.${primary.key}`,
      },
      {
        capabilityKey: "core.crud",
        inputKey: "routeKey",
        graphSymbol: `graph.page.${primaryListPage(blueprint, primary.key)}`,
      },
    );
  }
  if (keys.has("core.workflow")) {
    bindings.push({
      capabilityKey: "core.workflow",
      inputKey: "flowKey",
      graphSymbol: `graph.flow.${blueprint.workflows[0].key}`,
    });
  }
  if (keys.has("core.identity-policy")) {
    const [defaultRole, authenticatedRole = defaultRole] = blueprint.actors.map(
      (actor) => actor.key,
    );
    bindings.push(
      {
        capabilityKey: "core.identity-policy",
        inputKey: "principalEntity",
        graphSymbol: `graph.domain.${applicationId}-principal`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "sessionEntity",
        graphSymbol: `graph.domain.${applicationId}-session`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "defaultRole",
        graphSymbol: `graph.policy.${defaultRole}`,
      },
      {
        capabilityKey: "core.identity-policy",
        inputKey: "authenticatedRole",
        graphSymbol: `graph.policy.${authenticatedRole}`,
      },
    );
  }
  if (keys.has("core.audit")) {
    const approver = blueprint.actors.find((actor) =>
      actor.permissions.some((permission) =>
        permission.actions.some(
          (action) => action === "approve" || action === "reject",
        ),
      ),
    );
    if (approver === undefined) {
      throw new CompositionError(
        "Audit capability triggered without an approval-decision actor.",
      );
    }
    bindings.push({
      capabilityKey: "core.audit",
      inputKey: "actorRole",
      graphSymbol: `graph.policy.${approver.key}`,
    });
  }
  if (keys.has("core.notification")) {
    bindings.push({
      capabilityKey: "core.notification",
      inputKey: "recipientRole",
      graphSymbol: `graph.policy.${blueprint.actors[0].key}`,
    });
  }
  return bindings;
}

function selectedKeysFor(
  catalogue: ProductCapabilityCatalogueV1,
  blueprint: ProductBlueprintV1,
  key: ProductPlanAlternativeKey,
): readonly string[] {
  const required = catalogue.required.map((asset) => asset.key);
  if (key === "minimal") return required;
  const triggered = catalogue.optional
    .filter((entry) =>
      entry.triggers.some((trigger) =>
        trigger === "approval-decision"
          ? hasApprovalDecision(blueprint)
          : blueprint.workflows.length > 0,
      ),
    )
    .map((entry) => entry.asset.key);
  return [...required, ...triggered];
}

function buildPlan(input: {
  readonly requirement: RequirementSpecV1;
  readonly blueprint: ProductBlueprintV1;
  readonly baseDraft: DraftRevisionV1;
  readonly key: ProductPlanAlternativeKey;
  readonly catalogue: ProductCapabilityCatalogueV1;
}): CompositionPlanV1 {
  const { requirement, blueprint, baseDraft, key, catalogue } = input;
  const baseHash = hashApplicationGraph(baseDraft.graph);
  const applicationId = baseDraft.graph.metadata.id;
  const selectedKeys = selectedKeysFor(catalogue, blueprint, key);
  const selected = new Set(selectedKeys);
  const locks = locksForKeys(catalogue, selectedKeys);
  const bindings = bindingsForKeys(blueprint, applicationId, selected);
  const derived = deriveProductOperations({
    blueprint,
    applicationId,
    selectedKeys,
  });
  // Plans cannot carry derived page routes; the complete Diff is
  // re-derived against the accepted plan at composition time.
  const declaredOperations = derived.operations.filter(
    (operation) => !operation.path.startsWith("/page/pages/"),
  );
  const planWithDeclaredOps: CompositionPlanV1 = {
    apiVersion: "factory.composition-plan/v1",
    planId: `${requirement.requirementId}-${key}`,
    requirementChecksum: hashRequirementSpec(requirement),
    draftBaseChecksum: baseHash,
    capabilityLocks: locks,
    graphBindings: bindings,
    outputSlots: [],
    dependencyGraph: [],
    compatibility: { result: "compatible", reasons: [] },
    risks: [],
    assumptions: [
      "Capability locks cover the primary entity and workflow; further surfaces compose through the same approved assets.",
    ],
    complexity: "medium",
    acceptanceJourneys: blueprint.acceptanceJourneys.map((journey) => ({
      key: journey.key,
      description: journey.description,
    })),
    explanation:
      "Deterministic composition of the accepted blueprint over the approved capability catalogue.",
    proposedOperations: declaredOperations,
  };
  const selections = composeProductIntegration(planWithDeclaredOps, catalogue);
  return assertCompositionPlan({
    ...planWithDeclaredOps,
    proposedOperations: [
      ...declaredOperations,
      {
        op: "add",
        path: "/integration/compositionSelections",
        value: selections,
      },
    ],
  });
}

/**
 * Deterministic plan alternatives for the accepted blueprint over the blank
 * base Draft. Every alternative is checksum-bound to the exact requirement
 * and base Draft revision; stale blueprints, mismatched requirements, and
 * non-blank bases fail closed.
 */
export function planProductAlternatives(
  input: PlanProductAlternativesInput,
): readonly ProductPlanAlternative[] {
  const requirement = assertRequirementSpec(input.requirement);
  const blueprint = assertProductBlueprint(input.blueprint);
  if (blueprint.requirementChecksum !== hashRequirementSpec(requirement)) {
    throw new CompositionError(
      "Blueprint requirement checksum does not match the given requirement.",
    );
  }
  assertBlankBase(input.baseDraft);
  const catalogue =
    input.catalogue === undefined
      ? currentCapabilityCatalogue()
      : assertProductCapabilityCatalogue(input.catalogue);

  const keys = [
    selectedKeysFor(catalogue, blueprint, "standard"),
    selectedKeysFor(catalogue, blueprint, "minimal"),
  ];
  const distinct = keys.filter(
    (candidate, index) =>
      keys.findIndex((other) => candidate.join(",") === other.join(",")) ===
      index,
  );
  return distinct.map((_, index): ProductPlanAlternative => {
    const key: ProductPlanAlternativeKey = index === 0 ? "standard" : "minimal";
    return {
      key,
      label:
        key === "standard" ? "Standard composition" : "Minimal composition",
      plan: buildPlan({
        requirement,
        blueprint,
        baseDraft: input.baseDraft,
        key,
        catalogue,
      }),
    };
  });
}
