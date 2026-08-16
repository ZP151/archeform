import { describe, expect, it } from "vitest";

import {
  applySourceOverlay,
  buildGitExport,
  buildSourceManifest,
  buildSourceZip,
  diffGeneratedFiles,
  sourceBaselineDigest,
} from "../src/index.js";

describe("source target facade re-exports", () => {
  it("exposes the delivered source target functions", () => {
    expect(typeof buildSourceManifest).toBe("function");
    expect(typeof sourceBaselineDigest).toBe("function");
    expect(typeof applySourceOverlay).toBe("function");
    expect(typeof diffGeneratedFiles).toBe("function");
    expect(typeof buildSourceZip).toBe("function");
    expect(typeof buildGitExport).toBe("function");
  });

  it("builds a ZIP and Git export through the facade", () => {
    const files = [{ path: "web/app.mjs", content: "console.log(1);\n" }];

    const zip = buildSourceZip(files);
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.length).toBeGreaterThan(0);

    const git = buildGitExport({
      files,
      message: "facade export\n",
      author: "Archeform <dev@archeform.local>",
      committer: "Archeform <dev@archeform.local>",
      timestampSeconds: 0,
    });
    expect(git.commitId).toMatch(/^[a-f0-9]{40}$/);
    expect(git.objects.size).toBeGreaterThan(0);
  });
});
