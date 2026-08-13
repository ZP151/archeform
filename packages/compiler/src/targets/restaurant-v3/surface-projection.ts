import { isDeepStrictEqual } from "node:util";

import { restaurantScreenRecipes } from "@factory/screen-recipes";

import type { RestaurantSurfaceKey } from "./contracts.js";
import type {
  RestaurantNavigationItemV1,
  RestaurantProductPlanV1,
} from "./plan.js";
import {
  selectRestaurantSurfaceSource,
  type RestaurantSourceOriginV1,
} from "./source-registry.js";

type RestaurantProjectedBlockV1 = {
  readonly id: string;
  readonly type: string;
  readonly bindings: Readonly<
    Record<
      string,
      {
        readonly kind: "domain-field" | "flow-transition" | "policy-permission";
        readonly target: string;
        readonly mode: "read" | "write" | "request" | "evaluate";
      }
    >
  >;
};

export type RestaurantPagePlanV1 = {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly surfaceKey: RestaurantSurfaceKey;
  readonly screenIntent: RestaurantProductPlanV1["pages"][number]["screenIntent"];
  readonly recipe: RestaurantProductPlanV1["pages"][number]["recipe"] & {
    readonly layoutKey: "mobile-product-shell" | "merchant-workspace-shell";
  };
  readonly blocks: readonly RestaurantProjectedBlockV1[];
};

export type RestaurantSurfacePlanV1 = {
  readonly apiVersion: "factory.restaurant-surface-plan/v1";
  readonly surfaceKey: RestaurantSurfaceKey;
  readonly pages: readonly RestaurantPagePlanV1[];
  readonly navigation: readonly RestaurantNavigationItemV1[];
  readonly source: {
    readonly origins: readonly RestaurantSourceOriginV1[];
    readonly module: string;
    readonly digest: `sha256:${string}`;
  };
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const governedNavigation = {
  "customer-mobile": [
    ["Home", "customer-home"],
    ["Menu", "customer-menu"],
    ["Cart", "customer-cart"],
    ["Orders", "customer-orders"],
    ["Profile", "customer-profile"],
  ],
  "merchant-desktop": [
    ["Dashboard", "merchant-dashboard"],
    ["Menu Management", "merchant-menu-management"],
    ["Orders", "merchant-orders"],
    ["Kitchen Queue", "merchant-kitchen-queue"],
    ["Tables", "merchant-tables"],
    ["Users/Roles", "merchant-users-roles"],
    ["Settings", "merchant-settings"],
  ],
} as const;

function createSurface(
  plan: RestaurantProductPlanV1,
  surfaceKey: RestaurantSurfaceKey,
): RestaurantSurfacePlanV1 {
  const surface = plan.surfaces.find(({ key }) => key === surfaceKey);
  if (!surface) throw new Error("Restaurant surface projection is invalid.");
  const source = selectRestaurantSurfaceSource(surfaceKey);
  const expectedNavigation = governedNavigation[surfaceKey];
  if (
    !isDeepStrictEqual(
      surface.navigation.items.map(({ pageKey }) => pageKey),
      expectedNavigation.map(([, pageKey]) => pageKey),
    )
  )
    throw new Error("Restaurant surface projection is invalid.");
  const pages = plan.pages
    .filter((page) => page.surfaceKey === surfaceKey)
    .map((page) => {
      const recipe = restaurantScreenRecipes.find(
        ({ key }) => key === page.recipe.key,
      );
      if (
        !recipe ||
        recipe.pageKey !== page.id ||
        recipe.route !== page.route ||
        recipe.surface !== surfaceKey ||
        recipe.region !== "main" ||
        !isDeepStrictEqual(
          recipe.blocks.map(({ id, type }) => [id, type]),
          page.blocks.map(({ id, type }) => [id, type]),
        )
      ) {
        throw new Error("Restaurant surface projection is invalid.");
      }
      return {
        id: page.id,
        route: page.route,
        title: page.title,
        surfaceKey,
        screenIntent: page.screenIntent,
        recipe: { ...page.recipe, layoutKey: recipe.layoutKey },
        blocks: recipe.blocks.map(({ id, type, bindings }) => ({
          id,
          type,
          bindings,
        })),
      };
    });
  return deepFreeze(
    JSON.parse(
      JSON.stringify({
        apiVersion: "factory.restaurant-surface-plan/v1",
        surfaceKey,
        pages,
        navigation: surface.navigation.items.map((item, index) => ({
          ...item,
          label: expectedNavigation[index]![0],
        })),
        source: {
          origins: source.origins,
          module: source.module,
          digest: source.digest,
        },
      }),
    ) as RestaurantSurfacePlanV1,
  );
}

export function projectRestaurantSurface(
  plan: RestaurantProductPlanV1,
  surfaceKey: RestaurantSurfaceKey,
): RestaurantSurfacePlanV1 {
  return createSurface(plan, surfaceKey);
}

export function validateRestaurantSurfacePlan(
  input: unknown,
): RestaurantSurfacePlanV1 {
  try {
    if (!input || typeof input !== "object") throw new Error();
    const plan = input as RestaurantSurfacePlanV1;
    if (
      plan.surfaceKey !== "customer-mobile" &&
      plan.surfaceKey !== "merchant-desktop"
    )
      throw new Error();
    const source = selectRestaurantSurfaceSource(plan.surfaceKey);
    if (
      !isDeepStrictEqual(plan.source, {
        origins: source.origins,
        module: source.module,
        digest: source.digest,
      })
    )
      throw new Error();
    const expectedRecipes = restaurantScreenRecipes.filter(
      ({ surface }) => surface === plan.surfaceKey,
    );
    const expectedNavigation = governedNavigation[plan.surfaceKey];
    if (
      !isDeepStrictEqual(
        plan.navigation.map(({ label, pageKey }) => [label, pageKey]),
        expectedNavigation,
      )
    )
      throw new Error();
    if (plan.pages.length !== expectedRecipes.length) throw new Error();
    for (let index = 0; index < expectedRecipes.length; index += 1) {
      const page = plan.pages[index];
      const recipe = expectedRecipes[index];
      if (
        !page ||
        !recipe ||
        page.id !== recipe.pageKey ||
        page.route !== recipe.route ||
        page.recipe.key !== recipe.key ||
        page.recipe.layoutKey !== recipe.layoutKey ||
        page.recipe.regions.length !== 1 ||
        page.recipe.regions[0]?.key !== "main" ||
        !isDeepStrictEqual(
          page.recipe.regions[0]?.blockIds,
          recipe.blocks.map(({ id }) => id),
        ) ||
        !isDeepStrictEqual(
          page.blocks,
          recipe.blocks.map(({ id, type, bindings }) => ({
            id,
            type,
            bindings,
          })),
        )
      )
        throw new Error();
    }
    return deepFreeze(structuredClone(plan));
  } catch {
    throw new Error("Restaurant surface projection is invalid.");
  }
}
