import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { executeCompilation } from "../src/compilation-executor.js";
import { executeQueuedCompilation } from "../src/queued-compilation.js";

const graph = {
  apiVersion: "factory.application-graph/v1" as const,
  metadata: { id: "expense", workspaceId: "local", name: "Expense" },
  page: { pages: [], navigation: [] },
  domain: {
    entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }],
    relations: [],
  },
  policy: { roles: ["employee"], permissions: [] },
  flow: { flows: [] },
  integration: { providers: [], capabilities: [] },
  experience: {
    theme: { mode: "light" as const, tokens: {} },
    locales: ["en"],
  },
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

  it("reports only immutable compilation evidence after materializing a queued Published Graph", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    const reporter = { complete: vi.fn().mockResolvedValue(undefined) };
    try {
      const result = await executeQueuedCompilation(
        directory,
        {
          compilationId: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          compilerVersion: "0.1.0",
          graph,
        },
        reporter,
      );

      expect(reporter.complete).toHaveBeenCalledTimes(1);
      expect(reporter.complete).toHaveBeenCalledWith({
        compilationId: "compilation-1",
        graphHash: result.graphHash,
        rootDirectory: result.rootDirectory,
        artifacts: result.artifacts,
      });
      expect(reporter.complete.mock.calls[0]?.[0]).not.toHaveProperty("graph");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
