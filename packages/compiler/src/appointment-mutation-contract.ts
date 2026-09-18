import { isDeepStrictEqual } from "node:util";
import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";

export const appointmentMutationContract = {
  key: "appointment-mutation",
  version: "1.0.0",
  mutation: "factory.generated.appointment-command/v1",
  receipt: "factory.generated.appointment-receipt/v1",
  history: "factory.generated.appointment-history-entry/v1",
  ownership: "factory-authored",
  license: "UNLICENSED",
} as const;

export interface AppointmentRuntimeProfile {
  readonly capability: "scheduling.appointment@1.0.0";
  readonly effect: "appointment.booking";
  readonly serviceEntity: string;
  readonly scheduleEntity: string;
  readonly appointmentEntity: string;
  readonly fields: Readonly<{
    serviceActive: string;
    scheduleService: string;
    scheduleStart: string;
    scheduleEnd: string;
    scheduleTimezone: string;
    scheduleCapacity: string;
    scheduleStatus: string;
    appointmentSchedule: string;
    appointmentCustomer: string;
    appointmentNotes: string;
    appointmentCancellationReason: string;
    appointmentStatus: string;
  }>;
}

export type AppointmentRecord = Readonly<{
  id: string;
  status: "requested" | "confirmed" | "cancelled";
  version: number;
  scheduleId: string;
  customerName: string;
  notes: string | null;
  cancellationReason: string | null;
}>;

export interface AppointmentCommandStore {
  list(entity: string): Promise<readonly Record<string, unknown>[]>;
  find(entity: string, id: string): Promise<Record<string, unknown> | undefined>;
  create(entity: string, values: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(entity: string, id: string, values: Record<string, unknown>): Promise<Record<string, unknown>>;
  conditionalUpdate(entity: string, id: string, expectedVersion: number, values: Record<string, unknown>): Promise<Record<string, unknown> | undefined>;
  getAppointmentReceipt(scope: string, key: string): Promise<Record<string, unknown> | undefined>;
  saveAppointmentReceipt(receipt: Record<string, unknown>): Promise<void>;
  appendAppointmentHistory(entry: Record<string, unknown>): Promise<void>;
  appendCapabilityEvent(event: Record<string, unknown>): Promise<void>;
  inTransaction<T>(operation: (store: AppointmentCommandStore) => Promise<T>): Promise<T>;
}

type Context = Readonly<{
  factoryServer: true;
  role: string;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  now: string;
}>;

export class AppointmentMutationError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409,
    readonly code: string,
  ) {
    super("Appointment request rejected.");
  }
}

const bindingNames = [
  "serviceEntity",
  "scheduleEntity",
  "appointmentEntity",
  "serviceActiveField",
  "scheduleServiceReferenceField",
  "scheduleStartField",
  "scheduleEndField",
  "scheduleTimezoneField",
  "scheduleCapacityField",
  "scheduleStatusField",
  "appointmentScheduleReferenceField",
  "appointmentCustomerNameField",
  "appointmentNotesField",
  "appointmentCancellationReasonField",
  "appointmentStatusField",
] as const;

function fail(status: AppointmentMutationError["status"], code: string): never {
  throw new AppointmentMutationError(status, code);
}

function plain(value: unknown, code = "appointment.invalid_request"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, code);
  const object = value as Record<string, unknown>;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(object))) fail(400, code);
  return object;
}

function nonEmpty(value: unknown, code = "appointment.invalid_request"): string {
  if (typeof value !== "string" || value.trim().length === 0) fail(400, code);
  return value.trim();
}

function context(value: unknown): Context {
  const candidate = plain(value, "appointment.unauthorized");
  const keys = ["factoryServer", "role", "scope", "idempotencyKey", "requestHash", "now"];
  if (Object.keys(candidate).length !== keys.length || keys.some((key) => !Object.hasOwn(candidate, key)) || candidate.factoryServer !== true)
    fail(403, "appointment.unauthorized");
  for (const key of keys.slice(1)) nonEmpty(candidate[key], "appointment.unauthorized");
  return candidate as Context;
}

function exactInput(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const candidate = plain(value);
  if (Object.keys(candidate).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(candidate, key)))
    fail(400, "appointment.invalid_request");
  return candidate;
}

function version(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(409, "appointment.version_conflict");
  return value as number;
}

function canonicalUtc(value: unknown): string {
  const source = nonEmpty(value, "appointment.schedule_invalid");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.test(source))
    fail(400, "appointment.schedule_invalid");
  const date = new Date(source);
  if (!Number.isFinite(date.valueOf())) fail(400, "appointment.schedule_invalid");
  return date.toISOString();
}

function timezone(value: unknown): void {
  const source = nonEmpty(value, "appointment.schedule_invalid");
  if (source.length > 64 || /[\u0000-\u001f\u007f]/.test(source)) fail(400, "appointment.schedule_invalid");
  try {
    new Intl.DateTimeFormat("en", { timeZone: source });
  } catch {
    fail(400, "appointment.schedule_invalid");
  }
}

function active(value: unknown): boolean {
  return value === "requested" || value === "confirmed";
}

function slot(profile: AppointmentRuntimeProfile, schedule: Record<string, unknown>) {
  return {
    scheduleId: nonEmpty(schedule.id, "appointment.schedule_invalid"),
    serviceId: nonEmpty(schedule[profile.fields.scheduleService], "appointment.schedule_invalid"),
    startUtc: canonicalUtc(schedule[profile.fields.scheduleStart]),
    endUtc: canonicalUtc(schedule[profile.fields.scheduleEnd]),
    timezone: nonEmpty(schedule[profile.fields.scheduleTimezone], "appointment.schedule_invalid"),
  };
}

function record(profile: AppointmentRuntimeProfile, value: Record<string, unknown>): AppointmentRecord {
  const id = nonEmpty(value.id, "appointment.version_conflict");
  const status = value[profile.fields.appointmentStatus];
  if (status !== "requested" && status !== "confirmed" && status !== "cancelled") fail(409, "appointment.state_conflict");
  return {
    id,
    status,
    version: version(value.version),
    scheduleId: nonEmpty(value[profile.fields.appointmentSchedule], "appointment.version_conflict"),
    customerName: nonEmpty(value[profile.fields.appointmentCustomer], "appointment.version_conflict"),
    notes: value[profile.fields.appointmentNotes] === null || value[profile.fields.appointmentNotes] === undefined ? null : nonEmpty(value[profile.fields.appointmentNotes]),
    cancellationReason: value[profile.fields.appointmentCancellationReason] === null || value[profile.fields.appointmentCancellationReason] === undefined ? null : nonEmpty(value[profile.fields.appointmentCancellationReason]),
  };
}

function role(context: Context, allowed: readonly string[]) {
  if (!allowed.includes(context.role)) fail(403, "appointment.forbidden");
}

function bindingEntity(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("graphSymbol" in value)) return undefined;
  const symbol = (value as { graphSymbol?: unknown }).graphSymbol;
  const match = typeof symbol === "string" ? /^graph\.domain\.([a-z][a-z0-9-]*)$/.exec(symbol) : undefined;
  return match?.[1];
}

function bindingField(value: unknown, owner: string): string | undefined {
  if (!value || typeof value !== "object" || !("graphSymbol" in value) || !("fieldKey" in value)) return undefined;
  const field = value as { graphSymbol?: unknown; fieldKey?: unknown };
  return field.graphSymbol === `graph.domain.${owner}` && typeof field.fieldKey === "string" ? field.fieldKey : undefined;
}

/** Resolves only an immutable capability lock; labels and product keys never select this contract. */
export function selectAppointmentRuntimeProfile(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): AppointmentRuntimeProfile | undefined {
  if (!compositionLock) return undefined;
  const selection = compositionLock.packages.find(
    ({ lock }) => lock.key === "scheduling.appointment" && lock.version === "1.0.0",
  );
  if (!selection) return undefined;
  if (compositionLock.applicationGraphChecksum !== hashApplicationGraph(graph))
    throw new Error("Appointment composition lock does not match the Published Graph.");
  if (graph.integration.compositionSelections && !isDeepStrictEqual(
    [...graph.integration.compositionSelections].sort((left, right) => left.lock.key.localeCompare(right.lock.key)),
    [...compositionLock.packages].sort((left, right) => left.lock.key.localeCompare(right.lock.key)),
  )) throw new Error("Appointment composition lock does not match the Published Graph.");
  if (bindingNames.some((key) => !Object.hasOwn(selection.bindings, key)))
    throw new Error("Appointment capability bindings are incomplete.");
  const serviceEntity = bindingEntity(selection.bindings.serviceEntity);
  const scheduleEntity = bindingEntity(selection.bindings.scheduleEntity);
  const appointmentEntity = bindingEntity(selection.bindings.appointmentEntity);
  if (!serviceEntity || !scheduleEntity || !appointmentEntity || new Set([serviceEntity, scheduleEntity, appointmentEntity]).size !== 3)
    throw new Error("Appointment capability bindings are invalid.");
  const field = (key: Exclude<(typeof bindingNames)[number], "serviceEntity" | "scheduleEntity" | "appointmentEntity">, owner: string) => {
    const result = bindingField(selection.bindings[key], owner);
    if (!result) throw new Error("Appointment capability bindings are invalid.");
    return result;
  };
  const fields = {
    serviceActive: field("serviceActiveField", serviceEntity),
    scheduleService: field("scheduleServiceReferenceField", scheduleEntity),
    scheduleStart: field("scheduleStartField", scheduleEntity),
    scheduleEnd: field("scheduleEndField", scheduleEntity),
    scheduleTimezone: field("scheduleTimezoneField", scheduleEntity),
    scheduleCapacity: field("scheduleCapacityField", scheduleEntity),
    scheduleStatus: field("scheduleStatusField", scheduleEntity),
    appointmentSchedule: field("appointmentScheduleReferenceField", appointmentEntity),
    appointmentCustomer: field("appointmentCustomerNameField", appointmentEntity),
    appointmentNotes: field("appointmentNotesField", appointmentEntity),
    appointmentCancellationReason: field("appointmentCancellationReasonField", appointmentEntity),
    appointmentStatus: field("appointmentStatusField", appointmentEntity),
  };
  const entityFields = new Map(graph.domain.entities.map((entity) => [entity.key, new Set(entity.fields.map((item) => item.key))]));
  if (![serviceEntity, scheduleEntity, appointmentEntity].every((entity) => entityFields.has(entity)) || Object.entries(fields).some(([name, key]) => !entityFields.get(name.startsWith("service") ? serviceEntity : name.startsWith("schedule") ? scheduleEntity : appointmentEntity)?.has(key)))
    throw new Error("Appointment capability bindings are invalid.");
  return { capability: "scheduling.appointment@1.0.0", effect: "appointment.booking", serviceEntity, scheduleEntity, appointmentEntity, fields };
}

export function createAppointmentCommandRuntime(profile: AppointmentRuntimeProfile) {
  async function scheduleForClaim(store: AppointmentCommandStore, scheduleId: string, excluded?: string) {
    const schedule = await store.find(profile.scheduleEntity, nonEmpty(scheduleId));
    if (!schedule) fail(404, "appointment.schedule_not_found");
    if (schedule[profile.fields.scheduleStatus] !== "open") fail(409, "appointment.schedule_closed");
    const start = canonicalUtc(schedule[profile.fields.scheduleStart]);
    const end = canonicalUtc(schedule[profile.fields.scheduleEnd]);
    if (Date.parse(end) <= Date.parse(start)) fail(400, "appointment.schedule_invalid");
    timezone(schedule[profile.fields.scheduleTimezone]);
    const capacity = schedule[profile.fields.scheduleCapacity];
    if (!Number.isSafeInteger(capacity) || (capacity as number) < 1) fail(400, "appointment.schedule_invalid");
    const declaredCapacity = capacity as number;
    const service = await store.find(profile.serviceEntity, nonEmpty(schedule[profile.fields.scheduleService], "appointment.schedule_invalid"));
    if (!service || service[profile.fields.serviceActive] !== true) fail(409, "appointment.schedule_invalid");
    const occupancy = (await store.list(profile.appointmentEntity)).filter((item) => item.id !== excluded && item[profile.fields.appointmentSchedule] === schedule.id && active(item[profile.fields.appointmentStatus])).length;
    if (occupancy >= declaredCapacity) fail(409, "appointment.capacity_conflict");
    return schedule;
  }

  async function commit(
    store: AppointmentCommandStore,
    input: Context,
    operation: "request" | "confirm" | "reschedule" | "cancel",
    mutate: (transaction: AppointmentCommandStore) => Promise<{ record: AppointmentRecord; history: Record<string, unknown>; capabilityOperation: "claim" | "confirm" | "move" | "release" }>,
  ): Promise<AppointmentRecord> {
    const prior = await store.getAppointmentReceipt(input.scope, input.idempotencyKey);
    if (prior) {
      if (prior.requestHash !== input.requestHash) fail(409, "appointment.idempotency_conflict");
      return record(profile, plain(prior.response, "appointment.idempotency_conflict"));
    }
    return store.inTransaction(async (transaction) => {
      const replay = await transaction.getAppointmentReceipt(input.scope, input.idempotencyKey);
      if (replay) {
        if (replay.requestHash !== input.requestHash) fail(409, "appointment.idempotency_conflict");
        return record(profile, plain(replay.response, "appointment.idempotency_conflict"));
      }
      const result = await mutate(transaction);
      await transaction.appendAppointmentHistory({ apiVersion: appointmentMutationContract.history, ...result.history, appointmentId: result.record.id, at: input.now, actorRole: input.role });
      await transaction.appendCapabilityEvent({ actor: input.role, capability: profile.effect, operation: result.capabilityOperation, entity: profile.appointmentEntity, recordId: result.record.id, outcome: "completed", at: input.now });
      await transaction.saveAppointmentReceipt({ scope: input.scope, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, operation, response: result.record });
      return result.record;
    });
  }

  return {
    async request(store: AppointmentCommandStore, contextInput: unknown, body: unknown): Promise<AppointmentRecord> {
      const actor = context(contextInput); role(actor, ["customer"]);
      const input = plain(body);
      if (Object.keys(input).some((key) => !["scheduleId", "customerName", "notes"].includes(key)) || !Object.hasOwn(input, "scheduleId") || !Object.hasOwn(input, "customerName"))
        fail(400, "appointment.invalid_request");
      if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 2000)) fail(400, "appointment.invalid_request");
      return commit(store, actor, "request", async (transaction) => {
        const selected = await scheduleForClaim(transaction, nonEmpty(input.scheduleId));
        const created = await transaction.create(profile.appointmentEntity, {
          [profile.fields.appointmentSchedule]: nonEmpty(input.scheduleId),
          [profile.fields.appointmentCustomer]: nonEmpty(input.customerName),
          [profile.fields.appointmentNotes]: input.notes ?? null,
          [profile.fields.appointmentCancellationReason]: null,
          [profile.fields.appointmentStatus]: "requested",
          version: 0,
        });
        const result = record(profile, created);
        return { record: result, history: { action: "claim", fromStatus: null, toStatus: "requested", fromSlot: null, toSlot: slot(profile, selected), cancellationReason: null }, capabilityOperation: "claim" };
      });
    },
    async confirm(store: AppointmentCommandStore, contextInput: unknown, body: unknown): Promise<AppointmentRecord> {
      const actor = context(contextInput); role(actor, ["staff"]);
      const input = exactInput(body, ["appointmentId", "expectedVersion"]);
      return commit(store, actor, "confirm", async (transaction) => {
        const current = await transaction.find(profile.appointmentEntity, nonEmpty(input.appointmentId));
        if (!current) fail(404, "appointment.not_found");
        const prior = record(profile, current);
        if (prior.version !== version(input.expectedVersion)) fail(409, "appointment.version_conflict");
        if (prior.status !== "requested") fail(409, "appointment.state_conflict");
        const selected = await transaction.find(profile.scheduleEntity, prior.scheduleId);
        if (!selected) fail(409, "appointment.schedule_invalid");
        const unchangedSlot = slot(profile, selected);
        const changed = await transaction.conditionalUpdate(profile.appointmentEntity, prior.id, prior.version, { [profile.fields.appointmentStatus]: "confirmed", version: prior.version + 1 });
        if (!changed) fail(409, "appointment.version_conflict");
        const updated = record(profile, changed);
        return { record: updated, history: { action: "confirm", fromStatus: "requested", toStatus: "confirmed", fromSlot: unchangedSlot, toSlot: unchangedSlot, cancellationReason: null }, capabilityOperation: "confirm" };
      });
    },
    async reschedule(store: AppointmentCommandStore, contextInput: unknown, body: unknown): Promise<AppointmentRecord> {
      const actor = context(contextInput); role(actor, ["staff"]);
      const input = exactInput(body, ["appointmentId", "expectedVersion", "scheduleId"]);
      return commit(store, actor, "reschedule", async (transaction) => {
        const current = await transaction.find(profile.appointmentEntity, nonEmpty(input.appointmentId));
        if (!current) fail(404, "appointment.not_found");
        const prior = record(profile, current);
        if (prior.version !== version(input.expectedVersion)) fail(409, "appointment.version_conflict");
        if (prior.status !== "confirmed") fail(409, "appointment.state_conflict");
        const nextSchedule = nonEmpty(input.scheduleId);
        if (nextSchedule === prior.scheduleId) fail(400, "appointment.schedule_invalid");
        const previous = await transaction.find(profile.scheduleEntity, prior.scheduleId);
        if (!previous) fail(409, "appointment.schedule_invalid");
        const target = await scheduleForClaim(transaction, nextSchedule, prior.id);
        const changed = await transaction.conditionalUpdate(profile.appointmentEntity, prior.id, prior.version, { [profile.fields.appointmentSchedule]: nextSchedule, [profile.fields.appointmentStatus]: "requested", version: prior.version + 1 });
        if (!changed) fail(409, "appointment.version_conflict");
        const updated = record(profile, changed);
        return { record: updated, history: { action: "move", fromStatus: "confirmed", toStatus: "requested", fromSlot: slot(profile, previous), toSlot: slot(profile, target), cancellationReason: null }, capabilityOperation: "move" };
      });
    },
    async cancel(store: AppointmentCommandStore, contextInput: unknown, body: unknown): Promise<AppointmentRecord> {
      const actor = context(contextInput); role(actor, ["customer", "staff", "administrator"]);
      const input = exactInput(body, ["appointmentId", "expectedVersion", "cancellationReason"]);
      return commit(store, actor, "cancel", async (transaction) => {
        const current = await transaction.find(profile.appointmentEntity, nonEmpty(input.appointmentId));
        if (!current) fail(404, "appointment.not_found");
        const prior = record(profile, current);
        if (prior.version !== version(input.expectedVersion)) fail(409, "appointment.version_conflict");
        if (!active(prior.status)) fail(409, "appointment.state_conflict");
        const reason = nonEmpty(input.cancellationReason);
        const previous = await transaction.find(profile.scheduleEntity, prior.scheduleId);
        if (!previous) fail(409, "appointment.schedule_invalid");
        const changed = await transaction.conditionalUpdate(profile.appointmentEntity, prior.id, prior.version, { [profile.fields.appointmentStatus]: "cancelled", [profile.fields.appointmentCancellationReason]: reason, version: prior.version + 1 });
        if (!changed) fail(409, "appointment.version_conflict");
        const updated = record(profile, changed);
        return { record: updated, history: { action: "cancel", fromStatus: prior.status, toStatus: "cancelled", fromSlot: slot(profile, previous), toSlot: null, cancellationReason: reason }, capabilityOperation: "release" };
      });
    },
    async history(store: AppointmentCommandStore & { listAppointmentHistory?: (appointmentId: string) => Promise<readonly Record<string, unknown>[]> }, contextInput: unknown, appointmentId: string): Promise<readonly Record<string, unknown>[]> {
      const actor = context(contextInput); role(actor, ["customer", "staff", "administrator"]);
      if (!store.listAppointmentHistory) fail(404, "appointment.history_unavailable");
      const id = nonEmpty(appointmentId);
      if (!await store.find(profile.appointmentEntity, id)) fail(404, "appointment.not_found");
      return (await store.listAppointmentHistory(id)).slice(0, 100);
    },
  };
}
