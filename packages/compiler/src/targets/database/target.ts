import type { ApplicationGraphV1 } from "@factory/graph";

import type { GeneratedFile } from "../../core/generated-files.js";
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
      return "DateTime @db.Date";
    case "datetime":
      return "DateTime";
    case "json":
      return "Json";
    default:
      return "String";
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
function renderPrismaSchema(
  graph: ApplicationGraphV1,
  orderOperationReceiptSchema?: string,
  includeGenericCommerceLineItems = true,
  additionalSchemaFragments: readonly string[] = [],
): string {
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

      const foreignKey = resolveRelationForeignKey(graph, relation);
      const ownerModel = toPascalCase(foreignKey.ownerKey);
      const targetModel = toPascalCase(foreignKey.targetKey);
      const ownerField = toCamelCase(foreignKey.ownerKey);
      const targetField = toCamelCase(foreignKey.targetKey);

      if (entityKey === foreignKey.targetKey) {
        return [
          `  ${foreignKey.oneToOne ? ownerField : pluralize(ownerField)} ${ownerModel}${foreignKey.oneToOne ? "?" : "[]"} @relation("${relationName}")`,
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
                `  ${foreignKey.scalarField} String?${foreignKey.oneToOne ? " @unique" : ""}`,
              ]),
          `  ${targetField} ${targetModel}${optional} @relation("${relationName}", fields: [${foreignKey.scalarField}], references: [${foreignKey.targetField}])`,
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
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
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
      `${quoteSqlIdentifier(foreignKey.scalarField)} TEXT${foreignKey.oneToOne ? " UNIQUE" : ""}`,
    ];
  });
}
function renderInitialMigration(
  graph: ApplicationGraphV1,
  orderOperationReceiptMigration?: string,
  includeGenericCommerceLineItems = true,
  additionalMigrationFragments: readonly string[] = [],
): string {
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
    const foreignKey = resolveRelationForeignKey(graph, relation);
    const relationName = `${toPascalCase(foreignKey.targetKey)}To${toPascalCase(foreignKey.ownerKey)}`;
    return [
      `ALTER TABLE ${quoteSqlIdentifier(toPascalCase(foreignKey.ownerKey))} ADD CONSTRAINT ${quoteSqlIdentifier(`${relationName}_fkey`)} FOREIGN KEY (${quoteSqlIdentifier(foreignKey.scalarField)}) REFERENCES ${quoteSqlIdentifier(toPascalCase(foreignKey.targetKey))} (${quoteSqlIdentifier(foreignKey.targetField)}) ON DELETE RESTRICT ON UPDATE CASCADE;`,
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
    ...(includeGenericCommerceLineItems && hasCommerceCapabilities(graph)
      ? [
          'CREATE TABLE "CommerceLineItem" (\n  "id" TEXT NOT NULL PRIMARY KEY,\n  "actor" TEXT NOT NULL,\n  "orderEntity" TEXT NOT NULL,\n  "orderRecordId" TEXT NOT NULL,\n  "catalogEntity" TEXT NOT NULL,\n  "catalogRecordId" TEXT NOT NULL,\n  "quantity" INTEGER NOT NULL,\n  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP\n);',
          'CREATE INDEX "CommerceLineItem_orderEntity_orderRecordId_idx" ON "CommerceLineItem" ("orderEntity", "orderRecordId");',
          'CREATE INDEX "CommerceLineItem_catalogEntity_catalogRecordId_idx" ON "CommerceLineItem" ("catalogEntity", "catalogRecordId");',
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
  const records = (graph.domain.seedData ?? []).map((seed, index) => ({
    delegate: toCamelCase(seed.entity),
    id: seed.id ?? `seed-${seed.entity}-${index + 1}`,
    values: seed.values,
  }));
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
    graph: input.graph,
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

function renderDatabaseFiles(plan: DatabasePlanV1): readonly GeneratedFile[] {
  const schema = plan.prismaSchemaOverride
    ? plan.prismaSchemaOverride
    : renderPrismaSchema(
        plan.graph,
        plan.orderOperationReceiptSchema,
        plan.includeGenericCommerceLineItems,
        plan.additionalSchemaFragments,
      );
  const migration = plan.initialMigrationOverride
    ? plan.initialMigrationOverride
    : renderInitialMigration(
        plan.graph,
        plan.orderOperationReceiptMigration,
        plan.includeGenericCommerceLineItems,
        plan.additionalMigrationFragments,
      );
  return [
    { path: "database/prisma/schema.prisma", content: schema },
    { path: "api/prisma/schema.prisma", content: schema },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content: migration,
    },
    {
      path: "database/prisma/seed.ts",
      content: renderPrismaSeed(plan.graph, plan.hasRestaurantRuntime),
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
