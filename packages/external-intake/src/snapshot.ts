import {
  canonicalRecordDigest,
  digestBytes,
  type Sha256Digest,
} from "./canonical.js";
import {
  parseSourceSnapshot,
  type IntakeRequestV1,
  type SourceSnapshotV1,
} from "./contracts.js";
import type {
  ResolvedSourceReferenceV1,
  SourceTreeEntryV1,
} from "./source-client.js";

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const VENDOR_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "vendor",
  "vendors",
  "third_party",
  "third-party",
]);
const GENERATED_SEGMENTS = new Set(["generated", "dist", "build"]);
const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".a",
  ".avi",
  ".bin",
  ".bmp",
  ".class",
  ".dll",
  ".dylib",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".o",
  ".pdf",
  ".png",
  ".rar",
  ".so",
  ".tar",
  ".tgz",
  ".ttf",
  ".war",
  ".wasm",
  ".webp",
  ".woff",
  ".woff2",
  ".xz",
  ".zip",
  ".zst",
]);

export interface SnapshotLimits {
  readonly maxEntries: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
}

export const DEFAULT_SNAPSHOT_LIMITS: SnapshotLimits = {
  maxEntries: 50_000,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 250 * 1024 * 1024,
};

export interface ValidatedSourceTreeV1 {
  readonly entries: readonly SourceTreeEntryV1[];
  readonly blobEntries: readonly Extract<
    SourceTreeEntryV1,
    { readonly type: "blob" }
  >[];
  readonly treeDigest: Sha256Digest;
  readonly totalBytes: number;
}

function safeIntegerLimit(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer.`);
  }
  return value;
}

export function assertSafeSourcePath(path: string): void {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.length > 512 ||
    path !== path.normalize("NFC") ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0")
  ) {
    throw new Error("Source tree contains an unsafe relative path.");
  }
  const segments = path.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        /[<>:"|?*\u0000-\u001f]/u.test(segment) ||
        WINDOWS_RESERVED.test(segment) ||
        /[. ]$/u.test(segment),
    )
  ) {
    throw new Error("Source tree contains an unsafe path segment.");
  }
}

function assertAllowedSnapshotPath(path: string): void {
  const lower = path.toLowerCase();
  const segments = lower.split("/");
  if (segments.some((segment) => VENDOR_SEGMENTS.has(segment))) {
    throw new Error("Source tree contains a prohibited vendor path.");
  }
  if (
    segments.some((segment) => GENERATED_SEGMENTS.has(segment)) ||
    /(?:^|[._-])generated(?:[._-]|$)/u.test(segments.at(-1) ?? "") ||
    /\.min\.(?:js|css)$/u.test(lower)
  ) {
    throw new Error("Source tree contains prohibited generated content.");
  }
  const basename = segments.at(-1) ?? "";
  const dot = basename.lastIndexOf(".");
  const extension = dot === -1 ? "" : basename.slice(dot);
  if (BINARY_EXTENSIONS.has(extension)) {
    const archive = new Set([
      ".7z",
      ".gz",
      ".jar",
      ".rar",
      ".tar",
      ".tgz",
      ".war",
      ".xz",
      ".zip",
      ".zst",
    ]);
    throw new Error(
      archive.has(extension)
        ? "Source tree contains a prohibited nested archive."
        : "Source tree contains a prohibited binary path.",
    );
  }
}

export function canonicalTreeDigest(
  entries: readonly SourceTreeEntryV1[],
): Sha256Digest {
  const records = entries
    .filter(
      (entry): entry is Extract<SourceTreeEntryV1, { readonly type: "blob" }> =>
        entry.type === "blob",
    )
    .map(({ path, mode, blobDigest }) => ({ path, mode, blobDigest }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return canonicalRecordDigest(records);
}

export function validateSourceTree(
  input: readonly SourceTreeEntryV1[],
  overrides: Partial<SnapshotLimits> = {},
): ValidatedSourceTreeV1 {
  if (!Array.isArray(input)) {
    throw new TypeError("Source tree inventory must be an array.");
  }
  const limits: SnapshotLimits = {
    maxEntries: safeIntegerLimit(
      overrides.maxEntries ?? DEFAULT_SNAPSHOT_LIMITS.maxEntries,
      "Tree entry count limit",
    ),
    maxFileBytes: safeIntegerLimit(
      overrides.maxFileBytes ?? DEFAULT_SNAPSHOT_LIMITS.maxFileBytes,
      "Tree file byte limit",
    ),
    maxTotalBytes: safeIntegerLimit(
      overrides.maxTotalBytes ?? DEFAULT_SNAPSHOT_LIMITS.maxTotalBytes,
      "Tree total byte limit",
    ),
  };
  if (input.length > limits.maxEntries) {
    throw new Error("Source tree exceeds the configured entry count limit.");
  }

  const paths = new Set<string>();
  const foldedPaths = new Map<string, string>();
  const entries: SourceTreeEntryV1[] = [];
  const blobs: Array<Extract<SourceTreeEntryV1, { readonly type: "blob" }>> =
    [];
  let totalBytes = 0;

  for (const unknownEntry of input as readonly unknown[]) {
    if (
      unknownEntry === null ||
      typeof unknownEntry !== "object" ||
      Array.isArray(unknownEntry)
    ) {
      throw new Error("Source tree contains a malformed entry.");
    }
    const entry = unknownEntry as Record<string, unknown>;
    const path = entry.path;
    const mode = entry.mode;
    const type = entry.type;
    if (typeof path !== "string" || typeof mode !== "string") {
      throw new Error("Source tree entry omitted its path or mode.");
    }
    assertSafeSourcePath(path);
    assertAllowedSnapshotPath(path);
    if (paths.has(path)) {
      throw new Error("Source tree contains a duplicate path.");
    }
    paths.add(path);
    const folded = path.toLocaleLowerCase("en-US");
    const prior = foldedPaths.get(folded);
    if (prior !== undefined) {
      throw new Error(`Source tree contains a case-fold collision: ${prior}.`);
    }
    foldedPaths.set(folded, path);

    if (type === "tree" && mode === "040000") {
      entries.push({ path, mode, type });
      continue;
    }
    if (type === "commit" || mode === "160000") {
      throw new Error("Source tree contains a prohibited submodule.");
    }
    if (type !== "blob" || (mode !== "100644" && mode !== "100755")) {
      throw new Error("Source tree contains a symlink or special file mode.");
    }
    const size = entry.size;
    const blobDigest = entry.blobDigest;
    if (
      !Number.isSafeInteger(size) ||
      (size as number) < 0 ||
      typeof blobDigest !== "string" ||
      !SHA256.test(blobDigest)
    ) {
      throw new Error("Source tree blob metadata is malformed.");
    }
    if ((size as number) > limits.maxFileBytes) {
      throw new Error("Source tree file exceeds the configured byte limit.");
    }
    totalBytes += size as number;
    if (
      !Number.isSafeInteger(totalBytes) ||
      totalBytes > limits.maxTotalBytes
    ) {
      throw new Error("Source tree exceeds the configured total byte limit.");
    }
    const blob = {
      path,
      mode,
      type,
      size: size as number,
      blobDigest: blobDigest as Sha256Digest,
    } as const;
    entries.push(blob);
    blobs.push(blob);
  }

  entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
  blobs.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return {
    entries,
    blobEntries: blobs,
    treeDigest: canonicalTreeDigest(blobs),
    totalBytes,
  };
}

export function createSourceSnapshot(input: {
  readonly request: IntakeRequestV1;
  readonly reference: ResolvedSourceReferenceV1;
  readonly archiveBytes: Uint8Array;
  readonly tree: ValidatedSourceTreeV1;
  readonly originEvidence: SourceSnapshotV1["originEvidence"];
}): SourceSnapshotV1 {
  return parseSourceSnapshot({
    apiVersion: "factory.external-source-snapshot/v1",
    createdAt: input.reference.retrievedAt,
    producerVersion: input.request.producerVersion,
    parentDigests: [canonicalRecordDigest(input.request)],
    repositoryUrl: input.request.source.canonicalRepositoryUrl,
    requestedRef: input.request.source.requestedRef,
    resolvedCommit: input.reference.resolvedCommit,
    retrievedAt: input.reference.retrievedAt,
    archiveDigest: digestBytes(input.archiveBytes),
    treeDigest: input.tree.treeDigest,
    includedPaths: input.tree.blobEntries.map(({ path }) => path),
    excludedPaths: [],
    originEvidence: input.originEvidence,
  });
}
