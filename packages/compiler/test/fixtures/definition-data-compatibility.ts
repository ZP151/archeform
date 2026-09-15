import { createHash } from "node:crypto";
import {
  definitionSelectionCatalogue,
  projectDefinitionSelection,
} from "../../../adapters/src/requirements/definition-selection-catalogue.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "@factory/graph";
import { generateApplicationBundle } from "../../src/index.js";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Independent baseline captured before data-authoring implementation. */
export function currentDefinitionDataCompatibility() {
  const historicalKeys = [
    "restaurant-ordering",
    "expense-approval",
    "purchase-request-approval",
    "team-task-tracking",
  ];
  return historicalKeys.map((key) => {
    const entry = definitionSelectionCatalogue.find(
      (candidate) => candidate.definitionKey === key,
    );
    if (!entry) throw new Error(`Historical definition missing: ${key}`);
    const selection = {
      definitionKey: entry.definitionKey,
      disposition: "supported-default",
      requirementId: `data-baseline-${entry.definitionKey}`,
      title: "Definition Data Baseline",
      outcome: "Complete the reviewed local business workflow.",
      materialQuestions: [],
      businessParameters: null,
    };
    const interpretation = projectDefinitionSelection(selection);
    const clarification = projectDefinitionSelection({
      ...selection,
      disposition: "needs-clarification",
      materialQuestions: [
        {
          category: "integration",
          question: "Is local demo access acceptable?",
        },
      ],
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: "Definition Data Baseline",
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    if (!standard) throw new Error("Baseline has no standard assembly plan.");
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
    const publishedBundle = () => {
      const inputGraph = structuredClone(graph);
      delete inputGraph.integration.compositionSelections;
      const compositionLock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(inputGraph),
        selections: graph.integration.compositionSelections ?? [],
      });
      const files = generateApplicationBundle({
        publishedRevisionId: selection.requirementId,
        graph: inputGraph,
        compositionLock,
      }).files;
      return {
        fileCount: files.length,
        sha256: digest(files.map(({ path, content }) => [path, content])),
      };
    };
    return {
      definitionKey: entry.definitionKey,
      canonicalSha256: digest(entry.structure),
      guideSha256: digest(entry.guide),
      instructionSha256: digest(entry.instruction),
      selectionSchemaSha256: digest(entry.jsonSchema),
      supportedProjectionSha256: digest(interpretation),
      clarificationProjectionSha256: digest(clarification),
      separatePublishedLockBundle: publishedBundle(),
    };
  });
}
