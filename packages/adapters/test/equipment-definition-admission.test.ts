import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  loadProductDefinitionData,
  validateDefinitionBatch,
} from "../src/requirements/product-definition-data.js";
import {
  createDefinitionEntry,
  semanticFingerprint,
} from "../src/requirements/definition-family-registry.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";

const definitionKey = "equipment-procurement-approval";
const positive = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};
const selection = {
  definitionKey,
  disposition: "supported-default",
  requirementId: "equipment-procurement-admission",
  title: "Equipment Procurement Approval",
  outcome: "Review single-item equipment requests with calculated totals.",
  materialQuestions: [],
  businessParameters: null,
};
function definition() {
  const result = loadProductDefinitionData().definitions.find(
    (entry) => entry.definitionKey === definitionKey,
  );
  expect(
    result,
    "The reviewed Equipment definition must be registered.",
  ).toBeDefined();
  return result!;
}
async function interpret(
  candidate: unknown,
  brief: string,
  captureInstructions?: (instructions: string) => void,
) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-only",
    transport: {
      async create(request) {
        captureInstructions?.(request.instructions);
        return { outputText: JSON.stringify(candidate) };
      },
    },
  }).interpret({ brief, answers: {} });
}
const envelope = (value: unknown) => ({
  resultKind: "definition-selection",
  definitionSelection: value,
  generatedInterpretation: null,
});

describe("Equipment procurement definition admission", () => {
  it("admits the seven historical definitions through the independent batch boundary", () => {
    const historicalKeys = [
      "restaurant-ordering",
      "expense-approval",
      "purchase-request-approval",
      "team-task-tracking",
      "publication-review",
      "training-funding-approval",
      definitionKey,
    ];
    const catalogue = JSON.parse(
      readFileSync(
        new URL(
          "../src/requirements/definitions/product-definitions.v1.json",
          import.meta.url,
        ),
      ).toString("utf8"),
    );
    const historicalDefinitions = catalogue.definitions.filter(
      (entry: { definitionKey: string }) =>
        historicalKeys.includes(entry.definitionKey),
    );
    expect(
      historicalDefinitions.map(
        (entry: { definitionKey: string }) => entry.definitionKey,
      ),
    ).toEqual(historicalKeys);
    const report = validateDefinitionBatch(
      Buffer.from(
        JSON.stringify({
          apiVersion: catalogue.apiVersion,
          definitions: historicalDefinitions,
        }),
      ),
    );
    expect(report).toMatchObject({
      attempted: 7,
      valid: 7,
      distinct: 7,
      admitted: 7,
      reasonCounts: {},
    });
    const fingerprint = semanticFingerprint(definition());
    for (const previous of loadProductDefinitionData().definitions.filter(
      (entry) => entry.definitionKey !== definitionKey,
    ))
      expect(semanticFingerprint(previous)).not.toBe(fingerprint);
  });

  it("freezes the five required fields, explicit bounds and server-owned total", () => {
    const row = definition();
    expect(row.familyBinding).toEqual({
      key: "approval",
      version: "approval-correction/v1",
    });
    expect(row.parameterPolicy).toBe("none/v1");
    expect(row.canonical.blueprint.entities[0]!.fields).toEqual([
      { key: "itemName", label: "Item name", type: "text", required: true },
      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        required: true,
        numericDomain: positive,
      },
      {
        key: "unitPrice",
        label: "Unit price",
        type: "currency",
        required: true,
        numericDomain: positive,
      },
      {
        key: "total",
        label: "Total",
        type: "currency",
        required: true,
        calculation: {
          apiVersion: "factory.quantity-unit-price-total/v1",
          quantityFieldKey: "quantity",
          unitPriceFieldKey: "unitPrice",
        },
      },
      {
        key: "justification",
        label: "Justification",
        type: "long-text",
        required: true,
      },
    ]);
    expect(row.canonical.blueprint.actors.map((actor) => actor.key)).toEqual([
      "employee",
      "manager",
      "finance",
    ]);
    expect(row.canonical.blueprint.actors[2]!.permissions).toEqual([
      { entityKey: "equipment-request", actions: ["read", "audit"] },
    ]);
    expect(
      row.canonical.blueprint.pageIntents.map((page) => page.label),
    ).toEqual([
      "Equipment request dashboard",
      "All equipment requests",
      "New equipment request",
      "Equipment request detail",
      "Approval queue",
      "Equipment request settings",
    ]);
    expect(
      row.canonical.blueprint.workflows[0]!.transitions.map(
        ({ key, from, to, actorKey }) => [key, from, to, actorKey],
      ),
    ).toEqual([
      ["submit", "draft", "submitted", "employee"],
      ["approve", "submitted", "approved", "manager"],
      ["reject", "submitted", "returned", "manager"],
      ["update", "returned", "draft", "employee"],
    ]);
  });

  it("projects the reviewed selection and composes identical coherent seed triples", () => {
    const entry = createDefinitionEntry(definition());
    const first = entry.project(selection),
      second = entry.project(selection);
    expect(second).toEqual(first);
    expect(first.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(first.spec),
    );
    const compose = () => {
      const baseDraft = createBlankApplicationDraft({
        applicationId: selection.requirementId,
        workspaceId: "local-workspace",
        name: selection.title,
      });
      const [standard] = planProductAlternatives({
        requirement: first.spec,
        blueprint: first.blueprint,
        baseDraft,
      });
      const diff = composeProductDraft({
        plan: standard!.plan,
        blueprint: first.blueprint,
        baseDraft,
      }).diff;
      return { diff, graph: applyGraphDiffToDraft(baseDraft, diff).graph };
    };
    const a = compose(),
      b = compose();
    expect(b).toEqual(a);
    expect(
      a.graph.domain.seedData!.find(
        (row) => row.entity === "equipment-request",
      )!.values,
    ).toMatchObject({ quantity: 12, unitPrice: 125.5, total: 1506 });
    expect(
      a.graph.domain.entities
        .find((entity) => entity.key === "equipment-request")!
        .fields.find((field) => field.key === "total")!.calculation,
    ).toEqual({
      apiVersion: "factory.quantity-unit-price-total/v1",
      quantityFieldKey: "quantity",
      unitPriceFieldKey: "unitPrice",
    });
  });

  it("accepts an authored supported selection without inventing routine questions", async () => {
    const result = await interpret(
      envelope(selection),
      "Create a local equipment procurement approval demo for one item per request, with positive quantity, positive unit price, calculated total and justification. Employees request, a manager returns or approves, and finance audits.",
    );
    expect(result.interpretation.clarifications).toEqual([]);
    expect(result.interpretation.blueprint.entities[0]!.fields).toEqual(
      definition().canonical.blueprint.entities[0]!.fields,
    );
  });

  it("sends complete inventory exclusions in the Equipment provider guidance", async () => {
    let instructions = "";
    await interpret(
      envelope(selection),
      "Build local equipment procurement approval.",
      (value) => {
        instructions = value;
      },
    );
    const guide = instructions
      .split("Every Equipment Procurement Approval brief")[1]
      ?.split("</supported-equipment-procurement-default>")[0];
    expect(guide).toBeDefined();
    expect(guide?.includes("inventory tracking")).toBe(true);
    expect(guide?.includes("stock changes")).toBe(true);
    expect(guide?.includes("inventory reservation")).toBe(true);
    expect(definition().canonical.spec.acceptanceScenarios[0]!.given).toBe(
      "an employee with an equipment request",
    );
    expect(JSON.stringify(definition()).includes("a equipment request")).toBe(
      false,
    );
  });

  it.each([
    [
      "integration",
      "Must the application track equipment inventory?",
      "Track equipment inventory alongside approvals.",
    ],
    [
      "integration",
      "Must approval change stock levels?",
      "Increase stock when equipment is approved.",
    ],
    [
      "business-rule",
      "Must free or zero-cost equipment be supported?",
      "Include equipment that is free.",
    ],
    [
      "data",
      "Must one request contain multiple line items?",
      "Request several different equipment items on one request.",
    ],
    [
      "business-rule",
      "Must taxes or discounts change the calculated total?",
      "Calculate tax on equipment requests.",
    ],
    [
      "integration",
      "Must approval execute a payment?",
      "Pay the supplier after approval.",
    ],
    [
      "visibility",
      "Must employees have private requester-only records?",
      "Hide each request from other employees.",
    ],
  ])(
    "retains the material %s question: %s",
    async (category, question, brief) => {
      const materialQuestions = [{ category, question }];
      const result = await interpret(
        envelope({
          ...selection,
          disposition: "needs-clarification",
          materialQuestions,
        }),
        brief,
      );
      expect(result.interpretation.spec.openQuestions).toEqual(
        materialQuestions,
      );
      expect(
        result.interpretation.clarifications.flatMap((group) =>
          group.questions.map((item) => item.question),
        ),
      ).toEqual([question]);
      expect(result.interpretation.blueprint.entities[0]!.fields).toEqual(
        definition().canonical.blueprint.entities[0]!.fields,
      );
    },
  );

  it("preserves independent exclusions and rejects provider-authored structural overrides", async () => {
    const questions = [
      {
        category: "business-rule",
        question: "Must free equipment be supported?",
      },
      {
        category: "data",
        question: "Must a request support multiple line items?",
      },
      { category: "business-rule", question: "Must totals include tax?" },
      { category: "integration", question: "Must approval execute payments?" },
    ];
    const result = await interpret(
      envelope({
        ...selection,
        disposition: "needs-clarification",
        materialQuestions: questions,
      }),
      "Request free equipment with multiple lines, tax and payments.",
    );
    expect(result.interpretation.spec.openQuestions).toEqual(questions);
    for (const override of [
      { calculation: null },
      { fields: [] },
      { businessParameters: { total: 10 } },
    ])
      await expect(
        interpret(
          envelope({ ...selection, ...override }),
          "Build equipment procurement approval.",
        ),
      ).rejects.toMatchObject({ code: "output_invalid" });
  });
});
