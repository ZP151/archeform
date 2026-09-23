import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import * as ts from "typescript";
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
  const sourceFile = ts.createSourceFile(
    "index.ts",
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const names: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (!statement.exportClause)
        throw new Error("Unbounded compiler export.");
      if (ts.isNamedExports(statement.exportClause)) {
        names.push(
          ...statement.exportClause.elements.map(
            (element) => element.name.text,
          ),
        );
      } else {
        names.push(statement.exportClause.name.text);
      }
      continue;
    }
    if (
      !ts.canHaveModifiers(statement) ||
      !ts
        .getModifiers(statement)
        ?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)
    )
      continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name))
          throw new Error("Unbounded compiler export binding.");
        names.push(declaration.name.text);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    )
      names.push(statement.name.text);
  }
  return names.sort();
}

// Exact later additions authorized by ADR-0074 and ADR-0076; internals stay private.
const laterRuntimeExports = [
  "selectContentDirectoryProfile",
  "selectInventoryOperationsProfile",
];
const laterTypeExports = [
  "ContentDirectoryProfile",
  "InventoryOperationsProfile",
];

function runtimeExportSurface(source: string) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const values: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          if (!element.isTypeOnly) values.push(element.name.text);
        }
      }
      continue;
    }
    if (
      !statement.modifiers?.some(
        ({ kind }) => kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      continue;
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      values.push(statement.name.text);
      continue;
    }
  }
  return values.sort();
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
      [
        ...publicExportSurface(historical),
        ...laterRuntimeExports,
        ...laterTypeExports,
      ].sort(),
    );
    expect(current).toMatch(
      /import\s*\{[\s\S]*exactAppointmentNumericWitness,[\s\S]*registerAppointmentPageRuntimeForTest,[\s\S]*\}\s*from "\.\/appointment-compilation-admission\.js";/,
    );
    expect(current).not.toMatch(
      /export\s+(?:\*|\{[^}]*appointment-compilation-admission)/,
    );
    expect(
      execFileSync(
        "git",
        [
          "grep",
          "-l",
          'from "./appointment-compilation-admission.js"',
          "--",
          "src",
        ],
        { encoding: "utf8" },
      )
        .trim()
        .split("\n"),
    ).toEqual(["src/index.ts"]);
  });
});

const consumerWorkerDirectory = resolve(
  fileURLToPath(new URL("../../../apps/compiler-worker/", import.meta.url)),
);

function consumerImport(specifier: string) {
  return execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "const specifier = process.argv[1]; try { await import(specifier); console.log('ok'); } catch (error) { console.log(error.code); }",
      specifier,
    ],
    { cwd: consumerWorkerDirectory, encoding: "utf8" },
  ).trim();
}

function consumerRuntimeExportKeys() {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const mod = await import(process.argv[1]); console.log(JSON.stringify(Object.keys(mod).sort()));",
        "@factory/compiler",
      ],
      { cwd: consumerWorkerDirectory, encoding: "utf8" },
    ),
  ) as string[];
}

function privateSeamProbe() {
  const admissionUrl = pathToFileURL(
    fileURLToPath(
      new URL("../dist/appointment-compilation-admission.js", import.meta.url),
    ),
  ).href;
  const compilerUrl = pathToFileURL(
    fileURLToPath(new URL("../dist/index.js", import.meta.url)),
  ).href;
  return execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const admission = await import(process.argv[1]);
try {
  admission.renderAppointmentPageRuntimeForTest({}, undefined, true, "legacy", undefined, undefined, undefined);
} catch (error) {
  console.log("missing:" + error.message);
}
await import(process.argv[2]);
try {
  admission.registerAppointmentPageRuntimeForTest(() => "duplicate");
} catch (error) {
  console.log("repeat:" + error.message);
}`,
      admissionUrl,
      compilerUrl,
    ],
    { cwd: consumerWorkerDirectory, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/);
}

describe("compiler consumer package boundary", () => {
  it("allows the root import and rejects private deep imports", () => {
    const historical = execFileSync(
      "git",
      ["show", `${immutableCompilerParent}:packages/compiler/src/index.ts`],
      { encoding: "utf8" },
    );
    expect(consumerRuntimeExportKeys()).toEqual(
      [...runtimeExportSurface(historical), ...laterRuntimeExports].sort(),
    );
    for (const specifier of [
      "@factory/compiler/dist/appointment-compilation-admission.js",
      "@factory/compiler/package.json",
      "@factory/compiler/src/index.ts",
      "@factory/compiler/src/appointment-compilation-admission.ts",
      "@factory/compiler/appointment-compilation-admission",
    ]) {
      expect(consumerImport(specifier)).toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");
    }
  });

  it("fails closed for missing and repeated private renderer registration", () => {
    expect(privateSeamProbe()).toEqual([
      "missing:Appointment page-runtime facade is unavailable.",
      "repeat:Appointment page-runtime facade is already registered.",
    ]);
  });

  it("registers the actual page-runtime reference exactly once", () => {
    const source = readFileSync(
      new URL("../src/index.ts", import.meta.url),
      "utf8",
    );
    expect(
      source.match(
        /registerAppointmentPageRuntimeForTest\(renderPageRuntime\);/g,
      ),
    ).toHaveLength(1);
  });

  it("preserves the immutable lockfile and only adds the root package export", () => {
    const historicalLock = execFileSync(
      "git",
      ["show", `${immutableCompilerParent}:pnpm-lock.yaml`],
      { encoding: "utf8" },
    );
    expect(
      readFileSync(new URL("../../../pnpm-lock.yaml", import.meta.url), "utf8"),
    ).toBe(historicalLock);
    const currentManifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    const historicalManifest = JSON.parse(
      execFileSync(
        "git",
        ["show", `${immutableCompilerParent}:packages/compiler/package.json`],
        { encoding: "utf8" },
      ),
    ) as Record<string, unknown>;
    const { exports: currentExports, ...currentWithoutExports } =
      currentManifest;
    expect(currentWithoutExports).toEqual(historicalManifest);
    expect(currentExports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
    });
  });
});
