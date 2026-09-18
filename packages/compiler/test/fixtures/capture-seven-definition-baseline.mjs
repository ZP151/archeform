import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const parent = "b8d796961b1ff68c7d5efa1a12fe353aa370eee8";
const expectedArguments = [
  "--parent",
  parent,
  "--fixture",
  "packages/compiler/test/fixtures/seven-definition-baseline.json",
  "--receipt",
  "docs/acceptance/evidence/appointment-booking/definition-composition/seven-definition-baseline-capture.json",
];
const command = [
  "node",
  "packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs",
  ...expectedArguments,
].join(" ");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function run(file, arguments_, options = {}) {
  return execFileSync(file, arguments_, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32" && file === "pnpm.cmd",
    env: { ...process.env, npm_config_offline: "true" },
    ...options,
  }).trim();
}

function sha256(path) {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function status(directory) {
  return execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: directory,
      encoding: "utf8",
    },
  );
}

function ensureExactInvocation() {
  if (
    process.argv.slice(2).join("\u0000") !== expectedArguments.join("\u0000")
  ) {
    throw new Error(`Expected exactly: ${command}`);
  }
}

function linkDependencies(checkout) {
  const link = (source, destination) => {
    if (!existsSync(source) || existsSync(destination)) return;
    mkdirSync(dirname(destination), { recursive: true });
    symlinkSync(
      source,
      destination,
      process.platform === "win32" ? "junction" : "dir",
    );
  };
  link(resolve(root, "node_modules"), resolve(checkout, "node_modules"));
  for (const packageName of [
    "adapters",
    "capabilities",
    "compiler",
    "experience-recipes",
    "graph",
    "screen-recipes",
  ]) {
    link(
      resolve(root, "packages", packageName, "node_modules"),
      resolve(checkout, "packages", packageName, "node_modules"),
    );
  }
}

function captureTest(outputPath) {
  return `import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { currentDefinitionDataCompilationEvidence } from "./fixtures/definition-data-compatibility.js";

describe("frozen seven-definition capture", () => {
  it("captures the immutable parent definitions", () => {
    const entries = currentDefinitionDataCompilationEvidence([
      "restaurant-ordering",
      "expense-approval",
      "purchase-request-approval",
      "team-task-tracking",
      "publication-review",
      "training-funding-approval",
      "equipment-procurement-approval",
    ]);
    expect(entries).toHaveLength(7);
    writeFileSync(${JSON.stringify(outputPath)}, JSON.stringify({ base: ${JSON.stringify(parent)}, comparison: "current-generated-bytes", entries }, null, 2) + "\\n", "utf8");
  });
});
`;
}

function main() {
  ensureExactInvocation();
  const fixture = resolve(root, expectedArguments[3]);
  const receipt = resolve(root, expectedArguments[5]);
  const captureScript = fileURLToPath(import.meta.url);
  const temporary = mkdtempSync(
    resolve(tmpdir(), "archeform-seven-definition-"),
  );
  const checkout = resolve(temporary, "checkout");
  const temporaryTest = resolve(
    checkout,
    "packages/compiler/test/.capture-seven-definition-baseline.test.ts",
  );
  const temporaryHelper = resolve(
    checkout,
    "packages/compiler/test/fixtures/definition-data-compatibility.ts",
  );
  try {
    run("git", ["worktree", "add", "--detach", checkout, parent]);
    if (status(checkout) !== "")
      throw new Error("The isolated parent checkout was not clean.");
    linkDependencies(checkout);
    copyFileSync(
      resolve(
        root,
        "packages/compiler/test/fixtures/definition-data-compatibility.ts",
      ),
      temporaryHelper,
    );
    writeFileSync(temporaryTest, captureTest(fixture), "utf8");
    run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", [
      "--dir",
      checkout,
      "--filter",
      "@factory/compiler",
      "exec",
      "vitest",
      "run",
      relative(resolve(checkout, "packages/compiler"), temporaryTest),
    ]);
    unlinkSync(temporaryTest);
    execFileSync(
      "git",
      [
        "restore",
        "--source=HEAD",
        "--",
        "packages/compiler/test/fixtures/definition-data-compatibility.ts",
      ],
      { cwd: checkout, stdio: "pipe" },
    );
    if (status(checkout) !== "")
      throw new Error("The isolated parent checkout was modified by capture.");
    const captured = JSON.parse(readFileSync(fixture, "utf8"));
    if (
      captured.base !== parent ||
      !Array.isArray(captured.entries) ||
      captured.entries.length !== 7
    ) {
      throw new Error(
        "The isolated parent capture did not produce seven definitions.",
      );
    }
    mkdirSync(dirname(receipt), { recursive: true });
    const receiptValue = {
      parentHead: parent,
      statusPorcelainV1: "",
      nodeVersion: process.version,
      pnpmVersion: run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", [
        "--version",
      ]),
      command,
      captureScriptPath:
        "packages/compiler/test/fixtures/capture-seven-definition-baseline.mjs",
      captureScriptSha256: sha256(captureScript),
      fixturePath:
        "packages/compiler/test/fixtures/seven-definition-baseline.json",
      fixtureSha256: sha256(fixture),
    };
    writeFileSync(
      receipt,
      JSON.stringify(receiptValue, null, 2) + "\n",
      "utf8",
    );
  } finally {
    if (existsSync(checkout)) {
      try {
        execFileSync("git", ["worktree", "remove", "--force", checkout], {
          cwd: root,
          stdio: "pipe",
        });
      } catch {
        rmSync(checkout, { recursive: true, force: true });
      }
    }
    rmSync(temporary, { recursive: true, force: true });
  }
}

main();
