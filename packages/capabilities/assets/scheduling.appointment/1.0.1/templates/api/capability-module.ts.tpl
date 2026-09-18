import type { CapabilityRuntimeModule } from "./contract.js";
import type { AppointmentMutationReceipt, RecordStore, StoredRecord } from "../application-runtime.js";

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

type AppointmentReceipt = AppointmentMutationReceipt;
interface AppointmentStore extends RecordStore {}

interface ClaimInput {
  readonly scheduleId: string;
  readonly customerName: string;
  readonly notes?: string;
}

interface ReleaseInput {
  readonly appointmentId: string;
  readonly expectedVersion: number;
  readonly cancellationReason: string;
}

interface MoveInput {
  readonly appointmentId: string;
  readonly expectedVersion: number;
  readonly scheduleId: string;
}

interface FactoryAuthorizedContext {
  readonly factoryServer: true;
  readonly role: string;
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly now: string;
}

const appointmentBindings: Readonly<AppointmentBindings> = Object.freeze({
  serviceEntity: "{{serviceEntity}}",
  serviceNameField: "{{serviceNameField}}",
  serviceDurationMinutesField: "{{serviceDurationMinutesField}}",
  serviceActiveField: "{{serviceActiveField}}",
  scheduleEntity: "{{scheduleEntity}}",
  scheduleServiceReferenceField: "{{scheduleServiceReferenceField}}",
  scheduleStartField: "{{scheduleStartField}}",
  scheduleEndField: "{{scheduleEndField}}",
  scheduleTimezoneField: "{{scheduleTimezoneField}}",
  scheduleCapacityField: "{{scheduleCapacityField}}",
  scheduleStatusField: "{{scheduleStatusField}}",
  appointmentEntity: "{{appointmentEntity}}",
  appointmentScheduleReferenceField: "{{appointmentScheduleReferenceField}}",
  appointmentCustomerNameField: "{{appointmentCustomerNameField}}",
  appointmentNotesField: "{{appointmentNotesField}}",
  appointmentCancellationReasonField: "{{appointmentCancellationReasonField}}",
  appointmentStatusField: "{{appointmentStatusField}}",
});

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
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](\d{2}):(\d{2}))$/i.exec(input);
  if (!match) reject("appointment.schedule_invalid");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offset, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText), hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || (offset !== "Z" && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59))) reject("appointment.schedule_invalid");
  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) reject("appointment.schedule_invalid");
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

function assertFactoryContext(input: unknown): FactoryAuthorizedContext {
  const context = ownRecord(input);
  const expected = ["factoryServer", "role", "scope", "idempotencyKey", "requestHash", "now"];
  if (
    Object.keys(context).length !== expected.length ||
    expected.some((key) => !Object.hasOwn(context, key)) ||
    context.factoryServer !== true
  ) reject("appointment.unauthorized");
  for (const key of ["role", "scope", "idempotencyKey", "requestHash", "now"] as const) requiredString(context[key], "appointment.unauthorized");
  return context as unknown as FactoryAuthorizedContext;
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
  return receipt.responseBody;
}

async function committed(
  store: AppointmentStore,
  input: { readonly scope: string; readonly idempotencyKey: string; readonly requestHash: string; readonly operation: string; readonly role: string; readonly bindings: AppointmentBindings; readonly now: string },
  operation: (transaction: AppointmentStore) => Promise<StoredRecord>,
): Promise<StoredRecord> {
  const previous = await replay(store, input.scope, input.idempotencyKey, input.requestHash);
  if (previous) return previous;
  const result = await store.inTransaction(async (transaction) => {
    const replayed = await replay(transaction as unknown as AppointmentStore, input.scope, input.idempotencyKey, input.requestHash);
    if (replayed) return { response: replayed, replayed: true };
    const response = await operation(transaction as unknown as AppointmentStore);
    await (transaction as unknown as AppointmentStore).saveAppointmentReceipt({ scope: input.scope, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, command: input.operation, recordId: response.id, responseStatus: 200, responseBody: response, createdAt: input.now });
    await transaction.appendCapabilityEvent({ actor: input.role, capability: "appointment.booking", operation: input.operation, entity: input.bindings.appointmentEntity, recordId: response.id, outcome: "completed", at: input.now });
    return { response, replayed: false };
  });
  return result.response;
}

export const appointmentBookingHandler = {
  claim: async (store: AppointmentStore, contextInput: unknown, input: ClaimInput): Promise<StoredRecord> => {
    const context = assertFactoryContext(contextInput); assertServerOwnedInput(input);
    return committed(store, { ...context, bindings: appointmentBindings, operation: "claim" }, async (transaction) => {
      await scheduleForClaim(transaction, appointmentBindings, input.scheduleId);
      return transaction.create(appointmentBindings.appointmentEntity, {
        [appointmentBindings.appointmentScheduleReferenceField]: input.scheduleId,
        [appointmentBindings.appointmentCustomerNameField]: requiredString(input.customerName),
        [appointmentBindings.appointmentNotesField]: input.notes ?? null,
        [appointmentBindings.appointmentCancellationReasonField]: null,
        [appointmentBindings.appointmentStatusField]: "requested" satisfies AppointmentStatus,
        version: 0,
      });
    });
  },
  release: async (store: AppointmentStore, contextInput: unknown, input: ReleaseInput): Promise<StoredRecord> => {
    const context = assertFactoryContext(contextInput); assertServerOwnedInput(input);
    return committed(store, { ...context, bindings: appointmentBindings, operation: "release" }, async (transaction) => {
      const current = await transaction.find(appointmentBindings.appointmentEntity, requiredString(input.appointmentId));
      if (!current) reject("appointment.version_conflict");
      const values = ownRecord(current);
      if (!active(values[appointmentBindings.appointmentStatusField])) reject("appointment.state_conflict");
      if (asVersion(values.version) !== asVersion(input.expectedVersion)) reject("appointment.version_conflict");
      return transaction.update(appointmentBindings.appointmentEntity, current.id, {
        [appointmentBindings.appointmentStatusField]: "cancelled" satisfies AppointmentStatus,
        [appointmentBindings.appointmentCancellationReasonField]: requiredString(input.cancellationReason),
        version: asVersion(values.version) + 1,
      });
    });
  },
  move: async (store: AppointmentStore, contextInput: unknown, input: MoveInput): Promise<StoredRecord> => {
    const context = assertFactoryContext(contextInput); assertServerOwnedInput(input);
    return committed(store, { ...context, bindings: appointmentBindings, operation: "move" }, async (transaction) => {
      const current = await transaction.find(appointmentBindings.appointmentEntity, requiredString(input.appointmentId));
      if (!current) reject("appointment.version_conflict");
      const values = ownRecord(current);
      if (values[appointmentBindings.appointmentStatusField] !== "confirmed") reject("appointment.state_conflict");
      if (asVersion(values.version) !== asVersion(input.expectedVersion)) reject("appointment.version_conflict");
      if (values[appointmentBindings.appointmentScheduleReferenceField] === input.scheduleId) reject("appointment.schedule_invalid");
      await scheduleForClaim(transaction, appointmentBindings, input.scheduleId, current.id);
      return transaction.update(appointmentBindings.appointmentEntity, current.id, {
        [appointmentBindings.appointmentScheduleReferenceField]: input.scheduleId,
        [appointmentBindings.appointmentStatusField]: "requested" satisfies AppointmentStatus,
        version: asVersion(values.version) + 1,
      });
    });
  },
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
