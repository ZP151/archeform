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

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join("");
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
  const models = graph.domain.entities.map((entity) => {
    const fields = entity.fields.map((field) => {
      const optional = field.required ? "" : "?";
      const unique = field.unique ? " @unique" : "";
      return `  ${field.key} ${prismaType(field.type)}${optional}${unique}`;
    });
    const indexes = entity.indexes.map((index) => `  @@index([${index.fields.join(", ")}])`);
    return [
      `model ${toPascalCase(entity.key)} {`,
      "  id String @id @default(cuid())",
      ...fields,
      "  createdAt DateTime @default(now())",
      "  updatedAt DateTime @updatedAt",
      ...indexes,
      "}",
    ].join("\n");
  });
  return [
    'generator client { provider = "prisma-client-js" }',
    "",
    'datasource db { provider = "postgresql"; url = env("DATABASE_URL") }',
    "",
    ...models,
    "",
  ].join("\n");
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

function renderWebPage(graph: ApplicationGraphV1): string {
  const pages = graph.page.pages.map((page) => ({ route: page.route, title: page.title }));
  return [
    "export default function GeneratedApplication() {",
    `  const applicationName = ${JSON.stringify(graph.metadata.name)};`,
    `  const pages = ${JSON.stringify(pages)};`,
    "  return (",
    "    <main>",
    "      <h1>{applicationName}</h1>",
    "      <nav>{pages.map((page) => <a key={page.route} href={page.route}>{page.title}</a>)}</nav>",
    "    </main>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function renderApiMain(graph: ApplicationGraphV1): string {
  return [
    'import { Controller, Get, Module } from "@nestjs/common";',
    'import { NestFactory } from "@nestjs/core";',
    "",
    "@Controller()",
    "class GeneratedController {",
    `  @Get("health") health() { return { application: ${JSON.stringify(graph.metadata.name)}, status: "ok" }; }`,
    "}",
    "",
    "@Module({ controllers: [GeneratedController] })",
    "class GeneratedModule {}",
    "",
    "async function bootstrap() {",
    "  const app = await NestFactory.create(GeneratedModule);",
    "  await app.listen(process.env.PORT ?? 3001);",
    "}",
    "void bootstrap();",
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
      content: JSON.stringify({ name: rootDirectory, private: true, packageManager: "pnpm@9.0.0", workspaces: ["web", "api", "database"] }, null, 2) + "\n",
    },
    {
      path: "web/package.json",
      content: JSON.stringify({
        name: "generated-web",
        private: true,
        scripts: { dev: "next dev --port 3000", build: "next build", start: "next start --port 3000" },
        dependencies: { next: "^15.5.0", react: "^19.0.0", "react-dom": "^19.0.0" },
      }, null, 2) + "\n",
    },
    {
      path: "web/tsconfig.json",
      content: JSON.stringify({ compilerOptions: { jsx: "preserve", strict: true, noEmit: true }, include: ["app/**/*.ts", "app/**/*.tsx"] }, null, 2) + "\n",
    },
    {
      path: "web/app/layout.tsx",
      content: "import type { ReactNode } from \"react\";\n\nexport default function RootLayout({ children }: { children: ReactNode }) { return <html lang=\"en\"><body>{children}</body></html>; }\n",
    },
    { path: "web/app/page.tsx", content: renderWebPage(graph) },
    {
      path: "api/package.json",
      content: JSON.stringify({
        name: "generated-api",
        private: true,
        scripts: { dev: "tsx watch src/main.ts", build: "tsc -p tsconfig.json", start: "node dist/main.js" },
        dependencies: { "@nestjs/common": "^10.4.0", "@nestjs/core": "^10.4.0", "@nestjs/platform-express": "^10.4.0", "reflect-metadata": "^0.2.2", rxjs: "^7.8.1" },
        devDependencies: { tsx: "^4.19.0", typescript: "^5.7.0" },
      }, null, 2) + "\n",
    },
    {
      path: "api/tsconfig.json",
      content: JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", outDir: "dist", strict: true, experimentalDecorators: true, emitDecoratorMetadata: true }, include: ["src/**/*.ts"] }, null, 2) + "\n",
    },
    {
      path: "api/Dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCOPY . .\nRUN pnpm build\nCMD [\"node\", \"dist/main.js\"]\n",
    },
    { path: "api/src/main.ts", content: renderApiMain(graph) },
    { path: "database/prisma/schema.prisma", content: renderPrismaSchema(graph) },
    {
      path: "database/package.json",
      content: JSON.stringify({
        name: "generated-database",
        private: true,
        scripts: { generate: "prisma generate", migrate: "prisma migrate dev", seed: "tsx prisma/seed.ts" },
        dependencies: { "@prisma/client": "^6.19.0" },
        devDependencies: { prisma: "^6.19.0", tsx: "^4.19.0" },
      }, null, 2) + "\n",
    },
    { path: "database/prisma/seed.ts", content: "export async function seed() { return { status: \"ready\" }; }\n" },
    {
      path: "api/policy/model.conf",
      content: "[request_definition]\nr = sub, obj, act\n\n[policy_definition]\np = sub, obj, act\n\n[policy_effect]\ne = some(where (p.eft == allow))\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n",
    },
    { path: "api/policy/policy.csv", content: renderCasbinPolicy(graph) },
    { path: "api/src/flows/definitions.ts", content: renderFlowDefinitions(graph) },
    { path: "tests/journeys.generated.md", content: `# Generated role journeys\n\nGraph: ${plan.graphHash}\n` },
    { path: "docs/application.md", content: renderDocumentation(graph) },
    {
      path: "web/Dockerfile",
      content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json ./\nRUN npm config set fetch-retries 5 && npm install --global pnpm@9.0.0 && pnpm install\nCOPY . .\nRUN pnpm build\nCMD [\"pnpm\", \"start\"]\n",
    },
    {
      path: "docker-compose.yml",
      content: "name: generated-application\n\nservices:\n  postgres:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: generated\n      POSTGRES_PASSWORD: generated\n      POSTGRES_DB: generated\n    ports:\n      - \"5433:5432\"\n  api:\n    build: ./api\n    environment:\n      DATABASE_URL: postgresql://generated:generated@postgres:5432/generated\n    depends_on:\n      - postgres\n  web:\n    build: ./web\n    depends_on:\n      - api\n",
    },
  ];

  return { rootDirectory, graphHash: plan.graphHash, files };
}
