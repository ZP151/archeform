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

const artifactBlueprint: Readonly<Record<CompilationTargetKey, readonly Omit<CompilationArtifactPlan, "target">[]>> = {
  simulator: [{ path: "simulator/", mediaType: "text/html" }],
  "next-web": [{ path: "web/", mediaType: "application/vnd.factory.source-tree" }],
  "nest-api": [{ path: "api/", mediaType: "application/vnd.factory.source-tree" }],
  "prisma-postgres": [
    { path: "database/prisma/schema.prisma", mediaType: "text/plain" },
    { path: "database/prisma/migrations/", mediaType: "application/vnd.factory.source-tree" },
    { path: "database/prisma/seed.ts", mediaType: "text/typescript" },
  ],
  "casbin-policy": [{ path: "api/policy/model.conf", mediaType: "text/plain" }, { path: "api/policy/policy.csv", mediaType: "text/csv" }],
  "xstate-flow": [{ path: "api/src/flows/", mediaType: "application/vnd.factory.source-tree" }],
  "test-suite": [{ path: "tests/", mediaType: "application/vnd.factory.source-tree" }],
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
