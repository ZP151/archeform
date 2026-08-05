import type { ApplicationGraphV1 } from "@factory/graph";

import type { GeneratedFile } from "../../core/generated-files.js";
import type {
  CompilerTargetPluginV1,
  PublishedCompilationInput,
  TargetValidationResult,
} from "../../core/target-plugin.js";

/**
 * The serializable decision record for the documentation target. It projects
 * only the immutable Published Graph and the explicit compiler context; the
 * render step formats it deterministically.
 */
export interface DocumentationPlanV1 {
  readonly apiVersion: "factory.compiler-target/v1";
  readonly title: string;
  readonly identityBoundary: string;
  readonly endpoints: readonly (readonly [string, string, string])[];
  readonly entityRows: readonly string[];
  readonly flowRows: readonly string[];
  readonly entitySections: readonly string[];
  readonly relationRows: readonly string[];
  readonly permissionRows: readonly string[];
  readonly roleRows: readonly string[];
  readonly entitySummaries: readonly string[];
  readonly apiReferenceOverride?: string;
}

const DOCUMENTATION_PATHS = [
  "docs/api-reference.md",
  "docs/entity-relationship.md",
  "docs/permission-matrix.md",
  "docs/application.md",
] as const;

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

function hasCommerceCapabilities(graph: ApplicationGraphV1): boolean {
  return graph.integration.capabilities.some((capability) =>
    ["catalog.", "cart.", "inventory.", "order.", "payment."].some((prefix) =>
      capability.key.startsWith(prefix),
    ),
  );
}

function projectDocumentationEndpoints(
  graph: ApplicationGraphV1,
): readonly (readonly [string, string, string])[] {
  return [
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
      ? ([
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
        ] satisfies readonly (readonly [string, string, string])[])
      : []),
  ];
}

function projectDocumentationEntitySections(
  graph: ApplicationGraphV1,
): readonly string[] {
  return graph.domain.entities.map((entity) => {
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
}

function projectDocumentationRelationRows(
  graph: ApplicationGraphV1,
): readonly string[] {
  return graph.domain.relations.map((relation) => {
    const [from, to] = relationshipCardinality(relation.kind);
    return `- \`${relation.from}\` ${from} → ${to} \`${relation.to}\`${relation.field ? ` via \`${relation.field}\`` : ""}`;
  });
}

function buildDocumentationPlan(
  input: PublishedCompilationInput,
): DocumentationPlanV1 {
  const graph = input.graph;
  const base: DocumentationPlanV1 = {
    apiVersion: "factory.compiler-target/v1",
    title: graph.metadata.name,
    identityBoundary: input.context.identityPolicyEnabled
      ? "Every request is bound to an opaque local fixture session during local compilation; the server resolves the principal and checks the declared resource/action before performing work."
      : "Every request is role-scoped through the `x-factory-role` header.",
    endpoints: projectDocumentationEndpoints(graph),
    entityRows: graph.domain.entities.map(
      (entity) => `- \`${entity.key}\` — ${entity.label}`,
    ),
    flowRows: graph.flow.flows.map(
      (flow) =>
        `- \`${flow.id}\` on \`${flow.entity}\`: ${flow.events.map((event) => `\`${event}\``).join(", ") || "no events"}`,
    ),
    entitySections: projectDocumentationEntitySections(graph),
    relationRows: projectDocumentationRelationRows(graph),
    permissionRows: graph.policy.permissions.map(
      (permission) =>
        `| ${markdownCell(permission.role)} | ${markdownCell(permission.resource)} | ${permission.actions.map(markdownCell).join(", ")} |`,
    ),
    roleRows: graph.policy.roles.map((role) => `- \`${role}\``),
    entitySummaries: graph.domain.entities.map(
      (entity) =>
        `- **${entity.label}**: ${entity.fields.map((field) => field.key).join(", ") || "No fields"}`,
    ),
  };

  const apiReferenceOverride = input.context.restaurantArtifacts.apiReference;
  return apiReferenceOverride === undefined
    ? base
    : { ...base, apiReferenceOverride };
}

function renderApiReference(plan: DocumentationPlanV1): string {
  return `# API reference\n\nThis API is compiled from the immutable Published Graph for **${plan.title}**. ${plan.identityBoundary}\n\n## Endpoints\n\n| Method | Path | Contract |\n| --- | --- | --- |\n${plan.endpoints.map(([method, path, description]) => `| ${method} | \`${path}\` | ${description} |`).join("\n")}\n\n## Domain endpoints\n\n${plan.entityRows.length ? plan.entityRows.join("\n") : "- No entities declared."}\n\n## Declared flow events\n\n${plan.flowRows.length ? plan.flowRows.join("\n") : "- No flows declared."}\n`;
}

function renderEntityRelationshipDiagram(plan: DocumentationPlanV1): string {
  const relationships = plan.relationRows.length
    ? plan.relationRows.join("\n")
    : "- No relationships declared.";
  return `# Entity relationship diagram\n\nThis document is a deterministic DomainModel projection, not a reverse-engineered database schema.\n\n## Relationships\n\n${relationships}\n\n## Entities\n\n${plan.entitySections.join("\n\n") || "No entities declared."}\n`;
}

function renderPermissionMatrix(plan: DocumentationPlanV1): string {
  const rows = plan.permissionRows.length
    ? plan.permissionRows.join("\n")
    : "| — | — | No permissions declared |";
  return `# Permission matrix\n\nThis is the reviewable PolicyModel projection that compiles to \`api/policy/policy.csv\`.\n\n| Role | Resource | Allowed actions |\n| --- | --- | --- |\n${rows}\n\n## Declared roles\n\n${plan.roleRows.length ? plan.roleRows.join("\n") : "- No roles declared."}\n`;
}

function renderApplicationDocumentation(plan: DocumentationPlanV1): string {
  return `# ${plan.title}\n\nThis application was compiled from a Factory Published Graph.\n\n## Generated documentation\n\n- [API reference](api-reference.md)\n- [Entity relationship diagram](entity-relationship.md)\n- [Permission matrix](permission-matrix.md)\n\n## Entities\n${plan.entitySummaries.join("\n") || "- No entities declared."}\n`;
}

function validateDocumentationFiles(
  files: readonly GeneratedFile[],
): TargetValidationResult {
  const issues = DOCUMENTATION_PATHS.filter(
    (path) => !files.some((file) => file.path === path),
  ).map((path) => ({
    target: "documentation" as const,
    path,
    code: "missing.documentation-file",
    message: "The documentation set must contain every declared file.",
  }));
  const unexpected = files
    .filter((file) => !DOCUMENTATION_PATHS.some((path) => path === file.path))
    .map((file) => ({
      target: "documentation" as const,
      path: file.path,
      code: "unexpected.documentation-file",
      message: "The documentation set must not contain undeclared files.",
    }));
  const empty = files
    .filter(
      (file) =>
        DOCUMENTATION_PATHS.some((path) => path === file.path) &&
        file.content.length === 0,
    )
    .map((file) => ({
      target: "documentation" as const,
      path: file.path,
      code: "empty.documentation-file",
      message: "A documentation file must not be empty.",
    }));
  const allIssues = [...issues, ...unexpected, ...empty];
  return allIssues.length === 0
    ? { ok: true }
    : { ok: false, issues: allIssues };
}

export const documentationTargetPlugin: CompilerTargetPluginV1<DocumentationPlanV1> =
  {
    apiVersion: "factory.compiler-target/v1",
    key: "documentation",
    supports: () => true,
    plan: buildDocumentationPlan,
    render: (plan) => [
      {
        path: "docs/api-reference.md",
        content: plan.apiReferenceOverride ?? renderApiReference(plan),
      },
      {
        path: "docs/entity-relationship.md",
        content: renderEntityRelationshipDiagram(plan),
      },
      {
        path: "docs/permission-matrix.md",
        content: renderPermissionMatrix(plan),
      },
      {
        path: "docs/application.md",
        content: renderApplicationDocumentation(plan),
      },
    ],
    validate: validateDocumentationFiles,
  };
