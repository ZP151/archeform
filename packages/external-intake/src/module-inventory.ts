import { canonicalJson, digestBytes, type Sha256Digest } from "./canonical.js";
import {
  cloneReadonlySnapshotView,
  EvidencePipelineFailure,
  validateReadonlySnapshotView,
  type ReadonlySnapshotView,
} from "./scans.js";
import { assertSafeSourcePath, compareCanonicalPaths } from "./snapshot.js";
import { ExternalIntakeStore, type StoredBlobRef } from "./store.js";

export const PINNED_MODULE_INVENTORY_IDENTITY = {
  parser: "factory-typescript-module-locator",
  parserVersion: "1.0.0",
} as const;

export interface ModuleInventoryEntryV1 {
  readonly path: string;
  readonly symbols: readonly string[];
  readonly imports: readonly string[];
  readonly exports: readonly string[];
  readonly dependencies: readonly string[];
  readonly size: number;
  readonly noticeMarker: boolean;
  readonly generated: boolean;
  readonly binary: boolean;
  readonly sourceDigest: Sha256Digest;
  readonly dynamicEvaluation: boolean;
  readonly dynamicLoad: boolean;
  readonly processAccess: boolean;
  readonly filesystemAccess: boolean;
  readonly networkAccess: boolean;
  readonly parseStatus: "parsed" | "failed" | "unsupported";
}

export interface ModuleInventoryResultV1 {
  readonly parser: string;
  readonly parserVersion: string;
  readonly status: "pass" | "fail" | "unavailable";
  readonly report: Uint8Array;
  readonly reportDigest: Sha256Digest;
  readonly modules: readonly ModuleInventoryEntryV1[];
}

export interface ModuleInventoryAdapterV1 {
  readonly parser: string;
  readonly parserVersion: string;
  inventory(input: ReadonlySnapshotView): Promise<ModuleInventoryResultV1>;
}

export interface StoredModuleInventoryV1 {
  readonly parser: string;
  readonly parserVersion: string;
  readonly inventoryDigest: Sha256Digest;
  readonly modules: readonly ModuleInventoryEntryV1[];
  readonly inventory: StoredBlobRef;
  readonly rawReport: StoredBlobRef;
}

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const LOCATOR = /^[A-Za-z_$][A-Za-z0-9_$./@-]{0,255}$/u;
const PROHIBITED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "vendor",
  "vendors",
  "third_party",
  "third-party",
  "generated",
  "dist",
  "build",
]);
const BINARY_EXTENSIONS = new Set([
  ".bin",
  ".class",
  ".dll",
  ".dylib",
  ".exe",
  ".jar",
  ".o",
  ".so",
  ".wasm",
]);
const APPLICABLE_SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/u;

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

function normalizeStrings(input: unknown): readonly string[] {
  if (
    !Array.isArray(input) ||
    input.some((value) => typeof value !== "string" || !LOCATOR.test(value))
  ) {
    throw new EvidencePipelineFailure(
      "inventory-output-malformed",
      "Module locator metadata is malformed.",
    );
  }
  const unique = new Set(input as string[]);
  if (unique.size !== input.length) {
    throw new EvidencePipelineFailure(
      "inventory-output-malformed",
      "Module locator metadata must be unique.",
    );
  }
  return [...unique].sort(compareCanonicalPaths);
}

function assertAllowedModulePath(path: string): void {
  try {
    assertSafeSourcePath(path);
  } catch {
    throw new EvidencePipelineFailure(
      "prohibited-module-path",
      "Module inventory contains an unsafe path.",
    );
  }
  const lower = path.toLowerCase();
  const segments = lower.split("/");
  const basename = segments.at(-1) ?? "";
  const dot = basename.lastIndexOf(".");
  const extension = dot === -1 ? "" : basename.slice(dot);
  if (
    segments.some((segment) => PROHIBITED_SEGMENTS.has(segment)) ||
    BINARY_EXTENSIONS.has(extension) ||
    /(?:^|[._-])generated(?:[._-]|$)/u.test(basename) ||
    /\.min\.(?:js|css)$/u.test(lower)
  ) {
    throw new EvidencePipelineFailure(
      "prohibited-module-path",
      "Module inventory contains a prohibited path.",
    );
  }
}

function applicableInventoryPaths(
  snapshot: ReadonlySnapshotView,
): readonly string[] {
  return snapshot.files
    .filter(({ path }) => APPLICABLE_SOURCE_EXTENSION.test(path.toLowerCase()))
    .map(({ path }) => {
      assertAllowedModulePath(path);
      return path;
    })
    .sort(compareCanonicalPaths);
}

function normalizeModule(
  input: unknown,
  snapshot: ReadonlySnapshotView,
): ModuleInventoryEntryV1 {
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, [
      "path",
      "symbols",
      "imports",
      "exports",
      "dependencies",
      "size",
      "noticeMarker",
      "generated",
      "binary",
      "sourceDigest",
      "dynamicEvaluation",
      "dynamicLoad",
      "processAccess",
      "filesystemAccess",
      "networkAccess",
      "parseStatus",
    ]) ||
    typeof input.path !== "string" ||
    !Number.isSafeInteger(input.size) ||
    (input.size as number) < 0 ||
    !isDigest(input.sourceDigest) ||
    typeof input.noticeMarker !== "boolean" ||
    typeof input.generated !== "boolean" ||
    typeof input.binary !== "boolean" ||
    typeof input.dynamicEvaluation !== "boolean" ||
    typeof input.dynamicLoad !== "boolean" ||
    typeof input.processAccess !== "boolean" ||
    typeof input.filesystemAccess !== "boolean" ||
    typeof input.networkAccess !== "boolean" ||
    !["parsed", "failed", "unsupported"].includes(input.parseStatus as string)
  ) {
    throw new EvidencePipelineFailure(
      "inventory-output-malformed",
      "Module inventory output is malformed.",
    );
  }
  assertAllowedModulePath(input.path);
  const file = snapshot.files.find(({ path }) => path === input.path);
  if (file === undefined) {
    throw new EvidencePipelineFailure(
      "module-source-missing",
      "Module inventory path is absent from the immutable snapshot view.",
    );
  }
  if (
    file.digest !== input.sourceDigest ||
    file.content.byteLength !== input.size
  ) {
    throw new EvidencePipelineFailure(
      "module-source-drift",
      "Module inventory differs from immutable source evidence.",
    );
  }
  if (input.parseStatus !== "parsed") {
    throw new EvidencePipelineFailure(
      "parser-failure",
      "Module parsing failed or is unsupported.",
    );
  }
  for (const [flag, code] of [
    [input.dynamicEvaluation, "dynamic-evaluation"],
    [input.dynamicLoad, "dynamic-load"],
    [input.processAccess, "process-access"],
    [input.filesystemAccess, "filesystem-access"],
    [input.networkAccess, "network-access"],
    [input.generated, "generated-source"],
    [input.binary, "binary-source"],
  ] as const) {
    if (flag) {
      throw new EvidencePipelineFailure(
        code,
        "Module inventory contains prohibited source behavior.",
      );
    }
  }
  return {
    path: input.path,
    symbols: normalizeStrings(input.symbols),
    imports: normalizeStrings(input.imports),
    exports: normalizeStrings(input.exports),
    dependencies: normalizeStrings(input.dependencies),
    size: input.size as number,
    noticeMarker: input.noticeMarker,
    generated: input.generated,
    binary: input.binary,
    sourceDigest: input.sourceDigest,
    dynamicEvaluation: input.dynamicEvaluation,
    dynamicLoad: input.dynamicLoad,
    processAccess: input.processAccess,
    filesystemAccess: input.filesystemAccess,
    networkAccess: input.networkAccess,
    parseStatus: "parsed",
  };
}

function normalizeInventoryModules(
  snapshot: ReadonlySnapshotView,
  inputs: readonly unknown[],
): ModuleInventoryEntryV1[] {
  const modules = inputs.map((module) => normalizeModule(module, snapshot));
  const applicablePaths = applicableInventoryPaths(snapshot);
  const applicable = new Set(applicablePaths);
  const dispositionCounts = new Map<string, number>();
  for (const module of modules) {
    if (!applicable.has(module.path)) {
      throw new EvidencePipelineFailure(
        "inventory-file-not-applicable",
        "Module inventory contains a disposition outside the allow-list.",
      );
    }
    const count = (dispositionCounts.get(module.path) ?? 0) + 1;
    if (count > 1) {
      throw new EvidencePipelineFailure(
        "inventory-file-duplicate",
        "Applicable snapshot files require exactly one inventory disposition.",
      );
    }
    dispositionCounts.set(module.path, count);
  }
  for (const path of applicablePaths) {
    if (!dispositionCounts.has(path)) {
      throw new EvidencePipelineFailure(
        "inventory-file-missing",
        "An applicable snapshot file is missing its inventory disposition.",
      );
    }
  }
  modules.sort((left, right) => compareCanonicalPaths(left.path, right.path));
  return modules;
}

function normalizedInventoryBytes(
  snapshot: ReadonlySnapshotView,
  modules: readonly ModuleInventoryEntryV1[],
): Uint8Array {
  return new TextEncoder().encode(
    canonicalJson({
      apiVersion: "factory.external-module-inventory/v1",
      snapshotDigest: snapshot.snapshotDigest,
      treeDigest: snapshot.treeDigest,
      ...PINNED_MODULE_INVENTORY_IDENTITY,
      modules,
    }),
  );
}

function isEvidenceBlobRef(input: unknown): input is StoredBlobRef {
  return (
    isPlainObject(input) &&
    Object.keys(input).length === 2 &&
    input.kind === "evidence" &&
    isDigest(input.digest)
  );
}

export function validateStoredModuleInventory(
  snapshot: ReadonlySnapshotView,
  input: StoredModuleInventoryV1,
): StoredModuleInventoryV1 {
  validateReadonlySnapshotView(snapshot);
  if (
    !isPlainObject(input) ||
    !hasOnlyKeys(input, [
      "parser",
      "parserVersion",
      "inventoryDigest",
      "modules",
      "inventory",
      "rawReport",
    ]) ||
    Object.keys(input).length !== 6 ||
    !isDigest(input.inventoryDigest) ||
    !Array.isArray(input.modules) ||
    !isEvidenceBlobRef(input.inventory) ||
    input.inventory.digest !== input.inventoryDigest ||
    !isEvidenceBlobRef(input.rawReport)
  ) {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Module inventory resume checkpoint is malformed.",
    );
  }
  try {
    assertParserIdentity(input);
  } catch {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Module inventory resume identity differs from the code-owned pin.",
    );
  }
  let modules: ModuleInventoryEntryV1[];
  try {
    modules = normalizeInventoryModules(snapshot, input.modules);
  } catch {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Module inventory resume checkpoint is invalid.",
    );
  }
  if (
    canonicalJson(modules) !== canonicalJson(input.modules) ||
    digestBytes(normalizedInventoryBytes(snapshot, modules)) !==
      input.inventoryDigest
  ) {
    throw new EvidencePipelineFailure(
      "receipt-chain-invalid",
      "Module inventory resume checkpoint differs from its normalized digest.",
    );
  }
  return input;
}

function assertParserIdentity(
  input: Pick<ModuleInventoryAdapterV1, "parser" | "parserVersion">,
): void {
  if (
    input.parser !== PINNED_MODULE_INVENTORY_IDENTITY.parser ||
    input.parserVersion !== PINNED_MODULE_INVENTORY_IDENTITY.parserVersion
  ) {
    throw new EvidencePipelineFailure(
      "parser-identity-drift",
      "Parser identity differs from the code-owned pin.",
    );
  }
}

export async function runModuleInventory(
  snapshot: ReadonlySnapshotView,
  adapter: ModuleInventoryAdapterV1,
  store: ExternalIntakeStore,
): Promise<StoredModuleInventoryV1> {
  validateReadonlySnapshotView(snapshot);
  assertParserIdentity(adapter);
  let unknownResult: unknown;
  try {
    unknownResult = await adapter.inventory(
      cloneReadonlySnapshotView(snapshot),
    );
  } catch (error) {
    if (error instanceof EvidencePipelineFailure) {
      throw error;
    }
    throw new EvidencePipelineFailure(
      "parser-failure",
      "The pinned module parser failed.",
    );
  }
  if (
    !isPlainObject(unknownResult) ||
    !hasOnlyKeys(unknownResult, [
      "parser",
      "parserVersion",
      "status",
      "report",
      "reportDigest",
      "modules",
    ]) ||
    typeof unknownResult.parser !== "string" ||
    typeof unknownResult.parserVersion !== "string"
  ) {
    throw new EvidencePipelineFailure(
      "inventory-output-malformed",
      "Module inventory output is malformed.",
    );
  }
  assertParserIdentity(unknownResult as unknown as ModuleInventoryAdapterV1);
  if (
    !["pass", "fail", "unavailable"].includes(unknownResult.status as string) ||
    !(unknownResult.report instanceof Uint8Array) ||
    !isDigest(unknownResult.reportDigest) ||
    !Array.isArray(unknownResult.modules)
  ) {
    throw new EvidencePipelineFailure(
      "inventory-output-malformed",
      "Module inventory output is malformed.",
    );
  }
  if (digestBytes(unknownResult.report) !== unknownResult.reportDigest) {
    throw new EvidencePipelineFailure(
      "inventory-report-drift",
      "Inventory report bytes differ from their declared digest.",
    );
  }
  const rawReport = store.putBytes("evidence", unknownResult.report);
  if (rawReport.digest !== unknownResult.reportDigest) {
    throw new EvidencePipelineFailure(
      "inventory-report-drift",
      "Stored inventory report differs from its declared digest.",
    );
  }
  if (unknownResult.status === "unavailable") {
    throw new EvidencePipelineFailure(
      "parser-unavailable",
      "The pinned module parser is unavailable.",
      [rawReport.digest],
    );
  }
  if (unknownResult.status === "fail") {
    throw new EvidencePipelineFailure(
      "parser-failure",
      "The pinned module parser failed closed.",
      [rawReport.digest],
    );
  }
  let modules: ModuleInventoryEntryV1[];
  try {
    modules = normalizeInventoryModules(snapshot, unknownResult.modules);
  } catch (error) {
    if (error instanceof EvidencePipelineFailure) {
      throw new EvidencePipelineFailure(error.code, error.message, [
        rawReport.digest,
        ...error.recordDigests,
      ]);
    }
    throw error;
  }
  const normalizedInventory = normalizedInventoryBytes(snapshot, modules);
  const inventory = store.putBytes("evidence", normalizedInventory);
  return {
    ...PINNED_MODULE_INVENTORY_IDENTITY,
    inventoryDigest: inventory.digest,
    modules,
    inventory,
    rawReport,
  };
}
