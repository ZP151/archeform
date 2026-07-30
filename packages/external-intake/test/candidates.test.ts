import { spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createExternalIntakeApi } from "../src/api.js";
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
import { parseIntakeReceipt } from "../src/contracts.js";
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
  fabricateCandidateChain = false;
  forgeConformanceReceipt = false;
  forgeEvidenceJob = false;
  truncateCandidateChain = false;

  override getRecord(
    ...args: Parameters<ExternalIntakeStore["getRecord"]>
  ): ReturnType<ExternalIntakeStore["getRecord"]> {
    const record = super.getRecord(...args);
    if (
      this.fabricateCandidateChain &&
      record.apiVersion === "factory.external-intake-receipt/v1" &&
      record.code === "candidate-quarantined"
    ) {
      return { ...record, jobId: "candidate-fabricated-chain" };
    }
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
    if (
      this.truncateCandidateChain &&
      record.apiVersion === "factory.external-intake-receipt/v1" &&
      record.code === "candidate-quarantined"
    ) {
      return { ...record, recordDigests: record.recordDigests.slice(0, -1) };
    }
    return record;
  }
}

function blobPath(
  root: string,
  kind: "snapshot" | "evidence",
  digest: string,
): string {
  return join(root, "blobs", kind, `${digest.slice("sha256:".length)}.bin`);
}

function recordPath(root: string, kind: string, digest: string): string {
  return join(root, "records", kind, `${digest.slice("sha256:".length)}.json`);
}

function verificationStatePath(
  root: string,
  store: ExternalIntakeStore,
  lookupId: string,
): string {
  const receipt = parseIntakeReceipt(
    store.getRecord({
      kind: "receipt",
      digest: `sha256:${lookupId.slice("candidate-".length)}`,
    }),
  );
  return blobPath(root, "evidence", receipt.recordDigests[1]!);
}

function lifecycleRecordCounts(root: string): {
  readonly candidates: number;
  readonly receipts: number;
} {
  return {
    candidates: readdirSync(join(root, "records", "candidate")).length,
    receipts: readdirSync(join(root, "records", "receipt")).length,
  };
}

function candidateReceiptSequences(root: string): readonly number[] {
  return readdirSync(join(root, "records", "receipt"))
    .map((entry) =>
      parseIntakeReceipt(
        JSON.parse(
          readFileSync(join(root, "records", "receipt", entry), "utf8"),
        ) as unknown,
      ),
    )
    .filter(({ code }) =>
      ["candidate-quarantined", "candidate-conformance-passed"].includes(code),
    )
    .map(({ sequence }) => sequence)
    .sort((left, right) => left - right);
}

function conformancePassedLookupId(root: string): string {
  const matches = readdirSync(join(root, "records", "receipt")).filter(
    (entry) => {
      const receipt = parseIntakeReceipt(
        JSON.parse(
          readFileSync(join(root, "records", "receipt", entry), "utf8"),
        ) as unknown,
      );
      return receipt.code === "candidate-conformance-passed";
    },
  );
  if (matches.length !== 1) {
    throw new Error("Expected exactly one Candidate conformance receipt.");
  }
  return `candidate-${matches[0]!.slice(0, -".json".length)}`;
}

async function waitForPath(path: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (!existsSync(path)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for child-process barrier '${path}'.`);
    }
    await delay(10);
  }
}

interface CandidateRaceProcess {
  readonly child: ReturnType<typeof spawn>;
  readonly completed: Promise<void>;
  readonly exited: Promise<void>;
}

function runCandidateRaceProcess(
  root: string,
  lookupId: string,
  version: string,
  workerId: string,
  readyPath: string,
  releasePath: string,
  resultPath: string,
): CandidateRaceProcess {
  const vitestCli = createRequire(import.meta.url).resolve("vitest/vitest.mjs");
  const testFile = fileURLToPath(import.meta.url);
  const child = spawn(
    process.execPath,
    [
      vitestCli,
      "run",
      testFile,
      "--testNamePattern",
      "executes one child-process Candidate conformance attempt",
    ],
    {
      cwd: dirname(dirname(testFile)),
      env: {
        ...process.env,
        FACTORY_CANDIDATE_RACE_CHILD: workerId,
        FACTORY_CANDIDATE_RACE_ROOT: root,
        FACTORY_CANDIDATE_RACE_LOOKUP_ID: lookupId,
        FACTORY_CANDIDATE_RACE_VERSION: version,
        FACTORY_CANDIDATE_RACE_READY_PATH: readyPath,
        FACTORY_CANDIDATE_RACE_RELEASE_PATH: releasePath,
        FACTORY_CANDIDATE_RACE_RESULT_PATH: resultPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const output: string[] = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => output.push(chunk));
  child.stderr.on("data", (chunk: string) => output.push(chunk));
  const exited = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `Candidate race child '${workerId}' exited ${String(code)}.\n${output.join("")}`,
          ),
        );
      }
    });
  });
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<void>((_, reject) => {
    deadline = setTimeout(
      () => reject(new Error(`Candidate race child '${workerId}' timed out.`)),
      20_000,
    );
  });
  const completed = Promise.race([exited, timedOut]).finally(() => {
    if (deadline !== undefined) clearTimeout(deadline);
  });
  return { child, completed, exited };
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
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const initial = await registry.create(await acceptedProposal(store));
    const result = evaluateCandidateConformance(
      await registry.getConformanceBundle(initial.id, initial.version),
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
    const fresh = new CandidateRegistry(store, root);
    await expect(
      fresh.verifyIdentity(passed.lookupId, passed.version),
    ).resolves.toMatchObject({ valid: true, issues: [] });
    expect(fresh.get(passed.lookupId, passed.version).status).toBe(
      "conformance-passed",
    );
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
      await registry.getConformanceBundle(initial.id, initial.version),
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
      await registry.getConformanceBundle(initial.id, initial.version),
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
    const { root, store } = tempStore();
    const first = new CandidateRegistry(store);
    const ref = await first.create(await acceptedProposal(store));
    const fresh = new CandidateRegistry(store, root);

    expect(ref.lookupId).toMatch(/^candidate-[a-f0-9]{64}$/u);
    await expect(
      fresh.verifyIdentity(ref.lookupId, ref.version),
    ).resolves.toMatchObject({ valid: true, issues: [] });
    expect(fresh.get(ref.lookupId, ref.version)).toMatchObject({
      id: "safe-adapter",
      version: "1.0.0",
      status: "quarantined",
    });
  });

  it("rejects a receipt-addressed Candidate with mixed evidence executions", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const forged = new ForgingReceiptStore(root);
    forged.forgeEvidenceJob = true;

    await expect(
      new CandidateRegistry(forged, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it("persists redacted strict state and rehydrates every fresh-process Task 3 checkpoint", async () => {
    const { root, store } = tempStore();
    const proposal = await acceptedProposal(store);
    const ref = await new CandidateRegistry(store).create(proposal);
    const statePath = verificationStatePath(root, store, ref.lookupId);
    const source = proposal.evidenceJob.snapshotView.files[0]!;
    const sourcePath = blobPath(root, "snapshot", source.digest);
    const summaryPath = blobPath(
      root,
      "evidence",
      proposal.completedEvidence.scans.scans[0]!.summary.digest,
    );

    expect(existsSync(statePath)).toBe(true);
    expect(existsSync(sourcePath)).toBe(true);
    expect(readFileSync(statePath, "utf8")).not.toContain(
      "export const safe = true;",
    );
    expect(readFileSync(sourcePath)).toEqual(Buffer.from(source.content));
    rmSync(summaryPath);

    await expect(
      new CandidateRegistry(store, root).verify(ref),
    ).resolves.toMatchObject({ valid: true, issues: [] });
    expect(existsSync(summaryPath)).toBe(true);
  });

  it.each(["snapshot", "acquisition"] as const)(
    "fails fresh verification when the immutable %s parent is missing",
    async (kind) => {
      const { root, store } = tempStore();
      const proposal = await acceptedProposal(store);
      const ref = await new CandidateRegistry(store).create(proposal);
      const parent =
        kind === "snapshot" ? proposal.snapshot : proposal.acquisition;
      rmSync(recordPath(root, kind, parent.digest));

      await expect(
        new CandidateRegistry(store, root).verify(ref),
      ).resolves.toMatchObject({ valid: false });
    },
  );

  it.each(["missing", "tampered"])(
    "fails fresh verification when a required source blob is %s",
    async (failure) => {
      const { root, store } = tempStore();
      const proposal = await acceptedProposal(store);
      const ref = await new CandidateRegistry(store).create(proposal);
      const sourcePath = blobPath(
        root,
        "snapshot",
        proposal.evidenceJob.snapshotView.files[0]!.digest,
      );
      if (failure === "missing") rmSync(sourcePath, { force: true });
      else {
        mkdirSync(dirname(sourcePath), { recursive: true });
        writeFileSync(sourcePath, "tampered-source");
      }

      await expect(
        new CandidateRegistry(store, root).verify(ref),
      ).resolves.toMatchObject({ valid: false });
    },
  );

  it("fails fresh verification when strict verification state is missing", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    rmSync(verificationStatePath(root, store, ref.lookupId), { force: true });

    await expect(
      new CandidateRegistry(store, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it("fails fresh verification when persisted snapshot metadata is missing", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const statePath = verificationStatePath(root, store, ref.lookupId);
    const state = JSON.parse(readFileSync(statePath, "utf8")) as {
      evidenceJob: { snapshotView: { files: Array<Record<string, unknown>> } };
    };
    delete state.evidenceJob.snapshotView.files[0]!.mode;
    writeFileSync(statePath, canonicalJson(state));

    await expect(
      new CandidateRegistry(store, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it("fails fresh verification when persisted evidence state truncates the accepted chain", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const statePath = verificationStatePath(root, store, ref.lookupId);
    expect(existsSync(statePath)).toBe(true);
    const state = JSON.parse(readFileSync(statePath, "utf8")) as {
      completedEvidence: { receipts: unknown[] };
    };
    state.completedEvidence.receipts = state.completedEvidence.receipts.slice(
      0,
      -1,
    );
    writeFileSync(statePath, canonicalJson(state));

    await expect(
      new CandidateRegistry(store, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it("fails fresh verification for a fabricated Candidate receipt chain", async () => {
    const { root, store } = tempStore();
    const ref = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const forged = new ForgingReceiptStore(root);
    forged.truncateCandidateChain = true;

    await expect(
      new CandidateRegistry(forged, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it.each(
    (["fabricated", "truncated"] as const).flatMap((corruption) =>
      (
        ["show", "list", "test", "conformance-bundle", "transition"] as const
      ).map((path) => [corruption, path] as const),
    ),
  )(
    "fails closed with zero lifecycle mutations for a %s Candidate receipt chain through %s",
    async (corruption, path) => {
      const { root, store } = tempStore();
      const registry = new CandidateRegistry(store);
      const ref = await registry.create(await acceptedProposal(store));
      const result = evaluateCandidateConformance(
        await registry.getConformanceBundle(ref.id, ref.version),
      );
      const forged = new ForgingReceiptStore(root);
      forged.fabricateCandidateChain = corruption === "fabricated";
      forged.truncateCandidateChain = corruption === "truncated";
      const before = lifecycleRecordCounts(root);

      if (path === "show") {
        await expect(
          createExternalIntakeApi(forged, root).candidateShow(
            ref.lookupId,
            ref.version,
          ),
        ).rejects.toThrow();
      } else if (path === "list") {
        const api = createExternalIntakeApi(forged, root);
        await expect(
          api.candidateVerify(ref.lookupId, ref.version),
        ).rejects.toThrow();
        expect(api.candidateList({})).toEqual([]);
      } else if (path === "test") {
        await expect(
          createExternalIntakeApi(forged, root).candidateTest(
            ref.lookupId,
            ref.version,
          ),
        ).rejects.toThrow();
      } else if (path === "conformance-bundle") {
        await expect(
          new CandidateRegistry(forged, root).getConformanceBundle(
            ref.lookupId,
            ref.version,
          ),
        ).rejects.toThrow();
      } else {
        await expect(
          new CandidateRegistry(forged, root).recordConformancePass(
            ref.lookupId,
            ref.version,
            result,
          ),
        ).rejects.toThrow();
      }

      expect(lifecycleRecordCounts(root)).toEqual(before);
    },
  );

  it("fails fresh verification when a Candidate artifact is tampered", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const ref = await registry.create(await acceptedProposal(store));
    const candidate = registry.get(ref.id, ref.version);
    writeFileSync(
      blobPath(root, "evidence", candidate.candidateManifestDigest),
      "tampered-candidate-artifact",
    );

    await expect(
      new CandidateRegistry(store, root).verify(ref),
    ).resolves.toMatchObject({ valid: false });
  });

  it("fails fresh verification when a conformance result is tampered", async () => {
    const { root, store } = tempStore();
    const registry = new CandidateRegistry(store);
    const initial = await registry.create(await acceptedProposal(store));
    const result = evaluateCandidateConformance(
      await registry.getConformanceBundle(initial.id, initial.version),
    );
    const passed = await registry.recordConformancePass(
      initial.id,
      initial.version,
      result,
    );
    writeFileSync(
      blobPath(
        root,
        "evidence",
        registry.get(passed.id, passed.version).conformanceResultDigest!,
      ),
      "tampered-conformance-result",
    );

    await expect(
      new CandidateRegistry(store, root).verify(passed),
    ).resolves.toMatchObject({ valid: false });
  });

  it.each([
    ["missing", "snapshot"],
    ["tampered", "snapshot"],
    ["missing", "acquisition"],
    ["tampered", "acquisition"],
    ["missing", "evidence"],
    ["tampered", "evidence"],
    ["missing", "artifact"],
    ["tampered", "artifact"],
  ] as const)(
    "blocks fresh Candidate test and lifecycle transition for %s %s bytes",
    async (failure, target) => {
      const { root, store } = tempStore();
      const registry = new CandidateRegistry(store);
      const proposal = await acceptedProposal(store);
      const ref = await registry.create(proposal);
      const result = evaluateCandidateConformance(
        await registry.getConformanceBundle(ref.id, ref.version),
      );
      const candidate = registry.get(ref.id, ref.version);
      const targetPath =
        target === "artifact"
          ? blobPath(root, "evidence", candidate.candidateManifestDigest)
          : recordPath(
              root,
              target,
              target === "snapshot"
                ? proposal.snapshot.digest
                : target === "acquisition"
                  ? proposal.acquisition.digest
                  : proposal.completedEvidence.evidence.digest,
            );
      if (failure === "missing") rmSync(targetPath, { force: true });
      else writeFileSync(targetPath, `tampered-${target}`);
      const before = lifecycleRecordCounts(root);
      const freshApi = createExternalIntakeApi(
        new ExternalIntakeStore(root),
        root,
      );

      await expect(
        freshApi.candidateShow(ref.lookupId, ref.version),
      ).rejects.toThrow("Candidate verification");
      await expect(
        freshApi.candidateTest(ref.lookupId, ref.version),
      ).rejects.toThrow("Candidate verification");
      expect(freshApi.candidateList({})).toEqual([]);
      expect(lifecycleRecordCounts(root)).toEqual(before);

      const freshRegistry = new CandidateRegistry(
        new ExternalIntakeStore(root),
        root,
      );
      await expect(
        freshRegistry.recordConformancePass(ref.lookupId, ref.version, result),
      ).rejects.toThrow("Candidate verification");
      expect(lifecycleRecordCounts(root)).toEqual(before);
    },
  );

  it.each(["missing", "tampered"] as const)(
    "blocks fresh Candidate test when persisted conformance bytes are %s",
    async (failure) => {
      const { root, store } = tempStore();
      const registry = new CandidateRegistry(store);
      const initial = await registry.create(await acceptedProposal(store));
      const result = evaluateCandidateConformance(
        await registry.getConformanceBundle(initial.id, initial.version),
      );
      const passed = await registry.recordConformancePass(
        initial.id,
        initial.version,
        result,
      );
      const candidate = registry.get(passed.id, passed.version);
      const resultPath = blobPath(
        root,
        "evidence",
        candidate.conformanceResultDigest!,
      );
      if (failure === "missing") rmSync(resultPath, { force: true });
      else writeFileSync(resultPath, "tampered-conformance-result");
      const before = lifecycleRecordCounts(root);
      const freshApi = createExternalIntakeApi(
        new ExternalIntakeStore(root),
        root,
      );

      await expect(
        freshApi.candidateShow(passed.lookupId, passed.version),
      ).rejects.toThrow("Candidate verification");
      await expect(
        freshApi.candidateTest(passed.lookupId, passed.version),
      ).rejects.toThrow("Candidate verification");
      expect(freshApi.candidateList({})).toEqual([]);
      expect(lifecycleRecordCounts(root)).toEqual(before);
    },
  );

  it("fully verifies a fresh Candidate before recording its conformance pass", async () => {
    const { root, store } = tempStore();
    const first = new CandidateRegistry(store);
    const ref = await first.create(await acceptedProposal(store));
    const before = lifecycleRecordCounts(root);
    const freshApi = createExternalIntakeApi(
      new ExternalIntakeStore(root),
      root,
    );

    await expect(
      freshApi.candidateTest(ref.lookupId, ref.version),
    ).resolves.toMatchObject({ status: "pass" });
    const shown = await freshApi.candidateShow(ref.lookupId, ref.version);
    expect(shown.status).toBe("conformance-passed");
    expect(freshApi.candidateList({})).toEqual([shown]);
    expect(lifecycleRecordCounts(root)).toEqual({
      candidates: before.candidates + 1,
      receipts: before.receipts + 1,
    });
  });

  it("converges overlapping fresh Candidate tests on one durable sequence-2 transition", async () => {
    const { root, store } = tempStore();
    const first = new CandidateRegistry(store);
    const ref = await first.create(await acceptedProposal(store));
    const before = lifecycleRecordCounts(root);
    const concurrentApi = createExternalIntakeApi(
      new ExternalIntakeStore(root),
      root,
    );

    const [left, right] = await Promise.all([
      concurrentApi.candidateTest(ref.lookupId, ref.version),
      concurrentApi.candidateTest(ref.lookupId, ref.version),
    ]);

    expect(right).toEqual(left);
    expect(lifecycleRecordCounts(root)).toEqual({
      candidates: before.candidates + 1,
      receipts: before.receipts + 1,
    });
    const transitioned = await concurrentApi.candidateShow(
      ref.lookupId,
      ref.version,
    );
    expect(transitioned.status).toBe("conformance-passed");

    const laterApi = createExternalIntakeApi(
      new ExternalIntakeStore(root),
      root,
    );
    await expect(
      laterApi.candidateShow(transitioned.lookupId, ref.version),
    ).resolves.toMatchObject({
      status: "conformance-passed",
      lookupId: transitioned.lookupId,
    });
    await expect(
      laterApi.candidateVerify(transitioned.lookupId, ref.version),
    ).resolves.toMatchObject({ valid: true, issues: [] });

    const beforeRetry = lifecycleRecordCounts(root);
    await expect(
      laterApi.candidateTest(transitioned.lookupId, ref.version),
    ).resolves.toEqual(left);
    expect(lifecycleRecordCounts(root)).toEqual(beforeRetry);
  });

  if (process.env.FACTORY_CANDIDATE_RACE_CHILD !== undefined) {
    it("executes one child-process Candidate conformance attempt", async () => {
      const readyPath = process.env.FACTORY_CANDIDATE_RACE_READY_PATH!;
      const releasePath = process.env.FACTORY_CANDIDATE_RACE_RELEASE_PATH!;
      const root = process.env.FACTORY_CANDIDATE_RACE_ROOT!;
      const registry = new CandidateRegistry(
        new ExternalIntakeStore(root),
        root,
      );
      const lookupId = process.env.FACTORY_CANDIDATE_RACE_LOOKUP_ID!;
      const version = process.env.FACTORY_CANDIDATE_RACE_VERSION!;
      const bundle = await registry.getConformanceBundle(lookupId, version);
      const preparedRef = registry.getRef(lookupId, version);
      expect(bundle.candidate.status).toBe("quarantined");
      expect(preparedRef.status).toBe("quarantined");
      const result = evaluateCandidateConformance(bundle);
      writeFileSync(
        readyPath,
        canonicalJson({
          candidateDigest: preparedRef.digest,
          status: preparedRef.status,
        }),
      );
      await waitForPath(releasePath);
      await registry.recordConformancePass(lookupId, version, result);
      writeFileSync(
        process.env.FACTORY_CANDIDATE_RACE_RESULT_PATH!,
        canonicalJson(result),
      );
    }, 30_000);
  }

  it("converges separate OS process Candidate conformance transitions on one durable sequence-2 transition", async () => {
    const { root, store } = tempStore();
    const initial = await new CandidateRegistry(store).create(
      await acceptedProposal(store),
    );
    const before = lifecycleRecordCounts(root);
    const raceRoot = join(root, "candidate-race");
    mkdirSync(raceRoot);
    const releasePath = join(raceRoot, "release");
    const readyPaths = [
      join(raceRoot, "left.ready"),
      join(raceRoot, "right.ready"),
    ];
    const resultPaths = [
      join(raceRoot, "left.result.json"),
      join(raceRoot, "right.result.json"),
    ];
    const workers = ["left", "right"].map((workerId, index) =>
      runCandidateRaceProcess(
        root,
        initial.lookupId,
        initial.version,
        workerId,
        readyPaths[index]!,
        releasePath,
        resultPaths[index]!,
      ),
    );
    const completed = Promise.all(workers.map((worker) => worker.completed));

    try {
      await Promise.race([
        Promise.all(readyPaths.map(waitForPath)),
        completed.then(() => {
          throw new Error("Candidate race children exited before the barrier.");
        }),
      ]);
      writeFileSync(releasePath, "go");
      await completed;
    } finally {
      for (const worker of workers) {
        if (
          worker.child.pid !== undefined &&
          worker.child.exitCode === null &&
          worker.child.signalCode === null
        ) {
          worker.child.kill();
        }
      }
      await Promise.allSettled(workers.map((worker) => worker.exited));
    }

    const readyStates = readyPaths.map(
      (path) =>
        JSON.parse(readFileSync(path, "utf8")) as {
          readonly candidateDigest: string;
          readonly status: string;
        },
    );
    expect(readyStates).toEqual([
      { candidateDigest: initial.digest, status: "quarantined" },
      { candidateDigest: initial.digest, status: "quarantined" },
    ]);
    const [left, right] = resultPaths.map(
      (path) => JSON.parse(readFileSync(path, "utf8")) as unknown,
    );
    expect(right).toEqual(left);
    expect(lifecycleRecordCounts(root)).toEqual({
      candidates: before.candidates + 1,
      receipts: before.receipts + 1,
    });
    expect(candidateReceiptSequences(root)).toEqual([1, 2]);

    const freshApi = createExternalIntakeApi(
      new ExternalIntakeStore(root),
      root,
    );
    const transitionedLookupId = conformancePassedLookupId(root);
    const shown = await freshApi.candidateShow(
      transitionedLookupId,
      initial.version,
    );
    expect(shown.status).toBe("conformance-passed");
    await expect(
      freshApi.candidateVerify(shown.lookupId, shown.version),
    ).resolves.toMatchObject({ valid: true, issues: [] });

    const beforeRetry = lifecycleRecordCounts(root);
    await expect(
      freshApi.candidateTest(shown.lookupId, shown.version),
    ).resolves.toEqual(left);
    expect(lifecycleRecordCounts(root)).toEqual(beforeRetry);
    expect(candidateReceiptSequences(root)).toEqual([1, 2]);
  }, 30_000);

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
