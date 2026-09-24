import type { ApplicationGraphV1 } from "@factory/graph";
import type { CustomerRequestsProfile } from "./customer-requests-contract.js";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import {
  approvalWorkspacePresentation,
  renderWorkspaceStyles,
} from "./approval-workspace-presentation.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";

/** Factory-authored composition of approved shell, controls and pinned icons. */
export const customerRequestsPresentation = {
  key: "customer-requests-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [...approvalWorkspacePresentation.reuse, "native-textarea"],
  semanticGap:
    "Attributed conversation, linked corrections and semantic next-actor projection need a Customer Requests composition.",
  iconPackage: "lucide-static@0.468.0",
  iconLicense: "ISC",
} as const;

export function renderCustomerRequestsWorkspace(
  graph: ApplicationGraphV1,
  profile: CustomerRequestsProfile,
  fixture: boolean,
): string {
  const projection = createGeneratedPageRuntimeProjection(graph);
  const pages = Object.fromEntries(
    Object.entries(profile.pages).map(([key, id]) => [
      key,
      projection.pages.find((page) => page.id === id),
    ]),
  );
  if (
    Object.values(pages).some((page) => !page || typeof page.route !== "string")
  )
    throw new Error("Customer Requests page projection is incomplete.");
  const config = {
    name: graph.metadata.name,
    themeMode: projection.themeMode,
    entity: profile.requestEntity,
    roles: profile.roles,
    routes: Object.fromEntries(
      Object.entries(pages).map(([key, page]) => [key, page!.route]),
    ),
    titles: Object.fromEntries(
      Object.entries(pages).map(([key, page]) => [key, page!.title]),
    ),
    principalStorageKey: "customer-requests-principal-" + graph.metadata.id,
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
// customer-requests-presentation@1.0.0 — Factory-authored.
import { useCallback, useEffect, useRef, useState } from "react";
const config = CONFIG_JSON;
const icons = ICONS_JSON;
type RequestRecord={id:string;version:number;subject:string;description:string;status:"open"|"resolved"|"cancelled";customerPrincipalId:string};
type Activity={requestVersion:number;action:string;actorRole:string;recordedAt:string};
type ListRecord=RequestRecord&{nextActor:"customer"|"staff"|null;lastActivity:Activity};
type EventRecord={apiVersion:"factory.generated.customer-request-history-entry/v1";id:string;request:string;action:string;requestVersion:number;toStatus:string;actorPrincipalId:string;actorRole:string;recordedAt:string;fromStatus:string|null;message:string|null;reason:string|null;correctsVersion:number|null;beforeSubject:string|null;afterSubject:string|null;beforeDescription:string|null;afterDescription:string|null};
type Detail={request:RequestRecord;nextActor:"customer"|"staff"|null;lastActivity:Activity;latestReply:(EventRecord&{historical:boolean})|null};
type Principal={id:string;session:string;role:string;name:string};
type Operation="create"|"update"|"reply"|"complete"|"reopen"|"cancel";
type Draft={subject:string;description:string;message:string;reason:string;correctsVersion:number|null};
type FrozenCommand={principalId:string;path:string;body:string;key:string;operation:Operation;recordId:string|null};
const principals:readonly Principal[]=[
 {id:"fixture-principal-customer-a",session:"fixture-session-customer-a",role:config.roles.customer,name:"Customer A"},
 {id:"fixture-principal-customer-b",session:"fixture-session-customer-b",role:config.roles.customer,name:"Customer B"},
 {id:"fixture-principal-support-staff",session:"fixture-session-support-staff",role:config.roles.staff,name:"Support staff"}
];
const emptyDraft:Draft={subject:"",description:"",message:"",reason:"",correctsVersion:null};
const actionNames:Record<Operation,string>={create:"Submit request",update:"Save correction",reply:"Send reply",complete:"Resolve request",reopen:"Reopen request",cancel:"Cancel request"};
const statusNames:Record<RequestRecord["status"],string>={open:"Open",resolved:"Resolved",cancelled:"Cancelled"};
function Icon({name}:{name:keyof typeof icons}){return <span className="customer-request-icon" aria-hidden="true" dangerouslySetInnerHTML={{__html:icons[name]}}/>;}
function requestHeaders(principal:Principal,key?:string):Record<string,string>{return {"x-factory-fixture-session":principal.session,...(key?{"x-factory-idempotency-key":key}:{})};}
function safeMessage(status:number):string{if(status===400)return "Check the entered values. Your draft is still here.";if(status===403)return "This action is unavailable to this person.";if(status===404)return "This request is no longer available. Refresh your list.";if(status===409)return "The request changed. Review its current saved state before applying your draft.";return "The request could not be completed. Try again.";}
function routeFrom(path:string):"list"|"form"|"detail"|"queue"|"missing"{const pathname=path.split("?")[0];for(const key of ["list","form","detail","queue"] as const)if(config.routes[key]===pathname)return key;return "missing";}
function statusText(status:RequestRecord["status"],nextActor:"customer"|"staff"|null){return status==="open"?(nextActor==="customer"?"Waiting for customer reply":"Waiting for staff reply"):statusNames[status];}
function readableTime(value:string){const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleString():value;}
function correctionLabel(entry:EventRecord,events:readonly EventRecord[],principal:Principal){const target=events.find(candidate=>candidate.requestVersion===entry.correctsVersion);if(!target)return "Corrects an earlier message. Load earlier messages to see it.";const author=target.actorPrincipalId===principal.id?"your":target.actorRole===config.roles.staff?"support staff's":"customer's";return "Corrects "+author+" message from "+readableTime(target.recordedAt)+".";}
function validText(value:string,maximum:number,singleLine=false){const normalized=value.trim();return normalized.length>0&&normalized.length<=maximum&&!(singleLine?/[\u0000-\u001f\u007f]/:/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/).test(normalized);}
function validate(operation:Operation,draft:Draft):string|null{
 if(operation==="create"||operation==="update"){if(!validText(draft.subject,160,true))return "Enter a subject of up to 160 characters.";if(!validText(draft.description,2000))return "Enter a description of up to 2000 characters.";}
 if(operation==="reply"&&!validText(draft.message,2000))return "Enter a reply of up to 2000 characters.";
 if(operation==="complete"&&!validText(draft.message,2000))return "Enter a resolution message of up to 2000 characters.";
 if(["update","reopen","cancel"].includes(operation)&&!validText(draft.reason,500))return "Enter a reason of up to 500 characters.";
 return null;
}
function commandBody(operation:Operation,draft:Draft,version:number){
 if(operation==="create")return {values:{subject:draft.subject.trim(),description:draft.description.trim()}};
 if(operation==="update")return {expectedVersion:version,reason:draft.reason.trim(),values:{subject:draft.subject.trim(),description:draft.description.trim()}};
 if(operation==="reply")return {expectedVersion:version,message:draft.message.trim(),correctsVersion:draft.correctsVersion};
 if(operation==="complete")return {expectedVersion:version,resolutionMessage:draft.message.trim()};
 return {expectedVersion:version,reason:draft.reason.trim()};
}
function Workspace({principal,requestedPath}:{principal:Principal;requestedPath:string}){
 const initialPath=typeof window==="undefined"?requestedPath:window.location.pathname+window.location.search;
 const [path,setPath]=useState(initialPath);
 const [selectedId,setSelectedId]=useState<string|null>(()=>new URLSearchParams(initialPath.split("?")[1]??"").get("id"));
 const [items,setItems]=useState<readonly ListRecord[]>([]);
 const [nextAfterId,setNextAfterId]=useState<string|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [history,setHistory]=useState<readonly EventRecord[]>([]);
 const [nextBeforeVersion,setNextBeforeVersion]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);
 const [detailLoading,setDetailLoading]=useState(false);
 const [paging,setPaging]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [detailError,setDetailError]=useState<string|null>(null);
 const [notice,setNotice]=useState<string|null>(null);
 const [operation,setOperation]=useState<Operation|null>(null);
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const [pending,setPending]=useState(false);
 const [uncertain,setUncertain]=useState<FrozenCommand|null>(null);
 const [stale,setStale]=useState(false);
 const [statusFilter,setStatusFilter]=useState("");
 const [actorFilter,setActorFilter]=useState("");
 const listEpoch=useRef(0),detailEpoch=useRef(0),historyEpoch=useRef(0),alive=useRef(true);
 const listRead=useRef<AbortController|null>(null),detailRead=useRef<AbortController|null>(null),historyRead=useRef<AbortController|null>(null);
 const selected=useRef(selectedId);selected.current=selectedId;
 const activeCommand=useRef<FrozenCommand|null>(null);
 const commandInFlight=useRef(false);
 const returnFocus=useRef<HTMLElement|null>(null),editorTrigger=useRef<HTMLElement|null>(null);
 const focusIntent=useRef<"detail"|"form"|"return"|"editor"|"trigger"|null>(null);
 const pathRef=useRef(path);pathRef.current=path;
 const isStaff=principal.role===config.roles.staff;
 const view=routeFrom(path);
 const detailRoute=view==="detail";
 const base="/api/"+encodeURIComponent(config.entity);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;listEpoch.current++;detailEpoch.current++;historyEpoch.current++;listRead.current?.abort();detailRead.current?.abort();historyRead.current?.abort();};},[]);
 const loadList=useCallback(async(afterId?:string)=>{
  listRead.current?.abort();const controller=new AbortController();listRead.current=controller;
  const epoch=++listEpoch.current;setLoading(true);setError(null);
  try{const query="?limit=20"+(statusFilter?"&status="+encodeURIComponent(statusFilter):"")+(afterId?"&afterId="+encodeURIComponent(afterId):"");
   const response=await fetch(base+query,{headers:requestHeaders(principal),cache:"no-store",signal:controller.signal});
   if(!response.ok)throw Error(safeMessage(response.status));
   const data=await response.json() as {items:ListRecord[];nextAfterId:string|null};
   if(alive.current&&!controller.signal.aborted&&epoch===listEpoch.current){setItems(previous=>afterId?[...previous,...data.items]:data.items);setNextAfterId(data.nextAfterId);}
  }catch(reason){if(alive.current&&!controller.signal.aborted&&epoch===listEpoch.current){setError(reason instanceof Error?reason.message:"Could not load requests.");if(!afterId)setItems([]);}}
  finally{if(alive.current&&!controller.signal.aborted&&epoch===listEpoch.current)setLoading(false);if(listRead.current===controller)listRead.current=null;}
 },[base,principal,statusFilter]);
 const loadDetail=useCallback(async(id:string)=>{
  detailRead.current?.abort();historyRead.current?.abort();historyRead.current=null;++historyEpoch.current;setPaging(false);
  const controller=new AbortController();detailRead.current=controller;
  const epoch=++detailEpoch.current;setDetailLoading(true);setDetailError(null);setDetail(null);setHistory([]);setNextBeforeVersion(null);
  try{const url=base+"/"+encodeURIComponent(id);
   const response=await fetch(url,{headers:requestHeaders(principal),cache:"no-store",signal:controller.signal});
   if(!response.ok)throw Error(safeMessage(response.status));
   const data=await response.json() as Detail;
   if(!alive.current||controller.signal.aborted||epoch!==detailEpoch.current||selected.current!==id)return;
   setDetail(data);
   const eventResponse=await fetch(url+"/history?limit=20",{headers:requestHeaders(principal),cache:"no-store",signal:controller.signal});
   if(!eventResponse.ok)throw Error(safeMessage(eventResponse.status));
   const events=await eventResponse.json() as {items:EventRecord[];nextBeforeVersion:number|null};
   if(alive.current&&!controller.signal.aborted&&epoch===detailEpoch.current&&selected.current===id){setHistory(events.items);setNextBeforeVersion(events.nextBeforeVersion);}
  }catch(reason){if(alive.current&&!controller.signal.aborted&&epoch===detailEpoch.current&&selected.current===id){setDetailError(reason instanceof Error?reason.message:"Could not load this request.");setHistory([]);setDetail(null);}}
  finally{if(alive.current&&!controller.signal.aborted&&epoch===detailEpoch.current)setDetailLoading(false);if(detailRead.current===controller)detailRead.current=null;}
 },[base,principal]);
 useEffect(()=>{void loadList();return()=>{listEpoch.current++;listRead.current?.abort();};},[loadList]);
 useEffect(()=>{if(selectedId)void loadDetail(selectedId);else{detailEpoch.current++;historyEpoch.current++;detailRead.current?.abort();historyRead.current?.abort();setPaging(false);setDetail(null);setHistory([]);setNextBeforeVersion(null);}},[selectedId,loadDetail]);
 useEffect(()=>{const onPop=()=>{if(activeCommand.current){window.history.pushState({},"",pathRef.current);return;}const next=window.location.pathname+window.location.search;focusIntent.current=routeFrom(next)==="detail"?"detail":routeFrom(next)==="form"?"form":"return";setPath(next);setSelectedId(new URLSearchParams(window.location.search).get("id"));setOperation(null);setDraft(emptyDraft);setStale(false);};window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop);},[]);
 useEffect(()=>{const intent=focusIntent.current;if(!intent)return;const root=document.querySelector<HTMLElement>(".customer-request-v1");const visible=(element:HTMLElement|null)=>element&&element.getClientRects().length?element:null;let target:HTMLElement|null=null;
  if(intent==="detail")target=visible(root?.querySelector<HTMLElement>(".customer-request-header-back")??null)??root?.querySelector<HTMLElement>(".customer-request-detail-head h2")??null;
  if(intent==="form")target=root?.querySelector<HTMLElement>(".customer-request-create button")??null;
  if(intent==="return")target=visible(returnFocus.current)??root?.querySelector<HTMLElement>(".customer-request-workspace-heading h1")??null;
  if(intent==="editor")target=root?.querySelector<HTMLElement>(".customer-request-editor input, .customer-request-editor textarea")??null;
  if(intent==="trigger")target=visible(editorTrigger.current)??root?.querySelector<HTMLElement>(".customer-request-create button, .customer-request-quick-actions button, .customer-request-detail-head h2")??null;
  if(target){target.focus();focusIntent.current=null;}
 },[path,operation,detailLoading,detail]);
 function navigate(kind:"list"|"form"|"detail"|"queue",id?:string){if(activeCommand.current||pending||uncertain)return;if(kind==="detail"||kind==="form"){returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;focusIntent.current=kind;}else if(view==="detail"||view==="form")focusIntent.current="return";const next=config.routes[kind]+(id?"?id="+encodeURIComponent(id):"");window.history.pushState({},"",next);setPath(next);setSelectedId(id??null);setOperation(null);setDraft(emptyDraft);setError(null);setDetailError(null);setNotice(null);setStale(false);}
 function edit(key:keyof Draft,value:string){setDraft(previous=>({...previous,[key]:value}));}
 function open(next:Operation,correctsVersion:number|null=null,message=""){if(activeCommand.current||pending||uncertain)return;editorTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;focusIntent.current="editor";setOperation(next);setDraft({subject:detail?.request.subject??"",description:detail?.request.description??"",message,reason:"",correctsVersion});setError(null);setNotice(null);setStale(false);}
 function closeEditor(){focusIntent.current="trigger";setOperation(null);setDraft(emptyDraft);setStale(false);setError(null);}
 function makeCommand(next:Operation):FrozenCommand|null{
  const validation=validate(next,draft);if(validation){setError(validation);return null;}
  const id=next==="create"?null:detail?.request.id??null;
  if(next!=="create"&&!id){setError("Open a request before making this change.");return null;}
  return {principalId:principal.id,path:base+(id?"/"+encodeURIComponent(id)+"/events/"+next:""),body:JSON.stringify(commandBody(next,draft,detail?.request.version??0)),key:crypto.randomUUID(),operation:next,recordId:id};
 }
 async function execute(command:FrozenCommand){
  if(command.principalId!==principal.id||commandInFlight.current||(activeCommand.current&&activeCommand.current!==command))return;
  activeCommand.current=command;commandInFlight.current=true;setPending(true);setError(null);setNotice(null);
  try{const response=await fetch(command.path,{method:"POST",headers:{...requestHeaders(principal,command.key),"content-type":"application/json"},body:command.body,cache:"no-store"});
   if(!alive.current)return;
   if(!response.ok){
    if([400,403,404,409].includes(response.status)){
     activeCommand.current=null;setUncertain(null);
     if(response.status===409){setStale(true);if(command.recordId)await loadDetail(command.recordId);else await loadList();}
     if(response.status===403||response.status===404){setDetail(null);setHistory([]);setSelectedId(null);setOperation(null);await loadList();}
     setError(safeMessage(response.status));return;
    }
    setUncertain(command);setError("We could not confirm whether this change was saved. Try again safely to check its result.");return;
   }
   const saved=await response.json() as {request:RequestRecord};
   activeCommand.current=null;setUncertain(null);setOperation(null);setStale(false);setDraft(emptyDraft);
   setNotice(command.operation==="cancel"?"Your request was cancelled. Its history is still here.":actionNames[command.operation]+" saved in this request. Current state refreshed.");
   await loadList();
   if(!alive.current)return;
   if(command.operation==="create"){const next=config.routes.detail+"?id="+encodeURIComponent(saved.request.id);window.history.pushState({},"",next);setPath(next);setSelectedId(saved.request.id);}
   else if(command.recordId)await loadDetail(command.recordId);
  }catch{if(alive.current){activeCommand.current=command;setUncertain(command);setError("We could not confirm whether this change was saved. Try again safely to check its result.");}}
  finally{if(alive.current){commandInFlight.current=false;setPending(false);}}
 }
 function submit(event:React.FormEvent){event.preventDefault();if(!operation||pending||uncertain||stale)return;const command=makeCommand(operation);if(command)void execute(command);}
 async function loadEarlier(){
  if(!detail||nextBeforeVersion===null||paging)return;
  const controller=new AbortController();historyRead.current=controller;
  const id=detail.request.id,epoch=++historyEpoch.current;setPaging(true);setDetailError(null);
  try{const response=await fetch(base+"/"+encodeURIComponent(id)+"/history?limit=20&beforeVersion="+nextBeforeVersion,{headers:requestHeaders(principal),cache:"no-store",signal:controller.signal});
   if(!response.ok)throw Error(safeMessage(response.status));
   const data=await response.json() as {items:EventRecord[];nextBeforeVersion:number|null};
   if(alive.current&&!controller.signal.aborted&&epoch===historyEpoch.current&&selected.current===id){setHistory(previous=>[...previous,...data.items]);setNextBeforeVersion(data.nextBeforeVersion);}
  }catch(reason){if(alive.current&&!controller.signal.aborted&&epoch===historyEpoch.current)setDetailError(reason instanceof Error?reason.message:"Could not load earlier messages.");}
  finally{if(alive.current&&!controller.signal.aborted&&epoch===historyEpoch.current)setPaging(false);if(historyRead.current===controller)historyRead.current=null;}
 }
 const displayed=items.filter(item=>!actorFilter||item.nextActor===actorFilter);
 const canReply=detail?.request.status==="open";
 const canUpdate=!isStaff&&canReply;
 const canComplete=isStaff&&canReply;
 const canReopen=!isStaff&&detail?.request.status==="resolved";
 const canCancel=!isStaff&&canReply;
 const action=(kind:Operation,label?:string)=><button type="button" className={kind==="reply"?"customer-request-primary":""} disabled={pending||!!uncertain||!!operation} onClick={()=>open(kind)}>{label??actionNames[kind]}</button>;
 const form=operation?<form className="customer-request-editor" onSubmit={submit}><h3>{operation==="create"?"New request":operation==="update"?"Correct request details":operation==="reply"?(draft.correctsVersion!==null?"Correct your message":"Reply in request"):operation==="complete"?"Resolve request":operation==="reopen"?"Reopen request":"Cancel request"}</h3><p className="customer-request-form-hint">{operation==="update"?"The original details remain in history. Explain what changed.":draft.correctsVersion!==null?"Your original message remains visible with a correction link.":operation==="complete"?"Your resolution will be visible to the customer.":operation==="cancel"?"Cancellation closes this request and retains its history.":null}</p>{(operation==="create"||operation==="update")?<><label>Subject<input value={draft.subject} maxLength={160} onChange={event=>edit("subject",event.target.value)} required/></label><label>Description<textarea value={draft.description} maxLength={2000} rows={5} onChange={event=>edit("description",event.target.value)} required/></label></>:null}{(operation==="reply"||operation==="complete")?<label>{operation==="complete"?"Resolution message":"Message"}<textarea value={draft.message} maxLength={2000} rows={5} onChange={event=>edit("message",event.target.value)} required/></label>:null}{["update","reopen","cancel"].includes(operation)?<label>Reason<textarea value={draft.reason} maxLength={500} rows={3} onChange={event=>edit("reason",event.target.value)} required/></label>:null}{stale?<div className="customer-request-recovery" role="alert"><strong>Saved request has changed</strong><p>Current status: {detail?statusText(detail.request.status,detail.nextActor):"Unavailable"}. Review the saved values and your draft, then choose to reapply it to the latest saved request.</p><button type="button" disabled={!detail||detail.request.status!=="open"&&operation!=="reopen"} onClick={()=>{setStale(false);setError(null);}}>Reapply draft to latest saved request</button></div>:null}<div className="customer-request-form-actions"><button className="customer-request-primary" type="submit" disabled={pending||!!uncertain||stale}>{pending?"Saving…":actionNames[operation]}</button><button type="button" disabled={pending||!!uncertain} onClick={closeEditor}>Close editor</button></div></form>:null;
 const transcript=[...history].sort((a,b)=>a.requestVersion-b.requestVersion);
 return <><aside className="customer-request-workspace-sidebar"><div className="customer-request-workspace-brand"><span className="customer-request-workspace-mark"><Icon name="receipt-text"/></span><div><strong>{config.name}</strong><span>Requests and replies</span></div></div><nav aria-label="Application routes"><button type="button" aria-current={!detailRoute&&view!=="form"?"page":undefined} onClick={()=>navigate(isStaff?"queue":"list")}><Icon name="house"/>{isStaff?config.titles.queue:config.titles.list}</button>{!isStaff?<button type="button" aria-current={view==="form"?"page":undefined} onClick={()=>navigate("form")}><Icon name="receipt-text"/>{config.titles.form}</button>:null}</nav><p className="customer-request-sidebar-foot">Saved conversation · Local demo</p></aside><div className={"customer-request-workspace-canvas"+(detailRoute?" is-detail-route":"")+(view==="form"?" is-form-route":"")}><header className="customer-request-workspace-heading">{detailRoute||view==="form"?<button type="button" className="customer-request-icon-button customer-request-header-back" title="Back to requests" aria-label="Back to requests" disabled={pending||!!uncertain} onClick={()=>navigate(isStaff?"queue":"list")}><Icon name="arrow-left"/></button>:null}<div><h1 tabIndex={-1}>{view==="form"?config.titles.form:isStaff?config.titles.queue:config.titles.list}</h1><p>{isStaff?"Read context and answer requests in one place.":"Keep your requests and replies together."}</p></div><button type="button" className="customer-request-icon-button" title="Refresh requests" aria-label="Refresh requests" disabled={pending||!!uncertain} onClick={()=>{void loadList();if(selectedId)void loadDetail(selectedId);}}><Icon name="refresh-cw"/></button></header><nav className="customer-request-mobile-nav" aria-label="Mobile routes"><button type="button" onClick={()=>navigate(isStaff?"queue":"list")} aria-current={view==="list"||view==="queue"?"page":undefined}>{isStaff?"Queue":"My requests"}</button>{!isStaff?<button type="button" onClick={()=>navigate("form")} aria-current={view==="form"?"page":undefined}>New request</button>:null}</nav>{notice?<p className="customer-request-notice" role="status">{notice}</p>:null}{error?<div className="customer-request-feedback" role="alert"><p>{error}</p>{uncertain?<button type="button" disabled={pending} onClick={()=>void execute(uncertain)}>Try again safely</button>:null}</div>:null}<div className={"customer-request-workarea"+(detailRoute?" is-detail-route":"")+(view==="form"?" is-form-route":"")}><section className="customer-request-queue" aria-label={isStaff?"Staff request queue":"My requests"}><div className="customer-request-section-heading"><h2>{isStaff?"Staff queue":"My requests"}</h2>{!isStaff?<button type="button" className="customer-request-primary" disabled={pending||!!uncertain} onClick={()=>navigate("form")}>New request</button>:null}</div>{isStaff?<div className="customer-request-filters"><label>Status<select value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="open">Open</option><option value="resolved">Resolved</option><option value="cancelled">Cancelled</option></select></label><label>Next reply<select value={actorFilter} onChange={event=>setActorFilter(event.target.value)}><option value="">Any next actor</option><option value="staff">Staff</option><option value="customer">Customer</option></select></label></div>:null}{loading&&!items.length?<p role="status" className="customer-request-state">Loading requests…</p>:error&&!items.length?<div className="customer-request-empty"><h3>Requests unavailable</h3><p>Use Refresh to try again.</p></div>:displayed.length?<ul className="customer-request-list">{displayed.map(item=><li key={item.id}><button type="button" className="customer-request-card" aria-current={selectedId===item.id?"true":undefined} disabled={pending||!!uncertain} onClick={()=>navigate("detail",item.id)}><span className="customer-request-card-main"><strong>{item.subject}</strong><span className={"customer-request-status is-"+item.status}>{statusNames[item.status]}</span></span>{item.status==="open"?<span className="customer-request-card-next">{statusText(item.status,item.nextActor)}</span>:null}<small>Updated <time dateTime={item.lastActivity.recordedAt}>{readableTime(item.lastActivity.recordedAt)}</time></small></button></li>)}</ul>:<div className="customer-request-empty"><h3>{actorFilter?"No loaded requests match":"No requests yet"}</h3><p>{actorFilter?"Change the next reply filter to see loaded requests.":isStaff?"Requests will appear here when customers submit them.":"Submit your first request to start a conversation."}</p>{!isStaff&&!actorFilter?<button type="button" className="customer-request-primary" onClick={()=>navigate("form")}>New request</button>:null}</div>}{nextAfterId?<button type="button" className="customer-request-more" disabled={loading||pending||!!uncertain} onClick={()=>void loadList(nextAfterId)}>Load more requests</button>:null}</section><section className="customer-request-detail" aria-label="Request conversation">{view==="form"&&!isStaff?<>{form??<div className="customer-request-create"><h2>New request</h2><p>Describe what you need help with. Your request will stay in this local demo.</p><button type="button" className="customer-request-primary" onClick={()=>open("create")}>Start request</button></div>}</>:<>{detailError?<div className="customer-request-feedback" role="alert"><p>{detailError}</p><button type="button" onClick={()=>selectedId&&void loadDetail(selectedId)}>Retry loading request</button></div>:detailLoading?<p role="status" className="customer-request-state">Loading request and conversation…</p>:detail?<><div className="customer-request-detail-head"><div className="customer-request-head-top"><span className={"customer-request-status is-"+detail.request.status}>{statusNames[detail.request.status]}</span>{detail.request.status==="open"?<span className="customer-request-next">{statusText(detail.request.status,detail.nextActor)}</span>:null}</div><h2 tabIndex={-1}>{detail.request.subject}</h2><p className="customer-request-description">{detail.request.description}</p><small>Latest activity <time dateTime={detail.lastActivity.recordedAt}>{readableTime(detail.lastActivity.recordedAt)}</time></small></div>{canReply||canComplete||canUpdate||canReopen||canCancel?<div className="customer-request-quick-actions">{canReply?action("reply"):null}{canComplete?action("complete"):null}{canUpdate?action("update","Correct details"):null}{canReopen?action("reopen"):null}{canCancel?action("cancel"):null}</div>:null}{form}<section className="customer-request-conversation"><div className="customer-request-conversation-head"><h3>Conversation</h3><span>Saved in this request</span></div>{transcript.length?<ol>{transcript.map(entry=><li className={"customer-request-event is-"+entry.action} key={entry.id}><div className="customer-request-event-meta"><strong>{entry.actorRole===config.roles.staff?"Support staff":entry.actorPrincipalId===principal.id?"You":"Customer"}</strong><span><time dateTime={entry.recordedAt}>{readableTime(entry.recordedAt)}</time></span></div>{entry.action==="create"?<><span className="customer-request-event-label">Request submitted</span><p>{entry.afterDescription??detail.request.description}</p></>:null}{entry.action==="reply"||entry.action==="complete"?<><span className="customer-request-event-label">{entry.action==="complete"?"Resolution":entry.correctsVersion!==null?"Corrected message":"Reply"}</span><p>{entry.message}</p>{entry.correctsVersion!==null?<small>{correctionLabel(entry,history,principal)}</small>:null}{canReply&&entry.actorPrincipalId===principal.id&&entry.message&&!history.some(other=>other.correctsVersion===entry.requestVersion)&&!operation?<button type="button" className="customer-request-text-action" onClick={()=>open("reply",entry.requestVersion,entry.message??"")}>Correct your message</button>:null}</>:null}{entry.action==="update"?<><span className="customer-request-event-label">Request details corrected</span><p><strong>Subject:</strong> {entry.beforeSubject} → {entry.afterSubject}</p><p><strong>Description:</strong> {entry.beforeDescription} → {entry.afterDescription}</p><p><strong>Reason:</strong> {entry.reason}</p></>:null}{entry.action==="reopen"||entry.action==="cancel"?<><span className="customer-request-event-label">{entry.action==="reopen"?"Request reopened":"Request cancelled"}</span><p>{entry.reason}</p></>:null}</li>)}</ol>:<p className="customer-request-state">No conversation history is available.</p>}{nextBeforeVersion!==null?<button type="button" className="customer-request-more" disabled={paging} onClick={()=>void loadEarlier()}>{paging?"Loading…":"Load earlier messages"}</button>:null}</section></>:<div className="customer-request-empty"><h3>Select a request</h3><p>Open a request to read the conversation and respond.</p></div>}</>}</section></div></div></>;
}
export function GeneratedApplication({requestedPath}:{requestedPath:string}){
 const [principalId,setPrincipalId]=useState<string|null>(null);
 useEffect(()=>{let initial=principals[0].id;try{const saved=sessionStorage.getItem(config.principalStorageKey);if(principals.some(person=>person.id===saved))initial=saved!;}catch{}setPrincipalId(initial);},[]);
 if(!principalId)return <main className="generated-app customer-request-v1" data-theme={config.themeMode}><p role="status">Loading local demo…</p></main>;
 const principal=principals.find(person=>person.id===principalId)!;
 return <main className="generated-app customer-request-v1" data-theme={config.themeMode}><div className="customer-request-principal"><label htmlFor="customer-request-principal">Local demo · synthetic people</label><select id="customer-request-principal" value={principal.id} onChange={event=>{const next=event.target.value;const nextPrincipal=principals.find(person=>person.id===next);if(!nextPrincipal)return;window.history.replaceState({},"",nextPrincipal.role===config.roles.staff?config.routes.queue:config.routes.list);try{sessionStorage.setItem(config.principalStorageKey,next);}catch{}setPrincipalId(next);}}>{principals.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></div><Workspace key={principal.id} principal={principal} requestedPath={requestedPath}/></main>;
}
`.replace(/CONFIG_JSON|ICONS_JSON/g, (key) => substitutions[key]!);
}

export function renderCustomerRequestsStyles(): readonly string[] {
  return [
    renderWorkspaceStyles("customer-request").join("\n"),
    String.raw`
.customer-request-v1.generated-app{--customer-request-tint:color-mix(in srgb,var(--factory-accent) 8%,var(--factory-surface));position:relative;grid-template-columns:15.5rem minmax(0,1fr);color:var(--factory-text)}
.customer-request-v1 *{box-sizing:border-box}
.customer-request-v1 :is(h1,h2,h3,p){margin:0}
.customer-request-v1 :is(button,input,select,textarea){font:inherit;min-height:44px}
.customer-request-v1 button{padding:.65rem .9rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text);cursor:pointer}
.customer-request-v1 button.customer-request-primary{background:var(--factory-accent);border-color:var(--factory-accent);color:var(--factory-accent-text);font-weight:650}
.customer-request-v1 :is(button,input,select,textarea):disabled{opacity:.55;cursor:not-allowed}
.customer-request-v1 :is(input,select,textarea){max-width:100%;padding:.65rem .75rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text)}
.customer-request-v1 :is(button,input,select,textarea):focus-visible{outline:3px solid var(--factory-accent);outline-offset:3px}
.customer-request-v1 ::selection{background:var(--factory-accent);color:var(--factory-accent-text)}
.customer-request-v1 textarea{resize:vertical;line-height:1.5}
.customer-request-v1 .customer-request-icon{display:inline-flex;width:1.15rem;height:1.15rem;flex:0 0 auto}
.customer-request-v1 .customer-request-icon svg{width:100%;height:100%}
.customer-request-v1 .customer-request-icon-button{display:inline-grid;place-items:center;width:44px;height:44px;min-width:44px;padding:0}
.customer-request-v1 .customer-request-workspace-sidebar{grid-column:1;grid-row:1;display:flex;flex-direction:column;gap:2rem;min-width:0;padding:2rem 1.25rem;background:var(--factory-accent);color:var(--factory-accent-text)}
.customer-request-v1 .customer-request-workspace-brand{display:flex;align-items:center;gap:.75rem;min-width:0}.customer-request-v1 .customer-request-workspace-brand>div{display:grid;min-width:0}.customer-request-v1 .customer-request-workspace-brand strong{overflow-wrap:anywhere}.customer-request-v1 .customer-request-workspace-brand span:last-child{font-size:.85rem}
.customer-request-v1 .customer-request-workspace-mark{display:grid;place-items:center;width:2.25rem;height:2.25rem;flex:0 0 auto;border:1px solid color-mix(in srgb,var(--factory-accent-text) 50%,transparent);border-radius:var(--factory-radius-radius-base)}
.customer-request-v1 .customer-request-workspace-sidebar nav{display:grid;gap:.4rem}.customer-request-v1 .customer-request-workspace-sidebar nav button{display:flex;align-items:center;justify-content:start;gap:.65rem;padding:.65rem;border-color:transparent;background:transparent;color:inherit;text-align:left}.customer-request-v1 .customer-request-workspace-sidebar nav button[aria-current=page]{background:var(--factory-surface);color:var(--factory-accent)}.customer-request-v1 .customer-request-sidebar-foot{margin-top:auto;font-size:.8rem;color:inherit}
.customer-request-v1 .customer-request-principal{position:absolute;right:2rem;top:1rem;z-index:2;display:flex;align-items:center;gap:.7rem;font-size:.8rem}.customer-request-v1 .customer-request-principal select{max-width:12rem}
.customer-request-v1 .customer-request-workspace-canvas{grid-column:2;min-width:0;width:100%;max-width:110rem;margin:0 auto;padding:5.5rem clamp(1.25rem,3.5vw,3.5rem) 3rem}
.customer-request-v1 .customer-request-workspace-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}.customer-request-v1 .customer-request-workspace-heading h1{font-size:clamp(1.7rem,2.2vw,2.4rem);line-height:1.2;letter-spacing:-.025em;overflow-wrap:anywhere}.customer-request-v1 .customer-request-workspace-heading p{margin-top:.35rem;color:var(--factory-muted);font-size:.9rem}
.customer-request-v1 .customer-request-mobile-nav{display:none}
.customer-request-v1 .customer-request-workarea{display:grid;grid-template-columns:minmax(19rem,.85fr) minmax(0,1.15fr);gap:1.25rem;align-items:start}.customer-request-v1 .customer-request-queue,.customer-request-v1 .customer-request-detail{min-width:0;background:var(--factory-surface);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-lg)}.customer-request-v1 .customer-request-queue{padding:1.2rem}.customer-request-v1 .customer-request-detail{padding:1.5rem;min-height:23rem}
.customer-request-v1 .customer-request-section-heading{display:flex;align-items:center;justify-content:space-between;gap:.7rem}.customer-request-v1 .customer-request-section-heading h2{font-size:1.2rem}.customer-request-v1 .customer-request-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin:1rem 0}.customer-request-v1 .customer-request-filters label{display:grid;gap:.35rem;font-size:.78rem;font-weight:650}.customer-request-v1 .customer-request-filters select{width:100%;font-weight:400}
.customer-request-v1 .customer-request-list{list-style:none;margin:1rem 0 0;padding:0;display:grid;gap:.65rem}.customer-request-v1 .customer-request-card{display:grid;width:100%;min-width:0;gap:.45rem;text-align:left;padding:1rem;background:var(--factory-bg)}.customer-request-v1 .customer-request-card[aria-current=true]{border-color:var(--factory-accent);background:var(--customer-request-tint)}.customer-request-v1 .customer-request-card-main{display:flex;justify-content:space-between;align-items:start;gap:.65rem}.customer-request-v1 .customer-request-card-main strong{font-size:1rem;line-height:1.35;overflow-wrap:anywhere;min-width:0}.customer-request-v1 .customer-request-card-next{font-size:.85rem;color:var(--factory-text)}.customer-request-v1 .customer-request-card small{color:var(--factory-muted);font-size:.78rem}.customer-request-v1 .customer-request-status{display:inline-flex;align-items:center;white-space:nowrap;font-size:.74rem;font-weight:700;line-height:1.3;padding:.3rem .55rem;border-radius:100px;color:var(--factory-accent);background:var(--customer-request-tint)}.customer-request-v1 .customer-request-status.is-resolved{color:var(--factory-text);background:var(--factory-bg)}.customer-request-v1 .customer-request-status.is-cancelled{color:var(--factory-danger);background:color-mix(in srgb,var(--factory-danger) 10%,var(--factory-surface))}
.customer-request-v1 .customer-request-more{margin-top:1rem}.customer-request-v1 .customer-request-empty{padding:1.25rem;display:grid;gap:.6rem;justify-items:start}.customer-request-v1 .customer-request-empty p,.customer-request-v1 .customer-request-state{color:var(--factory-muted);font-size:.9rem}.customer-request-v1 .customer-request-feedback{display:grid;gap:.6rem;justify-items:start;padding:1rem;margin:1rem 0;border:1px solid var(--factory-danger);border-radius:var(--factory-radius-radius-base);overflow-wrap:anywhere}.customer-request-v1 .customer-request-notice{padding:.8rem 1rem;margin:1rem 0;background:var(--customer-request-tint);color:var(--factory-text);border-radius:var(--factory-radius-radius-base)}
.customer-request-v1 .customer-request-detail-head{padding-bottom:1.2rem;border-bottom:1px solid var(--factory-border)}.customer-request-v1 .customer-request-head-top{display:flex;align-items:center;flex-wrap:wrap;gap:.65rem}.customer-request-v1 .customer-request-next{font-size:.85rem;color:var(--factory-muted)}.customer-request-v1 .customer-request-detail-head h2{font-size:clamp(1.4rem,2vw,1.9rem);line-height:1.2;margin:.75rem 0;letter-spacing:-.02em;overflow-wrap:anywhere}.customer-request-v1 .customer-request-description{white-space:pre-wrap;overflow-wrap:anywhere;max-width:72ch;line-height:1.55}.customer-request-v1 .customer-request-detail-head small{display:block;color:var(--factory-muted);margin-top:.85rem}.customer-request-v1 .customer-request-quick-actions{display:flex;flex-wrap:wrap;gap:.55rem;padding:1rem 0}.customer-request-v1 .customer-request-terminal{padding:.85rem;background:color-mix(in srgb,var(--factory-danger) 9%,var(--factory-surface));border-radius:var(--factory-radius-radius-base)}
.customer-request-v1 .customer-request-editor{display:grid;gap:1rem;max-width:54rem;padding:1.2rem;margin:1rem 0;background:var(--factory-bg);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-lg)}.customer-request-v1 .customer-request-editor h3{font-size:1.15rem}.customer-request-v1 .customer-request-form-hint{font-size:.85rem;color:var(--factory-muted)}.customer-request-v1 .customer-request-form-hint:empty{display:none}.customer-request-v1 .customer-request-editor label{display:grid;gap:.35rem;min-width:0;font-size:.85rem;font-weight:650}.customer-request-v1 .customer-request-editor :is(input,textarea){width:100%;font-weight:400}.customer-request-v1 .customer-request-editor textarea{min-height:6rem}.customer-request-v1 .customer-request-form-actions{display:flex;flex-wrap:wrap;gap:.6rem}.customer-request-v1 .customer-request-recovery{display:grid;gap:.5rem;padding:1rem;background:var(--customer-request-tint);border-radius:var(--factory-radius-radius-base);font-size:.9rem}
.customer-request-v1 .customer-request-conversation{padding-top:1rem;border-top:1px solid var(--factory-border)}.customer-request-v1 .customer-request-conversation-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}.customer-request-v1 .customer-request-conversation-head h3{font-size:1.1rem}.customer-request-v1 .customer-request-conversation-head span{font-size:.78rem;color:var(--factory-muted)}.customer-request-v1 .customer-request-conversation ol{list-style:none;padding:0;margin:1rem 0;display:grid;gap:1rem}.customer-request-v1 .customer-request-event{padding:1rem;overflow-wrap:anywhere;background:var(--factory-bg);border-radius:var(--factory-radius-radius-base)}.customer-request-v1 .customer-request-event.is-reply,.customer-request-v1 .customer-request-event.is-complete{background:var(--customer-request-tint)}.customer-request-v1 .customer-request-event-meta{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem}.customer-request-v1 .customer-request-event-meta strong{font-size:.85rem}.customer-request-v1 .customer-request-event-meta span,.customer-request-v1 .customer-request-event small{color:var(--factory-muted);font-size:.76rem}.customer-request-v1 .customer-request-event-label{display:block;font-size:.78rem;font-weight:700;color:var(--factory-accent);margin-bottom:.25rem}.customer-request-v1 .customer-request-event p{max-width:72ch;white-space:pre-wrap;line-height:1.5;margin:.25rem 0}.customer-request-v1 .customer-request-text-action{display:block;margin-top:.65rem;min-height:44px;text-decoration:underline;text-underline-offset:3px}
.customer-request-v1 .customer-request-create{display:grid;gap:.8rem;justify-items:start}.customer-request-v1 .customer-request-header-back{display:none}
@media(max-width:1100px){.customer-request-v1 .customer-request-workspace-canvas{padding-inline:1.25rem}.customer-request-v1 .customer-request-workarea{grid-template-columns:minmax(16rem,.85fr) minmax(0,1.15fr)}}
@media(max-width:800px){.customer-request-v1.generated-app{display:block}.customer-request-v1 .customer-request-workspace-sidebar{display:none}.customer-request-v1 .customer-request-principal{position:static;display:flex;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;background:var(--factory-accent);color:var(--factory-accent-text)}.customer-request-v1 .customer-request-principal select{max-width:10rem}.customer-request-v1 .customer-request-workspace-canvas{display:block;padding:1.25rem}.customer-request-v1 .customer-request-workspace-heading h1{font-size:1.55rem}.customer-request-v1 .customer-request-workspace-heading p{display:none}.customer-request-v1 .customer-request-mobile-nav{display:flex;gap:.5rem;margin-bottom:1rem}.customer-request-v1 .customer-request-mobile-nav button{flex:1 1 0}.customer-request-v1 .customer-request-mobile-nav button[aria-current=page]{background:var(--factory-accent);border-color:var(--factory-accent);color:var(--factory-accent-text)}.customer-request-v1 .customer-request-workarea{display:block}.customer-request-v1 .customer-request-queue,.customer-request-v1 .customer-request-detail{padding:0;border:0;background:transparent;min-height:0}.customer-request-v1 .customer-request-detail{display:none}.customer-request-v1 .customer-request-workarea.is-detail-route .customer-request-queue,.customer-request-v1 .customer-request-workarea.is-form-route .customer-request-queue{display:none}.customer-request-v1 .customer-request-workarea:is(.is-detail-route,.is-form-route) .customer-request-detail{display:block}.customer-request-v1 .customer-request-back{display:inline-grid;margin-bottom:.75rem}.customer-request-v1 .customer-request-card{background:var(--factory-surface)}.customer-request-v1 .customer-request-quick-actions button{flex:1 1 auto}.customer-request-v1 .customer-request-form-actions button{flex:1 1 auto}}
@media(max-width:430px){.customer-request-v1 .customer-request-principal label{font-size:.73rem}.customer-request-v1 .customer-request-section-heading h2{font-size:1.1rem}.customer-request-v1 .customer-request-card-main{flex-wrap:wrap}.customer-request-v1 .customer-request-workspace-canvas{padding:1rem}.customer-request-v1 .customer-request-event-meta{display:grid}}
@media(max-width:800px){.customer-request-v1 .customer-request-workspace-canvas.is-detail-route .customer-request-mobile-nav{display:none}.customer-request-v1 .customer-request-workspace-canvas.is-detail-route .customer-request-workspace-heading{margin-bottom:.7rem}.customer-request-v1 .customer-request-workspace-canvas.is-detail-route .customer-request-workspace-heading>div{display:none}.customer-request-v1 .customer-request-workspace-canvas.is-detail-route .customer-request-header-back{display:inline-grid}.customer-request-v1 .customer-request-workspace-canvas.is-detail-route .customer-request-workspace-heading>.customer-request-icon-button:last-child{margin-left:auto}}
@media(max-width:800px){.customer-request-v1 .customer-request-mobile-nav{display:none}.customer-request-v1 .customer-request-queue .customer-request-section-heading h2{display:none}.customer-request-v1 .customer-request-queue .customer-request-empty .customer-request-primary{display:none}.customer-request-v1 .customer-request-workspace-canvas.is-form-route .customer-request-header-back{display:inline-grid}.customer-request-v1 .customer-request-workspace-canvas.is-form-route .customer-request-workspace-heading>.customer-request-icon-button:last-child{display:none}.customer-request-v1 .customer-request-workspace-canvas.is-form-route .customer-request-create h2{display:none}}
@media(prefers-reduced-motion:reduce){.customer-request-v1 *,.customer-request-v1 *::before,.customer-request-v1 *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`,
  ];
}
