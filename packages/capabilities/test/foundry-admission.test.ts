import { describe, expect, it } from "vitest";

import {
  evaluateFoundryAdmission,
  expectedFoundryLockDigest,
  type FoundryAdmissionEvidenceV1,
} from "../src/index.js";
import { orderOperationsAssetV1_1_0 } from "../src/assets/index.js";
import type { CapabilityAssetV1 } from "../src/assets/index.js";

const digestA =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const digestB =
  "sha256:2222222222222222222222222222222222222222222222222222222222222222";

function evidenceFixture(
  overrides: Partial<FoundryAdmissionEvidenceV1> = {},
): FoundryAdmissionEvidenceV1 {
  return {
    licence: "MIT",
    provenance: "first-party",
    owner: "factory-platform",
    deprecationPolicy: "two-minor-version notice",
    compatibilityDeclaration: "API-compatible within the major version",
    digestVerified: true,
    // Evidence mirrors the reviewed literals the asset manifest records —
    // never invented in the registry (see the same invariant in
    // foundry-evidence.test.ts). A wrong-but-present digest must NOT be
    // eligible: the admission boundary value-compares below.
    fixtureDigest: orderOperationsAssetV1_1_0.manifest.verification
      ?.fixtureDigest,
    contractTestDigest: orderOperationsAssetV1_1_0.manifest.verification
      ?.contractTestDigest,
    profileLocks: [
      {
        profile: "simple-ecommerce",
        graphChecksum: digestA,
        lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
        verifierStatus: "passed",
      },
      {
        profile: "restaurant-ordering",
        graphChecksum: digestB,
        lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
        verifierStatus: "passed",
      },
    ],
    ...overrides,
  };
}

/** A manifest-shaped synthetic asset for admission boundary tests. */
function syntheticAsset(
  overrides: Partial<CapabilityAssetV1["manifest"]> = {},
): CapabilityAssetV1 {
  return {
    manifest: {
      apiVersion: "factory.capability/v1",
      key: "test.admission",
      version: "1.0.0",
      category: "core",
      name: "Test admission",
      description: "Synthetic capability for admission tests.",
      packageRoot: "packages/capabilities/assets/test.admission/1.0.0",
      manifestDigest: digestA,
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["test.effect"],
      inputSchema: [{ key: "entity", type: "domain.entity", required: true }],
      outputSlots: ["api.runtime"],
      templates: [],
      parameters: [{ key: "entity", type: "graph-symbol", required: true }],
      verification: {
        fixture: "fixtures/default.json",
        contractTest: "tests/contract.json",
        status: "verified",
      },
      ...overrides,
    },
  };
}

describe("evaluateFoundryAdmission", () => {
  it("hashes the lock identity canonically (node:crypto known answer)", () => {
    // Independent answer vector computed with node:crypto over the
    // canonical key-sorted lock JSON of the synthetic test.admission asset.
    expect(expectedFoundryLockDigest(syntheticAsset())).toBe(
      "sha256:7dfa593ee446686d1f1f10fb55803c8efe0949795827c53ae07baa432335ef0c",
    );
  });

  it("counts a fully evidenced golden capability as eligible", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture(),
    );
    expect(result).toEqual({ result: "eligible", reasonCodes: [] });
  });

  it("rejects an asset whose manifest digest is not verified", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({ digestVerified: false }),
    );
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["digest-mismatch"],
    });
  });

  it("rejects an asset without a verification fixture", () => {
    const asset = syntheticAsset({
      verification: {
        contractTest: "tests/contract.json",
        status: "verified",
      } as never,
    });
    const result = evaluateFoundryAdmission(asset, evidenceFixture());
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["missing-fixture"],
    });
  });

  it("rejects an asset without a negative-test contract", () => {
    const asset = syntheticAsset({
      verification: {
        fixture: "fixtures/default.json",
        status: "verified",
      } as never,
    });
    const result = evaluateFoundryAdmission(asset, evidenceFixture());
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["missing-negative-test"],
    });
  });

  it("rejects an asset without a typed binding contract", () => {
    const asset = syntheticAsset({
      bindingContract: undefined,
    });
    const result = evaluateFoundryAdmission(asset, evidenceFixture());
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["missing-binding-contract"],
    });
  });

  it("rejects an asset with no declared output slots", () => {
    const asset = syntheticAsset({ outputSlots: [] });
    const result = evaluateFoundryAdmission(asset, evidenceFixture());
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["missing-output-slots"],
    });
  });

  it("rejects an asset whose verification is not verified", () => {
    const asset = syntheticAsset({
      verification: {
        fixture: "fixtures/default.json",
        contractTest: "tests/contract.json",
        status: "pending" as never,
      },
    });
    const result = evaluateFoundryAdmission(asset, evidenceFixture());
    expect(result).toEqual({
      result: "rejected",
      reasonCodes: ["verification-not-verified"],
    });
  });

  it("quarantines an asset that is not lifecycle golden", () => {
    const asset = syntheticAsset({ lifecycle: "preview" as never });
    const digest = expectedFoundryLockDigest(asset);
    const result = evaluateFoundryAdmission(
      asset,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: digest,
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum: digestB,
            lockDigest: digest,
            verifierStatus: "passed",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["lifecycle-not-golden"],
    });
  });

  it("quarantines when licence, provenance, or owner evidence is omitted", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        licence: undefined,
        provenance: undefined,
        owner: undefined,
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["missing-licence", "missing-owner", "missing-provenance"],
    });
  });

  it("quarantines when deprecation or compatibility evidence is omitted", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        deprecationPolicy: undefined,
        compatibilityDeclaration: undefined,
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["missing-compatibility", "missing-deprecation-policy"],
    });
  });

  it("quarantines a candidate with fewer than two verified Profiles", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "passed",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["fewer-than-two-profiles"],
    });
  });

  it("quarantines when verifier evidence failed", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum: digestB,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "failed",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["failed-verifier-evidence"],
    });
  });

  it("quarantines when verifier evidence is stale against the asset lock", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: digestA, // stale: does not match the current asset lock
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum: digestB,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "passed",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "quarantined",
      reasonCodes: ["stale-verifier-evidence"],
    });
  });

  it("marks a candidate partial when evidence digests are missing", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        fixtureDigest: undefined,
        contractTestDigest: undefined,
      }),
    );
    expect(result).toEqual({
      result: "partial",
      reasonCodes: ["missing-evidence-digests"],
    });
  });

  it("marks a candidate partial when evidence digests are stale against the asset", () => {
    // QA Batch 4 P2: a wrong-but-present fixtureDigest must not pass as
    // eligible. The admission boundary value-compares the evidence literal
    // against the digest the current asset manifest records.
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        fixtureDigest: digestA, // present but stale: asset records another value
      }),
    );
    expect(result).toEqual({
      result: "partial",
      reasonCodes: ["stale-evidence-digests"],
    });
  });

  it("marks a candidate partial when evidence claims digests the asset does not record", () => {
    const asset = syntheticAsset(); // verification block records no digest literals
    const result = evaluateFoundryAdmission(
      asset,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: expectedFoundryLockDigest(asset),
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum: digestB,
            lockDigest: expectedFoundryLockDigest(asset),
            verifierStatus: "passed",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "partial",
      reasonCodes: ["stale-evidence-digests"],
    });
  });

  it("marks a candidate partial while verifier evidence is pending", () => {
    const result = evaluateFoundryAdmission(
      orderOperationsAssetV1_1_0,
      evidenceFixture({
        profileLocks: [
          {
            profile: "simple-ecommerce",
            graphChecksum: digestA,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "passed",
          },
          {
            profile: "restaurant-ordering",
            graphChecksum: digestB,
            lockDigest: expectedFoundryLockDigest(orderOperationsAssetV1_1_0),
            verifierStatus: "pending",
          },
        ],
      }),
    );
    expect(result).toEqual({
      result: "partial",
      reasonCodes: ["pending-verifier-evidence"],
    });
  });

  it("applies the worst bucket and returns only its sorted reason codes", () => {
    // rejected wins over quarantined.
    expect(
      evaluateFoundryAdmission(
        orderOperationsAssetV1_1_0,
        evidenceFixture({ digestVerified: false, licence: undefined }),
      ),
    ).toEqual({ result: "rejected", reasonCodes: ["digest-mismatch"] });
    // quarantined wins over partial.
    expect(
      evaluateFoundryAdmission(
        orderOperationsAssetV1_1_0,
        evidenceFixture({
          licence: undefined,
          fixtureDigest: undefined,
        }),
      ),
    ).toEqual({ result: "quarantined", reasonCodes: ["missing-licence"] });
  });
});
