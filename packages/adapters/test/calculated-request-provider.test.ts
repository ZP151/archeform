import { describe, it, expect } from "vitest";
import { canonicalExpenseApprovalInterpretation } from "../src/requirements/approval-definition-selection.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
const positive = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};
function candidate() {
  const canonical = structuredClone(canonicalExpenseApprovalInterpretation());
  const blueprint: any = canonical.blueprint;
  delete blueprint.requirementChecksum;
  blueprint.entities[0].fields = [
    {
      key: "item",
      label: "Item",
      type: "text",
      required: true,
      calculation: null,
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      numericDomain: positive,
      calculation: null,
    },
    {
      key: "price",
      label: "Unit price",
      type: "currency",
      required: true,
      numericDomain: positive,
      calculation: null,
    },
    {
      key: "total",
      label: "Total",
      type: "currency",
      required: true,
      calculation: {
        apiVersion: "factory.quantity-unit-price-total/v1",
        quantityFieldKey: "quantity",
        unitPriceFieldKey: "price",
      },
    },
  ];
  return {
    resultKind: "generated-blueprint",
    definitionSelection: null,
    generatedInterpretation: { spec: canonical.spec, blueprint },
  };
}
async function interpret(value: unknown, requests: any[] = []) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-only",
    transport: {
      async create(request) {
        requests.push(request);
        return { outputText: JSON.stringify(value) };
      },
    },
  }).interpret({
    brief: "Calculate request total as quantity times unit price.",
    answers: {},
  });
}
describe("calculated provider authoring", () => {
  it("retains the closed rule and removes null absence", async () => {
    const result = await interpret(candidate());
    const fields = result.interpretation.blueprint.entities[0]!.fields;
    expect(fields[0]).not.toHaveProperty("calculation");
    expect(fields[3]!.calculation).toEqual(
      candidate().generatedInterpretation.blueprint.entities[0].fields[3]
        .calculation,
    );
  });
  it("restricts strict provider variants and gives explicit-only guidance", async () => {
    const requests: any[] = [];
    await interpret(candidate(), requests);
    const json = JSON.stringify(requests[0].jsonSchema);
    expect(json).toContain("factory.quantity-unit-price-total/v1");
    expect(JSON.stringify(requests[0])).toContain(
      "explicitly requested quantity-times-unit-price",
    );
  });
  it.each([
    "wrong-type",
    "extra",
    "missing-reference",
    "self",
    "output-domain",
  ])("rejects %s", async (kind) => {
    const value = candidate(),
      fields = value.generatedInterpretation.blueprint.entities[0].fields;
    if (kind === "wrong-type") fields[3].type = "number";
    if (kind === "extra") fields[3].calculation.expression = "quantity*price";
    if (kind === "missing-reference")
      fields[3].calculation.quantityFieldKey = "missing";
    if (kind === "self") fields[3].calculation.quantityFieldKey = "total";
    if (kind === "output-domain") fields[3].numericDomain = positive;
    await expect(interpret(value)).rejects.toThrow();
  });
});
