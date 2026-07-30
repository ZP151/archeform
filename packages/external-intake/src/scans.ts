import { digestBytes, type Sha256Digest } from "./canonical.js";
import { assertSafeSourcePath, compareCanonicalPaths } from "./snapshot.js";
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
  readonly rawReport: StoredBlobRef;
  readonly scannerExpression?: string;
}

export interface StoredCycloneDxSbomV1 {
  readonly format: "CycloneDX";
  readonly digest: Sha256Digest;
  readonly components: number;
  readonly rawReport: StoredBlobRef;
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
  ) {
    super(message);
  }
}

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const STABLE_CODE = /^[a-z][a-z0-9-]{0,127}$/u;
const TOOL_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/u;
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
  for (const unknownFile of input.files as readonly unknown[]) {
    if (
      !isPlainObject(unknownFile) ||
      !hasOnlyKeys(unknownFile, ["path", "digest", "content"]) ||
      typeof unknownFile.path !== "string" ||
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
  return {
    format: "CycloneDX",
    components: input.components as number,
    report: input.report,
    reportDigest: input.reportDigest,
  };
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

export async function runPinnedLocalScans(
  snapshot: ReadonlySnapshotView,
  scanners: readonly LocalScannerV1[],
  store: ExternalIntakeStore,
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

  const stored: StoredNormalizedScanV1[] = [];
  let storedSbom: StoredCycloneDxSbomV1 | undefined;
  for (const kind of SCAN_KIND_ORDER) {
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
    let output: unknown;
    try {
      output = await scanner.scan(cloneReadonlySnapshotView(snapshot));
    } catch (error) {
      if (error instanceof EvidencePipelineFailure) {
        throw new EvidencePipelineFailure(error.code, error.message, [
          ...priorReportDigests,
          ...error.recordDigests,
        ]);
      }
      throw new EvidencePipelineFailure(
        "scanner-failed",
        "A required scanner failed.",
        priorReportDigests,
      );
    }
    const result = validateResultShape(kind, output);
    const rawReport = storeVerifiedReport(
      store,
      result.report,
      result.reportDigest,
      "scan-report-drift",
    );
    if (result.sbom !== undefined) {
      const rawSbom = storeVerifiedReport(
        store,
        result.sbom.report,
        result.sbom.reportDigest,
        "sbom-report-drift",
      );
      storedSbom = {
        format: "CycloneDX",
        digest: rawSbom.digest,
        components: result.sbom.components,
        rawReport: rawSbom,
      };
    }
    assertScanPasses(
      result,
      uniqueReportDigests([
        ...stored.map(({ resultDigest }) => resultDigest),
        rawReport.digest,
        ...(storedSbom === undefined ? [] : [storedSbom.digest]),
      ]),
    );
    stored.push({
      kind,
      tool: result.tool,
      toolVersion: result.toolVersion,
      rulesetDigest: result.rulesetDigest,
      resultDigest: rawReport.digest,
      status: result.status,
      findings: result.findings,
      rawReport,
      ...(result.scannerExpression === undefined
        ? {}
        : { scannerExpression: result.scannerExpression }),
    });
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
