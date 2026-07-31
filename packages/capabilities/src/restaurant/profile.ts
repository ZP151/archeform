import type { ApplicationGraphV1 } from "@factory/graph/browser";

export type RestaurantProfileValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (string | number)[];
};

export type RestaurantEntityKey =
  | "restaurant-principal"
  | "restaurant-location"
  | "restaurant-table"
  | "table-session"
  | "menu-category"
  | "menu-item"
  | "menu-option-group"
  | "menu-option"
  | "order"
  | "order-line"
  | "order-line-option"
  | "payment-attempt"
  | "kitchen-ticket"
  | "inventory-ledger";

export type RestaurantProfileProjectionV1 = {
  readonly apiVersion: "factory.restaurant-profile/v1";
  readonly entities: Readonly<Record<RestaurantEntityKey, string>>;
  readonly roles: {
    readonly customer: string;
    readonly kitchen: string;
    readonly cashier: string;
    readonly manager: string;
  };
  readonly pageGroups: {
    readonly customer: readonly string[];
    readonly merchant: readonly string[];
  };
  readonly order: {
    readonly entity: string;
    readonly states: readonly string[];
    readonly versionField: "orderVersion";
  };
  readonly inventoryLedger: {
    readonly entity: "inventory-ledger";
    readonly orderIdField: "orderId";
    readonly provenanceField: "provenance";
    readonly provenance: {
      readonly orderReservation: "order-reservation";
      readonly orderRelease: "order-release";
      readonly managerAdjustment: "manager-adjustment";
    };
    readonly adjustmentReasonField: "adjustmentReason";
    readonly adjustmentReasons: readonly RestaurantAdjustmentReason[];
    readonly managerAdjustment: {
      readonly role: "manager";
      readonly capability: "inventory.adjust";
      readonly operation: "adjust";
      readonly auditCapability: "audit.record";
      readonly auditOperation: "record";
      readonly orderId: "forbidden";
      readonly reason: "required";
    };
    readonly orderDerived: {
      readonly orderId: "required";
      readonly provenance: readonly ["order-reservation", "order-release"];
    };
  };
};

export type RestaurantInventoryLedgerProvenance =
  "order-reservation" | "order-release" | "manager-adjustment";

export type RestaurantAdjustmentReason =
  "stock-count" | "restock" | "spoilage" | "damage" | "correction";

type FieldType =
  ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"];

const requiredEntityFields: Readonly<
  Record<RestaurantEntityKey, Readonly<Record<string, FieldType>>>
> = {
  "restaurant-principal": {
    subjectRef: "string",
    role: "enum",
    active: "boolean",
  },
  "restaurant-location": {
    name: "string",
    currency: "string",
    active: "boolean",
  },
  "restaurant-table": {
    code: "string",
    number: "integer",
    status: "enum",
    active: "boolean",
  },
  "table-session": {
    tableCode: "string",
    tokenDigest: "string",
    status: "enum",
    openedAt: "datetime",
    expiresAt: "datetime",
    guestCount: "integer",
  },
  "menu-category": {
    name: "string",
    sortOrder: "integer",
    active: "boolean",
  },
  "menu-item": {
    categoryKey: "string",
    name: "string",
    description: "text",
    price: "decimal",
    available: "boolean",
    stock: "integer",
    preparationMinutes: "integer",
    imageUrl: "url",
  },
  "menu-option-group": {
    menuItemId: "string",
    name: "string",
    minimumSelections: "integer",
    maximumSelections: "integer",
    required: "boolean",
    active: "boolean",
  },
  "menu-option": {
    optionGroupId: "string",
    name: "string",
    priceDelta: "decimal",
    available: "boolean",
  },
  order: {
    tableSessionId: "string",
    status: "enum",
    paymentStatus: "enum",
    fulfilmentType: "enum",
    orderNote: "text",
    priority: "integer",
    total: "decimal",
    orderVersion: "integer",
    submittedAt: "datetime",
    paidAt: "datetime",
  },
  "order-line": {
    orderId: "string",
    menuItemId: "string",
    quantity: "integer",
    unitPrice: "decimal",
    lineNote: "text",
    modifiers: "json",
  },
  "order-line-option": {
    orderLineId: "string",
    optionId: "string",
    priceDelta: "decimal",
  },
  "payment-attempt": {
    orderId: "string",
    method: "enum",
    amount: "decimal",
    status: "enum",
    idempotencyKey: "string",
    paidAt: "datetime",
  },
  "kitchen-ticket": {
    orderId: "string",
    tableNumber: "integer",
    priority: "integer",
    status: "enum",
    acceptedAt: "datetime",
    startedAt: "datetime",
    readyAt: "datetime",
  },
  "inventory-ledger": {
    menuItemId: "string",
    orderId: "string",
    delta: "integer",
    provenance: "enum",
    adjustmentReason: "enum",
    recordedAt: "datetime",
  },
};

const requiredRoles = ["customer", "kitchen", "cashier", "manager"] as const;

const requiredPermissions = [
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
  { role: "manager", resource: "order", actions: ["read", "audit"] },
  { role: "manager", resource: "order", actions: ["update", "cancel"] },
  {
    role: "manager",
    resource: "inventory-ledger",
    actions: ["create", "read", "audit"],
  },
] as const;

const optionalRestaurantFields = new Set([
  "order.submittedAt",
  "order.paidAt",
  "payment-attempt.paidAt",
  "kitchen-ticket.acceptedAt",
  "kitchen-ticket.startedAt",
  "kitchen-ticket.readyAt",
  "inventory-ledger.orderId",
  "inventory-ledger.adjustmentReason",
]);

const inventoryLedgerProvenance = [
  "order-reservation",
  "order-release",
  "manager-adjustment",
] as const satisfies readonly RestaurantInventoryLedgerProvenance[];

const inventoryAdjustmentReasons = [
  "stock-count",
  "restock",
  "spoilage",
  "damage",
  "correction",
] as const satisfies readonly RestaurantAdjustmentReason[];

const customerPages = [
  {
    route: "/table/:token",
    block: "restaurant-entry",
    entity: "table-session",
  },
  { route: "/menu", block: "menu-browser", entity: "menu-item" },
  { route: "/cart", block: "order-cart", entity: "order" },
  { route: "/cart", block: "payment-checkout", entity: "order" },
  { route: "/orders/current", block: "order-tracker", entity: "order" },
  { route: "/receipt/:id", block: "receipt", entity: "order" },
] as const;

const merchantPages = [
  {
    route: "/merchant/tables",
    block: "table-board",
    entity: "restaurant-table",
  },
  { route: "/merchant/menu", block: "menu-manager", entity: "menu-item" },
  {
    route: "/merchant/kitchen",
    block: "kitchen-board",
    entity: "kitchen-ticket",
  },
  { route: "/merchant/cashier", block: "cashier-console", entity: "order" },
  { route: "/merchant/analytics", block: "restaurant-dashboard" },
] as const;

const customerRoutes = [
  "/table/:token",
  "/menu",
  "/cart",
  "/orders/current",
  "/receipt/:id",
] as const;

const merchantRoutes = [
  "/merchant/tables",
  "/merchant/menu",
  "/merchant/kitchen",
  "/merchant/cashier",
  "/merchant/analytics",
] as const;

const requiredAssetLocks = [
  "core.audit",
  "core.crud",
  "core.workflow",
  "commerce.catalog",
  "commerce.cart",
  "commerce.inventory",
  "commerce.inventory-ledger",
  "commerce.line-configuration",
  "commerce.order",
  "core.identity-context",
  "core.location-context",
  "restaurant.table-session",
  "restaurant.menu",
  "restaurant.ordering",
  "restaurant.kitchen",
  "restaurant.cashier",
  "restaurant.reporting",
] as const;

const forbiddenAssetLocks = ["commerce.simulated-payment"] as const;

const requiredOperations = [
  "audit.record",
  "catalog.list",
  "catalog.read",
  "cart.add",
  "cart.remove",
  "cart.checkout",
  "inventory.reserve",
  "inventory.release",
  "inventory.decrement",
  "inventory.adjust",
  "inventory.ledger.read",
  "identity.context.resolve",
  "identity.context.validate",
  "location.context.resolve",
  "location.context.validate",
  "line.configuration.validate",
  "line.configuration.price",
  "line.configuration.availability.manage",
  "order.create",
  "order.transition",
  "payment.simulate",
] as const;

const requiredRelations = [
  ["restaurant-location", "restaurant-table", "one-to-many"],
  ["table-session", "restaurant-table", "many-to-one"],
  ["menu-item", "menu-category", "many-to-one"],
  ["menu-option-group", "menu-item", "many-to-one"],
  ["menu-option", "menu-option-group", "many-to-one"],
  ["order", "table-session", "many-to-one"],
  ["order-line", "order", "many-to-one"],
  ["order-line", "menu-item", "many-to-one"],
  ["order-line-option", "order-line", "many-to-one"],
  ["order-line-option", "menu-option", "many-to-one"],
  ["payment-attempt", "order", "many-to-one"],
  ["kitchen-ticket", "order", "one-to-one"],
  ["inventory-ledger", "menu-item", "many-to-one"],
  ["inventory-ledger", "order", "many-to-one"],
] as const;

const requiredOrderStates = [
  "cart",
  "submitted",
  "paid",
  "accepted",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;

const requiredOrderEvents = [
  "submit",
  "pay",
  "accept",
  "start-preparing",
  "mark-ready",
  "serve",
  "cancel",
] as const;

const requiredOrderTransitions = [
  [
    "cart",
    "submit",
    "submitted",
    ["customer"],
    [
      ["order.create", "create"],
      ["inventory.reserve", "reserve"],
      ["audit.record", "record"],
    ],
  ],
  [
    "submitted",
    "pay",
    "paid",
    ["customer", "cashier"],
    [
      ["payment.simulate", "simulate"],
      ["inventory.decrement", "decrement"],
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "paid",
    "accept",
    "accepted",
    ["kitchen"],
    [
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "accepted",
    "start-preparing",
    "preparing",
    ["kitchen"],
    [
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "preparing",
    "mark-ready",
    "ready",
    ["kitchen"],
    [
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "ready",
    "serve",
    "served",
    ["cashier"],
    [
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "submitted",
    "cancel",
    "cancelled",
    ["manager"],
    [
      ["inventory.release", "release"],
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
  [
    "paid",
    "cancel",
    "cancelled",
    ["manager"],
    [
      ["order.transition", "transition"],
      ["audit.record", "record"],
    ],
  ],
] as const;

const requiredTableSessionStates = ["open", "active", "closed"] as const;
const requiredTableSessionEvents = ["activate", "close", "expire"] as const;
const requiredTableSessionTransitions = [
  ["open", "activate", "active", ["manager"], []],
  ["active", "close", "closed", ["manager"], [["audit.record", "record"]]],
  ["open", "expire", "closed", [], []],
  ["active", "expire", "closed", [], []],
] as const;

const requiredInventoryLedgerStates = ["recorded"] as const;
const requiredInventoryLedgerEvents = ["record-manager-adjustment"] as const;
const requiredInventoryLedgerTransitions = [
  [
    "recorded",
    "record-manager-adjustment",
    "recorded",
    ["manager"],
    [
      ["inventory.adjust", "adjust"],
      ["audit.record", "record"],
    ],
  ],
] as const;

const issueSortKey = (issue: RestaurantProfileValidationIssue) =>
  `${JSON.stringify(issue.path)}:${issue.code}`;

const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const sameValues = (
  actual: readonly string[],
  expected: readonly string[],
): boolean =>
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index]);

export function validateRestaurantOrderingProfile(
  graph: ApplicationGraphV1,
): readonly RestaurantProfileValidationIssue[] {
  const issues: RestaurantProfileValidationIssue[] = [];
  const issue = (
    code: string,
    message: string,
    path: readonly (string | number)[],
  ) => issues.push({ code, message, path });

  if (graph.integration.compositionProfile !== "restaurant-ordering") {
    issue(
      "restaurant.profile.invalid",
      "Restaurant Ordering requires compositionProfile 'restaurant-ordering'.",
      ["integration", "compositionProfile"],
    );
  }

  for (const [entityKey, fields] of Object.entries(requiredEntityFields) as [
    RestaurantEntityKey,
    Readonly<Record<string, FieldType>>,
  ][]) {
    const entityIndex = graph.domain.entities.findIndex(
      (entity) => entity.key === entityKey,
    );
    if (entityIndex < 0) {
      issue(
        "restaurant.entity.missing",
        `Restaurant entity '${entityKey}' is required.`,
        ["domain", "entities", entityKey],
      );
      continue;
    }
    const entity = graph.domain.entities[entityIndex]!;
    for (const [fieldKey, fieldType] of Object.entries(fields)) {
      const fieldIndex = entity.fields.findIndex(
        (field) => field.key === fieldKey,
      );
      if (fieldIndex < 0) {
        issue(
          "restaurant.field.missing",
          `Restaurant entity '${entityKey}' requires field '${fieldKey}'.`,
          ["domain", "entities", entityIndex, "fields", fieldKey],
        );
        continue;
      }
      const field = entity.fields[fieldIndex]!;
      const expectedRequired = !optionalRestaurantFields.has(
        `${entityKey}.${fieldKey}`,
      );
      if (field.type !== fieldType || field.required !== expectedRequired) {
        issue(
          "restaurant.field.invalid",
          `Restaurant field '${entityKey}.${fieldKey}' must be an ${expectedRequired ? "required" : "optional"} ${fieldType} field.`,
          ["domain", "entities", entityIndex, "fields", fieldIndex],
        );
      }
    }
  }

  validateInventoryLedgerFields(graph, issue);

  for (const [from, to, kind] of requiredRelations) {
    if (
      !graph.domain.relations.some(
        (relation) =>
          relation.from === from &&
          relation.to === to &&
          relation.kind === kind,
      )
    ) {
      issue(
        "restaurant.relation.missing",
        `Restaurant relation '${from}' ${kind} '${to}' is required.`,
        ["domain", "relations", from, to],
      );
    }
  }

  for (const role of requiredRoles) {
    if (!graph.policy.roles.includes(role)) {
      issue(
        "restaurant.role.missing",
        `Restaurant role '${role}' is required.`,
        ["policy", "roles", role],
      );
    }
  }

  const permissionKey = (permission: {
    readonly role: string;
    readonly resource: string;
    readonly actions: readonly string[];
  }) =>
    `${permission.role}:${permission.resource}:${[...permission.actions].sort(compareCodeUnits).join(",")}`;
  const requiredPermissionKeys = new Set(
    requiredPermissions.map(permissionKey),
  );
  const actualPermissionKeys = new Set(
    graph.policy.permissions.map(permissionKey),
  );
  for (const permission of requiredPermissions) {
    const key = permissionKey(permission);
    if (!actualPermissionKeys.has(key)) {
      issue(
        "restaurant.permission.missing",
        `Restaurant permission '${permission.role}:${permission.resource}' requires actions '${permission.actions.join(", ")}'.`,
        ["policy", "permissions", permission.role, permission.resource],
      );
    }
  }
  const seenPermissionKeys = new Set<string>();
  graph.policy.permissions.forEach((permission, permissionIndex) => {
    const key = permissionKey(permission);
    if (!requiredPermissionKeys.has(key) || seenPermissionKeys.has(key)) {
      issue(
        "restaurant.permission.unexpected",
        `Restaurant permission '${permission.role}:${permission.resource}' declares unexpected actions '${permission.actions.join(", ")}'.`,
        ["policy", "permissions", permissionIndex],
      );
    }
    seenPermissionKeys.add(key);
  });

  for (const contract of [...customerPages, ...merchantPages]) {
    const pageIndex = graph.page.pages.findIndex(
      (page) => page.route === contract.route,
    );
    if (pageIndex < 0) {
      issue(
        "restaurant.page.missing",
        `Restaurant page route '${contract.route}' is required.`,
        ["page", "pages", contract.route],
      );
      continue;
    }
    const page = graph.page.pages[pageIndex]!;
    const block = page.blocks.find(
      (candidate) => candidate.type === contract.block,
    );
    if (!block || ("entity" in contract && block.entity !== contract.entity)) {
      issue(
        "restaurant.block.missing",
        `Restaurant page '${contract.route}' requires block '${contract.block}'.`,
        ["page", "pages", pageIndex, "blocks", contract.block],
      );
    }
  }

  const assetLocks = new Set(
    (graph.integration.assetLocks ?? []).map((lock) => lock.key),
  );
  for (const assetKey of requiredAssetLocks) {
    if (!assetLocks.has(assetKey)) {
      issue(
        "restaurant.asset-lock.missing",
        `Restaurant profile requires Golden asset lock '${assetKey}'.`,
        ["integration", "assetLocks", assetKey],
      );
    }
  }
  for (const assetKey of forbiddenAssetLocks) {
    if (assetLocks.has(assetKey)) {
      issue(
        "restaurant.asset-lock.unexpected",
        `Restaurant profile does not allow Golden asset lock '${assetKey}' because Restaurant cashier owns payment simulation.`,
        ["integration", "assetLocks", assetKey],
      );
    }
  }

  const operations = new Set(
    graph.integration.capabilities.map((capability) => capability.key),
  );
  for (const operation of requiredOperations) {
    if (!operations.has(operation)) {
      issue(
        "restaurant.operation.missing",
        `Restaurant profile requires operation '${operation}'.`,
        ["integration", "capabilities", operation],
      );
    }
  }

  validateFlow(
    graph,
    "table-session",
    "open",
    requiredTableSessionStates,
    requiredTableSessionEvents,
    requiredTableSessionTransitions,
    issue,
  );
  validateFlow(
    graph,
    "inventory-ledger",
    "recorded",
    requiredInventoryLedgerStates,
    requiredInventoryLedgerEvents,
    requiredInventoryLedgerTransitions,
    issue,
  );
  validateInventoryAdjustmentPaths(graph, issue);
  validateFlow(
    graph,
    "order",
    "cart",
    requiredOrderStates,
    requiredOrderEvents,
    requiredOrderTransitions,
    issue,
  );

  return issues.sort((left, right) =>
    compareCodeUnits(issueSortKey(left), issueSortKey(right)),
  );
}

function validateFlow(
  graph: ApplicationGraphV1,
  entityKey: "table-session" | "order" | "inventory-ledger",
  initialState: string,
  states: readonly string[],
  events: readonly string[],
  transitions: readonly (readonly [
    string,
    string,
    string,
    readonly string[],
    readonly (readonly [string, string])[],
  ])[],
  issue: (
    code: string,
    message: string,
    path: readonly (string | number)[],
  ) => void,
): void {
  const flowIndex = graph.flow.flows.findIndex(
    (flow) => flow.entity === entityKey,
  );
  if (flowIndex < 0) {
    issue(
      "restaurant.flow.missing",
      `Restaurant flow for '${entityKey}' is required.`,
      ["flow", "flows", entityKey],
    );
    return;
  }
  const flow = graph.flow.flows[flowIndex]!;
  if (flow.initialState !== initialState) {
    issue(
      "restaurant.initial-state.invalid",
      `Restaurant '${entityKey}' flow initial state must be '${initialState}'.`,
      ["flow", "flows", flowIndex, "initialState"],
    );
  }
  if (!sameValues(flow.states, states)) {
    issue(
      "restaurant.states.invalid",
      `Restaurant '${entityKey}' states must be ${states.join(" -> ")}.`,
      ["flow", "flows", flowIndex, "states"],
    );
  }
  for (const event of events) {
    if (!flow.events.includes(event)) {
      issue(
        "restaurant.event.missing",
        `Restaurant '${entityKey}' flow requires event '${event}'.`,
        ["flow", "flows", flowIndex, "events", event],
      );
    }
  }
  for (const [from, event, to, roles, effects] of transitions) {
    const transition = flow.transitions.find(
      (candidate) =>
        candidate.from === from &&
        candidate.event === event &&
        candidate.to === to,
    );
    if (!transition) {
      issue(
        "restaurant.transition.missing",
        `Restaurant '${entityKey}' flow requires transition '${from} --${event}--> ${to}'.`,
        ["flow", "flows", flowIndex, "transitions", from, event, to],
      );
      continue;
    }
    if (!sameValues(transition.roles ?? [], roles)) {
      issue(
        "restaurant.transition.invalid",
        `Restaurant '${entityKey}' transition '${from} --${event}--> ${to}' requires roles '${roles.join(", ")}'.`,
        ["flow", "flows", flowIndex, "transitions", from, event, to, "roles"],
      );
    }
    for (const [capability, operation] of effects) {
      if (
        !(transition.effects ?? []).some(
          (effect) =>
            effect.capability === capability && effect.operation === operation,
        )
      ) {
        issue(
          "restaurant.transition.effect.missing",
          `Restaurant '${entityKey}' transition '${from} --${event}--> ${to}' requires effect '${capability}/${operation}'.`,
          [
            "flow",
            "flows",
            flowIndex,
            "transitions",
            from,
            event,
            to,
            "effects",
            capability,
            operation,
          ],
        );
      }
    }
  }
}

function validateInventoryLedgerFields(
  graph: ApplicationGraphV1,
  issue: (
    code: string,
    message: string,
    path: readonly (string | number)[],
  ) => void,
): void {
  const entityIndex = graph.domain.entities.findIndex(
    (entity) => entity.key === "inventory-ledger",
  );
  if (entityIndex < 0) return;

  const entity = graph.domain.entities[entityIndex]!;
  const checks = [
    {
      key: "orderId",
      type: "string",
      required: false,
      values: undefined,
    },
    {
      key: "provenance",
      type: "enum",
      required: true,
      values: inventoryLedgerProvenance,
    },
    {
      key: "adjustmentReason",
      type: "enum",
      required: false,
      values: inventoryAdjustmentReasons,
    },
  ] as const;

  for (const expected of checks) {
    const fieldIndex = entity.fields.findIndex(
      (field) => field.key === expected.key,
    );
    if (fieldIndex < 0) continue;
    const field = entity.fields[fieldIndex]!;
    const valuesValid = expected.values
      ? sameValues(field.values ?? [], expected.values)
      : field.values === undefined;
    if (
      field.type !== expected.type ||
      field.required !== expected.required ||
      !valuesValid
    ) {
      issue(
        "restaurant.inventory-provenance.invalid",
        `Restaurant field 'inventory-ledger.${expected.key}' does not preserve the bounded inventory provenance contract.`,
        ["domain", "entities", entityIndex, "fields", fieldIndex],
      );
    }
  }

  const orderRelationIndex = graph.domain.relations.findIndex(
    (relation) =>
      relation.from === "inventory-ledger" &&
      relation.to === "order" &&
      relation.kind === "many-to-one",
  );
  const orderRelation = graph.domain.relations[orderRelationIndex];
  if (orderRelation && orderRelation.field !== "orderId") {
    issue(
      "restaurant.inventory-provenance.invalid",
      "Restaurant order-derived inventory records require the inventory-ledger.orderId relation.",
      ["domain", "relations", orderRelationIndex, "field"],
    );
  }
}

function validateInventoryAdjustmentPaths(
  graph: ApplicationGraphV1,
  issue: (
    code: string,
    message: string,
    path: readonly (string | number)[],
  ) => void,
): void {
  const ledgerFlows = graph.flow.flows
    .map((flow, index) => ({ flow, index }))
    .filter(({ flow }) => flow.entity === "inventory-ledger");
  const ledgerFlow = ledgerFlows[0];
  const managerTransition = ledgerFlow?.flow.transitions[0];
  const effectKeys = (managerTransition?.effects ?? []).map(
    (effect) => `${effect.capability}/${effect.operation}`,
  );
  const exactStandalonePath =
    ledgerFlows.length === 1 &&
    ledgerFlow?.flow.id === "restaurant-inventory-ledger" &&
    sameValues(ledgerFlow.flow.states, requiredInventoryLedgerStates) &&
    sameValues(ledgerFlow.flow.events, requiredInventoryLedgerEvents) &&
    ledgerFlow.flow.transitions.length === 1 &&
    managerTransition?.from === "recorded" &&
    managerTransition.event === "record-manager-adjustment" &&
    managerTransition.to === "recorded" &&
    sameValues(managerTransition.roles ?? [], ["manager"]) &&
    sameValues(effectKeys, ["inventory.adjust/adjust", "audit.record/record"]);
  if (!exactStandalonePath) {
    issue(
      "restaurant.inventory-provenance.invalid",
      "Restaurant manager adjustment must be the sole standalone ledger path with exact manager, inventory adjustment, and audit constraints.",
      ["flow", "flows", ledgerFlow?.index ?? "inventory-ledger"],
    );
  }

  graph.flow.flows.forEach((flow, flowIndex) => {
    flow.transitions.forEach((transition, transitionIndex) => {
      const provenanceEffects = (transition.effects ?? [])
        .filter((effect) =>
          [
            "inventory.reserve",
            "inventory.release",
            "inventory.adjust",
          ].includes(effect.capability),
        )
        .map((effect) => `${effect.capability}/${effect.operation}`)
        .sort(compareCodeUnits);
      let expectedEffect: string | undefined;
      if (
        flow.entity === "order" &&
        transition.from === "cart" &&
        transition.event === "submit" &&
        transition.to === "submitted"
      ) {
        expectedEffect = "inventory.reserve/reserve";
      } else if (
        flow.entity === "order" &&
        transition.from === "submitted" &&
        transition.event === "cancel" &&
        transition.to === "cancelled"
      ) {
        expectedEffect = "inventory.release/release";
      } else if (
        flow.entity === "inventory-ledger" &&
        transition.from === "recorded" &&
        transition.event === "record-manager-adjustment" &&
        transition.to === "recorded"
      ) {
        expectedEffect = "inventory.adjust/adjust";
      }

      if (expectedEffect) {
        if (
          provenanceEffects.length !== 1 ||
          provenanceEffects[0] !== expectedEffect
        ) {
          issue(
            "restaurant.inventory-provenance.invalid",
            `Restaurant '${flow.entity}' transition '${transition.from} --${transition.event}--> ${transition.to}' must declare exactly one inventory provenance effect '${expectedEffect}' and no conflicting provenance effect.`,
            [
              "flow",
              "flows",
              flowIndex,
              "transitions",
              transitionIndex,
              "effects",
            ],
          );
        }
        return;
      }

      if (provenanceEffects.length === 0) return;

      const hasMisplacedAdjustment = provenanceEffects.includes(
        "inventory.adjust/adjust",
      );
      issue(
        "restaurant.inventory-provenance.invalid",
        hasMisplacedAdjustment
          ? "Restaurant manager adjustment must not carry an order context or use an order-derived flow."
          : `Restaurant transition '${transition.from} --${transition.event}--> ${transition.to}' must not declare misplaced order-derived inventory provenance effects.`,
        ["flow", "flows", flowIndex, "transitions", transitionIndex, "effects"],
      );
    });
  });
}

export function assertRestaurantOrderingProfile(
  graph: ApplicationGraphV1,
): RestaurantProfileProjectionV1 {
  const issues = validateRestaurantOrderingProfile(graph);
  if (issues.length > 0) {
    throw new Error(
      `Restaurant Ordering profile validation failed (${issues.length} issue(s)): ${issues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  return {
    apiVersion: "factory.restaurant-profile/v1",
    entities: Object.fromEntries(
      (Object.keys(requiredEntityFields) as RestaurantEntityKey[]).map(
        (key) => [key, key],
      ),
    ) as Record<RestaurantEntityKey, string>,
    roles: {
      customer: "customer",
      kitchen: "kitchen",
      cashier: "cashier",
      manager: "manager",
    },
    pageGroups: {
      customer: customerRoutes,
      merchant: merchantRoutes,
    },
    order: {
      entity: "order",
      states: requiredOrderStates,
      versionField: "orderVersion",
    },
    inventoryLedger: {
      entity: "inventory-ledger",
      orderIdField: "orderId",
      provenanceField: "provenance",
      provenance: {
        orderReservation: "order-reservation",
        orderRelease: "order-release",
        managerAdjustment: "manager-adjustment",
      },
      adjustmentReasonField: "adjustmentReason",
      adjustmentReasons: inventoryAdjustmentReasons,
      managerAdjustment: {
        role: "manager",
        capability: "inventory.adjust",
        operation: "adjust",
        auditCapability: "audit.record",
        auditOperation: "record",
        orderId: "forbidden",
        reason: "required",
      },
      orderDerived: {
        orderId: "required",
        provenance: ["order-reservation", "order-release"],
      },
    },
  };
}
