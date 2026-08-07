import { createHash } from "node:crypto";

import { z } from "zod";

/** Dotted capability-family keys (for example `core.crud`), never paths. */
export const capabilityKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$/);

/** Lowercase-first identifiers; camelCase (for example `subjectEntity`) is allowed. */
export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-zA-Z0-9-]*$/);

export const semanticVersionSchema = z
  .string()
  .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/);

export const sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const compositionSurfaceSchema = z.enum([
  "web",
  "api",
  "database",
  "policy",
  "flow",
  "test",
  "documentation",
]);

/**
 * Business text may never smuggle URLs (scheme'd or `www`-prefixed), absolute
 * or Windows paths (even mid-sentence), traversal segments, prototype-key
 * material, or whitespace-only payloads. Scheme-less bare domains without a
 * `www` prefix remain allowed: they are inert text with legitimate placeholder
 * use (for example `example.com` in acceptance scenarios) and cannot be
 * confused with domain-qualified Factory identifiers such as
 * `graph.domain.expense`. Matching is case-insensitive and full-string
 * `constructor`/`prototype` rejections tolerate leading and trailing
 * whitespace (`Constructor`, `"constructor "`, `" prototype"`), while prose
 * that merely mentions the words in context (for example "the prototype
 * journey was reviewed") still passes. A `www` prefix is caught at any
 * non-word boundary (`(www.example.com)`, `;www.x.com`, `https://www.x.com`)
 * but never as a suffix of a larger word (`bwww.example.com` stays allowed).
 * Written as a positive assertion of
 * safety (zod `.regex()` requires the text to match) so the schema stays a
 * ZodString and consumers can still tighten `.max()` length limits.
 */
export const unsafeMaterialPattern =
  /^(?!.*(?:(:\/\/)|(^\s*[\\/])|(\.\.[\\/])|([a-zA-Z]:[\\/])|((?<=\s)[\\/][^\s])|(^\s*$)|(__proto__)|(^\s*(constructor|prototype)\s*$)|((^|[^a-z0-9-])(www\.))))/i;

export const safeBusinessTextSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(unsafeMaterialPattern, {
    message:
      "Business text cannot contain URLs, absolute paths, traversal segments, or prototype-key material.",
  });

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

/** Stable content-addressable digest over canonical key-sorted JSON. */
export function digestJson(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

/** Deep equality over canonical JSON. Array order is meaning. */
export function canonicalEquals(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right))
  );
}

export class CompositionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CompositionError";
  }
}

function walkUnsafeValue(
  value: unknown,
  keyPath: string[],
  fail: (keyPath: string[]) => void,
): void {
  if (typeof value === "string") {
    if (!unsafeMaterialPattern.test(value)) fail(keyPath);
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      walkUnsafeValue(value[index], [...keyPath, String(index)], fail);
    }
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      walkUnsafeValue(child, [...keyPath, key], fail);
    }
  }
}

/**
 * Fails closed when any string leaf of an operation value carries unsafe
 * material (URLs, www hosts, absolute or traversal paths, prototype keys).
 * The error never echoes the offending material itself.
 */
export function assertSafeCompositionOperationValues(
  operations: readonly {
    readonly path?: string;
    readonly value?: unknown;
  }[],
): void {
  for (const operation of operations) {
    if (!("value" in operation) || operation.value === undefined) continue;
    walkUnsafeValue(operation.value, [], (keyPath) => {
      const at = operation.path === undefined ? "" : ` at '${operation.path}'`;
      const inKey = keyPath.length === 0 ? "" : ` in '${keyPath.join(".")}'`;
      throw new CompositionError(
        `Composition operation${at} carries unsafe material${inKey}.`,
      );
    });
  }
}

export function parseStrict<T>(schema: z.ZodType<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof CompositionError) throw error;
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const where = first?.path?.length ? ` at '${first.path.join(".")}'` : "";
      const detail = first ? `: ${first.message}` : "";
      throw new CompositionError(
        `Composition record is invalid${where}${detail}`,
      );
    }
    throw new CompositionError("Composition record is invalid.");
  }
}
