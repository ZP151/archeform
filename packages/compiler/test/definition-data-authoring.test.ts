import { describe, expect, it } from "vitest";
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
import {
  loadProductDefinitionData,
  parseProductDefinitionCatalogue,
  validateDefinitionBatch,
} from "../../adapters/src/requirements/product-definition-data.js";
import { createDefinitionEntry } from "../../adapters/src/requirements/definition-family-registry.js";
import { generateApplicationBundle } from "../src/index.js";

describe("configuration-only definition authoring", () => {
  it("carries a reviewed Approval field variation into immutable generated schema and UI without catalogue admission", () => {
    const original = loadProductDefinitionData();
    const beforeCatalogue = JSON.stringify(original);
    const candidate = structuredClone(original.definitions[1]!);
    candidate.definitionKey = "equipment-review-candidate";
    candidate.selection.providerGuide.definitionKey = candidate.definitionKey;
    candidate.canonical.blueprint.entities[0]!.fields.push({
      key: "equipmentCode",
      label: "Equipment code",
      type: "text",
      required: true,
    });
    Object.assign(candidate.selection.providerGuide, {
      entities: structuredClone(candidate.canonical.blueprint.entities),
    });
    const bytes = Buffer.from(
      JSON.stringify({
        apiVersion: "factory.product-definition-catalogue/v1",
        definitions: [candidate],
      }),
    );
    expect(validateDefinitionBatch(bytes)).toMatchObject({
      attempted: 1,
      valid: 1,
      distinct: 1,
      admitted: 0,
    });
    const parsed = parseProductDefinitionCatalogue(bytes);
    const entry = createDefinitionEntry(parsed.definitions[0]!);
    const interpretation = entry.project({
      definitionKey: candidate.definitionKey,
      disposition: "supported-default",
      requirementId: "equipment-review-candidate",
      title: "Equipment Review",
      outcome: "Review a request with its equipment code.",
      materialQuestions: [],
      businessParameters: null,
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: "Equipment Review",
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    expect(standard).toBeDefined();
    const { diff } = composeProductDraft({
      plan: standard!.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
    const selections = graph.integration.compositionSelections!;
    delete graph.integration.compositionSelections;
    const input = {
      publishedRevisionId: "equipment-review-candidate",
      graph,
      compositionLock: createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections,
      }),
    };
    const beforeInput = JSON.stringify(input);
    const bundle = generateApplicationBundle(input);
    const contents = (path: string) => {
      const file = bundle.files.find((value) => value.path === path);
      expect(file, path).toBeDefined();
      return file!.content;
    };
    expect(contents("api/prisma/schema.prisma")).toMatch(
      /equipmentCode\s+String\s/,
    );
    expect(contents("api/src/application-runtime.ts")).toContain(
      "factory.generated.approval-mutation/v1",
    );
    expect(contents("web/app/page-runtime.tsx")).toContain("equipmentCode");
    expect(contents("web/app/page-runtime.tsx")).toContain(
      "ApprovalRecordCommandState",
    );
    expect(JSON.stringify(input)).toBe(beforeInput);
    expect(JSON.stringify(loadProductDefinitionData())).toBe(beforeCatalogue);
    expect(loadProductDefinitionData().definitions).toHaveLength(
      original.definitions.length,
    );
  });
});
