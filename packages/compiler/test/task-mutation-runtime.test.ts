import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { posix } from "node:path";
import { transpileModule, ModuleKind } from "typescript";
import { describe, expect, it } from "vitest";
import { canonicalTeamTaskInterpretation } from "../../adapters/src/requirements/task-definition-selection.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "@factory/graph";
import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";
import { selectTaskContract } from "../src/task-mutation-contract.js";

export function taskInput(
  mutate?: (
    interpretation: ReturnType<typeof canonicalTeamTaskInterpretation>,
  ) => void,
): PublishedGraphInput {
  const interpretation = canonicalTeamTaskInterpretation();
  mutate?.(interpretation);
  const baseDraft = createBlankApplicationDraft({
    applicationId: "team-board",
    workspaceId: "local-workspace",
    name: "Team Board",
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const { diff } = composeProductDraft({
    plan: standard.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const selections = graph.integration.compositionSelections!;
  delete graph.integration.compositionSelections;
  return {
    publishedRevisionId: "published-team-board",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}
const runtimeRequire = createRequire(import.meta.url);
export function loadTaskRuntime(input = taskInput()) {
  const files = generateApplicationBundle(input).files;
  const cache = new Map<string, any>();
  function load(path: string): any {
    if (cache.has(path)) return cache.get(path);
    const file = files.find((f) => f.path === path);
    if (!file) throw Error(path);
    const exports: any = {};
    cache.set(path, exports);
    const js = transpileModule(file.content, {
      compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
    }).outputText;
    new Function("require", "exports", js)(
      (name: string) =>
        name.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(posix.dirname(path), name.replace(/\.js$/, ".ts")),
              ),
            )
          : runtimeRequire(name),
      exports,
    );
    return exports;
  }
  return { ...load("api/src/application-runtime.ts"), files, load };
}
export const taskValues = {
  title: "Prepare launch notes",
  assignee: "Morgan",
  dueDate: "2026-09-20",
  priority: "high",
};
function prismaHarness() {
  let state = {
    records: [] as any[],
    audit: [] as any[],
    effects: [] as any[],
    receipts: [] as any[],
  };
  let queue = Promise.resolve(),
    failAt = "",
    retryCode = "",
    attempts = 0;
  const after = (boundary: string) => {
    if (failAt === boundary) throw Error("Injected Prisma failure");
  };
  function delegates(data: typeof state): any {
    return {
      task: {
        findMany: async () => structuredClone(data.records),
        findUnique: async ({ where }: any) =>
          structuredClone(data.records.find((r) => r.id === where.id) ?? null),
        create: async ({ data: values }: any) => {
          const row = {
            id: "persisted-" + (data.records.length + 1),
            ...values,
          };
          data.records.push(row);
          after("create");
          return structuredClone(row);
        },
        updateMany: async ({ where, data: values }: any) => {
          const row = data.records.find((r) =>
            Object.entries(where).every(([key, value]) => r[key] === value),
          );
          if (row) Object.assign(row, values);
          after("updateMany");
          return { count: row ? 1 : 0 };
        },
      },
      factory_AuditEvent: {
        create: async ({ data: row }: any) => {
          data.audit.push(structuredClone(row));
          after("audit");
        },
        findMany: async () => structuredClone(data.audit),
      },
      factory_CapabilityEvent: {
        create: async ({ data: row }: any) => {
          data.effects.push(structuredClone(row));
        },
        findMany: async () => structuredClone(data.effects),
      },
      taskMutationReceipt: {
        findUnique: async ({ where: { scope_idempotencyKey: key } }: any) =>
          structuredClone(
            data.receipts.find(
              (r) =>
                r.scope === key.scope &&
                r.idempotencyKey === key.idempotencyKey,
            ) ?? null,
          ),
        create: async ({ data: row }: any) => {
          if (
            data.receipts.some(
              (r) =>
                r.scope === row.scope &&
                r.idempotencyKey === row.idempotencyKey,
            )
          )
            throw Object.assign(Error("Duplicate"), { code: "P2002" });
          data.receipts.push(structuredClone(row));
          after("receipt");
        },
      },
    };
  }
  const client: any = {
    $transaction: async (operation: any, options: any) => {
      expect(options).toEqual({ isolationLevel: "Serializable" });
      attempts++;
      const run = queue.then(async () => {
        if (retryCode) {
          const code = retryCode;
          retryCode = "";
          throw Object.assign(Error("Retry transaction"), { code });
        }
        const pending = structuredClone(state);
        const result = await operation(delegates(pending));
        state = pending;
        return result;
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
  for (const key of Object.keys(delegates(state)))
    Object.defineProperty(client, key, { get: () => delegates(state)[key] });
  return {
    client,
    snapshot: () => structuredClone(state),
    fail: (boundary: string) => {
      failAt = boundary;
    },
    retry: (code: string) => {
      retryCode = code;
    },
    attempts: () => attempts,
  };
}
describe("immutable Task compilation and commands", () => {
  it("matches renamed symbols and declaration permutations through the composer", () => {
    const input = taskInput((i) => {
      i.blueprint.actors.forEach((a) => {
        const old = a.key;
        a.key = old === "member" ? "collaborator" : "reader";
        a.label = "Display " + a.key;
        a.permissions[0].entityKey = "work-item";
        a.permissions[0].actions.reverse();
        i.blueprint.workflows[0].transitions
          .filter((t) => t.actorKey === old)
          .forEach((t) => (t.actorKey = a.key));
        i.blueprint.acceptanceJourneys.forEach((j) =>
          j.steps
            .filter((s) => s.actorKey === old)
            .forEach((s) => (s.actorKey = a.key)),
        );
      });
      i.blueprint.actors.reverse();
      i.blueprint.entities[0].key = "work-item";
      i.blueprint.entities[0].fields.reverse();
      i.blueprint.entities[0].fields
        .find((f) => f.key === "priority")!
        .options!.reverse();
      i.blueprint.pageIntents.forEach((p) => {
        p.entityKey = "work-item";
        p.key = "view-" + p.intent;
        p.label = "Display " + p.intent;
      });
      i.blueprint.pageIntents.reverse();
      const flow = i.blueprint.workflows[0];
      flow.entityKey = "work-item";
      flow.key = "work-progress";
      flow.transitions.reverse();
      flow.states.splice(1, 2, flow.states[2], flow.states[1]);
    });
    input.graph.flow.flows[0].states.reverse();
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    });
    expect(selectTaskContract(input.graph, input.compositionLock)).toBe(
      "work-item",
    );
    expect(
      generateApplicationBundle(input).files.find(
        (f) => f.path === "web/app/page-runtime.tsx",
      )!.content,
    ).toContain("task-v1");
  });
  it.each([
    "initial",
    "state",
    "event",
    "transition",
    "grant",
    "block",
    "extra-flow",
    "effect",
  ])("fails closed for a lock-bound candidate with conflicting %s", (kind) => {
    const input = taskInput(),
      graph = input.graph,
      flow = graph.flow.flows[0];
    if (kind === "initial") flow.initialState = "completed";
    if (kind === "state") flow.states.push("extra");
    if (kind === "event") flow.events.push("extra");
    if (kind === "transition") flow.transitions.pop();
    if (kind === "grant")
      graph.policy.permissions
        .find((p) => p.resource === "task" && p.role === "viewer")!
        .actions.push("create");
    if (kind === "block")
      graph.page.pages.find(
        (p) => p.blocks[0].type === "detail",
      )!.blocks[0].type = "list";
    if (kind === "extra-flow") graph.flow.flows.push({ ...flow, id: "extra" });
    if (kind === "effect")
      flow.transitions[0].effects = [
        { capability: "audit.record", operation: "record" },
      ];
    if (kind === "effect") {
      graph.integration.compositionSelections = input.compositionLock.packages;
      expect(() => selectTaskContract(graph)).toThrow(
        "Task contract shape is not supported.",
      );
      expect(() => generateApplicationBundle(input)).toThrow();
      return;
    }
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: input.compositionLock.packages,
    });
    expect(() => selectTaskContract(graph, input.compositionLock)).toThrow(
      "Task contract shape is not supported.",
    );
    expect(() => generateApplicationBundle(input)).toThrow();
  });
  it("does not treat an arbitrary event or mismatched binding as a Task candidate", () => {
    const input = taskInput();
    const selections = structuredClone(input.compositionLock.packages);
    selections.find((s) => s.lock.key === "core.audit")!.bindings.actorRole = {
      graphSymbol: "graph.policy.viewer",
    };
    const lock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections,
    });
    expect(selectTaskContract(input.graph, lock)).toBeUndefined();
    input.graph.domain.entities.find((e) => e.key === "task")!.fields[0].key =
      "subject";
    expect(
      selectTaskContract(input.graph, input.compositionLock),
    ).toBeUndefined();
  });
  it("emits one protected Task family from a true Published Graph and separate lock", () => {
    const input = taskInput(),
      before = JSON.stringify(input);
    const files = generateApplicationBundle(input).files;
    expect(JSON.stringify(input)).toBe(before);
    expect(
      files.find((f) => f.path === "web/app/page-runtime.tsx")!.content,
    ).toContain("task-v1");
    expect(
      files.find((f) => f.path === "api/src/application-runtime.ts")!.content,
    ).toContain("factory.generated.task-mutation/v1");
    expect(
      files.find((f) => f.path === "api/prisma/schema.prisma")!.content,
    ).toContain("model TaskMutationReceipt");
  });
  it("creates once, replays after reconstruction, and completes a version-bound lifecycle", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore();
    let runtime = new ApplicationRuntime(store);
    const beforeCount = (await store.list("task")).length;
    expect(typeof runtime.taskCommand).toBe("function");
    const create = await runtime.taskCommand(
      "member",
      "session",
      "task",
      undefined,
      "create",
      "create-1",
      { values: taskValues },
    );
    expect(create.status).toBe(201);
    expect(create.body).toEqual({
      id: expect.any(String),
      ...taskValues,
      dueDate: "2026-09-20T00:00:00.000Z",
      description: null,
      status: "not-started",
      version: 0,
    });
    runtime = new ApplicationRuntime(store);
    expect(
      await runtime.taskCommand(
        "member",
        "session",
        "task",
        undefined,
        "create",
        "create-1",
        { values: taskValues },
      ),
    ).toEqual(create);
    for (const [version, event, status] of [
      [0, "start", "in-progress"],
      [1, "complete", "completed"],
      [2, "reopen", "in-progress"],
      [3, "complete", "completed"],
    ] as const) {
      const result = await runtime.taskCommand(
        "member",
        "session",
        "task",
        create.body.id,
        event,
        "event-" + version,
        { expectedVersion: version },
      );
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        status,
        version: version + 1,
        title: taskValues.title,
      });
    }
    expect(await store.list("task")).toHaveLength(beforeCount + 1);
    expect(await store.listAudit()).toHaveLength(5);
  });
  it("enforces authorization, strict requests, replay identity and conflict precedence without extra writes", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    const command = (
      op: string,
      key: unknown,
      body: unknown,
      id?: string,
      role = "member",
    ) => runtime.taskCommand(role, "session", "task", id, op, key, body);
    for (const key of [undefined, "", "bad key", "x".repeat(129), ["array"], 1])
      await expect(
        command("create", key, { values: taskValues }),
      ).rejects.toMatchObject({
        status: 400,
        body: { code: "task.invalid_request" },
      });
    for (const body of [
      null,
      [],
      {},
      taskValues,
      { values: taskValues, extra: true },
      { values: { ...taskValues, id: "forced" } },
      { values: { ...taskValues, status: "completed" } },
      { values: { ...taskValues, version: 3 } },
      { values: { ...taskValues, title: " " } },
      { values: { ...taskValues, description: 3 } },
      { values: { ...taskValues, dueDate: "2026-02-30" } },
      { values: { ...taskValues, priority: "urgent" } },
    ])
      await expect(command("create", "invalid", body)).rejects.toMatchObject({
        status: 400,
        body: { code: "task.invalid_request" },
      });
    const created = await command("create", "private-transient-key", {
      values: taskValues,
    });
    const id = created.body.id;
    await expect(
      command("create", "private-transient-key", {
        values: { ...taskValues, title: "Changed" },
      }),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: "task.idempotency_conflict" },
    });
    for (const event of ["create", "start", "complete", "reopen"])
      await expect(
        command(
          event,
          "private-transient-key",
          event === "create" ? { values: taskValues } : { expectedVersion: 0 },
          id,
          "viewer",
        ),
      ).rejects.toMatchObject({ status: 403, body: { code: "task.denied" } });
    await expect(
      command("start", "missing", { expectedVersion: 0 }, "missing"),
    ).rejects.toMatchObject({ status: 404, body: { code: "task.not_found" } });
    await expect(
      command("complete", "wrong-state", { expectedVersion: 0 }, id),
    ).rejects.toMatchObject({ status: 403, body: { code: "task.denied" } });
    for (const body of [
      { expectedVersion: -1 },
      { expectedVersion: 1.5 },
      { expectedVersion: "0" },
      { expectedVersion: 0, extra: true },
    ])
      await expect(command("start", "invalid", body, id)).rejects.toMatchObject(
        { status: 400 },
      );
    await command("start", "start", { expectedVersion: 0 }, id);
    await expect(
      command("start", "stale", { expectedVersion: 0 }, id),
    ).rejects.toMatchObject({
      status: 409,
      body: {
        code: "task.version_conflict",
        current: { id, status: "in-progress", version: 1 },
      },
    });
    const scope = createHash("sha256")
      .update(
        [
          hashApplicationGraph(taskInput().graph),
          "session",
          "member",
          "task",
          "$create",
          "create",
        ]
          .map((v) => Buffer.byteLength(v) + ":" + v)
          .join(""),
      )
      .digest("hex");
    const stored =
      "sha256:" +
      createHash("sha256").update("private-transient-key").digest("hex");
    const receipt = await store.getTaskReceipt(scope, stored);
    expect(receipt.idempotencyKey).toBe(stored);
    expect(
      await store.getTaskReceipt(scope, "private-transient-key"),
    ).toBeUndefined();
    expect(JSON.stringify(receipt)).not.toContain("private-transient-key");
    expect(await store.listAudit()).toHaveLength(2);
    expect(await store.listCapabilityEvents()).toHaveLength(0);
    expect(
      await store.claimDueNotifications("2100-01-01T00:00:00Z", 99),
    ).toHaveLength(0);
  });
  it("serializes duplicate creates and allows exactly one transition at a version", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore();
    const runtimes = [
      new ApplicationRuntime(store),
      new ApplicationRuntime(store),
    ];
    const results = await Promise.all(
      runtimes.map((r) =>
        r.taskCommand(
          "member",
          "session",
          "task",
          undefined,
          "create",
          "same",
          { values: taskValues },
        ),
      ),
    );
    expect(results[0]).toEqual(results[1]);
    const id = results[0].body.id;
    const transitions = await Promise.allSettled(
      runtimes.map((r, n) =>
        r.taskCommand("member", "session", "task", id, "start", "race-" + n, {
          expectedVersion: 0,
        }),
      ),
    );
    expect(transitions.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (
        transitions.find(
          (r) => r.status === "rejected",
        ) as PromiseRejectedResult
      ).reason.body,
    ).toEqual({
      code: "task.version_conflict",
      current: { id, status: "in-progress", version: 1 },
    });
    expect(await store.listAudit()).toHaveLength(2);
  });
  it("hashes the exact validated body while ignoring object key order", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    const create = (values: unknown) =>
      runtime.taskCommand(
        "member",
        "session",
        "task",
        undefined,
        "create",
        "body-identity",
        { values },
      );
    const first = await create(taskValues);
    expect(
      await create(Object.fromEntries(Object.entries(taskValues).reverse())),
    ).toEqual(first);
    await expect(
      create({ ...taskValues, description: null }),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: "task.idempotency_conflict" },
    });
    expect(await store.listAudit()).toHaveLength(1);
  });
  it("denies every infrastructure mutation and retains authorized reads", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    for (const entity of ["team-board-principal", "team-board-session"]) {
      await expect(runtime.create("member", entity, {})).rejects.toMatchObject({
        status: 403,
        body: { code: "task.denied" },
      });
      expect(await runtime.list("member", entity)).toEqual([]);
    }
    expect(await store.listAudit()).toEqual([]);
  });
  it("does not expose Create through an event route alias", async () => {
    const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    await expect(
      runtime.taskCommand(
        "member",
        "session",
        "task",
        "sample-task",
        "create",
        "event-alias",
        { values: taskValues },
      ),
    ).rejects.toMatchObject({ status: 403, body: { code: "task.denied" } });
    expect(await store.listAudit()).toEqual([]);
  });
  it.each([
    "create",
    "conditionalTaskUpdate",
    "appendAudit",
    "saveTaskReceipt",
  ])(
    "rolls back after %s and allows the same activation to recover",
    async (boundary) => {
      const { ApplicationRuntime, InMemoryRecordStore } = loadTaskRuntime();
      const store = new InMemoryRecordStore(),
        runtime = new ApplicationRuntime(store);
      const first = await runtime.taskCommand(
        "member",
        "session",
        "task",
        undefined,
        "create",
        "first",
        { values: taskValues },
      );
      const snapshot = async () =>
        JSON.stringify({
          records: await store.list("task"),
          audit: await store.listAudit(),
          effects: await store.listCapabilityEvents(),
        });
      const before = await snapshot(),
        transaction = store.inTransaction.bind(store);
      store.inTransaction = (operation: any) =>
        transaction(async (tx: any) => {
          const original = tx[boundary].bind(tx);
          tx[boundary] = async (...args: unknown[]) => {
            await original(...args);
            throw Error("Injected boundary failure");
          };
          return operation(tx);
        });
      const command = () =>
        runtime.taskCommand(
          "member",
          "session",
          "task",
          boundary === "create" ? undefined : first.body.id,
          boundary === "create" ? "create" : "start",
          "recover",
          boundary === "create"
            ? { values: taskValues }
            : { expectedVersion: 0 },
        );
      await expect(command()).rejects.toThrow("Injected boundary failure");
      expect(await snapshot()).toBe(before);
      expect(
        await store.claimDueNotifications("2100-01-01T00:00:00Z", 99),
      ).toEqual([]);
      store.inTransaction = transaction;
      const recovered = await command();
      expect(recovered.status).toBe(boundary === "create" ? 201 : 200);
      expect(await command()).toEqual(recovered);
      expect(await store.listAudit()).toHaveLength(2);
    },
  );
  it("executes Prisma receipts, reconstruction, conditional races and bounded serialization retry", async () => {
    const { ApplicationRuntime, load } = loadTaskRuntime(),
      { PrismaRecordStore } = load("api/src/prisma-record-store.ts");
    const db = prismaHarness(),
      make = () => new ApplicationRuntime(new PrismaRecordStore(db.client));
    const create = (runtime: any) =>
      runtime.taskCommand(
        "member",
        "session",
        "task",
        undefined,
        "create",
        "persistent-activation",
        { values: taskValues },
      );
    db.retry("P2034");
    const first = await create(make());
    expect(db.attempts()).toBe(2);
    expect(await create(make())).toEqual(first);
    expect(db.snapshot().receipts).toHaveLength(1);
    const events = await Promise.allSettled(
      [0, 1].map((n) =>
        make().taskCommand(
          "member",
          "session",
          "task",
          first.body.id,
          "start",
          "race-" + n,
          { expectedVersion: 0 },
        ),
      ),
    );
    expect(events.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (events.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.body,
    ).toEqual({
      code: "task.version_conflict",
      current: { id: first.body.id, status: "in-progress", version: 1 },
    });
    const saved = db.snapshot();
    expect(saved.records).toHaveLength(1);
    expect(saved.audit).toHaveLength(2);
    expect(saved.effects).toEqual([]);
    expect(saved.receipts).toHaveLength(2);
    expect(
      saved.receipts.every((r) =>
        /^sha256:[a-f0-9]{64}$/.test(r.idempotencyKey),
      ),
    ).toBe(true);
    expect(JSON.stringify(saved)).not.toContain("persistent-activation");
    for (const [version, event] of [
      [1, "complete"],
      [2, "reopen"],
      [3, "complete"],
    ] as const) {
      const runtime = make(),
        body = { expectedVersion: version },
        key = "lifecycle-" + version;
      const result = await runtime.taskCommand(
        "member",
        "session",
        "task",
        first.body.id,
        event,
        key,
        body,
      );
      expect(result.body.version).toBe(version + 1);
      expect(
        await make().taskCommand(
          "member",
          "session",
          "task",
          first.body.id,
          event,
          key,
          body,
        ),
      ).toEqual(result);
    }
    expect(db.snapshot().audit).toHaveLength(5);
    expect(db.snapshot().receipts).toHaveLength(5);
    expect(db.snapshot().effects).toEqual([]);
  });
  it.each(["create", "updateMany", "audit", "receipt"])(
    "rolls back Prisma %s before commit and recovers without duplicate work",
    async (boundary) => {
      const { ApplicationRuntime, load } = loadTaskRuntime(),
        { PrismaRecordStore } = load("api/src/prisma-record-store.ts");
      const db = prismaHarness(),
        runtime = new ApplicationRuntime(new PrismaRecordStore(db.client));
      const first = await runtime.taskCommand(
        "member",
        "session",
        "task",
        undefined,
        "create",
        "seed",
        { values: taskValues },
      );
      const before = db.snapshot();
      const command = () =>
        runtime.taskCommand(
          "member",
          "session",
          "task",
          boundary === "create" ? undefined : first.body.id,
          boundary === "create" ? "create" : "start",
          "retry-failure",
          boundary === "create"
            ? { values: taskValues }
            : { expectedVersion: 0 },
        );
      db.fail(boundary);
      await expect(command()).rejects.toThrow("Injected Prisma failure");
      expect(db.snapshot()).toEqual(before);
      db.fail("");
      const recovered = await command();
      expect(await command()).toEqual(recovered);
      expect(db.snapshot().audit).toHaveLength(2);
      expect(db.snapshot().receipts).toHaveLength(2);
      expect(db.snapshot().effects).toEqual([]);
    },
  );
  it("typechecks the emitted API, store and Task React tree under strict settings", () => {
    const files = generateApplicationBundle(taskInput()).files;
    const staging = resolve(__dirname, ".typecheck"),
      directory = resolve(staging, "task");
    if (!directory.startsWith(staging + requirePathSeparator()))
      throw new Error("Invalid test staging directory.");
    mkdirSync(directory, { recursive: true });
    try {
      for (const file of files.filter(
        (f) =>
          f.path.startsWith("api/src/") ||
          f.path === "web/app/page-runtime.tsx",
      )) {
        const target = join(directory, file.path);
        mkdirSync(join(target, ".."), { recursive: true });
        writeFileSync(target, file.content);
      }
      writeFileSync(
        join(directory, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            strict: true,
            target: "es2022",
            module: "esnext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            lib: ["es2022", "dom"],
            skipLibCheck: true,
            experimentalDecorators: true,
            paths: {
              "@prisma/client": [
                join(
                  __dirname,
                  "../../../apps/control-plane/node_modules/@prisma/client",
                ),
              ],
              "@nestjs/*": [
                join(
                  __dirname,
                  "../../../apps/control-plane/node_modules/@nestjs/*",
                ),
              ],
            },
          },
          include: ["web/**/*.tsx", "api/src/**/*.ts"],
        }),
      );
      const result = spawnSync(
        process.execPath,
        [
          runtimeRequire.resolve("typescript/bin/tsc"),
          "--noEmit",
          "-p",
          join(directory, "tsconfig.json"),
        ],
        { encoding: "utf8" },
      );
      expect(result.status, result.stdout + result.stderr).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
function requirePathSeparator() {
  return process.platform === "win32" ? "\\" : "/";
}
