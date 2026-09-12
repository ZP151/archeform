import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import { isDeepStrictEqual } from "node:util";
import type { ApplicationGraphV1 } from "@factory/graph";
import { hashApplicationGraph } from "@factory/graph";

/** Factory-authored, UNLICENSED compiler-private correction contract (ADR-0060). */
export const approvalMutationContract = {
  key: "approval-mutation",
  version: "1.0.0",
  correction: "factory.generated.approval-correction/v1",
  mutation: "factory.generated.approval-mutation/v1",
  decision: "factory.generated.approval-decision-event/v1",
} as const;
const equalSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((x) => actual.includes(x));
const locks = {
  "core.crud": [
    "1.0.1",
    "8dede9ba8d63bea9b09c7bf7ac6ce784c52595b644d03eca52ea6996a31882d1",
  ],
  "core.workflow": [
    "1.0.1",
    "16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
  ],
  "core.identity-policy": [
    "1.0.0",
    "a216444b219f00431820a0df8e2bc3b604296430beb8fa6549f1b40c92025d82",
  ],
  "core.policy-declarations": [
    "1.0.0",
    "56e6ead5aaa6e9f5fe9cf7c608b6b51b16064964cf95cd123bdc3e0725642c54",
  ],
  "core.audit": [
    "1.0.2",
    "fe6616252c7b44efe61d516d305e689f3f593d70d5287baac31b5f31013addc8",
  ],
  "core.notification": [
    "1.1.1",
    "207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
  ],
} as const;
export function selectApprovalCorrection(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): string | undefined {
  const candidate = graph.flow.flows.some(
    (f) =>
      (f.states.includes("returned") ||
        f.transitions.some(
          (t) => t.event === "update" && t.from === "returned",
        )) &&
      f.transitions.some((t) => t.event === "approve" || t.event === "reject"),
  );
  if (!candidate) return undefined;
  const deny = (): never => {
    throw new Error("Approval correction shape is not supported.");
  };
  if (
    compositionLock &&
    (compositionLock.applicationGraphChecksum !== hashApplicationGraph(graph) ||
      (graph.integration.compositionSelections !== undefined &&
        !isDeepStrictEqual(
          JSON.parse(
            JSON.stringify(
              [...compositionLock.packages].sort((a, b) =>
                a.lock.key.localeCompare(b.lock.key),
              ),
            ),
          ),
          JSON.parse(
            JSON.stringify(
              [...graph.integration.compositionSelections].sort((a, b) =>
                a.lock.key.localeCompare(b.lock.key),
              ),
            ),
          ),
        )))
  )
    return deny();
  if (graph.flow.flows.length !== 1) return deny();
  const flow = graph.flow.flows[0]!;
  if (
    flow.initialState !== "draft" ||
    !equalSet(flow.states, ["draft", "submitted", "approved", "returned"]) ||
    !equalSet(flow.events, ["submit", "approve", "reject", "update"]) ||
    flow.transitions.length !== 4
  )
    return deny();
  const submit = flow.transitions.find((t) => t.event === "submit");
  const approve = flow.transitions.find((t) => t.event === "approve");
  const requester = submit?.roles?.[0],
    reviewer = approve?.roles?.[0];
  const grants = graph.policy.permissions.filter(
    (p) => p.resource === flow.entity,
  );
  const auditor = grants.find((p) => p.actions.includes("audit"))?.role;
  if (
    !requester ||
    !reviewer ||
    !auditor ||
    new Set([requester, reviewer, auditor]).size !== 3 ||
    !equalSet(graph.policy.roles, [requester, reviewer, auditor]) ||
    grants.length !== 3
  )
    return deny();
  for (const [role, actions] of [
    [requester, ["create", "read", "update", "submit"]],
    [reviewer, ["read", "approve", "reject"]],
    [auditor, ["read", "audit"]],
  ] as const)
    if (!grants.some((p) => p.role === role && equalSet(p.actions, actions)))
      return deny();
  for (const [event, from, to, role] of [
    ["submit", "draft", "submitted", requester],
    ["approve", "submitted", "approved", reviewer],
    ["reject", "submitted", "returned", reviewer],
    ["update", "returned", "draft", requester],
  ]) {
    const transition = flow.transitions.find((t) => t.event === event);
    const expected =
      event === "approve" || event === "reject"
        ? ["audit.record:record", "notification.send:send"]
        : ["audit.record:record"];
    if (
      !transition ||
      transition.from !== from ||
      transition.to !== to ||
      !equalSet(transition.roles ?? [], [role!]) ||
      !equalSet(
        (transition.effects ?? []).map((e) => e.capability + ":" + e.operation),
        expected,
      )
    )
      return deny();
  }
  const blocks = graph.page.pages.flatMap((p) =>
    p.blocks.map((b) => ({ page: p, block: b })),
  );
  for (const type of ["form", "list", "queue", "detail"])
    if (
      blocks.filter(
        ({ block }) => block.entity === flow.entity && block.type === type,
      ).length !== 1
    )
      return deny();
  const selections =
    compositionLock?.packages ?? graph.integration.compositionSelections ?? [];
  if (
    selections.length !== 6 ||
    !equalSet(
      selections.map((s) => s.lock.key),
      Object.keys(locks),
    )
  )
    return deny();
  const byKey = new Map(selections.map((s) => [s.lock.key, s]));
  for (const [key, [version, digest]] of Object.entries(locks)) {
    const lock = byKey.get(key)!.lock;
    if (
      lock.version !== version ||
      lock.manifestDigest !== "sha256:" + digest ||
      lock.packageRoot !== `packages/capabilities/assets/${key}/${version}` ||
      lock.lifecycle !== "golden"
    )
      return deny();
  }
  const bindings = (key: string, expected: Record<string, string>) => {
    const b = byKey.get(key)!.bindings;
    return (
      equalSet(Object.keys(b), Object.keys(expected)) &&
      Object.entries(expected).every(
        ([k, v]) => JSON.stringify(b[k]) === JSON.stringify({ graphSymbol: v }),
      )
    );
  };
  const listPage = blocks.find(
    ({ block }) => block.entity === flow.entity && block.type === "list",
  )!.page;
  if (
    !bindings("core.crud", {
      entityKey: "graph.domain." + flow.entity,
      routeKey: "graph.page." + listPage.id,
    }) ||
    !bindings("core.workflow", { flowKey: "graph.flow." + flow.id }) ||
    !bindings("core.audit", { actorRole: "graph.policy." + reviewer }) ||
    !bindings("core.notification", {
      recipientRole: "graph.policy." + requester,
    }) ||
    !bindings("core.policy-declarations", {})
  )
    return deny();
  const identity = byKey.get("core.identity-policy")!.bindings as Record<
    string,
    { graphSymbol?: string }
  >;
  if (
    !equalSet(Object.keys(identity), [
      "principalEntity",
      "sessionEntity",
      "defaultRole",
      "authenticatedRole",
    ]) ||
    identity.defaultRole?.graphSymbol !== "graph.policy." + requester ||
    identity.authenticatedRole?.graphSymbol !== "graph.policy." + reviewer ||
    !graph.domain.entities.some(
      (e) => "graph.domain." + e.key === identity.principalEntity?.graphSymbol,
    ) ||
    !graph.domain.entities.some(
      (e) => "graph.domain." + e.key === identity.sessionEntity?.graphSymbol,
    )
  )
    return deny();
  const principal = identity.principalEntity!.graphSymbol!.slice(
      "graph.domain.".length,
    ),
    session = identity.sessionEntity!.graphSymbol!.slice(
      "graph.domain.".length,
    );
  const secondary = graph.domain.entities.filter(
    (e) => ![flow.entity, principal, session].includes(e.key),
  );
  if (
    secondary.length !== 1 ||
    new Set([flow.entity, principal, session]).size !== 3 ||
    graph.domain.entities.length !== 4
  )
    return deny();
  const permissionPairs = graph.policy.permissions.flatMap((p) =>
    p.actions.map((a) => p.role + ":" + p.resource + ":" + a),
  );
  const expectedPairs = [
    ...grants.flatMap((p) =>
      p.actions.map((a) => p.role + ":" + flow.entity + ":" + a),
    ),
    requester + ":" + secondary[0]!.key + ":read",
    requester + ":" + secondary[0]!.key + ":update",
    ...[requester, reviewer, auditor].flatMap((role) => [
      role + ":" + principal + ":read",
      role + ":" + session + ":read",
    ]),
    requester + ":" + session + ":create",
    requester + ":" + session + ":update",
  ];
  if (!equalSet(permissionPairs, expectedPairs)) return deny();
  if (
    graph.page.pages.length !== 7 ||
    blocks.length !== 7 ||
    blocks.filter(({ block }) => block.entity === flow.entity).length !== 5 ||
    blocks.filter(
      ({ block }) => block.type === "stats" && block.entity === flow.entity,
    ).length !== 1 ||
    blocks.filter(({ block }) => block.type === "settings" && !block.entity)
      .length !== 1 ||
    blocks.filter(
      ({ block }) =>
        block.type === "list" && block.entity === secondary[0]!.key,
    ).length !== 1
  )
    return deny();
  if (
    graph.integration.providers.length !== 0 ||
    !equalSet(
      graph.integration.capabilities.map(
        (c) => c.key + ":" + c.operation + ":" + c.providerId,
      ),
      [
        "audit.record:record:factory",
        "notification.send:send:factory",
        "identity.context.resolve:resolve:factory",
        "authorization.decision:decision:factory",
      ],
    )
  )
    return deny();
  const entity = graph.domain.entities.filter((e) => e.key === flow.entity);
  if (
    entity.length !== 1 ||
    entity[0]!.fields.some((f) =>
      ["id", "version", "createdAt", "updatedAt"].includes(f.key),
    )
  )
    return deny();
  const status = entity[0]!.fields.find((field) => field.key === "status");
  if (
    !status ||
    status.type !== "enum" ||
    status.required !== true ||
    !equalSet(status.values ?? [], [
      "draft",
      "submitted",
      "approved",
      "returned",
    ])
  )
    return deny();
  return flow.entity;
}

/** An exact anchor failure is a compiler error, never partial correction output. */
function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw new Error("Approval emitter anchor changed.");
  return source.replace(before, after);
}
export function renderApprovalMutationRuntime(
  source: string,
  graph: ApplicationGraphV1,
  entity = selectApprovalCorrection(graph),
): string {
  if (!entity) return source;
  const fields = graph.domain.entities.find((e) => e.key === entity)!.fields;
  source = 'import { createHash } from "node:crypto";\n' + source;
  source = replace(
    source,
    "recordId: string; at: string };",
    "recordId: string; reason?: string | null; at: string };",
  );
  source = replace(
    source,
    "export interface RecordStore {",
    `export type ApprovalMutationReceipt = { scope: string; idempotencyKey: string; requestHash: string; operation: string; recordId: string; responseStatus: number; responseBody: StoredRecord };
export class ApprovalMutationError extends Error { constructor(readonly status: number, readonly body: Record<string, unknown>) { super('Approval request rejected.'); } }
const approvalEntity = ${JSON.stringify(entity)};
const approvalFields = ${JSON.stringify(fields)} as readonly {key:string;type:string;required?:boolean;values?:readonly string[]}[];
// factory.generated.approval-mutation/v1
function failApproval(status:number,code:string,current?:StoredRecord):never { throw new ApprovalMutationError(status,{code,...(current?{current:{id:current.id,status:current.status,version:current.version}}:{})}); }
function plainApproval(value:unknown): asserts value is Record<string,unknown> {
 if(!value || typeof value!=='object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) failApproval(400,'approval.invalid_request');
 for(const key of Reflect.ownKeys(value)) { const d=Object.getOwnPropertyDescriptor(value,key)!; if(typeof key!=='string' || !d.enumerable || !('value' in d)) failApproval(400,'approval.invalid_request'); }
}
function canonicalApproval(value:unknown):string { if(Array.isArray(value)) return '['+value.map(canonicalApproval).join(',')+']'; if(value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalApproval((value as Record<string,unknown>)[k])).join(',')+'}'; return JSON.stringify(value); }
function approvalValues(value:unknown,create:boolean):Record<string,unknown> {
 plainApproval(value); if(!create && Object.keys(value).length===0) failApproval(400,'approval.invalid_request');
 const fields=approvalFields.filter(f=>!['id','status','version','createdAt','updatedAt'].includes(f.key));
 for(const [key,v] of Object.entries(value)) {
  const f=fields.find(f=>f.key===key); if(!f) failApproval(400,'approval.invalid_request');
  if(v===null) { if(f.required) failApproval(400,'approval.invalid_request'); continue; }
  let valid=false;
  if(['string','text','url','email','enum','date','datetime'].includes(f.type)) {
   valid=typeof v==='string' && (!f.required || v.trim().length>0);
   if(valid && f.type==='enum') valid=f.values?.includes(v as string)===true;
   if(valid && ['date','datetime'].includes(f.type)) { const text=v as string; valid=Number.isFinite(Date.parse(text)) && (f.type==='date'?/^\\d{4}-\\d{2}-\\d{2}(T00:00:00(?:\\.000)?Z)?$/.test(text)&&new Date(text).toISOString().slice(0,10)===text.slice(0,10):/^\\d{4}-\\d{2}-\\d{2}T/.test(text)); }
   if(valid && f.type==='url') { try { valid=['http:','https:'].includes(new URL(v as string).protocol); } catch { valid=false; } }
   if(valid && f.type==='email') valid=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v as string);
  } else if(f.type==='integer') valid=typeof v==='number' && Number.isSafeInteger(v);
  else if(f.type==='decimal') valid=typeof v==='number' && Number.isFinite(v);
  else if(f.type==='boolean') valid=typeof v==='boolean';
  else if(f.type==='json') { const check=(x:unknown):boolean=> x===null || typeof x==='string' || typeof x==='boolean' || (typeof x==='number' && Number.isFinite(x)) || (Array.isArray(x)?x.every(check):!!x && typeof x==='object' && (plainApproval(x),Object.values(x).every(check))); valid=check(v); }
  if(!valid) failApproval(400,'approval.invalid_request');
 }
 if(create && fields.some(f=>f.required&&!Object.hasOwn(value,f.key))) failApproval(400,'approval.invalid_request');
 return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,v!==null && ['date','datetime'].includes(fields.find(f=>f.key===key)!.type) ? new Date(v as string).toISOString() : structuredClone(v)]));
}
export interface RecordStore {
  getApprovalReceipt(scope:string,key:string):Promise<ApprovalMutationReceipt | undefined>;
  saveApprovalReceipt(receipt:ApprovalMutationReceipt):Promise<void>;
  conditionalApprovalUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord | undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly approvalReceipts = new Map<string, ApprovalMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.approvalReceipts.clear(); for(const [key,value] of source.approvalReceipts) this.approvalReceipts.set(key,structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "{ id: seed.id, ...seed.values }",
    "{ id: seed.id, ...seed.values, ...(seed.entity === approvalEntity ? {version:0} : {}) }",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    `  async getApprovalReceipt(scope:string,key:string):Promise<ApprovalMutationReceipt | undefined> { const receipt=this.approvalReceipts.get(JSON.stringify([scope,key])); return receipt ? structuredClone(receipt) : undefined; }
  async saveApprovalReceipt(receipt:ApprovalMutationReceipt):Promise<void> { await this.coordinateMutation(()=>{ const key=JSON.stringify([receipt.scope,receipt.idempotencyKey]); if(this.approvalReceipts.has(key)) throw new Error('Duplicate approval receipt.'); this.approvalReceipts.set(key,structuredClone(receipt)); }); }
  async conditionalApprovalUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord | undefined> { return this.coordinateMutation(()=>{ const current=this.collection(entity).get(id); if(!current || current.status!==status || current.version!==version) return undefined; const updated={...current,...values}; this.collection(entity).set(id,updated); return structuredClone(updated); }); }
  private collection(entityKey:`,
  );
  source = replace(
    source,
    "  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    `  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {
    if(entityKey===approvalEntity) failApproval(400,'approval.invalid_request');`,
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    `export class ApplicationRuntime {
  async approvalCommand(role:string,actorScope:string,entityKey:string,recordId:string | undefined,operation:string,key:unknown,body:unknown):Promise<{status:number;body:StoredRecord}> {
    if(entityKey!==approvalEntity) failApproval(404,'approval.not_found');
    if(!['create','update','submit','approve','reject'].includes(operation)) failApproval(403,'approval.denied');
    if(!(await enforce(role,entityKey,operation))) failApproval(403,'approval.denied');
    if(typeof key!=='string'||! /^[A-Za-z0-9._:-]{1,128}$/.test(key)) failApproval(400,'approval.invalid_request');
    plainApproval(body);
    const expected=operation==='create'?['values']:operation==='update'?['expectedVersion','values']:operation==='reject'?['expectedVersion','reason']:['expectedVersion'];
    if(Object.keys(body).length!==expected.length || !expected.every(k=>Object.hasOwn(body,k))) failApproval(400,'approval.invalid_request');
    if(operation!=='create' && (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion as number)<0)) failApproval(400,'approval.invalid_request');
    let values:Record<string,unknown>={}; let reason:string|null=null;
    if(operation==='create'||operation==='update') values=approvalValues(body.values,operation==='create');
    if(operation==='reject') { if(typeof body.reason!=='string') failApproval(400,'approval.invalid_request'); reason=body.reason.trim(); if(reason.length<1||reason.length>500||/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]/.test(reason)) failApproval(400,'approval.invalid_request'); }
    const normalized=operation==='create'?{values}:operation==='update'?{expectedVersion:body.expectedVersion,values}:operation==='reject'?{expectedVersion:body.expectedVersion,reason}:{expectedVersion:body.expectedVersion};
    const scope=createHash('sha256').update([${JSON.stringify(hashApplicationGraph(graph))},actorScope,role,entityKey,recordId??'$create',operation].map(v=>Buffer.byteLength(v)+':'+v).join('')).digest('hex');
    const requestHash=createHash('sha256').update(canonicalApproval(normalized)).digest('hex');
    const replay=(receipt:ApprovalMutationReceipt)=> { if(receipt.requestHash!==requestHash) failApproval(409,'approval.idempotency_conflict'); return {status:receipt.responseStatus,body:structuredClone(receipt.responseBody)}; };
    const run=()=>this.store.inTransaction(async store=>{
      const existing=await store.getApprovalReceipt(scope,key); if(existing) return replay(existing);
      let record:StoredRecord; let effects:readonly {capability:string;operation:string}[]=[];
      if(operation==='create') { record=await store.create(entityKey,{...values,status:'draft',version:0}); }
      else {
        const current=recordId?await store.find(entityKey,recordId):undefined; if(!current) failApproval(404,'approval.not_found');
        if(current.version!==body.expectedVersion) failApproval(409,'approval.version_conflict',current);
        let status=current.status!;
        if(operation==='update' && status==='draft') { /* Draft edits have no transition effect. */ }
        else { const transition=this.flow(entityKey)?.transitions.find(t=>t.event===operation && t.from===status && t.roles?.includes(role)); if(!transition || operation==='update' && status!=='returned') failApproval(403,'approval.denied'); status=transition.to; effects=transition.effects??[]; }
        const updated=await store.conditionalApprovalUpdate(entityKey,current.id,current.status!,current.version!,{...values,status,version:current.version!+1});
        if(!updated) { const authoritative=await store.find(entityKey,current.id); if(!authoritative) failApproval(404,'approval.not_found'); failApproval(409,'approval.version_conflict',authoritative); } record=updated;
      }
      const at=new Date().toISOString();
      await store.appendAudit({actor:role,action:operation,entity:entityKey,recordId:record.id,reason,at});
      for(const effect of effects) {
        this.assertCapability(effect.capability,effect.operation);
        if(effect.capability==='notification.send') await store.enqueueNotification({dedupeKey:JSON.stringify([scope,key,record.version]),actor:role,recipientRole:${JSON.stringify(graph.flow.flows[0]!.transitions.find((t) => t.event === "submit")!.roles![0])},template:null,entity:entityKey,recordId:record.id,availableAt:at});
        await store.appendCapabilityEvent({actor:role,capability:effect.capability,operation:effect.operation,entity:entityKey,recordId:record.id,outcome:'completed',at});
      }
      const responseBody=JSON.parse(JSON.stringify({id:record.id,status:record.status,version:record.version,...Object.fromEntries(approvalFields.filter(f=>f.key!=='status').map(f=>[f.key,record[f.key]==null ? null : f.type==='decimal'||f.type==='integer' ? Number(record[f.key]) : ['date','datetime'].includes(f.type) ? new Date(record[f.key] as string).toISOString() : record[f.key]]))})) as StoredRecord;
      const responseStatus=operation==='create'?201:200;
      await store.saveApprovalReceipt({scope,idempotencyKey:key,requestHash,operation,recordId:record.id,responseStatus,responseBody});
      return {status:responseStatus,body:responseBody};
    });
    for(let attempt=0;;attempt++) { try { return await run(); } catch(error) { const code=(error as {code?:string})?.code; if(attempt<3 && ['P2002','P2034'].includes(code??'')) continue; throw error; } }
  }
  async approvalDecisionEvents(role:string,entity:string,recordId:string):Promise<readonly AuditEvent[]> {
    if(entity!==approvalEntity) failApproval(404,'approval.not_found');
    if(!(await enforce(role,entity,'read'))) failApproval(403,'approval.denied');
    if(!await this.store.find(entity,recordId)) failApproval(404,'approval.not_found');
    return (await this.store.listAudit()).filter(e=>e.entity===entity && e.recordId===recordId && ['approve','reject'].includes(e.action)).map(e=>({actor:e.actor,action:e.action,entity:e.entity,recordId:e.recordId,reason:e.reason??null,at:e.at}));
  }`,
  );
  // Public legacy transition entry must never bypass correction commands.
  source = replace(
    source,
    "    const flow = this.flow(entityKey);\n    if (!flow)",
    "    if(entityKey===approvalEntity) failApproval(403,'approval.denied');\n    const flow = this.flow(entityKey);\n    if (!flow)",
  );
  source = replace(
    source,
    "return [...this.collection(entityKey).values()];",
    "return structuredClone([...this.collection(entityKey).values()]);",
  );
  source = replace(
    source,
    "return this.collection(entityKey).get(recordId);",
    "return structuredClone(this.collection(entityKey).get(recordId));",
  );
  source = replace(
    source,
    "return [...this.auditEvents];",
    "return structuredClone(this.auditEvents);",
  );
  source = replace(
    source,
    "return [...this.capabilityEvents];",
    "return structuredClone(this.capabilityEvents);",
  );
  source = replace(
    source,
    "    return this.store.listAudit();",
    "    return (await this.store.listAudit()).map(e=>({actor:e.actor,action:e.action,entity:e.entity,recordId:e.recordId,reason:e.reason??null,at:e.at}));",
  );
  return source;
}
export function renderApprovalPrismaStore(
  source: string,
  graph: ApplicationGraphV1,
  entity = selectApprovalCorrection(graph),
): string {
  if (!entity) return source;
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "ApprovalMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "type CrudDelegate = {",
    "type CrudDelegate = {\n  updateMany(input:{where:Record<string,unknown>;data:Record<string,unknown>}):Promise<{count:number}>;",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    `type ApprovalReceiptDelegate = { findUnique(input:{where:{scope_idempotencyKey:{scope:string;idempotencyKey:string}}}):Promise<ApprovalMutationReceipt|null>; create(input:{data:ApprovalMutationReceipt}):Promise<unknown>; };
export class PrismaRecordStore implements RecordStore {
  private approvalReceiptDelegate():ApprovalReceiptDelegate { return (this.prisma as unknown as {approvalMutationReceipt:ApprovalReceiptDelegate}).approvalMutationReceipt; }
  async getApprovalReceipt(scope:string,key:string):Promise<ApprovalMutationReceipt | undefined> { return (await this.approvalReceiptDelegate().findUnique({where:{scope_idempotencyKey:{scope,idempotencyKey:key}}}))??undefined; }
  async saveApprovalReceipt(receipt:ApprovalMutationReceipt):Promise<void> { await this.approvalReceiptDelegate().create({data:receipt}); }
  async conditionalApprovalUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord | undefined> { const result=await this.delegate(entity).updateMany({where:{id,status,version},data:values}); return result.count===1?this.find(entity,id):undefined; }`,
  );
  source = replace(
    source,
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> };",
    "type TransactionExecutor = { $transaction<T>(operation: (client: PrismaClient) => Promise<T>,options?:{isolationLevel:'Serializable'}): Promise<T> };",
  );
  source = replace(
    source,
    "operation(new PrismaRecordStore(client)));",
    "operation(new PrismaRecordStore(client)),{isolationLevel:'Serializable'});",
  );
  return source;
}
export const approvalReceiptSchema = `model ApprovalMutationReceipt {
  id String @id @default(cuid())
  scope String
  idempotencyKey String
  requestHash String
  operation String
  recordId String
  responseStatus Int
  responseBody Json
  createdAt DateTime @default(now())
  @@unique([scope, idempotencyKey])
}`;
export const approvalReceiptMigration = `CREATE TABLE "ApprovalMutationReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "scope" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL,
 "requestHash" TEXT NOT NULL,
 "operation" TEXT NOT NULL,
 "recordId" TEXT NOT NULL,
 "responseStatus" INTEGER NOT NULL,
 "responseBody" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ApprovalMutationReceipt_scope_idempotencyKey_key" ON "ApprovalMutationReceipt" ("scope", "idempotencyKey");`;
export function renderApprovalApi(
  source: string,
  graph: ApplicationGraphV1,
  fixture: boolean,
  entity = selectApprovalCorrection(graph),
): string {
  if (!entity) return source;
  source = replace(
    source,
    "Param, Post, Req",
    "Param, Post, Patch, HttpCode, Req",
  );
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, ApprovalMutationError }",
  );
  source = replace(
    source,
    "return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "return error instanceof ApprovalMutationError ? new HttpException(error.body,error.status) : new HttpException({code:'approval.denied'},HttpStatus.FORBIDDEN);",
  );
  const role = (action: string) =>
    fixture ? `roleFrom(request, entity, ${action})` : "roleFrom(request)";
  const actor = fixture
    ? "String(request.headers['x-factory-fixture-session'])"
    : "roleFrom(request)";
  source = replace(
    source,
    "class GeneratedController {",
    `class GeneratedController {
  @Patch(':entity/:recordId')
  @HttpCode(200)
  async updateApproval(@Param('entity') entity:string,@Param('recordId') recordId:string,@Body() body:unknown,@Req() request:{headers:Record<string,string|string[]|undefined>}) {
    try { if(entity!==${JSON.stringify(entity)}) throw new ApprovalMutationError(404,{code:'approval.not_found'}); return (await applicationRuntime.approvalCommand(${role("'update'")},${actor},entity,recordId,'update',request.headers['x-factory-idempotency-key'],body)).body; } catch(error) {throw rejected(error);}
  }
  @Get(':entity/:recordId/decision-events')
  async decisionEvents(@Param('entity') entity:string,@Param('recordId') recordId:string,@Req() request:{headers:Record<string,string|string[]|undefined>}) {
    try { if(entity!==${JSON.stringify(entity)}) throw new ApprovalMutationError(404,{code:'approval.not_found'}); return await applicationRuntime.approvalDecisionEvents(${role("'read'")},entity,recordId); } catch(error) {throw rejected(error);}
  }`,
  );
  source = replace(
    source,
    `try { return await applicationRuntime.create(${role("'create'")}, entity, body); }`,
    `try { if(entity===${JSON.stringify(entity)}) return (await applicationRuntime.approvalCommand(${role("'create'")},${actor},entity,undefined,'create',request.headers['x-factory-idempotency-key'],body)).body; return await applicationRuntime.create(${role("'create'")}, entity, body); }`,
  );
  source = replace(
    source,
    "  @Post(':entity/:recordId/events/:event')",
    "  @Post(':entity/:recordId/events/:event')\n  @HttpCode(200)",
  );
  source = replace(
    source,
    `try { return await applicationRuntime.transition(${role("event")}, entity, recordId, event, body); }`,
    `try { if(entity===${JSON.stringify(entity)}) { if(event==='update') throw new ApprovalMutationError(403,{code:'approval.denied'}); return (await applicationRuntime.approvalCommand(${role("event")},${actor},entity,recordId,event,request.headers['x-factory-idempotency-key'],body)).body; } return await applicationRuntime.transition(${role("event")}, entity, recordId, event, body); }`,
  );
  return source;
}
export function renderApprovalCorrectionPage(
  source: string,
  graph: ApplicationGraphV1,
  entity = selectApprovalCorrection(graph),
): string {
  if (!entity) return source;
  source = replace(
    source,
    "type JsonRecord =",
    `// approval-workspace-presentation@2.1.0; approval-presentation-components@1.1.0; approval-visual-assets@1.1.0
const correctionEntity = ${JSON.stringify(entity)};
type JsonRecord =`,
  );
  source = replace(
    source,
    "function safeResponseMessage(status: number): string {",
    "function safeResponseMessage(status: number): string {\n  if(status===409) return 'This record changed. Review the refreshed record before trying again.';",
  );
  source = replace(
    source,
    "  const pending = useRef(false);",
    `  const pending = useRef(false);
  const retained = useRef<{payload:string;key:string}|null>(null);
  const createScope = entity.key + ':' + role;
  const createGeneration = useRef({scope:createScope,version:0});
  if(createGeneration.current.scope!==createScope) { createGeneration.current={scope:createScope,version:createGeneration.current.version+1}; retained.current=null; }
  useEffect(()=>{setValues({});setState('idle');setMessage('');pending.current=false;return()=>{createGeneration.current.version++;};},[createScope]);`,
  );
  source = replace(
    source,
    "    pending.current = true; setState('pending');",
    "    const generation=createGeneration.current.version;\n    pending.current = true; setState('pending');",
  );
  source = replace(
    source,
    "const response = await fetch(`/api/${entity.key}`, { method: 'POST', headers: requestHeaders(role), body: JSON.stringify(payload) });",
    `const serialized=JSON.stringify(entity.key===correctionEntity?{values:payload}:payload);
      if(!retained.current || retained.current.payload!==serialized) retained.current={payload:serialized,key:crypto.randomUUID()};
      const response = await fetch('/api/'+entity.key, {method:'POST',headers:{...requestHeaders(role),'x-factory-idempotency-key':retained.current.key},body:serialized});
      if(createGeneration.current.version!==generation) return;`,
  );
  source = replace(
    source,
    "      setValues({}); setState('success');",
    "      retained.current=null; setValues({}); setState('success');",
  );
  source = replace(
    source,
    "    } catch (reason) { setState('error'); setMessage(errorMessage(reason)); }",
    "    } catch (reason) { if(createGeneration.current.version!==generation) return; setState('error'); setMessage(reason instanceof SafeUiError?errorMessage(reason):'The result is unknown. Try again to recover this request.'); }",
  );
  source = replace(
    source,
    "    finally { pending.current = false; }",
    "    finally { if(createGeneration.current.version===generation) pending.current = false; }",
  );
  source = replace(
    source,
    "onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}",
    "onChange={(value) => {retained.current=null;setValues((current) => ({ ...current, [field.key]: value }));}}",
  );
  // Command ownership survives filtering; role/entity/page changes replace the owner.
  source = replace(
    source,
    "  const scopeGeneration = useRef(0);",
    `  const scopeGeneration = useRef(0);
  const commandRecords=useRef({scope,records:new Map<string,ApprovalRecordCommandState>()});
  if(commandRecords.current.scope!==scope)commandRecords.current={scope,records:new Map()};`,
  );
  source = replace(
    source,
    "<div className='approval-actions'>{validTransitions(role, entity.key, record.status).map((action) => {",
    `{entity.key===correctionEntity ? <ApprovalRecordCommands key={scope + ':' + record.id} entity={entity} record={record} role={role} refresh={refresh} commandState={approvalRecordCommandState(commandRecords.current.records,String(record.id),record.version)} isCurrent={((generation)=>()=>generation===scopeGeneration.current)(scopeGeneration.current)} onMutation={((generation) => (next:MutationState) => {if(generation!==scopeGeneration.current)return;setMutations(current=>({...current,[String(record.id)]:next}));setListMutation(next);})(scopeGeneration.current)} /> : <div className='approval-actions'>{validTransitions(role, entity.key, record.status).map((action) => {`,
  );
  source = replace(
    source,
    "    })}</div><ApprovalProgress",
    "    })}</div>}<ApprovalProgress",
  );
  source = replace(
    source,
    "function EntityRecords(",
    renderCorrectionControls() + "\nfunction EntityRecords(",
  );
  return source;
}
function renderCorrectionControls(): string {
  return `
type ApprovalRecordCommandState = {
 mode:'edit'|'return'|null;values:Record<string,string|boolean>;reason:string;
 pending:{current:boolean};retained:{current:{payload:string;operation:string;key:string}|null};editVersion:{current:unknown};listeners:Set<()=>void>;
};
function approvalRecordCommandState(records:Map<string,ApprovalRecordCommandState>,id:string,version:unknown):ApprovalRecordCommandState {
 let state=records.get(id);if(!state){state={mode:null,values:{},reason:'',pending:{current:false},retained:{current:null},editVersion:{current:version},listeners:new Set()};records.set(id,state);}return state;
}
function ApprovalRecordCommands({entity,record,role,refresh,onMutation,commandState,isCurrent}:{readonly entity:RuntimeEntity;readonly record:JsonRecord;readonly role:string;readonly refresh:()=>Promise<readonly JsonRecord[]>;readonly onMutation:(state:MutationState)=>void;readonly commandState:ApprovalRecordCommandState;readonly isCurrent:()=>boolean}) {
 const [,renderCommand]=useState(0);
 const notifyCommand=()=>{for(const listener of commandState.listeners)listener();};
 useEffect(()=>{const listener=()=>renderCommand(version=>version+1);commandState.listeners.add(listener);return()=>{commandState.listeners.delete(listener);};},[commandState]);
 const {mode,values,reason,pending,retained,editVersion}=commandState;const busy=pending.current;
 const setMode=(mode:ApprovalRecordCommandState['mode'])=>{commandState.mode=mode;notifyCommand();};
 const setValues=(next:Record<string,string|boolean>|((current:Record<string,string|boolean>)=>Record<string,string|boolean>))=>{commandState.values=typeof next==='function'?next(commandState.values):next;notifyCommand();};
 const setReason=(reason:string)=>{commandState.reason=reason;notifyCommand();};
 const setBusy=(busy:boolean)=>{pending.current=busy;notifyCommand();};
 const alive=useRef(true);
 const [history,setHistory]=useState<{phase:'loading'|'success'|'error';events:readonly DecisionEvent[]}>({phase:'loading',events:[]});
 const historyGeneration=useRef(0);
 const fields=entity.fields.filter(f=>!['id','status','version','createdAt','updatedAt'].includes(f.key));
 const recordId=String(record.id);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;historyGeneration.current++;};},[]);
 const loadHistory=useCallback(async()=>{const generation=++historyGeneration.current;setHistory({phase:'loading',events:[]});try {const response=await fetch('/api/'+entity.key+'/'+encodeURIComponent(recordId)+'/decision-events',{headers:requestHeaders(role)}); if(!response.ok) throw new Error(); const events=decisionHistoryPayload(await response.json(),[record],entity.key).events; if(alive.current&&generation===historyGeneration.current) setHistory({phase:'success',events});}catch{if(alive.current&&generation===historyGeneration.current)setHistory({phase:'error',events:[]});}},[entity.key,recordId,role,record.version]);
 useEffect(()=>{void loadHistory();},[loadHistory]);
 const changeMode=(next:'edit'|'return')=>{if(pending.current||!isCurrent())return;editVersion.current=record.version; retained.current=null;setMode(next); if(next==='edit')setValues(Object.fromEntries(fields.map(f=>[f.key,f.type==='boolean'?record[f.key]===true:f.type==='date'?String(record[f.key]??'').slice(0,10):f.type==='datetime'?String(record[f.key]??'').slice(0,16):f.type==='json'?JSON.stringify(record[f.key]??null):String(record[f.key]??'')])));};
 const command=async(operation:string)=>{
  if(pending.current||!isCurrent())return; pending.current=true;setBusy(true);
  onMutation({event:operation,status:'pending',message:(operation==='update'?'Save':operation==='reject'?'Return':fieldLabel(operation))+' in progress…'});
  try {
   const payload=operation==='update'?{expectedVersion:editVersion.current,values:{...formPayload(fields,values),...Object.fromEntries(fields.filter(f=>!f.required&&values[f.key]==='').map(f=>[f.key,null]))}}:operation==='reject'?{expectedVersion:editVersion.current,reason}:{expectedVersion:record.version};
   const serialized=retained.current?.operation===operation?retained.current.payload:JSON.stringify(payload);
   if(!retained.current||retained.current.payload!==serialized||retained.current.operation!==operation)retained.current={payload:serialized,operation,key:crypto.randomUUID()};
   const response=await fetch('/api/'+entity.key+'/'+encodeURIComponent(recordId)+(operation==='update'?'':'/events/'+operation),{method:operation==='update'?'PATCH':'POST',headers:{...requestHeaders(role),'x-factory-idempotency-key':retained.current.key},body:serialized});
   if(!isCurrent())return;
   if(response.status===409){await refresh();if(!isCurrent())return;setMode(null);retained.current=null;throw new SafeUiError('This record changed. Review the refreshed record before trying again.');}
   if(!response.ok)throw new SafeUiError(safeResponseMessage(response.status));
   const updated=await response.json() as JsonRecord; if(!isCurrent())return;
   await refresh();if(!isCurrent())return;
   onMutation({event:operation,status:'success',message:entity.label+': '+fieldLabel(String(updated.status))+'.'});
   retained.current=null;setMode(null);setReason('');
  }catch(error){if(isCurrent())onMutation({event:operation,status:'error',message:error instanceof SafeUiError?errorMessage(error):'The result is unknown. Try again to recover this request.'});}
  finally{setBusy(false);}
 };
 const latest=history.events.filter(e=>e.action==='reject').at(-1);
 return <div className='approval-correction-controls'>
  {record.status==='returned'?history.phase==='loading'?<p role='status'>Loading return reason…</p>:history.phase==='error'?<div><p role='alert'>Decision history is unavailable. Try again.</p><button type='button' onClick={()=>void loadHistory()}>Retry</button></div>:latest?<p className='approval-return-reason'><strong>Reason for return</strong>: {latest.reason}</p>:<p>No return reason is available.</p>:null}
  <div className='approval-actions'>{can(role,entity.key,'update')&&['draft','returned'].includes(String(record.status))?<button type='button' disabled={busy||mode!==null} onClick={()=>changeMode('edit')}>Edit</button>:null}
  {validTransitions(role,entity.key,record.status).filter(t=>t.event!=='update').map(t=><button key={t.event} type='button' disabled={busy||mode!==null} onClick={()=>t.event==='reject'?changeMode('return'):void command(t.event)}>{actionIcon(t.event)?<ApprovalIcon name={actionIcon(t.event)!}/>:null}{t.event==='reject'?'Return':fieldLabel(t.event)}</button>)}</div>
  {mode==='edit'?<form aria-label='Edit record' aria-busy={busy} onSubmit={event=>{event.preventDefault();void command('update');}}><fieldset disabled={busy}>{fields.map(field=><div className='approval-field' key={field.key}><label htmlFor={recordId+'-edit-'+field.key}>{fieldLabel(field.key)}</label><FieldControl id={recordId+'-edit-'+field.key} field={field} value={values[field.key]??''} onChange={value=>{retained.current=null;setValues(current=>({...current,[field.key]:value}));}}/></div>)}</fieldset><div className='approval-actions'><button disabled={busy} type='submit'>Save</button><button disabled={busy} type='button' onClick={()=>setMode(null)}>Cancel</button></div></form>:null}
  {mode==='return'?<form aria-label='Return record' aria-busy={busy} onSubmit={event=>{event.preventDefault();void command('reject');}}><div className='approval-field'><label htmlFor={recordId+'-return-reason'}>Reason for return</label><textarea id={recordId+'-return-reason'} required maxLength={500} value={reason} disabled={busy} onChange={event=>{retained.current=null;setReason(event.target.value);}} /></div><div className='approval-actions'><button type='submit' disabled={busy||!reason.trim()}>Return</button><button type='button' disabled={busy} onClick={()=>setMode(null)}>Cancel</button></div></form>:null}
  {history.phase==='success'&&history.events.length>0?<details className='approval-record-history'><summary>Decision history</summary><ol>{history.events.map((event,index)=><li key={index}><strong>{event.action==='reject'?'Return':'Approve'}</strong> · Demo role: {fieldLabel(event.actor)}{event.reason?<p>{event.reason}</p>:null}</li>)}</ol></details>:null}
 </div>;
}
`;
}
export function renderApprovalJourney(
  graph: ApplicationGraphV1,
  key = selectApprovalCorrection(graph),
): string | undefined {
  if (!key) return undefined;
  const entity = graph.domain.entities.find((e) => e.key === key)!;
  const flow = graph.flow.flows[0]!;
  const requester = flow.transitions.find((t) => t.event === "submit")!
    .roles![0]!;
  const reviewer = flow.transitions.find((t) => t.event === "approve")!
    .roles![0]!;
  const values = Object.fromEntries(
    entity.fields
      .filter((f) => f.key !== "status" && f.required)
      .map((f) => [
        f.key,
        f.type === "integer" || f.type === "decimal"
          ? 1
          : f.type === "boolean"
            ? true
            : f.type === "enum"
              ? f.values![0]
              : f.type === "date"
                ? "2026-01-01"
                : f.type === "datetime"
                  ? "2026-01-01T00:00:00.000Z"
                  : f.type === "url"
                    ? "https://example.test"
                    : f.type === "email"
                      ? "user@example.test"
                      : f.type === "json"
                        ? { sample: true }
                        : "Sample " + f.key,
      ]),
  );
  return `import {describe,it,expect} from 'vitest';
import {ApplicationRuntime,InMemoryRecordStore} from '../src/application-runtime.js';
describe('approval correction generated journey',()=>{
 it('returns and revises the same record, retaining both decisions and replay',async()=>{
  const store=new InMemoryRecordStore();const runtime=new ApplicationRuntime(store);
  const command=(role:string,id:string|undefined,operation:string,key:string,body:unknown)=>runtime.approvalCommand(role,role,${JSON.stringify(key)},id,operation,key,body);
  const created=await command(${JSON.stringify(requester)},undefined,'create','journey-create',{values:${JSON.stringify(values)}});
  const id=created.body.id;
  await command(${JSON.stringify(requester)},id,'submit','journey-submit',{expectedVersion:0});
  await command(${JSON.stringify(reviewer)},id,'reject','journey-return',{expectedVersion:1,reason:'Please correct the request.'});
  await command(${JSON.stringify(requester)},id,'update','journey-edit',{expectedVersion:2,values:${JSON.stringify(values)}});
  await command(${JSON.stringify(requester)},id,'submit','journey-resubmit',{expectedVersion:3});
  const approved=await command(${JSON.stringify(reviewer)},id,'approve','journey-approve',{expectedVersion:4});
  expect(approved.body).toMatchObject({id,status:'approved',version:5});
  expect(await command(${JSON.stringify(reviewer)},id,'approve','journey-approve',{expectedVersion:4})).toEqual(approved);
  expect(await runtime.approvalDecisionEvents(${JSON.stringify(requester)},${JSON.stringify(key)},id)).toHaveLength(2);
  await expect(command(${JSON.stringify(requester)},id,'approve','denied',{expectedVersion:5})).rejects.toMatchObject({status:403});
 });
});\n`;
}
