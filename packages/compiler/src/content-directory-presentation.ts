import type { ApplicationGraphV1 } from "@factory/graph";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { ContentDirectoryProfile } from "./content-directory-contract.js";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";
import {
  approvalWorkspacePresentation,
  renderWorkspaceDataHelpers,
} from "./approval-workspace-presentation.js";

/** ADR-0074: category discovery and plain-text reading, with local curation. */
export const contentDirectoryPresentation = {
  key: "content-directory-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: approvalWorkspacePresentation.reuse,
  icons: [
    "user-round",
    "refresh-cw",
    "arrow-left",
    "arrow-right",
    "circle-check",
    "circle-x",
  ] as const,
  // Gap: the approved customer set has no knowledge/search glyphs. Compose
  // published local assets from the same pinned, licensed package privately.
  iconSources: Object.freeze({
    "book-open":
      "510affae1044e8637c7a85972bd192df3c762f69a38c8c7dd2097387d7fe91d2",
    "file-text":
      "512f414d72aabc5218b94a9da571df70d8e0b014cfb32ec366b559ec868952d6",
    "list-checks":
      "32366985f590f2562bded81d3e726c7d531e6bdfbaa8fa448eb2f88fb7729b0a",
    search: "e11a04d51c122a8a759211424920efc65fa36b7ab06237c34ef90317d920ddf9",
  }),
};

function directoryIcons() {
  const approved = getCustomerIconAssets(); // Validates pinned version and retained ISC license.
  const root = dirname(
    createRequire(import.meta.url).resolve("lucide-static/package.json"),
  );
  return Object.fromEntries([
    ...contentDirectoryPresentation.icons.map((key) => [
      key,
      approved.icons[key],
    ]),
    ...Object.entries(contentDirectoryPresentation.iconSources).map(
      ([key, hash]) => {
        const svg = readFileSync(join(root, "icons", key + ".svg"), "utf8");
        if (createHash("sha256").update(svg).digest("hex") !== hash)
          throw new Error("Directory icon package asset integrity mismatch.");
        return [
          key,
          svg.replace("<svg", '<svg aria-hidden="true" focusable="false"'),
        ];
      },
    ),
  ]);
}

export function renderContentDirectoryWorkspace(
  graph: ApplicationGraphV1,
  profile: ContentDirectoryProfile,
  fixture: boolean,
): string {
  const projection = createGeneratedPageRuntimeProjection(graph);
  const entity = graph.domain.entities.find(
    (item) => item.key === profile.entity,
  )!;
  const routes = Object.fromEntries(
    Object.entries(profile.pages).map(([kind, id]) => [
      kind,
      graph.page.pages.find((page) => page.id === id)!.route,
    ]),
  );
  const icons = directoryIcons();
  const safe = (value: unknown) =>
    JSON.stringify(value).replaceAll("<", "\\u003c");
  const substitutions: Record<string, string> = {
    DEFINITION_JSON: safe({
      applicationName: graph.metadata.name,
      themeMode: projection.themeMode,
      flow: graph.flow,
    }),
    CONFIG_JSON: safe({
      entity: profile.entity,
      roles: profile.roles,
      categories: profile.categories,
      routes,
      fields: entity.fields.filter((field) => field.key !== "status"),
      storageKey: "directory-role-" + graph.metadata.id,
    }),
    ICONS_JSON: safe(icons),
    HEADER_CHANNEL: fixture
      ? "'x-factory-fixture-session':'fixture-session-'+role"
      : "'x-factory-role':role",
    DATA_HELPERS: renderWorkspaceDataHelpers(),
  };

  return String.raw`"use client";
// content-directory-presentation@1.0.0
import {useEffect,useRef,useState} from "react";
type JsonRecord=Record<string,unknown>;
type RuntimeField={readonly key:string;readonly type:string;readonly required:boolean;readonly values?:readonly string[]};
const definition=DEFINITION_JSON;
const config=CONFIG_JSON;
const icons=ICONS_JSON;
function DirectoryIcon({name}:{name:keyof typeof icons}){return <span className='directory-icon' aria-hidden='true' dangerouslySetInnerHTML={{__html:icons[name]}}/>;}
DATA_HELPERS
type Entry={id:string;title:string;summary:string;body?:string;category:string;status:'hidden'|'listed';version:number};
type Values={title:string;summary:string;body:string;category:string};
type View={kind:'list'|'detail'|'form'|'missing';id?:string};
type Command={url:string;method:string;body:string;key:string};
const emptyValues=():Values=>({title:'',summary:'',body:'',category:config.categories[0]});
function entryValue(value:unknown,detail=false):Entry{
 const r=value as Entry;
 if(!r||typeof r!=='object'||typeof r.id!=='string'||!r.id||typeof r.title!=='string'||typeof r.summary!=='string'||!config.categories.includes(r.category)||!['hidden','listed'].includes(r.status)||!Number.isSafeInteger(r.version)||r.version<0||(detail&&typeof r.body!=='string'))throw new SafeUiError('The resource could not be loaded. Refresh to try again.');
 return r;
}
function locationView(path:string):View{
 const id=typeof window==='undefined'?undefined:new URLSearchParams(window.location.search).get('id')??undefined;
 return path==='/'||path===config.routes.list?{kind:'list'}:path===config.routes.detail?{kind:'detail',id}:path===config.routes.form?{kind:'form'}:{kind:'missing'};
}
function directoryHeaders(role:string){return {'content-type':'application/json',HEADER_CHANNEL};}
function DirectoryWorkspace({role,requestedPath}:{role:string;requestedPath:string}){
 const curator=role===config.roles.curator;
 const initial=typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search);
 const [view,setView]=useState<View>(()=>locationView(requestedPath));
 const [query,setQuery]=useState(initial.get('q')??''),[search,setSearch]=useState(initial.get('q')??''),[category,setCategory]=useState(initial.get('category')??'');
 const [offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[records,setRecords]=useState<Entry[]>([]),[record,setRecord]=useState<Entry|null>(null);
 const [values,setValues]=useState<Values>(emptyValues),[editing,setEditing]=useState(false),[editVersion,setEditVersion]=useState(0);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState(false),[retry,setRetry]=useState(false),[conflict,setConflict]=useState(false),[revision,setRevision]=useState(0);
 const alive=useRef(true),readToken=useRef(0),command=useRef<Command|null>(null),sending=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;readToken.current++;command.current=null;};},[]);
 const href=(kind:'list'|'detail'|'form',id?:string)=>{const params=new URLSearchParams();if(id)params.set('id',id);if(search)params.set('q',search);if(category)params.set('category',category);return config.routes[kind]+(params.size?'?'+params.toString():'');};
 const navigate=(kind:'list'|'detail'|'form',id?:string)=>{readToken.current++;window.history.pushState(null,'',href(kind,id));setView({kind,id});setRecord(null);setEditing(false);setValues(emptyValues());setError('');setMessage('');setConflict(false);setRetry(false);command.current=null;};
 useEffect(()=>{const pop=()=>{readToken.current++;setRecord(null);setRecords([]);setEditing(false);setView(locationView(window.location.pathname));const params=new URLSearchParams(window.location.search);setSearch(params.get('q')??'');setQuery(params.get('q')??'');setCategory(params.get('category')??'');setOffset(0);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 const get=async(url:string)=>{const response=await fetch(url,{headers:directoryHeaders(role),cache:'no-store'});if(!response.ok)throw new SafeUiError(response.status===404?'This resource is not available.':safeResponseMessage(response.status));return response.json() as Promise<unknown>;};
 useEffect(()=>{
  const token=++readToken.current;setError('');setLoading(true);setRecords([]);setRecord(null);
  const current=()=>alive.current&&token===readToken.current;
  const load=async()=>{
   if(view.kind==='list'){
    const params=new URLSearchParams({q:search,offset:String(offset),limit:'20'});if(category)params.set('category',category);
    const data=await get('/api/'+config.entity+'?'+params.toString()) as {apiVersion:string;records:unknown[];offset:number;limit:number;hasMore:boolean};
    if(!current())return;
    if(!data||data.apiVersion!=='factory.generated.directory-list/v1'||!Array.isArray(data.records)||data.records.length>20||data.offset!==offset||data.limit!==20||typeof data.hasMore!=='boolean')throw new SafeUiError('The catalogue could not be loaded. Refresh to try again.');
    const entries=data.records.map(value=>entryValue(value));if(!curator&&entries.some(entry=>entry.status!=='listed'))throw new SafeUiError('The catalogue could not be loaded. Refresh to try again.');
    setRecords(entries);setHasMore(data.hasMore);
   }else if(view.kind==='detail'&&view.id){
    const entry=entryValue(await get('/api/'+config.entity+'/'+encodeURIComponent(view.id)),true);if(!current())return;
    if(!curator&&entry.status!=='listed')throw new SafeUiError('This resource is not available.');setRecord(entry);
   }else if(view.kind==='detail')throw new SafeUiError('Choose a resource from the catalogue.');
  };
  void load().catch(reason=>{if(current())setError(reason instanceof SafeUiError?reason.message:'The service is unavailable. Refresh to try again.');}).finally(()=>{if(current())setLoading(false);});
 },[view.kind,view.id,search,category,offset,revision,role]);
 const refreshCurrent=async()=>{
  if(!view.id)return;const token=++readToken.current;setLoading(true);
  try{const latest=entryValue(await get('/api/'+config.entity+'/'+encodeURIComponent(view.id)),true);if(!alive.current||token!==readToken.current)return;setRecord(latest);setEditVersion(latest.version);setConflict(false);setError('');setMessage(editing?'Latest entry loaded. Your edits are kept. Review and save again.':'Latest entry loaded. Review it before trying again.');}
  catch(reason){if(alive.current&&token===readToken.current)setError(reason instanceof SafeUiError?reason.message:'The service is unavailable. Try refreshing again.');}
  finally{if(alive.current&&token===readToken.current)setLoading(false);}
 };
 const perform=async(item:Command)=>{
  if(sending.current)return;sending.current=true;command.current=item;setPending(true);setRetry(false);setError('');setMessage('');
  try{
   const response=await fetch(item.url,{method:item.method,headers:{...directoryHeaders(role),'x-factory-idempotency-key':item.key},body:item.body});
   if(!alive.current)return;
   if(!response.ok){if(response.status>=500){setRetry(true);setError('The service could not confirm the save. Retry the same save to check its result.');return;}command.current=null;if(response.status===409){setConflict(!!view.id);setError(view.id?'This entry changed. Refresh the current entry, review your edits, then save again.':'Creation conflicted with another request. Review the values and try again.');}else setError(response.status===400?'Check the entry values and try again.':response.status===404?'This resource is not available.':safeResponseMessage(response.status));return;}
   const saved=entryValue(await response.json(),true);if(!alive.current)return;
   command.current=null;setRecord(saved);setEditing(false);setConflict(false);setMessage('Entry saved.');window.history.pushState(null,'',href('detail',saved.id));setView({kind:'detail',id:saved.id});
  }catch{if(alive.current){setError('The save could not be confirmed. Retry the same save to check its result.');setRetry(true);}}
  finally{sending.current=false;if(alive.current)setPending(false);}
 };
 const send=(operation:'create'|'update'|'submit'|'cancel',body:unknown)=>{
  if(!curator||pending||retry||conflict)return;
  const url='/api/'+config.entity+(operation==='create'?'':'/'+encodeURIComponent(record!.id)+(operation==='update'?'':'/events/'+operation));
  void perform({url,method:operation==='update'?'PATCH':'POST',body:JSON.stringify(body),key:'directory-'+crypto.randomUUID()});
 };
 const save=(event:{preventDefault():void})=>{event.preventDefault();
  const cleaned=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value.trim()])) as Values;
  for(const [key,maximum] of [['title',120],['summary',280],['body',12000]] as const){const value=cleaned[key];const controls=key==='body'?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/:/[\u0000-\u001f\u007f]/;if(!value||value.length>maximum||controls.test(value)){setError('Enter '+fieldLabel(key).toLowerCase()+' between 1 and '+maximum+' characters without unsupported control characters.');return;}}
  if(!config.categories.includes(cleaned.category)){setError('Choose a declared category.');return;}
  send(editing?'update':'create',editing?{expectedVersion:editVersion,values:cleaned}:{values:cleaned});
 };
 const reset=()=>{setQuery('');setSearch('');setCategory('');setOffset(0);};
 const navLink=(kind:'list'|'detail'|'form',label:string,id?:string)=><a href={href(kind,id)} onClick={event=>{event.preventDefault();if(!pending&&!retry)navigate(kind,id);}}>{label}</a>;
 const feedback=<>{error?<div className='directory-feedback' role='alert'><p>{error}</p>{retry?<button type='button' onClick={()=>command.current&&void perform(command.current)} disabled={pending}>Retry save</button>:conflict?<button type='button' onClick={()=>void refreshCurrent()} disabled={loading}>Refresh current entry</button>:null}</div>:null}{message?<p className='directory-notice' role='status'><DirectoryIcon name='circle-check'/>{message}</p>:null}{pending?<p role='status'>Saving entry…</p>:null}</>;
 const form=<form className='directory-editor' onSubmit={save}><div className='directory-section-title'><h2>{editing?'Edit entry':'Create entry'}</h2><span>All fields are required</span></div><fieldset disabled={pending||retry||loading}><div className='directory-fields'>{config.fields.map(field=><div className={'directory-field directory-field-'+field.key} key={field.key}><label htmlFor={'entry-'+field.key}>{fieldLabel(field.key)}</label><FieldControl field={field} id={'entry-'+field.key} value={values[field.key as keyof Values]} onChange={value=>setValues(previous=>({...previous,[field.key]:String(value)}))}/>{field.key==='title'?<small>Up to 120 characters</small>:field.key==='summary'?<small>Up to 280 characters. Help readers decide what to open.</small>:field.key==='body'?<small>Plain text, up to 12,000 characters</small>:null}</div>)}</div></fieldset><div className='directory-form-actions'><button className='generated-primary' disabled={pending||retry||conflict||loading}>{editing?'Save changes':'Create hidden entry'}</button><button type='button' disabled={pending||retry} onClick={()=>{setError('');setConflict(false);if(editing)setEditing(false);else navigate('list');}}>Cancel</button></div></form>;
 return <><aside className='directory-sidebar'><div className='directory-brand'><DirectoryIcon name='book-open'/><strong>{definition.applicationName}</strong></div><nav aria-label='Directory navigation'>{navLink('list','Browse resources')}{curator?navLink('form','Create entry'):null}</nav><div className='directory-sidebar-note'><DirectoryIcon name='user-round'/><p>{curator?'Curator workspace':'Reader workspace'}</p></div></aside><div className='directory-canvas'><header className='directory-heading'><div><h1>{view.kind==='list'?definition.applicationName:view.kind==='form'?'Add a resource':'Knowledge resources'}</h1>{view.kind==='list'?<p>{curator?'Keep useful knowledge accurate and ready to share.':'Find a useful guide, reference or checklist.'}</p>:null}</div><button aria-label='Refresh' title='Refresh' type='button' disabled={loading||pending||retry||editing} onClick={()=>setRevision(value=>value+1)}><DirectoryIcon name='refresh-cw'/></button></header>
 {view.kind!=='list'?<div className='directory-back'><DirectoryIcon name='arrow-left'/>{navLink('list','Back to resources')}</div>:null}
 {view.kind==='list'?<><form className='directory-search' onSubmit={event=>{event.preventDefault();if(query.trim().length>120||/[\u0000-\u001f\u007f]/.test(query)){setError('Enter a search of up to 120 characters.');return;}setSearch(query.trim());setOffset(0);}}><label htmlFor='directory-search'>Search resources<input id='directory-search' type='search' maxLength={120} value={query} onChange={event=>setQuery(event.target.value)} placeholder='Search titles and summaries'/></label><button className='generated-primary' type='submit' aria-label='Search' title='Search'><DirectoryIcon name='search'/></button></form><div className='directory-categories' aria-label='Categories'>{['',...config.categories].map((value,index)=><button key={value} type='button' aria-pressed={category===value} className={'directory-category category-'+index} onClick={()=>{setCategory(value);setOffset(0);}}>{value||'All resources'}</button>)}</div><div className='directory-results-heading'><h2>{category||'All resources'}</h2>{curator?navLink('form','Create entry'):null}</div></>:null}
 {feedback}{loading?<p className='directory-loading' role='status'>Loading resources…</p>:null}
 {!loading&&view.kind==='list'&&!error?<>{records.length?<><ul className='directory-records'>{records.map(entry=><li className='directory-record' key={entry.id}><div className={'directory-resource-mark category-'+(config.categories.indexOf(entry.category)+1)}><DirectoryIcon name={(['book-open','file-text','list-checks'] as const)[config.categories.indexOf(entry.category)%3]}/></div><div><div className='directory-record-meta'><span>{entry.category}</span>{curator?<span className={'directory-status '+entry.status}>{entry.status==='listed'?'Listed':'Hidden'}</span>:null}</div><h3>{navLink('detail',entry.title,entry.id)}</h3><p>{entry.summary}</p></div></li>)}</ul><div className='directory-pagination'><button type='button' disabled={offset===0} onClick={()=>setOffset(value=>Math.max(0,value-20))}><DirectoryIcon name='arrow-left'/>Previous</button><span>Showing {offset+1}–{offset+records.length}</span><button type='button' disabled={!hasMore} onClick={()=>setOffset(value=>value+20)}>Next<DirectoryIcon name='arrow-right'/></button></div></>:<section className='directory-empty'><DirectoryIcon name='book-open'/><h2>{search||category?'No matching resources':'No resources yet'}</h2><p>{search||category?'Try another search or clear your filters.':curator?'Create a resource, then show it when it is ready.':'Listed resources will appear here when they are ready.'}</p>{search||category?<button onClick={reset}>Clear filters</button>:curator?navLink('form','Create entry'):null}</section>}</>:null}
 {view.kind==='form'?(curator?form:<div className='directory-empty'><h2>Curator access required</h2><p>Your selected role can browse and read listed resources.</p></div>):null}
 {view.kind==='detail'&&record&&!loading?<div className={'directory-detail'+(curator?' is-curator':'')}>{editing?form:<article className='directory-article'><div className='directory-record-meta'><span>{record.category}</span>{curator?<span className={'directory-status '+record.status}>{record.status==='listed'?'Listed':'Hidden'}</span>:null}</div><h2>{record.title}</h2><p className='directory-lead'>{record.summary}</p><div className='directory-body'>{record.body}</div></article>}{curator?<aside className='directory-curation'><h2>Entry controls</h2><p>{record.status==='listed'?'Readers can find and read this entry.':'Only curators can see this entry.'}</p>{!editing?<button type='button' disabled={pending||retry||conflict} onClick={()=>{setValues({title:record.title,summary:record.summary,body:record.body!,category:record.category});setEditVersion(record.version);setEditing(true);setError('');setMessage('');}}>Edit entry</button>:null}<button className='generated-primary' type='button' disabled={pending||retry||conflict||editing} onClick={()=>send(record.status==='hidden'?'submit':'cancel',{expectedVersion:record.version})}>{record.status==='hidden'?'Show entry':'Hide entry'}</button></aside>:null}</div>:null}
 {view.kind==='missing'?<section className='directory-empty'><h2>Page not found</h2><p>Choose a resource from the catalogue.</p>{navLink('list','Browse resources')}</section>:null}
 </div></>;
}
export function GeneratedApplication({requestedPath}:{requestedPath:string}){
 const [role,setRole]=useState<string>(config.roles.reader);
 useEffect(()=>{try{const stored=sessionStorage.getItem(config.storageKey);if(stored===config.roles.reader||stored===config.roles.curator)setRole(stored);}catch{}},[]);
 return <main className='generated-app directory-v1' data-theme={definition.themeMode}><div className='directory-role'><label htmlFor='directory-role'><DirectoryIcon name='user-round'/>Demo role</label><select id='directory-role' value={role} onChange={event=>{const next=event.target.value;setRole(next);try{sessionStorage.setItem(config.storageKey,next);}catch{}}}><option value={config.roles.reader}>Reader</option><option value={config.roles.curator}>Curator</option></select></div><DirectoryWorkspace key={role} role={role} requestedPath={requestedPath}/></main>;
}
`.replace(
    /DEFINITION_JSON|CONFIG_JSON|ICONS_JSON|HEADER_CHANNEL|DATA_HELPERS/g,
    (key) => substitutions[key]!,
  );
}

export function renderContentDirectoryStyles(): string {
  return `
.directory-v1.generated-app { display:grid;grid-template-columns:15rem minmax(0,1fr);padding:0;min-height:100vh;line-height:1.55;--directory-tint:color-mix(in srgb,var(--factory-accent) 9%,var(--factory-bg)); }
.directory-v1 :is(button,a,input,select,textarea){font:inherit;min-height:44px;}
.directory-v1 button {display:inline-flex;align-items:center;justify-content:center;gap:.55rem;min-width:44px;}
.directory-v1 :is(button,a,input,select,textarea):focus-visible {outline:3px solid var(--factory-accent);outline-offset:3px;}
.directory-v1 ::selection {background:var(--factory-accent);color:var(--factory-accent-text);}
.directory-v1 :is(input,textarea){caret-color:var(--factory-accent);}
.directory-v1 .directory-icon {display:inline-flex;flex:0 0 auto;width:1.25rem;height:1.25rem;}
.directory-v1 .directory-icon svg {width:100%;height:100%;}
.directory-v1 .directory-sidebar {grid-column:1;grid-row:1;padding:2rem 1.4rem;background:var(--factory-accent);color:var(--factory-accent-text);display:flex;flex-direction:column;gap:2rem;min-width:0;}
.directory-v1 .directory-brand {display:flex;gap:.75rem;align-items:flex-start;line-height:1.35;overflow-wrap:anywhere;font-size:1.15rem;}
.directory-v1 .directory-brand .directory-icon {width:1.6rem;height:1.6rem;margin-top:.15rem;}
.directory-v1 .directory-sidebar nav {display:grid;gap:.75rem;margin:0;}
.directory-v1 .directory-sidebar nav a {background:transparent;border:1px solid color-mix(in srgb,currentColor 35%,transparent);color:inherit;display:flex;align-items:center;}
.directory-v1 .directory-sidebar nav a:hover {background:color-mix(in srgb,var(--factory-accent-text) 12%,transparent);}
.directory-v1 .directory-sidebar-note {display:flex;align-items:center;gap:.6rem;margin-top:auto;padding-top:2rem;}
.directory-v1 .directory-sidebar-note p {color:inherit;font-size:.85rem;}
.directory-v1 .directory-role {position:absolute;top:1.5rem;right:2rem;display:flex;align-items:center;gap:.65rem;z-index:1;font-size:.9rem;}
.directory-v1 .directory-role label {display:flex;align-items:center;gap:.4rem;}
.directory-v1 .directory-role select {border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);padding:.4rem .65rem;color:var(--factory-text);background:var(--factory-surface);}
.directory-v1 .directory-canvas {grid-column:2;min-width:0;max-width:76rem;width:100%;padding:6.5rem clamp(1.25rem,4vw,4.5rem) 4rem;}
.directory-v1 .directory-heading {display:flex;justify-content:space-between;gap:1.5rem;align-items:flex-start;margin-bottom:2rem;}
.directory-v1 .directory-heading h1 {font-size:clamp(1.6rem,2.4vw,2.6rem);line-height:1.15;letter-spacing:-.025em;font-weight:var(--factory-typography-font-weight-bold);text-wrap:balance;}
.directory-v1 .directory-heading p {margin-top:.7rem;max-width:65ch;}
.directory-v1 .directory-search {display:flex;align-items:end;gap:.75rem;max-width:48rem;}
.directory-v1 .directory-search label {flex:1;min-width:0;font-weight:var(--factory-typography-font-weight-medium);font-size:.9rem;display:grid;gap:.4rem;}
.directory-v1 .directory-search input {width:100%;background:var(--factory-surface);border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);color:var(--factory-text);padding:.75rem;}
.directory-v1 .directory-search button {height:50px;padding-inline:1.5rem;}
.directory-v1 .directory-categories {display:flex;flex-wrap:wrap;gap:.5rem;margin-block:1rem 2.1rem;}
.directory-v1 .directory-category {border-radius:999px;padding:.45rem 1rem;font-size:.9rem;}
.directory-v1 .directory-category[aria-pressed=true] {background:var(--factory-accent);color:var(--factory-accent-text);border-color:var(--factory-accent);}
.directory-v1 .directory-results-heading {display:flex;justify-content:space-between;align-items:center;gap:1rem;padding-bottom:.85rem;border-bottom:1px solid var(--factory-border);}
.directory-v1 .directory-results-heading h2 {font-size:1.2rem;}
.directory-v1 .directory-results-heading a {display:inline-flex;align-items:center;justify-content:center;padding:.5rem 1rem;background:var(--factory-accent);color:var(--factory-accent-text);border-radius:var(--factory-radius-radius-base);font-weight:var(--factory-typography-font-weight-medium);}
.directory-v1 .directory-records {padding:0;margin:0;list-style:none;}
.directory-v1 .directory-record {display:grid;grid-template-columns:3rem minmax(0,1fr);gap:1.25rem;padding:1.7rem 0;border-bottom:1px solid var(--factory-border);}
.directory-v1 .directory-resource-mark {width:3rem;height:3.5rem;display:grid;place-items:center;border-radius:12px;background:var(--directory-tint);color:var(--factory-accent);}
.directory-v1 .directory-resource-mark.category-2 {background:color-mix(in srgb,var(--factory-colour-success) 12%,var(--factory-surface));color:var(--factory-text);}
.directory-v1 .directory-resource-mark.category-3 {background:color-mix(in srgb,var(--factory-colour-warning) 15%,var(--factory-surface));color:var(--factory-text);}
.directory-v1 .directory-record-meta {display:flex;flex-wrap:wrap;align-items:center;gap:.7rem;font-size:.8rem;color:var(--factory-accent);font-weight:var(--factory-typography-font-weight-medium);}
.directory-v1 .directory-status {border-radius:5px;background:var(--directory-tint);padding:.15rem .45rem;color:var(--factory-text);}
.directory-v1 .directory-status.hidden {background:var(--factory-surface-muted);color:var(--factory-muted);}
.directory-v1 .directory-record h3 {font-size:1.2rem;line-height:1.35;margin:.4rem 0;}
.directory-v1 .directory-record h3 a {padding:0;border:0;background:transparent;border-radius:0;min-height:44px;display:flex;align-items:center;overflow-wrap:anywhere;}
.directory-v1 .directory-record h3 a:hover {text-decoration:underline;text-underline-offset:.2em;}
.directory-v1 .directory-record p {max-width:70ch;overflow-wrap:anywhere;font-size:.95rem;}
.directory-v1 .directory-pagination {display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:1.5rem;font-size:.85rem;font-variant-numeric:tabular-nums;}
.directory-v1 .directory-back {display:flex;gap:.4rem;align-items:center;margin-bottom:1.5rem;}
.directory-v1 .directory-back a {border:0;background:transparent;display:flex;align-items:center;color:var(--factory-accent);padding-inline:.25rem;}
.directory-v1 .directory-detail {display:grid;gap:2.5rem;align-items:start;}
.directory-v1 .directory-detail.is-curator {grid-template-columns:minmax(0,1fr) 13rem;}
.directory-v1 .directory-article {min-width:0;max-width:72ch;}
.directory-v1 .directory-article h2 {font-size:clamp(1.7rem,2.6vw,2.5rem);line-height:1.2;letter-spacing:-.025em;overflow-wrap:anywhere;margin:.65rem 0 1.1rem;}
.directory-v1 p.directory-lead {font-size:1.1rem;color:var(--factory-text);padding-bottom:1.5rem;border-bottom:1px solid var(--factory-border);margin-bottom:1.5rem;overflow-wrap:anywhere;}
.directory-v1 .directory-body {white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8;max-width:72ch;}
.directory-v1 .directory-curation {display:grid;gap:.8rem;padding:1.2rem;background:var(--directory-tint);border-radius:12px;}
.directory-v1 .directory-curation h2 {font-size:1rem;}
.directory-v1 .directory-curation p {font-size:.9rem;}
.directory-v1 .directory-editor {min-width:0;}
.directory-v1 .directory-section-title {display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;}
.directory-v1 .directory-section-title h2 {font-size:1.4rem;}
.directory-v1 .directory-section-title span {font-size:.8rem;color:var(--factory-muted);}
.directory-v1 fieldset {border:0;padding:0;margin:0;min-width:0;}
.directory-v1 .directory-fields {display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.3rem;}
.directory-v1 .directory-field {display:grid;gap:.45rem;font-size:.95rem;min-width:0;}
.directory-v1 .directory-field-body,.directory-v1 .directory-field-summary {grid-column:1/-1;}
.directory-v1 .directory-field input,.directory-v1 .directory-field textarea,.directory-v1 .directory-field select {width:100%;border:1px solid var(--factory-border);border-radius:var(--factory-radius-radius-base);padding:.7rem;color:var(--factory-text);background:var(--factory-surface);}
.directory-v1 .directory-field textarea {min-height:15rem;resize:vertical;line-height:1.6;}
.directory-v1 .directory-field small {color:var(--factory-muted);font-size:.8rem;}
.directory-v1 .directory-form-actions {display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.5rem;}
.directory-v1 .directory-feedback {display:grid;gap:.75rem;justify-items:start;border:1px solid var(--factory-danger);border-radius:12px;padding:1rem;margin-block:1rem;background:var(--factory-surface);}
.directory-v1 .directory-feedback p {color:var(--factory-text);}
.directory-v1 .directory-notice {display:flex;align-items:center;gap:.5rem;padding-block:1rem;color:var(--factory-text);}
.directory-v1 .directory-loading {padding-block:2rem;}
.directory-v1 .directory-empty {display:grid;justify-items:start;gap:.75rem;padding:2rem 0;}
.directory-v1 .directory-empty h2 {font-size:1.35rem;}
.directory-v1 .directory-empty>.directory-icon {width:2rem;height:2rem;color:var(--factory-accent);}
@media(max-width:1050px){.directory-v1.generated-app{grid-template-columns:11rem minmax(0,1fr);}.directory-v1 .directory-sidebar{padding:1.5rem 1rem;}.directory-v1 .directory-detail.is-curator{grid-template-columns:minmax(0,1fr);}.directory-v1 .directory-curation{grid-template-columns:1fr 1fr;}.directory-v1 .directory-curation h2,.directory-v1 .directory-curation p{grid-column:1/-1;}}
@media(max-width:780px){.directory-v1.generated-app{display:block;}.directory-v1 .directory-sidebar{display:none;}.directory-v1 .directory-role{position:static;padding:.5rem 1.25rem;justify-content:flex-end;border-bottom:1px solid var(--factory-border);background:var(--directory-tint);}.directory-v1 .directory-canvas{padding:1rem 1.25rem 3rem;}.directory-v1 .directory-heading{margin-bottom:.5rem;gap:.75rem;}.directory-v1 .directory-heading p{margin-top:.45rem;}.directory-v1 .directory-heading h1{font-size:1.65rem;}.directory-v1 .directory-categories{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--factory-border) transparent;gap:.5rem;margin-block:.75rem 1rem;padding-block:3px;}.directory-v1 .directory-category{flex:0 0 auto;white-space:nowrap;}.directory-v1 .directory-results-heading{padding-bottom:.5rem;}.directory-v1 .directory-record{gap:.85rem;padding:1rem 0;grid-template-columns:2.6rem minmax(0,1fr);}.directory-v1 .directory-resource-mark{width:2.6rem;height:3rem;}.directory-v1 .directory-fields{grid-template-columns:minmax(0,1fr);}.directory-v1 .directory-field{grid-column:1;}.directory-v1 .directory-search button{padding-inline:1rem;}.directory-v1 .directory-pagination{flex-wrap:wrap;}.directory-v1 .directory-detail{gap:1.5rem;}}
@media(prefers-reduced-motion:reduce){.directory-v1 *, .directory-v1 *::before,.directory-v1 *::after{transition:none!important;animation:none!important;scroll-behavior:auto!important;}}
`;
}
