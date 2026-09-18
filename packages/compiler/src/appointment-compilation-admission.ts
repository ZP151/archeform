import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";
import {
  selectAppointmentRuntimeProfile,
  type AppointmentRuntimeProfile,
} from "./appointment-mutation-contract.js";
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

export function exactAppointmentNumericWitness(
  graph: ApplicationGraphV1,
  compositionLock: CapabilityCompositionLockV1,
  profile: AppointmentRuntimeProfile | undefined,
): boolean {
  const appointmentSelection = compositionLock.packages.find(
    ({ lock }) => lock.key === "scheduling.appointment",
  );
  if (profile === undefined) {
    const hasAppointmentEntities = ["service", "schedule", "appointment"].every(
      (key) => graph.domain.entities.some((entity) => entity.key === key),
    );
    if (appointmentSelection !== undefined || hasAppointmentEntities)
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
