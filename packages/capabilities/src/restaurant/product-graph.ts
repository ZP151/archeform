import {
  CompositionError,
  assertApplicationGraphV3,
  assertExperienceBrief,
  assertProductIntent,
  type ApplicationGraphV3,
  type DraftRevisionV1,
  type ExperienceBriefV1,
  type ProductIntentV1,
} from "@factory/graph";

import {
  bindingTarget,
  fieldAuthoritiesFor,
  type ProductBindingSpec,
} from "../commerce/product-recipe.js";
import { assertRestaurantOrderingProfile } from "./profile.js";
import {
  restaurantAcceptanceJourneyKeys,
  restaurantOrderingProductRecipe,
  restaurantProductPages,
} from "./product-recipe.js";

export interface ComposeRestaurantProductGraphInput {
  readonly intent: ProductIntentV1;
  readonly experience: ExperienceBriefV1;
  readonly baseDraft: DraftRevisionV1;
}

const d = (
  bindingKey: string,
  entityKey: string,
  fieldKey: string,
  access: "read" | "write",
): ProductBindingSpec => ({
  kind: "domain-field",
  bindingKey,
  entityKey,
  fieldKey,
  access,
});
const f = (
  bindingKey: string,
  flowKey: string,
  from: string,
  event: string,
  to: string,
): ProductBindingSpec => ({
  kind: "flow-transition",
  bindingKey,
  flowKey,
  from,
  event,
  to,
  access: "request",
});
const p = (
  bindingKey: string,
  roleKey: string,
  resource: string,
  action: string,
): ProductBindingSpec => ({
  kind: "policy-permission",
  bindingKey,
  roleKey,
  resource,
  action,
  access: "evaluate",
});

const bindingSpecs: Readonly<Record<string, readonly ProductBindingSpec[]>> = {
  "customer-home/home-hero": [
    d("locationName", "restaurant-location", "name", "read"),
    d("serviceOpen", "restaurant-location", "serviceOpen", "read"),
  ],
  "customer-home/home-categories": [
    d("categoryName", "menu-category", "name", "read"),
    d("categoryActive", "menu-category", "active", "read"),
  ],
  "customer-home/home-items": [
    d("name", "menu-item", "name", "read"),
    d("description", "menu-item", "description", "read"),
    d("price", "menu-item", "price", "read"),
    d("available", "menu-item", "available", "read"),
    d("imageUrl", "menu-item", "imageUrl", "read"),
  ],
  "customer-menu/menu-categories": [
    d("categoryName", "menu-category", "name", "read"),
    d("categoryActive", "menu-category", "active", "read"),
  ],
  "customer-menu/menu-items": [
    d("name", "menu-item", "name", "read"),
    d("description", "menu-item", "description", "read"),
    d("price", "menu-item", "price", "read"),
    d("available", "menu-item", "available", "read"),
    d("imageUrl", "menu-item", "imageUrl", "read"),
  ],
  "customer-dish-detail/dish-configurator": [
    d("name", "menu-item", "name", "read"),
    d("description", "menu-item", "description", "read"),
    d("price", "menu-item", "price", "read"),
    d("available", "menu-item", "available", "read"),
    d("groupName", "menu-option-group", "name", "read"),
    d("minimumSelections", "menu-option-group", "minimumSelections", "read"),
    d("maximumSelections", "menu-option-group", "maximumSelections", "read"),
    d("optionLabel", "menu-option", "label", "read"),
    d("priceDelta", "menu-option", "priceDelta", "read"),
    p("canAdd", "customer", "order-line", "create"),
  ],
  "customer-cart/cart-lines": [
    d("quantity", "order-line", "quantity", "write"),
    d("lineNote", "order-line", "lineNote", "write"),
    d("modifiers", "order-line", "modifiers", "write"),
    d("unitPrice", "order-line", "unitPrice", "read"),
  ],
  "customer-cart/cart-summary": [
    d("total", "order", "total", "read"),
    d("status", "order", "status", "read"),
    f("submit", "restaurant-order", "cart", "submit", "submitted"),
    p("canSubmit", "customer", "order", "submit"),
  ],
  "customer-checkout/checkout-summary": [
    d("total", "order", "total", "read"),
    d("status", "order", "status", "read"),
  ],
  "customer-checkout/checkout-payment": [
    d("method", "payment-attempt", "method", "write"),
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("attemptStatus", "payment-attempt", "status", "read"),
    d("amount", "payment-attempt", "amount", "read"),
    f("pay", "restaurant-order", "submitted", "pay", "paid"),
    p("canPay", "customer", "order", "pay"),
  ],
  "customer-orders/customer-order-list": [
    d("status", "order", "status", "read"),
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("priority", "order", "priority", "read"),
    d("total", "order", "total", "read"),
  ],
  "customer-order-detail/customer-order-summary": [
    d("total", "order", "total", "read"),
    d("status", "order", "status", "read"),
    d("fulfilmentType", "order", "fulfilmentType", "read"),
    d("orderNote", "order", "orderNote", "read"),
  ],
  "customer-order-detail/customer-payment-state": [
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("attemptStatus", "payment-attempt", "status", "read"),
    d("amount", "payment-attempt", "amount", "read"),
  ],
  "customer-order-detail/customer-order-timeline": [
    d("status", "order", "status", "read"),
    d("submittedAt", "order", "submittedAt", "read"),
    d("paidAt", "order", "paidAt", "read"),
  ],
  "customer-profile/customer-profile-form": [
    d("subjectRef", "restaurant-principal", "subjectRef", "read"),
    d("displayName", "restaurant-principal", "displayName", "write"),
    d("email", "restaurant-principal", "email", "read"),
    d("locale", "restaurant-principal", "locale", "write"),
    d("marketingOptIn", "restaurant-principal", "marketingOptIn", "write"),
    d("role", "restaurant-principal", "role", "read"),
  ],
  "merchant-dashboard/dashboard-metrics": [
    d("orderTotal", "order", "total", "read"),
    d("orderStatus", "order", "status", "read"),
    d("tableStatus", "restaurant-table", "status", "read"),
    d("menuAvailable", "menu-item", "available", "read"),
  ],
  "merchant-dashboard/dashboard-orders": [
    d("status", "order", "status", "read"),
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("priority", "order", "priority", "read"),
    d("total", "order", "total", "read"),
  ],
  "merchant-dashboard/dashboard-tables": [
    d("number", "restaurant-table", "number", "read"),
    d("capacity", "restaurant-table", "capacity", "read"),
    d("status", "restaurant-table", "status", "read"),
    d("active", "restaurant-table", "active", "read"),
  ],
  "merchant-menu-management/merchant-menu-table": [
    d("name", "menu-item", "name", "write"),
    d("description", "menu-item", "description", "write"),
    d("price", "menu-item", "price", "write"),
    d("available", "menu-item", "available", "write"),
    d("stock", "menu-item", "stock", "read"),
    d("preparationMinutes", "menu-item", "preparationMinutes", "write"),
  ],
  "merchant-menu-management/merchant-availability": [
    d("available", "menu-item", "available", "write"),
    f(
      "adjustInventory",
      "restaurant-inventory-ledger",
      "recorded",
      "record-manager-adjustment",
      "recorded",
    ),
    p(
      "canAdjustInventory",
      "manager",
      "inventory-ledger",
      "record-manager-adjustment",
    ),
  ],
  "merchant-orders/merchant-order-list": [
    d("status", "order", "status", "read"),
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("priority", "order", "priority", "write"),
    d("total", "order", "total", "read"),
  ],
  "merchant-orders/merchant-order-summary": [
    d("total", "order", "total", "read"),
    d("status", "order", "status", "read"),
    d("orderNote", "order", "orderNote", "read"),
    f(
      "cancelSubmitted",
      "restaurant-order",
      "submitted",
      "cancel",
      "cancelled",
    ),
    f("cancelPaid", "restaurant-order", "paid", "cancel", "cancelled"),
    p("canCancel", "manager", "order", "cancel"),
  ],
  "merchant-orders/merchant-payment-state": [
    d("paymentStatus", "order", "paymentStatus", "read"),
    d("attemptStatus", "payment-attempt", "status", "read"),
    d("amount", "payment-attempt", "amount", "read"),
    f("pay", "restaurant-order", "submitted", "pay", "paid"),
    p("canPay", "cashier", "order", "pay"),
  ],
  "merchant-kitchen-queue/kitchen-tickets": [
    d("ticketStatus", "kitchen-ticket", "status", "read"),
    d("priority", "kitchen-ticket", "priority", "read"),
    d("acceptedAt", "kitchen-ticket", "acceptedAt", "read"),
    d("startedAt", "kitchen-ticket", "startedAt", "read"),
    d("readyAt", "kitchen-ticket", "readyAt", "read"),
    f("accept", "restaurant-order", "paid", "accept", "accepted"),
    f(
      "startPreparing",
      "restaurant-order",
      "accepted",
      "start-preparing",
      "preparing",
    ),
    f("markReady", "restaurant-order", "preparing", "mark-ready", "ready"),
    p("canAccept", "kitchen", "order", "accept"),
    p("canStartPreparing", "kitchen", "order", "start-preparing"),
    p("canMarkReady", "kitchen", "order", "mark-ready"),
  ],
  "merchant-tables/merchant-table-map": [
    d("code", "restaurant-table", "code", "write"),
    d("number", "restaurant-table", "number", "write"),
    d("capacity", "restaurant-table", "capacity", "write"),
    d("status", "restaurant-table", "status", "read"),
    d("active", "restaurant-table", "active", "write"),
    f("activate", "restaurant-table-session", "open", "activate", "active"),
    f("close", "restaurant-table-session", "active", "close", "closed"),
    f("expireOpen", "restaurant-table-session", "open", "expire", "closed"),
    f("expireActive", "restaurant-table-session", "active", "expire", "closed"),
    p("canActivate", "manager", "table-session", "activate"),
    p("canClose", "manager", "table-session", "close"),
    p("canExpire", "manager", "table-session", "expire"),
  ],
  "merchant-users-roles/merchant-role-matrix": [
    d("subjectRef", "restaurant-principal", "subjectRef", "read"),
    d("displayName", "restaurant-principal", "displayName", "read"),
    d("email", "restaurant-principal", "email", "read"),
    d("role", "restaurant-principal", "role", "read"),
    d("active", "restaurant-principal", "active", "read"),
    p("canManage", "manager", "restaurant-principal", "update"),
  ],
  "merchant-settings/restaurant-settings-form": [
    d("name", "restaurant-location", "name", "write"),
    d("currency", "restaurant-location", "currency", "write"),
    d("taxRate", "restaurant-location", "taxRate", "write"),
    d("serviceChargeRate", "restaurant-location", "serviceChargeRate", "write"),
    d("timezone", "restaurant-location", "timezone", "write"),
    d("logoUrl", "restaurant-location", "logoUrl", "write"),
    d("serviceOpen", "restaurant-location", "serviceOpen", "write"),
    p("canConfigure", "manager", "restaurant-location", "update"),
  ],
};

const addedFields: Readonly<
  Record<
    string,
    readonly ApplicationGraphV3["domain"]["entities"][number]["fields"][number][]
  >
> = {
  "restaurant-principal": [
    { key: "displayName", type: "string", required: false },
    { key: "email", type: "email", required: false },
    { key: "locale", type: "string", required: false },
    { key: "marketingOptIn", type: "boolean", required: false },
  ],
  "restaurant-location": [
    { key: "taxRate", type: "decimal", required: false },
    { key: "serviceChargeRate", type: "decimal", required: false },
    { key: "timezone", type: "string", required: false },
    { key: "logoUrl", type: "url", required: false },
    { key: "serviceOpen", type: "boolean", required: false },
  ],
  "restaurant-table": [{ key: "capacity", type: "integer", required: false }],
};

const pageRemapping: Readonly<Record<string, string>> = {
  "table-entry": "customer-home",
  "customer-menu": "customer-menu",
  "customer-cart": "customer-cart",
  "current-order": "customer-orders",
  "customer-receipt": "customer-order-detail",
  "merchant-analytics": "merchant-dashboard",
  "merchant-menu": "merchant-menu-management",
  "merchant-cashier": "merchant-orders",
  "merchant-kitchen": "merchant-kitchen-queue",
  "merchant-tables": "merchant-tables",
};

function remapSelectionPages(
  selections: NonNullable<
    ApplicationGraphV3["integration"]["compositionSelections"]
  >,
): NonNullable<ApplicationGraphV3["integration"]["compositionSelections"]> {
  return selections.map((selection) => ({
    lock: structuredClone(selection.lock),
    bindings: Object.fromEntries(
      Object.entries(selection.bindings).map(([key, value]) => {
        if (
          typeof value !== "object" ||
          value === null ||
          !("graphSymbol" in value)
        )
          return [key, structuredClone(value)];
        const symbol = value.graphSymbol;
        if (!symbol.startsWith("graph.page."))
          return [key, structuredClone(value)];
        const oldPage = symbol.slice("graph.page.".length);
        return [
          key,
          {
            ...structuredClone(value),
            graphSymbol: `graph.page.${pageRemapping[oldPage] ?? oldPage}`,
          },
        ];
      }),
    ),
  }));
}

function grant(
  permissions: ApplicationGraphV3["policy"]["permissions"],
  role: string,
  resource: string,
  action: string,
): void {
  if (
    permissions.some(
      (entry) =>
        entry.role === role &&
        entry.resource === resource &&
        entry.actions.includes(action),
    )
  )
    return;
  const entry = permissions.find(
    (candidate) => candidate.role === role && candidate.resource === resource,
  );
  if (entry) entry.actions.push(action);
  else permissions.push({ role, resource, actions: [action] });
}

function journeys(): ApplicationGraphV3["journeys"] {
  const step = (
    flowKey: string,
    from: string,
    event: string,
    to: string,
    actorRoleKey: string,
  ) => ({ flowKey, from, event, to, actorRoleKey });
  return [
    {
      key: restaurantAcceptanceJourneyKeys[0],
      label: "Customer places an order",
      entryPageKey: "customer-home",
      outcome: "A guest order is paid, prepared, ready, and served.",
      steps: [
        step("restaurant-order", "cart", "submit", "submitted", "customer"),
        step("restaurant-order", "submitted", "pay", "paid", "customer"),
        step("restaurant-order", "paid", "accept", "accepted", "kitchen"),
        step(
          "restaurant-order",
          "accepted",
          "start-preparing",
          "preparing",
          "kitchen",
        ),
        step("restaurant-order", "preparing", "mark-ready", "ready", "kitchen"),
        step("restaurant-order", "ready", "serve", "served", "cashier"),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[1],
      label: "Manager cancels a submitted order",
      entryPageKey: "merchant-orders",
      outcome: "A submitted order is cancelled by a manager.",
      steps: [
        step("restaurant-order", "cart", "submit", "submitted", "customer"),
        step("restaurant-order", "submitted", "cancel", "cancelled", "manager"),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[2],
      label: "Manager cancels a paid order",
      entryPageKey: "merchant-orders",
      outcome: "A paid order is cancelled by a manager.",
      steps: [
        step("restaurant-order", "cart", "submit", "submitted", "customer"),
        step("restaurant-order", "submitted", "pay", "paid", "cashier"),
        step("restaurant-order", "paid", "cancel", "cancelled", "manager"),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[3],
      label: "Manager runs a table session",
      entryPageKey: "merchant-tables",
      outcome: "A table session is activated and closed.",
      steps: [
        step(
          "restaurant-table-session",
          "open",
          "activate",
          "active",
          "manager",
        ),
        step(
          "restaurant-table-session",
          "active",
          "close",
          "closed",
          "manager",
        ),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[4],
      label: "Manager expires an open table session",
      entryPageKey: "merchant-tables",
      outcome: "An open table session expires safely.",
      steps: [
        step("restaurant-table-session", "open", "expire", "closed", "manager"),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[5],
      label: "Manager expires an active table session",
      entryPageKey: "merchant-tables",
      outcome: "An active table session expires safely.",
      steps: [
        step(
          "restaurant-table-session",
          "open",
          "activate",
          "active",
          "manager",
        ),
        step(
          "restaurant-table-session",
          "active",
          "expire",
          "closed",
          "manager",
        ),
      ],
    },
    {
      key: restaurantAcceptanceJourneyKeys[6],
      label: "Manager adjusts inventory",
      entryPageKey: "merchant-menu-management",
      outcome: "A manager records an audited inventory adjustment.",
      steps: [
        step(
          "restaurant-inventory-ledger",
          "recorded",
          "record-manager-adjustment",
          "recorded",
          "manager",
        ),
      ],
    },
  ];
}

function assertApprovedInputs(
  intent: ProductIntentV1,
  experience: ExperienceBriefV1,
): void {
  if (intent.productType !== "restaurant-ordering")
    throw new CompositionError(
      "Restaurant composition requires the approved Restaurant intent.",
    );
  if (intent.constraints.moneyMovement !== "simulated")
    throw new CompositionError(
      "Restaurant composition requires simulated payment.",
    );
  if (experience.requirementChecksum !== intent.requirementChecksum)
    throw new CompositionError(
      "Experience Brief checksum does not match the Restaurant intent.",
    );
  const surfaces = experience.surfaces.map(({ key }) => key);
  if (surfaces.join(",") !== "customer-mobile,merchant-desktop")
    throw new CompositionError(
      "Restaurant composition requires the exact customer-mobile and merchant-desktop surfaces.",
    );
  for (const role of ["customer", "cashier", "kitchen", "manager"]) {
    if (!intent.actors.some(({ key }) => key === role))
      throw new CompositionError(
        `Restaurant intent is missing actor '${role}'.`,
      );
  }
}

export function composeRestaurantProductGraph(
  input: ComposeRestaurantProductGraphInput,
): ApplicationGraphV3 {
  const intent = assertProductIntent(input.intent);
  const experience = assertExperienceBrief(input.experience);
  assertApprovedInputs(intent, experience);
  if (input.baseDraft.status !== "draft")
    throw new CompositionError(
      "Restaurant composition requires a mutable Draft base.",
    );
  assertRestaurantOrderingProfile(input.baseDraft.graph);
  const base = structuredClone(input.baseDraft.graph);
  const recipe = restaurantOrderingProductRecipe();
  const domains = base.domain.entities.map((entity) => ({
    ...entity,
    fields: [
      ...entity.fields,
      ...structuredClone(addedFields[entity.key] ?? []),
    ],
  }));
  domains.push({
    key: "audit-event",
    label: "Audit event",
    fields: [
      { key: "actorRole", type: "string", required: true },
      { key: "action", type: "string", required: true },
      { key: "subjectEntity", type: "string", required: true },
      { key: "subjectId", type: "string", required: true },
      { key: "occurredAt", type: "datetime", required: true },
      { key: "revisionId", type: "string", required: true },
    ],
    indexes: [
      { fields: ["subjectEntity", "subjectId"] },
      { fields: ["occurredAt"] },
    ],
  });
  const fieldAuthorities = fieldAuthoritiesFor(domains);
  const authority = new Map(
    fieldAuthorities.map((entry) => [
      `${entry.entityKey}.${entry.fieldKey}`,
      entry.authority,
    ]),
  );
  const screens = new Map(recipe.screens.map((screen) => [screen.key, screen]));
  const pages: ApplicationGraphV3["page"]["pages"] = restaurantProductPages.map(
    (definition) => ({
      id: definition.key,
      route: definition.route,
      title: definition.title,
      surfaceKey: definition.surfaceKey,
      screenIntent: structuredClone(screens.get(definition.key)!),
      recipe: {
        key: definition.recipeKey,
        version: "1.0.0",
        regions: [
          { key: "main", blockIds: definition.blocks.map(({ id }) => id) },
        ],
      },
      blocks: definition.blocks.map((block) => {
        const specs = bindingSpecs[`${definition.key}/${block.id}`] ?? [];
        return {
          id: block.id,
          type: block.type,
          bindings: Object.fromEntries(
            specs.map((spec) => [spec.bindingKey, bindingTarget(spec)]),
          ),
        };
      }),
    }),
  );
  const bindingPolicies: ApplicationGraphV3["bindingPolicies"] = [];
  for (const definition of restaurantProductPages) {
    for (const block of definition.blocks) {
      for (const spec of bindingSpecs[`${definition.key}/${block.id}`] ?? []) {
        const common = {
          pageId: definition.key,
          blockId: block.id,
          bindingKey: spec.bindingKey,
        };
        if (spec.kind === "domain-field")
          bindingPolicies.push({
            ...common,
            ...spec,
            authority: authority.get(`${spec.entityKey}.${spec.fieldKey}`)!,
          });
        else bindingPolicies.push({ ...common, ...spec });
      }
    }
  }
  const permissions = structuredClone(base.policy.permissions);
  for (const [role, resource, action] of [
    ["customer", "order", "submit"],
    ["customer", "order", "pay"],
    ["cashier", "order", "pay"],
    ["cashier", "order", "serve"],
    ["kitchen", "order", "accept"],
    ["kitchen", "order", "start-preparing"],
    ["kitchen", "order", "mark-ready"],
    ["manager", "order", "cancel"],
    ["manager", "table-session", "activate"],
    ["manager", "table-session", "close"],
    ["manager", "table-session", "expire"],
    ["manager", "inventory-ledger", "record-manager-adjustment"],
    ["customer", "order-line", "create"],
    ["manager", "restaurant-principal", "update"],
    ["manager", "restaurant-location", "update"],
  ])
    grant(permissions, role!, resource!, action!);
  const flows = structuredClone(base.flow.flows);
  for (const transition of flows.find(
    ({ id }) => id === "restaurant-table-session",
  )!.transitions) {
    if (transition.event === "expire") transition.roles = ["manager"];
  }
  const selectedCapabilityKeys = new Set(
    restaurantProductPages.flatMap(({ capabilityKeys }) => capabilityKeys),
  );
  const integrationCapabilities = structuredClone(
    base.integration.capabilities,
  );
  for (const key of selectedCapabilityKeys) {
    if (!integrationCapabilities.some((capability) => capability.key === key))
      integrationCapabilities.push({
        key,
        providerId: "factory",
        operation: "select",
      });
  }
  const graph: ApplicationGraphV3 = {
    apiVersion: "factory.application-graph/v3",
    metadata: { ...structuredClone(base.metadata), name: intent.title },
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-mobile",
        label: "Customer mobile",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "customer-home",
        navigation: {
          pattern: "bottom-tabs",
          items: recipe.surfaces[0].navigation.items.map((item) =>
            structuredClone(item),
          ),
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 640 },
      },
      {
        apiVersion: "factory.application-surface/v1",
        key: "merchant-desktop",
        label: "Merchant desktop",
        kind: "merchant",
        audienceRoles: ["cashier", "kitchen", "manager"],
        device: "desktop",
        entryPageKey: "merchant-dashboard",
        navigation: {
          pattern: "sidebar",
          items: recipe.surfaces[1].navigation.items.map((item) =>
            structuredClone(item),
          ),
        },
        responsive: { minimumWidth: 768, maximumContentWidth: 1600 },
      },
    ],
    page: { pages },
    domain: {
      entities: domains,
      relations: structuredClone(base.domain.relations),
      ...(base.domain.seedData === undefined
        ? {}
        : { seedData: structuredClone(base.domain.seedData) }),
    },
    policy: {
      roles: ["customer", "cashier", "kitchen", "manager"],
      permissions,
    },
    flow: { flows },
    integration: {
      providers: structuredClone(base.integration.providers),
      capabilities: integrationCapabilities,
      compositionProfile: "restaurant-ordering",
      compositionSelections: remapSelectionPages(
        base.integration.compositionSelections ?? [],
      ),
    },
    experience: {
      theme: {
        mode: experience.theme.defaultMode,
        tokens: { "experience-recipe": "fine-dining" },
      },
      locales: ["en"],
      responsiveNavigation: [
        { surfaceKey: "customer-mobile", compactAt: 640, collapse: "tabs" },
        { surfaceKey: "merchant-desktop", compactAt: 1024, collapse: "drawer" },
      ],
    },
    seedScenarios: [
      {
        key: "fine-dining-service",
        label: "Fine dining service",
        actorKeys: ["customer", "cashier", "kitchen", "manager"],
        records: (base.domain.seedData ?? []).map(({ entity, values }) => ({
          entityKey: entity,
          values: structuredClone(values),
        })),
      },
    ],
    journeys: journeys(),
    fieldAuthorities,
    bindingPolicies,
  };
  return assertApplicationGraphV3(graph);
}
