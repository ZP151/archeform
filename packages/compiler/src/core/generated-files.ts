import { createHash } from "node:crypto";

/**
 * One deterministically rendered output file. Paths are repository-relative
 * forward-slash paths; content is the exact UTF-8 bytes.
 */
export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

/**
 * SHA-256 hex digest of the exact UTF-8 content. Parity gates compare paths,
 * bytes, and this digest before a target plugin becomes authoritative.
 */
export function sha256Digest(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Rejects a generated output path that could escape the output root or make
 * path identity ambiguous. Accepted paths are relative, forward-slash, non-
 * empty, contain no "." or ".." segment, no empty segment, no backslash, no
 * drive prefix, no leading slash, and no NUL byte. A directory-style trailing
 * slash is rejected because GeneratedFile entries are files.
 */
export function assertSafeGeneratedFilePath(path: string): void {
  if (path.length === 0) {
    throw new Error("Generated output path must not be empty.");
  }
  if (path.includes("\0")) {
    throw new Error(`Generated output path '${path}' contains a NUL byte.`);
  }
  if (path.includes("\\")) {
    throw new Error(
      `Generated output path '${path}' must use forward slashes only.`,
    );
  }
  if (path.startsWith("/")) {
    throw new Error(`Generated output path '${path}' must be relative.`);
  }
  if (/^[A-Za-z]:/.test(path)) {
    throw new Error(
      `Generated output path '${path}' must not use a drive prefix.`,
    );
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    throw new Error(
      `Generated output path '${path}' must not contain '.' or '..' segments.`,
    );
  }
  if (segments.some((segment) => segment.length === 0)) {
    throw new Error(
      `Generated output path '${path}' must not contain empty segments.`,
    );
  }
}

/**
 * Rejects a file set containing an unsafe path or a duplicate path. Duplicate
 * paths would make output identity ambiguous and must fail closed before any
 * artifact is materialized.
 */
export function assertSafeGeneratedFileSet(
  files: readonly Pick<GeneratedFile, "path">[],
): void {
  const paths = new Set<string>();
  for (const file of files) {
    assertSafeGeneratedFilePath(file.path);
    if (paths.has(file.path)) {
      throw new Error(`Generated output collision at '${file.path}'.`);
    }
    paths.add(file.path);
  }
}

/**
 * Byte-exact comparison of two rendered file sets. The file sets are ordered
 * by path; a difference in set, path, or content means the render is not
 * deterministic and must not be accepted.
 */
export function sameGeneratedFileSet(
  left: readonly GeneratedFile[],
  right: readonly GeneratedFile[],
): boolean {
  if (left.length !== right.length) return false;
  const orderedLeft = [...left].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  const orderedRight = [...right].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  return orderedLeft.every(
    (file, index) =>
      file.path === orderedRight[index].path &&
      file.content === orderedRight[index].content,
  );
}
