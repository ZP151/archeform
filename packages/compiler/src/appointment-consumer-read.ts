import type { AppointmentConsumerProfile } from "./appointment-consumer-contract.js";

function replace(source: string, marker: string, value: string): string {
  if (source.split(marker).length !== 2)
    throw new Error(
      "Appointment consumer renderer integration marker is unavailable.",
    );
  return source.replace(marker, value);
}

/** Standalone generated read implementation; never changes the command module. */
export function renderAppointmentConsumerRead(
  profile: AppointmentConsumerProfile,
): string {
  return `import type { RecordStore, StoredRecord } from './application-runtime.js';
const profile = ${JSON.stringify(profile)} as const;
const fields = profile.runtime.fields;
export type AvailabilityQuery = { from:string; to:string; serviceId?:string; offset:number; now:string; take:number };
export type AppointmentSlot = { scheduleId:string; serviceId:string; startUtc:string; endUtc:string; timezone:string };
export class AppointmentReadError extends Error { constructor(readonly status:400|403|404|503,readonly code:string) { super(code); } }
const invalid = ():never => { throw new AppointmentReadError(400,'appointment.availability_invalid_query'); };
export const validReadId = (id:unknown):id is string => typeof id==='string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id);
const canonicalUtc=(value:unknown):value is string => typeof value==='string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value;
const instant=(value:unknown):string|undefined => { const text=value instanceof Date?value.toISOString():value; if(typeof text!=='string'||!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$/.test(text)||!Number.isFinite(Date.parse(text)))return undefined; const iso=new Date(text).toISOString(); return iso.slice(0,19)===text.slice(0,19)?iso:undefined; };
function zone(value:unknown):value is string { if(typeof value!=='string'||!value||! /^[A-Za-z][A-Za-z0-9._+\\/-]*$/.test(value))return false; try { new Intl.DateTimeFormat('en',{timeZone:value}); return true; } catch { return false; } }
export function parseAvailabilityQuery(rawUrl:string, now:string):AvailabilityQuery {
  if(!canonicalUtc(now))throw new AppointmentReadError(503,'appointment.availability_unavailable');
  const raw=rawUrl.split('?')[1]??'';
  try { for(const part of raw.split('&')) for(const item of part.split('=')) decodeURIComponent(item.replace(/\\+/g,' ')); } catch { return invalid(); }
  const params=new URL(rawUrl,'http://local.invalid').searchParams;
  const allowed=['from','to','serviceId','offset'];
  for(const key of params.keys())if(!allowed.includes(key)||params.getAll(key).length!==1)return invalid();
  const from=params.get('from'),to=params.get('to'),offsetText=params.get('offset')??'0';
  if(!canonicalUtc(from)||!canonicalUtc(to)||from>=to||Date.parse(to)-Date.parse(from)>31*86400000||Date.parse(to)>Date.parse(now)+366*86400000||! /^(0|[1-9][0-9]{0,5})$/.test(offsetText))return invalid();
  const offset=Number(offsetText); if(offset>=100000)return invalid();
  const serviceId=params.get('serviceId'); if(serviceId!==null&&!validReadId(serviceId))return invalid();
  return {from,to,offset,now,take:Math.min(500,100000-offset),...(serviceId===null?{}:{serviceId})};
}
function slot(value:Record<string,unknown>|undefined):AppointmentSlot|undefined {
  if(!value)return undefined;
  const start=instant(value.startUtc),end=instant(value.endUtc);
  if(typeof value.scheduleId!=='string'||!value.scheduleId||typeof value.serviceId!=='string'||!value.serviceId||!start||!end||end<=start||!zone(value.timezone))return undefined;
  return {scheduleId:value.scheduleId,serviceId:value.serviceId,startUtc:start,endUtc:end,timezone:value.timezone};
}
function scheduleSlot(record:StoredRecord|undefined):AppointmentSlot|undefined { return record?slot({scheduleId:record.id,serviceId:record[fields.scheduleService],startUtc:record[fields.scheduleStart],endUtc:record[fields.scheduleEnd],timezone:record[fields.scheduleTimezone]}):undefined; }
function metadata(service:StoredRecord|undefined):{serviceName:string;durationMinutes:number}|undefined { const name=service?.[profile.serviceName],duration=service?.[profile.serviceDuration]; return typeof name==='string'&&name.trim().length>0&&Number.isSafeInteger(duration)&&(duration as number)>0?{serviceName:name,durationMinutes:duration as number}:undefined; }
export async function readAvailability(store:RecordStore, rawUrl:string, now:string) {
  const query=parseAvailabilityQuery(rawUrl,now);
  const candidates=await store.scanAppointmentSchedules(query);
  if(candidates.length>query.take)throw new AppointmentReadError(503,'appointment.availability_unavailable');
  const occupied=await store.countAppointmentOccupancy(candidates.map(record=>record.id));
  const slots:Array<AppointmentSlot & {serviceName:string;durationMinutes:number}>=[];
  let scanned=0;
  for(const record of candidates) {
    scanned++;
    const chosen=scheduleSlot(record),capacity=record[fields.scheduleCapacity];
    if(!chosen||chosen.startUtc<now||chosen.startUtc<query.from||chosen.startUtc>=query.to||record[fields.scheduleStatus]!=='open'||!Number.isSafeInteger(capacity)||(capacity as number)<=0||(occupied[record.id]??0)>=(capacity as number))continue;
    const service=await store.find(profile.runtime.serviceEntity,chosen.serviceId),label=metadata(service);
    if(!label||service?.[fields.serviceActive]!==true)continue;
    slots.push({scheduleId:chosen.scheduleId,serviceId:chosen.serviceId,...label,startUtc:chosen.startUtc,endUtc:chosen.endUtc,timezone:chosen.timezone});
    if(slots.length===100)break;
  }
  const more=scanned<candidates.length||candidates.length===query.take;
  return {apiVersion:'factory.generated.appointment-availability/v1' as const,slots,next:more?{offset:query.offset+scanned}:null};
}
export async function readAppointmentSummary(store:RecordStore,recordId:unknown) {
  if(!validReadId(recordId))throw new AppointmentReadError(400,'appointment.summary_invalid_id');
  const missing=():never=>{throw new AppointmentReadError(404,'appointment.not_found');};
  const record=await store.find(profile.runtime.appointmentEntity,recordId); if(!record)return missing();
  const history=await store.latestAppointmentSlot(recordId);
  const chosen=history.exists?slot(history.slot):scheduleSlot(await store.find(profile.runtime.scheduleEntity,String(record[fields.appointmentSchedule]??'')));
  if(!chosen)return missing();
  const label=metadata(await store.find(profile.runtime.serviceEntity,chosen.serviceId)); if(!label)return missing();
  return {apiVersion:'factory.generated.appointment-summary/v1' as const,...label,slot:chosen,source:history.exists?'history' as const:'current-schedule' as const};
}
// Read indexes are updated when records/history are written, never rebuilt by a read.
type AppointmentScheduleKey = {id:string;start:string};
export class AppointmentReadIndex {
  private schedules=new Map<string,StoredRecord>();
  // Cached canonical time/ID keys contain no record bodies; writes maintain their order.
  private scheduleOrder:AppointmentScheduleKey[]=[];
  private serviceSchedules=new Map<string,AppointmentScheduleKey[]>();
  private appointments=new Map<string,{schedule:string;occupied:boolean}>();
  private occupancy=new Map<string,number>();
  private history=new Map<string,{at:string;order:number;slot:Record<string,unknown>|undefined}>();
  private order=0;
  copy(other:AppointmentReadIndex):void { this.schedules=structuredClone(other.schedules);this.scheduleOrder=structuredClone(other.scheduleOrder);this.serviceSchedules=structuredClone(other.serviceSchedules);this.appointments=structuredClone(other.appointments);this.occupancy=new Map(other.occupancy);this.history=structuredClone(other.history);this.order=other.order; }
  private schedulePosition(keys:readonly AppointmentScheduleKey[],start:string,id?:string):number {
    let low=0,high=keys.length;
    while(low<high){const middle=low+Math.floor((high-low)/2),key=keys[middle]!;if(key.start<start||(key.start===start&&id!==undefined&&key.id<id))low=middle+1;else high=middle;}
    return low;
  }
  private removeScheduleKey(keys:AppointmentScheduleKey[],key:AppointmentScheduleKey):void {
    const position=this.schedulePosition(keys,key.start,key.id);
    if(keys[position]?.id===key.id&&keys[position]?.start===key.start)keys.splice(position,1);
  }
  private indexSchedule(record:StoredRecord):void {
    const previous=this.schedules.get(record.id);
    if(previous){
      const start=instant(previous[fields.scheduleStart]),service=previous[fields.scheduleService];
      if(start){
        const key={id:record.id,start};this.removeScheduleKey(this.scheduleOrder,key);
        if(typeof service==='string'){const keys=this.serviceSchedules.get(service);if(keys){this.removeScheduleKey(keys,key);if(!keys.length)this.serviceSchedules.delete(service);}}
      }
    }
    this.schedules.set(record.id,structuredClone(record));
    const start=instant(record[fields.scheduleStart]),service=record[fields.scheduleService];
    if(!start)return;
    const key={id:record.id,start};this.scheduleOrder.splice(this.schedulePosition(this.scheduleOrder,start,record.id),0,key);
    if(typeof service==='string'){
      const keys=this.serviceSchedules.get(service)??[];
      keys.splice(this.schedulePosition(keys,start,record.id),0,key);this.serviceSchedules.set(service,keys);
    }
  }
  record(entity:string,record:StoredRecord):void {
    if(entity===profile.runtime.scheduleEntity)this.indexSchedule(record);
    if(entity!==profile.runtime.appointmentEntity)return;
    const previous=this.appointments.get(record.id);if(previous?.occupied)this.occupancy.set(previous.schedule,(this.occupancy.get(previous.schedule)??0)-1);
    const current={schedule:String(record[fields.appointmentSchedule]??''),occupied:['requested','confirmed'].includes(String(record[fields.appointmentStatus]))};
    this.appointments.set(record.id,current);if(current.occupied)this.occupancy.set(current.schedule,(this.occupancy.get(current.schedule)??0)+1);
  }
  append(entry:{appointmentId:string;at:string;toSlot:Record<string,unknown>|null;fromSlot:Record<string,unknown>|null}):void {
    const previous=this.history.get(entry.appointmentId),order=++this.order;
    const value=entry.toSlot??entry.fromSlot??undefined;
    if(!previous || (value && (!previous.slot||entry.at>previous.at||entry.at===previous.at&&order>previous.order)))this.history.set(entry.appointmentId,{at:entry.at,order,slot:value?structuredClone(value):undefined});
  }
  latest(id:string):{exists:boolean;slot?:Record<string,unknown>} { const value=this.history.get(id);return value?{exists:true,...(value.slot?{slot:structuredClone(value.slot)}:{})}:{exists:false}; }
  scan(query:AvailabilityQuery):readonly StoredRecord[] {
    if(!Number.isSafeInteger(query.offset)||query.offset<0||query.offset>=100000||!Number.isSafeInteger(query.take)||query.take<1||query.take>500||query.offset+query.take>100000)throw new Error('Read bound exceeded.');
    const keys=query.serviceId===undefined?this.scheduleOrder:this.serviceSchedules.get(query.serviceId)??[];
    // Binary seeks and offset arithmetic precede every bounded record lookup.
    const lower=this.schedulePosition(keys,query.from>query.now?query.from:query.now),upper=this.schedulePosition(keys,query.to);
    const start=Math.min(lower+query.offset,upper),end=Math.min(start+query.take,upper);
    const records:StoredRecord[]=[];
    for(let position=start;position<end;position++)records.push(structuredClone(this.schedules.get(keys[position]!.id)!));
    return records;
  }
  counts(ids:readonly string[]):Record<string,number> { if(ids.length>500)throw new Error('Read bound exceeded.');return Object.fromEntries(ids.map(id=>[id,this.occupancy.get(id)??0])); }
}
`;
}

function runtime(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  source =
    `import { AppointmentReadError, AppointmentReadIndex, readAvailability, readAppointmentSummary, type AvailabilityQuery } from './appointment-consumer-read.js';\n` +
    source;
  source = replace(
    source,
    "export interface RecordStore {",
    `export interface RecordStore {
  scanAppointmentSchedules(query:AvailabilityQuery):Promise<readonly StoredRecord[]>;
  countAppointmentOccupancy(ids:readonly string[]):Promise<Record<string,number>>;
  latestAppointmentSlot(id:string):Promise<{exists:boolean;slot?:Record<string,unknown>}>;`,
  );
  source = replace(
    source,
    "export class InMemoryRecordStore implements RecordStore {",
    `export class InMemoryRecordStore implements RecordStore {
  private readonly appointmentReadIndex=new AppointmentReadIndex();
  async scanAppointmentSchedules(query:AvailabilityQuery){return this.appointmentReadIndex.scan(query);}
  async countAppointmentOccupancy(ids:readonly string[]){return this.appointmentReadIndex.counts(ids);}
  async latestAppointmentSlot(id:string){return this.appointmentReadIndex.latest(id);}`,
  );
  source = replace(
    source,
    "this.collection(seed.entity).set(seed.id, { id: seed.id, ...seed.values });",
    "this.collection(seed.entity).set(seed.id, { id: seed.id, ...seed.values }); this.appointmentReadIndex.record(seed.entity,{id:seed.id,...seed.values});",
  );
  source = replace(
    source,
    "collection.set(record.id, record);",
    "collection.set(record.id, record); this.appointmentReadIndex.record(entityKey,record);",
  );
  source = replace(
    source,
    "this.collection(entityKey).set(recordId, record);",
    "this.collection(entityKey).set(recordId, record); this.appointmentReadIndex.record(entityKey,record);",
  );
  source = replace(
    source,
    "this.appointmentHistory.push(structuredClone(entry));",
    "this.appointmentHistory.push(structuredClone(entry)); this.appointmentReadIndex.append(entry);",
  );
  source = replace(
    source,
    "private replaceState(source: InMemoryRecordStore): void {",
    "private replaceState(source: InMemoryRecordStore): void {\n    this.appointmentReadIndex.copy(source.appointmentReadIndex);",
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    `export class ApplicationRuntime {
  private async appointmentReadAllowed(role:string,summary:boolean):Promise<void>{
    try { if(!['customer','staff',...(summary?['administrator']:[])].includes(role))throw new Error();
      if(summary)await this.assertAllowed(role,${j(p.appointmentEntity)},'read');
      if(role==='administrator'){await this.assertAllowed(role,${j(p.serviceEntity)},'read');await this.assertAllowed(role,${j(p.scheduleEntity)},'read');}
      else await this.assertAllowed(role,${j(p.scheduleEntity)},'read-availability');
    }catch{throw new AppointmentReadError(403,'appointment.forbidden');}
  }
  async appointmentAvailability(role:string,rawUrl:string,now:string){await this.appointmentReadAllowed(role,false);return readAvailability(this.store,rawUrl,now);}
  async appointmentSummary(role:string,recordId:unknown){await this.appointmentReadAllowed(role,true);return readAppointmentSummary(this.store,recordId);}`,
  );
  return source;
}

function prisma(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    f = p.fields,
    j = JSON.stringify;
  source =
    `import type { AvailabilityQuery } from './appointment-consumer-read.js';\n` +
    source;
  source = replace(
    source,
    "  constructor(private readonly prisma: PrismaClient) {}",
    `  constructor(private readonly prisma: PrismaClient) {}
  async scanAppointmentSchedules(query:AvailabilityQuery):Promise<readonly StoredRecord[]> {
    if(!Number.isSafeInteger(query.offset)||query.offset<0||query.offset>=100000||!Number.isSafeInteger(query.take)||query.take<1||query.take>500||query.offset+query.take>100000)throw new Error('Read bound exceeded.');
    const delegate=this.delegate(${j(p.scheduleEntity)}) as unknown as {findMany(input:unknown):Promise<unknown[]>};
    return (await delegate.findMany({where:{${j(f.scheduleStart)}:{gte:new Date(query.from>query.now?query.from:query.now),lt:new Date(query.to)},...(query.serviceId===undefined?{}:{${j(f.scheduleService)}:query.serviceId})},orderBy:[{${j(f.scheduleStart)}:'asc'},{id:'asc'}],skip:query.offset,take:query.take})).map(asStoredRecord);
  }
  async countAppointmentOccupancy(ids:readonly string[]):Promise<Record<string,number>> {
    if(ids.length>500)throw new Error('Read bound exceeded.');if(!ids.length)return {};
    const delegate=this.delegate(${j(p.appointmentEntity)}) as unknown as {groupBy(input:unknown):Promise<Array<Record<string,unknown>>>};
    const rows=await delegate.groupBy({by:[${j(f.appointmentSchedule)}],where:{${j(f.appointmentSchedule)}:{in:[...ids]},${j(f.appointmentStatus)}:{in:['requested','confirmed']}},_count:{_all:true}});
    return Object.fromEntries(rows.map(row=>[String(row[${j(f.appointmentSchedule)}]),(row._count as {_all:number})._all]));
  }
  async latestAppointmentSlot(id:string):Promise<{exists:boolean;slot?:Record<string,unknown>}> {
    const delegate=this.appointmentHistoryEntryDelegate() as unknown as {findMany(input:unknown):Promise<Array<{fromSlot:Record<string,unknown>|null;toSlot:Record<string,unknown>|null}>>};
    const rows=await delegate.findMany({where:{appointmentId:id,OR:[{toSlot:{not:Prisma.AnyNull}},{fromSlot:{not:Prisma.AnyNull}}]},orderBy:[{at:'desc'},{id:'desc'}],take:1,select:{toSlot:true,fromSlot:true}});
    if(rows[0])return {exists:true,slot:rows[0].toSlot??rows[0].fromSlot??undefined};
    const any=await delegate.findMany({where:{appointmentId:id},orderBy:[{at:'desc'},{id:'desc'}],take:1,select:{id:true}});
    return {exists:any.length>0};
  }`,
  );
  return replace(
    source,
    'import { PrismaClient } from "@prisma/client";',
    'import { PrismaClient, Prisma } from "@prisma/client";',
  );
}

function api(source: string, profile: AppointmentConsumerProfile): string {
  const p = profile.runtime,
    j = JSON.stringify;
  source =
    `import { AppointmentReadError, validReadId } from './appointment-consumer-read.js';\n` +
    source;
  source = replace(source, "Param, Post, Req }", "Param, Post, Req, Res }");
  const helper = `type AppointmentReadRequest={headers:Record<string,string|string[]|undefined>;originalUrl:string};
type AppointmentReadResponse={setHeader(name:string,value:string):void};
function appointmentReadHeaders(response:AppointmentReadResponse,date?:Date){response.setHeader('Cache-Control','no-store');if(date)response.setHeader('Date',date.toUTCString());}
function appointmentReadReject(error:unknown){if(error instanceof AppointmentReadError||error instanceof AppointmentDomainError)return new HttpException({code:error.code},error.status);return new HttpException({code:'appointment.availability_unavailable'},503);}
function appointmentReadContext(request:AppointmentReadRequest,summary=false,entity?:string){
  const resource=summary?${j(p.appointmentEntity)}:${j(p.scheduleEntity)};
  const actor=appointmentServerContext(request,resource,summary?'read':'read-availability');
  if(summary&&entity!==${j(p.appointmentEntity)})throw new AppointmentReadError(403,'appointment.forbidden');
  if(actor.graphHash!==${j(p.graphHash)}||!['customer','staff',...(summary?['administrator']:[])].includes(actor.role))throw new AppointmentReadError(403,'appointment.forbidden');
  if(summary){if(actor.role==='administrator'){appointmentServerContext(request,${j(p.serviceEntity)},'read');appointmentServerContext(request,${j(p.scheduleEntity)},'read');}else appointmentServerContext(request,${j(p.scheduleEntity)},'read-availability');}
  return actor;
}
function appointmentSummaryPathGuard(request:AppointmentReadRequest & {method?:string},response:AppointmentReadResponse & {status(code:number):{json(body:{code:string}):void}},next:()=>void):void {
  if(request.method&&request.method!=='GET'){next();return;}
  const match=/^\\/api\\/([^/]*)\\/([^/]*)\\/appointment-summary\\/?$/.exec(request.originalUrl.split('?')[0]??'');
  if(!match){next();return;}
  appointmentReadHeaders(response);
  try {
    appointmentReadContext(request,true,${j(p.appointmentEntity)});
    let entity:string,id:string;
    try{entity=decodeURIComponent(match[1]!);id=decodeURIComponent(match[2]!);}catch{throw new AppointmentReadError(400,'appointment.summary_invalid_id');}
    if(entity!==${j(p.appointmentEntity)})throw new AppointmentReadError(403,'appointment.forbidden');
    if(!validReadId(id))throw new AppointmentReadError(400,'appointment.summary_invalid_id');
  }catch(error){const known=error instanceof AppointmentReadError||error instanceof AppointmentDomainError;response.status(known?error.status:503).json({code:known?error.code:'appointment.availability_unavailable'});return;}
  next();
}
`;
  source = replace(
    source,
    '@Controller("api")',
    `${helper}\n@Controller("api")`,
  );
  source = replace(
    source,
    "class GeneratedController {",
    `class GeneratedController {
  @Get('appointment-availability')
  async appointmentAvailability(@Req() request:AppointmentReadRequest,@Res({passthrough:true}) response:AppointmentReadResponse){appointmentReadHeaders(response);try{const actor=appointmentReadContext(request);const now=new Date();const result=await applicationRuntime.appointmentAvailability(actor.role,request.originalUrl,now.toISOString());appointmentReadHeaders(response,now);return result;}catch(error){throw appointmentReadReject(error);}}
  @Get(':entity/:recordId/appointment-summary')
  async appointmentSummary(@Param('entity') entity:string,@Param('recordId') recordId:string,@Req() request:AppointmentReadRequest,@Res({passthrough:true}) response:AppointmentReadResponse){appointmentReadHeaders(response);try{const actor=appointmentReadContext(request,true,entity);const now=new Date();const result=await applicationRuntime.appointmentSummary(actor.role,recordId);appointmentReadHeaders(response,now);return result;}catch(error){throw appointmentReadReject(error);}}
`,
  );
  source = replace(
    source,
    "async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined> }, @Res({passthrough:true}) response:AppointmentReadResponse) {",
  );
  source = replace(
    source,
    "return await applicationRuntime.list(roleFrom(request, entity, 'read'), entity);",
    `const result=await applicationRuntime.list(roleFrom(request, entity, 'read'), entity);if(entity===${j(p.appointmentEntity)})appointmentReadHeaders(response,new Date());return result;`,
  );
  return replace(
    source,
    "  const app = await NestFactory.create(GeneratedModule);",
    "  const app = await NestFactory.create(GeneratedModule);\n  app.use(appointmentSummaryPathGuard);",
  );
}

function proxy(source: string, profile: AppointmentConsumerProfile): string {
  source =
    `function appointmentReadPath(path:readonly string[]):boolean {return (path.length===1&&(path[0]==='appointment-availability'||path[0]===${JSON.stringify(profile.runtime.appointmentEntity)}))||(path.length===3&&path[2]==='appointment-summary');}\n` +
    source;
  source = replace(
    source,
    "method: request.method,",
    "method: request.method, cache: 'no-store',",
  );
  source = replace(
    source,
    "  throw lastError instanceof Error ? lastError : new Error('Upstream request failed.');",
    "  if(init.method==='GET'&&appointmentReadPath(input.pathname.split('/').slice(2).map(decodeURIComponent)))return new Response(JSON.stringify({code:'appointment.availability_unavailable'}),{status:503,headers:{'content-type':'application/json','Cache-Control':'no-store','Date':''}});\n  throw lastError instanceof Error ? lastError : new Error('Upstream request failed.');",
  );
  // An empty Date prevents the HTTP server from substituting its own clock when upstream omitted it.
  return replace(
    source,
    "headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }",
    `headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', ...(appointmentReadPath(path)?{'Cache-Control':'no-store','Date':response.headers.get('date')??''}:{}) }`,
  );
}

export function renderAppointmentConsumerFile(
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
