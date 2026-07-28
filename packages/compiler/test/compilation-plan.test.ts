import { describe, expect, it } from "vitest";

import {
  buildCompilationPlan,
  compilationTargets,
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
});
