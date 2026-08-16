import { describe, expect, expectTypeOf, it } from "vitest";

import * as browserGraph from "../src/browser.js";
import * as nodeGraph from "../src/index.js";
import type {
  ApplicationSurfaceV2 as BrowserApplicationSurfaceV2,
  ProductRecipeV2 as BrowserProductRecipeV2,
  VersionedProductRecipe as BrowserVersionedProductRecipe,
} from "../src/browser.js";
import type {
  ApplicationSurfaceV2 as NodeApplicationSurfaceV2,
  ProductRecipeV2 as NodeProductRecipeV2,
  VersionedProductRecipe as NodeVersionedProductRecipe,
} from "../src/index.js";
import {
  assertValidApplicationGraph,
  GraphSemanticError,
  validateApplicationGraph,
} from "../src/browser.js";

const digest = `sha256:${"b".repeat(64)}`;

function restaurantRecipeV2(): Record<string, unknown> {
  const pageKeys = [
    "customer-home",
    "customer-menu",
    "customer-dish-detail",
    "customer-cart",
    "customer-checkout",
    "customer-orders",
    "customer-order-detail",
    "customer-profile",
  ];
  const tabKeys = [
    "customer-home",
    "customer-menu",
    "customer-cart",
    "customer-orders",
    "customer-profile",
  ];
  return {
    apiVersion: "factory.product-recipe/v2",
    key: "restaurant-ordering",
    version: "1.0.0",
    intentMatchers: [{ productType: "restaurant-ordering" }],
    capabilityLocks: [{ key: "commerce.orders", version: "1.0.0", digest }],
    surfaces: [
      {
        apiVersion: "factory.application-surface/v2",
        key: "customer-mobile",
        label: "Customer",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "customer-home",
        ownedPageKeys: pageKeys,
        navigation: {
          pattern: "bottom-tabs",
          items: tabKeys.map((pageKey) => ({
            pageKey,
            label: pageKey,
            icon: "circle",
          })),
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 480 },
      },
    ],
    screens: pageKeys.map((key) => ({
      apiVersion: "factory.screen-intent/v1",
      key,
      label: key,
      purpose: "discovery",
      primaryJourneyKeys: ["place-order"],
      entityKeys: ["order"],
      capabilityKeys: ["commerce.orders"],
      recipeKey: `restaurant-${key}`,
      preferredViewport: "mobile",
    })),
    roles: ["customer"],
    flows: ["order-flow"],
    seedScenarioKeys: ["dinner-service"],
    acceptanceJourneyKeys: ["place-order"],
  };
}

const graphWithBrokenNavigation = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "browser-safe-graph",
    workspaceId: "local-workspace",
    name: "Browser-safe graph",
  },
  page: {
    pages: [{ id: "home", route: "/", title: "Home", blocks: [] }],
    navigation: [{ id: "missing", label: "Missing", pageId: "not-a-page" }],
  },
  domain: {
    entities: [],
    relations: [],
  },
  policy: {
    roles: [],
    permissions: [],
  },
  flow: {
    flows: [],
  },
  integration: {
    providers: [],
    capabilities: [],
  },
  experience: {
    theme: { mode: "light", tokens: {} },
    locales: ["en"],
  },
} as const;

describe("browser Graph entrypoint", () => {
  it("exposes semantic validation without Node-only hashing", () => {
    expect(validateApplicationGraph(graphWithBrokenNavigation)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "page.navigation.target_missing" }),
      ]),
    );
    expect(() =>
      assertValidApplicationGraph(graphWithBrokenNavigation),
    ).toThrow(GraphSemanticError);
  });

  it("exposes identical Product Recipe V2 values and Restaurant behavior", () => {
    expectTypeOf<BrowserApplicationSurfaceV2>().toEqualTypeOf<NodeApplicationSurfaceV2>();
    expectTypeOf<BrowserProductRecipeV2>().toEqualTypeOf<NodeProductRecipeV2>();
    expectTypeOf<BrowserVersionedProductRecipe>().toEqualTypeOf<NodeVersionedProductRecipe>();
    expect(browserGraph.applicationSurfaceV2Schema).toBe(
      nodeGraph.applicationSurfaceV2Schema,
    );
    expect(browserGraph.productRecipeV2Schema).toBe(
      nodeGraph.productRecipeV2Schema,
    );
    expect(browserGraph.assertProductRecipeV2).toBe(
      nodeGraph.assertProductRecipeV2,
    );
    expect(browserGraph.assertVersionedProductRecipe).toBe(
      nodeGraph.assertVersionedProductRecipe,
    );
    expect(browserGraph.hashProductRecipeV2).toBe(
      nodeGraph.hashProductRecipeV2,
    );
    expect(browserGraph.adaptProductRecipeV1DraftToV2).toBe(
      nodeGraph.adaptProductRecipeV1DraftToV2,
    );

    const recipe = restaurantRecipeV2();
    expect(browserGraph.assertProductRecipeV2(recipe)).toEqual(
      nodeGraph.assertProductRecipeV2(recipe),
    );
    expect(browserGraph.hashProductRecipeV2(recipe)).toBe(
      nodeGraph.hashProductRecipeV2(recipe),
    );
  });
});
