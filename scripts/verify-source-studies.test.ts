import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

type ExpectedStudy = {
  readonly file: string;
  readonly repository: string;
  readonly commit: string;
  readonly license: string;
  readonly excludedPath?: string;
};

const expectedStudies: readonly ExpectedStudy[] = [
  {
    file: "amplication-amplication-7656495d27f0dceff89657590c3f14149e45c7a6.md",
    repository: "https://github.com/amplication/amplication",
    commit: "7656495d27f0dceff89657590c3f14149e45c7a6",
    license: "Apache-2.0 (outside ee/)",
    excludedPath: "ee/**",
  },
  {
    file: "medusajs-medusa-dde167d0be4c23ed37aa7a3d71721728e31f3e96.md",
    repository: "https://github.com/medusajs/medusa",
    commit: "dde167d0be4c23ed37aa7a3d71721728e31f3e96",
    license: "MIT",
  },
];

function readStudy(study: ExpectedStudy): string {
  const path = resolve(repositoryRoot, "docs/ecosystem/source-studies", study.file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function readIncludedPaths(study: string): readonly string[] {
  const pathBlock = study.match(/^paths:\n((?:  - .+\n)+)/m)?.[1] ?? "";
  return Array.from(pathBlock.matchAll(/^  - (.+)$/gm), ([, path]) => path);
}

describe("ecosystem source studies", () => {
  it("pins reviewed repositories and records their reuse boundaries", () => {
    for (const expected of expectedStudies) {
      const study = readStudy(expected);

      expect(study).toContain(`repository: ${expected.repository}`);
      expect(study).toContain(`commit: ${expected.commit}`);
      expect(study).toContain(`license: ${expected.license}`);
      expect(study).toContain("decision: reference-only");
      expect(study).toContain("sourceCopied: false");
      expect(readIncludedPaths(study).every((path) => !path.startsWith("ee/"))).toBe(true);

      if (expected.excludedPath) {
        expect(study).toContain(`- ${expected.excludedPath}`);
      }
    }
  });
});
