import type { GeneratedFile } from "../../core/generated-files.js";

export interface ChangedFileDiffV1 {
  readonly path: string;
  readonly removed: readonly string[];
  readonly added: readonly string[];
}

export interface GeneratedFileDiffV1 {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly ChangedFileDiffV1[];
}

function splitLines(content: string): string[] {
  return content.split("\n");
}

function commonPrefixLength(
  left: readonly string[],
  right: readonly string[],
): number {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left[index] === right[index]) {
    index += 1;
  }
  return index;
}

/**
 * Produces a deterministic, dependency-free diff between two generated-file
 * sets: added paths, removed paths, and changed paths with a common-prefix/
 * common-suffix line diff. Diff content never includes material outside the
 * supplied sets.
 */
export function diffGeneratedFiles(
  left: readonly GeneratedFile[],
  right: readonly GeneratedFile[],
): GeneratedFileDiffV1 {
  const leftByPath = new Map(left.map(({ path, content }) => [path, content]));
  const rightByPath = new Map(
    right.map(({ path, content }) => [path, content]),
  );
  const leftPaths = new Set(leftByPath.keys());
  const rightPaths = new Set(rightByPath.keys());

  const added = [...rightPaths].filter((path) => !leftPaths.has(path)).sort();
  const removed = [...leftPaths].filter((path) => !rightPaths.has(path)).sort();

  const changed: ChangedFileDiffV1[] = [];
  for (const path of [...leftPaths]
    .filter((path) => rightPaths.has(path))
    .sort()) {
    const leftContent = leftByPath.get(path)!;
    const rightContent = rightByPath.get(path)!;
    if (leftContent === rightContent) continue;

    const leftLines = splitLines(leftContent);
    const rightLines = splitLines(rightContent);
    const prefix = commonPrefixLength(leftLines, rightLines);
    let suffix = 0;
    while (
      suffix < leftLines.length - prefix &&
      suffix < rightLines.length - prefix &&
      leftLines[leftLines.length - 1 - suffix] ===
        rightLines[rightLines.length - 1 - suffix]
    ) {
      suffix += 1;
    }
    changed.push({
      path,
      removed: leftLines.slice(prefix, leftLines.length - suffix),
      added: rightLines.slice(prefix, rightLines.length - suffix),
    });
  }

  return Object.freeze({
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    changed: Object.freeze(changed),
  });
}
