import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { definitionCaseBindings } from "./definition-case-bindings.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keyPattern = /^[a-z][a-z0-9-]{0,127}$/;
const identifierPattern = /^[a-z][a-z0-9._-]{0,127}$/;
const runtimeFamilyPattern = /^[a-z][a-z0-9._/-]{0,127}$/;

class DefinitionCaseIndexError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function fail(code) {
  throw new DefinitionCaseIndexError(code);
}

function assertSafeRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    isAbsolute(value) ||
    value.split(/[\\/]/).includes("..")
  ) {
    fail("definition.case.invalid-path");
  }
}

function normalizedDefinitions(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0)
    fail("definition.catalogue.invalid");
  const seen = new Set();
  return definitions.map((entry) => {
    const definitionKey = entry?.definitionKey;
    if (typeof definitionKey !== "string" || !keyPattern.test(definitionKey))
      fail("definition.catalogue.invalid");
    if (seen.has(definitionKey)) fail("definition.catalogue.duplicate");
    seen.add(definitionKey);
    return definitionKey;
  });
}

export function validateDefinitionCaseBindings(
  definitions,
  bindings,
  { root = repositoryRoot } = {},
) {
  const definitionKeys = normalizedDefinitions(definitions);
  if (!Array.isArray(bindings)) fail("definition.case.missing");

  const registered = new Set(definitionKeys);
  const seenDefinitions = new Set();
  const seenCases = new Set();
  const normalized = bindings.map((entry) => {
    const definitionKey = entry?.definitionKey;
    const caseId = entry?.caseId;
    const runtimeFamily = entry?.runtimeFamily;
    const casePath = entry?.casePath;
    const evidencePath = entry?.evidencePath;
    if (
      typeof definitionKey !== "string" ||
      !keyPattern.test(definitionKey) ||
      !registered.has(definitionKey)
    )
      fail("definition.case.unregistered");
    if (
      typeof caseId !== "string" ||
      !identifierPattern.test(caseId) ||
      typeof runtimeFamily !== "string" ||
      !runtimeFamilyPattern.test(runtimeFamily)
    )
      fail("definition.case.invalid");
    assertSafeRelativePath(casePath);
    assertSafeRelativePath(evidencePath);
    if (seenDefinitions.has(definitionKey) || seenCases.has(caseId))
      fail("definition.case.duplicate");
    seenDefinitions.add(definitionKey);
    seenCases.add(caseId);
    if (!existsSync(resolve(root, casePath)))
      fail("definition.case.missing-file");
    if (!existsSync(resolve(root, evidencePath)))
      fail("definition.case.missing-evidence");
    return Object.freeze({
      definitionKey,
      runtimeFamily,
      caseId,
      casePath,
      evidencePath,
    });
  });

  if (
    bindings.length !== definitionKeys.length ||
    seenDefinitions.size !== registered.size
  )
    fail("definition.case.missing");
  const byKey = new Map(
    normalized.map((entry) => [entry.definitionKey, entry]),
  );
  return Object.freeze(
    definitionKeys.map((definitionKey) => byKey.get(definitionKey)),
  );
}

export function createDefinitionCaseIndex({
  definitions,
  bindings = definitionCaseBindings,
  root = repositoryRoot,
}) {
  const entries = validateDefinitionCaseBindings(definitions, bindings, {
    root,
  });
  return Object.freeze({
    apiVersion: "factory.product-definition-case-index/v1",
    authoritative: false,
    definitions: entries,
  });
}

export function loadDefinitionCaseIndex(root = repositoryRoot) {
  const sourcePath = resolve(
    root,
    "packages/adapters/src/requirements/definitions/product-definitions.v1.json",
  );
  let catalogue;
  try {
    catalogue = JSON.parse(readFileSync(sourcePath, "utf8"));
  } catch {
    fail("definition.catalogue.invalid");
  }
  return createDefinitionCaseIndex({
    definitions: catalogue?.definitions,
    root,
  });
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    process.stderr.write("definition.case-index-failed\n");
    process.exitCode = 1;
  } else {
    try {
      process.stdout.write(`${JSON.stringify(loadDefinitionCaseIndex())}\n`);
    } catch {
      process.stderr.write("definition.case-index-failed\n");
      process.exitCode = 1;
    }
  }
}
