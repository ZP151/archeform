import { describe, expect, it } from "vitest";

import {
  currentCapabilityAssets,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import {
  evaluateFoundryAdmission,
  familyEvidenceToAdmissionEvidence,
} from "../src/index.js";
import { declaredFoundryFamilyEvidence } from "../src/index.js";

/**
 * The declared Foundry evidence registry is the honest, deliberate record of
 * what has been verified for each current capability family. These tests pin
 * its coverage: every current family carries exactly one declared record
 * bound to its exact key, version, and manifest digest (a literal, so an
 * asset bump without a deliberate registry update fails the self-check), no
 * duplicate or historical records are counted, and the registry claims
 * nothing it cannot prove — profile locks start empty until Task 6 supplies
 * real isolated-verifier evidence.
 */
describe("declaredFoundryFamilyEvidence", () => {
  const byKey = new Map(
    declaredFoundryFamilyEvidence.map((record) => [record.key, record]),
  );
  const currentByIdentity = new Set(
    currentCapabilityAssets.map(
      (asset) =>
        `${asset.manifest.key}@${asset.manifest.version}:${asset.manifest.manifestDigest}`,
    ),
  );

  it("declares exactly one matching record per current family", () => {
    expect(declaredFoundryFamilyEvidence.length).toBe(
      currentCapabilityAssets.length,
    );
    for (const asset of currentCapabilityAssets) {
      const record = byKey.get(asset.manifest.key);
      expect(record).toBeDefined();
      expect(record!.version).toBe(asset.manifest.version);
      expect(record!.manifestDigest).toBe(asset.manifest.manifestDigest);
    }
    // No duplicate keys and no record bound to a version the current set
    // does not carry (historical versions must never be counted).
    expect(byKey.size).toBe(currentCapabilityAssets.length);
    for (const record of declaredFoundryFamilyEvidence) {
      expect(
        currentByIdentity.has(
          `${record.key}@${record.version}:${record.manifestDigest}`,
        ),
      ).toBe(true);
    }
  });

  it("carries the first-party policy fields on every record", () => {
    for (const record of declaredFoundryFamilyEvidence) {
      expect(record.licence).toBe("MIT");
      expect(record.provenance).toBe("first-party");
      expect(record.owner).toBe("factory-platform");
      expect(record.deprecationPolicy).toBe("two-minor-version notice");
      expect(record.compatibilityDeclaration).toBe(
        "API-compatible within the major version",
      );
      expect(record.digestVerified).toBe(true);
    }
  });

  it("is runtime-frozen so caller mutation cannot rewrite verdicts", () => {
    // The readonly contract is enforced at runtime (QA-1): the declared
    // registry and every record — including its profile-lock array — are
    // deep-frozen, so a caller mutating a field changes nothing for the
    // matrix or for any other caller.
    expect(Object.isFrozen(declaredFoundryFamilyEvidence)).toBe(true);
    for (const record of declaredFoundryFamilyEvidence) {
      expect(Object.isFrozen(record)).toBe(true);
      expect(Object.isFrozen(record.profileLocks)).toBe(true);
    }
  });

  it("claims no two-Profile proof until verifier evidence lands", () => {
    // Honest starting state: every declared record has empty profile locks,
    // so the matrix can never report an eligible family this round. The
    // admission projection must surface the exact quarantine reason.
    for (const record of declaredFoundryFamilyEvidence) {
      expect(record.profileLocks).toEqual([]);
    }
    const sample = currentCapabilityAssets.find(
      (asset: CapabilityAssetV1) =>
        asset.manifest.key === "commerce.order-operations",
    )!;
    const record = byKey.get("commerce.order-operations")!;
    const verdict = evaluateFoundryAdmission(
      sample,
      familyEvidenceToAdmissionEvidence(record),
    );
    expect(verdict.result).toBe("quarantined");
    expect(verdict.reasonCodes).toEqual(["fewer-than-two-profiles"]);
  });
});
