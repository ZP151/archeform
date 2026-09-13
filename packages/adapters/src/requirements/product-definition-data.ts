import { openSync, readSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import {
  graphKeySchema,
  requirementSpecSchema,
  productBlueprintSchema,
} from "@factory/graph";
import { assertRequirementInterpretation } from "./requirement-interpreter.js";
import {
  familyGuideSchemas,
  validateFamilyDefinition,
  semanticFingerprint,
} from "./definition-family-registry.js";

export const MAX_DEFINITION_BYTES = 2 * 1024 * 1024;
const catalogueVersion = "factory.product-definition-catalogue/v1";
export const definitionReasons = [
  "definition.invalid-json",
  "definition.batch-limit",
  "definition.unknown-key",
  "definition.unknown-version",
  "definition.duplicate-key",
  "definition.duplicate-semantics",
  "definition.unknown-family",
  "definition.unsupported-family-version",
  "definition.invalid-binding",
  "definition.invalid-canonical",
  "definition.unsupported-semantics",
  "definition.missing-correction",
  "definition.missing-failure",
  "definition.projection-drift",
  "definition.execution-drift",
] as const;
export type DefinitionReason = (typeof definitionReasons)[number];
class DefinitionDataError extends Error {
  constructor(readonly reason: DefinitionReason) {
    super(reason);
  }
}
function fail(reason: DefinitionReason): never {
  throw new DefinitionDataError(reason);
}
const bindingSchema = z
  .object({ key: z.string().max(128), version: z.string().max(128) })
  .strict();
const jobSchema = z
  .object({
    actorKey: graphKeySchema,
    operation: graphKeySchema,
    entityKey: graphKeySchema,
    successState: graphKeySchema.nullable(),
  })
  .strict();
const stepSchema = z
  .object({
    actorKey: graphKeySchema,
    entityKey: graphKeySchema,
    operation: graphKeySchema,
    fromState: graphKeySchema.nullable(),
    toState: graphKeySchema.nullable(),
    expectation: z.enum([
      "success",
      "denied",
      "validation-error",
      "version-conflict",
      "retry-replay",
      "not-found",
    ]),
  })
  .strict();
const caseSchema = z
  .object({ key: graphKeySchema, steps: z.array(stepSchema).min(1).max(16) })
  .strict();
const safeText = z
  .string()
  .min(1)
  .max(24000)
  .refine((value) => !/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(value));
const entrySchema = z
  .object({
    apiVersion: z.literal("factory.product-definition-data/v1"),
    definitionKey: graphKeySchema,
    definitionVersion: z.literal("1.0.0"),
    familyBinding: bindingSchema,
    parameterPolicy: z.string().max(128),
    primaryJob: jobSchema,
    canonical: z
      .object({
        spec: requirementSpecSchema,
        blueprint: productBlueprintSchema,
      })
      .strict(),
    selection: z
      .object({ providerGuide: z.unknown(), providerInstruction: safeText })
      .strict(),
    journeys: z
      .object({
        correction: z.array(caseSchema).min(1).max(16),
        failure: z.array(caseSchema).min(1).max(16),
      })
      .strict(),
    admissionExpectations: z
      .object({
        capabilityLocks: z
          .array(
            z
              .object({
                key: z.string().min(1).max(128),
                version: z.string().min(1).max(128),
                manifestDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
              })
              .strict(),
          )
          .min(1)
          .max(32),
        presentation: bindingSchema,
        compilerProfile: z.string().min(1).max(128),
      })
      .strict(),
    provenance: z
      .object({
        origin: z.literal("factory-first-party"),
        owner: z.literal("Archeform Product Definition Owner"),
        license: z.literal("UNLICENSED"),
        reviewedOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine(
            (value) =>
              !Number.isNaN(Date.parse(value)) &&
              new Date(value).toISOString().slice(0, 10) === value,
          ),
        decision: z.literal("ADR-0065"),
      })
      .strict(),
  })
  .strict();
export type ProductDefinitionData = Omit<
  z.infer<typeof entrySchema>,
  "selection"
> & {
  selection: {
    providerGuide: Record<string, unknown> & { definitionKey: string };
    providerInstruction: string;
  };
};
export type ProductDefinitionCatalogue = {
  apiVersion: typeof catalogueVersion;
  definitions: ProductDefinitionData[];
};

/** Tokenize the bounded raw document before ordinary parsing. Object frames own decoded key sets. */
function rawJson(bytes: Uint8Array): unknown {
  if (bytes.byteLength > MAX_DEFINITION_BYTES)
    return fail("definition.batch-limit");
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    return fail("definition.invalid-json");
  }
  let index = 0;
  const whitespace = () => {
    while (/[\x20\t\n\r]/.test(source[index] ?? "!") && index < source.length)
      index++;
  };
  const string = (): string => {
    index++;
    let decoded = "";
    const escapes: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    while (index < source.length) {
      const c = source[index++]!;
      if (c === '"') {
        if (
          /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(decoded) ||
          /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(
            decoded,
          )
        )
          return fail("definition.invalid-json");
        return decoded;
      }
      if (c.charCodeAt(0) < 32) return fail("definition.invalid-json");
      if (c === "\\") {
        const escape = source[index++];
        if (escape === "u") {
          const hex = source.slice(index, index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            return fail("definition.invalid-json");
          decoded += String.fromCharCode(Number.parseInt(hex, 16));
          index += 4;
        } else {
          if (escape === undefined || !Object.hasOwn(escapes, escape))
            return fail("definition.invalid-json");
          decoded += escapes[escape];
        }
      } else decoded += c;
    }
    return fail("definition.invalid-json");
  };
  const value = (depth: number): void => {
    if (depth > 64) fail("definition.batch-limit");
    whitespace();
    const c = source[index];
    if (c === '"') {
      string();
      return;
    }
    if (c === "{" || c === "[") {
      index++;
      whitespace();
      const object = c === "{",
        end = object ? "}" : "]",
        keys = new Set<string>();
      if (source[index] === end) {
        index++;
        return;
      }
      for (;;) {
        if (object) {
          if (source[index] !== '"') fail("definition.invalid-json");
          const key = string();
          if (keys.has(key)) fail("definition.invalid-json");
          keys.add(key);
          whitespace();
          if (source[index++] !== ":") fail("definition.invalid-json");
        }
        value(depth + 1);
        whitespace();
        const next = source[index++];
        if (next === end) return;
        if (next !== ",") fail("definition.invalid-json");
        whitespace();
      }
    }
    const token =
      /^(?:null|true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(
        source.slice(index),
      )?.[0];
    if (!token) fail("definition.invalid-json");
    index += token.length;
    if (
      !["null", "true", "false"].includes(token) &&
      !Number.isFinite(Number(token))
    )
      fail("definition.invalid-json");
  };
  value(0);
  whitespace();
  if (index !== source.length) fail("definition.invalid-json");
  try {
    return JSON.parse(source);
  } catch {
    return fail("definition.invalid-json");
  }
}
function envelope(bytes: Uint8Array): unknown[] {
  const data = rawJson(bytes);
  const parsed = z
    .object({
      apiVersion: z.literal(catalogueVersion),
      definitions: z.array(z.unknown()).min(1).max(100),
    })
    .strict()
    .safeParse(data);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.code === "unrecognized_keys"))
      fail("definition.unknown-key");
    if (parsed.error.issues.some((i) => i.path[0] === "apiVersion"))
      fail("definition.unknown-version");
    fail("definition.batch-limit");
  }
  return parsed.data.definitions;
}
function parseEntry(input: unknown): ProductDefinitionData {
  const result = entrySchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues;
    if (issues.some((i) => i.code === "unrecognized_keys"))
      fail("definition.unknown-key");
    if (
      issues.some(
        (i) => i.path[0] === "apiVersion" || i.path[0] === "definitionVersion",
      )
    )
      fail("definition.unknown-version");
    if (
      issues.some((i) => i.path[0] === "journeys" && i.path[1] === "correction")
    )
      fail("definition.missing-correction");
    if (issues.some((i) => i.path[0] === "journeys" && i.path[1] === "failure"))
      fail("definition.missing-failure");
    fail("definition.invalid-canonical");
  }
  const entry = result.data;
  if (!Object.hasOwn(familyGuideSchemas, entry.familyBinding.key))
    fail("definition.unknown-family");
  const schema =
    familyGuideSchemas[
      entry.familyBinding.key as keyof typeof familyGuideSchemas
    ];
  const guide = schema.safeParse(entry.selection.providerGuide);
  if (!guide.success) {
    if (guide.error.issues.some((i) => i.code === "unrecognized_keys"))
      fail("definition.unknown-key");
    fail("definition.invalid-canonical");
  }
  try {
    assertRequirementInterpretation({ ...entry.canonical, clarifications: [] });
  } catch {
    fail("definition.invalid-canonical");
  }
  // Preserve original member order: legacy guide/instruction hashes are ordered JSON.
  return {
    ...entry,
    selection: {
      ...entry.selection,
      providerGuide: structuredClone(
        entry.selection.providerGuide,
      ) as ProductDefinitionData["selection"]["providerGuide"],
    },
  };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
export function parseProductDefinitionCatalogue(
  bytes: Uint8Array,
): ProductDefinitionCatalogue {
  const definitions = envelope(bytes).map(parseEntry);
  for (const entry of definitions) {
    const reasons = validateFamilyDefinition(entry);
    if (reasons.length) fail(reasons[0]!);
  }
  const keys = new Set<string>(),
    fingerprints = new Set<string>();
  for (const entry of definitions) {
    if (keys.has(entry.definitionKey)) fail("definition.duplicate-key");
    keys.add(entry.definitionKey);
    const fingerprint = semanticFingerprint(entry);
    if (fingerprints.has(fingerprint)) fail("definition.duplicate-semantics");
    fingerprints.add(fingerprint);
  }
  return freeze({ apiVersion: catalogueVersion, definitions });
}
export function readShippedDefinitionBytes(): Buffer {
  const descriptor = openSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "definitions",
      "product-definitions.v1.json",
    ),
    "r",
  );
  try {
    const bytes = Buffer.alloc(MAX_DEFINITION_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = readSync(descriptor, bytes, size, bytes.length - size, null);
      if (read === 0) break;
      size += read;
    }
    return bytes.subarray(0, size);
  } finally {
    closeSync(descriptor);
  }
}
let shipped: ProductDefinitionCatalogue | undefined;
export function loadProductDefinitionData(): ProductDefinitionCatalogue {
  return (shipped ??= parseProductDefinitionCatalogue(
    readShippedDefinitionBytes(),
  ));
}
export type DefinitionReportEntry = {
  index: number;
  definitionKey?: string;
  fingerprint?: string;
  verdict: "admitted" | "rejected";
  reasons: DefinitionReason[];
};
export type DefinitionValidationReport = {
  apiVersion: "factory.product-definition-validation-report/v1";
  attempted: number;
  valid: number;
  distinct: number;
  admitted: number;
  durationMs: number;
  entries: DefinitionReportEntry[];
  reasonCounts: Partial<Record<DefinitionReason, number>>;
};
/** Candidate bytes never become runtime catalogue entries. Trusted membership requires exact data equality. */
export function validateDefinitionBatch(
  bytes: Uint8Array,
): DefinitionValidationReport {
  const started = performance.now();
  const report: DefinitionValidationReport = {
    apiVersion: "factory.product-definition-validation-report/v1",
    attempted: 0,
    valid: 0,
    distinct: 0,
    admitted: 0,
    durationMs: 0,
    entries: [],
    reasonCounts: {},
  };
  let inputs: unknown[];
  try {
    inputs = envelope(bytes);
  } catch (error) {
    if (!(error instanceof DefinitionDataError)) throw error;
    report.reasonCounts[error.reason] = 1;
    report.durationMs = Math.round(performance.now() - started);
    return report;
  }
  report.attempted = inputs.length;
  const parsed = new Map<number, ProductDefinitionData>();
  for (const [index, input] of inputs.entries()) {
    const key = graphKeySchema.safeParse(
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>).definitionKey
        : undefined,
    );
    const row: DefinitionReportEntry = {
      index,
      ...(key.success ? { definitionKey: key.data } : {}),
      verdict: "rejected",
      reasons: [],
    };
    report.entries.push(row);
    try {
      const entry = parseEntry(input);
      report.valid++;
      parsed.set(index, entry);
      row.reasons.push(...validateFamilyDefinition(entry));
      if (!row.reasons.length) row.fingerprint = semanticFingerprint(entry);
    } catch (error) {
      if (!(error instanceof DefinitionDataError)) throw error;
      row.reasons.push(error.reason);
    }
  }
  for (const row of report.entries) {
    if (
      row.definitionKey &&
      report.entries.filter((e) => e.definitionKey === row.definitionKey)
        .length > 1
    )
      row.reasons.push("definition.duplicate-key");
    if (
      row.fingerprint &&
      report.entries.some(
        (e) =>
          e.index !== row.index &&
          e.definitionKey !== row.definitionKey &&
          e.fingerprint === row.fingerprint,
      )
    )
      row.reasons.push("definition.duplicate-semantics");
  }
  const trusted = loadProductDefinitionData().definitions;
  for (const row of report.entries) {
    if (row.fingerprint && !row.reasons.length) {
      report.distinct++;
      const entry = parsed.get(row.index)!;
      if (trusted.some((value) => isDeepStrictEqual(value, entry))) {
        row.verdict = "admitted";
        report.admitted++;
      } else row.reasons.push("definition.unsupported-semantics");
    }
    row.reasons = [...new Set(row.reasons)].sort();
    for (const reason of row.reasons)
      report.reasonCounts[reason] = (report.reasonCounts[reason] ?? 0) + 1;
  }
  report.reasonCounts = Object.fromEntries(
    Object.entries(report.reasonCounts).sort(),
  ) as DefinitionValidationReport["reasonCounts"];
  report.durationMs = Math.round(performance.now() - started);
  return report;
}
