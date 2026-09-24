import type { ProductBlueprintV1 } from "./product-blueprint.js";

/** Computed evidence only; never serialized admission or lifecycle authority. */
export interface EventRegistrationBlueprintWitnessV1 {
  readonly eventEntity: string;
  readonly registrationEntity: string;
  readonly eventHistoryEntity: string;
  readonly registrationHistoryEntity: string;
  readonly eventWorkflow: string;
  readonly registrationWorkflow: string;
  readonly roles: Readonly<{ organizer: string; attendee: string }>;
  readonly pages: Readonly<{
    list: string;
    form: string;
    detail: string;
    myPlaces: string;
    attendees: string;
  }>;
  readonly numericFields: readonly Readonly<{
    entityKey: string;
    fieldKey: string;
  }>[];
}
/** Internal shared structural comparison preserves negative zero and array order. */
export function eventRegistrationEqual(
  actual: unknown,
  expected: unknown,
): boolean {
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
        eventRegistrationEqual(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key],
        ),
    )
  );
}
function semantics(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(semantics);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "label" && key !== "description")
      .map(([key, child]) => [key, semantics(child)]),
  );
}
/** Internal contract shared by the Blueprint and Graph witnesses, with no I/O. */
export function eventRegistrationShape(
  c: Omit<EventRegistrationBlueprintWitnessV1, "numericFields">,
) {
  const {
    eventEntity: event,
    registrationEntity: registration,
    eventHistoryEntity: eventHistory,
    registrationHistoryEntity: registrationHistory,
    roles: { organizer, attendee },
  } = c;
  const field = (key: string, type: string, required = true) => ({
    key,
    type,
    required,
  });
  const enumeration = (key: string, options: string[], required = true) => ({
    ...field(key, "enum", required),
    options,
  });
  const number = (
    key: string,
    minimum: number,
    maximum: number,
    required = true,
  ) => ({
    ...field(key, "number", required),
    numericDomain: {
      apiVersion: "factory.numeric-field-domain/v1",
      minimum: { value: minimum, inclusive: true },
      maximum: { value: maximum, inclusive: true },
    },
  });
  const reference = (key: string, referenceTo: string) => ({
    ...field(key, "reference"),
    referenceTo,
  });
  const eventStates = ["closed", "open", "cancelled"],
    registrationStates = ["registered", "cancelled", "checked-in"];
  const metadata = [
    field("title", "text"),
    field("description", "long-text"),
    field("venue", "text"),
    field("startUtc", "datetime"),
    field("endUtc", "datetime"),
    field("timezone", "text"),
    number("capacity", 1, 1000000),
  ];
  const history = (
    parent: string,
    target: string,
    version: string,
    states: string[],
    actions: string[],
  ) => [
    reference(parent, target),
    enumeration("action", actions),
    number(version, 0, 2147483647),
    enumeration("toStatus", states),
    field("actorPrincipalId", "text"),
    field("actorRole", "text"),
    field("recordedAt", "datetime"),
    enumeration("fromStatus", states, false),
    field("reason", "long-text", false),
  ];
  const grant = (entityKey: string, actions: string[]) => ({
    entityKey,
    actions,
  });
  const transition = (
    key: string,
    from: string,
    to: string,
    actorKey: string,
  ) => ({ key, from, to, actorKey });
  return {
    actors: [
      {
        key: organizer,
        permissions: [
          grant(event, [
            "create",
            "read",
            "update",
            "reopen",
            "complete",
            "cancel",
          ]),
          grant(registration, ["read", "cancel", "check-in", "undo-check-in"]),
          grant(eventHistory, ["read"]),
          grant(registrationHistory, ["read"]),
        ],
      },
      {
        key: attendee,
        permissions: [
          grant(event, ["read"]),
          grant(registration, ["create", "read", "update", "reopen", "cancel"]),
          grant(registrationHistory, ["read"]),
        ],
      },
    ],
    entities: [
      {
        key: event,
        fields: [
          ...metadata,
          number("reservedSeats", 0, 1000000),
          enumeration("status", eventStates),
          field("cancellationReason", "long-text", false),
          field("cancelledAt", "datetime", false),
        ],
      },
      {
        key: registration,
        fields: [
          reference("event", event),
          field("attendeePrincipalId", "text"),
          field("attendeeName", "text"),
          enumeration("status", registrationStates),
        ],
      },
      {
        key: eventHistory,
        fields: [
          ...history("event", event, "eventVersion", eventStates, [
            "create",
            "update",
            "reopen",
            "complete",
            "cancel",
          ]),
          ...metadata.flatMap((f) =>
            ["before", "after"].map((prefix) => ({
              ...f,
              key: prefix + f.key[0]!.toUpperCase() + f.key.slice(1),
              required: false,
            })),
          ),
        ],
      },
      {
        key: registrationHistory,
        fields: [
          ...history(
            "registration",
            registration,
            "registrationVersion",
            registrationStates,
            [
              "create",
              "update",
              "cancel",
              "reopen",
              "check-in",
              "undo-check-in",
            ],
          ),
          field("beforeAttendeeName", "text", false),
          field("afterAttendeeName", "text", false),
        ],
      },
    ],
    pageIntents: Object.values(c.pages).map((key, i) => ({
      key,
      intent: ["list", "form", "detail", "list", "queue"][i]!,
      entityKey: i < 3 ? event : registration,
    })),
    workflows: [
      {
        key: c.eventWorkflow,
        entityKey: event,
        states: eventStates.map((key) => ({ key })),
        transitions: [
          transition("reopen", "closed", "open", organizer),
          transition("complete", "open", "closed", organizer),
          transition("cancel", "closed", "cancelled", organizer),
          transition("cancel", "open", "cancelled", organizer),
        ],
      },
      {
        key: c.registrationWorkflow,
        entityKey: registration,
        states: registrationStates.map((key) => ({ key })),
        transitions: [
          transition("cancel", "registered", "cancelled", attendee),
          transition("cancel", "registered", "cancelled", organizer),
          transition("reopen", "cancelled", "registered", attendee),
          transition("check-in", "registered", "checked-in", organizer),
          transition("undo-check-in", "checked-in", "registered", organizer),
        ],
      },
    ],
  };
}
export function matchEventRegistrationBlueprintV1(
  b: ProductBlueprintV1,
): EventRegistrationBlueprintWitnessV1 | undefined {
  if (
    b.actors.length !== 2 ||
    b.entities.length !== 4 ||
    b.workflows.length !== 2 ||
    b.pageIntents.length !== 5
  )
    return undefined;
  if (
    [b.actors, b.entities, b.workflows, b.pageIntents].some(
      (items) => new Set(items.map((item) => item.key)).size !== items.length,
    )
  )
    return undefined;
  if (
    b.entities.some((e) =>
      ["health", "audit", "capabilities", "work-order-assignees"].includes(
        e.key,
      ),
    )
  )
    return undefined;
  const coordinates = {
    eventEntity: b.entities[0]!.key,
    registrationEntity: b.entities[1]!.key,
    eventHistoryEntity: b.entities[2]!.key,
    registrationHistoryEntity: b.entities[3]!.key,
    eventWorkflow: b.workflows[0]!.key,
    registrationWorkflow: b.workflows[1]!.key,
    roles: Object.freeze({
      organizer: b.actors[0]!.key,
      attendee: b.actors[1]!.key,
    }),
    pages: Object.freeze({
      list: b.pageIntents[0]!.key,
      form: b.pageIntents[1]!.key,
      detail: b.pageIntents[2]!.key,
      myPlaces: b.pageIntents[3]!.key,
      attendees: b.pageIntents[4]!.key,
    }),
  };
  const shape = eventRegistrationShape(coordinates);
  if (
    !eventRegistrationEqual(
      semantics({
        actors: b.actors,
        entities: b.entities,
        workflows: b.workflows,
        pageIntents: b.pageIntents,
      }),
      shape,
    )
  )
    return undefined;
  return Object.freeze({
    ...coordinates,
    numericFields: Object.freeze(
      shape.entities.flatMap((entity) =>
        entity.fields
          .filter((f) => "numericDomain" in f)
          .map((f) =>
            Object.freeze({ entityKey: entity.key, fieldKey: f.key }),
          ),
      ),
    ),
  });
}
