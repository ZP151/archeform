import { describe, expect, it } from "vitest";

import {
  assertSafeGeneratedFilePath,
  assertSafeGeneratedFileSet,
  sameGeneratedFileSet,
  sha256Digest,
  type GeneratedFile,
} from "../src/index.js";

describe("generated file digest rules", () => {
  it("hashes exact UTF-8 content with SHA-256", () => {
    expect(sha256Digest("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Digest("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("accepts repository-relative forward-slash paths", () => {
    expect(() =>
      assertSafeGeneratedFilePath("docs/api-reference.md"),
    ).not.toThrow();
    expect(() => assertSafeGeneratedFilePath("web/index.tsx")).not.toThrow();
    expect(() => assertSafeGeneratedFilePath("a/b/c.txt")).not.toThrow();
  });

  it.each([
    { label: "an empty path", path: "" },
    { label: "a NUL byte", path: "docs/api\0.md" },
    { label: "a backslash", path: "docs\\api-reference.md" },
    { label: "an absolute path", path: "/docs/api-reference.md" },
    { label: "a drive-prefixed path", path: "C:\\docs\\api-reference.md" },
    { label: "a parent segment", path: "docs/../api-reference.md" },
    { label: "a current segment", path: "docs/./api-reference.md" },
    { label: "an empty segment", path: "docs//api-reference.md" },
    { label: "a trailing directory slash", path: "docs/" },
  ])("rejects $label", ({ path }) => {
    expect(() => assertSafeGeneratedFilePath(path)).toThrow();
  });
});

describe("generated file set rules", () => {
  it("rejects duplicate output paths", () => {
    const files = [
      { path: "docs/api-reference.md", content: "# API\n" },
      { path: "docs/api-reference.md", content: "# API (again)\n" },
    ];
    expect(() => assertSafeGeneratedFileSet(files)).toThrow(
      "Generated output collision at 'docs/api-reference.md'.",
    );
  });

  it("rejects an unsafe path inside a file set", () => {
    const files = [{ path: "../escape.md", content: "x" }];
    expect(() => assertSafeGeneratedFileSet(files)).toThrow();
  });

  it("accepts a distinct safe file set", () => {
    const files = [
      { path: "docs/api-reference.md", content: "# API\n" },
      { path: "docs/entity-relationship.md", content: "# ERD\n" },
    ];
    expect(() => assertSafeGeneratedFileSet(files)).not.toThrow();
  });
});

describe("generated file set comparison", () => {
  const first: readonly GeneratedFile[] = [
    { path: "b.txt", content: "beta" },
    { path: "a.txt", content: "alpha" },
  ];
  const reordered: readonly GeneratedFile[] = [
    { path: "a.txt", content: "alpha" },
    { path: "b.txt", content: "beta" },
  ];

  it("treats reordered identical sets as equal", () => {
    expect(sameGeneratedFileSet(first, reordered)).toBe(true);
  });

  it("detects content drift", () => {
    const drift = [
      { path: "a.txt", content: "alpha" },
      { path: "b.txt", content: "BETA" },
    ];
    expect(sameGeneratedFileSet(first, drift)).toBe(false);
  });

  it("detects a different file set", () => {
    const extra = [...reordered, { path: "c.txt", content: "gamma" }];
    expect(sameGeneratedFileSet(first, extra)).toBe(false);
  });
});
