import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

const immutableCompilerParent = "b8d796961b1ff68c7d5efa1a12fe353aa370eee8";
const compilerIndexPath = new URL("../src/index.ts", import.meta.url);

function publicExportSurface(source: string) {
  return [
    ...source.matchAll(
      /^export\s+(?:function|class|interface|type)\s+(\w+)|^export\s*\{([\s\S]*?)\};/gm,
    ),
  ]
    .flatMap((match) => {
      if (match[1]) return [match[1]];
      return match[2]!
        .split(",")
        .map((value) => value.replace(/\/\/.*$/, "").trim())
        .filter(Boolean)
        .map(
          (value) =>
            value.replace(/^type\s+/, "").split(/\s+as\s+/)[1] ?? value,
        );
    })
    .sort();
}

describe("Appointment compiler admission exports", () => {
  it("keeps the immutable public index surface and the admission module private", () => {
    const current = readFileSync(compilerIndexPath, "utf8");
    const historical = execFileSync(
      "git",
      ["show", `${immutableCompilerParent}:packages/compiler/src/index.ts`],
      { encoding: "utf8" },
    );
    expect(publicExportSurface(current)).toEqual(
      publicExportSurface(historical),
    );
    expect(current).toContain(
      'import { exactAppointmentNumericWitness } from "./appointment-compilation-admission.js";',
    );
    expect(current).not.toMatch(
      /export\s+(?:\*|\{[^}]*appointment-compilation-admission)/,
    );
    expect(
      execFileSync(
        "git",
        ["grep", "-l", "appointment-compilation-admission", "--", "src"],
        { encoding: "utf8" },
      )
        .trim()
        .split("\n"),
    ).toEqual(["src/index.ts"]);
  });
});
