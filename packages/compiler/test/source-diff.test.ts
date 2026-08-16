import { describe, expect, it } from "vitest";

import { diffGeneratedFiles } from "../src/targets/source/diff.js";

describe("diffGeneratedFiles", () => {
  it("returns an empty diff for equal sets", () => {
    const files = [{ path: "web/app.mjs", content: "a\nb\n" }];
    const diff = diffGeneratedFiles(files, files);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it("classifies added and removed paths", () => {
    const left = [{ path: "web/old.mjs", content: "x" }];
    const right = [{ path: "web/new.mjs", content: "y" }];
    const diff = diffGeneratedFiles(left, right);
    expect(diff.added).toEqual(["web/new.mjs"]);
    expect(diff.removed).toEqual(["web/old.mjs"]);
    expect(diff.changed).toEqual([]);
  });

  it("produces a common-prefix/suffix line diff for a changed file", () => {
    const left = [{ path: "web/app.mjs", content: "a\nb\nc\n" }];
    const right = [{ path: "web/app.mjs", content: "a\nB\nc\n" }];
    const diff = diffGeneratedFiles(left, right);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]).toEqual({
      path: "web/app.mjs",
      removed: ["b"],
      added: ["B"],
    });
  });

  it("treats a trailing-newline-only difference as a change", () => {
    const left = [{ path: "web/app.mjs", content: "a\n" }];
    const right = [{ path: "web/app.mjs", content: "a" }];
    const diff = diffGeneratedFiles(left, right);
    expect(diff.changed).toHaveLength(1);
  });

  it("never returns content outside the supplied sets", () => {
    const left = [{ path: "web/a.mjs", content: "left-secret" }];
    const right = [{ path: "web/a.mjs", content: "right-secret" }];
    const diff = diffGeneratedFiles(left, right);
    expect(JSON.stringify(diff)).toContain("left-secret");
    expect(JSON.stringify(diff)).toContain("right-secret");
    expect(JSON.stringify(diff)).not.toContain("unrelated");
  });
});
