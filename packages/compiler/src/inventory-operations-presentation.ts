import type { ApplicationGraphV1 } from "@factory/graph";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { InventoryOperationsProfile } from "./inventory-operations-contract.js";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";
import { approvalWorkspacePresentation } from "./approval-workspace-presentation.js";

/** ADR-0076: private stock identity/balance and immutable movement composition. */
export const inventoryOperationsPresentation = {
  key: "inventory-operations-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: [...approvalWorkspacePresentation.reuse, "data-table"],
  studied: [
    "merchant-menu-management",
    "menu-management-table",
    "apps/workbench",
    "content-directory-presentation@1.0.0",
    "task-workspace-presentation",
    "docs/ecosystem/source-studies/README.md",
  ],
  semanticGap:
    "Existing menu recipes require price, availability and preparation bindings; Directory and Task lack stock balances and immutable receive, issue and linked adjustment records. Compose their native form, navigation, bounded-read and recovery patterns without inventing menu fields or copying upstream source.",
  media: "No photographs or seeded business records.",
  iconPackage: "lucide-static@0.468.0",
  iconLicense: "ISC",
  iconSource: "https://github.com/lucide-icons/lucide",
  licenseSha256:
    "1e7290b35280a048667bbf0ebabac1c7fd52a75300e8b2946ac165715997f2bc",
  iconSources: Object.freeze({
    "refresh-cw":
      "d63b359b0fe05e03cff8aaa7acf82f9569733e83f7fb4742d583a086972c4bb0",
    "arrow-left":
      "e31ed0af85ffbed2b54f78f37af197c3b84b24e776cba1d27613d6a9ad555a16",
    "arrow-right":
      "12b97a4d2821da556ce7df95f89df46deb94aa711d46b36a848be0de0ac2a7f0",
    "circle-check":
      "d48c0901de2262e9f7c0566b5ad3893eafeab509715be6ac4e3b449f15d9260b",
    search: "e11a04d51c122a8a759211424920efc65fa36b7ab06237c34ef90317d920ddf9",
  }),
} as const;

function inventoryIcons() {
  getCustomerIconAssets(); // Verifies the published package coordinate and retained license.
  const root = dirname(
    createRequire(import.meta.url).resolve("lucide-static/package.json"),
  );
  return Object.fromEntries(
    Object.entries(inventoryOperationsPresentation.iconSources).map(
      ([key, hash]) => {
        const svg = readFileSync(join(root, "icons", key + ".svg"), "utf8");
        if (createHash("sha256").update(svg).digest("hex") !== hash)
          throw new Error("Inventory icon package asset integrity mismatch.");
        return [
          key,
          svg.replace("<svg", '<svg aria-hidden="true" focusable="false"'),
        ];
      },
    ),
  );
}

export function renderInventoryOperationsWorkspace(
  graph: ApplicationGraphV1,
  profile: InventoryOperationsProfile,
  fixture: boolean,
): string {
  const routes = Object.fromEntries(
    Object.entries(profile.pages).map(([kind, id]) => [
      kind,
      graph.page.pages.find((page) => page.id === id)!.route,
    ]),
  );
  const safe = (value: unknown) =>
    JSON.stringify(value).replaceAll("<", "\\u003c");
  const substitutions: Record<string, string> = {
    CONFIG_JSON: safe({
      name: graph.metadata.name,
      themeMode: createGeneratedPageRuntimeProjection(graph).themeMode,
      entity: profile.itemEntity,
      roles: profile.roles,
      routes,
      quantityMaximum: profile.quantityMaximum,
      storageKey: "inventory-role-" + graph.metadata.id,
    }),
    ICONS_JSON: safe(inventoryIcons()),
    HEADER_CHANNEL: fixture
      ? "'x-factory-fixture-session':'fixture-session-'+role"
      : "'x-factory-role':role",
  };
  return String.raw`"use client";
// inventory-operations-presentation@1.0.0
import {useEffect,useRef,useState} from "react";
const config=CONFIG_JSON;
const icons=ICONS_JSON;
type Item={id:string;sku:string;name:string;unit:'each';quantity:number;version:number};
type Movement={id:string;stockItem:string;kind:'receive'|'issue'|'adjust';delta:number;beforeQuantity:number;afterQuantity:number;reason:string;correctionOf:string|null;recordedAt:string;itemVersion:number;status:'recorded'};
type View={kind:'list'|'form'|'detail'|'missing';id?:string};
type Operation='create'|'update'|'receive'|'issue'|'adjust';
type Command={url:string;method:string;body:string;key:string;operation:Operation};
type Intent={sku:string;name:string;amount:string;reason:string;correctionOf:string|null};
const emptyIntent=():Intent=>({sku:'',name:'',amount:'',reason:'',correctionOf:null});
const names={create:'Add item',update:'Save name',receive:'Receive stock',issue:'Issue stock',adjust:'Adjust stock'};
const movementNames={receive:'Received',issue:'Issued',adjust:'Adjusted'};
class SafeUiError extends Error{}
function Icon({name}:{name:keyof typeof icons}){return <span className='inventory-icon' aria-hidden='true' dangerouslySetInnerHTML={{__html:icons[name]}}/>;}
function integer(value:unknown,min=0,max=config.quantityMaximum):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&!Object.is(value,-0)&&value>=min&&value<=max;}
function itemValue(value:unknown):Item{const item=value as Item;if(!item||typeof item.id!=='string'||!item.id||typeof item.sku!=='string'||typeof item.name!=='string'||item.unit!=='each'||!integer(item.quantity)||!integer(item.version,0,2147483647))throw new SafeUiError('Stock details could not be read. Refresh to try again.');return item;}
function movementValue(value:unknown,id:string):Movement{const entry=value as Movement;if(!entry||typeof entry.id!=='string'||!entry.id||entry.stockItem!==id||!['receive','issue','adjust'].includes(entry.kind)||!integer(entry.delta,-config.quantityMaximum)||entry.delta===0||!integer(entry.beforeQuantity)||!integer(entry.afterQuantity)||entry.beforeQuantity+entry.delta!==entry.afterQuantity||!integer(entry.itemVersion,1,2147483647)||typeof entry.reason!=='string'||typeof entry.recordedAt!=='string'||!Number.isFinite(Date.parse(entry.recordedAt))||!(entry.correctionOf===null||typeof entry.correctionOf==='string')||entry.status!=='recorded')throw new SafeUiError('Movement history could not be read. Refresh to try again.');return entry;}
function envelope(value:unknown,kind:'list'|'history',offset:number):{records:unknown[];hasMore:boolean}{const data=value as {apiVersion:string;records:unknown[];hasMore:boolean;offset:number;limit:number};if(!data||data.apiVersion!=='factory.generated.inventory-'+kind+'/v1'||!Array.isArray(data.records)||data.records.length>20||data.offset!==offset||data.limit!==20||typeof data.hasMore!=='boolean')throw new SafeUiError('The stock list could not be read. Refresh to try again.');return data;}
function locationView(path:string):View{const id=typeof window==='undefined'?undefined:new URLSearchParams(window.location.search).get('id')??undefined;return path==='/'||path===config.routes.list?{kind:'list'}:path===config.routes.form?{kind:'form'}:path===config.routes.detail?{kind:'detail',id}:{kind:'missing'};}
function headers(role:string){return {'content-type':'application/json',HEADER_CHANNEL};}
function time(value:string){return new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});}
function InventoryWorkspace({role,requestedPath}:{role:string;requestedPath:string}){
 const keeper=role===config.roles.stockkeeper;
 const [view,setView]=useState<View>(()=>locationView(requestedPath));
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[records,setRecords]=useState<Item[]>([]);
 const [record,setRecord]=useState<Item|null>(null),[movements,setMovements]=useState<Movement[]>([]),[historyOffset,setHistoryOffset]=useState(0),[historyMore,setHistoryMore]=useState(false),[historyError,setHistoryError]=useState('');
 const [operation,setOperation]=useState<Operation|null>(view.kind==='form'?'create':null),[intent,setIntent]=useState<Intent>(emptyIntent),[editVersion,setEditVersion]=useState(0);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState(false),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState<'none'|'refresh'|'review'>('none'),[revision,setRevision]=useState(0);
 const alive=useRef(true),readToken=useRef(0),historyToken=useRef(0),sending=useRef(false),command=useRef<Command|null>(null);
 const blocked=pending||uncertain;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;readToken.current++;historyToken.current++;command.current=null;};},[]);
 useEffect(()=>{if(!keeper||!operation)return;const frame=requestAnimationFrame(()=>{const field=document.getElementById('inventory-'+(operation==='create'?'sku':operation==='update'?'name':'amount'));if(field){field.focus({preventScroll:true});field.scrollIntoView({block:'center',behavior:'auto'});}});return()=>cancelAnimationFrame(frame);},[operation]);
 const href=(kind:'list'|'form'|'detail',id?:string)=>config.routes[kind]+(id?'?id='+encodeURIComponent(id):'');
 const resetIntent=()=>{setOperation(null);setIntent(emptyIntent());setConflict('none');setError('');command.current=null;};
 const navigate=(kind:'list'|'form'|'detail',id?:string)=>{if(sending.current||command.current)return;readToken.current++;historyToken.current++;setRecord(null);setMovements([]);setHistoryOffset(0);resetIntent();setMessage('');setView({kind,id});if(kind==='form')setOperation('create');window.history.pushState(null,'',href(kind,id));};
 useEffect(()=>{const pop=()=>{if(sending.current||command.current){window.history.pushState(null,'',view.kind==='missing'?config.routes.list:href(view.kind,view.id));return;}readToken.current++;historyToken.current++;resetIntent();setRecord(null);setMovements([]);setHistoryOffset(0);const next=locationView(window.location.pathname);setView(next);if(next.kind==='form')setOperation('create');setMessage('');};const unload=(event:BeforeUnloadEvent)=>{if(sending.current||command.current){event.preventDefault();event.returnValue='';}};window.addEventListener('popstate',pop);window.addEventListener('beforeunload',unload);return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',unload);};},[view.kind,view.id]);
 const get=async(url:string)=>{const response=await fetch(url,{headers:headers(role),cache:'no-store'});if(!response.ok)throw new SafeUiError(response.status===403?'Your selected role cannot open this information.':response.status===404?'This item is no longer available.':'Stock could not be loaded. Refresh to try again.');return response.json() as Promise<unknown>;};
 useEffect(()=>{const token=++readToken.current;const current=()=>alive.current&&token===readToken.current;setLoading(true);setError('');
  const load=async()=>{if(view.kind==='list'){setRecords([]);const data=envelope(await get('/api/'+config.entity+'?'+new URLSearchParams({q:search,offset:String(offset),limit:'20'})),'list',offset);const next=data.records.map(itemValue);if(current()){setRecords(next);setHasMore(data.hasMore);}}
   else if(view.kind==='detail'){if(!view.id)throw new SafeUiError('Choose an item from the stock list.');const next=itemValue(await get('/api/'+config.entity+'/'+encodeURIComponent(view.id)));if(next.id!==view.id)throw new SafeUiError('The requested item could not be read.');if(current())setRecord(next);}};
  void load().catch(reason=>{if(current())setError(reason instanceof SafeUiError?reason.message:'Stock could not be loaded. Refresh to try again.');}).finally(()=>{if(current())setLoading(false);});
 },[view.kind,view.id,search,offset,revision]);
 useEffect(()=>{const token=++historyToken.current;const current=()=>alive.current&&token===historyToken.current;setMovements([]);setHistoryError('');setHistoryMore(false);if(!keeper||view.kind!=='detail'||!view.id)return;const id=view.id;
  void get('/api/'+config.entity+'/'+encodeURIComponent(id)+'/movements?'+new URLSearchParams({offset:String(historyOffset),limit:'20'})).then(value=>{const data=envelope(value,'history',historyOffset);const entries=data.records.map(entry=>movementValue(entry,id));if(current()){setMovements(entries);setHistoryMore(data.hasMore);}}).catch(()=>{if(current())setHistoryError('Movement history could not be loaded. Refresh to try again.');});
 },[view.kind,view.id,historyOffset,revision]);
 const start=(next:Operation,correction?:Movement)=>{if(blocked||!keeper||!record)return;setOperation(next);setIntent({...emptyIntent(),name:record.name,correctionOf:correction?.id??null});setEditVersion(record.version);setConflict('none');setError('');setMessage('');};
 const refreshConflict=async()=>{if(!record||blocked)return;const token=++readToken.current;setLoading(true);try{const latest=itemValue(await get('/api/'+config.entity+'/'+encodeURIComponent(record.id)));if(!alive.current||token!==readToken.current)return;if(latest.id!==record.id)throw new SafeUiError('The requested item could not be read.');setRecord(latest);setEditVersion(latest.version);setConflict('review');setError('');setMessage('Latest stock loaded. Your entries are kept. Review the new balance, then confirm your change.');}catch{if(alive.current&&token===readToken.current)setError('Latest stock could not be loaded. Try refreshing again.');}finally{if(alive.current&&token===readToken.current)setLoading(false);}};
 const perform=async(saved:Command)=>{if(sending.current||!keeper)return;sending.current=true;command.current=saved;setPending(true);setUncertain(false);setError('');setMessage('');
  try{const response=await fetch(saved.url,{method:saved.method,headers:{...headers(role),'x-factory-idempotency-key':saved.key},body:saved.body});if(!alive.current)return;
   if(!response.ok){if(response.status>=500){setUncertain(true);setError('The result is not confirmed. Retry this same change to check whether it was saved.');return;}let code='';try{const failure=await response.json() as {code?:unknown};if(typeof failure.code==='string')code=failure.code;}catch{}if(!alive.current)return;
    if(code==='inventory.retry_required'){setUncertain(true);setError('The result is not confirmed. Retry this same change to check whether it was saved.');return;}
    command.current=null;
    if(code==='inventory.version_conflict'){setConflict('refresh');setError('Stock changed while you were working. Refresh the current stock, then review and confirm your entries.');}
    else setError(code==='inventory.insufficient_stock'?'There is not enough stock for this issue. Your entries are kept. Reduce the quantity or refresh the current stock.':code==='inventory.sku_conflict'?'This SKU already exists. Use a different SKU or open the existing item.':code==='inventory.quantity_limit'?'This change exceeds the supported stock limit. Reduce the quantity.':code==='inventory.version_limit'?'This item has reached its change limit. It can still be read.':response.status===403?'Your selected role cannot make this change.':response.status===404?'The item or linked movement is no longer available.':response.status===409?'The change conflicted. Review your entries before trying again.':'Check the entered values and try again.');return;}
   const result=await response.json() as unknown;if(!alive.current)return;const movement=['receive','issue','adjust'].includes(saved.operation);const data=result as {apiVersion?:string;item:unknown;movement:unknown};if(movement&&data.apiVersion!=='factory.generated.inventory-command-result/v1')throw Error('Invalid result');const item=itemValue(movement?data.item:result);if(saved.operation!=='create'&&item.id!==view.id)throw Error('Wrong item');if(movement)movementValue(data.movement,item.id);
   command.current=null;setUncertain(false);setRecord(item);setOperation(null);setIntent(emptyIntent());setConflict('none');setError('');setMessage((movement?'Stock saved. ':saved.operation==='create'?'Item added. ':'Name saved. ')+'Saved balance: '+item.quantity.toLocaleString()+' each.');setHistoryOffset(0);setView({kind:'detail',id:item.id});window.history.pushState(null,'',href('detail',item.id));setRevision(value=>value+1);
  }catch{if(alive.current){setUncertain(true);setError('The result is not confirmed. Retry this same change to check whether it was saved.');}}
  finally{sending.current=false;if(alive.current)setPending(false);}
 };
 const amount=/^-?[0-9]+$/.test(intent.amount)?Number(intent.amount):NaN;
 const delta=operation==='issue'?-amount:amount;
 const proposed=record&&integer(amount,operation==='adjust'?-config.quantityMaximum:1)&&amount!==0?record.quantity+delta:null;
 const save=(event:{preventDefault():void})=>{event.preventDefault();if(!keeper||!operation||blocked||sending.current||conflict==='refresh'||loading)return;
  const name=intent.name.trim(),sku=intent.sku.trim(),reason=intent.reason.trim();let body:unknown;
  if(operation==='create'||operation==='update'){if(!name||name.length>120||/[\u0000-\u001f\u007f-\u009f]/.test(name)){setError('Enter an item name of 1 to 120 characters.');return;}if(operation==='create'&&!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(sku)){setError('Use a SKU of up to 40 letters, numbers, dots, underscores or hyphens.');return;}body=operation==='create'?{values:{sku,name}}:{expectedVersion:editVersion,values:{name}};}
  else{if(!integer(amount,operation==='adjust'?-config.quantityMaximum:1)||amount===0){setError(operation==='adjust'?'Enter a nonzero whole-number adjustment.':'Enter a positive whole-number quantity.');return;}if(!reason||reason.length>280||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(reason)){setError('Enter a reason of 1 to 280 characters.');return;}body=operation==='adjust'?{expectedVersion:editVersion,delta:amount,reason,correctionOf:intent.correctionOf}:{expectedVersion:editVersion,quantity:amount,reason};}
  const url='/api/'+config.entity+(operation==='create'?'':'/'+encodeURIComponent(record!.id)+(operation==='update'?'':'/movements/'+operation));
  void perform({url,method:operation==='update'?'PATCH':'POST',body:JSON.stringify(body),key:'inventory-'+crypto.randomUUID(),operation});
 };
 const link=(kind:'list'|'form'|'detail',label:string,id?:string,className='')=><a className={className} href={href(kind,id)} aria-disabled={blocked||undefined} onClick={event=>{event.preventDefault();navigate(kind,id);}}>{label}</a>;
 const pager=(history=false)=>{const current=history?historyOffset:offset,more=history?historyMore:hasMore,change=history?setHistoryOffset:setOffset;return <div className='inventory-pager' aria-label={history?'Movement pages':'Item pages'}><button type='button' disabled={blocked||loading||current===0} onClick={()=>change(value=>Math.max(0,value-20))}><Icon name='arrow-left'/>Previous</button><span>Page {current/20+1}</span><button type='button' disabled={blocked||loading||!more||current>=10000} onClick={()=>change(value=>Math.min(10000,value+20))}>Next<Icon name='arrow-right'/></button></div>;};
 const field=(key:'sku'|'name'|'amount'|'reason',label:string)=><div className='inventory-field'><label htmlFor={'inventory-'+key}>{label}</label>{key==='reason'?<textarea id={'inventory-'+key} maxLength={280} required value={intent[key]} onChange={event=>setIntent(value=>({...value,[key]:event.target.value}))}/>:<input id={'inventory-'+key} required maxLength={key==='name'?120:key==='sku'?40:12} inputMode={key==='amount'?'numeric':undefined} autoComplete='off' value={intent[key]} onChange={event=>setIntent(value=>({...value,[key]:event.target.value}))}/>}</div>;
 const editor=operation&&keeper?<form className='inventory-editor' onSubmit={save}><h2>{operation==='update'?'Edit item name':names[operation]}</h2><fieldset disabled={blocked||loading}>{operation==='create'?<>{field('sku','SKU')}<p className='inventory-hint'>A unique stock code. Letters are saved in uppercase.</p></>:null}{operation==='create'||operation==='update'?field('name','Item name'):<>{field('amount',operation==='adjust'?'Adjustment (each)':'Quantity (each)')}{operation==='adjust'?<p className='inventory-hint'>Use a negative number to remove stock or a positive number to add it. The original movement stays unchanged.</p>:null}{field('reason','Reason')}{intent.correctionOf?<p className='inventory-link-note'>Linked to the selected original movement.</p>:null}<p className='inventory-proposal' aria-live='polite'>{proposed===null?'Enter a whole-number quantity to review the resulting balance.':'Proposed balance: '+proposed.toLocaleString()+' each'+(proposed<0?' — not enough stock.':proposed>config.quantityMaximum?' — exceeds the stock limit.':'.')}</p></>}{operation==='create'?<p>New items start at 0 each.</p>:operation==='update'?<p>SKU, stock and movement history stay unchanged.</p>:null}</fieldset><div className='inventory-actions'><button className='generated-primary' disabled={blocked||loading||conflict==='refresh'}>{conflict==='review'?'Confirm '+names[operation].toLowerCase()+' with latest stock':names[operation]}</button><button type='button' disabled={blocked} onClick={()=>{if(operation==='create')navigate('list');else resetIntent();}}>Cancel</button></div></form>:null;
 return <><aside className='inventory-sidebar'><strong>{config.name}</strong><p>Shared stockroom</p><nav aria-label='Stockroom navigation'>{link('list','Stock on hand',undefined,view.kind==='list'?'is-current':'')}{keeper?link('form','Add item',undefined,view.kind==='form'?'is-current':''):null}</nav><p className='inventory-sidebar-foot'>{keeper?'Receive, issue and correct stock.':'Read current stock availability.'}</p></aside><div className='inventory-canvas'><header className='inventory-heading'><div><h1>{view.kind==='list'?config.name:view.kind==='form'?'Add an item':'Stock on hand'}</h1>{view.kind==='list'?<p>Find an item. Check what is available.</p>:null}</div><button className='inventory-icon-button' type='button' aria-label='Refresh' title='Refresh' disabled={blocked||loading||!!operation} onClick={()=>setRevision(value=>value+1)}><Icon name='refresh-cw'/></button></header>
 {view.kind!=='list'?<button className='inventory-icon-button inventory-back' type='button' aria-label='Back to stock' title='Back to stock' disabled={blocked} onClick={()=>navigate('list')}><Icon name='arrow-left'/></button>:null}
 {view.kind==='list'?<><form className='inventory-search' onSubmit={event=>{event.preventDefault();if(query.trim().length>120||/[\u0000-\u001f\u007f-\u009f]/.test(query)){setError('Enter a search of up to 120 characters.');return;}setSearch(query.trim());setOffset(0);}}><label htmlFor='inventory-search'>Search stock<input id='inventory-search' type='search' maxLength={120} placeholder='SKU or item name' value={query} onChange={event=>setQuery(event.target.value)}/></label><button type='submit' className='generated-primary inventory-icon-button' aria-label='Search' title='Search'><Icon name='search'/></button></form><div className='inventory-section-heading'><h2>Stock on hand</h2>{keeper?link('form','Add item',undefined,'inventory-add'):null}</div></>:null}
 {error?<div className='inventory-feedback' role='alert'><p>{error}</p>{uncertain?<button type='button' disabled={pending} onClick={()=>command.current&&void perform(command.current)}>Retry same change</button>:conflict==='refresh'||(operation&&record)?<button type='button' disabled={loading||pending} onClick={()=>void refreshConflict()}>Refresh current stock</button>:null}</div>:null}
 {message?<p className='inventory-notice' role='status'><Icon name='circle-check'/>{message}</p>:null}{pending?<p role='status'>Saving stock change…</p>:null}{loading?<p role='status' className='inventory-loading'>Loading stock…</p>:null}
 {view.kind==='list'&&!loading&&!error?<>{records.length?<><ul className='inventory-records'>{records.map(item=><li key={item.id} className='inventory-record'><div><span className='inventory-sku'>{item.sku}</span><h3>{link('detail',item.name,item.id)}</h3></div><div className={'inventory-quantity'+(item.quantity===0?' is-zero':'')}><strong>{item.quantity.toLocaleString()}</strong><span>each</span><small>{item.quantity===0?'Out of stock':'Available'}</small></div></li>)}</ul>{pager()}</>:<section className='inventory-empty'><h2>{search?'No matching items':'Your stockroom starts here'}</h2><p>{search?'Try a different SKU or item name.':keeper?'Add your first item, then receive the stock on hand.':'Items will appear here once they have been added.'}</p>{search?<button type='button' onClick={()=>{setQuery('');setSearch('');setOffset(0);}}>Clear filters</button>:keeper?link('form','Add item',undefined,'inventory-add'):null}</section>}</>:null}
 {view.kind==='form'?(keeper?editor:<p className='inventory-empty'>Stockkeeper access is required to add items. Your selected role can read stock availability.</p>):null}
 {view.kind==='detail'&&record?<><section className='inventory-detail' aria-label='Item stock'><div className='inventory-identity'><span className='inventory-sku'>{record.sku}</span><h2>{record.name}</h2><div className='inventory-balance'><strong>{record.quantity.toLocaleString()}</strong><span>each available</span></div></div>{keeper?<div className='inventory-stock-actions'><button className='generated-primary' disabled={blocked||loading||!!operation} onClick={()=>start('issue')}>Issue stock</button><button disabled={blocked||loading||!!operation} onClick={()=>start('receive')}>Receive stock</button><button disabled={blocked||loading||!!operation} onClick={()=>start('adjust')}>Adjust stock</button><button className='inventory-name-action' disabled={blocked||loading||!!operation} onClick={()=>start('update')}>Edit name</button></div>:null}</section>{editor}{keeper?<section className='inventory-history'><div className='inventory-section-heading'><h2>Movement history</h2><span>Saved stock changes</span></div>{historyError?<p role='alert'>{historyError}</p>:movements.length?<><ol className='inventory-movements'>{movements.map(entry=><li key={entry.id}><div className={'inventory-movement-kind '+entry.kind}><strong>{movementNames[entry.kind]}</strong><span>{entry.delta>0?'+':''}{entry.delta.toLocaleString()} each</span></div><div className='inventory-movement-body'><p>{entry.reason}</p><div className='inventory-movement-meta'><span>Before {entry.beforeQuantity.toLocaleString()} → After {entry.afterQuantity.toLocaleString()} each</span><time dateTime={entry.recordedAt}>Recorded {time(entry.recordedAt)}</time></div>{entry.correctionOf?<p className='inventory-link-note'>Correction linked to an earlier movement</p>:null}</div><button type='button' disabled={blocked||!!operation} onClick={()=>start('adjust',entry)}>Correct this movement</button></li>)}</ol>{pager(true)}</>:<p className='inventory-empty'>No movements yet. Receive stock to record the first change.</p>}</section>:null}</>:null}
 {view.kind==='missing'?<section className='inventory-empty'><h2>Page not found</h2>{link('list','Return to stock')}</section>:null}</div></>;
}
export function GeneratedApplication({requestedPath}:{requestedPath:string}){
 const [role,setRole]=useState<string>(config.roles.observer);
 useEffect(()=>{try{const stored=sessionStorage.getItem(config.storageKey);if(stored===config.roles.stockkeeper||stored===config.roles.observer)setRole(stored);}catch{}},[]);
 return <main className='generated-app inventory-v1' data-theme={config.themeMode}><div className='inventory-role'><label htmlFor='inventory-role'>Demo role</label><select id='inventory-role' value={role} onChange={event=>{const next=event.target.value;setRole(next);try{sessionStorage.setItem(config.storageKey,next);}catch{}}}><option value={config.roles.observer}>Observer</option><option value={config.roles.stockkeeper}>Stockkeeper</option></select></div><InventoryWorkspace key={role} role={role} requestedPath={typeof window==='undefined'?requestedPath:window.location.pathname}/></main>;
}
`.replace(
    /CONFIG_JSON|ICONS_JSON|HEADER_CHANNEL/g,
    (key) => substitutions[key]!,
  );
}

export function renderInventoryOperationsStyles(): string {
  return `
.inventory-v1.generated-app{display:grid;grid-template-columns:14rem minmax(0,1fr);padding:0;margin:0;min-height:100vh;line-height:1.5;--inventory-tint:color-mix(in srgb,var(--factory-accent) 8%,var(--factory-bg));background:var(--factory-bg);color:var(--factory-text);}
.inventory-v1 *{box-sizing:border-box;}
.inventory-v1 :is(button,a,input,select,textarea){font:inherit;min-height:44px;caret-color:var(--factory-accent);}
.inventory-v1 :is(button,a):focus-visible,.inventory-v1 :is(input,select,textarea):focus-visible{outline:3px solid var(--factory-accent);outline-offset:3px;}
.inventory-v1 ::selection{background:var(--factory-accent);color:var(--factory-accent-text);}
.inventory-v1 ::placeholder{color:var(--factory-muted);opacity:1;}
.inventory-v1 button,.inventory-v1 a{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;text-underline-offset:.2em;cursor:pointer;}
.inventory-v1 button{padding:.6rem .9rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text);}
.inventory-v1 :is(button,a):hover{filter:brightness(.96);}
.inventory-v1 :is(button,input,select,textarea):disabled,.inventory-v1 a[aria-disabled=true]{opacity:.55;cursor:not-allowed;}
.inventory-v1 button.generated-primary,.inventory-v1 a.inventory-add{background:var(--factory-accent);color:var(--factory-accent-text);border-color:var(--factory-accent);}
.inventory-v1 a.inventory-add{padding:.6rem 1rem;border-radius:var(--factory-radius-radius-base);text-decoration:none;font-weight:600;}
.inventory-v1 :is(h1,h2,h3,p){margin:0;}
.inventory-v1 :is(h1,h2,h3){color:var(--factory-text);overflow-wrap:anywhere;}
.inventory-v1 p{max-width:72ch;}
.inventory-v1 .inventory-icon{display:inline-flex;width:1.15rem;height:1.15rem;flex:0 0 auto;}
.inventory-v1 .inventory-icon svg{width:100%;height:100%;}
.inventory-v1 .inventory-icon-button{width:44px;min-width:44px;height:44px;padding:0;}
.inventory-v1 .inventory-sidebar{grid-column:1;grid-row:1;padding:2rem 1.25rem;display:flex;flex-direction:column;background:var(--factory-accent);color:var(--factory-accent-text);min-width:0;}
.inventory-v1 .inventory-sidebar strong{font-size:1.15rem;line-height:1.35;overflow-wrap:anywhere;}
.inventory-v1 .inventory-sidebar p{color:inherit;font-size:.85rem;margin-top:.5rem;}
.inventory-v1 .inventory-sidebar nav{display:grid;gap:.5rem;margin:2rem 0;}
.inventory-v1 .inventory-sidebar nav a{justify-content:start;padding:.65rem;color:inherit;border:0;background:transparent;}
.inventory-v1 .inventory-sidebar nav a.is-current{background:var(--factory-surface);color:var(--factory-accent);border-radius:var(--factory-radius-radius-base);}
.inventory-v1 .inventory-sidebar .inventory-sidebar-foot{margin-top:auto;padding-top:2rem;}
.inventory-v1 .inventory-role{position:absolute;right:2.5rem;top:1rem;display:flex;align-items:center;gap:.75rem;font-size:.85rem;}
.inventory-v1 .inventory-role select{padding:.45rem .65rem;background:var(--factory-surface);color:var(--factory-text);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);}
.inventory-v1 .inventory-canvas{grid-column:2;min-width:0;padding:5.5rem clamp(1.5rem,4vw,4rem) 3rem;max-width:85rem;width:100%;margin:auto;align-self:start;}
.inventory-v1 .inventory-heading{display:flex;align-items:start;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;}
.inventory-v1 .inventory-heading h1{font-size:clamp(1.65rem,2.4vw,2.4rem);line-height:1.2;letter-spacing:-.025em;}
.inventory-v1 .inventory-heading p{color:var(--factory-muted);margin-top:.5rem;}
.inventory-v1 .inventory-search{display:flex;align-items:end;gap:.65rem;max-width:45rem;margin-bottom:1.6rem;}
.inventory-v1 .inventory-search label{display:grid;gap:.4rem;flex:1;min-width:0;font-size:.85rem;font-weight:600;}
.inventory-v1 input,.inventory-v1 textarea{width:100%;padding:.65rem .75rem;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);background:var(--factory-surface);color:var(--factory-text);}
.inventory-v1 .inventory-section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-bottom:.8rem;border-bottom:1px solid var(--factory-border);}
.inventory-v1 .inventory-section-heading h2{font-size:1.15rem;}
.inventory-v1 .inventory-section-heading>span{font-size:.85rem;color:var(--factory-muted);}
.inventory-v1 .inventory-records{list-style:none;margin:0;padding:0;}
.inventory-v1 .inventory-record{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1.5rem;align-items:center;padding:1.3rem 0;border-bottom:1px solid var(--factory-border);}
.inventory-v1 .inventory-sku{font-size:.8rem;font-weight:600;color:var(--factory-muted);overflow-wrap:anywhere;}
.inventory-v1 .inventory-record h3{font-size:1.2rem;line-height:1.35;}
.inventory-v1 .inventory-record h3 a{justify-content:start;width:100%;padding:0;border:0;border-radius:0;background:transparent;color:var(--factory-text);text-decoration:none;overflow-wrap:anywhere;}
.inventory-v1 .inventory-record h3 a:hover{text-decoration:underline;}
.inventory-v1 .inventory-quantity{text-align:right;display:grid;grid-template-columns:auto auto;align-items:baseline;gap:0 .35rem;font-variant-numeric:tabular-nums;}
.inventory-v1 .inventory-quantity strong{font-size:1.6rem;color:var(--factory-accent);}
.inventory-v1 .inventory-quantity span{font-size:.8rem;}
.inventory-v1 .inventory-quantity small{grid-column:1/-1;font-size:.75rem;color:var(--factory-muted);}
.inventory-v1 .inventory-quantity.is-zero strong{color:var(--factory-text);}
.inventory-v1 .inventory-pager{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding-top:1.2rem;font-size:.85rem;}
.inventory-v1 .inventory-empty{padding:1.8rem 0;display:grid;justify-items:start;gap:.75rem;}
.inventory-v1 .inventory-empty h2{font-size:1.35rem;}
.inventory-v1 .inventory-back{margin-bottom:1rem;}
.inventory-v1 .inventory-detail{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2rem;align-items:center;padding:1.5rem;background:var(--inventory-tint);border-radius:12px;}
.inventory-v1 .inventory-identity{min-width:0;}
.inventory-v1 .inventory-identity h2{font-size:clamp(1.5rem,2.5vw,2rem);line-height:1.25;margin-top:.45rem;}
.inventory-v1 .inventory-balance{display:flex;align-items:baseline;gap:.65rem;margin-top:1rem;font-variant-numeric:tabular-nums;}
.inventory-v1 .inventory-balance strong{font-size:2.75rem;line-height:1.15;color:var(--factory-accent);}
.inventory-v1 .inventory-balance span{font-size:.95rem;}
.inventory-v1 .inventory-stock-actions{display:grid;gap:.65rem;min-width:10rem;}
.inventory-v1 .inventory-stock-actions .inventory-name-action{background:transparent;border-color:transparent;text-decoration:underline;}
.inventory-v1 .inventory-editor{margin:1.5rem 0;padding:1.5rem;background:var(--factory-surface);border:1px solid var(--factory-border);border-radius:12px;max-width:50rem;}
.inventory-v1 .inventory-editor h2{font-size:1.3rem;margin-bottom:1.2rem;}
.inventory-v1 fieldset{border:0;margin:0;padding:0;min-width:0;display:grid;gap:1rem;}
.inventory-v1 .inventory-field{display:grid;gap:.4rem;font-size:.95rem;font-weight:600;}
.inventory-v1 textarea{resize:vertical;min-height:6rem;line-height:1.5;}
.inventory-v1 .inventory-hint{font-size:.85rem;color:var(--factory-muted);}
.inventory-v1 .inventory-proposal{background:var(--inventory-tint);padding:1rem;border-radius:var(--factory-radius-radius-base);font-weight:600;}
.inventory-v1 .inventory-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.25rem;}
.inventory-v1 .inventory-feedback{border:1px solid var(--factory-danger);padding:1rem;border-radius:12px;margin:1rem 0;display:grid;gap:.75rem;justify-items:start;}
.inventory-v1 .inventory-notice{display:flex;gap:.6rem;align-items:start;padding:1rem 0;color:var(--factory-text);}
.inventory-v1 .inventory-notice .inventory-icon{margin-top:.2rem;color:var(--factory-accent);}
.inventory-v1 .inventory-loading{padding:1rem 0;}
.inventory-v1 .inventory-history{margin-top:2rem;}
.inventory-v1 .inventory-movements{padding:0;margin:0;list-style:none;}
.inventory-v1 .inventory-movements li{display:grid;grid-template-columns:7rem minmax(0,1fr) auto;gap:1rem;padding:1.2rem 0;border-bottom:1px solid var(--factory-border);align-items:start;}
.inventory-v1 .inventory-movement-kind{display:grid;gap:.2rem;font-size:.85rem;}
.inventory-v1 .inventory-movement-kind span{font-weight:600;font-variant-numeric:tabular-nums;}
.inventory-v1 .inventory-movement-kind.receive{color:var(--factory-accent);}
.inventory-v1 .inventory-movement-body{min-width:0;overflow-wrap:anywhere;}
.inventory-v1 .inventory-movement-body>p{white-space:pre-wrap;}
.inventory-v1 .inventory-movement-meta{display:flex;flex-wrap:wrap;gap:.35rem 1.25rem;color:var(--factory-muted);font-size:.8rem;margin-top:.4rem;font-variant-numeric:tabular-nums;}
.inventory-v1 .inventory-link-note{font-size:.85rem;color:var(--factory-muted);margin-top:.5rem;}
.inventory-v1 .inventory-movements button{font-size:.8rem;}
@media(max-width:1100px){.inventory-v1 .inventory-movements li{grid-template-columns:6rem minmax(0,1fr);}.inventory-v1 .inventory-movements button{grid-column:2;justify-self:start;}.inventory-v1 .inventory-detail{gap:1.25rem;}}
@media(max-width:800px){.inventory-v1.generated-app{display:block;}.inventory-v1 .inventory-sidebar{display:none;}.inventory-v1 .inventory-role{position:static;padding:.5rem 1.25rem;justify-content:flex-end;border-bottom:1px solid var(--factory-border);background:var(--inventory-tint);}.inventory-v1 .inventory-canvas{padding:1.25rem 1.25rem 2rem;}.inventory-v1 .inventory-heading{margin-bottom:1.1rem;}.inventory-v1 .inventory-heading h1{font-size:1.65rem;}.inventory-v1 .inventory-heading p{font-size:.9rem;}.inventory-v1 .inventory-search{margin-bottom:1.25rem;}.inventory-v1 .inventory-record{gap:1rem;padding:1.1rem 0;}.inventory-v1 .inventory-record h3{font-size:1.05rem;}.inventory-v1 .inventory-quantity strong{font-size:1.4rem;}.inventory-v1 .inventory-detail{grid-template-columns:minmax(0,1fr);padding:1.25rem;}.inventory-v1 .inventory-stock-actions{grid-template-columns:1fr 1fr;gap:.6rem;}.inventory-v1 .inventory-stock-actions .generated-primary{grid-column:1/-1;}.inventory-v1 .inventory-stock-actions .inventory-name-action{grid-column:1/-1;}.inventory-v1 .inventory-editor{padding:1rem;}.inventory-v1 .inventory-section-heading>span{display:none;}.inventory-v1 .inventory-movements li{gap:.7rem;}.inventory-v1 .inventory-movement-meta{display:grid;}.inventory-v1 .inventory-balance strong{font-size:2.5rem;}}
@media(prefers-reduced-motion:reduce){.inventory-v1 *,.inventory-v1 *::before,.inventory-v1 *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
`;
}
