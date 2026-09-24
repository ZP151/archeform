import type { ApplicationGraphV1 } from "@factory/graph";
import type { ServiceWorkOrdersProfile } from "./service-work-orders-contract.js";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import {
  approvalWorkspacePresentation,
  renderWorkspaceStyles,
} from "./approval-workspace-presentation.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";

/** Factory-authored composition of approved shell, controls and pinned icons. */
export const serviceWorkOrdersPresentation = {
  key: "service-work-orders-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [...approvalWorkspacePresentation.reuse, "native-date-input"],
  semanticGap:
    "Principal-specific assignment, shared dispatch and technician views, resolution history and exact-command recovery need a Work Orders composition.",
  iconPackage: "lucide-static@0.468.0",
  iconLicense: "ISC",
} as const;

export function renderServiceWorkOrdersWorkspace(
  graph: ApplicationGraphV1,
  profile: ServiceWorkOrdersProfile,
  fixture: boolean,
): string {
  const projection = createGeneratedPageRuntimeProjection(graph);
  const routes = Object.fromEntries(
    Object.entries(profile.pages).map(([key, id]) => [
      key,
      projection.pages.find((page) => page.id === id)?.route,
    ]),
  );
  if (Object.values(routes).some((route) => typeof route !== "string"))
    throw new Error("Work Orders page projection is incomplete.");
  const config = {
    name: graph.metadata.name,
    themeMode: projection.themeMode,
    entity: profile.orderEntity,
    roles: profile.roles,
    routes,
    pages: Object.fromEntries(
      Object.entries(profile.pages).map(([key, id]) => [
        key,
        projection.pages.find((page) => page.id === id)?.title,
      ]),
    ),
    principalStorageKey: "work-orders-principal-" + graph.metadata.id,
    fixture,
  };
  const substitutions: Readonly<Record<string, string>> = {
    CONFIG_JSON: JSON.stringify(config).replaceAll("<", "\\u003c"),
    ICONS_JSON: JSON.stringify(getCustomerIconAssets().icons).replaceAll(
      "<",
      "\\u003c",
    ),
  };
  return String.raw`"use client";
// service-work-orders-presentation@1.0.0 — Factory-authored.
import { useCallback, useEffect, useRef, useState } from "react";
const config = CONFIG_JSON;
const icons = ICONS_JSON;
type Order = { id:string; version:number; title:string; serviceLocation:string; priority:"low"|"medium"|"high"; description:string|null; dueDate:string|null; status:"open"|"in-progress"|"resolved"|"cancelled"; assigneePrincipalId:string|null };
type HistoryEvent = { apiVersion:"factory.generated.work-order-history-entry/v1"; id:string; workOrder:string; action:string; orderVersion:number; toStatus:string; fromStatus:string|null; fromAssigneePrincipalId:string|null; toAssigneePrincipalId:string|null; actorPrincipalId:string; actorRole:string; recordedAt:string; note:string|null; beforeTitle:string|null; afterTitle:string|null; beforeServiceLocation:string|null; afterServiceLocation:string|null; beforePriority:string|null; afterPriority:string|null; beforeDescription:string|null; afterDescription:string|null; beforeDueDate:string|null; afterDueDate:string|null };
type Detail = Order & { latestResolution:(HistoryEvent & {historical:boolean})|null };
type Assignee = { principalId:string; displayName:string };
type Principal = {id:string; session:string; role:string; name:string};
type Draft = {title:string;serviceLocation:string;priority:string;description:string;dueDate:string;reason:string;resolutionNote:string;assigneePrincipalId:string};
type Operation = "create"|"update"|"assign"|"reassign"|"start"|"resolve"|"reopen"|"cancel";
type FrozenCommand = {principalId:string;path:string;method:"POST";body:string;key:string;operation:Operation;recordId:string|null};
const principals:readonly Principal[] = [
 {id:'fixture-principal-dispatcher',session:'fixture-session-dispatcher',role:config.roles.dispatcher,name:'Dispatcher'},
 {id:'fixture-principal-technician-a',session:'fixture-session-technician-a',role:config.roles.technician,name:'Technician A'},
 {id:'fixture-principal-technician-b',session:'fixture-session-technician-b',role:config.roles.technician,name:'Technician B'},
];
const emptyDraft:Draft={title:'',serviceLocation:'',priority:'medium',description:'',dueDate:'',reason:'',resolutionNote:'',assigneePrincipalId:''};
const actionNames:Readonly<Record<Operation,string>>={create:'Create order',update:'Save correction',assign:'Assign',reassign:'Reassign',start:'Start work',resolve:'Resolve',reopen:'Reopen',cancel:'Cancel order'};
const statusNames:Readonly<Record<Order['status'],string>>={open:'Open','in-progress':'In progress',resolved:'Resolved',cancelled:'Cancelled'};
function Icon({name}:{name:keyof typeof icons}){return <span className='work-order-icon' aria-hidden='true' dangerouslySetInnerHTML={{__html:icons[name]}}/>;}
function headers(principal:Principal,key?:string):Record<string,string>{return {'x-factory-fixture-session':principal.session,...(key?{'x-factory-idempotency-key':key}:{})};}
function requestError(status:number):string {if(status===400)return 'Check the entered values. Your draft is retained.';if(status===409)return 'This order changed. Review the current saved values before applying your draft again.';if(status===403)return 'This action is unavailable to this staff member.';if(status===404)return 'This order is no longer in your assigned work.';return 'The service could not complete the request. Try again.';}
function routeFrom(path:string):"list"|"form"|"detail"|"queue"|"missing"{const pathname=path.split('?')[0];for(const key of ['list','form','detail','queue'] as const)if(config.routes[key]===pathname)return key;return 'missing';}
function draftFrom(order:Order):Draft{return {title:order.title,serviceLocation:order.serviceLocation,priority:order.priority,description:order.description??'',dueDate:order.dueDate??'',reason:'',resolutionNote:'',assigneePrincipalId:order.assigneePrincipalId??''};}
function dateText(value:string|null){return value??'No due date';}
function principalName(id:string|null,roster:readonly Assignee[]){if(!id)return 'Unassigned';return roster.find(person=>person.principalId===id)?.displayName??principals.find(person=>person.id===id)?.name??'Assigned technician';}
function historyTitle(entry:HistoryEvent):string {return ({create:'Created',update:'Corrected details',assign:'Assigned',reassign:'Reassigned',start:'Started work',resolve:'Resolution report',reopen:'Reopened',cancel:'Cancelled'} as Record<string,string>)[entry.action]??'Order change';}
function historySummary(entry:HistoryEvent,roster:readonly Assignee[]):string {
 if(entry.action==='create')return 'Created'+(entry.afterServiceLocation?' at '+entry.afterServiceLocation:'');
 if(entry.action==='assign')return 'Assigned to '+principalName(entry.toAssigneePrincipalId,roster);
 if(entry.action==='reassign')return 'Reassigned from '+principalName(entry.fromAssigneePrincipalId,roster)+' to '+principalName(entry.toAssigneePrincipalId,roster);
 if(entry.action==='update')return 'Saved correction to order details';
 if(entry.action==='start')return 'Work started';
 if(entry.action==='resolve')return 'Work reported complete';
 if(entry.action==='reopen')return 'Reopened for further work';
 if(entry.action==='cancel')return 'Order cancelled';
 return 'Order changed';
}
function validDraft(operation:Operation,draft:Draft):string|null {
 if(operation==='create'||operation==='update'){
  if(!draft.title.trim()||draft.title.trim().length>160)return 'Enter a title of up to 160 characters.';
  if(!draft.serviceLocation.trim()||draft.serviceLocation.trim().length>160)return 'Enter a service location of up to 160 characters.';
  if(!['low','medium','high'].includes(draft.priority))return 'Choose a priority.';
  if(draft.description.trim().length>2000)return 'Keep the description within 2000 characters.';
  if(draft.dueDate){const date=new Date(draft.dueDate+'T00:00:00.000Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==draft.dueDate)return 'Enter a valid due date.';}
 }
 if(['update','reassign','reopen','cancel'].includes(operation)&&(!draft.reason.trim()||draft.reason.trim().length>500))return 'Enter a reason of up to 500 characters.';
 if(operation==='resolve'&&(!draft.resolutionNote.trim()||draft.resolutionNote.trim().length>2000))return 'Enter a work report of up to 2000 characters.';
 if(['assign','reassign'].includes(operation)&&!draft.assigneePrincipalId)return 'Choose a technician.';
 return null;
}
function bodyFor(operation:Operation,draft:Draft,version:number){
 const values={title:draft.title.trim(),serviceLocation:draft.serviceLocation.trim(),priority:draft.priority,description:draft.description.trim()||null,dueDate:draft.dueDate||null};
 if(operation==='create')return {values};
 if(operation==='update')return {expectedVersion:version,reason:draft.reason.trim(),values};
 if(operation==='assign')return {expectedVersion:version,assigneePrincipalId:draft.assigneePrincipalId};
 if(operation==='reassign')return {expectedVersion:version,assigneePrincipalId:draft.assigneePrincipalId,reason:draft.reason.trim()};
 if(operation==='resolve')return {expectedVersion:version,resolutionNote:draft.resolutionNote.trim()};
 if(operation==='reopen'||operation==='cancel')return {expectedVersion:version,reason:draft.reason.trim()};
 return {expectedVersion:version};
}
function AppWorkspace({principal,requestedPath,locked,onLock}:{principal:Principal;requestedPath:string;locked:boolean;onLock:(value:boolean)=>void}){
 const initialPath=typeof window==='undefined'?requestedPath:window.location.pathname+window.location.search;
 const [path,setPath]=useState(initialPath);
 const [selectedId,setSelectedId]=useState<string|null>(()=>new URLSearchParams(initialPath.split('?')[1]??'').get('id'));
 const [orders,setOrders]=useState<readonly Order[]>([]);
 const [nextAfterId,setNextAfterId]=useState<string|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [history,setHistory]=useState<readonly HistoryEvent[]>([]);
 const [nextBeforeVersion,setNextBeforeVersion]=useState<number|null>(null);
 const [roster,setRoster]=useState<readonly Assignee[]>([]);
 const [loading,setLoading]=useState(true);
 const [detailLoading,setDetailLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [detailError,setDetailError]=useState<string|null>(null);
 const [notice,setNotice]=useState<string|null>(null);
 const [operation,setOperation]=useState<Operation|null>(null);
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const [pending,setPending]=useState(false);
 const [uncertain,setUncertain]=useState<FrozenCommand|null>(null);
 const [conflict,setConflict]=useState(false);
 const [filter,setFilter]=useState('');
 const listEpoch=useRef(0),detailEpoch=useRef(0),rosterEpoch=useRef(0);
 const selected=useRef(selectedId);selected.current=selectedId;
 const activeCommand=useRef<FrozenCommand|null>(null);
 const commandInFlight=useRef(false);
 const pathRef=useRef(path);pathRef.current=path;
 const isDispatcher=principal.role===config.roles.dispatcher;
 const view=routeFrom(path);
 const queueView=view==='list'||view==='queue';
 const backRoute=isDispatcher?config.routes.list:config.routes.queue;
 const loadQueue=useCallback(async(afterId?:string)=>{
  const epoch=++listEpoch.current;setLoading(true);setError(null);
  try{const url='/api/'+encodeURIComponent(config.entity)+'?limit=50'+(afterId?'&afterId='+encodeURIComponent(afterId):'');
   const response=await fetch(url,{headers:headers(principal)});
   if(!response.ok)throw Error(requestError(response.status));
   const data=await response.json() as {items:Order[];nextAfterId:string|null};
   if(epoch===listEpoch.current){setOrders(previous=>afterId?[...previous,...data.items]:data.items);setNextAfterId(data.nextAfterId);}
  }catch(reason){if(epoch===listEpoch.current){setError(reason instanceof Error?reason.message:'Could not load assigned work.');if(!afterId)setOrders([]);}}
  finally{if(epoch===listEpoch.current)setLoading(false);}
 },[principal]);
 const loadDetail=useCallback(async(id:string)=>{
  const epoch=++detailEpoch.current;setDetailLoading(true);setDetailError(null);setDetail(null);setHistory([]);setNextBeforeVersion(null);
  try{const base='/api/'+encodeURIComponent(config.entity)+'/'+encodeURIComponent(id);
   const response=await fetch(base,{headers:headers(principal)});
   if(response.status===404){if(epoch===detailEpoch.current){setSelectedId(null);setDetail(null);setHistory([]);setDetailError('This order is no longer available to this staff member. The queue has been refreshed.');void loadQueue();}return;}
   if(!response.ok)throw Error(requestError(response.status));
   const record=await response.json() as Detail;
   if(epoch!==detailEpoch.current||selected.current!==id)return;
   setDetail(record);
   const eventResponse=await fetch(base+'/history?limit=50',{headers:headers(principal)});
   if(eventResponse.status===404){if(epoch===detailEpoch.current){setSelectedId(null);setDetail(null);setHistory([]);setDetailError('Assignment changed. Your queue has been refreshed.');void loadQueue();}return;}
   if(!eventResponse.ok)throw Error(requestError(eventResponse.status));
   const events=await eventResponse.json() as {items:HistoryEvent[];nextBeforeVersion:number|null};
   if(epoch===detailEpoch.current&&selected.current===id){setHistory(events.items);setNextBeforeVersion(events.nextBeforeVersion);}
  }catch(reason){if(epoch===detailEpoch.current&&selected.current===id)setDetailError(reason instanceof Error?reason.message:'Could not load this order.');}
  finally{if(epoch===detailEpoch.current)setDetailLoading(false);}
 },[principal,loadQueue]);
 useEffect(()=>{void loadQueue();return()=>{listEpoch.current++;};},[loadQueue]);
 useEffect(()=>{if(selectedId)void loadDetail(selectedId);else{detailEpoch.current++;setDetail(null);setHistory([]);}},[selectedId,loadDetail]);
 useEffect(()=>{if(!isDispatcher)return;const epoch=++rosterEpoch.current;void (async()=>{try{const response=await fetch('/api/work-order-assignees',{headers:headers(principal)});if(response.ok){const values=await response.json() as Assignee[];if(epoch===rosterEpoch.current)setRoster(values);}}catch{}})();return()=>{rosterEpoch.current++;};},[isDispatcher,principal]);
 useEffect(()=>{const onPop=()=>{if(activeCommand.current){window.history.pushState({},'',pathRef.current);return;}const next=window.location.pathname+window.location.search;setPath(next);setSelectedId(new URLSearchParams(window.location.search).get('id'));setOperation(null);};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
 function navigate(kind:'list'|'form'|'detail'|'queue',id?:string,confirmedCreate=false){if(!confirmedCreate&&(activeCommand.current||locked||uncertain))return;const next=config.routes[kind]+(id?'?id='+encodeURIComponent(id):'');window.history.pushState({},'',next);setPath(next);setSelectedId(id??null);setOperation(null);setDraft(emptyDraft);setConflict(false);setError(null);setDetailError(null);setNotice(null);}
 function edit(value:keyof Draft,next:string){setDraft(previous=>({...previous,[value]:next}));}
 function open(next:Operation){if(activeCommand.current||locked||uncertain)return;setOperation(next);setDraft(next==='create'?emptyDraft:detail?draftFrom(detail):emptyDraft);setConflict(false);setError(null);setDetailError(null);setNotice(null);}
 function makeCommand(next:Operation):FrozenCommand|null{
  const validation=validDraft(next,draft);if(validation){setError(validation);return null;}
  const id=next==='create'?null:detail?.id??null;if(next!=='create'&&!id){setError('Open an order before making this change.');return null;}
  const path='/api/'+encodeURIComponent(config.entity)+(id?'/'+encodeURIComponent(id)+'/events/'+next:'');
  return {principalId:principal.id,path,method:'POST',body:JSON.stringify(bodyFor(next,draft,detail?.version??0)),key:crypto.randomUUID(),operation:next,recordId:id};
 }
 async function execute(command:FrozenCommand){
  if(command.principalId!==principal.id||commandInFlight.current||(activeCommand.current&&activeCommand.current!==command))return;
  activeCommand.current=command;commandInFlight.current=true;onLock(true);setPending(true);setError(null);setNotice(null);
  try{const response=await fetch(command.path,{method:command.method,headers:{...headers(principal,command.key),'content-type':'application/json'},body:command.body});
   if(!response.ok){if(response.status===400||response.status===403||response.status===404||response.status===409){activeCommand.current=null;setUncertain(null);onLock(false);
     if(response.status===400||response.status===409){setConflict(!!command.recordId);if(command.recordId)await loadDetail(command.recordId);else await loadQueue();setError(requestError(response.status));return;}
     setDetail(null);setHistory([]);setSelectedId(null);setOperation(null);await loadQueue();setError(requestError(response.status));return;}
    setUncertain(command);setError('The result is unknown. Retry this exact change to find out whether it was saved.');return;}
   const saved=command.operation==='create'?await response.json() as Order:null;
   activeCommand.current=null;setUncertain(null);onLock(false);setOperation(null);setConflict(false);setDraft(emptyDraft);setNotice(actionNames[command.operation]+' saved. Current order and history refreshed.');
   await loadQueue();
   if(saved){navigate('detail',saved.id,true);}
   else if(command.recordId)await loadDetail(command.recordId);
  }catch{activeCommand.current=command;setUncertain(command);onLock(true);setError('The result is unknown. Retry this exact change to find out whether it was saved.');}
  finally{commandInFlight.current=false;setPending(false);}
 }
 function submit(event:React.FormEvent){event.preventDefault();if(!operation||pending||uncertain)return;const command=makeCommand(operation);if(command)void execute(command);}
 const displayed=orders.filter(order=>!filter.trim()||[order.title,order.serviceLocation,order.status,order.priority,principalName(order.assigneePrincipalId,roster)].some(value=>value.toLowerCase().includes(filter.trim().toLowerCase())));
 const canStart=!isDispatcher&&detail?.status==='open'&&detail.assigneePrincipalId===principal.id;
 const canResolve=!isDispatcher&&detail?.status==='in-progress'&&detail.assigneePrincipalId===principal.id;
 const canEdit=isDispatcher&&(detail?.status==='open'||detail?.status==='in-progress');
 const canAssign=isDispatcher&&detail?.status==='open'&&!detail.assigneePrincipalId;
 const canReassign=isDispatcher&&(detail?.status==='open'||detail?.status==='in-progress')&&!!detail.assigneePrincipalId;
 const canReopen=isDispatcher&&detail?.status==='resolved';
 const action=(kind:Operation)=> <button type='button' className={kind==='start'||kind==='resolve'?'generated-primary':''} disabled={locked||pending||!!operation} onClick={()=>open(kind)}>{kind==='update'?'Edit details':actionNames[kind]}</button>;
 const field=(key:keyof Draft,label:string,control:'input'|'textarea'|'date'|'select'='input')=><label className='work-order-field' htmlFor={'work-order-'+key}>{label}{control==='textarea'?<textarea id={'work-order-'+key} maxLength={key==='description'||key==='resolutionNote'?2000:500} rows={key==='description'||key==='resolutionNote'?4:2} value={draft[key]} onChange={event=>edit(key,event.target.value)}/>:control==='select'?<select id={'work-order-'+key} value={draft[key]} onChange={event=>edit(key,event.target.value)}><option value=''>Choose a technician</option>{roster.filter(person=>operation!=='reassign'||person.principalId!==detail?.assigneePrincipalId).map(person=><option key={person.principalId} value={person.principalId}>{person.displayName}</option>)}</select>:<input id={'work-order-'+key} type={control==='date'?'date':'text'} maxLength={key==='title'||key==='serviceLocation'?160:undefined} value={draft[key]} onChange={event=>edit(key,event.target.value)}/>}</label>;
 const form=operation?<form className='work-order-editor' onSubmit={submit}><h3>{operation==='update'?'Correct saved details':actionNames[operation]}</h3><fieldset disabled={pending||!!uncertain}>
  {operation==='create'||operation==='update'?<div className='work-order-form-grid'>{field('title','Title')}{field('serviceLocation','Service location')}<label className='work-order-field' htmlFor='work-order-priority'>Priority<select id='work-order-priority' value={draft.priority} onChange={event=>edit('priority',event.target.value)}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select></label>{field('dueDate','Due date','date')}{field('description','Description','textarea')}</div>:null}
  {operation==='assign'||operation==='reassign'?field('assigneePrincipalId','Technician','select'):null}
  {operation==='resolve'?field('resolutionNote','Work report','textarea'):null}
  {['update','reassign','reopen','cancel'].includes(operation)?field('reason','Reason','textarea'):null}
 </fieldset>{conflict&&detail?<p className='work-order-current' role='status'>Current saved order: {detail.title} · {detail.serviceLocation} · {statusNames[detail.status]} · {principalName(detail.assigneePrincipalId,roster)}. Review before reapplying your draft.</p>:null}
 <div className='work-order-form-actions'><button type='submit' className='generated-primary' disabled={pending||!!uncertain}>{conflict?'Apply draft to current order':actionNames[operation]}</button><button type='button' disabled={pending||!!uncertain} onClick={()=>{setOperation(null);setConflict(false);setError(null);}}>Close form</button></div></form>:null;
 const pageTitle=view==='list'?config.pages.list:view==='queue'?config.pages.queue:view==='form'?config.pages.form:view==='detail'?config.pages.detail:config.name;
 return <><aside className='work-order-workspace-sidebar'><div className='work-order-workspace-brand'><span className='work-order-workspace-mark'><Icon name='receipt-text'/></span><div><strong>{config.name}</strong><span>Service work</span></div></div><nav aria-label='Application routes'><a href={config.routes[isDispatcher?'list':'queue']} aria-current={queueView?'page':undefined} onClick={event=>{event.preventDefault();navigate(isDispatcher?'list':'queue');}}><Icon name='house'/><span>{isDispatcher?config.pages.list:config.pages.queue}</span></a>{isDispatcher?<a href={config.routes.form} aria-current={view==='form'?'page':undefined} onClick={event=>{event.preventDefault();navigate('form');open('create');}}><Icon name='receipt-text'/><span>{config.pages.form}</span></a>:null}</nav><p className='work-order-sidebar-foot'>Local demo — synthetic staff</p></aside>
 <div className='work-order-workspace-canvas'><header className='work-order-workspace-heading'><div><h1>{pageTitle}</h1></div><button className='work-order-icon-button' type='button' aria-label='Refresh' title='Refresh' disabled={locked||pending} onClick={()=>{void loadQueue();if(selectedId)void loadDetail(selectedId);}}><Icon name='refresh-cw'/></button></header>
 <div className='work-order-mobile-nav'><span>Local demo — synthetic staff</span><select aria-label='Demo staff member' value={principal.id} disabled={locked||pending} onChange={event=>{try{sessionStorage.setItem(config.principalStorageKey,event.target.value);}catch{}window.dispatchEvent(new CustomEvent('work-order-principal',{detail:event.target.value}));}}>{principals.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
 {error?<div className='work-order-feedback' role='alert'><p>{error}</p>{uncertain?<button type='button' disabled={pending} onClick={()=>void execute(uncertain)}>Retry same change</button>:null}</div>:null}
 {notice?<p className='work-order-notice' role='status'><Icon name='circle-check'/>{notice}</p>:null}{pending?<p role='status'>Saving change…</p>:null}
 {view==='missing'?<section className='work-order-empty'><h2>Page not found</h2><button onClick={()=>navigate(isDispatcher?'list':'queue')}>Return to work orders</button></section>:null}
 {view==='form'&&isDispatcher?<>{!operation?<button className='generated-primary' onClick={()=>open('create')}>Create order</button>:null}{form}</>:null}
 {queueView||view==='detail'?<div className={'work-order-workarea'+(view==='detail'?' is-detail-route':'')}><section className={'work-order-queue'+(isDispatcher?'':' is-technician')} aria-label={isDispatcher?'Dispatch queue':'Assigned work'}><div className='work-order-section-heading'><div><h2>{isDispatcher?'Dispatch queue':'Assigned work'}</h2><p>{loading?'Loading…':orders.length+' loaded '+(orders.length===1?'order':'orders')}{nextAfterId?' · More available':''}</p></div>{isDispatcher?<button className='generated-primary' disabled={locked} onClick={()=>{navigate('form');open('create');}}>Create order</button>:null}</div><label className='work-order-search' htmlFor='work-order-filter'>Filter loaded orders<input id='work-order-filter' type='search' value={filter} onChange={event=>setFilter(event.target.value)} placeholder='Title, location or status'/></label>{loading&&orders.length===0?<p role='status' className='work-order-state'>Loading work orders…</p>:error&&orders.length===0?<p className='work-order-state'>Queue unavailable. Use Refresh to try again.</p>:displayed.length?<ul className='work-order-list'>{displayed.map(order=><li key={order.id}><button className='work-order-card' aria-current={selectedId===order.id?'true':undefined} onClick={()=>navigate('detail',order.id)} disabled={locked}><span className='work-order-card-top'><strong>{order.title}</strong><span className={'work-order-priority is-'+order.priority}>{order.priority} priority</span></span><span className='work-order-location'>{order.serviceLocation}</span><span className='work-order-card-bottom'><span className={'work-order-status is-'+order.status}>{statusNames[order.status]}</span><span>{principalName(order.assigneePrincipalId,roster)}</span></span></button></li>)}</ul>:<div className='work-order-empty'><h3>{filter?'No loaded orders match':'No work orders here'}</h3><p>{filter?'Clear the filter to see the loaded queue.':isDispatcher?'Create an order to start dispatching.':'Orders assigned to this technician will appear here.'}</p></div>}{nextAfterId?<button type='button' disabled={loading||locked} onClick={()=>void loadQueue(nextAfterId)}>Load more orders</button>:null}</section>
 <section className='work-order-detail' aria-label='Work order detail'>{view==='detail'?<button type='button' className='work-order-icon-button work-order-back' aria-label='Back to queue' title='Back to queue' disabled={locked} onClick={()=>navigate(isDispatcher?'list':'queue')}><Icon name='arrow-left'/></button>:null}{detailError?<div className='work-order-feedback' role='alert'><p>{detailError}</p></div>:detailLoading?<p role='status'>Loading order and history…</p>:detail?<><div className='work-order-detail-head'><span className={'work-order-priority is-'+detail.priority}>{detail.priority} priority</span><h2>{detail.title}</h2><p className='work-order-detail-location'>{detail.serviceLocation}</p><div className='work-order-detail-status'><span className={'work-order-status is-'+detail.status}>{statusNames[detail.status]}</span><span>{principalName(detail.assigneePrincipalId,roster)}</span></div></div><div className='work-order-quick-actions'>{canStart?action('start'):null}{canResolve?action('resolve'):null}{canEdit?action('update'):null}{canAssign?action('assign'):null}{canReassign?action('reassign'):null}{canReopen?action('reopen'):null}{canEdit?action('cancel'):null}</div>{detail.status==='cancelled'?<p className='work-order-cancelled'>Cancelled order. Its saved details and history remain available.</p>:null}{form}<dl className='work-order-facts'><div><dt>Due date</dt><dd>{dateText(detail.dueDate)}</dd></div><div className='work-order-description'><dt>Description</dt><dd>{detail.description||'No description provided.'}</dd></div></dl>{detail.latestResolution?<section className='work-order-report'><h3>{detail.latestResolution.historical?'Earlier resolution report':'Latest resolution report'}</h3><p>{detail.latestResolution.note}</p><span>Recorded by {principalName(detail.latestResolution.actorPrincipalId,roster)}</span></section>:null}<section className='work-order-history'><h3>Order history</h3>{history.length?<ol>{history.map(entry=><li key={entry.id}><div><strong>{historyTitle(entry)}</strong></div><p>{historySummary(entry,roster)}</p>{entry.note?<p><strong>{entry.action==='resolve'?'Work report':'Reason'}:</strong> {entry.note}</p>:null}{entry.action==='update'?<dl>{(['Title','ServiceLocation','Priority','Description','DueDate'] as const).map(key=><div key={key}><dt>{key==='ServiceLocation'?'Location':key==='DueDate'?'Due date':key}</dt><dd>{String((entry as unknown as Record<string,string|null>)['before'+key]??'Not provided')} → {String((entry as unknown as Record<string,string|null>)['after'+key]??'Not provided')}</dd></div>)}</dl>:null}<small>{principalName(entry.actorPrincipalId,roster)} · <time dateTime={entry.recordedAt}>{new Date(entry.recordedAt).toLocaleString()}</time></small></li>)}</ol>:<p>No history available.</p>}{nextBeforeVersion!==null?<button type='button' onClick={async()=>{if(!detail)return;const response=await fetch('/api/'+encodeURIComponent(config.entity)+'/'+encodeURIComponent(detail.id)+'/history?limit=50&beforeVersion='+nextBeforeVersion,{headers:headers(principal)});if(response.ok){const data=await response.json() as {items:HistoryEvent[];nextBeforeVersion:number|null};if(selected.current===detail.id){setHistory(previous=>[...previous,...data.items]);setNextBeforeVersion(data.nextBeforeVersion);}}else setDetailError(requestError(response.status));}}>Load earlier history</button>:null}</section></>:<div className='work-order-empty'><h3>Select an order</h3><p>Open a queue item to review its work and history.</p></div>}</section></div>:null}</div></>;
}
export function GeneratedApplication({requestedPath}:{requestedPath:string}){
 const [principalId,setPrincipalId]=useState<string|null>(null);
 const [locked,setLocked]=useState(false);
 useEffect(()=>{let initial=principals[0].id;try{const saved=sessionStorage.getItem(config.principalStorageKey);if(principals.some(person=>person.id===saved))initial=saved!;}catch{}setPrincipalId(initial);const onPrincipal=(event:globalThis.Event)=>{const id=(event as CustomEvent<string>).detail;if(principals.some(person=>person.id===id))setPrincipalId(id);};window.addEventListener('work-order-principal',onPrincipal);return()=>window.removeEventListener('work-order-principal',onPrincipal);},[]);
 if(!principalId)return <main className='generated-app work-order-v1' data-theme={config.themeMode}><p role='status'>Loading local demo — synthetic staff…</p></main>;
 const principal=principals.find(person=>person.id===principalId)!;
 return <main className='generated-app work-order-v1' data-theme={config.themeMode}><div className='work-order-principal'><label htmlFor='work-order-principal'>Local demo — synthetic staff</label><select id='work-order-principal' value={principal.id} disabled={locked} onChange={event=>{const next=event.target.value;try{sessionStorage.setItem(config.principalStorageKey,next);}catch{}setPrincipalId(next);}}>{principals.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></div><AppWorkspace key={principal.id} principal={principal} requestedPath={requestedPath} locked={locked} onLock={setLocked}/></main>;
}
`.replace(/CONFIG_JSON|ICONS_JSON/g, (key) => substitutions[key]!);
}

export function renderServiceWorkOrdersStyles(): readonly string[] {
  return [
    renderWorkspaceStyles("work-order").join("\n"),
    String.raw`
.work-order-v1.generated-app{--work-order-tint:color-mix(in srgb,var(--factory-accent) 8%,var(--factory-bg));grid-template-columns:15.5rem minmax(0,1fr);color:var(--factory-text)}
.work-order-v1 *{box-sizing:border-box}
.work-order-v1 :is(h1,h2,h3,p){margin:0}
.work-order-v1 :is(button,a,input,select,textarea){font:inherit;min-height:44px}
.work-order-v1 button{padding:.65rem .9rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text);cursor:pointer}
.work-order-v1 button.generated-primary{background:var(--factory-accent);border-color:var(--factory-accent);color:var(--factory-accent-text);font-weight:600}
.work-order-v1 :is(button,input,select,textarea):disabled{opacity:.55;cursor:not-allowed}
.work-order-v1 :is(input,select,textarea){max-width:100%;padding:.65rem .75rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text)}
.work-order-v1 :is(button,a,input,select,textarea):focus-visible{outline:3px solid var(--factory-accent);outline-offset:3px}
.work-order-v1 .work-order-icon{display:inline-flex;width:1.15rem;height:1.15rem;flex:0 0 auto}
.work-order-v1 .work-order-icon svg{width:100%;height:100%}
.work-order-v1 .work-order-icon-button{display:inline-grid;place-items:center;width:44px;height:44px;min-width:44px;padding:0}
.work-order-v1 .work-order-workspace-sidebar{grid-column:1;grid-row:1;display:flex;flex-direction:column;gap:2rem;min-width:0;padding:2rem 1.25rem;background:var(--factory-accent);color:var(--factory-accent-text)}
.work-order-v1 .work-order-workspace-brand{display:flex;align-items:center;gap:.75rem;min-width:0}.work-order-v1 .work-order-workspace-brand>div{display:grid;min-width:0}.work-order-v1 .work-order-workspace-brand strong{overflow-wrap:anywhere}.work-order-v1 .work-order-workspace-brand span:last-child{font-size:.85rem}
.work-order-v1 .work-order-workspace-mark{display:grid;place-items:center;width:2.25rem;height:2.25rem;flex:0 0 auto;border:1px solid color-mix(in srgb,var(--factory-accent-text) 50%,transparent);border-radius:var(--factory-radius-radius-base)}
.work-order-v1 .work-order-workspace-sidebar nav{display:grid;gap:.4rem}.work-order-v1 .work-order-workspace-sidebar nav a{display:flex;justify-content:start;gap:.65rem;padding:.65rem;color:inherit;text-decoration:none;border-radius:var(--factory-radius-radius-base)}.work-order-v1 .work-order-workspace-sidebar nav a[aria-current=page]{background:var(--factory-surface);color:var(--factory-accent)}
.work-order-v1 .work-order-sidebar-foot{margin-top:auto;font-size:.8rem;color:inherit}.work-order-v1 .work-order-principal{position:absolute;right:2rem;top:1rem;display:flex;align-items:center;gap:.7rem;font-size:.8rem}.work-order-v1 .work-order-principal select{max-width:12rem}
.work-order-v1 .work-order-workspace-canvas{grid-column:2;min-width:0;width:100%;max-width:110rem;margin:0 auto;padding:5.5rem clamp(1.25rem,3.5vw,3.5rem) 3rem}.work-order-v1 .work-order-workspace-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}.work-order-v1 .work-order-workspace-heading h1{font-size:clamp(1.7rem,2.2vw,2.4rem);line-height:1.2;letter-spacing:-.025em;overflow-wrap:anywhere}.work-order-v1 .work-order-eyebrow{font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--factory-accent);margin-bottom:.4rem}.work-order-v1 .work-order-mobile-nav{display:none}
.work-order-v1 .work-order-workarea{display:grid;grid-template-columns:minmax(20rem,.9fr) minmax(0,1.1fr);gap:1.25rem;align-items:start}.work-order-v1 .work-order-queue,.work-order-v1 .work-order-detail{min-width:0;background:var(--factory-surface);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-lg)}.work-order-v1 .work-order-queue{padding:1.2rem}.work-order-v1 .work-order-detail{padding:1.5rem;min-height:22rem}.work-order-v1 .work-order-section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}.work-order-v1 .work-order-section-heading h2{font-size:1.2rem}.work-order-v1 .work-order-section-heading p{font-size:.8rem;color:var(--factory-muted);margin-top:.2rem}.work-order-v1 .work-order-search{display:grid;gap:.4rem;font-size:.8rem;font-weight:600;margin:1rem 0}.work-order-v1 .work-order-search input{width:100%}
.work-order-v1 .work-order-list{list-style:none;margin:0;padding:0;display:grid;gap:.65rem}.work-order-v1 .work-order-card{display:grid;width:100%;min-width:0;gap:.4rem;text-align:left;padding:1rem;border-color:var(--factory-border);background:var(--factory-bg)}.work-order-v1 .work-order-card[aria-current=true]{border-color:var(--factory-accent);background:var(--work-order-tint)}.work-order-v1 .work-order-card-top,.work-order-v1 .work-order-card-bottom{display:flex;justify-content:space-between;align-items:start;gap:.75rem}.work-order-v1 .work-order-card-top strong{font-size:1rem;line-height:1.35;overflow-wrap:anywhere}.work-order-v1 .work-order-card-bottom{align-items:center;font-size:.8rem;color:var(--factory-muted)}.work-order-v1 .work-order-location{font-size:.9rem;color:var(--factory-text);overflow-wrap:anywhere}.work-order-v1 .work-order-priority,.work-order-v1 .work-order-status{display:inline-flex;align-items:center;white-space:nowrap;font-size:.73rem;font-weight:700;line-height:1.3;padding:.3rem .5rem;border-radius:100px;text-transform:capitalize}.work-order-v1 .work-order-priority{color:var(--factory-text);background:var(--work-order-tint)}.work-order-v1 .work-order-priority.is-high{color:var(--factory-danger);background:color-mix(in srgb,var(--factory-danger) 10%,var(--factory-surface))}.work-order-v1 .work-order-priority.is-low{color:var(--factory-muted);background:var(--factory-bg)}.work-order-v1 .work-order-status{color:var(--factory-accent);background:var(--work-order-tint)}.work-order-v1 .work-order-status.is-cancelled{color:var(--factory-danger);background:color-mix(in srgb,var(--factory-danger) 10%,var(--factory-surface))}.work-order-v1 .work-order-status.is-resolved{color:var(--factory-text);background:var(--factory-bg)}
.work-order-v1 .work-order-detail-head{padding-bottom:1.2rem;border-bottom:1px solid var(--factory-border)}.work-order-v1 .work-order-detail-head h2{font-size:clamp(1.35rem,2vw,1.8rem);line-height:1.2;margin:.65rem 0 .25rem;overflow-wrap:anywhere}.work-order-v1 .work-order-detail-location{font-size:1rem;overflow-wrap:anywhere}.work-order-v1 .work-order-detail-status{display:flex;align-items:center;flex-wrap:wrap;gap:.65rem;margin-top:1rem;font-size:.85rem}.work-order-v1 .work-order-quick-actions{display:flex;flex-wrap:wrap;gap:.55rem;padding:1rem 0}.work-order-v1 .work-order-facts{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:0;padding:1rem 0;border-top:1px solid var(--factory-border)}.work-order-v1 .work-order-facts>div{min-width:0}.work-order-v1 dt{font-size:.78rem;color:var(--factory-muted)}.work-order-v1 dd{margin:.25rem 0 0;overflow-wrap:anywhere;white-space:pre-wrap}.work-order-v1 .work-order-description{grid-column:1/-1}.work-order-v1 .work-order-cancelled{padding:.75rem;background:color-mix(in srgb,var(--factory-danger) 9%,var(--factory-surface));border-inline-start:3px solid var(--factory-danger)}
.work-order-v1 .work-order-editor{display:grid;gap:1rem;max-width:54rem;padding:1.2rem;margin:1rem 0;background:var(--factory-surface);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-lg)}.work-order-v1 .work-order-editor h3{font-size:1.15rem}.work-order-v1 .work-order-editor fieldset{display:grid;gap:1rem;border:0;margin:0;padding:0;min-width:0}.work-order-v1 .work-order-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.work-order-v1 .work-order-field{display:grid;gap:.35rem;min-width:0;font-size:.85rem;font-weight:600}.work-order-v1 .work-order-field:has(textarea){grid-column:1/-1}.work-order-v1 .work-order-field :is(input,select,textarea){width:100%;font-weight:400}.work-order-v1 textarea{resize:vertical;min-height:5.5rem;line-height:1.5}.work-order-v1 .work-order-form-actions{display:flex;flex-wrap:wrap;gap:.6rem}.work-order-v1 .work-order-current{padding:.8rem;background:var(--work-order-tint);font-size:.85rem;overflow-wrap:anywhere}
.work-order-v1 .work-order-report{padding:1rem;margin:1rem 0;background:var(--work-order-tint);border-inline-start:3px solid var(--factory-accent);overflow-wrap:anywhere}.work-order-v1 .work-order-report h3,.work-order-v1 .work-order-history h3{font-size:1rem}.work-order-v1 .work-order-report p{white-space:pre-wrap;margin:.5rem 0}.work-order-v1 .work-order-report span{font-size:.8rem;color:var(--factory-muted)}.work-order-v1 .work-order-history{padding-top:1rem;border-top:1px solid var(--factory-border)}.work-order-v1 .work-order-history ol{list-style:none;padding:0;margin:.5rem 0}.work-order-v1 .work-order-history li{padding:1rem 0;border-bottom:1px solid var(--factory-border);overflow-wrap:anywhere}.work-order-v1 .work-order-history li>div:first-child{display:flex;justify-content:space-between;gap:.5rem}.work-order-v1 .work-order-history li>div:first-child span,.work-order-v1 .work-order-history small{color:var(--factory-muted);font-size:.78rem}.work-order-v1 .work-order-history li p{white-space:pre-wrap;margin:.4rem 0}.work-order-v1 .work-order-history li dl{margin:.5rem 0;display:grid;gap:.4rem}.work-order-v1 .work-order-history li dl div{display:grid;grid-template-columns:5rem minmax(0,1fr);gap:.5rem;font-size:.8rem}
.work-order-v1 .work-order-empty{padding:1.5rem;display:grid;gap:.5rem;justify-items:start}.work-order-v1 .work-order-empty p,.work-order-v1 .work-order-state{color:var(--factory-muted);font-size:.9rem}.work-order-v1 .work-order-feedback{display:grid;gap:.6rem;justify-items:start;padding:1rem;margin:1rem 0;border:1px solid var(--factory-danger);border-radius:var(--factory-radius-radius-base);overflow-wrap:anywhere}.work-order-v1 .work-order-notice{display:flex;align-items:center;gap:.5rem;color:var(--factory-accent);margin:1rem 0}.work-order-v1 .work-order-back{display:none}
@media(max-width:1100px){.work-order-v1 .work-order-workarea{grid-template-columns:minmax(17rem,.85fr) minmax(0,1.15fr)}.work-order-v1 .work-order-workspace-canvas{padding-inline:1.25rem}}
@media(max-width:800px){.work-order-v1.generated-app{display:block}.work-order-v1 .work-order-workspace-sidebar,.work-order-v1 .work-order-principal{display:none}.work-order-v1 .work-order-workspace-canvas{display:block;padding:1.25rem}.work-order-v1 .work-order-workspace-heading{margin-bottom:.5rem}.work-order-v1 .work-order-workspace-heading h1{font-size:1.55rem}.work-order-v1 .work-order-mobile-nav{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.2rem 0 .5rem;font-size:.75rem;color:var(--factory-muted)}.work-order-v1 .work-order-mobile-nav select{max-width:10rem;font-size:.85rem}.work-order-v1 .work-order-workarea{display:block}.work-order-v1 .work-order-queue,.work-order-v1 .work-order-detail{padding:0;border:0;background:transparent;min-height:0}.work-order-v1 .work-order-detail{display:none}.work-order-v1 .work-order-workarea.is-detail-route .work-order-queue{display:none}.work-order-v1 .work-order-workarea.is-detail-route .work-order-detail{display:block}.work-order-v1 .work-order-back{display:inline-grid;margin-bottom:.7rem}.work-order-v1 .work-order-card{background:var(--factory-surface)}.work-order-v1 .work-order-form-grid{grid-template-columns:minmax(0,1fr)}.work-order-v1 .work-order-form-actions button{flex:1 1 auto}.work-order-v1 .work-order-detail-head{padding-bottom:.8rem}.work-order-v1 .work-order-quick-actions{padding:.8rem 0}.work-order-v1 .work-order-quick-actions button{flex:1 1 auto}.work-order-v1 .work-order-detail-status{margin-top:.7rem}}
@media(max-width:800px){.work-order-v1 .work-order-queue.is-technician h2{display:none}}
@media(prefers-reduced-motion:reduce){.work-order-v1 *,.work-order-v1 *::before,.work-order-v1 *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`,
  ];
}
