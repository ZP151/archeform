import {
  restaurantScreenRecipes,
  selectRestaurantRecipeSource,
  validateRestaurantScreenRecipes,
  validateScreenRecipeClosure,
} from "@factory/screen-recipes";
import {
  fineDiningRecipe,
  validateFineDiningRecipe,
} from "@factory/experience-recipes";

type NavigationItem = {
  readonly pageKey: string;
  readonly label: string;
  readonly icon: string;
};
type Surface = {
  readonly key: "customer-mobile" | "merchant-desktop";
  readonly ownedPageKeys: readonly string[];
  readonly entryPageKey: string;
  readonly navigation: {
    readonly pattern: "bottom-tabs" | "sidebar";
    readonly items: readonly NavigationItem[];
  };
};
export type RestaurantOrderingRecipe = {
  readonly apiVersion: "factory.ui-product-recipe/v1";
  readonly key: "restaurant-ordering";
  readonly version: "1.0.0";
  readonly experienceKey: "fine-dining";
  readonly screenRecipeKeys: readonly string[];
  readonly roles: readonly ["customer", "cashier", "kitchen", "manager"];
  readonly acceptanceJourneyKeys: readonly string[];
  readonly surfaces: readonly Surface[];
  readonly sourceSelection: {
    readonly layoutKeys: readonly string[];
    readonly generatedBlockKeys: readonly string[];
  };
  readonly screenshotFixtureIds: readonly string[];
};

const customerPages = [
  "customer-home",
  "customer-menu",
  "customer-dish-detail",
  "customer-cart",
  "customer-checkout",
  "customer-orders",
  "customer-order-detail",
  "customer-profile",
] as const;
const merchantPages = [
  "merchant-dashboard",
  "merchant-menu-management",
  "merchant-orders",
  "merchant-kitchen-queue",
  "merchant-tables",
  "merchant-users-roles",
  "merchant-settings",
] as const;
const acceptanceJourneyKeys = [
  "customer-place-order",
  "manager-cancel-submitted-order",
  "manager-cancel-paid-order",
  "manager-table-session",
  "manager-expire-open-table-session",
  "manager-expire-active-table-session",
  "manager-adjust-inventory",
] as const;
const generatedBlockKeys = [
  "menu-hero",
  "category-rail",
  "menu-item-card",
  "dish-configurator",
  "cart-line",
  "order-summary",
  "payment-state",
  "order-timeline",
  "metric-card",
  "active-order-list",
  "kitchen-ticket",
  "table-map",
  "menu-management-table",
  "availability-toggle",
  "role-matrix",
  "customer-profile-form",
  "restaurant-settings-form",
] as const;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const exactDataEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => exactDataEqual(item, right[index]))
    );
  }
  if (
    Object.getPrototypeOf(left) !== Object.prototype ||
    Object.getPrototypeOf(right) !== Object.prototype
  )
    return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        exactDataEqual(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
        ),
    )
  );
};

const manifest: RestaurantOrderingRecipe = {
  apiVersion: "factory.ui-product-recipe/v1",
  key: "restaurant-ordering",
  version: "1.0.0",
  experienceKey: "fine-dining",
  screenRecipeKeys: [...customerPages, ...merchantPages].map(
    (page) => `restaurant-${page}`,
  ),
  roles: ["customer", "cashier", "kitchen", "manager"],
  acceptanceJourneyKeys: [...acceptanceJourneyKeys],
  surfaces: [
    {
      key: "customer-mobile",
      ownedPageKeys: [...customerPages],
      entryPageKey: "customer-home",
      navigation: {
        pattern: "bottom-tabs",
        items: [
          { pageKey: "customer-home", label: "Home", icon: "house" },
          { pageKey: "customer-menu", label: "Menu", icon: "utensils" },
          { pageKey: "customer-cart", label: "Cart", icon: "shopping-bag" },
          { pageKey: "customer-orders", label: "Orders", icon: "receipt" },
          { pageKey: "customer-profile", label: "Profile", icon: "user" },
        ],
      },
    },
    {
      key: "merchant-desktop",
      ownedPageKeys: [...merchantPages],
      entryPageKey: "merchant-dashboard",
      navigation: {
        pattern: "sidebar",
        items: [
          {
            pageKey: "merchant-dashboard",
            label: "Dashboard",
            icon: "layout-dashboard",
          },
          {
            pageKey: "merchant-menu-management",
            label: "Menu",
            icon: "notebook-tabs",
          },
          { pageKey: "merchant-orders", label: "Orders", icon: "receipt" },
          {
            pageKey: "merchant-kitchen-queue",
            label: "Kitchen",
            icon: "chef-hat",
          },
          { pageKey: "merchant-tables", label: "Tables", icon: "armchair" },
          { pageKey: "merchant-users-roles", label: "Users", icon: "users" },
          { pageKey: "merchant-settings", label: "Settings", icon: "settings" },
        ],
      },
    },
  ],
  sourceSelection: {
    layoutKeys: ["mobile-product-shell", "merchant-workspace-shell"],
    generatedBlockKeys: [...generatedBlockKeys],
  },
  screenshotFixtureIds: restaurantScreenRecipes.flatMap(({ fixtures }) =>
    fixtures.map(({ id }) => id),
  ),
};

export const restaurantOrderingRecipe = deepFreeze(manifest);

export function validateRestaurantOrderingRecipe(
  recipe: RestaurantOrderingRecipe,
): { valid: true } {
  const owners = new Set<string>();
  for (const surface of recipe.surfaces ?? []) {
    const expectedOwnedPageKeys =
      surface.key === "customer-mobile" ? customerPages : merchantPages;
    if (
      surface.ownedPageKeys.length !== expectedOwnedPageKeys.length ||
      surface.ownedPageKeys.some(
        (pageKey, index) => pageKey !== expectedOwnedPageKeys[index],
      )
    ) {
      throw new Error(`Frozen owned-page set is invalid for '${surface.key}'.`);
    }
    if (!surface.ownedPageKeys.includes(surface.entryPageKey)) {
      throw new Error(`Surface '${surface.key}' has an unowned entry page.`);
    }
    for (const pageKey of surface.ownedPageKeys) {
      if (owners.has(pageKey))
        throw new Error(`Page '${pageKey}' has more than one owner.`);
      owners.add(pageKey);
    }
    for (const item of surface.navigation.items) {
      if (!surface.ownedPageKeys.includes(item.pageKey)) {
        throw new Error(
          `Navigation target '${item.pageKey}' is not owned by '${surface.key}'.`,
        );
      }
    }
  }
  if (!exactDataEqual(recipe, restaurantOrderingRecipe)) {
    throw new Error(
      "Restaurant UI product recipe must equal the exact frozen manifest.",
    );
  }
  validateFineDiningRecipe(fineDiningRecipe);
  validateRestaurantScreenRecipes(restaurantScreenRecipes);
  validateScreenRecipeClosure(restaurantScreenRecipes);
  return { valid: true };
}

export function selectRestaurantOrderingSource(): string {
  return selectRestaurantRecipeSource(
    restaurantOrderingRecipe.screenRecipeKeys,
  );
}
