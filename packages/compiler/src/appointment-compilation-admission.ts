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
import { selectAppointmentConsumerProfile } from "./appointment-consumer-contract.js";
const exactAppointmentLocks = [
  [
    "core.crud",
    "1.0.1",
    "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  [
    "core.workflow",
    "1.0.1",
    "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  [
    "core.identity-policy",
    "1.0.0",
    "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  [
    "core.policy-declarations",
    "1.0.0",
    "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  [
    "core.audit",
    "1.0.2",
    "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  [
    "core.notification",
    "1.1.1",
    "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
  [
    "scheduling.appointment",
    "1.0.1",
    "sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
  ],
] as const;

const appointmentBindingKeys = [
  "serviceEntity",
  "serviceNameField",
  "serviceDurationMinutesField",
  "serviceActiveField",
  "scheduleEntity",
  "scheduleServiceReferenceField",
  "scheduleStartField",
  "scheduleEndField",
  "scheduleTimezoneField",
  "scheduleCapacityField",
  "scheduleStatusField",
  "appointmentEntity",
  "appointmentScheduleReferenceField",
  "appointmentCustomerNameField",
  "appointmentNotesField",
  "appointmentCancellationReasonField",
  "appointmentStatusField",
] as const;

// ADR-0077: structural literals from the immutable TypeScript booking contract.
// Runtime code never reads or imports the historical test fixture.
const historicalBooking = {
  entities: [
    {
      key: "service",
      fields: [
        {
          key: "name",
          type: "string",
          required: true,
        },
        {
          key: "durationMinutes",
          type: "integer",
          required: true,
        },
        {
          key: "price",
          type: "decimal",
          required: true,
        },
      ],
      indexes: [],
    },
    {
      key: "appointment",
      fields: [
        {
          key: "serviceKey",
          type: "string",
          required: true,
        },
        {
          key: "startsAt",
          type: "datetime",
          required: true,
        },
        {
          key: "customerName",
          type: "string",
          required: true,
        },
        {
          key: "notes",
          type: "text",
          required: false,
        },
        {
          key: "status",
          type: "enum",
          required: true,
          values: ["requested", "confirmed", "rescheduled", "cancelled"],
        },
      ],
      indexes: [
        {
          fields: ["status"],
        },
      ],
    },
    {
      key: "schedule",
      fields: [
        {
          key: "day",
          type: "date",
          required: true,
        },
        {
          key: "capacity",
          type: "integer",
          required: true,
        },
      ],
      indexes: [],
    },
    {
      key: "$principal",
      fields: [
        {
          key: "subjectRef",
          type: "string",
          required: true,
          unique: true,
        },
        {
          key: "role",
          type: "enum",
          required: true,
          values: ["customer", "staff", "administrator"],
        },
        {
          key: "active",
          type: "boolean",
          required: true,
        },
      ],
      indexes: [
        {
          fields: ["active"],
        },
      ],
    },
    {
      key: "$session",
      fields: [
        {
          key: "subjectRef",
          type: "string",
          required: true,
        },
        {
          key: "status",
          type: "enum",
          required: true,
          values: ["active", "expired"],
        },
        {
          key: "expiresAt",
          type: "datetime",
          required: true,
        },
      ],
      indexes: [
        {
          fields: ["subjectRef", "status"],
        },
      ],
    },
  ],
  relations: [
    {
      from: "appointment",
      to: "service",
      kind: "many-to-one",
      field: "serviceKey",
    },
    {
      from: "$session",
      to: "$principal",
      kind: "many-to-one",
      field: "subjectRef",
    },
  ],
  policy: {
    roles: ["customer", "staff", "administrator"],
    permissions: [
      {
        role: "customer",
        resource: "appointment",
        actions: ["create", "read"],
      },
      {
        role: "customer",
        resource: "$principal",
        actions: ["read"],
      },
      {
        role: "customer",
        resource: "$session",
        actions: ["create", "read", "update"],
      },
      {
        role: "staff",
        resource: "appointment",
        actions: ["read", "confirm", "reschedule"],
      },
      {
        role: "staff",
        resource: "$principal",
        actions: ["read"],
      },
      {
        role: "staff",
        resource: "$session",
        actions: ["read"],
      },
      {
        role: "administrator",
        resource: "service",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      {
        role: "administrator",
        resource: "schedule",
        actions: ["create", "read", "update", "delete", "manage"],
      },
      {
        role: "administrator",
        resource: "appointment",
        actions: ["read", "delete", "cancel", "manage"],
      },
      {
        role: "administrator",
        resource: "$principal",
        actions: ["read"],
      },
      {
        role: "administrator",
        resource: "$session",
        actions: ["read"],
      },
    ],
  },
  flow: {
    flows: [
      {
        id: "$flow",
        entity: "appointment",
        initialState: "requested",
        states: ["requested", "confirmed", "rescheduled", "cancelled"],
        events: ["confirm", "reschedule", "delete", "cancel"],
        transitions: [
          {
            from: "requested",
            event: "confirm",
            to: "confirmed",
            roles: ["staff"],
          },
          {
            from: "confirmed",
            event: "reschedule",
            to: "rescheduled",
            roles: ["staff"],
          },
          {
            from: "requested",
            event: "delete",
            to: "cancelled",
            roles: ["administrator"],
          },
          {
            from: "confirmed",
            event: "cancel",
            to: "cancelled",
            roles: ["administrator"],
          },
        ],
      },
    ],
  },
  packages: [
    {
      lock: {
        key: "core.audit",
        version: "1.0.2",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
        manifestDigest:
          "sha256:fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
        lifecycle: "golden",
      },
      bindings: {
        actorRole: {
          graphSymbol: "graph.policy.customer",
        },
      },
    },
    {
      lock: {
        key: "core.crud",
        version: "1.0.1",
        packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
        manifestDigest:
          "sha256:8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
        lifecycle: "golden",
      },
      bindings: {
        entityKey: {
          graphSymbol: "graph.domain.service",
        },
        routeKey: {
          graphSymbol: "graph.page.$route",
        },
      },
    },
    {
      lock: {
        key: "core.identity-policy",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.identity-policy/1.0.0",
        manifestDigest:
          "sha256:a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
        lifecycle: "golden",
      },
      bindings: {
        authenticatedRole: {
          graphSymbol: "graph.policy.staff",
        },
        defaultRole: {
          graphSymbol: "graph.policy.customer",
        },
        principalEntity: {
          graphSymbol: "graph.domain.$principal",
        },
        sessionEntity: {
          graphSymbol: "graph.domain.$session",
        },
      },
    },
    {
      lock: {
        key: "core.notification",
        version: "1.1.1",
        packageRoot: "packages/capabilities/assets/core.notification/1.1.1",
        manifestDigest:
          "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
        lifecycle: "golden",
      },
      bindings: {
        recipientRole: {
          graphSymbol: "graph.policy.customer",
        },
      },
    },
    {
      lock: {
        key: "core.policy-declarations",
        version: "1.0.0",
        packageRoot:
          "packages/capabilities/assets/core.policy-declarations/1.0.0",
        manifestDigest:
          "sha256:56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
        lifecycle: "golden",
      },
      bindings: {},
    },
    {
      lock: {
        key: "core.workflow",
        version: "1.0.1",
        packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
        manifestDigest:
          "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
        lifecycle: "golden",
      },
      bindings: {
        flowKey: {
          graphSymbol: "graph.flow.$flow",
        },
      },
    },
  ],
} as const;

function isHistoricalGenericBookingWitness(
  graph: ApplicationGraphV1,
  compositionLock: CapabilityCompositionLockV1,
): boolean {
  // Canonical object equality preserves every property and every ordered array.
  // Only the explicitly keyed sets below may be reordered.
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value !== null && typeof value === "object")
      return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
        .join(",")}}`;
    return JSON.stringify(value) ?? "undefined";
  };
  const keyed = <T>(values: readonly T[], key: (value: T) => string): T[] => {
    const keys = values.map(key);
    if (new Set(keys).size !== keys.length)
      throw new Error("Duplicate historical witness key.");
    return [...values].sort((a, b) => key(a).localeCompare(key(b)));
  };
  const strings = (values: readonly string[]) =>
    keyed(values, (value) => value);
  const packages = (values: CapabilityCompositionLockV1["packages"]) =>
    keyed(values, (value) => value.lock.key);
  try {
    assertValidApplicationGraph(graph);
    const checksum = hashApplicationGraph(graph);
    if (compositionLock.applicationGraphChecksum !== checksum) return false;
    const selections = packages(compositionLock.packages);
    if (selections.length !== 6) return false;
    if (
      graph.integration.compositionSelections !== undefined &&
      canonical(packages(graph.integration.compositionSelections)) !==
        canonical(selections)
    )
      return false;
    const rebuilt = createCapabilityCompositionLock({
      graphChecksum: checksum,
      selections,
    });
    if (
      canonical({ ...compositionLock, packages: selections }) !==
      canonical(rebuilt)
    )
      return false;

    const bindingOwner = (
      packageKey: string,
      bindingKey: string,
      prefix: string,
    ): string => {
      const binding = selections.find((value) => value.lock.key === packageKey)
        ?.bindings[bindingKey];
      if (
        !binding ||
        typeof binding !== "object" ||
        Array.isArray(binding) ||
        !("graphSymbol" in binding) ||
        typeof binding.graphSymbol !== "string" ||
        !binding.graphSymbol.startsWith(prefix)
      )
        throw new Error("Invalid historical owner.");
      return binding.graphSymbol.slice(prefix.length);
    };
    const principal = bindingOwner(
      "core.identity-policy",
      "principalEntity",
      "graph.domain.",
    );
    const session = bindingOwner(
      "core.identity-policy",
      "sessionEntity",
      "graph.domain.",
    );
    const owners = ["service", "appointment", "schedule", principal, session];
    if (
      new Set(owners).size !== 5 ||
      graph.domain.entities.length !== 5 ||
      owners.some(
        (key) =>
          graph.domain.entities.filter((entity) => entity.key === key)
            .length !== 1,
      )
    )
      return false;
    const flowId = bindingOwner("core.workflow", "flowKey", "graph.flow.");
    if (graph.flow.flows.length !== 1 || graph.flow.flows[0]?.id !== flowId)
      return false;
    const routeId = bindingOwner("core.crud", "routeKey", "graph.page.");
    const routes = graph.page.pages.filter((value) => value.id === routeId);
    if (
      routes.length !== 1 ||
      !routes[0]!.blocks.some((block) => block.entity === "service")
    )
      return false;
    const entityKey = (key: string) =>
      key === principal ? "$principal" : key === session ? "$session" : key;
    const normalizedEntities = graph.domain.entities.map(
      ({ label: _label, ...entity }) => ({
        ...entity,
        key: entityKey(entity.key),
      }),
    );
    if (
      normalizedEntities.some((entity) =>
        entity.fields.some(
          (field) => "numericDomain" in field || "calculation" in field,
        ),
      )
    )
      return false;
    const normalizedSelections = selections.map((selection) => {
      const bindings = { ...selection.bindings };
      const replaceSymbol = (key: string, graphSymbol: string) => {
        const binding = bindings[key];
        if (!binding || typeof binding !== "object" || Array.isArray(binding))
          throw new Error("Invalid historical binding.");
        bindings[key] = { ...binding, graphSymbol };
      };
      if (selection.lock.key === "core.identity-policy") {
        replaceSymbol("principalEntity", "graph.domain.$principal");
        replaceSymbol("sessionEntity", "graph.domain.$session");
      }
      if (selection.lock.key === "core.workflow")
        replaceSymbol("flowKey", "graph.flow.$flow");
      if (selection.lock.key === "core.crud")
        replaceSymbol("routeKey", "graph.page.$route");
      return { ...selection, bindings };
    });
    const normalizeStructure = (value: {
      entities: readonly {
        key: string;
        fields: readonly { key: string }[];
        indexes: readonly unknown[];
      }[];
      relations: readonly {
        from: string;
        to: string;
        kind: string;
        field?: string;
      }[];
      policy: {
        roles: readonly string[];
        permissions: readonly {
          role: string;
          resource: string;
          actions: readonly string[];
        }[];
      };
      flow: {
        flows: readonly {
          id: string;
          states: readonly string[];
          events: readonly string[];
          transitions: readonly {
            from: string;
            event: string;
            roles?: readonly string[];
          }[];
        }[];
      };
      packages: readonly { lock: { key: string } }[];
    }) => ({
      ...value,
      entities: keyed(
        value.entities.map((entity) => ({
          ...entity,
          fields: keyed(entity.fields, (field) => field.key),
          indexes: keyed(entity.indexes, canonical),
        })),
        (entity) => entity.key,
      ),
      relations: keyed(value.relations, (relation) =>
        canonical([relation.from, relation.to, relation.kind, relation.field]),
      ),
      policy: {
        ...value.policy,
        roles: strings(value.policy.roles),
        permissions: keyed(
          value.policy.permissions.map((permission) => ({
            ...permission,
            actions: strings(permission.actions),
          })),
          (permission) => canonical([permission.role, permission.resource]),
        ),
      },
      flow: {
        ...value.flow,
        flows: keyed(
          value.flow.flows.map((flow) => ({
            ...flow,
            states: strings(flow.states),
            events: strings(flow.events),
            transitions: keyed(
              flow.transitions.map((transition) => ({
                ...transition,
                ...(transition.roles === undefined
                  ? {}
                  : { roles: strings(transition.roles) }),
              })),
              (transition) => canonical([transition.from, transition.event]),
            ),
          })),
          (flow) => flow.id,
        ),
      },
      packages: keyed(value.packages, (selection) => selection.lock.key),
    });
    const actual = {
      entities: normalizedEntities,
      relations: graph.domain.relations.map((relation) => ({
        ...relation,
        from: entityKey(relation.from),
        to: entityKey(relation.to),
      })),
      policy: {
        ...graph.policy,
        permissions: graph.policy.permissions.map((permission) => ({
          ...permission,
          resource: entityKey(permission.resource),
        })),
      },
      flow: {
        ...graph.flow,
        flows: graph.flow.flows.map((flow) => ({
          ...flow,
          id: "$flow",
          entity: entityKey(flow.entity),
        })),
      },
      packages: normalizedSelections,
    };
    const appointment = normalizedEntities.find(
      (entity) => entity.key === "appointment",
    )!;
    const expected = {
      ...historicalBooking,
      entities: historicalBooking.entities.map((entity) =>
        entity.key !== "appointment"
          ? entity
          : {
              ...entity,
              fields: [
                ...entity.fields.filter(
                  (field) =>
                    field.key !== "notes" ||
                    appointment.fields.some((value) => value.key === "notes"),
                ),
                ...(appointment.fields.some(
                  (field) => field.key === "secondaryServiceKey",
                )
                  ? [
                      {
                        key: "secondaryServiceKey",
                        type: "string",
                        required: true,
                      },
                    ]
                  : []),
              ],
            },
      ),
      relations: [
        ...historicalBooking.relations,
        ...(appointment.fields.some(
          (field) => field.key === "secondaryServiceKey",
        )
          ? [
              {
                from: "appointment",
                to: "service",
                kind: "many-to-one",
                field: "secondaryServiceKey",
              },
            ]
          : []),
      ],
    };
    return (
      canonical(normalizeStructure(actual)) ===
      canonical(normalizeStructure(expected))
    );
  } catch {
    // Parsing, semantic validation and complete lock reconstruction all fail closed.
    return false;
  }
}

export function exactAppointmentNumericWitness(
  graph: ApplicationGraphV1,
  compositionLock: CapabilityCompositionLockV1,
  profile: AppointmentRuntimeProfile | undefined,
): boolean {
  const consumer = selectAppointmentConsumerProfile(graph, compositionLock);
  if (consumer) {
    if (JSON.stringify(profile) !== JSON.stringify(consumer.runtime))
      throw new Error("Appointment compiler profile is unsupported.");
    return true;
  }
  const appointmentSelection = compositionLock.packages.find(
    ({ lock }) => lock.key === "scheduling.appointment",
  );
  if (profile === undefined) {
    const hasAppointmentEntities = ["service", "schedule", "appointment"].every(
      (key) => graph.domain.entities.some((entity) => entity.key === key),
    );
    if (
      appointmentSelection !== undefined ||
      graph.integration.compositionSelections?.some(
        ({ lock }) => lock.key === "scheduling.appointment",
      ) ||
      (hasAppointmentEntities &&
        !isHistoricalGenericBookingWitness(graph, compositionLock))
    )
      throw new Error("Appointment compiler profile is unsupported.");
    return false;
  }
  const fail = (): never => {
    throw new Error("Appointment compiler profile is unsupported.");
  };
  if (
    compositionLock.applicationGraphChecksum !== hashApplicationGraph(graph) ||
    compositionLock.packages.length !== exactAppointmentLocks.length ||
    appointmentSelection === undefined ||
    profile.capability !== "scheduling.appointment@1.0.1" ||
    profile.effect !== "appointment.booking"
  )
    return fail();
  const locks = new Map(
    compositionLock.packages.map(({ lock }) => [lock.key, lock]),
  );
  if (locks.size !== exactAppointmentLocks.length) return fail();
  for (const [key, version, manifestDigest] of exactAppointmentLocks) {
    const lock = locks.get(key);
    if (
      lock?.version !== version ||
      lock.manifestDigest !== manifestDigest ||
      lock.lifecycle !== "golden"
    )
      return fail();
  }
  const bindingKeys = Object.keys(appointmentSelection.bindings).sort();
  if (
    bindingKeys.length !== appointmentBindingKeys.length ||
    bindingKeys.some(
      (key, index) => key !== [...appointmentBindingKeys].sort()[index],
    )
  )
    return fail();
  const fieldFor = (owner: string, inputKey: string) => {
    const binding = appointmentSelection.bindings[inputKey];
    if (
      !binding ||
      typeof binding !== "object" ||
      Array.isArray(binding) ||
      (binding as { graphSymbol?: unknown }).graphSymbol !==
        `graph.domain.${owner}` ||
      typeof (binding as { fieldKey?: unknown }).fieldKey !== "string"
    )
      return fail();
    const fieldKey = (binding as { fieldKey: string }).fieldKey;
    const entity = graph.domain.entities.filter(({ key }) => key === owner);
    if (entity.length !== 1) return fail();
    const fields = entity[0]!.fields.filter(({ key }) => key === fieldKey);
    if (fields.length !== 1) return fail();
    return fields[0]!;
  };
  const duration = fieldFor(
    profile.serviceEntity,
    "serviceDurationMinutesField",
  );
  const capacity = fieldFor(profile.scheduleEntity, "scheduleCapacityField");
  const exactDomain = (value: unknown): boolean =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === "apiVersion,minimum" &&
    (value as { apiVersion?: unknown }).apiVersion ===
      "factory.numeric-field-domain/v1" &&
    !!(value as { minimum?: unknown }).minimum &&
    typeof (value as { minimum: unknown }).minimum === "object" &&
    Object.keys((value as { minimum: object }).minimum)
      .sort()
      .join(",") === "inclusive,value" &&
    (value as { minimum: { value?: unknown } }).minimum.value === 0 &&
    (value as { minimum: { inclusive?: unknown } }).minimum.inclusive === false;
  if (
    [duration, capacity].some(
      (field) =>
        field.type !== "integer" ||
        field.required !== true ||
        field.calculation !== undefined ||
        !exactDomain(field.numericDomain),
    )
  )
    return fail();
  const allFields = graph.domain.entities.flatMap(({ fields }) => fields);
  if (allFields.some((field) => field.calculation !== undefined)) return fail();
  const numeric = allFields.filter(
    (field) => field.numericDomain !== undefined,
  );
  if (
    numeric.length !== 2 ||
    !numeric.includes(duration) ||
    !numeric.includes(capacity)
  )
    return fail();
  const same = (actual: unknown, expected: readonly string[]) =>
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
  const exactField = (
    inputKey: string,
    owner: string,
    type: string,
    required: boolean,
    values?: readonly string[],
  ) => {
    const field = fieldFor(owner, inputKey);
    return (
      field.type === type &&
      field.required === required &&
      field.calculation === undefined &&
      (values === undefined
        ? field.values === undefined
        : same(field.values, values))
    );
  };
  const service = graph.domain.entities.find(
    ({ key }) => key === profile.serviceEntity,
  );
  const schedule = graph.domain.entities.find(
    ({ key }) => key === profile.scheduleEntity,
  );
  const appointment = graph.domain.entities.find(
    ({ key }) => key === profile.appointmentEntity,
  );
  if (
    service?.fields.length !== 3 ||
    schedule?.fields.length !== 6 ||
    appointment?.fields.length !== 5 ||
    !exactField("serviceNameField", profile.serviceEntity, "string", true) ||
    !exactField(
      "serviceDurationMinutesField",
      profile.serviceEntity,
      "integer",
      true,
    ) ||
    !exactField("serviceActiveField", profile.serviceEntity, "boolean", true) ||
    !exactField(
      "scheduleServiceReferenceField",
      profile.scheduleEntity,
      "string",
      true,
    ) ||
    !exactField(
      "scheduleStartField",
      profile.scheduleEntity,
      "datetime",
      true,
    ) ||
    !exactField("scheduleEndField", profile.scheduleEntity, "datetime", true) ||
    !exactField(
      "scheduleTimezoneField",
      profile.scheduleEntity,
      "string",
      true,
    ) ||
    !exactField(
      "scheduleCapacityField",
      profile.scheduleEntity,
      "integer",
      true,
    ) ||
    !exactField("scheduleStatusField", profile.scheduleEntity, "enum", true, [
      "open",
      "closed",
    ]) ||
    !exactField(
      "appointmentScheduleReferenceField",
      profile.appointmentEntity,
      "string",
      true,
    ) ||
    !exactField(
      "appointmentCustomerNameField",
      profile.appointmentEntity,
      "string",
      true,
    ) ||
    !exactField(
      "appointmentNotesField",
      profile.appointmentEntity,
      "text",
      false,
    ) ||
    !exactField(
      "appointmentCancellationReasonField",
      profile.appointmentEntity,
      "text",
      false,
    ) ||
    !exactField(
      "appointmentStatusField",
      profile.appointmentEntity,
      "enum",
      true,
      ["requested", "confirmed", "cancelled"],
    ) ||
    fieldFor(profile.scheduleEntity, "scheduleStartField").key !== "startUtc" ||
    fieldFor(profile.scheduleEntity, "scheduleEndField").key !== "endUtc" ||
    fieldFor(profile.appointmentEntity, "appointmentNotesField").key !==
      "notes" ||
    fieldFor(profile.appointmentEntity, "appointmentCancellationReasonField")
      .key !== "cancellationReason"
  )
    return fail();
  const relations = graph.domain.relations.filter(
    ({ from, to }) =>
      [
        profile.serviceEntity,
        profile.scheduleEntity,
        profile.appointmentEntity,
      ].includes(from) ||
      [
        profile.serviceEntity,
        profile.scheduleEntity,
        profile.appointmentEntity,
      ].includes(to),
  );
  if (
    relations.length !== 2 ||
    !relations.some(
      (relation) =>
        relation.from === profile.scheduleEntity &&
        relation.to === profile.serviceEntity &&
        relation.kind === "many-to-one" &&
        relation.field ===
          fieldFor(profile.scheduleEntity, "scheduleServiceReferenceField").key,
    ) ||
    !relations.some(
      (relation) =>
        relation.from === profile.appointmentEntity &&
        relation.to === profile.scheduleEntity &&
        relation.kind === "many-to-one" &&
        relation.field ===
          fieldFor(
            profile.appointmentEntity,
            "appointmentScheduleReferenceField",
          ).key,
    )
  )
    return fail();
  const permission = graph.policy.permissions
    .filter(({ resource }) =>
      [
        profile.serviceEntity,
        profile.scheduleEntity,
        profile.appointmentEntity,
      ].includes(resource),
    )
    .map(
      ({ role, resource, actions }) =>
        `${role}:${resource}:${actions.join(",")}`,
    );
  if (
    !same(graph.policy.roles, ["customer", "staff", "administrator"]) ||
    !same(permission, [
      `customer:${profile.appointmentEntity}:create,read,cancel`,
      `staff:${profile.appointmentEntity}:read,confirm,reschedule,cancel`,
      `administrator:${profile.serviceEntity}:create,read,update,manage`,
      `administrator:${profile.scheduleEntity}:create,read,update,manage`,
      `administrator:${profile.appointmentEntity}:read,cancel`,
    ])
  )
    return fail();
  const flow = graph.flow.flows.find(
    ({ entity }) => entity === profile.appointmentEntity,
  );
  if (
    graph.flow.flows.length !== 1 ||
    !flow ||
    flow.initialState !== "requested" ||
    !same(flow.states, ["requested", "confirmed", "cancelled"]) ||
    !same(flow.events, ["confirm", "cancel", "reschedule"]) ||
    flow.transitions.length !== 3 ||
    !same(
      flow.transitions.map(
        ({ from, event, to, roles }) =>
          `${from}:${event}:${to}:${(roles ?? []).join(",")}`,
      ),
      [
        "requested:confirm:confirmed:staff",
        "requested:cancel:cancelled:customer",
        "confirmed:reschedule:requested:staff",
      ],
    )
  )
    return fail();
  return true;
}
/**
 * Private test seam for the actual local page-runtime function. This module
 * is intentionally not re-exported from the compiler package root.
 */
type AppointmentPageRuntimeRenderer = (
  graph: ApplicationGraphV1,
  orderEntityKey: string | undefined,
  useFixtureSessions: boolean,
  profile: "legacy" | "approval-v1" | "task-v1",
  correctionEntity?: string,
  appointmentProfile?: AppointmentRuntimeProfile,
  compositionLock?: CapabilityCompositionLockV1,
) => string;

let appointmentPageRuntimeRenderer: AppointmentPageRuntimeRenderer | undefined;

export function registerAppointmentPageRuntimeForTest(
  renderer: AppointmentPageRuntimeRenderer,
): void {
  if (appointmentPageRuntimeRenderer !== undefined)
    throw new Error("Appointment page-runtime facade is already registered.");
  appointmentPageRuntimeRenderer = renderer;
}

export function renderAppointmentPageRuntimeForTest(
  graph: ApplicationGraphV1,
  orderEntityKey: string | undefined,
  useFixtureSessions: boolean,
  profile: "legacy" | "approval-v1" | "task-v1",
  correctionEntity: string | undefined,
  appointmentProfile: AppointmentRuntimeProfile | undefined,
  compositionLock: CapabilityCompositionLockV1,
): string {
  if (appointmentPageRuntimeRenderer === undefined)
    throw new Error("Appointment page-runtime facade is unavailable.");
  return appointmentPageRuntimeRenderer(
    graph,
    orderEntityKey,
    useFixtureSessions,
    profile,
    correctionEntity,
    appointmentProfile,
    compositionLock,
  );
}
