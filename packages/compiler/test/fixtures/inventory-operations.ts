import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
  hashRequirementSpec,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";

export const inventoryDomain = (minimum: number, maximum: number) => ({
  apiVersion: "factory.numeric-field-domain/v1" as const,
  minimum: { value: minimum, inclusive: true },
  maximum: { value: maximum, inclusive: true },
});
export function inventoryBlueprint() {
  const spec: RequirementSpecV1 = {
    apiVersion: "factory.requirement-spec/v1",
    requirementId: "inventory-fixture",
    outcome:
      "Maintain an authoritative stock balance and immutable movement history.",
    actors: [
      { key: "stockkeeper", label: "Stockkeeper" },
      { key: "observer", label: "Observer" },
    ],
    domainConcepts: [
      { key: "stock-item", label: "Stock item" },
      { key: "stock-movement", label: "Stock movement" },
    ],
    workflows: [{ key: "record-movement", label: "Record movement" }],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "record-stock",
        given: "An empty stock item",
        when: "The stockkeeper receives stock",
        then: "The balance and movement are recorded together",
      },
    ],
  };
  const field = (
    key: string,
    type: "text" | "long-text" | "datetime",
    required = true,
  ) => ({ key, label: key, type, required });
  const number = (key: string, min: number, max: number) => ({
    key,
    label: key,
    type: "number" as const,
    required: true,
    numericDomain: inventoryDomain(min, max),
  });
  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: hashRequirementSpec(spec),
    title: "Supplies Stockroom",
    actors: [
      {
        key: "stockkeeper",
        label: "Stockkeeper",
        permissions: [
          { entityKey: "stock-item", actions: ["create", "read", "update"] },
          {
            entityKey: "stock-movement",
            actions: ["create", "read", "submit", "audit"],
          },
        ],
      },
      {
        key: "observer",
        label: "Observer",
        permissions: [{ entityKey: "stock-item", actions: ["read"] }],
      },
    ],
    entities: [
      {
        key: "stock-item",
        label: "Stock item",
        fields: [
          field("sku", "text"),
          field("name", "text"),
          field("unit", "text"),
          number("quantity", 0, 1000000000),
        ],
      },
      {
        key: "stock-movement",
        label: "Stock movement",
        fields: [
          {
            key: "stockItem",
            label: "Stock item",
            type: "reference",
            required: true,
            referenceTo: "stock-item",
          },
          {
            key: "kind",
            label: "Kind",
            type: "enum",
            required: true,
            options: ["receive", "issue", "adjust"],
          },
          number("delta", -1000000000, 1000000000),
          number("beforeQuantity", 0, 1000000000),
          number("afterQuantity", 0, 1000000000),
          number("itemVersion", 1, 2147483647),
          field("reason", "long-text"),
          field("actorRole", "text"),
          field("recordedAt", "datetime"),
          field("correctionOf", "text", false),
        ],
      },
    ],
    pageIntents: (["list", "form", "detail"] as const).map((intent) => ({
      key: `stock-${intent}`,
      label: `Stock ${intent}`,
      intent,
      entityKey: "stock-item",
    })),
    workflows: [
      {
        key: "record-movement",
        label: "Record movement",
        entityKey: "stock-movement",
        states: [
          { key: "draft", label: "Draft" },
          { key: "recorded", label: "Recorded" },
        ],
        transitions: [
          {
            key: "submit",
            label: "Record",
            from: "draft",
            to: "recorded",
            actorKey: "stockkeeper",
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "record-stock",
        description: "Record a stock movement.",
        steps: [
          {
            actorKey: "stockkeeper",
            action: "Create an item and receive, issue and correct stock.",
          },
        ],
      },
    ],
  };
  return { spec, blueprint };
}
export function composeInventoryInput(
  spec: RequirementSpecV1,
  blueprint: ProductBlueprintV1,
) {
  const baseDraft = createBlankApplicationDraft({
    applicationId: spec.requirementId,
    workspaceId: "local-workspace",
    name: blueprint.title,
  });
  const [standard] = planProductAlternatives({
    requirement: spec,
    blueprint,
    baseDraft,
  });
  if (!standard) throw Error("Fixture has no standard plan.");
  const { diff } = composeProductDraft({
    plan: standard.plan,
    blueprint,
    baseDraft,
  });
  const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const selections = graph.integration.compositionSelections!;
  delete graph.integration.compositionSelections;
  return {
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}
export function inventoryOperationsInput() {
  const { spec, blueprint } = inventoryBlueprint();
  return composeInventoryInput(spec, blueprint);
}
