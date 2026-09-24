import type { ServiceWorkOrdersProfile } from "./service-work-orders-contract.js";
import { writeProtectionFragments } from "./mutation-write-protection.js";

type FixtureSession = {
  readonly principalId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly expiresAt: string;
};
function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw Error("Work Orders template anchor is unavailable.");
  return source.replace(before, () => after);
}
function protection(profile: ServiceWorkOrdersProfile) {
  const base = writeProtectionFragments("task", profile.graphHash);
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value
        .replaceAll("Task", "WorkOrder")
        .replaceAll("task", "work_order")
        .replaceAll("work_orderReceipts", "workOrderReceipts")
        .replaceAll("idempotencyKey", "keyDigest")
        .replaceAll(
          "work_orderMutationReceipt",
          "factory_WorkOrderMutationReceipt",
        ),
    ]),
  ) as typeof base;
}
function runtime(
  source: string,
  profile: ServiceWorkOrdersProfile,
  sessions: readonly FixtureSession[],
): string {
  const f = protection(profile);
  source =
    'import { createHash } from "node:crypto";\nimport { resolveFixturePrincipal, authorizeDeclaredAction, type LocalPrincipalContext } from "./capabilities/core.identity-policy.js";\n' +
    source;
  source = replace(
    source,
    "export interface RecordStore {",
    String.raw`
// factory.generated.work-order-mutation/v1; factory.generated.work-order-mutation-receipt/v1
const workOrderProfile = ${JSON.stringify(profile)} as const;
const workOrderSessions:readonly LocalPrincipalContext[] = ${JSON.stringify(sessions)};
const workOrderNow = '2026-01-01T00:00:00.000Z';
const metadataKeys = ['title','serviceLocation','priority','description','dueDate'] as const;
const workOrderStatuses = ['open','in-progress','resolved','cancelled'] as const;
export type WorkOrder = {id:string;version:number;title:string;serviceLocation:string;priority:string;description:string|null;dueDate:string|null;status:string;assigneePrincipalId:string|null};
export type WorkOrderMutationReceipt = {scope:string;keyDigest:string;requestHash:string;operation:string;recordId:string;responseStatus:number;responseBody:WorkOrder};
export type WorkOrderQuery = {limit:number;status?:string;assigneePrincipalId?:string;afterId?:string;beforeVersion?:number};
export class WorkOrderMutationError extends Error { constructor(readonly status:number,readonly body:{code:string}) {super('Work order request rejected.');} }
function failWorkOrder(status:number,code:string):never {throw new WorkOrderMutationError(status,{code});}
function plainWorkOrder(value:unknown,required:readonly string[],optional:readonly string[]=[]):asserts value is Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))failWorkOrder(400,'work_order.invalid_request');
 if(!required.every(key=>Object.hasOwn(value,key)))failWorkOrder(400,'work_order.invalid_request');
 for(const key of Reflect.ownKeys(value)) {const d=Object.getOwnPropertyDescriptor(value,key)!;if(typeof key!=='string'||![...required,...optional].includes(key)||!d.enumerable||!('value' in d))failWorkOrder(400,'work_order.invalid_request');}
}
function workOrderText(value:unknown,max:number,multiline=false,empty=false):string {
 if(typeof value!=='string'||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/:/[\u0000-\u001f\u007f-\u009f]/).test(value))failWorkOrder(400,'work_order.invalid_request');
 const result=value.trim();if((!empty&&!result)||result.length>max)failWorkOrder(400,'work_order.invalid_request');return result;
}
function workOrderInteger(value:unknown):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||Object.is(value,-0)||value<0||value>2147483647)failWorkOrder(400,'work_order.invalid_request');return value;}
function workOrderId(value:unknown):asserts value is string {if(typeof value!=='string'||!value||value.length>128||/[\u0000-\u0020\u007f-\u009f]/.test(value))failWorkOrder(404,'work_order.not_found');}
function workOrderDate(value:unknown):string|null {if(value===null)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00.000Z'))||new Date(value+'T00:00:00.000Z').toISOString().slice(0,10)!==value)failWorkOrder(400,'work_order.invalid_request');return value;}
function workOrderMetadata(value:unknown,create=false):Record<string,unknown> {
 plainWorkOrder(value,create?['title','serviceLocation','priority']:metadataKeys,create?['description','dueDate']:[]);
 if(!['low','medium','high'].includes(value.priority as string))failWorkOrder(400,'work_order.invalid_request');
 return {title:workOrderText(value.title,160),serviceLocation:workOrderText(value.serviceLocation,160),priority:value.priority,description:value.description===null||(create&&!Object.hasOwn(value,'description'))?null:workOrderText(value.description,2000,true,true),dueDate:workOrderDate(create&&!Object.hasOwn(value,'dueDate')?null:value.dueDate)};
}
function workOrderQuery(search:unknown,history=false):WorkOrderQuery {
 if(typeof search!=='string'||search.length>4096||/%(?![a-f0-9]{2})/i.test(search))failWorkOrder(400,'work_order.invalid_request');
 try{decodeURIComponent(search.replace(/\+/g,' '));}catch{failWorkOrder(400,'work_order.invalid_request');}
 const params=new URLSearchParams(search),seen=new Set<string>();
 for(const [key] of params){if(!(history?['limit','beforeVersion']:['limit','status','assigneePrincipalId','afterId']).includes(key)||seen.has(key))failWorkOrder(400,'work_order.invalid_request');seen.add(key);}
 const number=(key:string)=>{const raw=params.get(key)!;if(!/^(0|[1-9][0-9]*)$/.test(raw))failWorkOrder(400,'work_order.invalid_request');return workOrderInteger(Number(raw));};
 const limit=params.has('limit')?number('limit'):50;if(limit<1||limit>50)failWorkOrder(400,'work_order.invalid_request');
 const query:WorkOrderQuery={limit};
 if(params.has('beforeVersion'))query.beforeVersion=number('beforeVersion');
 if(params.has('status')){const status=params.get('status')!;if(!workOrderStatuses.some(v=>v===status))failWorkOrder(400,'work_order.invalid_request');query.status=status;}
 for(const key of ['assigneePrincipalId','afterId'] as const)if(params.has(key)){const value=params.get(key)!;if(!value||value.length>128||/[\u0000-\u0020\u007f-\u009f]/.test(value))failWorkOrder(400,'work_order.invalid_request');query[key]=value;}
 return query;
}
function workOrderScalar(value:unknown,date=false):string|null {if(value===null||value===undefined)return null;return value instanceof Date?(date?value.toISOString().slice(0,10):value.toISOString()):String(value);}
function workOrderRecord(row:StoredRecord):WorkOrder {return {id:row.id,version:row.version!,title:row.title as string,serviceLocation:row.serviceLocation as string,priority:row.priority as string,description:workOrderScalar(row.description),dueDate:workOrderScalar(row.dueDate,true),status:row.status!,assigneePrincipalId:workOrderScalar(row.assigneePrincipalId)};}
function workOrderHistoryEntry(row:StoredRecord):Record<string,unknown> {
 const result:Record<string,unknown>={apiVersion:'factory.generated.work-order-history-entry/v1',id:row.id,workOrder:row.workOrderId,action:row.action,orderVersion:row.orderVersion,toStatus:row.toStatus,actorPrincipalId:row.actorPrincipalId,actorRole:row.actorRole,recordedAt:workOrderScalar(row.recordedAt),fromStatus:row.fromStatus??null,fromAssigneePrincipalId:row.fromAssigneePrincipalId??null,toAssigneePrincipalId:row.toAssigneePrincipalId??null,note:row.note??null};
 for(const key of metadataKeys)for(const prefix of ['before','after']){const name=prefix+key[0]!.toUpperCase()+key.slice(1);result[name]=workOrderScalar(row[name],key==='dueDate');}return result;
}
function workOrderPrincipal(input:LocalPrincipalContext):LocalPrincipalContext {
 if(!input||typeof input!=='object')failWorkOrder(403,'work_order.forbidden');
 const fixture=workOrderSessions.find(p=>p.sessionId===input.sessionId);
 if(!fixture||fixture.principalId!==input.principalId||fixture.tenantId!==input.tenantId||input.roles?.length!==1||fixture.roles[0]!==input.roles[0]||fixture.expiresAt!==input.expiresAt||!resolveFixturePrincipal(input,workOrderNow))failWorkOrder(403,'work_order.forbidden');return fixture;
}
function workOrderVisible(principal:LocalPrincipalContext,row:StoredRecord|undefined):asserts row is StoredRecord {if(!row||(principal.roles[0]===workOrderProfile.roles.technician&&row.assigneePrincipalId!==principal.principalId))failWorkOrder(404,'work_order.not_found');}
${f.canonical}
export interface RecordStore {
 listWorkOrders(entity:string,query:WorkOrderQuery,assignee?:string,orderId?:string,action?:string):Promise<readonly StoredRecord[]>;
 getWorkOrderReceipt(scope:string,key:string):Promise<WorkOrderMutationReceipt|undefined>;
 saveWorkOrderReceipt(receipt:WorkOrderMutationReceipt):Promise<void>;
 conditionalWorkOrderUpdate(entity:string,id:string,status:string,version:number,assigneePrincipalId:string|null,values:Record<string,unknown>):Promise<StoredRecord|undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly workOrderReceipts = new Map<string,WorkOrderMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.workOrderReceipts.clear();for(const [key,value] of source.workOrderReceipts)this.workOrderReceipts.set(key,structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    f.memoryMethods
      .replace(
        "version:number,values:",
        "version:number,assigneePrincipalId:string|null,values:",
      )
      .replace(
        "current.version!==version",
        "current.version!==version || (current.assigneePrincipalId??null)!==assigneePrincipalId",
      ) +
      String.raw`
 async listWorkOrders(entity:string,query:WorkOrderQuery,assignee?:string,orderId?:string,action?:string):Promise<readonly StoredRecord[]> {
  return [...this.collection(entity).values()].filter(row=>orderId!==undefined?row.workOrderId===orderId&&(query.beforeVersion===undefined||Number(row.orderVersion)<query.beforeVersion)&&(action===undefined||row.action===action):(assignee===undefined||row.assigneePrincipalId===assignee)&&(query.assigneePrincipalId===undefined||row.assigneePrincipalId===query.assigneePrincipalId)&&(query.status===undefined||row.status===query.status)&&(query.afterId===undefined||row.id>query.afterId)).sort((a,b)=>orderId===undefined?(a.id<b.id?-1:a.id>b.id?1:0):Number(b.orderVersion)-Number(a.orderVersion)).slice(0,query.limit+1).map(row=>structuredClone(row));
 }
 private collection(entityKey:`,
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    String.raw`export class ApplicationRuntime {
 private async workOrderRole(input:LocalPrincipalContext,entity:string,action:string):Promise<LocalPrincipalContext> {
  const principal=workOrderPrincipal(input),role=principal.roles[0]!;
  const rules=definition.permissions.flatMap(p=>p.actions.map(action=>({role:p.role,resource:p.resource,action})));
  if(entity!==workOrderProfile.orderEntity||!authorizeDeclaredAction({principal,resource:entity,action,rules,tenantId:workOrderSessions[0]!.tenantId,now:workOrderNow}).allowed||!await enforce(role,entity,action))failWorkOrder(403,'work_order.forbidden');return principal;
 }
 async workOrderAssignees(input:LocalPrincipalContext) {const principal=await this.workOrderRole(input,workOrderProfile.orderEntity,'assign');if(principal.roles[0]!==workOrderProfile.roles.dispatcher)failWorkOrder(403,'work_order.forbidden');return workOrderSessions.filter(p=>p.roles[0]===workOrderProfile.roles.technician).map((p,index)=>({principalId:p.principalId,displayName:index===0?'Technician A':'Technician B'}));}
 async workOrderList(input:LocalPrincipalContext,entity:string,search:unknown='') {
  const principal=await this.workOrderRole(input,entity,'read'),query=workOrderQuery(search);
  const rows=await this.store.listWorkOrders(entity,query,principal.roles[0]===workOrderProfile.roles.technician?principal.principalId:undefined);
  const items=rows.slice(0,query.limit).map(workOrderRecord);return {items,nextAfterId:rows.length>query.limit?items.at(-1)!.id:null};
 }
 async workOrderRead(input:LocalPrincipalContext,entity:string,id:string) {
  const principal=await this.workOrderRole(input,entity,'read');workOrderId(id);
  return this.store.inTransaction(async store=>{const row=await store.find(entity,id);workOrderVisible(principal,row);
   const reports=await store.listWorkOrders(workOrderProfile.historyEntity,{limit:1},undefined,id,'resolve');
   return {...workOrderRecord(row),latestResolution:reports[0]?{...workOrderHistoryEntry(reports[0]),historical:row.status!=='resolved'}:null};});
 }
 async workOrderHistory(input:LocalPrincipalContext,entity:string,id:string,search:unknown='') {
  const principal=await this.workOrderRole(input,entity,'read');workOrderId(id);const query=workOrderQuery(search,true);
  if(!await enforce(principal.roles[0]!,workOrderProfile.historyEntity,'read'))failWorkOrder(403,'work_order.forbidden');
  return this.store.inTransaction(async store=>{workOrderVisible(principal,await store.find(entity,id));const rows=await store.listWorkOrders(workOrderProfile.historyEntity,query,undefined,id),items=rows.slice(0,query.limit).map(workOrderHistoryEntry);return {items,nextBeforeVersion:rows.length>query.limit?items.at(-1)!.orderVersion:null};});
 }
 async workOrderCommand(input:LocalPrincipalContext,entityKey:string,recordId:string|undefined,operation:string,key:unknown,body:unknown):Promise<{status:number;body:WorkOrder}> {
  if(!['create','update','assign','reassign','start','resolve','reopen','cancel'].includes(operation))failWorkOrder(403,'work_order.forbidden');
  const principal=await this.workOrderRole(input,entityKey,operation),role=principal.roles[0]!,actorScope=JSON.stringify([principal.tenantId,principal.principalId]);
  if(operation==='create'){if(recordId!==undefined)failWorkOrder(400,'work_order.invalid_request');}else workOrderId(recordId);
${f.validateKey}
  let normalized:Record<string,unknown>;
  if(operation==='create'){plainWorkOrder(body,['values']);normalized={values:workOrderMetadata(body.values,true)};}
  else {
   const fields=operation==='update'?['expectedVersion','reason','values']:operation==='assign'?['expectedVersion','assigneePrincipalId']:operation==='reassign'?['expectedVersion','assigneePrincipalId','reason']:operation==='resolve'?['expectedVersion','resolutionNote']:['reopen','cancel'].includes(operation)?['expectedVersion','reason']:['expectedVersion'];
   plainWorkOrder(body,fields);normalized={expectedVersion:workOrderInteger(body.expectedVersion)};
   if(fields.includes('reason'))normalized.reason=workOrderText(body.reason,500,true);
   if(fields.includes('resolutionNote'))normalized.resolutionNote=workOrderText(body.resolutionNote,2000,true);
   if(fields.includes('values'))normalized.values=workOrderMetadata(body.values);
   if(fields.includes('assigneePrincipalId')){const assignee=workOrderText(body.assigneePrincipalId,128);if(!workOrderSessions.some(p=>p.principalId===assignee&&p.tenantId===principal.tenantId&&p.roles[0]===workOrderProfile.roles.technician))failWorkOrder(400,'work_order.invalid_request');normalized.assigneePrincipalId=assignee;}
  }
${f.identity}
${f.replay}
  const run=()=>this.store.inTransaction(async store=>{
   // Authorization precedes every receipt lookup, including transaction retries.
   const current=recordId===undefined?undefined:await store.find(entityKey,recordId);
   if(recordId!==undefined)workOrderVisible(principal,current);
   const existing=await store.getWorkOrderReceipt(scope,storedIdempotencyKey);if(existing)return replay(existing);
   let record:StoredRecord;
   if(operation==='create')record=await store.create(entityKey,{...normalized.values as Record<string,unknown>,status:'open',assigneePrincipalId:null,version:0});
   else {
    if(!current)failWorkOrder(404,'work_order.not_found');
    if(!Number.isSafeInteger(current.version)||current.version!<0||current.version!>2147483647)failWorkOrder(500,'work_order.internal_error');
    if(current.version===2147483647)failWorkOrder(409,'work_order.version_exhausted');
    if(current.version!==normalized.expectedVersion)failWorkOrder(409,'work_order.version_conflict');
    const active=current.status==='open'||current.status==='in-progress';
    const allowed=operation==='update'?active:operation==='assign'?current.status==='open'&&current.assigneePrincipalId===null:operation==='reassign'?active&&current.assigneePrincipalId!==null&&current.assigneePrincipalId!==normalized.assigneePrincipalId:operation==='start'?current.status==='open':operation==='resolve'?current.status==='in-progress':operation==='reopen'?current.status==='resolved':operation==='cancel'?active:false;
    if(!allowed)failWorkOrder(409,'work_order.state_conflict');
    if(operation==='update'&&metadataKeys.every(k=>workOrderRecord(current)[k]===(normalized.values as Record<string,unknown>)[k]))failWorkOrder(400,'work_order.invalid_request');
    const values:Record<string,unknown>={...(operation==='update'?normalized.values as Record<string,unknown>:{}),...(operation==='assign'||operation==='reassign'?{assigneePrincipalId:normalized.assigneePrincipalId}:{}),status:operation==='start'?'in-progress':operation==='resolve'?'resolved':operation==='reopen'?'open':operation==='cancel'?'cancelled':current.status,version:current.version!+1};
    const updated=await store.conditionalWorkOrderUpdate(entityKey,current.id,current.status!,current.version!,current.assigneePrincipalId as string|null,values);if(!updated)failWorkOrder(409,'work_order.version_conflict');record=updated;
   }
   const entry:Record<string,unknown>={workOrderId:record.id,action:operation,orderVersion:record.version,fromStatus:current?.status??null,toStatus:record.status,fromAssigneePrincipalId:current?.assigneePrincipalId??null,toAssigneePrincipalId:record.assigneePrincipalId??null,actorPrincipalId:principal.principalId,actorRole:role,recordedAt:new Date().toISOString(),note:normalized.reason??normalized.resolutionNote??null};
   for(const k of metadataKeys){const suffix=k[0]!.toUpperCase()+k.slice(1);entry['before'+suffix]=operation==='update'?workOrderRecord(current!)[k]:null;entry['after'+suffix]=['create','update'].includes(operation)?workOrderRecord(record)[k]:null;}
   await store.create(workOrderProfile.historyEntity,entry);
   await store.appendAudit({actor:principal.principalId,action:operation,entity:entityKey,recordId:record.id,at:entry.recordedAt as string});
   const responseStatus=operation==='create'?201:200,responseBody=workOrderRecord(record);
${f.saveReceipt}
   return {status:responseStatus,body:responseBody};
  });
  for(let attempt=0;attempt<4;attempt++){try{return await run();}catch(error){if(error instanceof WorkOrderMutationError)throw error;if(['P2002','P2034'].includes((error as {code?:string})?.code??'')){if(attempt<3)continue;failWorkOrder(409,'work_order.retryable_conflict');}failWorkOrder(500,'work_order.internal_error');}}
  return failWorkOrder(409,'work_order.retryable_conflict');
 }
`,
  );
  // Generic entry points cannot bypass the principal-aware family boundary.
  for (const method of [
    "list",
    "read",
    "create",
    "transition",
    "auditLog",
    "capabilityEvents",
  ]) {
    const match = new RegExp("  async " + method + "\\([^]*?\\n  }").exec(
      source.slice(source.indexOf("export class ApplicationRuntime")),
    );
    if (!match) throw Error("Work Orders runtime method unavailable.");
    source = replace(
      source,
      match[0],
      match[0].split("\n")[0] +
        "\n    failWorkOrder(403,'work_order.forbidden');\n  }",
    );
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

function prisma(source: string, profile: ServiceWorkOrdersProfile): string {
  const f = protection(profile);
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "WorkOrderQuery, WorkOrderMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "  findMany(): Promise<unknown[]>;",
    "  findMany(input?:Record<string,unknown>):Promise<unknown[]>;\n  updateMany(input:{where:Record<string,unknown>;data:Record<string,unknown>}):Promise<{count:number}>;",
  );
  // Normalize date-only Graph values for Prisma, and back to date-only API values.
  source = replace(
    source,
    "function asStoredRecord(value: unknown): StoredRecord { return value as StoredRecord; }",
    String.raw`function asStoredRecord(value:unknown):StoredRecord {return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,v])=>[key,v instanceof Date?(key.endsWith('DueDate')||key==='dueDate'?v.toISOString().slice(0,10):v.toISOString()):v])) as StoredRecord;}
function workOrderStorage(values:Record<string,unknown>):Record<string,unknown> {return Object.fromEntries(Object.entries(values).map(([key,v])=>[key,typeof v==='string'&&(key==='dueDate'||key.endsWith('DueDate'))?new Date(v+'T00:00:00.000Z'):key==='recordedAt'&&typeof v==='string'?new Date(v):v]));}`,
  );
  source = replace(
    source,
    "create({ data: input })",
    "create({ data: workOrderStorage(input) })",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    f.prismaMethods
      .replace(
        "version:number,values:",
        "version:number,assigneePrincipalId:string|null,values:",
      )
      .replace(
        "{id,status,version},data:values",
        "{id,status,version,assigneePrincipalId},data:workOrderStorage(values)",
      ) +
      String.raw`
 async listWorkOrders(entity:string,query:WorkOrderQuery,assignee?:string,orderId?:string,action?:string):Promise<readonly StoredRecord[]> {
  const where=orderId!==undefined?{workOrderId:orderId,...(query.beforeVersion===undefined?{}:{orderVersion:{lt:query.beforeVersion}}),...(action===undefined?{}:{action})}:{AND:[...(assignee===undefined?[]:[{assigneePrincipalId:assignee}]),...(query.assigneePrincipalId===undefined?[]:[{assigneePrincipalId:query.assigneePrincipalId}]),...(query.status===undefined?[]:[{status:query.status}]),...(query.afterId===undefined?[]:[{id:{gt:query.afterId}}])]};
  const orderBy=orderId===undefined?{id:'asc'}:{orderVersion:'desc'};
  return (await this.delegate(entity).findMany({where,orderBy,take:query.limit+1})).map(asStoredRecord);
 }
`,
  );
  source = replace(
    source,
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    "type TransactionExecutor = { $transaction<T>(operation:(client:PrismaClient)=>Promise<T>,options:{isolationLevel:'Serializable'}):Promise<T> };",
  );
  source = replace(
    source,
    "operation(new PrismaRecordStore(client)));",
    "operation(new PrismaRecordStore(client)),{isolationLevel:'Serializable'});",
  );
  return source;
}

function api(source: string, profile: ServiceWorkOrdersProfile): string {
  source = replace(source, "Param, Post, Req", "Param, Post, HttpCode, Req");
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, WorkOrderMutationError }",
  );
  source = replace(
    source,
    "  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "  return error instanceof WorkOrderMutationError?new HttpException(error.body,error.status):new HttpException({code:'work_order.internal_error'},500);",
  );
  const start = source.indexOf('@Controller("api")'),
    end = source.indexOf("@Module(", start);
  if (start < 0 || end < 0)
    throw Error("Work Orders controller anchor unavailable.");
  return (
    source.slice(0, start) +
    String.raw`
type WorkOrderRequest={headers:Record<string,string|string[]|undefined>;originalUrl?:string;url?:string};
function workOrderRequestPrincipal(request:WorkOrderRequest) {
 try {
  if(Object.keys(request.headers).some(key=>['x-factory-role','x-factory-principal','x-factory-principal-id','x-factory-tenant','x-factory-tenant-id'].includes(key.toLowerCase())))throw Error('Override');
  return resolvePrincipalContext(request);
 }catch{throw new WorkOrderMutationError(403,{code:'work_order.forbidden'});}
}
function workOrderSearch(request:WorkOrderRequest):string {const url=request.originalUrl??request.url??'',index=url.indexOf('?');return index<0?'':url.slice(index+1);}
@Controller('api')
class GeneratedController {
 @Get('health') async health(@Req() request:WorkOrderRequest){if(${profile.orderEntity === "health"}&&Object.hasOwn(request.headers,'x-factory-fixture-session'))return this.list('health',request);return {status:'ok'};}
 @Get('work-order-assignees') async assignees(@Req() request:WorkOrderRequest){try{return await applicationRuntime.workOrderAssignees(workOrderRequestPrincipal(request));}catch(error){throw rejected(error);}}
 @Get('audit') async audit(@Req() request:WorkOrderRequest){if(${profile.orderEntity === "audit"})return this.list('audit',request);throw new HttpException({code:'work_order.forbidden'},403);}
 @Get('capability-events') async capabilityEvents(@Req() request:WorkOrderRequest){if(${profile.orderEntity === "capability-events"})return this.list('capability-events',request);throw new HttpException({code:'work_order.forbidden'},403);}
 @Get(':entity') async list(@Param('entity') entity:string,@Req() request:WorkOrderRequest){try{return await applicationRuntime.workOrderList(workOrderRequestPrincipal(request),entity,workOrderSearch(request));}catch(error){throw rejected(error);}}
 @Get(':entity/:recordId') async read(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:WorkOrderRequest){try{return await applicationRuntime.workOrderRead(workOrderRequestPrincipal(request),entity,id);}catch(error){throw rejected(error);}}
 @Get(':entity/:recordId/history') async history(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:WorkOrderRequest){try{return await applicationRuntime.workOrderHistory(workOrderRequestPrincipal(request),entity,id,workOrderSearch(request));}catch(error){throw rejected(error);}}
 private async command(entity:string,id:string|undefined,operation:string,body:unknown,request:WorkOrderRequest){try{return (await applicationRuntime.workOrderCommand(workOrderRequestPrincipal(request),entity,id,operation,request.headers['x-factory-idempotency-key'],body)).body;}catch(error){throw rejected(error);}}
 @Post(':entity') @HttpCode(201) async create(@Param('entity') entity:string,@Body() body:unknown,@Req() request:WorkOrderRequest){return this.command(entity,undefined,'create',body,request);}
 @Post(':entity/:recordId/events/:command') @HttpCode(200) async transition(@Param('entity') entity:string,@Param('recordId') id:string,@Param('command') command:string,@Body() body:unknown,@Req() request:WorkOrderRequest){return this.command(entity,id,command,body,request);}
}

` +
    source.slice(end)
  );
}
const receiptSchema = `model Factory_WorkOrderMutationReceipt {
 id String @id @default(cuid())
 scope String
 keyDigest String
 requestHash String
 operation String
 recordId String
 responseStatus Int
 responseBody Json
 createdAt DateTime @default(now())
 @@unique([scope,keyDigest])
}`;
const receiptMigration = `CREATE TABLE "Factory_WorkOrderMutationReceipt" (
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
CREATE UNIQUE INDEX "Factory_WorkOrderMutationReceipt_scope_keyDigest_key" ON "Factory_WorkOrderMutationReceipt" ("scope","keyDigest");`;

/** Read storage names from the database target; never recreate its allocator. */
function databaseCoordinates(
  files: readonly { readonly path: string; readonly content: string }[],
  profile: ServiceWorkOrdersProfile,
) {
  function only<T>(values: readonly T[]): T {
    if (values.length !== 1)
      throw Error(
        "Work Orders database coordinate is unavailable or ambiguous.",
      );
    return values[0]!;
  }
  const schema = only(
    files.filter((file) => file.path === "api/prisma/schema.prisma"),
  ).content;
  const migration = only(
    files.filter((file) => file.path.endsWith("/migration.sql")),
  ).content;
  const models = [...schema.matchAll(/^model (\w+) \{\n[\s\S]*?^\}/gm)];
  function model(key: string) {
    const name = key
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
      .join("");
    const block = only(models.filter((match) => match[1] === name))[0];
    const mappings = [...block.matchAll(/^  @@map\("([^"]+)"\)$/gm)];
    const table = mappings.length ? only(mappings)[1]! : name;
    only(
      [...migration.matchAll(/^CREATE TABLE "([^"]+)" \($/gm)].filter(
        (match) => match[1] === table,
      ),
    );
    return { name, block, table };
  }
  const order = model(profile.orderEntity);
  const history = model(profile.historyEntity);
  const index = only(
    [
      ...migration.matchAll(
        /^CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)" \("workOrderId", "orderVersion"\);$/gm,
      ),
    ].filter((match) => match[2] === history.table),
  )[1]!;
  const historyIndex = only([
    ...history.block.matchAll(
      /^  @@index\(\[workOrderId, orderVersion\](?:, map: "([^"]+)")?\)$/gm,
    ),
  ]);
  if (historyIndex[1] !== undefined && historyIndex[1] !== index)
    throw Error("Work Orders history storage coordinates disagree.");
  return { order, history, historyIndex: historyIndex[0], index };
}

/** Private adapter selected only after complete Published Graph and physical-lock validation. */
export function renderServiceWorkOrdersFile(
  path: string,
  source: string,
  profile: ServiceWorkOrdersProfile | undefined,
  sessions: readonly FixtureSession[] = [],
  databaseFiles: readonly {
    readonly path: string;
    readonly content: string;
  }[] = [],
): string {
  if (!profile) return source;
  if (sessions.length !== 3)
    throw Error("Work Orders fixture identity unavailable.");
  if (path === "api/src/application-runtime.ts")
    return runtime(source, profile, sessions);
  if (path === "api/src/prisma-record-store.ts") return prisma(source, profile);
  if (path === "api/src/main.ts") return api(source, profile);
  if (path === "web/app/api/[...path]/route.ts") {
    source = replace(
      source,
      "headers: { 'content-type':",
      "headers: { 'x-factory-idempotency-key': request.headers.get('x-factory-idempotency-key') ?? '', 'content-type':",
    );
    // Reject overrides at the public proxy too: silently stripping one would conceal an invalid request.
    // The proxy's concrete signature is stable; the API remains the final resolver boundary.
    const line = source.indexOf("\n", source.indexOf("async function proxy"));
    if (line < 0) throw Error("Work Orders proxy anchor unavailable.");
    source =
      source.slice(0, line + 1) +
      "  if (['x-factory-role','x-factory-principal','x-factory-principal-id','x-factory-tenant','x-factory-tenant-id'].some(key=>request.headers.has(key))) return Response.json({code:'work_order.forbidden'},{status:403});\n" +
      source.slice(line + 1);
    return source;
  }
  if (path.endsWith("/schema.prisma")) {
    const { order, history, historyIndex, index } = databaseCoordinates(
      databaseFiles,
      profile,
    );
    source = replace(
      source,
      history.block,
      replace(
        history.block,
        historyIndex,
        `  @@unique([workOrderId, orderVersion], map: "${index}")`,
      ),
    );
    return (
      replace(
        source,
        order.block,
        replace(
          order.block,
          "model " + order.name + " {",
          "model " + order.name + " {\n  version Int @default(0)",
        ),
      ) +
      "\n" +
      receiptSchema +
      "\n"
    );
  }
  if (path.endsWith("/migration.sql")) {
    const { order } = databaseCoordinates(databaseFiles, profile);
    return (
      replace(
        source,
        'CREATE TABLE "' + order.table + '" (',
        'CREATE TABLE "' +
          order.table +
          '" (\n  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" BETWEEN 0 AND 2147483647),',
      ) +
      "\n" +
      receiptMigration +
      "\n"
    );
  }
  return source;
}
