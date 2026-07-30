import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { digestBytes, type Sha256Digest } from "../src/canonical.js";
import type {
  ExternalSourceAcquisitionV1,
  IntakeReceiptV1,
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
import { canonicalTreeDigest } from "../src/snapshot.js";
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
  const mode = "100644" as const;
  const treeDigest = canonicalTreeDigest([
    {
      path: "src/index.ts",
      mode,
      type: "blob",
      size: content.byteLength,
      blobDigest: sourceDigest,
    },
  ]);
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
    files: [{ path: "src/index.ts", mode, digest: sourceDigest, content }],
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
  const report = bytes(
    JSON.stringify({
      status: "pass",
      findings: [],
      ...(kind === "licence" ? { expression: "MIT" } : {}),
    }),
  );
  const sbomReport = bytes(
    JSON.stringify({
      $schema: "http://cyclonedx.org/schema/bom-1.6.schema.json",
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: 1,
      components: [],
    }),
  );
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
            report: sbomReport,
            reportDigest: digestBytes(sbomReport),
          },
        }
      : {}),
  };
  const result = { ...base, ...overrides } as NormalizedScanResultV1;
  if (
    overrides.report === undefined &&
    (overrides.status !== undefined ||
      overrides.findings !== undefined ||
      overrides.scannerExpression !== undefined)
  ) {
    const normalizedReport = bytes(
      JSON.stringify({
        status: result.status,
        findings: result.findings,
        ...(kind === "licence" ? { expression: result.scannerExpression } : {}),
      }),
    );
    return {
      ...result,
      report: normalizedReport,
      reportDigest: digestBytes(normalizedReport),
    };
  }
  return result;
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

function persistedArtifactText(root: string): string {
  const texts: string[] = [];
  const visit = (path: string): void => {
    if (!existsSync(path)) {
      return;
    }
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path)) {
        visit(join(path, entry));
      }
      return;
    }
    texts.push(readFileSync(path, "utf8"));
  };
  visit(join(root, "blobs", "evidence"));
  visit(join(root, "records", "receipt"));
  return texts.join("\n");
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
    let scanCalls = 0;
    let inventoryCalls = 0;
    const countedScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        scanCalls += 1;
        return scanner.scan(input);
      },
    }));
    const baseInventory = inventory(job);
    const countedInventory: ModuleInventoryAdapterV1 = {
      ...baseInventory,
      async inventory(input) {
        inventoryCalls += 1;
        return baseInventory.inventory(input);
      },
    };

    const first = await runEvidencePipeline(
      job,
      countedScanners,
      countedInventory,
      store,
    );
    const resumed = await runEvidencePipeline(
      {
        ...structuredClone(job),
        resume: first.resume,
      },
      countedScanners,
      countedInventory,
      store,
    );

    expect(resumed).toEqual(first);
    expect(scanCalls).toBe(4);
    expect(inventoryCalls).toBe(1);
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

  it("creates a distinct immutable attempt when a failed source later succeeds", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "failure-recovery-source");

    await expect(
      runEvidencePipeline(
        job,
        scanners({
          secret: {
            status: "fail",
            findings: [{ code: "secret-token", severity: "high", count: 1 }],
          },
        }),
        inventory(job),
        store,
      ),
    ).rejects.toMatchObject({ code: "secret-finding" });
    const recovered = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    const attempts = new Set(
      (receiptRecords(root) as Array<{ jobId: string }>).map(
        ({ jobId }) => jobId,
      ),
    );

    expect(recovered.status).toBe("evidenced");
    expect(attempts.size).toBe(2);
  });

  it("resumes after a scanner failure without rerunning completed scanners", async () => {
    const { store } = tempStore();
    const job = createJob(store, "partial-scan-resume-source");
    const calls: Record<ScanKindV1, number> = {
      licence: 0,
      secret: 0,
      sast: 0,
      dependency: 0,
    };
    const firstScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        calls[scanner.kind] += 1;
        if (scanner.kind === "secret") {
          throw new Error("transient scanner failure");
        }
        return scanner.scan(input);
      },
    }));
    let resume: IntakeJobV1["resume"];

    try {
      await runEvidencePipeline(job, firstScanners, inventory(job), store);
    } catch (error) {
      expect(error).toMatchObject({ code: "scanner-failed" });
      resume = (error as { readonly resume?: IntakeJobV1["resume"] }).resume;
    }

    expect(resume).toBeDefined();
    const recoveryScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        calls[scanner.kind] += 1;
        return scanner.scan(input);
      },
    }));
    const recovered = await runEvidencePipeline(
      { ...job, resume: resume! },
      recoveryScanners,
      inventory(job),
      store,
    );
    expect(store.getRecord(recovered.receipts[0]!)).toMatchObject({
      parentDigests: expect.arrayContaining([resume!.receipts.at(-1)!.digest]),
    });
    expect(calls).toEqual({ licence: 1, secret: 2, sast: 1, dependency: 1 });
  });

  it("resumes after inventory failure without rerunning completed scanners", async () => {
    const { store } = tempStore();
    const job = createJob(store, "inventory-failure-resume-source");
    let scanCalls = 0;
    let inventoryCalls = 0;
    const countedScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        scanCalls += 1;
        return scanner.scan(input);
      },
    }));
    const failedInventory = inventory(job, { status: "fail", modules: [] });
    const firstInventory: ModuleInventoryAdapterV1 = {
      ...failedInventory,
      async inventory(input) {
        inventoryCalls += 1;
        return failedInventory.inventory(input);
      },
    };
    let resume: IntakeJobV1["resume"];

    try {
      await runEvidencePipeline(job, countedScanners, firstInventory, store);
    } catch (error) {
      expect(error).toMatchObject({ code: "parser-failure" });
      resume = (error as { readonly resume?: IntakeJobV1["resume"] }).resume;
    }

    expect(resume).toBeDefined();
    const safeInventory = inventory(job);
    const recoveryInventory: ModuleInventoryAdapterV1 = {
      ...safeInventory,
      async inventory(input) {
        inventoryCalls += 1;
        return safeInventory.inventory(input);
      },
    };
    await expect(
      runEvidencePipeline(
        { ...job, resume: resume! },
        countedScanners,
        recoveryInventory,
        store,
      ),
    ).resolves.toMatchObject({ status: "evidenced" });
    expect(scanCalls).toBe(4);
    expect(inventoryCalls).toBe(2);
  });

  it("creates a distinct evidence revision when a normalized report changes", async () => {
    const { store } = tempStore();
    const job = createJob(store, "report-revision-source");
    const first = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    const changedScanners = scanners({
      licence: {
        scannerExpression: "Apache-2.0",
      },
    });

    const changed = await runEvidencePipeline(
      job,
      changedScanners,
      inventory(job),
      store,
    );

    expect(changed.executionId).not.toBe(first.executionId);
    expect(changed.evidence.digest).not.toBe(first.evidence.digest);
  });

  it("binds EvidenceBundle identity to normalized inventory rather than opaque report bytes", async () => {
    const { store } = tempStore();
    const job = createJob(store, "inventory-revision-source");
    const baseInventory = inventory(job);
    const adapterResult = await baseInventory.inventory(job.snapshotView);
    const first = await runEvidencePipeline(
      job,
      scanners(),
      baseInventory,
      store,
    );
    const changed = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job, {
        report: adapterResult.report,
        reportDigest: adapterResult.reportDigest,
        modules: [{ ...adapterResult.modules[0]!, symbols: ["changedSymbol"] }],
      }),
      store,
    );

    expect(changed.inventory.inventoryDigest).not.toBe(
      first.inventory.inventoryDigest,
    );
    expect(changed.evidence.digest).not.toBe(first.evidence.digest);
  });

  it("keeps raw secret sentinels out of every persisted blob and receipt", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "raw-secret-sentinel-source");
    const sentinel = "FACTORY-JOB-RAW-SECRET-SENTINEL-a7c2";
    const report = bytes(
      JSON.stringify({
        status: "fail",
        findings: [{ code: "secret-token", severity: "high", count: 1 }],
        source: "src/index.ts",
        match: "token",
        value: sentinel,
      }),
    );
    const calls: Record<ScanKindV1, number> = {
      licence: 0,
      secret: 0,
      sast: 0,
      dependency: 0,
    };
    const unsafeScanners = scanners({
      secret: {
        status: "fail",
        findings: [{ code: "secret-token", severity: "high", count: 1 }],
        report,
        reportDigest: digestBytes(report),
      },
    }).map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        calls[scanner.kind] += 1;
        return scanner.scan(input);
      },
    }));
    let resume: IntakeJobV1["resume"];

    try {
      await runEvidencePipeline(job, unsafeScanners, inventory(job), store);
    } catch (error) {
      expect(error).toMatchObject({ code: "scan-report-unsafe" });
      resume = (error as { readonly resume?: IntakeJobV1["resume"] }).resume;
    }
    expect(persistedArtifactText(root)).not.toContain(sentinel);
    const recoveryScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        calls[scanner.kind] += 1;
        return scanner.scan(input);
      },
    }));
    await expect(
      runEvidencePipeline(
        { ...job, resume: resume! },
        recoveryScanners,
        inventory(job),
        store,
      ),
    ).resolves.toMatchObject({ status: "evidenced" });
    expect(calls).toEqual({ licence: 1, secret: 2, sast: 1, dependency: 1 });
  });

  it("keeps opaque inventory source and secret bytes out of persistence", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "inventory-report-sentinel-source");
    const sentinel = "FACTORY-INVENTORY-RAW-SOURCE-SECRET-71d9";
    const report = bytes(
      `source=export const credential = "${sentinel}"; match=${sentinel}`,
    );

    await expect(
      runEvidencePipeline(
        job,
        scanners(),
        inventory(job, { report, reportDigest: digestBytes(report) }),
        store,
      ),
    ).resolves.toMatchObject({ status: "evidenced" });
    expect(persistedArtifactText(root)).not.toContain(sentinel);
  });

  it("rejects resume when a referenced receipt prefix is missing", async () => {
    const { root, store } = tempStore();
    const job = createJob(store, "missing-resume-prefix");
    const first = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    const firstReceipt = first.receipts[0]!;
    rmSync(
      join(root, "records", "receipt", `${firstReceipt.digest.slice(7)}.json`),
    );

    await expect(
      runEvidencePipeline(
        {
          ...job,
          resume: first.resume,
        },
        scanners(),
        inventory(job),
        store,
      ),
    ).rejects.toMatchObject({ code: "receipt-chain-invalid" });
  });

  it.each([
    ["scanner identity", { toolVersion: "9.9.9" }],
    [
      "scanner ruleset",
      { rulesetDigest: `sha256:${"f".repeat(64)}` as Sha256Digest },
    ],
    [
      "normalized report binding",
      { findings: [{ code: "resume-drift", severity: "low", count: 1 }] },
    ],
  ] as const)(
    "rejects resume with drifted %s before invoking an adapter",
    async (_label, mutation) => {
      const { store } = tempStore();
      const job = createJob(store, "drifted-resume-checkpoint");
      const first = await runEvidencePipeline(
        job,
        scanners(),
        inventory(job),
        store,
      );
      let calls = 0;
      const countedScanners = scanners().map((scanner) => ({
        ...scanner,
        async scan(input: ReadonlySnapshotView) {
          calls += 1;
          return scanner.scan(input);
        },
      }));
      const scanCheckpoint = structuredClone(first.resume.scanCheckpoint!);
      const driftedCheckpoint = {
        ...scanCheckpoint,
        scans: [
          { ...scanCheckpoint.scans[0]!, ...mutation },
          ...scanCheckpoint.scans.slice(1),
        ],
      };

      await expect(
        runEvidencePipeline(
          {
            ...job,
            resume: { ...first.resume, scanCheckpoint: driftedCheckpoint },
          },
          countedScanners,
          inventory(job),
          store,
        ),
      ).rejects.toMatchObject({ code: "receipt-chain-invalid" });
      expect(calls).toBe(0);
    },
  );

  it("rejects a drifted parser resume checkpoint before invoking an adapter", async () => {
    const { store } = tempStore();
    const job = createJob(store, "drifted-parser-resume-checkpoint");
    const first = await runEvidencePipeline(
      job,
      scanners(),
      inventory(job),
      store,
    );
    let scanCalls = 0;
    let inventoryCalls = 0;
    const countedScanners = scanners().map((scanner) => ({
      ...scanner,
      async scan(input: ReadonlySnapshotView) {
        scanCalls += 1;
        return scanner.scan(input);
      },
    }));
    const baseInventory = inventory(job);
    const countedInventory: ModuleInventoryAdapterV1 = {
      ...baseInventory,
      async inventory(input) {
        inventoryCalls += 1;
        return baseInventory.inventory(input);
      },
    };

    await expect(
      runEvidencePipeline(
        {
          ...job,
          resume: {
            ...first.resume,
            inventory: { ...first.resume.inventory!, parserVersion: "9.9.9" },
          },
        },
        countedScanners,
        countedInventory,
        store,
      ),
    ).rejects.toMatchObject({ code: "receipt-chain-invalid" });
    expect(scanCalls).toBe(0);
    expect(inventoryCalls).toBe(0);
  });

  it("rejects a digest-valid receipt chain whose phases do not match the pipeline", async () => {
    const { store } = tempStore();
    const job = createJob(store, "wrong-resume-phase");
    const executionId = `evidence-${"f".repeat(24)}`;
    const wrongPhase: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt,
      producerVersion: "0.1.0",
      parentDigests: [job.snapshot.digest, job.acquisition.digest],
      jobId: executionId,
      sequence: 1,
      status: "resolved",
      code: "source-reference-verified",
      recordDigests: [job.snapshot.digest, job.acquisition.digest],
    };
    const wrongRef = store.appendReceipt(executionId, wrongPhase);

    await expect(
      runEvidencePipeline(
        {
          ...job,
          resume: { executionId, receipts: [wrongRef] },
        },
        scanners(),
        inventory(job),
        store,
      ),
    ).rejects.toMatchObject({ code: "receipt-chain-invalid" });
  });

  it("rejects a completed receipt whose terminal digest does not bind the recomputed evidence", async () => {
    const { store: sourceStore } = tempStore();
    const sourceJob = createJob(sourceStore, "forged-terminal-evidence");
    const first = await runEvidencePipeline(
      sourceJob,
      scanners(),
      inventory(sourceJob),
      sourceStore,
    );

    const { store } = tempStore();
    const job = createJob(store, "forged-terminal-evidence");
    const forgedReceipts: StoredRecordRef[] = [];
    for (const [index, ref] of first.receipts.entries()) {
      const original = sourceStore.getRecord(ref) as IntakeReceiptV1;
      const forged: IntakeReceiptV1 = {
        ...original,
        parentDigests: [
          ...(index === 0 ? [] : [forgedReceipts[index - 1]!.digest]),
          job.snapshot.digest,
          job.acquisition.digest,
        ],
        ...(index === first.receipts.length - 1
          ? { recordDigests: [job.snapshot.digest] }
          : {}),
      };
      forgedReceipts.push(store.appendReceipt(first.executionId, forged));
    }

    await expect(
      runEvidencePipeline(
        {
          ...job,
          resume: { ...first.resume, receipts: forgedReceipts },
        },
        scanners(),
        inventory(job),
        store,
      ),
    ).rejects.toMatchObject({ code: "receipt-chain-invalid" });
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
    const blocked = result.byId[secretJob.id]!;
    expect(blocked).toMatchObject({
      status: "blocked",
      failureCode: "secret-finding",
      resume: { scanCheckpoint: { scans: [{ kind: "licence" }] } },
    });
    const receipts = receiptRecords(root) as Array<Record<string, unknown>>;
    expect(receipts.some(({ status }) => status === "evidenced")).toBe(true);
    expect(
      receipts.some(
        ({ status, code }) => status === "blocked" && code === "secret-finding",
      ),
    ).toBe(true);
    const blockedDigests = receipts.find(
      ({ status, code }) => status === "blocked" && code === "secret-finding",
    )?.recordDigests as string[];
    expect(blockedDigests).toHaveLength(2);
    expect(blockedDigests).toContain(
      blocked.status === "blocked"
        ? blocked.resume!.scanCheckpoint!.scans[0]!.resultDigest
        : "unreachable",
    );
    expect(
      receipts.find(
        ({ status, code }) => status === "blocked" && code === "secret-finding",
      )?.recordDigests,
    ).not.toContain(scanResult("secret").reportDigest);
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

    let resume: IntakeJobV1["resume"];
    try {
      await runEvidencePipeline(job, failingScanners, inventory(job), store);
    } catch (error) {
      expect(error).toMatchObject({ code: "scanner-failed" });
      resume = (error as { readonly resume?: IntakeJobV1["resume"] }).resume;
    }
    const receipts = receiptRecords(root) as Array<Record<string, unknown>>;
    expect(
      receipts.find(
        ({ status, code }) => status === "blocked" && code === "scanner-failed",
      )?.recordDigests,
    ).toContain(resume!.scanCheckpoint!.scans[0]!.resultDigest);
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
