import { describe, it, expect } from "vitest";
import { canonicalExpenseApprovalInterpretation } from "../src/requirements/approval-definition-selection.js";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
const positive = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};
function candidate(type = "currency", domain: unknown = positive) {
  const canonical = structuredClone(canonicalExpenseApprovalInterpretation());
  const blueprint: any = canonical.blueprint;
  delete blueprint.requirementChecksum;
  blueprint.entities[0].fields.find(
    (f: any) => f.key === "amount",
  ).numericDomain = domain;
  blueprint.entities[0].fields.find((f: any) => f.key === "amount").type = type;
  return {
    resultKind: "generated-blueprint",
    definitionSelection: null,
    generatedInterpretation: { spec: canonical.spec, blueprint },
  };
}
async function interpret(value: unknown) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-only",
    transport: {
      async create() {
        return { outputText: JSON.stringify(value) };
      },
    },
  }).interpret({
    brief: "Create approval requests with an explicitly positive amount.",
    answers: {},
  });
}
describe("numeric authoring provider boundary", () => {
  it("retains explicit numeric rules in canonical output", async () => {
    const result = await interpret(candidate());
    expect(
      result.interpretation.blueprint.entities[0]!.fields.find(
        (f) => f.key === "amount",
      )!.numericDomain,
    ).toEqual(positive);
  });
  it("removes nullable provider absence without adding a canonical key", async () => {
    const result = await interpret(candidate("currency", null));
    expect(
      Object.hasOwn(
        result.interpretation.blueprint.entities[0]!.fields.find(
          (f) => f.key === "amount",
        )!,
        "numericDomain",
      ),
    ).toBe(false);
  });
  it.each(["text", "date", "boolean"])(
    "rejects a policy on %s",
    async (type) => {
      await expect(interpret(candidate(type))).rejects.toThrow();
    },
  );
  it.each([
    { ...positive, extra: true },
    { ...positive, minimum: { value: 0 } },
    { ...positive, minimum: { value: "0", inclusive: false } },
    { ...positive, minimum: { value: 0.5, inclusive: false } },
  ])("rejects malformed integer domains", async (domain) => {
    await expect(interpret(candidate("number", domain))).rejects.toThrow();
  });
});
