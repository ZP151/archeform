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
  readonly resume?: EvidenceResumeV1;
}

export interface EvidenceResumeV1 {
  readonly executionId: string;
  readonly receipts: readonly StoredRecordRef[];
}

export interface CompletedEvidenceRefV1 {
  readonly executionId: string;
  readonly status: "evidenced";
  readonly evidence: StoredRecordRef;
  readonly scans: CompletedScanBundleV1;
  readonly inventory: StoredModuleInventoryV1;
  readonly receipts: readonly StoredRecordRef[];
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
const RECEIPT_PHASE_PREFIX = [
  { status: "requested", code: "evidence-request-accepted" },
  { status: "resolved", code: "source-reference-verified" },
  { status: "snapshotted", code: "source-snapshot-verified" },
  { status: "evidenced", code: "source-acquisition-verified" },
  { status: "scanned", code: "pinned-scans-complete" },
  { status: "inventoried", code: "module-inventory-complete" },
  { status: "evidenced", code: "evidence-bundle-stored" },
] as const;

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

function hasRequiredAndOptionalKeys(
  input: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const keys = Object.keys(input);
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => allowed.has(key))
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
    !hasRequiredAndOptionalKeys(
      input,
      [
        "apiVersion",
        "id",
        "createdAt",
        "producerVersion",
        "snapshot",
        "acquisition",
        "snapshotView",
      ],
      ["resume"],
    ) ||
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
  if (input.resume !== undefined) {
    validateResumeShape(input.resume);
  }
  return input;
}

function validateResumeShape(input: EvidenceResumeV1): void {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, ["executionId", "receipts"]) ||
    typeof input.executionId !== "string" ||
    !/^evidence-[a-f0-9]{24}$/u.test(input.executionId) ||
    !Array.isArray(input.receipts) ||
    input.receipts.length === 0 ||
    input.receipts.length > 7
  ) {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Evidence resume receipt chain is malformed.",
    );
  }
  const digests = new Set<string>();
  for (const unknownRef of input.receipts as readonly unknown[]) {
    if (
      !isPlainObject(unknownRef) ||
      !hasExactKeys(unknownRef, ["kind", "digest"]) ||
      unknownRef.kind !== "receipt" ||
      typeof unknownRef.digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/u.test(unknownRef.digest) ||
      digests.has(unknownRef.digest)
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Evidence resume receipt references are malformed.",
      );
    }
    digests.add(unknownRef.digest);
  }
}

function validateResumePrefix(
  job: IntakeJobV1,
  resume: EvidenceResumeV1,
  store: ExternalIntakeStore,
): void {
  let previous: StoredRecordRef | undefined;
  for (const [index, ref] of resume.receipts.entries()) {
    let unknownReceipt: ReturnType<ExternalIntakeStore["getRecord"]>;
    try {
      unknownReceipt = store.getRecord(ref);
    } catch {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Evidence resume receipt is absent or invalid.",
      );
    }
    if (
      unknownReceipt.apiVersion !== "factory.external-intake-receipt/v1" ||
      unknownReceipt.jobId !== resume.executionId ||
      unknownReceipt.sequence !== index + 1 ||
      !unknownReceipt.parentDigests.includes(job.snapshot.digest) ||
      !unknownReceipt.parentDigests.includes(job.acquisition.digest) ||
      (previous !== undefined &&
        !unknownReceipt.parentDigests.includes(previous.digest))
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Evidence resume receipt prefix is inconsistent.",
      );
    }
    const expectedPhase = RECEIPT_PHASE_PREFIX[index];
    const terminalBlock =
      unknownReceipt.status === "blocked" &&
      index > 0 &&
      index === resume.receipts.length - 1;
    if (
      expectedPhase === undefined ||
      (!terminalBlock &&
        (unknownReceipt.status !== expectedPhase.status ||
          unknownReceipt.code !== expectedPhase.code))
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Evidence resume receipt phases do not match the pipeline prefix.",
      );
    }
    try {
      const replayed = store.appendReceipt(resume.executionId, unknownReceipt);
      if (replayed.digest !== ref.digest) {
        throw new Error("Receipt replay digest differs.");
      }
    } catch {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Evidence resume receipt index is absent or invalid.",
      );
    }
    previous = ref;
  }
}

function executionId(job: IntakeJobV1, outcome: unknown): string {
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
        .map(({ path, mode, digest, content }) => ({
          path,
          mode,
          digest,
          size: content.byteLength,
        }))
        .sort((left, right) => compareCanonicalPaths(left.path, right.path)),
    },
    outcome,
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
    const expected: StoredRecordRef = {
      kind: "receipt",
      digest: canonicalRecordDigest(receipt),
    };
    try {
      const existing = this.store.getRecord(expected);
      if (
        existing.apiVersion !== "factory.external-intake-receipt/v1" ||
        existing.jobId !== this.id ||
        existing.sequence !== this.#sequence ||
        canonicalRecordDigest(existing) !== expected.digest
      ) {
        throw new Error("Existing receipt prefix is inconsistent.");
      }
    } catch {
      // The immutable store distinguishes an absent prefix from a tampered or
      // conflicting one when appendReceipt publishes or verifies its index.
    }
    this.#previous = this.store.appendReceipt(this.id, receipt);
    if (this.#previous.digest !== expected.digest) {
      throw new Error("Stored receipt differs from the expected prefix.");
    }
    return this.#previous;
  }
}

function scanFingerprint(scans: CompletedScanBundleV1): unknown {
  return {
    scans: scans.scans.map(
      ({
        kind,
        tool,
        toolVersion,
        rulesetDigest,
        resultDigest,
        status,
        findings,
        scannerExpression,
      }) => ({
        kind,
        tool,
        toolVersion,
        rulesetDigest,
        resultDigest,
        status,
        findings,
        ...(scannerExpression === undefined ? {} : { scannerExpression }),
      }),
    ),
    sbom: {
      format: scans.sbom.format,
      digest: scans.sbom.digest,
      components: scans.sbom.components,
    },
  };
}

function inventoryFingerprint(inventory: StoredModuleInventoryV1): unknown {
  return {
    parser: inventory.parser,
    parserVersion: inventory.parserVersion,
    inventoryDigest: inventory.inventoryDigest,
    modules: inventory.modules,
  };
}

function persistReceiptOutcome(input: {
  readonly job: IntakeJobV1;
  readonly id: string;
  readonly store: ExternalIntakeStore;
  readonly parentsLoaded: boolean;
  readonly scans?: CompletedScanBundleV1;
  readonly inventory?: StoredModuleInventoryV1;
  readonly evidence?: StoredRecordRef;
  readonly failure?: {
    readonly code: string;
    readonly recordDigests: readonly Sha256Digest[];
  };
}): readonly StoredRecordRef[] {
  const receipts = new ReceiptChain(input.job, input.id, input.store);
  const refs: StoredRecordRef[] = [];
  refs.push(receipts.append("requested", "evidence-request-accepted", []));
  if (input.parentsLoaded) {
    refs.push(
      receipts.append("resolved", "source-reference-verified", [
        recordDigest(input.job.snapshot),
        recordDigest(input.job.acquisition),
      ]),
    );
    refs.push(
      receipts.append("snapshotted", "source-snapshot-verified", [
        recordDigest(input.job.snapshot),
      ]),
    );
    refs.push(
      receipts.append("evidenced", "source-acquisition-verified", [
        recordDigest(input.job.acquisition),
      ]),
    );
  }
  if (input.scans !== undefined) {
    refs.push(
      receipts.append("scanned", "pinned-scans-complete", [
        ...input.scans.scans.map(({ resultDigest }) => resultDigest),
        input.scans.sbom.digest,
      ]),
    );
  }
  if (input.inventory !== undefined) {
    refs.push(
      receipts.append("inventoried", "module-inventory-complete", [
        input.inventory.inventoryDigest,
      ]),
    );
  }
  if (input.evidence !== undefined) {
    refs.push(
      receipts.append("evidenced", "evidence-bundle-stored", [
        input.evidence.digest,
      ]),
    );
  } else if (input.failure !== undefined) {
    refs.push(
      receipts.append(
        "blocked",
        input.failure.code,
        input.failure.recordDigests,
      ),
    );
  }
  return refs;
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
  if (job.resume !== undefined) {
    validateResumePrefix(job, job.resume, store);
  }
  let parentsLoaded = false;
  let scanBundle: CompletedScanBundleV1 | undefined;
  let inventory: StoredModuleInventoryV1 | undefined;

  try {
    validateReadonlySnapshotView(job.snapshotView);
    const parents = loadParents(job, store);
    parentsLoaded = true;

    scanBundle = await runPinnedLocalScans(job.snapshotView, scanners, store);

    inventory = await runModuleInventory(
      job.snapshotView,
      inventoryAdapter,
      store,
    );

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
    const id = executionId(job, {
      status: "evidenced",
      evidenceDigest: evidence.digest,
      scan: scanFingerprint(scanBundle),
      inventory: inventoryFingerprint(inventory),
    });
    const receipts = persistReceiptOutcome({
      job,
      id,
      store,
      parentsLoaded,
      scans: scanBundle,
      inventory,
      evidence,
    });
    return {
      executionId: id,
      status: "evidenced",
      evidence,
      scans: scanBundle,
      inventory,
      receipts,
    };
  } catch (error) {
    const code = failureCode(error);
    const recordDigests = failureRecordDigests(error);
    const id = executionId(job, {
      status: "blocked",
      code,
      recordDigests: [...recordDigests].sort(compareCanonicalPaths),
      ...(scanBundle === undefined
        ? {}
        : { scan: scanFingerprint(scanBundle) }),
      ...(inventory === undefined
        ? {}
        : { inventory: inventoryFingerprint(inventory) }),
    });
    persistReceiptOutcome({
      job,
      id,
      store,
      parentsLoaded,
      ...(scanBundle === undefined ? {} : { scans: scanBundle }),
      ...(inventory === undefined ? {} : { inventory }),
      failure: { code, recordDigests },
    });
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
