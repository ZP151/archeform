import type { ApplicationGraphV1 } from "./model.js";

/** Computed structural evidence; never persisted admission or lifecycle authority. */
export interface CustomerRequestsGraphWitnessV1 {
  readonly apiVersion: "factory.customer-requests-graph-witness/v1";
  readonly requestEntity: string;
  readonly historyEntity: string;
  readonly principalEntity: string;
  readonly sessionEntity: string;
  readonly workflow: string;
  readonly roles: Readonly<{ staff: string; customer: string }>;
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
  throw new Error("Customer Requests structural mismatch.");
}
/** Schema-parsed JSON comparison: browser-safe, no serialization hooks. */
function equal(actual: unknown, expected: unknown): void {
  if (Object.is(actual, expected)) return;
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
export function matchCustomerRequestsGraphV1(
  graph: ApplicationGraphV1,
): CustomerRequestsGraphWitnessV1 | undefined {
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
    const [staff, customer] = graph.policy.roles as [string, string];
    const principalEntity = `${graph.metadata.id}-principal`,
      sessionEntity = `${graph.metadata.id}-session`;
    if (graph.domain.entities.length !== 4) reject();
    const [request, history, principal, session] = graph.domain.entities;
    if (
      !request ||
      !history ||
      !principal ||
      !session ||
      new Set(graph.domain.entities.map((e) => e.key)).size !== 4 ||
      principal.key !== principalEntity ||
      session.key !== sessionEntity
    )
      reject();
    if (
      [request.key, history.key].some((key) =>
        ["health", "audit", "capabilities", "work-order-assignees"].includes(
          key,
        ),
      )
    )
      reject();
    const statuses = ["open", "resolved", "cancelled"];
    const versionDomain = {
      apiVersion: "factory.numeric-field-domain/v1",
      minimum: { value: 0, inclusive: true },
      maximum: { value: 2147483647, inclusive: true },
    };
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
      actual: typeof request,
      fields: unknown[],
      indexes: unknown[],
    ) =>
      equal(actual, { key: actual.key, label: actual.label, fields, indexes });
    entity(
      request,
      [
        field("subject", "string"),
        field("description", "text"),
        enumeration("status", statuses),
        field("customerPrincipalId", "string"),
      ],
      [{ fields: ["status"] }, { fields: ["customerPrincipalId"] }],
    );
    entity(
      history,
      [
        field("requestId", "string"),
        enumeration("action", [
          "create",
          "update",
          "reply",
          "complete",
          "reopen",
          "cancel",
        ]),
        { ...field("requestVersion", "integer"), numericDomain: versionDomain },
        enumeration("toStatus", statuses),
        field("actorPrincipalId", "string"),
        field("actorRole", "string"),
        field("recordedAt", "datetime"),
        enumeration("fromStatus", statuses, false),
        field("message", "text", false),
        field("reason", "text", false),
        {
          ...field("correctsVersion", "integer", false),
          numericDomain: versionDomain,
        },
        field("beforeSubject", "string", false),
        field("afterSubject", "string", false),
        field("beforeDescription", "text", false),
        field("afterDescription", "text", false),
      ],
      [{ fields: ["requestId", "requestVersion"], unique: true }],
    );
    entity(
      principal,
      [
        { ...field("subjectRef", "string"), unique: true },
        enumeration("role", [staff, customer]),
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
      entities: [request, history, principal, session],
      relations: [
        {
          from: history.key,
          to: request.key,
          kind: "many-to-one",
          field: "requestId",
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
      roles: [staff, customer],
      permissions: [
        grant(staff, request.key, ["read", "reply", "complete"]),
        grant(staff, history.key, ["read"]),
        grant(staff, principalEntity, ["read"]),
        grant(staff, sessionEntity, ["create", "read", "update"]),
        grant(customer, request.key, [
          "create",
          "read",
          "update",
          "reply",
          "reopen",
          "cancel",
        ]),
        grant(customer, history.key, ["read"]),
        grant(customer, principalEntity, ["read"]),
        grant(customer, sessionEntity, ["read"]),
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
          entity: request.key,
          initialState: "open",
          states: statuses,
          events: ["complete", "reopen", "cancel"],
          transitions: [
            transition("complete", "open", "resolved", staff),
            transition("reopen", "resolved", "open", customer),
            transition("cancel", "open", "cancelled", customer),
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
          { id: `${page.id}-${intent}`, type: intent, entity: request.key },
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
      apiVersion: "factory.customer-requests-graph-witness/v1",
      requestEntity: request.key,
      historyEntity: history.key,
      principalEntity,
      sessionEntity,
      workflow: flow.id,
      roles: Object.freeze({ staff, customer }),
      pages: Object.freeze(pages),
      numericFields: Object.freeze([
        Object.freeze({ entityKey: history.key, fieldKey: "requestVersion" }),
        Object.freeze({ entityKey: history.key, fieldKey: "correctsVersion" }),
      ]),
    });
  } catch {
    return undefined;
  }
}
