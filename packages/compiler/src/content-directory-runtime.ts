import type { ContentDirectoryProfile } from "./content-directory-contract.js";
import { writeProtectionFragments } from "./mutation-write-protection.js";

function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw new Error("Directory template anchor is unavailable.");
  return source.replace(before, () => after);
}

export const directoryReceiptSchema = `model DirectoryMutationReceipt {
  id String @id @default(cuid())
  scope String
  idempotencyKey String
  requestHash String
  operation String
  recordId String
  responseStatus Int
  responseBody Json
  createdAt DateTime @default(now())
  @@unique([scope, idempotencyKey])
}`;
export const directoryReceiptMigration = `CREATE TABLE "DirectoryMutationReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DirectoryMutationReceipt_scope_idempotencyKey_key" ON "DirectoryMutationReceipt" ("scope", "idempotencyKey");`;

function protection(profile: ContentDirectoryProfile) {
  const base = writeProtectionFragments("task", profile.graphHash);
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value.replaceAll("Task", "Directory").replaceAll("task", "directory"),
    ]),
  ) as typeof base;
}

export function renderDirectoryRuntime(
  source: string,
  profile?: ContentDirectoryProfile,
): string {
  if (!profile) return source;
  const fragments = protection(profile);
  source = 'import { createHash } from "node:crypto";\n' + source;
  source = replace(
    source,
    "export interface RecordStore {",
    String.raw`
// factory.generated.directory-command/v1; factory.generated.directory-receipt/v1
const directoryProfile = ${JSON.stringify(profile)} as const;
export type DirectoryQuery = { q: string; category?: string; offset: number; limit: number; listedOnly: boolean };
export type DirectoryList = { apiVersion: 'factory.generated.directory-list/v1'; records: readonly StoredRecord[]; offset: number; limit: number; hasMore: boolean };
export type DirectoryMutationReceipt = { scope: string; idempotencyKey: string; requestHash: string; operation: string; recordId: string; responseStatus: number; responseBody: StoredRecord };
export class DirectoryMutationError extends Error { constructor(readonly status: number, readonly body: Record<string, unknown>) { super('Directory request rejected.'); } }
function failDirectory(status: number, code: string, current?: StoredRecord): never { throw new DirectoryMutationError(status, { code, ...(current ? { current: { id: current.id, status: current.status, version: current.version } } : {}) }); }
function plainDirectory(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) failDirectory(400, 'directory.invalid_request');
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) failDirectory(400, 'directory.invalid_request');
  for (const key of own) { const descriptor = Object.getOwnPropertyDescriptor(value, key)!; if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) failDirectory(400, 'directory.invalid_request'); }
}
function directoryText(value: unknown, max: number, multiline = false, empty = false): string {
  if (typeof value !== 'string' || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) failDirectory(400, 'directory.invalid_request');
  const normalized = value.trim();
  if ((!empty && normalized.length === 0) || normalized.length > max) failDirectory(400, 'directory.invalid_request');
  return normalized;
}
function directoryValues(input: unknown): Record<string, string> {
  plainDirectory(input, ['title', 'summary', 'body', 'category']);
  const category = directoryText(input.category, 40);
  if (!(directoryProfile.categories as readonly string[]).includes(category)) failDirectory(400, 'directory.invalid_request');
  return { title: directoryText(input.title, 120), summary: directoryText(input.summary, 280), body: directoryText(input.body, 12000, true), category };
}
function directoryQuery(input: unknown, listedOnly: boolean): DirectoryQuery {
  if (typeof input !== 'string' || input.length > 4096 || /%(?![a-f0-9]{2})/i.test(input)) failDirectory(400, 'directory.invalid_request');
  const params = new URLSearchParams(input);
  const seen = new Set<string>();
  for (const [key] of params) { if (!['q','category','offset','limit'].includes(key) || seen.has(key)) failDirectory(400, 'directory.invalid_request'); seen.add(key); }
  const integer = (key: string, fallback: number, minimum: number, maximum: number) => { const value = params.get(key); if (value === null) return fallback; if (!/^(0|[1-9][0-9]*)$/.test(value)) failDirectory(400, 'directory.invalid_request'); const number = Number(value); if (!Number.isSafeInteger(number) || number < minimum || number > maximum) failDirectory(400, 'directory.invalid_request'); return number; };
  const category = params.get('category');
  if (category !== null && !(directoryProfile.categories as readonly string[]).includes(category)) failDirectory(400, 'directory.invalid_request');
  return { q: directoryText(params.get('q') ?? '', 120, false, true), ...(category === null ? {} : { category }), offset: integer('offset',0,0,10000), limit: integer('limit',20,1,50), listedOnly };
}
function directoryRecord(record: StoredRecord, detail: boolean): StoredRecord {
  return { id: record.id, title: record.title, summary: record.summary, category: record.category, status: record.status, version: record.version, ...(detail ? { body: record.body } : {}) };
}
${fragments.canonical}
export interface RecordStore {
  listDirectory(entity: string, query: DirectoryQuery): Promise<readonly StoredRecord[]>;
  findDirectory(entity: string, id: string, listedOnly: boolean): Promise<StoredRecord | undefined>;
  getDirectoryReceipt(scope: string, key: string): Promise<DirectoryMutationReceipt | undefined>;
  saveDirectoryReceipt(receipt: DirectoryMutationReceipt): Promise<void>;
  conditionalDirectoryUpdate(entity: string, id: string, status: string, version: number, values: Record<string, unknown>): Promise<StoredRecord | undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly directoryReceipts = new Map<string, DirectoryMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.directoryReceipts.clear(); for (const [key, value] of source.directoryReceipts) this.directoryReceipts.set(key, structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "{ id: seed.id, ...seed.values }",
    "{ id: seed.id, ...seed.values, ...(seed.entity === directoryProfile.entity ? { version: 0 } : {}) }",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    fragments.memoryMethods +
      String.raw`
  async listDirectory(entity: string, query: DirectoryQuery): Promise<readonly StoredRecord[]> {
    const q = query.q.toLowerCase();
    return [...this.collection(entity).values()].filter(record => (!query.listedOnly || record.status === 'listed') && (query.category === undefined || record.category === query.category) && (!q || String(record.title).toLowerCase().includes(q) || String(record.summary).toLowerCase().includes(q))).sort((a,b) => String(a.title).localeCompare(String(b.title)) || a.id.localeCompare(b.id)).slice(query.offset, query.offset + query.limit + 1).map(record => directoryRecord(record, false));
  }
  async findDirectory(entity: string, id: string, listedOnly: boolean): Promise<StoredRecord | undefined> { const record = this.collection(entity).get(id); return record && (!listedOnly || record.status === 'listed') ? directoryRecord(record, true) : undefined; }
  private collection(entityKey:`,
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    String.raw`export class ApplicationRuntime {
  private async directoryRole(role: string, entity: string, action: string): Promise<void> {
    if (entity !== directoryProfile.entity || ![directoryProfile.roles.reader, directoryProfile.roles.curator].some(allowed => allowed === role) || (action !== 'read' && role !== directoryProfile.roles.curator) || !await enforce(role, entity, action)) failDirectory(403, 'directory.forbidden');
  }
  async directoryList(role: string, entity: string, search: unknown = ''): Promise<DirectoryList> {
    await this.directoryRole(role, entity, 'read');
    const query = directoryQuery(search, role === directoryProfile.roles.reader);
    const records = await this.store.listDirectory(entity, query);
    return { apiVersion: 'factory.generated.directory-list/v1', records: records.slice(0, query.limit).map(record => directoryRecord(record, false)), offset: query.offset, limit: query.limit, hasMore: records.length > query.limit };
  }
  async directoryRead(role: string, entity: string, recordId: string): Promise<StoredRecord> {
    await this.directoryRole(role, entity, 'read');
    if (typeof recordId !== 'string' || !recordId || recordId.length > 128) failDirectory(404, 'directory.not_found');
    const record = await this.store.findDirectory(entity, recordId, role === directoryProfile.roles.reader);
    if (!record) failDirectory(404, 'directory.not_found');
    return directoryRecord(record, true);
  }
  async directoryCommand(role: string, actorScope: string, entityKey: string, recordId: string | undefined, operation: string, key: unknown, body: unknown): Promise<{ status: number; body: StoredRecord }> {
    if (!['create','update','submit','cancel'].includes(operation)) failDirectory(403, 'directory.forbidden');
    await this.directoryRole(role, entityKey, operation);
    if (typeof actorScope !== 'string' || !actorScope || actorScope.length > 256 || (operation === 'create' ? recordId !== undefined : typeof recordId !== 'string' || !recordId || recordId.length > 128)) failDirectory(400, 'directory.invalid_request');
${fragments.validateKey}
    plainDirectory(body, operation === 'create' ? ['values'] : operation === 'update' ? ['expectedVersion', 'values'] : ['expectedVersion']);
    if (operation !== 'create' && (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion as number) < 0 || (body.expectedVersion as number) >= Number.MAX_SAFE_INTEGER)) failDirectory(400, 'directory.invalid_request');
    const values = operation === 'create' || operation === 'update' ? directoryValues(body.values) : {};
    const normalized = operation === 'create' ? { values } : operation === 'update' ? { expectedVersion: body.expectedVersion, values } : { expectedVersion: body.expectedVersion };
${fragments.identity}
${fragments.replay}
${fragments.transactionStart}
      let record: StoredRecord;
      if (operation === 'create') record = await store.create(entityKey, { ...values, status: 'hidden', version: 0 });
      else {
        const current = await store.find(entityKey, recordId!);
        if (!current) failDirectory(404, 'directory.not_found');
        if (current.version !== body.expectedVersion) failDirectory(409, 'directory.version_conflict', current);
        if (!['hidden','listed'].includes(current.status!) || (operation === 'submit' && current.status !== 'hidden') || (operation === 'cancel' && current.status !== 'listed')) failDirectory(409, 'directory.invalid_state');
        const status = operation === 'submit' ? 'listed' : operation === 'cancel' ? 'hidden' : current.status!;
${fragments.conditionalWrite}
      }
      await store.appendAudit({ actor: role, action: operation, entity: entityKey, recordId: record.id, at: new Date().toISOString() });
      const responseBody = directoryRecord(record, true);
      const responseStatus = operation === 'create' ? 201 : 200;
${fragments.saveReceipt}
      return { status: responseStatus, body: responseBody };
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await run(); }
      catch (error) {
        if (error instanceof DirectoryMutationError) throw error;
        const code = (error as { code?: string })?.code;
        if (!['P2002','P2034'].includes(code ?? '')) throw new Error('Directory request failed.');
        if (attempt === 2) failDirectory(409, 'directory.retry_required');
      }
    }
    return failDirectory(409, 'directory.retry_required');
  }
`,
  );
  for (const method of [
    "list",
    "read",
    "create",
    "transition",
    "auditLog",
    "capabilityEvents",
  ]) {
    const pattern = new RegExp(
      "  async " + method + "\\(role:[\\s\\S]*?\\n  \\}",
    );
    const legacy = source.match(pattern)?.[0];
    if (!legacy) throw new Error("Directory runtime boundary is unavailable.");
    const signature =
      method === "list"
        ? legacy
            .split("\n")[0]!
            .replace(
              "Promise<readonly StoredRecord[]>",
              "Promise<DirectoryList>",
            )
        : legacy.split("\n")[0]!;
    const body =
      method === "list"
        ? "return this.directoryList(role, entityKey);"
        : method === "read"
          ? "return this.directoryRead(role, entityKey, recordId);"
          : ["auditLog", "capabilityEvents"].includes(method)
            ? "failDirectory(403, 'directory.forbidden');"
            : "failDirectory(entityKey === directoryProfile.entity ? 400 : 403, entityKey === directoryProfile.entity ? 'directory.invalid_request' : 'directory.forbidden');";
    source = replace(source, legacy, signature + "\n    " + body + "\n  }");
  }
  for (const value of [
    "[...this.collection(entityKey).values()]",
    "this.collection(entityKey).get(recordId)",
    "[...this.auditEvents]",
    "[...this.capabilityEvents]",
  ])
    source = replace(
      source,
      "return " + value + ";",
      "return structuredClone(" + value + ");",
    );
  return source;
}

export function renderDirectoryPrismaStore(
  source: string,
  profile?: ContentDirectoryProfile,
): string {
  if (!profile) return source;
  const fragments = protection(profile);
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "DirectoryQuery, DirectoryMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "  findMany(): Promise<unknown[]>;",
    "  findMany(input?: Record<string, unknown>): Promise<unknown[]>;\n  findFirst(input: Record<string, unknown>): Promise<unknown | null>;\n  updateMany(input: { where: Record<string,unknown>; data: Record<string,unknown> }): Promise<{ count: number }>;",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    fragments.prismaMethods +
      String.raw`
  async listDirectory(entity: string, query: DirectoryQuery): Promise<readonly StoredRecord[]> {
    const literal = query.q.replace(/[\\%_]/g, '\\$&');
    const where = { ...(query.listedOnly ? { status: 'listed' } : {}), ...(query.category === undefined ? {} : { category: query.category }), ...(literal ? { OR: [{ title: { contains: literal, mode: 'insensitive' } }, { summary: { contains: literal, mode: 'insensitive' } }] } : {}) };
    return (await this.delegate(entity).findMany({ where, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: query.offset, take: query.limit + 1, select: { id: true, title: true, summary: true, category: true, status: true, version: true } })).map(asStoredRecord);
  }
  async findDirectory(entity: string, id: string, listedOnly: boolean): Promise<StoredRecord | undefined> {
    const row = await this.delegate(entity).findFirst({ where: { id, ...(listedOnly ? { status: 'listed' } : {}) }, select: { id: true, title: true, summary: true, body: true, category: true, status: true, version: true } });
    return row ? asStoredRecord(row) : undefined;
  }
`,
  );
  source = replace(
    source,
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>, options?: { isolationLevel: 'Serializable' }): Promise<T> };",
  );
  source = replace(
    source,
    "operation(new PrismaRecordStore(client)));",
    "operation(new PrismaRecordStore(client)), { isolationLevel: 'Serializable' });",
  );
  return source;
}

export function renderDirectoryApi(
  source: string,
  profile?: ContentDirectoryProfile,
): string {
  if (!profile) return source;
  source = replace(
    source,
    "Param, Post, Req",
    "Param, Post, Patch, HttpCode, Req",
  );
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, DirectoryMutationError }",
  );
  source = replace(
    source,
    "return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "return error instanceof DirectoryMutationError ? new HttpException(error.body, error.status) : new HttpException({ message: 'Directory request failed.' }, 500);",
  );
  source = replace(
    source,
    "class GeneratedController {",
    String.raw`function directoryPrincipal(request: { headers: Record<string, string | string[] | undefined> }) {
  try { const principal = resolvePrincipalContext(request); return { role: principal.roles[0]!, scope: principal.sessionId }; }
  catch { throw new DirectoryMutationError(403, { code: 'directory.forbidden' }); }
}
class GeneratedController {`,
  );
  // Keep the controller decorator immediately above its class, not the helper.
  source = replace(
    source,
    '@Controller("api")\nfunction directoryPrincipal',
    "function directoryPrincipal",
  );
  source = replace(
    source,
    "class GeneratedController {",
    '@Controller("api")\nclass GeneratedController {',
  );
  source = replace(
    source,
    "applicationRuntime.auditLog(roleFrom(request))",
    "applicationRuntime.auditLog(directoryPrincipal(request).role)",
  );
  source = replace(
    source,
    "applicationRuntime.capabilityEvents(roleFrom(request))",
    "applicationRuntime.capabilityEvents(directoryPrincipal(request).role)",
  );
  source = replace(
    source,
    "async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined> })",
    "async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined>; originalUrl?: string; url?: string })",
  );
  source = replace(
    source,
    "try { return await applicationRuntime.list(roleFrom(request, entity, 'read'), entity); }",
    "try { const actor = directoryPrincipal(request); return await applicationRuntime.directoryList(actor.role, entity, new URL(request.originalUrl ?? request.url ?? '/', 'http://directory.local').search); }",
  );
  source = replace(
    source,
    "try { return await applicationRuntime.read(roleFrom(request, entity, 'read'), entity, recordId); }",
    "try { const actor = directoryPrincipal(request); return await applicationRuntime.directoryRead(actor.role, entity, recordId); }",
  );
  source = replace(
    source,
    "try { return await applicationRuntime.create(roleFrom(request, entity, 'create'), entity, body); }",
    "try { const actor = directoryPrincipal(request); return (await applicationRuntime.directoryCommand(actor.role, actor.scope, entity, undefined, 'create', request.headers['x-factory-idempotency-key'], body)).body; }",
  );
  source = replace(
    source,
    "  @Post(':entity/:recordId/events/:event')",
    String.raw`  @Patch(':entity/:recordId')
  async correct(@Param('entity') entity: string, @Param('recordId') recordId: string, @Body() body: unknown, @Req() request: { headers: Record<string, string | string[] | undefined> }) {
    try { const actor = directoryPrincipal(request); return (await applicationRuntime.directoryCommand(actor.role, actor.scope, entity, recordId, 'update', request.headers['x-factory-idempotency-key'], body)).body; } catch (error) { throw rejected(error); }
  }
  @Post(':entity/:recordId/events/:event')
  @HttpCode(200)`,
  );
  source = replace(
    source,
    "try { return await applicationRuntime.transition(roleFrom(request, entity, event), entity, recordId, event, body); }",
    "try { if (!['submit', 'cancel'].includes(event)) throw new DirectoryMutationError(403, { code: 'directory.forbidden' }); const actor = directoryPrincipal(request); return (await applicationRuntime.directoryCommand(actor.role, actor.scope, entity, recordId, event, request.headers['x-factory-idempotency-key'], body)).body; }",
  );
  return source;
}

export function renderDirectoryProxy(
  source: string,
  profile?: ContentDirectoryProfile,
): string {
  if (!profile) return source;
  source = replace(
    source,
    "headers: { 'content-type':",
    "headers: { 'x-factory-idempotency-key': request.headers.get('x-factory-idempotency-key') ?? '', 'content-type':",
  );
  source = replace(
    source,
    "export const POST = proxy;",
    "export const POST = proxy;\nexport const PATCH = proxy;",
  );
  return source;
}
