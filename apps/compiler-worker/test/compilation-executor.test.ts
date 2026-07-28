import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { executeCompilation } from "../src/compilation-executor.js";

const graph = {
  apiVersion: "factory.application-graph/v1" as const,
  metadata: { id: "expense", workspaceId: "local", name: "Expense" },
  page: { pages: [], navigation: [] },
  domain: { entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }], relations: [] },
  policy: { roles: ["employee"], permissions: [] },
  flow: { flows: [] },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light" as const, tokens: {} }, locales: ["en"] },
};

describe("compilation executor", () => {
  it("compiles only a published Graph into a materialized isolated application", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    try {
      const result = await executeCompilation(directory, {
        publishedRevisionId: "published-1",
        graph,
      });

      expect(result.rootDirectory).toBe("expense-published-1");
      expect(result.artifacts.length).toBeGreaterThan(8);
      expect(result.graphHash).toMatch(/^sha256:/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
