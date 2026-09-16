import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  applyGraphDiffToDraft,
  hashApplicationGraph,
  type NumericFieldDomainV1,
} from "@factory/graph";
import { loadProductDefinitionData } from "../../../adapters/src/requirements/product-definition-data.js";
import { createDefinitionEntry } from "../../../adapters/src/requirements/definition-family-registry.js";
export const positive: NumericFieldDomainV1 = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};
export function numericDefinition(
  domain = positive,
  type: "currency" | "number" = "currency",
) {
  const data = structuredClone(
    loadProductDefinitionData().definitions.find(
      (e) => e.definitionKey === "publication-review",
    )!,
  );
  data.canonical.blueprint.entities[0]!.fields = [
    { key: "courseTitle", label: "Course title", type: "text", required: true },
    { key: "fee", label: "Fee", type, required: true, numericDomain: domain },
    { key: "sessionDate", label: "Session date", type: "date", required: true },
    {
      key: "justification",
      label: "Justification",
      type: "long-text",
      required: true,
    },
  ];
  (data.selection.providerGuide as any).entities = structuredClone(
    data.canonical.blueprint.entities,
  );
  return data;
}
export function numericInput(
  domain = positive,
  type: "currency" | "number" = "currency",
) {
  const data = numericDefinition(domain, type);
  const interpretation = createDefinitionEntry(data).project({
    definitionKey: data.definitionKey,
    disposition: "supported-default",
    requirementId: "numeric-domain-test",
    title: "Numeric request",
    outcome: "Review a request.",
    materialQuestions: [],
    businessParameters: null,
  });
  const baseDraft = createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: "Numeric request",
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const { diff } = composeProductDraft({
    plan: standard!.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const selections = graph.integration.compositionSelections!;
  delete graph.integration.compositionSelections;
  return {
    publishedRevisionId: "published-numeric-test",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}
