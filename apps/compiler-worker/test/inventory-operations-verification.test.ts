import { describe, expect, it } from "vitest";
import { inventoryOperationsInput } from "../../../packages/compiler/test/fixtures/inventory-operations.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";
import { runRoleJourneyProbe } from "../src/verifier/probes.js";
import {
  inventoryPrismaHarness,
  loadInventoryRuntime,
} from "../../../packages/compiler/test/fixtures/inventory-operations-runtime.js";
import type { PreviewProcessRunner } from "../src/preview-runner.js";
import { selectInventoryOperationsProfile } from "@factory/compiler";
import type { InventoryReadExpectation } from "../src/verifier/inventory-operations-verification.js";

function environment(
  fetch: typeof globalThis.fetch,
  processRunner?: PreviewProcessRunner,
  timeout = 1000,
) {
  return new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-inventory-probe",
    rootDirectory: "inventory-probe",
    composeProjectName: "factory-preview-inventory-probe",
    artifacts: [],
    operationTimeoutMs: timeout,
    startPreviewRun: async () => ({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    }),
    stopPreviewRun: async () => undefined,
    fetch,
    processRunner,
  });
}

async function exercise(
  options: {
    corruptRead?: (body: any, path: string, method: string) => any;
    corruptAudit?: (rows: any[]) => any[];
    corruptEffect?: (rows: any[]) => any[];
    prismaNoise?: boolean;
    runner?: PreviewProcessRunner;
  } = {},
) {
  const input = inventoryOperationsInput(),
    profile = deriveVerificationProfile(input.graph, input.compositionLock);
  const db = inventoryPrismaHarness(),
    emitted = loadInventoryRuntime(db.client);
  const controller = new (emitted.load(
    "api/src/main.ts",
  ).GeneratedController)();
  const observed: string[] = [];
  const reader = (collection: "audit" | "effects") => ({
    findMany: async ({ where, take, select }: any) => {
      let rows = db
        .snapshot()
        [collection].filter((row: any) => row.entity === where.entity);
      if (collection === "audit" && options.corruptAudit)
        rows = options.corruptAudit(rows);
      if (collection === "effects" && options.corruptEffect)
        rows = options.corruptEffect(rows);
      return rows
        .slice(0, take)
        .map((row: any) =>
          Object.fromEntries(Object.keys(select).map((key) => [key, row[key]])),
        );
    },
  });
  const runner: PreviewProcessRunner =
    options.runner ??
    (async (command) => {
      expect(command.file).toBe("docker");
      expect(command.args.slice(0, 10)).toEqual([
        "compose",
        "--file",
        "docker-compose.yml",
        "--project-name",
        "factory-preview-inventory-probe",
        "--project-directory",
        "generated/.preview-runs/preview-inventory-probe",
        "exec",
        "-T",
        "api",
      ]);
      expect(command.args[10]).toBe("node");
      expect(command.args[11]).toBe("-e");
      expect(command.args).toHaveLength(14);
      let output = "";
      const process = {
        argv: ["node", command.args[13]],
        exitCode: 1,
        stdout: {
          write: (value: string) => {
            output += value;
            return true;
          },
        },
        stderr: {
          write: (value: string) => {
            output += value;
            return true;
          },
        },
      };
      const client = {
        factory_AuditEvent: reader("audit"),
        factory_CapabilityEvent: reader("effects"),
        $disconnect: async () => undefined,
      };
      await new Function("require", "process", "return " + command.args[12])(
        (name: string) => {
          expect(name).toBe("@prisma/client");
          return {
            PrismaClient: class {
              constructor() {
                if (options.prismaNoise) {
                  process.stdout.write("private-driver-noise");
                  process.stderr.write("private-driver-noise");
                }
                return client;
              }
            },
          };
        },
        process,
      );
      if (process.exitCode !== 0) throw Error("Private observation failed");
      observed.push("persisted-effect");
      return output;
    });
  const env = environment(async (url, init) => {
    const parsed = new URL(String(url)),
      parts = parsed.pathname.split("/").filter(Boolean),
      method = init?.method ?? "GET";
    const request = {
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      originalUrl: parsed.pathname,
    };
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    try {
      let result =
        method === "GET"
          ? parts[3] === "movements"
            ? await controller.history(parts[1], parts[2], request)
            : parts[2]
              ? await controller.read(parts[1], parts[2], request)
              : await controller.list(parts[1], request)
          : method === "PATCH"
            ? await controller.update(parts[1], parts[2], body, request)
            : parts[3] === "events"
              ? await controller.transition()
              : parts[4]
                ? await controller[parts[4]](parts[1], parts[2], body, request)
                : await controller.create(parts[1], body, request);
      if (options.corruptRead)
        result = options.corruptRead(result, parsed.pathname, method);
      observed.push(method + " " + parsed.pathname);
      return new Response(JSON.stringify(result), {
        status: method === "POST" ? 201 : 200,
      });
    } catch (error: any) {
      return new Response(JSON.stringify(error.body), { status: error.status });
    }
  }, runner);
  await env.boot();
  const entry = profile.stepPlan.find(
    (entry) => entry.stepId === "inventory-stock-lifecycle",
  )!;
  const result = await runRoleJourneyProbe(
    { entry, environment: env, signal: new AbortController().signal },
    profile.journeys[entry.stepId]!,
    profile.apiRegistry,
  );
  return { result, snapshot: db.snapshot(), observed };
}

describe("Inventory worker verification", () => {
  it("selects the exact immutable empty-store profile rather than generic numeric seeds", () => {
    const input = inventoryOperationsInput();
    const profile = deriveVerificationProfile(
      input.graph,
      input.compositionLock,
    );
    expect(
      profile.stepPlan.some(
        (entry) => entry.stepId === "inventory-stock-lifecycle",
      ),
    ).toBe(true);
    expect(input.graph.domain.seedData).toEqual([]);
  });
  it("proves zero/create, receive/readback, issue, linked correction, replay and denial through the emitted API", async () => {
    const { result, snapshot, observed } = await exercise();
    expect(result.status).toBe("passed");
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      quantity: 1,
      version: 4,
      name: "Verifier corrected item",
    });
    expect(
      snapshot.movements.map((row) => [
        row.kind,
        row.delta,
        row.beforeQuantity,
        row.afterQuantity,
        row.itemVersion,
      ]),
    ).toEqual([
      ["receive", 1, 0, 1, 1],
      ["issue", -1, 1, 0, 2],
      ["adjust", 1, 0, 1, 3],
    ]);
    expect(snapshot.movements[2].correctionOf).toBe(snapshot.movements[0].id);
    expect(snapshot.receipts).toHaveLength(5);
    expect(snapshot.audit).toHaveLength(5);
    expect(snapshot.effects).toHaveLength(3);
    expect(
      observed.filter((value) => value === "persisted-effect").length,
    ).toBeGreaterThanOrEqual(2);
    for (const privateValue of [
      "fixture-session",
      "Verifier corrected",
      "items-1",
      "movements-1",
    ])
      expect(JSON.stringify(result)).not.toContain(privateValue);
  });
  it.each([
    "quantity",
    "version",
    "id",
    "stockItem",
    "delta",
    "beforeQuantity",
    "afterQuantity",
    "itemVersion",
    "status",
    "actorRole",
    "reason",
    "recordedAt",
  ])("fails closed when the actual API read has wrong %s", async (field) => {
    const { result } = await exercise({
      corruptRead: (body, path, method) => {
        if (method !== "GET") return body;
        if (
          ["quantity", "version", "id"].includes(field) &&
          path.endsWith("items-1")
        )
          return { ...body, [field]: field === "id" ? "other-item" : 99 };
        if (body.records?.[0]?.kind)
          return {
            ...body,
            records: [{ ...body.records[0], [field]: "wrong" }],
          };
        return body;
      },
    });
    expect(result.status).toBe("failed");
  });
  it.each(["missing", "duplicate", "unrelated", "wrong-action"])(
    "rejects %s persisted audit evidence",
    async (kind) => {
      const { result } = await exercise({
        corruptAudit: (rows) =>
          kind === "missing"
            ? []
            : kind === "duplicate"
              ? [...rows, ...rows]
              : rows.map((row) => ({
                  ...row,
                  ...(kind === "unrelated"
                    ? { recordId: "unrelated" }
                    : { action: "other" }),
                })),
      });
      expect(result.status).toBe("failed");
      expect(JSON.stringify(result)).not.toContain("Private");
    },
  );
  it("fails closed on private runner errors without exposing output", async () => {
    const { result } = await exercise({
      runner: async () => {
        throw Error("private-database-material");
      },
    });
    expect(result.status).toBe("failed");
    expect(JSON.stringify(result)).not.toContain("private-database-material");
  });
  it("suppresses driver output before a private database observation begins", async () => {
    const { result } = await exercise({ prismaNoise: true });
    expect(result.status).toBe("passed");
  });
  it("rejects an extra item visible after denied creation", async () => {
    const { result } = await exercise({
      corruptRead: (body) =>
        body.records?.[0]?.sku
          ? {
              ...body,
              records: [
                ...body.records,
                { ...body.records[0], id: "extra-item" },
              ],
            }
          : body,
    });
    expect(result.status).toBe("failed");
  });
  it.each([
    "missing",
    "duplicate",
    "unrelated",
    "capability",
    "operation",
    "actor",
    "outcome",
    "at",
  ])("rejects %s persisted capability evidence", async (field) => {
    const { result } = await exercise({
      corruptEffect: (rows) =>
        field === "missing"
          ? []
          : field === "duplicate"
            ? [...rows, ...rows]
            : rows.map((row) => ({
                ...row,
                [field === "unrelated" ? "recordId" : field]:
                  field === "at" ? "2000-01-01T00:00:00.000Z" : "wrong",
              })),
    });
    expect(result.status).toBe("failed");
  });
  it("uses compiler admission for persisted input and rejects missing, stale and altered locks", () => {
    const input = JSON.parse(JSON.stringify(inventoryOperationsInput()));
    expect(
      selectInventoryOperationsProfile(input.graph, input.compositionLock)?.key,
    ).toBe("inventory-operations");
    expect(
      deriveVerificationProfile(input.graph, input.compositionLock).stepPlan,
    ).toHaveLength(3);
    for (const mutate of [
      (value: any) => {
        value.compositionLock = undefined;
      },
      (value: any) => {
        value.compositionLock.applicationGraphChecksum =
          "sha256:" + "0".repeat(64);
      },
      (value: any) => {
        value.compositionLock.packages[0].lock.manifestDigest =
          "sha256:" + "0".repeat(64);
      },
      (value: any) => {
        value.compositionLock.packages[0].bindings = {};
      },
      (value: any) => {
        value.graph.domain.seedData = [{ entity: "stock-item", records: [] }];
      },
    ]) {
      const changed = structuredClone(input);
      mutate(changed);
      expect(() =>
        deriveVerificationProfile(changed.graph, changed.compositionLock),
      ).toThrow();
    }
  });
  it.each([
    "overflow",
    "malformed",
    "utf8",
    "stream-timeout",
    "wrong-page",
    "extra-field",
  ])("bounds and rejects %s read responses", async (kind) => {
    const expected: InventoryReadExpectation = {
      kind: "item",
      actor: "stockkeeper",
      corrected: false,
      quantity: 0,
      version: 0,
      movements: [],
    };
    const row = {
      id: "safe-item",
      sku: "VERIFIER-STOCK-01",
      name: "Verifier stock item",
      unit: "each",
      quantity: 0,
      version: 0,
    };
    const response =
      kind === "stream-timeout"
        ? new Response(new ReadableStream({ start() {} }))
        : kind === "utf8"
          ? new Response(new Uint8Array([0xff]))
          : new Response(
              kind === "overflow"
                ? " ".repeat(17 * 1024)
                : kind === "malformed"
                  ? "{"
                  : JSON.stringify(
                      kind === "extra-field"
                        ? { ...row, private: "hidden" }
                        : { ...row, id: "wrong" },
                    ),
            );
    const env = environment(async () => response, undefined, 15);
    await env.boot();
    const result = await env.request(
      "GET",
      "/api/stock-item/safe-item",
      "api",
      { inventoryRead: { ...expected, recordId: "safe-item" } },
    );
    expect(result.inventoryReadMatches).toBe(false);
    expect(result.recordId).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("hidden");
  });
  it("rejects additional database instructions and unbounded identifiers before process execution", async () => {
    let calls = 0;
    const env = environment(
      async () => new Response(),
      async () => {
        calls++;
        return undefined;
      },
    );
    await env.boot();
    for (const input of [
      {
        entity: "stock-movement",
        actor: "stockkeeper",
        movementIds: ["safe"],
        program: "arbitrary",
      },
      {
        entity: "stock-movement",
        actor: "stockkeeper",
        movementIds: ["unsafe;code"],
      },
      {
        entity: "stock-movement",
        actor: "stockkeeper",
        movementIds: ["x", "x"],
      },
      {
        entity: "stock-movement",
        actor: "stockkeeper",
        movementIds: ["a", "b", "c", "d"],
      },
    ])
      await expect(env.observeInventoryAudit(input)).rejects.toThrow();
    expect(calls).toBe(0);
  });
  it("turns an observation timeout or unexpected output into a safe failed result", async () => {
    for (const runner of [
      async (_command: unknown, signal: AbortSignal) =>
        new Promise<string>((_resolve, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(Error("private-timeout")),
            { once: true },
          ),
        ),
      async () => "private-unexpected-output",
    ]) {
      const env = environment(async () => new Response(), runner, 15);
      await env.boot();
      const result = await env.observeInventoryAudit({
        entity: "stock-movement",
        actor: "stockkeeper",
        movementIds: ["one"],
      });
      expect(result.succeeded).toBe(false);
      expect(Object.keys(result).sort()).toEqual(["durationMs", "succeeded"]);
      expect(JSON.stringify(result)).not.toContain("private");
    }
  });
});
