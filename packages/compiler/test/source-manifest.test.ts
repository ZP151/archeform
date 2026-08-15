import { describe, expect, it } from "vitest";

import {
  buildSourceManifest,
  type SourceManifestInputV1,
} from "../src/targets/source/source-manifest.js";
import { sha256Digest } from "../src/core/generated-files.js";

const baseInput = (): SourceManifestInputV1 => ({
  compilationId: "compilation-1",
  graphHash: `sha256:${"a".repeat(64)}`,
  files: [
    { path: "web/index.html", content: "<html></html>\n" },
    { path: "web/app.mjs", content: "console.log(1);\n" },
  ],
});

describe("buildSourceManifest", () => {
  it("derives path-ordered entries with local digests, sizes, and generated origin", () => {
    const manifest = buildSourceManifest(baseInput());

    expect(manifest.compilationId).toBe("compilation-1");
    expect(manifest.graphHash).toBe(`sha256:${"a".repeat(64)}`);
    expect(manifest.entries.map(({ path }) => path)).toEqual([
      "web/app.mjs",
      "web/index.html",
    ]);
    expect(manifest.entries[0]).toMatchObject({
      path: "web/app.mjs",
      digest: `sha256:${sha256Digest("console.log(1);\n")}`,
      sizeBytes: Buffer.byteLength("console.log(1);\n", "utf8"),
      origin: "generated",
    });
    expect(manifest.baselineDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("is deterministic for equal input and changes when content or order changes", () => {
    const first = buildSourceManifest(baseInput());
    const second = buildSourceManifest(baseInput());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));

    const reversed = baseInput();
    reversed.files = [...reversed.files].reverse();
    expect(buildSourceManifest(reversed).baselineDigest).toBe(
      first.baselineDigest,
    );

    const contentChanged = baseInput();
    contentChanged.files[0].content = "console.log(2);\n";
    expect(buildSourceManifest(contentChanged).baselineDigest).not.toBe(
      first.baselineDigest,
    );
  });

  it("applies overlay origin and optional mediaType and pageKey enrichments", () => {
    const input = baseInput();
    const manifest = buildSourceManifest({
      ...input,
      origins: new Map([["web/app.mjs", "overlay"]]),
      mediaTypes: new Map([["web/app.mjs", "text/javascript"]]),
      pageKeys: new Map([["web/app.mjs", "customer-home"]]),
    });

    const app = manifest.entries.find(({ path }) => path === "web/app.mjs")!;
    expect(app.origin).toBe("overlay");
    expect(app.mediaType).toBe("text/javascript");
    expect(app.pageKey).toBe("customer-home");
  });

  it("rejects unsafe, duplicate, and empty paths", () => {
    const unsafe = baseInput();
    unsafe.files.push({ path: "../escape.ts", content: "x" });
    expect(() => buildSourceManifest(unsafe)).toThrow(
      /Source manifest input is invalid|Generated output path/,
    );

    const duplicate = baseInput();
    duplicate.files.push({ path: "web/app.mjs", content: "y" });
    expect(() => buildSourceManifest(duplicate)).toThrow(
      /Source manifest input is invalid|collision/,
    );
  });

  it("produces an empty manifest for an empty file set", () => {
    const empty = baseInput();
    empty.files = [];
    const manifest = buildSourceManifest(empty);
    expect(manifest.entries).toEqual([]);
    expect(manifest.baselineDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("rejects a malformed compilationId or graphHash", () => {
    const badId = baseInput();
    badId.compilationId = "";
    expect(() => buildSourceManifest(badId)).toThrow(
      /Source manifest input is invalid/,
    );

    const badHash = baseInput();
    badHash.graphHash = "not-a-hash";
    expect(() => buildSourceManifest(badHash)).toThrow(
      /Source manifest input is invalid/,
    );
  });
});
