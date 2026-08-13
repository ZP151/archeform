import {
  generatedUiRegistry,
  selectCopyableSource,
  validateGeneratedUiRegistry,
  type GeneratedUiItem,
} from "@factory/generated-ui";

const states = [
  "loading",
  "empty",
  "validation",
  "error",
  "confirmation",
  "denial",
] as const;
type BindingKind = "domain-field" | "flow-transition" | "policy-permission";
export type Binding = {
  kind: BindingKind;
  target: string;
  mode: "read" | "write" | "request" | "evaluate";
};
export type ScreenBlock = {
  id: string;
  type: string;
  bindings: Record<string, Binding>;
};
export type ScreenRecipe = {
  key: string;
  version: "1.0.0";
  pageKey: string;
  surface: "customer-mobile" | "merchant-desktop";
  route: string;
  layoutKey: "mobile-product-shell" | "merchant-workspace-shell";
  region: "main";
  states: readonly string[];
  fixture: { id: string; state: "confirmation" };
  fixtures: readonly { id: string; state: (typeof states)[number] }[];
  blocks: readonly ScreenBlock[];
  styleOnlyDuplicateOf?: string;
};
const d = (target: string, mode: "read" | "write" = "read"): Binding => ({
  kind: "domain-field",
  target,
  mode,
});
const f = (target: string): Binding => ({
  kind: "flow-transition",
  target,
  mode: "request",
});
const p = (target: string): Binding => ({
  kind: "policy-permission",
  target,
  mode: "evaluate",
});
const recipe = (
  pageKey: string,
  route: string,
  blocks: readonly ScreenBlock[],
  surface: ScreenRecipe["surface"],
): ScreenRecipe => ({
  key: `restaurant-${pageKey.replace("customer-", "customer-").replace("merchant-", "merchant-")}`,
  version: "1.0.0",
  pageKey,
  surface,
  route,
  layoutKey:
    surface === "customer-mobile"
      ? "mobile-product-shell"
      : "merchant-workspace-shell",
  region: "main",
  states,
  fixture: { id: `${pageKey}-confirmation`, state: "confirmation" },
  fixtures: states.map((state) => ({ id: `${pageKey}-${state}`, state })),
  blocks,
});
const customer = "customer-mobile" as const;
const merchant = "merchant-desktop" as const;
const recipeRegistry: readonly ScreenRecipe[] = [
  recipe(
    "customer-home",
    "/",
    [
      {
        id: "home-hero",
        type: "menu-hero",
        bindings: {
          locationName: d("restaurant-location.name"),
          serviceOpen: d("restaurant-location.serviceOpen"),
        },
      },
      {
        id: "home-categories",
        type: "category-rail",
        bindings: {
          categoryName: d("menu-category.name"),
          categoryActive: d("menu-category.active"),
        },
      },
      {
        id: "home-items",
        type: "menu-item-card",
        bindings: {
          name: d("menu-item.name"),
          description: d("menu-item.description"),
          price: d("menu-item.price"),
          available: d("menu-item.available"),
          imageUrl: d("menu-item.imageUrl"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-menu",
    "/menu",
    [
      {
        id: "menu-categories",
        type: "category-rail",
        bindings: {
          categoryName: d("menu-category.name"),
          categoryActive: d("menu-category.active"),
        },
      },
      {
        id: "menu-items",
        type: "menu-item-card",
        bindings: {
          name: d("menu-item.name"),
          description: d("menu-item.description"),
          price: d("menu-item.price"),
          available: d("menu-item.available"),
          imageUrl: d("menu-item.imageUrl"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-dish-detail",
    "/menu/:itemId",
    [
      {
        id: "dish-configurator",
        type: "dish-configurator",
        bindings: {
          name: d("menu-item.name"),
          description: d("menu-item.description"),
          price: d("menu-item.price"),
          available: d("menu-item.available"),
          groupName: d("menu-option-group.name"),
          minimumSelections: d("menu-option-group.minimumSelections"),
          maximumSelections: d("menu-option-group.maximumSelections"),
          optionLabel: d("menu-option.label"),
          priceDelta: d("menu-option.priceDelta"),
          canAdd: p("customer:order-line:create"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-cart",
    "/cart",
    [
      {
        id: "cart-lines",
        type: "cart-line",
        bindings: {
          quantity: d("order-line.quantity", "write"),
          lineNote: d("order-line.lineNote", "write"),
          modifiers: d("order-line.modifiers", "write"),
          unitPrice: d("order-line.unitPrice"),
        },
      },
      {
        id: "cart-summary",
        type: "order-summary",
        bindings: {
          total: d("order.total"),
          status: d("order.status"),
          submit: f("restaurant-order:cart:submit:submitted"),
          canSubmit: p("customer:order:submit"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-checkout",
    "/checkout",
    [
      {
        id: "checkout-summary",
        type: "order-summary",
        bindings: { total: d("order.total"), status: d("order.status") },
      },
      {
        id: "checkout-payment",
        type: "payment-state",
        bindings: {
          method: d("payment-attempt.method", "write"),
          paymentStatus: d("order.paymentStatus"),
          attemptStatus: d("payment-attempt.status"),
          amount: d("payment-attempt.amount"),
          pay: f("restaurant-order:submitted:pay:paid"),
          canPay: p("customer:order:pay"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-orders",
    "/orders",
    [
      {
        id: "customer-order-list",
        type: "active-order-list",
        bindings: {
          status: d("order.status"),
          paymentStatus: d("order.paymentStatus"),
          priority: d("order.priority"),
          total: d("order.total"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-order-detail",
    "/orders/:orderId",
    [
      {
        id: "customer-order-summary",
        type: "order-summary",
        bindings: {
          total: d("order.total"),
          status: d("order.status"),
          fulfilmentType: d("order.fulfilmentType"),
          orderNote: d("order.orderNote"),
        },
      },
      {
        id: "customer-payment-state",
        type: "payment-state",
        bindings: {
          paymentStatus: d("order.paymentStatus"),
          attemptStatus: d("payment-attempt.status"),
          amount: d("payment-attempt.amount"),
        },
      },
      {
        id: "customer-order-timeline",
        type: "order-timeline",
        bindings: {
          status: d("order.status"),
          submittedAt: d("order.submittedAt"),
          paidAt: d("order.paidAt"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "customer-profile",
    "/profile",
    [
      {
        id: "customer-profile-form",
        type: "customer-profile-form",
        bindings: {
          subjectRef: d("restaurant-principal.subjectRef"),
          displayName: d("restaurant-principal.displayName", "write"),
          email: d("restaurant-principal.email"),
          locale: d("restaurant-principal.locale", "write"),
          marketingOptIn: d("restaurant-principal.marketingOptIn", "write"),
          role: d("restaurant-principal.role"),
        },
      },
    ],
    customer,
  ),
  recipe(
    "merchant-dashboard",
    "/merchant",
    [
      {
        id: "dashboard-metrics",
        type: "metric-card",
        bindings: {
          orderTotal: d("order.total"),
          orderStatus: d("order.status"),
          tableStatus: d("restaurant-table.status"),
          menuAvailable: d("menu-item.available"),
        },
      },
      {
        id: "dashboard-orders",
        type: "active-order-list",
        bindings: {
          status: d("order.status"),
          paymentStatus: d("order.paymentStatus"),
          priority: d("order.priority"),
          total: d("order.total"),
        },
      },
      {
        id: "dashboard-tables",
        type: "table-map",
        bindings: {
          number: d("restaurant-table.number"),
          capacity: d("restaurant-table.capacity"),
          status: d("restaurant-table.status"),
          active: d("restaurant-table.active"),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-menu-management",
    "/merchant/menu",
    [
      {
        id: "merchant-menu-table",
        type: "menu-management-table",
        bindings: {
          name: d("menu-item.name", "write"),
          description: d("menu-item.description", "write"),
          price: d("menu-item.price", "write"),
          available: d("menu-item.available", "write"),
          stock: d("menu-item.stock"),
          preparationMinutes: d("menu-item.preparationMinutes", "write"),
        },
      },
      {
        id: "merchant-availability",
        type: "availability-toggle",
        bindings: {
          available: d("menu-item.available", "write"),
          adjustInventory: f(
            "restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded",
          ),
          canAdjustInventory: p(
            "manager:inventory-ledger:record-manager-adjustment",
          ),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-orders",
    "/merchant/orders",
    [
      {
        id: "merchant-order-list",
        type: "active-order-list",
        bindings: {
          status: d("order.status"),
          paymentStatus: d("order.paymentStatus"),
          priority: d("order.priority", "write"),
          total: d("order.total"),
        },
      },
      {
        id: "merchant-order-summary",
        type: "order-summary",
        bindings: {
          total: d("order.total"),
          status: d("order.status"),
          orderNote: d("order.orderNote"),
          cancelSubmitted: f("restaurant-order:submitted:cancel:cancelled"),
          cancelPaid: f("restaurant-order:paid:cancel:cancelled"),
          canCancel: p("manager:order:cancel"),
        },
      },
      {
        id: "merchant-payment-state",
        type: "payment-state",
        bindings: {
          paymentStatus: d("order.paymentStatus"),
          attemptStatus: d("payment-attempt.status"),
          amount: d("payment-attempt.amount"),
          pay: f("restaurant-order:submitted:pay:paid"),
          canPay: p("cashier:order:pay"),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-kitchen-queue",
    "/merchant/kitchen",
    [
      {
        id: "kitchen-tickets",
        type: "kitchen-ticket",
        bindings: {
          ticketStatus: d("kitchen-ticket.status"),
          priority: d("kitchen-ticket.priority"),
          acceptedAt: d("kitchen-ticket.acceptedAt"),
          startedAt: d("kitchen-ticket.startedAt"),
          readyAt: d("kitchen-ticket.readyAt"),
          accept: f("restaurant-order:paid:accept:accepted"),
          startPreparing: f(
            "restaurant-order:accepted:start-preparing:preparing",
          ),
          markReady: f("restaurant-order:preparing:mark-ready:ready"),
          canAccept: p("kitchen:order:accept"),
          canStartPreparing: p("kitchen:order:start-preparing"),
          canMarkReady: p("kitchen:order:mark-ready"),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-tables",
    "/merchant/tables",
    [
      {
        id: "merchant-table-map",
        type: "table-map",
        bindings: {
          code: d("restaurant-table.code", "write"),
          number: d("restaurant-table.number", "write"),
          capacity: d("restaurant-table.capacity", "write"),
          status: d("restaurant-table.status"),
          active: d("restaurant-table.active", "write"),
          activate: f("restaurant-table-session:open:activate:active"),
          close: f("restaurant-table-session:active:close:closed"),
          expireOpen: f("restaurant-table-session:open:expire:closed"),
          expireActive: f("restaurant-table-session:active:expire:closed"),
          canActivate: p("manager:table-session:activate"),
          canClose: p("manager:table-session:close"),
          canExpire: p("manager:table-session:expire"),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-users-roles",
    "/merchant/users",
    [
      {
        id: "merchant-role-matrix",
        type: "role-matrix",
        bindings: {
          subjectRef: d("restaurant-principal.subjectRef"),
          displayName: d("restaurant-principal.displayName"),
          email: d("restaurant-principal.email"),
          role: d("restaurant-principal.role"),
          active: d("restaurant-principal.active"),
          canManage: p("manager:restaurant-principal:update"),
        },
      },
    ],
    merchant,
  ),
  recipe(
    "merchant-settings",
    "/merchant/settings",
    [
      {
        id: "restaurant-settings-form",
        type: "restaurant-settings-form",
        bindings: {
          name: d("restaurant-location.name", "write"),
          currency: d("restaurant-location.currency", "write"),
          taxRate: d("restaurant-location.taxRate", "write"),
          serviceChargeRate: d(
            "restaurant-location.serviceChargeRate",
            "write",
          ),
          timezone: d("restaurant-location.timezone", "write"),
          logoUrl: d("restaurant-location.logoUrl", "write"),
          serviceOpen: d("restaurant-location.serviceOpen", "write"),
          canConfigure: p("manager:restaurant-location:update"),
        },
      },
    ],
    merchant,
  ),
];

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
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

export const restaurantScreenRecipes: readonly ScreenRecipe[] =
  deepFreeze(recipeRegistry);
const sameBinding = (left: Binding, right: Binding) =>
  left.kind === right.kind &&
  left.target === right.target &&
  left.mode === right.mode;
export function validateRestaurantScreenRecipes(
  input: readonly ScreenRecipe[],
): { valid: true } {
  const expectedByKey = new Map(
    restaurantScreenRecipes.map((item) => [item.key, item]),
  );
  const actualKeys = new Set<string>();
  for (const actual of input) {
    if (actual.styleOnlyDuplicateOf)
      throw new Error("Style-only duplicate recipe is not allowed.");
    if (actualKeys.has(actual.key))
      throw new Error(`Duplicate recipe key '${actual.key}'.`);
    actualKeys.add(actual.key);
    const expected = expectedByKey.get(actual.key);
    if (
      !expected ||
      actual.pageKey !== expected.pageKey ||
      actual.route !== expected.route ||
      actual.surface !== expected.surface ||
      actual.layoutKey !== expected.layoutKey ||
      actual.region !== "main"
    )
      throw new Error("Unknown or invalid recipe.");
    for (const state of states)
      if (!actual.states.includes(state))
        throw new Error("Missing required state.");
    for (let index = 0; index < expected.blocks.length; index += 1) {
      const want = expected.blocks[index]!;
      const got = actual.blocks[index]!;
      if (!got) throw new Error("Invalid block sequence.");
      if (got.id !== want.id || got.type !== want.type)
        throw new Error("Invalid block sequence.");
      for (const [port, binding] of Object.entries(want.bindings)) {
        const received = got.bindings[port];
        if (received && !sameBinding(received, binding))
          throw new Error("Invalid binding.");
      }
      const gotPorts = Object.keys(got.bindings).sort();
      const expectedPorts = Object.keys(want.bindings).sort();
      if (
        gotPorts.some((port, portIndex) => port !== expectedPorts[portIndex]) ||
        gotPorts.length !== expectedPorts.length
      )
        throw new Error("Unknown binding port.");
      for (const port of expectedPorts)
        if (!sameBinding(got.bindings[port]!, want.bindings[port]!))
          throw new Error("Invalid binding.");
    }
    if (actual.blocks.length !== expected.blocks.length)
      throw new Error("Invalid block sequence.");
  }
  if (input.length !== restaurantScreenRecipes.length)
    throw new Error("Expected exactly fifteen screen recipes.");
  if (!exactDataEqual(input, restaurantScreenRecipes))
    throw new Error(
      "Restaurant screen recipes must equal the exact frozen manifest.",
    );
  validateScreenRecipeClosure(input);
  return { valid: true };
}

export function validateScreenRecipeClosure(
  recipes: readonly ScreenRecipe[] = restaurantScreenRecipes,
  generatedItems: readonly GeneratedUiItem[] = generatedUiRegistry,
): true {
  const generatedByKey = new Map(
    generatedItems.map((item) => [item.key, item]),
  );
  for (const recipe of recipes) {
    for (const block of recipe.blocks) {
      const generated = generatedByKey.get(block.type);
      if (!generated)
        throw new Error(`Generated UI closure is missing '${block.type}'.`);
      const ports = new Set(generated.ports);
      for (const port of Object.keys(block.bindings)) {
        if (!ports.has(port)) {
          throw new Error(
            `Generated UI port closure for '${block.type}' is missing '${port}'.`,
          );
        }
      }
    }
  }
  validateGeneratedUiRegistry(generatedItems);
  return true;
}

export function selectRestaurantScreenSource(recipeKey: string): string {
  const recipe = restaurantScreenRecipes.find(({ key }) => key === recipeKey);
  if (!recipe)
    throw new Error(`Unknown Restaurant screen recipe '${recipeKey}'.`);
  return selectCopyableSource([
    recipe.layoutKey,
    ...new Set(recipe.blocks.map(({ type }) => type)),
  ]);
}

export function selectRestaurantRecipeSource(
  recipeKeys: readonly string[],
): string {
  const selectedKeys: string[] = [];
  const seen = new Set<string>();
  for (const recipeKey of recipeKeys) {
    const recipe = restaurantScreenRecipes.find(({ key }) => key === recipeKey);
    if (!recipe)
      throw new Error(`Unknown Restaurant screen recipe '${recipeKey}'.`);
    for (const key of [
      recipe.layoutKey,
      ...recipe.blocks.map(({ type }) => type),
    ]) {
      if (!seen.has(key)) {
        seen.add(key);
        selectedKeys.push(key);
      }
    }
  }
  return selectCopyableSource(selectedKeys);
}
