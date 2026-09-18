import {
  selectTaskContract,
  taskReceiptSchema,
  taskReceiptMigration,
} from "../../task-mutation-contract.js";
import {
  selectApprovalCorrection,
  approvalReceiptSchema,
  approvalReceiptMigration,
} from "../../approval-mutation-contract.js";
import { selectAppointmentRuntimeProfile } from "../../appointment-mutation-contract.js";
import {
  assertValidApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  sha256Digest,
  type GeneratedFile,
} from "../../core/generated-files.js";
import type {
  CompilerTargetPluginV1,
  PublishedCompilationInput,
  TargetValidationResult,
} from "../../core/target-plugin.js";

/**
 * The serializable decision record for the database target. It projects the
 * immutable Published Graph plus the explicit compiler context (package-owned
 * database contributions, generic commerce persistence flags, Restaurant
 * artifacts) that the legacy central renderers consumed; the render step
 * formats the Prisma schema, initial migration, and seed deterministically.
 */
export interface DatabasePlanV1 {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly graph: ApplicationGraphV1;
  readonly approvalEntity?: string;
  readonly taskEntity?: string;
  readonly appointmentEntity?: string;
  readonly orderOperationReceiptSchema?: string;
  readonly includeGenericCommerceLineItems: boolean;
  readonly additionalSchemaFragments: readonly string[];
  readonly orderOperationReceiptMigration?: string;
  readonly additionalMigrationFragments: readonly string[];
  readonly hasRestaurantRuntime: boolean;
  readonly prismaSchemaOverride?: string;
  readonly initialMigrationOverride?: string;
}

type GraphRelation = ApplicationGraphV1["domain"]["relations"][number];

const COMPILER_STORAGE_PREFIX = "Factory_";

function compilerStorageName(name: string): string {
  return `${COMPILER_STORAGE_PREFIX}${name}`;
}

interface ResolvedRelationForeignKey {
  readonly ownerKey: string;
  readonly targetKey: string;
  readonly scalarField: string;
  readonly targetField: string;
  readonly required: boolean;
  readonly oneToOne: boolean;
}

function hasCommerceCapabilities(graph: ApplicationGraphV1): boolean {
  return graph.integration.capabilities.some((capability) =>
    ["catalog.", "cart.", "inventory.", "order.", "payment."].some((prefix) =>
      capability.key.startsWith(prefix),
    ),
  );
}

// Naming helpers owned by the database target. The facade keeps its own
// copies for the runtime renderers; the parity gate pins the output bytes so
// the copies cannot drift silently.

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
      return "DateTime";
    case "datetime":
      return "DateTime";
    case "json":
      return "Json";
    default:
      return "String";
  }
}

/**
 * The Prisma native type annotation for a field type, or an empty string.
 * Kept separate from the base type so an optional field renders
 * `DateTime? @db.Date` — Prisma attaches the `?` to the type itself, and
 * `DateTime @db.Date?` is a P1012 "not a valid field or attribute
 * definition" (the generated schema then fails `prisma generate` and the
 * isolated preview cannot boot).
 */
function prismaNativeType(
  type: ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"],
): string {
  switch (type) {
    case "date":
      return "@db.Date";
    default:
      return "";
  }
}
function resolveRelationForeignKey(
  graph: ApplicationGraphV1,
  relation: GraphRelation,
): ResolvedRelationForeignKey {
  if (relation.kind === "many-to-many") {
    throw new Error(
      "Many-to-many relations do not have an owning scalar field.",
    );
  }
  if (relation.field && relation.kind === "one-to-many") {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' cannot declare owning field '${relation.field}' for one-to-many cardinality.`,
    );
  }

  const sourceIsOne =
    relation.kind === "one-to-many" || relation.kind === "one-to-one";
  const ownerKey = relation.field
    ? relation.from
    : sourceIsOne
      ? relation.to
      : relation.from;
  const targetKey = relation.field
    ? relation.to
    : sourceIsOne
      ? relation.from
      : relation.to;
  const owner = graph.domain.entities.find((entity) => entity.key === ownerKey);
  const target = graph.domain.entities.find(
    (entity) => entity.key === targetKey,
  );
  if (!owner || !target) {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' references an unknown entity.`,
    );
  }

  const scalarField = relation.field ?? `${toCamelCase(targetKey)}Id`;
  const declaredScalar = owner.fields.find(
    (field) => field.key === scalarField,
  );
  if (relation.field && !declaredScalar) {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' field '${relation.field}' is not declared on '${relation.from}'.`,
    );
  }
  if (
    relation.kind === "one-to-one" &&
    declaredScalar &&
    !declaredScalar.unique
  ) {
    throw new Error(
      `One-to-one relation '${relation.from}' to '${relation.to}' requires unique owning field '${scalarField}'.`,
    );
  }

  let targetField = "id";
  if (relation.field) {
    const naturalKeyCandidates = target.fields.filter(
      (field) =>
        field.unique === true &&
        relation.field!.toLowerCase().endsWith(field.key.toLowerCase()),
    );
    if (naturalKeyCandidates.length === 1) {
      targetField = naturalKeyCandidates[0]!.key;
    } else if (
      naturalKeyCandidates.length > 1 ||
      !/(?:id|key)$/i.test(relation.field)
    ) {
      throw new Error(
        `Relation '${relation.from}' to '${relation.to}' field '${relation.field}' cannot resolve a unique target field.`,
      );
    }
  }

  if (targetField !== "id") {
    const referencedField = target.fields.find(
      (field) => field.key === targetField,
    )!;
    if (declaredScalar?.type !== referencedField.type) {
      throw new Error(
        `Relation '${relation.from}' to '${relation.to}' field '${scalarField}' must match target field '${targetField}' type.`,
      );
    }
  } else if (declaredScalar && declaredScalar.type !== "string") {
    throw new Error(
      `Relation '${relation.from}' to '${relation.to}' field '${scalarField}' must be a string to reference target id.`,
    );
  }

  return {
    ownerKey,
    targetKey,
    scalarField,
    targetField,
    required: declaredScalar?.required ?? false,
    oneToOne: relation.kind === "one-to-one",
  };
}

const MAX_RELATION_SUFFIX_LENGTH = 29;
const POSTGRES_IDENTIFIER_MAX_BYTES = 63;

function relationSuffixCandidate(
  scalarField: string,
  collisionAttempt = 0,
): string {
  const readable = `${scalarField[0]!.toUpperCase()}${scalarField.slice(1)}`;
  const plain = `By${readable}`;
  if (
    collisionAttempt === 0 &&
    Buffer.byteLength(plain, "utf8") <= MAX_RELATION_SUFFIX_LENGTH
  ) {
    return plain;
  }
  const digest = sha256Digest(scalarField).slice(0, 10);
  const stem = readable.slice(0, collisionAttempt === 0 ? 16 : 12);
  return `By${stem}_${digest}${collisionAttempt === 0 ? "" : `_${collisionAttempt}`}`;
}

function duplicateEndpointRelationSuffixes(
  graph: ApplicationGraphV1,
): ReadonlyMap<GraphRelation, string> {
  const occupiedFields = new Map(
    graph.domain.entities.map((entity) => [
      entity.key,
      new Set([
        "id",
        "createdAt",
        "updatedAt",
        ...entity.fields.map((field) => field.key),
      ]),
    ]),
  );
  const endpointCounts = new Map<string, number>();
  const endpointKey = (relation: GraphRelation): string =>
    `${relation.from}\0${relation.to}`;
  for (const relation of graph.domain.relations) {
    if (relation.kind === "many-to-many") continue;
    const key = endpointKey(relation);
    endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
    const foreignKey = resolveRelationForeignKey(graph, relation);
    occupiedFields.get(foreignKey.ownerKey)!.add(foreignKey.scalarField);
  }

  for (const relation of graph.domain.relations) {
    if (relation.kind === "many-to-many") {
      occupiedFields
        .get(relation.from)!
        .add(pluralize(toCamelCase(relation.to)));
      occupiedFields
        .get(relation.to)!
        .add(pluralize(toCamelCase(relation.from)));
      continue;
    }
    if ((endpointCounts.get(endpointKey(relation)) ?? 0) > 1) continue;
    const foreignKey = resolveRelationForeignKey(graph, relation);
    occupiedFields
      .get(foreignKey.ownerKey)!
      .add(toCamelCase(foreignKey.targetKey));
    occupiedFields
      .get(foreignKey.targetKey)!
      .add(
        foreignKey.oneToOne
          ? toCamelCase(foreignKey.ownerKey)
          : pluralize(toCamelCase(foreignKey.ownerKey)),
      );
  }

  const suffixes = new Map<GraphRelation, string>();
  for (const relation of graph.domain.relations) {
    if (
      relation.kind === "many-to-many" ||
      (endpointCounts.get(endpointKey(relation)) ?? 0) < 2
    ) {
      continue;
    }
    const foreignKey = resolveRelationForeignKey(graph, relation);
    const ownerBase = toCamelCase(foreignKey.targetKey);
    const targetBase = foreignKey.oneToOne
      ? toCamelCase(foreignKey.ownerKey)
      : pluralize(toCamelCase(foreignKey.ownerKey));
    let collisionAttempt = 0;
    let suffix = relationSuffixCandidate(foreignKey.scalarField);
    while (
      occupiedFields.get(foreignKey.ownerKey)!.has(`${ownerBase}${suffix}`) ||
      occupiedFields.get(foreignKey.targetKey)!.has(`${targetBase}${suffix}`)
    ) {
      collisionAttempt += 1;
      suffix = relationSuffixCandidate(
        foreignKey.scalarField,
        collisionAttempt,
      );
    }
    occupiedFields.get(foreignKey.ownerKey)!.add(`${ownerBase}${suffix}`);
    occupiedFields.get(foreignKey.targetKey)!.add(`${targetBase}${suffix}`);
    suffixes.set(relation, suffix);
  }
  return suffixes;
}

function boundedForeignKeyConstraintName(
  baseName: string,
  relationSuffix: string,
): string {
  if (!relationSuffix) return `${baseName}_fkey`;
  const tail = `${relationSuffix}_fkey`;
  const fullName = `${baseName}${tail}`;
  if (Buffer.byteLength(fullName, "utf8") <= POSTGRES_IDENTIFIER_MAX_BYTES) {
    return fullName;
  }
  const baseBudget = POSTGRES_IDENTIFIER_MAX_BYTES - tail.length;
  return `${baseName.slice(0, baseBudget)}${tail}`;
}

/**
 * The field names the rendered model block / table emits for an entity:
 * entity-declared fields plus relation-owned scalar columns the renderer
 * adds when the entity does not declare them. The factory base fields
 * (`id`, `createdAt`, `updatedAt`) are injected only when no field of that
 * name is rendered — a duplicate is a Prisma P1012 at `prisma generate`
 * inside the preview image build, so the isolated environment never boots
 * and every verification probe is skipped (the real-model acceptance crash
 * of 2026-08-08, verify-716fe221). The entity's declaration is the
 * contract: the generated runtime and seed read the entity-declared
 * `createdAt`/`updatedAt`, so the injected defaulted copies must yield.
 * `id` is factory-reserved and rejected before this renderer. The filter below
 * is defense in depth for a plan that could only have been forged outside the
 * validated target boundary; it never reinterprets the declaration.
 */
function renderedFieldNames(
  graph: ApplicationGraphV1,
  entityKey: string,
): ReadonlySet<string> {
  const entity = graph.domain.entities.find(
    (candidate) => candidate.key === entityKey,
  );
  const names = new Set((entity?.fields ?? []).map((field) => field.key));
  for (const relation of graph.domain.relations) {
    if (relation.kind === "many-to-many") continue;
    const foreignKey = resolveRelationForeignKey(graph, relation);
    if (foreignKey.ownerKey !== entityKey) continue;
    if (names.has(foreignKey.scalarField)) continue;
    names.add(foreignKey.scalarField);
  }
  return names;
}
function renderPrismaSchema(
  graph: ApplicationGraphV1,
  orderOperationReceiptSchema?: string,
  includeGenericCommerceLineItems = true,
  additionalSchemaFragments: readonly string[] = [],
  approvalEntity?: string,
  taskEntity?: string,
  appointmentEntity?: string,
  names?: DatabaseNames,
): string {
  const duplicateRelationSuffixes = duplicateEndpointRelationSuffixes(graph);
  const relationFields = (entityKey: string): readonly string[] =>
    graph.domain.relations.flatMap((relation, relationOrdinal) => {
      const baseRelationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
      const fromModel = toPascalCase(relation.from);
      const toModel = toPascalCase(relation.to);
      const fromField = toCamelCase(relation.from);
      const toField = toCamelCase(relation.to);

      if (relation.kind === "many-to-many") {
        if (entityKey === relation.from) {
          return [
            `  ${pluralize(toField)} ${toModel}[] @relation("${baseRelationName}")`,
          ];
        }
        if (entityKey === relation.to) {
          return [
            `  ${pluralize(fromField)} ${fromModel}[] @relation("${baseRelationName}")`,
          ];
        }
        return [];
      }

      const foreignKey = resolveRelationForeignKey(graph, relation);
      const relationSuffix = duplicateRelationSuffixes.get(relation) ?? "";
      const relationName = `${baseRelationName}${relationSuffix}`;
      const ownerModel = toPascalCase(foreignKey.ownerKey);
      const targetModel = toPascalCase(foreignKey.targetKey);
      const ownerField = toCamelCase(foreignKey.ownerKey);
      const targetField = toCamelCase(foreignKey.targetKey);

      if (entityKey === foreignKey.targetKey) {
        return [
          `  ${foreignKey.oneToOne ? ownerField : pluralize(ownerField)}${relationSuffix} ${ownerModel}${foreignKey.oneToOne ? "?" : "[]"} @relation("${relationName}")`,
        ];
      }
      if (entityKey === foreignKey.ownerKey) {
        const declaredScalar = graph.domain.entities
          .find((entity) => entity.key === foreignKey.ownerKey)
          ?.fields.find((field) => field.key === foreignKey.scalarField);
        const optional = foreignKey.required ? "" : "?";
        return [
          ...(declaredScalar
            ? []
            : [
                `  ${foreignKey.scalarField} String?${foreignKey.oneToOne ? ` @unique${prismaMap(names, objectId("uq", entityKey, foreignKey.scalarField))}` : ""}`,
              ]),
          `  ${targetField}${relationSuffix} ${targetModel}${optional} @relation("${relationName}", fields: [${foreignKey.scalarField}], references: [${foreignKey.targetField}]${prismaMapArgument(names, objectId("fk", entityKey, String(relationOrdinal)))})`,
        ];
      }
      return [];
    });
  const models = graph.domain.entities.map((entity) => {
    const renderedNames = renderedFieldNames(graph, entity.key);
    const fields = entity.fields
      .filter((field) => field.key !== "id")
      .map((field) => {
        const optional = field.required ? "" : "?";
        const native = prismaNativeType(field.type);
        const unique = field.unique
          ? ` @unique${prismaMap(names, objectId("uq", entity.key, field.key))}`
          : "";
        return `  ${field.key} ${prismaType(field.type)}${optional}${native ? ` ${native}` : ""}${unique}`;
      });
    const indexes = entity.indexes.map(
      (index, ordinal) =>
        `  @@index([${index.fields.join(", ")}]${prismaMapArgument(names, objectId("ix", entity.key, String(ordinal)))})`,
    );
    return [
      `model ${toPascalCase(entity.key)} {`,
      `  id String @id${prismaMap(names, objectId("pk", entity.key))} @default(cuid())`,
      ...fields,
      ...(approvalEntity === entity.key ||
      taskEntity === entity.key ||
      appointmentEntity === entity.key
        ? ["  version Int @default(0)"]
        : []),
      ...relationFields(entity.key),
      ...(renderedNames.has("createdAt")
        ? []
        : ["  createdAt DateTime @default(now())"]),
      ...(renderedNames.has("updatedAt")
        ? []
        : ["  updatedAt DateTime @updatedAt"]),
      ...indexes,
      ...(names?.get(objectId("tb", entity.key))
        ? [`  @@map(${JSON.stringify(names.get(objectId("tb", entity.key)))})`]
        : []),
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
    ...(approvalEntity ? [approvalReceiptSchema, ""] : []),
    ...(taskEntity ? [taskReceiptSchema, ""] : []),
    `model ${compilerStorageName("AuditEvent")} {`,
    ...(approvalEntity ? ["  reason String?"] : []),
    "  id String @id @default(cuid())",
    "  actor String",
    "  action String",
    "  entity String",
    "  recordId String",
    "  at DateTime @default(now())",
    "  @@index([entity, recordId])",
    "}",
    "",
    `model ${compilerStorageName("CapabilityEvent")} {`,
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
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
      ? [
          "",
          `model ${compilerStorageName("CommerceLineItem")} {`,
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
    ...(orderOperationReceiptSchema
      ? ["", orderOperationReceiptSchema.trimEnd()]
      : []),
    ...additionalSchemaFragments.flatMap((fragment) => [
      "",
      fragment.trimEnd(),
    ]),
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
  names?: DatabaseNames,
): readonly string[] {
  return graph.domain.relations.flatMap((relation) => {
    if (relation.kind === "many-to-many") return [];
    const foreignKey = resolveRelationForeignKey(graph, relation);
    if (entityKey !== foreignKey.ownerKey) return [];
    if (
      graph.domain.entities
        .find((entity) => entity.key === foreignKey.ownerKey)
        ?.fields.some((field) => field.key === foreignKey.scalarField)
    ) {
      return [];
    }
    return [
      `${quoteSqlIdentifier(foreignKey.scalarField)} TEXT${foreignKey.oneToOne ? `${sqlConstraint(names, objectId("uq", entityKey, foreignKey.scalarField))} UNIQUE` : ""}`,
    ];
  });
}
function renderInitialMigration(
  graph: ApplicationGraphV1,
  orderOperationReceiptMigration?: string,
  includeGenericCommerceLineItems = true,
  additionalMigrationFragments: readonly string[] = [],
  approvalEntity?: string,
  taskEntity?: string,
  appointmentEntity?: string,
  names?: DatabaseNames,
): string {
  const duplicateRelationSuffixes = duplicateEndpointRelationSuffixes(graph);
  const createTables = graph.domain.entities.map((entity) => {
    const renderedNames = renderedFieldNames(graph, entity.key);
    const columns = [
      ...(approvalEntity === entity.key ||
      taskEntity === entity.key ||
      appointmentEntity === entity.key
        ? ['"version" INTEGER NOT NULL DEFAULT 0']
        : []),
      `"id" TEXT NOT NULL${sqlConstraint(names, objectId("pk", entity.key))} PRIMARY KEY`,
      ...entity.fields
        .filter((field) => field.key !== "id")
        .map(
          (field) =>
            `${quoteSqlIdentifier(field.key)} ${postgresType(field.type)}${field.required ? " NOT NULL" : ""}${field.unique ? `${sqlConstraint(names, objectId("uq", entity.key, field.key))} UNIQUE` : ""}`,
        ),
      ...relationColumnDefinitions(graph, entity.key, names),
      ...(renderedNames.has("createdAt")
        ? []
        : ['"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP']),
      ...(renderedNames.has("updatedAt")
        ? []
        : ['"updatedAt" TIMESTAMP(3) NOT NULL']),
    ];
    return `CREATE TABLE ${quoteSqlIdentifier(physicalTable(names, entity.key))} (\n  ${columns.join(",\n  ")}\n);`;
  });
  const indexes = graph.domain.entities.flatMap((entity) =>
    entity.indexes.map(
      (index, indexNumber) =>
        `CREATE ${index.unique ? "UNIQUE " : ""}INDEX ${quoteSqlIdentifier(names?.get(objectId("ix", entity.key, String(indexNumber))) ?? `${toPascalCase(entity.key)}_${indexNumber}_idx`)} ON ${quoteSqlIdentifier(physicalTable(names, entity.key))} (${index.fields.map(quoteSqlIdentifier).join(", ")});`,
    ),
  );
  const relationTables = graph.domain.relations.flatMap((relation) => {
    if (relation.kind !== "many-to-many") return [];
    const relationName = `${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
    const sourceModel = physicalTable(names, relation.from);
    const targetModel = physicalTable(names, relation.to);
    return [
      `CREATE TABLE ${quoteSqlIdentifier(`_${relationName}`)} (\n  "A" TEXT NOT NULL,\n  "B" TEXT NOT NULL,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_AB_pkey`)} PRIMARY KEY ("A", "B"),\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_A_fkey`)} FOREIGN KEY ("A") REFERENCES ${quoteSqlIdentifier(sourceModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT ${quoteSqlIdentifier(`_${relationName}_B_fkey`)} FOREIGN KEY ("B") REFERENCES ${quoteSqlIdentifier(targetModel)} ("id") ON DELETE CASCADE ON UPDATE CASCADE\n);`,
      `CREATE INDEX ${quoteSqlIdentifier(`_${relationName}_B_index`)} ON ${quoteSqlIdentifier(`_${relationName}`)} ("B");`,
    ];
  });
  const relationConstraints = graph.domain.relations.flatMap(
    (relation, ordinal) => {
      if (relation.kind === "many-to-many") return [];
      const foreignKey = resolveRelationForeignKey(graph, relation);
      const relationSuffix = duplicateRelationSuffixes.get(relation) ?? "";
      const relationName = boundedForeignKeyConstraintName(
        `${toPascalCase(foreignKey.targetKey)}To${toPascalCase(foreignKey.ownerKey)}`,
        relationSuffix,
      );
      return [
        `ALTER TABLE ${quoteSqlIdentifier(physicalTable(names, foreignKey.ownerKey))} ADD CONSTRAINT ${quoteSqlIdentifier(names?.get(objectId("fk", foreignKey.ownerKey, String(ordinal))) ?? relationName)} FOREIGN KEY (${quoteSqlIdentifier(foreignKey.scalarField)}) REFERENCES ${quoteSqlIdentifier(physicalTable(names, foreignKey.targetKey))} (${quoteSqlIdentifier(foreignKey.targetField)}) ON DELETE RESTRICT ON UPDATE CASCADE;`,
      ];
    },
  );
  return [
    "-- Generated from a Published Factory Application Graph. Do not edit manually.",
    ...createTables,
    ...(approvalEntity ? [approvalReceiptMigration] : []),
    ...(taskEntity ? [taskReceiptMigration] : []),
    `CREATE TABLE "${compilerStorageName("AuditEvent")}" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  ${approvalEntity ? '"reason" TEXT,\n  ' : ""}"actor" TEXT NOT NULL,\n  "action" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);`,
    `CREATE INDEX "${compilerStorageName("AuditEvent")}_entity_recordId_idx" ON "${compilerStorageName("AuditEvent")}" ("entity", "recordId");`,
    `CREATE TABLE "${compilerStorageName("CapabilityEvent")}" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "capability" TEXT NOT NULL,\n  "operation" TEXT NOT NULL,\n  "entity" TEXT NOT NULL,\n  "recordId" TEXT NOT NULL,\n  "outcome" TEXT NOT NULL,\n  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);`,
    `CREATE INDEX "${compilerStorageName("CapabilityEvent")}_entity_recordId_idx" ON "${compilerStorageName("CapabilityEvent")}" ("entity", "recordId");`,
    `CREATE INDEX "${compilerStorageName("CapabilityEvent")}_capability_operation_idx" ON "${compilerStorageName("CapabilityEvent")}" ("capability", "operation");`,
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
      ? [
          `CREATE TABLE "${compilerStorageName("CommerceLineItem")}" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "orderEntity" TEXT NOT NULL,\n  "orderRecordId" TEXT NOT NULL,\n  "catalogEntity" TEXT NOT NULL,\n  "catalogRecordId" TEXT NOT NULL,\n  "quantity" INTEGER NOT NULL,\n  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);`,
          `CREATE INDEX "${compilerStorageName("CommerceLineItem")}_orderEntity_orderRecordId_idx" ON "${compilerStorageName("CommerceLineItem")}" ("orderEntity", "orderRecordId");`,
          `CREATE INDEX "${compilerStorageName("CommerceLineItem")}_catalogEntity_catalogRecordId_idx" ON "${compilerStorageName("CommerceLineItem")}" ("catalogEntity", "catalogRecordId");`,
        ]
      : []),
    ...(orderOperationReceiptMigration
      ? [orderOperationReceiptMigration.trimEnd()]
      : []),
    ...additionalMigrationFragments.map((fragment) => fragment.trimEnd()),
    ...indexes,
    ...relationTables,
    ...relationConstraints,
    "",
  ].join("\n\n");
}
function renderPrismaSeed(
  graph: ApplicationGraphV1,
  hasRestaurantRuntime: boolean,
): string {
  // The Graph keeps natural values for temporal fields (a `date` field holds
  // "2026-08-01"); the database target renders the Prisma contract, whose
  // DateTime parser rejects zone-less values at migrate time ("premature end
  // of input. Expected ISO-8601 DateTime."). Normalize only the values the
  // Graph itself declares as date or datetime, and only the zone-less shapes.
  const temporalFieldTypes = new Map(
    graph.domain.entities.flatMap((entity) =>
      entity.fields
        .filter((field) => field.type === "date" || field.type === "datetime")
        .map((field) => [`${entity.key}:${field.key}`, field.type]),
    ),
  );
  // The calculated profile preserves exact decimal spellings at every Prisma
  // write boundary, including initialization. Unrelated profiles retain bytes.
  const calculatedDecimalFields = new Set(
    graph.domain.entities.flatMap((entity) =>
      entity.fields.flatMap((field) =>
        field.calculation
          ? [
              `${entity.key}:${field.key}`,
              `${entity.key}:${field.calculation.unitPriceFieldKey}`,
            ]
          : [],
      ),
    ),
  );
  const prismaDateTimeValue = (
    entityKey: string,
    fieldKey: string,
    value: unknown,
  ): unknown => {
    if (temporalFieldTypes.get(`${entityKey}:${fieldKey}`) === undefined) {
      return value;
    }
    if (typeof value !== "string") return value;
    const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value);
    if (dateOnly !== null) return `${dateOnly[1]}T00:00:00.000Z`;
    const zoneLess =
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)$/.exec(value);
    if (zoneLess !== null) {
      const time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(zoneLess[1])
        ? zoneLess[1]
        : `${zoneLess[1]}:00`;
      return `${time}Z`;
    }
    return value;
  };
  // A declared-field relation's owning scalar must reference an existing
  // record at migrate time. The Graph keeps natural values for reference
  // fields and the product-composer's derived seeds never declare them, so
  // the rendered seed binds the owning scalar to its seeded target: the
  // seeded target id for id-referencing relations, the seeded target's
  // declared value for natural-key relations. A required scalar whose target
  // has no seed fails closed at compile (mirroring the menu-category check
  // below) — the rendered seed would otherwise crash at migrate time
  // ("Argument `service` is missing") and every downstream preview would
  // fail to boot.
  const seeds = graph.domain.seedData ?? [];
  const unresolvedRequiredForeignKeys: string[] = [];
  const dependencies = seeds.map(
    (): Array<{
      readonly targetIndex: number;
      readonly scalarField: string;
      readonly required: boolean;
      readonly explicit: boolean;
    }> => [],
  );
  const effectiveSeedId = (
    seed: (typeof seeds)[number],
    index: number,
  ): string => seed.id ?? `seed-${seed.entity}-${index + 1}`;
  const unorderedRecords = seeds.map((seed, index) => {
    const recordId = effectiveSeedId(seed, index);
    // Seed identity belongs to the factory record envelope. The Graph boundary
    // rejects entity-declared `id` fields; this additional guard covers a
    // forged target plan so neither Prisma payload can replace that identity.
    if (
      Object.prototype.hasOwnProperty.call(seed.values, "id") &&
      !Object.is(seed.values.id, recordId)
    ) {
      throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
    }
    const values = Object.fromEntries(
      Object.entries(seed.values).flatMap(([key, value]) =>
        key === "id"
          ? []
          : [
              [
                key,
                calculatedDecimalFields.has(`${seed.entity}:${key}`) &&
                typeof value === "number"
                  ? String(value)
                  : prismaDateTimeValue(seed.entity, key, value),
              ],
            ],
      ),
    );
    for (const relation of graph.domain.relations ?? []) {
      if (
        relation.kind === "many-to-many" ||
        relation.field === undefined ||
        relation.from !== seed.entity
      ) {
        continue;
      }
      const foreignKey = resolveRelationForeignKey(graph, relation);
      if (foreignKey.scalarField in values) {
        const explicitValue = values[foreignKey.scalarField];
        if (explicitValue === null) {
          if (foreignKey.required) {
            throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
          }
          continue;
        }
        if (explicitValue === undefined) {
          throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
        }
        const targetIndexes = seeds.flatMap((candidate, candidateIndex) => {
          if (candidate.entity !== foreignKey.targetKey) return [];
          const targetValue =
            foreignKey.targetField === "id"
              ? effectiveSeedId(candidate, candidateIndex)
              : prismaDateTimeValue(
                  foreignKey.targetKey,
                  foreignKey.targetField,
                  candidate.values[foreignKey.targetField],
                );
          return Object.is(targetValue, explicitValue) ? [candidateIndex] : [];
        });
        if (targetIndexes.length !== 1) {
          if (
            targetIndexes.length === 0 &&
            hasRestaurantRuntime &&
            seed.entity === "menu-item" &&
            foreignKey.scalarField === "categoryKey" &&
            foreignKey.targetKey === "menu-category"
          ) {
            continue;
          }
          throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
        }
        dependencies[index]!.push({
          targetIndex: targetIndexes[0]!,
          scalarField: foreignKey.scalarField,
          required: foreignKey.required,
          explicit: true,
        });
        continue;
      }
      const targetIndex = seeds.findIndex(
        (candidate) => candidate.entity === foreignKey.targetKey,
      );
      if (targetIndex < 0) {
        if (foreignKey.required) {
          unresolvedRequiredForeignKeys.push(
            `${seed.entity}.${foreignKey.scalarField} -> ${foreignKey.targetKey}`,
          );
        }
        continue;
      }
      if (foreignKey.targetField === "id") {
        values[foreignKey.scalarField] = effectiveSeedId(
          seeds[targetIndex]!,
          targetIndex,
        );
        dependencies[index]!.push({
          targetIndex,
          scalarField: foreignKey.scalarField,
          required: foreignKey.required,
          explicit: false,
        });
      } else {
        const targetValue = seeds[targetIndex]!.values[foreignKey.targetField];
        if (targetValue !== undefined) {
          values[foreignKey.scalarField] = prismaDateTimeValue(
            foreignKey.targetKey,
            foreignKey.targetField,
            targetValue,
          );
          dependencies[index]!.push({
            targetIndex,
            scalarField: foreignKey.scalarField,
            required: foreignKey.required,
            explicit: false,
          });
        } else if (foreignKey.required) {
          unresolvedRequiredForeignKeys.push(
            `${seed.entity}.${foreignKey.scalarField} -> ${foreignKey.targetKey}`,
          );
        }
      }
    }
    return {
      delegate: toCamelCase(seed.entity),
      id: recordId,
      values,
    };
  });
  if (unresolvedRequiredForeignKeys.length > 0) {
    throw new Error(
      `Seed generation requires a seeded target for every required foreign key (unresolved: ${unresolvedRequiredForeignKeys.join(", ")}).`,
    );
  }
  const remainingRecordIndexes = new Set(
    unorderedRecords.map((_, index) => index),
  );
  const records: typeof unorderedRecords = [];
  while (remainingRecordIndexes.size > 0) {
    const nextIndex = [...remainingRecordIndexes].find((index) =>
      [...dependencies[index]!].every(
        (dependency) => !remainingRecordIndexes.has(dependency.targetIndex),
      ),
    );
    if (nextIndex === undefined) {
      const remainingIndexes = [...remainingRecordIndexes];
      const reaches = (source: number, target: number): boolean => {
        if (source === target) return true;
        const visited = new Set([source]);
        const pending = [source];
        while (pending.length > 0) {
          const current = pending.pop()!;
          for (const dependency of dependencies[current]!) {
            if (!remainingRecordIndexes.has(dependency.targetIndex)) continue;
            if (dependency.targetIndex === target) return true;
            if (!visited.has(dependency.targetIndex)) {
              visited.add(dependency.targetIndex);
              pending.push(dependency.targetIndex);
            }
          }
        }
        return false;
      };
      const unassigned = new Set(remainingIndexes);
      const cyclicComponents: number[][] = [];
      for (const source of remainingIndexes) {
        if (!unassigned.has(source)) continue;
        const component = remainingIndexes.filter(
          (candidate) =>
            unassigned.has(candidate) &&
            reaches(source, candidate) &&
            reaches(candidate, source),
        );
        for (const member of component) unassigned.delete(member);
        if (
          component.length > 1 ||
          dependencies[source]!.some(
            (dependency) => dependency.targetIndex === source,
          )
        ) {
          cyclicComponents.push(component);
        }
      }
      const cyclicComponent = cyclicComponents
        .filter((component) => {
          const members = new Set(component);
          return component.every((index) =>
            dependencies[index]!.every(
              (dependency) =>
                !remainingRecordIndexes.has(dependency.targetIndex) ||
                members.has(dependency.targetIndex),
            ),
          );
        })
        .sort((left, right) => left[0]! - right[0]!)[0];
      const cyclicMembers = new Set(cyclicComponent ?? []);
      const optionalRelease = (cyclicComponent ?? [])
        .map((index) => ({
          index,
          blocking: dependencies[index]!.filter((dependency) =>
            cyclicMembers.has(dependency.targetIndex),
          ),
        }))
        .filter(
          (candidate) =>
            candidate.blocking.length > 0 &&
            candidate.blocking.every(
              (dependency) => !dependency.required && !dependency.explicit,
            ),
        )
        .sort(
          (left, right) =>
            left.blocking.length - right.blocking.length ||
            left.index - right.index,
        )[0];
      if (optionalRelease === undefined) {
        if (
          (cyclicComponent ?? []).some((index) =>
            dependencies[index]!.some(
              (dependency) =>
                cyclicMembers.has(dependency.targetIndex) &&
                dependency.explicit,
            ),
          )
        ) {
          throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
        }
        throw new Error(
          "Seed generation contains an unsatisfiable required dependency cycle.",
        );
      }
      const releasedDependencies = new Set(optionalRelease.blocking);
      for (const dependency of optionalRelease.blocking) {
        delete unorderedRecords[optionalRelease.index]!.values[
          dependency.scalarField
        ];
      }
      dependencies[optionalRelease.index] = dependencies[
        optionalRelease.index
      ]!.filter((dependency) => !releasedDependencies.has(dependency));
      continue;
    }
    records.push(unorderedRecords[nextIndex]!);
    remainingRecordIndexes.delete(nextIndex);
  }
  const restaurantTableSeed = hasRestaurantRuntime
    ? (graph.domain.seedData ?? []).find(
        (seed) => seed.entity === "restaurant-table",
      )
    : undefined;
  const restaurantTableCode = restaurantTableSeed?.values.code;
  const restaurantMenuItemSeed = hasRestaurantRuntime
    ? (graph.domain.seedData ?? []).find((seed) => seed.entity === "menu-item")
    : undefined;
  const restaurantTableId = records.find(
    (record) => record.delegate === "restaurantTable",
  )?.id;
  const restaurantLocationId = records.find(
    (record) => record.delegate === "restaurantLocation",
  )?.id;
  const restaurantMenuItemId = records.find(
    (record) => record.delegate === "menuItem",
  )?.id;
  const restaurantMenuItemPrice = restaurantMenuItemSeed?.values.price;
  if (
    hasRestaurantRuntime &&
    (typeof restaurantTableCode !== "string" ||
      !restaurantTableCode ||
      typeof restaurantLocationId !== "string" ||
      !restaurantLocationId ||
      typeof restaurantTableId !== "string" ||
      !restaurantTableId ||
      typeof restaurantMenuItemId !== "string" ||
      !restaurantMenuItemId ||
      typeof restaurantMenuItemPrice !== "number")
  ) {
    throw new Error(
      "Restaurant seed generation requires table, location, and menu-item fixtures.",
    );
  }
  // Every seeded menu-item categoryKey must resolve to a seeded
  // menu-category record: the rendered seed would otherwise violate the
  // MenuItem_categoryKey foreign key at migrate time and every downstream
  // preview would fail to boot. Fail closed deterministically at compile.
  const seededMenuCategoryIds = new Set(
    (graph.domain.seedData ?? []).flatMap((seed, index) =>
      seed.entity === "menu-category" ? [effectiveSeedId(seed, index)] : [],
    ),
  );
  const unresolvedMenuCategoryKeys = hasRestaurantRuntime
    ? [
        ...new Set(
          (graph.domain.seedData ?? [])
            .filter((seed) => seed.entity === "menu-item")
            .map(
              (seed) => (seed.values as { categoryKey?: unknown }).categoryKey,
            )
            .filter(
              (categoryKey) =>
                typeof categoryKey !== "string" ||
                categoryKey.length === 0 ||
                !seededMenuCategoryIds.has(categoryKey),
            )
            .map((categoryKey) => categoryKey ?? "<missing>"),
        ),
      ]
    : [];
  if (unresolvedMenuCategoryKeys.length > 0) {
    throw new Error(
      `Restaurant seed generation requires a seeded menu-category for every menu-item categoryKey (unresolved: ${unresolvedMenuCategoryKeys.join(", ")}).`,
    );
  }
  const restaurantSessionSeed = restaurantTableSeed
    ? {
        id: `${restaurantTableSeed.id ?? "restaurant-table"}-demo-session`,
        tableCode: restaurantTableCode as string,
      }
    : null;
  return [
    ...(restaurantSessionSeed
      ? ['import { createHash } from "node:crypto";']
      : []),
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
    ...(restaurantSessionSeed
      ? [
          "  const demoTableToken = process.env.RESTAURANT_DEMO_TABLE_TOKEN;",
          '  if (!demoTableToken || demoTableToken.length < 16) throw new Error("RESTAURANT_DEMO_TABLE_TOKEN must contain at least 16 characters.");',
          '  const tokenDigest = createHash("sha256").update(demoTableToken, "utf8").digest("hex");',
          "  const openedAt = new Date();",
          "  const expiresAt = new Date(openedAt.getTime() + 24 * 60 * 60 * 1000);",
          "  await prisma.tableSession.upsert({",
          `    where: { id: ${JSON.stringify(restaurantSessionSeed.id)} },`,
          '    update: { tokenDigest, status: "active", openedAt, expiresAt, guestCount: 2 },',
          `    create: { id: ${JSON.stringify(restaurantSessionSeed.id)}, tableCode: ${JSON.stringify(restaurantSessionSeed.tableCode)}, tokenDigest, status: "active", openedAt, expiresAt, guestCount: 2 },`,
          "  });",
          `  await prisma.restaurantTable.update({ where: { id: ${JSON.stringify(restaurantTableId)} }, data: { restaurantLocationId: ${JSON.stringify(restaurantLocationId)} } });`,
          '  const merchantFixtureOpenedAt = new Date("2026-07-30T00:00:00.000Z");',
          '  const merchantFixtureExpiresAt = new Date("2099-12-31T23:59:59.000Z");',
          '  const merchantFixtureSubmittedAt = new Date("2026-07-30T00:01:00.000Z");',
          "  const merchantFixtureTables = [",
          `    { id: "merchant-e2e-cashier-table", code: "E2E-CASHIER", number: 98, restaurantLocationId: ${JSON.stringify(restaurantLocationId)} },`,
          `    { id: "merchant-e2e-cancellation-table", code: "E2E-CANCEL", number: 99, restaurantLocationId: ${JSON.stringify(restaurantLocationId)} },`,
          "  ] as const;",
          "  for (const table of merchantFixtureTables) {",
          "    await prisma.restaurantTable.upsert({",
          "      where: { id: table.id },",
          '      update: { code: table.code, number: table.number, status: "open", active: true, resourceVersion: 0, restaurantLocationId: table.restaurantLocationId },',
          '      create: { ...table, status: "open", active: true, resourceVersion: 0 },',
          "    });",
          "  }",
          "  const merchantFixtureSessions = [",
          '    { id: "merchant-e2e-cashier-session", tableCode: "E2E-CASHIER", tokenDigest: createHash("sha256").update(demoTableToken + ":merchant-e2e:cashier", "utf8").digest("hex") },',
          '    { id: "merchant-e2e-cancellation-session", tableCode: "E2E-CANCEL", tokenDigest: createHash("sha256").update(demoTableToken + ":merchant-e2e:cancellation", "utf8").digest("hex") },',
          "  ] as const;",
          "  for (const session of merchantFixtureSessions) {",
          "    await prisma.tableSession.upsert({",
          "      where: { id: session.id },",
          '      update: { tokenDigest: session.tokenDigest, status: "active", openedAt: merchantFixtureOpenedAt, expiresAt: merchantFixtureExpiresAt, guestCount: 2 },',
          '      create: { ...session, status: "active", openedAt: merchantFixtureOpenedAt, expiresAt: merchantFixtureExpiresAt, guestCount: 2 },',
          "    });",
          "  }",
          "  const merchantFixtureOrders = [",
          `    { id: "merchant-e2e-cashier-order", tableSessionId: "merchant-e2e-cashier-session", priority: 2, total: ${JSON.stringify(restaurantMenuItemPrice)} },`,
          `    { id: "merchant-e2e-cancellation-order", tableSessionId: "merchant-e2e-cancellation-session", priority: 1, total: ${JSON.stringify(restaurantMenuItemPrice)} },`,
          "  ] as const;",
          "  for (const order of merchantFixtureOrders) {",
          "    await prisma.order.upsert({",
          "      where: { id: order.id },",
          '      update: { tableSessionId: order.tableSessionId, status: "submitted", paymentStatus: "unpaid", fulfilmentType: "dine-in", orderNote: "Merchant E2E fixture", priority: order.priority, total: order.total, orderVersion: 0, submittedAt: merchantFixtureSubmittedAt, paidAt: null },',
          '      create: { ...order, status: "submitted", paymentStatus: "unpaid", fulfilmentType: "dine-in", orderNote: "Merchant E2E fixture", orderVersion: 0, submittedAt: merchantFixtureSubmittedAt, paidAt: null },',
          "    });",
          "  }",
          "  const merchantFixtureLines = [",
          `    { id: "merchant-e2e-cashier-line", orderId: "merchant-e2e-cashier-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)} },`,
          `    { id: "merchant-e2e-cancellation-line", orderId: "merchant-e2e-cancellation-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)} },`,
          "  ] as const;",
          "  for (const line of merchantFixtureLines) {",
          "    await prisma.orderLine.upsert({",
          "      where: { id: line.id },",
          `      update: { orderId: line.orderId, menuItemId: line.menuItemId, quantity: 1, unitPrice: ${JSON.stringify(restaurantMenuItemPrice)}, lineNote: "", modifiers: [] },`,
          `      create: { ...line, quantity: 1, unitPrice: ${JSON.stringify(restaurantMenuItemPrice)}, lineNote: "", modifiers: [] },`,
          "    });",
          "  }",
          `  await prisma.menuItem.update({ where: { id: ${JSON.stringify(restaurantMenuItemId)} }, data: { stock: 10, resourceVersion: 0 } });`,
          "  const merchantFixtureReservations = [",
          `    { id: "merchant-e2e-cashier-reservation", locationId: ${JSON.stringify(restaurantLocationId)}, orderId: "merchant-e2e-cashier-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)}, idempotencyKey: "merchant-e2e-cashier-reservation" },`,
          `    { id: "merchant-e2e-cancellation-reservation", locationId: ${JSON.stringify(restaurantLocationId)}, orderId: "merchant-e2e-cancellation-order", menuItemId: ${JSON.stringify(restaurantMenuItemId)}, idempotencyKey: "merchant-e2e-cancellation-reservation" },`,
          "  ] as const;",
          "  for (const reservation of merchantFixtureReservations) {",
          "    await prisma.inventoryLedger.upsert({",
          "      where: { id: reservation.id },",
          '      update: { locationId: reservation.locationId, orderId: reservation.orderId, menuItemId: reservation.menuItemId, idempotencyKey: reservation.idempotencyKey, delta: -1, provenance: "order-reservation", adjustmentReason: null, recordedAt: merchantFixtureSubmittedAt },',
          '      create: { ...reservation, delta: -1, provenance: "order-reservation", adjustmentReason: null, recordedAt: merchantFixtureSubmittedAt },',
          "    });",
          "  }",
        ]
      : []),
    `  return { seeded: records.length${restaurantSessionSeed ? " + 11" : ""} };`,
    "}",
    "",
    "void seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());",
    "",
  ].join("\n");
}

function buildDatabasePlan(input: PublishedCompilationInput): DatabasePlanV1 {
  const { context } = input;
  const graph = assertValidApplicationGraph(input.graph);
  const approvalEntity = selectApprovalCorrection(graph, input.compositionLock);
  const taskEntity = selectTaskContract(graph, input.compositionLock);
  const appointmentProfile = selectAppointmentRuntimeProfile(
    graph,
    input.compositionLock,
  );
  const orderOperationReceiptSchema =
    context.useGenericOrderOperationsPersistence
      ? context.orderOperationsPersistence?.schema
      : undefined;
  const orderOperationReceiptMigration =
    context.useGenericOrderOperationsPersistence
      ? context.orderOperationsPersistence?.migration
      : undefined;
  const { prismaSchema, initialMigration } = context.restaurantArtifacts;
  return {
    apiVersion: "factory.compiler-target/v1",
    graph,
    ...(approvalEntity ? { approvalEntity } : {}),
    ...(taskEntity ? { taskEntity } : {}),
    ...(appointmentProfile
      ? { appointmentEntity: appointmentProfile.appointmentEntity }
      : {}),
    ...(orderOperationReceiptSchema === undefined
      ? {}
      : { orderOperationReceiptSchema }),
    includeGenericCommerceLineItems:
      context.useGenericOrderOperationsPersistence,
    additionalSchemaFragments: context.additionalPrismaSchemaFragments,
    ...(orderOperationReceiptMigration === undefined
      ? {}
      : { orderOperationReceiptMigration }),
    additionalMigrationFragments: context.additionalMigrationFragments,
    hasRestaurantRuntime: context.restaurantRuntimeEnabled,
    ...(prismaSchema === undefined
      ? {}
      : { prismaSchemaOverride: prismaSchema }),
    ...(initialMigration === undefined
      ? {}
      : { initialMigrationOverride: initialMigration }),
  };
}

const DATABASE_PATHS = [
  "database/prisma/schema.prisma",
  "api/prisma/schema.prisma",
  "database/prisma/migrations/0001_initial/migration.sql",
  "database/prisma/seed.ts",
] as const;

const DATABASE_STORAGE_VALIDATION_ERROR =
  "Generated database storage validation failed.";

const IDENTIFIER_ALLOCATION_ERROR =
  "Generated database identifier allocation failed.";
const IDENTIFIER_POLICY = "factory.generated-database-identifiers/v1";
type IdentifierKind = "tb" | "pk" | "uq" | "ix" | "fk";
type DatabaseNames = ReadonlyMap<string, string>;
interface StorageIdentifier {
  readonly name: string;
  readonly kind: IdentifierKind | "other-constraint";
  readonly table: string;
}
interface DatabaseObject {
  readonly id: string;
  readonly key: string;
  readonly kind: IdentifierKind;
  readonly owner: string;
  readonly prisma: StorageIdentifier;
  readonly sql: StorageIdentifier;
}

function objectId(kind: IdentifierKind, owner: string, identity = ""): string {
  return `${kind}\0${owner}\0${identity}`;
}
function physicalTable(
  names: DatabaseNames | undefined,
  owner: string,
): string {
  return names?.get(objectId("tb", owner)) ?? toPascalCase(owner);
}
function prismaMap(names: DatabaseNames | undefined, id: string): string {
  const name = names?.get(id);
  return name ? `(map: ${JSON.stringify(name)})` : "";
}
function prismaMapArgument(
  names: DatabaseNames | undefined,
  id: string,
): string {
  const name = names?.get(id);
  return name ? `, map: ${JSON.stringify(name)}` : "";
}
function sqlConstraint(names: DatabaseNames | undefined, id: string): string {
  const name = names?.get(id);
  return name ? ` CONSTRAINT ${quoteSqlIdentifier(name)}` : "";
}
function identifierNamespaces(
  identifier: StorageIdentifier,
): readonly string[] {
  return [
    ...(identifier.kind === "fk" || identifier.kind === "other-constraint"
      ? []
      : ["relation"]),
    ...(isConstraint(identifier.kind)
      ? [`constraint:${identifier.table}`]
      : []),
  ];
}
function isConstraint(kind: StorageIdentifier["kind"]): boolean {
  return (
    kind === "pk" ||
    kind === "uq" ||
    kind === "fk" ||
    kind === "other-constraint"
  );
}
function assertColumns(columns: readonly string[]): void {
  if (
    hasDuplicateNames(columns) ||
    columns.some(
      (name) => Buffer.byteLength(name, "utf8") > POSTGRES_IDENTIFIER_MAX_BYTES,
    )
  ) {
    throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
  }
}

/** Inventory the emitted forms, including implicit PostgreSQL-backed indexes.
 * This is also used for fixed contribution reservations; it never rewrites text.
 */
function prismaStorageIdentifiers(schema: string): StorageIdentifier[] {
  const identifiers: StorageIdentifier[] = [];
  const models: string[] = [];
  const implicitRelations = new Map<string, number>();
  for (const model of schema.matchAll(/\bmodel\s+(\w+)\s*\{([^}]+)\}/g)) {
    models.push(model[1]!);
    const body = model[2]!;
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? model[1]!;
    identifiers.push({ name: table, kind: "tb", table });
    const columns: string[] = [];
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      const map = /\bmap:\s*"([^"]+)"/.exec(line)?.[1];
      const compound = /^@@(id|unique|index)\(\[([^\]]+)\]/.exec(line);
      if (compound) {
        const fields = compound[2]!
          .split(",")
          .map((field) => field.trim().replace(/\(.*/, ""));
        const kind =
          compound[1] === "id" ? "pk" : compound[1] === "unique" ? "uq" : "ix";
        identifiers.push({
          name:
            map ??
            `${table}_${kind === "pk" ? "pkey" : `${fields.join("_")}_${kind === "uq" ? "key" : "idx"}`}`,
          kind,
          table,
        });
        continue;
      }
      const field = /^(\w+)\s+(\w+)(\[\]|\?)?/.exec(line);
      if (!field) continue;
      if (
        [
          "String",
          "Int",
          "BigInt",
          "Float",
          "Decimal",
          "Boolean",
          "DateTime",
          "Json",
          "Bytes",
        ].includes(field[2]!)
      ) {
        const column = /@map\("([^"]+)"\)/.exec(line)?.[1] ?? field[1]!;
        columns.push(column);
        if (/@id\b/.test(line))
          identifiers.push({ name: map ?? `${table}_pkey`, kind: "pk", table });
        if (/@unique\b/.test(line))
          identifiers.push({
            name: map ?? `${table}_${column}_key`,
            kind: "uq",
            table,
          });
      }
      const foreign = /@relation\([^\n]*fields:\s*\[([^\]]+)\]/.exec(line);
      if (foreign)
        identifiers.push({
          name:
            map ??
            `${table}_${foreign[1]!
              .split(",")
              .map((field) => field.trim())
              .join("_")}_fkey`,
          kind: "fk",
          table,
        });
      if (field[3] === "[]") {
        const relation = /@relation\("([^"]+)"\)/.exec(line)?.[1];
        if (relation)
          implicitRelations.set(
            relation,
            (implicitRelations.get(relation) ?? 0) + 1,
          );
      }
    }
    assertColumns(columns);
  }
  if (hasDuplicateNames(models))
    throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
  for (const [relation, count] of implicitRelations) {
    if (count < 2) continue;
    const table = `_${relation}`;
    identifiers.push(
      { name: table, table, kind: "tb" },
      { name: `${table}_AB_pkey`, table, kind: "pk" },
      { name: `${table}_B_index`, table, kind: "ix" },
      { name: `${table}_A_fkey`, table, kind: "fk" },
      { name: `${table}_B_fkey`, table, kind: "fk" },
    );
  }
  return identifiers;
}

/** Keep identifier tokens for inventory, but count DDL keywords only in SQL
 * code. PostgreSQL comments/literals may contain arbitrary keyword text.
 * Neither inspection view is emitted as migration source.
 */
function sqlInspectionSources(source: string): {
  ddl: string;
  keywords: string;
} {
  let ddl = "";
  let keywords = "";
  let index = 0;
  while (index < source.length) {
    const start = index;
    let quotedIdentifier = false;
    if (source.startsWith("--", index)) {
      const newline = source.indexOf("\n", index);
      index = newline < 0 ? source.length : newline;
    } else if (source.startsWith("/*", index)) {
      index += 2;
      let depth = 1;
      while (index < source.length && depth > 0) {
        if (source.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (source.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else index += 1;
      }
      if (depth !== 0) throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
    } else if (source[index] === '"' || source[index] === "'") {
      const quote = source[index]!;
      quotedIdentifier = quote === '"';
      const escapes =
        !quotedIdentifier &&
        /[eE]/.test(source[index - 1] ?? "") &&
        !/[A-Za-z0-9_$]/.test(source[index - 2] ?? "");
      index += 1;
      let closed = false;
      while (index < source.length) {
        if (escapes && source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] !== quote) {
          index += 1;
          continue;
        }
        if (source[index + 1] === quote) {
          index += 2;
          continue;
        }
        index += 1;
        closed = true;
        break;
      }
      if (!closed) throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
    } else {
      const delimiter =
        source[index] === "$" && !/[A-Za-z0-9_$]/.test(source[index - 1] ?? "")
          ? /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(source.slice(index))?.[0]
          : undefined;
      if (delimiter) {
        const closing = source.indexOf(delimiter, index + delimiter.length);
        if (closing < 0) throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
        index = closing + delimiter.length;
      } else {
        ddl += source[index];
        keywords += source[index];
        index += 1;
        continue;
      }
    }
    const token = source.slice(start, index);
    const masked = token.replace(/[^\r\n]/g, " ");
    ddl += quotedIdentifier ? token : masked;
    keywords += masked;
  }
  return { ddl, keywords };
}

function sqlStorageIdentifiers(migration: string): StorageIdentifier[] {
  const { ddl, keywords } = sqlInspectionSources(migration);
  const identifiers: StorageIdentifier[] = [];
  const sqlIdentifier = '(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';
  const physicalName = (token: string): string =>
    token.startsWith('"')
      ? token.slice(1, -1).replaceAll('""', '"')
      : token.toLowerCase();
  let explicitConstraints = 0;
  const addConstraint = (
    table: string,
    definition: string,
    column?: string,
  ): void => {
    const definitionKeywords = sqlInspectionSources(definition).keywords;
    const kind = /\bPRIMARY\s+KEY\b/i.test(definitionKeywords)
      ? "pk"
      : /\bUNIQUE\b/i.test(definitionKeywords)
        ? "uq"
        : /\bFOREIGN\s+KEY\b/i.test(definitionKeywords)
          ? "fk"
          : undefined;
    const constraintToken = new RegExp(
      `\\bCONSTRAINT\\s+(${sqlIdentifier})`,
      "i",
    ).exec(definition)?.[1];
    const explicit =
      constraintToken === undefined ? undefined : physicalName(constraintToken);
    if (explicit !== undefined) explicitConstraints += 1;
    if (!kind) {
      if (explicit)
        identifiers.push({ name: explicit, table, kind: "other-constraint" });
      return;
    }
    const fields =
      column ??
      [
        ...(
          /(?:PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY)\s*\(([^)]+)\)/i.exec(
            definition,
          )?.[1] ?? ""
        ).matchAll(/"([^"]+)"/g),
      ]
        .map((match) => match[1])
        .join("_");
    identifiers.push({
      name:
        explicit ??
        `${table}_${kind === "pk" ? "pkey" : `${fields}_${kind === "uq" ? "key" : "fkey"}`}`,
      kind,
      table,
    });
  };
  const tables = [
    ...ddl.matchAll(
      new RegExp(
        `\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${sqlIdentifier})\\s*\\(([\\s\\S]*?)\\);`,
        "gi",
      ),
    ),
  ];
  for (const match of tables) {
    const table = physicalName(match[1]!);
    identifiers.push({ name: table, table, kind: "tb" });
    const columns: string[] = [];
    // Commas inside constraint column lists and type arguments are not separators.
    for (const definition of match[2]!.split(/,(?![^()]*\))/)) {
      const columnToken =
        /^\s*(?:CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\b/i.test(
          definition,
        )
          ? undefined
          : new RegExp(`^\\s*(${sqlIdentifier})`).exec(definition)?.[1];
      const column =
        columnToken === undefined ? undefined : physicalName(columnToken);
      if (column) columns.push(column);
      addConstraint(table, definition, column);
    }
    assertColumns(columns);
  }
  const indexes = [
    ...ddl.matchAll(
      new RegExp(
        `\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${sqlIdentifier})\\s+ON\\s+(${sqlIdentifier})`,
        "gi",
      ),
    ),
  ];
  for (const match of indexes)
    identifiers.push({
      name: physicalName(match[1]!),
      table: physicalName(match[2]!),
      kind: "ix",
    });
  for (const match of ddl.matchAll(
    new RegExp(
      `\\bALTER\\s+TABLE\\s+(${sqlIdentifier})\\s+ADD\\s+(CONSTRAINT\\s+${sqlIdentifier}[^;]+);`,
      "gi",
    ),
  ))
    addConstraint(physicalName(match[1]!), match[2]!);
  // A contribution using an unrecognized DDL form must not disappear from the
  // namespace inventory. Keep unsupported forms fail-closed rather than emit
  // identifiers that were never checked for bounds or collisions.
  if (
    tables.length !== [...keywords.matchAll(/\bCREATE\s+TABLE\b/gi)].length ||
    indexes.length !==
      [...keywords.matchAll(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/gi)].length ||
    explicitConstraints !== [...keywords.matchAll(/\bCONSTRAINT\b/gi)].length
  )
    throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
  return identifiers;
}

function assertIdentifierInventory(
  identifiers: readonly StorageIdentifier[],
): void {
  const occupied = new Set<string>();
  for (const identifier of identifiers) {
    if (
      Buffer.byteLength(identifier.name, "utf8") > POSTGRES_IDENTIFIER_MAX_BYTES
    )
      throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
    for (const namespace of identifierNamespaces(identifier)) {
      const key = `${namespace}\0${identifier.name}`;
      if (occupied.has(key)) throw new Error(DATABASE_STORAGE_VALIDATION_ERROR);
      occupied.add(key);
    }
  }
}

function collectDatabaseObjects(
  graph: ApplicationGraphV1,
  names?: DatabaseNames,
): DatabaseObject[] {
  const objects: DatabaseObject[] = [];
  const add = (
    kind: IdentifierKind,
    owner: string,
    fields: readonly string[],
    identity: string,
    prisma: string,
    sql = prisma,
  ): void => {
    const table = physicalTable(names, owner);
    objects.push({
      id: objectId(
        kind,
        owner,
        kind === "uq"
          ? fields.join(",")
          : kind === "ix" || kind === "fk"
            ? identity.split("\0")[0]!
            : "",
      ),
      key: `${IDENTIFIER_POLICY}\0${kind === "fk" ? "constraint" : "relation"}\0${kind}\0${toPascalCase(owner)}\0${fields.join(",")}\0${identity}`,
      kind,
      owner,
      prisma: { name: prisma, kind, table },
      sql: { name: sql, kind, table },
    });
  };
  for (const entity of graph.domain.entities) {
    const logical = toPascalCase(entity.key);
    const table = physicalTable(names, entity.key);
    add("tb", entity.key, [], "", logical);
    add("pk", entity.key, ["id"], "", `${table}_pkey`);
    for (const field of entity.fields)
      if (field.unique)
        add("uq", entity.key, [field.key], "", `${table}_${field.key}_key`);
    entity.indexes.forEach((index, ordinal) =>
      add(
        "ix",
        entity.key,
        index.fields,
        String(ordinal),
        `${table}_${index.fields.join("_")}_idx`,
        `${logical}_${ordinal}_idx`,
      ),
    );
    const columns = [...renderedFieldNames(graph, entity.key), "id"];
    assertColumns(columns);
  }
  const suffixes = duplicateEndpointRelationSuffixes(graph);
  graph.domain.relations.forEach((relation, ordinal) => {
    if (relation.kind === "many-to-many") return;
    const foreign = resolveRelationForeignKey(graph, relation);
    const table = physicalTable(names, foreign.ownerKey);
    if (
      foreign.oneToOne &&
      !graph.domain.entities
        .find((entity) => entity.key === foreign.ownerKey)!
        .fields.some((field) => field.key === foreign.scalarField)
    )
      add(
        "uq",
        foreign.ownerKey,
        [foreign.scalarField],
        "",
        `${table}_${foreign.scalarField}_key`,
      );
    add(
      "fk",
      foreign.ownerKey,
      [foreign.scalarField],
      `${ordinal}\0${toPascalCase(foreign.targetKey)}\0${foreign.targetField}`,
      `${table}_${foreign.scalarField}_fkey`,
      boundedForeignKeyConstraintName(
        `${toPascalCase(foreign.targetKey)}To${toPascalCase(foreign.ownerKey)}`,
        suffixes.get(relation) ?? "",
      ),
    );
  });
  if (
    hasDuplicateNames(objects.map((object) => object.key)) ||
    hasDuplicateNames(objects.map((object) => object.id))
  )
    throw new Error(IDENTIFIER_ALLOCATION_ERROR);
  return objects;
}

function allocateDatabaseNames(
  plan: DatabasePlanV1,
  graph: ApplicationGraphV1,
): DatabaseNames {
  // Rendering an empty domain inventories only existing fixed/compiler/package
  // fragments. Their identifiers are reservations, never allocation candidates.
  const empty = {
    ...graph,
    domain: { ...graph.domain, entities: [], relations: [] },
  };
  const fixedPrisma = prismaStorageIdentifiers(
    renderPrismaSchema(
      empty,
      plan.orderOperationReceiptSchema,
      plan.includeGenericCommerceLineItems,
      plan.additionalSchemaFragments,
      plan.approvalEntity,
      plan.taskEntity,
      plan.appointmentEntity,
    ),
  );
  const fixedSql = sqlStorageIdentifiers(
    renderInitialMigration(
      empty,
      plan.orderOperationReceiptMigration,
      plan.includeGenericCommerceLineItems,
      plan.additionalMigrationFragments,
      plan.approvalEntity,
      plan.taskEntity,
      plan.appointmentEntity,
    ),
  );
  // Implicit join objects are outside the repair surface, including their keys.
  for (const relation of graph.domain.relations) {
    if (relation.kind !== "many-to-many") continue;
    const table = `_${toPascalCase(relation.from)}To${toPascalCase(relation.to)}`;
    const joins: StorageIdentifier[] = [
      { name: table, table, kind: "tb" },
      { name: `${table}_AB_pkey`, table, kind: "pk" },
      { name: `${table}_B_index`, table, kind: "ix" },
      { name: `${table}_A_fkey`, table, kind: "fk" },
      { name: `${table}_B_fkey`, table, kind: "fk" },
    ];
    fixedPrisma.push(...joins);
    fixedSql.push(...joins);
  }
  assertIdentifierInventory(fixedPrisma);
  assertIdentifierInventory(fixedSql);
  const names = new Map<string, string>();
  const occupied = new Map<string, string>();
  const reserve = (identifier: StorageIdentifier, key: string): void => {
    for (const namespace of [
      ...identifierNamespaces(identifier),
      ...(isConstraint(identifier.kind) ? ["mapped-constraint"] : []),
    ])
      occupied.set(`${namespace}\0${identifier.name}`, key);
  };
  [...fixedPrisma, ...fixedSql].forEach((identifier) =>
    reserve(identifier, "fixed"),
  );
  const unsafe = (
    object: DatabaseObject,
    objects: readonly DatabaseObject[],
  ): boolean =>
    (["prisma", "sql"] as const).some((stream) => {
      const candidate = object[stream];
      if (
        Buffer.byteLength(candidate.name, "utf8") >
        POSTGRES_IDENTIFIER_MAX_BYTES
      )
        return true;
      const fixed = stream === "prisma" ? fixedPrisma : fixedSql;
      return [
        ...fixed,
        ...objects
          .filter((other) => other !== object)
          .map((other) => other[stream]),
      ].some(
        (other) =>
          other.name === candidate.name &&
          identifierNamespaces(other).some((namespace) =>
            identifierNamespaces(candidate).includes(namespace),
          ),
      );
    });
  const allocate = (objects: readonly DatabaseObject[]): void => {
    for (const object of [...objects].sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
    )) {
      const digest = sha256Digest(object.key);
      const suffix = `_${object.kind}_${digest.slice(0, 16)}`;
      let prefix = "";
      for (const character of object.prisma.name) {
        if (
          Buffer.byteLength(prefix + character + suffix, "utf8") >
          POSTGRES_IDENTIFIER_MAX_BYTES
        )
          break;
        prefix += character;
      }
      const namespaces = [
        ...identifierNamespaces(object.prisma),
        ...(isConstraint(object.kind) ? ["mapped-constraint"] : []),
      ];
      const available = (name: string): boolean =>
        namespaces.every((namespace) => !occupied.has(`${namespace}\0${name}`));
      let name = `${prefix}${suffix}`;
      if (!available(name)) name = `${object.kind}_${digest.slice(0, 60)}`;
      if (!available(name)) throw new Error(IDENTIFIER_ALLOCATION_ERROR);
      names.set(object.id, name);
      reserve({ ...object.prisma, name }, object.key);
    }
  };
  const initial = collectDatabaseObjects(graph);
  const mappedTables = new Set(
    initial
      .filter((object) => object.kind === "tb" && unsafe(object, initial))
      .map((object) => object.owner),
  );
  // Reserve untouched objects from BOTH streams before allocating any table.
  for (const object of initial)
    if (!mappedTables.has(object.owner) && !unsafe(object, initial)) {
      reserve(object.prisma, object.key);
      reserve(object.sql, object.key);
    }
  allocate(
    initial.filter(
      (object) => object.kind === "tb" && mappedTables.has(object.owner),
    ),
  );
  const final = collectDatabaseObjects(graph, names);
  const mapped = final.filter(
    (object) =>
      object.kind !== "tb" &&
      (mappedTables.has(object.owner) || unsafe(object, final)),
  );
  for (const object of final)
    if (object.kind !== "tb" && !mapped.includes(object)) {
      reserve(object.prisma, object.key);
      reserve(object.sql, object.key);
    }
  allocate(mapped);
  return names;
}

function hasDuplicateNames(names: readonly string[]): boolean {
  return new Set(names).size !== names.length;
}

function assertUniqueDatabaseStorageNames(
  schema: string,
  migration: string,
): readonly [readonly StorageIdentifier[], readonly StorageIdentifier[]] {
  const inventories = [
    prismaStorageIdentifiers(schema),
    sqlStorageIdentifiers(migration),
  ] as const;
  inventories.forEach(assertIdentifierInventory);
  return inventories;
}

function renderDatabaseFiles(plan: DatabasePlanV1): readonly GeneratedFile[] {
  const graph = assertValidApplicationGraph(plan.graph);
  const names =
    plan.prismaSchemaOverride || plan.initialMigrationOverride
      ? new Map<string, string>()
      : allocateDatabaseNames(plan, graph);
  const schema = plan.prismaSchemaOverride
    ? plan.prismaSchemaOverride
    : renderPrismaSchema(
        graph,
        plan.orderOperationReceiptSchema,
        plan.includeGenericCommerceLineItems,
        plan.additionalSchemaFragments,
        plan.approvalEntity,
        plan.taskEntity,
        plan.appointmentEntity,
        names,
      );
  const migration = plan.initialMigrationOverride
    ? plan.initialMigrationOverride
    : renderInitialMigration(
        graph,
        plan.orderOperationReceiptMigration,
        plan.includeGenericCommerceLineItems,
        plan.additionalMigrationFragments,
        plan.approvalEntity,
        plan.taskEntity,
        plan.appointmentEntity,
        names,
      );
  const [prismaIdentifiers, sqlIdentifiers] = assertUniqueDatabaseStorageNames(
    schema,
    migration,
  );
  for (const object of collectDatabaseObjects(graph, names)) {
    const name = names.get(object.id);
    if (!name) continue;
    const table = physicalTable(names, object.owner);
    if (
      ![prismaIdentifiers, sqlIdentifiers].every((identifiers) =>
        identifiers.some(
          (identifier) =>
            identifier.name === name &&
            identifier.kind === object.kind &&
            identifier.table === table,
        ),
      )
    )
      throw new Error(IDENTIFIER_ALLOCATION_ERROR);
  }
  return [
    { path: "database/prisma/schema.prisma", content: schema },
    { path: "api/prisma/schema.prisma", content: schema },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content: migration,
    },
    {
      path: "database/prisma/seed.ts",
      content: renderPrismaSeed(graph, plan.hasRestaurantRuntime),
    },
  ];
}

function validateDatabaseFiles(
  files: readonly GeneratedFile[],
): TargetValidationResult {
  const issues = DATABASE_PATHS.filter(
    (path) => !files.some((file) => file.path === path),
  ).map((path) => ({
    target: "prisma-postgres" as const,
    path,
    code: "missing.database-file",
    message: "The database set must contain every declared file.",
  }));
  const unexpected = files
    .filter((file) => !DATABASE_PATHS.some((path) => path === file.path))
    .map((file) => ({
      target: "prisma-postgres" as const,
      path: file.path,
      code: "unexpected.database-file",
      message: "The database set must not contain undeclared files.",
    }));
  const malformed = files
    .filter(
      (file) =>
        DATABASE_PATHS.some((path) => path === file.path) &&
        ((file.path.endsWith("schema.prisma") &&
          !file.content.includes("generator client")) ||
          (file.path.endsWith("migration.sql") &&
            !file.content.includes("CREATE TABLE")) ||
          (file.path.endsWith("seed.ts") && !file.content.includes("prisma"))),
    )
    .map((file) => ({
      target: "prisma-postgres" as const,
      path: file.path,
      code: "malformed.database-file",
      message: "A database file must keep its declared structure.",
    }));
  const allIssues = [...issues, ...unexpected, ...malformed];
  return allIssues.length === 0
    ? { ok: true }
    : { ok: false, issues: allIssues };
}

export const databaseTargetPlugin: CompilerTargetPluginV1<DatabasePlanV1> = {
  apiVersion: "factory.compiler-target/v1",
  key: "prisma-postgres",
  supports: () => true,
  plan: buildDatabasePlan,
  render: renderDatabaseFiles,
  validate: validateDatabaseFiles,
};
