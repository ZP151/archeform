import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

import {
  type GeneratedFile,
  assertSafeGeneratedFileSet,
} from "../../core/generated-files.js";

const encoder = new TextEncoder();

export interface GitObjectV1 {
  readonly id: string;
  readonly bytes: Uint8Array;
}

export interface GitTreeEntryV1 {
  readonly mode: string;
  readonly name: string;
  readonly id: string;
}

export interface GitCommitInputV1 {
  readonly treeId: string;
  readonly message: string;
  readonly author: string;
  readonly committer: string;
  readonly timestampSeconds: number;
}

export interface GitExportInputV1 {
  readonly files: readonly GeneratedFile[];
  readonly message: string;
  readonly author: string;
  readonly committer: string;
  readonly timestampSeconds: number;
}

export interface GitExportV1 {
  readonly rootTreeId: string;
  readonly commitId: string;
  readonly objects: ReadonlyMap<string, Uint8Array>;
}

function sha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function objectEnvelope(
  type: "blob" | "tree" | "commit",
  body: Uint8Array,
): Uint8Array {
  const header = encoder.encode(`${type} ${body.length}\0`);
  return concat(header, body);
}

function finalizeObject(body: Uint8Array): GitObjectV1 {
  return { id: sha1Hex(body), bytes: deflateSync(body) };
}

export function gitBlobObject(content: string): GitObjectV1 {
  const data = encoder.encode(content);
  return finalizeObject(objectEnvelope("blob", data));
}

export function gitTreeObject(entries: readonly GitTreeEntryV1[]): GitObjectV1 {
  const sorted = [...entries].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const parts: Uint8Array[] = [];
  for (const entry of sorted) {
    parts.push(encoder.encode(`${entry.mode} ${entry.name}\0`));
    parts.push(hexToBytes(entry.id));
  }
  return finalizeObject(objectEnvelope("tree", concat(...parts)));
}

export function gitCommitObject(input: GitCommitInputV1): GitObjectV1 {
  const body = encoder.encode(
    `tree ${input.treeId}\n` +
      `author ${input.author} ${input.timestampSeconds} +0000\n` +
      `committer ${input.committer} ${input.timestampSeconds} +0000\n` +
      `\n${input.message}\n`,
  );
  return finalizeObject(objectEnvelope("commit", body));
}

interface TreeItem {
  readonly path: string;
  readonly id: string;
}

function buildTree(
  items: readonly TreeItem[],
  put: (object: GitObjectV1) => GitObjectV1,
): GitObjectV1 {
  const files: GitTreeEntryV1[] = [];
  const directories = new Map<string, TreeItem[]>();
  for (const item of items) {
    const slash = item.path.indexOf("/");
    if (slash === -1) {
      files.push({ mode: "100644", name: item.path, id: item.id });
    } else {
      const directory = item.path.slice(0, slash);
      const rest = item.path.slice(slash + 1);
      const bucket = directories.get(directory) ?? [];
      bucket.push({ path: rest, id: item.id });
      directories.set(directory, bucket);
    }
  }

  const entries: GitTreeEntryV1[] = [...files];
  for (const [directory, childItems] of directories) {
    const subtree = buildTree(childItems, put);
    entries.push({ mode: "40000", name: directory, id: subtree.id });
  }
  return put(gitTreeObject(entries));
}

/**
 * Renders a deterministic Graph-first Git object store from a checked file
 * set: one blob per file, nested trees, and one commit. Object ids use SHA-1
 * and objects are zlib-deflated. Equal input produces byte-identical output.
 */
export function buildGitExport(input: GitExportInputV1): GitExportV1 {
  assertSafeGeneratedFileSet(input.files);

  // Reject a path that is both a file and a directory prefix (e.g. "foo" and
  // "foo/bar"), which would produce a tree with duplicate entry names.
  const sortedPaths = [...input.files].map(({ path }) => path).sort();
  for (let index = 0; index + 1 < sortedPaths.length; index += 1) {
    if (sortedPaths[index + 1]!.startsWith(`${sortedPaths[index]}/`)) {
      throw new Error("Generated output path is both a file and a directory.");
    }
  }

  const objects = new Map<string, Uint8Array>();
  const put = (object: GitObjectV1): GitObjectV1 => {
    objects.set(object.id, object.bytes);
    return object;
  };

  const sorted = [...input.files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  const items = sorted.map((file) => ({
    path: file.path,
    id: put(gitBlobObject(file.content)).id,
  }));

  const rootTree = buildTree(items, put);
  const commit = put(
    gitCommitObject({
      treeId: rootTree.id,
      message: input.message,
      author: input.author,
      committer: input.committer,
      timestampSeconds: input.timestampSeconds,
    }),
  );

  return Object.freeze({
    rootTreeId: rootTree.id,
    commitId: commit.id,
    objects,
  });
}
