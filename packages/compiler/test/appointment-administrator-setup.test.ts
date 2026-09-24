import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { Readable } from "node:stream";
import { gzipSync, deflateSync } from "node:zlib";
import ts from "typescript";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";

const require = createRequire(import.meta.url);
let files: Map<string, string>, graphHash: string;
beforeAll(() => {
  const { graph, compositionLock } = appointmentDefinitionCompilationInput();
  graph.policy.permissions = graph.policy.permissions.flatMap((p) =>
    p.resource === "appointment" && ["customer", "staff"].includes(p.role)
      ? [
          p,
          {
            role: p.role,
            resource: "schedule",
            actions: ["read-availability"],
          },
        ]
      : [p],
  );
  graphHash = hashApplicationGraph(graph);
  files = new Map(
    generateApplicationBundle({
      publishedRevisionId: "setup-test",
      graph,
      compositionLock: createCapabilityCompositionLock({
        graphChecksum: graphHash,
        selections: compositionLock.packages,
      }),
    }).files.map((f) => [f.path, f.content]),
  );
});

function apiHarness() {
  const { store } = runtime(),
    layers: Function[] = [],
    calls: string[] = [];
  const controlRequire = createRequire(
    new URL("../../../apps/control-plane/package.json", import.meta.url),
  );
  const { ExpressAdapter } = controlRequire("@nestjs/platform-express");
  const adapter = new ExpressAdapter();
  const use = adapter.use.bind(adapter);
  adapter.use = (middleware: Function) => {
    layers.push(middleware);
    return use(middleware);
  };
  const register = adapter.registerParserMiddleware.bind(adapter);
  adapter.registerParserMiddleware = (...args: unknown[]) => {
    calls.push("parser");
    return register(...args);
  };
  const decorator = () => () => undefined;
  class HttpException extends Error {
    constructor(
      readonly body: unknown,
      readonly status: number,
    ) {
      super("Safe error");
    }
  }
  const app = {
    use: (middleware: Function) => layers.push(middleware),
    getHttpAdapter: () => adapter,
    enableCors: () => {},
    listen: async () => {
      calls.push("initialize");
      layers.push((err: unknown, _req: unknown, res: any, _next: unknown) =>
        res.status(500).json({ generic: true }),
      );
    },
  };
  const load = emitted({
    "api/src/prisma-record-store.ts": {
      PrismaRecordStore: class {
        constructor() {
          return store;
        }
      },
    },
    "@prisma/client": { PrismaClient: class {} },
    "@nestjs/common": Object.assign(
      Object.fromEntries(
        [
          "Controller",
          "Get",
          "Post",
          "Patch",
          "Module",
          "Req",
          "Res",
          "Param",
          "Body",
          "HttpCode",
        ].map((key) => [key, decorator]),
      ),
      {
        HttpException,
        HttpStatus: {
          BAD_REQUEST: 400,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          CONFLICT: 409,
        },
      },
    ),
    "@nestjs/core": {
      NestFactory: {
        create: async (_module: unknown, options: unknown) => {
          calls.push("create:" + JSON.stringify(options));
          return app;
        },
      },
    },
  });
  const main = load("api/src/main.ts");
  return {
    ...main,
    store,
    layers,
    calls,
    controller: new main.GeneratedController(),
  };
}
function nativeParserLayers(): Function[] {
  const controlRequire = createRequire(
    new URL("../../../apps/control-plane/package.json", import.meta.url),
  );
  const { ExpressAdapter } = controlRequire("@nestjs/platform-express"),
    adapter = new ExpressAdapter(),
    layers: Function[] = [];
  const use = adapter.use.bind(adapter);
  adapter.use = (middleware: Function) => {
    layers.push(middleware);
    return use(middleware);
  };
  adapter.registerParserMiddleware("", false);
  layers.push((_error: unknown, _request: unknown, res: any, _next: unknown) =>
    res.status(400).json({ code: "appointment.setup_invalid_request" }),
  );
  return layers;
}
const request = (
  url = "/api/service",
  method = "POST",
  headers: Record<string, unknown> = {},
) => ({
  originalUrl: url,
  method,
  headers: {
    "x-factory-fixture-session": "fixture-session-administrator",
    "x-factory-idempotency-key": "intent",
    ...headers,
  },
});
const response = () => ({
  headers: {} as Record<string, string>,
  statusCode: 200,
  body: undefined as unknown,
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  },
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
  },
});
async function pipeline(
  layers: Function[],
  input: ReturnType<typeof request>,
  text: string | Buffer,
  contentType = "application/json",
  dispatch?: (body: unknown) => Promise<unknown>,
) {
  const controlRequire = createRequire(
    new URL("../../../apps/control-plane/package.json", import.meta.url),
  );
  const { ExpressAdapter } = controlRequire("@nestjs/platform-express");
  const req = Object.assign(Readable.from([Buffer.from(text)]), input, {
      url: input.originalUrl,
      is: new ExpressAdapter().getInstance().request.is,
      headers: {
        ...input.headers,
        "content-type": contentType,
        "content-length": String(Buffer.byteLength(text)),
      },
    }),
    res = response();
  await new Promise<void>((resolve, reject) => {
    let index = 0;
    const original = res.json.bind(res);
    res.json = (body: unknown) => {
      original(body);
      resolve();
    };
    function next(error?: unknown): void {
      while (index < layers.length) {
        const layer = layers[index++]!;
        if (error ? layer.length === 4 : layer.length !== 4) {
          try {
            if (error) layer(error, req, res, next);
            else layer(req, res, next);
          } catch (caught) {
            reject(caught);
          }
          return;
        }
      }
      if (dispatch)
        dispatch((req as any).body).then(
          (body) => {
            res.json(body);
          },
          (error) => {
            res
              .status(error.status ?? 500)
              .json({ code: error.code ?? "unexpected" });
          },
        );
      else resolve();
    }
    next();
  });
  return res;
}

describe("Emitted setup HTTP boundary without a listening server", () => {
  it("preserves native JSON type, charset, empty, strict, size and inflation admission for setup", async () => {
    const h = apiHarness();
    await h.bootstrap();
    const utf32 = Buffer.from([123, 0, 0, 0, 125, 0, 0, 0]);
    const json = JSON.stringify(service),
      limit = JSON.stringify({ x: "a".repeat(102392) });
    const cases: Array<
      [string, string | Buffer, string, Record<string, string>?]
    > = [
      ["default", json, "application/json"],
      ["quoted case", json, 'application/json; charset="UTF-8"'],
      [
        "UTF-7",
        json.replace('"name"', '"+AG4-ame"'),
        'application/json; charset="UTF-7"',
      ],
      [
        "UTF-16LE",
        Buffer.from(json, "utf16le"),
        "application/json; charset=utf-16le",
      ],
      ["UTF-32LE unsupported", utf32, "application/json; charset=utf-32le"],
      ["non-UTF", json, "application/json; charset=iso-8859-1"],
      ["unknown UTF", json, "application/json; charset=utf-unknown"],
      [
        "duplicate charset parameters",
        json,
        "application/json; charset=iso-8859-1; charset=utf-8",
      ],
      ["empty", "", "application/json"],
      ["whitespace", " \r\n\t", "application/json"],
      ["malformed", '{"name":', "application/json"],
      [
        "malformed escape tail",
        '{"name":"' + '\\"'.repeat(40000),
        "application/json",
      ],
      ["string", '"text"', "application/json"],
      ["number", "1", "application/json"],
      ["boolean", "true", "application/json"],
      ["null", "null", "application/json"],
      ["array", "[]", "application/json"],
      [
        "BOM",
        Buffer.concat([Buffer.from([239, 187, 191]), Buffer.from(json)]),
        "application/json",
      ],
      ["limit", limit, "application/json"],
      ["over limit", limit + " ", "application/json"],
      [
        "gzip",
        gzipSync(json),
        "application/json",
        { "content-encoding": "gzip" },
      ],
      [
        "deflate",
        deflateSync(json),
        "application/json",
        { "content-encoding": "deflate" },
      ],
      [
        "unsupported compression",
        json,
        "application/json",
        { "content-encoding": "unknown" },
      ],
      ["text type", json, "text/plain"],
      ["suffix type", json, "application/problem+json"],
      ["form", "name=A&active=true", "application/x-www-form-urlencoded"],
    ];
    for (const [label, body, type, headers] of cases) {
      const native = await pipeline(
        nativeParserLayers(),
        request("/api/service", "POST", headers),
        body,
        type,
        async (parsed) => parsed,
      );
      const actual = await pipeline(
        h.layers,
        request("/api/service", "POST", headers),
        body,
        type,
        async (parsed) => parsed,
      );
      expect({ status: actual.statusCode, body: actual.body }, label).toEqual({
        status: native.statusCode,
        body: native.body,
      });
      expect(actual.headers["cache-control"], label).toBe("no-store");
    }
  });
  it("rejects decoded UTF-7 and compressed escaped-equivalent duplicate keys without parsing unauthorized bodies", async () => {
    const h = apiHarness();
    await h.bootstrap();
    const duplicate =
      '{"name":"A","\\u006eame":"B","durationMinutes":30,"active":true}';
    const inputs: Array<[string | Buffer, string, Record<string, string>]> = [
      [
        '{"name":"A","+AG4-ame":"B","durationMinutes":30,"active":true}',
        "application/json; charset=utf-7",
        {},
      ],
      [gzipSync(duplicate), "application/json", { "content-encoding": "gzip" }],
      [
        Buffer.from(duplicate, "utf16le"),
        "application/json; charset=utf-16le",
        {},
      ],
    ];
    let reached = 0;
    for (const [body, type, headers] of inputs) {
      const denied = await pipeline(
        h.layers,
        request("/api/service", "POST", {
          ...headers,
          "x-factory-fixture-session": "forged",
        }),
        body,
        type,
        async () => {
          reached++;
        },
      );
      expect(denied.statusCode).toBe(403);
      const invalid = await pipeline(
        h.layers,
        request("/api/service", "POST", headers),
        body,
        type,
        async () => {
          reached++;
        },
      );
      expect(invalid.statusCode).toBe(400);
      expect(invalid.body).toEqual({
        code: "appointment.setup_invalid_request",
      });
      expect(invalid.headers["cache-control"]).toBe("no-store");
    }
    expect(reached).toBe(0);
    expect(await h.store.listAudit()).toHaveLength(0);
    expect(h.store.appointmentReceipts.size).toBe(0);
  });
  it("retains ordinary and booking duplicate-key semantics and keeps string tokens and object scopes separate", async () => {
    const h = apiHarness();
    await h.bootstrap();
    const duplicate = '{"name":"A","name":"B"}';
    for (const url of [
      "/api/appointment",
      "/api/appointment/a/events/confirm",
      "/api/unrelated",
    ]) {
      const res = await pipeline(
        h.layers,
        request(url),
        duplicate,
        "application/json",
        async (body) => body,
      );
      expect(res.body).toEqual({ name: "B" });
      expect(res.headers["cache-control"]).toBeUndefined();
      const malformed = await pipeline(h.layers, request(url), "{");
      expect(malformed.body).toEqual({ generic: true });
    }
    const text = JSON.stringify({
      expectedValues: { name: 'A,"name":"B"' },
      values: { name: "C", nested: [{ name: "D" }, { name: "E" }] },
    });
    const parsed = await pipeline(
      h.layers,
      request("/api/service/a", "PATCH"),
      text,
      "application/json",
      async (body) => body,
    );
    expect(parsed.body).toEqual(JSON.parse(text));
  });
  it("preserves native UTF-7 admission and unsupported UTF-32 rejection", async () => {
    const h = apiHarness();
    await h.bootstrap();
    const text = '{"name":"Consultation!","durationMinutes":30,"active":true}',
      utf32 = Buffer.alloc(text.length * 4);
    for (let n = 0; n < text.length; n++)
      utf32.writeUInt32LE(text.charCodeAt(n), n * 4);
    const utf7 = await pipeline(
      h.layers,
      request(),
      text.replace("Consultation!", "Consultation+ACE-"),
      "application/json; charset=utf-7",
      async (body) => body,
    );
    const wide = await pipeline(
      h.layers,
      request(),
      utf32,
      "application/json; charset=utf-32le",
      async (body) => body,
    );
    expect(utf7.body).toEqual({
      name: "Consultation!",
      durationMinutes: 30,
      active: true,
    });
    expect(wide.body).toEqual({ code: "appointment.setup_invalid_request" });
  });
  it.each([
    [
      "service field",
      "POST",
      "/api/service",
      '{"name":"First","name":"Second","durationMinutes":30,"active":true}',
    ],
    [
      "escaped service field",
      "POST",
      "/api/service",
      '{"name":"First","\\u006eame":"Second","durationMinutes":30,"active":true}',
    ],
    [
      "schedule field",
      "POST",
      "/api/schedule",
      JSON.stringify(schedule).replace(
        '"capacity":3',
        '"capacity":2,"capacity":3',
      ),
    ],
    [
      "PATCH envelope",
      "PATCH",
      "/api/service/sample-service",
      '{"expectedValues":' +
        JSON.stringify(service) +
        ',"values":' +
        JSON.stringify(service) +
        ',"values":' +
        JSON.stringify(service) +
        "}",
    ],
    [
      "escaped PATCH envelope",
      "PATCH",
      "/api/service/sample-service",
      '{"expectedValues":' +
        JSON.stringify(service) +
        ',"values":' +
        JSON.stringify(service) +
        ',"\\u0076alues":' +
        JSON.stringify(service) +
        "}",
    ],
    [
      "PATCH nested expected field",
      "PATCH",
      "/api/service/sample-service",
      '{"expectedValues":{"name":"A","name":"B","durationMinutes":30,"active":true},"values":' +
        JSON.stringify(service) +
        "}",
    ],
  ])(
    "rejects duplicate wire %s before writes",
    async (_label, method, url, body) => {
      const h = apiHarness();
      await h.bootstrap();
      await h.store.update("service", "sample-service", service);
      const before = {
        services: structuredClone(await h.store.list("service")),
        schedules: structuredClone(await h.store.list("schedule")),
      };
      let dispatches = 0;
      const run = (headers: Record<string, unknown> = {}) =>
        pipeline(
          h.layers,
          request(url, method, headers),
          body,
          "application/json",
          async (parsed) => {
            dispatches++;
            const entity = url.split("/")[2]!;
            return method === "PATCH"
              ? h.applicationRuntime.appointmentSetupUpdate(
                  actor(),
                  entity,
                  "sample-service",
                  "wire",
                  parsed,
                )
              : h.applicationRuntime.appointmentSetupCreate(
                  actor(),
                  entity,
                  "wire",
                  parsed,
                );
          },
        );
      const denied = await run({ "x-factory-fixture-session": "forged" });
      expect(denied.statusCode).toBe(403);
      expect(denied.body).toEqual({ code: "appointment.forbidden" });
      const rejected = await run();
      expect(rejected.statusCode).toBe(400);
      expect(rejected.body).toEqual({
        code: "appointment.setup_invalid_request",
      });
      expect(rejected.headers["cache-control"]).toBe("no-store");
      expect(dispatches).toBe(0);
      expect(await h.store.list("service")).toEqual(before.services);
      expect(await h.store.list("schedule")).toEqual(before.schedules);
      expect(await h.store.listAudit()).toHaveLength(0);
      expect(h.store.appointmentReceipts.size).toBe(0);
    },
  );
  it.each([
    ["/API/service", "POST"],
    ["/API/schedule/a", "PATCH"],
  ])(
    "guards case-insensitive framework prefix %s before parsing",
    async (url, method) => {
      const h = apiHarness();
      await h.bootstrap();
      const denied = await pipeline(
        h.layers,
        request(url, method, { "x-factory-fixture-session": "forged" }),
        "{",
      );
      expect(denied.statusCode).toBe(403);
      expect(denied.body).toEqual({ code: "appointment.forbidden" });
      const invalid = await pipeline(h.layers, request(url, method), "{");
      expect(invalid.statusCode).toBe(400);
      expect(invalid.body).toEqual({
        code: "appointment.setup_invalid_request",
      });
    },
  );
  it("registers auth/raw-path before real default parsing and setup error translation before initialization", async () => {
    const h = apiHarness();
    await h.bootstrap();
    expect(h.calls).toEqual([
      'create:{"bodyParser":false}',
      "parser",
      "initialize",
    ]);
    const forbidden = await pipeline(
      h.layers,
      request("/api/service", "POST", {
        "x-factory-fixture-session": "forged",
      }),
      "{",
    );
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body).toEqual({ code: "appointment.forbidden" });
    expect(forbidden.headers["cache-control"]).toBe("no-store");
    const invalid = await pipeline(h.layers, request(), "{");
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body).toEqual({ code: "appointment.setup_invalid_request" });
    const malformed = await pipeline(
      h.layers,
      request("/api/schedule/%E0%A4%A", "PATCH"),
      "{",
    );
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).toEqual({
      code: "appointment.setup_invalid_request",
    });
    const valid = await pipeline(h.layers, request(), JSON.stringify(service));
    expect(valid.body).toBeUndefined();
    const unrelated = await pipeline(
      h.layers,
      request("/api/appointment", "POST"),
      "{",
    );
    expect(unrelated.body).toEqual({ generic: true });
    const booking = await pipeline(
      h.layers,
      request("/api/appointment/a/events/confirm", "POST"),
      "{",
    );
    expect(booking.body).toEqual({ generic: true });
  });
  it.each([
    "/api/schedule/%",
    "/api/schedule/%C0%AF",
    "/api/schedule/%252f",
    "/api/schedule/a%2Fb",
    "/api/schedule/a%5Cb",
    "/api/schedule/%20a",
    "/api/schedule/a%00",
    "/api/schedule/a/b",
    "/api/schedule/a?x=1&x=2",
  ])("bounds raw path %s after authentication", async (url) => {
    const h = apiHarness();
    await h.bootstrap();
    const denied = await pipeline(
      h.layers,
      request(url, "PATCH", { "x-factory-fixture-session": "forged" }),
      "{",
    );
    expect(denied.statusCode).toBe(403);
    expect(denied.body).toEqual({ code: "appointment.forbidden" });
    const invalid = await pipeline(h.layers, request(url, "PATCH"), "{");
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body).toEqual({ code: "appointment.setup_invalid_request" });
    expect(invalid.headers["cache-control"]).toBe("no-store");
  });
  it("accepts a once-decoded safe route ID and rejects duplicate raw headers and unknown targets", async () => {
    const h = apiHarness();
    await h.bootstrap();
    expect(
      (await pipeline(h.layers, request("/api/schedule/%61?", "PATCH"), "{}"))
        .body,
    ).toBeUndefined();
    const duplicate = {
      ...request(),
      rawHeaders: [
        "x-factory-idempotency-key",
        "intent",
        "X-Factory-Idempotency-Key",
        "intent",
      ],
    };
    expect((await pipeline(h.layers, duplicate, "{}")).body).toEqual({
      code: "appointment.setup_invalid_request",
    });
    expect(
      (await pipeline(h.layers, request("/api/appointment/a", "PATCH"), "{"))
        .body,
    ).toEqual({ code: "appointment.forbidden" });
  });
  it("dispatches setup POST and PATCH with bounded errors and no-store", async () => {
    const h = apiHarness(),
      res = response();
    expect(typeof h.controller.appointmentSetupUpdate).toBe("function");
    const created = await h.controller.create(
      "service",
      service,
      request(),
      res,
    );
    const updated = await h.controller.appointmentSetupUpdate(
      "service",
      created.id,
      { expectedValues: service, values: { ...service, active: false } },
      request("/api/service/" + created.id, "PATCH"),
      res,
    );
    expect(updated.active).toBe(false);
    expect(res.headers["cache-control"]).toBe("no-store");
    await expect(
      h.controller.create("service", service, request("/api/service?x=1"), res),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "appointment.setup_invalid_request" },
    });
    await expect(
      h.controller.create(
        "service",
        service,
        request("/api/service", "POST", {
          "x-factory-idempotency-key": ["a", "b"],
        }),
        res,
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "appointment.setup_invalid_request" },
    });
  });
  it("forwards setup PATCH once, preserves query/context, and bounds uncertain transport", async () => {
    const load = emitted(),
      proxy = load("web/app/api/[...path]/route.ts");
    expect(typeof proxy.PATCH).toBe("function");
    const fetch = vi
      .fn()
      .mockRejectedValue(new Error("private transport detail"));
    vi.stubGlobal("fetch", fetch);
    try {
      const req = new Request("http://local/api/service/a?unknown=1", {
        method: "PATCH",
        headers: {
          "x-factory-fixture-session": "fixture-session-administrator",
          "x-factory-idempotency-key": "intent",
          "x-factory-role": "staff",
        },
        body: "{}",
      });
      const result = await proxy.PATCH(req, {
        params: Promise.resolve({ path: ["service", "a"] }),
      });
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({
        code: "appointment.setup_unavailable",
      });
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0]![0].search).toBe("?unknown=1");
      expect(fetch.mock.calls[0]![1].headers["x-factory-role"]).toBeUndefined();
      expect(fetch.mock.calls[0]![1].headers["x-factory-idempotency-key"]).toBe(
        "intent",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("preserves upstream setup success/conflict and removes unbounded error material", async () => {
    const proxy = emitted()("web/app/api/[...path]/route.ts"),
      fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      const send = () =>
        proxy.POST(
          new Request("http://local/api/service", {
            method: "POST",
            headers: {
              "x-factory-fixture-session": "fixture-session-administrator",
              "x-factory-idempotency-key": "key",
            },
            body: JSON.stringify(service),
          }),
          { params: Promise.resolve({ path: ["service"] }) },
        );
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "service", ...service }), {
          status: 201,
        }),
      );
      let result = await send();
      expect(result.status).toBe(201);
      expect(await result.json()).toEqual({ id: "service", ...service });
      expect(result.headers.get("cache-control")).toBe("no-store");
      fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "appointment.setup_conflict",
            privateDetail: "suppressed",
          }),
          { status: 409 },
        ),
      );
      result = await send();
      expect(result.status).toBe(409);
      expect(await result.json()).toEqual({
        code: "appointment.setup_conflict",
      });
      fetch.mockResolvedValueOnce(
        new Response("private diagnostic", { status: 500 }),
      );
      result = await send();
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({
        code: "appointment.setup_unavailable",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it.each(["create", "update", "target-read", "service-read"])(
    "requires setup %s policy before any existence checks",
    async (policy) => {
      const h = apiHarness(),
        find = vi.spyOn(h.store, "find"),
        transaction = vi.spyOn(h.store, "inTransaction");
      const entity = policy === "service-read" ? "schedule" : "service";
      const action =
        policy === "target-read" || policy === "service-read" ? "read" : policy;
      const target = policy === "service-read" ? "service" : entity;
      for (let n = h.localPolicyRules.length - 1; n >= 0; n--)
        if (
          h.localPolicyRules[n].role === "administrator" &&
          h.localPolicyRules[n].resource === target &&
          h.localPolicyRules[n].action === action
        )
          h.localPolicyRules.splice(n, 1);
      const res = response();
      const result =
        policy === "update"
          ? h.controller.appointmentSetupUpdate(
              entity,
              "missing",
              {},
              request("/api/" + entity + "/missing", "PATCH"),
              res,
            )
          : h.controller.create(entity, {}, request("/api/" + entity), res);
      await expect(result).rejects.toMatchObject({
        status: 403,
        body: { code: "appointment.forbidden" },
      });
      expect(find).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(res.headers["cache-control"]).toBe("no-store");
    },
  );
});

describe("Emitted Prisma setup predicates and transaction retries (driver doubles, no PostgreSQL)", () => {
  function prisma() {
    const load = emitted({
      "@prisma/client": {
        PrismaClient: class {},
        Prisma: { AnyNull: "AnyNull" },
      },
    });
    return {
      ...load("api/src/prisma-record-store.ts"),
      ...load("api/src/application-runtime.ts"),
    };
  }
  it("uses projected current-reference existence without history/status filtering and exact occupied statuses", async () => {
    const { PrismaRecordStore } = prisma(),
      findFirst = vi.fn().mockResolvedValue({ id: "cancelled" }),
      count = vi.fn().mockResolvedValue(2);
    const store = new PrismaRecordStore({
      appointment: { findFirst, count },
      factory_AppointmentHistoryEntry: {
        findMany: () => {
          throw new Error("History admission forbidden");
        },
      },
    });
    expect(await store.hasAppointmentCurrentReference("slot")).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { scheduleId: "slot" },
      select: { id: true },
    });
    expect(await store.countAppointmentSetupOccupancy("slot")).toBe(2);
    expect(count).toHaveBeenCalledWith({
      where: { scheduleId: "slot", status: { in: ["requested", "confirmed"] } },
    });
  });
  it("compares internal Date values canonically and preserves original snapshot on Serializable retries", async () => {
    const { PrismaRecordStore, ApplicationRuntime } = prisma(),
      findUnique = vi.fn().mockResolvedValue({
        id: "slot",
        ...schedule,
        startUtc: new Date(schedule.startUtc),
        endUtc: new Date(schedule.endUtc),
      });
    const update = vi
      .fn()
      .mockImplementation(({ data }) => ({ id: "slot", ...data }));
    const client = {
      schedule: { findUnique, update },
      service: {
        findUnique: async () => ({ id: "sample-service", ...service }),
      },
      appointment: { count: async () => 0 },
      factory_AppointmentMutationReceipt: {
        findUnique: async () => undefined,
        create: async () => ({}),
      },
      factory_AuditEvent: { create: async () => ({}) },
    };
    let attempt = 0;
    const transaction = vi.fn(async (operation: Function, options: unknown) => {
      expect(options).toEqual({ isolationLevel: "Serializable" });
      attempt++;
      const result = await operation(client);
      if (attempt === 1) throw { code: "P2034" };
      return result;
    });
    const r = new ApplicationRuntime(
      new PrismaRecordStore({ ...client, $transaction: transaction }),
    );
    expect(
      (
        await r.appointmentSetupUpdate(actor(), "schedule", "slot", "key", {
          expectedValues: schedule,
          values: { ...schedule, capacity: 4 },
        })
      ).capacity,
    ).toBe(4);
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]).toEqual(update.mock.calls[1]);
    // A concurrent edit after the first attempt must conflict with the original expected values.
    attempt = 0;
    transaction.mockImplementation(async (operation: Function) => {
      attempt++;
      if (attempt === 2)
        findUnique.mockResolvedValue({ id: "slot", ...schedule, capacity: 5 });
      const result = await operation(client);
      if (attempt === 1) throw { code: "P2034" };
      return result;
    });
    await expect(
      r.appointmentSetupUpdate(actor(), "schedule", "slot", "other", {
        expectedValues: schedule,
        values: { ...schedule, capacity: 4 },
      }),
    ).rejects.toMatchObject(error("setup_conflict", 409));
  });
  it("maps retry exhaustion safely and replays persistent receipt through a fresh runtime without writes", async () => {
    const { PrismaRecordStore, ApplicationRuntime } = prisma();
    const transaction = vi.fn().mockRejectedValue({ code: "P2034" }),
      r = new ApplicationRuntime(
        new PrismaRecordStore({ $transaction: transaction }),
      );
    await expect(
      r.appointmentSetupCreate(actor(), "service", "key", service),
    ).rejects.toMatchObject(error("setup_retryable_conflict", 409));
    expect(transaction).toHaveBeenCalledTimes(3);
    let receipt: any;
    const create = vi.fn(async ({ data }) => ({
        id: "persisted-service",
        ...data,
      })),
      audit = vi.fn(async () => ({}));
    const client = {
      service: { create },
      factory_AuditEvent: { create: audit },
      factory_AppointmentMutationReceipt: {
        findUnique: async ({ where }: any) =>
          receipt &&
          receipt.scope === where.scope_idempotencyKey.scope &&
          receipt.idempotencyKey === where.scope_idempotencyKey.idempotencyKey
            ? structuredClone(receipt)
            : undefined,
        create: async ({ data }: any) => {
          receipt = structuredClone(data);
          return receipt;
        },
      },
    };
    const driver = {
      ...client,
      $transaction: async (operation: Function) => operation(client),
    };
    const first = new ApplicationRuntime(new PrismaRecordStore(driver)),
      created = await first.appointmentSetupCreate(
        actor(),
        "service",
        "key",
        service,
      );
    const restarted = new ApplicationRuntime(new PrismaRecordStore(driver));
    expect(
      await restarted.appointmentSetupCreate(
        actor(),
        "service",
        "key",
        service,
      ),
    ).toEqual(created);
    expect(create).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(receipt.scope).toMatch(
      /^factory\.generated\.appointment-setup\/v1:[a-f0-9]{64}$/,
    );
    expect(receipt.command).toBe("setup-create");
    expect(receipt.responseStatus).toBe(201);
  });
  it("applies the same create/update scalar admission before starting a Prisma transaction", async () => {
    const { PrismaRecordStore, ApplicationRuntime } = prisma(),
      transaction = vi.fn(() => {
        throw new Error("Validation must precede storage");
      }),
      r = new ApplicationRuntime(
        new PrismaRecordStore({ $transaction: transaction }),
      );
    for (const [entity, input] of [
      ["service", { ...service, active: "true" }],
      ["service", { ...service, durationMinutes: 2147483648 }],
      ["schedule", { ...schedule, startUtc: "2026-09-25T10:00:00Z" }],
      ["schedule", { ...schedule, serviceId: "a/b" }],
      ["schedule", { ...schedule, capacity: 0 }],
    ]) {
      await expect(
        r.appointmentSetupCreate(actor(), entity, "key", input),
      ).rejects.toMatchObject(error("setup_invalid_request"));
      await expect(
        r.appointmentSetupUpdate(actor(), entity, "record", "key", {
          expectedValues: entity === "service" ? service : schedule,
          values: input,
        }),
      ).rejects.toMatchObject(error("setup_invalid_request"));
    }
    expect(transaction).not.toHaveBeenCalled();
  });
});
function emitted(overrides: Record<string, unknown> = {}) {
  const cache = new Map<string, { exports: any }>();
  function load(path: string): any {
    if (path in overrides) return overrides[path];
    if (cache.has(path)) return cache.get(path)!.exports;
    const source = files.get(path);
    if (!source) throw new Error("Missing emitted module " + path);
    const module = { exports: {} as any };
    cache.set(path, module);
    const code = ts.transpileModule(
      source.replace(
        "void bootstrap();",
        "export { bootstrap, GeneratedController, applicationRuntime, localFixtureSessions, localPolicyRules };",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          experimentalDecorators: true,
        },
      },
    ).outputText;
    new Function("require", "module", "exports", code)(
      (specifier: string) =>
        specifier.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(
                  posix.dirname(path),
                  specifier.replace(/\.js$/, ".ts"),
                ),
              ),
            )
          : specifier in overrides
            ? overrides[specifier]
            : require(specifier),
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
const actor = () => ({
  role: "administrator",
  scope: "fixture:fixture-session-administrator",
  graphHash,
});
const service = { name: " Consultation ", durationMinutes: 30, active: true };
const schedule = {
  serviceId: "sample-service",
  startUtc: "2026-09-25T10:00:00.000Z",
  endUtc: "2026-09-25T11:00:00.000Z",
  timezone: "UTC",
  capacity: 3,
  status: "open",
};
const values = (record: any) =>
  Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key !== "id")
      .map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ]),
  );
function runtime() {
  const load = emitted(),
    { InMemoryRecordStore, ApplicationRuntime } = load(
      "api/src/application-runtime.ts",
    );
  const store = new InMemoryRecordStore();
  return { load, store, runtime: new ApplicationRuntime(store) };
}
const error = (code: string, status = 400) => ({
  code: "appointment." + code,
  status,
});

describe("Appointment administrator setup runtime", () => {
  it("provides strict create, full snapshot update, atomic audit and immutable replay", async () => {
    const { runtime: r, store } = runtime();
    expect(typeof r.appointmentSetupCreate).toBe("function");
    const created = await r.appointmentSetupCreate(
      actor(),
      "service",
      "create-1",
      service,
    );
    expect(created).toEqual({ id: expect.any(String), ...service });
    const body = {
      expectedValues: service,
      values: { ...service, active: false },
    };
    const saved = await r.appointmentSetupUpdate(
      actor(),
      "service",
      created.id,
      "update-1",
      body,
    );
    expect(saved.active).toBe(false);
    expect(
      await r.appointmentSetupCreate(actor(), "service", "create-1", service),
    ).toEqual(created);
    expect(await store.listAudit()).toHaveLength(2);
    expect(await store.listCapabilityEvents()).toHaveLength(0);
    await expect(
      r.appointmentSetupUpdate(actor(), "service", created.id, "stale", body),
    ).rejects.toMatchObject(error("setup_conflict", 409));
    await expect(
      r.appointmentSetupCreate(actor(), "service", "create-1", {
        ...service,
        name: "Other",
      }),
    ).rejects.toMatchObject(error("setup_idempotency_conflict", 409));
  });
  it.each(["customer", "staff", "anonymous"])(
    "denies %s and generic-create before storage",
    async (role) => {
      const { runtime: r, store } = runtime();
      const lookup = vi.spyOn(store, "inTransaction");
      expect(typeof r.appointmentSetupCreate).toBe("function");
      await expect(
        r.appointmentSetupCreate({ ...actor(), role }, "service", "x", service),
      ).rejects.toMatchObject(error("forbidden", 403));
      await expect(r.create(role, "service", service)).rejects.toMatchObject(
        error("forbidden", 403),
      );
      expect(lookup).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    [],
    {},
    { ...service, id: "forged" },
    { ...service, durationMinutes: "30" },
    { ...service, durationMinutes: 0 },
    { ...service, durationMinutes: 2147483648 },
    { ...service, active: 1 },
    { ...service, name: " " },
  ])("rejects invalid service shape %#", async (input) => {
    const { runtime: r, store } = runtime();
    expect(typeof r.appointmentSetupCreate).toBe("function");
    await expect(
      r.appointmentSetupCreate(actor(), "service", "invalid", input),
    ).rejects.toMatchObject(error("setup_invalid_request"));
    expect(await store.listAudit()).toHaveLength(0);
  });
  it.each([
    { capacity: 0 },
    { capacity: 1.5 },
    { capacity: 2147483648 },
    { serviceId: "%61" },
    { startUtc: "2026-09-25T10:00:00Z" },
    { startUtc: "2026-02-30T10:00:00.000Z" },
    { endUtc: "2026-09-25T09:00:00.000Z" },
    { timezone: "Invalid/Zone" },
    { timezone: " UTC" },
    { status: "pending" },
  ])("rejects invalid schedule domain %#", async (change) => {
    const { runtime: r } = runtime();
    expect(typeof r.appointmentSetupCreate).toBe("function");
    await expect(
      r.appointmentSetupCreate(actor(), "schedule", "invalid", {
        ...schedule,
        ...change,
      }),
    ).rejects.toMatchObject(error("setup_invalid_request"));
  });
  it("protects cancelled/no-history references but frees history-only slots and rolls back index state", async () => {
    const { runtime: r, store } = runtime();
    expect(typeof r.appointmentSetupCreate).toBe("function");
    const slot = await r.appointmentSetupCreate(
      actor(),
      "schedule",
      "slot",
      schedule,
    );
    const booking = await store.create("appointment", {
      scheduleId: slot.id,
      customerName: "Test",
      status: "cancelled",
    });
    const body = {
      expectedValues: schedule,
      values: { ...schedule, timezone: "Asia/Singapore" },
    };
    await expect(
      r.appointmentSetupUpdate(actor(), "schedule", slot.id, "edit", body),
    ).rejects.toMatchObject(error("setup_slot_in_use", 409));
    await expect(
      store.inTransaction(async (tx: any) => {
        await tx.update("appointment", booking.id, { scheduleId: "elsewhere" });
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    await expect(
      r.appointmentSetupUpdate(actor(), "schedule", slot.id, "edit", body),
    ).rejects.toMatchObject(error("setup_slot_in_use", 409));
    const snapshot = {
      scheduleId: slot.id,
      serviceId: schedule.serviceId,
      startUtc: schedule.startUtc,
      endUtc: schedule.endUtc,
      timezone: schedule.timezone,
    };
    for (let n = 0; n < 105; n++)
      await store.appendAppointmentHistory({
        apiVersion: "factory.generated.appointment-history-entry/v1",
        appointmentId: booking.id,
        action: "move",
        fromSlot: snapshot,
        toSlot: snapshot,
        fromStatus: "confirmed",
        toStatus: "requested",
        actorRole: "staff",
        cancellationReason: null,
        at: new Date(1767225600000 + n).toISOString(),
      });
    await store.update("appointment", booking.id, { scheduleId: "elsewhere" });
    const before = await r.appointmentSummary("administrator", booking.id);
    expect(
      (
        await r.appointmentSetupUpdate(
          actor(),
          "schedule",
          slot.id,
          "edit",
          body,
        )
      ).timezone,
    ).toBe("Asia/Singapore");
    expect(await r.appointmentSummary("administrator", booking.id)).toEqual(
      before,
    );
  });
  it("cannot turn a malformed update target into a create intent", async () => {
    const { runtime: r, store } = runtime();
    await expect(
      r.appointmentSetupUpdate(actor(), "service", undefined, "bad", service),
    ).rejects.toMatchObject(error("setup_invalid_request"));
    expect(await store.listAudit()).toHaveLength(0);
  });
  it.each([
    { scope: "fixture:forged" },
    { graphHash: "other" },
    { role: "administrator", scope: "fixture:fixture-session-customer" },
  ])(
    "denies forged server binding %# before receipt or record calls",
    async (change) => {
      const { runtime: r, store } = runtime(),
        transaction = vi.spyOn(store, "inTransaction");
      await expect(
        r.appointmentSetupCreate(
          { ...actor(), ...change },
          "service",
          "key",
          service,
        ),
      ).rejects.toMatchObject(error("forbidden", 403));
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it("rejects generic administrator bypass and non-setup update targets", async () => {
    const { runtime: r, store } = runtime(),
      find = vi.spyOn(store, "find");
    await expect(
      r.create("administrator", "service", service),
    ).rejects.toMatchObject(error("forbidden", 403));
    await expect(
      r.appointmentSetupUpdate(actor(), "appointment", "a", "key", {}),
    ).rejects.toMatchObject(error("forbidden", 403));
    expect(find).not.toHaveBeenCalled();
  });
  it("orders missing target, stale snapshot and missing reference checks", async () => {
    const { runtime: r } = runtime();
    await expect(
      r.appointmentSetupCreate(actor(), "schedule", "missing", {
        ...schedule,
        serviceId: "missing",
      }),
    ).rejects.toMatchObject(error("setup_invalid_reference"));
    await expect(
      r.appointmentSetupUpdate(actor(), "schedule", "missing", "missing", {
        expectedValues: schedule,
        values: { ...schedule, serviceId: "missing" },
      }),
    ).rejects.toMatchObject(error("setup_not_found", 404));
    const slot = await r.appointmentSetupCreate(
      actor(),
      "schedule",
      "slot",
      schedule,
    );
    await expect(
      r.appointmentSetupUpdate(actor(), "schedule", slot.id, "stale", {
        expectedValues: { ...schedule, capacity: 2 },
        values: { ...schedule, serviceId: "missing" },
      }),
    ).rejects.toMatchObject(error("setup_conflict", 409));
  });
  it.each(["create", "appendAudit", "saveAppointmentReceipt"])(
    "rolls back %s failure including records, indexes, receipts and audit",
    async (method) => {
      const { runtime: r, store } = runtime(),
        transact = store.inTransaction.bind(store);
      store.inTransaction = (operation: Function) =>
        transact(async (tx: any) => {
          const original = tx[method].bind(tx);
          tx[method] = async (...args: any[]) => {
            await original(...args);
            throw new Error("private storage failure");
          };
          return operation(tx);
        });
      const before = await store.list("schedule");
      await expect(
        r.appointmentSetupCreate(actor(), "schedule", "rollback", schedule),
      ).rejects.toMatchObject(error("setup_unavailable", 503));
      expect(await store.list("schedule")).toEqual(before);
      expect(await store.listAudit()).toHaveLength(0);
      store.inTransaction = transact;
      const saved = await r.appointmentSetupCreate(
        actor(),
        "schedule",
        "rollback",
        schedule,
      );
      expect(saved.id).toBe("schedule-3");
      expect(await store.listAudit()).toHaveLength(1);
    },
  );
  it("serializes stale edits and duplicate creates while exact replay stays detached", async () => {
    const { runtime: r, store } = runtime();
    const [one, two] = await Promise.all([
      r.appointmentSetupCreate(actor(), "service", "same", service),
      r.appointmentSetupCreate(
        actor(),
        "service",
        "same",
        Object.fromEntries(Object.entries(service).reverse()),
      ),
    ]);
    expect(one).toEqual(two);
    one.name = "tampered";
    const results = await Promise.allSettled([
      r.appointmentSetupUpdate(actor(), "service", two.id, "a", {
        expectedValues: service,
        values: { ...service, name: "A" },
      }),
      r.appointmentSetupUpdate(actor(), "service", two.id, "b", {
        expectedValues: service,
        values: { ...service, name: "B" },
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: error("setup_conflict", 409),
    });
    expect(
      await r.appointmentSetupCreate(actor(), "service", "same", service),
    ).toEqual(two);
    expect(await store.listAudit()).toHaveLength(2);
  });
  it.each(["requested", "confirmed", "cancelled"])(
    "protects %s identity and permits safe capacity/status changes",
    async (status) => {
      const { runtime: r, store } = runtime(),
        slot = await r.appointmentSetupCreate(
          actor(),
          "schedule",
          "slot",
          schedule,
        );
      await store.create("appointment", { scheduleId: slot.id, status });
      await store.create("appointment", { scheduleId: slot.id, status });
      await expect(
        r.appointmentSetupUpdate(actor(), "schedule", slot.id, "retime", {
          expectedValues: schedule,
          values: { ...schedule, startUtc: "2026-09-25T10:30:00.000Z" },
        }),
      ).rejects.toMatchObject(error("setup_slot_in_use", 409));
      const reduced = { ...schedule, capacity: 1, status: "closed" };
      if (status !== "cancelled")
        await expect(
          r.appointmentSetupUpdate(actor(), "schedule", slot.id, "reduce", {
            expectedValues: schedule,
            values: reduced,
          }),
        ).rejects.toMatchObject(error("setup_capacity_conflict", 409));
      else
        expect(
          (
            await r.appointmentSetupUpdate(
              actor(),
              "schedule",
              slot.id,
              "reduce",
              { expectedValues: schedule, values: reduced },
            )
          ).capacity,
        ).toBe(1);
      if (status !== "cancelled")
        expect(
          (
            await r.appointmentSetupUpdate(
              actor(),
              "schedule",
              slot.id,
              "equal",
              {
                expectedValues: schedule,
                values: { ...schedule, capacity: 2, status: "closed" },
              },
            )
          ).capacity,
        ).toBe(2);
    },
  );
  it.each(["retime", "capacity"])(
    "serializes first claim against %s in both orders",
    async (change) => {
      for (const setupFirst of [true, false]) {
        const { runtime: r, store } = runtime(),
          slot = await r.appointmentSetupCreate(
            actor(),
            "schedule",
            "slot",
            schedule,
          );
        const claim = () =>
          r.appointmentCommand(
            {
              role: "customer",
              scope: "fixture:fixture-session-customer",
              graphHash,
            },
            "appointment",
            undefined,
            "create",
            "claim",
            { values: { scheduleId: slot.id, customerName: "Test" } },
          );
        const proposed =
          change === "retime"
            ? { ...schedule, startUtc: "2026-09-25T10:30:00.000Z" }
            : { ...schedule, capacity: 1 };
        const edit = () =>
          r.appointmentSetupUpdate(actor(), "schedule", slot.id, "edit", {
            expectedValues: schedule,
            values: proposed,
          });
        const transact = store.inTransaction.bind(store);
        let first = true,
          release!: () => void,
          entered!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
          }),
          started = new Promise<void>((resolve) => {
            entered = resolve;
          });
        store.inTransaction = (operation: Function) =>
          transact(async (tx: any) => {
            if (first) {
              first = false;
              entered();
              await gate;
            }
            return operation(tx);
          });
        const leading = setupFirst ? edit() : claim();
        await started;
        const following = setupFirst ? claim() : edit();
        release();
        const outcomes = await Promise.allSettled([leading, following]);
        if (change === "retime" && !setupFirst)
          expect(outcomes[1]).toMatchObject({
            status: "rejected",
            reason: error("setup_slot_in_use", 409),
          });
        else expect(outcomes.every((r) => r.status === "fulfilled")).toBe(true);
        const bookings = (await store.list("appointment")).filter(
          (r: any) => r.scheduleId === slot.id,
        );
        expect(bookings).toHaveLength(1);
        const history = await store.listAppointmentHistory(bookings[0].id, 100);
        expect(history[0].toSlot.startUtc).toBe(
          change === "retime" && setupFirst
            ? proposed.startUtc
            : schedule.startUtc,
        );
      }
    },
  );
  it("serializes a capacity reduction against the last available claim in both orders", async () => {
    for (const setupFirst of [true, false]) {
      const { runtime: r, store } = runtime(),
        initial = { ...schedule, capacity: 2 },
        slot = await r.appointmentSetupCreate(
          actor(),
          "schedule",
          "slot",
          initial,
        );
      await store.create("appointment", {
        scheduleId: slot.id,
        status: "requested",
      });
      const transact = store.inTransaction.bind(store);
      let first = true,
        release!: () => void,
        entered!: () => void;
      const gate = new Promise<void>((resolve) => {
          release = resolve;
        }),
        started = new Promise<void>((resolve) => {
          entered = resolve;
        });
      store.inTransaction = (operation: Function) =>
        transact(async (tx: any) => {
          if (first) {
            first = false;
            entered();
            await gate;
          }
          return operation(tx);
        });
      const claim = () =>
        r.appointmentCommand(
          {
            role: "customer",
            scope: "fixture:fixture-session-customer",
            graphHash,
          },
          "appointment",
          undefined,
          "create",
          "last",
          { values: { scheduleId: slot.id, customerName: "Test" } },
        );
      const edit = () =>
        r.appointmentSetupUpdate(actor(), "schedule", slot.id, "reduce", {
          expectedValues: initial,
          values: { ...initial, capacity: 1 },
        });
      const firstResult = setupFirst ? edit() : claim();
      await started;
      const next = setupFirst ? claim() : edit();
      release();
      const result = await Promise.allSettled([firstResult, next]);
      expect(result[0].status).toBe("fulfilled");
      expect(result[1]).toMatchObject({
        status: "rejected",
        reason: error(
          setupFirst ? "capacity_conflict" : "setup_capacity_conflict",
          409,
        ),
      });
    }
  });
  it("preserves real booking transitions, history snapshots and metadata across setup changes", async () => {
    const { runtime: r, store } = runtime();
    const created = await r.appointmentSetupCreate(
        actor(),
        "service",
        "service",
        service,
      ),
      initial = { ...schedule, serviceId: created.id };
    const one = await r.appointmentSetupCreate(
        actor(),
        "schedule",
        "one",
        initial,
      ),
      two = await r.appointmentSetupCreate(actor(), "schedule", "two", {
        ...initial,
        startUtc: "2026-09-26T10:00:00.000Z",
        endUtc: "2026-09-26T11:00:00.000Z",
      });
    const customer = {
        role: "customer",
        scope: "fixture:fixture-session-customer",
        graphHash,
      },
      staff = {
        role: "staff",
        scope: "fixture:fixture-session-staff",
        graphHash,
      };
    const booking = await r.appointmentCommand(
      customer,
      "appointment",
      undefined,
      "create",
      "book",
      { values: { scheduleId: one.id, customerName: "Test" } },
    );
    const closed = { ...initial, status: "closed" },
      inactive = { ...service, name: "Updated label", active: false };
    await r.appointmentSetupUpdate(actor(), "schedule", one.id, "close", {
      expectedValues: initial,
      values: closed,
    });
    await r.appointmentSetupUpdate(
      actor(),
      "service",
      created.id,
      "deactivate",
      { expectedValues: service, values: inactive },
    );
    const confirmed = await r.appointmentCommand(
      staff,
      "appointment",
      booking.id,
      "confirm",
      "confirm",
      { expectedVersion: 0 },
    );
    expect(confirmed.status).toBe("confirmed");
    expect(
      (await r.appointmentSummary("administrator", booking.id)).serviceName,
    ).toBe("Updated label");
    const query =
      "/api/appointment-availability?from=2026-09-25T00:00:00.000Z&to=2026-09-27T00:00:00.000Z&serviceId=" +
      created.id;
    expect(
      (
        await r.appointmentAvailability(
          "customer",
          query,
          "2026-09-24T10:00:00.000Z",
        )
      ).slots,
    ).toHaveLength(0);
    await r.appointmentSetupUpdate(actor(), "service", created.id, "activate", {
      expectedValues: inactive,
      values: { ...inactive, active: true },
    });
    const moved = await r.appointmentCommand(
      staff,
      "appointment",
      booking.id,
      "reschedule",
      "move",
      { expectedVersion: 1, scheduleId: two.id },
    );
    expect(moved.scheduleId).toBe(two.id);
    const history = structuredClone(
        await store.listAppointmentHistory(booking.id, 100),
      ),
      summary = await r.appointmentSummary("administrator", booking.id);
    await r.appointmentSetupUpdate(actor(), "schedule", one.id, "correct", {
      expectedValues: closed,
      values: { ...closed, startUtc: "2026-09-25T10:30:00.000Z" },
    });
    expect(await store.listAppointmentHistory(booking.id, 100)).toEqual(
      history,
    );
    expect(await r.appointmentSummary("administrator", booking.id)).toEqual(
      summary,
    );
    await r.appointmentSetupUpdate(
      actor(),
      "service",
      created.id,
      "inactive-again",
      { expectedValues: { ...inactive, active: true }, values: inactive },
    );
    const cancelled = await r.appointmentCommand(
      customer,
      "appointment",
      booking.id,
      "cancel",
      "cancel",
      { expectedVersion: 2, cancellationReason: "Changed plans" },
    );
    expect(cancelled.status).toBe("cancelled");
  });
  it("permits past, overlapping, unequal-duration schedules and inactive service setup without normalization", async () => {
    const { runtime: r } = runtime(),
      inactive = await r.appointmentSetupCreate(
        actor(),
        "service",
        "inactive",
        { ...service, durationMinutes: 2147483647, active: false },
      );
    const input = {
      ...schedule,
      serviceId: inactive.id,
      startUtc: "2020-01-01T01:00:00.000Z",
      endUtc: "2020-01-01T01:01:00.000Z",
      timezone: "Etc/UTC",
    };
    const a = await r.appointmentSetupCreate(actor(), "schedule", "a", input),
      b = await r.appointmentSetupCreate(actor(), "schedule", "b", input);
    expect(values(a)).toEqual(input);
    expect(values(b)).toEqual(input);
    expect(a.id).not.toBe(b.id);
  });
  it("isolates entity and command receipts, hashes canonical bodies, and coexists with original booking keys", async () => {
    const { runtime: r, store } = runtime(),
      created = await r.appointmentSetupCreate(
        actor(),
        "service",
        "shared",
        service,
      );
    const slot = await r.appointmentSetupCreate(
      actor(),
      "schedule",
      "shared",
      schedule,
    );
    await r.appointmentSetupUpdate(actor(), "service", created.id, "shared", {
      expectedValues: service,
      values: service,
    });
    await r.appointmentCommand(
      {
        role: "customer",
        scope: "fixture:fixture-session-customer",
        graphHash,
      },
      "appointment",
      undefined,
      "create",
      "shared",
      { values: { scheduleId: slot.id, customerName: "Test" } },
    );
    const receipts = [...store.appointmentReceipts.values()] as any[];
    expect(receipts).toHaveLength(4);
    expect(new Set(receipts.map((r) => r.scope)).size).toBe(4);
    const create = receipts.find(
      (r) => r.command === "setup-create" && r.recordId === created.id,
    )!;
    expect(create.scope).toBe(
      "factory.generated.appointment-setup/v1:" +
        createHash("sha256")
          .update(
            JSON.stringify([
              graphHash,
              "fixture:fixture-session-administrator",
              "administrator",
              "service",
              "$create",
              "setup-create",
            ]),
          )
          .digest("hex"),
    );
    expect(create.requestHash).toBe(
      createHash("sha256")
        .update(
          JSON.stringify({
            active: true,
            durationMinutes: 30,
            name: " Consultation ",
          }),
        )
        .digest("hex"),
    );
    expect(receipts.find((r) => r.command === "create").scope).toMatch(
      /^[a-f0-9]{64}$/,
    );
    const audit = await store.listAudit();
    expect(audit).toHaveLength(3);
    expect(Object.keys(audit[0]).sort()).toEqual([
      "action",
      "actor",
      "at",
      "entity",
      "recordId",
    ]);
  });
});
