import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const base = "62c53884897a7f72c3a4c9fe25c2b010491515fd";
const fixture = "packages/compiler/test/fixtures/eight-definition-baseline.json";
const receipt = "packages/compiler/test/fixtures/eight-definition-baseline-capture.json";
const driver = "packages/compiler/test/.capture-eight-definition-baseline.test.ts";
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8", shell: command === "pnpm.cmd" });
const sha = (bytes) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
if (run("git", ["rev-parse", "HEAD"]).trim() !== base) throw Error("Incorrect baseline HEAD.");
if (run("git", ["diff", "HEAD", "--", "packages", "package.json", "pnpm-lock.yaml"]).trim()) throw Error("Baseline source is modified.");
if (existsSync(resolve(root, fixture)) || existsSync(resolve(root, receipt))) throw Error("Never overwrite a captured baseline.");
const paths = run("git", ["ls-files", "packages", "package.json", "pnpm-lock.yaml"]).trim().split(/\r?\n/);
const sourceFiles = paths.map(path => ({ path, sha256: sha(readFileSync(resolve(root, path))) }));
const statusBefore = run("git", ["status", "--porcelain=v1"]);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
for (const pkg of ["graph", "ui-primitives", "ui-patterns", "generated-ui", "experience-recipes", "screen-recipes", "capabilities", "adapters"]) run(pnpm, ["--filter", "@factory/" + pkg, "build"]);
writeFileSync(resolve(root, driver), `import { writeFileSync } from "node:fs";
import { it, expect } from "vitest";
import { currentDefinitionDataCompilationEvidence } from "./fixtures/definition-data-compatibility.js";
it("captures the unchanged current eight definitions", () => {
  const entries = currentDefinitionDataCompilationEvidence(["restaurant-ordering", "expense-approval", "purchase-request-approval", "team-task-tracking", "publication-review", "training-funding-approval", "equipment-procurement-approval", "appointment-booking-v1"]);
  expect(entries).toHaveLength(8);
  for (const entry of entries) expect(entry.graphSha256).toBe(entry.compositionLockGraphSha256);
  writeFileSync(new URL("./fixtures/eight-definition-baseline.json", import.meta.url), JSON.stringify({ base: "${base}", comparison: "current-generated-bytes", entries }, null, 2) + "\\n");
});
`);
try {
  run(pnpm, ["--filter", "@factory/compiler", "exec", "vitest", "run", "test/.capture-eight-definition-baseline.test.ts"]);
  if (run("git", ["diff", "HEAD", "--", "packages", "package.json", "pnpm-lock.yaml"]).trim()) throw Error("Capture changed tracked source.");
  for (const source of sourceFiles) if (sha(readFileSync(resolve(root, source.path))) !== source.sha256) throw Error("Source changed during capture.");
  writeFileSync(resolve(root, receipt), JSON.stringify({ base, statusBefore, nodeVersion: process.version, pnpmVersion: run(pnpm, ["--version"]).trim(), command: "node packages/compiler/test/fixtures/capture-eight-definition-baseline.mjs", captureScriptSha256: sha(readFileSync(fileURLToPath(import.meta.url))), fixtureSha256: sha(readFileSync(resolve(root, fixture))), sourceFiles }, null, 2) + "\n");
} finally { unlinkSync(resolve(root, driver)); }
