import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashRequirementSpec } from "@factory/graph";
import { selectInventoryOperationsProfile } from "../../compiler/src/index.js";
import { composeInventoryInput } from "../../compiler/test/fixtures/inventory-operations.js";
import {
  loadProductDefinitionData,
  validateDefinitionBatch,
} from "../src/requirements/product-definition-data.js";
import { validateFamilyDefinition } from "../src/requirements/definition-family-registry.js";
import {
  definitionSelectionCatalogue,
  projectDefinitionSelection,
} from "../src/requirements/definition-selection-catalogue.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";

const key = "supplies-stockroom";
const selection = {
  definitionKey: key,
  disposition: "supported-default",
  requirementId: "office-stockroom",
  title: "Office Supplies",
  outcome: "Keep a shared stockroom balance with recorded movements.",
  materialQuestions: [],
  businessParameters: null,
};
const cataloguePath = new URL(
  "../src/requirements/definitions/product-definitions.v1.json",
  import.meta.url,
);
const definition = () => {
  const row = loadProductDefinitionData().definitions.find(
    (row) => row.definitionKey === key,
  );
  expect(row, "Canonical stockroom definition must be admitted.").toBeDefined();
  return row!;
};

// These authored responses test schema/routing/retention, not model fit accuracy.
const unsupported = [
  [
    "fractional quantities",
    "business-rule",
    "Must stock use fractional quantities?",
  ],
  [
    "multiple units",
    "business-rule",
    "Must stock support multiple units or unit conversion?",
  ],
  [
    "multiple locations",
    "business-rule",
    "Must stock span multiple locations or transfers?",
  ],
  [
    "private identity",
    "authorization",
    "Must stock be private to authenticated users?",
  ],
  [
    "tenant isolation",
    "authorization",
    "Must separate tenants have isolated stock?",
  ],
  [
    "outbound notification",
    "integration",
    "Must stock changes send outbound notifications?",
  ],
  [
    "offline mutation",
    "integration",
    "Must stock changes work offline and synchronize?",
  ],
  [
    "external integration",
    "integration",
    "Must stock synchronize with another system?",
  ],
  ["barcode hardware", "integration", "Must stock use barcode hardware?"],
  ["serial", "data", "Must individual serial numbers be tracked?"],
  ["batch", "data", "Must stock be tracked by batch?"],
  ["expiry", "data", "Must stock track expiry dates?"],
  ["purchasing", "business-rule", "Must the stockroom manage purchasing?"],
  ["supplier records", "data", "Must supplier records be maintained?"],
  ["valuation", "business-rule", "Must stock carry financial valuation?"],
  ["payment", "integration", "Must the stockroom execute payments?"],
  ["reservation", "business-rule", "Must stock be reserved before issue?"],
  ["order fulfillment", "business-rule", "Must stock issue fulfill an order?"],
  [
    "borrower",
    "business-rule",
    "Must lending track borrowers and return obligations?",
  ],
  ["extra fields", "data", "Must stock items contain extra fields?"],
  ["custom roles", "role", "Must custom roles authorize stock movements?"],
  ["approval", "business-rule", "Must stock movements require approval?"],
  [
    "delete",
    "business-rule",
    "Must recorded stock movements be deleted or edited?",
  ],
  ["uploads", "data", "Must stock items support uploads or attachments?"],
  [
    "hosted deployment",
    "integration",
    "Must this run as a hosted production service?",
  ],
] as const;

describe("Supplies Stockroom canonical admission", () => {
  it("appends the exact family while preserving the first nine authored rows byte-for-byte and value-for-value", () => {
    const row = definition();
    expect(row).toMatchObject({
      definitionVersion: "1.0.0",
      familyBinding: {
        key: "inventory-operations",
        version: "inventory-operations/v1",
      },
      parameterPolicy: "none/v1",
      primaryJob: {
        actorKey: "stockkeeper",
        entityKey: "stock-movement",
        operation: "submit",
        successState: "recorded",
      },
      admissionExpectations: {
        presentation: {
          key: "inventory-operations-presentation",
          version: "1.0.0",
        },
        compilerProfile: "inventory-operations@1.0.0",
      },
      provenance: {
        origin: "factory-first-party",
        decision: "ADR-0065",
        license: "UNLICENSED",
      },
    });
    const raw = readFileSync(cataloguePath, "utf8"),
      data = JSON.parse(raw);
    expect(data.definitions).toHaveLength(13);
    expect(data.definitions[9].definitionKey).toBe(key);
    expect(
      createHash("sha256")
        .update(JSON.stringify(data.definitions.slice(0, 9)))
        .digest("hex"),
    ).toBe("150b842263613a2b8754c2cd4387c8b5972030a51be1fa837c89b63776852f12");
    expect(
      createHash("sha256").update(raw.slice(0, 222963)).digest("hex"),
    ).toBe("cca591797f808d3b621031f9853213d1fe7a05dc7958db0006315a4374a95759");
    expect(validateFamilyDefinition(row)).toEqual([]);
    expect(validateDefinitionBatch(Buffer.from(raw))).toMatchObject({
      attempted: 13,
      valid: 13,
      distinct: 13,
      admitted: 13,
      reasonCounts: {},
    });
    expect(row.canonical.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(row.canonical.spec),
    );
  });
  it("projects the canonical row into the frozen empty-store compiler profile", () => {
    const projected = projectDefinitionSelection(selection);
    expect(projected.clarifications).toEqual([]);
    expect(projected.spec.openQuestions).toEqual([]);
    expect(projected.blueprint.entities).toEqual(
      definition().canonical.blueprint.entities,
    );
    const input = JSON.parse(
      JSON.stringify(
        composeInventoryInput(projected.spec, projected.blueprint),
      ),
    );
    expect(input.graph.domain.seedData).toEqual([]);
    expect(
      selectInventoryOperationsProfile(input.graph, input.compositionLock),
    ).toMatchObject({
      key: "inventory-operations",
      itemEntity: "stock-item",
      movementEntity: "stock-movement",
      unit: "each",
      roles: { stockkeeper: "stockkeeper", observer: "observer" },
    });
  });
  it.each([
    "Build a supplies stockroom.",
    "Track individual office supplies received and issued from one cupboard.",
    "Track workshop spare parts with reasons for stock corrections.",
  ])(
    "routes authored supported selection for a coarse brief with zero technical questions: %s",
    async (brief) => {
      let includesGuide = false;
      const adapter = new OpenAIRequirementInterpreterAdapter({
        readEnvironment: () => "test-only",
        transport: {
          async create(request) {
            includesGuide = request.instructions.includes(
              definition().selection.providerInstruction,
            );
            return {
              outputText: JSON.stringify({
                resultKind: "definition-selection",
                definitionSelection: selection,
                generatedInterpretation: null,
              }),
            };
          },
        },
      });
      const result = await adapter.interpret({ brief, answers: {} });
      expect(includesGuide).toBe(true);
      expect(result.interpretation.clarifications).toEqual([]);
      expect(result.interpretation.spec.openQuestions).toEqual([]);
      expect(result.interpretation.blueprint.entities).toEqual(
        definition().canonical.blueprint.entities,
      );
    },
  );
  it.each(unsupported)(
    "retains %s questions and fails closed when an answer still requires the unsupported scope",
    async (term, category, question) => {
      expect(definition().selection.providerInstruction).toContain(term);
      const materialQuestions = [{ category, question }];
      const adapter = new OpenAIRequirementInterpreterAdapter({
        readEnvironment: () => "test-only",
        transport: {
          async create() {
            return {
              outputText: JSON.stringify({
                resultKind: "definition-selection",
                definitionSelection: {
                  ...selection,
                  disposition: "needs-clarification",
                  materialQuestions,
                },
                generatedInterpretation: null,
              }),
            };
          },
        },
      });
      const initial = await adapter.interpret({
        brief: `Build a stockroom requiring ${term}.`,
        answers: {},
      });
      const followed = await adapter.interpret({
        brief: `Build a stockroom requiring ${term}.`,
        answers: { "display-title": "Office supplies" },
        priorInterpretation: initial,
      });
      const clarification =
        initial.interpretation.clarifications[0]!.questions[0]!;
      const previous = structuredClone(followed);
      // Existing registered definitions reject an answered, still-unsupported
      // turn. They do not silently fulfill it or mutate the retained baseline.
      await expect(
        adapter.interpret({
          brief: `Build a stockroom requiring ${term}.`,
          answers: {
            [clarification.key]: "This capability is still required.",
          },
          clarificationContext: [
            { ...clarification, answer: "This capability is still required." },
          ],
          priorInterpretation: followed,
        }),
      ).rejects.toMatchObject({ code: "definition_scope_unresolved" });
      expect(followed).toEqual(previous);
      for (const result of [initial, followed]) {
        expect(result.interpretation.spec.openQuestions).toEqual(
          materialQuestions,
        );
        expect(
          result.interpretation.clarifications.flatMap((group) =>
            group.questions.map((row) => row.question),
          ),
        ).toEqual([question]);
        expect(result.interpretation.blueprint.entities).toEqual(
          definition().canonical.blueprint.entities,
        );
      }
    },
  );
  it("accepts an authored supported selection after explicit acceptance of the exact local scope", async () => {
    let accepted = false;
    const materialQuestions = [
      {
        category: "business-rule",
        question:
          "Can stock use only indivisible each units in one shared local pool?",
      },
    ];
    const adapter = new OpenAIRequirementInterpreterAdapter({
      readEnvironment: () => "test-only",
      transport: {
        async create() {
          return {
            outputText: JSON.stringify({
              resultKind: "definition-selection",
              definitionSelection: accepted
                ? selection
                : {
                    ...selection,
                    disposition: "needs-clarification",
                    materialQuestions,
                  },
              generatedInterpretation: null,
            }),
          };
        },
      },
    });
    const initial = await adapter.interpret({
      brief: "Build a stockroom with fractional quantities.",
      answers: {},
    });
    const clarification =
      initial.interpretation.clarifications[0]!.questions[0]!;
    accepted = true;
    const answer =
      "I accept indivisible each units in one shared local pool without fractional quantities.";
    const result = await adapter.interpret({
      brief: "Build a stockroom with fractional quantities.",
      answers: { [clarification.key]: answer },
      clarificationContext: [{ ...clarification, answer }],
      priorInterpretation: initial,
    });
    expect(result.interpretation.spec.openQuestions).toEqual([]);
    expect(result.interpretation.clarifications).toEqual([]);
    expect(result.interpretation.blueprint.entities).toEqual(
      definition().canonical.blueprint.entities,
    );
    expect(initial.interpretation.spec.openQuestions).toEqual(
      materialQuestions,
    );
  });
  it("retains independent unit, location, private identity and notification questions together", () => {
    const materialQuestions = [
      unsupported[0],
      unsupported[2],
      unsupported[3],
      unsupported[5],
    ].map(([, category, question]) => ({ category, question }));
    const projected = projectDefinitionSelection({
      ...selection,
      disposition: "needs-clarification",
      materialQuestions,
    });
    expect(projected.spec.openQuestions).toEqual(materialQuestions);
    expect(
      projected.clarifications.flatMap((group) => group.questions),
    ).toHaveLength(4);
    expect(
      definitionSelectionCatalogue.find((row) => row.definitionKey === key)
        ?.instruction,
    ).toContain("Only explicit acceptance");
  });
  it("rejects provider structure, unit, seed and execution overrides rather than widening the family", () => {
    for (const patch of [
      { businessParameters: { unit: "meter" } },
      { entities: [] },
      { seedData: [{ quantity: 12 }] },
      { routes: ["/custom"] },
      { capabilities: ["inventory.custom"] },
      { roles: ["manager"] },
      {
        materialQuestions: [
          { category: "runtime", question: "Which database?" },
        ],
      },
    ])
      expect(() =>
        projectDefinitionSelection({ ...selection, ...patch }),
      ).toThrow();
  });
});
