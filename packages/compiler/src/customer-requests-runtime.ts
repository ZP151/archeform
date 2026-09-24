import type { CustomerRequestsProfile } from "./customer-requests-contract.js";
import { writeProtectionFragments } from "./mutation-write-protection.js";

type Session = {
  readonly principalId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly expiresAt: string;
};
function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw Error("Customer Requests template anchor unavailable.");
  return source.replace(before, () => after);
}
/** Adapt the shared canonical identity, key and transactional storage fragments. */
function protection(profile: CustomerRequestsProfile) {
  const base = writeProtectionFragments("task", profile.graphHash);
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value
        .replaceAll("Task", "CustomerRequest")
        .replaceAll("task", "customer_request")
        .replaceAll("customer_requestReceipts", "customerRequestReceipts")
        .replaceAll("idempotencyKey", "keyDigest")
        .replaceAll(
          "customer_requestMutationReceipt",
          "factory_CustomerRequestMutationReceipt",
        ),
    ]),
  ) as typeof base;
}

function runtime(
  source: string,
  profile: CustomerRequestsProfile,
  sessions: readonly Session[],
): string {
  const f = protection(profile);
  source =
    'import { createHash } from "node:crypto";\nimport { resolveFixturePrincipal, authorizeDeclaredAction, type LocalPrincipalContext } from "./capabilities/core.identity-policy.js";\n' +
    source;
  source = replace(
    source,
    "export interface RecordStore {",
    String.raw`
// factory.generated.customer-request-mutation/v1; factory.generated.customer-request-mutation-receipt/v1
const customerRequestProfile = ${JSON.stringify(profile)} as const;
const customerRequestSessions: readonly LocalPrincipalContext[] = ${JSON.stringify(sessions)};
const customerRequestNow = '2026-01-01T00:00:00.000Z';
const requestReadVersion = 'factory.generated.customer-request-read/v1' as const;
const requestHistoryVersion = 'factory.generated.customer-request-history-entry/v1' as const;
const requestActions = ['create','update','reply','complete','reopen','cancel'] as const;
const requestStatuses = ['open','resolved','cancelled'] as const;
const requestOptional = ['fromStatus','message','reason','correctsVersion','beforeSubject','afterSubject','beforeDescription','afterDescription'] as const;
export type CustomerRequest = {id:string;version:number;subject:string;description:string;status:string;customerPrincipalId:string};
export type CustomerRequestEvent = {apiVersion:typeof requestHistoryVersion;id:string;request:string;action:string;requestVersion:number;toStatus:string;actorPrincipalId:string;actorRole:string;recordedAt:string;fromStatus:string|null;message:string|null;reason:string|null;correctsVersion:number|null;beforeSubject:string|null;afterSubject:string|null;beforeDescription:string|null;afterDescription:string|null};
export type CustomerRequestMutationResponse = {request:CustomerRequest;event:CustomerRequestEvent};
export type CustomerRequestMutationReceipt = {scope:string;keyDigest:string;requestHash:string;command:string;recordId:string;responseStatus:number;responseBody:CustomerRequestMutationResponse};
export type CustomerRequestQuery = {limit:number;status?:string;afterId?:string;beforeVersion?:number};
export type CustomerRequestHistoryQuery = {take:number;beforeVersion?:number;version?:number;correctsVersion?:number;actions?:readonly string[]};
export class CustomerRequestError extends Error {constructor(readonly status:number,readonly body:{code:string}){super('Customer request rejected.');}}
function failCustomerRequest(status:number,code:string):never {throw new CustomerRequestError(status,{code:code.startsWith('customer_request.')?code:'customer_request.'+code});}
function requestObject(value:unknown,keys:readonly string[]):asserts value is Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==keys.length)failCustomerRequest(400,'invalid_request');
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!d.enumerable||!('value'in d))failCustomerRequest(400,'invalid_request');}
}
function requestText(value:unknown,max:number,multiline=false):string {
 if(typeof value!=='string'||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/:/[\u0000-\u001f\u007f-\u009f]/).test(value))failCustomerRequest(400,'invalid_request');
 const text=value.trim();if(!text||text.length>max)failCustomerRequest(400,'invalid_request');return text;
}
function requestInteger(value:unknown):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||Object.is(value,-0)||value<0||value>2147483647)failCustomerRequest(400,'invalid_request');return value;}
function requestId(value:unknown,status=404):asserts value is string {if(typeof value!=='string'||!value||value.length>128||/[\s\u0000-\u001f\u007f-\u009f]/.test(value))failCustomerRequest(status,status===404?'not_found':'invalid_request');}
function requestMetadata(value:unknown){requestObject(value,['subject','description']);return {subject:requestText(value.subject,160),description:requestText(value.description,2000,true)};}
function requestQuery(search:unknown,history=false):CustomerRequestQuery {
 if(typeof search!=='string'||search.length>4096||/%(?![a-f0-9]{2})/i.test(search))failCustomerRequest(400,'invalid_request');
 try{decodeURIComponent(search.replace(/\+/g,' '));}catch{failCustomerRequest(400,'invalid_request');}
 const params=new URLSearchParams(search),seen=new Set<string>();
 for(const [key] of params){if(!(history?['limit','beforeVersion']:['limit','status','afterId']).includes(key)||seen.has(key))failCustomerRequest(400,'invalid_request');seen.add(key);}
 const number=(key:string)=>{const value=params.get(key)!;if(!/^(0|[1-9][0-9]*)$/.test(value))failCustomerRequest(400,'invalid_request');return requestInteger(Number(value));};
 const limit=params.has('limit')?number('limit'):20;if(limit<1||limit>50)failCustomerRequest(400,'invalid_request');const query:CustomerRequestQuery={limit};
 if(params.has('beforeVersion'))query.beforeVersion=number('beforeVersion');
 if(params.has('status')){const status=params.get('status')!;if(!requestStatuses.some(s=>s===status))failCustomerRequest(400,'invalid_request');query.status=status;}
 if(params.has('afterId')){const id=params.get('afterId');requestId(id,400);query.afterId=id;}return query;
}
function requestPrincipal(input:LocalPrincipalContext):LocalPrincipalContext {
 try {requestObject(input,['principalId','sessionId','tenantId','roles','expiresAt']);
 const fixture=customerRequestSessions.find(p=>p.sessionId===input.sessionId);
 if(!fixture||fixture.principalId!==input.principalId||fixture.tenantId!==input.tenantId||!Array.isArray(input.roles)||input.roles.length!==1||fixture.roles[0]!==input.roles[0]||fixture.expiresAt!==input.expiresAt||!resolveFixturePrincipal(input,customerRequestNow))failCustomerRequest(403,'forbidden');return fixture;
 }catch{ return failCustomerRequest(403,'forbidden');}
}
function requestVisible(principal:LocalPrincipalContext,row:StoredRecord|undefined):asserts row is StoredRecord {if(!row||(principal.roles[0]===customerRequestProfile.roles.customer&&row.customerPrincipalId!==principal.principalId))failCustomerRequest(404,'not_found');}
function requestRecord(row:StoredRecord):CustomerRequest {
 try{requestId(row.id);requestInteger(row.version);if(!requestStatuses.some(s=>s===row.status)||!customerRequestSessions.some(p=>p.principalId===row.customerPrincipalId&&p.roles[0]===customerRequestProfile.roles.customer)||requestText(row.subject,160)!==row.subject||requestText(row.description,2000,true)!==row.description)throw Error();
 return {id:row.id,version:row.version!,subject:row.subject as string,description:row.description as string,status:row.status!,customerPrincipalId:row.customerPrincipalId as string};
 }catch{return failCustomerRequest(500,'internal_error');}
}
function requestEvent(row:StoredRecord,parent:CustomerRequest):CustomerRequestEvent {
 try {
 requestId(row.id);const version=requestInteger(row.requestVersion),action=row.action as string;
 const actor=customerRequestSessions.find(p=>p.principalId===row.actorPrincipalId&&p.roles[0]===row.actorRole);
 if(row.requestId!==parent.id||version>parent.version||!requestActions.some(a=>a===action)||!actor||actor.roles[0]===customerRequestProfile.roles.customer&&actor.principalId!==parent.customerPrincipalId)throw Error();
 if((action==='complete'&&actor.roles[0]!==customerRequestProfile.roles.staff)||(['create','update','reopen','cancel'].includes(action)&&actor.roles[0]!==customerRequestProfile.roles.customer))throw Error();
 const at=row.recordedAt instanceof Date?row.recordedAt.toISOString():row.recordedAt;
 if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)throw Error();
 const from=row.fromStatus??null,to=row.toStatus;
 if(action==='create'?(version!==0||from!==null||to!=='open'):(version===0||from!==(action==='reopen'?'resolved':'open')||to!==(action==='complete'?'resolved':action==='cancel'?'cancelled':'open')))throw Error();
 const required=action==='create'?['afterSubject','afterDescription']:action==='update'?['reason','beforeSubject','afterSubject','beforeDescription','afterDescription']:action==='reply'||action==='complete'?['message']:['reason'];
 for(const key of requestOptional.filter(k=>k!=='fromStatus')){
  const value=row[key]??null;
  if(key==='correctsVersion'&&action==='reply'){if(value!==null&&requestInteger(value)>=version)throw Error();continue;}
  if(required.includes(key)){const max=key==='reason'?500:key.endsWith('Subject')?160:2000;if(requestText(value,max,!key.endsWith('Subject'))!==value)throw Error();}else if(value!==null)throw Error();
 }
 return {apiVersion:requestHistoryVersion,id:row.id,request:parent.id,action,requestVersion:version,toStatus:to as string,actorPrincipalId:actor.principalId,actorRole:actor.roles[0]!,recordedAt:at,...Object.fromEntries(requestOptional.map(k=>[k,row[k]??null]))} as CustomerRequestEvent;
 }catch{return failCustomerRequest(500,'internal_error');}
}
function requestProjection(record:CustomerRequest,event:CustomerRequestEvent|undefined){
 if(!event||event.requestVersion!==record.version||event.toStatus!==record.status)failCustomerRequest(500,'internal_error');
 if(['create','update'].includes(event.action)&&(event.afterSubject!==record.subject||event.afterDescription!==record.description))failCustomerRequest(500,'internal_error');
 return {nextActor:record.status!=='open'?null:event.action==='reply'&&event.actorRole===customerRequestProfile.roles.staff?'customer':'staff',lastActivity:{requestVersion:event.requestVersion,action:event.action,actorRole:event.actorRole,recordedAt:event.recordedAt}};
}
${f.canonical}
export interface RecordStore {
 listCustomerRequests(entity:string,query:CustomerRequestQuery,owner?:string):Promise<readonly StoredRecord[]>;
 customerRequestEvents(entity:string,requestId:string,query:CustomerRequestHistoryQuery):Promise<readonly StoredRecord[]>;
 getCustomerRequestReceipt(scope:string,key:string):Promise<CustomerRequestMutationReceipt|undefined>;
 saveCustomerRequestReceipt(receipt:CustomerRequestMutationReceipt):Promise<void>;
 conditionalCustomerRequestUpdate(entity:string,id:string,status:string,version:number,customerPrincipalId:string,values:Record<string,unknown>):Promise<StoredRecord|undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly customerRequestReceipts = new Map<string,CustomerRequestMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.customerRequestReceipts.clear();for(const [key,value] of source.customerRequestReceipts)this.customerRequestReceipts.set(key,structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    f.memoryMethods
      .replace(
        "version:number,values:",
        "version:number,customerPrincipalId:string,values:",
      )
      .replace(
        "current.version!==version",
        "current.version!==version || current.customerPrincipalId!==customerPrincipalId",
      ) +
      String.raw`
 async listCustomerRequests(entity:string,query:CustomerRequestQuery,owner?:string):Promise<readonly StoredRecord[]> {
  return [...this.collection(entity).values()].filter(row=>(owner===undefined||row.customerPrincipalId===owner)&&(query.status===undefined||row.status===query.status)&&(query.afterId===undefined||row.id>query.afterId)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).slice(0,query.limit+1).map(row=>structuredClone(row));
 }
 async customerRequestEvents(entity:string,requestId:string,query:CustomerRequestHistoryQuery):Promise<readonly StoredRecord[]> {
  return [...this.collection(entity).values()].filter(row=>row.requestId===requestId&&(query.beforeVersion===undefined||Number(row.requestVersion)<query.beforeVersion)&&(query.version===undefined||row.requestVersion===query.version)&&(query.correctsVersion===undefined||row.correctsVersion===query.correctsVersion)&&(query.actions===undefined||query.actions.includes(row.action as string))).sort((a,b)=>Number(b.requestVersion)-Number(a.requestVersion)).slice(0,query.take).map(row=>structuredClone(row));
 }
 private collection(entityKey:`,
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    String.raw`export class ApplicationRuntime {
 private async customerRequestRole(input:LocalPrincipalContext,entity:string,action:string){
  const principal=requestPrincipal(input),role=principal.roles[0]!;
  const rules=definition.permissions.flatMap(p=>p.actions.map(action=>({role:p.role,resource:p.resource,action})));
  if(entity!==customerRequestProfile.requestEntity||!authorizeDeclaredAction({principal,resource:entity,action,rules,tenantId:'tenant-local',now:customerRequestNow}).allowed||!await enforce(role,entity,action))failCustomerRequest(403,'forbidden');return principal;
 }
 private async customerRequestTransaction<T>(read:boolean,operation:(store:RecordStore)=>Promise<T>):Promise<T>{
  for(let attempt=0;attempt<4;attempt++)try{return await this.store.inTransaction(operation);}catch(error){
   if(error instanceof CustomerRequestError)throw error;
   if(['P2002','P2034'].includes((error as {code?:string})?.code??'')){if(attempt<3)continue;failCustomerRequest(read?503:409,read?'unavailable':'retryable_conflict');}
   failCustomerRequest(read?503:500,read?'unavailable':'internal_error');
  }return failCustomerRequest(read?503:409,read?'unavailable':'retryable_conflict');
 }
 async customerRequestList(input:LocalPrincipalContext,entity:string,search:unknown=''){
  await this.customerRequestRole(input,entity,'read');const query=requestQuery(search);
  return this.customerRequestTransaction(true,async store=>{
   const principal=await this.customerRequestRole(input,entity,'read');
   const rows=await store.listCustomerRequests(entity,query,principal.roles[0]===customerRequestProfile.roles.customer?principal.principalId:undefined);
   const items=[];for(const row of rows.slice(0,query.limit)){requestVisible(principal,row);const record=requestRecord(row),latest=await store.customerRequestEvents(customerRequestProfile.historyEntity,record.id,{take:1});items.push({...record,...requestProjection(record,latest[0]?requestEvent(latest[0],record):undefined)});}
   return {apiVersion:requestReadVersion,items,nextAfterId:rows.length>query.limit?items.at(-1)!.id:null};
  });
 }
 async customerRequestRead(input:LocalPrincipalContext,entity:string,id:string){
  await this.customerRequestRole(input,entity,'read');requestId(id);
  return this.customerRequestTransaction(true,async store=>{
   const principal=await this.customerRequestRole(input,entity,'read'),row=await store.find(entity,id);requestVisible(principal,row);const request=requestRecord(row);
   const latest=await store.customerRequestEvents(customerRequestProfile.historyEntity,id,{take:1});const projection=requestProjection(request,latest[0]?requestEvent(latest[0],request):undefined);
   const replies=await store.customerRequestEvents(customerRequestProfile.historyEntity,id,{take:1,actions:['reply','complete']});
   const reply=replies[0]?requestEvent(replies[0],request):null;
   return {apiVersion:requestReadVersion,request,...projection,latestReply:reply?{...reply,historical:reply.action==='complete'&&request.status!=='resolved'}:null};
  });
 }
 async customerRequestHistory(input:LocalPrincipalContext,entity:string,id:string,search:unknown=''){
  await this.customerRequestRole(input,entity,'read');requestId(id);const query=requestQuery(search,true);
  return this.customerRequestTransaction(true,async store=>{
   const principal=await this.customerRequestRole(input,entity,'read');if(!await enforce(principal.roles[0]!,customerRequestProfile.historyEntity,'read'))failCustomerRequest(403,'forbidden');
   const row=await store.find(entity,id);requestVisible(principal,row);const request=requestRecord(row);
   const rows=await store.customerRequestEvents(customerRequestProfile.historyEntity,id,{take:query.limit+1,...(query.beforeVersion===undefined?{}:{beforeVersion:query.beforeVersion})});
   const items=rows.slice(0,query.limit).map(row=>requestEvent(row,request));
   const expected=Math.min(request.version,query.beforeVersion===undefined?request.version:query.beforeVersion-1);
   if(rows.length!==Math.min(query.limit+1,expected+1)||items.some((event,index)=>event.requestVersion!==expected-index))failCustomerRequest(500,'internal_error');
   if(query.beforeVersion===undefined)requestProjection(request,items[0]);
   if(rows.length>query.limit){const next=requestEvent(rows[query.limit]!,request);if(next.requestVersion!==expected-query.limit)failCustomerRequest(500,'internal_error');}
   return {apiVersion:requestReadVersion,items,nextBeforeVersion:rows.length>query.limit?items.at(-1)!.requestVersion:null};
  });
 }
 async customerRequestCommand(input:LocalPrincipalContext,entityKey:string,recordId:string|undefined,operation:string,key:unknown,body:unknown):Promise<{status:number;body:CustomerRequestMutationResponse}>{
  if(!requestActions.some(a=>a===operation))failCustomerRequest(403,'forbidden');
  const principal=await this.customerRequestRole(input,entityKey,operation),role=principal.roles[0]!,actorScope=JSON.stringify([principal.tenantId,principal.principalId]);
  if(operation==='create'){if(recordId!==undefined)failCustomerRequest(400,'invalid_request');}else requestId(recordId);
${f.validateKey}
  let normalized:Record<string,unknown>;
  if(operation==='create'){requestObject(body,['values']);normalized={values:requestMetadata(body.values)};}
  else {const fields=operation==='update'?['expectedVersion','reason','values']:operation==='reply'?['expectedVersion','message','correctsVersion']:operation==='complete'?['expectedVersion','resolutionMessage']:['expectedVersion','reason'];requestObject(body,fields);normalized={expectedVersion:requestInteger(body.expectedVersion)};
   if(fields.includes('values'))normalized.values=requestMetadata(body.values);
   if(fields.includes('reason'))normalized.reason=requestText(body.reason,500,true);
   if(fields.includes('message')){normalized.message=requestText(body.message,2000,true);normalized.correctsVersion=body.correctsVersion===null?null:requestInteger(body.correctsVersion);}
   if(fields.includes('resolutionMessage'))normalized.resolutionMessage=requestText(body.resolutionMessage,2000,true);
  }
${f.identity}
  return this.customerRequestTransaction(false,async store=>{
   const actor=await this.customerRequestRole(input,entityKey,operation);
   if(actor.principalId!==principal.principalId||actor.sessionId!==principal.sessionId)failCustomerRequest(403,'forbidden');
   const current=recordId===undefined?undefined:await store.find(entityKey,recordId);if(recordId!==undefined)requestVisible(actor,current);
   const receipt=await store.getCustomerRequestReceipt(scope,storedIdempotencyKey);
   if(receipt){
    const saved=await store.find(entityKey,receipt.recordId);requestVisible(actor,saved);
    try {
     if(receipt.scope!==scope||receipt.keyDigest!==storedIdempotencyKey||receipt.command!==operation||recordId!==undefined&&receipt.recordId!==recordId||receipt.responseStatus!==(operation==='create'?201:200))throw Error();
     requestObject(receipt.responseBody,['request','event']);const request=requestRecord(receipt.responseBody.request);
     requestObject(receipt.responseBody.request,['id','version','subject','description','status','customerPrincipalId']);
     const event=receipt.responseBody.event;requestObject(event,['apiVersion','id','request','action','requestVersion','toStatus','actorPrincipalId','actorRole','recordedAt',...requestOptional]);
     const checked=requestEvent({...event,requestId:event.request} as StoredRecord,request);
     if(request.id!==receipt.recordId||request.customerPrincipalId!==saved.customerPrincipalId||request.version>(saved.version??-1)||event.apiVersion!==requestHistoryVersion||checked.requestVersion!==request.version||checked.toStatus!==request.status||checked.action!==operation||checked.actorPrincipalId!==actor.principalId||checked.actorRole!==role||typeof receipt.requestHash!=='string'||!/^[a-f0-9]{64}$/.test(receipt.requestHash))throw Error();
    }catch{failCustomerRequest(500,'internal_error');}
    if(receipt.requestHash!==requestHash)failCustomerRequest(409,'idempotency_conflict');return {status:receipt.responseStatus,body:structuredClone(receipt.responseBody)};
   }
   let record:StoredRecord;
   if(operation==='create')record=await store.create(entityKey,{...normalized.values as Record<string,unknown>,status:'open',version:0,customerPrincipalId:actor.principalId});
   else {
    const previous=requestRecord(current!);
    if(previous.version===2147483647)failCustomerRequest(409,'version_exhausted');
    if(previous.version!==normalized.expectedVersion)failCustomerRequest(409,'version_conflict');
    if(previous.status!==(operation==='reopen'?'resolved':'open'))failCustomerRequest(409,'state_conflict');
    if(operation==='update'&&previous.subject===(normalized.values as Record<string,unknown>).subject&&previous.description===(normalized.values as Record<string,unknown>).description)failCustomerRequest(400,'invalid_request');
    if(operation==='reply'&&normalized.correctsVersion!==null){
     const targetVersion=normalized.correctsVersion as number;
     if(targetVersion>previous.version)failCustomerRequest(400,'invalid_request');
     const targets=await store.customerRequestEvents(customerRequestProfile.historyEntity,previous.id,{take:1,version:targetVersion,actions:['reply','complete']});
     const target=targets[0]?requestEvent(targets[0],previous):undefined;
     if(!target||target.actorPrincipalId!==actor.principalId)failCustomerRequest(400,'invalid_request');
     const corrections=await store.customerRequestEvents(customerRequestProfile.historyEntity,previous.id,{take:1,correctsVersion:targetVersion,actions:['reply']});if(corrections.length)failCustomerRequest(400,'invalid_request');
    }
    const status=operation==='complete'?'resolved':operation==='cancel'?'cancelled':'open';
    const updated=await store.conditionalCustomerRequestUpdate(entityKey,previous.id,previous.status,previous.version,previous.customerPrincipalId,{...(operation==='update'?normalized.values as Record<string,unknown>:{}),status,version:previous.version+1});if(!updated)failCustomerRequest(409,'version_conflict');record=updated;
   }
   const request=requestRecord(record),entry:Record<string,unknown>={requestId:request.id,action:operation,requestVersion:request.version,toStatus:request.status,actorPrincipalId:actor.principalId,actorRole:role,recordedAt:new Date().toISOString(),fromStatus:current?.status??null,message:normalized.message??normalized.resolutionMessage??null,reason:normalized.reason??null,correctsVersion:normalized.correctsVersion??null,beforeSubject:operation==='update'?current!.subject:null,beforeDescription:operation==='update'?current!.description:null,afterSubject:['create','update'].includes(operation)?request.subject:null,afterDescription:['create','update'].includes(operation)?request.description:null};
   const event=requestEvent(await store.create(customerRequestProfile.historyEntity,entry),request);
   await store.appendAudit({actor:actor.principalId,action:operation,entity:entityKey,recordId:request.id,at:event.recordedAt});
   const responseStatus=operation==='create'?201:200,responseBody={request,event};
   await store.saveCustomerRequestReceipt({scope,keyDigest:storedIdempotencyKey,requestHash,command:operation,recordId:request.id,responseStatus,responseBody});
   return {status:responseStatus,body:responseBody};
  });
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
    const match = new RegExp("  async " + method + "\\([^]*?\\n  }").exec(
      source.slice(source.indexOf("export class ApplicationRuntime")),
    );
    if (!match) throw Error("Customer Requests generic method unavailable.");
    source = replace(
      source,
      match[0],
      match[0].split("\n")[0] +
        "\n    failCustomerRequest(403,'forbidden');\n  }",
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

function prisma(source: string, profile: CustomerRequestsProfile): string {
  const f = protection(profile);
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "CustomerRequestQuery, CustomerRequestHistoryQuery, CustomerRequestMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "  findMany(): Promise<unknown[]>;",
    "  findMany(input?:Record<string,unknown>):Promise<unknown[]>;\n  updateMany(input:{where:Record<string,unknown>;data:Record<string,unknown>}):Promise<{count:number}>;",
  );
  source = replace(
    source,
    "function asStoredRecord(value: unknown): StoredRecord { return value as StoredRecord; }",
    "function asStoredRecord(value: unknown): StoredRecord {return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,v])=>[key,v instanceof Date?v.toISOString():v])) as StoredRecord;}",
  );
  source = replace(
    source,
    "create({ data: input })",
    "create({ data: {...input,...(typeof input.recordedAt==='string'?{recordedAt:new Date(input.recordedAt)}:{})} })",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    f.prismaMethods
      .replace(
        "version:number,values:",
        "version:number,customerPrincipalId:string,values:",
      )
      .replace(
        "{id,status,version},data:values",
        "{id,status,version,customerPrincipalId},data:values",
      ) +
      String.raw`
 async listCustomerRequests(entity:string,query:CustomerRequestQuery,owner?:string):Promise<readonly StoredRecord[]> {
  const where={...(owner===undefined?{}:{customerPrincipalId:owner}),...(query.status===undefined?{}:{status:query.status}),...(query.afterId===undefined?{}:{id:{gt:query.afterId}})};
  return (await this.delegate(entity).findMany({where,orderBy:{id:'asc'},take:query.limit+1})).map(asStoredRecord);
 }
 async customerRequestEvents(entity:string,requestId:string,query:CustomerRequestHistoryQuery):Promise<readonly StoredRecord[]> {
  const where={requestId,...(query.beforeVersion===undefined?{}:{requestVersion:{lt:query.beforeVersion}}),...(query.version===undefined?{}:{requestVersion:query.version}),...(query.correctsVersion===undefined?{}:{correctsVersion:query.correctsVersion}),...(query.actions===undefined?{}:{action:{in:query.actions}})};
  return (await this.delegate(entity).findMany({where,orderBy:{requestVersion:'desc'},take:query.take})).map(asStoredRecord);
 }
`,
  );
  source = replace(
    source,
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    "type TransactionExecutor = { $transaction<T>(operation:(client:PrismaClient)=>Promise<T>,options:{isolationLevel:'Serializable'}):Promise<T> };",
  );
  return replace(
    source,
    "operation(new PrismaRecordStore(client)));",
    "operation(new PrismaRecordStore(client)),{isolationLevel:'Serializable'});",
  );
}

function api(source: string): string {
  source = replace(source, "Param, Post, Req", "Param, Post, HttpCode, Req");
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, CustomerRequestError }",
  );
  source = replace(
    source,
    "  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "  return error instanceof CustomerRequestError?new HttpException(error.body,error.status):new HttpException({code:'customer_request.internal_error'},500);",
  );
  const start = source.indexOf('@Controller("api")'),
    end = source.indexOf("@Module(", start);
  if (start < 0 || end < 0)
    throw Error("Customer Requests controller unavailable.");
  source =
    source.slice(0, start) +
    String.raw`
type CustomerRequestTransport={headers:Record<string,string|string[]|undefined>;originalUrl?:string;url?:string};
function customerRequestActor(request:CustomerRequestTransport){
 try{if(Object.keys(request.headers).some(key=>['x-factory-role','x-factory-principal','x-factory-principal-id','x-factory-tenant','x-factory-tenant-id'].includes(key.toLowerCase())))throw Error();
 const session=request.headers['x-factory-fixture-session'];if(typeof session!=='string'||!session||session.length>64||!/^[A-Za-z0-9._:-]+$/.test(session))throw Error();return resolvePrincipalContext(request);
 }catch{throw new CustomerRequestError(403,{code:'customer_request.forbidden'});}
}
function customerRequestSearch(request:CustomerRequestTransport){const url=request.originalUrl??request.url??'',index=url.indexOf('?');return index<0?'':url.slice(index+1);}
type CustomerRequestHttpResponse={setHeader(name:string,value:string):void;status(value:number):CustomerRequestHttpResponse;json(body:{code:string}):void};
class CustomerRequestExceptionFilter {
 catch(error:unknown,host:import('@nestjs/common').ArgumentsHost):void {
  let status=500,code='customer_request.internal_error';
  if(error instanceof HttpException){
   const reported=error.getStatus(),body=error.getResponse();
   const allowed:Record<string,number>={'customer_request.invalid_request':400,'customer_request.forbidden':403,'customer_request.not_found':404,'customer_request.version_conflict':409,'customer_request.state_conflict':409,'customer_request.idempotency_conflict':409,'customer_request.retryable_conflict':409,'customer_request.version_exhausted':409,'customer_request.internal_error':500,'customer_request.unavailable':503};
   const candidate=body&&typeof body==='object'?(body as {code?:unknown}).code:undefined;
   if(typeof candidate==='string'&&Object.hasOwn(allowed,candidate)&&allowed[candidate]===reported){status=reported;code=candidate;}
   else if([400,403,404,503].includes(reported)){status=reported;code='customer_request.'+({400:'invalid_request',403:'forbidden',404:'not_found',503:'unavailable'} as Record<number,string>)[reported];}
  }
  const response=host.switchToHttp().getResponse<CustomerRequestHttpResponse>();response.setHeader('Cache-Control','no-store');response.status(status).json({code});
 }
}
@Controller('api')
class GeneratedController {
 @Get('health') health(){return {status:'ok'};}
 @Get(':entity') async list(@Param('entity') entity:string,@Req() request:CustomerRequestTransport){try{return await applicationRuntime.customerRequestList(customerRequestActor(request),entity,customerRequestSearch(request));}catch(error){throw rejected(error);}}
 @Get(':entity/:recordId') async read(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:CustomerRequestTransport){try{if(customerRequestSearch(request))throw new CustomerRequestError(400,{code:'customer_request.invalid_request'});return await applicationRuntime.customerRequestRead(customerRequestActor(request),entity,id);}catch(error){throw rejected(error);}}
 @Get(':entity/:recordId/history') async history(@Param('entity') entity:string,@Param('recordId') id:string,@Req() request:CustomerRequestTransport){try{return await applicationRuntime.customerRequestHistory(customerRequestActor(request),entity,id,customerRequestSearch(request));}catch(error){throw rejected(error);}}
 private async command(entity:string,id:string|undefined,command:string,body:unknown,request:CustomerRequestTransport){try{const actor=customerRequestActor(request);if(customerRequestSearch(request))throw new CustomerRequestError(400,{code:'customer_request.invalid_request'});return (await applicationRuntime.customerRequestCommand(actor,entity,id,command,request.headers['x-factory-idempotency-key'],body)).body;}catch(error){throw rejected(error);}}
 @Post(':entity') @HttpCode(201) async create(@Param('entity') entity:string,@Body() body:unknown,@Req() request:CustomerRequestTransport){return this.command(entity,undefined,'create',body,request);}
 @Post(':entity/:recordId/events/:command') @HttpCode(200) async transition(@Param('entity') entity:string,@Param('recordId') id:string,@Param('command') command:string,@Body() body:unknown,@Req() request:CustomerRequestTransport){return this.command(entity,id,command,body,request);}
}

` +
    source.slice(end);
  return replace(
    source,
    "  app.enableCors(",
    "  app.useGlobalFilters(new CustomerRequestExceptionFilter());\n  app.use((_request:unknown,response:{setHeader(name:string,value:string):void},next:()=>void)=>{response.setHeader('Cache-Control','no-store');next();});\n  app.enableCors(",
  );
}

function proxy(): string {
  return String.raw`type RouteContext={params:Promise<{path:string[]}>};
const headers={'Cache-Control':'no-store','content-type':'application/json'};
const errorStatuses:Readonly<Record<string,number>>={'customer_request.invalid_request':400,'customer_request.forbidden':403,'customer_request.not_found':404,'customer_request.version_conflict':409,'customer_request.state_conflict':409,'customer_request.idempotency_conflict':409,'customer_request.retryable_conflict':409,'customer_request.version_exhausted':409,'customer_request.internal_error':500,'customer_request.unavailable':503};
async function proxy(request:Request,context:RouteContext):Promise<Response>{
 if(['x-factory-role','x-factory-principal','x-factory-principal-id','x-factory-tenant','x-factory-tenant-id'].some(key=>request.headers.has(key)))return Response.json({code:'customer_request.forbidden'},{status:403,headers});
 try{const {path}=await context.params;const upstream=new URL('/api/'+path.map(encodeURIComponent).join('/'),process.env.FACTORY_API_URL??'http://localhost:3001');upstream.search=new URL(request.url).search;
 const response=await fetch(upstream,{method:request.method,cache:'no-store',headers:{'content-type':'application/json','x-factory-fixture-session':request.headers.get('x-factory-fixture-session')??'','x-factory-idempotency-key':request.headers.get('x-factory-idempotency-key')??''},...(request.method==='GET'?{}:{body:await request.text()})});
 if(!response.ok){
  const body:unknown=await response.json();
  if(body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).length===1&&Object.hasOwn(body,'code')){
   const code=(body as {code:unknown}).code;
   if(typeof code==='string'&&Object.hasOwn(errorStatuses,code)&&errorStatuses[code]===response.status)return Response.json({code},{status:response.status,headers});
  }
  return Response.json({code:'customer_request.unavailable'},{status:503,headers});
 }
 return new Response(await response.text(),{status:response.status,headers});
 }catch{return Response.json({code:'customer_request.unavailable'},{status:503,headers});}
}
export const GET=proxy;export const POST=proxy;
`;
}

/** Resolve emitted model/table/index coordinates; retain database target name allocation. */
function database(
  files: readonly { readonly path: string; readonly content: string }[],
  profile: CustomerRequestsProfile,
) {
  const schema = files.find(
      (f) => f.path === "api/prisma/schema.prisma",
    )?.content,
    migration = files.find((f) => f.path.endsWith("/migration.sql"))?.content;
  if (!schema || !migration)
    throw Error("Customer Requests database unavailable.");
  const models = [...schema.matchAll(/^model (\w+) \{\n[\s\S]*?^\}/gm)];
  const model = (key: string) => {
    const name = key
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((s) => s[0]!.toUpperCase() + s.slice(1))
      .join("");
    const matches = models.filter((m) => m[1] === name);
    if (matches.length !== 1) throw Error("Customer Requests model ambiguous.");
    const block = matches[0]![0],
      table = /@@map\("([^"]+)"\)/.exec(block)?.[1] ?? name;
    if (!migration.includes('CREATE TABLE "' + table + '" ('))
      throw Error("Customer Requests table unavailable.");
    return { name, block, table };
  };
  const request = model(profile.requestEntity),
    history = model(profile.historyEntity);
  const indexes = [
    ...migration.matchAll(
      /^CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)" \("requestId", "requestVersion"\);$/gm,
    ),
  ].filter((m) => m[2] === history.table);
  const historyIndexes = [
    ...history.block.matchAll(
      /^  @@index\(\[requestId, requestVersion\](?:, map: "([^"]+)")?\)$/gm,
    ),
  ];
  if (
    indexes.length !== 1 ||
    historyIndexes.length !== 1 ||
    (historyIndexes[0]![1] !== undefined &&
      historyIndexes[0]![1] !== indexes[0]![1])
  )
    throw Error("Customer Requests history index unavailable.");
  return {
    request,
    history,
    index: indexes[0]![1]!,
    historyIndex: historyIndexes[0]![0],
  };
}
const receiptSchema = `model Factory_CustomerRequestMutationReceipt {
 id String @id @default(cuid())
 scope String
 keyDigest String
 requestHash String
 command String
 recordId String
 responseStatus Int
 responseBody Json
 @@unique([scope,keyDigest])
}`;
const receiptMigration = `CREATE TABLE "Factory_CustomerRequestMutationReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "scope" TEXT NOT NULL,
 "keyDigest" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "command" TEXT NOT NULL,
 "recordId" TEXT NOT NULL,
 "responseStatus" INTEGER NOT NULL,
 "responseBody" JSONB NOT NULL
);
CREATE UNIQUE INDEX "Factory_CustomerRequestMutationReceipt_scope_keyDigest_key" ON "Factory_CustomerRequestMutationReceipt" ("scope","keyDigest");`;

export function renderCustomerRequestsFile(
  path: string,
  source: string,
  profile: CustomerRequestsProfile | undefined,
  sessions: readonly Session[] = [],
  files: readonly { readonly path: string; readonly content: string }[] = [],
): string {
  if (!profile) return source;
  if (
    sessions.length !== 3 ||
    sessions.some(
      (s, i) =>
        s.principalId !==
          [
            "fixture-principal-support-staff",
            "fixture-principal-customer-a",
            "fixture-principal-customer-b",
          ][i] ||
        s.sessionId !==
          [
            "fixture-session-support-staff",
            "fixture-session-customer-a",
            "fixture-session-customer-b",
          ][i] ||
        s.tenantId !== "tenant-local" ||
        s.expiresAt !== "2099-01-01T00:00:00.000Z" ||
        s.roles.length !== 1 ||
        s.roles[0] !== profile.roles[i === 0 ? "staff" : "customer"],
    )
  )
    throw Error("Customer Requests fixed roster unavailable.");
  if (path === "api/src/application-runtime.ts")
    return runtime(source, profile, sessions);
  if (path === "api/src/prisma-record-store.ts") return prisma(source, profile);
  if (path === "api/src/main.ts") return api(source);
  if (path === "web/app/api/[...path]/route.ts") return proxy();
  if (path.endsWith("/schema.prisma")) {
    const { request, history, index, historyIndex } = database(files, profile);
    source = replace(
      source,
      history.block,
      replace(
        history.block,
        historyIndex,
        '  @@unique([requestId, requestVersion], map: "' + index + '")',
      ),
    );
    return (
      replace(
        source,
        request.block,
        replace(
          request.block,
          "model " + request.name + " {",
          "model " + request.name + " {\n  version Int @default(0)",
        ),
      ) +
      "\n" +
      receiptSchema +
      "\n"
    );
  }
  if (path.endsWith("/migration.sql")) {
    const { request } = database(files, profile);
    return (
      replace(
        source,
        'CREATE TABLE "' + request.table + '" (',
        'CREATE TABLE "' +
          request.table +
          '" (\n  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" BETWEEN 0 AND 2147483647),',
      ) +
      "\n" +
      receiptMigration +
      "\n"
    );
  }
  return source;
}
