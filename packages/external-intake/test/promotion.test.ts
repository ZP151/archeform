import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalJson,
  canonicalRecordDigest,
  createPromotionPacket,
  digestBytes,
  ExternalIntakeStore,
  parseCandidateCapability,
  parseEvidenceBundle,
  parseExternalSourceAcquisition,
  parseIntakeRequest,
  parseSourceSnapshot,
  verifyPromotionPacket,
  type CandidateCapabilityV1,
  type CandidateManifestV1,
  type CandidateRegistryV1,
  type PromotionReviewInputV1,
  type Sha256Digest,
  type StoredCandidateRefV1,
} from "../src/index.js";

const roots: string[] = [];
const encoder = new TextEncoder();
const createdAt = "2026-07-31T08:00:00.000Z";
const commit = "a".repeat(40);

interface PromotionFixture {
  readonly store: ExternalIntakeStore;
  readonly candidate: StoredCandidateRefV1;
  readonly candidateRecord: CandidateCapabilityV1;
  readonly registry: CandidateRegistryV1;
  readonly review: PromotionReviewInputV1;
}

interface PromotionFixtureOptions {
  readonly manualStatus?: "unreviewed" | "approved" | "rejected";
  readonly proposedCopy?: boolean;
  readonly sourceBytes?: Uint8Array;
}

function tempStore(): ExternalIntakeStore {
  const root = mkdtempSync(join(tmpdir(), "factory-promotion-test-"));
  roots.push(root);
  return new ExternalIntakeStore(root);
}

function digestText(value: string): Sha256Digest {
  return digestBytes(encoder.encode(value));
}

function scanSummary(
  snapshotDigest: Sha256Digest,
  treeDigest: Sha256Digest,
  scan: {
    readonly kind: "licence" | "secret" | "sast" | "dependency";
    readonly tool: string;
    readonly toolVersion: string;
    readonly rulesetDigest: Sha256Digest;
    readonly status: "pass";
    readonly findings: readonly [];
    readonly scannerExpression?: string;
  },
): unknown {
  return {
    apiVersion: "factory.external-scan-summary/v1",
    snapshotDigest,
    treeDigest,
    kind: scan.kind,
    tool: scan.tool,
    toolVersion: scan.toolVersion,
    rulesetDigest: scan.rulesetDigest,
    status: scan.status,
    findings: scan.findings,
    ...(scan.scannerExpression === undefined
      ? {}
      : { scannerExpression: scan.scannerExpression }),
  };
}

function manifest(): CandidateManifestV1 {
  return {
    apiVersion: "factory.candidate-manifest/v1",
    id: "safe-adapter",
    version: "1.0.0",
    proposedFactoryKey: "candidate.safe-adapter",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
      additionalProperties: false,
    },
    effects: ["candidate.project"],
  };
}

function promotionFixture(
  options: PromotionFixtureOptions = {},
): PromotionFixture {
  const store = tempStore();
  const request = parseIntakeRequest({
    apiVersion: "factory.external-intake-request/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [],
    source: {
      canonicalRepositoryUrl: "https://github.com/example/safe-adapter.git",
      requestedRef: "v1.0.0",
      expectedCommit: commit,
    },
    classification: "provider",
    requestedModules: [{ path: "src/index.ts", symbol: "safe" }],
    allowNetworkRetrieval: true,
  });
  const requestRef = store.putRecord("request", request);
  const sourceBytes =
    options.sourceBytes ?? encoder.encode("export const safe = true;");
  const sourceDigest = digestBytes(sourceBytes);
  expect(store.putBytes("snapshot", sourceBytes).digest).toBe(sourceDigest);
  const treeDigest = digestText("safe-tree");
  const snapshot = parseSourceSnapshot({
    apiVersion: "factory.external-source-snapshot/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [requestRef.digest],
    repositoryUrl: request.source.canonicalRepositoryUrl,
    requestedRef: request.source.requestedRef,
    resolvedCommit: commit,
    retrievedAt: createdAt,
    archiveDigest: digestText("safe-archive"),
    treeDigest,
    includedPaths: ["LICENSE", "NOTICE", "src/index.ts"],
    excludedPaths: [],
    originEvidence: [
      {
        url: `https://github.com/example/safe-adapter/archive/${commit}.tar.gz`,
        retrievedAt: createdAt,
        digest: digestText("origin"),
      },
    ],
  });
  const snapshotRef = store.putRecord("snapshot", snapshot);
  const licenceDigest = digestText("MIT");
  const noticeDigest = digestText("Example notice");
  const acquisition = parseExternalSourceAcquisition({
    apiVersion: "factory.external-source-acquisition/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [requestRef.digest, snapshotRef.digest],
    sourceRequestDigest: requestRef.digest,
    source: {
      canonicalRepositoryUrl: request.source.canonicalRepositoryUrl,
      requestedRef: request.source.requestedRef,
      resolvedCommit: commit,
    },
    snapshot: {
      recordDigest: snapshotRef.digest,
      archiveDigest: snapshot.archiveDigest,
      treeDigest: snapshot.treeDigest,
      entryCount: 3,
      declaredBytes: sourceBytes.byteLength,
    },
    licence: {
      primaryPaths: ["LICENSE"],
      textDigests: [licenceDigest],
    },
    notices: [{ path: "NOTICE", digest: noticeDigest, required: true }],
    provenance: snapshot.originEvidence,
    manualStatus: "unreviewed",
    acquisitionState: "acquired",
  });
  const acquisitionRef = store.putRecord("acquisition", acquisition);
  const scans = (
    [
      ["licence", "factory-licence-scan", "licence", "MIT"],
      ["secret", "factory-secret-scan", "secret", undefined],
      ["sast", "factory-sast-scan", "sast", undefined],
      ["dependency", "factory-dependency-scan", "dependency", undefined],
    ] as const
  ).map(([kind, tool, ruleset, scannerExpression]) => {
    const summary = {
      kind,
      tool,
      toolVersion: "1.0.0",
      rulesetDigest: digestText(`factory-external-intake:${ruleset}:v1`),
      status: "pass" as const,
      findings: [] as const,
      ...(scannerExpression === undefined ? {} : { scannerExpression }),
    };
    const resultDigest = digestBytes(
      encoder.encode(
        canonicalJson(scanSummary(snapshotRef.digest, treeDigest, summary)),
      ),
    );
    expect(
      store.putBytes(
        "evidence",
        encoder.encode(
          canonicalJson(scanSummary(snapshotRef.digest, treeDigest, summary)),
        ),
      ).digest,
    ).toBe(resultDigest);
    return { ...summary, resultDigest };
  });
  const sbomDigest = store.putBytes(
    "evidence",
    encoder.encode('{"components":[]}'),
  ).digest;
  const inventoryDigest = store.putBytes(
    "evidence",
    encoder.encode('{"modules":[]}'),
  ).digest;
  const evidence = parseEvidenceBundle({
    apiVersion: "factory.external-evidence/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [
      snapshotRef.digest,
      acquisitionRef.digest,
      ...scans.map(({ resultDigest }) => resultDigest),
      sbomDigest,
      inventoryDigest,
    ],
    snapshotDigest: snapshotRef.digest,
    licence: {
      primaryPaths: ["LICENSE"],
      textDigests: [licenceDigest],
      scannerExpression: "MIT",
      manualStatus: options.manualStatus ?? "unreviewed",
    },
    notices: [{ path: "NOTICE", digest: noticeDigest, required: true }],
    sbom: { format: "CycloneDX", digest: sbomDigest, components: 0 },
    scans: scans.map(
      ({ kind, tool, toolVersion, rulesetDigest, resultDigest, status }) => ({
        kind,
        tool,
        toolVersion,
        rulesetDigest,
        resultDigest,
        status,
      }),
    ),
    ast: {
      parser: "factory-typescript-module-locator",
      parserVersion: "1.0.0",
      inventoryDigest,
    },
  });
  const evidenceRef = store.putRecord("evidence", evidence);
  const candidateManifest = manifest();
  const manifestDigest = store.putBytes(
    "evidence",
    encoder.encode(canonicalJson(candidateManifest)),
  ).digest;
  const fixtureDigest = digestText("fixture");
  const adapterDigest = digestText("adapter");
  const conformanceDigest = store.putBytes(
    "evidence",
    encoder.encode('{"status":"pass"}'),
  ).digest;
  const candidateRecord = parseCandidateCapability({
    apiVersion: "factory.candidate-capability/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [
      snapshotRef.digest,
      acquisitionRef.digest,
      evidenceRef.digest,
      manifestDigest,
      fixtureDigest,
      adapterDigest,
      conformanceDigest,
    ],
    id: "safe-adapter",
    version: "1.0.0",
    status: "conformance-passed",
    sourceSnapshotDigest: snapshotRef.digest,
    evidenceDigest: evidenceRef.digest,
    proposedFactoryKey: "candidate.safe-adapter",
    proposedClassification: options.proposedCopy
      ? "source-fragment"
      : "provider-adapter",
    selectedModules: [
      {
        path: "src/index.ts",
        symbol: "safe",
        digest: sourceDigest,
        purpose: options.proposedCopy ? "proposed-copy" : "adapter-contract",
      },
    ],
    allowedOutputs: ["manifest", "fixture", "adapter", "conformance-plan"],
    prohibited: [
      "capability-selection",
      "golden-registration",
      "graph-mutation",
      "compilation",
    ],
    candidateManifestDigest: manifestDigest,
    fixtureDigest,
    adapterDigest,
    conformanceResultDigest: conformanceDigest,
  });
  const candidateDigest = canonicalRecordDigest(candidateRecord);
  const candidate: StoredCandidateRefV1 = {
    kind: "candidate",
    digest: candidateDigest,
    id: candidateRecord.id,
    version: candidateRecord.version,
    status: candidateRecord.status,
    lookupId: `candidate-${"b".repeat(64)}`,
  };
  const registry = {
    async verify(ref: StoredCandidateRefV1) {
      return ref.digest === candidate.digest
        ? { valid: true, issues: [], candidate: candidateRecord }
        : { valid: false, issues: ["stale Candidate"] };
    },
  } as unknown as CandidateRegistryV1;
  const factoryKey = "integration.safe-adapter";
  const collisionDocument = {
    apiVersion: "factory.external-collision-inventory/v1" as const,
    proposedFactoryKey: factoryKey,
    version: candidateRecord.version,
    packageRoot: "packages/capabilities/assets/safe-adapter/1.0.0",
    targets: ["api"],
    entries: [],
  };
  const review: PromotionReviewInputV1 = {
    apiVersion: "factory.external-promotion-review-input/v1",
    candidate: {
      id: candidate.id,
      version: candidate.version,
      digest: candidate.digest,
    },
    parents: {
      requestDigest: requestRef.digest,
      snapshotDigest: snapshotRef.digest,
      acquisitionDigest: acquisitionRef.digest,
      evidenceDigest: evidenceRef.digest,
      conformanceDigest,
    },
    manifest: candidateManifest,
    factoryProposal: {
      apiVersion: "factory.external-factory-interface-proposal/v1",
      reviewStatus: "pending-manual-review",
      key: factoryKey,
      version: candidateRecord.version,
      packageRoot: collisionDocument.packageRoot,
      targets: ["api"],
      candidate: {
        id: candidate.id,
        version: candidate.version,
        digest: candidate.digest,
        classification: candidateRecord.proposedClassification,
        manifestDigest,
      },
      operations: [
        {
          candidateEffect: "candidate.project",
          factoryOperation: "safe-adapter.project",
        },
      ],
      interface: {
        inputSchema: candidateManifest.inputSchema,
        outputSchema: candidateManifest.outputSchema,
      },
    },
    licence: {
      manualStatus: options.manualStatus ?? "unreviewed",
      reviewStatus: "pending-manual-review",
    },
    findingDispositions: scans.map(({ kind, resultDigest }) => ({
      kind,
      resultDigest,
      findings: [],
    })),
    sourceCopy: options.proposedCopy
      ? {
          mode: "proposed-copy",
          ranges: [
            {
              path: "src/index.ts",
              sourceDigest,
              lineRanges: [
                {
                  start: 1,
                  end: 1,
                  digest: sourceDigest,
                },
              ],
              purpose: "adapter",
            },
          ],
        }
      : { mode: "none", ranges: [] },
    notices: {
      destination: "docs/third-party-notices.md",
      action: "pending-manual-review",
    },
    reviewers: [
      "intake-maintainer",
      "licence-reviewer",
      "security-reviewer",
      "capability-maintainer",
      "architecture-owner",
      "qa-owner",
      "golden-owner",
    ].map((role) => ({
      role,
      reviewer: `${role}-alice`,
      status: "assigned-not-reviewed" as const,
    })),
    removalPlan: {
      packageRoot: collisionDocument.packageRoot,
      replacement: "factory-native-safe-adapter",
      steps: ["remove-package", "remove-target-bindings", "run-regressions"],
    },
    collisionInventory: {
      digest: canonicalRecordDigest(collisionDocument),
      inventory: collisionDocument,
    },
  };
  return { store, candidate, candidateRecord, registry, review };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("review-only PromotionPacket", () => {
  it("creates a canonical pending packet only after fresh immutable verification", async () => {
    const fixture = promotionFixture();

    const packet = await createPromotionPacket(
      fixture.candidate,
      fixture.review,
      fixture.registry,
      fixture.store,
    );
    const verification = verifyPromotionPacket(packet);

    expect(packet.decision).toBe("pending-review");
    expect(packet.candidate).toMatchObject({
      id: "safe-adapter",
      version: "1.0.0",
      digest: fixture.candidate.digest,
      status: "conformance-passed",
    });
    expect(packet.candidateManifest).toEqual(fixture.review.manifest);
    expect(packet.factoryProposal).toEqual(fixture.review.factoryProposal);
    expect(packet.factoryProposal.key).not.toMatch(/^candidate\./u);
    expect(packet.sourceCopy).toEqual({ mode: "none", modules: [] });
    expect(packet.collision).toEqual({
      inventoryDigest: fixture.review.collisionInventory.digest,
      result: "no-collision-observed-in-inventory",
      goldenOwnerAction: "pending-manual-review",
    });
    expect(packet.parentDigests).toEqual([...packet.parentDigests].sort());
    expect(verification).toEqual({
      valid: true,
      issues: [],
      digest: canonicalRecordDigest(packet),
      packet,
    });
    expect(packet.prohibitedFields).toContain("approval");
    expect(packet.prohibitedFields).toContain("golden-registration");
    expect(canonicalJson(JSON.parse(canonicalJson(packet)))).toBe(
      canonicalJson(packet),
    );
  });

  it.each([
    [
      "quarantined Candidate",
      (fixture: PromotionFixture) => {
        fixture.candidateRecord.status = "quarantined";
      },
    ],
    [
      "stale Candidate ref",
      (fixture: PromotionFixture) => {
        fixture.candidate = {
          ...fixture.candidate,
          digest: digestText("stale-candidate"),
        };
      },
    ],
    [
      "manifest drift",
      (fixture: PromotionFixture) => {
        fixture.review.manifest.outputSchema.properties.message.type = "number";
      },
    ],
    [
      "parent drift",
      (fixture: PromotionFixture) => {
        fixture.review.parents.evidenceDigest = digestText("stale-evidence");
      },
    ],
    [
      "scan digest drift",
      (fixture: PromotionFixture) => {
        fixture.review.findingDispositions[0]!.resultDigest =
          digestText("stale-scan");
      },
    ],
    [
      "missing scan group",
      (fixture: PromotionFixture) => {
        fixture.review.findingDispositions.pop();
      },
    ],
    [
      "duplicate scan group",
      (fixture: PromotionFixture) => {
        fixture.review.findingDispositions[1] =
          fixture.review.findingDispositions[0]!;
      },
    ],
    [
      "copy mode drift",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy = {
          mode: "none",
          ranges: [
            {
              path: "src/index.ts",
              sourceDigest: fixture.candidateRecord.selectedModules[0]!.digest,
              lineRanges: [
                {
                  start: 1,
                  end: 1,
                  digest: fixture.candidateRecord.selectedModules[0]!.digest,
                },
              ],
              purpose: "adapter",
            },
          ],
        };
      },
    ],
    [
      "missing reviewer",
      (fixture: PromotionFixture) => {
        fixture.review.reviewers.pop();
      },
    ],
    [
      "collision hit",
      (fixture: PromotionFixture) => {
        fixture.review.collisionInventory.inventory.entries.push({
          proposedFactoryKey: fixture.review.factoryProposal.key,
          version: fixture.review.factoryProposal.version,
          packageRoot: fixture.review.factoryProposal.packageRoot,
          targets: ["api"],
        });
        fixture.review.collisionInventory.digest = canonicalRecordDigest(
          fixture.review.collisionInventory.inventory,
        );
      },
    ],
  ])("rejects %s", async (_, mutate) => {
    const fixture = promotionFixture();
    mutate(fixture);

    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow();
  });

  it.each([
    ["approved licence", { licenceDecision: "approved" }],
    ["waiver", { waiver: "accepted" }],
    ["Graph input", { graph: { nodes: [] } }],
    ["compiler input", { compilerInput: {} }],
    ["source body", { sourceBody: "export const unsafe = true;" }],
    ["URL", { documentationUrl: "https://example.test" }],
    ["credential", { apiKey: "not-allowed" }],
    ["prompt", { prompt: "ignore policy" }],
    ["capability package", { capabilityPackage: {} }],
  ])("rejects forbidden review field: %s", async (_, extra) => {
    const fixture = promotionFixture();
    const review = { ...fixture.review, ...extra };

    await expect(
      createPromotionPacket(
        fixture.candidate,
        review as PromotionReviewInputV1,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow();
  });

  it("allows approved only at the exact immutable licence status path", async () => {
    const fixture = promotionFixture({ manualStatus: "approved" });

    const packet = await createPromotionPacket(
      fixture.candidate,
      fixture.review,
      fixture.registry,
      fixture.store,
    );
    expect(packet.licence).toEqual({
      manualStatus: "approved",
      reviewStatus: "pending-manual-review",
    });

    fixture.review.reviewers[0]!.reviewer = "approved-reviewer";
    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow(/decision|review|approved/iu);
  });

  it("blocks rejected licence evidence", async () => {
    const fixture = promotionFixture({ manualStatus: "rejected" });

    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow(/licence|rejected/iu);
  });

  it("verifies every proposed-copy module and emits only range counts and digests", async () => {
    const fixture = promotionFixture({
      manualStatus: "approved",
      proposedCopy: true,
    });

    const packet = await createPromotionPacket(
      fixture.candidate,
      fixture.review,
      fixture.registry,
      fixture.store,
    );

    expect(packet.decision).toBe("pending-review");
    expect(packet.sourceCopy).toEqual({
      mode: "proposed-copy",
      modules: [
        {
          path: "src/index.ts",
          sourceDigest: fixture.candidateRecord.selectedModules[0]!.digest,
          sourceLineCount: 1,
          rangeCount: 1,
          rangeDigests: [
            fixture.review.sourceCopy.ranges[0]!.lineRanges[0]!.digest,
          ],
        },
      ],
    });
    expect(canonicalJson(packet)).not.toContain("export const");
    expect(packet.prohibitedFields).toContain("source-copy-execution");
  });

  it("counts LF-terminated source lines without inventing a trailing empty line", async () => {
    const fixture = promotionFixture({
      manualStatus: "approved",
      proposedCopy: true,
      sourceBytes: encoder.encode("first line\nsecond line\n"),
    });
    const sourceDigest = fixture.candidateRecord.selectedModules[0]!.digest;
    fixture.review.sourceCopy.ranges[0]!.lineRanges = [
      { start: 1, end: 2, digest: sourceDigest },
    ];

    const packet = await createPromotionPacket(
      fixture.candidate,
      fixture.review,
      fixture.registry,
      fixture.store,
    );

    expect(packet.sourceCopy).toMatchObject({
      mode: "proposed-copy",
      modules: [{ sourceLineCount: 2, rangeDigests: [sourceDigest] }],
    });
  });

  it.each([
    [
      "unapproved licence",
      (fixture: PromotionFixture) => {
        fixture.review.licence.manualStatus = "unreviewed";
      },
    ],
    [
      "missing coverage",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy.ranges = [];
      },
    ],
    [
      "duplicate coverage",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy.ranges.push(
          structuredClone(fixture.review.sourceCopy.ranges[0]!),
        );
      },
    ],
    [
      "extra coverage",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy.ranges.push({
          ...structuredClone(fixture.review.sourceCopy.ranges[0]!),
          path: "src/extra.ts",
        });
      },
    ],
    [
      "range digest drift",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy.ranges[0]!.lineRanges[0]!.digest =
          digestText("drifted-range");
      },
    ],
    [
      "line endpoint overflow",
      (fixture: PromotionFixture) => {
        fixture.review.sourceCopy.ranges[0]!.lineRanges[0]!.end = 2;
      },
    ],
  ])("rejects proposed-copy %s", async (_, mutate) => {
    const fixture = promotionFixture({
      manualStatus: "approved",
      proposedCopy: true,
    });
    mutate(fixture);

    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow();
  });

  it.each([
    ["fatal UTF-8", new Uint8Array([0xff, 0xfe])],
    ["NUL source", new Uint8Array([0x61, 0x00, 0x62])],
  ])("rejects proposed-copy %s", async (_, sourceBytes) => {
    const fixture = promotionFixture({
      manualStatus: "approved",
      proposedCopy: true,
      sourceBytes,
    });

    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow(/UTF|NUL|source/iu);
  });

  it.each([
    [
      "Candidate namespace",
      (fixture: PromotionFixture) => {
        fixture.review.factoryProposal.key = "candidate.safe-adapter";
      },
    ],
    [
      "classification drift",
      (fixture: PromotionFixture) => {
        fixture.review.factoryProposal.candidate.classification = "dependency";
      },
    ],
    [
      "missing operation",
      (fixture: PromotionFixture) => {
        fixture.review.factoryProposal.operations = [];
      },
    ],
    [
      "duplicate operation",
      (fixture: PromotionFixture) => {
        fixture.review.factoryProposal.operations.push(
          structuredClone(fixture.review.factoryProposal.operations[0]!),
        );
      },
    ],
  ])("rejects Factory proposal %s", async (_, mutate) => {
    const fixture = promotionFixture();
    mutate(fixture);

    await expect(
      createPromotionPacket(
        fixture.candidate,
        fixture.review,
        fixture.registry,
        fixture.store,
      ),
    ).rejects.toThrow();
  });

  it("rejects a noncanonical or caller-authorized packet", () => {
    const fixture = promotionFixture();
    const packet = {
      apiVersion: "factory.external-capability-promotion-packet/v1",
      decision: "approved",
      candidate: {
        id: fixture.candidate.id,
        version: fixture.candidate.version,
        digest: fixture.candidate.digest,
        status: "conformance-passed",
      },
    };

    expect(verifyPromotionPacket(packet)).toMatchObject({
      valid: false,
    });
  });
});
