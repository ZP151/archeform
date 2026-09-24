import { readFileSync } from "node:fs";
import {
  currentCapabilityCatalogue,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import {
  composeProductDraft,
  composeProductIntegration,
  deriveProductOperations,
  productGraphBindings,
} from "../../../capabilities/src/product-composer.js";
import {
  assertProductBlueprint,
  assertRequirementSpec,
  assertCompositionPlan,
  createBlankApplicationDraft,
  applyGraphDiffToDraft,
  hashApplicationGraph,
  hashRequirementSpec,
  type ProductBlueprintV1,
} from "@factory/graph";

export function eventRegistrationBlueprint() {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../../graph/test/fixtures/event-registration-blueprint.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const spec = assertRequirementSpec(fixture.spec);
  return {
    spec,
    blueprint: assertProductBlueprint({
      ...fixture.blueprint,
      requirementChecksum: hashRequirementSpec(spec),
    }),
  };
}
/** Real deterministic composition; automatic plan admission is a later task. */
export function eventRegistrationComposition(
  blueprintInput?: ProductBlueprintV1,
) {
  const { spec, blueprint: original } = eventRegistrationBlueprint();
  const blueprint = assertProductBlueprint(blueprintInput ?? original);
  const baseDraft = createBlankApplicationDraft({
    applicationId: spec.requirementId,
    workspaceId: "local-workspace",
    name: blueprint.title,
  });
  const catalogue = currentCapabilityCatalogue();
  const assets = [
    ...catalogue.required,
    catalogue.optional.find((entry) => entry.asset.key === "core.notification")!
      .asset,
  ];
  const keys = assets.map((asset) => asset.key);
  const derived = deriveProductOperations({
    blueprint,
    applicationId: spec.requirementId,
    selectedKeys: keys,
  });
  const plan = assertCompositionPlan({
    apiVersion: "factory.composition-plan/v1",
    planId: "event-registration-fixture-standard",
    requirementChecksum: hashRequirementSpec(spec),
    draftBaseChecksum: hashApplicationGraph(baseDraft.graph),
    capabilityLocks: assets.map(({ key, version, manifestDigest }) => ({
      key,
      version,
      manifestDigest,
    })),
    graphBindings: productGraphBindings(
      blueprint,
      spec.requirementId,
      new Set(keys),
    ),
    outputSlots: [],
    dependencyGraph: [],
    compatibility: { result: "compatible", reasons: [] },
    risks: [],
    assumptions: [],
    complexity: "medium",
    acceptanceJourneys: blueprint.acceptanceJourneys.map(
      ({ key, description }) => ({ key, description }),
    ),
    explanation: "Exact Event Registration fixture composition.",
    proposedOperations: derived.operations.filter(
      (operation) => !operation.path.startsWith("/page/pages/"),
    ),
  });
  plan.proposedOperations.push({
    op: "add",
    path: "/integration/compositionSelections",
    value: composeProductIntegration(plan),
  });
  return { blueprint, baseDraft, plan };
}
function freezeFixture<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeFixture(child);
    Object.freeze(value);
  }
  return value;
}
export function eventRegistrationInput(blueprint?: ProductBlueprintV1) {
  const composition = eventRegistrationComposition(blueprint);
  const { diff } = composeProductDraft(composition);
  const graph = applyGraphDiffToDraft(composition.baseDraft, diff).graph;
  const selections = graph.integration.compositionSelections!;
  delete graph.integration.compositionSelections;
  return freezeFixture({
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  });
}
