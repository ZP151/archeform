import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  assertGoldenCapabilityAssetLocks,
  resolveCapabilityAssetLock,
} from "@factory/capabilities";
import {
  loadCapabilityAssetTemplates,
  type ResolvedCapabilityAssetTemplate,
} from "@factory/capabilities/node";
import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

export type CompilationTargetKey =
  | "simulator"
  | "next-web"
  | "nest-api"
  | "prisma-postgres"
  | "casbin-policy"
  | "xstate-flow"
  | "test-suite"
  | "documentation";

export interface CompilationTarget {
  readonly key: CompilationTargetKey;
  readonly label: string;
  readonly description: string;
}
export const compilationTargets: readonly CompilationTarget[] = Object.freeze([
  {
    key: "simulator",
    label: "Role simulator",
    description: "Browser-only seed scenario simulator.",
  },
  {
    key: "next-web",
    label: "Next.js web",
    description: "Standalone customer and operator web application.",
  },
  {
    key: "nest-api",
    label: "NestJS API",
    description: "Standalone REST API and flow handlers.",
  },
  {
    key: "prisma-postgres",
    label: "Prisma PostgreSQL",
    description: "Schema, migrations, and seed data.",
  },
  {
    key: "casbin-policy",
    label: "Casbin policy",
    description: "Compiled authorization policy and guards.",
  },
  {
    key: "xstate-flow",
    label: "XState flows",
    description: "Compiled declared state machines.",
  },
  {
    key: "test-suite",
    label: "Journey tests",
    description: "Role, API, flow, and smoke tests.",
  },
  {
    key: "documentation",
    label: "Documentation",
    description: "API reference, ERD, and permission matrix.",
  },
]);

export interface PublishedGraphInput {
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
}

export interface CompilationArtifactPlan {
  readonly target: CompilationTargetKey;
  readonly path: string;
  readonly mediaType: string;
}

export interface CompilationPlan {
  readonly publishedRevisionId: string;
  readonly graphHash: string;
  readonly artifacts: readonly CompilationArtifactPlan[];
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface GeneratedApplicationBundle {
  readonly rootDirectory: string;
  readonly graphHash: string;
  readonly files: readonly GeneratedFile[];
}

export interface GenerateApplicationBundleOptions {
  readonly repositoryRoot?: string;
}

const artifactBlueprint: Readonly<
  Record<
    CompilationTargetKey,
    readonly Omit<CompilationArtifactPlan, "target">[]
  >
> = {
  simulator: [{ path: "simulator/", mediaType: "text/html" }],
  "next-web": [
    { path: "web/", mediaType: "application/vnd.factory.source-tree" },
  ],
  "nest-api": [
    { path: "api/", mediaType: "application/vnd.factory.source-tree" },
    { path: "api/src/application-runtime.ts", mediaType: "text/typescript" },
    { path: "api/src/policy.ts", mediaType: "text/typescript" },
  ],
  "prisma-postgres": [
    { path: "database/prisma/schema.prisma", mediaType: "text/plain" },
    {
      path: "database/prisma/migrations/",
      mediaType: "application/vnd.factory.source-tree",
    },
    { path: "database/prisma/seed.ts", mediaType: "text/typescript" },
  ],
  "casbin-policy": [
    { path: "api/policy/model.conf", mediaType: "text/plain" },
    { path: "api/policy/policy.csv", mediaType: "text/csv" },
  ],
  "xstate-flow": [
    {
      path: "api/src/flows/",
      mediaType: "application/vnd.factory.source-tree",
    },
  ],
  "test-suite": [
    { path: "api/test/", mediaType: "application/vnd.factory.source-tree" },
  ],
  documentation: [
    { path: "docs/api-reference.md", mediaType: "text/markdown" },
    { path: "docs/entity-relationship.md", mediaType: "text/markdown" },
    { path: "docs/permission-matrix.md", mediaType: "text/markdown" },
    { path: "capability-lock.json", mediaType: "application/json" },
    {
      path: "capability-template-lock.json",
      mediaType: "application/json",
    },
  ],
};

/**
 * Produces a deterministic, non-executable output map. Target writers consume
 * this plan later; only a Published Revision can form its input.
 */
export function buildCompilationPlan(
  input: PublishedGraphInput,
): CompilationPlan {
  if (!input.publishedRevisionId) {
    throw new Error("Published revision id is required for compilation.");
  }

  const graph = assertValidApplicationGraph(input.graph);
  const artifacts = compilationTargets.flatMap((target) =>
    artifactBlueprint[target.key].map((artifact) => ({
      target: target.key,
      ...artifact,
    })),
  );

  return {
    publishedRevisionId: input.publishedRevisionId,
    graphHash: hashApplicationGraph(graph),
    artifacts,
  };
}

interface ResolvedCapabilityTemplateContribution extends ResolvedCapabilityAssetTemplate {
  readonly effects: readonly string[];
  readonly operations: readonly { capability: string; operation: string }[];
}

function findFactoryRepositoryRoot(startDirectory: string): string {
  let candidate = resolve(startDirectory);
  while (true) {
    const workspace = resolve(candidate, "pnpm-workspace.yaml");
    const capabilityAssets = resolve(
      candidate,
      "packages",
      "capabilities",
      "assets",
    );
    if (existsSync(workspace) && existsSync(capabilityAssets)) {
      return candidate;
    }
    const parent = dirname(candidate);
    if (parent === candidate) {
      throw new Error(
        "Factory repository root with Golden capability packages could not be resolved.",
      );
    }
    candidate = parent;
  }
}

function templateString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function renderCapabilityTemplate(
  template: ResolvedCapabilityTemplateContribution,
  graph: ApplicationGraphV1,
): string {
  const values: Readonly<Record<string, string>> = {
    "asset.key": templateString(template.assetKey),
    "asset.version": templateString(template.assetVersion),
    "asset.effectsJson": JSON.stringify(template.effects),
    "graph.metadata.id": templateString(graph.metadata.id),
  };
  return template.content.replace(
    /{{([A-Za-z.]+)}}/g,
    (marker, key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(
          "Capability template '" +
            template.assetKey +
            "' declares unsupported token '" +
            marker +
            "'.",
        );
      }
      return value;
    },
  );
}

function resolveCapabilityTemplateContributions(
  graph: ApplicationGraphV1,
  repositoryRoot?: string,
): readonly ResolvedCapabilityTemplateContribution[] {
  const locks = graph.integration.assetLocks ?? [];
  const factoryCapabilities = graph.integration.capabilities.filter(
    (capability) => capability.providerId === "factory",
  );
  const capabilityKeys = factoryCapabilities.map(
    (capability) => capability.key,
  );
  if (!locks.length) {
    if (capabilityKeys.length) {
      throw new Error(
        "Factory Graph capabilities require matching Golden asset locks before compilation.",
      );
    }
    return [];
  }
  if (!graph.integration.compositionProfile) {
    throw new Error(
      "Golden asset locks require a composition profile before compilation.",
    );
  }

  assertGoldenCapabilityAssetLocks(locks, {
    profile: graph.integration.compositionProfile,
    capabilityKeys,
  });
  const root = findFactoryRepositoryRoot(repositoryRoot ?? process.cwd());
  const targets = new Set<string>();
  const contributions = locks.flatMap((lock) => {
    const asset = resolveCapabilityAssetLock(lock);
    return loadCapabilityAssetTemplates(asset, root).map((template) => ({
      ...template,
      effects: asset.manifest.effects,
      operations: factoryCapabilities
        .filter((capability) => asset.manifest.effects.includes(capability.key))
        .map((capability) => ({
          capability: capability.key,
          operation: capability.operation,
        })),
    }));
  });
  for (const contribution of contributions) {
    if (targets.has(contribution.target)) {
      throw new Error(
        "Golden capability packages declare duplicate target '" +
          contribution.target +
          "'.",
      );
    }
    if (contribution.target === "api/src/capabilities/registry.ts") {
      throw new Error(
        "Golden capability packages cannot replace the generated capability registry.",
      );
    }
    targets.add(contribution.target);
  }
  return contributions.sort((left, right) =>
    left.target.localeCompare(right.target),
  );
}

function renderCapabilityRegistry(
  contributions: readonly ResolvedCapabilityTemplateContribution[],
): string {
  const imports = contributions.map((contribution, index) => {
    const relativeModule = contribution.target
      .replace("api/src/capabilities/", "./")
      .replace(/\.ts$/, ".js");
    return (
      "import { capabilityModule as capabilityModule" +
      index +
      ' } from "' +
      relativeModule +
      '";'
    );
  });
  const modules = contributions.map((_, index) => "capabilityModule" + index);
  const operations = Array.from(
    new Set(
      contributions.flatMap((contribution) =>
        contribution.operations.map(
          (operation) => operation.capability + "\u0000" + operation.operation,
        ),
      ),
    ),
  ).sort();
  return [
    'import type { CapabilityRuntimeModule, EffectHandler, RecordHandler, WorkflowHandler } from "./contract.js";',
    "",
    ...imports,
    ...(imports.length ? [""] : []),
    "export const capabilityModules: readonly CapabilityRuntimeModule[] = [" +
      modules.join(", ") +
      "];",
    "export const providedEffects = new Set<string>(",
    "  capabilityModules.flatMap((module) => module.effects),",
    ");",
    "",
    "const declaredEffectOperations = new Set<string>(" +
      JSON.stringify(operations) +
      ");",
    "",
    "function effectOperationKey(capability: string, operation: string): string {",
    "  return `${capability}\\u0000${operation}`;",
    "}",
    "",
    "function singleHandler<T>(handlers: readonly T[], label: string): T {",
    "  if (handlers.length === 0) throw new Error(`No ${label} handler.`);",
    "  if (handlers.length > 1) throw new Error(`Multiple ${label} handlers are registered.`);",
    "  return handlers[0]!;",
    "}",
    "",
    "function assertUniqueEffectHandlers(): void {",
    "  const registered = new Set<string>();",
    "  for (const module of capabilityModules) {",
    "    if (!module.effectHandler) continue;",
    "    for (const effect of module.effects) {",
    "      if (registered.has(effect)) throw new Error(`Multiple handlers for '${effect}'.`);",
    "      registered.add(effect);",
    "    }",
    "  }",
    "}",
    "",
    "assertUniqueEffectHandlers();",
    "",
    "export function getEffectHandler(capability: string, operation: string): EffectHandler {",
    "  if (!declaredEffectOperations.has(effectOperationKey(capability, operation))) {",
    "    throw new Error(`No handler for '${capability}.${operation}'.`);",
    "  }",
    "  const module = capabilityModules.find((candidate) =>",
    "    candidate.effects.includes(capability) && candidate.effectHandler,",
    "  );",
    "  if (!module?.effectHandler) throw new Error(`No handler for '${capability}'.`);",
    "  return module.effectHandler;",
    "}",
    "",
    "export function getRecordHandler(): RecordHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.recordHandler ? [module.recordHandler] : []),",
    '    "record",',
    "  );",
    "}",
    "",
    "export function getWorkflowHandler(): WorkflowHandler {",
    "  return singleHandler(",
    "    capabilityModules.flatMap((module) => module.workflowHandler ? [module.workflowHandler] : []),",
    '    "workflow",',
    "  );",
    "}",
    "",
  ].join("\n");
}

function renderCapabilityContract(graph: ApplicationGraphV1): string {
  const commerce = hasCommerceCapabilities(graph);
  return [
    "export type CapabilityStoredRecord = Record<string, unknown> & { id: string; status?: string };",
    ...(commerce
      ? [
          "export type CapabilityCommerceLineItem = { catalogEntity: string; catalogRecordId: string; quantity: number };",
        ]
      : []),
    "",
    "export interface CapabilityStore {",
    "  list(entityKey: string): Promise<readonly CapabilityStoredRecord[]>;",
    "  find(entityKey: string, recordId: string): Promise<CapabilityStoredRecord | undefined>;",
    "  create(entityKey: string, input: Record<string, unknown>): Promise<CapabilityStoredRecord>;",
    "  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<CapabilityStoredRecord>;",
    "  appendAudit(event: { actor: string; action: string; entity: string; recordId: string; at: string }): Promise<void>;",
    "  appendCapabilityEvent(event: { actor: string; capability: string; operation: string; entity: string; recordId: string; outcome: 'completed'; at: string }): Promise<void>;",
    ...(commerce
      ? [
          "  listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CapabilityCommerceLineItem[]>;",
          "  decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<CapabilityStoredRecord>;",
        ]
      : []),
    "}",
    "",
    "export interface RecordHandler {",
    "  create(input: { store: CapabilityStore; entityKey: string; input: Record<string, unknown> }): Promise<CapabilityStoredRecord>;",
    "  list(input: { store: CapabilityStore; entityKey: string }): Promise<readonly CapabilityStoredRecord[]>;",
    "}",
    "",
    "export interface WorkflowHandler {",
    "  applyTransition(input: { store: CapabilityStore; entityKey: string; recordId: string; nextState: string }): Promise<CapabilityStoredRecord>;",
    "}",
    "",
    "export type EffectHandler = (input: { role: string; entityKey: string; recordId: string; operation: string; store: CapabilityStore; now: string }) => Promise<void>;",
    "",
    "export interface CapabilityRuntimeModule {",
    "  readonly key: string;",
    "  readonly version: string;",
    "  readonly applicationId: string;",
    "  readonly effects: readonly string[];",
    "  readonly recordHandler?: RecordHandler;",
    "  readonly workflowHandler?: WorkflowHandler;",
    "  readonly effectHandler?: EffectHandler;",
    "}",
    "",
  ].join("\n");
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join("");
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal ? `${pascal[0]!.toLowerCase()}${pascal.slice(1)}` : pascal;
}

function pluralize(value: string): string {
  return value.endsWith("s") ? `${value}es` : `${value}s`;
}

function hasCommerceCapabilities(graph: ApplicationGraphV1): boolean {
  return graph.integration.capabilities.some((capability) =>
    ["catalog.", "cart.", "inventory.", "order.", "payment."].some((prefix) =>
      capability.key.startsWith(prefix),
    ),
  );
}

function prismaType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "integer":
      return "Int";
    case "decimal":
      return "Decimal";
    case "boolean":
      return "Boolean";
    case "date":
      return "DateTime @db.Date";
    case "datetime":
      return "DateTime";
    case "json":
      return "Json";
    default:
      return "String";
  }
}

function renderPrismaSchema(graph: ApplicationGraphV1): string {
  const relationFields = (entityKey: string): readonly string[] =>
    graph.domain.relations.flatMap((relation) => {
      const relationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
      const fromModel = toPascalCase(relation.from);
      const toModel = toPascalCase(relation.to);
      const fromField = toCamelCase(relation.from);
      const toField = toCamelCase(relation.to);

      if (relation.kind === "many-to-many") {
        if (entityKey === relation.from) {
          return [
            `  ${pluralize(toField)} ${toModel}[] @relation("${relationName}")`,
          ];
        }
        if (entityKey === relation.to) {
          return [
            `  ${pluralize(fromField)} ${fromModel}[] @relation("${relationName}")`,
          ];
        }
        return [];
      }

      const sourceIsOne =
        relation.kind === "one-to-many" || relation.kind === "one-to-one";
      const oneKey = sourceIsOne ? relation.from : relation.to;
      const manyKey = sourceIsOne ? relation.to : relation.from;
      const oneModel = toPascalCase(oneKey);
      const manyModel = toPascalCase(manyKey);
      const oneField = toCamelCase(oneKey);
      const manyField = toCamelCase(manyKey);
      const oneToOne = relation.kind === "one-to-one";

      if (entityKey === oneKey) {
        return [
          `  ${oneToOne ? manyField : pluralize(manyField)} ${manyModel}${oneToOne ? "?" : "[]"} @relation("${relationName}")`,
        ];
      }
      if (entityKey === manyKey) {
        return [
          `  ${oneField}Id String${oneToOne ? " @unique" : ""}`,
          `  ${oneField} ${oneModel} @relation("${relationName}", fields: [${oneField}Id], references: [id])`,
        ];
      }
      return [];
    });
  const models = graph.domain.entities.map((entity) => {
    const fields = entity.fields.map((field) => {
      const optional = field.required ? "" : "?";
      const unique = field.unique ? " @unique" : "";
      return `  ${field.key} ${prismaType(field.type)}${optional}${unique}`;
    });
    const indexes = entity.indexes.map(
      (index) => `  @@index([${index.fields.join(", ")}])`,
    );
    return [
      `model ${toPascalCase(entity.key)} {`,
      "  id String @id @default(cuid())",
      ...fields,
      ...relationFields(entity.key),
      "  createdAt DateTime @default(now())",
      "  updatedAt DateTime @updatedAt",
      ...indexes,
      "}",
    ].join("\n");
  });
  return [
    "generator client {",
    '  provider = "prisma-client-js"',
    "}",
    "",
    "datasource db {",
    '  provider = "postgresql"',
    '  url = env("DATABASE_URL")',
    "}",
    "",
    ...models,
    "",
    "model AuditEvent {",
    "  id String @id @default(cuid())",
    "  actor String",
    "  action String",
    "  entity String",
    "  recordId String",
    "  at DateTime @default(now())",
    "  @@index([entity, recordId])",
    "}",
    "",
    "model CapabilityEvent {",
    "  id String @id @default(cuid())",
    "  actor String",
    "  capability String",
    "  operation String",
    "  entity String",
    "  recordId String",
    "  outcome String",
    "  at DateTime @default(now())",
    "  @@index([entity, recordId])",
    "  @@index([capability, operation])",
    "}",
    ...(hasCommerceCapabilities(graph)
      ? [
          "",
          "model CommerceLineItem {",
          "  id String @id @default(cuid())",
          "  actor String",
          "  orderEntity String",
          "  orderRecordId String",
          "  catalogEntity String",
          "  catalogRecordId String",
          "  quantity Int",
          "  createdAt DateTime @default(now())",
          "  @@index([orderEntity, orderRecordId])",
          "  @@index([catalogEntity, catalogRecordId])",
          "}",
        ]
      : []),
    "",
  ].join("\n");
}

function postgresType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "integer":
      return "INTEGER";
    case "decimal":
      return "DECIMAL";
    case "boolean":
      return "BOOLEAN";
    case "date":
      return "DATE";
    case "datetime":
      return "TIMESTAMP(3)";
    case "json":
      return "JSONB";
    default:
      return "TEXT";
  }
}

function quoteSqlIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function relationColumnDefinitions(
  graph: ApplicationGraphV1,
  entityKey: string,
): readonly string[] {
  return graph.domain.relations.flatMap((relation) => {
    if (relation.kind === "many-to-many") return [];
    const sourceIsOne =
      relation.kind === "one-to-many" || relation.kind === "one-to-one";
    const oneKey = sourceIsOne ? relation.from : relation.to;
    const manyKey = sourceIsOne ? relation.to : relation.from;
    if (entityKey !== manyKey) return [];
    const column = `${toCamelCase(oneKey)}Id`;
    return [
      `${quoteSqlIdentifier(column)} TEXT NOT NULL${relation.kind === "one-to-one" ? " UNIQUE" : ""}`,
    ];
  });
}

function renderInitialMigration(graph: ApplicationGraphV1): string {
  const createTables = graph.domain.entities.map((entity) => {
    const columns = [
      '"id" TEXT NOT NULL PRIMARY KEY',
      ...entity.fields.map(
        (field) =>
          `${quoteSqlIdentifier(field.key)} ${postgresType(field.type)}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`,
      ),
      ...relationColumnDefinitions(graph, entity.key),
      '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '"updatedAt" TIMESTAMP(3) NOT NULL',
    ];
    return `CREATE TABLE ${quoteSqlIdentifier(toPascalCase(entity.key))} (\n  ${columns.join(",\n  ")}\n);`;
  });
  const indexes = graph.domain.entities.flatMap((entity) =>
    entity.indexes.map(
      (index, indexNumber) =>
        `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${quoteSqlIdentifier(`${toPascalCase(entity.key)}_${indexNumber}_idx`)} ON ${quoteSqlIdentifier(toPascalCase(entity.key))} (${index.fields.map(quoteSqlIdentifier).join(", ")});`,
    ),
  );
  const relationTables = graph.domain.relations.flatMap((relation) => {
    if (relation.kind !== "many-to-many") return [];
    const relationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
    const sourceModel = toPascalCase(relation.from);
    const targetModel = toPascalCase(relation.to);
    return [
      `CREATE TABLE ${quoteSqlIdentifier(`_${relationName}`)} (\n  "A" TEXT NOT NULL,\n  "B" TEXT NOT NULL,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_AB_pkey`)} PRIMARY KEY ("A", "B"),\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_A_fkey`)} FOREIGN KEY ("A") REFERENCES ${quoteSqlIdentifier(sourceModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_B_fkey`)} FOREIGN KEY ("B") REFERENCES ${quoteSqlIdentifier(targetModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE\n);`,
      `CREATE INDEX ${quoteSqlIdentifier(`_${relationName}_B_index`)} ON ${quoteSqlIdentifier(`_${relationName}`)} ("B");`,
    ];
  });
  const relationConstraints = graph.domain.relations.flatMap((relation) => {
    if (relation.kind === "many-to-many") return [];
    const sourceIsOne =
      relation.kind === "one-to-many" || relation.kind === "one-to-one";
    const oneKey = sourceIsOne ? relation.from : relation.to;
    const manyKey = sourceIsOne ? relation.to : relation.from;
    const relationName = `${toPascalCase(oneKey)}To${toPascalCase(manyKey)}`;
    const column = `${toCamelCase(oneKey)}Id`;
    return [
      `ALTER TABLE ${quoteSqlIdentifier(toPascalCase(manyKey))} ADD CONSTRAINT ${quoteSqlIdentifier(`${relationName}_fkey`)} FOREIGN KEY (${quoteSqlIdentifier(column)}) REFERENCES ${quoteSqlIdentifier(toPascalCase(oneKey))} ("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
    ];
  });
  return [
    "-- Generated from a Published Factory Application Graph. Do not edit manually.",
    ...createTables,
    'CREATE TABLE "AuditEvent" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "action" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
    'CREATE INDEX "AuditEvent_entity_recordId_idx" ON "AuditEvent" ("entity", "recordId");',
    'CREATE TABLE "CapabilityEvent" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "capability" TEXT NOT NULL,\n  "operation" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "outcome" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
    'CREATE INDEX "CapabilityEvent_entity_recordId_idx" ON "CapabilityEvent" ("entity", "recordId");',
    'CREATE INDEX "CapabilityEvent_capability_operation_idx" ON "CapabilityEvent" ("capability", "operation");',
    ...(hasCommerceCapabilities(graph)
      ? [
          'CREATE TABLE "CommerceLineItem" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "orderEntity" TEXT NOT NULL,\n  "orderRecordId" TEXT NOT NULL,\n  "catalogEntity" TEXT NOT NULL,\n  "catalogRecordId" TEXT NOT NULL,\n  "quantity" INTEGER NOT NULL,\n  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
          'CREATE INDEX "CommerceLineItem_orderEntity_orderRecordId_idx" ON "CommerceLineItem" ("orderEntity", "orderRecordId");',
          'CREATE INDEX "CommerceLineItem_catalogEntity_catalogRecordId_idx" ON "CommerceLineItem" ("catalogEntity", "catalogRecordId");',
        ]
      : []),
    ...indexes,
    ...relationTables,
    ...relationConstraints,
    "",
  ].join("\n\n");
}

function renderPrismaSeed(graph: ApplicationGraphV1): string {
  const records = (graph.domain.seedData ?? []).map((seed, index) => ({
    delegate: toCamelCase(seed.entity),
    id: seed.id ?? `seed-${seed.entity}-${index + 1}`,
    values: seed.values,
  }));
  return [
    'import { PrismaClient } from "@prisma/client";',
    "",
    "const prisma = new PrismaClient();",
    `const records = ${JSON.stringify(records, null, 2)} as const;`,
    "",
    "type SeedDelegate = { upsert(input: { where: { id: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown> };",
    "",
    "export async function seed() {",
    "  const delegates = prisma as unknown as Record<string, SeedDelegate>;",
    "  for (const record of records) {",
    "    await delegates[record.delegate]!.upsert({",
    "      where: { id: record.id },",
    "      update: record.values,",
    "      create: { id: record.id, ...record.values },",
    "    });",
    "  }",
    "  return { seeded: records.length };",
    "}",
    "",
    "void seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());",
    "",
  ].join("\n");
}

function renderCasbinPolicy(graph: ApplicationGraphV1): string {
  const lines = graph.policy.permissions.flatMap((permission) =>
    permission.actions.map(
      (action) => `p, ${permission.role}, ${permission.resource}, ${action}`,
    ),
  );
  return `${lines.join("\n")}\n`;
}

function renderFlowDefinitions(graph: ApplicationGraphV1): string {
  const flows = graph.flow.flows.map((flow) => ({
    id: flow.id,
    initial: flow.initialState,
    states: flow.states,
    transitions: flow.transitions,
  }));
  return `export const flowDefinitions = ${JSON.stringify(flows, null, 2)} as const;\n`;
}

function renderFlowMachines(): string {
  return [
    'import { createMachine } from "xstate";',
    'import { flowDefinitions } from "./definitions.js";',
    "",
    "export const flowMachines = flowDefinitions.map((flow) =>",
    "  createMachine({",
    "    id: flow.id,",
    "    initial: flow.initial,",
    "    states: Object.fromEntries(",
    "      flow.states.map((state) => [",
    "        state,",
    "        {",
    "          on: Object.fromEntries(",
    "            flow.transitions",
    "              .filter((transition) => transition.from === state)",
    "              .map((transition) => [transition.event, transition.to]),",
    "          ),",
    "        },",
    "      ]),",
    "    ),",
    "  } as any),",
    ");",
    "",
  ].join("\n");
}

function renderPolicyModule(graph: ApplicationGraphV1): string {
  const model = [
    "[request_definition]",
    "r = sub, obj, act",
    "",
    "[policy_definition]",
    "p = sub, obj, act",
    "",
    "[policy_effect]",
    "e = some(where (p.eft == allow))",
    "",
    "[matchers]",
    'm = r.sub == p.sub && (r.obj == p.obj || p.obj == "*") && r.act == p.act',
  ].join("\n");
  return [
    'import { newEnforcer, newModelFromString, StringAdapter } from "casbin";',
    "",
    `const model = ${JSON.stringify(model)};`,
    `const policy = ${JSON.stringify(renderCasbinPolicy(graph))};`,
    "let enforcerPromise: ReturnType<typeof newEnforcer> | undefined;",
    "",
    "async function enforcer() {",
    "  enforcerPromise ??= newEnforcer(newModelFromString(model), new StringAdapter(policy));",
    "  return enforcerPromise;",
    "}",
    "",
    "export async function enforce(role: string, resource: string, action: string): Promise<boolean> {",
    "  return (await enforcer()).enforce(role, resource, action);",
    "}",
    "",
  ].join("\n");
}

function runtimeDefinition(graph: ApplicationGraphV1) {
  return {
    entities: graph.domain.entities.map((entity) => ({
      key: entity.key,
      fields: entity.fields.map((field) => ({
        key: field.key,
        required: field.required,
      })),
    })),
    permissions: graph.policy.permissions,
    capabilities: graph.integration.capabilities,
    seedData: (graph.domain.seedData ?? []).map((seed, index) => ({
      entity: seed.entity,
      id: seed.id ?? `seed-${seed.entity}-${index + 1}`,
      values: seed.values,
    })),
    flows: graph.flow.flows,
  };
}

function renderApplicationRuntime(graph: ApplicationGraphV1): string {
  const commerce = hasCommerceCapabilities(graph);
  return [
    'import { getEffectHandler, getRecordHandler, getWorkflowHandler, providedEffects } from "./capabilities/registry.js";',
    'import { enforce } from "./policy.js";',
    "",
    "export type StoredRecord = Record<string, unknown> & { id: string; status?: string };",
    "export type AuditEvent = { actor: string; action: string; entity: string; recordId: string; at: string };",
    "export type CapabilityEvent = { actor: string; capability: string; operation: string; entity: string; recordId: string; outcome: 'completed'; at: string };",
    ...(commerce
      ? [
          "export type CommerceLineItem = { id: string; actor: string; orderEntity: string; orderRecordId: string; catalogEntity: string; catalogRecordId: string; quantity: number };",
        ]
      : []),
    "export interface RecordStore {",
    "  list(entityKey: string): Promise<readonly StoredRecord[]>;",
    "  find(entityKey: string, recordId: string): Promise<StoredRecord | undefined>;",
    "  create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  appendAudit(event: AuditEvent): Promise<void>;",
    "  listAudit(): Promise<readonly AuditEvent[]>;",
    "  appendCapabilityEvent(event: CapabilityEvent): Promise<void>;",
    "  listCapabilityEvents(): Promise<readonly CapabilityEvent[]>;",
    ...(commerce
      ? [
          "  addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem>;",
          "  listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]>;",
          "  decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord>;",
        ]
      : []),
    "}",
    "",
    "export class InMemoryRecordStore implements RecordStore {",
    "  private readonly records = new Map<string, Map<string, StoredRecord>>();",
    "  private readonly auditEvents: AuditEvent[] = [];",
    "  private readonly capabilityEvents: CapabilityEvent[] = [];",
    ...(commerce
      ? ["  private readonly cartItems: CommerceLineItem[] = [];"]
      : []),
    "",
    "  constructor() {",
    "    for (const seed of definition.seedData) {",
    "      this.collection(seed.entity).set(seed.id, { id: seed.id, ...seed.values });",
    "    }",
    "  }",
    "",
    "  private collection(entityKey: string): Map<string, StoredRecord> {",
    "    let collection = this.records.get(entityKey);",
    "    if (!collection) {",
    "      collection = new Map<string, StoredRecord>();",
    "      this.records.set(entityKey, collection);",
    "    }",
    "    return collection;",
    "  }",
    "",
    "  async list(entityKey: string): Promise<readonly StoredRecord[]> { return [...this.collection(entityKey).values()]; }",
    "  async find(entityKey: string, recordId: string): Promise<StoredRecord | undefined> { return this.collection(entityKey).get(recordId); }",
    "  async create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    const collection = this.collection(entityKey);",
    "    const record: StoredRecord = { id: `${entityKey}-${collection.size + 1}`, ...input };",
    "    collection.set(record.id, record);",
    "    return record;",
    "  }",
    "  async update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    const record = await this.find(entityKey, recordId);",
    "    if (!record) throw new Error(`Record '${recordId}' was not found.`);",
    "    Object.assign(record, input);",
    "    this.collection(entityKey).set(recordId, record);",
    "    return record;",
    "  }",
    "  async appendAudit(event: AuditEvent): Promise<void> { this.auditEvents.push(event); }",
    "  async listAudit(): Promise<readonly AuditEvent[]> { return [...this.auditEvents]; }",
    "  async appendCapabilityEvent(event: CapabilityEvent): Promise<void> { this.capabilityEvents.push(event); }",
    "  async listCapabilityEvents(): Promise<readonly CapabilityEvent[]> { return [...this.capabilityEvents]; }",
    ...(commerce
      ? [
          "  async addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem> {",
          "    const item = { id: `line-${this.cartItems.length + 1}`, ...input };",
          "    this.cartItems.push(item);",
          "    return item;",
          "  }",
          "  async listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    return this.cartItems.filter((item) => item.orderEntity === orderEntity && item.orderRecordId === orderRecordId);",
          "  }",
          "  async decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord> {",
          "    const record = await this.find(entityKey, recordId);",
          "    if (!record || typeof record.stock !== 'number') throw new Error(`Catalog record '${recordId}' has no numeric stock.`);",
          "    if (record.stock < quantity) throw new Error(`Catalog record '${recordId}' has insufficient stock.`);",
          "    return this.update(entityKey, recordId, { stock: record.stock - quantity });",
          "  }",
        ]
      : []),
    "}",
    "type RuntimeDefinition = {",
    "  entities: readonly { key: string; fields: readonly { key: string; required: boolean }[] }[];",
    "  permissions: readonly { role: string; resource: string; actions: readonly string[] }[];",
    "  capabilities: readonly { key: string; providerId: string; operation: string }[];",
    "  seedData: readonly { entity: string; id: string; values: Record<string, unknown> }[];",
    "  flows: readonly {",
    "    id: string;",
    "    entity: string;",
    "    initialState: string;",
    "    states: readonly string[];",
    "    events: readonly string[];",
    "    transitions: readonly { from: string; event: string; to: string; roles?: readonly string[]; effects?: readonly { capability: string; operation: string }[] }[];",
    "  }[];",
    "};",
    `const definition: RuntimeDefinition = ${JSON.stringify(runtimeDefinition(graph), null, 2)};`,
    "",
    "export class ApplicationRuntime {",
    "  constructor(private readonly store: RecordStore = new InMemoryRecordStore()) {}",
    "",
    "  private entity(entityKey: string) {",
    "    const entity = definition.entities.find((candidate) => candidate.key === entityKey);",
    "    if (!entity) throw new Error(`Unknown entity '${entityKey}'.`);",
    "    return entity;",
    "  }",
    "",
    "  private flow(entityKey: string) {",
    "    return definition.flows.find((candidate) => candidate.entity === entityKey);",
    "  }",
    "",
    "  private async assertAllowed(role: string, entityKey: string, action: string): Promise<void> {",
    "    if (!(await enforce(role, entityKey, action))) {",
    "      throw new Error(`Role '${role}' cannot ${action} '${entityKey}'.`);",
    "    }",
    "  }",
    "",
    "  private async assertTransitionAllowed(role: string, entityKey: string, event: string): Promise<void> {",
    "    if (await enforce(role, entityKey, event)) return;",
    "    await this.assertAllowed(role, entityKey, 'update');",
    "  }",
    "",
    "  private assertCapability(capabilityKey: string, operation: string): { key: string; providerId: string; operation: string } {",
    "    const capability = definition.capabilities.find((candidate) => candidate.key === capabilityKey && candidate.operation === operation);",
    "    if (!capability) {",
    "      throw new Error(`Capability '${capabilityKey}.${operation}' is not declared by this Application Graph.`);",
    "    }",
    "    return capability;",
    "  }",
    "",
    "  private async executeEffects(role: string, entityKey: string, recordId: string, effects: readonly { capability: string; operation: string }[] | undefined): Promise<void> {",
    "    const declaredEffects = (effects ?? []).map((effect) => ({ effect, capability: this.assertCapability(effect.capability, effect.operation) }));",
    "    for (const { effect, capability } of declaredEffects) {",
    "      if (capability.providerId !== 'factory') throw new Error(`External provider capability '${effect.capability}' requires an activated adapter for provider '${capability.providerId}'.`);",
    "    }",
    "    for (const { effect } of declaredEffects) {",
    "      const at = new Date().toISOString();",
    "      const handler = getEffectHandler(effect.capability, effect.operation);",
    "      await handler({ role, entityKey, recordId, operation: effect.operation, store: this.store, now: at });",
    "      await this.store.appendCapabilityEvent({ actor: role, capability: effect.capability, operation: effect.operation, entity: entityKey, recordId, outcome: 'completed', at });",
    "    }",
    "  }",
    "",
    "  async list(role: string, entityKey: string): Promise<readonly StoredRecord[]> {",
    "    this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'read');",
    "    return getRecordHandler().list({ store: this.store, entityKey });",
    "  }",
    "",
    "  async create(role: string, entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    const entity = this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'create');",
    "    const allowedFields = new Set(entity.fields.map((field) => field.key));",
    "    const unknown = Object.keys(input).find((key) => !allowedFields.has(key));",
    "    if (unknown) throw new Error(`Unknown field '${unknown}' for '${entityKey}'.`);",
    "    const flow = this.flow(entityKey);",
    "    for (const field of entity.fields) {",
    "      const supplied = input[field.key];",
    "      const suppliedByFlow = field.key === 'status' && !!flow;",
    "      if (field.required && supplied === undefined && !suppliedByFlow) {",
    "        throw new Error(`Required field '${field.key}' is missing.`);",
    "      }",
    "    }",
    "    const record = await getRecordHandler().create({",
    "      store: this.store,",
    "      entityKey,",
    "      input: { ...input, ...(flow ? { status: flow.initialState } : {}) },",
    "    });",
    "    await this.store.appendAudit({ actor: role, action: 'create', entity: entityKey, recordId: record.id, at: new Date().toISOString() });",
    "    return record;",
    "  }",
    "",
    ...(commerce
      ? [
          "  async addCartItem(role: string, orderEntity: string, orderRecordId: string, input: { catalogEntity: string; catalogRecordId: string; quantity: number }): Promise<CommerceLineItem> {",
          "    this.entity(orderEntity);",
          "    this.entity(input.catalogEntity);",
          "    this.assertCapability('cart.add', 'add');",
          "    if (!providedEffects.has('cart.add')) throw new Error('Unsupported capability effect \\'cart.add\\'.');",
          "    await this.assertAllowed(role, orderEntity, 'create');",
          "    await this.assertAllowed(role, input.catalogEntity, 'read');",
          "    const order = await this.store.find(orderEntity, orderRecordId);",
          "    if (!order) throw new Error(`Cart '${orderRecordId}' was not found.`);",
          "    if (order.status !== 'cart') throw new Error(`Order '${orderRecordId}' is not an active cart.`);",
          "    const catalogRecord = await this.store.find(input.catalogEntity, input.catalogRecordId);",
          "    if (!catalogRecord) throw new Error(`Catalog record '${input.catalogRecordId}' was not found.`);",
          "    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error('Cart quantity must be a positive integer.');",
          "    const item = await this.store.addCartItem({ actor: role, orderEntity, orderRecordId, ...input });",
          "    const at = new Date().toISOString();",
          "    await this.store.appendAudit({ actor: role, action: 'cart.add', entity: orderEntity, recordId: orderRecordId, at });",
          "    await this.store.appendCapabilityEvent({ actor: role, capability: 'cart.add', operation: 'add', entity: orderEntity, recordId: orderRecordId, outcome: 'completed', at });",
          "    return item;",
          "  }",
          "",
          "  async cartItems(role: string, orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    this.entity(orderEntity);",
          "    await this.assertAllowed(role, orderEntity, 'read');",
          "    return this.store.listCartItems(orderEntity, orderRecordId);",
          "  }",
          "",
        ]
      : []),
    "  async transition(role: string, entityKey: string, recordId: string, event: string): Promise<StoredRecord> {",
    "    this.entity(entityKey);",
    "    const flow = this.flow(entityKey);",
    "    if (!flow) throw new Error(`Entity '${entityKey}' has no declared flow.`);",
    "    const record = await this.store.find(entityKey, recordId);",
    "    if (!record) throw new Error(`Record '${recordId}' was not found.`);",
    "    const transition = flow.transitions.find((candidate) => candidate.from === record.status && candidate.event === event);",
    "    if (!transition) throw new Error(`Event '${event}' is not valid from '${record.status}'.`);",
    "    if (transition.roles?.length && !transition.roles.includes(role)) {",
    "      throw new Error(`Role '${role}' cannot trigger '${event}'.`);",
    "    }",
    "    if (transition.roles?.length) await this.assertTransitionAllowed(role, entityKey, event);",
    "    else await this.assertAllowed(role, entityKey, 'read');",
    "    const workflowHandler = getWorkflowHandler();",
    "    await this.executeEffects(role, entityKey, recordId, transition.effects);",
    "    const updated = await workflowHandler.applyTransition({",
    "      store: this.store,",
    "      entityKey,",
    "      recordId,",
    "      nextState: transition.to,",
    "    });",
    "    await this.store.appendAudit({ actor: role, action: event, entity: entityKey, recordId, at: new Date().toISOString() });",
    "    return updated;",
    "  }",
    "",
    "  async auditLog(role: string): Promise<readonly AuditEvent[]> {",
    "    const permitted = definition.permissions.some((permission) =>",
    "      permission.role === role && permission.actions.includes('audit'),",
    "    );",
    "    if (!permitted) throw new Error(`Role '${role}' cannot read audit evidence.`);",
    "    return this.store.listAudit();",
    "  }",
    "",
    "  async capabilityEvents(role: string): Promise<readonly CapabilityEvent[]> {",
    "    if (!definition.permissions.some((permission) => permission.role === role && permission.actions.includes('audit'))) {",
    "      throw new Error(`Role '${role}' cannot read capability evidence.`);",
    "    }",
    "    return this.store.listCapabilityEvents();",
    "  }",
    "}",
    "",
    "export const applicationRuntime = new ApplicationRuntime();",
    "",
  ].join("\n");
}

function renderPrismaRecordStore(graph: ApplicationGraphV1): string {
  const commerce = hasCommerceCapabilities(graph);
  const delegates = Object.fromEntries(
    graph.domain.entities.map((entity) => [
      entity.key,
      toCamelCase(entity.key),
    ]),
  );
  return [
    'import { PrismaClient } from "@prisma/client";',
    `import type { AuditEvent, CapabilityEvent,${commerce ? " CommerceLineItem," : ""} RecordStore, StoredRecord } from "./application-runtime.js";`,
    "",
    "type CrudDelegate = {",
    "  findMany(): Promise<unknown[]>;",
    "  findUnique(input: { where: { id: string } }): Promise<unknown | null>;",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;",
    "};",
    "type AuditDelegate = {",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  findMany(input: { orderBy: { at: 'asc' } }): Promise<unknown[]>;",
    "};",
    "type CapabilityDelegate = {",
    "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
    "  findMany(input: { orderBy: { at: 'asc' } }): Promise<unknown[]>;",
    "};",
    ...(commerce
      ? [
          "type CommerceLineDelegate = {",
          "  create(input: { data: Record<string, unknown> }): Promise<unknown>;",
          "  findMany(input: { where: { orderEntity: string; orderRecordId: string }; orderBy: { createdAt: 'asc' } }): Promise<unknown[]>;",
          "};",
        ]
      : []),
    `const delegates: Readonly<Record<string, string>> = ${JSON.stringify(delegates, null, 2)};`,
    "",
    "function asStoredRecord(value: unknown): StoredRecord { return value as StoredRecord; }",
    "",
    "export class PrismaRecordStore implements RecordStore {",
    "  constructor(private readonly prisma: PrismaClient) {}",
    "",
    "  private delegate(entityKey: string): CrudDelegate {",
    "    const delegateKey = delegates[entityKey];",
    "    if (!delegateKey) throw new Error(`Unknown persisted entity '${entityKey}'.`);",
    "    const client = this.prisma as unknown as Record<string, CrudDelegate>;",
    "    return client[delegateKey]!;",
    "  }",
    "",
    "  private auditDelegate(): AuditDelegate {",
    "    return (this.prisma as unknown as { auditEvent: AuditDelegate }).auditEvent;",
    "  }",
    "",
    "  private capabilityDelegate(): CapabilityDelegate {",
    "    return (this.prisma as unknown as { capabilityEvent: CapabilityDelegate }).capabilityEvent;",
    "  }",
    ...(commerce
      ? [
          "",
          "  private commerceLineDelegate(): CommerceLineDelegate {",
          "    return (this.prisma as unknown as { commerceLineItem: CommerceLineDelegate }).commerceLineItem;",
          "  }",
        ]
      : []),
    "",
    "  async list(entityKey: string): Promise<readonly StoredRecord[]> {",
    "    return (await this.delegate(entityKey).findMany()).map(asStoredRecord);",
    "  }",
    "",
    "  async find(entityKey: string, recordId: string): Promise<StoredRecord | undefined> {",
    "    const record = await this.delegate(entityKey).findUnique({ where: { id: recordId } });",
    "    return record ? asStoredRecord(record) : undefined;",
    "  }",
    "",
    "  async create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    return asStoredRecord(await this.delegate(entityKey).create({ data: input }));",
    "  }",
    "",
    "  async update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord> {",
    "    return asStoredRecord(await this.delegate(entityKey).update({ where: { id: recordId }, data: input }));",
    "  }",
    "",
    "  async appendAudit(event: AuditEvent): Promise<void> {",
    "    await this.auditDelegate().create({ data: { ...event, at: new Date(event.at) } });",
    "  }",
    "",
    "  async listAudit(): Promise<readonly AuditEvent[]> {",
    "    return (await this.auditDelegate().findMany({ orderBy: { at: 'asc' } })).map((entry) => {",
    "      const event = entry as Omit<AuditEvent, 'at'> & { at: Date };",
    "      return { ...event, at: event.at.toISOString() };",
    "    });",
    "  }",
    "",
    "  async appendCapabilityEvent(event: CapabilityEvent): Promise<void> {",
    "    await this.capabilityDelegate().create({ data: { ...event, at: new Date(event.at) } });",
    "  }",
    "",
    "  async listCapabilityEvents(): Promise<readonly CapabilityEvent[]> {",
    "    return (await this.capabilityDelegate().findMany({ orderBy: { at: 'asc' } })).map((entry) => {",
    "      const event = entry as Omit<CapabilityEvent, 'at'> & { at: Date };",
    "      return { ...event, at: event.at.toISOString(), outcome: 'completed' as const };",
    "    });",
    "  }",
    ...(commerce
      ? [
          "",
          "  async addCartItem(input: Omit<CommerceLineItem, 'id'>): Promise<CommerceLineItem> {",
          "    return asStoredRecord(await this.commerceLineDelegate().create({ data: input })) as CommerceLineItem;",
          "  }",
          "",
          "  async listCartItems(orderEntity: string, orderRecordId: string): Promise<readonly CommerceLineItem[]> {",
          "    return (await this.commerceLineDelegate().findMany({ where: { orderEntity, orderRecordId }, orderBy: { createdAt: 'asc' } })) as CommerceLineItem[];",
          "  }",
          "",
          "  async decrementInventory(entityKey: string, recordId: string, quantity: number): Promise<StoredRecord> {",
          "    const record = await this.find(entityKey, recordId);",
          "    if (!record || typeof record.stock !== 'number') throw new Error(`Catalog record '${recordId}' has no numeric stock.`);",
          "    if (record.stock < quantity) throw new Error(`Catalog record '${recordId}' has insufficient stock.`);",
          "    return this.update(entityKey, recordId, { stock: record.stock - quantity });",
          "  }",
        ]
      : []),
    "}",
    "",
  ].join("\n");
}

function renderWebPage(graph: ApplicationGraphV1): string {
  return [
    'import { GeneratedApplicationClient } from "./generated-application-client";',
    'import { applicationManifest } from "./application-manifest";',
    "",
    "export default function GeneratedApplication() {",
    "  return <GeneratedApplicationClient manifest={applicationManifest} />;",
    "}",
    "",
  ].join("\n");
}

function renderFaviconRoute(): string {
  return [
    "export function GET() {",
    '  return new Response(\'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0b766e"/><path d="M17 32h30M32 17v30" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>\', { headers: { \'content-type\': \'image/svg+xml\', \'cache-control\': \'public, max-age=86400\' } });',
    "}",
    "",
  ].join("\n");
}

function renderWebManifest(graph: ApplicationGraphV1): string {
  const creationLabels = Object.fromEntries(
    graph.domain.entities.map((entity) => [
      entity.key,
      `Create ${entity.label.toLowerCase()}`,
    ]),
  );
  return `export const applicationManifest = ${JSON.stringify(
    {
      metadata: graph.metadata,
      page: graph.page,
      domain: graph.domain,
      policy: graph.policy,
      flow: graph.flow,
      integration: graph.integration,
      creationLabels,
    },
    null,
    2,
  )} as const;\n`;
}

function renderGeneratedApplicationClient(): string {
  return [
    '"use client";',
    "",
    'import { useEffect, useMemo, useState } from "react";',
    "type Manifest = {",
    "  readonly metadata: { readonly name: string };",
    "  readonly page: { readonly pages: readonly { readonly id: string; readonly route: string; readonly title: string; readonly blocks: readonly { readonly type: string; readonly entity?: string }[] }[]; readonly navigation: readonly { readonly id: string; readonly label: string; readonly pageId: string }[] };",
    "  readonly domain: { readonly entities: readonly { readonly key: string; readonly label: string; readonly fields: readonly { readonly key: string; readonly required: boolean }[] }[] };",
    "  readonly policy: { readonly roles: readonly string[]; readonly permissions: readonly { readonly role: string; readonly resource: string; readonly actions: readonly string[] }[] };",
    "  readonly flow: { readonly flows: readonly { readonly entity: string; readonly events: readonly string[] }[] };",
    "  readonly integration: { readonly capabilities: readonly { readonly key: string }[] };",
    "  readonly creationLabels: Readonly<Record<string, string>>;",
    "};",
    "type JsonRecord = Record<string, unknown>;",
    "",
    "export function GeneratedApplicationClient({ manifest }: { manifest: Manifest }) {",
    "  const entities = manifest.domain.entities;",
    "  const [role, setRole] = useState(manifest.policy.roles[0] ?? 'anonymous');",
    "  const [entityKey, setEntityKey] = useState(entities[0]?.key ?? '');",
    "  const [records, setRecords] = useState<readonly JsonRecord[]>([]);",
    "  const [values, setValues] = useState<Record<string, string>>({});",
    "  const [error, setError] = useState<string | null>(null);",
    "  const [cartId, setCartId] = useState<string | null>(null);",
    "  const [cartCount, setCartCount] = useState(0);",
    "  const entity = useMemo(() => entities.find((candidate) => candidate.key === entityKey), [entities, entityKey]);",
    "  const commerceEnabled = manifest.integration.capabilities.some((capability) => capability.key === 'cart.add');",
    "  const catalogEntity = useMemo(() => manifest.page.pages.flatMap((page) => page.blocks).find((block) => block.type === 'catalog')?.entity, [manifest.page.pages]);",
    "  const orderEntity = useMemo(() => manifest.flow.flows.find((flow) => flow.events.includes('pay'))?.entity, [manifest.flow.flows]);",
    "  const can = (action: string) => manifest.policy.permissions.some((permission) => permission.role === role && (permission.resource === entityKey || permission.resource === '*') && permission.actions.includes(action));",
    "  const headers = () => ({ 'content-type': 'application/json', 'x-factory-role': role });",
    "  const refresh = async () => {",
    "    if (!entityKey || !can('read')) { setRecords([]); return; }",
    "    const response = await fetch(`/api/${entityKey}`, { headers: headers() });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setRecords(await response.json() as readonly JsonRecord[]);",
    "  };",
    "  useEffect(() => { void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load records.')); }, [entityKey, role]);",
    "  const create = async () => {",
    "    if (!entity || !can('create')) return;",
    "    setError(null);",
    "    const payload = Object.fromEntries(entity.fields.filter((field) => field.key !== 'status').map((field) => [field.key, values[field.key] ?? '']));",
    "    const response = await fetch(`/api/${entity.key}`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setValues({});",
    "    await refresh();",
    "  };",
    "  const refreshCart = async (activeCartId = cartId) => {",
    "    if (!commerceEnabled || !orderEntity || !activeCartId) return;",
    "    const response = await fetch(`/api/commerce/${orderEntity}/${activeCartId}/items`, { headers: headers() });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    const items = await response.json() as readonly JsonRecord[];",
    "    setCartCount(items.length);",
    "  };",
    "  const addToCart = async (catalogRecordId: string) => {",
    "    if (!commerceEnabled || !catalogEntity || !orderEntity) return;",
    "    setError(null);",
    "    let activeCartId = cartId;",
    "    if (!activeCartId) {",
    "      const created = await fetch(`/api/${orderEntity}`, { method: 'POST', headers: headers(), body: '{}' });",
    "      if (!created.ok) throw new Error(await created.text());",
    "      const cart = await created.json() as JsonRecord;",
    "      activeCartId = String(cart.id);",
    "      setCartId(activeCartId);",
    "    }",
    "    const response = await fetch(`/api/commerce/${orderEntity}/${activeCartId}/items`, { method: 'POST', headers: headers(), body: JSON.stringify({ catalogEntity, catalogRecordId, quantity: 1 }) });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    await refreshCart(activeCartId);",
    "  };",
    "  const checkoutCart = async () => {",
    "    if (!commerceEnabled || !orderEntity || !cartId) return;",
    "    setError(null);",
    "    const response = await fetch(`/api/${orderEntity}/${cartId}/events/pay`, { method: 'POST', headers: headers() });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    setCartId(null);",
    "    setCartCount(0);",
    "    await refresh();",
    "  };",
    "  const transition = async (recordId: string, event: string) => {",
    "    setError(null);",
    "    const response = await fetch(`/api/${entityKey}/${recordId}/events/${event}`, { method: 'POST', headers: headers() });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    await refresh();",
    "  };",
    "  const events = manifest.flow.flows.find((flow) => flow.entity === entityKey)?.events ?? [];",
    '  if (!entity) return <main className="generated-app"><p>No domain entities are declared in this Published Graph.</p></main>;',
    "  return (",
    '    <main className="generated-app">',
    "      <header><div><p>Generated application</p><h1>{manifest.metadata.name}</h1></div><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{manifest.policy.roles.map((candidate) => <option key={candidate}>{candidate}</option>)}</select></label></header>",
    "      <nav aria-label=\"Application routes\">{manifest.page.navigation.map((item) => <a href={manifest.page.pages.find((page) => page.id === item.pageId)?.route ?? '#'} key={item.id}>{item.label}</a>)}</nav>",
    '      <section className="generated-workspace">',
    "        <aside><h2>Records</h2>{entities.map((candidate) => <button className={candidate.key === entityKey ? 'active' : ''} key={candidate.key} onClick={() => setEntityKey(candidate.key)} type=\"button\">{candidate.label}</button>)}</aside>",
    '        <div className="generated-content">',
    '          <div className="generated-title"><div><p>{role} view</p><h2>{entity.label}</h2></div><div className="generated-actions">{commerceEnabled && <span className="generated-cart">Cart {cartCount}</span>}{commerceEnabled && cartId && <button onClick={() => void checkoutCart().catch((reason) => setError(reason instanceof Error ? reason.message : \'Unable to check out cart.\'))} type="button">Checkout cart</button>}<button onClick={() => void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : \'Unable to refresh records.\'))} type="button">Refresh</button></div></div>',
    "          {can('create') && <form onSubmit={(event) => { event.preventDefault(); void create().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to create record.')); }}><h3>{manifest.creationLabels[entity.key]}</h3>{entity.fields.filter((field) => field.key !== 'status').map((field) => <label key={field.key}>{field.key}<input required={field.required} value={values[field.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}<button type=\"submit\">Create</button></form>}",
    '          {error && <p role="alert" className="generated-error">{error}</p>}',
    "          <ul className=\"generated-records\">{records.map((record) => <li key={String(record.id)}><code>{JSON.stringify(record)}</code><span>{commerceEnabled && entityKey === catalogEntity && can('read') && <button onClick={() => void addToCart(String(record.id)).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to add item to cart.'))} type=\"button\">Add to cart</button>}{events.map((event) => <button key={event} onClick={() => void transition(String(record.id), event).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to transition record.'))} type=\"button\">{event}</button>)}</span></li>)}</ul>",
    "        </div>",
    "      </section>",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function renderWebProxyRoute(): string {
  return [
    'export const dynamic = "force-dynamic";',
    "",
    "type RouteContext = { params: Promise<{ path: string[] }> };",
    "",
    "async function proxy(request: Request, context: RouteContext): Promise<Response> {",
    "  const { path } = await context.params;",
    "  const incoming = new URL(request.url);",
    "  const upstream = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, process.env.FACTORY_API_URL ?? process.env.NEXT_PUBLIC_FACTORY_API_URL ?? 'http://localhost:3001');",
    "  upstream.search = incoming.search;",
    "  const response = await fetch(upstream, {",
    "    method: request.method,",
    "    headers: { 'content-type': request.headers.get('content-type') ?? 'application/json', 'x-factory-role': request.headers.get('x-factory-role') ?? 'anonymous' },",
    "    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),",
    "  });",
    "  return new Response(await response.text(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } });",
    "}",
    "",
    "export const GET = proxy;",
    "export const POST = proxy;",
    "",
  ].join("\n");
}

function renderWebStyles(): string {
  return [
    ":root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f8fb; color: #122022; }",
    "* { box-sizing: border-box; } body { margin: 0; } button, input, select { font: inherit; }",
    ".generated-app { max-width: 1120px; margin: 0 auto; padding: 40px 24px 72px; }",
    ".generated-app header, .generated-title, .generated-actions, .generated-app nav, .generated-workspace, .generated-records li { display: flex; align-items: center; gap: 16px; }",
    ".generated-app header, .generated-title { justify-content: space-between; } .generated-app h1, .generated-app h2 { margin: 4px 0; } .generated-app p { color: #5b6870; }",
    ".generated-app nav { margin: 24px 0; } .generated-app nav a, .generated-app button { border: 1px solid #cbd6d9; border-radius: 8px; padding: 8px 12px; background: #fff; color: inherit; text-decoration: none; cursor: pointer; }",
    ".generated-workspace { align-items: flex-start; background: #fff; border: 1px solid #dce4e7; border-radius: 16px; overflow: hidden; } .generated-workspace aside { display: grid; gap: 8px; min-width: 180px; padding: 20px; border-right: 1px solid #dce4e7; } .generated-workspace aside button.active, .generated-content form button { background: #0b766e; color: white; border-color: #0b766e; }",
    ".generated-content { flex: 1; padding: 24px; min-width: 0; } .generated-content form { display: grid; gap: 12px; padding: 16px; margin: 20px 0; background: #f6f8fb; border-radius: 12px; } .generated-content form label { display: grid; gap: 6px; } .generated-content input { border: 1px solid #cbd6d9; border-radius: 8px; padding: 9px; }",
    ".generated-records { display: grid; gap: 8px; padding: 0; list-style: none; } .generated-records li { justify-content: space-between; padding: 12px; background: #f6f8fb; border-radius: 10px; } .generated-records span { display: flex; gap: 6px; flex-wrap: wrap; } .generated-cart { border-radius: 999px; background: #e3f4f0; color: #0d675b; padding: 7px 10px; font-weight: 700; } .generated-error { color: #b42318; }",
    "@media (max-width: 720px) { .generated-workspace { display: block; } .generated-workspace aside { border-right: 0; border-bottom: 1px solid #dce4e7; } .generated-app header { align-items: flex-start; flex-direction: column; } }",
    "",
  ].join("\n");
}

function renderSimulator(graph: ApplicationGraphV1): string {
  const definition = JSON.stringify({
    applicationName: graph.metadata.name,
    roles: graph.policy.roles,
    flows: graph.flow.flows.map((flow) => ({
      id: flow.id,
      entity: flow.entity,
      initialState: flow.initialState,
      transitions: flow.transitions,
    })),
  }).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${graph.metadata.name} simulator</title>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f8fb; color: #122022; }
      body { margin: 0; } main { max-width: 880px; margin: 0 auto; padding: 48px 24px; } header, .controls, .event-list, .history li { display: flex; gap: 12px; align-items: center; } header { justify-content: space-between; } h1 { margin: 4px 0; } p { color: #5b6870; } select, button { border: 1px solid #cad5d9; border-radius: 8px; padding: 9px 12px; font: inherit; background: #fff; } button { cursor: pointer; } button:not(:disabled) { background: #08756d; border-color: #08756d; color: #fff; } button:disabled { cursor: not-allowed; opacity: .48; } .card { margin-top: 24px; padding: 24px; border: 1px solid #dce4e7; border-radius: 16px; background: #fff; } .state { font-size: 1.25rem; font-weight: 700; } .history { display: grid; gap: 8px; padding: 0; list-style: none; } .history li { padding: 9px 12px; border-radius: 8px; background: #f2f7f7; } .denied { color: #b42318; } @media (max-width: 640px) { header, .controls { align-items: flex-start; flex-direction: column; } }
    </style>
  </head>
  <body>
    <main>
      <header><div><p>Published Graph projection</p><h1 id="application-name"></h1></div><strong>Role simulator</strong></header>
      <section class="card"><div class="controls"><label>Role <select id="role"></select></label><label>Flow <select id="flow"></select></label><button id="reset" type="button">Reset scenario</button></div><p>Current state</p><div class="state" id="state"></div><div class="event-list" id="events"></div></section>
      <section class="card"><h2>Scenario history</h2><ul class="history" id="history"></ul></section>
    </main>
    <script>
      const definition = ${definition};
      const selectedRole = document.querySelector('#role');
      const selectedFlow = document.querySelector('#flow');
      const stateElement = document.querySelector('#state');
      const eventsElement = document.querySelector('#events');
      const historyElement = document.querySelector('#history');
      let currentState = '';
      let history = [];
      document.querySelector('#application-name').textContent = definition.applicationName;
      for (const role of definition.roles) { const option = document.createElement('option'); option.value = role; option.textContent = role; selectedRole.append(option); }
      for (const flow of definition.flows) { const option = document.createElement('option'); option.value = flow.id; option.textContent = flow.id + ' · ' + flow.entity; selectedFlow.append(option); }
      function flow() { return definition.flows.find((candidate) => candidate.id === selectedFlow.value); }
      function reset() { const active = flow(); currentState = active ? active.initialState : 'No FlowModel declared'; history = active ? ['Scenario reset to ' + currentState + '.'] : ['No FlowModel is available.']; render(); }
      function render() {
        const active = flow(); stateElement.textContent = currentState;
        eventsElement.replaceChildren();
        if (!active) return;
        const transitions = active.transitions.filter((transition) => transition.from === currentState);
        for (const transition of transitions) {
          const allowed = !transition.roles || transition.roles.includes(selectedRole.value);
          const button = document.createElement('button'); button.type = 'button'; button.textContent = transition.event; button.disabled = !allowed;
          button.onclick = () => { if (!allowed) { history.unshift('Transition denied: ' + selectedRole.value + ' cannot trigger ' + transition.event + '.'); render(); return; } currentState = transition.to; history.unshift(selectedRole.value + ' triggered ' + transition.event + ' → ' + currentState + '.'); render(); };
          eventsElement.append(button);
        }
        historyElement.replaceChildren(...history.map((entry) => { const item = document.createElement('li'); item.textContent = entry; if (entry.startsWith('Transition denied')) item.className = 'denied'; return item; }));
      }
      selectedRole.addEventListener('change', render); selectedFlow.addEventListener('change', reset); document.querySelector('#reset').addEventListener('click', reset); reset();
    </script>
  </body>
</html>
`;
}

function renderApiMain(graph: ApplicationGraphV1): string {
  const commerce = hasCommerceCapabilities(graph);
  return [
    'import { Body, Controller, Get, HttpException, HttpStatus, Module, Param, Post, Req } from "@nestjs/common";',
    'import { NestFactory } from "@nestjs/core";',
    'import { PrismaClient } from "@prisma/client";',
    'import { ApplicationRuntime } from "./application-runtime.js";',
    'import { PrismaRecordStore } from "./prisma-record-store.js";',
    "",
    "const prisma = new PrismaClient();",
    "const applicationRuntime = new ApplicationRuntime(new PrismaRecordStore(prisma));",
    "",
    "function roleFrom(request: { headers: Record<string, string | string[] | undefined> }): string {",
    "  const value = request.headers['x-factory-role'];",
    "  return typeof value === 'string' && value ? value : 'anonymous';",
    "}",
    "",
    "function rejected(error: unknown): HttpException {",
    "  return new HttpException(error instanceof Error ? error.message : 'Request rejected.', HttpStatus.FORBIDDEN);",
    "}",
    "",
    '@Controller("api")',
    "class GeneratedController {",
    `  @Get("health") health() { return { application: ${JSON.stringify(graph.metadata.name)}, status: "ok" }; }`,
    "",
    "  @Get('audit')",
    "  async audit(@Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.auditLog(roleFrom(request)); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    ...(commerce
      ? [
          "  @Get('commerce/:entity/:recordId/items')",
          "  async cartItems(@Param('entity') entity: string, @Param('recordId') recordId: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
          "    try { return await applicationRuntime.cartItems(roleFrom(request), entity, recordId); } catch (error) { throw rejected(error); }",
          "  }",
          "",
          "  @Post('commerce/:entity/:recordId/items')",
          "  async addCartItem(@Param('entity') entity: string, @Param('recordId') recordId: string, @Body() body: { catalogEntity: string; catalogRecordId: string; quantity: number }, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
          "    try { return await applicationRuntime.addCartItem(roleFrom(request), entity, recordId, body); } catch (error) { throw rejected(error); }",
          "  }",
          "",
        ]
      : []),
    "  @Get('capability-events')",
    "  async capabilityEvents(@Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.capabilityEvents(roleFrom(request)); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    "  @Get(':entity')",
    "  async list(@Param('entity') entity: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.list(roleFrom(request), entity); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    "  @Post(':entity')",
    "  async create(@Param('entity') entity: string, @Body() body: Record<string, unknown>, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.create(roleFrom(request), entity, body); } catch (error) { throw rejected(error); }",
    "  }",
    "",
    "  @Post(':entity/:recordId/events/:event')",
    "  async transition(@Param('entity') entity: string, @Param('recordId') recordId: string, @Param('event') event: string, @Req() request: { headers: Record<string, string | string[] | undefined> }) {",
    "    try { return await applicationRuntime.transition(roleFrom(request), entity, recordId, event); } catch (error) { throw rejected(error); }",
    "  }",
    "}",
    "",
    "@Module({ controllers: [GeneratedController] })",
    "class GeneratedModule {}",
    "",
    "async function bootstrap() {",
    "  const app = await NestFactory.create(GeneratedModule);",
    "  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true });",
    "  await app.listen(process.env.PORT ?? 3001);",
    "}",
    "void bootstrap();",
    "",
  ].join("\n");
}

function defaultJourneyValue(
  field: ApplicationGraphV1["domain"]["entities"][number]["fields"][number],
  initialState: string | undefined,
): unknown {
  if (field.key === "status" && initialState) return initialState;
  if (field.type === "integer" || field.type === "decimal") return 1;
  if (field.type === "boolean") return true;
  if (field.type === "date") return "2026-01-01";
  if (field.type === "datetime") return "2026-01-01T00:00:00.000Z";
  if (field.type === "enum") return field.values?.[0] ?? "sample";
  if (field.type === "email") return "user@example.test";
  if (field.type === "url") return "https://example.test";
  if (field.type === "json") return { sample: true };
  return `sample-${field.key}`;
}

function renderJourneyTest(graph: ApplicationGraphV1): string {
  const flow = graph.flow.flows[0];
  const entity =
    flow &&
    graph.domain.entities.find((candidate) => candidate.key === flow.entity);
  const createPermission =
    entity &&
    graph.policy.permissions.find(
      (permission) =>
        permission.resource === entity.key &&
        permission.actions.includes("create"),
    );
  if (!flow || !entity || !createPermission) {
    return [
      'import { describe, expect, it } from "vitest";',
      "",
      "describe('generated journey', () => {",
      "  it('records that this Graph has no declared create-and-flow journey', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
      "",
    ].join("\n");
  }
  const payload = Object.fromEntries(
    entity.fields
      .filter((field) => field.required)
      .map((field) => [
        field.key,
        defaultJourneyValue(field, flow.initialState),
      ]),
  );
  const transitions: ApplicationGraphV1["flow"]["flows"][number]["transitions"] =
    [];
  let state = flow.initialState;
  const visited = new Set<string>();
  while (true) {
    const transition = flow.transitions.find(
      (candidate) =>
        candidate.from === state &&
        !visited.has(`${candidate.from}:${candidate.event}`),
    );
    if (!transition) break;
    transitions.push(transition);
    visited.add(`${transition.from}:${transition.event}`);
    state = transition.to;
  }
  const auditRole = graph.policy.permissions.find((permission) =>
    permission.actions.includes("audit"),
  )?.role;
  const capabilityEffects = transitions.flatMap(
    (transition) => transition.effects ?? [],
  );
  const catalogEntity = graph.domain.relations.find(
    (relation) => relation.from === entity.key,
  )?.to;
  const catalogSeed = catalogEntity
    ? graph.domain.seedData?.find((seed) => seed.entity === catalogEntity)
    : undefined;
  const includesCartAdd = graph.integration.capabilities.some(
    (capability) =>
      capability.key === "cart.add" && capability.operation === "add",
  );
  const cartJourney =
    !!catalogEntity &&
    !!catalogSeed &&
    includesCartAdd &&
    transitions.some((transition) =>
      transition.effects?.some(
        (effect) =>
          effect.capability === "payment.simulate" ||
          effect.capability === "inventory.decrement",
      ),
    );
  const capabilityEventPairs = [
    ...(cartJourney ? [{ capability: "cart.add", operation: "add" }] : []),
    ...capabilityEffects.flatMap((effect) =>
      ["notification.send", "payment.simulate"].includes(effect.capability)
        ? [effect, effect]
        : [effect],
    ),
  ];
  const auditEffectCount = capabilityEffects.filter(
    (effect) => effect.capability === "audit.record",
  ).length;
  return [
    'import { describe, expect, it } from "vitest";',
    'import { applicationRuntime } from "../src/application-runtime.js";',
    "",
    "describe('generated role journey', () => {",
    "  it('executes the declared record flow', async () => {",
    `    const record = await applicationRuntime.create(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, ${JSON.stringify(payload)});`,
    `    expect(record.status).toBe(${JSON.stringify(flow.initialState)});`,
    ...(cartJourney
      ? [
          `    await applicationRuntime.addCartItem(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify({ catalogEntity, catalogRecordId: catalogSeed!.id ?? `seed-${catalogSeed!.entity}-1`, quantity: 1 })});`,
        ]
      : []),
    ...transitions.flatMap((transition) => [
      `    await applicationRuntime.transition(${JSON.stringify(transition.roles?.[0] ?? createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify(transition.event)});`,
      `    expect(record.status).toBe(${JSON.stringify(transition.to)});`,
    ]),
    ...(auditRole
      ? [
          `    expect(await applicationRuntime.auditLog(${JSON.stringify(auditRole)})).toHaveLength(${transitions.length + 1 + auditEffectCount + (cartJourney ? 1 : 0)});`,
        ]
      : []),
    ...(auditRole && capabilityEffects.length > 0
      ? [
          `    const capabilityEvents = await applicationRuntime.capabilityEvents(${JSON.stringify(auditRole)});`,
          `    expect(capabilityEvents.map((entry) => [entry.capability, entry.operation])).toEqual(${JSON.stringify(capabilityEventPairs.map((effect) => [effect.capability, effect.operation]))});`,
        ]
      : []),
    "  });",
    "});",
    "",
  ].join("\n");
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function relationshipCardinality(
  kind: ApplicationGraphV1["domain"]["relations"][number]["kind"],
): readonly [string, string] {
  switch (kind) {
    case "one-to-one":
      return ["1", "1"];
    case "one-to-many":
      return ["1", "*"];
    case "many-to-one":
      return ["*", "1"];
    case "many-to-many":
      return ["*", "*"];
  }
}

function renderApiReference(graph: ApplicationGraphV1): string {
  const endpoints = [
    ["GET", "/api/health", "Return generated application health."],
    [
      "GET",
      "/api/:entity",
      "List a declared DomainModel entity for the caller role.",
    ],
    [
      "POST",
      "/api/:entity",
      "Create a declared DomainModel entity for the caller role.",
    ],
    [
      "POST",
      "/api/:entity/:recordId/events/:event",
      "Trigger a declared FlowModel event when policy and state allow it.",
    ],
    [
      "GET",
      "/api/audit",
      "Read immutable audit events when policy permits audit.",
    ],
    [
      "GET",
      "/api/capability-events",
      "Read executed declared capability effects when policy permits audit.",
    ],
    ...(hasCommerceCapabilities(graph)
      ? [
          [
            "GET",
            "/api/commerce/:entity/:recordId/items",
            "Read cart items for the caller role.",
          ],
          [
            "POST",
            "/api/commerce/:entity/:recordId/items",
            "Add a declared catalog item to a cart for the caller role.",
          ],
        ]
      : []),
  ] as const;
  const entities = graph.domain.entities.length
    ? graph.domain.entities
        .map((entity) => `- \`${entity.key}\` — ${entity.label}`)
        .join("\n")
    : "- No entities declared.";
  const flows = graph.flow.flows.length
    ? graph.flow.flows
        .map(
          (flow) =>
            `- \`${flow.id}\` on \`${flow.entity}\`: ${flow.events.map((event) => `\`${event}\``).join(", ") || "no events"}`,
        )
        .join("\n")
    : "- No flows declared.";
  return `# API reference\n\nThis API is compiled from the immutable Published Graph for **${graph.metadata.name}**. Every request is role-scoped through the \`x-factory-role\` header.\n\n## Endpoints\n\n| Method | Path | Contract |\n| --- | --- | --- |\n${endpoints.map(([method, path, description]) => `| ${method} | \`${path}\` | ${description} |`).join("\n")}\n\n## Domain endpoints\n\n${entities}\n\n## Declared flow events\n\n${flows}\n`;
}

function renderEntityRelationshipDiagram(graph: ApplicationGraphV1): string {
  const entities = graph.domain.entities.map((entity) => {
    const fields = entity.fields.length
      ? entity.fields
          .map(
            (field) =>
              `- \`${field.key}\`: ${field.type}${field.required ? " (required)" : ""}${field.unique ? ", unique" : ""}`,
          )
          .join("\n")
      : "- No fields declared.";
    const indexes = entity.indexes.length
      ? `\n\nIndexes: ${entity.indexes.map((index) => `\`${index.fields.join(", ")}\`${index.unique ? " (unique)" : ""}`).join("; ")}`
      : "";
    return `### ${entity.label} (\`${entity.key}\`)\n\n${fields}${indexes}`;
  });
  const relationships = graph.domain.relations.length
    ? graph.domain.relations
        .map((relation) => {
          const [from, to] = relationshipCardinality(relation.kind);
          return `- \`${relation.from}\` ${from} → ${to} \`${relation.to}\`${relation.field ? ` via \`${relation.field}\`` : ""}`;
        })
        .join("\n")
    : "- No relationships declared.";
  return `# Entity relationship diagram\n\nThis document is a deterministic DomainModel projection, not a reverse-engineered database schema.\n\n## Relationships\n\n${relationships}\n\n## Entities\n\n${entities.join("\n\n") || "No entities declared."}\n`;
}

function renderPermissionMatrix(graph: ApplicationGraphV1): string {
  const rows = graph.policy.permissions.length
    ? graph.policy.permissions
        .map(
          (permission) =>
            `| ${markdownCell(permission.role)} | ${markdownCell(permission.resource)} | ${permission.actions.map(markdownCell).join(", ")} |`,
        )
        .join("\n")
    : "| — | — | No permissions declared |";
  return `# Permission matrix\n\nThis is the reviewable PolicyModel projection that compiles to \`api/policy/policy.csv\`.\n\n| Role | Resource | Allowed actions |\n| --- | --- | --- |\n${rows}\n\n## Declared roles\n\n${graph.policy.roles.length ? graph.policy.roles.map((role) => `- \`${role}\``).join("\n") : "- No roles declared."}\n`;
}

function renderDocumentation(graph: ApplicationGraphV1): string {
  const entities = graph.domain.entities.map(
    (entity) =>
      `- **${entity.label}**: ${entity.fields.map((field) => field.key).join(", ") || "No fields"}`,
  );
  return `# ${graph.metadata.name}\n\nThis application was compiled from a Factory Published Graph.\n\n## Generated documentation\n\n- [API reference](api-reference.md)\n- [Entity relationship diagram](entity-relationship.md)\n- [Permission matrix](permission-matrix.md)\n\n## Entities\n${entities.join("\n") || "- No entities declared."}\n`;
}

function renderCapabilityLock(graph: ApplicationGraphV1): string {
  return (
    JSON.stringify(
      {
        apiVersion: "factory.capability-lock/v1",
        applicationId: graph.metadata.id,
        graphHash: hashApplicationGraph(graph),
        assets: graph.integration.assetLocks ?? [],
      },
      null,
      2,
    ) + "\n"
  );
}

function renderCapabilityTemplateLock(
  graph: ApplicationGraphV1,
  contributions: readonly ResolvedCapabilityTemplateContribution[],
): string {
  return (
    JSON.stringify(
      {
        apiVersion: "factory.capability-template-lock/v1",
        applicationId: graph.metadata.id,
        graphHash: hashApplicationGraph(graph),
        templates: contributions.map((contribution) => ({
          assetKey: contribution.assetKey,
          assetVersion: contribution.assetVersion,
          source: contribution.source,
          target: contribution.target,
          outputSlot: contribution.outputSlot,
          digest: contribution.digest,
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

/**
 * Renders deterministic source files for one isolated generated application.
 * This function is pure: the Worker owns filesystem writes, Compose identity,
 * artifact digests, and cleanup.
 */
export function generateApplicationBundle(
  input: PublishedGraphInput,
  options: GenerateApplicationBundleOptions = {},
): GeneratedApplicationBundle {
  const plan = buildCompilationPlan(input);
  const graph = assertValidApplicationGraph(input.graph);
  const capabilityTemplates = resolveCapabilityTemplateContributions(
    graph,
    options.repositoryRoot,
  );
  const rootDirectory = `${graph.metadata.id}-${input.publishedRevisionId}`;
  const files: GeneratedFile[] = [
    {
      path: "package.json",
      content:
        JSON.stringify(
          {
            name: rootDirectory,
            private: true,
            packageManager: "pnpm@9.0.0",
            workspaces: ["web", "api", "database"],
            scripts: { test: "pnpm --filter generated-api test" },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "pnpm-workspace.yaml",
      content: "packages:\n  - web\n  - api\n  - database\n",
    },
    { path: "capability-lock.json", content: renderCapabilityLock(graph) },
    {
      path: "capability-template-lock.json",
      content: renderCapabilityTemplateLock(graph, capabilityTemplates),
    },
    { path: "simulator/index.html", content: renderSimulator(graph) },
    {
      path: "web/package.json",
      content:
        JSON.stringify(
          {
            name: "generated-web",
            private: true,
            scripts: {
              dev: "next dev --port 3000",
              build: "next build",
              start: "next start --port 3000",
            },
            dependencies: {
              next: "^15.5.0",
              react: "^19.0.0",
              "react-dom": "^19.0.0",
            },
            devDependencies: {
              "@types/node": "^22.10.0",
              "@types/react": "^19.0.0",
              typescript: "^5.7.0",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "web/tsconfig.json",
      content:
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2017",
              lib: ["dom", "dom.iterable", "esnext"],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              incremental: true,
              module: "esnext",
              esModuleInterop: true,
              moduleResolution: "node",
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: "preserve",
              plugins: [{ name: "next" }],
            },
            include: [
              "next-env.d.ts",
              "app/**/*.ts",
              "app/**/*.tsx",
              ".next/types/**/*.ts",
            ],
            exclude: ["node_modules"],
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "web/next-env.d.ts",
      content:
        '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by Factory Pilot.\n',
    },
    {
      path: "web/app/layout.tsx",
      content:
        'import type { ReactNode } from "react";\nimport "./globals.css";\n\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n',
    },
    { path: "web/app/page.tsx", content: renderWebPage(graph) },
    { path: "web/app/favicon.ico/route.ts", content: renderFaviconRoute() },
    {
      path: "web/app/application-manifest.ts",
      content: renderWebManifest(graph),
    },
    {
      path: "web/app/generated-application-client.tsx",
      content: renderGeneratedApplicationClient(),
    },
    { path: "web/app/api/[...path]/route.ts", content: renderWebProxyRoute() },
    { path: "web/app/globals.css", content: renderWebStyles() },
    {
      path: "api/package.json",
      content:
        JSON.stringify(
          {
            name: "generated-api",
            private: true,
            scripts: {
              dev: "tsx watch src/main.ts",
              build: "tsc -p tsconfig.json",
              start: "node dist/main.js",
              test: "vitest run",
            },
            dependencies: {
              "@prisma/client": "^6.19.0",
              "@nestjs/common": "^10.4.0",
              "@nestjs/core": "^10.4.0",
              "@nestjs/platform-express": "^10.4.0",
              casbin: "^5.37.0",
              "reflect-metadata": "^0.2.2",
              rxjs: "^7.8.1",
              xstate: "^5.19.0",
            },
            devDependencies: {
              "@types/node": "^22.10.0",
              prisma: "^6.19.0",
              tsx: "^4.19.0",
              typescript: "^5.7.0",
              vitest: "^2.1.0",
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "api/tsconfig.json",
      content:
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              outDir: "dist",
              strict: true,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
            },
            include: ["src/**/*.ts"],
          },
          null,
          2,
        ) + "\n",
    },
    {
      path: "api/Dockerfile",
      content:
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install && pnpm prisma generate --schema prisma/schema.prisma\nCOPY tsconfig.json ./\nCOPY src ./src\nRUN pnpm build\nCMD ["node", "dist/main.js"]\n',
    },
    { path: "api/.dockerignore", content: "node_modules\ndist\n.env\n" },
    { path: "api/src/main.ts", content: renderApiMain(graph) },
    {
      path: "api/src/capabilities/contract.ts",
      content: renderCapabilityContract(graph),
    },
    ...capabilityTemplates.map((template) => ({
      path: template.target,
      content: renderCapabilityTemplate(template, graph),
    })),
    {
      path: "api/src/capabilities/registry.ts",
      content: renderCapabilityRegistry(capabilityTemplates),
    },
    {
      path: "api/src/application-runtime.ts",
      content: renderApplicationRuntime(graph),
    },
    {
      path: "api/src/prisma-record-store.ts",
      content: renderPrismaRecordStore(graph),
    },
    { path: "api/src/policy.ts", content: renderPolicyModule(graph) },
    { path: "api/prisma/schema.prisma", content: renderPrismaSchema(graph) },
    {
      path: "database/prisma/schema.prisma",
      content: renderPrismaSchema(graph),
    },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content: renderInitialMigration(graph),
    },
    {
      path: "database/package.json",
      content:
        JSON.stringify(
          {
            name: "generated-database",
            private: true,
            scripts: {
              generate: "prisma generate --schema prisma/schema.prisma",
              "migrate:deploy":
                "prisma migrate deploy --schema prisma/schema.prisma",
              seed: "tsx prisma/seed.ts",
            },
            dependencies: { "@prisma/client": "^6.19.0" },
            devDependencies: { prisma: "^6.19.0", tsx: "^4.19.0" },
          },
          null,
          2,
        ) + "\n",
    },
    { path: "database/prisma/seed.ts", content: renderPrismaSeed(graph) },
    {
      path: "database/Dockerfile",
      content:
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install && pnpm prisma generate --schema prisma/schema.prisma\nCMD ["sh", "-c", "pnpm prisma migrate deploy --schema prisma/schema.prisma && pnpm tsx prisma/seed.ts"]\n',
    },
    { path: "database/.dockerignore", content: "node_modules\n.env\n" },
    {
      path: "api/policy/model.conf",
      content:
        "[request_definition]\nr = sub, obj, act\n\n[policy_definition]\np = sub, obj, act\n\n[policy_effect]\ne = some(where (p.eft == allow))\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n",
    },
    { path: "api/policy/policy.csv", content: renderCasbinPolicy(graph) },
    {
      path: "api/src/flows/definitions.ts",
      content: renderFlowDefinitions(graph),
    },
    { path: "api/src/flows/machines.ts", content: renderFlowMachines() },
    {
      path: "api/test/journey.generated.test.ts",
      content: renderJourneyTest(graph),
    },
    {
      path: "tests/journeys.generated.md",
      content: `# Generated role journeys\n\nGraph: ${plan.graphHash}\n`,
    },
    { path: "docs/api-reference.md", content: renderApiReference(graph) },
    {
      path: "docs/entity-relationship.md",
      content: renderEntityRelationshipDiagram(graph),
    },
    {
      path: "docs/permission-matrix.md",
      content: renderPermissionMatrix(graph),
    },
    { path: "docs/application.md", content: renderDocumentation(graph) },
    {
      path: "web/Dockerfile",
      content:
        'FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCOPY . .\nRUN pnpm build\nCMD ["pnpm", "start"]\n',
    },
    { path: "web/.dockerignore", content: "node_modules\n.next\n.env\n" },
    {
      path: "docker-compose.yml",
      content: `name: \${FACTORY_COMPOSE_PROJECT_NAME:-factory-${rootDirectory}}\n\nservices:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: generated\n      POSTGRES_PASSWORD: generated\n      POSTGRES_DB: generated\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U generated -d generated\"]\n      interval: 5s\n      timeout: 3s\n      retries: 20\n  migrate:\n    build: ./database\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    depends_on:\n      postgres:\n        condition: service_healthy\n  api:\n    build: ./api\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    ports:\n      - \"\${FACTORY_API_PORT:-3001}:3001\"\n    depends_on:\n      migrate:\n        condition: service_completed_successfully\n  web:\n    build: ./web\n    environment:\n      FACTORY_API_URL: http://api:3001\n      NEXT_PUBLIC_FACTORY_API_URL: http://localhost:\${FACTORY_API_PORT:-3001}\n    ports:\n      - \"\${FACTORY_WEB_PORT:-3000}:3000\"\n    depends_on:\n      - api\n`,
    },
    {
      path: "README.md",
      content: `# ${graph.metadata.name}\n\nThis application was compiled from the immutable Published Graph \`${plan.graphHash}\`.\n\n## Run locally\n\nThe default Compose project name is revision-isolated. Choose unique host ports for every generated application.\n\n\`\`\`sh\nFACTORY_COMPOSE_PROJECT_NAME=factory-${rootDirectory} FACTORY_WEB_PORT=4300 FACTORY_API_PORT=4301 docker compose up --build\n\`\`\`\n\nThe migration service must complete before the API starts. To remove this isolated local runtime and its database volume:\n\n\`\`\`sh\ndocker compose down --volumes --remove-orphans\n\`\`\`\n`,
    },
  ];

  return { rootDirectory, graphHash: plan.graphHash, files };
}
