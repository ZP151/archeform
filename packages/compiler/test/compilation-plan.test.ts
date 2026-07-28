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
        expect.objectContaining({ path: "web/app/page.tsx", content: expect.stringContaining("Expense approval") }),
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
});
