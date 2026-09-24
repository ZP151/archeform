import { describe, expect, it } from "vitest";
import {
  loadWorkOrdersRuntime,
  workOrdersPrismaHarness,
  renamedWorkOrdersInput,
  roleWorkOrdersInput,
  workOrdersRoleCases,
} from "./fixtures/service-work-orders-runtime.js";
import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  getPreEmitDiagnostics,
  flattenDiagnosticMessageText,
  ModuleKind,
  ScriptTarget,
} from "typescript";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";
import { buildCompilationInput } from "../src/index.js";
import { databaseTargetPlugin } from "../src/targets/database/target.js";
import { renderServiceWorkOrdersFile } from "../src/service-work-orders-runtime.js";
import { selectServiceWorkOrdersProfile } from "../src/service-work-orders-contract.js";

const actor = (suffix: string, role = "technician") => ({
  principalId: `fixture-principal-${suffix}`,
  sessionId: `fixture-session-${suffix}`,
  tenantId: "tenant-local",
  roles: [role],
  expiresAt: "2099-01-01T00:00:00.000Z",
});
const dispatcher = actor("dispatcher", "dispatcher"),
  a = actor("technician-a"),
  b = actor("technician-b");
const initial = {
  title: " Leak ",
  serviceLocation: " Room 1 ",
  priority: "medium",
  description: null,
  dueDate: null,
};
function setup(persistent = false) {
  const db = workOrdersPrismaHarness();
  const emitted = loadWorkOrdersRuntime(db.client);
  const store = persistent
    ? new (emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore)(
        db.client,
      )
    : new emitted.InMemoryRecordStore();
  const runtime = new emitted.ApplicationRuntime(store);
  const command = (
    operation: string,
    id?: string,
    body: unknown = { values: initial },
    principal = dispatcher,
    key = operation,
  ) =>
    runtime.workOrderCommand(principal, "work-order", id, operation, key, body);
  return { emitted, store, runtime, command, db };
}

it.each(["canonical", "long-128"])(
  "strictly typechecks %s emitted API modules and the web proxy without writing or listening",
  (name) => {
    const emitted =
      name === "canonical"
        ? setup().emitted
        : loadWorkOrdersRuntime(
            undefined,
            renamedWorkOrdersInput(
              "service-" + "a".repeat(120),
              "service-" + "b".repeat(120),
            ),
          );
    const root = fileURLToPath(
      new URL("./__virtual_work_orders__/", import.meta.url),
    );
    const normalize = (path: string) => resolve(path).replaceAll("\\", "/");
    const virtual = new Map<string, string>(
      emitted.files
        .filter(
          (f: any) =>
            (f.path.startsWith("api/src/") && f.path.endsWith(".ts")) ||
            f.path === "web/app/api/[...path]/route.ts",
        )
        .map((f: any) => [normalize(resolve(root, f.path)), f.content]),
    );
    const dependency = (path: string) =>
      realpathSync(fileURLToPath(new URL(path, import.meta.url)));
    const options = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ScriptTarget.ES2022,
      module: ModuleKind.NodeNext,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      types: ["node"],
      typeRoots: [dependency("../../../node_modules/@types")],
      baseUrl: root,
      paths: {
        xstate: [dependency("../node_modules/xstate")],
        casbin: [dependency("../node_modules/casbin")],
        "@prisma/client": [
          dependency(
            "../../../apps/control-plane/node_modules/@prisma/client/default.d.ts",
          ),
        ],
        "@nestjs/common": [
          dependency(
            "../../../apps/control-plane/node_modules/@nestjs/common/index.d.ts",
          ),
        ],
        "@nestjs/core": [
          dependency(
            "../../../apps/control-plane/node_modules/@nestjs/core/index.d.ts",
          ),
        ],
      },
    };
    const host = createCompilerHost(options);
    const read = host.readFile.bind(host),
      exists = host.fileExists.bind(host),
      directoryExists = host.directoryExists?.bind(host),
      get = host.getSourceFile.bind(host);
    host.readFile = (path) => virtual.get(normalize(path)) ?? read(path);
    host.fileExists = (path) => virtual.has(normalize(path)) || exists(path);
    host.directoryExists = (path) =>
      [...virtual.keys()].some((key) =>
        key.startsWith(normalize(path) + "/"),
      ) || !!directoryExists?.(path);
    host.getSourceFile = (path, language, onError, newFile) =>
      virtual.has(normalize(path))
        ? createSourceFile(path, virtual.get(normalize(path))!, language, true)
        : get(path, language, onError, newFile);
    const program = createProgram([...virtual.keys()], options, host);
    expect(
      getPreEmitDiagnostics(program).map(
        (d) =>
          (d.file?.fileName ?? "") +
          ":" +
          flattenDiagnosticMessageText(d.messageText, "\n"),
      ),
    ).toEqual([]);
  },
  60000,
);
describe("Work Orders emitted transactional runtime", () => {
  it.each([false, true])(
    "retains corrections and both reports across reassignment/reopen (Prisma double: %s)",
    async (persistent) => {
      const { runtime, command, store } = setup(persistent);
      const created = await command("create");
      const id = created.body.id;
      expect(created).toMatchObject({
        status: 201,
        body: {
          title: "Leak",
          serviceLocation: "Room 1",
          priority: "medium",
          description: null,
          dueDate: null,
          status: "open",
          assigneePrincipalId: null,
          version: 0,
        },
      });
      const values = {
        title: "Pipe leak",
        serviceLocation: "Room 2",
        priority: "high",
        description: "Pipe damaged",
        dueDate: "2026-10-01",
      };
      await command("update", id, {
        expectedVersion: 0,
        reason: "Correct intake",
        values,
      });
      await command("assign", id, {
        expectedVersion: 1,
        assigneePrincipalId: a.principalId,
      });
      await command("start", id, { expectedVersion: 2 }, a);
      await command(
        "update",
        id,
        {
          expectedVersion: 3,
          reason: "Inspection correction",
          values: { ...values, description: null, dueDate: null },
        },
        dispatcher,
        "update-again",
      );
      await command("reassign", id, {
        expectedVersion: 4,
        assigneePrincipalId: b.principalId,
        reason: "Shift change",
      });
      await expect(
        runtime.workOrderRead(a, "work-order", id),
      ).rejects.toMatchObject({
        status: 404,
        body: { code: "work_order.not_found" },
      });
      await expect(
        command("start", id, { expectedVersion: 2 }, a),
      ).rejects.toMatchObject({ status: 404 });
      await command(
        "resolve",
        id,
        { expectedVersion: 5, resolutionNote: "Replaced the leaking pipe" },
        b,
      );
      await command("reopen", id, {
        expectedVersion: 6,
        reason: "Leak persists",
      });
      expect(
        await runtime.workOrderRead(dispatcher, "work-order", id),
      ).toMatchObject({
        version: 7,
        status: "open",
        latestResolution: {
          note: "Replaced the leaking pipe",
          historical: true,
        },
      });
      await command("start", id, { expectedVersion: 7 }, b, "start-again");
      await command(
        "resolve",
        id,
        { expectedVersion: 8, resolutionNote: "Replaced joint and tested" },
        b,
        "resolve-again",
      );
      const history = await runtime.workOrderHistory(b, "work-order", id);
      expect(history.items.map((v: any) => v.orderVersion)).toEqual([
        9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
      ]);
      expect(
        history.items
          .filter((v: any) => v.action === "resolve")
          .map((v: any) => v.note),
      ).toEqual(["Replaced joint and tested", "Replaced the leaking pipe"]);
      expect(
        history.items.find((v: any) => v.orderVersion === 1),
      ).toMatchObject({
        beforeTitle: "Leak",
        afterTitle: "Pipe leak",
        beforeServiceLocation: "Room 1",
        afterServiceLocation: "Room 2",
        beforePriority: "medium",
        afterPriority: "high",
        beforeDescription: null,
        afterDescription: "Pipe damaged",
        beforeDueDate: null,
        afterDueDate: "2026-10-01",
        actorPrincipalId: dispatcher.principalId,
        actorRole: "dispatcher",
        note: "Correct intake",
      });
      expect(await store.listAudit()).toHaveLength(10);
      const duplicate = await command(
        "create",
        undefined,
        { values: initial },
        dispatcher,
        "duplicate",
      );
      const cancelled = await command("cancel", duplicate.body.id, {
        expectedVersion: 0,
        reason: "Duplicate intake",
      });
      expect(cancelled.body).toMatchObject({ status: "cancelled", version: 1 });
      expect(
        await runtime.workOrderRead(
          dispatcher,
          "work-order",
          duplicate.body.id,
        ),
      ).toMatchObject({ latestResolution: null });
    },
  );
});

describe("strict Work Orders envelopes and state rules", () => {
  it.each([
    { title: "" },
    { title: "x".repeat(161) },
    { serviceLocation: "x".repeat(161) },
    { description: "x".repeat(2001) },
    { description: "\u0000" },
    { priority: "urgent" },
    { dueDate: "2026-02-30" },
    { dueDate: "2026-01-01T00:00:00Z" },
    { dueDate: 42 },
    { description: undefined },
    { dueDate: undefined },
    { status: "resolved" },
    { assigneePrincipalId: a.principalId },
    { version: 3 },
    { id: "client-id" },
  ])("rejects malformed create values without writes: %j", async (change) => {
    const { command, store } = setup();
    await expect(
      command("create", undefined, { values: { ...initial, ...change } }),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "work_order.invalid_request" },
    });
    expect(await store.list("work-order")).toEqual([]);
    expect(await store.listAudit()).toEqual([]);
  });
  it.each(["accessor", "inherited", "symbol", "array", "hidden"])(
    "rejects %s payloads without executing getters",
    async (kind) => {
      const { command } = setup();
      let reads = 0;
      const values: any = { ...initial };
      if (kind === "accessor")
        Object.defineProperty(values, "title", {
          enumerable: true,
          get() {
            reads++;
            return "Unsafe";
          },
        });
      if (kind === "inherited")
        Object.setPrototypeOf(values, { title: "Unsafe" });
      if (kind === "symbol") values[Symbol("extra")] = true;
      if (kind === "hidden")
        Object.defineProperty(values, "extra", { value: true });
      await expect(
        command("create", undefined, {
          values: kind === "array" ? [] : values,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(reads).toBe(0);
    },
  );
  it.each([-1, -0, 1.5, 2147483648, NaN, Infinity, "0", null])(
    "rejects version %s before any writes",
    async (version) => {
      const { command, store } = setup();
      const { body } = await command("create");
      await expect(
        command("cancel", body.id, {
          expectedVersion: version,
          reason: "Duplicate",
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toHaveLength(1);
    },
  );
  it("enforces replacement keys, reasons, normalized no-op, bounds, role, assignee eligibility and terminal rules", async () => {
    const { command, store } = setup();
    const { body } = await command("create");
    const id = body.id;
    const invalid = [
      { expectedVersion: 0, reason: "Correct", values: { title: "X" } },
      { expectedVersion: 0, reason: " ", values: initial },
      { expectedVersion: 0, reason: "x".repeat(501), values: initial },
      {
        expectedVersion: 0,
        reason: "No change",
        values: { ...initial, title: "Leak", serviceLocation: "Room 1" },
      },
    ];
    for (const payload of invalid)
      await expect(command("update", id, payload)).rejects.toMatchObject({
        status: 400,
      });
    await expect(
      command("assign", id, {
        expectedVersion: 0,
        assigneePrincipalId: dispatcher.principalId,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      command("assign", id, {
        expectedVersion: 0,
        assigneePrincipalId: "foreign",
      }),
    ).rejects.toMatchObject({ status: 400 });
    for (const operation of [
      "create",
      "update",
      "assign",
      "reassign",
      "reopen",
      "cancel",
    ])
      await expect(
        command(operation, operation === "create" ? undefined : id, {}, a),
      ).rejects.toMatchObject({ status: 403 });
    for (const operation of ["start", "resolve"])
      await expect(
        command(operation, id, {}, dispatcher),
      ).rejects.toMatchObject({ status: 403 });
    await command("assign", id, {
      expectedVersion: 0,
      assigneePrincipalId: a.principalId,
    });
    await expect(
      command(
        "assign",
        id,
        { expectedVersion: 1, assigneePrincipalId: b.principalId },
        dispatcher,
        "assign-again",
      ),
    ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
    await expect(
      command("reassign", id, {
        expectedVersion: 1,
        assigneePrincipalId: a.principalId,
        reason: "Same",
      }),
    ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
    await expect(
      command(
        "resolve",
        id,
        { expectedVersion: 1, resolutionNote: "Not started" },
        a,
      ),
    ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
    const cancelled = await command("cancel", id, {
      expectedVersion: 1,
      reason: "Duplicate",
    });
    for (const [operation, payload, principal] of [
      [
        "update",
        {
          expectedVersion: 2,
          reason: "Change",
          values: { ...initial, title: "New" },
        },
        dispatcher,
      ],
      [
        "assign",
        { expectedVersion: 2, assigneePrincipalId: b.principalId },
        dispatcher,
      ],
      [
        "reassign",
        {
          expectedVersion: 2,
          assigneePrincipalId: b.principalId,
          reason: "Shift",
        },
        dispatcher,
      ],
      ["start", { expectedVersion: 2 }, a],
      ["resolve", { expectedVersion: 2, resolutionNote: "Done" }, a],
      ["reopen", { expectedVersion: 2, reason: "Retry" }, dispatcher],
      ["cancel", { expectedVersion: 2, reason: "Again" }, dispatcher],
    ] as const)
      await expect(
        command(operation, id, payload, principal, "fresh-" + operation),
      ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
    expect(
      await command("cancel", id, { expectedVersion: 1, reason: "Duplicate" }),
    ).toEqual(cancelled);
    expect(await store.listAudit()).toHaveLength(3);
  });
  it("requires explicit reopen before edits and rejects empty/oversized reports", async () => {
    const { command } = setup();
    const { body } = await command("create");
    await command("assign", body.id, {
      expectedVersion: 0,
      assigneePrincipalId: a.principalId,
    });
    await command("start", body.id, { expectedVersion: 1 }, a);
    for (const resolutionNote of [" ", "x".repeat(2001)])
      await expect(
        command("resolve", body.id, { expectedVersion: 2, resolutionNote }, a),
      ).rejects.toMatchObject({ status: 400 });
    await command(
      "resolve",
      body.id,
      { expectedVersion: 2, resolutionNote: "Fixed and tested" },
      a,
    );
    await expect(
      command("update", body.id, {
        expectedVersion: 3,
        reason: "Correction",
        values: { ...initial, title: "New" },
      }),
    ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
    await expect(
      command("reassign", body.id, {
        expectedVersion: 3,
        reason: "Shift",
        assigneePrincipalId: b.principalId,
      }),
    ).rejects.toMatchObject({ body: { code: "work_order.state_conflict" } });
  });
  it("accepts an empty optional description and bounds trimmed required fields", async () => {
    const { command } = setup();
    const result = await command("create", undefined, {
      values: {
        title: " " + "x".repeat(160) + " ",
        serviceLocation: " " + "y".repeat(160) + " ",
        priority: "low",
        description: "  ",
        dueDate: "2028-02-29",
      },
    });
    expect(result.body).toMatchObject({
      title: "x".repeat(160),
      serviceLocation: "y".repeat(160),
      description: "",
      dueDate: "2028-02-29",
    });
  });
});

describe("Work Orders Prisma adapter through transactional delegate double (not PostgreSQL)", () => {
  it.each(["orders.create", "history.create", "audit", "receipt"])(
    "rolls back create at %s",
    async (boundary) => {
      const { command, db } = setup(true);
      db.fail(boundary);
      await expect(command("create")).rejects.toMatchObject({
        status: 500,
        body: { code: "work_order.internal_error" },
      });
      expect(db.snapshot()).toEqual({
        orders: [],
        history: [],
        audit: [],
        effects: [],
        receipts: [],
      });
      db.fail("");
      await command("create");
      expect(db.snapshot().history).toHaveLength(1);
    },
  );
  it.each(["updateMany", "history.create", "audit", "receipt"])(
    "rolls back correction at %s",
    async (boundary) => {
      const { command, db } = setup(true);
      const { body } = await command("create");
      const before = db.snapshot();
      db.fail(boundary);
      await expect(
        command("update", body.id, {
          expectedVersion: 0,
          reason: "Correct",
          values: { ...initial, title: "New" },
        }),
      ).rejects.toMatchObject({ status: 500 });
      expect(db.snapshot()).toEqual(before);
    },
  );
  it.each(["P2002", "P2034"])(
    "bounds %s retries and returns safe exhausted conflict",
    async (code) => {
      const { command, db } = setup(true);
      db.retry(code);
      await expect(command("create")).rejects.toMatchObject({
        status: 409,
        body: { code: "work_order.retryable_conflict" },
      });
      expect(db.attempts()).toBe(4);
      expect(db.snapshot().orders).toEqual([]);
    },
  );
  it("checks assignment before receipt read and after reassignment denies detail/history/exact replay", async () => {
    const { command, db, runtime } = setup(true);
    const { body } = await command("create");
    const id = body.id;
    await command("assign", id, {
      expectedVersion: 0,
      assigneePrincipalId: a.principalId,
    });
    const started = await command("start", id, { expectedVersion: 1 }, a);
    expect(await command("start", id, { expectedVersion: 1 }, a)).toEqual(
      started,
    );
    await command("reassign", id, {
      expectedVersion: 2,
      assigneePrincipalId: b.principalId,
      reason: "Shift",
    });
    const calls = db.calls.length;
    await expect(
      command("start", id, { expectedVersion: 1 }, a),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.calls.slice(calls).map((c) => c.method)).toEqual([
      "orders.findUnique",
    ]);
    await expect(
      runtime.workOrderRead(a, "work-order", id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      runtime.workOrderHistory(a, "work-order", id),
    ).rejects.toMatchObject({ status: 404 });
    expect((await runtime.workOrderList(a, "work-order")).items).toEqual([]);
    await expect(
      runtime.workOrderRead(a, "work-order", "foreign"),
    ).rejects.toMatchObject({
      status: 404,
      body: { code: "work_order.not_found" },
    });
    const resolved = await command(
      "resolve",
      id,
      { expectedVersion: 3, resolutionNote: "Done" },
      b,
    );
    expect(resolved.body).toMatchObject({ status: "resolved", version: 4 });
    expect(db.snapshot().receipts).toHaveLength(5);
  });
  it("replays exact lost-response commands across adapter reconstruction and rejects changed payload keys", async () => {
    const { command, emitted, db } = setup(true);
    const created = await command("create");
    const restarted = new emitted.ApplicationRuntime(
      new (emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore)(
        db.client,
      ),
    );
    expect(
      await restarted.workOrderCommand(
        dispatcher,
        "work-order",
        undefined,
        "create",
        "create",
        {
          values: {
            title: "Leak",
            serviceLocation: "Room 1",
            priority: "medium",
          },
        },
      ),
    ).toEqual(created);
    await expect(
      command("create", undefined, {
        values: { ...initial, title: "Changed" },
      }),
    ).rejects.toMatchObject({
      body: { code: "work_order.idempotency_conflict" },
    });
    expect(db.snapshot().orders).toHaveLength(1);
    expect(db.snapshot().history).toHaveLength(1);
    expect(db.snapshot().audit).toHaveLength(1);
    expect(
      db
        .snapshot()
        .receipts.every(
          (row) =>
            /^sha256:[a-f0-9]{64}$/.test(row.keyDigest) &&
            /^[a-f0-9]{64}$/.test(row.scope),
        ),
    ).toBe(true);
    expect(JSON.stringify(db.snapshot().audit)).not.toContain(
      "fixture-session",
    );
  });
  it("allows one version winner for competing correction/cancel and reassign/resolve commands", async () => {
    const { command, db } = setup(true);
    const { body } = await command("create");
    const results = await Promise.allSettled([
      command("update", body.id, {
        expectedVersion: 0,
        reason: "Correct",
        values: { ...initial, title: "New" },
      }),
      command("cancel", body.id, { expectedVersion: 0, reason: "Duplicate" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(db.snapshot().orders[0].version).toBe(1);
    expect(db.snapshot().history).toHaveLength(2);
    const second = await command(
      "create",
      undefined,
      { values: initial },
      dispatcher,
      "second",
    );
    await command("assign", second.body.id, {
      expectedVersion: 0,
      assigneePrincipalId: a.principalId,
    });
    await command("start", second.body.id, { expectedVersion: 1 }, a);
    const race = await Promise.allSettled([
      command("reassign", second.body.id, {
        expectedVersion: 2,
        reason: "Shift",
        assigneePrincipalId: b.principalId,
      }),
      command(
        "resolve",
        second.body.id,
        { expectedVersion: 2, resolutionNote: "Fixed" },
        a,
      ),
    ]);
    expect(race.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(db.snapshot().orders[1].version).toBe(3);
    expect(
      db.snapshot().history.filter((row) => row.workOrderId === second.body.id),
    ).toHaveLength(4);
  });
  it("rejects maximum version without writes", async () => {
    const { command, db } = setup(true);
    const { body } = await command("create");
    db.corrupt({ version: 2147483647 });
    const before = db.snapshot();
    await expect(
      command("cancel", body.id, {
        expectedVersion: 2147483647,
        reason: "Duplicate",
      }),
    ).rejects.toMatchObject({ body: { code: "work_order.version_exhausted" } });
    expect(db.snapshot()).toEqual(before);
  });
});

describe("bounded reads and generated controller boundary", () => {
  it.each(["health", "audit", "capability-events"])(
    "does not shadow admitted order entity %s with generic routes",
    async (entity) => {
      const db = workOrdersPrismaHarness();
      const accessor = entity.replace(/-([a-z])/g, (_all, char: string) =>
        char.toUpperCase(),
      );
      Object.defineProperty(db.client, accessor, {
        get: () => db.client.workOrder,
      });
      const emitted = loadWorkOrdersRuntime(
        db.client,
        renamedWorkOrdersInput(entity),
      );
      const controller = new (emitted.load(
        "api/src/main.ts",
      ).GeneratedController)();
      const request = {
        headers: { "x-factory-fixture-session": dispatcher.sessionId },
      };
      expect(
        await controller[
          entity === "capability-events" ? "capabilityEvents" : entity
        ](request),
      ).toEqual({ items: [], nextAfterId: null });
      if (entity === "health")
        expect(await controller.health({ headers: {} })).toEqual({
          status: "ok",
        });
    },
  );
  it("rejects expired fixture sessions through the emitted package resolver", async () => {
    const emitted = loadWorkOrdersRuntime(
      undefined,
      undefined,
      false,
      (_path, source) =>
        source.replaceAll(
          "2026-01-01T00:00:00.000Z",
          "2100-01-01T00:00:00.000Z",
        ),
    );
    const controller = new (emitted.load(
      "api/src/main.ts",
    ).GeneratedController)();
    await expect(
      controller.list("work-order", {
        headers: { "x-factory-fixture-session": dispatcher.sessionId },
      }),
    ).rejects.toMatchObject({
      status: 403,
      body: { code: "work_order.forbidden" },
    });
  });
  it.each([false, true])(
    "filters current assignee before status/cursors/pagination (Prisma double: %s)",
    async (persistent) => {
      const { command, runtime } = setup(persistent);
      const ids = [];
      for (let i = 0; i < 4; i++) {
        const result = await command(
          "create",
          undefined,
          { values: initial },
          dispatcher,
          "create-" + i,
        );
        ids.push(result.body.id);
        await command("assign", result.body.id, {
          expectedVersion: 0,
          assigneePrincipalId:
            i === 1 || i === 3 ? a.principalId : b.principalId,
        });
      }
      const first = await runtime.workOrderList(a, "work-order", "limit=1");
      expect(first).toMatchObject({
        items: [{ id: ids[1] }],
        nextAfterId: ids[1],
      });
      expect(
        await runtime.workOrderList(
          a,
          "work-order",
          "limit=1&afterId=" + ids[1],
        ),
      ).toMatchObject({ items: [{ id: ids[3] }], nextAfterId: null });
      expect(
        (
          await runtime.workOrderList(
            a,
            "work-order",
            "assigneePrincipalId=" + b.principalId,
          )
        ).items,
      ).toEqual([]);
      expect(
        (await runtime.workOrderList(a, "work-order", "status=resolved")).items,
      ).toEqual([]);
      const history = await runtime.workOrderHistory(
        a,
        "work-order",
        ids[1],
        "limit=1",
      );
      expect(history).toMatchObject({
        items: [{ orderVersion: 1 }],
        nextBeforeVersion: 1,
      });
      expect(
        await runtime.workOrderHistory(
          a,
          "work-order",
          ids[1],
          "limit=1&beforeVersion=1",
        ),
      ).toMatchObject({
        items: [{ orderVersion: 0 }],
        nextBeforeVersion: null,
      });
    },
  );
  it.each([
    "limit=0",
    "limit=51",
    "limit=1&limit=2",
    "status=unknown",
    "afterId=",
    "x=1",
    "q=leak",
    "beforeVersion=1",
    "status=%xx",
  ])("rejects list query %s", async (query) => {
    const { runtime } = setup();
    await expect(
      runtime.workOrderList(dispatcher, "work-order", query),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("denies generic identity/history/audit/capability access and technician roster", async () => {
    const { runtime } = setup();
    for (const entity of [
      "work-order-history",
      "work-orders-fixture-principal",
      "work-orders-fixture-session",
      "audit",
      "capability-events",
      "foreign",
    ]) {
      await expect(
        runtime.workOrderList(dispatcher, entity),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        runtime.workOrderCommand(
          dispatcher,
          entity,
          undefined,
          "create",
          "key",
          { values: initial },
        ),
      ).rejects.toMatchObject({ status: 403 });
    }
    for (const invoke of [
      () => runtime.list("dispatcher", "work-order"),
      () => runtime.read("dispatcher", "work-order", "x"),
      () => runtime.create("dispatcher", "work-order", {}),
      () => runtime.transition("dispatcher", "work-order", "x", "start"),
      () => runtime.auditLog("dispatcher"),
      () => runtime.capabilityEvents("dispatcher"),
      () => runtime.workOrderAssignees(a),
    ])
      await expect(invoke()).rejects.toMatchObject({ status: 403 });
    expect(await runtime.workOrderAssignees(dispatcher)).toEqual([
      { principalId: a.principalId, displayName: "Technician A" },
      { principalId: b.principalId, displayName: "Technician B" },
    ]);
  });
  it("uses resolved fixture principals at the actual emitted controller and denies forged/missing sessions", async () => {
    const { emitted, db } = setup(true);
    const { GeneratedController } = emitted.load("api/src/main.ts");
    const controller = new GeneratedController();
    const request = (session: string, headers = {}) => ({
      headers: {
        "x-factory-fixture-session": session,
        "x-factory-idempotency-key": "create",
        ...headers,
      },
    });
    const created = await controller.create(
      "work-order",
      { values: initial },
      request(dispatcher.sessionId),
    );
    expect(created).toMatchObject({ version: 0, status: "open" });
    expect(db.snapshot().orders).toHaveLength(1);
    for (const headers of [
      { "x-factory-role": "dispatcher" },
      { "x-factory-principal-id": dispatcher.principalId },
      { "x-factory-tenant-id": "tenant-local" },
    ])
      await expect(
        controller.list("work-order", request(a.sessionId, headers)),
      ).rejects.toMatchObject({
        status: 403,
        body: { code: "work_order.forbidden" },
      });
    for (const session of ["", "unknown", "fixture-session-technician"])
      await expect(
        controller.list("work-order", request(session)),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      controller.assignees(request(a.sessionId)),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await controller.assignees(request(dispatcher.sessionId)),
    ).toHaveLength(2);
    expect(
      emitted.routes
        .filter((route: any) => route.method !== "Get")
        .map((route: any) => route.path),
    ).toEqual([":entity", ":entity/:recordId/events/:command"]);
    expect(
      emitted.routes.findIndex(
        (route: any) => route.path === "work-order-assignees",
      ),
    ).toBeLessThan(
      emitted.routes.findIndex((route: any) => route.path === ":entity"),
    );
  });
  it.each([
    { ...a, expiresAt: "2025-01-01T00:00:00.000Z" },
    { ...a, tenantId: "foreign" },
    { ...a, principalId: b.principalId },
    { ...a, roles: ["dispatcher"] },
    { ...a, sessionId: "unknown" },
  ])("rejects changed principal context", async (principal) => {
    const { runtime } = setup();
    await expect(
      runtime.workOrderList(principal, "work-order"),
    ).rejects.toMatchObject({ status: 403 });
  });
});
it("retries rolled-back staged writes without duplicate history or receipts", async () => {
  const { command, db } = setup(true);
  db.fail("receipt", "P2034", 1);
  await command("create");
  expect(db.attempts()).toBe(2);
  expect(db.snapshot().orders).toHaveLength(1);
  expect(db.snapshot().history).toHaveLength(1);
  expect(db.snapshot().audit).toHaveLength(1);
  expect(db.snapshot().receipts).toHaveLength(1);
});
it("rechecks assignment on serializable retry after an intervening reassignment", async () => {
  const { command, db } = setup(true);
  const { body } = await command("create");
  await command("assign", body.id, {
    expectedVersion: 0,
    assigneePrincipalId: a.principalId,
  });
  await command("start", body.id, { expectedVersion: 1 }, a);
  const original = db.client.$transaction;
  let intervened = false;
  db.client.$transaction = async (operation: any, options: any) => {
    try {
      return await original(operation, options);
    } catch (error) {
      if ((error as any).code === "P2034" && !intervened) {
        intervened = true;
        await command("reassign", body.id, {
          expectedVersion: 2,
          assigneePrincipalId: b.principalId,
          reason: "Concurrent shift change",
        });
      }
      throw error;
    }
  };
  db.fail("receipt", "P2034", 1);
  await expect(
    command(
      "resolve",
      body.id,
      { expectedVersion: 2, resolutionNote: "Old worker report" },
      a,
    ),
  ).rejects.toMatchObject({ status: 404 });
  expect(db.snapshot().history.map((row) => row.action)).toEqual([
    "create",
    "assign",
    "start",
    "reassign",
  ]);
  expect(db.snapshot().orders[0]).toMatchObject({
    version: 3,
    status: "in-progress",
    assigneePrincipalId: b.principalId,
  });
});
it("forwards session/key/query at the emitted web proxy and rejects browser overrides locally", async () => {
  const { emitted } = setup();
  const proxy = emitted.load("web/app/api/[...path]/route.ts");
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = async (input: any, init: any) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify({ id: "server-record", version: 0 }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const response = await proxy.POST(
      new Request("http://fixture.local/api/work-order?limit=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-factory-fixture-session": dispatcher.sessionId,
          "x-factory-idempotency-key": "exact-key",
        },
        body: JSON.stringify({ values: initial }),
      }),
      { params: Promise.resolve({ path: ["work-order"] }) },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "server-record", version: 0 });
    expect(calls).toHaveLength(1);
    expect(
      new URL(calls[0].input).pathname + new URL(calls[0].input).search,
    ).toBe("/api/work-order?limit=1");
    expect(calls[0].init.headers).toMatchObject({
      "x-factory-fixture-session": dispatcher.sessionId,
      "x-factory-idempotency-key": "exact-key",
    });
    const denied = await proxy.GET(
      new Request("http://fixture.local/api/work-order", {
        headers: { "x-factory-role": "dispatcher" },
      }),
      { params: Promise.resolve({ path: ["work-order"] }) },
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ code: "work_order.forbidden" });
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = original;
  }
});
it("retains the unique history coordinate in both Prisma schema and initial migration", () => {
  const { emitted } = setup();
  const schema = emitted.files.find(
    (file: any) => file.path === "api/prisma/schema.prisma",
  )!.content;
  const migration = emitted.files.find((file: any) =>
    file.path.endsWith("/migration.sql"),
  )!.content;
  expect(schema).toContain(
    '@@unique([workOrderId, orderVersion], map: "WorkOrderHistory_0_idx")',
  );
  expect(migration).toContain(
    'CREATE UNIQUE INDEX "WorkOrderHistory_0_idx" ON "WorkOrderHistory" ("workOrderId", "orderVersion")',
  );
  expect(migration).toContain('"version" BETWEEN 0 AND 2147483647');
});
it.each(
  [52, 64, 128].flatMap((length) => [
    {
      name: `order-${length}`,
      order: "service-" + "a".repeat(length - 8),
      history: "work-order-history",
    },
    {
      name: `history-${length}`,
      order: "work-order",
      history: "service-" + "b".repeat(length - 8),
    },
    {
      name: `both-${length}`,
      order: "service-" + "a".repeat(length - 8),
      history: "service-" + "b".repeat(length - 8),
    },
  ]),
)("preserves allocated SQL identifiers for $name", ({ order, history }) => {
  const input = renamedWorkOrdersInput(order, history);
  const compilation = buildCompilationInput({
    ...input,
    publishedRevisionId: "work-orders-sql-identifiers",
  });
  const base = databaseTargetPlugin.render(
    databaseTargetPlugin.plan(compilation),
  );
  const baseSchema = base.find((file) =>
    file.path.endsWith("/schema.prisma"),
  )!.content;
  const baseMigration = base.find((file) =>
    file.path.endsWith("/migration.sql"),
  )!.content;
  const files = loadWorkOrdersRuntime(undefined, input).files;
  const schema = files.find(
    (file) => file.path === "api/prisma/schema.prisma",
  )!.content;
  const migration = files.find((file) =>
    file.path.endsWith("/migration.sql"),
  )!.content;
  const models = [...baseSchema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)];
  const orderModel = models.find((model) =>
    model[2]!.includes("  serviceLocation String"),
  )!;
  const historyModel = models.find((model) =>
    model[2]!.includes("  orderVersion Int"),
  )!;
  const table = (model: RegExpMatchArray) =>
    /@@map\("([^"]+)"\)/.exec(model[2]!)?.[1] ?? model[1]!;
  const unique = [
    ...baseMigration.matchAll(
      /^CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)" \("workOrderId", "orderVersion"\);$/gm,
    ),
  ];
  expect(unique).toHaveLength(1);
  expect(unique[0]![2]).toBe(table(historyModel));
  expect(schema).toContain(
    `@@unique([workOrderId, orderVersion], map: "${unique[0]![1]}")`,
  );
  expect(schema).not.toContain("@@index([workOrderId, orderVersion]");
  const version =
    '  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" BETWEEN 0 AND 2147483647),\n';
  expect(migration).toContain(
    `CREATE TABLE "${table(orderModel)}" (\n${version}`,
  );
  expect(migration.split(version)).toHaveLength(2);
  expect(
    migration
      .split('\nCREATE TABLE "Factory_WorkOrderMutationReceipt"')[0]!
      .replace(version, ""),
  ).toBe(baseMigration);
  for (const model of models) {
    const emitted = new RegExp(
      `^model ${model[1]} \\{\\n([\\s\\S]*?)^\\}`,
      "m",
    ).exec(schema)![1]!;
    expect(emitted.includes("version Int @default(0)")).toBe(
      model === orderModel,
    );
    const mapping = /@@map\("[^"]+"\)/.exec(model[2]!);
    if (mapping) expect(emitted).toContain(mapping[0]);
  }
});

it.each([
  "missing-schema",
  "duplicate-model",
  "duplicate-index",
  "wrong-table",
  "wrong-index-map",
])("rejects inconsistent private database coordinates: %s", (fault) => {
  const input = renamedWorkOrdersInput("work-order");
  const profile = selectServiceWorkOrdersProfile(
    input.graph,
    input.compositionLock,
  )!;
  const compilation = buildCompilationInput({
    ...input,
    publishedRevisionId: "work-orders-sql-invalid",
  });
  const files = databaseTargetPlugin.render(
    databaseTargetPlugin.plan(compilation),
  );
  const schema = files.find(
    (file) => file.path === "api/prisma/schema.prisma",
  )!.content;
  const broken = files
    .filter(
      (file) =>
        fault !== "missing-schema" || file.path !== "api/prisma/schema.prisma",
    )
    .map((file) => {
      let content = file.content;
      if (file.path === "api/prisma/schema.prisma") {
        if (fault === "duplicate-model") content += "\nmodel WorkOrder {\n}\n";
        if (fault === "wrong-index-map")
          content = content.replace(
            "@@index([workOrderId, orderVersion])",
            '@@index([workOrderId, orderVersion], map: "wrong")',
          );
      }
      if (file.path.endsWith("/migration.sql")) {
        const line = content
          .split("\n")
          .find((line) =>
            line.startsWith('CREATE UNIQUE INDEX "WorkOrderHistory_0_idx"'),
          )!;
        if (fault === "duplicate-index") content += "\n" + line;
        if (fault === "wrong-table")
          content = content.replace(
            line,
            line.replace('ON "WorkOrderHistory"', 'ON "WorkOrder"'),
          );
      }
      return { ...file, content };
    });
  expect(() =>
    renderServiceWorkOrdersFile(
      "api/prisma/schema.prisma",
      schema,
      profile,
      [dispatcher, a, b],
      broken,
    ),
  ).toThrow(/Work Orders (database coordinate|history storage coordinates)/);
});

it.each(workOrdersRoleCases)(
  "keeps fixed fixture identity and Graph-bound history for $name roles",
  async ({ dispatcher: dispatchRole, technician }) => {
    const emitted = loadWorkOrdersRuntime(
      undefined,
      roleWorkOrdersInput(dispatchRole, technician),
    );
    const { resolvePrincipalContext } = emitted.load("api/src/main.ts");
    const [dispatch, techA, techB] = [
      "dispatcher",
      "technician-a",
      "technician-b",
    ].map((slot) =>
      resolvePrincipalContext({
        headers: { "x-factory-fixture-session": "fixture-session-" + slot },
      }),
    );
    const runtime = new emitted.ApplicationRuntime(
      new emitted.InMemoryRecordStore(),
    );
    expect(await runtime.workOrderAssignees(dispatch)).toEqual([
      {
        principalId: "fixture-principal-technician-a",
        displayName: "Technician A",
      },
      {
        principalId: "fixture-principal-technician-b",
        displayName: "Technician B",
      },
    ]);
    const command = (
      who: any,
      operation: string,
      id?: string,
      body: unknown = { values: initial },
    ) =>
      runtime.workOrderCommand(
        who,
        "work-order",
        id,
        operation,
        operation,
        body,
      );
    await expect(command(techA, "create")).rejects.toMatchObject({
      status: 403,
    });
    const created = await command(dispatch, "create");
    expect(created.status).toBe(201);
    const id = created.body.id;
    for (const [who, operation, body] of [
      [
        dispatch,
        "assign",
        {
          expectedVersion: 0,
          assigneePrincipalId: "fixture-principal-technician-a",
        },
      ],
      [techA, "start", { expectedVersion: 1 }],
      [
        dispatch,
        "reassign",
        {
          expectedVersion: 2,
          assigneePrincipalId: "fixture-principal-technician-b",
          reason: "Shift change",
        },
      ],
    ] as const)
      expect((await command(who, operation, id, body)).status).toBe(200);
    await expect(
      runtime.workOrderRead(techA, "work-order", id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      runtime.workOrderHistory(techA, "work-order", id),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      command(techA, "start", id, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ status: 404 });
    expect(
      (
        await command(techB, "resolve", id, {
          expectedVersion: 3,
          resolutionNote: "Repair verified",
        })
      ).status,
    ).toBe(200);
    const history = await runtime.workOrderHistory(dispatch, "work-order", id);
    expect(
      history.items.map((event: any) => [
        event.action,
        event.actorPrincipalId,
        event.actorRole,
      ]),
    ).toEqual([
      ["resolve", "fixture-principal-technician-b", technician],
      ["reassign", "fixture-principal-dispatcher", dispatchRole],
      ["start", "fixture-principal-technician-a", technician],
      ["assign", "fixture-principal-dispatcher", dispatchRole],
      ["create", "fixture-principal-dispatcher", dispatchRole],
    ]);
    for (const forged of [
      { ...techA, roles: [dispatchRole] },
      { ...techA, principalId: techB.principalId },
      { ...techA, tenantId: "foreign" },
      { ...techA, expiresAt: "2025-01-01T00:00:00.000Z" },
    ])
      await expect(
        runtime.workOrderList(forged, "work-order"),
      ).rejects.toMatchObject({ status: 403 });
    for (const session of ["unknown", "s".repeat(65)])
      expect(() =>
        resolvePrincipalContext({
          headers: { "x-factory-fixture-session": session },
        }),
      ).toThrow();
  },
);
