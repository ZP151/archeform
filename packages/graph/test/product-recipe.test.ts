import { describe, expect, it } from "vitest";

import { assertProductRecipe, digestJson } from "../src/index.js";

const digest = `sha256:${"b".repeat(64)}`;

const customerPageKeys = [
  "customer-home",
  "customer-menu",
  "customer-dish-detail",
  "customer-cart",
  "customer-checkout",
  "customer-orders",
  "customer-order-detail",
  "customer-profile",
] as const;

const customerTabKeys = [
  "customer-home",
  "customer-menu",
  "customer-cart",
  "customer-orders",
  "customer-profile",
] as const;

function validRecipe(): Record<string, unknown> {
  return {
    apiVersion: "factory.product-recipe/v1",
    key: "restaurant-ordering",
    version: "1.0.0",
    intentMatchers: [{ productType: "restaurant-ordering" }],
    capabilityLocks: [{ key: "commerce.orders", version: "1.0.0", digest }],
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-mobile",
        label: "Customer",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "home",
        navigation: {
          pattern: "bottom-tabs",
          items: [{ pageKey: "home", label: "Home", icon: "house" }],
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 480 },
      },
    ],
    screens: [
      {
        apiVersion: "factory.screen-intent/v1",
        key: "home",
        label: "Home",
        purpose: "discovery",
        primaryJourneyKeys: ["place-order"],
        entityKeys: ["order"],
        capabilityKeys: ["commerce.orders"],
        recipeKey: "restaurant-customer-home",
        preferredViewport: "mobile",
      },
    ],
    roles: ["customer"],
    flows: ["order-flow"],
    seedScenarioKeys: ["dinner-service"],
    acceptanceJourneyKeys: ["place-order"],
  };
}

function restaurantCustomerV1(): Record<string, unknown> {
  const recipe = validRecipe();
  const surface = (recipe.surfaces as Record<string, unknown>[])[0];
  surface.entryPageKey = "customer-home";
  (surface.navigation as Record<string, unknown>).items = customerTabKeys.map(
    (pageKey) => ({ pageKey, label: pageKey, icon: "circle" }),
  );
  recipe.screens = customerPageKeys.map((key) => ({
    apiVersion: "factory.screen-intent/v1",
    key,
    label: key,
    purpose: "discovery",
    primaryJourneyKeys: ["place-order"],
    entityKeys: ["order"],
    capabilityKeys: ["commerce.orders"],
    recipeKey: `restaurant-${key}`,
    preferredViewport: "mobile",
  }));
  return recipe;
}

describe("ProductRecipeV1", () => {
  it("accepts exact deterministic recipe metadata", () => {
    const parsed = assertProductRecipe(validRecipe());

    expect(parsed).toEqual(validRecipe());
    expect(parsed.apiVersion).toBe("factory.product-recipe/v1");
    expect(parsed.surfaces[0]?.apiVersion).toBe(
      "factory.application-surface/v1",
    );
    expect(digestJson(parsed)).toBe(
      "sha256:8fcae397e5ede2344c4e71e3a0be03e48315365c5002ee342b7a76476dbfe7d9",
    );
  });

  it("cannot represent screens owned outside visible navigation", () => {
    expect(() => assertProductRecipe(restaurantCustomerV1())).toThrow(
      "Product Recipe screen 'customer-dish-detail' has no surface owner.",
    );
  });

  it("rejects extra source, package, provider, route, and runtime authority", () => {
    const cases = [
      { ...validRecipe(), provider: "model-provider" },
      { ...validRecipe(), packageRoot: "packages/capabilities" },
      {
        ...validRecipe(),
        screens: [
          {
            ...(validRecipe().screens as Record<string, unknown>[])[0],
            route: "/home",
          },
        ],
      },
      {
        ...validRecipe(),
        capabilityLocks: [
          {
            ...(validRecipe().capabilityLocks as Record<string, unknown>[])[0],
            source: "src/capability.ts",
          },
        ],
      },
    ];

    for (const candidate of cases) {
      expect(() => assertProductRecipe(candidate)).toThrow(/Unrecognized key/);
    }
  });

  it("rejects duplicate recipe namespaces", () => {
    for (const field of ["capabilityLocks", "surfaces", "screens"] as const) {
      const candidate = validRecipe();
      const values = candidate[field] as Record<string, unknown>[];
      values.push(structuredClone(values[0]));
      expect(() => assertProductRecipe(candidate)).toThrow(/duplicated/i);
    }

    for (const field of [
      "roles",
      "flows",
      "seedScenarioKeys",
      "acceptanceJourneyKeys",
    ] as const) {
      const candidate = validRecipe();
      const values = candidate[field] as string[];
      values.push(values[0]);
      expect(() => assertProductRecipe(candidate)).toThrow(/duplicated/i);
    }
  });

  it("resolves surface roles, screen capabilities, and journey keys", () => {
    const missingRole = validRecipe();
    (missingRole.surfaces as Record<string, unknown>[])[0].audienceRoles = [
      "manager",
    ];
    expect(() => assertProductRecipe(missingRole)).toThrow(/unknown role/i);

    const missingCapability = validRecipe();
    (missingCapability.screens as Record<string, unknown>[])[0].capabilityKeys =
      ["commerce.inventory"];
    expect(() => assertProductRecipe(missingCapability)).toThrow(
      /unknown capability/i,
    );

    const missingJourney = validRecipe();
    (
      missingJourney.screens as Record<string, unknown>[]
    )[0].primaryJourneyKeys = ["unknown-journey"];
    expect(() => assertProductRecipe(missingJourney)).toThrow(
      /unknown acceptance journey/i,
    );
  });

  it("assigns every screen to exactly one surface and keeps navigation local", () => {
    const missingScreen = validRecipe();
    (
      (
        (missingScreen.surfaces as Record<string, unknown>[])[0]
          .navigation as Record<string, unknown>
      ).items as Record<string, unknown>[]
    )[0].pageKey = "missing";
    expect(() => assertProductRecipe(missingScreen)).toThrow(/unknown screen/i);

    const unownedScreen = validRecipe();
    (
      (unownedScreen.surfaces as Record<string, unknown>[])[0]
        .navigation as Record<string, unknown>
    ).items = [];
    (unownedScreen.surfaces as Record<string, unknown>[])[0].entryPageKey =
      "missing";
    expect(() => assertProductRecipe(unownedScreen)).toThrow(/unknown screen/i);

    const duplicateOwner = validRecipe();
    (duplicateOwner.surfaces as Record<string, unknown>[]).push({
      apiVersion: "factory.application-surface/v1",
      key: "operations-desktop",
      label: "Operations",
      kind: "operations",
      audienceRoles: ["customer"],
      device: "desktop",
      entryPageKey: "home",
      navigation: {
        pattern: "sidebar",
        items: [{ pageKey: "home", label: "Home", icon: "house" }],
      },
      responsive: { minimumWidth: 768 },
    });
    expect(() => assertProductRecipe(duplicateOwner)).toThrow(
      /more than one surface/i,
    );
  });

  it("requires an approved page recipe key and valid immutable locks", () => {
    const missingPageRecipe = validRecipe();
    (missingPageRecipe.screens as Record<string, unknown>[])[0].recipeKey = "";
    expect(() => assertProductRecipe(missingPageRecipe)).toThrow();

    const badVersion = validRecipe();
    (badVersion.capabilityLocks as Record<string, unknown>[])[0].version =
      "latest";
    expect(() => assertProductRecipe(badVersion)).toThrow();

    const badDigest = validRecipe();
    (badDigest.capabilityLocks as Record<string, unknown>[])[0].digest =
      "sha256:not-a-digest";
    expect(() => assertProductRecipe(badDigest)).toThrow();
  });
});
