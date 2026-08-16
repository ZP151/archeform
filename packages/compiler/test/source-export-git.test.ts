import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { buildGitExport } from "../src/targets/source/export-git.js";

const decoder = new TextDecoder();

function sha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

describe("buildGitExport", () => {
  const input = {
    files: [
      { path: "web/index.html", content: "<html></html>\n" },
      { path: "web/src/app.mjs", content: "console.log(1);\n" },
    ],
    message: "Graph-first export\n",
    author: "Archeform <dev@archeform.local>",
    committer: "Archeform <dev@archeform.local>",
    timestampSeconds: 0,
  };

  it("produces a deterministic object store with verified ids and content", () => {
    const export1 = buildGitExport(input);
    const export2 = buildGitExport(input);
    expect([...export1.objects.entries()]).toEqual([
      ...export2.objects.entries(),
    ]);
    expect(export1.commitId).toBe(export2.commitId);
    expect(export1.rootTreeId).toBe(export2.rootTreeId);

    // Every object id must equal the SHA-1 of its inflated bytes.
    for (const [id, bytes] of export1.objects) {
      expect(sha1Hex(inflateSync(bytes))).toBe(id);
    }

    // The commit references the root tree and carries the fixed message.
    const commit = decoder.decode(
      inflateSync(export1.objects.get(export1.commitId)!),
    );
    expect(commit).toContain(`tree ${export1.rootTreeId}\n`);
    expect(commit).toContain(
      "author Archeform <dev@archeform.local> 0 +0000\n",
    );
    expect(commit).toContain("\nGraph-first export\n");
  });

  it("builds nested trees for directory-structured paths", () => {
    const { rootTreeId, objects } = buildGitExport(input);
    const rootTree = decoder.decode(inflateSync(objects.get(rootTreeId)!));
    expect(rootTree.startsWith("tree ")).toBe(true);
    // Root tree contains the "web" subtree (mode 40000).
    expect(rootTree).toMatch(/40000 web\0/);
  });

  it("rejects unsafe and duplicate paths", () => {
    expect(() =>
      buildGitExport({ ...input, files: [{ path: "../x.ts", content: "x" }] }),
    ).toThrow(/Generated output path/);

    expect(() =>
      buildGitExport({
        ...input,
        files: [
          { path: "a.ts", content: "x" },
          { path: "a.ts", content: "y" },
        ],
      }),
    ).toThrow(/collision/);
  });

  it("rejects a path that is both a file and a directory prefix", () => {
    expect(() =>
      buildGitExport({
        ...input,
        files: [
          { path: "web", content: "file" },
          { path: "web/app.mjs", content: "dir" },
        ],
      }),
    ).toThrow(/both a file and a directory/);
  });
});
