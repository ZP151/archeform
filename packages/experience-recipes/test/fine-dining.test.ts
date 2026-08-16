import { describe, expect, it } from "vitest";

import { fineDiningRecipe, validateFineDiningRecipe } from "../src/index.js";

describe("Fine Dining experience recipe", () => {
  it("provides independent light and dark tokens with restrained motion", () => {
    expect(fineDiningRecipe.key).toBe("fine-dining");
    expect(fineDiningRecipe.tokens.light.surface).toBeTruthy();
    expect(fineDiningRecipe.tokens.dark.surface).toBeTruthy();
    expect(fineDiningRecipe.motion.reduced).toBe("none");
    expect(fineDiningRecipe.responsive).toEqual([
      "mobile",
      "tablet",
      "desktop",
    ]);
  });

  it("keeps Fine Dining as tokens and parameters rather than style-only registry keys", () => {
    expect(fineDiningRecipe.version).toBe("1.0.0");
    expect(fineDiningRecipe.tokens.light.accent).toBeTruthy();
    expect(fineDiningRecipe.tokens.dark.accent).toBeTruthy();
    expect(fineDiningRecipe.parameters).toContain("density");
    expect(fineDiningRecipe.accessibility.focusVisible).toBe(true);
  });

  it("is immutable and rejects token, motion, parameter, or accessibility drift", () => {
    expect(Object.isFrozen(fineDiningRecipe)).toBe(true);
    expect(Object.isFrozen(fineDiningRecipe.tokens.light)).toBe(true);
    for (const mutate of [
      (recipe: ReturnType<typeof structuredClone<typeof fineDiningRecipe>>) =>
        (recipe.tokens.light.accent = "#000000"),
      (recipe: ReturnType<typeof structuredClone<typeof fineDiningRecipe>>) =>
        recipe.parameters.reverse(),
      (recipe: ReturnType<typeof structuredClone<typeof fineDiningRecipe>>) =>
        (recipe.motion.reduced = "full"),
    ]) {
      const changed = structuredClone(fineDiningRecipe);
      mutate(changed);
      expect(() => validateFineDiningRecipe(changed)).toThrow("exact frozen");
    }
  });
});
