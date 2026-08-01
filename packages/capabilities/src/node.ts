import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { z } from "zod";

import type {
  CapabilityAssetManifestV1,
  CapabilityAssetV1,
  CapabilityExecutableContributionV1,
  CapabilityGraphContributionV1,
  CapabilityOutputSlot,
  CapabilityTemplateContributionV1,
} from "./assets/index.js";
import {
  assertCapabilityAssetSelectable,
  captureCapabilityCompositionLock,
  type CapabilityCompositionLockV1,
  type CreateCapabilityCompositionLockInput,
} from "./composition.js";
import { resolveCapabilityAssetLock } from "./index.js";

export interface ResolvedCapabilityAssetTemplate {
  readonly assetKey: string;
  readonly assetVersion: string;
  readonly source: string;
  readonly target: string;
  readonly outputSlot: CapabilityTemplateContributionV1["outputSlot"];
  readonly digest: string;
  readonly content: string;
}

export interface ResolvedCapabilityAssetContribution {
  readonly assetKey: string;
  readonly assetVersion: string;
  readonly namespace: string;
  readonly source: string;
  readonly target: string;
  readonly outputSlot: CapabilityExecutableContributionV1["outputSlot"];
  readonly digest: string;
  readonly content: string;
  readonly targetRuntimeInterfaceVersion: string;
}

const targetPrefixes = {
  "api.runtime": ["api/src/capabilities/"],
  "web.component": ["web/src/components/"],
  "web.route": ["web/src/app/"],
  "web.navigation": ["web/src/navigation/"],
  "api.router": ["api/src/routes/"],
  "api.service": ["api/src/services/"],
  "database.schema": ["database/prisma/fragments/"],
  "database.migration": ["database/prisma/migrations/"],
  "flow.handler": ["api/src/flows/handlers/"],
  "policy.rule": ["api/policy/fragments/"],
  "test.fixture": ["api/test/fixtures/"],
  "test.journey": ["api/test/journeys/"],
  "docs.section": ["docs/generated/"],
} as const satisfies Partial<Record<CapabilityOutputSlot, readonly string[]>>;

const legacyTemplateTargetPrefixes: Readonly<
  Partial<Record<CapabilityOutputSlot, readonly string[]>>
> = {
  "api.runtime": ["api/src/capabilities/"],
};

const additiveGraphCollections: Readonly<
  Partial<Record<CapabilityGraphContributionV1["model"], readonly string[]>>
> = {
  page: ["pages", "navigation"],
  domain: ["entities", "relations", "seedData"],
  policy: ["roles", "permissions"],
  flow: ["flows"],
  integration: ["providers", "capabilities"],
};

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const packageKeySchema = z.string().regex(/^[a-z][a-z0-9.-]*$/);
const contributionIdSchema = z.string().regex(/^[a-z][a-z0-9.-]*$/);
const parameterKeySchema = z.string().regex(/^[a-z][a-zA-Z0-9]*$/);
const outputSlotSchema = z.enum([
  "api.runtime",
  "api.command",
  "api.router",
  "api.service",
  "database.schema",
  "database.migration",
  "page.block",
  "policy.rule",
  "test.fixture",
  "test.journey",
  "flow.effect",
  "flow.handler",
  "web.customer",
  "web.merchant",
  "web.component",
  "web.route",
  "web.navigation",
  "report.read-model",
  "realtime.event",
  "docs.section",
]);
const runtimeHandlerSchema = z.enum([
  "record",
  "workflow",
  "cart",
  "catalog",
  "catalogConfiguration",
  "order",
  "transaction",
  "effect",
]);
const templateContributionSchema = z
  .object({
    id: contributionIdSchema,
    source: z.string().min(1),
    target: z.string().min(1),
    outputSlot: outputSlotSchema,
    digest: digestSchema,
  })
  .strict();
const parameterSchema = z
  .object({
    key: parameterKeySchema,
    type: z.enum(["string", "number", "boolean", "graph-symbol"]),
    required: z.boolean(),
  })
  .strict();
const graphContributionSchema = z
  .object({
    id: contributionIdSchema,
    model: z.enum([
      "page",
      "domain",
      "policy",
      "flow",
      "integration",
      "experience",
    ]),
    collection: z.string().min(1),
    operation: z.enum(["append", "extend"]),
    parameterRefs: z.array(parameterKeySchema),
    digest: digestSchema,
  })
  .strict();
const executableContributionSchema = z
  .object({
    id: contributionIdSchema,
    outputSlot: outputSlotSchema,
    namespace: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    parameterRefs: z.array(parameterKeySchema),
    targetRuntimeInterfaceVersion: z
      .string()
      .regex(/^[a-z][a-z0-9.-]*\/v[1-9][0-9]*$/),
    orderingRequirements: z.array(contributionIdSchema),
    mergeProtocol: z.enum(["replace-file", "append-fragment"]),
    digest: digestSchema,
  })
  .strict();
const capabilityManifestSchema = z
  .object({
    apiVersion: z.literal("factory.capability/v1"),
    key: packageKeySchema,
    version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/),
    category: z.enum(["core", "commerce", "restaurant"]),
    name: z.string().min(1),
    description: z.string().min(1),
    packageRoot: z.string().min(1),
    manifestDigest: digestSchema,
    lifecycle: z.literal("golden"),
    bindingContract: z.literal("factory.capability-binding/v1").optional(),
    profiles: z.array(
      z.enum([
        "expense-approval",
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ]),
    ),
    effects: z.array(z.string().min(1)),
    inputSchema: z.array(
      z
        .object({
          key: z.string().min(1),
          type: z.string().min(1),
          required: z.boolean(),
        })
        .strict(),
    ),
    outputSlots: z.array(outputSlotSchema),
    runtimeHandlers: z.array(runtimeHandlerSchema).optional(),
    templates: z.array(templateContributionSchema),
    parameters: z.array(parameterSchema).optional(),
    graphContributions: z.array(graphContributionSchema).optional(),
    executableContributions: z.array(executableContributionSchema).optional(),
    requires: z
      .array(
        z
          .object({
            interfaceKey: z.string().min(1),
            version: z.string().min(1),
            multiProvider: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
    provides: z
      .array(
        z
          .object({
            interfaceKey: z.string().min(1),
            version: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
    verification: z
      .object({
        fixture: z.string().min(1),
        fixtureDigest: digestSchema.optional(),
        contractTest: z.string().min(1),
        contractTestDigest: digestSchema.optional(),
        status: z.literal("verified"),
      })
      .strict(),
  })
  .strict();
const adapterSchema = z
  .object({
    apiVersion: z.literal("factory.adapter/v1"),
    kind: z.literal("declarative"),
    outputSlots: z.array(outputSlotSchema),
    runtimeHandlers: z.array(runtimeHandlerSchema).optional(),
    templates: z.array(templateContributionSchema),
    parameters: z.array(parameterSchema).optional(),
    graphContributions: z.array(graphContributionSchema).optional(),
    executableContributions: z.array(executableContributionSchema).optional(),
    contributes: z.object({ effects: z.array(z.string().min(1)) }).strict(),
    disable: z
      .object({
        removeIntegrationCapabilities: z.array(z.string().min(1)),
        removePolicyActions: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(content: string | Buffer): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function safePackageRelativePath(path: string): boolean {
  const segments = path.split("/");
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        /[:\u0000-\u001f\u007f]/.test(segment) ||
        /[. ]$/.test(segment) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment),
    )
  );
}

function insideRoot(root: string, path: string): boolean {
  const relationship = relative(root, path);
  return (
    relationship.length > 0 &&
    relationship !== ".." &&
    !relationship.startsWith(`..${sep}`) &&
    !isAbsolute(relationship)
  );
}

function regularFileWithin(root: string, path: string): boolean {
  try {
    if (lstatSync(path).isSymbolicLink()) return false;
    const realRoot = realpathSync(root);
    const realPath = realpathSync(path);
    return insideRoot(realRoot, realPath) && statSync(realPath).isFile();
  } catch {
    return false;
  }
}

function templateTargetPrefixesFor(
  outputSlot: CapabilityOutputSlot,
): readonly string[] | undefined {
  return (
    (
      targetPrefixes as Partial<Record<CapabilityOutputSlot, readonly string[]>>
    )[outputSlot] ?? legacyTemplateTargetPrefixes[outputSlot]
  );
}

function assertDeclaredParameterReferences(
  contributionType: "Graph" | "executable",
  contribution: {
    readonly id: string;
    readonly parameterRefs: readonly string[];
  },
  declaredParameters: ReadonlySet<string>,
): void {
  for (const parameterRef of contribution.parameterRefs) {
    if (!declaredParameters.has(parameterRef)) {
      throw new Error(
        `Capability ${contributionType} contribution '${contribution.id}' references undeclared parameter '${parameterRef}'.`,
      );
    }
  }
}

function assertGraphContribution(
  contribution: CapabilityGraphContributionV1,
  declaredParameters: ReadonlySet<string>,
): void {
  assertDeclaredParameterReferences("Graph", contribution, declaredParameters);
  const collections = additiveGraphCollections[contribution.model];
  if (!collections?.includes(contribution.collection)) {
    throw new Error(
      `Capability Graph contribution '${contribution.id}' collection '${contribution.model}.${contribution.collection}' is not an allowed additive collection.`,
    );
  }
  const { digest: _digest, ...unsignedContribution } = contribution;
  if (sha256(canonicalJson(unsignedContribution)) !== contribution.digest) {
    throw new Error(
      `Capability Graph contribution '${contribution.id}' digest does not match.`,
    );
  }
}

function assertExecutableContribution(
  contribution: CapabilityExecutableContributionV1,
  manifest: CapabilityAssetManifestV1,
  packageRoot: string,
): ResolvedCapabilityAssetContribution {
  if (!safePackageRelativePath(contribution.source)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' has an unsafe source path.`,
    );
  }
  if (!safePackageRelativePath(contribution.target)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' has an unsafe target path.`,
    );
  }
  if (!manifest.outputSlots.includes(contribution.outputSlot)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' uses undeclared output slot '${contribution.outputSlot}'.`,
    );
  }
  const prefixes = (
    targetPrefixes as Partial<Record<CapabilityOutputSlot, readonly string[]>>
  )[contribution.outputSlot];
  if (!prefixes?.some((prefix) => contribution.target.startsWith(prefix))) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' targets '${contribution.target}' outside '${contribution.outputSlot}'.`,
    );
  }
  const namespacePath = contribution.namespace.endsWith("/")
    ? contribution.namespace.slice(0, -1)
    : contribution.namespace;
  const namespacePrefix = `packages/${manifest.key}/`;
  if (
    !safePackageRelativePath(namespacePath) ||
    !contribution.namespace.startsWith(namespacePrefix)
  ) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' namespace '${contribution.namespace}' is outside declared namespace '${namespacePrefix}'.`,
    );
  }
  assertDeclaredParameterReferences(
    "executable",
    contribution,
    new Set((manifest.parameters ?? []).map(({ key }) => key)),
  );
  const sourcePath = resolve(packageRoot, contribution.source);
  if (!insideRoot(packageRoot, sourcePath)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' escapes its package.`,
    );
  }
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' is missing from its package.`,
    );
  }
  if (!regularFileWithin(packageRoot, sourcePath)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' source escapes its package or is not a regular file.`,
    );
  }
  const content = readFileSync(sourcePath, "utf8");
  if (sha256(content) !== contribution.digest) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' digest does not match.`,
    );
  }
  return {
    assetKey: manifest.key,
    assetVersion: manifest.version,
    namespace: contribution.namespace,
    source: contribution.source,
    target: contribution.target,
    outputSlot: contribution.outputSlot,
    digest: contribution.digest,
    content,
    targetRuntimeInterfaceVersion: contribution.targetRuntimeInterfaceVersion,
  };
}

function assertTemplateContribution(
  template: CapabilityTemplateContributionV1,
  packageRoot: string,
): ResolvedCapabilityAssetTemplate {
  if (!safePackageRelativePath(template.source)) {
    throw new Error(
      `Capability template '${template.id}' has an unsafe source path.`,
    );
  }
  if (!safePackageRelativePath(template.target)) {
    throw new Error(
      `Capability template '${template.id}' has an unsafe target path.`,
    );
  }
  const prefixes = templateTargetPrefixesFor(template.outputSlot);
  if (!prefixes?.some((prefix) => template.target.startsWith(prefix))) {
    throw new Error(
      `Capability template '${template.id}' targets '${template.target}' outside '${template.outputSlot}'.`,
    );
  }
  const sourcePath = resolve(packageRoot, template.source);
  if (!sourcePath.startsWith(`${packageRoot}${sep}`)) {
    throw new Error(
      `Capability template '${template.id}' escapes its package.`,
    );
  }
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Capability template '${template.id}' is missing from its package.`,
    );
  }
  if (!regularFileWithin(packageRoot, sourcePath)) {
    throw new Error(
      `Capability template '${template.id}' source escapes its package or is not a regular file.`,
    );
  }
  const content = readFileSync(sourcePath, "utf8");
  if (sha256(content) !== template.digest) {
    throw new Error(
      `Capability template '${template.id}' digest does not match.`,
    );
  }
  return {
    assetKey: "",
    assetVersion: "",
    source: template.source,
    target: template.target,
    outputSlot: template.outputSlot,
    digest: template.digest,
    content,
  };
}

interface ExplicitIndexNameScan {
  readonly names: readonly string[];
  readonly invalid: boolean;
}

function balancedPrismaArgumentsEnd(
  content: string,
  openIndex: number,
): number | undefined {
  const delimiters: string[] = [];
  let quote: '"' | "'" | undefined;
  let escaped = false;
  for (let index = openIndex; index < content.length; index += 1) {
    const character = content[index]!;
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(" || character === "[" || character === "{") {
      delimiters.push(character);
    } else if (character === ")" || character === "]" || character === "}") {
      const expectedOpen =
        character === ")" ? "(" : character === "]" ? "[" : "{";
      if (delimiters.pop() !== expectedOpen) return undefined;
      if (delimiters.length === 0) return index;
    }
  }
  return undefined;
}

function prismaExplicitMapName(argumentsContent: string): {
  readonly name?: string;
  readonly invalid: boolean;
} {
  const delimiters: string[] = [];
  let cursor = 0;
  let name: string | undefined;
  while (cursor < argumentsContent.length) {
    const character = argumentsContent[cursor]!;
    if (character === '"' || character === "'") {
      const quote = character;
      cursor += 1;
      let escaped = false;
      let closed = false;
      while (cursor < argumentsContent.length) {
        const quotedCharacter = argumentsContent[cursor]!;
        cursor += 1;
        if (escaped) {
          escaped = false;
        } else if (quotedCharacter === "\\") {
          escaped = true;
        } else if (quotedCharacter === quote) {
          closed = true;
          break;
        }
      }
      if (!closed) return { invalid: true };
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      delimiters.push(character);
      cursor += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      const expectedOpen =
        character === ")" ? "(" : character === "]" ? "[" : "{";
      if (delimiters.pop() !== expectedOpen) return { invalid: true };
      cursor += 1;
      continue;
    }
    if (delimiters.length > 0 || !/[A-Za-z_]/.test(character)) {
      cursor += 1;
      continue;
    }
    const wordStart = cursor;
    while (/[A-Za-z0-9_]/.test(argumentsContent[cursor] ?? "")) cursor += 1;
    if (argumentsContent.slice(wordStart, cursor) !== "map") continue;
    while (/\s/.test(argumentsContent[cursor] ?? "")) cursor += 1;
    if (argumentsContent[cursor] !== ":") return { invalid: true };
    cursor += 1;
    while (/\s/.test(argumentsContent[cursor] ?? "")) cursor += 1;
    if (argumentsContent[cursor] !== '"') return { invalid: true };
    const literalStart = cursor;
    cursor += 1;
    let escaped = false;
    let closed = false;
    while (cursor < argumentsContent.length) {
      const literalCharacter = argumentsContent[cursor]!;
      cursor += 1;
      if (escaped) {
        escaped = false;
      } else if (literalCharacter === "\\") {
        escaped = true;
      } else if (literalCharacter === '"') {
        closed = true;
        break;
      }
    }
    if (!closed || name !== undefined) return { invalid: true };
    try {
      name = JSON.parse(argumentsContent.slice(literalStart, cursor)) as string;
    } catch {
      return { invalid: true };
    }
  }
  return delimiters.length === 0 ? { name, invalid: false } : { invalid: true };
}

function prismaExplicitIndexNames(content: string): ExplicitIndexNameScan {
  const names: string[] = [];
  let invalid = false;
  let cursor = 0;
  while (cursor < content.length) {
    const declarationIndex = content.indexOf("@@index", cursor);
    if (declarationIndex === -1) break;
    cursor = declarationIndex + "@@index".length;
    if (/\w/.test(content[cursor] ?? "")) continue;
    while (/\s/.test(content[cursor] ?? "")) cursor += 1;
    if (content[cursor] !== "(") {
      invalid = true;
      continue;
    }
    const closeIndex = balancedPrismaArgumentsEnd(content, cursor);
    if (closeIndex === undefined) {
      invalid = true;
      break;
    }
    const argumentsContent = content.slice(cursor + 1, closeIndex);
    const mapScan = prismaExplicitMapName(argumentsContent);
    if (mapScan.invalid) {
      invalid = true;
    } else if (mapScan.name !== undefined) {
      names.push(mapScan.name);
    }
    cursor = closeIndex + 1;
  }
  return { names, invalid };
}

interface SqlToken {
  readonly kind: "word" | "quoted-identifier" | "symbol";
  readonly value: string;
}

function sqlCodePoint(content: string, index: number): string {
  const codePoint = content.codePointAt(index);
  return codePoint === undefined ? "" : String.fromCodePoint(codePoint);
}

function sqlTokens(content: string): {
  readonly tokens: readonly SqlToken[];
  readonly invalid: boolean;
} {
  const tokens: SqlToken[] = [];
  let invalid = false;
  let cursor = 0;
  while (cursor < content.length) {
    const character = sqlCodePoint(content, cursor);
    if (/\s/u.test(character)) {
      cursor += character.length;
      continue;
    }
    if (content.startsWith("--", cursor)) {
      const newline = content.indexOf("\n", cursor + 2);
      cursor = newline === -1 ? content.length : newline + 1;
      continue;
    }
    if (content.startsWith("/*", cursor)) {
      const close = content.indexOf("*/", cursor + 2);
      if (close === -1) invalid = true;
      cursor = close === -1 ? content.length : close + 2;
      continue;
    }
    const dollarQuote = content
      .slice(cursor)
      .match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
    if (dollarQuote) {
      const close = content.indexOf(dollarQuote, cursor + dollarQuote.length);
      if (close === -1) invalid = true;
      cursor = close === -1 ? content.length : close + dollarQuote.length;
      continue;
    }
    if (character === "'") {
      let closed = false;
      cursor += 1;
      while (cursor < content.length) {
        if (content[cursor] !== "'") {
          cursor += sqlCodePoint(content, cursor).length;
        } else if (content[cursor + 1] === "'") {
          cursor += 2;
        } else {
          cursor += 1;
          closed = true;
          break;
        }
      }
      if (!closed) invalid = true;
      continue;
    }
    if (character === '"') {
      let value = "";
      let closed = false;
      cursor += 1;
      while (cursor < content.length) {
        if (content[cursor] !== '"') {
          const identifierCharacter = sqlCodePoint(content, cursor);
          value += identifierCharacter;
          cursor += identifierCharacter.length;
        } else if (content[cursor + 1] === '"') {
          value += '"';
          cursor += 2;
        } else {
          cursor += 1;
          closed = true;
          break;
        }
      }
      if (!closed) invalid = true;
      tokens.push({ kind: "quoted-identifier", value });
      continue;
    }
    if (/[\p{L}\p{Nl}_]/u.test(character)) {
      let value = character;
      cursor += character.length;
      while (cursor < content.length) {
        const identifierCharacter = sqlCodePoint(content, cursor);
        if (!/[\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}_$]/u.test(identifierCharacter)) {
          break;
        }
        value += identifierCharacter;
        cursor += identifierCharacter.length;
      }
      tokens.push({ kind: "word", value });
      continue;
    }
    tokens.push({ kind: "symbol", value: character });
    cursor += character.length;
  }
  return { tokens, invalid };
}

function sqlExplicitIndexNames(content: string): ExplicitIndexNameScan {
  const tokenScan = sqlTokens(content);
  const { tokens } = tokenScan;
  const names: string[] = [];
  let invalid = tokenScan.invalid;
  const keyword = (token: SqlToken | undefined, value: string): boolean =>
    token?.kind === "word" && token.value.toLowerCase() === value;
  for (let cursor = 0; cursor < tokens.length; cursor += 1) {
    if (!keyword(tokens[cursor], "create")) continue;
    let next = cursor + 1;
    if (keyword(tokens[next], "unique")) next += 1;
    if (!keyword(tokens[next], "index")) continue;
    next += 1;
    if (keyword(tokens[next], "concurrently")) next += 1;
    if (keyword(tokens[next], "if")) {
      if (
        !keyword(tokens[next + 1], "not") ||
        !keyword(tokens[next + 2], "exists")
      ) {
        invalid = true;
        continue;
      }
      next += 3;
    }
    const name = tokens[next];
    if (!name || (name.kind !== "word" && name.kind !== "quoted-identifier")) {
      invalid = true;
      continue;
    }
    if (name.value.length === 0) {
      invalid = true;
      continue;
    }
    names.push(name.kind === "word" ? name.value.toLowerCase() : name.value);
  }
  return { names, invalid };
}

function validateTransactionV2PostgresIndexNames(
  manifest: CapabilityAssetManifestV1,
  resolvedContributions: readonly ResolvedCapabilityAssetContribution[],
): readonly string[] {
  const transactionV2 = (manifest.provides ?? []).some(
    ({ interfaceKey, version }) =>
      interfaceKey === "factory.transaction-executor" && version === "v2",
  );
  if (!transactionV2) return [];

  const declaredDatabaseContributions = (
    manifest.executableContributions ?? []
  ).filter(
    ({ outputSlot }) =>
      outputSlot === "database.schema" || outputSlot === "database.migration",
  );
  const resolvedDatabaseContributions = resolvedContributions.filter(
    ({ outputSlot }) =>
      outputSlot === "database.schema" || outputSlot === "database.migration",
  );
  if (
    declaredDatabaseContributions.length !==
    resolvedDatabaseContributions.length
  ) {
    return [];
  }

  const schemaScans = resolvedDatabaseContributions
    .filter(({ outputSlot }) => outputSlot === "database.schema")
    .map(({ content }) => prismaExplicitIndexNames(content));
  const migrationScans = resolvedDatabaseContributions
    .filter(({ outputSlot }) => outputSlot === "database.migration")
    .map(({ content }) => sqlExplicitIndexNames(content));
  const schemaNames = schemaScans.flatMap(({ names }) => names).sort();
  const migrationNames = migrationScans.flatMap(({ names }) => names).sort();
  const invalid: string[] = [];
  if (schemaScans.some((scan) => scan.invalid)) {
    invalid.push("Prisma index declaration could not be parsed");
  }
  if (migrationScans.some((scan) => scan.invalid)) {
    invalid.push("SQL index declaration could not be parsed");
  }
  if (canonicalJson(schemaNames) !== canonicalJson(migrationNames)) {
    invalid.push("PostgreSQL index names differ between schema and migration");
  }
  const names = new Set([...schemaNames, ...migrationNames]);
  if ([...names].some((name) => !/^[\x00-\x7f]+$/.test(name))) {
    invalid.push("PostgreSQL index identifier must be ASCII");
  }
  if ([...names].some((name) => Buffer.byteLength(name, "utf8") > 63)) {
    invalid.push("PostgreSQL index identifier exceeds 63 bytes");
  }
  return invalid;
}

export function capabilityManifestPayload(
  manifest: CapabilityAssetManifestV1,
): string {
  const { manifestDigest: _manifestDigest, ...unsignedManifest } = manifest;
  return canonicalJson(unsignedManifest);
}

export function capabilityManifestDigest(
  manifest: CapabilityAssetManifestV1,
): string {
  return `sha256:${createHash("sha256")
    .update(capabilityManifestPayload(manifest))
    .digest("hex")}`;
}

export function verifyCapabilityAssetDigest(asset: CapabilityAssetV1): boolean {
  return (
    capabilityManifestDigest(asset.manifest) === asset.manifest.manifestDigest
  );
}

export function verifyCapabilityAssetPackage(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): string[] {
  let resolvedRepositoryRoot: string;
  try {
    resolvedRepositoryRoot = realpathSync(resolve(repositoryRoot));
    if (!statSync(resolvedRepositoryRoot).isDirectory()) {
      return ["repositoryRoot: not a directory"];
    }
  } catch {
    return ["repositoryRoot: missing"];
  }
  if (!safePackageRelativePath(asset.manifest.packageRoot)) {
    return ["packageRoot: unsafe package path"];
  }
  const lexicalPackageRoot = resolve(
    resolvedRepositoryRoot,
    asset.manifest.packageRoot,
  );
  if (!insideRoot(resolvedRepositoryRoot, lexicalPackageRoot)) {
    return ["packageRoot: escapes repository"];
  }
  if (!existsSync(lexicalPackageRoot)) {
    return ["packageRoot: missing"];
  }
  let packageRoot: string;
  try {
    if (lstatSync(lexicalPackageRoot).isSymbolicLink()) {
      return ["packageRoot: unsafe physical path"];
    }
    packageRoot = realpathSync(lexicalPackageRoot);
    if (
      !insideRoot(resolvedRepositoryRoot, packageRoot) ||
      !statSync(packageRoot).isDirectory()
    ) {
      return ["packageRoot: unsafe physical path"];
    }
  } catch {
    return ["packageRoot: unsafe physical path"];
  }
  const requiredPackageFiles = ["component.json", "adapter.json"];
  const missing = requiredPackageFiles.filter(
    (relativePath) => !existsSync(resolve(packageRoot, relativePath)),
  );
  if (missing.length) return missing;
  const unsafePackageFiles = requiredPackageFiles.filter(
    (relativePath) =>
      !regularFileWithin(packageRoot, resolve(packageRoot, relativePath)),
  );
  if (unsafePackageFiles.length) {
    return unsafePackageFiles.map(
      (relativePath) => `${relativePath}: unsafe physical file`,
    );
  }

  const invalid: string[] = [];
  let componentInput: unknown;
  let adapterInput: unknown;
  try {
    componentInput = JSON.parse(
      readFileSync(resolve(packageRoot, "component.json"), "utf8"),
    );
  } catch {
    invalid.push("component.json: invalid JSON");
  }
  try {
    adapterInput = JSON.parse(
      readFileSync(resolve(packageRoot, "adapter.json"), "utf8"),
    );
  } catch {
    invalid.push("adapter.json: invalid JSON");
  }
  if (
    adapterInput &&
    typeof adapterInput === "object" &&
    "source" in adapterInput
  ) {
    invalid.push("adapter.json: external source");
  }
  const componentResult = capabilityManifestSchema.safeParse(componentInput);
  const adapterResult = adapterSchema.safeParse(adapterInput);
  if (!componentResult.success) invalid.push("component.json: schema");
  if (!adapterResult.success) invalid.push("adapter.json: schema");
  if (!componentResult.success || !adapterResult.success) return invalid;
  const component = componentResult.data as CapabilityAssetManifestV1;
  const adapter = adapterResult.data;

  const evidenceDigestsDeclared =
    component.verification.fixtureDigest !== undefined ||
    component.verification.contractTestDigest !== undefined;
  if (
    evidenceDigestsDeclared &&
    (component.verification.fixtureDigest === undefined ||
      component.verification.contractTestDigest === undefined)
  ) {
    invalid.push(
      "verification evidence digest: fixture and contract test digests must be declared together",
    );
  }
  for (const [evidenceType, relativePath, expectedDigest] of [
    [
      "fixture",
      component.verification.fixture,
      component.verification.fixtureDigest,
    ],
    [
      "contract test",
      component.verification.contractTest,
      component.verification.contractTestDigest,
    ],
  ] as const) {
    if (!safePackageRelativePath(relativePath)) {
      invalid.push(`verification: unsafe ${evidenceType} path`);
      continue;
    }
    const evidencePath = resolve(packageRoot, relativePath);
    if (!insideRoot(packageRoot, evidencePath)) {
      invalid.push(`verification: ${evidenceType} escapes package`);
    } else if (!existsSync(evidencePath)) {
      invalid.push(relativePath);
    } else if (!regularFileWithin(packageRoot, evidencePath)) {
      invalid.push(
        `verification: ${evidenceType} is not a regular package file`,
      );
    } else if (evidenceDigestsDeclared) {
      const content = readFileSync(evidencePath);
      if (expectedDigest === undefined || sha256(content) !== expectedDigest) {
        invalid.push(
          `verification evidence digest: ${evidenceType} does not match`,
        );
      }
      let decodedEvidence: string | undefined;
      try {
        decodedEvidence = new TextDecoder("utf-8", { fatal: true }).decode(
          content,
        );
      } catch {
        invalid.push(`verification: ${evidenceType} invalid UTF-8`);
      }
      if (decodedEvidence !== undefined) {
        try {
          JSON.parse(decodedEvidence);
        } catch {
          invalid.push(`verification: ${evidenceType} invalid JSON`);
        }
      }
    }
  }
  if (canonicalJson(component) !== canonicalJson(asset.manifest)) {
    invalid.push("component.json: canonical manifest mismatch");
  }
  if (capabilityManifestDigest(component) !== component.manifestDigest) {
    invalid.push("component.json: manifestDigest");
  }
  if (adapter.apiVersion !== "factory.adapter/v1") {
    invalid.push("adapter.json: apiVersion");
  }
  if (adapter.kind !== "declarative") invalid.push("adapter.json: kind");
  if (
    canonicalJson(adapter.outputSlots) !==
    canonicalJson(asset.manifest.outputSlots)
  ) {
    invalid.push("adapter.json: outputSlots");
  }
  if (canonicalJson(adapter.templates) !== canonicalJson(component.templates)) {
    invalid.push("adapter.json: templates");
  }
  if (
    canonicalJson(adapter.contributes.effects) !==
    canonicalJson(component.effects)
  ) {
    invalid.push("adapter.json: contributes.effects");
  }
  for (const field of [
    "parameters",
    "runtimeHandlers",
    "graphContributions",
    "executableContributions",
  ] as const) {
    if (canonicalJson(adapter[field]) !== canonicalJson(component[field])) {
      invalid.push(`adapter.json: ${field}`);
    }
  }
  const packageTargets = new Set<string>();
  for (const contribution of [
    ...(component.templates ?? []),
    ...(component.executableContributions ?? []),
  ]) {
    if (packageTargets.has(contribution.target)) {
      invalid.push(`duplicate package target '${contribution.target}'`);
    }
    packageTargets.add(contribution.target);
  }
  const declaredParameters = new Set(
    (component.parameters ?? []).map(({ key }) => key),
  );
  const resolvedExecutableContributions: ResolvedCapabilityAssetContribution[] =
    [];
  for (const contribution of component.graphContributions ?? []) {
    try {
      assertGraphContribution(contribution, declaredParameters);
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `graph contribution: ${error.message}`
          : "graph contribution: invalid",
      );
    }
  }
  for (const contribution of component.executableContributions ?? []) {
    try {
      resolvedExecutableContributions.push(
        assertExecutableContribution(contribution, component, packageRoot),
      );
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `executable contribution: ${error.message}`
          : "executable contribution: invalid",
      );
    }
  }
  invalid.push(
    ...validateTransactionV2PostgresIndexNames(
      component,
      resolvedExecutableContributions,
    ),
  );
  for (const template of component.templates ?? []) {
    try {
      assertTemplateContribution(template, packageRoot);
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `template: ${error.message}`
          : "template: invalid",
      );
    }
  }
  return invalid;
}

export function loadCapabilityAssetTemplates(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): readonly ResolvedCapabilityAssetTemplate[] {
  const invalid = verifyCapabilityAssetPackage(asset, repositoryRoot);
  if (invalid.length) {
    throw new Error(
      `Capability package '${asset.manifest.key}' is invalid: ${invalid.join(", ")}`,
    );
  }
  const packageRoot = realpathSync(
    resolve(repositoryRoot, asset.manifest.packageRoot),
  );
  const targets = new Set<string>();
  return asset.manifest.templates.map((template) => {
    if (targets.has(template.target)) {
      throw new Error(
        `Capability package '${asset.manifest.key}' declares duplicate template target '${template.target}'.`,
      );
    }
    targets.add(template.target);
    const resolved = assertTemplateContribution(template, packageRoot);
    return {
      ...resolved,
      assetKey: asset.manifest.key,
      assetVersion: asset.manifest.version,
    };
  });
}

export function loadCapabilityAssetContributions(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): readonly ResolvedCapabilityAssetContribution[] {
  const invalid = verifyCapabilityAssetPackage(asset, repositoryRoot);
  if (invalid.length) {
    throw new Error(
      `Capability package '${asset.manifest.key}' is invalid: ${invalid.join(", ")}`,
    );
  }
  const packageRoot = realpathSync(
    resolve(repositoryRoot, asset.manifest.packageRoot),
  );
  const targets = new Set<string>();
  return (asset.manifest.executableContributions ?? []).map((contribution) => {
    if (targets.has(contribution.target)) {
      throw new Error(
        `Capability package '${asset.manifest.key}' declares duplicate contribution target '${contribution.target}'.`,
      );
    }
    targets.add(contribution.target);
    return assertExecutableContribution(
      contribution,
      asset.manifest,
      packageRoot,
    );
  });
}

/**
 * Server-only publication boundary. It authenticates the exact selected
 * physical package and evidence bytes before constructing the canonical
 * immutable lock with the browser-compatible pure composition factory.
 */
export function createVerifiedCapabilityCompositionLock(
  input: CreateCapabilityCompositionLockInput,
  repositoryRoot: string,
): CapabilityCompositionLockV1 {
  const captured = captureCapabilityCompositionLock(input);
  for (const selection of captured.input.selections) {
    const asset = resolveCapabilityAssetLock(selection.lock);
    assertCapabilityAssetSelectable(asset.manifest);
    const invalid = verifyCapabilityAssetPackage(asset, repositoryRoot);
    if (invalid.length > 0) {
      throw new Error(
        `Capability package '${asset.manifest.key}' is invalid: ${invalid.join(", ")}`,
      );
    }
  }
  return captured.createLock();
}
