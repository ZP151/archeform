import type { ProductBlueprintV1 } from "./product-blueprint.js";

/** Computed local evidence; never serialized admission or lifecycle authority. */
export interface CustomerRequestsBlueprintWitnessV1 {
  readonly requestEntity: string;
  readonly historyEntity: string;
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

function semanticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semanticValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "label" && key !== "description")
      .map(([key, child]) => [key, semanticValue(child)]),
  );
}

function sameShape(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (
    !actual ||
    !expected ||
    typeof actual !== "object" ||
    typeof expected !== "object" ||
    Array.isArray(actual) !== Array.isArray(expected)
  )
    return false;
  const keys = Object.keys(expected);
  return (
    Object.keys(actual).length === keys.length &&
    keys.every(
      (key) =>
        Object.hasOwn(actual, key) &&
        sameShape(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key],
        ),
    )
  );
}

/** Pure matcher over strictly schema-parsed Blueprint data; no persisted authority. */
export function matchCustomerRequestsBlueprintV1(
  blueprint: ProductBlueprintV1,
): CustomerRequestsBlueprintWitnessV1 | undefined {
  if (
    blueprint.actors.length !== 2 ||
    blueprint.entities.length !== 2 ||
    blueprint.pageIntents.length !== 4 ||
    blueprint.workflows.length !== 1
  )
    return undefined;
  const [staff, customer] = blueprint.actors;
  const [request, history] = blueprint.entities;
  const [list, form, detail, queue] = blueprint.pageIntents;
  const [workflow] = blueprint.workflows;
  if (
    !staff ||
    !customer ||
    !request ||
    !history ||
    !list ||
    !form ||
    !detail ||
    !queue ||
    !workflow ||
    staff.key === customer.key ||
    request.key === history.key ||
    [request.key, history.key].some((key) =>
      ["health", "audit", "capabilities", "work-order-assignees"].includes(key),
    ) ||
    new Set(blueprint.pageIntents.map((page) => page.key)).size !== 4
  )
    return undefined;

  const statuses = ["open", "resolved", "cancelled"];
  const field = (key: string, type: string, required = true) => ({
    key,
    type,
    required,
  });
  const enumeration = (key: string, options: string[], required = true) => ({
    ...field(key, "enum", required),
    options,
  });
  const transition = (
    key: string,
    from: string,
    to: string,
    actorKey: string,
  ) => ({ key, from, to, actorKey });
  const versionDomain = {
    apiVersion: "factory.numeric-field-domain/v1",
    minimum: { value: 0, inclusive: true },
    maximum: { value: 2147483647, inclusive: true },
  };
  const expected = {
    actors: [
      {
        key: staff.key,
        permissions: [
          {
            entityKey: request.key,
            actions: ["read", "reply", "complete"],
          },
          { entityKey: history.key, actions: ["read"] },
        ],
      },
      {
        key: customer.key,
        permissions: [
          {
            entityKey: request.key,
            actions: ["create", "read", "update", "reply", "reopen", "cancel"],
          },
          { entityKey: history.key, actions: ["read"] },
        ],
      },
    ],
    entities: [
      {
        key: request.key,
        fields: [
          field("subject", "text"),
          field("description", "long-text"),
          enumeration("status", statuses),
          field("customerPrincipalId", "text"),
        ],
      },
      {
        key: history.key,
        fields: [
          { ...field("request", "reference"), referenceTo: request.key },
          enumeration("action", [
            "create",
            "update",
            "reply",
            "complete",
            "reopen",
            "cancel",
          ]),
          {
            ...field("requestVersion", "number"),
            numericDomain: versionDomain,
          },
          enumeration("toStatus", statuses),
          field("actorPrincipalId", "text"),
          field("actorRole", "text"),
          field("recordedAt", "datetime"),
          enumeration("fromStatus", statuses, false),
          field("message", "long-text", false),
          field("reason", "long-text", false),
          {
            ...field("correctsVersion", "number", false),
            numericDomain: versionDomain,
          },
          field("beforeSubject", "text", false),
          field("afterSubject", "text", false),
          field("beforeDescription", "long-text", false),
          field("afterDescription", "long-text", false),
        ],
      },
    ],
    pageIntents: [list, form, detail, queue].map((page, index) => ({
      key: page.key,
      intent: ["list", "form", "detail", "queue"][index],
      entityKey: request.key,
    })),
    workflows: [
      {
        key: workflow.key,
        entityKey: request.key,
        states: statuses.map((key) => ({ key })),
        transitions: [
          transition("complete", "open", "resolved", staff.key),
          transition("reopen", "resolved", "open", customer.key),
          transition("cancel", "open", "cancelled", customer.key),
        ],
      },
    ],
  };
  if (
    !sameShape(
      semanticValue({
        actors: blueprint.actors,
        entities: blueprint.entities,
        pageIntents: blueprint.pageIntents,
        workflows: blueprint.workflows,
      }),
      expected,
    )
  )
    return undefined;
  return Object.freeze({
    requestEntity: request.key,
    historyEntity: history.key,
    workflow: workflow.key,
    roles: Object.freeze({ staff: staff.key, customer: customer.key }),
    pages: Object.freeze({
      list: list.key,
      form: form.key,
      detail: detail.key,
      queue: queue.key,
    }),
    numericFields: Object.freeze(
      ["requestVersion", "correctsVersion"].map((fieldKey) =>
        Object.freeze({
          entityKey: history.key,
          fieldKey,
        }),
      ),
    ),
  });
}
