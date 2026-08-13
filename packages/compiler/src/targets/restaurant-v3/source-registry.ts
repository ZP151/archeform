import { isDeepStrictEqual } from "node:util";

import { fineDiningRecipe } from "@factory/experience-recipes";
import { selectRestaurantRecipeSource } from "@factory/screen-recipes";

import { sha256Digest } from "../../core/generated-files.js";
import type { RestaurantSurfaceKey } from "./contracts.js";

export type RestaurantSourceOriginV1 = {
  readonly package: "@factory/screen-recipes";
  readonly version: "0.1.0";
  readonly ownership: "factory-authored";
  readonly license: "UNLICENSED";
  readonly recipeKeys: readonly string[];
};

export type RestaurantSurfaceSourceV1 = {
  readonly surfaceKey: "customer-mobile";
  readonly module: "src/generated/restaurant-ui.mjs";
  readonly digest: `sha256:${string}`;
  readonly origins: readonly RestaurantSourceOriginV1[];
  readonly code: string;
};

export type RestaurantExperienceSourceV1 = {
  readonly module: "src/generated/fine-dining.mjs";
  readonly digest: `sha256:${string}`;
  readonly origin: {
    readonly package: "@factory/experience-recipes";
    readonly version: "0.1.0";
    readonly key: "fine-dining";
    readonly ownership: "factory-authored";
    readonly license: "UNLICENSED";
  };
  readonly tokens: typeof fineDiningRecipe.tokens;
  readonly code: string;
};

const customerRecipeKeys = Object.freeze([
  "restaurant-customer-home",
  "restaurant-customer-menu",
  "restaurant-customer-dish-detail",
  "restaurant-customer-cart",
  "restaurant-customer-checkout",
  "restaurant-customer-orders",
  "restaurant-customer-order-detail",
  "restaurant-customer-profile",
]);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function createCustomerSource(): RestaurantSurfaceSourceV1 {
  const code = selectRestaurantRecipeSource(customerRecipeKeys);
  if (code.includes("@factory/") || /\beval\s*\(|\bFunction\s*\(/.test(code)) {
    throw new Error("Restaurant surface source is invalid.");
  }
  return deepFreeze({
    surfaceKey: "customer-mobile",
    module: "src/generated/restaurant-ui.mjs",
    digest: `sha256:${sha256Digest(code)}`,
    origins: [
      {
        package: "@factory/screen-recipes",
        version: "0.1.0",
        ownership: "factory-authored",
        license: "UNLICENSED",
        recipeKeys: customerRecipeKeys,
      },
    ],
    code,
  });
}

export function selectRestaurantSurfaceSource(
  surfaceKey: RestaurantSurfaceKey,
): RestaurantSurfaceSourceV1 {
  if (surfaceKey !== "customer-mobile") {
    throw new Error("Restaurant surface source is invalid.");
  }
  return createCustomerSource();
}

export function validateRestaurantSurfaceSource(
  input: unknown,
): RestaurantSurfaceSourceV1 {
  try {
    const expected = createCustomerSource();
    if (!isDeepStrictEqual(input, expected)) throw new Error();
    return expected;
  } catch {
    throw new Error("Restaurant surface source is invalid.");
  }
}

export function selectRestaurantExperienceSource(): RestaurantExperienceSourceV1 {
  const code = fineDiningRecipe.source.code;
  return deepFreeze({
    module: "src/generated/fine-dining.mjs",
    digest: `sha256:${sha256Digest(code)}`,
    origin: {
      package: "@factory/experience-recipes",
      version: "0.1.0",
      key: "fine-dining",
      ownership: fineDiningRecipe.source.ownership,
      license: fineDiningRecipe.source.license,
    },
    tokens: fineDiningRecipe.tokens,
    code,
  });
}
