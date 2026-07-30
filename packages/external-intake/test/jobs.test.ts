import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { digestBytes, type Sha256Digest } from "../src/canonical.js";
import type {
  ExternalSourceAcquisitionV1,
  IntakeRequestV1,
  SourceSnapshotV1,
} from "../src/contracts.js";
import {
  runEvidenceBatch,
  runEvidencePipeline,
  type IntakeJobV1,
} from "../src/jobs.js";
import {
  PINNED_MODULE_INVENTORY_IDENTITY,
  type ModuleInventoryAdapterV1,
  type ModuleInventoryResultV1,
} from "../src/module-inventory.js";
import {
  PINNED_SCANNER_IDENTITIES,
  type LocalScannerV1,
  type NormalizedScanResultV1,
  type ReadonlySnapshotView,
  type ScanKindV1,
} from "../src/scans.js";
import { ExternalIntakeStore, type StoredRecordRef } from "../src/store.js";

const roots: string[] = [];
const createdAt = "2026-07-31T03:00:00.000Z";
const commit = "a".repeat(40);

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function tempStore(): { root: string; store: ExternalIntakeStore } {
  const root = mkdtempSync(join(tmpdir(), "factory-evidence-job-test-"));
  roots.push(root);
  return { root, store: new ExternalIntakeStore(root) };
}

function createJob(
  store: ExternalIntakeStore,
  id: string,
  sourceText = "export const safe = true;",
): IntakeJobV1 {
  const request: IntakeRequestV1 = {
    apiVersion: "factory.external-intake-request/v1",
    createdAt,
    producerVersion: "0.1.0",
    parentDigests: [],
    source: {
      canonicalRepositoryUrl: `https://github.com/example/${id}.git`,
      requestedRef: "v1.0.0",
      expectedCommit: commit,
    },
    classification: "source-study",
    requestedModules: [{ path: "src/index.ts", symbol: "safe" }],
    allowNetworkRetrieval: true,
  };
  const requestRef = store.putRecord("request", request);
  const content = bytes(sourceText);
  const sourceDigest = digestBytes(content);
  const treeDigest = digestBytes(bytes(`tree:${sourceDigest}`));
  const archiveDigest = digestBytes(bytes(`archive:${sourceDigest}`));
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
        url: `https://github.com/example/${id}/archive/${commit}.tar.gz`,
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
  const view: ReadonlySnapshotView = {
    snapshotDigest: snapshotRef.digest,
    treeDigest,
    files: [{ path: "src/index.ts", digest: sourceDigest, content }],
  };
  return {
    apiVersion: "factory.external-evidence-job/v1",
    id,
    createdAt,
    producerVersion: "0.1.0",
    snapshot: snapshotRef,
    acquisition: acquisitionRef,
    snapshotView: view,
  };
}

function scanResult(
  kind: ScanKindV1,
  overrides: Partial<NormalizedScanResultV1> = {},
): NormalizedScanResultV1 {
  const report = bytes(`${kind}-report-v1`);
  const base: NormalizedScanResultV1 = {
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
            report: bytes("cyclonedx-sbom-v1"),
            reportDigest: digestBytes(bytes("cyclonedx-sbom-v1")),
          },
        }
      : {}),
  };
  return { ...base, ...overrides } as NormalizedScanResultV1;
}

function scanners(
  overrides: Partial<Record<ScanKindV1, Partial<NormalizedScanResultV1>>> = {},
): LocalScannerV1[] {
  return (["dependency", "secret", "licence", "sast"] as const).map((kind) => ({
    kind,
    ...PINNED_SCANNER_IDENTITIES[kind],
    async scan() {
      return scanResult(kind, overrides[kind]);
    },
  }));
}

function inventory(
  job: IntakeJobV1,
  overrides: Partial<ModuleInventoryResultV1> = {},
): ModuleInventoryAdapterV1 {
  const file = job.snapshotView.files[0]!;
  const report = bytes("inventory-report-v1");
  const base: ModuleInventoryResultV1 = {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    status: "pass",
    report,
    reportDigest: digestBytes(report),
    modules: [
      {
        path: file.path,
        symbols: ["safe"],
        imports: [],
        exports: ["safe"],
        dependencies: [],
        size: file.content.byteLength,
        noticeMarker: false,
        generated: false,
        binary: false,
        sourceDigest: file.digest,
        dynamicEvaluation: false,
        dynamicLoad: false,
        processAccess: false,
        filesystemAccess: false,
        networkAccess: false,
        parseStatus: "parsed",
      },
    ],
    ...overrides,
  };
  return {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    async inventory() {
      return base;
    },
  };
}

function receiptRecords(root: string): unknown[] {
  const records = join(root, "records", "receipt");
  if (!existsSync(records)) {
    return [];
  }
  return readdirSync(records)
    .sort()
    .map(
      (name) =>
        JSON.parse(readFileSync(join(records, name), "utf8")) as unknown,
    );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("evidence jobs", () => {
  it("creates the first truthful EvidenceBundle from accepted acquisition and pinned outputs", async () => {
    const { store } = tempStore();
    const job = createJob(store, "safe-source");

    const result = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    const evidence = store.getRecord(result.evidence);

    expect(result.status).toBe("evidenced");
    expect(evidence).toMatchObject({
      apiVersion: "factory.external-evidence/v1",
      snapshotDigest: job.snapshot.digest,
      licence: { manualStatus: "unreviewed", scannerExpression: "MIT" },
      sbom: { format: "CycloneDX", components: 0 },
      scans: [
        { kind: "licence", status: "pass" },
        { kind: "secret", status: "pass" },
        { kind: "sast", status: "pass" },
        { kind: "dependency", status: "pass" },
      ],
      ast: PINNED_MODULE_INVENTORY_IDENTITY,
    });
    expect(evidence).not.toHaveProperty("candidate");
  });

  it("reuses every immutable reference on an identical resume", async () => {
    const { store } = tempStore();
    const job = createJob(store, "resume-source");

    const first = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    const resumed = await runEvidencePipeline(
      structuredClone(job),
      scanners(),
      inventory(job),
      store,
    );

    expect(resumed).toEqual(first);
  });

  it("creates a new evidence revision when immutable parents change", async () => {
    const { store } = tempStore();
    const firstJob = createJob(
      store,
      "revision-source",
      "export const safe = 1;",
    );
    const changedJob = createJob(
      store,
      "revision-source",
      "export const safe = 2;",
    );

    const first = await runEvidencePipeline(
      firstJob,
      scanners(),
      inventory(firstJob),
      store,
    );
    const changed = await runEvidencePipeline(
      changedJob,
      scanners(),
      inventory(changedJob),
      store,
    );

    expect(changed.evidence.digest).not.toBe(first.evidence.digest);
    expect(changed.executionId).not.toBe(first.executionId);
  });

  it("blocks only the failed source item and preserves sibling receipts", async () => {
    const { root, store } = tempStore();
    const safeJob = createJob(store, "safe-batch-source");
    const secretJob = createJob(store, "secret-batch-source");

    const result = await runEvidenceBatch(
      [safeJob, secretJob],
      (job) =>
        job.id === secretJob.id
          ? scanners({
              secret: {
                status: "fail",
                findings: [
                  { code: "secret-token", severity: "high", count: 1 },
                ],
              },
            })
          : scanners(),
      (job) => inventory(job),
      store,
    );

    expect(result.byId[safeJob.id]).toMatchObject({ status: "evidenced" });
    expect(result.byId[secretJob.id]).toEqual({
      status: "blocked",
      failureCode: "secret-finding",
    });
    const receipts = receiptRecords(root) as Array<Record<string, unknown>>;
    expect(receipts.some(({ status }) => status === "evidenced")).toBe(true);
    expect(
      receipts.some(
        ({ status, code }) => status === "blocked" && code === "secret-finding",
      ),
    ).toBe(true);
    expect(
      receipts.find(
        ({ status, code }) => status === "blocked" && code === "secret-finding",
      )?.recordDigests,
    ).toEqual(
      expect.arrayContaining([
        scanResult("licence").reportDigest,
        scanResult("secret").reportDigest,
      ]),
    );
    expect(JSON.stringify(receipts)).not.toContain("actual-secret-value");
  });

  it.each([
    [
      "parser",
      {
        modules: [] as ModuleInventoryResultV1["modules"],
        status: "fail" as const,
      },
      "parser-failure",
    ],
    ["dynamic evaluation", undefined, "dynamic-evaluation"],
  ])(
    "preserves a redacted blocked receipt for %s failure",
    async (_label, override, code) => {
      const { root, store } = tempStore();
      const job = createJob(store, `blocked-${code}`);
      const file = job.snapshotView.files[0]!;
      const adapter =
        override !== undefined
          ? inventory(job, override)
          : inventory(job, {
              modules: [
                {
                  path: file.path,
                  symbols: [],
                  imports: [],
                  exports: [],
                  dependencies: [],
                  size: file.content.byteLength,
                  noticeMarker: false,
                  generated: false,
                  binary: false,
                  sourceDigest: file.digest,
                  dynamicEvaluation: true,
                  dynamicLoad: false,
                  processAccess: false,
                  filesystemAccess: false,
                  networkAccess: false,
                  parseStatus: "parsed",
                },
              ],
            });

      await expect(
        runEvidencePipeline(job, scanners(), adapter, store),
      ).rejects.toMatchObject({ code });
      expect(receiptRecords(root)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "blocked", code }),
        ]),
      );
    },
  );

  it("retains completed report references when a later scanner throws", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "scanner-failure-source");
    const failingScanners = scanners().map((scanner) =>
      scanner.kind === "secret"
        ? {
            ...scanner,
            async scan(): Promise<NormalizedScanResultV1> {
              throw new Error("adapter failed");
            },
          }
        : scanner,
    );

    await expect(
      runEvidencePipeline(job, failingScanners, inventory(job), store),
    ).rejects.toMatchObject({ code: "scanner-failed" });
    const receipts = receiptRecords(root) as Array<Record<string, unknown>>;
    expect(
      receipts.find(
        ({ status, code }) => status === "blocked" && code === "scanner-failed",
      )?.recordDigests,
    ).toContain(scanResult("licence").reportDigest);
  });

  it("fails closed when a persisted parent or snapshot view drifts", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "drift-source");
    const drifted: IntakeJobV1 = {
      ...job,
      snapshotView: {
        ...job.snapshotView,
        treeDigest: `sha256:${"f".repeat(64)}` as Sha256Digest,
      },
    };

    await expect(
      runEvidencePipeline(drifted, scanners(), inventory(job), store),
    ).rejects.toMatchObject({ code: "snapshot-evidence-drift" });
    expect(receiptRecords(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "blocked",
          code: "snapshot-evidence-drift",
        }),
      ]),
    );

    await expect(
      runEvidencePipeline(job, scanners(), inventory(job), store),
    ).resolves.toMatchObject({ status: "evidenced" });
  });

  it("rejects executable, argument, ruleset, and URL fields in job data", async () => {
    const { store } = tempStore();
    const job = createJob(store, "unsafe-job");

    await expect(
      runEvidencePipeline(
        { ...job, executable: "scanner", args: ["--unsafe"] } as never,
        scanners(),
        inventory(job),
        store,
      ),
    ).rejects.toMatchObject({ code: "job-malformed" });
  });

  it("rejects wrong-kind parent references", async () => {
    const { store } = tempStore();
    const job = createJob(store, "wrong-parent-kind");
    const altered = {
      ...job,
      snapshot: { ...job.snapshot, kind: "evidence" },
    } as IntakeJobV1;

    await expect(
      runEvidencePipeline(altered, scanners(), inventory(job), store),
    ).rejects.toMatchObject({ code: "job-parent-invalid" });
  });
});
