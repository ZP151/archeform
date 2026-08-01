import { describe, expect, it } from "vitest";

import {
  createDiscoveryIntakeBatch,
  createDiscoveryRecord,
  triageDiscoveryRecords,
  type DiscoveryRecordInputV1,
} from "../src/index.js";

const provenance = {
  createdAt: "2026-08-01T00:00:00.000Z",
  producerVersion: "0.1.0",
};

function repository(
  overrides: Partial<DiscoveryRecordInputV1> = {},
): DiscoveryRecordInputV1 {
  return {
    apiVersion: "factory.discovery-record-input/v1",
    id: "eligible-source",
    discoveredAt: "2026-08-01T00:00:00.000Z",
    sourceKind: "repository",
    sourceHost: "github",
    immutableReference: {
      canonicalIdentifier: "github:factory/example-capability",
      resolvedVersionOrCommit: "a".repeat(40),
      integrity: `sha256:${"b".repeat(64)}`,
    },
    declaredLicense: "MIT",
    familyHints: ["catalog"],
    profileHints: ["restaurant-ordering"],
    reuseMode: "selective-source-copy",
    ...overrides,
  };
}

describe("Candidate Foundry discovery", () => {
  it("creates the same eligible discovery record and digest from equivalent metadata", () => {
    const first = createDiscoveryRecord(repository());
    const second = createDiscoveryRecord(structuredClone(repository()));

    expect(first).toEqual(second);
    expect(first.triage).toMatchObject({ status: "eligible" });
    expect(first.metadataDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("blocks a floating reference without preventing an eligible sibling", () => {
    const records = triageDiscoveryRecords([
      repository({
        id: "floating-source",
        immutableReference: {
          canonicalIdentifier: "github:factory/floating-source",
          resolvedVersionOrCommit: "main",
        },
      }),
      repository(),
    ]);

    expect(records.byId["floating-source"]?.triage.status).toBe("blocked");
    expect(records.byId["eligible-source"]?.triage.status).toBe("eligible");
  });

  it("sorts eligible repository records by score then ID and caps an Intake batch at one thousand", () => {
    const records = Array.from({ length: 1_001 }, (_, index) =>
      createDiscoveryRecord(
        repository({
          id: `source-${String(index).padStart(4, "0")}`,
          immutableReference: {
            canonicalIdentifier: `github:factory/source-${String(index).padStart(4, "0")}`,
            resolvedVersionOrCommit: `${index.toString(16).padStart(40, "a")}`,
            integrity: `sha256:${"b".repeat(63)}${index % 10}`,
          },
        }),
      ),
    );

    const batch = createDiscoveryIntakeBatch(records, provenance);

    expect(batch.items).toHaveLength(1_000);
    expect(batch.items.map((entry) => entry.id)).toEqual(
      Array.from(
        { length: 1_000 },
        (_, index) => `source-${String(index).padStart(4, "0")}`,
      ),
    );
  });

  it("rejects two records that name the same canonical identity", () => {
    const first = createDiscoveryRecord(repository());
    const duplicate = createDiscoveryRecord(
      repository({ id: "same-canonical-identity" }),
    );

    expect(() =>
      createDiscoveryIntakeBatch([first, duplicate], provenance),
    ).toThrow("Discovery canonical identity is duplicated.");
  });

  it("blocks host and reuse combinations that cannot enter Intake", () => {
    const record = createDiscoveryRecord(
      repository({
        sourceKind: "package",
        sourceHost: "npm",
        immutableReference: {
          canonicalIdentifier: "npm:example-capability",
          resolvedVersionOrCommit: "1.0.0",
          integrity: `sha256:${"b".repeat(64)}`,
        },
      }),
    );

    expect(record.triage).toMatchObject({ status: "blocked" });
    expect(record.triage.gateCategories).toContain("host-mode");
  });
});
