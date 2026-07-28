import { describe, expect, it } from "vitest";

import { resolveOpenAIModel } from "../src/graph-proposal.provider.js";

describe("resolveOpenAIModel", () => {
  it("uses the explicit environment model without reading or exposing the API key", () => {
    expect(
      resolveOpenAIModel({
        OPENAI_API_KEY: "must-not-affect-model-selection",
        OPENAI_MODEL: "gpt-5-mini",
      }),
    ).toBe("gpt-5-mini");
  });

  it("falls back to the safe default when the configured model is absent or blank", () => {
    expect(resolveOpenAIModel({})).toBe("gpt-5");
    expect(resolveOpenAIModel({ OPENAI_MODEL: "   " })).toBe("gpt-5");
  });
});
