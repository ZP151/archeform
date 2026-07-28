import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const noticesPath = resolve(repositoryRoot, "docs/third-party-notices.md");
const required = [
  "@puckeditor/core",
  "@xyflow/react",
  "xstate",
  "prisma",
  "casbin",
];

const markdown = await readFile(noticesPath, "utf8");
const noticeKeys = new Set(
  Array.from(markdown.matchAll(/^## Package: `([^`]+)`$/gm), ([, key]) => key),
);
const missing = required.filter((key) => !noticeKeys.has(key));

if (missing.length > 0) {
  throw new Error(`Missing third-party notices: ${missing.join(", ")}`);
}

process.stdout.write(`Verified ${required.length} direct ecosystem notices.\n`);
