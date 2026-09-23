import { describe, it, expect } from "vitest";
import {
  inventoryBlueprint,
  composeInventoryInput,
} from "../../compiler/test/fixtures/inventory-operations.js";
import {
  loadProductDefinitionData,
  parseProductDefinitionCatalogue,
} from "../src/requirements/product-definition-data.js";
import {
  createDefinitionEntry,
  validateFamilyDefinition,
} from "../src/requirements/definition-family-registry.js";
import { definitionSelectionCatalogue } from "../src/requirements/definition-selection-catalogue.js";
import { selectInventoryOperationsProfile } from "../../compiler/src/index.js";
function definition() {
  const entry = structuredClone(
    loadProductDefinitionData().definitions.find(
      (e) => e.definitionKey === "knowledge-resource-directory",
    )!,
  );
  const { spec, blueprint } = inventoryBlueprint();
  entry.definitionKey = "supplies-stockroom";
  entry.familyBinding = {
    key: "inventory-operations",
    version: "inventory-operations/v1",
  };
  entry.primaryJob = {
    actorKey: "stockkeeper",
    entityKey: "stock-movement",
    operation: "submit",
    successState: "recorded",
  };
  entry.canonical = { spec, blueprint };
  entry.selection = {
    providerGuide: {
      ...structuredClone(blueprint),
      definitionKey: entry.definitionKey,
      identity: "Local demo stockkeeper and observer; no private identity.",
    },
    providerInstruction:
      "Use the exact local stockroom. Unsupported units, locations, external side effects and private identity require clarification.",
  };
  entry.admissionExpectations.presentation = {
    key: "inventory-operations-presentation",
    version: "1.0.0",
  };
  entry.admissionExpectations.compilerProfile = "inventory-operations@1.0.0";
  entry.journeys = {
    correction: [
      {
        key: "correct-name",
        steps: [
          {
            actorKey: "stockkeeper",
            entityKey: "stock-item",
            operation: "update",
            fromState: null,
            toState: null,
            expectation: "success",
          },
        ],
      },
    ],
    failure: [
      {
        key: "observer-denied",
        steps: [
          {
            actorKey: "observer",
            entityKey: "stock-movement",
            operation: "read",
            fromState: "recorded",
            toState: "recorded",
            expectation: "denied",
          },
        ],
      },
    ],
  };
  return entry;
}
describe("Inventory authored definition admission", () => {
  it("admits only the authored exact family without registering a tenth product", () => {
    const entry = definition();
    expect(validateFamilyDefinition(entry)).toEqual([]);
    const parsed = parseProductDefinitionCatalogue(
      Buffer.from(
        JSON.stringify({
          apiVersion: "factory.product-definition-catalogue/v1",
          definitions: [entry],
        }),
      ),
    );
    expect(parsed.definitions).toHaveLength(1);
    expect(definitionSelectionCatalogue).toHaveLength(9);
    expect(
      definitionSelectionCatalogue.some(
        (e) => e.definitionKey === "supplies-stockroom",
      ),
    ).toBe(false);
  });
  it("projects safe text and preserves empty seeds through a persisted Published witness", () => {
    const entry = createDefinitionEntry(definition());
    const projection = entry.project({
      definitionKey: "supplies-stockroom",
      disposition: "supported-default",
      requirementId: "office-stock",
      title: "Office Supplies",
      outcome: "Keep supplies available.",
      materialQuestions: [],
      businessParameters: null,
    });
    const input = JSON.parse(
      JSON.stringify(
        composeInventoryInput(projection.spec, projection.blueprint),
      ),
    );
    expect(input.graph.domain.seedData).toEqual([]);
    expect(
      selectInventoryOperationsProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      itemEntity: "stock-item",
      movementEntity: "stock-movement",
    });
  });
  it.each([
    "version",
    "bounds",
    "reference",
    "grant",
    "page",
    "field",
    "primary-job",
    "lock",
    "guide",
    "unknown-family",
    "seed",
    "journey",
  ])("rejects authored drift: %s", (change) => {
    const e = definition();
    if (change === "version")
      e.familyBinding.version = "inventory-operations/v2";
    if (change === "bounds")
      e.canonical.blueprint.entities[0]!.fields[3]!.numericDomain!.minimum!.value =
        -1;
    if (change === "reference")
      e.canonical.blueprint.entities[1]!.fields[0]!.referenceTo =
        "stock-movement";
    if (change === "grant")
      e.canonical.blueprint.actors[1]!.permissions[0]!.actions.push("update");
    if (change === "page")
      e.canonical.blueprint.pageIntents[0]!.entityKey = "stock-movement";
    if (change === "field")
      e.canonical.blueprint.entities[0]!.fields.push({
        key: "warehouse",
        label: "Warehouse",
        type: "text",
        required: true,
      });
    if (change === "primary-job") e.primaryJob.entityKey = "stock-item";
    if (change === "lock")
      e.admissionExpectations.capabilityLocks[0]!.manifestDigest =
        "sha256:" + "0".repeat(64);
    if (change === "guide")
      (e.selection.providerGuide.entities as any[])[0].fields[0].key = "code";
    if (change === "unknown-family") e.familyBinding.key = "inventory-generic";
    if (change === "seed")
      (e.canonical.blueprint as any).seedData = [{ quantity: 12 }];
    if (change === "journey")
      e.journeys.correction[0]!.steps[0]!.operation = "delete";
    expect(() =>
      parseProductDefinitionCatalogue(
        Buffer.from(
          JSON.stringify({
            apiVersion: "factory.product-definition-catalogue/v1",
            definitions: [e],
          }),
        ),
      ),
    ).toThrow();
  });
});
