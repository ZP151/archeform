import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { lockCapabilityAsset } from "../src/assets/index.js";
import {
  resolveCapabilityCompositionForAssets,
  type CapabilityBindingValueV1,
} from "../src/composition.js";
import { getCapabilityAsset } from "../src/index.js";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
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
});

function omit(key: keyof typeof bindings) {
  const { [key]: _omitted, ...remaining } = bindings;
  return remaining;
}
