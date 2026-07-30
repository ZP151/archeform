import { canonicalRecordDigest, type Sha256Digest } from "./canonical.js";
import {
  parseEvidenceBundle,
  type EvidenceBundleV1,
  type ExternalSourceAcquisitionV1,
  type IntakeReceiptV1,
  type SourceSnapshotV1,
} from "./contracts.js";
import {
  PINNED_MODULE_INVENTORY_IDENTITY,
  runModuleInventory,
  type ModuleInventoryAdapterV1,
  type StoredModuleInventoryV1,
} from "./module-inventory.js";
import {
  EvidencePipelineFailure,
  PINNED_SCANNER_IDENTITIES,
  SCAN_KIND_ORDER,
  runPinnedLocalScans,
  validateReadonlySnapshotView,
  type CompletedScanBundleV1,
  type LocalScannerV1,
  type ReadonlySnapshotView,
} from "./scans.js";
import { compareCanonicalPaths } from "./snapshot.js";
import { ExternalIntakeStore, type StoredRecordRef } from "./store.js";

export interface IntakeJobV1 {
  readonly apiVersion: "factory.external-evidence-job/v1";
  readonly id: string;
  readonly createdAt: string;
  readonly producerVersion: string;
  readonly snapshot: StoredRecordRef;
  readonly acquisition: StoredRecordRef;
  readonly snapshotView: ReadonlySnapshotView;
}

export interface CompletedEvidenceRefV1 {
  readonly executionId: string;
  readonly status: "evidenced";
  readonly evidence: StoredRecordRef;
  readonly scans: CompletedScanBundleV1;
  readonly inventory: StoredModuleInventoryV1;
}

export type EvidenceBatchItemV1 =
  | CompletedEvidenceRefV1
  | { readonly status: "blocked"; readonly failureCode: string };

export interface EvidenceBatchResultV1 {
  readonly byId: Readonly<Record<string, EvidenceBatchItemV1>>;
}

type ReceiptStatus = IntakeReceiptV1["status"];

const OPAQUE_ID = /^[a-z][a-z0-9-]{0,127}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u;

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(input);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
}

function isCanonicalTimestamp(input: unknown): input is string {
  if (typeof input !== "string") {
    return false;
  }
  const timestamp = Date.parse(input);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === input
  );
}

function validateJob(input: IntakeJobV1): IntakeJobV1 {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, [
      "apiVersion",
      "id",
      "createdAt",
      "producerVersion",
      "snapshot",
      "acquisition",
      "snapshotView",
    ]) ||
    input.apiVersion !== "factory.external-evidence-job/v1" ||
    typeof input.id !== "string" ||
    !OPAQUE_ID.test(input.id) ||
    !isCanonicalTimestamp(input.createdAt) ||
    typeof input.producerVersion !== "string" ||
    !VERSION.test(input.producerVersion) ||
    !isPlainObject(input.snapshot) ||
    !isPlainObject(input.acquisition) ||
    typeof input.snapshot.digest !== "string" ||
    typeof input.acquisition.digest !== "string"
  ) {
    throw new EvidencePipelineFailure(
      "job-malformed",
      "Evidence job is malformed.",
    );
  }
  if (
    input.snapshot.kind !== "snapshot" ||
    input.acquisition.kind !== "acquisition"
  ) {
    throw new EvidencePipelineFailure(
      "job-parent-invalid",
      "Evidence job parent has the wrong record kind.",
    );
  }
  return input;
}

function executionId(job: IntakeJobV1): string {
  const digest = canonicalRecordDigest({
    jobId: job.id,
    snapshotDigest: job.snapshot.digest,
    acquisitionDigest: job.acquisition.digest,
    scanners: SCAN_KIND_ORDER.map((kind) => ({
      kind,
      ...PINNED_SCANNER_IDENTITIES[kind],
    })),
    inventory: PINNED_MODULE_INVENTORY_IDENTITY,
    snapshotView: {
      snapshotDigest: job.snapshotView.snapshotDigest,
      treeDigest: job.snapshotView.treeDigest,
      files: [...job.snapshotView.files]
        .map(({ path, digest, content }) => ({
          path,
          digest,
          size: content.byteLength,
        }))
        .sort((left, right) => compareCanonicalPaths(left.path, right.path)),
    },
  });
  return `evidence-${digest.slice(7, 31)}`;
}

function uniqueDigests(
  values: readonly Sha256Digest[],
): readonly Sha256Digest[] {
  return [...new Set(values)];
}

function failureCode(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    OPAQUE_ID.test(error.code)
  ) {
    return error.code;
  }
  return "evidence-pipeline-failed";
}

function failureRecordDigests(error: unknown): readonly Sha256Digest[] {
  if (error instanceof EvidencePipelineFailure) {
    return error.recordDigests;
  }
  return [];
}

function recordDigest(ref: StoredRecordRef): Sha256Digest {
  return ref.digest as Sha256Digest;
}

class ReceiptChain {
  #sequence = 0;
  #previous: StoredRecordRef | undefined;

  constructor(
    private readonly job: IntakeJobV1,
    private readonly id: string,
    private readonly store: ExternalIntakeStore,
  ) {}

  append(
    status: ReceiptStatus,
    code: string,
    records: readonly Sha256Digest[],
  ): StoredRecordRef {
    this.#sequence += 1;
    const parents = uniqueDigests([
      ...(this.#previous === undefined ? [] : [recordDigest(this.#previous)]),
      recordDigest(this.job.snapshot),
      recordDigest(this.job.acquisition),
    ]);
    const receipt: IntakeReceiptV1 = {
      apiVersion: "factory.external-intake-receipt/v1",
      createdAt: this.job.createdAt,
      producerVersion: this.job.producerVersion,
      parentDigests: [...parents],
      jobId: this.id,
      sequence: this.#sequence,
      status,
      code,
      recordDigests: [...uniqueDigests(records)],
    };
    this.#previous = this.store.appendReceipt(this.id, receipt);
    return this.#previous;
  }
}

function loadParents(
  job: IntakeJobV1,
  store: ExternalIntakeStore,
): {
  readonly snapshot: SourceSnapshotV1;
  readonly acquisition: ExternalSourceAcquisitionV1;
} {
  let snapshot: ReturnType<ExternalIntakeStore["getRecord"]>;
  let acquisition: ReturnType<ExternalIntakeStore["getRecord"]>;
  try {
    snapshot = store.getRecord(job.snapshot);
    acquisition = store.getRecord(job.acquisition);
  } catch {
    throw new EvidencePipelineFailure(
      "job-parent-invalid",
      "Evidence job parent is absent or invalid.",
    );
  }
  if (
    snapshot.apiVersion !== "factory.external-source-snapshot/v1" ||
    acquisition.apiVersion !== "factory.external-source-acquisition/v1"
  ) {
    throw new EvidencePipelineFailure(
      "job-parent-invalid",
      "Evidence job parent has the wrong record kind.",
    );
  }
  if (
    acquisition.acquisitionState !== "acquired" ||
    acquisition.snapshot.recordDigest !== job.snapshot.digest ||
    !acquisition.parentDigests.includes(job.snapshot.digest) ||
    snapshot.archiveDigest !== acquisition.snapshot.archiveDigest ||
    snapshot.treeDigest !== acquisition.snapshot.treeDigest
  ) {
    throw new EvidencePipelineFailure(
      "job-parent-drift",
      "Evidence job parents are not immutably linked.",
    );
  }
  const viewPaths = job.snapshotView.files
    .map(({ path }) => path)
    .sort(compareCanonicalPaths);
  const snapshotPaths = [...snapshot.includedPaths].sort(compareCanonicalPaths);
  if (
    job.snapshotView.snapshotDigest !== job.snapshot.digest ||
    job.snapshotView.treeDigest !== snapshot.treeDigest ||
    viewPaths.length !== snapshotPaths.length ||
    viewPaths.some((path, index) => path !== snapshotPaths[index])
  ) {
    throw new EvidencePipelineFailure(
      "snapshot-evidence-drift",
      "Snapshot evidence view differs from the accepted snapshot record.",
    );
  }
  return { snapshot, acquisition };
}

function evidenceRecord(
  job: IntakeJobV1,
  acquisitionRef: StoredRecordRef,
  acquisition: ExternalSourceAcquisitionV1,
  scans: CompletedScanBundleV1,
  inventory: StoredModuleInventoryV1,
): EvidenceBundleV1 {
  const licenceScan = scans.scans.find(({ kind }) => kind === "licence")!;
  const parents = uniqueDigests([
    recordDigest(job.snapshot),
    recordDigest(acquisitionRef),
    ...scans.scans.map(({ resultDigest }) => resultDigest),
    scans.sbom.digest,
    inventory.inventoryDigest,
  ]);
  return parseEvidenceBundle({
    apiVersion: "factory.external-evidence/v1",
    createdAt: job.createdAt,
    producerVersion: job.producerVersion,
    parentDigests: parents,
    snapshotDigest: job.snapshot.digest,
    licence: {
      primaryPaths: acquisition.licence.primaryPaths,
      textDigests: acquisition.licence.textDigests,
      ...(licenceScan.scannerExpression === undefined
        ? {}
        : { scannerExpression: licenceScan.scannerExpression }),
      manualStatus: acquisition.manualStatus,
    },
    notices: acquisition.notices,
    sbom: {
      format: "CycloneDX",
      digest: scans.sbom.digest,
      components: scans.sbom.components,
    },
    scans: scans.scans.map(
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
      parser: inventory.parser,
      parserVersion: inventory.parserVersion,
      inventoryDigest: inventory.inventoryDigest,
    },
  });
}

export async function runEvidencePipeline(
  input: IntakeJobV1,
  scanners: readonly LocalScannerV1[],
  inventoryAdapter: ModuleInventoryAdapterV1,
  store: ExternalIntakeStore,
): Promise<CompletedEvidenceRefV1> {
  const job = validateJob(input);
  const id = executionId(job);
  const receipts = new ReceiptChain(job, id, store);
  receipts.append("requested", "evidence-request-accepted", []);

  try {
    validateReadonlySnapshotView(job.snapshotView);
    const parents = loadParents(job, store);
    receipts.append("resolved", "source-reference-verified", [
      recordDigest(job.snapshot),
      recordDigest(job.acquisition),
    ]);
    receipts.append("snapshotted", "source-snapshot-verified", [
      recordDigest(job.snapshot),
    ]);
    receipts.append("evidenced", "source-acquisition-verified", [
      recordDigest(job.acquisition),
    ]);

    const scanBundle = await runPinnedLocalScans(
      job.snapshotView,
      scanners,
      store,
    );
    receipts.append("scanned", "pinned-scans-complete", [
      ...scanBundle.scans.map(({ resultDigest }) => resultDigest),
      scanBundle.sbom.digest,
    ]);

    const inventory = await runModuleInventory(
      job.snapshotView,
      inventoryAdapter,
      store,
    );
    receipts.append("inventoried", "module-inventory-complete", [
      inventory.inventoryDigest,
    ]);

    const evidence = store.putRecord(
      "evidence",
      evidenceRecord(
        job,
        job.acquisition,
        parents.acquisition,
        scanBundle,
        inventory,
      ),
    );
    receipts.append("evidenced", "evidence-bundle-stored", [evidence.digest]);
    return {
      executionId: id,
      status: "evidenced",
      evidence,
      scans: scanBundle,
      inventory,
    };
  } catch (error) {
    const code = failureCode(error);
    receipts.append("blocked", code, failureRecordDigests(error));
    if (error instanceof EvidencePipelineFailure) {
      throw error;
    }
    throw new EvidencePipelineFailure(code, "Evidence pipeline failed closed.");
  }
}

export async function runEvidenceBatch(
  jobs: readonly IntakeJobV1[],
  scannersFor: (job: IntakeJobV1) => readonly LocalScannerV1[],
  inventoryFor: (job: IntakeJobV1) => ModuleInventoryAdapterV1,
  store: ExternalIntakeStore,
): Promise<EvidenceBatchResultV1> {
  const byId: Record<string, EvidenceBatchItemV1> = Object.create(
    null,
  ) as Record<string, EvidenceBatchItemV1>;
  const seen = new Set<string>();
  for (const job of jobs) {
    if (seen.has(job.id)) {
      throw new EvidencePipelineFailure(
        "duplicate-job-id",
        "Batch source item IDs must be unique.",
      );
    }
    seen.add(job.id);
    try {
      byId[job.id] = await runEvidencePipeline(
        job,
        scannersFor(job),
        inventoryFor(job),
        store,
      );
    } catch (error) {
      byId[job.id] = { status: "blocked", failureCode: failureCode(error) };
    }
  }
  return { byId };
}
