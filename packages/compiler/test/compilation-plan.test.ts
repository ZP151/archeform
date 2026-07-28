import { describe, expect, it } from "vitest";

import {
  buildCompilationPlan,
  compilationTargets,
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

const publishedExpense: PublishedGraphInput = {
  publishedRevisionId: "published-expense-1",
  graph: {
    apiVersion: "factory.application-graph/v1",
    metadata: { id: "expense-approval", workspaceId: "local-workspace", name: "Expense approval" },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }],
      relations: [],
    },
    policy: { roles: ["employee"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  },
};

describe("compilation target registry", () => {
  it("defines the complete initial target set", () => {
    expect(compilationTargets.map((target) => target.key)).toEqual([
      "simulator",
      "next-web",
      "nest-api",
      "prisma-postgres",
      "casbin-policy",
      "xstate-flow",
      "test-suite",
      "documentation",
    ]);
  });

  it("builds deterministic output paths from an immutable published graph", () => {
    const first = buildCompilationPlan(publishedExpense);
    const second = buildCompilationPlan(publishedExpense);

    expect(first).toEqual(second);
    expect(first.graphHash).toMatch(/^sha256:/);
    expect(first.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: "next-web", path: "web/" }),
        expect.objectContaining({ target: "nest-api", path: "api/" }),
        expect.objectContaining({ target: "prisma-postgres", path: "database/prisma/schema.prisma" }),
      ]),
    );
  });

  it("refuses a mutable or malformed compilation input", () => {
    expect(() => buildCompilationPlan({ graph: publishedExpense.graph } as PublishedGraphInput)).toThrow(
      "Published revision id is required",
    );
  });

  it("generates deterministic, isolated Web/API/database source from a published Graph", () => {
    const bundle = generateApplicationBundle(publishedExpense);

    expect(bundle.rootDirectory).toBe("expense-approval-published-expense-1");
    expect(bundle.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "web/app/application-manifest.ts", content: expect.stringContaining("Expense approval") }),
        expect.objectContaining({ path: "web/package.json", content: expect.stringContaining("next") }),
        expect.objectContaining({ path: "api/src/main.ts", content: expect.stringContaining("NestFactory") }),
        expect.objectContaining({ path: "api/package.json", content: expect.stringContaining("@nestjs/core") }),
        expect.objectContaining({ path: "database/prisma/schema.prisma", content: expect.stringContaining("model Expense") }),
        expect.objectContaining({ path: "docker-compose.yml", content: expect.stringContaining("postgres") }),
        expect.objectContaining({ path: "api/policy/policy.csv", content: expect.any(String) }),
      ]),
    );
    expect(generateApplicationBundle(publishedExpense)).toEqual(bundle);
  });

  it("emits a deployable initial Prisma migration and isolated Compose lifecycle", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [file.path, file.content]),
    );

    expect(files["database/prisma/migrations/0001_initial/migration.sql"]).toContain(
      'CREATE TABLE "Expense"',
    );
    expect(files["database/prisma/migrations/0001_initial/migration.sql"]).toContain(
      'CREATE TABLE "AuditEvent"',
    );
    expect(files["database/Dockerfile"]).toContain("prisma migrate deploy");
    expect(files["api/Dockerfile"]).not.toContain("prisma db push");
    expect(files["web/.dockerignore"]).toContain("node_modules");
    expect(files["api/.dockerignore"]).toContain("node_modules");
    expect(files["api/package.json"]).toContain("@types/node");
    expect(files["docker-compose.yml"]).toContain("migrate:");
    expect(files["docker-compose.yml"]).toContain("FACTORY_COMPOSE_PROJECT_NAME");
    expect(files["pnpm-workspace.yaml"]).toContain("web");
    expect(files["README.md"]).toContain("docker compose down --volumes --remove-orphans");
  });

  it("emits a role-aware Next application that reaches the generated API through a same-origin proxy", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-web-1",
        graph: {
          ...publishedExpense.graph,
          policy: {
            roles: ["employee"],
            permissions: [{ role: "employee", resource: "expense", actions: ["create", "read"] }],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page.tsx"]).toContain("GeneratedApplicationClient");
    expect(files["web/app/generated-application-client.tsx"]).toContain('"use client"');
    expect(files["web/app/generated-application-client.tsx"]).toContain("x-factory-role");
    expect(files["web/app/generated-application-client.tsx"]).toContain("actions: readonly string[]");
    expect(files["web/app/application-manifest.ts"]).toContain("Create expense");
    expect(files["web/app/api/[...path]/route.ts"]).toContain("FACTORY_API_URL");
    expect(files["api/src/main.ts"]).toContain("enableCors");
    expect(files["api/src/main.ts"]).toContain("return await applicationRuntime.create");
    expect(files["docker-compose.yml"]).toContain("FACTORY_API_URL: http://api:3001");
  });

  it("preconfigures generated Next projects so a build does not rewrite their TypeScript contract", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [file.path, file.content]),
    );
    const tsconfig = JSON.parse(files["web/tsconfig.json"] as string) as { compilerOptions: Record<string, unknown>; include: string[] };

    expect(tsconfig.compilerOptions.module).toBe("esnext");
    expect(tsconfig.compilerOptions.moduleResolution).toBe("node");
    expect(tsconfig.compilerOptions.isolatedModules).toBe(true);
    expect(tsconfig.include).toContain(".next/types/**/*.ts");
    expect(files["web/next-env.d.ts"]).toContain('reference types="next"');
  });

  it("emits a browser-only role simulator that replays declared FlowModel transitions", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-simulator-1",
        graph: {
          ...publishedExpense.graph,
          policy: { roles: ["employee", "manager"], permissions: [] },
          flow: {
            flows: [{
              id: "expense-review",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "submitted", "approved"],
              events: ["submit", "approve"],
              transitions: [
                { from: "draft", event: "submit", to: "submitted" },
                { from: "submitted", event: "approve", to: "approved", roles: ["manager"] },
              ],
            }],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["simulator/index.html"]).toContain("Role simulator");
    expect(files["simulator/index.html"]).toContain("expense-review");
    expect(files["simulator/index.html"]).toContain("Transition denied");
    expect(files["simulator/index.html"]).toContain("selectedRole");
  });

  it("compiles declared DomainModel relations into Prisma relation fields", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-relations-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              { key: "order", label: "Order", fields: [], indexes: [] },
              { key: "menu-item", label: "Menu item", fields: [], indexes: [] },
            ],
            relations: [{ from: "order", to: "menu-item", kind: "many-to-many" }],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/prisma/schema.prisma"]).toContain(
      'menuItems MenuItem[] @relation("OrderToMenuItem")',
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      'orders Order[] @relation("OrderToMenuItem")',
    );
  });

  it("generates a role-guarded record runtime, XState machines, and an executable journey", () => {
    const input: PublishedGraphInput = {
      publishedRevisionId: "published-expense-runtime-1",
      graph: {
        ...publishedExpense.graph,
        domain: {
          entities: [
            {
              key: "expense",
              label: "Expense",
              fields: [
                { key: "amount", type: "decimal", required: true },
                { key: "description", type: "text", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["draft", "submitted", "approved", "rejected"],
                },
              ],
              indexes: [{ fields: ["status"] }],
            },
          ],
          relations: [],
        },
        policy: {
          roles: ["employee", "manager", "finance"],
          permissions: [
            { role: "employee", resource: "expense", actions: ["create", "read"] },
            { role: "manager", resource: "expense", actions: ["read", "approve", "reject"] },
            { role: "finance", resource: "expense", actions: ["read", "audit"] },
          ],
        },
        flow: {
          flows: [
            {
              id: "expense-review",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "submitted", "approved", "rejected"],
              events: ["submit", "approve", "reject"],
              transitions: [
                { from: "draft", event: "submit", to: "submitted" },
                { from: "submitted", event: "approve", to: "approved", roles: ["manager"] },
                { from: "submitted", event: "reject", to: "rejected", roles: ["manager"] },
              ],
            },
          ],
        },
      },
    };
    const files = Object.fromEntries(
      generateApplicationBundle(input).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain(
      "export class ApplicationRuntime",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "type RuntimeDefinition",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "const definition: RuntimeDefinition",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "effects?: readonly",
    );
    expect(files["api/src/application-runtime.ts"]).toContain("async transition(");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "assertTransitionAllowed",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "this.assertAllowed(role, entityKey, 'update')",
    );
    expect(files["api/src/policy.ts"]).toContain("newEnforcer");
    expect(files["api/src/flows/machines.ts"]).toContain("createMachine");
    expect(files["api/src/prisma-record-store.ts"]).toContain("PrismaClient");
    expect(files["api/prisma/schema.prisma"]).toContain("model Expense");
    expect(files["api/src/main.ts"]).toContain("PrismaRecordStore");
    expect(files["api/src/main.ts"]).toContain('@Controller("api")');
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "applicationRuntime.create",
    );
    expect(files["api/package.json"]).toContain("vitest");
    expect(files["api/package.json"]).toContain("@prisma/client");
  });

  it("executes declared capability effects as durable evidence and fails closed for unknown effects", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-payment-effects-1",
        graph: {
          ...publishedExpense.graph,
          integration: {
            providers: [],
            capabilities: [{ key: "payment.simulate", providerId: "factory", operation: "simulate" }],
          },
          policy: {
            roles: ["customer", "finance"],
            permissions: [
              { role: "customer", resource: "expense", actions: ["create", "read"] },
              { role: "finance", resource: "expense", actions: ["audit"] },
            ],
          },
          flow: {
            flows: [{
              id: "expense-payment",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "paid"],
              events: ["pay"],
              transitions: [{
                from: "draft",
                event: "pay",
                to: "paid",
                effects: [{ capability: "payment.simulate", operation: "simulate" }],
              }],
            }],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain("executeEffects");
    expect(files["api/src/application-runtime.ts"]).toContain("Unsupported capability effect");
    expect(files["api/src/application-runtime.ts"]).toContain("appendCapabilityEvent");
    expect(files["api/src/prisma-record-store.ts"]).toContain("capabilityEvent");
    expect(files["api/prisma/schema.prisma"]).toContain("model CapabilityEvent");
    expect(files["api/test/journey.generated.test.ts"]).toContain("capabilityEvents");
    expect(files["api/test/journey.generated.test.ts"]).toContain("payment.simulate");
    expect(files["database/prisma/migrations/0001_initial/migration.sql"]).toContain(
      'CREATE TABLE "CapabilityEvent"',
    );
  });
});
