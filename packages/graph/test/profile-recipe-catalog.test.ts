import { describe, expect, it } from "vitest";

import {
  CompositionError,
  hashProfileRecipeCatalog,
  parseProfileRecipe,
  parseProfileRecipeCatalog,
  type ProfileRecipeCatalogV1,
  type ProfileRecipeV1,
} from "../src/index.js";

const recipeFixture: ProfileRecipeV1 = {
  id: "expense-approval",
  name: "Expense approval",
  domain: "internal-workflow",
  description: "Employees submit expenses that managers review and approve.",
  capabilities: [{ key: "core.workflow", version: "1.1.0" }],
  bindings: [
    {
      capabilityKey: "core.workflow",
      inputKey: "subjectEntity",
      required: true,
      target: "domain.entity",
    },
  ],
  surfaces: ["api", "flow"],
  acceptanceJourneys: ["submit-then-approve"],
  status: "anchor",
};

function catalogFixture(
  recipes: ProfileRecipeV1[] = [recipeFixture],
): ProfileRecipeCatalogV1 {
  return {
    apiVersion: "factory.profile-recipe-catalog/v1",
    schemaVersion: "v1",
    recipes,
  };
}

describe("ProfileRecipeV1", () => {
  it("parses a complete recipe", () => {
    expect(parseProfileRecipe(recipeFixture).id).toBe("expense-approval");
  });

  it("rejects a recipe referencing a capability without a version lock", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        capabilities: [{ key: "core.workflow" }],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a recipe whose capability lacks binding requirements", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        bindings: [],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a binding for a capability the recipe never declares", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        bindings: [
          {
            capabilityKey: "core.crud",
            inputKey: "entity",
            required: true,
            target: "domain.entity",
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects duplicate bindings and duplicate surfaces", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        bindings: [...recipeFixture.bindings, recipeFixture.bindings[0]],
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        surfaces: ["api", "api"],
      }),
    ).toThrow(CompositionError);
  });

  it("requires reason codes only for unsupported recipes", () => {
    expect(() =>
      parseProfileRecipe({ ...recipeFixture, status: "unsupported" }),
    ).toThrow(CompositionError);
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        status: "composable",
        reasonCodes: ["missing fixture evidence"],
      }),
    ).toThrow(CompositionError);
    expect(
      parseProfileRecipe({
        ...recipeFixture,
        status: "unsupported",
        reasonCodes: ["no two-Profile evidence"],
      }).status,
    ).toBe("unsupported");
  });

  it("requires anchors to serve at least two capabilities and one journey", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        status: "anchor",
        acceptanceJourneys: [],
      }),
    ).toThrow(CompositionError);
    expect(
      parseProfileRecipe({
        ...recipeFixture,
        status: "composable",
      }).status,
    ).toBe("composable");
  });

  it("rejects URLs and package paths in recipe text", () => {
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        description: "Integrates with https://ledger.example.com.",
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseProfileRecipe({
        ...recipeFixture,
        name: "expense-approval",
        description: "Source: ../secrets.",
      }),
    ).toThrow(CompositionError);
  });
});

describe("ProfileRecipeCatalogV1", () => {
  it("parses a catalog with multiple recipes", () => {
    const catalog = parseProfileRecipeCatalog(
      catalogFixture([
        recipeFixture,
        { ...recipeFixture, id: "expense-approval-hr" },
      ]),
    );
    expect(catalog.recipes).toHaveLength(2);
  });

  it("rejects duplicate recipe ids", () => {
    expect(() =>
      parseProfileRecipeCatalog(catalogFixture([recipeFixture, recipeFixture])),
    ).toThrow(CompositionError);
  });

  it("accepts anchor and composable recipes in one catalog", () => {
    const catalog = parseProfileRecipeCatalog(
      catalogFixture([
        recipeFixture,
        {
          ...recipeFixture,
          id: "expense-reporting",
          status: "composable",
          capabilities: [{ key: "core.crud", version: "1.0.1" }],
          bindings: [
            {
              capabilityKey: "core.crud",
              inputKey: "entity",
              required: true,
              target: "domain.entity",
            },
          ],
        },
      ]),
    );
    expect(catalog.recipes).toHaveLength(2);
  });

  it("hashes canonically regardless of object key order", () => {
    const catalog = parseProfileRecipeCatalog(catalogFixture());
    const first = hashProfileRecipeCatalog(catalog);
    const reordered: unknown = {
      apiVersion: catalog.apiVersion,
      recipes: catalog.recipes,
      schemaVersion: catalog.schemaVersion,
    };
    expect(hashProfileRecipeCatalog(reordered)).toBe(first);
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
