import { describe, expect, it } from "vitest";

import {
  buildFoundryMatrix,
  expectedFoundryLockDigest,
  type FoundryFamilyEvidenceV1,
} from "../src/index.js";
import type { CapabilityAssetV1 } from "../src/assets/index.js";

const digestA =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const digestB =
  "sha256:2222222222222222222222222222222222222222222222222222222222222222";

/** A manifest-shaped synthetic asset for matrix boundary tests. */
function syntheticAsset(
  key: string,
  overrides: Partial<CapabilityAssetV1["manifest"]> = {},
): CapabilityAssetV1 {
  return {
    manifest: {
      apiVersion: "factory.capability/v1",
      key,
      version: "1.0.0",
      category: "core",
      name: `Synthetic ${key}`,
      description: "Synthetic capability for foundry matrix tests.",
      packageRoot: `packages/capabilities/assets/${key}/1.0.0`,
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

const asset = syntheticAsset("test.admission");
const otherAsset = syntheticAsset("test.other");

/**
 * Evidence records must bind profile locks to the asset they vouch for —
 * `expectedFoundryLockDigest` covers the family identity (key, version,
 * package root, digest, lifecycle), so a lock computed against the wrong
 * asset is stale evidence and must never count. The fixture takes the
 * target asset first so callers cannot accidentally cross-bind.
 */
function recordFixture(
  overrides: Partial<FoundryFamilyEvidenceV1> = {},
  target: CapabilityAssetV1 = asset,
): FoundryFamilyEvidenceV1 {
  return {
    key: target.manifest.key,
    version: "1.0.0",
    manifestDigest: digestA,
    licence: "MIT",
    provenance: "first-party",
    owner: "factory-platform",
    deprecationPolicy: "two-minor-version notice",
    compatibilityDeclaration: "API-compatible within the major version",
    digestVerified: true,
    fixtureDigest: digestA,
    contractTestDigest: digestB,
    profileLocks: [
      {
        profile: "simple-ecommerce",
        graphChecksum: digestA,
        lockDigest: expectedFoundryLockDigest(target),
        verifierStatus: "passed",
      },
      {
        profile: "restaurant-ordering",
        graphChecksum: digestB,
        lockDigest: expectedFoundryLockDigest(target),
        verifierStatus: "passed",
      },
    ],
    ...overrides,
  };
}

describe("buildFoundryMatrix", () => {
  it("reports one row per current family and consistent counts", () => {
    const matrix = buildFoundryMatrix(
      [asset, otherAsset],
      [recordFixture(), recordFixture({ key: "test.other" }, otherAsset)],
    );

    expect(matrix.rows).toHaveLength(2);
    expect(matrix.counts.currentFamilies).toBe(2);
    expect(matrix.counts.eligible).toBe(2);
    expect(
      matrix.counts.eligible +
        matrix.counts.partial +
        matrix.counts.quarantined +
        matrix.counts.rejected +
        matrix.counts.missingEvidence +
        matrix.counts.staleEvidence +
        matrix.counts.duplicateEvidence,
    ).toBe(matrix.rows.length);
  });

  it("never counts a duplicate family alias twice", () => {
    // Two evidence records for the same key is an ambiguity: the matrix
    // flags the family and must not count it as eligible at all.
    const matrix = buildFoundryMatrix(
      [asset],
      [recordFixture(), recordFixture({ manifestDigest: digestB })],
    );

    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]).toMatchObject({
      key: "test.admission",
      result: "duplicate-evidence",
      reasonCodes: ["duplicate-family-evidence"],
    });
    expect(matrix.counts.currentFamilies).toBe(1);
    expect(matrix.counts.eligible).toBe(0);
    expect(matrix.counts.duplicateEvidence).toBe(1);
  });

  it("never inflates the count with historical or retired records", () => {
    // A record bound to a non-current version of a current key is stale
    // evidence; a record for a key with no current asset creates no row.
    const matrix = buildFoundryMatrix(
      [asset],
      [
        recordFixture({ version: "0.9.0", manifestDigest: digestB }),
        recordFixture({ key: "retired.family" }),
      ],
    );

    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]).toMatchObject({
      key: "test.admission",
      result: "stale-evidence",
      reasonCodes: ["stale-evidence-record"],
    });
    expect(matrix.counts.currentFamilies).toBe(1);
    expect(matrix.counts.staleEvidence).toBe(1);
    expect(matrix.counts.eligible).toBe(0);
  });

  it("flags a current family with no evidence record at all", () => {
    const matrix = buildFoundryMatrix([asset], []);
    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]).toMatchObject({
      key: "test.admission",
      result: "missing-evidence",
      reasonCodes: ["missing-evidence-record"],
    });
    expect(matrix.counts.missingEvidence).toBe(1);
  });

  it("quarantines a record without a licence", () => {
    const matrix = buildFoundryMatrix(
      [asset],
      [recordFixture({ licence: "" })],
    );
    expect(matrix.rows[0]).toMatchObject({
      result: "quarantined",
      reasonCodes: ["missing-licence"],
    });
  });

  it("quarantines third-party provenance without a source study", () => {
    const matrix = buildFoundryMatrix(
      [asset],
      [recordFixture({ provenance: "third-party" })],
    );
    expect(matrix.rows[0]).toMatchObject({
      result: "quarantined",
      reasonCodes: ["missing-source-study"],
    });

    const withStudy = buildFoundryMatrix(
      [asset],
      [
        recordFixture({
          provenance: "third-party",
          sourceStudy: "docs/ecosystem/source-studies/upstream.md",
        }),
      ],
    );
    expect(withStudy.rows[0].result).toBe("eligible");
    expect(withStudy.rows[0].reasonCodes).not.toContain("missing-source-study");
  });

  it("quarantines a family without two-Profile proof", () => {
    const matrix = buildFoundryMatrix(
      [asset],
      [recordFixture({ profileLocks: [] })],
    );
    expect(matrix.rows[0]).toMatchObject({
      result: "quarantined",
      reasonCodes: ["fewer-than-two-profiles"],
    });
  });

  it("quarantines stale verifier evidence", () => {
    const staleLock = {
      ...recordFixture().profileLocks[0],
      lockDigest:
        "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    };
    const matrix = buildFoundryMatrix(
      [asset],
      [
        recordFixture({
          profileLocks: [staleLock, recordFixture().profileLocks[1]],
        }),
      ],
    );
    expect(matrix.rows[0]).toMatchObject({
      result: "quarantined",
      reasonCodes: ["stale-verifier-evidence"],
    });
  });

  it("passes admission rejections through unchanged", () => {
    const matrix = buildFoundryMatrix(
      [asset],
      [recordFixture({ digestVerified: false })],
    );
    expect(matrix.rows[0]).toMatchObject({
      result: "rejected",
      reasonCodes: ["digest-mismatch"],
    });
  });

  it("reports the declared registry honestly with zero eligible families", () => {
    // Default inputs: the 23 current families with their declared records.
    // The matrix claims nothing the evidence does not prove: no family has
    // two-Profile locks yet, and 14 current manifests have not declared a
    // binding contract at all, so the honest verdict is zero eligible — 9
    // quarantined for missing two-Profile proof, 14 rejected for a missing
    // binding contract (a manifest-readiness gap Task 6 must repair). The
    // matrix exists to surface exactly this split.
    const matrix = buildFoundryMatrix();
    expect(matrix.counts.currentFamilies).toBe(23);
    expect(matrix.counts.eligible).toBe(0);
    expect(matrix.counts.quarantined).toBe(9);
    expect(matrix.counts.rejected).toBe(14);
    expect(matrix.counts.missingEvidence).toBe(0);
    expect(matrix.counts.staleEvidence).toBe(0);
    expect(matrix.counts.duplicateEvidence).toBe(0);

    const quarantined = matrix.rows.filter(
      (row) => row.result === "quarantined",
    );
    const rejected = matrix.rows.filter((row) => row.result === "rejected");
    expect(
      quarantined.every(
        (row) =>
          row.reasonCodes.length === 1 &&
          row.reasonCodes[0] === "fewer-than-two-profiles",
      ),
    ).toBe(true);
    expect(
      rejected.every(
        (row) =>
          row.reasonCodes.length === 1 &&
          row.reasonCodes[0] === "missing-binding-contract",
      ),
    ).toBe(true);
    // Pin the exact split: the 9 families that satisfy the manifest contract
    // today, and the 14 that do not. A manifest repair moves a family from
    // the rejected set into quarantine — the counts tripwire catches it.
    expect(quarantined.map((row) => row.key).sort()).toEqual([
      "commerce.money-pricing",
      "commerce.order-operations",
      "core.identity-policy",
      "core.policy-declarations",
      "restaurant.cashier",
      "restaurant.kitchen",
      "restaurant.ordering",
      "restaurant.reporting",
      "restaurant.table-session",
    ]);
    expect(rejected.map((row) => row.key).sort()).toEqual([
      "commerce.cart",
      "commerce.catalog",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.order",
      "commerce.simulated-payment",
      "core.audit",
      "core.crud",
      "core.identity-context",
      "core.location-context",
      "core.notification",
      "core.workflow",
      "restaurant.menu",
    ]);
  });

  it("orders rows stably by family key", () => {
    const matrix = buildFoundryMatrix(
      [otherAsset, asset],
      [recordFixture(), recordFixture({ key: "test.other" }, otherAsset)],
    );
    expect(matrix.rows.map((row) => row.key)).toEqual([
      "test.admission",
      "test.other",
    ]);
  });
});
