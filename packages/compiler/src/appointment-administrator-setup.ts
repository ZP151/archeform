import type { AppointmentConsumerProfile } from "./appointment-consumer-contract.js";

type FixtureSession = {
  readonly sessionId: string;
  readonly roles: readonly string[];
  readonly expiresAt: string;
};
function replace(source: string, marker: string, value: string): string {
  if (source.split(marker).length !== 2)
    throw new Error("Appointment setup integration marker is unavailable.");
  return source.replace(marker, value);
}

/** Private exact-V2 setup protocol. Booking rendering and physical storage stay unchanged. */
export function renderAppointmentAdministratorSetup(
  profile: AppointmentConsumerProfile,
  sessions: readonly FixtureSession[],
): string {
  return `import { createHash } from 'node:crypto';
import type { RecordStore, StoredRecord } from './application-runtime.js';
const profile = ${JSON.stringify(profile)} as const;
const sessions:readonly {sessionId:string;roles:readonly string[];expiresAt:string}[] = ${JSON.stringify(sessions.map(({ sessionId, roles, expiresAt }) => ({ sessionId, roles, expiresAt })))};
const fields=profile.runtime.fields;
// Only current Appointment references participate; immutable history never enters this index.
export class AppointmentSetupReferenceIndex {
  private appointments=new Map<string,string>();
  private counts=new Map<string,number>();
  copy(source:AppointmentSetupReferenceIndex):void{this.appointments=new Map(source.appointments);this.counts=new Map(source.counts);}
  record(entity:string,record:StoredRecord):void{
    if(entity!==profile.runtime.appointmentEntity)return;
    const previous=this.appointments.get(record.id);if(previous!==undefined)this.counts.set(previous,(this.counts.get(previous)??0)-1);
    const current=String(record[fields.appointmentSchedule]??'');this.appointments.set(record.id,current);this.counts.set(current,(this.counts.get(current)??0)+1);
  }
  referenced(id:string):boolean{return (this.counts.get(id)??0)>0;}
}
export const appointmentSetupContract='factory.generated.appointment-setup/v1';
export type SetupActor={role:string;scope:string;graphHash:string};
export class AppointmentSetupError extends Error { constructor(readonly status:400|403|404|409|503,readonly code:string){super(code);} }
export function setupReject(code:string,status:400|403|404|409|503=400):never {throw new AppointmentSetupError(status,'appointment.'+code);}
export function setupFailure(error:unknown):AppointmentSetupError {
  if(error instanceof AppointmentSetupError)return error;
  if(error&&typeof error==='object'&&'code' in error&&error.code==='appointment.retryable_conflict')return new AppointmentSetupError(409,'appointment.setup_retryable_conflict');
  return new AppointmentSetupError(503,'appointment.setup_unavailable');
}
export const setupTarget=(entity:unknown):entity is string=>entity===profile.runtime.serviceEntity||entity===profile.runtime.scheduleEntity;
export const setupId=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
export function setupActor(server:SetupActor,entity:string):void {
  if(!server||server.role!=='administrator'||server.graphHash!==profile.runtime.graphHash||!setupTarget(entity)||!sessions.some(session=>'fixture:'+session.sessionId===server.scope&&session.roles.includes('administrator')&&Date.parse(session.expiresAt)>Date.parse('2026-01-01T00:00:00.000Z')))setupReject('forbidden',403);
}
function object(value:unknown,keys:readonly string[]):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key)))setupReject('setup_invalid_request');
  return value as Record<string,unknown>;
}
const serviceFields=[profile.serviceName,profile.serviceDuration,fields.serviceActive];
const scheduleFields=[fields.scheduleService,fields.scheduleStart,fields.scheduleEnd,fields.scheduleTimezone,fields.scheduleCapacity,fields.scheduleStatus];
const positive=(value:unknown)=>Number.isSafeInteger(value)&&(value as number)>0&&(value as number)<=2147483647;
const utc=(value:unknown):value is string=>typeof value==='string'&&/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
function zone(value:unknown):boolean {if(typeof value!=='string'||! /^[A-Za-z][A-Za-z0-9._+/-]*$/.test(value))return false;try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}}
function validate(entity:string,input:unknown):Record<string,unknown>{
  const values=object(input,entity===profile.runtime.serviceEntity?serviceFields:scheduleFields);
  if(entity===profile.runtime.serviceEntity){const name=values[profile.serviceName];if(typeof name!=='string'||!name.trim()||!positive(values[profile.serviceDuration])||typeof values[fields.serviceActive]!=='boolean')setupReject('setup_invalid_request');}
  else {const start=values[fields.scheduleStart],end=values[fields.scheduleEnd];if(!setupId(values[fields.scheduleService])||!utc(start)||!utc(end)||start>=end||!zone(values[fields.scheduleTimezone])||!positive(values[fields.scheduleCapacity])||!['open','closed'].includes(String(values[fields.scheduleStatus]))||typeof values[fields.scheduleStatus]!=='string')setupReject('setup_invalid_request');}
  return structuredClone(values);
}
function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';return JSON.stringify(value);}
const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
function saved(entity:string,record:StoredRecord):StoredRecord {return {id:record.id,...Object.fromEntries((entity===profile.runtime.serviceEntity?serviceFields:scheduleFields).map(key=>[key,record[key] instanceof Date?(record[key] as Date).toISOString():record[key]]))};}
export async function executeSetup(store:RecordStore,server:SetupActor,entity:string,id:string|undefined,key:unknown,body:unknown):Promise<StoredRecord>{
  if(typeof key!=='string'||! /^[A-Za-z0-9._:-]{1,128}$/.test(key)||id!==undefined&&!setupId(id))setupReject('setup_invalid_request');
  const envelope=id===undefined?undefined:object(body,['expectedValues','values']);
  const values=validate(entity,envelope?envelope.values:body);
  const expected=envelope?validate(entity,envelope.expectedValues):undefined;
  const validated=expected?{expectedValues:expected,values}:values;
  const command=id===undefined?'setup-create':'setup-update';
  const scope=appointmentSetupContract+':'+digest([server.graphHash,server.scope,server.role,entity,id??'$create',command]);
  const requestHash=digest(validated),at=new Date().toISOString();
  try {return await store.inTransaction(async transaction=>{
    const receipt=await transaction.getAppointmentReceipt(scope,key);
    if(receipt){if(receipt.requestHash!==requestHash)setupReject('setup_idempotency_conflict',409);return structuredClone(receipt.responseBody);}
    let current:StoredRecord|undefined;
    if(id!==undefined){const record=await transaction.find(entity,id);if(!record)setupReject('setup_not_found',404);current=saved(entity,record);if(!Object.keys(expected!).every(field=>current![field]===expected![field]))setupReject('setup_conflict',409);}
    if(entity===profile.runtime.scheduleEntity){
      if(!await transaction.find(profile.runtime.serviceEntity,values[fields.scheduleService] as string))setupReject('setup_invalid_reference');
      if(current&&[fields.scheduleService,fields.scheduleStart,fields.scheduleEnd,fields.scheduleTimezone].some(field=>current![field]!==values[field])&&await transaction.hasAppointmentCurrentReference(id!))setupReject('setup_slot_in_use',409);
      if(current&&await transaction.countAppointmentSetupOccupancy(id!)>(values[fields.scheduleCapacity] as number))setupReject('setup_capacity_conflict',409);
    }
    const record=saved(entity,id===undefined?await transaction.create(entity,values):await transaction.update(entity,id,values));
    await transaction.appendAudit({actor:server.role,action:id===undefined?'create':'update',entity,recordId:record.id,at});
    await transaction.saveAppointmentReceipt({scope,idempotencyKey:key,requestHash,command,recordId:record.id,responseStatus:id===undefined?201:200,responseBody:record,createdAt:at});
    return structuredClone(record);
  });}catch(error){throw setupFailure(error);}
}
`;
}

function runtime(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  source =
    `import { AppointmentSetupReferenceIndex, executeSetup, setupActor, setupTarget, setupId, setupReject, type SetupActor } from './appointment-administrator-setup.js';\n` +
    source;
  source = replace(
    source,
    "export interface RecordStore {",
    `export interface RecordStore {
  hasAppointmentCurrentReference(id:string):Promise<boolean>;
  countAppointmentSetupOccupancy(id:string):Promise<number>;`,
  );
  source = replace(
    source,
    "export class InMemoryRecordStore implements RecordStore {",
    `export class InMemoryRecordStore implements RecordStore {
  private readonly appointmentSetupReferences=new AppointmentSetupReferenceIndex();
  async hasAppointmentCurrentReference(id:string){return this.appointmentSetupReferences.referenced(id);}
  async countAppointmentSetupOccupancy(id:string){return this.appointmentReadIndex.counts([id])[id]??0;}`,
  );
  source = replace(
    source,
    "this.appointmentReadIndex.record(seed.entity,{id:seed.id,...seed.values});",
    "this.appointmentReadIndex.record(seed.entity,{id:seed.id,...seed.values}); this.appointmentSetupReferences.record(seed.entity,{id:seed.id,...seed.values});",
  );
  // Both emitted write methods already update the read index; append the reference hook at each write.
  const hook = "this.appointmentReadIndex.record(entityKey,record);";
  if (source.split(hook).length !== 3)
    throw new Error("Appointment setup write hooks are unavailable.");
  source = source.replaceAll(
    hook,
    hook + " this.appointmentSetupReferences.record(entityKey,record);",
  );
  source = replace(
    source,
    "this.appointmentReadIndex.copy(source.appointmentReadIndex);",
    "this.appointmentReadIndex.copy(source.appointmentReadIndex); this.appointmentSetupReferences.copy(source.appointmentSetupReferences);",
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    `export class ApplicationRuntime {
  private async appointmentSetupAllowed(server:SetupActor,entity:string,action:'create'|'update'):Promise<void>{
    setupActor(server,entity);
    try {await this.assertAllowed(server.role,entity,action);await this.assertAllowed(server.role,entity,'read');if(entity===${j(p.scheduleEntity)})await this.assertAllowed(server.role,${j(p.serviceEntity)},'read');}catch{setupReject('forbidden',403);}
  }
  async appointmentSetupCreate(server:SetupActor,entity:string,key:unknown,body:unknown):Promise<StoredRecord>{await this.appointmentSetupAllowed(server,entity,'create');return executeSetup(this.store,server,entity,undefined,key,body);}
  async appointmentSetupUpdate(server:SetupActor,entity:string,id:string,key:unknown,body:unknown):Promise<StoredRecord>{await this.appointmentSetupAllowed(server,entity,'update');if(!setupId(id))setupReject('setup_invalid_request');return executeSetup(this.store,server,entity,id,key,body);}`,
  );
  return replace(
    source,
    "  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    `  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {
    if(setupTarget(entityKey))setupReject('forbidden',403);`,
  );
}
function prisma(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  return replace(
    source,
    "  constructor(private readonly prisma: PrismaClient) {}",
    `  constructor(private readonly prisma: PrismaClient) {}
  async hasAppointmentCurrentReference(id:string):Promise<boolean>{
    const delegate=this.delegate(${j(p.appointmentEntity)}) as unknown as {findFirst(input:unknown):Promise<unknown>};
    return !!await delegate.findFirst({where:{${j(p.fields.appointmentSchedule)}:id},select:{id:true}});
  }
  async countAppointmentSetupOccupancy(id:string):Promise<number>{
    const delegate=this.delegate(${j(p.appointmentEntity)}) as unknown as {count(input:unknown):Promise<number>};
    return delegate.count({where:{${j(p.fields.appointmentSchedule)}:id,${j(p.fields.appointmentStatus)}:{in:['requested','confirmed']}}});
  }`,
  );
}

function api(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  source =
    `import { setupActor, setupTarget, setupId, setupReject, setupFailure } from './appointment-administrator-setup.js';\n` +
    source;
  source = replace(
    source,
    "Param, Post, Req, Res }",
    "Param, Post, Patch, Req, Res }",
  );
  const jsonBoundary = String.raw`// Retain decoded wire text until member uniqueness is checked. The native text
// parser supplies the same default limit, inflation and charset decoder as JSON.
const setupJsonRequests=new WeakSet<object>();
function appointmentSetupJsonType(request:SetupRequest & {is(type:string):string|false|null}):boolean {
  const accepted=setupRequests.has(request)&&!!request.is('application/json');
  if(accepted)setupJsonRequests.add(request);
  return accepted;
}
function appointmentSetupJsonCharset(_request:unknown,_response:unknown,_buffer:Buffer,encoding:string):void {
  // Native JSON accepts only utf-* labels; native text otherwise accepts more.
  if(!encoding.startsWith('utf-'))setupReject('setup_invalid_request');
}
function appointmentSetupJsonParse(request:SetupRequest & {body?:unknown},_response:unknown,next:(error?:unknown)=>void):void {
  if(!setupJsonRequests.has(request)){next();return;}
  try {
    const text=request.body;if(typeof text!=='string')setupReject('setup_invalid_request');
    const stack:Array<{keys?:Set<string>;key:boolean}>=[];
    // One forward scan keeps strings atomic, including malformed escape tails.
    for(let offset=0;offset<text.length;offset++){
      const token=text[offset];
      if(token==='"'){
        const start=offset++;let closed=false;
        for(;offset<text.length;offset++){if(text[offset]==='\\'){offset++;continue;}if(text[offset]==='"'){closed=true;break;}}
        if(!closed)setupReject('setup_invalid_request');
        const current=stack.at(-1);
        if(current?.keys&&current.key){const key=JSON.parse(text.slice(start,offset+1)) as string;if(current.keys.has(key))setupReject('setup_invalid_request');current.keys.add(key);current.key=false;}
        continue;
      }
      if(token==='{'){stack.push({keys:new Set(),key:true});continue;}
      if(token==='['){stack.push({key:false});continue;}
      if(token==='}'||token===']'){stack.pop();continue;}
      const current=stack.at(-1);
      if(token===','){if(current?.keys)current.key=true;continue;}
    }
    const body:unknown=text.length===0?{}:JSON.parse(text);
    // Match native JSON's strict object/array admission and empty-body behavior.
    if(body===null||typeof body!=='object')setupReject('setup_invalid_request');
    request.body=body;
    next();
  }catch(error){next(error);}
}
`;
  const helpers = `${jsonBoundary}type SetupRequest={headers:Record<string,string|string[]|undefined>;rawHeaders?:string[];originalUrl:string;method?:string};
type SetupResponse={setHeader(name:string,value:string):void;status(code:number):{json(body:{code:string}):void}};
const setupRequests=new WeakSet<object>();
function setupHeaders(response:Pick<SetupResponse,'setHeader'>):void{response.setHeader('Cache-Control','no-store');}
function setupContext(request:SetupRequest,entity:string,action:'create'|'update'){
  let actor;
  try{actor=appointmentServerContext(request,entity,action);setupActor(actor,entity);appointmentServerContext(request,entity,'read');if(entity===${j(p.scheduleEntity)})appointmentServerContext(request,${j(p.serviceEntity)},'read');}catch{setupReject('forbidden',403);}
  return actor;
}
function setupRawEntity(request:SetupRequest):string|undefined{
  const parts=(request.originalUrl.split('?')[0]??'').split('/');
  // Express matches static route segments case-insensitively by default.
  if(parts[1]?.toLowerCase()!=='api')return undefined;
  let entity:string;try{entity=decodeURIComponent(parts[2]??'');}catch{entity='';}
  if(request.method==='PATCH')return entity;
  return request.method==='POST'&&setupTarget(entity)&&(parts.length===3||parts.length===4&&parts[3]==='')?entity:undefined;
}
function setupSyntax(request:SetupRequest,entity:string,id?:string):void{
  if(request.originalUrl.includes('?')&&request.originalUrl.slice(request.originalUrl.indexOf('?')+1)!=='')setupReject('setup_invalid_request');
  const parts=(request.originalUrl.split('?')[0]??'').split('/');if(parts.at(-1)==='')parts.pop();
  let decodedEntity:string,decodedId:string|undefined;
  try{decodedEntity=decodeURIComponent(parts[2]??'');decodedId=id===undefined?undefined:decodeURIComponent(parts[3]??'');}catch{setupReject('setup_invalid_request');}
  if(parts[1]!=='api'||parts.length!==(id===undefined?3:4)||decodedEntity!==entity||id!==undefined&&(!setupId(decodedId)||decodedId!==id))setupReject('setup_invalid_request');
  const key=request.headers['x-factory-idempotency-key'];
  if(typeof key!=='string'||! /^[A-Za-z0-9._:-]{1,128}$/.test(key))setupReject('setup_invalid_request');
  if(request.rawHeaders){let count=0;for(let n=0;n<request.rawHeaders.length;n+=2)if(request.rawHeaders[n]?.toLowerCase()==='x-factory-idempotency-key')count++;if(count!==1)setupReject('setup_invalid_request');}
}
function setupHttpError(error:unknown):HttpException{const safe=setupFailure(error);return new HttpException({code:safe.code},safe.status);}
function appointmentSetupPathGuard(request:SetupRequest,response:SetupResponse,next:()=>void):void{
  const entity=setupRawEntity(request);if(entity===undefined){next();return;}
  setupHeaders(response);setupRequests.add(request);
  try{setupContext(request,entity,request.method==='PATCH'?'update':'create');let id:string|undefined;if(request.method==='PATCH'){try{id=decodeURIComponent((request.originalUrl.split('?')[0]??'').split('/')[3]??'');}catch{setupReject('setup_invalid_request');}}setupSyntax(request,entity,id);}
  catch(error){const safe=setupFailure(error);response.status(safe.status).json({code:safe.code});return;}
  next();
}
function appointmentSetupParserError(error:unknown,request:SetupRequest,response:SetupResponse,next:(error:unknown)=>void):void{
  if(!setupRequests.has(request)){next(error);return;}
  setupHeaders(response);response.status(400).json({code:'appointment.setup_invalid_request'});
}
`;
  source = replace(
    source,
    '@Controller("api")',
    helpers + '\n@Controller("api")',
  );
  source = replace(
    source,
    "class GeneratedController {",
    `class GeneratedController {
  @Patch(':entity/:recordId')
  async appointmentSetupUpdate(@Param('entity') entity:string,@Param('recordId') recordId:string,@Body() body:unknown,@Req() request:SetupRequest,@Res({passthrough:true}) response:SetupResponse){
    setupHeaders(response);try{const actor=setupContext(request,entity,'update');setupSyntax(request,entity,recordId);return await applicationRuntime.appointmentSetupUpdate(actor,entity,recordId,request.headers['x-factory-idempotency-key'],body);}catch(error){throw setupHttpError(error);}
  }
`,
  );
  source = replace(
    source,
    "async create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    `async create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Req() request: SetupRequest, @Res({passthrough:true}) response:SetupResponse) {
    if(setupTarget(entity)){setupHeaders(response);try{const actor=setupContext(request,entity,'create');setupSyntax(request,entity);return await applicationRuntime.appointmentSetupCreate(actor,entity,request.headers['x-factory-idempotency-key'],body);}catch(error){throw setupHttpError(error);}}`,
  );
  return replace(
    source,
    "  const app = await NestFactory.create(GeneratedModule);",
    `  const app = await NestFactory.create(GeneratedModule,{bodyParser:false});
  app.use(appointmentSetupPathGuard);
  app.getHttpAdapter().useBodyParser('text',false,{type:appointmentSetupJsonType,verify:appointmentSetupJsonCharset});
  app.use(appointmentSetupJsonParse);
  app.getHttpAdapter().registerParserMiddleware('',false);
  app.use(appointmentSetupParserError);`,
  );
}

function proxy(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  const helper = `function setupProxyResponse(code:string,status:number):Response{return new Response(JSON.stringify({code}),{status,headers:{'content-type':'application/json','Cache-Control':'no-store'}});}
async function setupProxy(request:Request,incoming:URL):Promise<Response>{
  try{
    const upstream=new URL(incoming.pathname,process.env.FACTORY_API_URL??process.env.NEXT_PUBLIC_FACTORY_API_URL??'http://localhost:3001');upstream.search=incoming.search;
    const headers:Record<string,string>={'content-type':request.headers.get('content-type')??'application/json','x-factory-fixture-session':request.headers.get('x-factory-fixture-session')??''};
    const key=request.headers.get('x-factory-idempotency-key');if(key!==null)headers['x-factory-idempotency-key']=key;
    const response=await fetch(upstream,{method:request.method,headers,body:await request.text(),cache:'no-store'});
    const text=await response.text();
    if(!response.ok){const body:unknown=JSON.parse(text);const codes:Record<string,number>={'appointment.setup_invalid_request':400,'appointment.setup_invalid_reference':400,'appointment.forbidden':403,'appointment.setup_not_found':404,'appointment.setup_conflict':409,'appointment.setup_slot_in_use':409,'appointment.setup_capacity_conflict':409,'appointment.setup_idempotency_conflict':409,'appointment.setup_retryable_conflict':409,'appointment.setup_unavailable':503};if(!body||typeof body!=='object'||!('code' in body)||typeof body.code!=='string'||codes[body.code]!==response.status)return setupProxyResponse('appointment.setup_unavailable',503);return setupProxyResponse(body.code,response.status);}
    return new Response(text,{status:response.status,headers:{'content-type':'application/json','Cache-Control':'no-store'}});
  }catch{return setupProxyResponse('appointment.setup_unavailable',503);}
}
`;
  source = helper + source;
  source = replace(
    source,
    "  const incoming = new URL(request.url);",
    `  const incoming = new URL(request.url);
  if(request.method==='PATCH'||request.method==='POST'&&path.length===1&&[${j(p.serviceEntity)},${j(p.scheduleEntity)}].includes(path[0]!))return setupProxy(request,incoming);`,
  );
  return replace(
    source,
    "export const POST = proxy;",
    "export const POST = proxy;\nexport const PATCH = proxy;",
  );
}

export function renderAppointmentSetupFile(
  path: string,
  source: string,
  profile?: AppointmentConsumerProfile,
): string {
  if (!profile) return source;
  if (path === "api/src/application-runtime.ts")
    return runtime(source, profile);
  if (path === "api/src/prisma-record-store.ts") return prisma(source, profile);
  if (path === "api/src/main.ts") return api(source, profile);
  if (path === "web/app/api/[...path]/route.ts") return proxy(source, profile);
  return source;
}
