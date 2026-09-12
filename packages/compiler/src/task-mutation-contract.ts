import { isDeepStrictEqual } from "node:util";
import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";
import { writeProtectionFragments } from "./mutation-write-protection.js";

export const taskMutationContract = {
  key: "task-mutation",
  version: "1.0.0",
  mutation: "factory.generated.task-mutation/v1",
  receipt: "factory.generated.task-mutation-receipt/v1",
  ownership: "factory-authored",
  license: "UNLICENSED",
} as const;
const exactSet = (actual: readonly string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((value) => actual.includes(value));
const taskLocks = {
  "core.crud": "1.0.1",
  "core.workflow": "1.0.1",
  "core.identity-policy": "1.0.0",
  "core.policy-declarations": "1.0.0",
  "core.audit": "1.0.2",
  "core.notification": "1.1.1",
} as const;
const businessFields = [
  ["title", "string", true],
  ["description", "text", false],
  ["assignee", "string", true],
  ["dueDate", "date", true],
  ["priority", "enum", true],
] as const;
function hasTaskFields(
  entity: ApplicationGraphV1["domain"]["entities"][number],
): boolean {
  const fields = entity.fields.filter((f) => f.key !== "status");
  return (
    fields.length === 5 &&
    businessFields.every(([key, type, required]) =>
      fields.some(
        (f) =>
          f.key === key &&
          f.type === type &&
          f.required === required &&
          (key === "priority"
            ? exactSet(f.values ?? [], ["low", "medium", "high"])
            : f.values === undefined),
      ),
    )
  );
}

/** One lock-bound selection result activates both Task presentation and mutation. */
export function selectTaskContract(
  graph: ApplicationGraphV1,
  compositionLock?: CapabilityCompositionLockV1,
): string | undefined {
  const selections =
    compositionLock?.packages ?? graph.integration.compositionSelections ?? [];
  const locked =
    selections.length === 6 &&
    exactSet(
      selections.map((s) => s.lock.key),
      Object.keys(taskLocks),
    ) &&
    selections.every(
      (s) => taskLocks[s.lock.key as keyof typeof taskLocks] === s.lock.version,
    );
  if (!locked) return undefined;
  const byKey = new Map(selections.map((s) => [s.lock.key, s]));
  const binding = (key: string, expected: Record<string, string>) => {
    const actual = byKey.get(key)?.bindings ?? {};
    return (
      exactSet(Object.keys(actual), Object.keys(expected)) &&
      Object.entries(expected).every(([k, v]) =>
        isDeepStrictEqual(actual[k], { graphSymbol: v }),
      )
    );
  };
  const signatures = graph.domain.entities.filter(hasTaskFields);
  const candidate = signatures.some((entity) =>
    graph.flow.flows.some(
      (flow) =>
        flow.entity === entity.key &&
        flow.events.some((e) => ["start", "complete", "reopen"].includes(e)) &&
        binding("core.crud", {
          entityKey: "graph.domain." + entity.key,
          routeKey:
            "graph.page." +
            graph.page.pages.find((p) =>
              p.blocks.some(
                (b) => b.entity === entity.key && b.type === "list",
              ),
            )?.id,
        }) &&
        binding("core.workflow", { flowKey: "graph.flow." + flow.id }) &&
        binding("core.identity-policy", {
          principalEntity: "graph.domain." + graph.metadata.id + "-principal",
          sessionEntity: "graph.domain." + graph.metadata.id + "-session",
          defaultRole: "graph.policy." + graph.policy.roles[0],
          authenticatedRole: "graph.policy." + graph.policy.roles[1],
        }) &&
        binding("core.audit", {
          actorRole: "graph.policy." + graph.policy.roles[0],
        }) &&
        binding("core.notification", {
          recipientRole: "graph.policy." + graph.policy.roles[0],
        }) &&
        binding("core.policy-declarations", {}),
    ),
  );
  if (!candidate) return undefined;
  const deny = (): never => {
    throw new Error("Task contract shape is not supported.");
  };
  if (
    compositionLock &&
    (compositionLock.applicationGraphChecksum !== hashApplicationGraph(graph) ||
      (graph.integration.compositionSelections !== undefined &&
        !isDeepStrictEqual(
          [...selections].sort((a, b) => a.lock.key.localeCompare(b.lock.key)),
          [...graph.integration.compositionSelections].sort((a, b) =>
            a.lock.key.localeCompare(b.lock.key),
          ),
        )))
  )
    return deny();
  if (
    signatures.length !== 1 ||
    graph.flow.flows.length !== 1 ||
    graph.policy.roles.length !== 2 ||
    graph.domain.entities.length !== 3
  )
    return deny();
  const entity = signatures[0]!,
    flow = graph.flow.flows[0]!;
  if (
    flow.entity !== entity.key ||
    flow.initialState !== "not-started" ||
    !exactSet(flow.states, ["not-started", "in-progress", "completed"]) ||
    !exactSet(flow.events, ["start", "complete", "reopen"]) ||
    flow.transitions.length !== 3 ||
    entity.fields.length !== 6
  )
    return deny();
  const status = entity.fields.find((f) => f.key === "status");
  if (
    !status ||
    status.type !== "enum" ||
    status.required !== true ||
    !exactSet(status.values ?? [], ["not-started", "in-progress", "completed"])
  )
    return deny();
  const grants = graph.policy.permissions.filter(
    (p) => p.resource === entity.key,
  );
  const member = grants.find((p) =>
    exactSet(p.actions, ["create", "read", "start", "complete", "reopen"]),
  )?.role;
  const viewer = grants.find((p) => exactSet(p.actions, ["read"]))?.role;
  if (
    !member ||
    !viewer ||
    member === viewer ||
    grants.length !== 2 ||
    !exactSet(graph.policy.roles, [member, viewer])
  )
    return deny();
  for (const [event, from, to] of [
    ["start", "not-started", "in-progress"],
    ["complete", "in-progress", "completed"],
    ["reopen", "completed", "in-progress"],
  ]) {
    const transition = flow.transitions.find((t) => t.event === event);
    if (
      !transition ||
      transition.from !== from ||
      transition.to !== to ||
      !exactSet(transition.roles ?? [], [member]) ||
      !exactSet(
        (transition.effects ?? []).map((e) => e.capability + ":" + e.operation),
        [],
      )
    )
      return deny();
  }
  const blocks = graph.page.pages.flatMap((page) =>
    page.blocks.map((block) => ({ page, block })),
  );
  if (
    graph.page.pages.length !== 5 ||
    blocks.length !== 5 ||
    blocks.some(({ block }) => block.entity !== entity.key) ||
    !exactSet(
      blocks.map(({ block }) => block.type),
      ["stats", "list", "form", "detail", "queue"],
    )
  )
    return deny();
  const list = blocks.find(({ block }) => block.type === "list")!.page;
  const first = graph.policy.roles[0]!,
    second = graph.policy.roles[1]!;
  const principal = graph.metadata.id + "-principal",
    session = graph.metadata.id + "-session";
  if (
    !exactSet(
      graph.domain.entities.map((e) => e.key),
      [entity.key, principal, session],
    ) ||
    !binding("core.crud", {
      entityKey: "graph.domain." + entity.key,
      routeKey: "graph.page." + list.id,
    }) ||
    !binding("core.workflow", { flowKey: "graph.flow." + flow.id }) ||
    !binding("core.identity-policy", {
      principalEntity: "graph.domain." + principal,
      sessionEntity: "graph.domain." + session,
      defaultRole: "graph.policy." + first,
      authenticatedRole: "graph.policy." + second,
    }) ||
    !binding("core.audit", { actorRole: "graph.policy." + first }) ||
    !binding("core.notification", { recipientRole: "graph.policy." + first }) ||
    !binding("core.policy-declarations", {})
  )
    return deny();
  const expectedPermissions = [
    ...grants.flatMap((p) =>
      p.actions.map((a) => p.role + ":" + entity.key + ":" + a),
    ),
    ...graph.policy.roles.flatMap((role) => [
      role + ":" + principal + ":read",
      role + ":" + session + ":read",
    ]),
    first + ":" + session + ":create",
    first + ":" + session + ":update",
  ];
  if (
    !exactSet(
      graph.policy.permissions.flatMap((p) =>
        p.actions.map((a) => p.role + ":" + p.resource + ":" + a),
      ),
      expectedPermissions,
    )
  )
    return deny();
  return entity.key;
}

function replace(source: string, before: string, after: string): string {
  if (!source.includes(before))
    throw new Error("Task template anchor is unavailable.");
  return source.replace(before, after);
}
export function renderTaskMutationRuntime(
  source: string,
  graph: ApplicationGraphV1,
  entity?: string,
): string {
  if (!entity) return source;
  const protection = writeProtectionFragments(
    "task",
    hashApplicationGraph(graph),
  );
  source = 'import {createHash} from "node:crypto";\n' + source;
  source = replace(
    source,
    "export interface RecordStore {",
    `// factory.generated.task-mutation/v1
export type TaskMutationReceipt={scope:string;idempotencyKey:string;requestHash:string;operation:string;recordId:string;responseStatus:number;responseBody:StoredRecord};
export class TaskMutationError extends Error {constructor(readonly status:number,readonly body:Record<string,unknown>){super('Task request rejected.');}}
const taskEntity=${JSON.stringify(entity)};
function failTask(status:number,code:string,current?:StoredRecord):never {throw new TaskMutationError(status,{code,...(current?{current:{id:current.id,status:current.status,version:current.version}}:{})});}
function plainTask(value:unknown):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))failTask(400,'task.invalid_request');
 for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key)!;if(typeof key!=='string'||!descriptor.enumerable||!('value'in descriptor))failTask(400,'task.invalid_request');}
}
${protection.canonical}
function taskValues(input:unknown):Record<string,unknown>{
 plainTask(input);
 if(Object.keys(input).some(key=>!['title','description','assignee','dueDate','priority'].includes(key)))failTask(400,'task.invalid_request');
 for(const key of ['title','assignee','dueDate','priority'])if(typeof input[key]!=='string'||!(input[key] as string).trim())failTask(400,'task.invalid_request');
 if(Object.hasOwn(input,'description')&&input.description!==null&&typeof input.description!=='string')failTask(400,'task.invalid_request');
 if(!['low','medium','high'].includes(input.priority as string))failTask(400,'task.invalid_request');
 const date=input.dueDate as string;
 if(!/^\\d{4}-\\d{2}-\\d{2}(T00:00:00(?:\\.000)?Z)?$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date.slice(0,10))failTask(400,'task.invalid_request');
 return {title:input.title,description:input.description??null,assignee:input.assignee,dueDate:new Date(date).toISOString(),priority:input.priority};
}
export interface RecordStore {
 getTaskReceipt(scope:string,key:string):Promise<TaskMutationReceipt|undefined>;
 saveTaskReceipt(receipt:TaskMutationReceipt):Promise<void>;
 conditionalTaskUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord|undefined>;`,
  );
  source = replace(
    source,
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly taskReceipts=new Map<string,TaskMutationReceipt>();\n  private readonly auditEvents: AuditEvent[] = [];",
  );
  source = replace(
    source,
    "    this.records.clear();",
    "    this.taskReceipts.clear();for(const [key,value] of source.taskReceipts)this.taskReceipts.set(key,structuredClone(value));\n    this.records.clear();",
  );
  source = replace(
    source,
    "{ id: seed.id, ...seed.values }",
    "{ id: seed.id, ...seed.values, ...(seed.entity===taskEntity?{version:0}:{}) }",
  );
  source = replace(
    source,
    "  private collection(entityKey:",
    protection.memoryMethods + "\n  private collection(entityKey:",
  );
  source = replace(
    source,
    "export class ApplicationRuntime {",
    `export class ApplicationRuntime {
 async taskCommand(role:string,actorScope:string,entityKey:string,recordId:string|undefined,operation:string,key:unknown,body:unknown):Promise<{status:number;body:StoredRecord}>{
  if(entityKey!==taskEntity)failTask(404,'task.not_found');
  if(!['create','start','complete','reopen'].includes(operation)||(operation==='create'&&recordId!==undefined)||!await enforce(role,entityKey,operation))failTask(403,'task.denied');
${protection.validateKey}
  plainTask(body);
  const expected=operation==='create'?['values']:['expectedVersion'];
  if(Object.keys(body).length!==expected.length||!expected.every(k=>Object.hasOwn(body,k)))failTask(400,'task.invalid_request');
  if(operation!=='create'&&(!Number.isSafeInteger(body.expectedVersion)||(body.expectedVersion as number)<0))failTask(400,'task.invalid_request');
  const values=operation==='create'?taskValues(body.values):{};
  const normalized=body;
${protection.identity}
${protection.replay}
${protection.transactionStart}
      let record:StoredRecord;let effects:readonly {capability:string;operation:string}[]=[];
      if(operation==='create'){record=await store.create(entityKey,{...values,status:'not-started',version:0});}
      else{
        const current=recordId?await store.find(entityKey,recordId):undefined;if(!current)failTask(404,'task.not_found');
        if(current.version!==body.expectedVersion)failTask(409,'task.version_conflict',current);
        const transition=this.flow(entityKey)?.transitions.find(t=>t.event===operation&&t.from===current.status&&t.roles?.includes(role));
        if(!transition)failTask(403,'task.denied');
        const status=transition.to;effects=transition.effects??[];
${protection.conditionalWrite}
      }
      const at=new Date().toISOString();
      await store.appendAudit({actor:role,action:operation,entity:entityKey,recordId:record.id,at});
      for(const effect of effects){this.assertCapability(effect.capability,effect.operation);await store.appendCapabilityEvent({actor:role,capability:effect.capability,operation:effect.operation,entity:entityKey,recordId:record.id,outcome:'completed',at});}
      const responseBody={id:record.id,status:record.status,version:record.version,title:record.title,description:record.description??null,assignee:record.assignee,dueDate:new Date(record.dueDate as string).toISOString(),priority:record.priority} as StoredRecord;
      const responseStatus=operation==='create'?201:200;
${protection.saveReceipt}
      return {status:responseStatus,body:responseBody};
    });
${protection.transactionRetry}
 }
`,
  );
  for (const method of ["create", "transition"]) {
    const pattern = new RegExp(
      "  async " + method + "\\(role:[\\s\\S]*?\\n  \\}",
    );
    const legacy = source.match(pattern)?.[0];
    if (!legacy) throw new Error("Task write boundary is unavailable.");
    const denial =
      method === "create"
        ? "failTask(entityKey===taskEntity?400:403,entityKey===taskEntity?'task.invalid_request':'task.denied');"
        : "failTask(403,'task.denied');";
    source = replace(
      source,
      legacy,
      legacy.split("\n")[0] + "\n    " + denial + "\n  }",
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
export function renderTaskPrismaStore(
  source: string,
  graph: ApplicationGraphV1,
  entity?: string,
): string {
  if (!entity) return source;
  const protection = writeProtectionFragments(
    "task",
    hashApplicationGraph(graph),
  );
  source = replace(
    source,
    "AuditEvent, CapabilityEvent,",
    "TaskMutationReceipt, AuditEvent, CapabilityEvent,",
  );
  source = replace(
    source,
    "type CrudDelegate = {",
    "type CrudDelegate = {\n  updateMany(input:{where:Record<string,unknown>;data:Record<string,unknown>}):Promise<{count:number}>;",
  );
  source = replace(
    source,
    "export class PrismaRecordStore implements RecordStore {",
    protection.prismaMethods,
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
export const taskReceiptSchema = `model TaskMutationReceipt {
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
export const taskReceiptMigration = `CREATE TABLE "TaskMutationReceipt" (
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
CREATE UNIQUE INDEX "TaskMutationReceipt_scope_idempotencyKey_key" ON "TaskMutationReceipt" ("scope", "idempotencyKey");`;

export function renderTaskApi(
  source: string,
  fixture: boolean,
  entity?: string,
): string {
  if (!entity) return source;
  source = replace(source, "Param, Post, Req", "Param, Post, HttpCode, Req");
  source = replace(
    source,
    "import { ApplicationRuntime }",
    "import { ApplicationRuntime, TaskMutationError }",
  );
  source = replace(
    source,
    "return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "return error instanceof TaskMutationError?new HttpException(error.body,error.status):new HttpException({code:'task.denied'},HttpStatus.FORBIDDEN);",
  );
  const role = (action: string) =>
    fixture ? `roleFrom(request, entity, ${action})` : "roleFrom(request)";
  const actor = fixture
    ? "String(request.headers['x-factory-fixture-session'])"
    : "roleFrom(request)";
  source = replace(
    source,
    `try { return await applicationRuntime.create(${role("'create'")}, entity, body); }`,
    `try { if(entity===${JSON.stringify(entity)})return (await applicationRuntime.taskCommand(${role("'create'")},${actor},entity,undefined,'create',request.headers['x-factory-idempotency-key'],body)).body; return await applicationRuntime.create(${role("'create'")}, entity, body); }`,
  );
  source = replace(
    source,
    "  @Post(':entity/:recordId/events/:event')",
    "  @Post(':entity/:recordId/events/:event')\n  @HttpCode(200)",
  );
  source = replace(
    source,
    `try { return await applicationRuntime.transition(${role("event")}, entity, recordId, event, body); }`,
    `try { if(entity===${JSON.stringify(entity)})return (await applicationRuntime.taskCommand(${role("event")},${actor},entity,recordId,event,request.headers['x-factory-idempotency-key'],body)).body; return await applicationRuntime.transition(${role("event")}, entity, recordId, event, body); }`,
  );
  return source;
}
