import type { ProductBlueprintV1 } from "./product-blueprint.js";

/** Computed local evidence; never serialized admission or lifecycle authority. */
export interface ServiceWorkOrdersBlueprintWitnessV1 {
  readonly orderEntity: string;
  readonly historyEntity: string;
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
  if (actual === expected) return true;
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

/**
 * Accepts strictly schema-parsed Blueprint data. Validation calls this before
 * transition uniqueness so only the complete Work Orders cancellation pair can
 * receive an exception. It performs no parsing, recursion into validation or I/O.
 */
export function matchServiceWorkOrdersBlueprintV1(
  blueprint: ProductBlueprintV1,
): ServiceWorkOrdersBlueprintWitnessV1 | undefined {
  if (
    blueprint.actors.length !== 2 ||
    blueprint.entities.length !== 2 ||
    blueprint.pageIntents.length !== 4 ||
    blueprint.workflows.length !== 1
  )
    return undefined;
  const [dispatcher, technician] = blueprint.actors;
  const [order, history] = blueprint.entities;
  const [list, form, detail, queue] = blueprint.pageIntents;
  const [workflow] = blueprint.workflows;
  if (
    !dispatcher ||
    !technician ||
    !order ||
    !history ||
    !list ||
    !form ||
    !detail ||
    !queue ||
    !workflow ||
    dispatcher.key === technician.key ||
    order.key === history.key ||
    [order.key, history.key].includes("work-order-assignees") ||
    new Set(blueprint.pageIntents.map((page) => page.key)).size !== 4
  )
    return undefined;

  const statuses = ["open", "in-progress", "resolved", "cancelled"];
  const priorities = ["low", "medium", "high"];
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
  const expected = {
    actors: [
      {
        key: dispatcher.key,
        permissions: [
          {
            entityKey: order.key,
            actions: [
              "create",
              "read",
              "update",
              "assign",
              "reassign",
              "reopen",
              "cancel",
            ],
          },
          { entityKey: history.key, actions: ["read"] },
        ],
      },
      {
        key: technician.key,
        permissions: [
          { entityKey: order.key, actions: ["read", "start", "resolve"] },
          { entityKey: history.key, actions: ["read"] },
        ],
      },
    ],
    entities: [
      {
        key: order.key,
        fields: [
          field("title", "text"),
          field("serviceLocation", "text"),
          enumeration("priority", priorities),
          enumeration("status", statuses),
          field("description", "long-text", false),
          field("dueDate", "date", false),
          field("assigneePrincipalId", "text", false),
        ],
      },
      {
        key: history.key,
        fields: [
          { ...field("workOrder", "reference"), referenceTo: order.key },
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
            ...field("orderVersion", "number"),
            numericDomain: {
              apiVersion: "factory.numeric-field-domain/v1",
              minimum: { value: 0, inclusive: true },
              maximum: { value: 2147483647, inclusive: true },
            },
          },
          enumeration("toStatus", statuses),
          field("actorPrincipalId", "text"),
          field("actorRole", "text"),
          field("recordedAt", "datetime"),
          enumeration("fromStatus", statuses, false),
          field("fromAssigneePrincipalId", "text", false),
          field("toAssigneePrincipalId", "text", false),
          field("note", "long-text", false),
          ...["before", "after"].flatMap((prefix) => [
            field(prefix + "Title", "text", false),
            field(prefix + "ServiceLocation", "text", false),
            enumeration(prefix + "Priority", priorities, false),
            field(prefix + "Description", "long-text", false),
            field(prefix + "DueDate", "date", false),
          ]),
        ],
      },
    ],
    pageIntents: [list, form, detail, queue].map((page, index) => ({
      key: page.key,
      intent: ["list", "form", "detail", "queue"][index],
      entityKey: order.key,
    })),
    workflows: [
      {
        key: workflow.key,
        entityKey: order.key,
        states: statuses.map((key) => ({ key })),
        transitions: [
          transition("start", "open", "in-progress", technician.key),
          transition("resolve", "in-progress", "resolved", technician.key),
          transition("reopen", "resolved", "open", dispatcher.key),
          transition("cancel", "open", "cancelled", dispatcher.key),
          transition("cancel", "in-progress", "cancelled", dispatcher.key),
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
  return {
    orderEntity: order.key,
    historyEntity: history.key,
    workflow: workflow.key,
    roles: { dispatcher: dispatcher.key, technician: technician.key },
    pages: {
      list: list.key,
      form: form.key,
      detail: detail.key,
      queue: queue.key,
    },
    numericFields: [{ entityKey: history.key, fieldKey: "orderVersion" }],
  };
}
