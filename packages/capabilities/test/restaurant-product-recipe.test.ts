import { describe, expect, it } from "vitest";
import { assertProductRecipeV2, hashApplicationGraphV3 } from "@factory/graph";

import * as capabilities from "../src/index.js";
import {
  customerOwnedPageKeys,
  merchantOwnedPageKeys,
  restaurantJourneyKeys,
  restaurantPageContract,
  restaurantProductFixture,
} from "./restaurant-product-fixture.js";

type RestaurantApi = {
  restaurantOrderingProductRecipe(): unknown;
  restaurantProductPages: readonly unknown[];
  currentProductRecipeCatalogue(): readonly unknown[];
  selectProductRecipeForIntent(input: unknown): unknown;
};
const api = capabilities as unknown as RestaurantApi;

describe("Restaurant Product Recipe V2", () => {
  it("publishes the exact two-surface fifteen-screen Restaurant contract", () => {
    expect(api.restaurantOrderingProductRecipe).toBeTypeOf("function");
    const recipe = assertProductRecipeV2(api.restaurantOrderingProductRecipe());
    expect(recipe.apiVersion).toBe("factory.product-recipe/v2");
    expect(recipe.key).toBe("restaurant-ordering");
    expect(recipe.intentMatchers).toEqual([
      { productType: "restaurant-ordering" },
    ]);
    expect(
      recipe.surfaces.map(({ key, ownedPageKeys, navigation }) => ({
        key,
        ownedPageKeys,
        navigation: navigation.items.map(({ pageKey }) => pageKey),
      })),
    ).toEqual([
      {
        key: "customer-mobile",
        ownedPageKeys: customerOwnedPageKeys,
        navigation: [
          "customer-home",
          "customer-menu",
          "customer-cart",
          "customer-orders",
          "customer-profile",
        ],
      },
      {
        key: "merchant-desktop",
        ownedPageKeys: merchantOwnedPageKeys,
        navigation: merchantOwnedPageKeys,
      },
    ]);
    expect(
      recipe.screens.map(({ key, recipeKey }) => [key, recipeKey]),
    ).toEqual(
      restaurantPageContract.map(([key, , recipeKey]) => [key, recipeKey]),
    );
    expect(recipe.roles).toEqual(["customer", "cashier", "kitchen", "manager"]);
    expect(recipe.flows).toEqual([
      "restaurant-table-session",
      "restaurant-order",
      "restaurant-inventory-ledger",
    ]);
    expect(recipe.acceptanceJourneyKeys).toEqual(restaurantJourneyKeys);
    expect(recipe.seedScenarioKeys).toEqual(["fine-dining-service"]);
  });

  it("locks the selected Golden Restaurant composition and returns fresh data", () => {
    const first = assertProductRecipeV2(api.restaurantOrderingProductRecipe());
    const second = assertProductRecipeV2(api.restaurantOrderingProductRecipe());
    const selected =
      restaurantProductFixture().baseDraft.graph.integration
        .compositionSelections!;
    expect(first.capabilityLocks).toEqual(
      selected.map(({ lock }) => ({
        key: lock.key,
        version: lock.version,
        digest: lock.manifestDigest,
      })),
    );
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.surfaces).not.toBe(second.surfaces);
  });

  it("catalogues and selects the recipe only for the approved intent", () => {
    const { intent } = restaurantProductFixture();
    expect(api.currentProductRecipeCatalogue()).toHaveLength(1);
    expect(api.selectProductRecipeForIntent({ intent })).toEqual(
      api.restaurantOrderingProductRecipe(),
    );
    expect(
      api.selectProductRecipeForIntent({
        intent: { ...intent, productType: "commerce" },
      }),
    ).toBeUndefined();
    expect(() =>
      api.selectProductRecipeForIntent({
        intent,
        proposedRecipeKey: "fabricated-restaurant",
      }),
    ).toThrow(/eligible|recipe/i);
  });

  it("redacts malformed selection envelopes without invoking caller code", () => {
    const { intent } = restaurantProductFixture();
    const fixedMessage = "Product Recipe selection input is invalid.";
    const malicious = "DO-NOT-ECHO-malicious-proposal";
    let getterCalls = 0;
    let conversionCalls = 0;
    const accessor = Object.defineProperty({ intent }, "proposedRecipeKey", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "restaurant-ordering";
      },
    });
    const conversion = {
      toString() {
        conversionCalls += 1;
        return "restaurant-ordering";
      },
    };
    const revoked = Proxy.revocable({ intent }, {});
    revoked.revoke();
    const throwingProxy = new Proxy(
      { intent },
      {
        ownKeys() {
          throw new Error("DO-NOT-ECHO-reflection-trap");
        },
      },
    );
    const malformed: unknown[] = [
      null,
      [],
      {},
      { intent, extra: true },
      { intent, proposedRecipeKey: 7 },
      { intent, proposedRecipeKey: "" },
      { intent, proposedRecipeKey: "a".repeat(129) },
      { intent, proposedRecipeKey: "not_an_identifier" },
      { intent, proposedRecipeKey: malicious },
      { intent, proposedRecipeKey: conversion },
      accessor,
      revoked.proxy,
      throwingProxy,
    ];
    for (const candidate of malformed) {
      let error: unknown;
      try {
        api.selectProductRecipeForIntent(candidate);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(fixedMessage);
      expect((error as Error).message).not.toContain("DO-NOT-ECHO");
    }
    expect(getterCalls).toBe(0);
    expect(conversionCalls).toBe(0);
  });

  it("recursively freezes the exported page registry and keeps later outputs stable", () => {
    const fixture = restaurantProductFixture();
    const pages = api.restaurantProductPages as Array<{
      title: string;
      blocks: Array<{ id: string; type: string }>;
      entityKeys: string[];
      capabilityKeys: string[];
      primaryJourneyKeys: string[];
    }>;
    const page = pages[0]!;
    const beforeRecipe = api.restaurantOrderingProductRecipe();
    const beforeGraph = (
      capabilities as unknown as {
        composeRestaurantProductGraph(
          input: unknown,
        ): Parameters<typeof hashApplicationGraphV3>[0];
      }
    ).composeRestaurantProductGraph(fixture);
    const original = {
      title: page.title,
      blockType: page.blocks[0]!.type,
      entity: page.entityKeys[0]!,
      capability: page.capabilityKeys[0]!,
      journey: page.primaryJourneyKeys[0]!,
      blockLength: page.blocks.length,
    };
    const results = [
      Reflect.set(page, "title", "Mutated title"),
      Reflect.set(page.blocks[0]!, "type", "mutated-block"),
      Reflect.set(page.entityKeys, 0, "order"),
      Reflect.set(page.capabilityKeys, 0, "restaurant.reporting"),
      Reflect.set(page.primaryJourneyKeys, 0, "manager-cancel-submitted-order"),
    ];
    let pushed = false;
    try {
      page.blocks.push({ id: "mutated-block", type: "menu-hero" });
      pushed = true;
    } catch {
      pushed = false;
    }
    const afterRecipe = api.restaurantOrderingProductRecipe();
    const afterGraph = (
      capabilities as unknown as {
        composeRestaurantProductGraph(
          input: unknown,
        ): Parameters<typeof hashApplicationGraphV3>[0];
      }
    ).composeRestaurantProductGraph(fixture);
    if (results.some(Boolean) || pushed) {
      page.title = original.title;
      page.blocks[0]!.type = original.blockType;
      page.entityKeys[0] = original.entity;
      page.capabilityKeys[0] = original.capability;
      page.primaryJourneyKeys[0] = original.journey;
      page.blocks.splice(original.blockLength);
    }
    expect(results).toEqual([false, false, false, false, false]);
    expect(pushed).toBe(false);
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.blocks)).toBe(true);
    expect(Object.isFrozen(page.blocks[0])).toBe(true);
    expect(Object.isFrozen(page.entityKeys)).toBe(true);
    expect(Object.isFrozen(page.capabilityKeys)).toBe(true);
    expect(Object.isFrozen(page.primaryJourneyKeys)).toBe(true);
    expect(afterRecipe).toEqual(beforeRecipe);
    expect(hashApplicationGraphV3(afterGraph)).toBe(
      hashApplicationGraphV3(beforeGraph),
    );
  });
});
