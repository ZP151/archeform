import { describe, expect, it } from "vitest";

import { createProfileDraft, profileStarterOptions } from "./profile-starters";

describe("profile starters", () => {
  it("creates independent Draft graphs for every accepted-profile starter", () => {
    expect(profileStarterOptions.map((starter) => starter.profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
    ]);

    const expense = createProfileDraft("expense-approval");
    const restaurant = createProfileDraft("restaurant-ordering");
    const ecommerce = createProfileDraft("simple-ecommerce");

    expect(expense.metadata.name).toBe("Expense approval");
    expect(restaurant.metadata.name).toBe("Restaurant ordering");
    expect(ecommerce.metadata.name).toBe("Simple ecommerce");
    expect(expense.metadata.id).not.toBe(restaurant.metadata.id);
    expect(restaurant.integration.capabilities).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "catalog.list" })]),
    );
  });

  it("does not expose the frozen capability starter as a mutable Workbench Draft", () => {
    const first = createProfileDraft("expense-approval");
    first.metadata.name = "Changed locally";

    expect(createProfileDraft("expense-approval").metadata.name).toBe(
      "Expense approval",
    );
  });
});
