import { expect, it, vi } from "vitest";
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
import { createRequire } from "node:module";
import { loadWorkOrdersRuntime } from "./fixtures/service-work-orders-runtime.js";
import {
  customerRequestsInput,
  roleCustomerRequestsInput,
} from "./fixtures/customer-requests.js";

// The loader compiles generated modules in memory and replaces bootstrap with exports;
// it never starts Nest or connects Prisma. Only external delegates are authored doubles.
function harness() {
  let state: { requests: any[]; events: any[]; audit: any[]; receipts: any[] } =
    { requests: [], events: [], audit: [], receipts: [] };
  const calls: { method: string; input: any }[] = [];
  let fault = "",
    faultCode = "",
    failures = Infinity,
    attempts = 0,
    tail = Promise.resolve();
  const fail = (point: string) => {
    if (point === fault && failures-- > 0)
      throw Object.assign(Error("Injected private storage fault"), {
        code: faultCode,
      });
  };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where ?? {}).every(([key, value]: any) =>
      value && typeof value === "object"
        ? "lt" in value
          ? row[key] < value.lt
          : "gt" in value
            ? row[key] > value.gt
            : "in" in value
              ? value.in.includes(row[key])
              : false
        : row[key] === value,
    );
  const delegates = (data: typeof state) => {
    const table = (name: "requests" | "events") => ({
      findUnique: async (input: any) => {
        calls.push({ method: name + ".findUnique", input });
        return structuredClone(
          data[name].find((row) => row.id === input.where.id) ?? null,
        );
      },
      findMany: async (input: any) => {
        calls.push({ method: name + ".findMany", input });
        if (
          !input ||
          !Number.isInteger(input.take) ||
          input.take < 1 ||
          input.take > 51
        )
          throw Error("Unbounded read");
        if (name === "events" && !input.where.requestId)
          throw Error("Unscoped history");
        const [key, direction] = Object.entries(input.orderBy)[0]!;
        return structuredClone(
          data[name]
            .filter((row) => matches(row, input.where))
            .sort(
              (a, b) =>
                (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) *
                (direction === "asc" ? 1 : -1),
            )
            .slice(0, input.take),
        );
      },
      create: async ({ data: values }: any) => {
        if (
          name === "events" &&
          data.events.some(
            (e) =>
              e.requestId === values.requestId &&
              e.requestVersion === values.requestVersion,
          )
        )
          throw { code: "P2002" };
        if (name === "events" && !(values.recordedAt instanceof Date))
          throw Error("Expected Date at Prisma boundary");
        const row = {
          id: name + "-" + (data[name].length + 1),
          ...structuredClone(values),
        };
        data[name].push(row);
        fail(name + ".create");
        return structuredClone(row);
      },
      updateMany: async (input: any) => {
        calls.push({ method: name + ".updateMany", input });
        const row = data[name].find((row) => matches(row, input.where));
        if (row) Object.assign(row, structuredClone(input.data));
        fail("cas");
        return { count: row ? 1 : 0 };
      },
    });
    return {
      customerRequest: table("requests"),
      requestHistory: table("events"),
      factory_AuditEvent: {
        create: async ({ data: row }: any) => {
          data.audit.push(structuredClone(row));
          fail("audit");
        },
      },
      factory_CustomerRequestMutationReceipt: {
        findUnique: async (input: any) => {
          calls.push({ method: "receipt.findUnique", input });
          return structuredClone(
            data.receipts.find((row) =>
              matches(row, input.where.scope_keyDigest),
            ) ?? null,
          );
        },
        create: async ({ data: row }: any) => {
          if (
            data.receipts.some(
              (r) => r.scope === row.scope && r.keyDigest === row.keyDigest,
            )
          )
            throw { code: "P2002" };
          data.receipts.push(structuredClone(row));
          fail("receipt");
        },
      },
    };
  };
  const client: any = {
    $transaction: (fn: any, options: any) => {
      if (options?.isolationLevel !== "Serializable")
        throw Error("Serializable required");
      const result = tail.then(async () => {
        attempts++;
        const pending = structuredClone(state);
        const result = await fn(delegates(pending));
        state = pending;
        return result;
      });
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
  for (const key of Object.keys(delegates(state)))
    Object.defineProperty(client, key, {
      get: () => delegates(state)[key as keyof ReturnType<typeof delegates>],
    });
  return {
    client,
    calls,
    snapshot: () => structuredClone(state),
    fail: (point: string, code = "", times = Infinity) => {
      fault = point;
      faultCode = code;
      failures = times;
    },
    attempts: () => attempts,
  };
}
const actor = (slot = "customer-a", role = "customer") => ({
  principalId: "fixture-principal-" + slot,
  sessionId: "fixture-session-" + slot,
  tenantId: "tenant-local",
  roles: [role],
  expiresAt: "2099-01-01T00:00:00.000Z",
});
const a = actor(),
  b = actor("customer-b"),
  staff = actor("support-staff", "staff");
function setup() {
  const db = harness(),
    emitted = loadWorkOrdersRuntime(db.client, customerRequestsInput()),
    store = new (emitted.load(
      "api/src/prisma-record-store.ts",
    ).PrismaRecordStore)(db.client),
    runtime = new emitted.ApplicationRuntime(store);
  let key = 0;
  const command = (
    op: string,
    id?: string,
    body: any = { values: { subject: "Subject", description: "Description" } },
    principal = a,
    k = "key-" + ++key,
  ) =>
    runtime.customerRequestCommand(
      principal,
      "customer-request",
      id,
      op,
      k,
      body,
    );
  return { db, emitted, store, runtime, command };
}

it.each(["canonical", "long-roles"])(
  "strictly typechecks %s emitted API and proxy modules without startup",
  (name) => {
    const emitted = loadWorkOrdersRuntime(
      undefined,
      name === "canonical"
        ? customerRequestsInput()
        : roleCustomerRequestsInput("s".repeat(128), "c".repeat(128)),
    );
    const root = fileURLToPath(
      new URL("./__virtual_customer_requests__/", import.meta.url),
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
    const host = createCompilerHost(options),
      read = host.readFile.bind(host),
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
    expect(
      getPreEmitDiagnostics(
        createProgram([...virtual.keys()], options, host),
      ).map(
        (d) =>
          (d.file?.fileName ?? "") +
          ":" +
          flattenDiagnosticMessageText(d.messageText, "\n"),
      ),
    ).toEqual([]);
  },
  60000,
);

it("executes persisted transactions with owner-aware CAS and bounded Prisma read arguments", async () => {
  const { db, runtime, command } = setup();
  const id = (await command("create")).body.request.id;
  await command(
    "reply",
    id,
    { expectedVersion: 0, message: "Saved", correctsVersion: null },
    staff,
  );
  await command(
    "complete",
    id,
    { expectedVersion: 1, resolutionMessage: "Resolved" },
    staff,
  );
  await command("reopen", id, { expectedVersion: 2, reason: "Still needed" });
  expect(
    await runtime.customerRequestRead(a, "customer-request", id),
  ).toMatchObject({
    request: { version: 3 },
    latestReply: { message: "Resolved", historical: true },
  });
  await runtime.customerRequestList(
    a,
    "customer-request",
    "limit=7&status=open&afterId=a",
  );
  await runtime.customerRequestHistory(
    a,
    "customer-request",
    id,
    "limit=2&beforeVersion=3",
  );
  expect(
    db.calls
      .filter((c) => c.method === "requests.updateMany")
      .map((c) => c.input.where),
  ).toEqual([
    { id, status: "open", version: 0, customerPrincipalId: a.principalId },
    { id, status: "open", version: 1, customerPrincipalId: a.principalId },
    { id, status: "resolved", version: 2, customerPrincipalId: a.principalId },
  ]);
  expect(db.calls.find((c) => c.method === "requests.findMany")!.input).toEqual(
    {
      where: {
        customerPrincipalId: a.principalId,
        status: "open",
        id: { gt: "a" },
      },
      orderBy: { id: "asc" },
      take: 8,
    },
  );
  expect(db.calls.at(-1)).toEqual({
    method: "events.findMany",
    input: {
      where: { requestId: id, requestVersion: { lt: 3 } },
      orderBy: { requestVersion: "desc" },
      take: 3,
    },
  });
  const before = db.calls.length;
  await expect(
    runtime.customerRequestHistory(b, "customer-request", id),
  ).rejects.toMatchObject({ status: 404 });
  expect(db.calls.slice(before).map((c) => c.method)).toEqual([
    "requests.findUnique",
  ]);
  expect(db.snapshot().events.map((e) => e.requestVersion)).toEqual([
    0, 1, 2, 3,
  ]);
});

it.each(["requests.create", "events.create", "cas", "audit", "receipt"])(
  "rolls back every Prisma delegate after %s failure",
  async (point) => {
    const { db, command } = setup();
    const id = (await command("create")).body.request.id,
      before = db.snapshot();
    db.fail(point);
    await expect(
      point === "requests.create"
        ? command("create")
        : command(
            "reply",
            id,
            { expectedVersion: 0, message: "Rollback", correctsVersion: null },
            staff,
          ),
    ).rejects.toMatchObject({
      status: 500,
      body: { code: "customer_request.internal_error" },
    });
    expect(db.snapshot()).toEqual(before);
  },
);
it.each(["P2002", "P2034"])(
  "retries atomic Prisma receipt commit for transient %s and replays lost response",
  async (code) => {
    const { db, command } = setup();
    db.fail("receipt", code, 1);
    const created = await command("create", undefined, undefined, a, "retry");
    expect(db.attempts()).toBe(2);
    expect(await command("create", undefined, undefined, a, "retry")).toEqual(
      created,
    );
    expect(db.snapshot().requests).toHaveLength(1);
    expect(db.snapshot().events).toHaveLength(1);
    expect(db.snapshot().audit).toHaveLength(1);
    expect(db.snapshot().receipts).toHaveLength(1);
  },
);

it("denies missing, repeated, oversized and override headers and every generic resource route", async () => {
  const { emitted } = setup();
  const { GeneratedController } = emitted.load("api/src/main.ts"),
    controller = new GeneratedController();
  for (const headers of [
    {},
    {
      "x-factory-fixture-session": [
        "fixture-session-customer-a",
        "fixture-session-customer-b",
      ],
    },
    { "x-factory-fixture-session": "x".repeat(65) },
    { "x-factory-fixture-session": "unknown" },
    { "x-factory-fixture-session": a.sessionId, "x-factory-role": "staff" },
  ])
    await expect(
      controller.list("customer-request", { headers }),
    ).rejects.toMatchObject({
      status: 403,
      body: { code: "customer_request.forbidden" },
    });
  for (const entity of [
    "audit",
    "capabilities",
    "work-order-assignees",
    "principal",
    "session",
    "request-history",
    "Factory_CustomerRequestMutationReceipt",
  ])
    await expect(
      controller.list(entity, {
        headers: { "x-factory-fixture-session": a.sessionId },
      }),
    ).rejects.toMatchObject({
      status: 403,
      body: { code: "customer_request.forbidden" },
    });
  expect(controller.health()).toEqual({ status: "ok" });
  const body = {
    values: { subject: "Transport", description: "Saved in request" },
  };
  const created = await controller.create("customer-request", body, {
    headers: {
      "x-factory-fixture-session": a.sessionId,
      "x-factory-idempotency-key": "transport",
    },
  });
  expect(created.request.customerPrincipalId).toBe(a.principalId);
  await expect(
    controller.transition(
      "customer-request",
      created.request.id,
      "create",
      body,
      {
        headers: {
          "x-factory-fixture-session": a.sessionId,
          "x-factory-idempotency-key": "alias",
        },
      },
    ),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    controller.read("customer-request", created.request.id, {
      headers: { "x-factory-fixture-session": b.sessionId },
    }),
  ).rejects.toMatchObject({ status: 404 });
});

it("forwards no-store proxy requests and returns safe unavailable/denied responses without external transport", async () => {
  const { emitted } = setup(),
    proxy = emitted.load("web/app/api/[...path]/route.ts");
  const calls: any[] = [];
  vi.stubGlobal("fetch", async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return Response.json({ items: [], nextAfterId: null });
  });
  try {
    const response = await proxy.GET(
      new Request("http://local/api/customer-request?limit=2", {
        headers: { "x-factory-fixture-session": a.sessionId },
      }),
      { params: Promise.resolve({ path: ["customer-request"] }) },
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(calls[0].init.cache).toBe("no-store");
    expect(calls[0].url).toBe(
      "http://localhost:3001/api/customer-request?limit=2",
    );
    const denied = await proxy.GET(
      new Request("http://local/api/customer-request", {
        headers: { "x-factory-role": "staff" },
      }),
      { params: Promise.resolve({ path: ["customer-request"] }) },
    );
    expect(denied.status).toBe(403);
    expect(calls).toHaveLength(1);
    vi.stubGlobal("fetch", async () => {
      throw Error("Private transport details");
    });
    const unavailable = await proxy.GET(
      new Request("http://local/api/customer-request"),
      { params: Promise.resolve({ path: ["customer-request"] }) },
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      code: "customer_request.unavailable",
    });
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each([
  [400, "invalid_request"],
  [403, "forbidden"],
  [404, "not_found"],
  [409, "version_conflict"],
  [409, "state_conflict"],
  [409, "idempotency_conflict"],
  [409, "retryable_conflict"],
  [409, "version_exhausted"],
  [500, "internal_error"],
  [503, "unavailable"],
] as const)(
  "preserves exact upstream error pair %s/%s with no-store",
  async (status, suffix) => {
    const { emitted } = setup();
    const proxy = emitted.load("web/app/api/[...path]/route.ts");
    const body = { code: "customer_request." + suffix };
    vi.stubGlobal("fetch", async () => Response.json(body, { status }));
    try {
      const response = await proxy.GET(
        new Request("http://local/api/customer-request"),
        {
          params: Promise.resolve({ path: ["customer-request"] }),
        },
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual(body);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each([
  {
    name: "non-JSON 500",
    status: 500,
    body: "Synthetic private intermediary error",
  },
  {
    name: "non-JSON 502",
    status: 502,
    body: "Synthetic private intermediary error",
  },
  {
    name: "non-JSON 503",
    status: 503,
    body: "Synthetic private intermediary error",
  },
  { name: "truncated JSON", status: 500, body: '{"code":' },
  { name: "null JSON", status: 500, body: "null" },
  {
    name: "array JSON",
    status: 500,
    body: '[{"code":"customer_request.internal_error"}]',
  },
  {
    name: "string JSON",
    status: 500,
    body: '"customer_request.internal_error"',
  },
  {
    name: "missing code",
    status: 500,
    body: '{"message":"Synthetic private details"}',
  },
  { name: "non-string code", status: 500, body: '{"code":500}' },
  {
    name: "unknown code",
    status: 500,
    body: '{"code":"Synthetic private details"}',
  },
  { name: "prototype code", status: 500, body: '{"code":"constructor"}' },
  {
    name: "wrong status/code pair",
    status: 403,
    body: '{"code":"customer_request.version_conflict"}',
  },
  {
    name: "unexpected failure status",
    status: 502,
    body: '{"code":"customer_request.unavailable"}',
  },
  {
    name: "unexpected redirect status",
    status: 302,
    body: '{"code":"customer_request.unavailable"}',
  },
  {
    name: "extra details",
    status: 409,
    body: '{"code":"customer_request.version_conflict","message":"Synthetic private details"}',
  },
] as const)(
  "sanitizes $name upstream errors as unavailable without forwarding details",
  async ({ status, body }) => {
    const { emitted } = setup();
    const proxy = emitted.load("web/app/api/[...path]/route.ts");
    vi.stubGlobal("fetch", async () => new Response(body, { status }));
    try {
      const response = await proxy.GET(
        new Request("http://local/api/customer-request"),
        {
          params: Promise.resolve({ path: ["customer-request"] }),
        },
      );
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.text()).toBe(
        '{"code":"customer_request.unavailable"}',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it("sanitizes parser and unknown-route exceptions and applies no-store even on failures", () => {
  const emitted = loadWorkOrdersRuntime(
    undefined,
    customerRequestsInput(),
    true,
    (path, source) =>
      path === "api/src/main.ts"
        ? source.replace(
            "class CustomerRequestExceptionFilter",
            "export class CustomerRequestExceptionFilter",
          )
        : source,
  );
  const { CustomerRequestExceptionFilter } = emitted.load("api/src/main.ts");
  expect(CustomerRequestExceptionFilter).toBeTypeOf("function");
  const { HttpException } = createRequire(
    new URL("../../../apps/control-plane/package.json", import.meta.url),
  )("@nestjs/common");
  const filter = new CustomerRequestExceptionFilter();
  for (const [error, status, code] of [
    [
      new HttpException({ message: "Unsafe submitted content" }, 400),
      400,
      "invalid_request",
    ],
    [new HttpException({ message: "Private route" }, 404), 404, "not_found"],
    [Error("Private server detail"), 500, "internal_error"],
    [
      new HttpException({ code: "customer_request.version_conflict" }, 409),
      409,
      "version_conflict",
    ],
  ] as const) {
    const output: any = {};
    const response = {
      setHeader: (name: string, value: string) => {
        output[name] = value;
      },
      status: (value: number) => {
        output.status = value;
        return response;
      },
      json: (body: unknown) => {
        output.body = body;
        return response;
      },
    };
    filter.catch(error, {
      switchToHttp: () => ({ getResponse: () => response }),
    });
    expect(output).toEqual({
      "Cache-Control": "no-store",
      status,
      body: { code: "customer_request." + code },
    });
  }
});
