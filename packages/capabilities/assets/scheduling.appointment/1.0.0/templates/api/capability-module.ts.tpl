import type { CapabilityRuntimeModule } from "./contract.js";
import type { RecordStore, StoredRecord } from "../application-runtime.js";

type AppointmentStatus = "requested" | "confirmed" | "cancelled";
type ScheduleStatus = "open" | "closed";

interface AppointmentBindings {
  readonly serviceEntity: string;
  readonly serviceNameField: string;
  readonly serviceDurationMinutesField: string;
  readonly serviceActiveField: string;
  readonly scheduleEntity: string;
  readonly scheduleServiceReferenceField: string;
  readonly scheduleStartField: string;
  readonly scheduleEndField: string;
  readonly scheduleTimezoneField: string;
  readonly scheduleCapacityField: string;
  readonly scheduleStatusField: string;
  readonly appointmentEntity: string;
  readonly appointmentScheduleReferenceField: string;
  readonly appointmentCustomerNameField: string;
  readonly appointmentNotesField: string;
  readonly appointmentCancellationReasonField: string;
  readonly appointmentStatusField: string;
}

interface AppointmentReceipt {
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly response: StoredRecord;
}

interface AppointmentStore extends RecordStore {
  getAppointmentReceipt(scope: string, idempotencyKey: string): Promise<AppointmentReceipt | undefined>;
  saveAppointmentReceipt(receipt: AppointmentReceipt): Promise<void>;
}

interface ClaimInput {
  readonly bindings: AppointmentBindings;
  readonly role: string;
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly scheduleId: string;
  readonly customerName: string;
  readonly notes?: string;
  readonly now: string;
}

interface ReleaseInput {
  readonly bindings: AppointmentBindings;
  readonly role: string;
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly appointmentId: string;
  readonly expectedVersion: number;
  readonly cancellationReason: string;
  readonly now: string;
}

interface MoveInput {
  readonly bindings: AppointmentBindings;
  readonly role: string;
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly appointmentId: string;
  readonly expectedVersion: number;
  readonly scheduleId: string;
  readonly now: string;
}

function reject(code: string): never {
  throw new Error(code);
}

function ownRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) reject("appointment.invalid_request");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, code = "appointment.invalid_request"): string {
  if (typeof value !== "string" || value.trim().length === 0) reject(code);
  return value;
}

function positiveInt(value: unknown, code = "appointment.schedule_invalid"): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) reject(code);
  return value as number;
}

function canonicalUtc(value: unknown): string {
  const input = requiredString(value, "appointment.schedule_invalid");
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(input)) reject("appointment.schedule_invalid");
  const instant = new Date(input);
  if (!Number.isFinite(instant.valueOf())) reject("appointment.schedule_invalid");
  return instant.toISOString();
}

function canonicalTimezone(value: unknown): string {
  const input = requiredString(value, "appointment.schedule_invalid").trim();
  if (input.length > 64 || /[\u0000-\u001f\u007f]/.test(input)) reject("appointment.schedule_invalid");
  try {
    return new Intl.DateTimeFormat("en", { timeZone: input }).resolvedOptions().timeZone;
  } catch {
    reject("appointment.schedule_invalid");
  }
}

function asVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) reject("appointment.version_conflict");
  return value as number;
}

function active(status: unknown): boolean {
  return status === "requested" || status === "confirmed";
}

function assertServerOwnedInput(input: object): void {
  for (const field of [
    "availability",
    "capacity",
    "start",
    "end",
    "timezone",
    "status",
    "version",
  ]) {
    if (Object.hasOwn(input, field)) reject("appointment.invalid_request");
  }
}

async function scheduleForClaim(
  store: AppointmentStore,
  bindings: AppointmentBindings,
  scheduleId: string,
  excludingAppointmentId?: string,
): Promise<StoredRecord> {
  const schedule = await store.find(bindings.scheduleEntity, requiredString(scheduleId));
  if (!schedule) reject("appointment.schedule_invalid");
  const values = ownRecord(schedule);
  if (values[bindings.scheduleStatusField] !== ("open" satisfies ScheduleStatus)) reject("appointment.schedule_closed");
  const start = canonicalUtc(values[bindings.scheduleStartField]);
  const end = canonicalUtc(values[bindings.scheduleEndField]);
  if (Date.parse(end) <= Date.parse(start)) reject("appointment.schedule_invalid");
  canonicalTimezone(values[bindings.scheduleTimezoneField]);
  const capacity = positiveInt(values[bindings.scheduleCapacityField]);
  const service = await store.find(bindings.serviceEntity, requiredString(values[bindings.scheduleServiceReferenceField], "appointment.schedule_invalid"));
  if (!service || ownRecord(service)[bindings.serviceActiveField] !== true) reject("appointment.schedule_invalid");
  const used = (await store.list(bindings.appointmentEntity)).filter((appointment) =>
    appointment.id !== excludingAppointmentId &&
    ownRecord(appointment)[bindings.appointmentScheduleReferenceField] === schedule.id &&
    active(ownRecord(appointment)[bindings.appointmentStatusField]),
  ).length;
  if (used >= capacity) reject("appointment.capacity_conflict");
  return schedule;
}

async function replay(
  store: AppointmentStore,
  scope: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<StoredRecord | undefined> {
  const receipt = await store.getAppointmentReceipt(scope, requiredString(idempotencyKey));
  if (!receipt) return undefined;
  if (receipt.requestHash !== requestHash) reject("appointment.idempotency_conflict");
  return receipt.response;
}

async function committed(
  store: AppointmentStore,
  input: { readonly scope: string; readonly idempotencyKey: string; readonly requestHash: string; readonly operation: string; readonly role: string; readonly bindings: AppointmentBindings; readonly now: string },
  operation: (transaction: AppointmentStore) => Promise<StoredRecord>,
): Promise<StoredRecord> {
  const previous = await replay(store, input.scope, input.idempotencyKey, input.requestHash);
  if (previous) return previous;
  const result = await store.inTransaction(async (transaction) => {
    const replayed = await replay(transaction as AppointmentStore, input.scope, input.idempotencyKey, input.requestHash);
    if (replayed) return { response: replayed, replayed: true };
    const response = await operation(transaction as AppointmentStore);
    await (transaction as AppointmentStore).saveAppointmentReceipt({ scope: input.scope, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, response });
    return { response, replayed: false };
  });
  if (!result.replayed) {
    await store.appendCapabilityEvent({ actor: input.role, capability: "appointment.booking", operation: input.operation, entity: input.bindings.appointmentEntity, recordId: result.response.id, outcome: "completed", at: input.now });
  }
  return result.response;
}

export const appointmentBookingHandler = {
  claim: async (store: AppointmentStore, input: ClaimInput): Promise<StoredRecord> =>
    (assertServerOwnedInput(input), committed(store, { ...input, operation: "claim" }, async (transaction) => {
      await scheduleForClaim(transaction, input.bindings, input.scheduleId);
      return transaction.create(input.bindings.appointmentEntity, {
        [input.bindings.appointmentScheduleReferenceField]: input.scheduleId,
        [input.bindings.appointmentCustomerNameField]: requiredString(input.customerName),
        [input.bindings.appointmentNotesField]: input.notes ?? null,
        [input.bindings.appointmentCancellationReasonField]: null,
        [input.bindings.appointmentStatusField]: "requested" satisfies AppointmentStatus,
        version: 0,
      });
    })),
  release: async (store: AppointmentStore, input: ReleaseInput): Promise<StoredRecord> =>
    (assertServerOwnedInput(input), committed(store, { ...input, operation: "release" }, async (transaction) => {
      const current = await transaction.find(input.bindings.appointmentEntity, requiredString(input.appointmentId));
      if (!current) reject("appointment.version_conflict");
      const values = ownRecord(current);
      if (!active(values[input.bindings.appointmentStatusField])) reject("appointment.state_conflict");
      if (asVersion(values.version) !== asVersion(input.expectedVersion)) reject("appointment.version_conflict");
      return transaction.update(input.bindings.appointmentEntity, current.id, {
        [input.bindings.appointmentStatusField]: "cancelled" satisfies AppointmentStatus,
        [input.bindings.appointmentCancellationReasonField]: requiredString(input.cancellationReason),
        version: asVersion(values.version) + 1,
      });
    })),
  move: async (store: AppointmentStore, input: MoveInput): Promise<StoredRecord> =>
    (assertServerOwnedInput(input), committed(store, { ...input, operation: "move" }, async (transaction) => {
      const current = await transaction.find(input.bindings.appointmentEntity, requiredString(input.appointmentId));
      if (!current) reject("appointment.version_conflict");
      const values = ownRecord(current);
      if (values[input.bindings.appointmentStatusField] !== "confirmed") reject("appointment.state_conflict");
      if (asVersion(values.version) !== asVersion(input.expectedVersion)) reject("appointment.version_conflict");
      if (values[input.bindings.appointmentScheduleReferenceField] === input.scheduleId) reject("appointment.schedule_invalid");
      await scheduleForClaim(transaction, input.bindings, input.scheduleId, current.id);
      return transaction.update(input.bindings.appointmentEntity, current.id, {
        [input.bindings.appointmentScheduleReferenceField]: input.scheduleId,
        [input.bindings.appointmentStatusField]: "requested" satisfies AppointmentStatus,
        version: asVersion(values.version) + 1,
      });
    })),
};

export const capabilityModule: CapabilityRuntimeModule & {
  readonly appointmentBookingHandler: typeof appointmentBookingHandler;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  appointmentBookingHandler,
};
