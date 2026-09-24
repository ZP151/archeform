import type { ApplicationGraphV1 } from "./model.js";

/** Computed structural evidence; never persisted admission or lifecycle authority. */
export interface ServiceWorkOrdersGraphWitnessV1 {
  readonly apiVersion: "factory.service-work-orders-graph-witness/v1";
  readonly orderEntity: string;
  readonly historyEntity: string;
  readonly principalEntity: string;
  readonly sessionEntity: string;
  readonly workflow: string;
  readonly roles: Readonly<{ dispatcher: string; technician: string }>;
  readonly pages: Readonly<{
    list: string;
    form: string;
    detail: string;
    queue: string;
  }>;
  readonly numericFields: readonly Readonly<{
    entityKey: string;
    fieldKey: string;
  }>[];
}
function reject(): never {
  throw new Error("Work Orders structural mismatch.");
}
/** Schema-parsed JSON comparison: browser-safe, no serialization hooks. */
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
  const keys = Object.keys(expected);
  if (
    Object.keys(actual).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(actual, key))
  )
    reject();
  for (const key of keys)
    equal(
      (actual as Record<string, unknown>)[key],
      (expected as Record<string, unknown>)[key],
    );
}
/** Consumes schema-parsed Graph data. The compiler independently verifies physical locks. */
export function matchServiceWorkOrdersGraphV1(
  graph: ApplicationGraphV1,
): ServiceWorkOrdersGraphWitnessV1 | undefined {
  try {
    const { compositionSelections: _selections, ...integration } =
      graph.integration;
    equal(integration, {
      providers: [],
      capabilities: [
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
        { key: "audit.record", providerId: "factory", operation: "record" },
      ],
    });
    if (
      graph.policy.roles.length !== 2 ||
      new Set(graph.policy.roles).size !== 2
    )
      reject();
    const [dispatcher, technician] = graph.policy.roles as [string, string];
    const principalEntity = `${graph.metadata.id}-principal`,
      sessionEntity = `${graph.metadata.id}-session`;
    if (graph.domain.entities.length !== 4) reject();
    const [order, history, principal, session] = graph.domain.entities;
    if (
      !order ||
      !history ||
      !principal ||
      !session ||
      new Set(graph.domain.entities.map((e) => e.key)).size !== 4 ||
      principal.key !== principalEntity ||
      session.key !== sessionEntity
    )
      reject();
    if ([order.key, history.key].includes("work-order-assignees")) reject();
    const statuses = ["open", "in-progress", "resolved", "cancelled"],
      priorities = ["low", "medium", "high"];
    const field = (key: string, type: string, required = true) => ({
      key,
      type,
      required,
    });
    const enumeration = (key: string, values: string[], required = true) => ({
      ...field(key, "enum", required),
      values,
    });
    const entity = (
      actual: typeof order,
      fields: unknown[],
      indexes: unknown[],
    ) =>
      equal(actual, { key: actual.key, label: actual.label, fields, indexes });
    entity(
      order,
      [
        field("title", "string"),
        field("serviceLocation", "string"),
        enumeration("priority", priorities),
        enumeration("status", statuses),
        field("description", "text", false),
        field("dueDate", "date", false),
        field("assigneePrincipalId", "string", false),
      ],
      [{ fields: ["status"] }],
    );
    entity(
      history,
      [
        field("workOrderId", "string"),
        enumeration("action", [
          "create",
          "update",
          "assign",
          "reassign",
          "start",
          "resolve",
          "reopen",
          "cancel",
        ]),
        {
          ...field("orderVersion", "integer"),
          numericDomain: {
            apiVersion: "factory.numeric-field-domain/v1",
            minimum: { value: 0, inclusive: true },
            maximum: { value: 2147483647, inclusive: true },
          },
        },
        enumeration("toStatus", statuses),
        field("actorPrincipalId", "string"),
        field("actorRole", "string"),
        field("recordedAt", "datetime"),
        enumeration("fromStatus", statuses, false),
        field("fromAssigneePrincipalId", "string", false),
        field("toAssigneePrincipalId", "string", false),
        field("note", "text", false),
        ...["before", "after"].flatMap((prefix) => [
          field(prefix + "Title", "string", false),
          field(prefix + "ServiceLocation", "string", false),
          enumeration(prefix + "Priority", priorities, false),
          field(prefix + "Description", "text", false),
          field(prefix + "DueDate", "date", false),
        ]),
      ],
      [{ fields: ["workOrderId", "orderVersion"], unique: true }],
    );
    entity(
      principal,
      [
        { ...field("subjectRef", "string"), unique: true },
        enumeration("role", [dispatcher, technician]),
        field("active", "boolean"),
      ],
      [{ fields: ["active"] }],
    );
    entity(
      session,
      [
        field("subjectRef", "string"),
        enumeration("status", ["active", "expired"]),
        field("expiresAt", "datetime"),
      ],
      [{ fields: ["subjectRef", "status"] }],
    );
    equal(graph.domain, {
      entities: [order, history, principal, session],
      relations: [
        {
          from: history.key,
          to: order.key,
          kind: "many-to-one",
          field: "workOrderId",
        },
        {
          from: sessionEntity,
          to: principalEntity,
          kind: "many-to-one",
          field: "subjectRef",
        },
      ],
      seedData: [],
    });
    const grant = (role: string, resource: string, actions: string[]) => ({
      role,
      resource,
      actions,
    });
    equal(graph.policy, {
      roles: [dispatcher, technician],
      permissions: [
        grant(dispatcher, order.key, [
          "create",
          "read",
          "update",
          "assign",
          "reassign",
          "reopen",
          "cancel",
        ]),
        grant(dispatcher, history.key, ["read"]),
        grant(dispatcher, principalEntity, ["read"]),
        grant(dispatcher, sessionEntity, ["create", "read", "update"]),
        grant(technician, order.key, ["read", "start", "resolve"]),
        grant(technician, history.key, ["read"]),
        grant(technician, principalEntity, ["read"]),
        grant(technician, sessionEntity, ["read"]),
      ],
    });
    const flow = graph.flow.flows[0];
    if (!flow) reject();
    const transition = (
      event: string,
      from: string,
      to: string,
      role: string,
    ) => ({ from, event, to, roles: [role] });
    equal(graph.flow, {
      flows: [
        {
          id: flow.id,
          entity: order.key,
          initialState: "open",
          states: statuses,
          events: ["start", "resolve", "reopen", "cancel"],
          transitions: [
            transition("start", "open", "in-progress", technician),
            transition("resolve", "in-progress", "resolved", technician),
            transition("reopen", "resolved", "open", dispatcher),
            transition("cancel", "open", "cancelled", dispatcher),
            transition("cancel", "in-progress", "cancelled", dispatcher),
          ],
        },
      ],
    });
    const intents = ["list", "form", "detail", "queue"] as const;
    if (
      graph.page.pages.length !== 4 ||
      new Set(graph.page.pages.map((p) => p.id)).size !== 4
    )
      reject();
    const pages = {} as {
      list: string;
      form: string;
      detail: string;
      queue: string;
    };
    intents.forEach((intent, index) => {
      const page = graph.page.pages[index]!;
      equal(page, {
        id: page.id,
        route: `/${page.id}`,
        title: page.title,
        blocks: [
          { id: `${page.id}-${intent}`, type: intent, entity: order.key },
        ],
      });
      pages[intent] = page.id;
    });
    equal(graph.page, {
      pages: graph.page.pages,
      navigation: [0, 3].map((index) => {
        const page = graph.page.pages[index]!;
        return {
          id: `nav-${page.id}`,
          label: page.title,
          pageId: page.id,
          icon: index === 0 ? "list" : "inbox",
        };
      }),
    });
    return Object.freeze({
      apiVersion: "factory.service-work-orders-graph-witness/v1",
      orderEntity: order.key,
      historyEntity: history.key,
      principalEntity,
      sessionEntity,
      workflow: flow.id,
      roles: Object.freeze({ dispatcher, technician }),
      pages: Object.freeze(pages),
      numericFields: Object.freeze([
        Object.freeze({ entityKey: history.key, fieldKey: "orderVersion" }),
      ]),
    });
  } catch {
    return undefined;
  }
}
