import { assertSourceOverlay, type SourceOverlayV1 } from "@factory/graph";

import {
  type GeneratedFile,
  assertSafeGeneratedFileSet,
  sha256Digest,
} from "../../core/generated-files.js";
import { sourceBaselineDigest } from "./source-manifest.js";

function failInvalid(): never {
  throw new Error("Source overlay apply is invalid.");
}

export interface SourceOverlayApplyInputV1 {
  readonly compilationChecksum: string;
  readonly baseline: readonly GeneratedFile[];
  readonly overlay: SourceOverlayV1;
  readonly contents: ReadonlyMap<string, string>;
}

/**
 * Applies a validated Source Overlay onto a read-only generated baseline. The
 * overlay envelope is re-validated; the compilation checksum, recomputed
 * baseline digest, and declared conflict state must all match; every overlay
 * content byte string must hash to its declared contentDigest; and overlay
 * files may only add paths under the writable root, never overwrite a
 * generated file. Returns the path-ordered union of generated plus overlay
 * files.
 */
export function applySourceOverlay(
  input: SourceOverlayApplyInputV1,
): readonly GeneratedFile[] {
  const overlay = assertSourceOverlay(input.overlay);

  if (overlay.compilationChecksum !== input.compilationChecksum) {
    failInvalid();
  }
  if (overlay.baselineDigest !== sourceBaselineDigest(input.baseline)) {
    failInvalid();
  }
  if (overlay.conflictState !== "clean") {
    failInvalid();
  }

  assertSafeGeneratedFileSet(input.baseline);
  const generatedPaths = new Set(input.baseline.map(({ path }) => path));

  const overlayFiles: GeneratedFile[] = [];
  for (const file of overlay.files) {
    if (generatedPaths.has(file.path)) {
      failInvalid();
    }
    const content = input.contents.get(file.path);
    if (content === undefined) {
      failInvalid();
    }
    if (`sha256:${sha256Digest(content)}` !== file.contentDigest) {
      failInvalid();
    }
    overlayFiles.push({ path: file.path, content });
  }
  if (input.contents.size !== overlayFiles.length) {
    failInvalid();
  }

  const merged = [...input.baseline, ...overlayFiles];
  assertSafeGeneratedFileSet(merged);
  return Object.freeze(
    merged.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  );
}
