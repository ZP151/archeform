import { describe, expect, it } from "vitest";

import {
  restaurantOrderingRecipe,
  selectRestaurantOrderingSource,
  validateRestaurantOrderingRecipe,
} from "../src/index.js";

describe("Restaurant Ordering product recipe", () => {
  it("closes the frozen screen, experience, source, and journey selection", () => {
    expect(restaurantOrderingRecipe.apiVersion).toBe(
      "factory.ui-product-recipe/v1",
    );
    expect(restaurantOrderingRecipe.key).toBe("restaurant-ordering");
    expect(restaurantOrderingRecipe.experienceKey).toBe("fine-dining");
    expect(restaurantOrderingRecipe.screenRecipeKeys).toHaveLength(15);
    expect(restaurantOrderingRecipe.acceptanceJourneyKeys).toHaveLength(7);
    expect(validateRestaurantOrderingRecipe(restaurantOrderingRecipe)).toEqual({
      valid: true,
    });
  });

  it("owns all pages exactly once while preserving visible customer navigation", () => {
    const [customer, merchant] = restaurantOrderingRecipe.surfaces;
    expect(customer!.ownedPageKeys).toEqual([
      "customer-home",
      "customer-menu",
      "customer-dish-detail",
      "customer-cart",
      "customer-checkout",
      "customer-orders",
      "customer-order-detail",
      "customer-profile",
    ]);
    expect(customer!.navigation.items.map((item) => item.pageKey)).toEqual([
      "customer-home",
      "customer-menu",
      "customer-cart",
      "customer-orders",
      "customer-profile",
    ]);
    expect(merchant!.ownedPageKeys).toHaveLength(7);
    expect(
      new Set(
        restaurantOrderingRecipe.surfaces.flatMap(
          (surface) => surface.ownedPageKeys,
        ),
      ).size,
    ).toBe(15);
  });

  it("rejects a visible navigation target that is not owned by its surface", () => {
    const invalid = structuredClone(restaurantOrderingRecipe);
    invalid.surfaces[0]!.navigation.items.push({
      pageKey: "merchant-dashboard",
      label: "Dashboard",
      icon: "layout-dashboard",
    });
    expect(() => validateRestaurantOrderingRecipe(invalid)).toThrow(
      "not owned",
    );
  });

  it("rejects an invented owned page even when the ownership count stays at fifteen", () => {
    const invalid = structuredClone(restaurantOrderingRecipe);
    invalid.surfaces[0]!.ownedPageKeys[2] = "customer-loyalty";
    expect(() => validateRestaurantOrderingRecipe(invalid)).toThrow(
      "Frozen owned-page set",
    );
  });

  it("closes exact roles, navigation, journeys, source, and screenshot fixtures immutably", () => {
    expect(restaurantOrderingRecipe.roles).toEqual([
      "customer",
      "cashier",
      "kitchen",
      "manager",
    ]);
    expect(restaurantOrderingRecipe.screenshotFixtureIds).toHaveLength(90);
    expect(restaurantOrderingRecipe.screenshotFixtureIds[0]).toBe(
      "customer-home-loading",
    );
    expect(restaurantOrderingRecipe.screenshotFixtureIds.at(-1)).toBe(
      "merchant-settings-denial",
    );
    expect(Object.isFrozen(restaurantOrderingRecipe)).toBe(true);
    expect(Object.isFrozen(restaurantOrderingRecipe.surfaces[0])).toBe(true);
  });

  it("rejects every exact product-selection mutation", () => {
    for (const mutate of [
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => (recipe.version = "9.9.9"),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => (recipe.screenRecipeKeys[0] = "invented-screen"),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => recipe.acceptanceJourneyKeys.reverse(),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => recipe.roles.reverse(),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => recipe.surfaces[0]!.navigation.items.reverse(),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => (recipe.sourceSelection.layoutKeys[0] = "invented-layout"),
      (
        recipe: ReturnType<
          typeof structuredClone<typeof restaurantOrderingRecipe>
        >,
      ) => (recipe.screenshotFixtureIds[0] = "invented-fixture"),
    ]) {
      const changed = structuredClone(restaurantOrderingRecipe);
      mutate(changed);
      expect(() => validateRestaurantOrderingRecipe(changed)).toThrow(
        "exact frozen",
      );
    }
  });

  it("compiles one deterministic source module for the complete product selection", () => {
    const source = selectRestaurantOrderingSource();
    expect(() => new Function(source.replaceAll("export ", ""))).not.toThrow();
    expect(source).toContain("renderMobileProductShell");
    expect(source).toContain("renderMerchantWorkspaceShell");
    expect(source).toContain("renderRestaurantSettingsForm");
  });
});
