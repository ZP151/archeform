import { describe, expect, it } from "vitest";

import {
  getCapabilityAsset,
  resolveCapabilityComposition,
} from "@factory/capabilities";
import { createProfileDraft, profileStarterOptions } from "./profile-starters";

describe("profile starters", () => {
  it("creates independent Draft graphs for every accepted-profile starter", () => {
    expect(profileStarterOptions.map((starter) => starter.profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ]);

    const expense = createProfileDraft("expense-approval");
    const restaurant = createProfileDraft("restaurant-ordering");
    const ecommerce = createProfileDraft("simple-ecommerce");
    const retail = createProfileDraft("retail-counter");
    const grocery = createProfileDraft("grocery-pickup");

    expect(expense.metadata.name).toBe("Expense approval");
    expect(restaurant.metadata.name).toBe("Restaurant ordering");
    expect(ecommerce.metadata.name).toBe("Simple ecommerce");
    expect(retail.metadata.name).toBe("Retail counter");
    expect(grocery.metadata.name).toBe("Grocery pickup");
    expect(expense.metadata.id).not.toBe(restaurant.metadata.id);
    expect(restaurant.integration.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "catalog.list" }),
      ]),
    );
  });

  it("does not expose the frozen capability starter as a mutable Workbench Draft", () => {
    const first = createProfileDraft("expense-approval");
    first.metadata.name = "Changed locally";

    expect(createProfileDraft("expense-approval").metadata.name).toBe(
      "Expense approval",
    );
  });

  it("composes every active profile from canonical Graph-symbol selections", () => {
    const expectedPackageCounts = {
      "expense-approval": 4,
      "restaurant-ordering": 18,
      "simple-ecommerce": 14,
      "retail-counter": 14,
      "grocery-pickup": 14,
    } as const;

    for (const { profile } of profileStarterOptions) {
      const graph = createProfileDraft(profile);
      const selections = graph.integration.compositionSelections ?? [];

      expect(graph.integration).not.toHaveProperty("assetLocks");
      expect(selections).toHaveLength(expectedPackageCounts[profile]);
      expect(resolveCapabilityComposition({ selections }).packages).toEqual(
        selections,
      );
      for (const selection of selections) {
        const requiredParameters =
          getCapabilityAsset(selection.lock.key).manifest.parameters?.filter(
            ({ required }) => required,
          ) ?? [];
        for (const parameter of requiredParameters) {
          expect(selection.bindings).toHaveProperty(parameter.key);
        }
      }
    }

    const restaurant = createProfileDraft("restaurant-ordering").integration
      .compositionSelections!;
    const ecommerce =
      createProfileDraft("simple-ecommerce").integration.compositionSelections!;
    const ecommercePackageKeys = new Set(ecommerce.map(({ lock }) => lock.key));
    expect(
      restaurant
        .filter(({ lock }) => ecommercePackageKeys.has(lock.key))
        .map(({ lock }) => lock)
        .sort((left, right) => left.key.localeCompare(right.key)),
    ).toEqual(
      ecommerce
        .filter(({ lock }) =>
          restaurant.some((item) => item.lock.key === lock.key),
        )
        .map(({ lock }) => lock)
        .sort((left, right) => left.key.localeCompare(right.key)),
    );
    expect(restaurant.map(({ lock }) => lock.key)).toEqual(
      expect.arrayContaining([
        "restaurant.table-session",
        "restaurant.ordering",
        "restaurant.kitchen",
        "restaurant.cashier",
        "restaurant.reporting",
      ]),
    );
    expect(restaurant.map(({ lock }) => lock.key)).not.toContain(
      "commerce.simulated-payment",
    );
    expect(ecommerce.map(({ lock }) => lock.key)).toContain(
      "commerce.simulated-payment",
    );
    expect(restaurant.map(({ bindings }) => bindings)).not.toEqual(
      ecommerce.map(({ bindings }) => bindings),
    );
  });
});
