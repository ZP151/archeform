import type { InventoryOperationsProfile } from "./inventory-operations-contract.js";
import { writeProtectionFragments } from "./mutation-write-protection.js";

function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw Error("Inventory template anchor is unavailable.");
  return source.replace(before, () => after);
}
function protection(profile: InventoryOperationsProfile) {
  const base = writeProtectionFragments("task", profile.graphHash);
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value
        .replaceAll("Task", "Inventory")
        .replaceAll("task", "inventory")
        .replaceAll("idempotencyKey", "keyDigest")
        .replaceAll(
          "inventoryMutationReceipt",
          "factory_InventoryMutationReceipt",
        ),
    ]),
  ) as typeof base;
}
function runtime(source: string, profile: InventoryOperationsProfile): string {
  const fragments = protection(profile);
  source = 'import { createHash } from "node:crypto";\n' + source;
  source = replace(
    source,
    "export interface RecordStore {",
    String.raw`
// factory.generated.inventory-command/v1; factory.generated.inventory-receipt/v1
const inventoryProfile = ${JSON.stringify(profile)} as const;
export type InventoryItem = { id:string; sku:string; name:string; unit:'each'; quantity:number; version:number };
export type InventoryMovement = { id:string; stockItem:string; kind:'receive'|'issue'|'adjust'; delta:number; beforeQuantity:number; afterQuantity:number; itemVersion:number; reason:string; correctionOf:string|null; actorRole:string; recordedAt:string; status:'recorded' };
export type InventoryResponse = InventoryItem | { apiVersion:'factory.generated.inventory-command-result/v1'; item:InventoryItem; movement:InventoryMovement };
export type InventoryQuery = { q:string; offset:number; limit:number };
export type InventoryMutationReceipt = { scope:string; keyDigest:string; requestHash:string; operation:string; recordId:string; responseStatus:number; responseBody:InventoryResponse };
export class InventoryMutationError extends Error { constructor(readonly status:number, readonly body:Record<string,unknown>) { super('Inventory request rejected.'); } }
function failInventory(status:number,code:string):never { throw new InventoryMutationError(status,{code}); }
function plainInventory(value:unknown, keys:readonly string[]):asserts value is Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) failInventory(400,'inventory.invalid_request');
  const own=Reflect.ownKeys(value);
  if(own.length!==keys.length || !keys.every(key=>Object.hasOwn(value,key))) failInventory(400,'inventory.invalid_request');
  for(const key of own) { const d=Object.getOwnPropertyDescriptor(value,key)!; if(typeof key!=='string'||!d.enumerable||!('value' in d)) failInventory(400,'inventory.invalid_request'); }
}
function inventoryText(value:unknown,max:number,multiline=false,empty=false):string {
  if(typeof value!=='string'||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/:/[\u0000-\u001f\u007f-\u009f]/).test(value)) failInventory(400,'inventory.invalid_request');
  const text=value.trim(); if((!empty&&!text)||text.length>max) failInventory(400,'inventory.invalid_request'); return text;
}
function inventoryInteger(value:unknown,min:number,max:number):number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||Object.is(value,-0)||value<min||value>max) failInventory(400,'inventory.invalid_request'); return value;
}
function inventoryId(value:unknown):asserts value is string { if(typeof value!=='string'||!value||value.length>128||/[\u0000-\u001f\u007f-\u009f]/.test(value)) failInventory(404,'inventory.not_found'); }
function inventoryQuery(value:unknown,history=false):InventoryQuery {
  if(typeof value!=='string'||value.length>4096||/%(?![a-f0-9]{2})/i.test(value)) failInventory(400,'inventory.invalid_request');
  try { decodeURIComponent(value.replace(/\+/g,' ')); } catch { failInventory(400,'inventory.invalid_request'); }
  const params=new URLSearchParams(value), seen=new Set<string>();
  for(const [key] of params) { if(!(history?['offset','limit']:['q','offset','limit']).includes(key)||seen.has(key)) failInventory(400,'inventory.invalid_request'); seen.add(key); }
  const integer=(key:string,fallback:number,min:number,max:number)=>{ const text=params.get(key); if(text===null)return fallback; if(!/^(0|[1-9][0-9]*)$/.test(text))failInventory(400,'inventory.invalid_request'); return inventoryInteger(Number(text),min,max); };
  return {q:inventoryText(params.get('q')??'',120,false,true),offset:integer('offset',0,0,10000),limit:integer('limit',20,1,50)};
}
function inventoryItem(record:StoredRecord):InventoryItem { return {id:record.id,sku:record.sku as string,name:record.name as string,unit:'each',quantity:record.quantity as number,version:record.version!}; }
function inventoryMovement(record:StoredRecord):InventoryMovement { return {id:record.id,stockItem:record.stockItemId as string,kind:record.kind as InventoryMovement['kind'],delta:record.delta as number,beforeQuantity:record.beforeQuantity as number,afterQuantity:record.afterQuantity as number,itemVersion:record.itemVersion as number,reason:record.reason as string,correctionOf:(record.correctionOf??null) as string|null,actorRole:record.actorRole as string,recordedAt:record.recordedAt instanceof Date?record.recordedAt.toISOString():record.recordedAt as string,status:'recorded'}; }
${fragments.canonical}
export interface RecordStore {
  listInventory(entity:string,query:InventoryQuery,itemId?:string):Promise<readonly StoredRecord[]>;
  getInventoryReceipt(scope:string,key:string):Promise<InventoryMutationReceipt|undefined>;
  saveInventoryReceipt(receipt:InventoryMutationReceipt):Promise<void>;
  conditionalInventoryUpdate(entity:string,id:string,quantity:number,version:number,values:Record<string,unknown>):Promise<StoredRecord|undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly inventoryReceipts = new Map<string, InventoryMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.inventoryReceipts.clear(); for(const [key,value] of source.inventoryReceipts) this.inventoryReceipts.set(key,structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    fragments.memoryMethods
      .replaceAll("status:string", "quantity:number")
      .replaceAll("current.status!==status", "current.quantity!==quantity") +
      String.raw`
  async listInventory(entity:string,query:InventoryQuery,itemId?:string):Promise<readonly StoredRecord[]> {
    const q=query.q.toLowerCase();
    return [...this.collection(entity).values()].filter(row=>itemId===undefined?(!q||String(row.sku).toLowerCase().includes(q)||String(row.name).toLowerCase().includes(q)):row.stockItemId===itemId).sort((a,b)=>itemId===undefined?String(a.sku).localeCompare(String(b.sku))||a.id.localeCompare(b.id):Number(b.itemVersion)-Number(a.itemVersion)||b.id.localeCompare(a.id)).slice(query.offset,query.offset+query.limit+1).map(row=>structuredClone(row));
  }
  private collection(entityKey:`,
  );
  // The memory adapter is fixture-only, but observes the same SKU constraint and rollback boundary.
  source = replace(
    source,
    "    assertFactoryOwnedRecordIdentityInput(input);",
    "    assertFactoryOwnedRecordIdentityInput(input);\n    if(entityKey===inventoryProfile.itemEntity && [...this.collection(entityKey).values()].some(row=>row.sku===input.sku)) throw Object.assign(new Error('Unique constraint.'),{code:'P2002',meta:{target:['sku']}});",
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    String.raw`export class ApplicationRuntime {
  private async inventoryRole(role:string,entity:string,action:string):Promise<void> {
    if(entity!==inventoryProfile.itemEntity||![inventoryProfile.roles.stockkeeper,inventoryProfile.roles.observer].some(value=>value===role)||(action!=='read'&&role!==inventoryProfile.roles.stockkeeper)||!await enforce(role,entity,action)) failInventory(403,'inventory.forbidden');
  }
  async inventoryList(role:string,entity:string,search:unknown='') {
    await this.inventoryRole(role,entity,'read'); const query=inventoryQuery(search); const records=await this.store.listInventory(entity,query);
    return {apiVersion:'factory.generated.inventory-list/v1' as const,records:records.slice(0,query.limit).map(inventoryItem),offset:query.offset,limit:query.limit,hasMore:records.length>query.limit};
  }
  async inventoryRead(role:string,entity:string,id:string):Promise<InventoryItem> { await this.inventoryRole(role,entity,'read'); inventoryId(id); const record=await this.store.find(entity,id); if(!record)failInventory(404,'inventory.not_found'); return inventoryItem(record); }
  async inventoryHistory(role:string,entity:string,id:string,search:unknown='') {
    await this.inventoryRole(role,entity,'read'); if(role!==inventoryProfile.roles.stockkeeper||!await enforce(role,inventoryProfile.movementEntity,'read'))failInventory(403,'inventory.forbidden');
    inventoryId(id); const query=inventoryQuery(search,true); if(!await this.store.find(entity,id)) failInventory(404,'inventory.not_found');
    const records=await this.store.listInventory(inventoryProfile.movementEntity,query,id);
    return {apiVersion:'factory.generated.inventory-history/v1' as const,records:records.slice(0,query.limit).map(inventoryMovement),offset:query.offset,limit:query.limit,hasMore:records.length>query.limit};
  }
  async inventoryCommand(role:string,actorScope:string,entityKey:string,recordId:string|undefined,operation:string,key:unknown,body:unknown):Promise<{status:number;body:InventoryResponse}> {
    if(!['create','update','receive','issue','adjust'].includes(operation))failInventory(403,'inventory.forbidden');
    await this.inventoryRole(role,entityKey,operation==='create'?'create':'update');
    if(typeof actorScope!=='string'||!actorScope||actorScope.length>512)failInventory(403,'inventory.forbidden');
    const movement=['receive','issue','adjust'].includes(operation);
    if(movement && (!await enforce(role,inventoryProfile.movementEntity,'create')||!await enforce(role,inventoryProfile.movementEntity,'submit')||!await enforce(role,inventoryProfile.movementEntity,'audit')))failInventory(403,'inventory.forbidden');
    if(operation==='create') { if(recordId!==undefined)failInventory(400,'inventory.invalid_request'); } else inventoryId(recordId);
${fragments.validateKey}
    let normalized:Record<string,unknown>;
    if(operation==='create'||operation==='update') {
      plainInventory(body,operation==='create'?['values']:['expectedVersion','values']);
      plainInventory(body.values,operation==='create'?['sku','name']:['name']);
      const values:Record<string,unknown>={name:inventoryText(body.values.name,120)};
      if(operation==='create') { const sku=inventoryText(body.values.sku,40).replace(/[a-z]/g,letter=>letter.toUpperCase()); if(!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(sku))failInventory(400,'inventory.invalid_request'); values.sku=sku; }
      normalized={values,...(operation==='update'?{expectedVersion:inventoryInteger(body.expectedVersion,0,2147483646)}:{})};
    } else {
      plainInventory(body,operation==='adjust'?['expectedVersion','delta','reason','correctionOf']:['expectedVersion','quantity','reason']);
      const expectedVersion=inventoryInteger(body.expectedVersion,0,2147483646),reason=inventoryText(body.reason,280,true);
      if(operation==='adjust') { const delta=inventoryInteger(body.delta,-1000000000,1000000000); if(delta===0)failInventory(400,'inventory.invalid_request'); if(body.correctionOf!==null && (typeof body.correctionOf!=='string'||!body.correctionOf||body.correctionOf.length>128||/[\u0000-\u001f\u007f-\u009f]/.test(body.correctionOf)))failInventory(400,'inventory.invalid_request'); normalized={expectedVersion,delta,reason,correctionOf:body.correctionOf}; }
      else normalized={expectedVersion,quantity:inventoryInteger(body.quantity,1,1000000000),reason};
    }
${fragments.identity}
${fragments.replay}
${fragments.transactionStart}
      let record:StoredRecord; let responseBody:InventoryResponse; const responseStatus=operation==='update'?200:201;
      if(operation==='create') { record=await store.create(entityKey,{...(normalized.values as Record<string,unknown>),quantity:0,unit:'each',version:0}); responseBody=inventoryItem(record); }
      else {
        const current=await store.find(entityKey,recordId!); if(!current)failInventory(404,'inventory.not_found');
        if(!Number.isSafeInteger(current.quantity)||Object.is(current.quantity,-0)||Number(current.quantity)<0||Number(current.quantity)>1000000000||!Number.isSafeInteger(current.version)||Object.is(current.version,-0)||current.version!<0||current.version!>2147483647)failInventory(500,'inventory.internal_error');
        if(current.version===2147483647)failInventory(409,'inventory.version_limit');
        if(current.version!==normalized.expectedVersion)failInventory(409,'inventory.version_conflict');
        const before=current.quantity as number;
        const delta=movement?(operation==='adjust'?normalized.delta as number:(normalized.quantity as number)*(operation==='issue'?-1:1)):0;
        const quantity=before+delta;
        if(quantity<0)failInventory(409,'inventory.insufficient_stock'); if(quantity>1000000000)failInventory(409,'inventory.quantity_limit');
        if(movement && normalized.correctionOf!==undefined && normalized.correctionOf!==null) { const correction=await store.find(inventoryProfile.movementEntity,normalized.correctionOf as string); if(!correction||correction.stockItemId!==recordId||correction.status!=='recorded')failInventory(404,'inventory.not_found'); }
        const updated=await store.conditionalInventoryUpdate(entityKey,current.id,before,current.version!,{...(operation==='update'?normalized.values as Record<string,unknown>:{}),quantity,version:current.version!+1});
        if(!updated)failInventory(409,'inventory.version_conflict'); record=updated;
        if(movement) {
          const entry=await store.create(inventoryProfile.movementEntity,{stockItemId:record.id,kind:operation,delta,beforeQuantity:before,afterQuantity:quantity,itemVersion:record.version,reason:normalized.reason,correctionOf:normalized.correctionOf??null,actorRole:role,recordedAt:new Date().toISOString(),status:'recorded',version:1});
          const flow=this.flow(inventoryProfile.movementEntity); const transition=flow?.transitions.find(value=>value.event==='submit'&&value.from==='draft'&&value.to==='recorded');
          if(!transition||transition.effects?.length!==1||transition.effects[0]?.capability!=='audit.record'||transition.effects[0]?.operation!=='record')failInventory(500,'inventory.internal_error');
          await this.executeEffects(role,inventoryProfile.movementEntity,entry.id,transition.effects,store);
          responseBody={apiVersion:'factory.generated.inventory-command-result/v1',item:inventoryItem(record),movement:inventoryMovement(entry)};
        } else responseBody=inventoryItem(record);
      }
      if(!movement)await store.appendAudit({actor:role,action:operation,entity:entityKey,recordId:record.id,at:new Date().toISOString()});
${fragments.saveReceipt}
      return {status:responseStatus,body:responseBody};
    });
    for(let attempt=0;attempt<4;attempt++) {
      try { return await run(); } catch(error) {
        if(error instanceof InventoryMutationError)throw error;
        const failure=error as {code?:string;meta?:{target?:unknown}};
        if(failure.code==='P2002' && ((Array.isArray(failure.meta?.target)&&failure.meta.target.includes('sku'))||(typeof failure.meta?.target==='string'&&failure.meta.target.endsWith('_sku_key')))) {
          let receipt:InventoryMutationReceipt|undefined; try { receipt=await this.store.getInventoryReceipt(scope,storedIdempotencyKey); } catch { failInventory(500,'inventory.internal_error'); }
          if(receipt)return replay(receipt); failInventory(409,'inventory.sku_conflict');
        }
        if(['P2002','P2034'].includes(failure.code??'')) { if(attempt<3)continue; failInventory(409,'inventory.retry_required'); }
        failInventory(500,'inventory.internal_error');
      }
    }
    return failInventory(409,'inventory.retry_required');
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
    const start = source.indexOf("export class ApplicationRuntime");
    const match = new RegExp("  async " + method + "\\([^]*?\\n  }").exec(
      source.slice(start),
    );
    if (!match) throw Error("Inventory runtime method unavailable.");
    let signature = match[0].split("\n")[0]!;
    const body =
      method === "list"
        ? "return this.inventoryList(role,entityKey);"
        : method === "read"
          ? "return this.inventoryRead(role,entityKey,recordId);"
          : "failInventory(403,'inventory.forbidden');";
    if (method === "list")
      signature = signature.replace(
        "Promise<readonly StoredRecord[]>",
        "ReturnType<ApplicationRuntime['inventoryList']>",
      );
    if (method === "read")
      signature = signature.replace(
        "Promise<StoredRecord>",
        "Promise<InventoryItem>",
      );
    source = replace(source, match[0], signature + "\n    " + body + "\n  }");
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

function prisma(source: string, profile: InventoryOperationsProfile): string {
  const fragments = protection(profile);
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "InventoryQuery, InventoryMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "  findMany(): Promise<unknown[]>;",
    "  findMany(input?:Record<string,unknown>): Promise<unknown[]>;\n  updateMany(input:{where:Record<string,unknown>;data:Record<string,unknown>}):Promise<{count:number}>;",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    fragments.prismaMethods
      .replaceAll("status:string", "quantity:number")
      .replaceAll("{id,status,version}", "{id,quantity,version}") +
      String.raw`
  async listInventory(entity:string,query:InventoryQuery,itemId?:string):Promise<readonly StoredRecord[]> {
    const literal=query.q.replace(/[\\%_]/g,'\\$&');
    const where=itemId===undefined?(literal?{OR:[{sku:{contains:literal,mode:'insensitive'}},{name:{contains:literal,mode:'insensitive'}}]}:{}):{stockItemId:itemId};
    const orderBy=itemId===undefined?[{sku:'asc'},{id:'asc'}]:[{itemVersion:'desc'},{id:'desc'}];
    const select=itemId===undefined?{id:true,sku:true,name:true,unit:true,quantity:true,version:true}:{id:true,stockItemId:true,kind:true,delta:true,beforeQuantity:true,afterQuantity:true,itemVersion:true,reason:true,correctionOf:true,actorRole:true,recordedAt:true,status:true};
    return (await this.delegate(entity).findMany({where,orderBy,skip:query.offset,take:query.limit+1,select})).map(asStoredRecord);
  }
`,
  );
  source = replace(
    source,
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>, options:{isolationLevel:'Serializable'}): Promise<T> };",
  );
  source = replace(
    source,
    "operation(new PrismaRecordStore(client)));",
    "operation(new PrismaRecordStore(client)),{isolationLevel:'Serializable'});",
  );
  return source;
}

function api(source: string, profile: InventoryOperationsProfile): string {
  source = replace(
    source,
    "Param, Post, Req",
    "Param, Post, Patch, HttpCode, Req",
  );
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, InventoryMutationError }",
  );
  source = replace(
    source,
    "  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "  return error instanceof InventoryMutationError ? new HttpException(error.body,error.status) : new HttpException({code:'inventory.internal_error'},500);",
  );
  const start = source.indexOf('@Controller("api")');
  const end = source.indexOf("@Module(", start);
  if (start < 0 || end < 0)
    throw Error("Inventory controller anchor unavailable.");
  source =
    source.slice(0, start) +
    String.raw`
type InventoryRequest = {headers:Record<string,string|string[]|undefined>;originalUrl?:string;url?:string};
function inventoryPrincipal(request:InventoryRequest) { try { const principal=resolvePrincipalContext(request); return {role:principal.roles[0]??'',actorScope:principal.sessionId}; } catch { throw new InventoryMutationError(403,{code:'inventory.forbidden'}); } }
function inventorySearch(request:InventoryRequest):string { const url=request.originalUrl??request.url??''; const offset=url.indexOf('?'); return offset<0?'':url.slice(offset+1); }
@Controller('api')
class GeneratedController {
  @Get('health') async health(@Req() request:InventoryRequest) { if(${profile.itemEntity === "health"} && Object.hasOwn(request.headers,'x-factory-fixture-session'))return this.list('health',request); return {status:'ok'}; }
  @Get('audit') async audit(@Req() request:InventoryRequest) { if(${profile.itemEntity === "audit"})return this.list('audit',request); throw new HttpException({code:'inventory.forbidden'},403); }
  @Get('capability-events') async capabilityEvents(@Req() request:InventoryRequest) { if(${profile.itemEntity === "capability-events"})return this.list('capability-events',request); throw new HttpException({code:'inventory.forbidden'},403); }
  @Get(':entity') async list(@Param('entity') entity:string,@Req() request:InventoryRequest) { try { const principal=inventoryPrincipal(request); return await applicationRuntime.inventoryList(principal.role,entity,inventorySearch(request)); } catch(error) {throw rejected(error);} }
  @Get(':entity/:recordId') async read(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:InventoryRequest) { try { const principal=inventoryPrincipal(request); return await applicationRuntime.inventoryRead(principal.role,entity,id); } catch(error) {throw rejected(error);} }
  @Get(':entity/:recordId/movements') async history(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:InventoryRequest) { try { const principal=inventoryPrincipal(request); return await applicationRuntime.inventoryHistory(principal.role,entity,id,inventorySearch(request)); } catch(error) {throw rejected(error);} }
  private async command(entity:string,id:string|undefined,operation:string,body:unknown,request:InventoryRequest) { try { const principal=inventoryPrincipal(request); return (await applicationRuntime.inventoryCommand(principal.role,principal.actorScope,entity,id,operation,request.headers['x-factory-idempotency-key'],body)).body; } catch(error) {throw rejected(error);} }
  @Post(':entity') @HttpCode(201) async create(@Param('entity') entity:string,@Body() body:unknown,@Req() request:InventoryRequest) { return this.command(entity,undefined,'create',body,request); }
  @Patch(':entity/:recordId') @HttpCode(200) async update(@Param('entity') entity:string,@Param('recordId') id:string,@Body() body:unknown,@Req() request:InventoryRequest) { return this.command(entity,id,'update',body,request); }
  @Post(':entity/:recordId/movements/receive') @HttpCode(201) async receive(@Param('entity') entity:string,@Param('recordId') id:string,@Body() body:unknown,@Req() request:InventoryRequest) { return this.command(entity,id,'receive',body,request); }
  @Post(':entity/:recordId/movements/issue') @HttpCode(201) async issue(@Param('entity') entity:string,@Param('recordId') id:string,@Body() body:unknown,@Req() request:InventoryRequest) { return this.command(entity,id,'issue',body,request); }
  @Post(':entity/:recordId/movements/adjust') @HttpCode(201) async adjust(@Param('entity') entity:string,@Param('recordId') id:string,@Body() body:unknown,@Req() request:InventoryRequest) { return this.command(entity,id,'adjust',body,request); }
  @Post(':entity/:recordId/events/:event') async transition() { throw new HttpException({code:'inventory.forbidden'},403); }
}

` +
    source.slice(end);
  return source;
}

const receiptSchema = `model Factory_InventoryMutationReceipt {
  id String @id @default(cuid())
  scope String
  keyDigest String
  requestHash String
  operation String
  recordId String
  responseStatus Int
  responseBody Json
  createdAt DateTime @default(now())
  @@unique([scope, keyDigest])
}`;
const receiptMigration = `CREATE TABLE "Factory_InventoryMutationReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "scope" TEXT NOT NULL,
 "keyDigest" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "operation" TEXT NOT NULL,
 "recordId" TEXT NOT NULL,
 "responseStatus" INTEGER NOT NULL,
 "responseBody" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Factory_InventoryMutationReceipt_scope_keyDigest_key" ON "Factory_InventoryMutationReceipt" ("scope","keyDigest");`;

/** Private, exact-profile-only adapter. Other product bytes pass through unchanged. */
export function renderInventoryFile(
  path: string,
  source: string,
  profile?: InventoryOperationsProfile,
): string {
  if (!profile) return source;
  if (path === "api/src/application-runtime.ts")
    return runtime(source, profile);
  if (path === "api/src/prisma-record-store.ts") return prisma(source, profile);
  if (path === "api/src/main.ts") return api(source, profile);
  if (path === "web/app/api/[...path]/route.ts") {
    source = replace(
      source,
      "headers: { 'content-type':",
      "headers: { 'x-factory-idempotency-key': request.headers.get('x-factory-idempotency-key') ?? '', 'content-type':",
    );
    if (!source.includes("export const PATCH"))
      source += "\nexport const PATCH = proxy;\n";
    return source;
  }
  const model = (key: string) =>
    key
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part[0]!.toUpperCase() + part.slice(1))
      .join("");
  const item = model(profile.itemEntity),
    movement = model(profile.movementEntity);
  if (path.endsWith("/schema.prisma")) {
    source = replace(
      source,
      "model " + item + " {",
      "model " + item + " {\n  version Int @default(0)",
    );
    source = replace(
      source,
      "model " + movement + " {",
      "model " + movement + " {\n  version Int @default(0)",
    );
    source = replace(
      source,
      "@@index([stockItemId, itemVersion])",
      '@@unique([stockItemId, itemVersion], map: "' + movement + '_1_idx")',
    );
    return source + "\n" + receiptSchema + "\n";
  }
  if (path.endsWith("/migration.sql")) {
    for (const name of [item, movement])
      source = replace(
        source,
        'CREATE TABLE "' + name + '" (',
        'CREATE TABLE "' +
          name +
          '" (\n  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" BETWEEN 0 AND 2147483647),',
      );
    const checks =
      '\nALTER TABLE "' +
      item +
      '" ADD CONSTRAINT "' +
      item +
      '_stock_bounds" CHECK ("quantity" BETWEEN 0 AND 1000000000 AND "unit" = \'each\');\n' +
      'ALTER TABLE "' +
      movement +
      '" ADD CONSTRAINT "' +
      movement +
      '_movement_bounds" CHECK ("delta" BETWEEN -1000000000 AND 1000000000 AND "delta" <> 0 AND "beforeQuantity" BETWEEN 0 AND 1000000000 AND "afterQuantity" BETWEEN 0 AND 1000000000 AND "itemVersion" BETWEEN 1 AND 2147483647 AND "afterQuantity" = "beforeQuantity" + "delta" AND "status" = \'recorded\' AND (("kind" = \'receive\' AND "delta" > 0) OR ("kind" = \'issue\' AND "delta" < 0) OR "kind" = \'adjust\'));\n';
    return source + "\n" + receiptMigration + checks;
  }
  return source;
}
