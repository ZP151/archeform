import {
  createCapabilityCompositionLock,
  type CapabilityCompositionLockV1,
} from "@factory/capabilities";
import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";
import {
  selectAppointmentRuntimeProfile,
  type AppointmentRuntimeProfile,
} from "./appointment-mutation-contract.js";

/** Private compiler contract: this is deliberately absent from the package exports. */
export interface AppointmentConsumerProfile {
  readonly key: "appointment-booking@2.0.0";
  readonly runtime: AppointmentRuntimeProfile;
  readonly serviceName: string;
  readonly serviceDuration: string;
}
const coordinates = [
  [
    "core.crud",
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  [
    "core.workflow",
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  [
    "core.identity-policy",
    "1.0.0",
    "a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  [
    "core.policy-declarations",
    "1.0.0",
    "56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  [
    "core.audit",
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  [
    "core.notification",
    "1.1.1",
    "207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
  [
    "scheduling.appointment",
    "1.0.1",
    "d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
  ],
] as const;
const slots = [
  ["serviceEntity", 0],
  ["serviceNameField", 0, 0],
  ["serviceDurationMinutesField", 0, 1],
  ["serviceActiveField", 0, 2],
  ["scheduleEntity", 1],
  ["scheduleServiceReferenceField", 1, 0],
  ["scheduleStartField", 1, 1],
  ["scheduleEndField", 1, 2],
  ["scheduleTimezoneField", 1, 3],
  ["scheduleCapacityField", 1, 4],
  ["scheduleStatusField", 1, 5],
  ["appointmentEntity", 2],
  ["appointmentScheduleReferenceField", 2, 0],
  ["appointmentCustomerNameField", 2, 1],
  ["appointmentNotesField", 2, 2],
  ["appointmentCancellationReasonField", 2, 3],
  ["appointmentStatusField", 2, 4],
] as const;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const positive = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
};

export function selectAppointmentConsumerProfile(
  graph: ApplicationGraphV1,
  lock: CapabilityCompositionLockV1,
): AppointmentConsumerProfile | undefined {
  if (
    !graph.policy.permissions.some((p) =>
      p.actions.includes("read-availability"),
    )
  )
    return undefined;
  const fail = (): never => {
    throw new Error("Appointment consumer compiler profile is unsupported.");
  };
  try {
    assertValidApplicationGraph(graph);
    const { compositionSelections: _selections, ...integration } =
      graph.integration;
    if (
      !same(integration, {
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
        ],
      })
    )
      return fail();
    const runtime = selectAppointmentRuntimeProfile(graph, lock);
    if (
      !runtime ||
      hashApplicationGraph(graph) !== lock.applicationGraphChecksum ||
      lock.packages.length !== 7
    )
      return fail();
    if (
      !same(
        lock,
        createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: lock.packages,
        }),
      )
    )
      return fail();
    if (
      graph.integration.compositionSelections &&
      !same(
        graph.integration.compositionSelections,
        coordinates.map(([key]) =>
          lock.packages.find((p) => p.lock.key === key),
        ),
      )
    )
      return fail();
    for (let i = 0; i < coordinates.length; i++) {
      const [key, version, digest] = coordinates[i]!;
      if (
        !same(lock.packages.find((p) => p.lock.key === key)!.lock, {
          key,
          version,
          manifestDigest: `sha256:${digest}`,
          packageRoot: `packages/capabilities/assets/${key}/${version}`,
          lifecycle: "golden",
        })
      )
        return fail();
    }
    const entities = graph.domain.entities;
    if (entities.length !== 5) return fail();
    const [service, schedule, appointment, principal, session] = entities;
    if (
      !service ||
      !schedule ||
      !appointment ||
      !principal ||
      !session ||
      runtime.serviceEntity !== service.key ||
      runtime.scheduleEntity !== schedule.key ||
      runtime.appointmentEntity !== appointment.key
    )
      return fail();
    const field = (
      key: string,
      type: string,
      required = true,
      extra: object = {},
    ) => ({ key, type, required, ...extra });
    const expectedFields = [
      [
        field(service.fields[0]!.key, "string"),
        field(service.fields[1]!.key, "integer", true, {
          numericDomain: positive,
        }),
        field(service.fields[2]!.key, "boolean"),
      ],
      [
        field(schedule.fields[0]!.key, "string"),
        field("startUtc", "datetime"),
        field("endUtc", "datetime"),
        field(schedule.fields[3]!.key, "string"),
        field(schedule.fields[4]!.key, "integer", true, {
          numericDomain: positive,
        }),
        field(schedule.fields[5]!.key, "enum", true, {
          values: ["open", "closed"],
        }),
      ],
      [
        field(appointment.fields[0]!.key, "string"),
        field(appointment.fields[1]!.key, "string"),
        field("notes", "text", false),
        field("cancellationReason", "text", false),
        field(appointment.fields[4]!.key, "enum", true, {
          values: ["requested", "confirmed", "cancelled"],
        }),
      ],
      [
        field("subjectRef", "string", true, { unique: true }),
        field("role", "enum", true, {
          values: ["customer", "staff", "administrator"],
        }),
        field("active", "boolean"),
      ],
      [
        field("subjectRef", "string"),
        field("status", "enum", true, { values: ["active", "expired"] }),
        field("expiresAt", "datetime"),
      ],
    ];
    const indexes = [
      [],
      [{ fields: [schedule.fields[5]!.key] }],
      [{ fields: [appointment.fields[4]!.key] }],
      [{ fields: ["active"] }],
      [{ fields: ["subjectRef", "status"] }],
    ];
    if (
      entities.some(
        ({ label: _label, ...entity }, i) =>
          !same(entity, {
            key: entity.key,
            fields: expectedFields[i],
            indexes: indexes[i],
          }),
      )
    )
      return fail();
    if (
      !same(graph.domain.relations, [
        {
          from: schedule.key,
          to: service.key,
          kind: "many-to-one",
          field: schedule.fields[0]!.key,
        },
        {
          from: appointment.key,
          to: schedule.key,
          kind: "many-to-one",
          field: appointment.fields[0]!.key,
        },
        {
          from: session.key,
          to: principal.key,
          kind: "many-to-one",
          field: "subjectRef",
        },
      ])
    )
      return fail();
    const permission = (role: string, resource: string, actions: string[]) => ({
      role,
      resource,
      actions,
    });
    const identity = (role: string) => [
      permission(role, principal.key, ["read"]),
      permission(
        role,
        session.key,
        role === "customer" ? ["create", "read", "update"] : ["read"],
      ),
    ];
    if (
      !same(graph.policy, {
        roles: ["customer", "staff", "administrator"],
        permissions: [
          permission("customer", appointment.key, ["create", "read", "cancel"]),
          permission("customer", schedule.key, ["read-availability"]),
          ...identity("customer"),
          permission("staff", appointment.key, [
            "read",
            "confirm",
            "reschedule",
            "cancel",
          ]),
          permission("staff", schedule.key, ["read-availability"]),
          ...identity("staff"),
          permission("administrator", service.key, [
            "create",
            "read",
            "update",
            "manage",
          ]),
          permission("administrator", schedule.key, [
            "create",
            "read",
            "update",
            "manage",
          ]),
          permission("administrator", appointment.key, ["read", "cancel"]),
          ...identity("administrator"),
        ],
      })
    )
      return fail();
    const flow = graph.flow.flows[0];
    if (
      !flow ||
      !same(graph.flow, {
        flows: [
          {
            id: flow.id,
            entity: appointment.key,
            initialState: "requested",
            states: ["requested", "confirmed", "cancelled"],
            events: ["confirm", "cancel", "reschedule"],
            transitions: [
              {
                from: "requested",
                event: "confirm",
                to: "confirmed",
                roles: ["staff"],
              },
              {
                from: "requested",
                event: "cancel",
                to: "cancelled",
                roles: ["customer"],
              },
              {
                from: "confirmed",
                event: "reschedule",
                to: "requested",
                roles: ["staff"],
              },
            ],
          },
        ],
      })
    )
      return fail();
    const intents = [
      ["calendar", schedule.key],
      ["list", appointment.key],
      ["form", appointment.key],
      ["detail", appointment.key],
      ["settings", undefined],
      ["settings", undefined],
      ["list", service.key],
      ["list", schedule.key],
    ];
    if (
      graph.page.pages.length !== 8 ||
      graph.page.pages.some(
        (page, i) =>
          page.blocks.length !== 1 ||
          !same(page.blocks[0], {
            id: `${page.id}-${intents[i]![0]}`,
            type: intents[i]![0],
            ...(intents[i]![1] ? { entity: intents[i]![1] } : {}),
          }) ||
          page.route !== `/${page.id}`,
      )
    )
      return fail();
    if (
      !same(
        graph.page.navigation.map(({ label: _label, ...entry }) => entry),
        [0, 1, 4, 5, 6, 7].map((i) => ({
          id: `nav-${graph.page.pages[i]!.id}`,
          pageId: graph.page.pages[i]!.id,
          icon: intents[i]![0],
        })),
      )
    )
      return fail();
    const ref = (graphSymbol: string) => ({ graphSymbol });
    const expectedBindings = [
      {
        entityKey: ref(`graph.domain.${service.key}`),
        routeKey: ref(`graph.page.${graph.page.pages[6]!.id}`),
      },
      { flowKey: ref(`graph.flow.${flow.id}`) },
      {
        principalEntity: ref(`graph.domain.${principal.key}`),
        sessionEntity: ref(`graph.domain.${session.key}`),
        defaultRole: ref("graph.policy.customer"),
        authenticatedRole: ref("graph.policy.staff"),
      },
      {},
      { actorRole: ref("graph.policy.customer") },
      { recipientRole: ref("graph.policy.customer") },
      Object.fromEntries(
        slots.map((slot) => [
          slot[0],
          {
            graphSymbol: `graph.domain.${entities[slot[1]]!.key}`,
            ...(slot.length === 3
              ? { fieldKey: entities[slot[1]]!.fields[slot[2]]!.key }
              : {}),
          },
        ]),
      ),
    ];
    if (
      coordinates.some(
        ([key], i) =>
          !same(
            lock.packages.find((p) => p.lock.key === key)!.bindings,
            expectedBindings[i],
          ),
      )
    )
      return fail();
    return {
      key: "appointment-booking@2.0.0",
      runtime,
      serviceName: service.fields[0]!.key,
      serviceDuration: service.fields[1]!.key,
    };
  } catch {
    return fail();
  }
}
