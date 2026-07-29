import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import { composeProfileDraft } from "@factory/capabilities";

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
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
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

const simpleEcommerceAssetLocks = composeProfileDraft({
  profile: "simple-ecommerce",
}).assetLocks;

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
        expect.objectContaining({
          target: "prisma-postgres",
          path: "database/prisma/schema.prisma",
        }),
      ]),
    );
  });

  it("refuses a mutable or malformed compilation input", () => {
    expect(() =>
      buildCompilationPlan({
        graph: publishedExpense.graph,
      } as PublishedGraphInput),
    ).toThrow("Published revision id is required");
  });

  it("generates deterministic, isolated Web/API/database source from a published Graph", () => {
    const bundle = generateApplicationBundle(publishedExpense);

    expect(bundle.rootDirectory).toBe("expense-approval-published-expense-1");
    expect(bundle.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "web/app/application-manifest.ts",
          content: expect.stringContaining("Expense approval"),
        }),
        expect.objectContaining({
          path: "web/app/favicon.ico/route.ts",
          content: expect.stringContaining("image/svg+xml"),
        }),
        expect.objectContaining({
          path: "web/package.json",
          content: expect.stringContaining("next"),
        }),
        expect.objectContaining({
          path: "api/src/main.ts",
          content: expect.stringContaining("NestFactory"),
        }),
        expect.objectContaining({
          path: "api/package.json",
          content: expect.stringContaining("@nestjs/core"),
        }),
        expect.objectContaining({
          path: "database/prisma/schema.prisma",
          content: expect.stringContaining("model Expense"),
        }),
        expect.objectContaining({
          path: "docker-compose.yml",
          content: expect.stringContaining("postgres"),
        }),
        expect.objectContaining({
          path: "api/policy/policy.csv",
          content: expect.any(String),
        }),
      ]),
    );
    expect(generateApplicationBundle(publishedExpense)).toEqual(bundle);
  });

  it("emits the immutable capability asset lock alongside generated source", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration.compositionProfile = "expense-approval";
    graph.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
        lifecycle: "golden",
      },
    ];

    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-locked-capability-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["capability-lock.json"]).toContain('"key": "core.audit"');
    expect(files["capability-lock.json"]).toContain('"lifecycle": "golden"');
    expect(files["capability-lock.json"]).toContain('"graphHash": "sha256:');
  });

  it("composes each locked Golden package template into the API runtime", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration = {
      providers: [],
      capabilities: [
        {
          key: "audit.record",
          providerId: "factory",
          operation: "record",
        },
      ],
      compositionProfile: "expense-approval",
      assetLocks: [
        {
          key: "core.audit",
          version: "1.0.0",
          packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
          manifestDigest:
            "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
          lifecycle: "golden",
        },
      ],
    };

    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-package-template-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      'key: "core.audit"',
    );
    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      'effects: ["audit.record"],',
    );
    expect(files["api/src/capabilities/core.audit.ts"]).not.toContain("{{");
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      'from "./core.audit.js"',
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      'import { providedEffects } from "./capabilities/registry.js";',
    );
    expect(files["capability-template-lock.json"]).toContain(
      '"assetKey": "core.audit"',
    );
  });

  it("rejects a Graph capability without a locked Golden package", () => {
    const graph = structuredClone(publishedExpense.graph);
    graph.integration.capabilities = [
      {
        key: "audit.record",
        providerId: "factory",
        operation: "record",
      },
    ];

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-unlocked-capability-1",
        graph,
      }),
    ).toThrow("require matching Golden asset locks");
  });

  it("rejects a locked package when its Factory repository root is unavailable", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: [],
    }).graph;

    expect(() =>
      generateApplicationBundle(
        {
          publishedRevisionId: "published-missing-package-root-1",
          graph,
        },
        { repositoryRoot: resolve("C:/factory-missing-root") },
      ),
    ).toThrow("could not be resolved");
  });

  it("emits a deployable initial Prisma migration and isolated Compose lifecycle", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "Expense"');
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "AuditEvent"');
    expect(files["database/Dockerfile"]).toContain("prisma migrate deploy");
    expect(files["api/Dockerfile"]).not.toContain("prisma db push");
    expect(files["web/.dockerignore"]).toContain("node_modules");
    expect(files["api/.dockerignore"]).toContain("node_modules");
    expect(files["api/package.json"]).toContain("@types/node");
    expect(files["docker-compose.yml"]).toContain("migrate:");
    expect(files["docker-compose.yml"]).toContain(
      "FACTORY_COMPOSE_PROJECT_NAME",
    );
    expect(files["docker-compose.yml"]).toContain(
      "factory-expense-approval-published-expense-1",
    );
    expect(files["pnpm-workspace.yaml"]).toContain("web");
    expect(files["README.md"]).toContain(
      "factory-expense-approval-published-expense-1",
    );
    expect(files["README.md"]).toContain(
      "docker compose down --volumes --remove-orphans",
    );
  });

  it("emits reviewable API, relationship, and permission documents from the Published Graph", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-documentation-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              {
                key: "expense",
                label: "Expense",
                fields: [
                  { key: "amount", type: "decimal", required: true },
                  {
                    key: "status",
                    type: "enum",
                    required: true,
                    values: ["draft", "approved"],
                  },
                ],
                indexes: [{ fields: ["status"] }],
              },
              { key: "receipt", label: "Receipt", fields: [], indexes: [] },
            ],
            relations: [
              { from: "expense", to: "receipt", kind: "one-to-many" },
            ],
          },
          policy: {
            roles: ["employee", "manager"],
            permissions: [
              {
                role: "employee",
                resource: "expense",
                actions: ["create", "read"],
              },
              { role: "manager", resource: "expense", actions: ["approve"] },
            ],
          },
          flow: {
            flows: [
              {
                id: "expense-review",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "approved"],
                events: ["approve"],
                transitions: [
                  {
                    from: "draft",
                    event: "approve",
                    to: "approved",
                    roles: ["manager"],
                  },
                ],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["docs/api-reference.md"]).toContain(
      "| POST | `/api/:entity` |",
    );
    expect(files["docs/api-reference.md"]).toContain(
      "| POST | `/api/:entity/:recordId/events/:event` |",
    );
    expect(files["docs/entity-relationship.md"]).toContain(
      "`expense` 1 → * `receipt`",
    );
    expect(files["docs/entity-relationship.md"]).toContain(
      "`status`: enum (required)",
    );
    expect(files["docs/permission-matrix.md"]).toContain(
      "| employee | expense | create, read |",
    );
    expect(files["docs/permission-matrix.md"]).toContain(
      "| manager | expense | approve |",
    );
    expect(files["docs/application.md"]).toContain("Generated documentation");
  });

  it("emits a role-aware Next application that reaches the generated API through a same-origin proxy", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-expense-web-1",
        graph: {
          ...publishedExpense.graph,
          policy: {
            roles: ["employee"],
            permissions: [
              {
                role: "employee",
                resource: "expense",
                actions: ["create", "read"],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page.tsx"]).toContain("GeneratedApplicationClient");
    expect(files["web/app/generated-application-client.tsx"]).toContain(
      '"use client"',
    );
    expect(files["web/app/generated-application-client.tsx"]).toContain(
      "x-factory-role",
    );
    expect(files["web/app/generated-application-client.tsx"]).toContain(
      "actions: readonly string[]",
    );
    expect(files["web/app/application-manifest.ts"]).toContain(
      "Create expense",
    );
    expect(files["web/app/api/[...path]/route.ts"]).toContain(
      "FACTORY_API_URL",
    );
    expect(files["api/src/main.ts"]).toContain("enableCors");
    expect(files["api/src/main.ts"]).toContain(
      "return await applicationRuntime.create",
    );
    expect(files["docker-compose.yml"]).toContain(
      "FACTORY_API_URL: http://api:3001",
    );
  });

  it("preconfigures generated Next projects so a build does not rewrite their TypeScript contract", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpense).files.map((file) => [
        file.path,
        file.content,
      ]),
    );
    const tsconfig = JSON.parse(files["web/tsconfig.json"] as string) as {
      compilerOptions: Record<string, unknown>;
      include: string[];
    };

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
            flows: [
              {
                id: "expense-review",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "submitted", "approved"],
                events: ["submit", "approve"],
                transitions: [
                  { from: "draft", event: "submit", to: "submitted" },
                  {
                    from: "submitted",
                    event: "approve",
                    to: "approved",
                    roles: ["manager"],
                  },
                ],
              },
            ],
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
            relations: [
              { from: "order", to: "menu-item", kind: "many-to-many" },
            ],
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
            {
              role: "employee",
              resource: "expense",
              actions: ["create", "read"],
            },
            {
              role: "manager",
              resource: "expense",
              actions: ["read", "approve", "reject"],
            },
            {
              role: "finance",
              resource: "expense",
              actions: ["read", "audit"],
            },
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
                {
                  from: "submitted",
                  event: "approve",
                  to: "approved",
                  roles: ["manager"],
                },
                {
                  from: "submitted",
                  event: "reject",
                  to: "rejected",
                  roles: ["manager"],
                },
              ],
            },
          ],
        },
      },
    };
    const files = Object.fromEntries(
      generateApplicationBundle(input).files.map((file) => [
        file.path,
        file.content,
      ]),
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
    expect(files["api/src/application-runtime.ts"]).toContain(
      "async transition(",
    );
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
            compositionProfile: "simple-ecommerce",
            assetLocks: simpleEcommerceAssetLocks,
            capabilities: [
              {
                key: "payment.simulate",
                providerId: "factory",
                operation: "simulate",
              },
            ],
          },
          policy: {
            roles: ["customer", "finance"],
            permissions: [
              {
                role: "customer",
                resource: "expense",
                actions: ["create", "read"],
              },
              { role: "finance", resource: "expense", actions: ["audit"] },
            ],
          },
          flow: {
            flows: [
              {
                id: "expense-payment",
                entity: "expense",
                initialState: "draft",
                states: ["draft", "paid"],
                events: ["pay"],
                transitions: [
                  {
                    from: "draft",
                    event: "pay",
                    to: "paid",
                    effects: [
                      { capability: "payment.simulate", operation: "simulate" },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain("executeEffects");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "Unsupported capability effect",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "appendCapabilityEvent",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "capabilityEvent",
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CapabilityEvent",
    );
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "capabilityEvents",
    );
    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "payment.simulate",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "CapabilityEvent"');
  });

  it("compiles DomainModel seed scenarios into idempotent Prisma data", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-seed-data-1",
        graph: {
          ...publishedExpense.graph,
          domain: {
            entities: [
              {
                key: "expense",
                label: "Expense",
                fields: [{ key: "amount", type: "decimal", required: true }],
                indexes: [],
              },
            ],
            relations: [],
            seedData: [
              {
                entity: "expense",
                id: "seed-expense-1",
                values: { amount: 42 },
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["database/prisma/seed.ts"]).toContain("upsert");
    expect(files["database/prisma/seed.ts"]).toContain("seed-expense-1");
    expect(files["database/Dockerfile"]).toContain("tsx prisma/seed.ts");
  });

  it("compiles reusable catalog, cart, and inventory capability runtime assets", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-commerce-runtime-1",
        graph: {
          ...publishedExpense.graph,
          integration: {
            providers: [],
            compositionProfile: "simple-ecommerce",
            assetLocks: simpleEcommerceAssetLocks,
            capabilities: [
              { key: "cart.add", providerId: "factory", operation: "add" },
              {
                key: "inventory.decrement",
                providerId: "factory",
                operation: "decrement",
              },
            ],
          },
        },
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CommerceLineItem",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "CommerceLineItem"');
    expect(files["api/src/application-runtime.ts"]).toContain("addCartItem");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "decrementInventory",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "commerceLineItem",
    );
    expect(files["api/src/main.ts"]).toContain(
      "commerce/:entity/:recordId/items",
    );
    expect(files["web/app/generated-application-client.tsx"]).toContain(
      "addToCart",
    );
    expect(files["web/app/generated-application-client.tsx"]).toContain(
      "Checkout cart",
    );
  });
});
