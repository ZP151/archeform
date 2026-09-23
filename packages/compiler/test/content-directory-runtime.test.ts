import { describe, expect, it, vi } from "vitest";
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
import {
  loadDirectoryRuntime,
  directoryPrismaHarness,
} from "./fixtures/content-directory-runtime.js";
import { generateApplicationBundle } from "../src/index.js";
import { contentDirectoryInput } from "./fixtures/content-directory.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

const values = {
  title: "Useful guide",
  summary: "A practical summary",
  body: "Plain text\nwith a second line",
  category: "Guides",
};
function setup(persistent = false) {
  const db = directoryPrismaHarness();
  const emitted = loadDirectoryRuntime(db.client);
  const store = persistent
    ? new (emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore)(
        db.client,
      )
    : new emitted.InMemoryRecordStore();
  const runtime = new emitted.ApplicationRuntime(store);
  const command = (
    operation: string,
    id?: string,
    body: any = { values },
    key = "key-" + operation,
    role = "curator",
    actor = "local-session",
  ) =>
    runtime.directoryCommand(role, actor, "resource", id, operation, key, body);
  return { ...emitted, store, runtime, command, db };
}
describe("emitted Content/Directory runtime", () => {
  it("rejects malformed directory candidates at normal compilation before artifact acceptance", () => {
    const input = contentDirectoryInput();
    input.graph.domain.entities[0]!.fields.push({
      key: "unreviewed",
      type: "string",
      required: false,
    });
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(input.graph),
      selections: input.compositionLock.packages,
    });
    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "rejected",
        graph: input.graph,
        compositionLock,
      }),
    ).toThrow("Unsupported Content/Directory profile.");
  });
  it("paginates after visibility/category/search predicates with deterministic title ordering", async () => {
    const { command, runtime } = setup(true);
    for (const [key, title, category, listed] of [
      ["b", "B result", "Guides", true],
      ["a", "A result", "Guides", true],
      ["c", "C hidden", "Guides", false],
      ["d", "D result", "Reference", true],
    ] as const) {
      const created = await command(
        "create",
        undefined,
        { values: { ...values, title, category } },
        key,
      );
      if (listed)
        await command(
          "submit",
          created.body.id,
          { expectedVersion: 0 },
          key + "-show",
        );
    }
    const first = await runtime.directoryList(
      "reader",
      "resource",
      "category=Guides&q=result&limit=1",
    );
    expect(first.records.map((row: any) => row.title)).toEqual(["A result"]);
    expect(first.hasMore).toBe(true);
    const second = await runtime.directoryList(
      "reader",
      "resource",
      "category=Guides&q=result&limit=1&offset=1",
    );
    expect(second.records.map((row: any) => row.title)).toEqual(["B result"]);
    expect(second.hasMore).toBe(false);
  });
  it("rejects invalid visibility state and unsafe versions without adding effects", async () => {
    const { command, db } = setup(true);
    const created = await command("create");
    const before = db.snapshot();
    await expect(
      command("cancel", created.body.id, { expectedVersion: 0 }),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: "directory.invalid_state" },
    });
    for (const expectedVersion of [-1, 0.5, "0", Number.MAX_SAFE_INTEGER + 1])
      await expect(
        command("submit", created.body.id, { expectedVersion }),
      ).rejects.toMatchObject({ status: 400 });
    expect(db.snapshot()).toEqual(before);
  });
  it("creates hidden, corrects, shows and hides the same entry with versioned reads", async () => {
    const { runtime, command, store } = setup();
    const created = await command("create");
    expect(created).toMatchObject({
      status: 201,
      body: { ...values, status: "hidden", version: 0 },
    });
    const id = created.body.id;
    expect(await runtime.directoryList("reader", "resource", "")).toEqual({
      apiVersion: "factory.generated.directory-list/v1",
      records: [],
      offset: 0,
      limit: 20,
      hasMore: false,
    });
    await expect(runtime.read("reader", "resource", id)).rejects.toMatchObject({
      status: 404,
      body: { code: "directory.not_found" },
    });
    await command("update", id, {
      expectedVersion: 0,
      values: { ...values, title: "Corrected" },
    });
    await command("submit", id, { expectedVersion: 1 });
    const listed = await runtime.directoryList(
      "reader",
      "resource",
      "?q=correct&category=Guides&limit=1",
    );
    expect(listed.records).toEqual([
      {
        id,
        title: "Corrected",
        summary: values.summary,
        category: "Guides",
        status: "listed",
        version: 2,
      },
    ]);
    expect((await runtime.read("reader", "resource", id)).body).toBe(
      values.body,
    );
    await command("cancel", id, { expectedVersion: 2 });
    await expect(runtime.read("reader", "resource", id)).rejects.toMatchObject({
      status: 404,
    });
    expect(await store.listAudit()).toHaveLength(4);
    expect(await store.listCapabilityEvents()).toHaveLength(0);
  });
  it.each([
    "q=a&q=b",
    "extra=yes",
    "limit=0",
    "limit=51",
    "offset=10001",
    "offset=-1",
    "limit=1.5",
    "limit=1e1",
    "category=Unknown",
    "q=" + "a".repeat(121),
    "q=%00",
  ])("rejects malformed query %s before any database read", async (query) => {
    const { runtime, db } = setup(true);
    await expect(
      runtime.directoryList("reader", "resource", query),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "directory.invalid_request" },
    });
    expect(db.calls).toEqual([]);
  });
  it("uses bounded Prisma predicates, literal wildcard escaping and narrow projections", async () => {
    const { command, runtime, db } = setup(true);
    const first = await command(
      "create",
      undefined,
      { values: { ...values, title: "A 100%_\\ guide" } },
      "first",
    );
    await command("submit", first.body.id, { expectedVersion: 0 });
    await command(
      "create",
      undefined,
      { values: { ...values, title: "Hidden 100%_\\ guide" } },
      "second",
    );
    const list = await runtime.directoryList(
      "reader",
      "resource",
      "q=" + encodeURIComponent("%_\\") + "&limit=1",
    );
    const call = db.calls.find((call) => call.method === "findMany")!;
    expect(call.input).toMatchObject({
      skip: 0,
      take: 2,
      where: {
        status: "listed",
        OR: [
          { title: { contains: "\\%\\_\\\\", mode: "insensitive" } },
          { summary: { contains: "\\%\\_\\\\", mode: "insensitive" } },
        ],
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    });
    expect(call.input.select.body).toBeUndefined();
    expect(list.records).toHaveLength(1);
    await runtime.read("reader", "resource", first.body.id);
    expect(
      db.calls.find((call) => call.method === "findFirst")!.input.where,
    ).toEqual({ id: first.body.id, status: "listed" });
  });
  it.each([
    {},
    { values: { ...values, id: "forged" } },
    { values: { ...values, title: "" } },
    { values: { ...values, body: "bad\u0001" } },
    { values: { ...values, category: "Other" } },
    { values: { ...values, version: 99 } },
    { values, expectedVersion: 0 },
    [],
  ])("rejects malformed create bodies with no writes", async (body) => {
    const { command, db } = setup(true);
    await expect(command("create", undefined, body)).rejects.toMatchObject({
      status: 400,
      body: { code: "directory.invalid_request" },
    });
    expect(db.snapshot()).toEqual({
      records: [],
      audit: [],
      effects: [],
      receipts: [],
    });
  });
  it("rejects accessors, inherited values and reader writes before receipt disclosure", async () => {
    const { command, db } = setup(true);
    const getter = vi.fn(() => "secret");
    const malicious = { ...values };
    Object.defineProperty(malicious, "body", { get: getter });
    await expect(
      command("create", undefined, { values: malicious }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      command("create", undefined, { values: Object.create(values) }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      command("create", undefined, {}, "bad key", "reader"),
    ).rejects.toMatchObject({ status: 403 });
    expect(getter).not.toHaveBeenCalled();
    expect(db.snapshot().receipts).toEqual([]);
  });
  it.each([false, true])(
    "replays durable command identity, conflicts and same-version races (Prisma delegate %s)",
    async (persistent) => {
      const { command, runtime, store, ApplicationRuntime, db } =
        setup(persistent);
      const [a, b] = await Promise.all([command("create"), command("create")]);
      expect(a).toEqual(b);
      const restarted = new ApplicationRuntime(store);
      expect(
        await restarted.directoryCommand(
          "curator",
          "local-session",
          "resource",
          undefined,
          "create",
          "key-create",
          { values: { ...values, title: " " + values.title + " " } },
        ),
      ).toEqual(a);
      await expect(
        command("create", undefined, {
          values: { ...values, title: "Different" },
        }),
      ).rejects.toMatchObject({
        status: 409,
        body: { code: "directory.idempotency_conflict" },
      });
      const race = await Promise.allSettled([
        command("submit", a.body.id, { expectedVersion: 0 }, "race-a"),
        command("update", a.body.id, { expectedVersion: 0, values }, "race-b"),
      ]);
      expect(
        race.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (
          race.find(
            (result) => result.status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ).toMatchObject({
        status: 409,
        body: { code: "directory.version_conflict" },
      });
      await expect(
        runtime.create("curator", "resource", values),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        runtime.transition("curator", "resource", a.body.id, "cancel", {
          expectedVersion: 1,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await store.listAudit()).toHaveLength(2);
      if (persistent) {
        expect(db.snapshot().receipts).toHaveLength(2);
        expect(JSON.stringify(db.snapshot().receipts)).not.toContain(
          "key-create",
        );
        expect(db.snapshot().receipts[0].idempotencyKey).toMatch(
          /^sha256:[a-f0-9]{64}$/,
        );
      }
    },
  );
  it.each(["create", "audit", "receipt"])(
    "rolls back every create effect on %s failure",
    async (boundary) => {
      const { command, db } = setup(true);
      db.fail(boundary);
      await expect(command("create")).rejects.toThrow();
      expect(db.snapshot()).toEqual({
        records: [],
        audit: [],
        effects: [],
        receipts: [],
      });
    },
  );
  it("bounds serialization retries to three attempts with a retryable safe conflict", async () => {
    const { command, db } = setup(true);
    db.retry("P2034");
    await expect(command("create")).rejects.toMatchObject({
      status: 409,
      body: { code: "directory.retry_required" },
    });
    expect(db.attempts()).toBe(3);
    db.retry("");
    expect((await command("create")).status).toBe(201);
  });
  it("emits versioned schema and receipt storage only for this profile", () => {
    const { files } = setup();
    const schema = files.find(
      (file: any) => file.path === "api/prisma/schema.prisma",
    )!.content;
    expect(schema).toMatch(
      /model Resource \{[\s\S]*?version Int @default\(0\)/,
    );
    expect(schema).toContain("model DirectoryMutationReceipt {");
    expect(schema).toBe(
      files.find((file: any) => file.path === "database/prisma/schema.prisma")!
        .content,
    );
    const migration = files.find((file: any) =>
      file.path.endsWith("migration.sql"),
    )!.content;
    expect(migration).toContain('"version" INTEGER NOT NULL DEFAULT 0');
    expect(migration).toContain('CREATE TABLE "DirectoryMutationReceipt"');
  });
  it("typechecks the complete emitted API and actual native Prisma adapter", () => {
    const { files } = setup();
    const directory = mkdtempSync(
      join(tmpdir(), "archeform-directory-typecheck-"),
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
          fileURLToPath(
            new URL("../../../node_modules/@types", import.meta.url),
          ),
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
        basename(directory).startsWith("archeform-directory-typecheck-")
      )
        rmSync(directory, { recursive: true, force: true });
    }
  }, 60000);
  it("executes generated controller reads and commands with server-resolved actors and safe errors", async () => {
    const { load, routes, db } = setup(true);
    const controller = new (load("api/src/main.ts").GeneratedController)();
    const request = (
      role = "curator",
      key = "controller-create",
      url = "/api/resource",
    ) => ({
      headers: {
        "x-factory-fixture-session": `fixture-session-${role}`,
        "x-factory-idempotency-key": key,
        "x-factory-role": "curator",
      },
      originalUrl: url,
    });
    const created = await controller.create("resource", { values }, request());
    expect(created.status).toBe("hidden");
    expect(await controller.list("resource", request("reader"))).toMatchObject({
      records: [],
    });
    await expect(
      controller.read("resource", created.id, request("reader")),
    ).rejects.toMatchObject({
      status: 404,
      body: { code: "directory.not_found" },
    });
    await controller.correct(
      "resource",
      created.id,
      {
        expectedVersion: 0,
        values: { ...values, title: "Controller correction" },
      },
      request("curator", "correct"),
    );
    await controller.transition(
      "resource",
      created.id,
      "submit",
      { expectedVersion: 1 },
      request("curator", "show"),
    );
    expect(
      (
        await controller.list(
          "resource",
          request("reader", "read", "/api/resource?q=correction"),
        )
      ).records,
    ).toHaveLength(1);
    await expect(
      controller.list(
        "resource",
        request("reader", "read", "/api/resource?q=x&q=y"),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      controller.create("resource", { values }, request("reader")),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      controller.transition(
        "resource",
        created.id,
        "update",
        { expectedVersion: 2, values },
        request(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      controller.list("resource", { headers: { "x-factory-role": "curator" } }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(controller.audit(request("reader"))).rejects.toMatchObject({
      status: 403,
      body: { code: "directory.forbidden" },
    });
    await expect(
      controller.capabilityEvents(request("curator")),
    ).rejects.toMatchObject({
      status: 403,
      body: { code: "directory.forbidden" },
    });
    db.fail("create");
    await expect(
      controller.create("resource", { values }, request("curator", "failure")),
    ).rejects.toMatchObject({
      status: 500,
      body: { message: "Directory request failed." },
    });
    expect(routes).toContainEqual({
      method: "Patch",
      path: ":entity/:recordId",
      property: "correct",
    });
  });
  it("executes generated proxy forwarding exact queries, method, role session and retry identity", async () => {
    const { load } = setup();
    const proxy = load("web/app/api/[...path]/route.ts");
    const fetch = vi.fn(
      async () =>
        new Response('{"ok":true}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    try {
      const body = JSON.stringify({ expectedVersion: 0, values });
      const response = await proxy.PATCH(
        new Request("http://localhost/api/resource/entry?q=%25&q=_&limit=2", {
          method: "PATCH",
          headers: {
            "x-factory-fixture-session": "fixture-session-curator",
            "x-factory-idempotency-key": "exact-key",
          },
          body,
        }),
        { params: Promise.resolve({ path: ["resource", "entry"] }) },
      );
      expect(response.status).toBe(200);
      const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
      expect(url.search).toBe("?q=%25&q=_&limit=2");
      expect(init).toMatchObject({
        method: "PATCH",
        body,
        headers: {
          "x-factory-fixture-session": "fixture-session-curator",
          "x-factory-idempotency-key": "exact-key",
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
