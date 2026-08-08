import { describe, expect, it } from "vitest";

import {
  currentCapabilityAssets,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import {
  evaluateFoundryAdmission,
  expectedFoundryLockDigest,
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
 * nothing it cannot prove — profile locks are declared only from real
 * isolated-verifier evidence (Batch 3), and verification digests mirror
 * exactly the literals the reviewed current assets record.
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
  const VERIFIER_PROFILES = new Set([
    "expense-approval",
    "simple-ecommerce",
    "restaurant-ordering",
  ]);

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

  it("declares profile locks only from real isolated-verifier evidence", () => {
    // Batch 3: every family locked by two or more of the three isolated
    // verifier profile graphs declares those locks — exactly, with the lock
    // digest an independent verifier must record for the current asset
    // (`expectedFoundryLockDigest`), a passed status, and a graph checksum
    // from one of the three verified graphs. Families without two-Profile
    // proof stay lock-free: the matrix can never report them eligible.
    const locked = declaredFoundryFamilyEvidence.filter(
      (record) => record.profileLocks.length > 0,
    );
    expect(locked.length).toBe(15);
    const lockedKeys = locked.map((record) => record.key).sort();
    expect(lockedKeys).toEqual([
      "commerce.cart",
      "commerce.catalog",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.money-pricing",
      "commerce.order",
      "commerce.order-operations",
      "core.audit",
      "core.crud",
      "core.identity-policy",
      "core.location-context",
      "core.notification",
      "core.policy-declarations",
      "core.workflow",
    ]);
    for (const record of locked) {
      expect(record.profileLocks.length).toBeGreaterThanOrEqual(2);
      const asset = currentCapabilityAssets.find(
        (candidate) => candidate.manifest.key === record.key,
      )!;
      const seen = new Set<string>();
      for (const lock of record.profileLocks) {
        expect(lock.verifierStatus).toBe("passed");
        expect(lock.lockDigest).toBe(expectedFoundryLockDigest(asset));
        expect(VERIFIER_PROFILES.has(lock.profile)).toBe(true);
        expect(lock.graphChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(seen.has(lock.profile)).toBe(false); // one lock per profile
        seen.add(lock.profile);
      }
    }
    // Every family without two-Profile proof still claims nothing.
    expect(
      declaredFoundryFamilyEvidence.filter(
        (record) => record.profileLocks.length === 0,
      ).length,
    ).toBe(12);
  });

  it("mirrors the reviewed verification digests of the current assets", () => {
    // The evidence record's fixture and contract-test digests are the
    // reviewed literals the current asset manifest records — never invented
    // in the registry. A record whose asset declares a digest must carry the
    // same value, and a record whose asset records none must carry none
    // (staying honestly partial until the asset records it).
    for (const record of declaredFoundryFamilyEvidence) {
      const asset = currentCapabilityAssets.find(
        (candidate) => candidate.manifest.key === record.key,
      )!;
      const assetFixtureDigest = asset.manifest.verification?.fixtureDigest;
      const assetContractTestDigest =
        asset.manifest.verification?.contractTestDigest;
      expect(record.fixtureDigest).toBe(assetFixtureDigest);
      expect(record.contractTestDigest).toBe(assetContractTestDigest);
    }
  });

  it("admits the locked families exactly as the evidence proves", () => {
    // Honest split after Batch 3: the 11 families with two-Profile locks and
    // reviewed verification digests are eligible; the 4 locked families whose
    // current assets record no digest literals stay partial
    // (missing-evidence-digests); the 12 without two-Profile proof stay
    // quarantined. The admission projection must surface the exact reasons.
    const verdictFor = (key: string) => {
      const asset = currentCapabilityAssets.find(
        (candidate: CapabilityAssetV1) => candidate.manifest.key === key,
      )!;
      const record = byKey.get(key)!;
      return evaluateFoundryAdmission(
        asset,
        familyEvidenceToAdmissionEvidence(record),
      );
    };
    const eligible = declaredFoundryFamilyEvidence.filter(
      (record) => verdictFor(record.key).result === "eligible",
    );
    expect(eligible.map((record) => record.key).sort()).toEqual([
      "commerce.catalog",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.money-pricing",
      "commerce.order",
      "commerce.order-operations",
      "core.identity-policy",
      "core.location-context",
      "core.notification",
      "core.policy-declarations",
    ]);
    const partial = declaredFoundryFamilyEvidence.filter(
      (record) => verdictFor(record.key).result === "partial",
    );
    expect(partial.map((record) => record.key).sort()).toEqual([
      "commerce.cart",
      "core.audit",
      "core.crud",
      "core.workflow",
    ]);
    for (const record of partial) {
      expect(verdictFor(record.key).reasonCodes).toEqual([
        "missing-evidence-digests",
      ]);
    }
    const quarantined = declaredFoundryFamilyEvidence.filter(
      (record) => verdictFor(record.key).result === "quarantined",
    );
    expect(quarantined.length).toBe(12);
    for (const record of quarantined) {
      expect(verdictFor(record.key).reasonCodes).toEqual([
        "fewer-than-two-profiles",
      ]);
    }
    expect(
      declaredFoundryFamilyEvidence.filter(
        (record) => verdictFor(record.key).result === "rejected",
      ).length,
    ).toBe(0);
  });
});
