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

/** Durable generated-store artifacts. These are appended only for the immutable appointment profile. */
export const appointmentPrismaSchema = `model Factory_AppointmentMutationReceipt {
  id             String   @id @default(cuid())
  scope          String
  idempotencyKey String
  requestHash    String
  command        String
  recordId       String
  responseStatus Int
  responseBody   Json
  createdAt      DateTime @default(now())

  @@unique([scope, idempotencyKey])
}

model Factory_AppointmentHistoryEntry {
  id                 String   @id @default(cuid())
  appointmentId      String
  action             String
  fromStatus         String?
  toStatus           String
  fromSlot           Json?
  toSlot             Json?
  actorRole          String
  cancellationReason String?
  at                 DateTime

  @@index([appointmentId, at, id])
}`;

export const appointmentPrismaMigration = `CREATE TABLE \"Factory_AppointmentMutationReceipt\" (\n  \"id\" TEXT NOT NULL, \"scope\" TEXT NOT NULL, \"idempotencyKey\" TEXT NOT NULL, \"requestHash\" TEXT NOT NULL, \"command\" TEXT NOT NULL, \"recordId\" TEXT NOT NULL, \"responseStatus\" INTEGER NOT NULL, \"responseBody\" JSONB NOT NULL, \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  CONSTRAINT \"Factory_AppointmentMutationReceipt_pkey\" PRIMARY KEY (\"id\")\n);\nCREATE UNIQUE INDEX \"Factory_AppointmentMutationReceipt_scope_idempotencyKey_key\" ON \"Factory_AppointmentMutationReceipt\"(\"scope\", \"idempotencyKey\");\nCREATE TABLE \"Factory_AppointmentHistoryEntry\" (\n  \"id\" TEXT NOT NULL, \"appointmentId\" TEXT NOT NULL, \"action\" TEXT NOT NULL, \"fromStatus\" TEXT, \"toStatus\" TEXT NOT NULL, \"fromSlot\" JSONB, \"toSlot\" JSONB, \"actorRole\" TEXT NOT NULL, \"cancellationReason\" TEXT, \"at\" TIMESTAMP(3) NOT NULL,\n  CONSTRAINT \"Factory_AppointmentHistoryEntry_pkey\" PRIMARY KEY (\"id\")\n);\nCREATE INDEX \"Factory_AppointmentHistoryEntry_appointmentId_at_id_idx\" ON \"Factory_AppointmentHistoryEntry\"(\"appointmentId\", \"at\", \"id\");`;

export interface AppointmentRuntimeProfile {
  readonly capability: "scheduling.appointment@1.0.0";
  readonly effect: "appointment.booking";
  readonly serviceEntity: string;
  readonly scheduleEntity: string;
  readonly appointmentEntity: string;
  /** Immutable Published Graph checksum, embedded only in generated server context. */
  readonly graphHash?: string;
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
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.exec(source);
  if (!match)
    fail(400, "appointment.schedule_invalid");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day)
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
  const scheduleTimezone = nonEmpty(schedule[profile.fields.scheduleTimezone], "appointment.schedule_invalid");
  timezone(scheduleTimezone);
  return {
    scheduleId: nonEmpty(schedule.id, "appointment.schedule_invalid"),
    serviceId: nonEmpty(schedule[profile.fields.scheduleService], "appointment.schedule_invalid"),
    startUtc: canonicalUtc(schedule[profile.fields.scheduleStart]),
    endUtc: canonicalUtc(schedule[profile.fields.scheduleEnd]),
    timezone: scheduleTimezone,
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
  return { capability: "scheduling.appointment@1.0.0", effect: "appointment.booking", serviceEntity, scheduleEntity, appointmentEntity, graphHash: compositionLock.applicationGraphChecksum, fields };
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

function replaceRendererAnchor(source: string, anchor: string, replacement: string): string {
  if (!source.includes(anchor)) throw new Error("Appointment runtime renderer anchor is unavailable.");
  return source.replace(anchor, replacement);
}

/** Injects the lock-bound server command surface into generated ApplicationRuntime. */
export function renderAppointmentMutationRuntime(source: string, profile?: AppointmentRuntimeProfile): string {
  if (!profile) return source;
  source = `import { Buffer } from "node:buffer";\nimport { createHash } from "node:crypto";\n${source}`;
  source = replaceRendererAnchor(source, "export interface RecordStore {", `export type AppointmentMutationReceipt = { scope:string; idempotencyKey:string; requestHash:string; command:string; recordId:string; responseStatus:number; responseBody:StoredRecord; createdAt:string };\nexport type AppointmentHistoryEntry = { apiVersion:'factory.generated.appointment-history-entry/v1'; appointmentId:string; action:'claim'|'confirm'|'move'|'cancel'; fromStatus:string|null; toStatus:string; fromSlot:Record<string,unknown>|null; toSlot:Record<string,unknown>|null; actorRole:string; cancellationReason:string|null; at:string };\nexport interface RecordStore {`);
  source = replaceRendererAnchor(source, "  inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T>;", `  inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T>;\n  conditionalAppointmentUpdate(entityKey:string,recordId:string,expectedVersion:number,input:Record<string,unknown>):Promise<StoredRecord|undefined>;\n  getAppointmentReceipt(scope:string,idempotencyKey:string):Promise<AppointmentMutationReceipt|undefined>;\n  saveAppointmentReceipt(receipt:AppointmentMutationReceipt):Promise<void>;\n  appendAppointmentHistory(entry:AppointmentHistoryEntry):Promise<void>;\n  listAppointmentHistory(appointmentId:string,limit:number):Promise<readonly AppointmentHistoryEntry[]>;`);
  source = replaceRendererAnchor(source, "  private readonly auditEvents: AuditEvent[] = [];", "  private readonly appointmentReceipts = new Map<string, AppointmentMutationReceipt>();\n  private readonly appointmentHistory: AppointmentHistoryEntry[] = [];\n  private readonly auditEvents: AuditEvent[] = [];");
  source = replaceRendererAnchor(source, "  private collection(entityKey:", `  async conditionalAppointmentUpdate(entityKey:string,recordId:string,expectedVersion:number,input:Record<string,unknown>):Promise<StoredRecord|undefined>{ const current=await this.find(entityKey,recordId); if(!current||current.version!==expectedVersion)return undefined; return this.update(entityKey,recordId,input); }\n  async getAppointmentReceipt(scope:string,idempotencyKey:string){ return this.appointmentReceipts.get(scope+':'+idempotencyKey); }\n  async saveAppointmentReceipt(receipt:AppointmentMutationReceipt){ this.appointmentReceipts.set(receipt.scope+':'+receipt.idempotencyKey,structuredClone(receipt)); }\n  async appendAppointmentHistory(entry:AppointmentHistoryEntry){ this.appointmentHistory.push(structuredClone(entry)); }\n  async listAppointmentHistory(appointmentId:string,limit:number){ return this.appointmentHistory.filter(entry=>entry.appointmentId===appointmentId).sort((left,right)=>left.at.localeCompare(right.at)).slice(0,Math.min(100,limit)); }\n  private collection(entityKey:`);
  source = source.replace("  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> { return operation(this); }", "  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> { const records=structuredClone([...this.records]); const receipts=structuredClone([...this.appointmentReceipts]); const history=structuredClone(this.appointmentHistory); const audit=structuredClone(this.auditEvents); const events=structuredClone(this.capabilityEvents); try { return await operation(this); } catch(error) { this.records.clear(); for(const [entity, values] of records) this.records.set(entity,new Map(values)); this.appointmentReceipts.clear(); for(const [key,value] of receipts) this.appointmentReceipts.set(key,value); this.appointmentHistory.splice(0,this.appointmentHistory.length,...history); this.auditEvents.splice(0,this.auditEvents.length,...audit); this.capabilityEvents.splice(0,this.capabilityEvents.length,...events); throw error; } }");
  source = source.replace("  private replaceState(source: InMemoryRecordStore): void {", "  private replaceState(source: InMemoryRecordStore): void {\n    this.appointmentReceipts.clear(); for (const [key, receipt] of source.appointmentReceipts) this.appointmentReceipts.set(key, structuredClone(receipt));\n    this.appointmentHistory.splice(0, this.appointmentHistory.length, ...source.appointmentHistory.map((entry) => structuredClone(entry)));");
  source = replaceRendererAnchor(source, "export class ApplicationRuntime {", `function appointmentScopeDigest(graphHash:string,actorScope:string,role:string,entity:string,record:string,command:string):string { return createHash('sha256').update([graphHash,actorScope,role,entity,record,command].map(value=>Buffer.byteLength(value,'utf8')+':'+value).join('')).digest('hex'); }\nfunction canonicalAppointmentJson(value:unknown):string { if(Array.isArray(value)) return '['+value.map(canonicalAppointmentJson).join(',')+']'; if(value&&typeof value==='object') return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonicalAppointmentJson((value as Record<string,unknown>)[key])).join(',')+'}'; return JSON.stringify(value); }\nexport class AppointmentDomainError extends Error { constructor(readonly status:400|403|404|409, readonly code:string) { super(code); } }\nfunction appointmentReject(code:string):never { const status=code==='appointment.forbidden'?403:code==='appointment.not_found'||code==='appointment.schedule_not_found'?404:/capacity_conflict|version_conflict|state_conflict|idempotency_conflict|retryable_conflict/.test(code)?409:400; throw new AppointmentDomainError(status,code); }\nfunction validAppointmentUtc(value:string):boolean { const match=/^(\\d{4})-(\\d{2})-(\\d{2})T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$/.exec(value); if(!match||!Number.isFinite(Date.parse(value))) return false; const calendar=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))); return calendar.getUTCFullYear()===Number(match[1])&&calendar.getUTCMonth()===Number(match[2])-1&&calendar.getUTCDate()===Number(match[3]); }\nexport class ApplicationRuntime {\n  private appointmentRole(role:string, command:string):void { const allowed=command==='create'?['customer']:command==='confirm'||command==='reschedule'?['staff']:['customer','staff','administrator']; if(!allowed.includes(role)) appointmentReject('appointment.forbidden'); }\n  private async appointmentSnapshot(store:RecordStore,scheduleId:string):Promise<Record<string,unknown>> { const schedule=await store.find(${JSON.stringify(profile.scheduleEntity)},scheduleId); if(!schedule) appointmentReject('appointment.schedule_invalid'); const start=String(schedule[${JSON.stringify(profile.fields.scheduleStart)}]??''); const end=String(schedule[${JSON.stringify(profile.fields.scheduleEnd)}]??''); if(!validAppointmentUtc(start)||!validAppointmentUtc(end)||Date.parse(end)<=Date.parse(start)) appointmentReject('appointment.schedule_invalid'); const timezone=String(schedule[${JSON.stringify(profile.fields.scheduleTimezone)}]??''); try { new Intl.DateTimeFormat('en',{timeZone:timezone}); } catch { appointmentReject('appointment.schedule_invalid'); } const service=await store.find(${JSON.stringify(profile.serviceEntity)},String(schedule[${JSON.stringify(profile.fields.scheduleService)}]??'')); if(!service) appointmentReject('appointment.schedule_invalid'); return {scheduleId:String(schedule.id),serviceId:String(schedule[${JSON.stringify(profile.fields.scheduleService)}]),startUtc:new Date(start).toISOString(),endUtc:new Date(end).toISOString(),timezone}; }\n  private async appointmentEligibility(store:RecordStore,scheduleId:string,excludedId?:string):Promise<Record<string,unknown>> { const schedule=await store.find(${JSON.stringify(profile.scheduleEntity)},scheduleId); if(!schedule||schedule[${JSON.stringify(profile.fields.scheduleStatus)}]!=='open') appointmentReject('appointment.schedule_invalid'); const start=String(schedule[${JSON.stringify(profile.fields.scheduleStart)}]??''); const end=String(schedule[${JSON.stringify(profile.fields.scheduleEnd)}]??''); if(!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$/.test(start)||!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$/.test(end)||!validAppointmentUtc(start)||!validAppointmentUtc(end)||Date.parse(end)<=Date.parse(start)) appointmentReject('appointment.schedule_invalid'); const timezone=String(schedule[${JSON.stringify(profile.fields.scheduleTimezone)}]??''); try { new Intl.DateTimeFormat('en',{timeZone:timezone}); } catch { appointmentReject('appointment.schedule_invalid'); } const capacity=schedule[${JSON.stringify(profile.fields.scheduleCapacity)}]; if(!Number.isSafeInteger(capacity)||(capacity as number)<1) appointmentReject('appointment.schedule_invalid'); const service=await store.find(${JSON.stringify(profile.serviceEntity)},String(schedule[${JSON.stringify(profile.fields.scheduleService)}]??'')); if(!service||service[${JSON.stringify(profile.fields.serviceActive)}]!==true) appointmentReject('appointment.schedule_invalid'); const occupied=(await store.list(${JSON.stringify(profile.appointmentEntity)})).filter(item=>item.id!==excludedId&&item[${JSON.stringify(profile.fields.appointmentSchedule)}]===schedule.id&&(item[${JSON.stringify(profile.fields.appointmentStatus)}]==='requested'||item[${JSON.stringify(profile.fields.appointmentStatus)}]==='confirmed')).length; if(occupied>=capacity) appointmentReject('appointment.capacity_conflict'); return {scheduleId:String(schedule.id),serviceId:String(schedule[${JSON.stringify(profile.fields.scheduleService)}]),startUtc:new Date(start).toISOString(),endUtc:new Date(end).toISOString(),timezone}; }\n  async appointmentCommand(server:{role:string;scope:string;graphHash:string},entityKey:string,recordId:string|undefined,command:string,idempotencyKey:unknown,body:unknown):Promise<StoredRecord>{ if(entityKey!==${JSON.stringify(profile.appointmentEntity)}||!['create','confirm','reschedule','cancel'].includes(command)) appointmentReject('appointment.unsupported_route'); this.appointmentRole(server.role,command); if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)) appointmentReject('appointment.invalid_request'); const safe=body&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:null; const expected=command==='create'?['values']:command==='confirm'?['expectedVersion']:command==='reschedule'?['expectedVersion','scheduleId']:['expectedVersion','cancellationReason']; if(!safe||Object.keys(safe).length!==expected.length||!expected.every(key=>Object.hasOwn(safe,key))) appointmentReject('appointment.invalid_request'); const scope=appointmentScopeDigest(server.graphHash,server.scope,server.role,entityKey,recordId??'$create',command); const requestHash=createHash('sha256').update(canonicalAppointmentJson(safe)).digest('hex'); const now=new Date().toISOString(); return this.store.inTransaction(async store=>{ const receipt=await store.getAppointmentReceipt(scope,idempotencyKey); if(receipt){if(receipt.requestHash!==requestHash) appointmentReject('appointment.idempotency_conflict');return receipt.responseBody;} let record:StoredRecord; let action:'claim'|'confirm'|'move'|'cancel'; let fromStatus:string|null=null; let fromSlot:Record<string,unknown>|null=null; let toSlot:Record<string,unknown>|null=null; if(command==='create'){ const values=safe.values; if(!values||typeof values!=='object'||Array.isArray(values)) appointmentReject('appointment.invalid_request'); const input=values as Record<string,unknown>; const allowed=[${JSON.stringify(profile.fields.appointmentSchedule)},${JSON.stringify(profile.fields.appointmentCustomer)},${JSON.stringify(profile.fields.appointmentNotes)}]; if(Object.keys(input).some(key=>!allowed.includes(key))||typeof input[${JSON.stringify(profile.fields.appointmentSchedule)}]!=='string'||typeof input[${JSON.stringify(profile.fields.appointmentCustomer)}]!=='string') appointmentReject('appointment.invalid_request'); toSlot=await this.appointmentEligibility(store,input[${JSON.stringify(profile.fields.appointmentSchedule)}] as string); record=await store.create(entityKey,{...input,[${JSON.stringify(profile.fields.appointmentStatus)}]:'requested',[${JSON.stringify(profile.fields.appointmentCancellationReason)}]:null,version:0}); action='claim'; } else { if(!recordId||!Number.isSafeInteger(safe.expectedVersion)||(safe.expectedVersion as number)<0) appointmentReject('appointment.invalid_request'); const current=await store.find(entityKey,recordId); if(!current) appointmentReject('appointment.not_found'); if(current.version!==safe.expectedVersion) appointmentReject('appointment.version_conflict'); fromStatus=String(current[${JSON.stringify(profile.fields.appointmentStatus)}]); fromSlot=await this.appointmentSnapshot(store,String(current[${JSON.stringify(profile.fields.appointmentSchedule)}])); if(command==='confirm'&&fromStatus!=='requested') appointmentReject('appointment.state_conflict'); if(command==='reschedule'&&fromStatus!=='confirmed') appointmentReject('appointment.state_conflict'); if(command==='cancel'&&!['requested','confirmed'].includes(fromStatus)) appointmentReject('appointment.state_conflict'); const input=command==='confirm'?{[${JSON.stringify(profile.fields.appointmentStatus)}]:'confirmed',version:(current.version as number)+1}:command==='reschedule'?{[${JSON.stringify(profile.fields.appointmentSchedule)}]:safe.scheduleId,[${JSON.stringify(profile.fields.appointmentStatus)}]:'requested',version:(current.version as number)+1}:{[${JSON.stringify(profile.fields.appointmentCancellationReason)}]:safe.cancellationReason,[${JSON.stringify(profile.fields.appointmentStatus)}]:'cancelled',version:(current.version as number)+1}; if(command==='reschedule'){if(typeof safe.scheduleId!=='string'||safe.scheduleId===current[${JSON.stringify(profile.fields.appointmentSchedule)}]) appointmentReject('appointment.schedule_invalid');toSlot=await this.appointmentEligibility(store,safe.scheduleId,recordId);} else if(command==='confirm') toSlot=fromSlot; const updated=await store.conditionalAppointmentUpdate(entityKey,recordId,current.version as number,input); if(!updated) appointmentReject('appointment.version_conflict'); record=updated; action=command==='reschedule'?'move':command==='cancel'?'cancel':'confirm'; } await store.appendAppointmentHistory({apiVersion:'factory.generated.appointment-history-entry/v1',appointmentId:record.id,action,fromStatus,toStatus:String(record[${JSON.stringify(profile.fields.appointmentStatus)}]),fromSlot,toSlot,actorRole:server.role,cancellationReason:command==='cancel'?String(safe.cancellationReason):null,at:now}); await store.appendCapabilityEvent({actor:server.role,capability:'appointment.booking',operation:action==='claim'?'claim':action==='move'?'move':action==='cancel'?'release':'confirm',entity:entityKey,recordId:record.id,outcome:'completed',at:now}); await store.saveAppointmentReceipt({scope,idempotencyKey,requestHash,command,recordId:record.id,responseStatus:command==='create'?201:200,responseBody:record,createdAt:now}); return record; }); }\n  async appointmentHistory(role:string,entityKey:string,recordId:string):Promise<readonly AppointmentHistoryEntry[]>{ if(entityKey!==${JSON.stringify(profile.appointmentEntity)}||!['customer','staff','administrator'].includes(role)) appointmentReject('appointment.forbidden'); if(!await this.store.find(entityKey,recordId)) appointmentReject('appointment.not_found'); return this.store.listAppointmentHistory(recordId,100); }`);
  return source;
}

/** Adds durable generated Prisma delegates and whole-operation Serializable retries. */
export function renderAppointmentPrismaStore(source: string, profile?: AppointmentRuntimeProfile): string {
  if (!profile) return source;
  source = source.replace(
    'import { PrismaClient } from "@prisma/client";',
    'import { PrismaClient } from "@prisma/client";\nimport type { AppointmentMutationReceipt, AppointmentHistoryEntry } from "./application-runtime.js";',
  );
  source = source.replace(
    'import { assertFactoryOwnedRecordIdentityInput } from "./application-runtime.js";',
    'import { AppointmentDomainError, assertFactoryOwnedRecordIdentityInput } from "./application-runtime.js";',
  );
  source = replaceRendererAnchor(source, "  constructor(private readonly prisma: PrismaClient) {}", "  constructor(private readonly prisma: PrismaClient) {}");
  source = replaceRendererAnchor(source, "  async inTransaction<T>(operation:", `  private appointmentMutationReceiptDelegate(): { findUnique(input:unknown):Promise<unknown>; create(input:unknown):Promise<unknown> } { return (this.prisma as unknown as { factory_AppointmentMutationReceipt: { findUnique(input:unknown):Promise<unknown>; create(input:unknown):Promise<unknown> } }).factory_AppointmentMutationReceipt; }\n  private appointmentHistoryEntryDelegate(): { create(input:unknown):Promise<unknown>; findMany(input:unknown):Promise<unknown[]> } { return (this.prisma as unknown as { factory_AppointmentHistoryEntry: { create(input:unknown):Promise<unknown>; findMany(input:unknown):Promise<unknown[]> } }).factory_AppointmentHistoryEntry; }\n  async conditionalAppointmentUpdate(entityKey:string,recordId:string,expectedVersion:number,input:Record<string,unknown>):Promise<StoredRecord|undefined>{ const delegate=this.delegate(entityKey) as CrudDelegate & {updateMany(input:unknown):Promise<{count:number}>}; const result=await delegate.updateMany({where:{id:recordId,version:expectedVersion},data:input}); return result.count===1?this.find(entityKey,recordId):undefined; }\n  async getAppointmentReceipt(scope:string,idempotencyKey:string):Promise<AppointmentMutationReceipt|undefined>{ const entry=await this.appointmentMutationReceiptDelegate().findUnique({where:{scope_idempotencyKey:{scope,idempotencyKey}}}) as AppointmentMutationReceipt|undefined; return entry?{...entry,responseBody:entry.responseBody as StoredRecord,createdAt:new Date(entry.createdAt).toISOString()}:undefined; }\n  async saveAppointmentReceipt(receipt:AppointmentMutationReceipt):Promise<void>{ await this.appointmentMutationReceiptDelegate().create({data:{...receipt,responseBody:receipt.responseBody,createdAt:new Date(receipt.createdAt)}}); }\n  async appendAppointmentHistory(entry:AppointmentHistoryEntry):Promise<void>{ await this.appointmentHistoryEntryDelegate().create({data:{...entry,at:new Date(entry.at)}}); }\n  async listAppointmentHistory(appointmentId:string,limit:number):Promise<readonly AppointmentHistoryEntry[]>{ const entries=await this.appointmentHistoryEntryDelegate().findMany({where:{appointmentId},orderBy:[{at:'asc'},{id:'asc'}],take:Math.min(100,Math.max(1,limit))}); return entries.map(entry=>{const value=entry as AppointmentHistoryEntry & {at:Date};return {...value,at:value.at.toISOString()};}); }\n  async inTransaction<T>(operation:`);
  const transaction = "  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> {\n    for (let attempt = 0; attempt < 3; attempt += 1) {\n      try { return await (this.prisma as unknown as { $transaction<T>(operation:(client:PrismaClient)=>Promise<T>, options:{isolationLevel:'Serializable'}):Promise<T> }).$transaction((client) => operation(new PrismaRecordStore(client)), { isolationLevel:'Serializable' }); }\n      catch (error) { const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''; const message = error instanceof Error ? error.message : ''; if (!(code === 'P2034' || code === 'P2002' || code === '40001' || /serialization|write conflict/i.test(message))) throw error; }\n    }\n    throw new AppointmentDomainError(409,'appointment.retryable_conflict');\n  }";
  source = source.replace("  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> {\n    return (this.prisma as unknown as TransactionExecutor).$transaction(async (client) => operation(new PrismaRecordStore(client)));\n  }", transaction);
  source = source.replace("  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> { return operation(this); }", transaction);
  return source;
}

/** Adds only existing entity grammar routes; all command context is derived server-side. */
export function renderAppointmentApiDispatch(source: string, profile?: AppointmentRuntimeProfile): string {
  if (!profile) return source;
  source = source.replace(
    'import { ApplicationRuntime } from "./application-runtime.js";',
    'import { ApplicationRuntime, AppointmentDomainError } from "./application-runtime.js";',
  );
  const graphHash = profile.graphHash ?? "locked-appointment-graph";
  const hasVerifiedIdentity = source.includes("export function resolvePrincipalContext(");
  const context = hasVerifiedIdentity
    ? `function appointmentServerContext(request: { headers: Record<string, string | string[] | undefined> }, entity: string, action: string) { const principal = resolvePrincipalContext(request); return { role: roleFrom(request, entity, action), scope: 'fixture:' + principal.sessionId, graphHash: ${JSON.stringify(graphHash)} }; }`
    : "function appointmentServerContext(_request: { headers: Record<string, string | string[] | undefined> }, _entity: string, _action: string): never { throw new Error('Identity policy denied: verified appointment session required.'); }";
  const route = `\n  @Get(':entity/:recordId/appointment-history')\n  async appointmentHistory(@Param('entity') entity:string,@Param('recordId') recordId:string,@Req() request:{headers:Record<string,string|string[]|undefined>}) { try { return await applicationRuntime.appointmentHistory(appointmentServerContext(request,entity,'read').role,entity,recordId); } catch(error) { throw rejected(error); } }\n`;
  const rejected = `function rejected(error: unknown): HttpException {\n  if (error instanceof AppointmentDomainError) {\n    const status = error.status === 400 ? HttpStatus.BAD_REQUEST : error.status === 403 ? HttpStatus.FORBIDDEN : error.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT;\n    return new HttpException({ code: error.code }, status);\n  }\n  return new HttpException({ code: 'request.rejected' }, HttpStatus.BAD_REQUEST);\n}`;
  return source.replace("function rejected(error: unknown): HttpException {\n  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);\n}", `${context}\n\n${rejected}`).replace("class GeneratedController {", `class GeneratedController {${route}`).replace("return await applicationRuntime.create(", `if(entity===${JSON.stringify(profile.appointmentEntity)})return await applicationRuntime.appointmentCommand(appointmentServerContext(request,entity,'create'),entity,undefined,'create',request.headers['x-factory-idempotency-key'],body); return await applicationRuntime.create(`).replace("return await applicationRuntime.transition(", `if(entity===${JSON.stringify(profile.appointmentEntity)}&&['confirm','reschedule','cancel'].includes(event))return await applicationRuntime.appointmentCommand(appointmentServerContext(request,entity,event),entity,recordId,event,request.headers['x-factory-idempotency-key'],body); return await applicationRuntime.transition(`);
}
