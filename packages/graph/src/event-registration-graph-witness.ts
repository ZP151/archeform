import type { ApplicationGraphV1 } from "./model.js";
import {
  eventRegistrationEqual,
  eventRegistrationShape,
  type EventRegistrationBlueprintWitnessV1,
} from "./event-registration-blueprint-witness.js";

export interface EventRegistrationGraphWitnessV1 extends EventRegistrationBlueprintWitnessV1 {
  readonly apiVersion: "factory.event-registration-graph-witness/v1";
  readonly principalEntity: string;
  readonly sessionEntity: string;
}
/** Pure complete structural matching. Physical package verification belongs to the compiler. */
export function matchEventRegistrationGraphV1(
  g: ApplicationGraphV1,
): EventRegistrationGraphWitnessV1 | undefined {
  if (
    g.domain.entities.length !== 6 ||
    g.policy.roles.length !== 2 ||
    new Set(g.policy.roles).size !== 2 ||
    g.flow.flows.length !== 2 ||
    g.page.pages.length !== 5
  )
    return undefined;
  if (
    new Set(g.domain.entities.map((e) => e.key)).size !== 6 ||
    new Set(g.flow.flows.map((f) => f.id)).size !== 2 ||
    new Set(g.page.pages.map((p) => p.id)).size !== 5
  )
    return undefined;
  const principalEntity = `${g.metadata.id}-principal`,
    sessionEntity = `${g.metadata.id}-session`;
  const coordinates = {
    eventEntity: g.domain.entities[0]!.key,
    registrationEntity: g.domain.entities[1]!.key,
    eventHistoryEntity: g.domain.entities[2]!.key,
    registrationHistoryEntity: g.domain.entities[3]!.key,
    eventWorkflow: g.flow.flows[0]!.id,
    registrationWorkflow: g.flow.flows[1]!.id,
    roles: Object.freeze({
      organizer: g.policy.roles[0]!,
      attendee: g.policy.roles[1]!,
    }),
    pages: Object.freeze({
      list: g.page.pages[0]!.id,
      form: g.page.pages[1]!.id,
      detail: g.page.pages[2]!.id,
      myPlaces: g.page.pages[3]!.id,
      attendees: g.page.pages[4]!.id,
    }),
  };
  if (
    g.domain.entities
      .slice(0, 4)
      .some((e) =>
        ["health", "audit", "capabilities", "work-order-assignees"].includes(
          e.key,
        ),
      )
  )
    return undefined;
  const shape = eventRegistrationShape(coordinates);
  const scalar = (key: string) => `${key}Id`;
  const fields = (entity: (typeof shape.entities)[number]) =>
    entity.fields.map((f) => {
      const { type, key, required } = f;
      return {
        key: type === "reference" ? scalar(key) : key,
        type:
          (
            {
              text: "string",
              "long-text": "text",
              number: "integer",
              reference: "string",
            } as Record<string, string>
          )[type] ?? type,
        required,
        ...("options" in f ? { values: f.options } : {}),
        ...("numericDomain" in f ? { numericDomain: f.numericDomain } : {}),
      };
    });
  const indexes = [
    [{ fields: ["status", "startUtc"] }, { fields: ["startUtc"] }],
    [
      { fields: ["eventId", "attendeePrincipalId"], unique: true },
      { fields: ["eventId", "status"] },
      { fields: ["attendeePrincipalId"] },
    ],
    [{ fields: ["eventId", "eventVersion"], unique: true }],
    [{ fields: ["registrationId", "registrationVersion"], unique: true }],
  ];
  const field = (key: string, type: string) => ({ key, type, required: true });
  const entities = [
    ...shape.entities.map((entity, i) => ({
      key: entity.key,
      label: g.domain.entities[i]!.label,
      fields: fields(entity),
      indexes: indexes[i],
    })),
    {
      key: principalEntity,
      label: g.domain.entities[4]!.label,
      fields: [
        { ...field("subjectRef", "string"), unique: true },
        { ...field("role", "enum"), values: [...g.policy.roles] },
        field("active", "boolean"),
      ],
      indexes: [{ fields: ["active"] }],
    },
    {
      key: sessionEntity,
      label: g.domain.entities[5]!.label,
      fields: [
        field("subjectRef", "string"),
        { ...field("status", "enum"), values: ["active", "expired"] },
        field("expiresAt", "datetime"),
      ],
      indexes: [{ fields: ["subjectRef", "status"] }],
    },
  ];
  const domain = {
    entities,
    relations: [
      ...shape.entities.flatMap((entity) =>
        entity.fields.flatMap((f) =>
          "referenceTo" in f
            ? [
                {
                  from: entity.key,
                  to: f.referenceTo,
                  kind: "many-to-one",
                  field: scalar(f.key),
                },
              ]
            : [],
        ),
      ),
      {
        from: sessionEntity,
        to: principalEntity,
        kind: "many-to-one",
        field: "subjectRef",
      },
    ],
    seedData: [],
  };
  const policy = {
    roles: [...g.policy.roles],
    permissions: shape.actors.flatMap((actor, index) => [
      ...actor.permissions.map((p) => ({
        role: actor.key,
        resource: p.entityKey,
        actions: p.actions,
      })),
      { role: actor.key, resource: principalEntity, actions: ["read"] },
      {
        role: actor.key,
        resource: sessionEntity,
        actions: index === 0 ? ["create", "read", "update"] : ["read"],
      },
    ]),
  };
  const flow = {
    flows: shape.workflows.map((workflow, i) => ({
      id: workflow.key,
      entity: workflow.entityKey,
      initialState: workflow.states[0]!.key,
      states: workflow.states.map((s) => s.key),
      events: [...new Set(workflow.transitions.map((t) => t.key))],
      transitions: workflow.transitions
        .filter((_, j) => i !== 1 || j !== 1)
        .map((t, j) => ({
          from: t.from,
          event: t.key,
          to: t.to,
          roles:
            i === 1 && j === 0
              ? [coordinates.roles.attendee, coordinates.roles.organizer]
              : [t.actorKey],
        })),
    })),
  };
  const pages = shape.pageIntents.map((p, i) => ({
    id: p.key,
    route: `/${p.key}`,
    title: g.page.pages[i]!.title,
    blocks: [
      { id: `${p.key}-${p.intent}`, type: p.intent, entity: p.entityKey },
    ],
  }));
  const page = {
    pages,
    navigation: [0, 3, 4].map((index, i) => ({
      id: `nav-${pages[index]!.id}`,
      label: pages[index]!.title,
      pageId: pages[index]!.id,
      icon: ["list", "user", "check"][i],
    })),
  };
  const { compositionSelections: _selections, ...integration } = g.integration;
  if (
    !eventRegistrationEqual(g.domain, domain) ||
    !eventRegistrationEqual(g.policy, policy) ||
    !eventRegistrationEqual(g.flow, flow) ||
    !eventRegistrationEqual(g.page, page) ||
    !eventRegistrationEqual(integration, {
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
    })
  )
    return undefined;
  return Object.freeze({
    ...coordinates,
    apiVersion: "factory.event-registration-graph-witness/v1",
    principalEntity,
    sessionEntity,
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
