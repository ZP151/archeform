import type { GeneratedFile } from "../../src/core/generated-files.js";

interface IdentifierFixture {
  readonly model: string;
  readonly foreignKey: string;
  readonly sessionIndex?: string;
}

// CMP-003: exactly six semantic objects across the protected five definitions.
// Literal names pin BID-002 identity and BID-005 output, not new bundle hashes.
const DEFINITION_IDENTIFIERS: Readonly<Record<string, IdentifierFixture>> = {
  "restaurant-ordering": {
    model: "DataBaselineRestaurantOrdering",
    foreignKey:
      "DataBaselineRestaurantOrderingSession_subje_fk_80d076449e1e3ad1",
  },
  "expense-approval": {
    model: "DataBaselineExpenseApproval",
    foreignKey:
      "DataBaselineExpenseApprovalSession_subjectR_fk_f375a5bb8bf2285c",
  },
  "purchase-request-approval": {
    model: "DataBaselinePurchaseRequestApproval",
    foreignKey:
      "DataBaselinePurchaseRequestApprovalSession__fk_b37dda20040ce190",
    sessionIndex:
      "DataBaselinePurchaseRequestApprovalSession__ix_7f013aba9197ed31",
  },
  "team-task-tracking": {
    model: "DataBaselineTeamTaskTracking",
    foreignKey:
      "DataBaselineTeamTaskTrackingSession_subject_fk_133501c512a5b7d1",
  },
  "publication-review": {
    model: "DataBaselinePublicationReview",
    foreignKey:
      "DataBaselinePublicationReviewSession_subjec_fk_6081c284c5952b2e",
  },
};

// Separate three-object allowlist for the older Approval/Appointment fixtures.
const LEGACY_IDENTIFIERS: Readonly<Record<string, IdentifierFixture>> = {
  expense: {
    model: "ExpenseApprovalRequirement",
    foreignKey:
      "ExpenseApprovalRequirementSession_subjectRe_fk_900d35da9e551724",
  },
  purchase: {
    model: "PurchaseRequestApprovalRequirement",
    foreignKey:
      "PurchaseRequestApprovalRequirementSession_s_fk_f1b787db3b8c6932",
  },
  booking: {
    model: "AppointmentBookingRequirement",
    foreignKey:
      "AppointmentBookingRequirementSession_subjec_fk_e0a84d9bf53072e1",
  },
};

// Existing Task fixtures have their own literal identities. They cannot expand
// the protected definition or older Approval allowlists.
const TASK_IDENTIFIERS: Readonly<Record<string, IdentifierFixture>> = {
  "restaurant-ordering": {
    model: "TaskBaselineRestaurantOrdering",
    foreignKey:
      "TaskBaselineRestaurantOrderingSession_subje_fk_1da9c42eaabd7b8b",
  },
  "expense-approval": {
    model: "TaskBaselineExpenseApproval",
    foreignKey:
      "TaskBaselineExpenseApprovalSession_subjectR_fk_2a0dacf6c05ba721",
  },
  "purchase-request-approval": {
    model: "TaskBaselinePurchaseRequestApproval",
    foreignKey:
      "TaskBaselinePurchaseRequestApprovalSession__fk_8bea22089d6d44e3",
    sessionIndex:
      "TaskBaselinePurchaseRequestApprovalSession__ix_d3dc70be97437b1a",
  },
  "task-correction-legacy-baseline": {
    model: "TaskCorrectionLegacyBaseline",
    foreignKey:
      "TaskCorrectionLegacyBaselineSession_subject_fk_e2192d5f742dc019",
  },
};

export const IDENTIFIER_DATABASE_PATHS = [
  "database/prisma/schema.prisma",
  "api/prisma/schema.prisma",
  "database/prisma/migrations/0001_initial/migration.sql",
] as const;

function fail(): never {
  throw new Error("Legacy database identifier comparison failed.");
}

/** Inverse only exact allowlisted tokens, in their expected model and SQL role.
 * All other bytes pass through untouched for the original whole-bundle digest
 * to detect unrelated changes. Never use for artifact generation or execution.
 */
function compareIdentifiers(
  files: readonly GeneratedFile[],
  allowlist: Readonly<Record<string, IdentifierFixture>>,
  fixtureKey: string,
): readonly GeneratedFile[] {
  if (!Object.hasOwn(allowlist, fixtureKey)) return fail();
  const fixture = allowlist[fixtureKey]!;
  const get = (path: string): string => {
    const matches = files.filter((file) => file.path === path);
    return matches.length === 1 ? matches[0]!.content : fail();
  };
  const [schemaPath, apiSchemaPath, migrationPath] = IDENTIFIER_DATABASE_PATHS;
  const schema = get(schemaPath);
  const migration = get(migrationPath);
  if (schema !== get(apiSchemaPath) || /@@?map\(/.test(schema)) return fail();
  const owner = `${fixture.model}Session`;
  const target = `${fixture.model}Principal`;
  const legacyForeignKey = `${target}To${owner}_fkey`;
  if (Buffer.byteLength(legacyForeignKey) <= 63) return fail();
  const patches = [
    {
      name: fixture.foreignKey,
      schemaBefore: `@relation("${owner}To${target}", fields: [subjectRef], references: [subjectRef], map: "${fixture.foreignKey}")`,
      schemaAfter: `@relation("${owner}To${target}", fields: [subjectRef], references: [subjectRef])`,
      sqlBefore: `ALTER TABLE "${owner}" ADD CONSTRAINT "${fixture.foreignKey}" FOREIGN KEY ("subjectRef") REFERENCES "${target}" ("subjectRef") ON DELETE RESTRICT ON UPDATE CASCADE;`,
      sqlAfter: `ALTER TABLE "${owner}" ADD CONSTRAINT "${legacyForeignKey}" FOREIGN KEY ("subjectRef") REFERENCES "${target}" ("subjectRef") ON DELETE RESTRICT ON UPDATE CASCADE;`,
    },
  ];
  if (fixture.sessionIndex) {
    if (
      Buffer.byteLength(`${owner}_subjectRef_status_idx`) <= 63 ||
      Buffer.byteLength(`${owner}_0_idx`) > 63
    )
      return fail();
    patches.push({
      name: fixture.sessionIndex,
      schemaBefore: `@@index([subjectRef, status], map: "${fixture.sessionIndex}")`,
      schemaAfter: "@@index([subjectRef, status])",
      sqlBefore: `CREATE INDEX "${fixture.sessionIndex}" ON "${owner}" ("subjectRef", "status");`,
      sqlAfter: `CREATE INDEX "${owner}_0_idx" ON "${owner}" ("subjectRef", "status");`,
    });
  }
  const maps = [...schema.matchAll(/\bmap:\s*"([^"]+)"/g)].map(
    (match) => match[1]!,
  );
  if (
    maps.length !== patches.length ||
    maps.some((name) => !patches.some((patch) => patch.name === name))
  )
    return fail();
  const ownerModels = [
    ...schema.matchAll(new RegExp(`^model ${owner} \\{([^}]+)\\}`, "gm")),
  ];
  if (ownerModels.length !== 1) return fail();
  let restoredSchema = schema;
  let restoredMigration = migration;
  for (const patch of patches) {
    if (
      Buffer.byteLength(patch.name) > 63 ||
      ownerModels[0]![1]!.split(patch.schemaBefore).length !== 2 ||
      schema.split(patch.schemaBefore).length !== 2 ||
      schema.split(`"${patch.name}"`).length !== 2 ||
      migration.split(patch.sqlBefore).length !== 2 ||
      migration.split(`"${patch.name}"`).length !== 2
    )
      return fail();
    restoredSchema = restoredSchema.replace(
      patch.schemaBefore,
      patch.schemaAfter,
    );
    restoredMigration = restoredMigration.replace(
      patch.sqlBefore,
      patch.sqlAfter,
    );
  }
  return files.map((file) =>
    file.path === schemaPath || file.path === apiSchemaPath
      ? { ...file, content: restoredSchema }
      : file.path === migrationPath
        ? { ...file, content: restoredMigration }
        : file,
  );
}

export function definitionDatabaseIdentifierComparison(
  files: readonly GeneratedFile[],
  definitionKey: string,
): readonly GeneratedFile[] {
  return compareIdentifiers(files, DEFINITION_IDENTIFIERS, definitionKey);
}
export function legacyDatabaseIdentifierComparison(
  files: readonly GeneratedFile[],
  fixtureKey: string,
): readonly GeneratedFile[] {
  return compareIdentifiers(files, LEGACY_IDENTIFIERS, fixtureKey);
}
export function taskDatabaseIdentifierComparison(
  files: readonly GeneratedFile[],
  fixtureKey: string,
): readonly GeneratedFile[] {
  return compareIdentifiers(files, TASK_IDENTIFIERS, fixtureKey);
}
