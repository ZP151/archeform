import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const requiredStudies = [
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

for (const required of requiredStudies) {
  const path = resolve(repositoryRoot, "docs/ecosystem/source-studies", required.file);
  const markdown = await readFile(path, "utf8");
  const requiredLines = [
    `repository: ${required.repository}`,
    `commit: ${required.commit}`,
    `license: ${required.license}`,
    "decision: reference-only",
    "sourceCopied: false",
  ];
  const missing = requiredLines.filter((line) => !markdown.includes(line));

  if (missing.length > 0) {
    throw new Error(`${required.file} is missing: ${missing.join(", ")}`);
  }

  if (required.excludedPath && !markdown.includes(`- ${required.excludedPath}`)) {
    throw new Error(`${required.file} must exclude ${required.excludedPath}`);
  }

  const pathBlock = markdown.match(/^paths:\n((?:  - .+\n)+)/m)?.[1] ?? "";
  const includedPaths = Array.from(pathBlock.matchAll(/^  - (.+)$/gm), ([, path]) => path);
  if (includedPaths.some((path) => path.startsWith("ee/"))) {
    throw new Error(`${required.file} cannot include an Amplication ee/ path`);
  }
}

process.stdout.write(`Verified ${requiredStudies.length} immutable reference-only source studies.\n`);
