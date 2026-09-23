import { createRequire } from "node:module";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import {
  createProgram,
  getPreEmitDiagnostics,
  flattenDiagnosticMessageText,
  ModuleKind,
  ScriptTarget,
} from "typescript";
import { describe, expect, it } from "vitest";
import {
  loadInventoryRuntime,
  renamedInventoryInput,
  inventoryPrismaHarness,
} from "./fixtures/inventory-operations-runtime.js";

function setup(persistent = false) {
  const db = inventoryPrismaHarness();
  const emitted = loadInventoryRuntime(db.client);
  const store = persistent
    ? new (emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore)(
        db.client,
      )
    : new emitted.InMemoryRecordStore();
  const runtime = new emitted.ApplicationRuntime(store);
  const command = (
    operation: string,
    id?: string,
    body: unknown = { values: { sku: " a-1 ", name: " Item " } },
    key = operation,
    role = "stockkeeper",
    actor = "test-session",
  ) =>
    runtime.inventoryCommand(
      role,
      actor,
      "stock-item",
      id,
      operation,
      key,
      body,
    );
  return { emitted, store, runtime, command, db };
}

describe("Inventory emitted runtime", () => {
  it("starts empty and records receive, issue and linked correction atomically", async () => {
    const { runtime, store, command } = setup();
    expect(
      (await runtime.inventoryList("observer", "stock-item")).records,
    ).toEqual([]);
    const created = await command("create");
    expect(created).toMatchObject({
      status: 201,
      body: { sku: "A-1", name: "Item", quantity: 0, unit: "each", version: 0 },
    });
    const id = created.body.id;
    const received = await command("receive", id, {
      expectedVersion: 0,
      quantity: 10,
      reason: "Delivery",
    });
    const issued = await command("issue", id, {
      expectedVersion: 1,
      quantity: 3,
      reason: "Used",
    });
    const corrected = await command("adjust", id, {
      expectedVersion: 2,
      delta: -1,
      reason: "Count correction",
      correctionOf: received.body.movement.id,
    });
    expect(corrected.body.item).toMatchObject({ quantity: 6, version: 3 });
    expect(issued.body.movement).toMatchObject({
      stockItem: id,
      delta: -3,
      beforeQuantity: 10,
      afterQuantity: 7,
      itemVersion: 2,
      status: "recorded",
      actorRole: "stockkeeper",
    });
    expect(
      (
        await runtime.inventoryHistory("stockkeeper", "stock-item", id)
      ).records.map((r: any) => r.itemVersion),
    ).toEqual([3, 2, 1]);
    expect(await store.listCapabilityEvents()).toHaveLength(3);
    expect(
      await command("receive", id, {
        expectedVersion: 0,
        quantity: 10,
        reason: "Delivery",
      }),
    ).toEqual(received);
    expect(await store.listCapabilityEvents()).toHaveLength(3);
  });
});

it("typechecks the complete emitted API and actual native Prisma adapter", () => {
  const {
    emitted: { files },
  } = setup();
  const directory = mkdtempSync(
    join(tmpdir(), "archeform-inventory-typecheck-"),
  );
  try {
    symlinkSync(
      fileURLToPath(
        new URL("../../../apps/control-plane/node_modules", import.meta.url),
      ),
      join(directory, "node_modules"),
      "junction",
    );
    const paths: string[] = [];
    for (const file of files.filter(
      (file: any) =>
        file.path.startsWith("api/src/") && file.path.endsWith(".ts"),
    )) {
      const path = join(directory, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content);
      paths.push(path);
    }
    const program = createProgram(paths, {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ScriptTarget.ES2022,
      module: ModuleKind.NodeNext,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      types: ["node"],
      typeRoots: [
        fileURLToPath(new URL("../../../node_modules/@types", import.meta.url)),
      ],
      baseUrl: directory,
      paths: {
        xstate: [
          fileURLToPath(new URL("../node_modules/xstate", import.meta.url)),
        ],
        casbin: [
          fileURLToPath(new URL("../node_modules/casbin", import.meta.url)),
        ],
      },
    });
    expect(
      getPreEmitDiagnostics(program).map((diagnostic) =>
        flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
    ).toEqual([]);
  } finally {
    if (
      dirname(resolve(directory)) === resolve(tmpdir()) &&
      basename(directory).startsWith("archeform-inventory-typecheck-")
    )
      rmSync(directory, { recursive: true, force: true });
  }
}, 60000);
it("emits Inventory persistence invariants and proxy header forwarding", () => {
  const {
    emitted: { files },
  } = setup();
  const schema = files.find(
    (f: any) => f.path === "api/prisma/schema.prisma",
  )!.content;
  expect(schema).toMatch(/model StockItem \{[^]*?version Int @default\(0\)/);
  expect(schema).toContain(
    '@@unique([stockItemId, itemVersion], map: "StockMovement_1_idx")',
  );
  const sql = files.find((f: any) => f.path.endsWith("migration.sql"))!.content;
  expect(sql).toContain('"quantity" BETWEEN 0 AND 1000000000');
  expect(sql).toContain('"delta" <> 0');
  expect(sql).toContain('"version" BETWEEN 0 AND 2147483647');
  expect(
    files.find((f: any) => f.path === "web/app/api/[...path]/route.ts")!
      .content,
  ).toContain("request.headers.get('x-factory-idempotency-key')");
});
describe("Inventory command validation and authority", () => {
  it.each([
    undefined,
    null,
    [],
    {},
    { values: { sku: "A", name: "A" }, extra: 1 },
    { values: { sku: "A", name: "A", quantity: 10 } },
    { values: { sku: "Ü", name: "A" } },
    { values: { sku: "A", name: "\u0000" } },
  ])("rejects malformed create without effects: %j", async (body) => {
    const { runtime, db } = setup(true);
    await expect(
      runtime.inventoryCommand(
        "stockkeeper",
        "test-session",
        "stock-item",
        undefined,
        "create",
        "malformed",
        body,
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "inventory.invalid_request" },
    });
    expect(db.snapshot().receipts).toEqual([]);
    expect(db.snapshot().items).toEqual([]);
  });
  it("rejects inherited values, accessors, symbols and toJSON without executing user code", async () => {
    const { command } = setup();
    let called = false;
    const hostile = () => {
      called = true;
      throw Error("never");
    };
    for (const body of [
      Object.create({ values: { sku: "A", name: "A" } }),
      {
        get values() {
          return hostile();
        },
      },
      { values: { sku: "A", name: "A", toJSON: hostile } },
      { values: { sku: "A", name: "A" }, [Symbol("extra")]: 1 },
    ])
      await expect(command("create", undefined, body)).rejects.toMatchObject({
        status: 400,
      });
    expect(called).toBe(false);
  });
  it.each([0, -0, -1, 1.2, "1", true, null, NaN, Infinity, 1000000001])(
    "rejects invalid quantity %s",
    async (quantity) => {
      const { command } = setup();
      const { body: item } = await command("create");
      await expect(
        command("receive", item.id, {
          expectedVersion: 0,
          quantity,
          reason: "R",
        }),
      ).rejects.toMatchObject({
        status: 400,
        body: { code: "inventory.invalid_request" },
      });
    },
  );
  it("rejects invalid versions, corrections, body authority and idempotency headers", async () => {
    const { command } = setup();
    const { body: item } = await command("create");
    for (const expectedVersion of [-0, -1, 2147483647, 1.2, "0", null])
      await expect(
        command("receive", item.id, {
          expectedVersion,
          quantity: 1,
          reason: "R",
        }),
      ).rejects.toMatchObject({ status: 400 });
    for (const body of [
      { expectedVersion: 0, delta: 0, reason: "R", correctionOf: null },
      { expectedVersion: 0, delta: 1, reason: "R" },
      { expectedVersion: 0, quantity: 1, reason: "R", actorRole: "observer" },
    ])
      await expect(command("adjust", item.id, body)).rejects.toMatchObject({
        status: 400,
      });
    for (const key of ["", "bad key", "x".repeat(129)])
      await expect(
        command(
          "receive",
          item.id,
          { expectedVersion: 0, quantity: 1, reason: "R" },
          key,
        ),
      ).rejects.toMatchObject({ status: 400 });
  });
  it("authorizes before receipt and existence disclosure and denies generic mutation/history routes", async () => {
    const { command, runtime, db } = setup(true);
    for (const role of ["observer", "anonymous"])
      await expect(
        command(
          "receive",
          "absent",
          { expectedVersion: 0, quantity: 1, reason: "R" },
          "key",
          role,
        ),
      ).rejects.toMatchObject({ status: 403 });
    expect(db.attempts()).toBe(0);
    await expect(
      runtime.inventoryHistory("observer", "stock-item", "absent"),
    ).rejects.toMatchObject({ status: 403 });
    for (const method of ["list", "read", "create", "transition"])
      await expect(
        runtime[method](
          "stockkeeper",
          "stock-movement",
          "absent",
          "submit",
          {},
        ),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      runtime.create("stockkeeper", "stock-item", { sku: "B", name: "B" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(runtime.auditLog("stockkeeper")).rejects.toMatchObject({
      status: 403,
    });
    await expect(runtime.capabilityEvents("stockkeeper")).rejects.toMatchObject(
      { status: 403 },
    );
  });
});
describe("Inventory persistence semantics", () => {
  it("preserves exact restart replay, normalizes input and isolates receipt scope", async () => {
    const { command, db, emitted } = setup(true);
    const created = await command("create");
    expect(
      await command("create", undefined, {
        values: { sku: "A-1", name: "Item" },
      }),
    ).toEqual(created);
    const restarted = new emitted.ApplicationRuntime(
      new (emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore)(
        db.client,
      ),
    );
    expect(
      await restarted.inventoryCommand(
        "stockkeeper",
        "test-session",
        "stock-item",
        undefined,
        "create",
        "create",
        { values: { sku: "A-1", name: "Item" } },
      ),
    ).toEqual(created);
    await expect(
      command("create", undefined, { values: { sku: "B", name: "B" } }),
    ).rejects.toMatchObject({
      body: { code: "inventory.idempotency_conflict" },
    });
    const second = await command(
      "create",
      undefined,
      { values: { sku: "B", name: "B" } },
      "create",
      "stockkeeper",
      "second-session",
    );
    expect(second.body.id).not.toBe(created.body.id);
    expect(
      db
        .snapshot()
        .receipts.every(
          (row) =>
            /^sha256:[a-f0-9]{64}$/.test(row.keyDigest) &&
            /^[a-f0-9]{64}$/.test(row.scope),
        ),
    ).toBe(true);
    expect(JSON.stringify(created)).not.toContain("receipt");
  });
  it("enforces SKU uniqueness and corrects only item name with one version and no movement", async () => {
    const { command, db } = setup(true);
    const { body: item } = await command("create");
    await expect(
      command(
        "create",
        undefined,
        { values: { sku: "a-1", name: "Duplicate" } },
        "duplicate",
      ),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: "inventory.sku_conflict" },
    });
    const result = await command("update", item.id, {
      expectedVersion: 0,
      values: { name: " New name " },
    });
    expect(result).toMatchObject({
      status: 200,
      body: { ...item, name: "New name", version: 1 },
    });
    expect(db.snapshot().movements).toHaveLength(0);
    expect(db.snapshot().audit).toHaveLength(2);
    await expect(
      command(
        "update",
        item.id,
        { expectedVersion: 1, values: { name: "X", sku: "X" } },
        "bad",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("guards balance/version limits and rejects cross-item correction links", async () => {
    const { command, db } = setup(true);
    const { body: item } = await command("create");
    await expect(
      command("issue", item.id, {
        expectedVersion: 0,
        quantity: 1,
        reason: "R",
      }),
    ).rejects.toMatchObject({ body: { code: "inventory.insufficient_stock" } });
    const received = await command("receive", item.id, {
      expectedVersion: 0,
      quantity: 1000000000,
      reason: "R",
    });
    await expect(
      command(
        "receive",
        item.id,
        { expectedVersion: 1, quantity: 1, reason: "R" },
        "overflow",
      ),
    ).rejects.toMatchObject({ body: { code: "inventory.quantity_limit" } });
    const { body: other } = await command(
      "create",
      undefined,
      { values: { sku: "B", name: "B" } },
      "other",
    );
    await expect(
      command("adjust", other.id, {
        expectedVersion: 0,
        delta: 1,
        reason: "R",
        correctionOf: received.body.movement.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
    db.corrupt({ version: 2147483647 });
    await expect(
      command("update", item.id, {
        expectedVersion: 2147483646,
        values: { name: "X" },
      }),
    ).rejects.toMatchObject({ body: { code: "inventory.version_limit" } });
    db.corrupt({ quantity: NaN, version: 0 });
    await expect(
      command(
        "receive",
        item.id,
        { expectedVersion: 0, quantity: 1, reason: "R" },
        "corrupt",
      ),
    ).rejects.toMatchObject({ status: 500 });
  });
  it("uses serializable quantity-and-version CAS and gives one same-version winner", async () => {
    const { command, db } = setup(true);
    const { body: item } = await command("create");
    const results = await Promise.allSettled(
      ["a", "b"].map((key) =>
        command(
          "receive",
          item.id,
          { expectedVersion: 0, quantity: 1, reason: "R" },
          key,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.body.code,
    ).toBe("inventory.version_conflict");
    expect(
      db.calls.find((call) => call.method === "items.updateMany")?.input.where,
    ).toEqual({ id: item.id, quantity: 0, version: 0 });
  });
  it.each(["items.create", "audit", "receipt"])(
    "rolls back creation at %s",
    async (boundary) => {
      const { command, db } = setup(true);
      db.fail(boundary);
      await expect(command("create")).rejects.toMatchObject({
        status: 500,
        body: { code: "inventory.internal_error" },
      });
      expect(db.snapshot()).toEqual({
        items: [],
        movements: [],
        audit: [],
        effects: [],
        receipts: [],
      });
    },
  );
  it.each(["updateMany", "movements.create", "audit", "effect", "receipt"])(
    "rolls back item/movement/audit/effect/receipt at %s",
    async (boundary) => {
      const { command, db } = setup(true);
      const { body: item } = await command("create");
      const before = db.snapshot();
      db.fail(boundary);
      await expect(
        command("receive", item.id, {
          expectedVersion: 0,
          quantity: 1,
          reason: "R",
        }),
      ).rejects.toMatchObject({ status: 500 });
      expect(db.snapshot()).toEqual(before);
    },
  );
  it.each(["P2034", "P2002"])(
    "makes three retries after the initial %s failure then returns a safe conflict",
    async (code) => {
      const { command, db } = setup(true);
      db.retry(code);
      await expect(command("create")).rejects.toMatchObject({
        status: 409,
        body: { code: "inventory.retry_required" },
      });
      expect(db.attempts()).toBe(4);
    },
  );
  it("bounds literal list and movement history with explicit projections", async () => {
    const { command, runtime, db } = setup(true);
    const { body: item } = await command("create", undefined, {
      values: { sku: "A", name: "Literal %_\\ name" },
    });
    await command(
      "create",
      undefined,
      { values: { sku: "B", name: "Near xxx name" } },
      "second",
    );
    await command("receive", item.id, {
      expectedVersion: 0,
      quantity: 2,
      reason: "R",
    });
    const page = await runtime.inventoryList(
      "observer",
      "stock-item",
      "q=" + encodeURIComponent("%_\\") + "&limit=1",
    );
    expect(page.records).toEqual([expect.objectContaining({ id: item.id })]);
    expect(page.hasMore).toBe(false);
    expect(Object.keys(page.records[0]).sort()).toEqual(
      ["id", "sku", "name", "unit", "quantity", "version"].sort(),
    );
    const query = db.calls.find((c) => c.method === "items.findMany")!.input;
    expect(query.take).toBe(2);
    expect(query.where.OR[0].sku.contains).toBe("\\%\\_\\\\");
    expect(query.orderBy).toEqual([{ sku: "asc" }, { id: "asc" }]);
    expect(
      (
        await runtime.inventoryHistory(
          "stockkeeper",
          "stock-item",
          item.id,
          "limit=1",
        )
      ).records[0],
    ).not.toHaveProperty("stockItemId");
  });
  it.each([
    "limit=0",
    "offset=-1",
    "limit=1.0",
    "offset=01",
    "limit=51",
    "offset=10001",
    "q=a&q=b",
    "foo=x",
    "q=%GG",
    "q=%C0%AF",
    "limit=1&limit=1",
  ])("rejects malformed bounded query %s", async (query) => {
    const { runtime } = setup();
    await expect(
      runtime.inventoryList("observer", "stock-item", query),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("uses server-resolved controller actors, denies raw-role authority and forwards safe errors", async () => {
    const { emitted, db } = setup(true);
    const controller = new (emitted.load(
      "api/src/main.ts",
    ).GeneratedController)();
    const request = (role = "stockkeeper", key = "controller") => ({
      headers: {
        "x-factory-fixture-session": "fixture-session-" + role,
        "x-factory-role": "stockkeeper",
        "x-factory-idempotency-key": key,
      },
    });
    const item = await controller.create(
      "stock-item",
      { values: { sku: "C", name: "Controller" } },
      request(),
    );
    await expect(
      controller.receive(
        "stock-item",
        item.id,
        { expectedVersion: 0, quantity: 1, reason: "R" },
        request("observer"),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      controller.create(
        "stock-item",
        { values: { sku: "D", name: "D" } },
        { headers: { "x-factory-role": "stockkeeper" } },
      ),
    ).rejects.toMatchObject({ status: 403 });
    const moved = await controller.receive(
      "stock-item",
      item.id,
      { expectedVersion: 0, quantity: 1, reason: "R" },
      request("stockkeeper", "receive"),
    );
    expect(moved.movement.actorRole).toBe("stockkeeper");
    expect(db.snapshot().movements).toHaveLength(1);
    expect(
      emitted.routes.filter((r) => r.method === "Post").map((r) => r.path),
    ).toEqual(
      expect.arrayContaining([
        ":entity/:recordId/movements/receive",
        ":entity/:recordId/movements/issue",
        ":entity/:recordId/movements/adjust",
      ]),
    );
  });
});
it("replays a committed same-key create after a concurrent SKU uniqueness race", async () => {
  const { emitted, store, runtime } = setup(true);
  const original = store.inTransaction.bind(store);
  let once = true;
  store.inTransaction = async (operation: any) => {
    const result = await original(operation);
    if (once) {
      once = false;
      throw Object.assign(Error("Unique"), {
        code: "P2002",
        meta: { target: ["sku"] },
      });
    }
    return result;
  };
  const result = await runtime.inventoryCommand(
    "stockkeeper",
    "race-actor",
    "stock-item",
    undefined,
    "create",
    "race-key",
    { values: { sku: "R", name: "Race" } },
  );
  expect(result).toMatchObject({ status: 201, body: { sku: "R" } });
  expect(
    await new emitted.ApplicationRuntime(store).inventoryCommand(
      "stockkeeper",
      "race-actor",
      "stock-item",
      undefined,
      "create",
      "race-key",
      { values: { sku: "R", name: "Race" } },
    ),
  ).toEqual(result);
});
it("rejects wrong correction ID types as invalid request before storage", async () => {
  const { runtime, db } = setup(true);
  for (const correctionOf of [3, {}, [], true, ""])
    await expect(
      runtime.inventoryCommand(
        "stockkeeper",
        "actor",
        "stock-item",
        "item",
        "adjust",
        "key",
        { expectedVersion: 0, delta: 1, reason: "Reason", correctionOf },
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "inventory.invalid_request" },
    });
  expect(db.attempts()).toBe(0);
});
it("uses the accepted keyDigest receipt storage coordinate", () => {
  const {
    emitted: { files },
  } = setup();
  expect(
    files.find((f: any) => f.path === "api/prisma/schema.prisma")!.content,
  ).toContain("@@unique([scope, keyDigest])");
});
it("rejects C1 controls in names and movement reasons", async () => {
  const { command } = setup();
  await expect(
    command("create", undefined, { values: { sku: "C1", name: "Name\u0085" } }),
  ).rejects.toMatchObject({ status: 400 });
  const { body: item } = await command("create");
  await expect(
    command("receive", item.id, {
      expectedVersion: 0,
      quantity: 1,
      reason: "Reason\u009f",
    }),
  ).rejects.toMatchObject({ status: 400 });
});
it.each(["audit", "capability-events", "health"])(
  "routes an admitted %s item through real Nest route precedence",
  async (itemEntity) => {
    const db = inventoryPrismaHarness();
    const input = renamedInventoryInput(itemEntity);
    const delegate =
      itemEntity === "capability-events" ? "capabilityEvents" : itemEntity;
    Object.defineProperty(db.client, delegate, {
      get: () => db.client.stockItem,
    });
    const emitted = loadInventoryRuntime(db.client, input, true);
    const dependencies = createRequire(
      fileURLToPath(
        new URL("../../../apps/control-plane/package.json", import.meta.url),
      ),
    );
    const app = await dependencies("@nestjs/core").NestFactory.create(
      emitted.load("api/src/main.ts").GeneratedModule,
      { logger: false },
    );
    try {
      await app.listen(0, "127.0.0.1");
      const base = await app.getUrl();
      const headers = {
        "x-factory-fixture-session": "fixture-session-observer",
      };
      const valid = await fetch(base + "/api/" + itemEntity + "?limit=1", {
        headers,
      });
      expect(valid.status).toBe(200);
      expect(await valid.json()).toEqual({
        apiVersion: "factory.generated.inventory-list/v1",
        records: [],
        offset: 0,
        limit: 1,
        hasMore: false,
      });
      const calls = db.calls.length;
      for (const value of ["", "invalid", "fixture-session-unknown"]) {
        const response = await fetch(base + "/api/" + itemEntity, {
          headers: { "x-factory-fixture-session": value },
        });
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ code: "inventory.forbidden" });
      }
      expect(db.calls).toHaveLength(calls);
      const query = await fetch(base + "/api/" + itemEntity + "?unknown=x", {
        headers,
      });
      expect(query.status).toBe(400);
      expect(await query.json()).toEqual({ code: "inventory.invalid_request" });
      expect(db.calls).toHaveLength(calls);
      const readiness = await fetch(base + "/api/health");
      expect(readiness.status).toBe(200);
      expect(await readiness.json()).toEqual({ status: "ok" });
      for (const route of ["audit", "capability-events"].filter(
        (value) => value !== itemEntity,
      )) {
        const response = await fetch(base + "/api/" + route, { headers });
        expect(response.status).toBe(403);
      }
      const controller = new (emitted.load(
        "api/src/main.ts",
      ).GeneratedController)();
      if (itemEntity === "health")
        await expect(
          controller.health({
            headers: {
              "x-factory-fixture-session": ["fixture-session-observer"],
            },
          }),
        ).rejects.toMatchObject({ status: 403 });
    } finally {
      await app.close();
    }
  },
  60000,
);
it.each(["inventory-mutation-receipt", "factory-inventory-mutation-receipt"])(
  "isolates receipt storage from admitted business key %s",
  (key) => {
    const files = loadInventoryRuntime(
      undefined,
      renamedInventoryInput(key),
    ).files;
    const schema = files.find(
      (file: any) => file.path === "api/prisma/schema.prisma",
    )!.content;
    const models = [...schema.matchAll(/^model (\w+) \{/gm)].map(
      (match) => match[1],
    );
    expect(new Set(models).size).toBe(models.length);
    expect(models).toContain("Factory_InventoryMutationReceipt");
  },
);
