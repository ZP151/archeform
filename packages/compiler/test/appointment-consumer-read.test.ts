import { createRequire } from "node:module";
import { posix, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { generateApplicationBundle } from "../src/index.js";
import { appointmentDefinitionCompilationInput } from "./fixtures/definition-data-compatibility.js";

const require = createRequire(import.meta.url);
let files: Map<string, string>;
const now = "2026-09-24T10:00:00.000Z";
const query = (extra = "") =>
  `/api/appointment-availability?from=${now}&to=2026-10-10T10:00:00.000Z${extra}`;
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
  const lock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: compositionLock.packages,
  });
  files = new Map(
    generateApplicationBundle({
      publishedRevisionId: "read-test",
      graph,
      compositionLock: lock,
    }).files.map((f) => [f.path, f.content]),
  );
});

/** Execute emitted modules without starting Nest, sockets, or a database. */
function emitted(overrides: Record<string, unknown> = {}) {
  const cache = new Map<string, { exports: any }>();
  function load(path: string): any {
    if (path in overrides) return overrides[path];
    if (cache.has(path)) return cache.get(path)!.exports;
    const source = files.get(path);
    if (!source) throw new Error(`Missing emitted module: ${path}`);
    const module = { exports: {} as any };
    cache.set(path, module);
    const code = ts.transpileModule(
      source.replace(
        "void bootstrap();",
        "export { GeneratedController, applicationRuntime, localPolicyRules, localFixtureSessions, appointmentSummaryPathGuard };",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          experimentalDecorators: true,
        },
      },
    ).outputText;
    const localRequire = (specifier: string) =>
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
          : require(specifier);
    new Function("require", "module", "exports", code)(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  return load;
}
function core() {
  const load = emitted();
  return {
    load,
    ...load("api/src/application-runtime.ts"),
    ...load("api/src/appointment-consumer-read.ts"),
  };
}
const response = () => {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
  };
};

describe("Generated Appointment bounded reads", () => {
  it("maintains both ordered indexes across schedule creation, time/service changes and invalid starts", async () => {
    const { InMemoryRecordStore, parseAvailabilityQuery } = core();
    const store = new InMemoryRecordStore();
    const input = parseAvailabilityQuery(
      "/api/appointment-availability?from=2026-09-25T09:00:00.000Z&to=2026-09-26T00:00:00.000Z",
      now,
    );
    const scan = async (serviceId?: string) =>
      (
        await store.scanAppointmentSchedules({
          ...input,
          ...(serviceId === undefined ? {} : { serviceId }),
        })
      ).map((record: any) => record.id);
    const values = {
      serviceId: "sample-service",
      startUtc: "2026-09-25T12:00:00Z",
      endUtc: "2026-09-25T13:00:00Z",
      timezone: "UTC",
      capacity: 1,
      status: "open",
    };
    const later = await store.create("schedule", values);
    const earlier = await store.create("schedule", {
      ...values,
      startUtc: "2026-09-25T09:00:00Z",
    });
    const upper = await store.create("schedule", {
      ...values,
      startUtc: "2026-09-26T00:00:00Z",
    });
    expect(await scan()).toEqual([earlier.id, later.id]);
    await store.update("schedule", later.id, {
      startUtc: new Date("2026-09-25T09:00:00Z"),
      serviceId: "alternate-service",
    });
    expect(await scan()).toEqual([later.id, earlier.id].sort());
    expect(await scan("sample-service")).toEqual([earlier.id]);
    expect(await scan("alternate-service")).toEqual([later.id]);
    await store.update("schedule", earlier.id, {
      startUtc: "2026-09-24T23:00:00Z",
    });
    expect(await scan()).toEqual([later.id]);
    await store.update("schedule", later.id, { startUtc: "invalid" });
    expect(await scan()).toEqual([]);
    expect(await scan("alternate-service")).toEqual([]);
    await store.update("schedule", later.id, {
      startUtc: "2026-09-25T11:00:00Z",
      serviceId: "sample-service",
      status: "closed",
    });
    expect(await scan("sample-service")).toEqual([later.id]);
    expect(await scan("alternate-service")).toEqual([]);
    const rows = await store.scanAppointmentSchedules(input);
    expect(rows[0].status).toBe("closed");
    rows[0].startUtc = "invalid";
    expect((await store.scanAppointmentSchedules(input))[0].startUtc).toBe(
      "2026-09-25T11:00:00Z",
    );
    expect(
      await store.scanAppointmentSchedules({
        ...input,
        now: "2026-09-25T11:00:00.000Z",
      }),
    ).toHaveLength(1);
    expect(
      await store.scanAppointmentSchedules({
        ...input,
        now: "2026-09-25T11:00:00.001Z",
      }),
    ).toHaveLength(0);
    expect(
      await store.scanAppointmentSchedules({
        ...input,
        now: "2026-09-27T00:00:00.000Z",
      }),
    ).toHaveLength(0);
    expect(await scan()).not.toContain(upper.id);
  });
  it("publishes or discards schedule index changes with the existing transaction boundary", async () => {
    const { InMemoryRecordStore, parseAvailabilityQuery } = core();
    const store = new InMemoryRecordStore(),
      input = parseAvailabilityQuery(query(), now);
    const before = await store.scanAppointmentSchedules(input);
    let transactionSnapshot: any;
    await expect(
      store.inTransaction(async (transaction: any) => {
        transactionSnapshot = transaction;
        await transaction.update("schedule", "sample-schedule", {
          serviceId: "moved-service",
          startUtc: "2026-09-25T11:00:00Z",
        });
        const created = await transaction.create("schedule", {
          serviceId: "moved-service",
          startUtc: "2026-09-25T10:00:00Z",
        });
        expect(
          (
            await transaction.scanAppointmentSchedules({
              ...input,
              serviceId: "moved-service",
            })
          ).map((record: any) => record.id),
        ).toEqual([created.id, "sample-schedule"]);
        expect(await store.scanAppointmentSchedules(input)).toEqual(before);
        throw new Error("Rollback this synthetic transaction");
      }),
    ).rejects.toThrow("Rollback this synthetic transaction");
    expect(await store.scanAppointmentSchedules(input)).toEqual(before);
    expect(
      await store.scanAppointmentSchedules({
        ...input,
        serviceId: "moved-service",
      }),
    ).toEqual([]);
    await store.inTransaction(async (transaction: any) => {
      transactionSnapshot = transaction;
      await transaction.update("schedule", "sample-schedule", {
        serviceId: "moved-service",
        startUtc: "2026-09-25T11:00:00Z",
      });
      await transaction.create("schedule", {
        serviceId: "moved-service",
        startUtc: "2026-09-25T10:00:00Z",
      });
    });
    const committed = await store.scanAppointmentSchedules(input);
    expect(committed.map((record: any) => record.id)).toEqual([
      "schedule-3",
      "sample-schedule",
      "sample-schedule-alt",
    ]);
    expect(
      (
        await store.scanAppointmentSchedules({
          ...input,
          serviceId: "sample-service",
        })
      ).map((record: any) => record.id),
    ).toEqual(["sample-schedule-alt"]);
    await transactionSnapshot.update("schedule", "sample-schedule", {
      startUtc: "invalid",
    });
    expect(await store.scanAppointmentSchedules(input)).toEqual(committed);
  });
  it("visits no more than 500 stored schedules after seeking a date range, service and offset", () => {
    const { AppointmentReadIndex, parseAvailabilityQuery } = core();
    const index = new AppointmentReadIndex();
    for (let i = 0; i < 6000; i++)
      index.record("schedule", {
        id: `bounded-${String(i).padStart(5, "0")}`,
        serviceId: i < 2000 ? "other-service" : "sample-service",
        startUtc: i < 4000 ? "2026-09-25T09:00:00Z" : "2026-11-01T09:00:00Z",
      });
    // Count every record retrieved from the backing map, including iteration.
    // Index-key comparisons are allowed; reading all record bodies is not.
    const records: Map<string, unknown> = index.schedules;
    const originalGet = records.get.bind(records);
    const originalValues = records.values.bind(records);
    let visits = 0;
    vi.spyOn(records, "get").mockImplementation((id) => {
      visits++;
      return originalGet(id);
    });
    vi.spyOn(records, "values").mockImplementation(function* () {
      for (const record of originalValues()) {
        visits++;
        yield record;
      }
    });
    const parse = vi.spyOn(Date, "parse");
    try {
      for (const [suffix, firstId] of [
        ["&offset=3000", "bounded-03000"],
        ["&serviceId=sample-service&offset=1000", "bounded-03000"],
        ["&serviceId=missing&offset=1000", undefined],
      ]) {
        const input = parseAvailabilityQuery(query(suffix), now);
        visits = 0;
        parse.mockClear();
        const result = index.scan(input);
        expect(result[0]?.id).toBe(firstId);
        expect(result).toHaveLength(firstId === undefined ? 0 : 500);
        expect(visits).toBe(result.length);
        expect(parse).not.toHaveBeenCalled();
      }
    } finally {
      vi.restoreAllMocks();
    }
  });
  it("keeps retained windows valid after deliberation and removes only elapsed slots", async () => {
    const { InMemoryRecordStore, readAvailability } = core();
    const store = new InMemoryRecordStore();
    const first = await readAvailability(store, query(), now);
    expect(first.slots).toHaveLength(2);
    expect(Object.keys(first).sort()).toEqual(["apiVersion", "next", "slots"]);
    expect(Object.keys(first.slots[0]).sort()).toEqual([
      "durationMinutes",
      "endUtc",
      "scheduleId",
      "serviceId",
      "serviceName",
      "startUtc",
      "timezone",
    ]);
    expect(
      await readAvailability(store, query(), "2026-09-24T10:02:00.000Z"),
    ).toEqual(first);
    expect(
      (
        await readAvailability(store, query(), "2026-10-01T09:01:00.000Z")
      ).slots.map((s: any) => s.scheduleId),
    ).toEqual(["sample-schedule-alt"]);
    expect(
      (await readAvailability(store, query(), "2026-10-11T00:00:00.000Z"))
        .slots,
    ).toEqual([]);
  });
  it.each([
    "&extra=1",
    "&from=" + now,
    "&serviceId=",
    "&serviceId=a&serviceId=b",
    "&serviceId=%ZZ",
    "&serviceId=%C0%AF",
    "&serviceId=%252e",
    "&serviceId=a%2Fb",
    "&serviceId=a%5Cb",
    "&serviceId=a+b",
    "&serviceId=%00",
    "&serviceId=%C3%A9",
    "&offset=-1",
    "&offset=1.5",
    "&offset=100000",
    "&offset=100001",
    "&offset=0001",
    "&serviceId=" + "a".repeat(129),
  ])("rejects unsafe query without store access: %s", async (extra) => {
    const { readAvailability } = core();
    const store = { scanAppointmentSchedules: vi.fn() };
    await expect(
      readAvailability(store, query(extra), now),
    ).rejects.toMatchObject({
      status: 400,
      code: "appointment.availability_invalid_query",
    });
    expect(store.scanAppointmentSchedules).not.toHaveBeenCalled();
  });
  it("accepts once-encoded bounded case-sensitive IDs and valid unknown filters", async () => {
    const { parseAvailabilityQuery, readAvailability, InMemoryRecordStore } =
      core();
    for (const id of [
      "a",
      "A_0:.-",
      "a".repeat(128),
      "sample-service",
      "550e8400-e29b-41d4-a716-446655440000",
    ])
      expect(
        parseAvailabilityQuery(
          query("&serviceId=" + encodeURIComponent(id)),
          now,
        ).serviceId,
      ).toBe(id);
    expect(
      parseAvailabilityQuery(query("&serviceId=%73ample-service"), now)
        .serviceId,
    ).toBe("sample-service");
    expect(
      (
        await readAvailability(
          new InMemoryRecordStore(),
          query("&serviceId=Sample-service"),
          now,
        )
      ).slots,
    ).toEqual([]);
  });
  it("scans at most 500 schedules and returns scan exhaustion even on an empty page", async () => {
    const { InMemoryRecordStore, readAvailability } = core();
    const store = new InMemoryRecordStore();
    for (let i = 0; i < 510; i++)
      await store.create("schedule", {
        serviceId: "sample-service",
        startUtc: "2026-09-25T09:00:00.000Z",
        endUtc: "2026-09-25T09:30:00.000Z",
        timezone: "UTC",
        capacity: 1,
        status: "closed",
      });
    const scan = vi.spyOn(store, "scanAppointmentSchedules"),
      counts = vi.spyOn(store, "countAppointmentOccupancy");
    vi.spyOn(store, "list").mockRejectedValue(
      new Error("Unbounded list forbidden"),
    );
    const first = await readAvailability(store, query(), now);
    expect(first).toMatchObject({ slots: [], next: { offset: 500 } });
    expect(scan.mock.calls[0]![0]).toMatchObject({ take: 500, offset: 0 });
    expect(counts.mock.calls[0]![0]).toHaveLength(500);
    const second = await readAvailability(store, query("&offset=500"), now);
    expect(second.slots).toHaveLength(2);
    expect(second.next).toBeNull();
  });
  it("caps eligible pages at 100 with stable start/id ordering and no occupancy disclosure", async () => {
    const { InMemoryRecordStore, readAvailability } = core();
    const store = new InMemoryRecordStore();
    for (let i = 0; i < 110; i++)
      await store.create("schedule", {
        serviceId: "sample-service",
        startUtc: "2026-09-25T09:00:00Z",
        endUtc: "2026-09-25T09:30:00Z",
        timezone: "Asia/Singapore",
        capacity: 1,
        status: "open",
      });
    const first = await readAvailability(store, query(), now);
    expect(first.slots).toHaveLength(100);
    expect(first.next).toEqual({ offset: 100 });
    expect(first.slots.map((s: any) => s.scheduleId)).toEqual(
      first.slots.map((s: any) => s.scheduleId).sort(),
    );
    const next = await readAvailability(store, query("&offset=100"), now);
    expect(next.slots).toHaveLength(12);
    expect(
      new Set([...first.slots, ...next.slots].map((s: any) => s.scheduleId))
        .size,
    ).toBe(112);
  });
  it("filters inactive, full, invalid, closed and past slots without synthesizing time subdivisions", async () => {
    const { InMemoryRecordStore, readAvailability } = core();
    const store = new InMemoryRecordStore();
    await store.update("schedule", "sample-schedule", { capacity: 1 });
    expect(
      (await readAvailability(store, query(), now)).slots.map(
        (s: any) => s.scheduleId,
      ),
    ).toEqual(["sample-schedule-alt"]);
    await store.update("service", "sample-service", { active: false });
    expect((await readAvailability(store, query(), now)).slots).toEqual([]);
    await store.update("service", "sample-service", { active: true });
    for (const bad of [
      { capacity: 0 },
      { capacity: 1.1 },
      { timezone: "bad/zone" },
      { timezone: "+01:00" },
      { startUtc: "2026-02-30T09:00:00Z" },
      { endUtc: "2026-10-01T08:00:00Z" },
      { status: "closed" },
    ]) {
      await store.update("schedule", "sample-schedule-alt", {
        startUtc: "2026-10-01T10:00:00Z",
        endUtc: "2026-10-01T10:30:00Z",
        timezone: "UTC",
        capacity: 1,
        status: "open",
        ...bad,
      });
      expect((await readAvailability(store, query(), now)).slots).toEqual([]);
    }
  });
  it("returns current service labels with historical saved slots and explicit no-history fallback", async () => {
    const { InMemoryRecordStore, readAppointmentSummary } = core();
    const store = new InMemoryRecordStore();
    const initial = await readAppointmentSummary(store, "sample-appointment");
    expect(initial.source).toBe("current-schedule");
    const original = initial.slot;
    await store.appendAppointmentHistory({
      appointmentId: "sample-appointment",
      at: "2026-09-24T10:00:00Z",
      toSlot: original,
      fromSlot: null,
    });
    await store.update("service", "sample-service", {
      name: "<script>current label</script>",
      durationMinutes: 45,
      active: false,
    });
    await store.update("schedule", "sample-schedule", {
      startUtc: "2027-01-01T00:00:00Z",
      status: "closed",
    });
    await store.update("appointment", "sample-appointment", {
      status: "cancelled",
    });
    const saved = await readAppointmentSummary(store, "sample-appointment");
    expect(saved).toEqual({
      apiVersion: "factory.generated.appointment-summary/v1",
      serviceName: "<script>current label</script>",
      durationMinutes: 45,
      slot: original,
      source: "history",
    });
    await expect(
      readAppointmentSummary(store, "missing"),
    ).rejects.toMatchObject({ status: 404, code: "appointment.not_found" });
    for (const id of ["", " a", "a/b", "a%2Fb", "a".repeat(129)])
      await expect(readAppointmentSummary(store, id)).rejects.toMatchObject({
        status: 400,
        code: "appointment.summary_invalid_id",
      });
  });
  it("does not fall back to a current schedule when existing history is invalid", async () => {
    const { InMemoryRecordStore, readAppointmentSummary } = core();
    const store = new InMemoryRecordStore();
    await store.appendAppointmentHistory({
      appointmentId: "sample-appointment",
      at: now,
      toSlot: null,
      fromSlot: null,
    });
    await expect(
      readAppointmentSummary(store, "sample-appointment"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("keeps role policy and generic collection denials ahead of reads", async () => {
    const { InMemoryRecordStore, ApplicationRuntime } = core();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    const scan = vi.spyOn(store, "scanAppointmentSchedules"),
      find = vi.spyOn(store, "find");
    await expect(
      runtime.appointmentAvailability(
        "administrator",
        query("&serviceId=%ZZ"),
        now,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      runtime.appointmentSummary("anonymous", "a/b"),
    ).rejects.toMatchObject({ status: 403 });
    expect(scan).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
    for (const role of ["customer", "staff"])
      for (const entity of ["service", "schedule"])
        await expect(runtime.list(role, entity)).rejects.toThrow();
    expect(
      (await runtime.appointmentAvailability("customer", query(), now)).slots,
    ).toHaveLength(2);
    expect(
      (await runtime.appointmentSummary("administrator", "sample-appointment"))
        .source,
    ).toBe("current-schedule");
  });
  it("coexists with atomic capacity claims, exact retries, moves and cancellations", async () => {
    const { InMemoryRecordStore, ApplicationRuntime } = core();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    const actor = (role: string) => ({
      role,
      scope: `fixture:${role}`,
      graphHash: "test-graph",
    });
    const body = {
      values: {
        scheduleId: "sample-schedule-alt",
        customerName: "Synthetic customer",
      },
    };
    const results = await Promise.allSettled(
      ["claim-a", "claim-b"].map((key) =>
        runtime.appointmentCommand(
          actor("customer"),
          "appointment",
          undefined,
          "create",
          key,
          body,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "appointment.capacity_conflict" },
    });
    const winner = results.findIndex((r) => r.status === "fulfilled"),
      record = (results[winner] as PromiseFulfilledResult<any>).value,
      key = ["claim-a", "claim-b"][winner];
    expect(
      await runtime.appointmentCommand(
        actor("customer"),
        "appointment",
        undefined,
        "create",
        key,
        body,
      ),
    ).toEqual(record);
    expect(await store.listAppointmentHistory(record.id, 100)).toHaveLength(1);
    expect(
      (
        await runtime.appointmentAvailability("customer", query(), now)
      ).slots.map((s: any) => s.scheduleId),
    ).toEqual(["sample-schedule"]);
    const confirmed = await runtime.appointmentCommand(
      actor("staff"),
      "appointment",
      record.id,
      "confirm",
      "confirm-a",
      { expectedVersion: 0 },
    );
    expect(confirmed.status).toBe("confirmed");
    const moved = await runtime.appointmentCommand(
      actor("staff"),
      "appointment",
      record.id,
      "reschedule",
      "move-a",
      { expectedVersion: 1, scheduleId: "sample-schedule" },
    );
    expect(moved.status).toBe("requested");
    const saved = await runtime.appointmentSummary("staff", record.id);
    expect(saved.slot.scheduleId).toBe("sample-schedule");
    expect(saved.source).toBe("history");
    const cancelled = await runtime.appointmentCommand(
      actor("customer"),
      "appointment",
      record.id,
      "cancel",
      "cancel-a",
      { expectedVersion: 2, cancellationReason: "Plans changed" },
    );
    expect(cancelled.status).toBe("cancelled");
    expect(
      await runtime.appointmentCommand(
        actor("customer"),
        "appointment",
        record.id,
        "cancel",
        "cancel-a",
        { expectedVersion: 2, cancellationReason: "Plans changed" },
      ),
    ).toEqual(cancelled);
    expect(
      (await store.listAppointmentHistory(record.id, 100)).map(
        (h: any) => h.action,
      ),
    ).toEqual(["claim", "confirm", "move", "cancel"]);
    expect(
      (await runtime.appointmentAvailability("customer", query(), now)).slots,
    ).toHaveLength(2);
  });
  it("retains existing past-start mutation semantics while discovery excludes the past", async () => {
    const { InMemoryRecordStore, ApplicationRuntime } = core();
    const store = new InMemoryRecordStore(),
      runtime = new ApplicationRuntime(store);
    await store.update("schedule", "sample-schedule-alt", {
      startUtc: "2026-01-01T09:00:00Z",
      endUtc: "2026-01-01T09:30:00Z",
    });
    const record = await runtime.appointmentCommand(
      { role: "customer", scope: "fixture:customer", graphHash: "test" },
      "appointment",
      undefined,
      "create",
      "past-claim",
      {
        values: {
          scheduleId: "sample-schedule-alt",
          customerName: "Synthetic customer",
        },
      },
    );
    expect(record.status).toBe("requested");
    expect(
      (
        await runtime.appointmentAvailability("customer", query(), now)
      ).slots.map((s: any) => s.scheduleId),
    ).toEqual(["sample-schedule"]);
  });
});

function controller() {
  const loadBase = emitted();
  const { InMemoryRecordStore } = loadBase("api/src/application-runtime.ts");
  const store = new InMemoryRecordStore();
  class HttpException extends Error {
    constructor(
      readonly body: unknown,
      readonly status: number,
    ) {
      super("Safe HTTP error");
    }
  }
  const decorator = () => () => undefined;
  const load = emitted({
    "api/src/prisma-record-store.ts": {
      PrismaRecordStore: class {
        constructor() {
          return store;
        }
      },
    },
    "@prisma/client": { PrismaClient: class {} },
    "@nestjs/common": {
      Controller: decorator,
      Get: decorator,
      Post: decorator,
      Patch: decorator,
      Module: decorator,
      Req: decorator,
      Res: decorator,
      Param: decorator,
      Body: decorator,
      HttpCode: decorator,
      HttpException,
      HttpStatus: {
        BAD_REQUEST: 400,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
      },
    },
    "@nestjs/core": {
      NestFactory: {
        create: () => {
          throw new Error("Server startup forbidden");
        },
      },
    },
  });
  const main = load("api/src/main.ts");
  return { store, ...main, controller: new main.GeneratedController() };
}
const request = (role = "customer", url = query()) => ({
  headers: { "x-factory-fixture-session": `fixture-session-${role}` },
  originalUrl: url,
});

describe("Generated controller and proxy boundaries", () => {
  it("rejects malformed and double-encoded summary path IDs after authentication before Express decoding", async () => {
    const { appointmentSummaryPathGuard } = controller();
    expect(appointmentSummaryPathGuard).toBeTypeOf("function");
    for (const id of [
      "%ZZ",
      "%C0%AF",
      "%252D",
      "%2F",
      "%5C",
      "%20",
      "%00",
      "%C3%A9",
      "",
    ]) {
      for (const authenticated of [false, true]) {
        const res = {
            ...response(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
          },
          next = vi.fn();
        appointmentSummaryPathGuard(
          {
            headers: authenticated ? request().headers : {},
            originalUrl: `/api/appointment/${id}/appointment-summary`,
          },
          res,
          next,
        );
        expect(res.status).toHaveBeenCalledWith(authenticated ? 400 : 403);
        expect(res.json).toHaveBeenCalledWith({
          code: authenticated
            ? "appointment.summary_invalid_id"
            : "appointment.forbidden",
        });
        expect(next).not.toHaveBeenCalled();
      }
    }
    const next = vi.fn();
    appointmentSummaryPathGuard(
      request(
        "customer",
        "/api/appointment/%73ample-appointment/appointment-summary",
      ),
      response(),
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
  it("authenticates before query or ID validation and forwards no browser role authority", async () => {
    const { controller: api, store } = controller();
    const scan = vi.spyOn(store, "scanAppointmentSchedules"),
      find = vi.spyOn(store, "find");
    for (const headers of [
      {},
      { "x-factory-role": "customer" },
      { "x-factory-fixture-session": "forged" },
      { "x-factory-fixture-session": ["fixture-session-customer"] },
      { "x-factory-fixture-session": "fixture-session-administrator" },
    ]) {
      const res = response();
      await expect(
        api.appointmentAvailability(
          { headers, originalUrl: query("&serviceId=%ZZ") },
          res,
        ),
      ).rejects.toMatchObject({
        body: { code: "appointment.forbidden" },
        status: 403,
      });
      expect(res.headers["cache-control"]).toBe("no-store");
    }
    await expect(
      api.appointmentSummary("service", "a/b", request(), response()),
    ).rejects.toMatchObject({
      status: 403,
      body: { code: "appointment.forbidden" },
    });
    expect(scan).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
  });
  it("requires each summary permission before lookup and denies generic customer reads", async () => {
    const { controller: api, store, localPolicyRules } = controller();
    const find = vi.spyOn(store, "find");
    const denied = localPolicyRules.find(
      (p: any) => p.role === "customer" && p.action === "read-availability",
    );
    denied.action = "denied";
    await expect(
      api.appointmentSummary(
        "appointment",
        "sample-appointment",
        request(),
        response(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(find).not.toHaveBeenCalled();
    for (const entity of ["service", "schedule"])
      await expect(
        api.list(entity, request(), response()),
      ).rejects.toMatchObject({ status: 400 });
    const adminRead = localPolicyRules.find(
      (p: any) =>
        p.role === "administrator" &&
        p.resource === "service" &&
        p.action === "read",
    );
    adminRead.action = "denied";
    await expect(
      api.appointmentSummary(
        "appointment",
        "sample-appointment",
        request("administrator"),
        response(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(find).not.toHaveBeenCalled();
  });
  it("uses live Date on list/availability/summary while retaining the fixed authentication clock", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const { controller: api, localFixtureSessions } = controller();
      localFixtureSessions[0].expiresAt = "2026-01-02T00:00:00.000Z";
      for (const call of [
        (res: any) => api.list("appointment", request(), res),
        (res: any) => api.appointmentAvailability(request(), res),
        (res: any) =>
          api.appointmentSummary(
            "appointment",
            "sample-appointment",
            request(),
            res,
          ),
      ]) {
        const res = response();
        await call(res);
        expect(res.headers).toEqual({
          "cache-control": "no-store",
          date: "Thu, 24 Sep 2026 10:00:00 GMT",
        });
      }
      vi.setSystemTime("2026-10-01T09:02:00.000Z");
      const res = response();
      const result = await api.appointmentAvailability(request(), res);
      expect(result.slots.map((s: any) => s.scheduleId)).toEqual([
        "sample-schedule-alt",
      ]);
      expect(res.headers.date).toBe("Thu, 01 Oct 2026 09:02:00 GMT");
    } finally {
      vi.useRealTimers();
    }
  });
  it("returns only safe query, missing-record and unavailable errors", async () => {
    const { controller: api, store } = controller();
    await expect(
      api.appointmentAvailability(
        request("customer", query("&serviceId=%ZZ")),
        response(),
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "appointment.availability_invalid_query" },
    });
    await expect(
      api.appointmentSummary("appointment", "a/b", request(), response()),
    ).rejects.toMatchObject({
      status: 400,
      body: { code: "appointment.summary_invalid_id" },
    });
    await expect(
      api.appointmentSummary("appointment", "missing", request(), response()),
    ).rejects.toMatchObject({
      status: 404,
      body: { code: "appointment.not_found" },
    });
    vi.spyOn(store, "scanAppointmentSchedules").mockRejectedValue(
      new Error("Sensitive database error"),
    );
    await expect(
      api.appointmentAvailability(request(), response()),
    ).rejects.toMatchObject({
      status: 503,
      body: { code: "appointment.availability_unavailable" },
    });
  });
  it("forwards upstream Date exactly, preserving missing/invalid headers for clock recovery", async () => {
    const load = emitted();
    const proxy = load("web/app/api/[...path]/route.ts");
    for (const date of [
      "Thu, 24 Sep 2026 10:00:00 GMT",
      "invalid",
      undefined,
    ]) {
      const upstream = new Response("{}", {
        headers: date ? { Date: date } : {},
      });
      const fetch = vi.fn().mockResolvedValue(upstream);
      vi.stubGlobal("fetch", fetch);
      try {
        const result = await proxy.GET(
          new Request("http://local.invalid/api/appointment", {
            headers: {
              "x-factory-fixture-session": "fixture-session-customer",
              "x-factory-role": "administrator",
            },
          }),
          { params: Promise.resolve({ path: ["appointment"] }) },
        );
        expect(result.headers.get("date")).toBe(date ?? "");
        expect(result.headers.get("cache-control")).toBe("no-store");
        expect(fetch.mock.calls[0]![1]).toMatchObject({
          cache: "no-store",
          headers: { "x-factory-fixture-session": "fixture-session-customer" },
        });
        expect(fetch.mock.calls[0]![1].headers).not.toHaveProperty(
          "x-factory-role",
        );
      } finally {
        vi.unstubAllGlobals();
      }
    }
  });
  it("returns a safe unavailable proxy response without a synthesized Date after upstream failure", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Sensitive upstream failure")),
    );
    try {
      const proxy = emitted()("web/app/api/[...path]/route.ts");
      const pending = proxy.GET(
        new Request("http://local.invalid/api/appointment-availability"),
        { params: Promise.resolve({ path: ["appointment-availability"] }) },
      );
      const observed = pending.then(
        (value: any) => value,
        (error: any) => error,
      );
      await vi.runAllTimersAsync();
      const result = await observed;
      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({
        code: "appointment.availability_unavailable",
      });
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(result.headers.get("date")).toBe("");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});

describe("Generated durable store query boundaries", () => {
  it("enforces the same scan bounds inside the in-memory store", async () => {
    const { InMemoryRecordStore, parseAvailabilityQuery } = core();
    const store = new InMemoryRecordStore();
    for (const change of [
      { take: 501 },
      { offset: 100000 },
      { offset: -1 },
      { take: 0 },
    ]) {
      await expect(
        store.scanAppointmentSchedules({
          ...parseAvailabilityQuery(query(), now),
          ...change,
        }),
      ).rejects.toThrow("Read bound");
    }
  });
  it("pushes temporal/service filtering, ordering, offset and scan budget into Prisma", async () => {
    const findMany = vi.fn().mockResolvedValue([]),
      groupBy = vi
        .fn()
        .mockResolvedValue([{ scheduleId: "schedule-a", _count: { _all: 1 } }]);
    const history = vi.fn().mockResolvedValue([]);
    const load = emitted({
      "@prisma/client": {
        PrismaClient: class {},
        Prisma: { AnyNull: "AnyNull" },
      },
    });
    const { PrismaRecordStore } = load("api/src/prisma-record-store.ts");
    const store = new PrismaRecordStore({
      schedule: { findMany },
      appointment: { groupBy },
      factory_AppointmentHistoryEntry: { findMany: history },
    });
    const { parseAvailabilityQuery } = load(
      "api/src/appointment-consumer-read.ts",
    );
    await store.scanAppointmentSchedules(
      parseAvailabilityQuery(query("&serviceId=Service-A&offset=700"), now),
    );
    expect(findMany).toHaveBeenCalledWith({
      where: {
        startUtc: {
          gte: new Date(now),
          lt: new Date("2026-10-10T10:00:00.000Z"),
        },
        serviceId: "Service-A",
      },
      orderBy: [{ startUtc: "asc" }, { id: "asc" }],
      skip: 700,
      take: 500,
    });
    expect(await store.countAppointmentOccupancy(["schedule-a"])).toEqual({
      "schedule-a": 1,
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ["scheduleId"],
      where: {
        scheduleId: { in: ["schedule-a"] },
        status: { in: ["requested", "confirmed"] },
      },
      _count: { _all: true },
    });
    expect(await store.latestAppointmentSlot("appointment-a")).toEqual({
      exists: false,
    });
    expect(history.mock.calls).toHaveLength(2);
    for (const [args] of history.mock.calls)
      expect(args).toMatchObject({
        where: { appointmentId: "appointment-a" },
        orderBy: [{ at: "desc" }, { id: "desc" }],
        take: 1,
      });
    await expect(
      store.countAppointmentOccupancy(Array(501).fill("x")),
    ).rejects.toThrow("Read bound");
    await expect(
      store.scanAppointmentSchedules({
        ...parseAvailabilityQuery(query(), now),
        take: 501,
      }),
    ).rejects.toThrow("Read bound");
  });
});

it("strictly typechecks all emitted API modules with the unchanged dependency surfaces", () => {
  const root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    ".virtual-appointment-v2",
  ).replaceAll("\\", "/");
  const virtual = new Map(
    [...files]
      .filter(
        ([path]) =>
          (path.startsWith("api/src/") && path.endsWith(".ts")) ||
          path === "web/app/api/[...path]/route.ts",
      )
      .map(([path, source]) => [`${root}/${path}`, source]),
  );
  virtual.set(
    `${root}/types/nest-common.d.ts`,
    ["Controller", "Module"]
      .map(
        (name) =>
          `export declare const ${name}:(...args:any[])=>ClassDecorator;`,
      )
      .join("\n") +
      ["Get", "Post", "Patch", "HttpCode"]
        .map(
          (name) =>
            `export declare const ${name}:(...args:any[])=>MethodDecorator;`,
        )
        .join("\n") +
      ["Param", "Body", "Req", "Res"]
        .map(
          (name) =>
            `export declare const ${name}:(...args:any[])=>ParameterDecorator;`,
        )
        .join("\n") +
      "export declare class HttpException {constructor(body:unknown,status:number);}\nexport declare const HttpStatus:{BAD_REQUEST:400;FORBIDDEN:403;NOT_FOUND:404;CONFLICT:409;};",
  );
  virtual.set(
    `${root}/types/nest-core.d.ts`,
    "export declare const NestFactory:{create(input:unknown,options?:unknown):Promise<any>};",
  );
  virtual.set(
    `${root}/types/prisma-client.d.ts`,
    "export declare class PrismaClient {[key:string]:unknown;$disconnect():Promise<void>;$transaction<T>(callback:(client:PrismaClient)=>Promise<T>,options?:unknown):Promise<T>;}; export declare const Prisma:{AnyNull:unknown};",
  );
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    experimentalDecorators: true,
    types: ["node"],
    baseUrl: root,
    paths: {
      "@nestjs/common": ["types/nest-common.d.ts"],
      "@nestjs/core": ["types/nest-core.d.ts"],
      "@prisma/client": ["types/prisma-client.d.ts"],
    },
  };
  const host = ts.createCompilerHost(options),
    read = host.readFile,
    exists = host.fileExists,
    dirs = host.directoryExists!;
  const normalize = (path: string) => path.replaceAll("\\", "/");
  host.readFile = (path) => virtual.get(normalize(path)) ?? read(path);
  host.fileExists = (path) => virtual.has(normalize(path)) || exists(path);
  host.directoryExists = (path) =>
    normalize(path).startsWith(root) || dirs(path);
  host.getSourceFile = (path, languageVersion) => {
    const source = host.readFile(path);
    return source === undefined
      ? undefined
      : ts.createSourceFile(path, source, languageVersion, true);
  };
  const diagnostics = ts
    .getPreEmitDiagnostics(ts.createProgram([...virtual.keys()], options, host))
    .map(
      (d) =>
        `${d.file?.fileName}:${d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : ""} ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
    );
  expect(diagnostics).toEqual([]);
});
