import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

function installDetachedDependencies(checkout) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  run(pnpm, [
    "--dir",
    checkout,
    "install",
    "--offline",
    "--frozen-lockfile",
    "--ignore-scripts",
    "--prod=false",
  ]);
  for (const packageName of [
    "@factory/graph",
    "@factory/ui-primitives",
    "@factory/ui-patterns",
    "@factory/generated-ui",
    "@factory/experience-recipes",
    "@factory/screen-recipes",
    "@factory/capabilities",
    "@factory/adapters",
  ]) {
    run(pnpm, ["--dir", checkout, "--filter", packageName, "build"]);
  }
}
function resolutionDriver(checkout) {
  return `import { realpathSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const detachedRoot = realpathSync(
  fileURLToPath(new URL("../../../", import.meta.url)),
);
for (const specifier of [
  "@factory/capabilities",
  "@factory/capabilities/node",
  "@factory/graph",
  "@factory/adapters",
]) {
  const resolved = realpathSync(fileURLToPath(import.meta.resolve(specifier)));
  const outside = relative(detachedRoot, resolved);
  if (outside === "" || outside.startsWith(".."))
    throw new Error("Detached capture resolved outside parent: " + specifier);
}
`;
}
function captureTest(outputPath, checkout) {
  const source = (relativePath) =>
    pathToFileURL(resolve(checkout, relativePath)).href;
  return `import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  definitionSelectionCatalogue,
  projectDefinitionSelection,
} from "${source("packages/adapters/src/requirements/definition-selection-catalogue.ts")}";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
} from "@factory/graph";
import { generateApplicationBundle } from "${source("packages/compiler/src/index.ts")}";
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function captureEntry(key) {
  const entry = definitionSelectionCatalogue.find(
    (candidate) => candidate.definitionKey === key,
  );
  if (!entry) throw new Error("Historical definition missing: " + key);
  const selection = {
    definitionKey: entry.definitionKey,
    disposition: "supported-default",
    requirementId: "data-baseline-" + entry.definitionKey,
    title: "Definition Data Baseline",
    outcome: "Complete the reviewed local business workflow.",
    materialQuestions: [],
    businessParameters: null,
  };
  const interpretation = projectDefinitionSelection(selection);
  const clarification = projectDefinitionSelection({
    ...selection,
    disposition: "needs-clarification",
    materialQuestions: [
      {
        category: "integration",
        question: "Is local demo access acceptable?",
      },
    ],
  });
  const baseDraft = createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: "Definition Data Baseline",
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  if (!standard) throw new Error("Baseline has no standard assembly plan.");
  const { diff } = composeProductDraft({
    plan: standard.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const composedGraph = applyGraphDiffToDraft(baseDraft, diff).graph;
  const inputGraph = structuredClone(composedGraph);
  delete inputGraph.integration.compositionSelections;
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(inputGraph),
    selections: composedGraph.integration.compositionSelections ?? [],
  });
  const files = generateApplicationBundle({
    publishedRevisionId: selection.requirementId,
    graph: inputGraph,
    compositionLock,
  }).files;
  return {
    definitionKey: entry.definitionKey,
    canonicalSha256: digest(entry.structure),
    guideSha256: digest(entry.guide),
    instructionSha256: digest(entry.instruction),
    selectionSchemaSha256: digest(entry.jsonSchema),
    supportedProjectionSha256: digest(interpretation),
    clarificationProjectionSha256: digest(clarification),
    separatePublishedLockBundle: {
      fileCount: files.length,
      sha256: digest(files.map(({ path, content }) => [path, content])),
    },
    planSha256: digest(standard.plan),
    graphSha256: hashApplicationGraph(inputGraph),
    compositionLockGraphSha256: compositionLock.applicationGraphChecksum,
    composedGraphSha256: hashApplicationGraph(composedGraph),
    files: files.map(({ path, content }) => ({
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
    })),
    bundleSha256: digest(files.map(({ path, content }) => [path, content])),
  };
}

describe("frozen seven-definition capture", () => {
  it("freshly composes the immutable parent definitions", () => {
    const entries = [
      "restaurant-ordering",
      "expense-approval",
      "purchase-request-approval",
      "team-task-tracking",
      "publication-review",
      "training-funding-approval",
      "equipment-procurement-approval",
    ].map(captureEntry);
    expect(entries).toHaveLength(7);
    writeFileSync(
      ${JSON.stringify(outputPath)},
      JSON.stringify(
        {
          base: ${JSON.stringify(parent)},
          comparison: "current-generated-bytes",
          entries,
        },
        null,
        2,
      ) + "\\n",
      "utf8",
    );
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
  const temporaryResolution = resolve(
    checkout,
    "packages/compiler/test/.capture-seven-definition-resolution.mjs",
  );
  const temporaryTest = resolve(
    checkout,
    "packages/compiler/test/.capture-seven-definition-baseline.test.ts",
  );
  try {
    run("git", ["worktree", "add", "--detach", checkout, parent]);
    if (status(checkout) !== "")
      throw new Error("The isolated parent checkout was not clean.");
    installDetachedDependencies(checkout);
    if (status(checkout) !== "")
      throw new Error(
        "The isolated parent checkout changed before driver creation.",
      );
    writeFileSync(temporaryResolution, resolutionDriver(checkout), "utf8");
    run("node", [temporaryResolution], { cwd: checkout });
    writeFileSync(temporaryTest, captureTest(fixture, checkout), "utf8");
    run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", [
      "--dir",
      checkout,
      "--filter",
      "@factory/compiler",
      "vitest",
      "run",
      relative(resolve(checkout, "packages/compiler"), temporaryTest),
    ]);
    unlinkSync(temporaryTest);
    unlinkSync(temporaryResolution);
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
