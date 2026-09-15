import { describe, expect, it } from "vitest";
import { OpenAIRequirementInterpreterAdapter } from "../src/requirements/openai-interpreter.js";
import * as contract from "../src/requirements/requirement-interpreter.js";
const parameters = {
  apiVersion: "factory.restaurant-menu-parameters/v1",
  mode: "provided",
  currency: "USD",
  items: [
    { name: "Soup", description: null, priceMinor: 599 },
    { name: "Rice", description: null, priceMinor: 1000 },
    { name: "Cake", description: null, priceMinor: 1234 },
  ],
};
function provider(menu: unknown = parameters, questions: unknown[] = []) {
  return {
    resultKind: "definition-selection",
    generatedInterpretation: null,
    definitionSelection: {
      definitionKey: "restaurant-ordering",
      disposition: questions.length
        ? "needs-clarification"
        : "supported-default",
      requirementId: "supplied-menu",
      title: "Local restaurant",
      outcome: "Guests order dishes.",
      materialQuestions: questions,
      businessParameters: menu,
    },
  };
}
function adapter(output: unknown) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-key",
    model: "test-model",
    transport: {
      create: async () => ({ outputText: JSON.stringify(output) }),
    } as never,
  });
}
describe("Restaurant interpretation result menu carrier", () => {
  it("exports exact versioned result validation", () =>
    expect((contract as any).assertRequirementInterpretationResult).toBeTypeOf(
      "function",
    ));
  it("carries a complete three-item USD menu in the versioned wrapper", async () => {
    const result = await adapter(provider()).interpret({
      brief: "Three supplied dishes.",
      answers: {},
    });
    expect(result).toMatchObject({
      apiVersion: "factory.requirement-interpretation-result/v1",
      businessParameters: parameters,
      interpretation: { spec: { productType: "restaurant-ordering" } },
    });
  });
  it("allows incomplete menu only with a consolidated data question", async () => {
    const result = await adapter(
      provider(null, [
        {
          category: "data",
          question: "What is the missing dish price in USD?",
        },
      ]),
    ).interpret({ brief: "Incomplete dish.", answers: {} });
    expect(result).toMatchObject({
      businessParameters: null,
      interpretation: {
        clarifications: [{ questions: [{ category: "data" }] }],
      },
    });
  });
  it("rejects non-USD or incomplete material silently claimed complete", async () => {
    for (const menu of [{ ...parameters, currency: "EUR" }, null])
      await expect(
        adapter(provider(menu)).interpret({ brief: "Dishes.", answers: {} }),
      ).rejects.toThrow();
  });
  it("preserves a complete menu through an unrelated clarification and refuses silent menu loss", async () => {
    const question = {
      category: "integration",
      question: "Can payment remain simulated?",
    };
    const priorInterpretation = await adapter(
      provider(parameters, [question]),
    ).interpret({ brief: "Dishes and payment.", answers: {} });
    const context = [
      {
        key: "q-payment",
        category: "integration" as const,
        defaultPolicy: "required" as const,
        question: question.question,
        answer: "Use simulated payment.",
      },
    ];
    const result = await adapter(provider(parameters)).interpret({
      brief: "Dishes and payment.",
      answers: { "q-payment": "Use simulated payment." },
      priorInterpretation,
      clarificationContext: context,
    });
    expect(result.businessParameters).toEqual(parameters);
    await expect(
      adapter(
        provider({
          apiVersion: "factory.restaurant-menu-parameters/v1",
          mode: "canonical-default",
          currency: "USD",
          items: [],
        }),
      ).interpret({
        brief: "Dishes and payment.",
        answers: { "q-payment": "Use simulated payment." },
        priorInterpretation,
        clarificationContext: context,
      }),
    ).rejects.toThrow();
  });

  it("refuses inner accessors without invoking them", async () => {
    const result = await adapter(provider()).interpret({
      brief: "Dishes.",
      answers: {},
    });
    let read = false;
    Object.defineProperty(result.interpretation, "spec", {
      enumerable: true,
      get() {
        read = true;
        throw new Error("Accessor invoked");
      },
    });
    expect(() =>
      contract.assertRequirementInterpretationResult(result),
    ).toThrow();
    expect(read).toBe(false);
  });
  it.each(["unchanged", "dropped", "changed"])(
    "locks a prior supplied menu through unsupported stock data clarification: %s",
    async (mode) => {
      const question = {
        category: "data",
        question: "The requested stock is unsupported. Accept standard stock?",
      };
      const priorInterpretation = await adapter(
        provider(parameters, [question]),
      ).interpret({ brief: "Dishes and stock.", answers: {} });
      const next =
        mode === "dropped"
          ? {
              apiVersion: "factory.restaurant-menu-parameters/v1",
              mode: "canonical-default",
              currency: "USD",
              items: [],
            }
          : mode === "changed"
            ? {
                ...parameters,
                items: parameters.items.map((item) => ({
                  ...item,
                  priceMinor: item.priceMinor + 1,
                })),
              }
            : parameters;
      const promise = adapter(provider(next)).interpret({
        brief: "Dishes and stock.",
        answers: { "q-stock": "Accept standard stock." },
        priorInterpretation,
        clarificationContext: [
          {
            key: "q-stock",
            category: "data",
            defaultPolicy: "required",
            question: question.question,
            answer: "Accept standard stock.",
          },
        ],
      });
      if (mode === "unchanged")
        expect((await promise).businessParameters).toEqual(parameters);
      else
        await expect(promise).rejects.toMatchObject({ code: "output_invalid" });
    },
  );
  it("fills an incomplete null prior menu after the missing price is supplied", async () => {
    const question = {
      category: "data",
      question: "What is the missing dish price in USD?",
    };
    const priorInterpretation = await adapter(
      provider(null, [question]),
    ).interpret({ brief: "Dishes.", answers: {} });
    const result = await adapter(provider(parameters)).interpret({
      brief: "Dishes.",
      answers: { "q-price": "USD 5.99" },
      priorInterpretation,
      clarificationContext: [
        {
          key: "q-price",
          category: "data",
          defaultPolicy: "required",
          question: question.question,
          answer: "USD 5.99",
        },
      ],
    });
    expect(result.businessParameters).toEqual(parameters);
  });
  it.each(["integration", "data"] as const)(
    "keeps the canonical menu through an unrelated %s clarification without invented dishes",
    async (category) => {
      const canonical = {
        apiVersion: "factory.restaurant-menu-parameters/v1",
        mode: "canonical-default",
        currency: "USD",
        items: [],
      };
      const question = {
        category,
        question: "Can this unsupported requirement use the standard default?",
      };
      const priorInterpretation = await adapter(
        provider(canonical, [question]),
      ).interpret({
        brief: "Standard menu with an unsupported requirement.",
        answers: {},
      });
      const request = {
        brief: "Standard menu with an unsupported requirement.",
        answers: { "q-default": "Use the standard default." },
        priorInterpretation,
        clarificationContext: [
          {
            key: "q-default",
            category,
            defaultPolicy: "required" as const,
            question: question.question,
            answer: "Use the standard default.",
          },
        ],
      };
      expect(
        (await adapter(provider(canonical)).interpret(request))
          .businessParameters,
      ).toEqual(canonical);
      await expect(
        adapter(provider(parameters)).interpret(request),
      ).rejects.toMatchObject({ code: "output_invalid" });
    },
  );
});
