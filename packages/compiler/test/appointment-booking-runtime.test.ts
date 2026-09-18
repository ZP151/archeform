import { describe, expect, it } from "vitest";
import {
  createAppointmentCommandRuntime,
  type AppointmentCommandStore,
  type AppointmentRuntimeProfile,
} from "../src/appointment-mutation-contract.js";
import { createGeneratedPageRuntimeProjection } from "../src/page-runtime-projection.js";
import type { ApplicationGraphV1 } from "@factory/graph";

const profile: AppointmentRuntimeProfile = {
  capability: "scheduling.appointment@1.0.0",
  effect: "appointment.booking",
  serviceEntity: "service",
  scheduleEntity: "schedule",
  appointmentEntity: "appointment",
  fields: {
    serviceActive: "active",
    scheduleService: "serviceId",
    scheduleStart: "start",
    scheduleEnd: "end",
    scheduleTimezone: "timezone",
    scheduleCapacity: "capacity",
    scheduleStatus: "status",
    appointmentSchedule: "scheduleId",
    appointmentCustomer: "customerName",
    appointmentNotes: "notes",
    appointmentCancellationReason: "cancellationReason",
    appointmentStatus: "status",
  },
};

const context = (role: string, key: string) => ({
  factoryServer: true as const,
  role,
  scope: "appointment-test",
  idempotencyKey: key,
  requestHash: `hash:${key}`,
  now: "2026-10-01T00:00:00.000Z",
});

function snapshot(store: TestStore) {
  return structuredClone({
    records: [...store.records.entries()].map(([entity, records]) => [
      entity,
      [...records.entries()],
    ]),
    receipts: [...store.receipts.entries()],
    history: store.history,
    events: store.events,
  });
}

class TestStore implements AppointmentCommandStore {
  readonly records = new Map<string, Map<string, Record<string, unknown>>>([
    ["service", new Map([["service-1", { id: "service-1", active: true }]])],
    [
      "schedule",
      new Map([
        [
          "slot-1",
          {
            id: "slot-1",
            serviceId: "service-1",
            start: "2026-10-01T09:00:00Z",
            end: "2026-10-01T09:30:00Z",
            timezone: "Asia/Singapore",
            capacity: 1,
            status: "open",
          },
        ],
        [
          "slot-2",
          {
            id: "slot-2",
            serviceId: "service-1",
            start: "2026-10-01T10:00:00Z",
            end: "2026-10-01T10:30:00Z",
            timezone: "Asia/Singapore",
            capacity: 1,
            status: "open",
          },
        ],
      ]),
    ],
    ["appointment", new Map()],
  ]);
  readonly receipts = new Map<string, Record<string, unknown>>();
  readonly history: Record<string, unknown>[] = [];
  readonly events: Record<string, unknown>[] = [];
  forceConditionalMiss = false;

  async list(entity: string) {
    return structuredClone([...(this.records.get(entity)?.values() ?? [])]);
  }
  async find(entity: string, id: string) {
    return structuredClone(this.records.get(entity)?.get(id));
  }
  async create(entity: string, values: Record<string, unknown>) {
    const records = this.records.get(entity)!;
    const record = { id: `${entity}-${records.size + 1}`, ...values };
    records.set(String(record.id), structuredClone(record));
    return structuredClone(record);
  }
  async update(entity: string, id: string, values: Record<string, unknown>) {
    const current = this.records.get(entity)?.get(id);
    if (!current) throw new Error("missing record");
    const next = { ...current, ...values };
    this.records.get(entity)!.set(id, structuredClone(next));
    return structuredClone(next);
  }
  async conditionalUpdate(entity: string, id: string, expectedVersion: number, values: Record<string, unknown>) {
    const current = this.records.get(entity)?.get(id);
    if (this.forceConditionalMiss || current?.version !== expectedVersion) return undefined;
    return this.update(entity, id, values);
  }
  async getAppointmentReceipt(scope: string, key: string) {
    return structuredClone(this.receipts.get(`${scope}:${key}`));
  }
  async saveAppointmentReceipt(receipt: Record<string, unknown>) {
    this.receipts.set(`${receipt.scope}:${receipt.idempotencyKey}`, structuredClone(receipt));
  }
  async appendAppointmentHistory(entry: Record<string, unknown>) {
    this.history.push(structuredClone(entry));
  }
  async appendCapabilityEvent(event: Record<string, unknown>) {
    this.events.push(structuredClone(event));
  }
  async listAppointmentHistory(appointmentId: string) {
    return structuredClone(this.history.filter((entry) => entry.appointmentId === appointmentId));
  }
  async inTransaction<T>(operation: (store: AppointmentCommandStore) => Promise<T>) {
    const before = snapshot(this);
    try {
      return await operation(this);
    } catch (error) {
      this.records.clear();
      for (const [entity, entries] of before.records as [string, [string, Record<string, unknown>][]][])
        this.records.set(entity, new Map(entries));
      this.receipts.clear();
      for (const [key, value] of before.receipts as [string, Record<string, unknown>][]) this.receipts.set(key, value);
      this.history.splice(0, this.history.length, ...(before.history as Record<string, unknown>[]));
      this.events.splice(0, this.events.length, ...(before.events as Record<string, unknown>[]));
      throw error;
    }
  }
}

describe("appointment booking compiler runtime", () => {
  it("projects only server command names for a lock-resolved appointment profile", () => {
    const graph = {
      metadata: { name: "Bookings" },
      experience: { theme: { mode: "light" } },
      domain: { entities: [], relations: [] },
      integration: { capabilities: [] },
      page: { pages: [], navigation: [] },
    } as unknown as ApplicationGraphV1;
    const projection = createGeneratedPageRuntimeProjection(graph, {
      appointment: profile,
    });
    expect(projection.appointment).toEqual({
      appointmentEntity: "appointment",
      commands: ["request", "confirm", "reschedule", "cancel", "history"],
    });
    expect(JSON.stringify(projection.appointment)).not.toMatch(/capacity|timezone|slot/i);
  });

  it("creates, confirms, moves, cancels, and returns append-only history", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const requested = await runtime.request(store, context("customer", "request"), {
      scheduleId: "slot-1",
      customerName: "Ada",
      notes: "Morning",
    });
    const confirmed = await runtime.confirm(store, context("staff", "confirm"), {
      appointmentId: requested.id,
      expectedVersion: 0,
    });
    const moved = await runtime.reschedule(store, context("staff", "move"), {
      appointmentId: requested.id,
      expectedVersion: 1,
      scheduleId: "slot-2",
    });
    const cancelled = await runtime.cancel(store, context("customer", "cancel"), {
      appointmentId: requested.id,
      expectedVersion: 2,
      cancellationReason: "Changed plans",
    });

    expect([requested, confirmed, moved, cancelled].map((record) => [record.status, record.version])).toEqual([
      ["requested", 0], ["confirmed", 1], ["requested", 2], ["cancelled", 3],
    ]);
    expect(cancelled.cancellationReason).toBe("Changed plans");
    expect(await runtime.history(store, context("staff", "history"), requested.id)).toEqual([
      expect.objectContaining({ operation: "request", scheduleId: "slot-1" }),
      expect.objectContaining({ operation: "confirm", scheduleId: "slot-1" }),
      expect.objectContaining({ operation: "reschedule", fromScheduleId: "slot-1", scheduleId: "slot-2" }),
      expect.objectContaining({ operation: "cancel", cancellationReason: "Changed plans" }),
    ]);
    expect(store.events.map((entry) => entry.operation)).toEqual(["claim", "confirm", "move", "release"]);
  });

  it("denies a second capacity-one claim without recording a partial mutation", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    await runtime.request(store, context("customer", "first"), { scheduleId: "slot-1", customerName: "Ada" });
    const before = snapshot(store);
    await expect(runtime.request(store, context("customer", "second"), { scheduleId: "slot-1", customerName: "Bea" })).rejects.toMatchObject({ code: "appointment.capacity_conflict", status: 409 });
    expect(snapshot(store)).toEqual(before);
  });

  it("uses a conditional version write when an otherwise valid command races", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const requested = await runtime.request(store, context("customer", "request"), { scheduleId: "slot-1", customerName: "Ada" });
    store.forceConditionalMiss = true;
    const before = snapshot(store);
    await expect(runtime.confirm(store, context("staff", "confirm"), { appointmentId: requested.id, expectedVersion: 0 })).rejects.toMatchObject({ code: "appointment.version_conflict", status: 409 });
    expect(snapshot(store)).toEqual(before);
  });

  it("replays an identical command and rejects stale, forbidden, invalid, and forged commands unchanged", async () => {
    const store = new TestStore();
    const runtime = createAppointmentCommandRuntime(profile);
    const input = { scheduleId: "slot-1", customerName: "Ada" };
    const first = await runtime.request(store, context("customer", "request"), input);
    const afterFirst = snapshot(store);
    await expect(runtime.request(store, context("customer", "request"), input)).resolves.toEqual(first);
    expect(snapshot(store)).toEqual(afterFirst);

    for (const command of [
      () => runtime.confirm(store, context("customer", "forbidden"), { appointmentId: first.id, expectedVersion: 0 }),
      () => runtime.cancel(store, context("customer", "stale"), { appointmentId: first.id, expectedVersion: 1, cancellationReason: "x" }),
      () => runtime.request(store, context("customer", "forged"), { ...input, capacity: 99 }),
    ]) {
      const before = snapshot(store);
      await expect(command()).rejects.toMatchObject({ code: expect.stringMatching(/^appointment\./) });
      expect(snapshot(store)).toEqual(before);
    }

    const schedule = store.records.get("schedule")!.get("slot-2")!;
    schedule.end = schedule.start;
    const beforeInvalid = snapshot(store);
    await expect(runtime.request(store, context("customer", "invalid"), { scheduleId: "slot-2", customerName: "Bea" })).rejects.toMatchObject({ code: "appointment.schedule_invalid", status: 400 });
    expect(snapshot(store)).toEqual(beforeInvalid);
  });
});
