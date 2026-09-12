import type { ApplicationGraphV1 } from "@factory/graph";
import { createGeneratedPageRuntimeProjection } from "./page-runtime-projection.js";
import { getCustomerIconAssets } from "./targets/restaurant-v3/customer-icons.js";
import {
  approvalWorkspacePresentation,
  renderWorkspaceShell,
  renderWorkspaceStyles,
  renderWorkspaceDataHelpers,
  renderWorkspaceRecordHook,
} from "./approval-workspace-presentation.js";

/** Distinct Task semantics composed from the private workspace and native ports. */
export const taskWorkspacePresentation = {
  key: "task-workspace-presentation",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
  reuse: approvalWorkspacePresentation.reuse,
  icons: approvalWorkspacePresentation.icons,
} as const;
export function renderTaskWorkspaceStyles(): readonly string[] {
  return [
    ...renderWorkspaceStyles("task"),
    `
.task-v1 .task-record-finder > div { grid-template-columns: minmax(8rem,12rem) 44px 44px; }
.task-v1 .task-summary { grid-template-columns: minmax(5rem,.6fr) minmax(7rem,1fr) minmax(7rem,1fr) minmax(7rem,1fr); }
.task-v1 .task-summary-priority dd { font-weight: var(--factory-typography-font-weight-bold); }
.task-v1 .task-summary-status { text-align: end; }
.task-v1 .task-records-section > .task-actions { margin-block-end: var(--factory-spacing-space-3); }
.task-v1 .task-command-message { grid-column: 1 / -1; white-space: normal; overflow-wrap: anywhere; }
.task-v1 .task-form-card fieldset:disabled { opacity:.7; }
.task-v1 .task-form-footer { gap:var(--factory-spacing-space-3); align-items:center; flex-wrap:wrap; }
.task-v1 .task-list-mutation:empty { display:none; }
@media(min-width:721px) and (max-width:900px){
.task-v1 .task-summary { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
.task-v1 .task-summary-priority { grid-column:1; grid-row:1; text-align:start; }
.task-v1 .task-summary > div:nth-child(2) { grid-column:1; grid-row:2; text-align:start; }
.task-v1 .task-summary > div:nth-child(3) { grid-column:2; grid-row:2; text-align:end; }
.task-v1 .task-summary-status { grid-column:2; grid-row:1; text-align:end; }
.task-v1 .task-workspace-heading { text-align:start; justify-content:flex-start; }
}
@media(max-width:720px){
.task-v1 .task-record-finder > div { grid-template-columns:minmax(0,1fr) 44px 44px; }
.task-v1 .task-summary { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
.task-v1 .task-summary-priority { grid-column:1;grid-row:1; }
.task-v1 .task-summary > div:nth-child(2) { grid-column:1;grid-row:2; }
.task-v1 .task-summary > div:nth-child(3) { grid-column:2;grid-row:2;text-align:end; }
.task-v1 .task-summary-status { grid-column:2;grid-row:1; }
.task-v1 .task-record { padding:var(--factory-spacing-space-3); }
.task-v1 .task-workspace-canvas { gap:var(--factory-spacing-space-3) var(--factory-spacing-space-2); }
}
`,
  ];
}

export function renderTaskWorkspace(
  graph: ApplicationGraphV1,
  entityKey: string,
  fixture: boolean,
): string {
  const projection = createGeneratedPageRuntimeProjection(graph);
  const entity = graph.domain.entities.find((e) => e.key === entityKey)!;
  const definition = {
    applicationName: graph.metadata.name,
    themeMode: projection.themeMode,
    entities: [entity],
    policy: graph.policy,
    flow: graph.flow,
  };
  const safe = (value: unknown) =>
    JSON.stringify(value).replaceAll("<", "\\u003c");
  const icons = Object.fromEntries(
    taskWorkspacePresentation.icons.map((key) => [
      key,
      getCustomerIconAssets().icons[key],
    ]),
  );
  return `"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type JsonRecord=Record<string,unknown>;
type RuntimeField={readonly key:string;readonly type:string;readonly required:boolean;readonly values?:readonly string[]};
type RuntimeEntity={readonly key:string;readonly label:string;readonly fields:readonly RuntimeField[]};
const projection=${safe(projection)};
const definition=${safe(definition)};
const entity:RuntimeEntity=definition.entities[0];
type PageRuntimeBlock=(typeof projection.pages)[number]['blocks'][number];
type TaskIconKey='house'|'receipt-text'|'user-round'|'refresh-cw'|'clock'|'circle-check'|'circle-x';
const taskIcons=${safe(icons)};
function TaskIcon({name}:{readonly name:TaskIconKey}){return <span className='task-icon' aria-hidden={true} dangerouslySetInnerHTML={{__html:taskIcons[name]}}/>;}
function can(role:string,entityKey:string,action:string){return definition.policy.permissions.some(p=>p.role===role&&p.resource===entityKey&&p.actions.includes(action));}
function requestHeaders(role:string):Record<string,string>{return {'content-type':'application/json',${fixture ? "'x-factory-fixture-session':'fixture-session-'+role" : "'x-factory-role':role"}};}
${renderWorkspaceDataHelpers()}
function errorMessage(reason:unknown){return reason instanceof SafeUiError?reason.message:'The service is unavailable. Please try again.';}
${renderWorkspaceRecordHook()}
type TaskCommand={key:string;body:string;operation:string;recordId?:string};
type CommandMessage={text:string;tone:'success'|'error'|'pending';unknown?:boolean};
function useTaskCommand(role:string,onSuccess:(record:JsonRecord)=>Promise<void>,onConflict:()=>Promise<unknown>,retainsConflict=false){
 const [message,setMessage]=useState<CommandMessage|null>(null);
 const retained=useRef<TaskCommand|null>(null),pending=useRef(false),generation=useRef(0);
 useEffect(()=>{generation.current++;return()=>{generation.current++;retained.current=null;pending.current=false;};},[]);
 const perform=async(command:TaskCommand)=>{
  if(pending.current)return;
  pending.current=true;retained.current=command;const token=generation.current;
  setMessage({tone:'pending',text:'Saving task…'});
  try{
   const url='/api/'+entity.key+(command.recordId?'/'+encodeURIComponent(command.recordId)+'/events/'+command.operation:'');
   const response=await fetch(url,{method:'POST',headers:{...requestHeaders(role),'x-factory-idempotency-key':command.key},body:command.body});
   if(token!==generation.current)return;
   if(!response.ok){
    retained.current=null;
    if(response.status===409){await onConflict().catch(()=>undefined);if(token!==generation.current)return;setMessage(retainsConflict?null:{tone:'error',text:'This task changed. Review the latest version before trying again.'});}
    else setMessage({tone:'error',text:response.status===400?'Check the task values and try again.':response.status===404?'This task is no longer available.':safeResponseMessage(response.status)});
    return;
   }
   const record=await response.json() as JsonRecord;if(token!==generation.current)return;
   retained.current=null;
   await onSuccess(record);if(token!==generation.current)return;
   setMessage({tone:'success',text:command.operation==='create'?'Created Task.':'Task: '+fieldLabel(String(record.status))+'.'});
  }catch{
   if(token!==generation.current)return;
   setMessage({tone:'error',unknown:true,text:'The outcome is unknown. Retry this action to recover its result.'});
  }finally{if(token===generation.current)pending.current=false;}
 };
 const activate=(operation:string,body:JsonRecord,recordId?:string)=>{
  if(pending.current||retained.current)return;
  void perform({key:crypto.randomUUID(),operation,body:JSON.stringify(body),recordId});
 };
 const clear=()=>{if(!pending.current){retained.current=null;setMessage(null);}};
 return {message,pending:message?.tone==='pending',activate,clear,retry:()=>{if(retained.current)void perform(retained.current);}};
}
function CommandFeedback({command}:{readonly command:ReturnType<typeof useTaskCommand>}){
 return command.message?<div className='task-command-message'><p className={command.message.tone==='error'?'generated-error':undefined} role={command.message.tone==='error'?'alert':'status'}>{command.message.text}</p>{command.message.unknown?<button type='button' onClick={command.retry}>Retry</button>:null}</div>:null;
}
function TaskForm({role}:{readonly role:string}){
 const fields=entity.fields.filter(field=>field.key!=='status');
 const [values,setValues]=useState<Record<string,string|boolean>>({});
 const [validation,setValidation]=useState<string|null>(null);
 const command=useTaskCommand(role,async()=>{setValues({});},async()=>undefined);
 if(!can(role,entity.key,'create'))return <section className='generated-card task-form-card'><h2>New task</h2><p>Your selected role cannot create tasks.</p></section>;
 return <section className='generated-card task-form-card'><h2>Create Task</h2><form onSubmit={event=>{event.preventDefault();setValidation(null);try{command.activate('create',{values:formPayload(fields,values)});}catch(reason){setValidation(errorMessage(reason));}}}>
 <fieldset disabled={command.pending}>{fields.map(field=><div className='task-field' key={field.key}><label htmlFor={'task-'+field.key}>{fieldLabel(field.key)}{field.required?' *':''}</label><FieldControl field={field} id={'task-'+field.key} value={values[field.key]??''} onChange={value=>{command.clear();setValidation(null);setValues(current=>({...current,[field.key]:value}));}}/></div>)}</fieldset>
 {validation?<p className='generated-error' role='alert'>{validation}</p>:null}
 <CommandFeedback command={command}/><div className='task-form-footer'><button className='generated-primary' type='submit' disabled={command.pending||command.message?.unknown===true}><TaskIcon name='receipt-text'/>Create Task</button></div></form></section>;
}
function TaskRecord({record,role,refresh,onResult}:{readonly record:JsonRecord;readonly role:string;readonly refresh:()=>Promise<readonly JsonRecord[]>;readonly onResult:(message:string)=>void}){
 const command=useTaskCommand(role,async updated=>{await refresh().catch(()=>undefined);onResult('Task: '+fieldLabel(String(updated.status))+'.');},async()=>{onResult('This task changed. Review the latest version before trying again.');return refresh();},true);
 const state=String(record.status),event=state==='not-started'?'start':state==='in-progress'?'complete':'reopen';
 const icon:TaskIconKey=event==='start'?'clock':event==='complete'?'circle-check':'refresh-cw';
 const tone=state==='completed'?'positive':state==='in-progress'?'pending':'neutral';
 return <li className={'task-record task-tone-'+tone} aria-busy={command.pending}>
 <h3 className='task-record-title'><span>Title</span>{formatValue({type:'string'},record.title)}</h3>
 <dl className='task-summary'>{['priority','dueDate','assignee'].map(key=><div className={key==='priority'?'task-summary-priority':'task-summary-support'} key={key}><dt>{fieldLabel(key)}</dt><dd>{formatValue(entity.fields.find(field=>field.key===key)!,record[key])}</dd></div>)}<div className='task-summary-status'><dt>Status</dt><dd><span className='task-badge'><TaskIcon name={state==='completed'?'circle-check':'clock'}/>{fieldLabel(state)}</span></dd></div></dl>
 <div className='task-actions'>{can(role,entity.key,event)?<button type='button' disabled={command.pending||command.message?.unknown===true} onClick={()=>command.activate(event,{expectedVersion:record.version},String(record.id))}><TaskIcon name={icon}/>{fieldLabel(event)}</button>:null}</div>
 <details><summary>Details</summary><dl className='task-details-values'><div><dt>Description</dt><dd>{formatValue({type:'text'},record.description)}</dd></div><div><dt>ID</dt><dd>{String(record.id)}</dd></div></dl></details>
 <CommandFeedback command={command}/></li>;
}
function TaskRecords({role,block}:{readonly role:string;readonly block:PageRuntimeBlock}){
 const allowed=can(role,entity.key,'read');
 const {records,error,loading,refresh}=useEntityRecords(entity,role,allowed);
 const [query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState(''),[result,setResult]=useState('');
 const form=projection.pages.find(page=>page.blocks.some(b=>b.type==='form'));
 const visible=filterRecords(entity.fields,records,query,statusFilter);
 if(!allowed)return <section className='generated-card'><p>Your selected role cannot read tasks.</p></section>;
 return <section className='generated-card task-records-section'>
 <div className='task-actions'>{form&&can(role,entity.key,'create')?<a className='generated-primary' href={form.route}><TaskIcon name='receipt-text'/>Create Task</a>:null}</div>
 <div className='task-record-finder'><label htmlFor={block.id+'-search'}><span className='task-finder-label'>Search records</span><input id={block.id+'-search'} placeholder='Search records' value={query} onChange={event=>setQuery(event.target.value)}/></label><div><label htmlFor={block.id+'-status'}><span className='task-finder-label'>Status filter</span><select id={block.id+'-status'} value={statusFilter} onChange={event=>setStatusFilter(event.target.value)}><option value=''>All statuses</option>{statusOptions(entity.key).map(status=><option key={status} value={status}>{fieldLabel(status)}</option>)}</select></label><button type='button' aria-label='Clear filters' title='Clear filters' onClick={()=>{setQuery('');setStatusFilter('');}}><TaskIcon name='circle-x'/></button><button className='task-refresh' type='button' aria-label='Refresh' title='Refresh' disabled={loading} onClick={()=>void refresh().catch(()=>undefined)}><TaskIcon name='refresh-cw'/></button></div></div>
 {error?<p className='generated-error' role='alert'>{error}</p>:null}{loading?<p role='status'>Loading records…</p>:null}
 {!loading&&!error?<p className='task-result-count' role='status'>{visible.length} of {records.length} records</p>:null}
 {result?<p className='task-list-mutation' role={result.startsWith('This task changed.')?'alert':'status'}>{result}</p>:null}
 {!loading&&!error&&records.length===0?<div className='task-empty' role='status'><TaskIcon name='receipt-text'/><p>No task records yet.</p></div>:null}
 {!loading&&!error&&records.length>0&&visible.length===0?<div className='task-empty' role='status'><p>No matching records.</p></div>:null}
 <ul className='generated-records task-records'>{visible.map(record=><TaskRecord key={String(record.id)+':'+String(record.version)} record={record} role={role} refresh={refresh} onResult={setResult}/>)}</ul></section>;
}
type BlockContext={role:string};
function BlockRenderer({block,context}:{readonly block:PageRuntimeBlock;readonly context:BlockContext}){return block.type==='form'?<TaskForm role={context.role}/>:<TaskRecords role={context.role} block={block}/>;}
export function GeneratedApplication({requestedPath}:{readonly requestedPath:string}){
 const [role,setRole]=useState<string>(definition.policy.roles[0]);
 const requestedRoute=requestedPath==='/'?projection.routeFallback.rootRoute??'/':requestedPath;
 const activePage=projection.pages.find(page=>page.route===requestedRoute);
 const error=null;
 const context={role};
 if(!activePage)return <main className='generated-app task-v1' data-theme={definition.themeMode}><h1>Declared route unavailable</h1></main>;
 const formRouteByEntity={};
 ${renderWorkspaceShell("task").replace("<BlockRenderer key={block.id}", "<BlockRenderer key={role+':'+activePage.id+':'+block.id}")}
}
`;
}
