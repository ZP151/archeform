import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import ts from "typescript";

import {
  lockCapabilityAsset,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import {
  resolveCapabilityCompositionForAssets,
  resolveCapabilityCompositionForPublishedGraph,
  type CapabilityBindingValueV1,
} from "../src/composition.js";
import { getCapabilityAsset } from "../src/index.js";
import type { ApplicationGraphV1 } from "@factory/graph/browser";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
  capabilityManifestDigest,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const bindings = {
  serviceEntity: { graphSymbol: "graph.domain.service" },
  serviceNameField: { graphSymbol: "graph.domain.service", fieldKey: "name" },
  serviceDurationMinutesField: {
    graphSymbol: "graph.domain.service",
    fieldKey: "durationMinutes",
  },
  serviceActiveField: {
    graphSymbol: "graph.domain.service",
    fieldKey: "active",
  },
  scheduleEntity: { graphSymbol: "graph.domain.schedule" },
  scheduleServiceReferenceField: {
    graphSymbol: "graph.domain.schedule",
    fieldKey: "serviceId",
  },
  scheduleStartField: {
    graphSymbol: "graph.domain.schedule",
    fieldKey: "start",
  },
  scheduleEndField: { graphSymbol: "graph.domain.schedule", fieldKey: "end" },
  scheduleTimezoneField: {
    graphSymbol: "graph.domain.schedule",
    fieldKey: "timezone",
  },
  scheduleCapacityField: {
    graphSymbol: "graph.domain.schedule",
    fieldKey: "capacity",
  },
  scheduleStatusField: {
    graphSymbol: "graph.domain.schedule",
    fieldKey: "status",
  },
  appointmentEntity: { graphSymbol: "graph.domain.appointment" },
  appointmentScheduleReferenceField: {
    graphSymbol: "graph.domain.appointment",
    fieldKey: "scheduleId",
  },
  appointmentCustomerNameField: {
    graphSymbol: "graph.domain.appointment",
    fieldKey: "customerName",
  },
  appointmentNotesField: {
    graphSymbol: "graph.domain.appointment",
    fieldKey: "notes",
  },
  appointmentCancellationReasonField: {
    graphSymbol: "graph.domain.appointment",
    fieldKey: "cancellationReason",
  },
  appointmentStatusField: {
    graphSymbol: "graph.domain.appointment",
    fieldKey: "status",
  },
} as const satisfies Readonly<Record<string, CapabilityBindingValueV1>>;

describe("appointment scheduling capability package", () => {
  it("publishes the immutable appointment booking coordinate and exact typed bindings", () => {
    const asset = getCapabilityAsset("scheduling.appointment");

    expect(asset.manifest).toMatchObject({
      key: "scheduling.appointment",
      version: "1.0.0",
      category: "core",
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["appointment.booking"],
      provides: [{ interfaceKey: "appointment.booking", version: "v1" }],
      outputSlots: ["api.runtime", "flow.effect", "test.fixture"],
      templates: [
        expect.objectContaining({
          target: "api/src/capabilities/scheduling.appointment.ts",
          outputSlot: "api.runtime",
        }),
      ],
    });
    expect(asset.manifest.inputSchema).toEqual([
      { key: "serviceEntity", type: "domain.entity", required: true },
      expect.objectContaining({
        key: "serviceNameField",
        ownerBinding: "serviceEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "serviceDurationMinutesField",
        ownerBinding: "serviceEntity",
        fieldTypes: ["integer"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "serviceActiveField",
        ownerBinding: "serviceEntity",
        fieldTypes: ["boolean"],
        fieldRequired: true,
      }),
      { key: "scheduleEntity", type: "domain.entity", required: true },
      expect.objectContaining({
        key: "scheduleServiceReferenceField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "scheduleStartField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["datetime"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "scheduleEndField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["datetime"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "scheduleTimezoneField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "scheduleCapacityField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["integer"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "scheduleStatusField",
        ownerBinding: "scheduleEntity",
        fieldTypes: ["enum"],
        fieldRequired: true,
      }),
      { key: "appointmentEntity", type: "domain.entity", required: true },
      expect.objectContaining({
        key: "appointmentScheduleReferenceField",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "appointmentCustomerNameField",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["string"],
        fieldRequired: true,
      }),
      expect.objectContaining({
        key: "appointmentNotesField",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["text"],
        fieldRequired: false,
      }),
      expect.objectContaining({
        key: "appointmentCancellationReasonField",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["text"],
        fieldRequired: false,
      }),
      expect.objectContaining({
        key: "appointmentStatusField",
        ownerBinding: "appointmentEntity",
        fieldTypes: ["enum"],
        fieldRequired: true,
      }),
    ]);
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("accepts only the declared owner-aware appointment bindings", () => {
    const asset = getCapabilityAsset("scheduling.appointment");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        { selections: [{ lock: lockCapabilityAsset(asset), bindings }] },
        [asset],
      ),
    ).not.toThrow();
  });

  it.each([
    ["a missing schedule owner binding", omit("scheduleEntity")],
    ["a missing timezone binding", omit("scheduleTimezoneField")],
    ["a missing capacity binding", omit("scheduleCapacityField")],
    ["a missing appointment status binding", omit("appointmentStatusField")],
  ] as const)("rejects %s", (_label, invalidBindings) => {
    const asset = getCapabilityAsset("scheduling.appointment");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            { lock: lockCapabilityAsset(asset), bindings: invalidBindings },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });

  it("admits only the exact appointment relation witness on a Published Graph", () => {
    const asset = getCapabilityAsset("scheduling.appointment");
    const input = {
      selections: [{ lock: lockCapabilityAsset(asset), bindings }],
    };

    expect(() =>
      resolveCapabilityCompositionForPublishedGraph(appointmentGraph(), input, [
        asset,
      ]),
    ).not.toThrow();

    for (const graph of [
      appointmentGraph({
        relations: [
          {
            from: "schedule",
            to: "service",
            kind: "many-to-one",
            field: "wrongId",
          },
        ],
      }),
      appointmentGraph({
        relations: [
          {
            from: "service",
            to: "schedule",
            kind: "many-to-one",
            field: "serviceId",
          },
        ],
      }),
      appointmentGraph({
        relations: [
          {
            from: "schedule",
            to: "service",
            kind: "many-to-one",
            field: "serviceId",
          },
          {
            from: "schedule",
            to: "service",
            kind: "many-to-one",
            field: "otherServiceId",
          },
          {
            from: "appointment",
            to: "schedule",
            kind: "many-to-one",
            field: "scheduleId",
          },
        ],
      }),
    ]) {
      expect(() =>
        resolveCapabilityCompositionForPublishedGraph(graph, input, [asset]),
      ).toThrow("Appointment capability requires exactly one many-to-one");
    }
  });

  it("uses the supplied appointment asset when validating Published Graph fields", () => {
    const registered = getCapabilityAsset("scheduling.appointment");
    const manifest = structuredClone(registered.manifest);
    const inputSchema = manifest.inputSchema.map((schema) =>
      schema.key === "serviceNameField" && schema.type === "domain.field"
        ? { ...schema, fieldTypes: ["integer"] as const }
        : schema,
    );
    const custom: CapabilityAssetV1 = {
      manifest: {
        ...manifest,
        inputSchema,
        manifestDigest: "sha256:placeholder",
      },
    };
    const asset: CapabilityAssetV1 = {
      manifest: {
        ...custom.manifest,
        manifestDigest: capabilityManifestDigest(custom.manifest),
      },
    };
    expect(() =>
      resolveCapabilityCompositionForPublishedGraph(
        appointmentGraph(),
        { selections: [{ lock: lockCapabilityAsset(asset), bindings }] },
        [asset],
      ),
    ).toThrow("serviceNameField");
  });

  it("executes the rendered handler atomically and rejects forged commands", async () => {
    const handler = renderAppointmentHandler();
    const store = new AppointmentStoreDouble();
    const context = {
      factoryServer: true,
      role: "customer",
      scope: "scope",
      idempotencyKey: "claim-1",
      requestHash: "hash-1",
      now: "2026-10-01T00:00:00.000Z",
    };
    const transactionsBeforeClaim = store.transactions;
    const claimed = await handler.claim(store, context, {
      scheduleId: "schedule-1",
      customerName: "A",
    });
    expect(store.transactions).toBe(transactionsBeforeClaim + 1);
    expect(claimed.status).toBe("requested");
    expect(store.events).toHaveLength(1);
    const replaySnapshot = snapshotStore(store);
    const replayTransactions = store.transactions;
    await expect(
      handler.claim(store, context, {
        scheduleId: "schedule-1",
        customerName: "A",
      }),
    ).resolves.toEqual(claimed);
    expect(store.transactions).toBe(replayTransactions);
    expect(snapshotStore(store)).toEqual(replaySnapshot);
    expect(store.events).toHaveLength(1);
    const capacitySnapshot = snapshotStore(store);
    await expect(
      handler.claim(
        store,
        { ...context, idempotencyKey: "claim-2", requestHash: "hash-2" },
        { scheduleId: "schedule-1", customerName: "B" },
      ),
    ).rejects.toThrow("appointment.capacity_conflict");
    expect(snapshotStore(store)).toEqual(capacitySnapshot);
    expect(store.records.get("appointment")?.size).toBe(1);
    const idempotencySnapshot = snapshotStore(store);
    await expect(
      handler.claim(
        store,
        { ...context, requestHash: "changed" },
        {
          scheduleId: "schedule-1",
          customerName: "A",
        },
      ),
    ).rejects.toThrow("appointment.idempotency_conflict");
    expect(snapshotStore(store)).toEqual(idempotencySnapshot);
    const stored = store.records.get("appointment")!.get(claimed.id)!;
    stored.status = "confirmed";
    const moveTransactions = store.transactions;
    const moved = await handler.move(
      store,
      { ...context, idempotencyKey: "move", requestHash: "move" },
      {
        appointmentId: claimed.id,
        expectedVersion: 0,
        scheduleId: "schedule-2",
      },
    );
    expect(store.transactions).toBe(moveTransactions + 1);
    expect(moved.scheduleId).toBe("schedule-2");
    const staleSnapshot = snapshotStore(store);
    await expect(
      handler.release(
        store,
        { ...context, idempotencyKey: "stale", requestHash: "stale" },
        {
          appointmentId: claimed.id,
          expectedVersion: 0,
          cancellationReason: "x",
        },
      ),
    ).rejects.toThrow("appointment.version_conflict");
    expect(snapshotStore(store)).toEqual(staleSnapshot);
    const releaseTransactions = store.transactions;
    await handler.release(
      store,
      { ...context, idempotencyKey: "release", requestHash: "release" },
      {
        appointmentId: claimed.id,
        expectedVersion: 1,
        cancellationReason: "x",
      },
    );
    expect(store.transactions).toBe(releaseTransactions + 1);
    await handler.claim(
      store,
      { ...context, idempotencyKey: "reclaim", requestHash: "reclaim" },
      { scheduleId: "schedule-1", customerName: "B" },
    );
    for (const [field, value] of [
      ["end", "2026-10-01T02:00:00Z"],
      ["start", "2026-02-30T01:00:00Z"],
      ["timezone", "Mars/Olympus"],
    ] as const) {
      const schedule = store.records.get("schedule")!.get("schedule-2")!;
      const previous = schedule[field];
      const invalidSnapshot = snapshotStore(store);
      schedule[field] = value;
      await expect(
        handler.claim(
          store,
          {
            ...context,
            idempotencyKey: `invalid-${field}`,
            requestHash: `invalid-${field}`,
          },
          { scheduleId: "schedule-2", customerName: "C" },
        ),
      ).rejects.toThrow("appointment.schedule_invalid");
      store.records.get("schedule")!.get("schedule-2")![field] = previous;
      expect(snapshotStore(store)).toEqual(invalidSnapshot);
    }
    const forgedSnapshot = snapshotStore(store);
    await expect(
      handler.claim(store, context, {
        scheduleId: "schedule-2",
        customerName: "B",
        availability: 9,
      }),
    ).rejects.toThrow("appointment.invalid_request");
    expect(snapshotStore(store)).toEqual(forgedSnapshot);
    const contextSnapshot = snapshotStore(store);
    await expect(
      handler.claim(
        store,
        { ...context, factoryServer: false },
        { scheduleId: "schedule-2", customerName: "B" },
      ),
    ).rejects.toThrow("appointment.unauthorized");
    expect(snapshotStore(store)).toEqual(contextSnapshot);
    const rollbackSnapshot = snapshotStore(store);
    store.failEvent = true;
    await expect(
      handler.claim(
        store,
        { ...context, idempotencyKey: "rollback", requestHash: "rollback" },
        { scheduleId: "schedule-2", customerName: "C" },
      ),
    ).rejects.toThrow("event failed");
    expect(snapshotStore(store)).toEqual(rollbackSnapshot);
    expect(store.records.get("appointment")?.size).toBe(2);
    expect(store.receipts.size).toBe(4);
  });
});

function omit(key: keyof typeof bindings) {
  const { [key]: _omitted, ...remaining } = bindings;
  return remaining;
}

function appointmentGraph(
  overrides: {
    readonly relations?: readonly {
      readonly from: string;
      readonly to: string;
      readonly kind: "many-to-one";
      readonly field: string;
    }[];
  } = {},
): ApplicationGraphV1 {
  const fields = (values: readonly [string, string, boolean][]) =>
    values.map(([key, type, required]) => ({ key, type, required }));
  return {
    domain: {
      entities: [
        {
          key: "service",
          label: "Service",
          fields: fields([
            ["name", "string", true],
            ["durationMinutes", "integer", true],
            ["active", "boolean", true],
          ]),
          indexes: [],
        },
        {
          key: "schedule",
          label: "Schedule",
          fields: fields([
            ["serviceId", "string", true],
            ["start", "datetime", true],
            ["end", "datetime", true],
            ["timezone", "string", true],
            ["capacity", "integer", true],
            ["status", "enum", true],
            ["otherServiceId", "string", true],
          ]),
          indexes: [],
        },
        {
          key: "appointment",
          label: "Appointment",
          fields: fields([
            ["scheduleId", "string", true],
            ["customerName", "string", true],
            ["notes", "text", false],
            ["cancellationReason", "text", false],
            ["status", "enum", true],
          ]),
          indexes: [],
        },
      ],
      relations: overrides.relations ?? [
        {
          from: "schedule",
          to: "service",
          kind: "many-to-one",
          field: "serviceId",
        },
        {
          from: "appointment",
          to: "schedule",
          kind: "many-to-one",
          field: "scheduleId",
        },
      ],
    },
  } as ApplicationGraphV1;
}

function renderAppointmentHandler(): any {
  const template = readFileSync(
    resolve(
      repositoryRoot,
      "packages/capabilities/assets/scheduling.appointment/1.0.0/templates/api/capability-module.ts.tpl",
    ),
    "utf8",
  );
  const values: Record<string, string> = {
    "asset.key": "scheduling.appointment",
    "asset.version": "1.0.0",
    "asset.effectsJson": JSON.stringify(["appointment.booking"]),
    "graph.metadata.id": "appointment-test",
  };
  for (const [key, value] of Object.entries(bindings))
    values[key] = JSON.stringify(
      "fieldKey" in value
        ? value.fieldKey
        : value.graphSymbol.slice("graph.domain.".length),
    );
  const source = template.replace(
    /{{([A-Za-z.]+)}}/g,
    (_m, key) => values[key]!,
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  new Function("exports", "module", output)(module.exports, module);
  return module.exports.appointmentBookingHandler;
}

function snapshotStore(store: AppointmentStoreDouble) {
  return structuredClone({
    records: [...store.records.entries()].map(([key, values]) => [
      key,
      [...values.entries()],
    ]),
    receipts: [...store.receipts.entries()],
    events: store.events,
  });
}

class AppointmentStoreDouble {
  readonly records = new Map<string, Map<string, any>>([
    ["service", new Map([["service-1", { id: "service-1", active: true }]])],
    [
      "schedule",
      new Map([
        [
          "schedule-1",
          {
            id: "schedule-1",
            serviceId: "service-1",
            start: "2026-10-01T01:00:00Z",
            end: "2026-10-01T01:30:00Z",
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        ],
        [
          "schedule-2",
          {
            id: "schedule-2",
            serviceId: "service-1",
            start: "2026-10-01T02:00:00Z",
            end: "2026-10-01T02:30:00Z",
            timezone: "UTC",
            capacity: 1,
            status: "open",
          },
        ],
      ]),
    ],
    ["appointment", new Map()],
  ]);
  readonly receipts = new Map<string, any>();
  readonly events: any[] = [];
  failEvent = false;
  transactions = 0;
  async list(entity: string) {
    return [...(this.records.get(entity)?.values() ?? [])];
  }
  async find(entity: string, id: string) {
    return this.records.get(entity)?.get(id);
  }
  async create(entity: string, input: any) {
    const map = this.records.get(entity)!;
    const record = { id: `appointment-${map.size + 1}`, ...input };
    map.set(record.id, record);
    return record;
  }
  async update(entity: string, id: string, input: any) {
    const record = { ...(await this.find(entity, id)), ...input };
    this.records.get(entity)!.set(id, record);
    return record;
  }
  async getAppointmentReceipt(scope: string, key: string) {
    return this.receipts.get(`${scope}:${key}`);
  }
  async saveAppointmentReceipt(receipt: any) {
    this.receipts.set(`${receipt.scope}:${receipt.idempotencyKey}`, receipt);
  }
  async appendCapabilityEvent(event: any) {
    if (this.failEvent) throw new Error("event failed");
    this.events.push(event);
  }
  async inTransaction<T>(operation: (store: any) => Promise<T>) {
    this.transactions++;
    const snapshot = structuredClone({
      records: [...this.records.entries()].map(([k, v]) => [
        k,
        [...v.entries()],
      ]),
      receipts: [...this.receipts.entries()],
      events: this.events,
    });
    try {
      return await operation(this);
    } catch (error) {
      this.records.clear();
      for (const [k, v] of snapshot.records as any)
        this.records.set(k, new Map(v));
      this.receipts.clear();
      for (const [k, v] of snapshot.receipts as any) this.receipts.set(k, v);
      this.events.splice(0, this.events.length, ...snapshot.events);
      throw error;
    }
  }
}
