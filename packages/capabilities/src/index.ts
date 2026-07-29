import {
  assertValidApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph/browser";

export type FactoryProfile =
  "expense-approval" | "restaurant-ordering" | "simple-ecommerce";

export type CapabilityCategory = "core" | "commerce";

export interface CapabilityDefinition {
  readonly key: string;
  readonly name: string;
  readonly category: CapabilityCategory;
  readonly description: string;
  readonly profiles: readonly FactoryProfile[];
  readonly effects: readonly string[];
}

const catalog: readonly CapabilityDefinition[] = [
  {
    key: "core.audit",
    name: "Audit trail",
    category: "core",
    description:
      "Records actor, action, subject, and immutable timestamp evidence.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["audit.record"],
  },
  {
    key: "core.crud",
    name: "Managed records",
    category: "core",
    description:
      "Creates, reads, updates, and deletes validated domain records.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["data.create", "data.read", "data.update", "data.delete"],
  },
  {
    key: "core.notification",
    name: "Notifications",
    category: "core",
    description: "Emits bounded in-app and provider-ready notification events.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["notification.send"],
  },
  {
    key: "core.workflow",
    name: "Workflow",
    category: "core",
    description: "Runs declared state transitions, guards, and human tasks.",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["flow.transition", "flow.assign-task"],
  },
  {
    key: "commerce.catalog",
    name: "Catalog",
    category: "commerce",
    description: "Publishes browsable products or menu items.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["catalog.list", "catalog.read"],
  },
  {
    key: "commerce.cart",
    name: "Cart",
    category: "commerce",
    description: "Maintains a customer-owned set of purchasable line items.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["cart.add", "cart.remove", "cart.checkout"],
  },
  {
    key: "commerce.inventory",
    name: "Inventory",
    category: "commerce",
    description: "Tracks and reserves available stock or menu availability.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["inventory.reserve", "inventory.release", "inventory.decrement"],
  },
  {
    key: "commerce.order",
    name: "Order lifecycle",
    category: "commerce",
    description: "Creates orders and manages declared fulfilment states.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["order.create", "order.transition"],
  },
  {
    key: "commerce.simulated-payment",
    name: "Simulated payment",
    category: "commerce",
    description:
      "Confirms a deterministic, credential-free payment simulation.",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["payment.simulate"],
  },
] as const;

export const capabilityCatalog = Object.freeze([...catalog]);

export function getCapability(key: string): CapabilityDefinition {
  const capability = capabilityCatalog.find((entry) => entry.key === key);
  if (!capability) {
    throw new Error(`Unknown Factory capability: ${key}`);
  }
  return capability;
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
      "commerce.simulated-payment",
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

const optionalCapabilityOperations: Readonly<
  Record<OptionalCapabilityKey, readonly string[]>
> = {
  "core.audit": ["audit.record"],
  "core.notification": ["notification.send"],
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
            id: "menu",
            route: "/menu",
            title: "Menu",
            blocks: [
              { id: "menu-catalog", type: "catalog", entity: "menu-item" },
            ],
          },
          {
            id: "cart",
            route: "/cart",
            title: "Cart",
            blocks: [{ id: "cart-lines", type: "cart", entity: "order" }],
          },
          {
            id: "kitchen",
            route: "/kitchen",
            title: "Kitchen",
            blocks: [{ id: "kitchen-queue", type: "queue", entity: "order" }],
          },
        ],
        navigation: [
          { id: "menu", label: "Menu", pageId: "menu", icon: "utensils" },
          { id: "cart", label: "Cart", pageId: "cart", icon: "shopping-bag" },
          {
            id: "kitchen",
            label: "Kitchen",
            pageId: "kitchen",
            icon: "chef-hat",
          },
        ],
      },
      {
        entities: [
          {
            key: "menu-item",
            label: "Menu item",
            fields: [
              { key: "name", type: "string", required: true },
              { key: "price", type: "decimal", required: true },
              { key: "available", type: "boolean", required: true },
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
                values: ["cart", "paid", "preparing", "ready"],
              },
            ],
            indexes: [{ fields: ["status"] }],
          },
        ],
        relations: [{ from: "order", to: "menu-item", kind: "many-to-many" }],
        seedData: [
          {
            entity: "menu-item",
            id: "margherita-pizza",
            values: {
              name: "Margherita pizza",
              price: 14,
              available: true,
              stock: 12,
            },
          },
          {
            entity: "menu-item",
            id: "mushroom-risotto",
            values: {
              name: "Mushroom risotto",
              price: 18,
              available: true,
              stock: 8,
            },
          },
        ],
      },
      {
        roles: ["customer", "kitchen", "manager"],
        permissions: [
          { role: "customer", resource: "menu-item", actions: ["read"] },
          { role: "customer", resource: "order", actions: ["create", "read"] },
          { role: "kitchen", resource: "order", actions: ["read", "update"] },
          { role: "manager", resource: "order", actions: ["read", "audit"] },
        ],
      },
      {
        flows: [
          {
            id: "restaurant-order",
            entity: "order",
            initialState: "cart",
            states: ["cart", "paid", "preparing", "ready"],
            events: ["pay", "start-preparing", "mark-ready"],
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
                event: "start-preparing",
                to: "preparing",
                roles: ["kitchen"],
              },
              {
                from: "preparing",
                event: "mark-ready",
                to: "ready",
                roles: ["kitchen"],
                effects: [
                  { capability: "notification.send", operation: "send" },
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

function removeCapabilityOperations(
  graph: ApplicationGraphV1,
  operations: readonly string[],
): void {
  const excluded = new Set(operations);
  graph.integration.capabilities = graph.integration.capabilities.filter(
    (capability) => !excluded.has(capability.key),
  );
  graph.flow.flows = graph.flow.flows.map((flow) => ({
    ...flow,
    transitions: flow.transitions.map((transition) => {
      const effects = transition.effects?.filter(
        (effect) => !excluded.has(effect.capability),
      );
      if (effects?.length) return { ...transition, effects };
      const { effects: _effects, ...withoutEffects } = transition;
      return withoutEffects;
    }),
  }));
}

function removeAuditPermissions(graph: ApplicationGraphV1): void {
  graph.policy.permissions = graph.policy.permissions.flatMap((permission) => {
    const actions = permission.actions.filter((action) => action !== "audit");
    return actions.length ? [{ ...permission, actions }] : [];
  });
}

/**
 * Creates and validates a fresh Graph from a trusted profile starter, applying
 * only declared optional-capability removals. Control Plane repeats validation
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
    removeCapabilityOperations(graph, optionalCapabilityOperations[capability]);
    if (capability === "core.audit") removeAuditPermissions(graph);
  }

  const validatedGraph = assertValidApplicationGraph(graph);
  return {
    profile: input.profile,
    graph: validatedGraph,
    optionalCapabilities: composition.defaultOptionalCapabilities.filter(
      (capability) => requestedSet.has(capability),
    ),
    enabledEffects: validatedGraph.integration.capabilities.map(
      (capability) => capability.key,
    ),
  };
}
