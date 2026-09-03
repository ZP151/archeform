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
 * isolated-verifier evidence (Batches 3 and 4), and verification digests
 * mirror exactly the literals the reviewed current assets record.
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
  // The exact graph checksum of each verified Profile Graph, reproduced by
  // the harness pipeline (composeDefaultCapabilityDraft -> strip
  // composition selections -> SEED_DATA -> hashApplicationGraph) and
  // reviewed into the registry. Pinned per-profile so a composed-graph
  // change that would silently stale a declared lock fails loudly here.
  const PROFILE_GRAPH_CHECKSUMS: Readonly<Record<string, string>> = {
    "expense-approval":
      "sha256:ce59b448807b35561c95b897eff68dd14ccd7f2e808e160c36eaad425b0caa2a",
    "simple-ecommerce":
      "sha256:eecaf73e1f1b1321fc4a23b50c3c8099f6508b4aeb61cec725144829eb24b71c",
    "restaurant-ordering":
      "sha256:1f04bbe32cd7b05782b2ee904861609b0190a3bbfc32e7e8eb6dbbbb80223701",
  };

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
    // Every family locked by the isolated verifier profile graphs declares
    // those locks — exactly, with the lock digest an independent verifier
    // must record for the current asset (`expectedFoundryLockDigest`), a
    // passed status, and a graph checksum from one of the three verified
    // graphs. Batch 3 declared only two-Profile-locked families; Batch 5
    // adds first locks for core.approvals, core.search and restaurant.menu
    // (still quarantined — one Profile cannot prove eligibility) and the
    // second Profile lock for core.files-media (becomes eligible).
    const locked = declaredFoundryFamilyEvidence.filter(
      (record) => record.profileLocks.length > 0,
    );
    expect(locked.length).toBe(19);
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
      "core.approvals",
      "core.audit",
      "core.crud",
      "core.files-media",
      "core.identity-policy",
      "core.location-context",
      "core.notification",
      "core.policy-declarations",
      "core.search",
      "core.workflow",
      "restaurant.menu",
    ]);
    const twoProfile = locked.filter(
      (record) => record.profileLocks.length >= 2,
    );
    const firstLock = locked.filter(
      (record) => record.profileLocks.length === 1,
    );
    expect(twoProfile.length).toBe(16);
    expect(firstLock.map((record) => record.key).sort()).toEqual([
      "core.approvals",
      "core.search",
      "restaurant.menu",
    ]);
    for (const record of locked) {
      const asset = currentCapabilityAssets.find(
        (candidate) => candidate.manifest.key === record.key,
      )!;
      const seen = new Set<string>();
      for (const lock of record.profileLocks) {
        expect(lock.verifierStatus).toBe("passed");
        expect(lock.lockDigest).toBe(expectedFoundryLockDigest(asset));
        expect(VERIFIER_PROFILES.has(lock.profile)).toBe(true);
        expect(lock.graphChecksum).toBe(PROFILE_GRAPH_CHECKSUMS[lock.profile]);
        expect(seen.has(lock.profile)).toBe(false); // one lock per profile
        seen.add(lock.profile);
      }
    }
    // Every family without declared locks still claims nothing.
    expect(
      declaredFoundryFamilyEvidence.filter(
        (record) => record.profileLocks.length === 0,
      ).length,
    ).toBe(8);
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
    // Honest split after Batch 5: the 16 families with two-Profile locks and
    // reviewed verification digests are eligible; the 11 without two-Profile
    // proof stay quarantined; nothing is partial and nothing is rejected.
    // The admission projection must surface the exact reasons.
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
      "core.files-media",
      "core.identity-policy",
      "core.location-context",
      "core.notification",
      "core.policy-declarations",
      "core.workflow",
    ]);
    const partial = declaredFoundryFamilyEvidence.filter(
      (record) => verdictFor(record.key).result === "partial",
    );
    expect(partial).toEqual([]);
    const quarantined = declaredFoundryFamilyEvidence.filter(
      (record) => verdictFor(record.key).result === "quarantined",
    );
    expect(quarantined.length).toBe(11);
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
