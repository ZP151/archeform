import type { ApplicationGraphV1 } from "./model.js";

/** A computed structural witness, never serialized admission authority. */
export interface InventoryOperationsGraphWitnessV1 {
  readonly apiVersion: "factory.inventory-operations-graph-witness/v1";
  readonly itemEntity: string;
  readonly movementEntity: string;
  readonly workflow: string;
  readonly roles: Readonly<{ stockkeeper: string; observer: string }>;
  readonly pages: Readonly<{ list: string; form: string; detail: string }>;
  readonly numericFields: readonly Readonly<{
    entityKey: string;
    fieldKey: string;
  }>[];
}
function reject(): never {
  throw new Error("Inventory structural mismatch.");
}
/** Compare schema-parsed JSON values without Node APIs or serialization hooks. */
function equal(actual: unknown, expected: unknown): void {
  if (actual === expected) return;
  if (
    !actual ||
    !expected ||
    typeof actual !== "object" ||
    typeof expected !== "object" ||
    Array.isArray(actual) !== Array.isArray(expected)
  )
    reject();
  const keys = Object.keys(actual),
    expectedKeys = Object.keys(expected);
  if (
    keys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.hasOwn(actual, key))
  )
    reject();
  for (const key of expectedKeys)
    equal(
      (actual as Record<string, unknown>)[key],
      (expected as Record<string, unknown>)[key],
    );
}
/** Consumes schema-parsed Graph data only. Lock and lifecycle validation remain separate. */
export function matchInventoryOperationsGraphV1(
  graph: ApplicationGraphV1,
): InventoryOperationsGraphWitnessV1 | undefined {
  try {
    const { compositionSelections: _selections, ...integration } =
      graph.integration;
    equal(integration, {
      providers: [],
      capabilities: [
        { key: "audit.record", providerId: "factory", operation: "record" },
        {
          key: "identity.context.resolve",
          providerId: "factory",
          operation: "resolve",
        },
        {
          key: "authorization.decision",
          providerId: "factory",
          operation: "decision",
        },
      ],
    });
    if (
      graph.policy.roles.length !== 2 ||
      new Set(graph.policy.roles).size !== 2
    )
      reject();
    const [stockkeeper, observer] = graph.policy.roles as [string, string];
    const principal = `${graph.metadata.id}-principal`;
    const session = `${graph.metadata.id}-session`;
    const business = graph.domain.entities.filter(
      (entity) => entity.key !== principal && entity.key !== session,
    );
    if (graph.domain.entities.length !== 4 || business.length !== 2) reject();
    const [item, movement] = business;
    if (!item || !movement || item.key === movement.key) reject();
    const domain = (minimum: number, maximum: number) => ({
      apiVersion: "factory.numeric-field-domain/v1",
      minimum: { value: minimum, inclusive: true },
      maximum: { value: maximum, inclusive: true },
    });
    const field = (key: string, type: string, required = true) => ({
      key,
      type,
      required,
    });
    const number = (key: string, min: number, max: number) => ({
      ...field(key, "integer"),
      numericDomain: domain(min, max),
    });
    equal(item.fields, [
      { ...field("sku", "string"), unique: true },
      field("name", "string"),
      field("unit", "string"),
      number("quantity", 0, 1000000000),
    ]);
    equal(item.indexes, []);
    equal(movement.fields, [
      field("stockItemId", "string"),
      { ...field("kind", "enum"), values: ["receive", "issue", "adjust"] },
      number("delta", -1000000000, 1000000000),
      number("beforeQuantity", 0, 1000000000),
      number("afterQuantity", 0, 1000000000),
      number("itemVersion", 1, 2147483647),
      field("reason", "text"),
      field("actorRole", "string"),
      field("recordedAt", "datetime"),
      field("correctionOf", "string", false),
      { ...field("status", "enum"), values: ["draft", "recorded"] },
    ]);
    equal(movement.indexes, [
      { fields: ["status"] },
      { fields: ["stockItemId", "itemVersion"], unique: true },
    ]);
    const seed = Object.getOwnPropertyDescriptor(graph.domain, "seedData");
    if (
      !seed ||
      !("value" in seed) ||
      !Array.isArray(seed.value) ||
      seed.value.length !== 0
    )
      reject();
    const identity = graph.domain.entities.find(
      (item) => item.key === principal,
    );
    const sessions = graph.domain.entities.find((item) => item.key === session);
    if (!identity || !sessions) reject();
    equal(identity.fields, [
      { key: "subjectRef", type: "string", required: true, unique: true },
      {
        key: "role",
        type: "enum",
        required: true,
        values: [stockkeeper, observer],
      },
      { key: "active", type: "boolean", required: true },
    ]);
    equal(identity.indexes, [{ fields: ["active"] }]);
    equal(sessions.fields, [
      { key: "subjectRef", type: "string", required: true },
      {
        key: "status",
        type: "enum",
        required: true,
        values: ["active", "expired"],
      },
      { key: "expiresAt", type: "datetime", required: true },
    ]);
    equal(sessions.indexes, [{ fields: ["subjectRef", "status"] }]);
    equal(graph.domain.relations, [
      {
        from: movement.key,
        to: item.key,
        kind: "many-to-one",
        field: "stockItemId",
      },
      {
        from: session,
        to: principal,
        kind: "many-to-one",
        field: "subjectRef",
      },
    ]);
    equal(graph.policy.permissions, [
      {
        role: stockkeeper,
        resource: item.key,
        actions: ["create", "read", "update"],
      },
      {
        role: stockkeeper,
        resource: movement.key,
        actions: ["create", "read", "submit", "audit"],
      },
      { role: stockkeeper, resource: principal, actions: ["read"] },
      {
        role: stockkeeper,
        resource: session,
        actions: ["create", "read", "update"],
      },
      { role: observer, resource: item.key, actions: ["read"] },
      { role: observer, resource: principal, actions: ["read"] },
      { role: observer, resource: session, actions: ["read"] },
    ]);
    const flow = graph.flow.flows[0];
    if (!flow) reject();
    equal(graph.flow.flows, [
      {
        id: flow.id,
        entity: movement.key,
        initialState: "draft",
        states: ["draft", "recorded"],
        events: ["submit"],
        transitions: [
          {
            from: "draft",
            event: "submit",
            to: "recorded",
            roles: [stockkeeper],
            effects: [{ capability: "audit.record", operation: "record" }],
          },
        ],
      },
    ]);
    if (
      graph.page.pages.length !== 3 ||
      new Set(graph.page.pages.map((page) => page.id)).size !== 3
    )
      reject();
    const pages = {} as { list: string; form: string; detail: string };
    for (const intent of ["list", "form", "detail"] as const) {
      const page = graph.page.pages.find(
        (item) => item.blocks[0]?.type === intent,
      );
      if (!page) reject();
      equal(page, {
        id: page.id,
        route: `/${page.id}`,
        title: page.title,
        blocks: [
          { id: `${page.id}-${intent}`, type: intent, entity: item.key },
        ],
      });
      pages[intent] = page.id;
    }
    const list = graph.page.pages.find((page) => page.id === pages.list)!;
    equal(graph.page.navigation, [
      {
        id: `nav-${list.id}`,
        label: list.title,
        pageId: list.id,
        icon: "list",
      },
    ]);
    return Object.freeze({
      apiVersion: "factory.inventory-operations-graph-witness/v1",
      itemEntity: item.key,
      movementEntity: movement.key,
      workflow: flow.id,
      roles: Object.freeze({ stockkeeper, observer }),
      pages: Object.freeze(pages),
      numericFields: Object.freeze(
        [
          { entityKey: item.key, fieldKey: "quantity" },
          ...["delta", "beforeQuantity", "afterQuantity", "itemVersion"].map(
            (fieldKey) => ({ entityKey: movement.key, fieldKey }),
          ),
        ].map((coordinate) => Object.freeze(coordinate)),
      ),
    });
  } catch {
    return undefined;
  }
}
