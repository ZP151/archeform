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
import { projectDefinitionSelection } from "../../../adapters/src/requirements/definition-selection-catalogue.js";

export function composeDirectoryInput(
  requirement: RequirementSpecV1,
  blueprint: ProductBlueprintV1,
) {
  const baseDraft = createBlankApplicationDraft({
    applicationId: requirement.requirementId,
    workspaceId: "local-workspace",
    name: blueprint.title,
  });
  const [standard] = planProductAlternatives({
    requirement,
    blueprint,
    baseDraft,
  });
  if (!standard) throw Error("Fixture has no standard assembly plan.");
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

export function contentDirectoryInput(
  options: {
    entity?: string;
    reader?: string;
    curator?: string;
    categories?: string[];
  } = {},
) {
  const entity = options.entity ?? "resource";
  const reader = options.reader ?? "reader";
  const curator = options.curator ?? "curator";
  const spec: RequirementSpecV1 = {
    apiVersion: "factory.requirement-spec/v1",
    requirementId: "directory-fixture",
    outcome: "Readers find useful entries and curators maintain them.",
    actors: [
      { key: reader, label: "Reader" },
      { key: curator, label: "Curator" },
    ],
    domainConcepts: [{ key: entity, label: "Resource" }],
    workflows: [{ key: "visibility", label: "Entry visibility" }],
    constraints: [],
    openQuestions: [],
    acceptanceScenarios: [
      {
        key: "find-entry",
        given: "a listed entry",
        when: "a reader searches",
        then: "the reader can read it",
      },
    ],
  };
  const blueprint: ProductBlueprintV1 = {
    apiVersion: "factory.product-blueprint/v1",
    requirementChecksum: hashRequirementSpec(spec),
    title: "Knowledge Resource Directory",
    actors: [
      {
        key: reader,
        label: "Reader",
        permissions: [{ entityKey: entity, actions: ["read"] }],
      },
      {
        key: curator,
        label: "Curator",
        permissions: [
          {
            entityKey: entity,
            actions: ["create", "read", "update", "submit", "cancel"],
          },
        ],
      },
    ],
    entities: [
      {
        key: entity,
        label: "Resource",
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "summary", label: "Summary", type: "text", required: true },
          { key: "body", label: "Body", type: "long-text", required: true },
          {
            key: "category",
            label: "Category",
            type: "enum",
            required: true,
            options: options.categories ?? [
              "Guides",
              "Reference",
              "Checklists",
            ],
          },
        ],
      },
    ],
    pageIntents: ["list", "form", "detail"].map((intent) => ({
      key: `resource-${intent}`,
      label: `Resource ${intent}`,
      intent: intent as "list" | "form" | "detail",
      entityKey: entity,
    })),
    workflows: [
      {
        key: "visibility",
        label: "Entry visibility",
        entityKey: entity,
        states: [
          { key: "hidden", label: "Hidden" },
          { key: "listed", label: "Listed" },
        ],
        transitions: [
          {
            key: "submit",
            from: "hidden",
            to: "listed",
            label: "Show entry",
            actorKey: curator,
          },
          {
            key: "cancel",
            from: "listed",
            to: "hidden",
            label: "Hide entry",
            actorKey: curator,
          },
        ],
      },
    ],
    acceptanceJourneys: [
      {
        key: "manage-entry",
        description: "Curators maintain entries.",
        steps: [
          {
            actorKey: curator,
            action: "Create, correct, show and hide an entry.",
          },
        ],
      },
    ],
  };
  return composeDirectoryInput(spec, blueprint);
}

export function previousDefinitionInput(definitionKey: string) {
  const interpretation = projectDefinitionSelection({
    definitionKey,
    disposition: "supported-default",
    requirementId: `data-baseline-${definitionKey}`,
    title: "Definition Data Baseline",
    outcome: "Complete the reviewed local business workflow.",
    materialQuestions: [],
    businessParameters: null,
  });
  return composeDirectoryInput(interpretation.spec, interpretation.blueprint);
}
