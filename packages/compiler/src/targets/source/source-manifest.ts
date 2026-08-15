import {
  type GeneratedFile,
  assertSafeGeneratedFileSet,
  sha256Digest,
} from "../../core/generated-files.js";

const sha256Pattern = /^sha256:[a-f0-9]{64}$/;

export type SourceOriginV1 = "generated" | "overlay";

export interface SourceManifestEntryV1 {
  readonly path: string;
  readonly digest: string;
  readonly sizeBytes: number;
  readonly origin: SourceOriginV1;
  readonly mediaType?: string;
  readonly pageKey?: string;
}

export interface SourceManifestV1 {
  readonly compilationId: string;
  readonly graphHash: string;
  readonly baselineDigest: string;
  readonly entries: readonly SourceManifestEntryV1[];
}

export interface SourceManifestInputV1 {
  readonly compilationId: string;
  readonly graphHash: string;
  readonly files: readonly GeneratedFile[];
  readonly origins?: ReadonlyMap<string, SourceOriginV1>;
  readonly mediaTypes?: ReadonlyMap<string, string>;
  readonly pageKeys?: ReadonlyMap<string, string>;
}

function failInvalid(): never {
  throw new Error("Source manifest input is invalid.");
}

function assertCompilationId(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    failInvalid();
  }
}

function assertGraphHash(value: unknown): asserts value is string {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    failInvalid();
  }
}

/**
 * Computes the canonical content-tree baseline digest: the SHA-256 of the
 * path-ordered `path:sha256:<hex>` lines. It is order-independent and ignores
 * origin, media type, and page enrichments, so it is stable for overlay and
 * export binding.
 */
export function sourceBaselineDigest(files: readonly GeneratedFile[]): string {
  return `sha256:${sha256Digest(
    [...files]
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
      .map((file) => `${file.path}:sha256:${sha256Digest(file.content)}`)
      .join("\n"),
  )}`;
}

/**
 * Derives a deterministic, path-ordered source manifest from a rendered
 * generated-file set. Each entry's digest is recomputed locally (never trusted
 * from the caller); sizeBytes is the exact UTF-8 byte length. The baseline
 * digest hashes the canonical path-ordered `path:digest` lines so any set,
 * order, or content change is detectable before overlay apply or export.
 */
export function buildSourceManifest(
  input: SourceManifestInputV1,
): SourceManifestV1 {
  assertCompilationId(input.compilationId);
  assertGraphHash(input.graphHash);
  assertSafeGeneratedFileSet(input.files);

  const encoder = new TextEncoder();
  const entries: SourceManifestEntryV1[] = [...input.files]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((file) => {
      const digest = `sha256:${sha256Digest(file.content)}`;
      const sizeBytes = encoder.encode(file.content).length;
      const mediaType = input.mediaTypes?.get(file.path);
      const pageKey = input.pageKeys?.get(file.path);
      return {
        path: file.path,
        digest,
        sizeBytes,
        origin: input.origins?.get(file.path) ?? "generated",
        ...(mediaType !== undefined ? { mediaType } : {}),
        ...(pageKey !== undefined ? { pageKey } : {}),
      };
    });

  const baselineDigest = sourceBaselineDigest(input.files);

  return Object.freeze({
    compilationId: input.compilationId,
    graphHash: input.graphHash,
    baselineDigest,
    entries: Object.freeze(entries),
  });
}
