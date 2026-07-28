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
  { key: "simulator", label: "Role simulator", description: "Browser-only seed scenario simulator." },
  { key: "next-web", label: "Next.js web", description: "Standalone customer and operator web application." },
  { key: "nest-api", label: "NestJS API", description: "Standalone REST API and flow handlers." },
  { key: "prisma-postgres", label: "Prisma PostgreSQL", description: "Schema, migrations, and seed data." },
  { key: "casbin-policy", label: "Casbin policy", description: "Compiled authorization policy and guards." },
  { key: "xstate-flow", label: "XState flows", description: "Compiled declared state machines." },
  { key: "test-suite", label: "Journey tests", description: "Role, API, flow, and smoke tests." },
  { key: "documentation", label: "Documentation", description: "API reference, ERD, and permission matrix." },
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

const artifactBlueprint: Readonly<Record<CompilationTargetKey, readonly Omit<CompilationArtifactPlan, "target">[]>> = {
  simulator: [{ path: "simulator/", mediaType: "text/html" }],
  "next-web": [{ path: "web/", mediaType: "application/vnd.factory.source-tree" }],
  "nest-api": [
    { path: "api/", mediaType: "application/vnd.factory.source-tree" },
    { path: "api/src/application-runtime.ts", mediaType: "text/typescript" },
    { path: "api/src/policy.ts", mediaType: "text/typescript" },
  ],
  "prisma-postgres": [
    { path: "database/prisma/schema.prisma", mediaType: "text/plain" },
    { path: "database/prisma/migrations/", mediaType: "application/vnd.factory.source-tree" },
    { path: "database/prisma/seed.ts", mediaType: "text/typescript" },
  ],
  "casbin-policy": [{ path: "api/policy/model.conf", mediaType: "text/plain" }, { path: "api/policy/policy.csv", mediaType: "text/csv" }],
  "xstate-flow": [{ path: "api/src/flows/", mediaType: "application/vnd.factory.source-tree" }],
  "test-suite": [{ path: "api/test/", mediaType: "application/vnd.factory.source-tree" }],
  documentation: [
    { path: "docs/api-reference.md", mediaType: "text/markdown" },
    { path: "docs/entity-relationship.md", mediaType: "text/markdown" },
    { path: "docs/permission-matrix.md", mediaType: "text/markdown" },
  ],
};

/**
 * Produces a deterministic, non-executable output map. Target writers consume
 * this plan later; only a Published Revision can form its input.
 */
export function buildCompilationPlan(input: PublishedGraphInput): CompilationPlan {
  if (!input.publishedRevisionId) {
    throw new Error("Published revision id is required for compilation.");
  }

  const graph = assertValidApplicationGraph(input.graph);
  const artifacts = compilationTargets.flatMap((target) =>
    artifactBlueprint[target.key].map((artifact) => ({ target: target.key, ...artifact })),
  );

  return {
    publishedRevisionId: input.publishedRevisionId,
    graphHash: hashApplicationGraph(graph),
    artifacts,
  };
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

function prismaType(type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"]): string {
  switch (type) {
    case "integer": return "Int";
    case "decimal": return "Decimal";
    case "boolean": return "Boolean";
    case "date": return "DateTime @db.Date";
    case "datetime": return "DateTime";
    case "json": return "Json";
    default: return "String";
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
  ].join("\n");
}

function postgresType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "integer": return "INTEGER";
    case "decimal": return "DECIMAL";
    case "boolean": return "BOOLEAN";
    case "date": return "DATE";
    case "datetime": return "TIMESTAMP(3)";
    case "json": return "JSONB";
    default: return "TEXT";
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
    const sourceIsOne = relation.kind === "one-to-many" || relation.kind === "one-to-one";
    const oneKey = sourceIsOne ? relation.from : relation.to;
    const manyKey = sourceIsOne ? relation.to : relation.from;
    if (entityKey !== manyKey) return [];
    const column = `${toCamelCase(oneKey)}Id`;
    return [`${quoteSqlIdentifier(column)} TEXT NOT NULL${relation.kind === "one-to-one" ? " UNIQUE" : ""}`];
  });
}

function renderInitialMigration(graph: ApplicationGraphV1): string {
  const createTables = graph.domain.entities.map((entity) => {
    const columns = [
      '"id" TEXT NOT NULL PRIMARY KEY',
      ...entity.fields.map((field) =>
        `${quoteSqlIdentifier(field.key)} ${postgresType(field.type)}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`,
      ),
      ...relationColumnDefinitions(graph, entity.key),
      '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '"updatedAt" TIMESTAMP(3) NOT NULL',
    ];
    return `CREATE TABLE ${quoteSqlIdentifier(toPascalCase(entity.key))} (\n  ${columns.join(",\n  ")}\n);`;
  });
  const indexes = graph.domain.entities.flatMap((entity) =>
    entity.indexes.map((index, indexNumber) =>
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
    const sourceIsOne = relation.kind === "one-to-many" || relation.kind === "one-to-one";
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
    ...indexes,
    ...relationTables,
    ...relationConstraints,
    "",
  ].join("\n\n");
}

function renderCasbinPolicy(graph: ApplicationGraphV1): string {
  const lines = graph.policy.permissions.flatMap((permission) =>
    permission.actions.map((action) => `p, ${permission.role}, ${permission.resource}, ${action}`),
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
    "m = r.sub == p.sub && (r.obj == p.obj || p.obj == \"*\") && r.act == p.act",
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
      fields: entity.fields.map((field) => ({ key: field.key, required: field.required })),
    })),
    permissions: graph.policy.permissions,
    flows: graph.flow.flows,
  };
}

function renderApplicationRuntime(graph: ApplicationGraphV1): string {
  return [
    'import { enforce } from "./policy.js";',
    "",
    "export type StoredRecord = Record<string, unknown> & { id: string; status?: string };",
    "export type AuditEvent = { actor: string; action: string; entity: string; recordId: string; at: string };",
    "export interface RecordStore {",
    "  list(entityKey: string): Promise<readonly StoredRecord[]>;",
    "  find(entityKey: string, recordId: string): Promise<StoredRecord | undefined>;",
    "  create(entityKey: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  update(entityKey: string, recordId: string, input: Record<string, unknown>): Promise<StoredRecord>;",
    "  appendAudit(event: AuditEvent): Promise<void>;",
    "  listAudit(): Promise<readonly AuditEvent[]>;",
    "}",
    "",
    "export class InMemoryRecordStore implements RecordStore {",
    "  private readonly records = new Map<string, Map<string, StoredRecord>>();",
    "  private readonly auditEvents: AuditEvent[] = [];",
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
    "}",
    "type RuntimeDefinition = {",
    "  entities: readonly { key: string; fields: readonly { key: string; required: boolean }[] }[];",
    "  permissions: readonly { role: string; resource: string; actions: readonly string[] }[];",
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
    "  async list(role: string, entityKey: string): Promise<readonly StoredRecord[]> {",
    "    this.entity(entityKey);",
    "    await this.assertAllowed(role, entityKey, 'read');",
    "    return this.store.list(entityKey);",
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
    "    const record = await this.store.create(entityKey, { ...input, ...(flow ? { status: flow.initialState } : {}) });",
    "    await this.store.appendAudit({ actor: role, action: 'create', entity: entityKey, recordId: record.id, at: new Date().toISOString() });",
    "    return record;",
    "  }",
    "",
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
    "    const updated = await this.store.update(entityKey, recordId, { status: transition.to });",
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
    "}",
    "",
    "export const applicationRuntime = new ApplicationRuntime();",
    "",
  ].join("\n");
}

function renderPrismaRecordStore(graph: ApplicationGraphV1): string {
  const delegates = Object.fromEntries(
    graph.domain.entities.map((entity) => [
      entity.key,
      toCamelCase(entity.key),
    ]),
  );
  return [
    'import { PrismaClient } from "@prisma/client";',
    'import type { AuditEvent, RecordStore, StoredRecord } from "./application-runtime.js";',
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

function renderWebManifest(graph: ApplicationGraphV1): string {
  const creationLabels = Object.fromEntries(
    graph.domain.entities.map((entity) => [entity.key, `Create ${entity.label.toLowerCase()}`]),
  );
  return `export const applicationManifest = ${JSON.stringify({
    metadata: graph.metadata,
    page: graph.page,
    domain: graph.domain,
    policy: graph.policy,
    flow: graph.flow,
    creationLabels,
  }, null, 2)} as const;\n`;
}

function renderGeneratedApplicationClient(): string {
  return [
    '"use client";',
    "",
    'import { useEffect, useMemo, useState } from "react";',
    "type Manifest = {",
    "  readonly metadata: { readonly name: string };",
    "  readonly page: { readonly pages: readonly { readonly id: string; readonly route: string; readonly title: string }[]; readonly navigation: readonly { readonly id: string; readonly label: string; readonly pageId: string }[] };",
    "  readonly domain: { readonly entities: readonly { readonly key: string; readonly label: string; readonly fields: readonly { readonly key: string; readonly required: boolean }[] }[] };",
    "  readonly policy: { readonly roles: readonly string[]; readonly permissions: readonly { readonly role: string; readonly resource: string; readonly actions: readonly string[] }[] };",
    "  readonly flow: { readonly flows: readonly { readonly entity: string; readonly events: readonly string[] }[] };",
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
    "  const entity = useMemo(() => entities.find((candidate) => candidate.key === entityKey), [entities, entityKey]);",
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
    "  const transition = async (recordId: string, event: string) => {",
    "    setError(null);",
    "    const response = await fetch(`/api/${entityKey}/${recordId}/events/${event}`, { method: 'POST', headers: headers() });",
    "    if (!response.ok) throw new Error(await response.text());",
    "    await refresh();",
    "  };",
    "  const events = manifest.flow.flows.find((flow) => flow.entity === entityKey)?.events ?? [];",
    "  if (!entity) return <main className=\"generated-app\"><p>No domain entities are declared in this Published Graph.</p></main>;",
    "  return (",
    "    <main className=\"generated-app\">",
    "      <header><div><p>Generated application</p><h1>{manifest.metadata.name}</h1></div><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{manifest.policy.roles.map((candidate) => <option key={candidate}>{candidate}</option>)}</select></label></header>",
    "      <nav aria-label=\"Application routes\">{manifest.page.navigation.map((item) => <a href={manifest.page.pages.find((page) => page.id === item.pageId)?.route ?? '#'} key={item.id}>{item.label}</a>)}</nav>",
    "      <section className=\"generated-workspace\">",
    "        <aside><h2>Records</h2>{entities.map((candidate) => <button className={candidate.key === entityKey ? 'active' : ''} key={candidate.key} onClick={() => setEntityKey(candidate.key)} type=\"button\">{candidate.label}</button>)}</aside>",
    "        <div className=\"generated-content\">",
    "          <div className=\"generated-title\"><div><p>{role} view</p><h2>{entity.label}</h2></div><button onClick={() => void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to refresh records.'))} type=\"button\">Refresh</button></div>",
    "          {can('create') && <form onSubmit={(event) => { event.preventDefault(); void create().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to create record.')); }}><h3>{manifest.creationLabels[entity.key]}</h3>{entity.fields.filter((field) => field.key !== 'status').map((field) => <label key={field.key}>{field.key}<input required={field.required} value={values[field.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}<button type=\"submit\">Create</button></form>}",
    "          {error && <p role=\"alert\" className=\"generated-error\">{error}</p>}",
    "          <ul className=\"generated-records\">{records.map((record) => <li key={String(record.id)}><code>{JSON.stringify(record)}</code><span>{events.map((event) => <button key={event} onClick={() => void transition(String(record.id), event).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to transition record.'))} type=\"button\">{event}</button>)}</span></li>)}</ul>",
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
    ".generated-app header, .generated-title, .generated-app nav, .generated-workspace, .generated-records li { display: flex; align-items: center; gap: 16px; }",
    ".generated-app header, .generated-title { justify-content: space-between; } .generated-app h1, .generated-app h2 { margin: 4px 0; } .generated-app p { color: #5b6870; }",
    ".generated-app nav { margin: 24px 0; } .generated-app nav a, .generated-app button { border: 1px solid #cbd6d9; border-radius: 8px; padding: 8px 12px; background: #fff; color: inherit; text-decoration: none; cursor: pointer; }",
    ".generated-workspace { align-items: flex-start; background: #fff; border: 1px solid #dce4e7; border-radius: 16px; overflow: hidden; } .generated-workspace aside { display: grid; gap: 8px; min-width: 180px; padding: 20px; border-right: 1px solid #dce4e7; } .generated-workspace aside button.active, .generated-content form button { background: #0b766e; color: white; border-color: #0b766e; }",
    ".generated-content { flex: 1; padding: 24px; min-width: 0; } .generated-content form { display: grid; gap: 12px; padding: 16px; margin: 20px 0; background: #f6f8fb; border-radius: 12px; } .generated-content form label { display: grid; gap: 6px; } .generated-content input { border: 1px solid #cbd6d9; border-radius: 8px; padding: 9px; }",
    ".generated-records { display: grid; gap: 8px; padding: 0; list-style: none; } .generated-records li { justify-content: space-between; padding: 12px; background: #f6f8fb; border-radius: 10px; } .generated-records span { display: flex; gap: 6px; flex-wrap: wrap; } .generated-error { color: #b42318; }",
    "@media (max-width: 720px) { .generated-workspace { display: block; } .generated-workspace aside { border-right: 0; border-bottom: 1px solid #dce4e7; } .generated-app header { align-items: flex-start; flex-direction: column; } }",
    "",
  ].join("\n");
}

function renderApiMain(graph: ApplicationGraphV1): string {
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
  const entity = flow && graph.domain.entities.find((candidate) => candidate.key === flow.entity);
  const createPermission = entity && graph.policy.permissions.find(
    (permission) => permission.resource === entity.key && permission.actions.includes("create"),
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
      .map((field) => [field.key, defaultJourneyValue(field, flow.initialState)]),
  );
  const transitions: ApplicationGraphV1["flow"]["flows"][number]["transitions"] = [];
  let state = flow.initialState;
  const visited = new Set<string>();
  while (true) {
    const transition = flow.transitions.find(
      (candidate) => candidate.from === state && !visited.has(`${candidate.from}:${candidate.event}`),
    );
    if (!transition) break;
    transitions.push(transition);
    visited.add(`${transition.from}:${transition.event}`);
    state = transition.to;
  }
  const auditRole = graph.policy.permissions.find((permission) => permission.actions.includes("audit"))?.role;
  return [
    'import { describe, expect, it } from "vitest";',
    'import { applicationRuntime } from "../src/application-runtime.js";',
    "",
    "describe('generated role journey', () => {",
    "  it('executes the declared record flow', async () => {",
    `    const record = await applicationRuntime.create(${JSON.stringify(createPermission.role)}, ${JSON.stringify(entity.key)}, ${JSON.stringify(payload)});`,
    `    expect(record.status).toBe(${JSON.stringify(flow.initialState)});`,
    ...transitions.flatMap((transition) => [
      `    await applicationRuntime.transition(${JSON.stringify(transition.roles?.[0] ?? createPermission.role)}, ${JSON.stringify(entity.key)}, record.id, ${JSON.stringify(transition.event)});`,
      `    expect(record.status).toBe(${JSON.stringify(transition.to)});`,
    ]),
    ...(auditRole ? [
      `    expect(await applicationRuntime.auditLog(${JSON.stringify(auditRole)})).toHaveLength(${transitions.length + 1});`,
    ] : []),
    "  });",
    "});",
    "",
  ].join("\n");
}

function renderDocumentation(graph: ApplicationGraphV1): string {
  const entities = graph.domain.entities.map((entity) => `- **${entity.label}**: ${entity.fields.map((field) => field.key).join(", ") || "No fields"}`);
  return `# ${graph.metadata.name}\n\n## Entities\n${entities.join("\n")}\n`;
}

/**
 * Renders deterministic source files for one isolated generated application.
 * This function is pure: the Worker owns filesystem writes, Compose identity,
 * artifact digests, and cleanup.
 */
export function generateApplicationBundle(input: PublishedGraphInput): GeneratedApplicationBundle {
  const plan = buildCompilationPlan(input);
  const graph = assertValidApplicationGraph(input.graph);
  const rootDirectory = `${graph.metadata.id}-${input.publishedRevisionId}`;
  const files: GeneratedFile[] = [
    {
      path: "package.json",
      content: JSON.stringify({
        name: rootDirectory,
        private: true,
        packageManager: "pnpm@9.0.0",
        workspaces: ["web", "api", "database"],
        scripts: { test: "pnpm --filter generated-api test" },
      }, null, 2) + "\n",
    },
    {
      path: "pnpm-workspace.yaml",
      content: "packages:\n  - web\n  - api\n  - database\n",
    },
    {
      path: "web/package.json",
      content: JSON.stringify({
        name: "generated-web",
        private: true,
        scripts: { dev: "next dev --port 3000", build: "next build", start: "next start --port 3000" },
        dependencies: { next: "^15.5.0", react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { "@types/node": "^22.10.0", "@types/react": "^19.0.0", typescript: "^5.7.0" },
      }, null, 2) + "\n",
    },
    {
      path: "web/tsconfig.json",
      content: JSON.stringify({
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
        include: ["next-env.d.ts", "app/**/*.ts", "app/**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      }, null, 2) + "\n",
    },
    { path: "web/next-env.d.ts", content: '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// This file is generated by Factory Pilot.\n' },
    {
      path: "web/app/layout.tsx",
      content: "import type { ReactNode } from \"react\";\nimport \"./globals.css\";\n\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang=\"en\"><body>{children}</body></html>; }\n",
    },
    { path: "web/app/page.tsx", content: renderWebPage(graph) },
    { path: "web/app/application-manifest.ts", content: renderWebManifest(graph) },
    { path: "web/app/generated-application-client.tsx", content: renderGeneratedApplicationClient() },
    { path: "web/app/api/[...path]/route.ts", content: renderWebProxyRoute() },
    { path: "web/app/globals.css", content: renderWebStyles() },
    {
      path: "api/package.json",
      content: JSON.stringify({
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
        devDependencies: { "@types/node": "^22.10.0", prisma: "^6.19.0", tsx: "^4.19.0", typescript: "^5.7.0", vitest: "^2.1.0" },
      }, null, 2) + "\n",
    },
    {
      path: "api/tsconfig.json",
      content: JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", outDir: "dist", strict: true, experimentalDecorators: true, emitDecoratorMetadata: true }, include: ["src/**/*.ts"] }, null, 2) + "\n",
    },
    {
      path: "api/Dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install && pnpm prisma generate --schema prisma/schema.prisma\nCOPY tsconfig.json ./\nCOPY src ./src\nRUN pnpm build\nCMD [\"node\", \"dist/main.js\"]\n",
    },
    { path: "api/.dockerignore", content: "node_modules\ndist\n.env\n" },
    { path: "api/src/main.ts", content: renderApiMain(graph) },
    { path: "api/src/application-runtime.ts", content: renderApplicationRuntime(graph) },
    { path: "api/src/prisma-record-store.ts", content: renderPrismaRecordStore(graph) },
    { path: "api/src/policy.ts", content: renderPolicyModule(graph) },
    { path: "api/prisma/schema.prisma", content: renderPrismaSchema(graph) },
    { path: "database/prisma/schema.prisma", content: renderPrismaSchema(graph) },
    { path: "database/prisma/migrations/0001_initial/migration.sql", content: renderInitialMigration(graph) },
    {
      path: "database/package.json",
      content: JSON.stringify({
        name: "generated-database",
        private: true,
        scripts: {
          generate: "prisma generate --schema prisma/schema.prisma",
          "migrate:deploy": "prisma migrate deploy --schema prisma/schema.prisma",
          seed: "tsx prisma/seed.ts",
        },
        dependencies: { "@prisma/client": "^6.19.0" },
        devDependencies: { prisma: "^6.19.0", tsx: "^4.19.0" },
      }, null, 2) + "\n",
    },
    { path: "database/prisma/seed.ts", content: "export async function seed() { return { status: \"ready\" }; }\n" },
    {
      path: "database/Dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY prisma ./prisma\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCMD [\"sh\", \"-c\", \"pnpm prisma migrate deploy --schema prisma/schema.prisma\"]\n",
    },
    { path: "database/.dockerignore", content: "node_modules\n.env\n" },
    {
      path: "api/policy/model.conf",
      content: "[request_definition]\nr = sub, obj, act\n\n[policy_definition]\np = sub, obj, act\n\n[policy_effect]\ne = some(where (p.eft == allow))\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n",
    },
    { path: "api/policy/policy.csv", content: renderCasbinPolicy(graph) },
    { path: "api/src/flows/definitions.ts", content: renderFlowDefinitions(graph) },
    { path: "api/src/flows/machines.ts", content: renderFlowMachines() },
    { path: "api/test/journey.generated.test.ts", content: renderJourneyTest(graph) },
    { path: "tests/journeys.generated.md", content: `# Generated role journeys\n\nGraph: ${plan.graphHash}\n` },
    { path: "docs/application.md", content: renderDocumentation(graph) },
    {
      path: "web/Dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCOPY . .\nRUN pnpm build\nCMD [\"pnpm\", \"start\"]\n",
    },
    { path: "web/.dockerignore", content: "node_modules\n.next\n.env\n" },
    {
      path: "docker-compose.yml",
      content: `name: \${FACTORY_COMPOSE_PROJECT_NAME:-factory-${graph.metadata.id}}\n\nservices:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: generated\n      POSTGRES_PASSWORD: generated\n      POSTGRES_DB: generated\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U generated -d generated\"]\n      interval: 5s\n      timeout: 3s\n      retries: 20\n  migrate:\n    build: ./database\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    depends_on:\n      postgres:\n        condition: service_healthy\n  api:\n    build: ./api\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    ports:\n      - \"\${FACTORY_API_PORT:-3001}:3001\"\n    depends_on:\n      migrate:\n        condition: service_completed_successfully\n  web:\n    build: ./web\n    environment:\n      FACTORY_API_URL: http://api:3001\n      NEXT_PUBLIC_FACTORY_API_URL: http://localhost:\${FACTORY_API_PORT:-3001}\n    ports:\n      - \"\${FACTORY_WEB_PORT:-3000}:3000\"\n    depends_on:\n      - api\n`,
    },
    {
      path: "README.md",
      content: `# ${graph.metadata.name}\n\nThis application was compiled from the immutable Published Graph \`${plan.graphHash}\`.\n\n## Run locally\n\nChoose unique host ports for every generated application.\n\n\`\`\`sh\nFACTORY_COMPOSE_PROJECT_NAME=factory-${graph.metadata.id} FACTORY_WEB_PORT=4300 FACTORY_API_PORT=4301 docker compose up --build\n\`\`\`\n\nThe migration service must complete before the API starts. To remove this isolated local runtime and its database volume:\n\n\`\`\`sh\ndocker compose down --volumes --remove-orphans\n\`\`\`\n`,
    },
  ];

  return { rootDirectory, graphHash: plan.graphHash, files };
}
