import {
  mkdtempSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { canonicalJson, digestBytes } from "../src/canonical.js";
import {
  CandidateRegistry,
  type CandidateArtifactsV1,
  type CandidateProposalV1,
} from "../src/candidates.js";
import { evaluateCandidateConformance } from "../src/conformance.js";
import type {
  ExternalSourceAcquisitionV1,
  IntakeRequestV1,
  SourceSnapshotV1,
} from "../src/contracts.js";
import {
  runEvidencePipeline,
  verifyCompletedEvidence,
  type IntakeJobV1,
} from "../src/jobs.js";
import {
  PINNED_MODULE_INVENTORY_IDENTITY,
  type ModuleInventoryAdapterV1,
} from "../src/module-inventory.js";
import {
  PINNED_SCANNER_IDENTITIES,
  type LocalScannerV1,
  type NormalizedScanResultV1,
  type ScanKindV1,
} from "../src/scans.js";
import { canonicalTreeDigest } from "../src/snapshot.js";
import { ExternalIntakeStore } from "../src/store.js";

const roots: string[] = [];
const createdAt = "2026-07-31T05:00:00.000Z";
const commit = "a".repeat(40);
const encoder = new TextEncoder();

function bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-candidate-test-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

class ForgingReceiptStore extends ExternalIntakeStore {
  forgeConformanceReceipt = false;
  forgeEvidenceJob = false;

  override getRecord(
    ...args: Parameters<ExternalIntakeStore["getRecord"]>
  ): ReturnType<ExternalIntakeStore["getRecord"]> {
    const record = super.getRecord(...args);
    if (
      this.forgeConformanceReceipt &&
      record.apiVersion === "factory.external-intake-receipt/v1" &&
      record.code === "candidate-conformance-passed"
    ) {
      return {
        ...record,
        recordDigests: [
          record.recordDigests[0]!,
          digestBytes(bytes("forged-conformance-result")),
        ],
      };
    }
    if (
      this.forgeEvidenceJob &&
      record.apiVersion === "factory.external-intake-receipt/v1" &&
      record.code === "source-acquisition-verified"
    ) {
      return { ...record, jobId: "evidence-forged" };
    }
    return record;
  }
}

function safeArtifacts(): CandidateArtifactsV1 {
  return {
    manifest: {
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
    },
    fixture: {
      apiVersion: "factory.candidate-fixture/v1",
      id: "safe-fixture",
      input: { message: "hello" },
      expectedOutput: { message: "hello" },
    },
    adapter: {
      apiVersion: "factory.candidate-adapter/v1",
      id: "safe-adapter",
      projection: { message: "message" },
      effects: ["candidate.project"],
    },
    conformancePlan: {
      apiVersion: "factory.candidate-conformance-plan/v1",
      cases: [
        { id: "accept-safe-fixture", expectation: "accept-fixture" },
        {
          id: "reject-unknown-field",
          expectation: "reject-input",
          input: { message: "hello", extra: "blocked" },
        },
      ],
    },
  };
}

function scannerResult(kind: ScanKindV1): NormalizedScanResultV1 {
  const report = bytes(
    canonicalJson({
      status: "pass",
      findings: [],
      ...(kind === "licence" ? { expression: "MIT" } : {}),
    }),
  );
  const sbom = bytes(
    canonicalJson({
      $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      components: [],
    }),
  );
  return {
    kind,
    ...PINNED_SCANNER_IDENTITIES[kind],
    status: "pass",
    findings: [],
    report,
    reportDigest: digestBytes(report),
    ...(kind === "licence" ? { scannerExpression: "MIT" } : {}),
    ...(kind === "dependency"
      ? {
          sbom: {
            format: "CycloneDX" as const,
            components: 0,
            report: sbom,
            reportDigest: digestBytes(sbom),
          },
        }
      : {}),
  };
}

async function acceptedProposal(
  store: ExternalIntakeStore,
  captureJob?: (job: IntakeJobV1) => void,
): Promise<CandidateProposalV1> {
  const content = bytes("export const safe = true;");
  const sourceDigest = digestBytes(content);
  const request: IntakeRequestV1 = {
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
  };
  const requestRef = store.putRecord("request", request);
  const treeDigest = canonicalTreeDigest([
    {
      path: "src/index.ts",
      mode: "100644",
      type: "blob",
      size: content.byteLength,
      blobDigest: sourceDigest,
    },
  ]);
  const archiveDigest = digestBytes(bytes("safe-archive"));
  const snapshot: SourceSnapshotV1 = {
    apiVersion: "factory.external-source-snapshot/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [requestRef.digest],
    repositoryUrl: request.source.canonicalRepositoryUrl,
    requestedRef: request.source.requestedRef,
    resolvedCommit: commit,
    retrievedAt: createdAt,
    archiveDigest,
    treeDigest,
    includedPaths: ["src/index.ts"],
    excludedPaths: [],
    originEvidence: [
      {
        url: `https://github.com/example/safe-adapter/archive/${commit}.tar.gz`,
        retrievedAt: createdAt,
        digest: archiveDigest,
      },
    ],
  };
  const snapshotRef = store.putRecord("snapshot", snapshot);
  const acquisition: ExternalSourceAcquisitionV1 = {
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
      archiveDigest,
      treeDigest,
      entryCount: 1,
      declaredBytes: content.byteLength,
    },
    licence: {
      primaryPaths: ["LICENSE"],
      textDigests: [digestBytes(bytes("MIT"))],
    },
    notices: [],
    provenance: snapshot.originEvidence,
    manualStatus: "unreviewed",
    acquisitionState: "acquired",
  };
  const acquisitionRef = store.putRecord("acquisition", acquisition);
  const job: IntakeJobV1 = {
    apiVersion: "factory.external-evidence-job/v1",
    id: "safe-adapter-source",
    createdAt,
    producerVersion: "0.1.0",
    snapshot: snapshotRef,
    acquisition: acquisitionRef,
    snapshotView: {
      snapshotDigest: snapshotRef.digest,
      treeDigest,
      files: [
        {
          path: "src/index.ts",
          mode: "100644",
          digest: sourceDigest,
          content,
        },
      ],
    },
  };
  const scanners: LocalScannerV1[] = (
    ["dependency", "secret", "licence", "sast"] as const
  ).map((kind) => ({
    kind,
    ...PINNED_SCANNER_IDENTITIES[kind],
    async scan() {
      return scannerResult(kind);
    },
  }));
  const inventory: ModuleInventoryAdapterV1 = {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    async inventory() {
      const report = bytes("safe-inventory-v1");
      return {
        ...PINNED_MODULE_INVENTORY_IDENTITY,
        status: "pass",
        report,
        reportDigest: digestBytes(report),
        modules: [
          {
            path: "src/index.ts",
            symbols: ["safe"],
            imports: [],
            exports: ["safe"],
            dependencies: [],
            size: content.byteLength,
            noticeMarker: false,
            generated: false,
            binary: false,
            sourceDigest,
            dynamicEvaluation: false,
            dynamicLoad: false,
            processAccess: false,
            filesystemAccess: false,
            networkAccess: false,
            parseStatus: "parsed",
          },
        ],
      };
    },
  };
  captureJob?.(job);
  const completedEvidence = await runEvidencePipeline(
    job,
    scanners,
    inventory,
    store,
  );
  return {
    apiVersion: "factory.candidate-proposal/v1",
    createdAt,
    producerVersion: "0.1.0",
    id: "safe-adapter",
    version: "1.0.0",
    snapshot: snapshotRef,
    acquisition: acquisitionRef,
    evidenceJob: job,
    completedEvidence,
    proposedFactoryKey: "candidate.safe-adapter",
    proposedClassification: "provider-adapter",
    selectedModules: [
      {
        path: "src/index.ts",
        symbol: "safe",
        digest: sourceDigest,
        purpose: "adapter-contract",
      },
    ],
    artifacts: safeArtifacts(),
  };
}

function persistedText(root: string): string {
  const output: string[] = [];
  const visit = (path: string): void => {
    if (!statSync(path).isDirectory()) {
      output.push(readFileSync(path, "utf8"));
      return;
    }
    for (const entry of readdirSync(path)) visit(join(path, entry));
  };
  visit(root);
  return output.join("\n");
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Candidate registry", () => {
  it("reuses the complete Task 3 verifier and rehydrates every completed checkpoint", async () => {
    const { root, store } = tempStore();
    let evidenceJob: IntakeJobV1 | undefined;
    const proposal = await acceptedProposal(store, (job) => {
      evidenceJob = job;
    });
    const summaryDigest =
      proposal.completedEvidence.scans.scans[0]!.summary.digest;
    const summaryPath = join(
      root,
      "blobs",
      "evidence",
      `${summaryDigest.slice(7)}.bin`,
    );
    rmSync(summaryPath);
    expect(existsSync(summaryPath)).toBe(false);

    const verified = await verifyCompletedEvidence(
      evidenceJob!,
      proposal.completedEvidence,
      store,
    );

    expect(verified.receipts).toHaveLength(7);
    expect(verified.evidence).toEqual(proposal.completedEvidence.evidence);
    expect(existsSync(summaryPath)).toBe(true);
  });

  it("requires the reserved Candidate identity namespace", async () => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);

    await expect(
      registry.create({
        ...proposal,
        proposedFactoryKey: "provider.safe-adapter",
        artifacts: {
          ...proposal.artifacts,
          manifest: {
            ...proposal.artifacts.manifest,
            proposedFactoryKey: "provider.safe-adapter",
          },
        },
      }),
    ).rejects.toThrow("candidate.");
  });

  it.each([
    "graph.mutate",
    "policy.write",
    "flow.transition",
    "publication.publish",
    "compiler.generate",
    "runtime.execute",
    "approval.grant",
    "promotion.promote",
  ])("rejects reserved mutation effect %s", async (effect) => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);

    await expect(
      registry.create({
        ...proposal,
        artifacts: {
          ...proposal.artifacts,
          manifest: { ...proposal.artifacts.manifest, effects: [effect] },
          adapter: { ...proposal.artifacts.adapter, effects: [effect] },
        },
      }),
    ).rejects.toThrow();
  });

  it("creates a quarantined Candidate from accepted evidence with declarative artifacts only", async () => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);

    const ref = await registry.create(proposal);
    const candidate = registry.get(ref.id, ref.version);

    expect(candidate.status).toBe("quarantined");
    expect(candidate.allowedOutputs).toEqual([
      "manifest",
      "fixture",
      "adapter",
      "conformance-plan",
    ]);
    expect(candidate.prohibited).toEqual([
      "capability-selection",
      "golden-registration",
      "graph-mutation",
      "compilation",
    ]);
    expect(candidate.sourceSnapshotDigest).toBe(proposal.snapshot.digest);
    expect(candidate.evidenceDigest).toBe(
      proposal.completedEvidence.evidence.digest,
    );
    expect(candidate).not.toHaveProperty("source");
    expect(candidate).not.toHaveProperty("outputSlots");
    await expect(registry.verify(ref)).resolves.toMatchObject({
      valid: true,
      issues: [],
    });
  });

  it.each([
    [
      "snapshot",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        snapshot: proposal.acquisition,
      }),
    ],
    [
      "evidence",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        completedEvidence: {
          ...proposal.completedEvidence,
          evidence: proposal.snapshot,
        },
      }),
    ],
    [
      "module digest",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        selectedModules: [
          {
            ...proposal.selectedModules[0]!,
            digest: digestBytes(bytes("different")),
          },
        ],
      }),
    ],
    [
      "producer version",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        producerVersion: "0.2.0",
      }),
    ],
    [
      "execution identity",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        completedEvidence: {
          ...proposal.completedEvidence,
          executionId: `evidence-${"f".repeat(24)}`,
        },
      }),
    ],
    [
      "receipt phase order",
      (proposal: CandidateProposalV1) => ({
        ...proposal,
        completedEvidence: {
          ...proposal.completedEvidence,
          receipts: [
            proposal.completedEvidence.receipts[1]!,
            proposal.completedEvidence.receipts[0]!,
            ...proposal.completedEvidence.receipts.slice(2),
          ],
        },
      }),
    ],
  ])("rejects Candidate %s linkage drift", async (_, mutate) => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);

    await expect(
      registry.create(mutate(proposal) as CandidateProposalV1),
    ).rejects.toThrow();
    expect(registry.list({})).toEqual([]);
  });

  it("records conformance-passed only through a validated immutable result", async () => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const initial = await registry.create(await acceptedProposal(store));
    const result = evaluateCandidateConformance(
      registry.getConformanceBundle(initial.id, initial.version),
    );
    expect(result.status).toBe("pass");
    await expect(
      registry.recordConformancePass(initial.id, initial.version, {
        ...result,
        candidateDigest: digestBytes(bytes("forged-candidate")),
      }),
    ).rejects.toThrow("current Candidate and artifacts");
    const passed = await registry.recordConformancePass(
      initial.id,
      initial.version,
      result,
    );

    expect(passed.status).toBe("conformance-passed");
    expect(registry.get(initial.id, initial.version).status).toBe(
      "conformance-passed",
    );
    await expect(registry.verify(passed)).resolves.toMatchObject({
      valid: true,
    });
    const fresh = new CandidateRegistry(store);
    expect(fresh.get(passed.lookupId, passed.version).status).toBe(
      "conformance-passed",
    );
    await expect(
      fresh.verify(fresh.getRef(passed.lookupId, passed.version)),
    ).resolves.toMatchObject({ valid: true, issues: [] });
    expect(
      (registry as unknown as { appendStatus?: unknown }).appendStatus,
    ).toBeUndefined();
  });

  it("fails closed when a conformance receipt is not bound to its result", async () => {
    const root = mkdtempSync(join(tmpdir(), "factory-candidate-test-"));
    roots.push(root);
    const store = new ForgingReceiptStore(root);
    const registry = new CandidateRegistry(store);
    const initial = await registry.create(await acceptedProposal(store));
    const result = evaluateCandidateConformance(
      registry.getConformanceBundle(initial.id, initial.version),
    );
    const passed = await registry.recordConformancePass(
      initial.id,
      initial.version,
      result,
    );
    store.forgeConformanceReceipt = true;

    await expect(registry.verify(passed)).resolves.toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        "Candidate conformance receipt is invalid.",
      ]),
    });
  });

  it("fails closed when the persisted conformance result is tampered", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const initial = await registry.create(await acceptedProposal(store));
    const result = evaluateCandidateConformance(
      registry.getConformanceBundle(initial.id, initial.version),
    );
    const passed = await registry.recordConformancePass(
      initial.id,
      initial.version,
      result,
    );
    const candidate = registry.get(passed.id, passed.version);
    const resultPath = join(
      root,
      "blobs",
      "evidence",
      `${candidate.conformanceResultDigest!.slice(7)}.bin`,
    );
    writeFileSync(resultPath, "tampered-conformance-result");

    await expect(registry.verify(passed)).resolves.toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        "Candidate conformance result is absent, conflicting, or digest-invalid.",
      ]),
    });
  });

  it("rejects source-fragment Candidates until licence compatibility is approved", async () => {
    const { store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);

    await expect(
      registry.create({
        ...proposal,
        proposedClassification: "source-fragment",
        selectedModules: proposal.selectedModules.map((module) => ({
          ...module,
          purpose: "proposed-copy" as const,
        })),
      }),
    ).rejects.toThrow("approved licence");
  });

  it("rejects secret-like fixture data before any Candidate artifact is persisted", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);
    const sentinel = `sk-proj-${"x".repeat(40)}`;

    await expect(
      registry.create({
        ...proposal,
        artifacts: {
          ...proposal.artifacts,
          fixture: {
            ...proposal.artifacts.fixture,
            input: { message: sentinel },
          },
        },
      }),
    ).rejects.toThrow("safe declarative data");
    expect(persistedText(root)).not.toContain(sentinel);
  });

  it("fails closed when an immutable Candidate artifact is tampered", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const ref = await registry.create(await acceptedProposal(store));
    const candidate = registry.get(ref.id, ref.version);
    const manifestPath = join(
      root,
      "blobs",
      "evidence",
      `${candidate.candidateManifestDigest.slice(7)}.bin`,
    );
    writeFileSync(manifestPath, "tampered-candidate-artifact");

    await expect(registry.verify(ref)).resolves.toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        "Candidate artifact is absent, conflicting, or digest-invalid.",
      ]),
    });
  });

  it("loads and verifies a prior Candidate through its receipt-addressed reference", async () => {
    const { store } = tempStore();
    const first = new CandidateRegistry(store);
    const ref = await first.create(await acceptedProposal(store));
    const fresh = new CandidateRegistry(store);

    expect(ref.lookupId).toMatch(/^candidate-[a-f0-9]{64}$/u);
    expect(fresh.get(ref.lookupId, ref.version)).toMatchObject({
      id: "safe-adapter",
      version: "1.0.0",
      status: "quarantined",
    });
    await expect(
      fresh.verify(fresh.getRef(ref.lookupId, ref.version)),
    ).resolves.toMatchObject({ valid: true, issues: [] });
  });

  it("rejects a receipt-addressed Candidate with mixed evidence executions", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const forged = new ForgingReceiptStore(root);
    forged.forgeEvidenceJob = true;

    expect(() =>
      new CandidateRegistry(forged).getRef(ref.lookupId, ref.version),
    ).toThrow("evidence attestation");
  });

  it("rehydrates accepted evidence during Candidate create and verify", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const proposal = await acceptedProposal(store);
    const summaryDigest =
      proposal.completedEvidence.scans.scans[0]!.summary.digest;
    const summaryPath = join(
      root,
      "blobs",
      "evidence",
      `${summaryDigest.slice(7)}.bin`,
    );
    rmSync(summaryPath);

    const ref = await registry.create(proposal);
    expect(existsSync(summaryPath)).toBe(true);
    rmSync(summaryPath);

    await expect(registry.verify(ref)).resolves.toMatchObject({ valid: true });
    expect(existsSync(summaryPath)).toBe(true);
  });

  it("enforces deterministic id@version uniqueness across registry instances", async () => {
    const { store } = tempStore();
    const proposal = await acceptedProposal(store);
    const first = await new CandidateRegistry(store).create(proposal);
    const replayed = await new CandidateRegistry(store).create(
      structuredClone(proposal),
    );

    expect(replayed).toEqual(first);
    await expect(
      new CandidateRegistry(store).create({
        ...structuredClone(proposal),
        proposedFactoryKey: "candidate.other-adapter",
        artifacts: {
          ...structuredClone(proposal.artifacts),
          manifest: {
            ...structuredClone(proposal.artifacts.manifest),
            proposedFactoryKey: "candidate.other-adapter",
          },
        },
      }),
    ).rejects.toThrow("Receipt sequence conflict");
  });
});
