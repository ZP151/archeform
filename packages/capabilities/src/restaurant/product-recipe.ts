import {
  assertProductRecipeV2,
  type ProductRecipeV2,
  type ScreenIntentV1,
} from "@factory/graph";

export type RestaurantProductPageDefinition = {
  readonly key: string;
  readonly title: string;
  readonly route: string;
  readonly surfaceKey: "customer-mobile" | "merchant-desktop";
  readonly purpose: ScreenIntentV1["purpose"];
  readonly recipeKey: string;
  readonly blocks: readonly { readonly id: string; readonly type: string }[];
  readonly entityKeys: readonly string[];
  readonly capabilityKeys: readonly string[];
  readonly primaryJourneyKeys: readonly string[];
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export const restaurantAcceptanceJourneyKeys = Object.freeze([
  "customer-place-order",
  "manager-cancel-submitted-order",
  "manager-cancel-paid-order",
  "manager-table-session",
  "manager-expire-open-table-session",
  "manager-expire-active-table-session",
  "manager-adjust-inventory",
] as const);

export const restaurantProductPages: readonly RestaurantProductPageDefinition[] =
  deepFreeze([
    {
      key: "customer-home",
      title: "Home",
      route: "/",
      surfaceKey: "customer-mobile",
      purpose: "discovery",
      recipeKey: "restaurant-customer-home",
      blocks: [
        { id: "home-hero", type: "menu-hero" },
        { id: "home-categories", type: "category-rail" },
        { id: "home-items", type: "menu-item-card" },
      ],
      entityKeys: ["restaurant-location", "menu-category", "menu-item"],
      capabilityKeys: ["core.location-context", "commerce.catalog"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-menu",
      title: "Menu",
      route: "/menu",
      surfaceKey: "customer-mobile",
      purpose: "discovery",
      recipeKey: "restaurant-customer-menu",
      blocks: [
        { id: "menu-categories", type: "category-rail" },
        { id: "menu-items", type: "menu-item-card" },
      ],
      entityKeys: ["menu-category", "menu-item"],
      capabilityKeys: ["commerce.catalog"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-dish-detail",
      title: "Dish detail",
      route: "/menu/:itemId",
      surfaceKey: "customer-mobile",
      purpose: "configuration",
      recipeKey: "restaurant-customer-dish-detail",
      blocks: [{ id: "dish-configurator", type: "dish-configurator" }],
      entityKeys: [
        "menu-item",
        "menu-option-group",
        "menu-option",
        "order-line",
      ],
      capabilityKeys: ["commerce.line-configuration"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-cart",
      title: "Cart",
      route: "/cart",
      surfaceKey: "customer-mobile",
      purpose: "transaction",
      recipeKey: "restaurant-customer-cart",
      blocks: [
        { id: "cart-lines", type: "cart-line" },
        { id: "cart-summary", type: "order-summary" },
      ],
      entityKeys: ["order", "order-line"],
      capabilityKeys: ["commerce.cart", "commerce.money-pricing"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-checkout",
      title: "Checkout",
      route: "/checkout",
      surfaceKey: "customer-mobile",
      purpose: "transaction",
      recipeKey: "restaurant-customer-checkout",
      blocks: [
        { id: "checkout-summary", type: "order-summary" },
        { id: "checkout-payment", type: "payment-state" },
      ],
      entityKeys: ["order", "payment-attempt"],
      capabilityKeys: ["commerce.order", "restaurant.cashier"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-orders",
      title: "Orders",
      route: "/orders",
      surfaceKey: "customer-mobile",
      purpose: "tracking",
      recipeKey: "restaurant-customer-orders",
      blocks: [{ id: "customer-order-list", type: "active-order-list" }],
      entityKeys: ["order"],
      capabilityKeys: ["commerce.order-operations"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-order-detail",
      title: "Order detail",
      route: "/orders/:orderId",
      surfaceKey: "customer-mobile",
      purpose: "tracking",
      recipeKey: "restaurant-customer-order-detail",
      blocks: [
        { id: "customer-order-summary", type: "order-summary" },
        { id: "customer-payment-state", type: "payment-state" },
        { id: "customer-order-timeline", type: "order-timeline" },
      ],
      entityKeys: ["order", "payment-attempt"],
      capabilityKeys: ["commerce.order-operations"],
      primaryJourneyKeys: ["customer-place-order"],
    },
    {
      key: "customer-profile",
      title: "Profile",
      route: "/profile",
      surfaceKey: "customer-mobile",
      purpose: "administration",
      recipeKey: "restaurant-customer-profile",
      blocks: [{ id: "customer-profile-form", type: "customer-profile-form" }],
      entityKeys: ["restaurant-principal"],
      capabilityKeys: ["core.identity-context"],
      primaryJourneyKeys: [],
    },
    {
      key: "merchant-dashboard",
      title: "Dashboard",
      route: "/merchant",
      surfaceKey: "merchant-desktop",
      purpose: "reporting",
      recipeKey: "restaurant-merchant-dashboard",
      blocks: [
        { id: "dashboard-metrics", type: "metric-card" },
        { id: "dashboard-orders", type: "active-order-list" },
        { id: "dashboard-tables", type: "table-map" },
      ],
      entityKeys: ["order", "restaurant-table", "menu-item"],
      capabilityKeys: ["restaurant.reporting"],
      primaryJourneyKeys: [],
    },
    {
      key: "merchant-menu-management",
      title: "Menu management",
      route: "/merchant/menu",
      surfaceKey: "merchant-desktop",
      purpose: "operations",
      recipeKey: "restaurant-merchant-menu-management",
      blocks: [
        { id: "merchant-menu-table", type: "menu-management-table" },
        { id: "merchant-availability", type: "availability-toggle" },
      ],
      entityKeys: ["menu-item", "inventory-ledger"],
      capabilityKeys: [
        "restaurant.menu",
        "commerce.inventory",
        "commerce.line-configuration",
      ],
      primaryJourneyKeys: ["manager-adjust-inventory"],
    },
    {
      key: "merchant-orders",
      title: "Orders",
      route: "/merchant/orders",
      surfaceKey: "merchant-desktop",
      purpose: "operations",
      recipeKey: "restaurant-merchant-orders",
      blocks: [
        { id: "merchant-order-list", type: "active-order-list" },
        { id: "merchant-order-summary", type: "order-summary" },
        { id: "merchant-payment-state", type: "payment-state" },
      ],
      entityKeys: ["order", "payment-attempt"],
      capabilityKeys: ["commerce.order-operations", "restaurant.cashier"],
      primaryJourneyKeys: [
        "manager-cancel-submitted-order",
        "manager-cancel-paid-order",
      ],
    },
    {
      key: "merchant-kitchen-queue",
      title: "Kitchen queue",
      route: "/merchant/kitchen",
      surfaceKey: "merchant-desktop",
      purpose: "fulfillment",
      recipeKey: "restaurant-merchant-kitchen-queue",
      blocks: [{ id: "kitchen-tickets", type: "kitchen-ticket" }],
      entityKeys: ["kitchen-ticket", "order"],
      capabilityKeys: ["restaurant.kitchen"],
      primaryJourneyKeys: [],
    },
    {
      key: "merchant-tables",
      title: "Tables",
      route: "/merchant/tables",
      surfaceKey: "merchant-desktop",
      purpose: "operations",
      recipeKey: "restaurant-merchant-tables",
      blocks: [{ id: "merchant-table-map", type: "table-map" }],
      entityKeys: ["restaurant-table", "table-session"],
      capabilityKeys: ["restaurant.table-session"],
      primaryJourneyKeys: [
        "manager-table-session",
        "manager-expire-open-table-session",
        "manager-expire-active-table-session",
      ],
    },
    {
      key: "merchant-users-roles",
      title: "Users and roles",
      route: "/merchant/users",
      surfaceKey: "merchant-desktop",
      purpose: "administration",
      recipeKey: "restaurant-merchant-users-roles",
      blocks: [{ id: "merchant-role-matrix", type: "role-matrix" }],
      entityKeys: ["restaurant-principal"],
      capabilityKeys: ["core.identity-context"],
      primaryJourneyKeys: [],
    },
    {
      key: "merchant-settings",
      title: "Settings",
      route: "/merchant/settings",
      surfaceKey: "merchant-desktop",
      purpose: "administration",
      recipeKey: "restaurant-merchant-settings",
      blocks: [
        { id: "restaurant-settings-form", type: "restaurant-settings-form" },
      ],
      entityKeys: ["restaurant-location"],
      capabilityKeys: ["core.location-context"],
      primaryJourneyKeys: [],
    },
  ]);

const capabilityLocks: ProductRecipeV2["capabilityLocks"] = [
  [
    "commerce.cart",
    "1.0.1",
    "20b9900c018b5590bb6481b1c6fb30a0bece3fd1b42baa8ebfceb6a6bd5c5216",
  ],
  [
    "commerce.catalog",
    "1.2.0",
    "9819588b9b59c13a80a561c91ee1f14ebf73bbde16c3504f2de52e41934a8fcc",
  ],
  [
    "commerce.inventory",
    "1.1.1",
    "a6abfec1b2f2ff7d12c776a2efa706cab4267766ae309f3f3fbfa597c3fde34e",
  ],
  [
    "commerce.inventory-ledger",
    "1.0.0",
    "611d7b77c806ffbaea4fbe262a7df4a459bb0f7a1d9e1b95150d8053744e4cbb",
  ],
  [
    "commerce.line-configuration",
    "1.1.2",
    "c1913c2b949728d859d363812476200ed57d57d992c7f6cd8d6b3ec90c9a2872",
  ],
  [
    "commerce.money-pricing",
    "1.1.0",
    "09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
  ],
  [
    "commerce.order",
    "1.2.0",
    "c8f5451b3144daac59ad589cb4e8483b5014c6c9cd98a4bc3e7b23577cb56f77",
  ],
  [
    "commerce.order-operations",
    "1.1.0",
    "652fe4c0e6695a92b2622c934af56b8175374bdecdb3bac3834d90a2c00b3a71",
  ],
  [
    "core.audit",
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  [
    "core.crud",
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  [
    "core.files-media",
    "1.0.0",
    "5c4fbf964825b8504efc91c965b68e63eb6c7e139201d333d806989f16d2e249",
  ],
  [
    "core.identity-context",
    "1.0.0",
    "c2fc92f426d6e3995565681e55a8d7d5a5c8379c30ce4b9d2ecb0b538c2b8ca1",
  ],
  [
    "core.location-context",
    "1.0.0",
    "591b260f53f2fa0b8e838cb8b9ab350819aa720326b49c1a67f99990ae61df0d",
  ],
  [
    "core.workflow",
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  [
    "restaurant.cashier",
    "1.1.0",
    "c95c35b2069c9c331d8b7cb591ec0472c72acf59fddfdb65c1550e05283fd6ba",
  ],
  [
    "restaurant.kitchen",
    "1.1.0",
    "a1a925c3519fc135be3c1290aa85b1914025ba64440128abfe7cc9c7567702c7",
  ],
  [
    "restaurant.menu",
    "1.0.0",
    "1efb3891dba96a724ac2e07050d4d0d0ce34648bb0745c48799c85c2b486bf30",
  ],
  [
    "restaurant.ordering",
    "1.1.0",
    "9f6af7bff7e06ac630a80ae781955c13145666f38492632a04eabe092dd8cf30",
  ],
  [
    "restaurant.reporting",
    "1.1.0",
    "400fb6c041e1f2f4191c779be37af2144ba7c8d8be5675dc16191d676fa7d221",
  ],
  [
    "restaurant.table-session",
    "1.1.0",
    "9dff8a3a0348e30d19d2f2e62ce4dabab82885e2db80053791a6b6d30d3fdbf2",
  ],
].map(([key, version, digest]) => ({
  key,
  version,
  digest: `sha256:${digest}` as `sha256:${string}`,
}));

function navigationItem(pageKey: string, label: string, icon: string) {
  return { pageKey, label, icon };
}

export function restaurantOrderingProductRecipe(): ProductRecipeV2 {
  const customerPages = restaurantProductPages
    .slice(0, 8)
    .map(({ key }) => key);
  const merchantPages = restaurantProductPages.slice(8).map(({ key }) => key);
  return assertProductRecipeV2({
    apiVersion: "factory.product-recipe/v2",
    key: "restaurant-ordering",
    version: "1.0.0",
    intentMatchers: [{ productType: "restaurant-ordering" }],
    capabilityLocks,
    surfaces: [
      {
        apiVersion: "factory.application-surface/v2",
        key: "customer-mobile",
        label: "Customer mobile",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "customer-home",
        ownedPageKeys: customerPages,
        navigation: {
          pattern: "bottom-tabs",
          items: [
            navigationItem("customer-home", "Home", "home"),
            navigationItem("customer-menu", "Menu", "utensils"),
            navigationItem("customer-cart", "Cart", "shopping-bag"),
            navigationItem("customer-orders", "Orders", "receipt"),
            navigationItem("customer-profile", "Profile", "user"),
          ],
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 640 },
      },
      {
        apiVersion: "factory.application-surface/v2",
        key: "merchant-desktop",
        label: "Merchant desktop",
        kind: "merchant",
        audienceRoles: ["cashier", "kitchen", "manager"],
        device: "desktop",
        entryPageKey: "merchant-dashboard",
        ownedPageKeys: merchantPages,
        navigation: {
          pattern: "sidebar",
          items: [
            navigationItem("merchant-dashboard", "Dashboard", "layout-grid"),
            navigationItem("merchant-menu-management", "Menu", "notebook-tabs"),
            navigationItem("merchant-orders", "Orders", "receipt"),
            navigationItem("merchant-kitchen-queue", "Kitchen", "chef-hat"),
            navigationItem("merchant-tables", "Tables", "table"),
            navigationItem("merchant-users-roles", "Users", "users"),
            navigationItem("merchant-settings", "Settings", "settings"),
          ],
        },
        responsive: { minimumWidth: 768, maximumContentWidth: 1600 },
      },
    ],
    screens: restaurantProductPages.map((page) => ({
      apiVersion: "factory.screen-intent/v1",
      key: page.key,
      label: page.title,
      purpose: page.purpose,
      primaryJourneyKeys: [...page.primaryJourneyKeys],
      entityKeys: [...page.entityKeys],
      capabilityKeys: [...page.capabilityKeys],
      recipeKey: page.recipeKey,
      preferredViewport:
        page.surfaceKey === "customer-mobile" ? "mobile" : "desktop",
    })),
    roles: ["customer", "cashier", "kitchen", "manager"],
    flows: [
      "restaurant-table-session",
      "restaurant-order",
      "restaurant-inventory-ledger",
    ],
    seedScenarioKeys: ["fine-dining-service"],
    acceptanceJourneyKeys: [...restaurantAcceptanceJourneyKeys],
  });
}
