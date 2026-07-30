import {
  assertValidApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph/browser";

import {
  capabilityAssets,
  currentCapabilityAssets,
  lockCapabilityAsset,
  type CapabilityAssetV1,
  type CapabilityAssetLockV1,
  type CapabilityCategory,
  type FactoryProfile,
} from "./assets/index.js";
import { assertRestaurantOrderingProfile } from "./restaurant/profile.js";

export type {
  CapabilityAssetLockV1,
  CapabilityAssetManifestV1,
  CapabilityCategory,
  CapabilityExecutableContributionV1,
  CapabilityGraphContributionV1,
  CapabilityOutputSlot,
  CapabilityParameterSchemaV1,
  CapabilityProvideV1,
  CapabilityRequirementV1,
  FactoryProfile,
} from "./assets/index.js";

export {
  createCapabilityCompositionLock,
  resolveCapabilityComposition,
} from "./composition.js";
export type {
  CapabilityBindingValueV1,
  CapabilityCompositionLockV1,
  CapabilityCompositionV1,
  CapabilitySelectionV1,
  CreateCapabilityCompositionLockInput,
  ResolveCapabilityCompositionInput,
} from "./composition.js";

export {
  assertRestaurantOrderingProfile,
  validateRestaurantOrderingProfile,
} from "./restaurant/profile.js";
export type {
  RestaurantAdjustmentReason,
  RestaurantEntityKey,
  RestaurantInventoryLedgerProvenance,
  RestaurantProfileProjectionV1,
  RestaurantProfileValidationIssue,
} from "./restaurant/profile.js";

export interface CapabilityDefinition {
  readonly key: string;
  readonly name: string;
  readonly category: CapabilityCategory;
  readonly description: string;
  readonly profiles: readonly FactoryProfile[];
  readonly effects: readonly string[];
}

export { capabilityAssets };

const definitionFor = (asset: CapabilityAssetV1): CapabilityDefinition => ({
  key: asset.manifest.key,
  name: asset.manifest.name,
  category: asset.manifest.category,
  description: asset.manifest.description,
  profiles: asset.manifest.profiles,
  effects: asset.manifest.effects,
});

export const capabilityCatalog = Object.freeze(
  currentCapabilityAssets.map(definitionFor),
);

export interface GoldenAssetValidationContext {
  readonly profile: string;
  readonly capabilityKeys: readonly string[];
}

export function getCapabilityAsset(key: string): CapabilityAssetV1 {
  const asset = currentCapabilityAssets.find(
    (candidate) => candidate.manifest.key === key,
  );
  if (!asset) throw new Error(`Unknown Factory capability: ${key}`);
  return asset;
}

/**
 * Resolves a Published Graph lock to the exact Golden package identity it
 * recorded. Current profile composition intentionally uses getCapabilityAsset
 * instead, so new Drafts adopt the default package version.
 */
export function resolveCapabilityAssetLock(
  lock: CapabilityAssetLockV1,
): CapabilityAssetV1 {
  const asset = capabilityAssets.find((candidate) => {
    const expected = lockCapabilityAsset(candidate);
    return (
      expected.key === lock.key &&
      expected.version === lock.version &&
      expected.packageRoot === lock.packageRoot &&
      expected.manifestDigest === lock.manifestDigest &&
      expected.lifecycle === lock.lifecycle
    );
  });
  if (!asset) {
    throw new Error(
      `Capability asset lock '${lock.key}' does not match a registered Golden asset.`,
    );
  }
  return asset;
}

/**
 * The browser-safe Registry boundary: callers may only lock the exact Golden
 * asset/version/digest already shipped by this Factory workspace.
 */
export function assertGoldenCapabilityAssetLocks(
  locks: readonly CapabilityAssetLockV1[],
  context: GoldenAssetValidationContext,
): void {
  const providedEffects = new Set<string>();
  for (const lock of locks) {
    const manifest = resolveCapabilityAssetLock(lock).manifest;
    if (!manifest.profiles.includes(context.profile as FactoryProfile)) {
      throw new Error(
        `Capability asset lock '${lock.key}' does not support profile '${context.profile}'.`,
      );
    }
    for (const effect of manifest.effects) providedEffects.add(effect);
  }
  for (const capabilityKey of context.capabilityKeys) {
    if (!providedEffects.has(capabilityKey)) {
      throw new Error(
        `Graph capability '${capabilityKey}' is not provided by a locked Golden asset.`,
      );
    }
  }
}

export function getCapability(key: string): CapabilityDefinition {
  return definitionFor(getCapabilityAsset(key));
}

export function capabilitiesForProfile(
  profile: FactoryProfile,
): readonly CapabilityDefinition[] {
  return capabilityCatalog.filter((capability) =>
    capability.profiles.includes(profile),
  );
}

export interface ProfileGraphStarter {
  readonly profile: FactoryProfile;
  readonly graph: ApplicationGraphV1;
}

export type OptionalCapabilityKey = "core.audit" | "core.notification";

export interface ProfileComposition {
  readonly profile: FactoryProfile;
  readonly requiredCapabilities: readonly CapabilityDefinition[];
  readonly optionalCapabilities: readonly CapabilityDefinition[];
  readonly defaultOptionalCapabilities: readonly OptionalCapabilityKey[];
}

export interface ProfileCompositionInput {
  readonly profile: FactoryProfile;
  readonly optionalCapabilities?: readonly string[];
}

export interface ProfileCompositionResult {
  readonly profile: FactoryProfile;
  readonly graph: ApplicationGraphV1;
  readonly optionalCapabilities: readonly OptionalCapabilityKey[];
  readonly enabledEffects: readonly string[];
  readonly assetLocks: NonNullable<
    ApplicationGraphV1["integration"]["assetLocks"]
  >;
}

type ProfileCompositionRecipe = {
  readonly requiredCapabilities: readonly string[];
  readonly optionalCapabilities: readonly OptionalCapabilityKey[];
};

const compositionRecipes: Readonly<
  Record<FactoryProfile, ProfileCompositionRecipe>
> = {
  "expense-approval": {
    requiredCapabilities: ["core.crud", "core.workflow"],
    optionalCapabilities: ["core.audit", "core.notification"],
  },
  "restaurant-ordering": {
    requiredCapabilities: [
      "core.audit",
      "core.crud",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "restaurant.table-session",
      "restaurant.menu",
      "restaurant.ordering",
      "restaurant.kitchen",
      "restaurant.cashier",
      "restaurant.reporting",
    ],
    optionalCapabilities: ["core.notification"],
  },
  "simple-ecommerce": {
    requiredCapabilities: [
      "core.crud",
      "core.notification",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "commerce.simulated-payment",
    ],
    optionalCapabilities: ["core.audit"],
  },
};

const factoryCapabilities = (keys: readonly string[]) =>
  keys.map((key) => ({
    key,
    providerId: "factory",
    operation: key.split(".").at(-1) ?? key,
  }));

const starterGraph = (
  metadata: ApplicationGraphV1["metadata"],
  page: ApplicationGraphV1["page"],
  domain: ApplicationGraphV1["domain"],
  policy: ApplicationGraphV1["policy"],
  flow: ApplicationGraphV1["flow"],
  capabilityKeys: readonly string[],
): ApplicationGraphV1 => ({
  apiVersion: "factory.application-graph/v1",
  metadata,
  page,
  domain,
  policy,
  flow,
  integration: {
    providers: [],
    capabilities: factoryCapabilities(capabilityKeys),
  },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
});

export const profileGraphs: readonly ProfileGraphStarter[] = Object.freeze([
  {
    profile: "expense-approval",
    graph: starterGraph(
      {
        id: "expense-approval",
        workspaceId: "local-workspace",
        name: "Expense approval",
      },
      {
        pages: [
          {
            id: "expenses",
            route: "/expenses",
            title: "Expenses",
            blocks: [
              { id: "expense-list", type: "collection", entity: "expense" },
            ],
          },
          {
            id: "new-expense",
            route: "/expenses/new",
            title: "New expense",
            blocks: [{ id: "expense-form", type: "form", entity: "expense" }],
          },
        ],
        navigation: [
          {
            id: "expenses",
            label: "Expenses",
            pageId: "expenses",
            icon: "receipt",
          },
        ],
      },
      {
        entities: [
          {
            key: "expense",
            label: "Expense",
            fields: [
              { key: "amount", type: "decimal", required: true },
              { key: "description", type: "text", required: true },
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["draft", "submitted", "approved", "rejected"],
              },
            ],
            indexes: [{ fields: ["status"] }],
          },
        ],
        relations: [],
      },
      {
        roles: ["employee", "manager", "finance"],
        permissions: [
          {
            role: "employee",
            resource: "expense",
            actions: ["create", "read"],
          },
          {
            role: "manager",
            resource: "expense",
            actions: ["read", "approve", "reject"],
          },
          { role: "finance", resource: "expense", actions: ["read", "audit"] },
        ],
      },
      {
        flows: [
          {
            id: "expense-review",
            entity: "expense",
            initialState: "draft",
            states: ["draft", "submitted", "approved", "rejected"],
            events: ["submit", "approve", "reject"],
            transitions: [
              {
                from: "draft",
                event: "submit",
                to: "submitted",
                effects: [{ capability: "audit.record", operation: "record" }],
              },
              {
                from: "submitted",
                event: "approve",
                to: "approved",
                roles: ["manager"],
                effects: [{ capability: "audit.record", operation: "record" }],
              },
              {
                from: "submitted",
                event: "reject",
                to: "rejected",
                roles: ["manager"],
                effects: [{ capability: "audit.record", operation: "record" }],
              },
            ],
          },
        ],
      },
      ["audit.record", "notification.send"],
    ),
  },
  {
    profile: "restaurant-ordering",
    graph: starterGraph(
      {
        id: "restaurant-ordering",
        workspaceId: "local-workspace",
        name: "Restaurant ordering",
      },
      {
        pages: [
          {
            id: "table-entry",
            route: "/table/:token",
            title: "Join table",
            blocks: [
              {
                id: "table-session-entry",
                type: "restaurant-entry",
                entity: "table-session",
              },
            ],
          },
          {
            id: "customer-menu",
            route: "/menu",
            title: "Menu",
            blocks: [
              { id: "menu-browser", type: "menu-browser", entity: "menu-item" },
            ],
          },
          {
            id: "customer-cart",
            route: "/cart",
            title: "Cart",
            blocks: [
              { id: "order-cart", type: "order-cart", entity: "order" },
              {
                id: "payment-checkout",
                type: "payment-checkout",
                entity: "order",
              },
            ],
          },
          {
            id: "current-order",
            route: "/orders/current",
            title: "Current order",
            blocks: [
              { id: "order-tracker", type: "order-tracker", entity: "order" },
            ],
          },
          {
            id: "customer-receipt",
            route: "/receipt/:id",
            title: "Receipt",
            blocks: [{ id: "receipt", type: "receipt", entity: "order" }],
          },
          {
            id: "merchant-tables",
            route: "/merchant/tables",
            title: "Tables",
            blocks: [
              {
                id: "table-board",
                type: "table-board",
                entity: "restaurant-table",
              },
            ],
          },
          {
            id: "merchant-menu",
            route: "/merchant/menu",
            title: "Menu management",
            blocks: [
              { id: "menu-manager", type: "menu-manager", entity: "menu-item" },
            ],
          },
          {
            id: "merchant-kitchen",
            route: "/merchant/kitchen",
            title: "Kitchen",
            blocks: [
              {
                id: "kitchen-board",
                type: "kitchen-board",
                entity: "kitchen-ticket",
              },
            ],
          },
          {
            id: "merchant-cashier",
            route: "/merchant/cashier",
            title: "Cashier",
            blocks: [
              {
                id: "cashier-console",
                type: "cashier-console",
                entity: "order",
              },
            ],
          },
          {
            id: "merchant-analytics",
            route: "/merchant/analytics",
            title: "Restaurant analytics",
            blocks: [
              { id: "restaurant-dashboard", type: "restaurant-dashboard" },
            ],
          },
        ],
        navigation: [
          {
            id: "customer-menu",
            label: "Menu",
            pageId: "customer-menu",
            icon: "utensils",
          },
          {
            id: "customer-cart",
            label: "Cart",
            pageId: "customer-cart",
            icon: "shopping-bag",
          },
          {
            id: "current-order",
            label: "Current order",
            pageId: "current-order",
            icon: "receipt",
          },
          {
            id: "merchant-tables",
            label: "Tables",
            pageId: "merchant-tables",
            icon: "layout-grid",
          },
          {
            id: "merchant-menu",
            label: "Menu management",
            pageId: "merchant-menu",
            icon: "notebook-tabs",
          },
          {
            id: "merchant-kitchen",
            label: "Kitchen",
            pageId: "merchant-kitchen",
            icon: "chef-hat",
          },
          {
            id: "merchant-cashier",
            label: "Cashier",
            pageId: "merchant-cashier",
            icon: "badge-dollar-sign",
          },
          {
            id: "merchant-analytics",
            label: "Analytics",
            pageId: "merchant-analytics",
            icon: "chart-no-axes-combined",
          },
        ],
      },
      {
        entities: [
          {
            key: "restaurant-location",
            label: "Restaurant location",
            fields: [
              { key: "name", type: "string", required: true },
              { key: "currency", type: "string", required: true },
              { key: "active", type: "boolean", required: true },
            ],
            indexes: [],
          },
          {
            key: "restaurant-table",
            label: "Restaurant table",
            fields: [
              { key: "code", type: "string", required: true, unique: true },
              { key: "number", type: "integer", required: true, unique: true },
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["open", "seated", "closed"],
              },
              { key: "active", type: "boolean", required: true },
            ],
            indexes: [{ fields: ["status"] }],
          },
          {
            key: "table-session",
            label: "Table session",
            fields: [
              { key: "tableCode", type: "string", required: true },
              {
                key: "tokenDigest",
                type: "string",
                required: true,
                unique: true,
              },
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["open", "active", "closed"],
              },
              { key: "openedAt", type: "datetime", required: true },
              { key: "expiresAt", type: "datetime", required: true },
              { key: "guestCount", type: "integer", required: true },
            ],
            indexes: [
              { fields: ["tableCode", "status"] },
              { fields: ["expiresAt"] },
            ],
          },
          {
            key: "menu-category",
            label: "Menu category",
            fields: [
              { key: "name", type: "string", required: true },
              { key: "sortOrder", type: "integer", required: true },
              { key: "active", type: "boolean", required: true },
            ],
            indexes: [{ fields: ["active", "sortOrder"] }],
          },
          {
            key: "menu-item",
            label: "Menu item",
            fields: [
              { key: "categoryKey", type: "string", required: true },
              { key: "name", type: "string", required: true },
              { key: "description", type: "text", required: true },
              { key: "price", type: "decimal", required: true },
              { key: "available", type: "boolean", required: true },
              { key: "stock", type: "integer", required: true },
              {
                key: "preparationMinutes",
                type: "integer",
                required: true,
              },
              { key: "imageUrl", type: "url", required: true },
            ],
            indexes: [
              { fields: ["categoryKey", "available"] },
              { fields: ["stock"] },
            ],
          },
          {
            key: "order",
            label: "Order",
            fields: [
              { key: "tableSessionId", type: "string", required: true },
              {
                key: "status",
                type: "enum",
                required: true,
                values: [
                  "cart",
                  "submitted",
                  "paid",
                  "accepted",
                  "preparing",
                  "ready",
                  "served",
                  "cancelled",
                ],
              },
              {
                key: "paymentStatus",
                type: "enum",
                required: true,
                values: ["unpaid", "paid", "reversal-requested"],
              },
              {
                key: "fulfilmentType",
                type: "enum",
                required: true,
                values: ["dine-in"],
              },
              { key: "orderNote", type: "text", required: true },
              { key: "priority", type: "integer", required: true },
              { key: "total", type: "decimal", required: true },
              { key: "orderVersion", type: "integer", required: true },
              { key: "submittedAt", type: "datetime", required: false },
              { key: "paidAt", type: "datetime", required: false },
            ],
            indexes: [
              { fields: ["tableSessionId", "status"] },
              { fields: ["paymentStatus", "paidAt"] },
            ],
          },
          {
            key: "order-line",
            label: "Order line",
            fields: [
              { key: "orderId", type: "string", required: true },
              { key: "menuItemId", type: "string", required: true },
              { key: "quantity", type: "integer", required: true },
              { key: "unitPrice", type: "decimal", required: true },
              { key: "lineNote", type: "text", required: true },
              { key: "modifiers", type: "json", required: true },
            ],
            indexes: [{ fields: ["orderId"] }],
          },
          {
            key: "payment-attempt",
            label: "Payment attempt",
            fields: [
              { key: "orderId", type: "string", required: true },
              {
                key: "method",
                type: "enum",
                required: true,
                values: ["cash", "card"],
              },
              { key: "amount", type: "decimal", required: true },
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["pending", "succeeded", "failed", "reversed"],
              },
              {
                key: "idempotencyKey",
                type: "string",
                required: true,
                unique: true,
              },
              { key: "paidAt", type: "datetime", required: false },
            ],
            indexes: [
              { fields: ["orderId", "status"] },
              { fields: ["idempotencyKey"], unique: true },
            ],
          },
          {
            key: "kitchen-ticket",
            label: "Kitchen ticket",
            fields: [
              { key: "orderId", type: "string", required: true, unique: true },
              { key: "tableNumber", type: "integer", required: true },
              { key: "priority", type: "integer", required: true },
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["paid", "accepted", "preparing", "ready"],
              },
              { key: "acceptedAt", type: "datetime", required: false },
              { key: "startedAt", type: "datetime", required: false },
              { key: "readyAt", type: "datetime", required: false },
            ],
            indexes: [{ fields: ["priority", "status", "tableNumber"] }],
          },
          {
            key: "inventory-ledger",
            label: "Inventory ledger",
            fields: [
              { key: "menuItemId", type: "string", required: true },
              { key: "orderId", type: "string", required: false },
              { key: "delta", type: "integer", required: true },
              {
                key: "provenance",
                type: "enum",
                required: true,
                values: [
                  "order-reservation",
                  "order-release",
                  "manager-adjustment",
                ],
              },
              {
                key: "adjustmentReason",
                type: "enum",
                required: false,
                values: [
                  "stock-count",
                  "restock",
                  "spoilage",
                  "damage",
                  "correction",
                ],
              },
              { key: "recordedAt", type: "datetime", required: true },
            ],
            indexes: [
              { fields: ["menuItemId", "recordedAt"] },
              { fields: ["orderId"] },
            ],
          },
        ],
        relations: [
          {
            from: "restaurant-location",
            to: "restaurant-table",
            kind: "one-to-many",
          },
          {
            from: "table-session",
            to: "restaurant-table",
            kind: "many-to-one",
            field: "tableCode",
          },
          {
            from: "menu-item",
            to: "menu-category",
            kind: "many-to-one",
            field: "categoryKey",
          },
          {
            from: "order",
            to: "table-session",
            kind: "many-to-one",
            field: "tableSessionId",
          },
          {
            from: "order-line",
            to: "order",
            kind: "many-to-one",
            field: "orderId",
          },
          {
            from: "order-line",
            to: "menu-item",
            kind: "many-to-one",
            field: "menuItemId",
          },
          {
            from: "payment-attempt",
            to: "order",
            kind: "many-to-one",
            field: "orderId",
          },
          {
            from: "kitchen-ticket",
            to: "order",
            kind: "one-to-one",
            field: "orderId",
          },
          {
            from: "inventory-ledger",
            to: "menu-item",
            kind: "many-to-one",
            field: "menuItemId",
          },
          {
            from: "inventory-ledger",
            to: "order",
            kind: "many-to-one",
            field: "orderId",
          },
        ],
        seedData: [
          {
            entity: "restaurant-location",
            id: "main-location",
            values: { name: "Main restaurant", currency: "USD", active: true },
          },
          {
            entity: "restaurant-table",
            id: "table-12",
            values: { code: "T12", number: 12, status: "open", active: true },
          },
          {
            entity: "menu-category",
            id: "mains",
            values: { name: "Mains", sortOrder: 1, active: true },
          },
          {
            entity: "menu-item",
            id: "margherita-pizza",
            values: {
              categoryKey: "mains",
              name: "Margherita pizza",
              description: "Tomato, mozzarella, and basil",
              price: 14,
              available: true,
              stock: 12,
              preparationMinutes: 12,
              imageUrl: "/menu/margherita-pizza.jpg",
            },
          },
          {
            entity: "menu-item",
            id: "mushroom-risotto",
            values: {
              categoryKey: "mains",
              name: "Mushroom risotto",
              description: "Arborio rice and mushrooms",
              price: 18,
              available: true,
              stock: 8,
              preparationMinutes: 18,
              imageUrl: "/menu/mushroom-risotto.jpg",
            },
          },
        ],
      },
      {
        roles: ["customer", "kitchen", "cashier", "manager"],
        permissions: [
          { role: "customer", resource: "table-session", actions: ["read"] },
          { role: "customer", resource: "menu-category", actions: ["read"] },
          { role: "customer", resource: "menu-item", actions: ["read"] },
          {
            role: "customer",
            resource: "order",
            actions: ["create", "read", "update"],
          },
          {
            role: "customer",
            resource: "order-line",
            actions: ["create", "read", "update", "delete"],
          },
          {
            role: "kitchen",
            resource: "kitchen-ticket",
            actions: ["read", "update"],
          },
          { role: "kitchen", resource: "order", actions: ["read", "update"] },
          {
            role: "cashier",
            resource: "payment-attempt",
            actions: ["create", "read"],
          },
          { role: "cashier", resource: "order", actions: ["read", "update"] },
          {
            role: "manager",
            resource: "restaurant-table",
            actions: ["create", "read", "update"],
          },
          {
            role: "manager",
            resource: "table-session",
            actions: ["create", "read", "update"],
          },
          {
            role: "manager",
            resource: "menu-category",
            actions: ["create", "read", "update"],
          },
          {
            role: "manager",
            resource: "menu-item",
            actions: ["create", "read", "update"],
          },
          {
            role: "manager",
            resource: "order",
            actions: ["read", "audit"],
          },
          {
            role: "manager",
            resource: "order",
            actions: ["update", "cancel"],
          },
          {
            role: "manager",
            resource: "inventory-ledger",
            actions: ["create", "read", "audit"],
          },
        ],
      },
      {
        flows: [
          {
            id: "restaurant-table-session",
            entity: "table-session",
            initialState: "open",
            states: ["open", "active", "closed"],
            events: ["activate", "close", "expire"],
            transitions: [
              {
                from: "open",
                event: "activate",
                to: "active",
                roles: ["manager"],
              },
              {
                from: "active",
                event: "close",
                to: "closed",
                roles: ["manager"],
                effects: [{ capability: "audit.record", operation: "record" }],
              },
              { from: "open", event: "expire", to: "closed" },
              { from: "active", event: "expire", to: "closed" },
            ],
          },
          {
            id: "restaurant-order",
            entity: "order",
            initialState: "cart",
            states: [
              "cart",
              "submitted",
              "paid",
              "accepted",
              "preparing",
              "ready",
              "served",
              "cancelled",
            ],
            events: [
              "submit",
              "pay",
              "accept",
              "start-preparing",
              "mark-ready",
              "serve",
              "cancel",
            ],
            transitions: [
              {
                from: "cart",
                event: "submit",
                to: "submitted",
                roles: ["customer"],
                effects: [
                  { capability: "order.create", operation: "create" },
                  { capability: "inventory.reserve", operation: "reserve" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "submitted",
                event: "pay",
                to: "paid",
                roles: ["customer", "cashier"],
                effects: [
                  { capability: "payment.simulate", operation: "simulate" },
                  { capability: "inventory.decrement", operation: "decrement" },
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "paid",
                event: "accept",
                to: "accepted",
                roles: ["kitchen"],
                effects: [
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "accepted",
                event: "start-preparing",
                to: "preparing",
                roles: ["kitchen"],
                effects: [
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "preparing",
                event: "mark-ready",
                to: "ready",
                roles: ["kitchen"],
                effects: [
                  { capability: "order.transition", operation: "transition" },
                  { capability: "notification.send", operation: "send" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "ready",
                event: "serve",
                to: "served",
                roles: ["cashier"],
                effects: [
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "submitted",
                event: "cancel",
                to: "cancelled",
                roles: ["manager"],
                effects: [
                  { capability: "inventory.release", operation: "release" },
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
              {
                from: "paid",
                event: "cancel",
                to: "cancelled",
                roles: ["manager"],
                effects: [
                  { capability: "order.transition", operation: "transition" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
            ],
          },
          {
            id: "restaurant-inventory-ledger",
            entity: "inventory-ledger",
            initialState: "recorded",
            states: ["recorded"],
            events: ["record-manager-adjustment"],
            transitions: [
              {
                from: "recorded",
                event: "record-manager-adjustment",
                to: "recorded",
                roles: ["manager"],
                effects: [
                  { capability: "inventory.adjust", operation: "adjust" },
                  { capability: "audit.record", operation: "record" },
                ],
              },
            ],
          },
        ],
      },
      [
        "catalog.list",
        "catalog.read",
        "cart.add",
        "cart.remove",
        "cart.checkout",
        "inventory.reserve",
        "inventory.release",
        "inventory.decrement",
        "order.create",
        "order.transition",
        "payment.simulate",
        "table-session.create",
        "table-session.validate",
        "table-session.close",
        "table-session.expire",
        "menu.category.list",
        "menu.item.list",
        "menu.item.search",
        "menu.item.manage",
        "inventory.adjust",
        "order.line.add",
        "order.line.update",
        "order.line.remove",
        "order.submit",
        "order.cancel",
        "order.history",
        "kitchen.ticket.create",
        "kitchen.ticket.accept",
        "kitchen.ticket.prepare",
        "kitchen.ticket.ready",
        "payment.reversal.request",
        "order.serve",
        "receipt.render",
        "report.restaurant.summary",
        "report.restaurant.low-stock",
        "notification.send",
        "audit.record",
      ],
    ),
  },
  {
    profile: "simple-ecommerce",
    graph: starterGraph(
      {
        id: "simple-ecommerce",
        workspaceId: "local-workspace",
        name: "Simple ecommerce",
      },
      {
        pages: [
          {
            id: "catalog",
            route: "/",
            title: "Catalog",
            blocks: [
              { id: "product-catalog", type: "catalog", entity: "product" },
            ],
          },
          {
            id: "checkout",
            route: "/checkout",
            title: "Checkout",
            blocks: [
              { id: "checkout-form", type: "checkout", entity: "order" },
            ],
          },
          {
            id: "orders",
            route: "/orders",
            title: "Orders",
            blocks: [{ id: "order-list", type: "collection", entity: "order" }],
          },
        ],
        navigation: [
          { id: "catalog", label: "Catalog", pageId: "catalog", icon: "store" },
          { id: "orders", label: "Orders", pageId: "orders", icon: "package" },
        ],
      },
      {
        entities: [
          {
            key: "product",
            label: "Product",
            fields: [
              { key: "name", type: "string", required: true },
              { key: "price", type: "decimal", required: true },
              { key: "stock", type: "integer", required: true },
            ],
            indexes: [],
          },
          {
            key: "order",
            label: "Order",
            fields: [
              {
                key: "status",
                type: "enum",
                required: true,
                values: ["cart", "paid", "fulfilled"],
              },
            ],
            indexes: [{ fields: ["status"] }],
          },
        ],
        relations: [{ from: "order", to: "product", kind: "many-to-many" }],
        seedData: [
          {
            entity: "product",
            id: "everyday-tote",
            values: { name: "Everyday tote", price: 48, stock: 20 },
          },
          {
            entity: "product",
            id: "studio-lamp",
            values: { name: "Studio lamp", price: 85, stock: 8 },
          },
        ],
      },
      {
        roles: ["customer", "operator"],
        permissions: [
          { role: "customer", resource: "product", actions: ["read"] },
          { role: "customer", resource: "order", actions: ["create", "read"] },
          {
            role: "operator",
            resource: "product",
            actions: ["create", "read", "update"],
          },
          { role: "operator", resource: "order", actions: ["read", "update"] },
        ],
      },
      {
        flows: [
          {
            id: "ecommerce-order",
            entity: "order",
            initialState: "cart",
            states: ["cart", "paid", "fulfilled"],
            events: ["pay", "fulfil"],
            transitions: [
              {
                from: "cart",
                event: "pay",
                to: "paid",
                effects: [
                  { capability: "payment.simulate", operation: "simulate" },
                  { capability: "inventory.decrement", operation: "decrement" },
                ],
              },
              {
                from: "paid",
                event: "fulfil",
                to: "fulfilled",
                roles: ["operator"],
                effects: [{ capability: "audit.record", operation: "record" }],
              },
            ],
          },
        ],
      },
      [
        "catalog.list",
        "catalog.read",
        "cart.add",
        "cart.remove",
        "cart.checkout",
        "inventory.reserve",
        "inventory.release",
        "inventory.decrement",
        "order.create",
        "order.transition",
        "payment.simulate",
        "audit.record",
        "notification.send",
      ],
    ),
  },
]);

function profileStarterFor(profile: FactoryProfile): ProfileGraphStarter {
  const starter = profileGraphs.find(
    (candidate) => candidate.profile === profile,
  );
  if (!starter) throw new Error(`Unknown Factory profile '${profile}'.`);
  return starter;
}

export function getProfileComposition(
  profile: FactoryProfile,
): ProfileComposition {
  const recipe = compositionRecipes[profile];
  if (!recipe) throw new Error(`Unknown Factory profile '${profile}'.`);
  profileStarterFor(profile);
  return {
    profile,
    requiredCapabilities: recipe.requiredCapabilities.map(getCapability),
    optionalCapabilities: recipe.optionalCapabilities.map(getCapability),
    defaultOptionalCapabilities: [...recipe.optionalCapabilities],
  };
}

/**
 * Creates and validates a fresh Graph from a trusted profile starter, applying
 * only each selected asset's declared adapter. Control Plane repeats validation
 * before persistence as an independent server-side boundary.
 */
export function composeProfileDraft(
  input: ProfileCompositionInput,
): ProfileCompositionResult {
  const composition = getProfileComposition(input.profile);
  const requested = input.optionalCapabilities
    ? [...input.optionalCapabilities]
    : [...composition.defaultOptionalCapabilities];
  const requestedSet = new Set(requested);
  if (requestedSet.size !== requested.length) {
    throw new Error("Optional capability selections must be unique.");
  }
  for (const capability of requested) {
    if (
      !composition.defaultOptionalCapabilities.includes(
        capability as OptionalCapabilityKey,
      )
    ) {
      throw new Error(
        `Optional capability '${capability}' is not supported by profile '${input.profile}'.`,
      );
    }
  }

  const graph = structuredClone(profileStarterFor(input.profile).graph);
  for (const capability of composition.defaultOptionalCapabilities) {
    if (requestedSet.has(capability)) continue;
    const asset = getCapabilityAsset(capability);
    if (!asset.disable) {
      throw new Error(
        `Optional capability asset '${capability}' does not declare a bounded disable adapter.`,
      );
    }
    asset.disable(graph);
  }

  const selectedAssets = [
    ...composition.requiredCapabilities.map((capability) =>
      getCapabilityAsset(capability.key),
    ),
    ...composition.defaultOptionalCapabilities
      .filter((capability) => requestedSet.has(capability))
      .map(getCapabilityAsset),
  ];
  graph.integration.compositionProfile = input.profile;
  graph.integration.assetLocks = selectedAssets.map(lockCapabilityAsset);

  const validatedGraph = assertValidApplicationGraph(graph);
  assertGoldenCapabilityAssetLocks(
    validatedGraph.integration.assetLocks ?? [],
    {
      profile: input.profile,
      capabilityKeys: validatedGraph.integration.capabilities.map(
        (capability) => capability.key,
      ),
    },
  );
  if (input.profile === "restaurant-ordering") {
    assertRestaurantOrderingProfile(validatedGraph);
  }
  return {
    profile: input.profile,
    graph: validatedGraph,
    optionalCapabilities: composition.defaultOptionalCapabilities.filter(
      (capability) => requestedSet.has(capability),
    ),
    enabledEffects: validatedGraph.integration.capabilities.map(
      (capability) => capability.key,
    ),
    assetLocks: validatedGraph.integration.assetLocks ?? [],
  };
}
