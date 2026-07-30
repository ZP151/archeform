import { canonicalJson, digestBytes, type Sha256Digest } from "./canonical.js";
import {
  assertSafeSourcePath,
  canonicalTreeDigest,
  compareCanonicalPaths,
} from "./snapshot.js";
import { ExternalIntakeStore, type StoredBlobRef } from "./store.js";

export const SCAN_KIND_ORDER = [
  "licence",
  "secret",
  "sast",
  "dependency",
] as const;

export type ScanKindV1 = (typeof SCAN_KIND_ORDER)[number];
export type FindingSeverityV1 = "info" | "low" | "medium" | "high" | "critical";

const encoder = new TextEncoder();

function rulesetDigest(name: string): Sha256Digest {
  return digestBytes(encoder.encode(`factory-external-intake:${name}:v1`));
}

export const PINNED_SCANNER_IDENTITIES = {
  licence: {
    tool: "factory-licence-scan",
    toolVersion: "1.0.0",
    rulesetDigest: rulesetDigest("licence"),
  },
  secret: {
    tool: "factory-secret-scan",
    toolVersion: "1.0.0",
    rulesetDigest: rulesetDigest("secret"),
  },
  sast: {
    tool: "factory-sast-scan",
    toolVersion: "1.0.0",
    rulesetDigest: rulesetDigest("sast"),
  },
  dependency: {
    tool: "factory-dependency-scan",
    toolVersion: "1.0.0",
    rulesetDigest: rulesetDigest("dependency"),
  },
} as const satisfies Record<
  ScanKindV1,
  {
    readonly tool: string;
    readonly toolVersion: string;
    readonly rulesetDigest: Sha256Digest;
  }
>;

export interface ReadonlySnapshotFileV1 {
  readonly path: string;
  readonly mode: "100644" | "100755";
  readonly digest: Sha256Digest;
  readonly content: Uint8Array;
}

export interface ReadonlySnapshotView {
  readonly snapshotDigest: Sha256Digest;
  readonly treeDigest: Sha256Digest;
  readonly files: readonly ReadonlySnapshotFileV1[];
}

export interface NormalizedFindingV1 {
  readonly code: string;
  readonly severity: FindingSeverityV1;
  readonly count: number;
}

export interface CycloneDxScanResultV1 {
  readonly format: "CycloneDX";
  readonly components: number;
  readonly report: Uint8Array;
  readonly reportDigest: Sha256Digest;
}

export interface NormalizedScanResultV1 {
  readonly kind: ScanKindV1;
  readonly tool: string;
  readonly toolVersion: string;
  readonly rulesetDigest: Sha256Digest;
  readonly status: "pass" | "fail" | "unavailable";
  readonly findings: readonly NormalizedFindingV1[];
  readonly report: Uint8Array;
  readonly reportDigest: Sha256Digest;
  readonly scannerExpression?: string;
  readonly sbom?: CycloneDxScanResultV1;
}

export interface LocalScannerV1 {
  readonly kind: ScanKindV1;
  readonly tool: string;
  readonly toolVersion: string;
  readonly rulesetDigest: Sha256Digest;
  scan(input: ReadonlySnapshotView): Promise<NormalizedScanResultV1>;
}

export interface StoredNormalizedScanV1 {
  readonly kind: ScanKindV1;
  readonly tool: string;
  readonly toolVersion: string;
  readonly rulesetDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
  readonly status: "pass" | "fail" | "unavailable";
  readonly findings: readonly NormalizedFindingV1[];
  readonly summary: StoredBlobRef;
  readonly scannerExpression?: string;
}

export interface StoredCycloneDxSbomV1 {
  readonly format: "CycloneDX";
  readonly digest: Sha256Digest;
  readonly components: number;
  readonly schema: typeof CYCLONEDX_SCHEMA;
  readonly specVersion: "1.6";
  readonly version: number;
  readonly componentIdentities: readonly CycloneDxComponentIdentityV1[];
  readonly rawReport: StoredBlobRef;
}

export interface CycloneDxComponentIdentityV1 {
  readonly type: string;
  readonly name: string;
  readonly version: string;
}

export interface ScanCheckpointV1 {
  readonly scans: readonly StoredNormalizedScanV1[];
  readonly sbom?: StoredCycloneDxSbomV1;
}

export interface CompletedScanBundleV1 {
  readonly scans: readonly StoredNormalizedScanV1[];
  readonly sbom: StoredCycloneDxSbomV1;
}

export class EvidencePipelineFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly recordDigests: readonly Sha256Digest[] = [],
    readonly scanCheckpoint?: ScanCheckpointV1,
  ) {
    super(message);
  }
}

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const STABLE_CODE = /^[a-z][a-z0-9-]{0,127}$/u;
const TOOL_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/u;
const MAX_REDACTED_REPORT_BYTES = 256 * 1024;
const MAX_SBOM_BYTES = 1024 * 1024;
const MAX_SBOM_COMPONENTS = 10_000;
const CYCLONEDX_SCHEMA = "http://cyclonedx.org/schema/bom-1.6.schema.json";
const CYCLONEDX_COMPONENT_TYPES = new Set([
  "application",
  "framework",
  "library",
  "container",
  "platform",
  "operating-system",
  "device",
  "device-driver",
  "firmware",
  "file",
  "machine-learning-model",
  "data",
  "cryptographic-asset",
]);
const SEVERITIES = new Set<FindingSeverityV1>([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(input);
  return (
    keys.length <= allowed.length && keys.every((key) => allowed.includes(key))
  );
}

function isDigest(input: unknown): input is Sha256Digest {
  return typeof input === "string" && SHA256.test(input);
}

export function validateReadonlySnapshotView(
  input: ReadonlySnapshotView,
): ReadonlySnapshotView {
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, ["snapshotDigest", "treeDigest", "files"]) ||
    !isDigest(input.snapshotDigest) ||
    !isDigest(input.treeDigest) ||
    !Array.isArray(input.files)
  ) {
    throw new EvidencePipelineFailure(
      "snapshot-evidence-malformed",
      "Snapshot evidence view is malformed.",
    );
  }

  const paths = new Set<string>();
  const canonicalEntries: Array<{
    readonly path: string;
    readonly mode: "100644" | "100755";
    readonly type: "blob";
    readonly size: number;
    readonly blobDigest: Sha256Digest;
  }> = [];
  for (const unknownFile of input.files as readonly unknown[]) {
    if (
      !isPlainObject(unknownFile) ||
      !hasOnlyKeys(unknownFile, ["path", "mode", "digest", "content"]) ||
      typeof unknownFile.path !== "string" ||
      (unknownFile.mode !== "100644" && unknownFile.mode !== "100755") ||
      !isDigest(unknownFile.digest) ||
      !(unknownFile.content instanceof Uint8Array)
    ) {
      throw new EvidencePipelineFailure(
        "snapshot-evidence-malformed",
        "Snapshot evidence file is malformed.",
      );
    }
    try {
      assertSafeSourcePath(unknownFile.path);
    } catch {
      throw new EvidencePipelineFailure(
        "snapshot-evidence-malformed",
        "Snapshot evidence path is unsafe.",
      );
    }
    if (paths.has(unknownFile.path)) {
      throw new EvidencePipelineFailure(
        "snapshot-evidence-malformed",
        "Snapshot evidence paths must be unique.",
      );
    }
    paths.add(unknownFile.path);
    if (digestBytes(unknownFile.content) !== unknownFile.digest) {
      throw new EvidencePipelineFailure(
        "snapshot-evidence-drift",
        "Snapshot evidence bytes differ from their immutable digest.",
      );
    }
    canonicalEntries.push({
      path: unknownFile.path,
      mode: unknownFile.mode,
      type: "blob",
      size: unknownFile.content.byteLength,
      blobDigest: unknownFile.digest,
    });
  }
  if (canonicalTreeDigest(canonicalEntries) !== input.treeDigest) {
    throw new EvidencePipelineFailure(
      "snapshot-evidence-drift",
      "Snapshot evidence bytes and modes do not reproduce the accepted tree digest.",
    );
  }
  return input;
}

export function cloneReadonlySnapshotView(
  input: ReadonlySnapshotView,
): ReadonlySnapshotView {
  validateReadonlySnapshotView(input);
  return {
    snapshotDigest: input.snapshotDigest,
    treeDigest: input.treeDigest,
    files: [...input.files]
      .sort((left, right) => compareCanonicalPaths(left.path, right.path))
      .map((file) => ({ ...file, content: new Uint8Array(file.content) })),
  };
}

function normalizeFindings(input: unknown): readonly NormalizedFindingV1[] {
  if (!Array.isArray(input)) {
    throw new EvidencePipelineFailure(
      "scan-output-malformed",
      "Scanner findings are malformed.",
    );
  }
  const totals = new Map<string, NormalizedFindingV1>();
  for (const unknownFinding of input) {
    if (
      !isPlainObject(unknownFinding) ||
      !hasOnlyKeys(unknownFinding, ["code", "severity", "count"]) ||
      typeof unknownFinding.code !== "string" ||
      !STABLE_CODE.test(unknownFinding.code) ||
      typeof unknownFinding.severity !== "string" ||
      !SEVERITIES.has(unknownFinding.severity as FindingSeverityV1) ||
      !Number.isSafeInteger(unknownFinding.count) ||
      (unknownFinding.count as number) <= 0
    ) {
      throw new EvidencePipelineFailure(
        "scan-output-malformed",
        "Scanner finding is malformed.",
      );
    }
    const severity = unknownFinding.severity as FindingSeverityV1;
    const key = `${unknownFinding.code}\0${severity}`;
    const prior = totals.get(key);
    const count = (prior?.count ?? 0) + (unknownFinding.count as number);
    if (!Number.isSafeInteger(count)) {
      throw new EvidencePipelineFailure(
        "scan-output-malformed",
        "Scanner finding count is not bounded.",
      );
    }
    totals.set(key, { code: unknownFinding.code, severity, count });
  }
  return [...totals.values()].sort((left, right) => {
    const codeOrder = compareCanonicalPaths(left.code, right.code);
    return codeOrder !== 0
      ? codeOrder
      : compareCanonicalPaths(left.severity, right.severity);
  });
}

function assertIdentity(
  kind: ScanKindV1,
  input: Pick<
    LocalScannerV1,
    "kind" | "tool" | "toolVersion" | "rulesetDigest"
  >,
): void {
  const pinned = PINNED_SCANNER_IDENTITIES[kind];
  if (
    input.kind !== kind ||
    input.tool !== pinned.tool ||
    input.toolVersion !== pinned.toolVersion ||
    input.rulesetDigest !== pinned.rulesetDigest ||
    !TOOL_VERSION.test(input.toolVersion)
  ) {
    throw new EvidencePipelineFailure(
      "scanner-identity-drift",
      "Scanner identity differs from the code-owned pin.",
    );
  }
}

function validateResultShape(
  kind: ScanKindV1,
  input: unknown,
): NormalizedScanResultV1 {
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, [
      "kind",
      "tool",
      "toolVersion",
      "rulesetDigest",
      "status",
      "findings",
      "report",
      "reportDigest",
      "scannerExpression",
      "sbom",
    ]) ||
    typeof input.kind !== "string" ||
    typeof input.tool !== "string" ||
    typeof input.toolVersion !== "string" ||
    !isDigest(input.rulesetDigest) ||
    !["pass", "fail", "unavailable"].includes(input.status as string) ||
    !(input.report instanceof Uint8Array) ||
    !isDigest(input.reportDigest)
  ) {
    throw new EvidencePipelineFailure(
      "scan-output-malformed",
      "Scanner output is malformed.",
    );
  }
  assertIdentity(kind, input as unknown as LocalScannerV1);
  if (
    input.scannerExpression !== undefined &&
    (kind !== "licence" ||
      typeof input.scannerExpression !== "string" ||
      input.scannerExpression.length === 0 ||
      input.scannerExpression.length > 256)
  ) {
    throw new EvidencePipelineFailure(
      "scan-output-malformed",
      "Scanner expression is malformed.",
    );
  }
  if ((kind === "dependency") !== (input.sbom !== undefined)) {
    throw new EvidencePipelineFailure(
      "scan-output-malformed",
      "Exactly the dependency scanner must provide the SBOM.",
    );
  }
  return {
    kind,
    tool: input.tool,
    toolVersion: input.toolVersion,
    rulesetDigest: input.rulesetDigest,
    status: input.status as NormalizedScanResultV1["status"],
    findings: normalizeFindings(input.findings),
    report: input.report,
    reportDigest: input.reportDigest,
    ...(input.scannerExpression === undefined
      ? {}
      : { scannerExpression: input.scannerExpression as string }),
    ...(input.sbom === undefined ? {} : { sbom: validateSbom(input.sbom) }),
  };
}

function validateSbom(input: unknown): CycloneDxScanResultV1 {
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, ["format", "components", "report", "reportDigest"]) ||
    input.format !== "CycloneDX" ||
    !Number.isSafeInteger(input.components) ||
    (input.components as number) < 0 ||
    !(input.report instanceof Uint8Array) ||
    !isDigest(input.reportDigest)
  ) {
    throw new EvidencePipelineFailure(
      "scan-output-malformed",
      "Dependency SBOM output is malformed.",
    );
  }
  if (digestBytes(input.report) !== input.reportDigest) {
    throw new EvidencePipelineFailure(
      "sbom-report-drift",
      "Dependency SBOM bytes differ from their declared digest.",
    );
  }
  const document = parseJsonBytes(
    input.report,
    "sbom-output-malformed",
    MAX_SBOM_BYTES,
  );
  if (
    !isPlainObject(document) ||
    !hasOnlyKeys(document, [
      "$schema",
      "bomFormat",
      "specVersion",
      "version",
      "components",
    ]) ||
    Object.keys(document).length !== 5 ||
    document.$schema !== CYCLONEDX_SCHEMA ||
    document.bomFormat !== "CycloneDX" ||
    document.specVersion !== "1.6" ||
    !Number.isSafeInteger(document.version) ||
    (document.version as number) <= 0 ||
    !Array.isArray(document.components) ||
    document.components.length > MAX_SBOM_COMPONENTS ||
    document.components.some((component) => !isCycloneDxComponent(component))
  ) {
    throw new EvidencePipelineFailure(
      "sbom-output-malformed",
      "Dependency SBOM does not match the bounded CycloneDX contract.",
    );
  }
  if (document.components.length !== input.components) {
    throw new EvidencePipelineFailure(
      "sbom-component-count-drift",
      "Declared SBOM component count differs from the validated document.",
    );
  }
  const normalizedReport = new TextEncoder().encode(canonicalJson(document));
  return {
    format: "CycloneDX",
    components: document.components.length,
    report: normalizedReport,
    reportDigest: digestBytes(normalizedReport),
  };
}

function parseJsonBytes(
  input: Uint8Array,
  code: string,
  maximumBytes = MAX_REDACTED_REPORT_BYTES,
): unknown {
  if (input.byteLength === 0 || input.byteLength > maximumBytes) {
    throw new EvidencePipelineFailure(code, "Report JSON is not bounded.");
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(input),
    ) as unknown;
  } catch {
    throw new EvidencePipelineFailure(code, "Report JSON is malformed.");
  }
}

function validateRedactedReport(result: NormalizedScanResultV1): void {
  if (digestBytes(result.report) !== result.reportDigest) {
    throw new EvidencePipelineFailure(
      "scan-report-drift",
      "Report bytes differ from their declared digest.",
    );
  }
  const report = parseJsonBytes(result.report, "scan-report-malformed");
  const expectedKeys =
    result.kind === "licence" && result.scannerExpression !== undefined
      ? ["status", "findings", "expression"]
      : ["status", "findings"];
  if (!isPlainObject(report) || !hasOnlyKeys(report, expectedKeys)) {
    throw new EvidencePipelineFailure(
      "scan-report-unsafe",
      "Scanner report contains fields outside the redacted contract.",
    );
  }
  if (
    Object.keys(report).length !== expectedKeys.length ||
    report.status !== result.status ||
    (result.kind === "licence" &&
      report.expression !== result.scannerExpression)
  ) {
    throw new EvidencePipelineFailure(
      "scan-report-drift",
      "Scanner report differs from normalized scanner output.",
    );
  }
  let reportFindings: readonly NormalizedFindingV1[];
  try {
    reportFindings = normalizeFindings(report.findings);
  } catch {
    throw new EvidencePipelineFailure(
      "scan-report-unsafe",
      "Scanner report findings are outside the redacted contract.",
    );
  }
  if (canonicalJson(reportFindings) !== canonicalJson(result.findings)) {
    throw new EvidencePipelineFailure(
      "scan-report-drift",
      "Scanner report findings differ from normalized scanner output.",
    );
  }
}

function storeVerifiedReport(
  store: ExternalIntakeStore,
  report: Uint8Array,
  declaredDigest: Sha256Digest,
  driftCode: string,
): StoredBlobRef {
  if (digestBytes(report) !== declaredDigest) {
    throw new EvidencePipelineFailure(
      driftCode,
      "Report bytes differ from their declared digest.",
    );
  }
  const ref = store.putBytes("evidence", report);
  if (ref.digest !== declaredDigest) {
    throw new EvidencePipelineFailure(
      driftCode,
      "Stored report differs from its declared digest.",
    );
  }
  return ref;
}

function safeScanSummary(
  snapshot: ReadonlySnapshotView,
  result: Pick<
    StoredNormalizedScanV1,
    | "kind"
    | "tool"
    | "toolVersion"
    | "rulesetDigest"
    | "status"
    | "findings"
    | "scannerExpression"
  >,
): unknown {
  return {
    apiVersion: "factory.external-scan-summary/v1",
    snapshotDigest: snapshot.snapshotDigest,
    treeDigest: snapshot.treeDigest,
    kind: result.kind,
    tool: result.tool,
    toolVersion: result.toolVersion,
    rulesetDigest: result.rulesetDigest,
    status: result.status,
    findings: result.findings,
    ...(result.scannerExpression === undefined
      ? {}
      : { scannerExpression: result.scannerExpression }),
  };
}

function storeSafeScanSummary(
  store: ExternalIntakeStore,
  snapshot: ReadonlySnapshotView,
  result: NormalizedScanResultV1,
): StoredBlobRef {
  validateRedactedReport(result);
  const summary = safeScanSummary(snapshot, result);
  const bytes = new TextEncoder().encode(canonicalJson(summary));
  const ref = store.putBytes("evidence", bytes);
  if (ref.digest !== digestBytes(bytes)) {
    throw new EvidencePipelineFailure(
      "scan-summary-drift",
      "Stored scanner summary differs from its canonical digest.",
    );
  }
  return ref;
}

function assertScanPasses(
  result: NormalizedScanResultV1,
  recordDigests: readonly Sha256Digest[],
): void {
  if (result.status === "unavailable") {
    throw new EvidencePipelineFailure(
      "scanner-unavailable",
      "A required scanner is unavailable.",
      recordDigests,
    );
  }
  if (result.kind === "secret" && result.findings.length > 0) {
    throw new EvidencePipelineFailure(
      "secret-finding",
      "A secret finding blocks the source item.",
      recordDigests,
    );
  }
  if (
    (result.kind === "sast" || result.kind === "dependency") &&
    result.findings.some(
      ({ severity }) => severity === "high" || severity === "critical",
    )
  ) {
    throw new EvidencePipelineFailure(
      `${result.kind}-high-finding`,
      "A high-severity finding blocks the source item.",
      recordDigests,
    );
  }
  if (result.status === "fail") {
    throw new EvidencePipelineFailure(
      `${result.kind}-scan-failed`,
      "A required scanner failed closed.",
      recordDigests,
    );
  }
}

function isEvidenceBlobRef(input: unknown): input is StoredBlobRef {
  return (
    isPlainObject(input) &&
    Object.keys(input).length === 2 &&
    input.kind === "evidence" &&
    isDigest(input.digest)
  );
}

function isCycloneDxComponent(
  input: unknown,
): input is CycloneDxComponentIdentityV1 {
  return (
    isPlainObject(input) &&
    Object.keys(input).length === 3 &&
    hasOnlyKeys(input, ["type", "name", "version"]) &&
    typeof input.type === "string" &&
    CYCLONEDX_COMPONENT_TYPES.has(input.type) &&
    typeof input.name === "string" &&
    input.name.length > 0 &&
    input.name.length <= 256 &&
    typeof input.version === "string" &&
    input.version.length > 0 &&
    input.version.length <= 128
  );
}

export function validateScanCheckpoint(
  snapshot: ReadonlySnapshotView,
  input: ScanCheckpointV1,
): ScanCheckpointV1 {
  validateReadonlySnapshotView(snapshot);
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, ["scans", "sbom"]) ||
    !Array.isArray(input.scans) ||
    input.scans.length > SCAN_KIND_ORDER.length
  ) {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Scan resume checkpoint is malformed.",
    );
  }
  const scans: StoredNormalizedScanV1[] = [];
  for (const [index, unknownScan] of input.scans.entries()) {
    const expectedKind = SCAN_KIND_ORDER[index];
    if (
      expectedKind === undefined ||
      !isPlainObject(unknownScan) ||
      !hasOnlyKeys(unknownScan, [
        "kind",
        "tool",
        "toolVersion",
        "rulesetDigest",
        "resultDigest",
        "status",
        "findings",
        "summary",
        "scannerExpression",
      ]) ||
      unknownScan.kind !== expectedKind ||
      unknownScan.status !== "pass" ||
      !isDigest(unknownScan.resultDigest) ||
      !isEvidenceBlobRef(unknownScan.summary) ||
      unknownScan.summary.digest !== unknownScan.resultDigest
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Scan resume checkpoint is malformed.",
      );
    }
    try {
      assertIdentity(expectedKind, unknownScan as unknown as LocalScannerV1);
    } catch {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Scan resume identity differs from the code-owned pin.",
      );
    }
    const findings = normalizeFindings(unknownScan.findings);
    if (canonicalJson(findings) !== canonicalJson(unknownScan.findings)) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Scan resume findings are not normalized.",
      );
    }
    const scan = unknownScan as unknown as StoredNormalizedScanV1;
    const expectedDigest = digestBytes(
      new TextEncoder().encode(canonicalJson(safeScanSummary(snapshot, scan))),
    );
    if (expectedDigest !== scan.resultDigest) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "Scan resume checkpoint differs from its bound summary.",
      );
    }
    scans.push(scan);
  }

  let sbom: StoredCycloneDxSbomV1 | undefined;
  if (input.sbom !== undefined) {
    const unknownSbom = input.sbom as unknown;
    if (
      scans.length !== SCAN_KIND_ORDER.length ||
      !isPlainObject(unknownSbom) ||
      !hasOnlyKeys(unknownSbom, [
        "format",
        "digest",
        "components",
        "schema",
        "specVersion",
        "version",
        "componentIdentities",
        "rawReport",
      ]) ||
      Object.keys(unknownSbom).length !== 8 ||
      unknownSbom.format !== "CycloneDX" ||
      !isDigest(unknownSbom.digest) ||
      unknownSbom.schema !== CYCLONEDX_SCHEMA ||
      unknownSbom.specVersion !== "1.6" ||
      !Number.isSafeInteger(unknownSbom.version) ||
      (unknownSbom.version as number) <= 0 ||
      !Number.isSafeInteger(unknownSbom.components) ||
      (unknownSbom.components as number) < 0 ||
      !Array.isArray(unknownSbom.componentIdentities) ||
      unknownSbom.componentIdentities.length !== unknownSbom.components ||
      unknownSbom.componentIdentities.length > MAX_SBOM_COMPONENTS ||
      unknownSbom.componentIdentities.some(
        (component) => !isCycloneDxComponent(component),
      ) ||
      !isEvidenceBlobRef(unknownSbom.rawReport) ||
      unknownSbom.rawReport.digest !== unknownSbom.digest
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "SBOM resume checkpoint is malformed.",
      );
    }
    const document = {
      $schema: CYCLONEDX_SCHEMA,
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      version: unknownSbom.version,
      components: unknownSbom.componentIdentities,
    };
    if (
      digestBytes(new TextEncoder().encode(canonicalJson(document))) !==
      unknownSbom.digest
    ) {
      throw new EvidencePipelineFailure(
        "receipt-chain-invalid",
        "SBOM resume checkpoint differs from its validated document.",
      );
    }
    sbom = unknownSbom as unknown as StoredCycloneDxSbomV1;
  } else if (scans.length === SCAN_KIND_ORDER.length) {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Completed scan resume checkpoint is missing its SBOM.",
    );
  }
  return { scans, ...(sbom === undefined ? {} : { sbom }) };
}

export async function runPinnedLocalScans(
  snapshot: ReadonlySnapshotView,
  scanners: readonly LocalScannerV1[],
  store: ExternalIntakeStore,
  checkpoint?: ScanCheckpointV1,
): Promise<CompletedScanBundleV1> {
  validateReadonlySnapshotView(snapshot);
  if (!Array.isArray(scanners) || scanners.length !== SCAN_KIND_ORDER.length) {
    throw new EvidencePipelineFailure(
      "scanner-set-invalid",
      "Exactly four pinned scanners are required.",
    );
  }
  const byKind = new Map<ScanKindV1, LocalScannerV1>();
  for (const scanner of scanners) {
    if (!SCAN_KIND_ORDER.includes(scanner.kind) || byKind.has(scanner.kind)) {
      throw new EvidencePipelineFailure(
        "scanner-set-invalid",
        "Scanner kinds must be complete and unique.",
      );
    }
    assertIdentity(scanner.kind, scanner);
    byKind.set(scanner.kind, scanner);
  }

  const resumed =
    checkpoint === undefined
      ? ({ scans: [] } satisfies ScanCheckpointV1)
      : validateScanCheckpoint(snapshot, checkpoint);
  const stored: StoredNormalizedScanV1[] = [...resumed.scans];
  let storedSbom: StoredCycloneDxSbomV1 | undefined = resumed.sbom;
  for (const kind of SCAN_KIND_ORDER.slice(stored.length)) {
    const scanner = byKind.get(kind);
    if (scanner === undefined) {
      throw new EvidencePipelineFailure(
        "scanner-set-invalid",
        "A required scanner kind is missing.",
      );
    }
    const priorReportDigests = uniqueReportDigests([
      ...stored.map(({ resultDigest }) => resultDigest),
      ...(storedSbom === undefined ? [] : [storedSbom.digest]),
    ]);
    const priorSbom = storedSbom;
    let output: unknown;
    try {
      output = await scanner.scan(cloneReadonlySnapshotView(snapshot));
    } catch (error) {
      if (error instanceof EvidencePipelineFailure) {
        throw new EvidencePipelineFailure(
          error.code,
          error.message,
          [...priorReportDigests, ...error.recordDigests],
          {
            scans: [...stored],
            ...(storedSbom === undefined ? {} : { sbom: storedSbom }),
          },
        );
      }
      throw new EvidencePipelineFailure(
        "scanner-failed",
        "A required scanner failed.",
        priorReportDigests,
        {
          scans: [...stored],
          ...(storedSbom === undefined ? {} : { sbom: storedSbom }),
        },
      );
    }
    try {
      const result = validateResultShape(kind, output);
      const summary = storeSafeScanSummary(store, snapshot, result);
      if (result.sbom !== undefined) {
        const rawSbom = storeVerifiedReport(
          store,
          result.sbom.report,
          result.sbom.reportDigest,
          "sbom-report-drift",
        );
        const document = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(result.sbom.report),
        ) as {
          readonly $schema: typeof CYCLONEDX_SCHEMA;
          readonly specVersion: "1.6";
          readonly version: number;
          readonly components: readonly CycloneDxComponentIdentityV1[];
        };
        storedSbom = {
          format: "CycloneDX",
          digest: rawSbom.digest,
          components: result.sbom.components,
          schema: document.$schema,
          specVersion: document.specVersion,
          version: document.version,
          componentIdentities: document.components,
          rawReport: rawSbom,
        };
      }
      assertScanPasses(
        result,
        uniqueReportDigests([
          ...stored.map(({ resultDigest }) => resultDigest),
          summary.digest,
          ...(storedSbom === undefined ? [] : [storedSbom.digest]),
        ]),
      );
      stored.push({
        kind,
        tool: result.tool,
        toolVersion: result.toolVersion,
        rulesetDigest: result.rulesetDigest,
        resultDigest: summary.digest,
        status: result.status,
        findings: result.findings,
        summary,
        ...(result.scannerExpression === undefined
          ? {}
          : { scannerExpression: result.scannerExpression }),
      });
    } catch (error) {
      if (
        error instanceof EvidencePipelineFailure &&
        error.scanCheckpoint === undefined
      ) {
        throw new EvidencePipelineFailure(
          error.code,
          error.message,
          uniqueReportDigests([...priorReportDigests, ...error.recordDigests]),
          {
            scans: [...stored],
            ...(priorSbom === undefined ? {} : { sbom: priorSbom }),
          },
        );
      }
      throw error;
    }
  }
  if (storedSbom === undefined) {
    throw new EvidencePipelineFailure(
      "sbom-missing",
      "The dependency scanner did not produce an SBOM.",
    );
  }
  return { scans: stored, sbom: storedSbom };
}

function uniqueReportDigests(
  values: readonly Sha256Digest[],
): readonly Sha256Digest[] {
  return [...new Set(values)];
}
