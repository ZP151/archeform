import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  hashApplicationGraph,
  hashApplicationGraphV3,
  createDraftRevision,
} from "@factory/graph";
import {
  composeDefaultCapabilityDraft,
  composeRestaurantProductGraph,
  createCapabilityCompositionLock,
  restaurantOrderingExperienceBrief,
  restaurantOrderingProductIntent,
} from "@factory/capabilities";

import {
  executeCompilation,
  executeV3Compilation,
} from "../src/compilation-executor.js";
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

const compositionLock = {
  apiVersion: "factory.composition/v1" as const,
  applicationGraphChecksum: hashApplicationGraph(graph),
  packages: [],
  resolvedContributionDigests: [],
  providedAndRequiredInterfaces: [],
  targetRuntimeInterfaceVersions: [],
  resolvedDependencyOrder: [],
  lockDigest:
    "sha256:ccf08f784c7426786dfa8999acb57db22ae1764679a15d1d5a4297de7cf05a58",
};

describe("compilation executor", () => {
  it("compiles only a published Graph into a materialized isolated application", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    try {
      const result = await executeCompilation(directory, {
        publishedRevisionId: "published-1",
        graph,
        compositionLock,
      });

      expect(result.rootDirectory).toBe("expense-published-1");
      expect(result.artifacts.length).toBeGreaterThan(8);
      expect(result.graphHash).toMatch(/^sha256:/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("compiles an immutable Restaurant V3 Published Graph through the V3 target", async () => {
    const intent = restaurantOrderingProductIntent();
    const experience = restaurantOrderingExperienceBrief();
    const base = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const baseDraft = createDraftRevision(
      base.graph,
      "restaurant-ordering-draft",
    );
    const graph = composeRestaurantProductGraph({
      intent,
      experience,
      baseDraft,
    });
    const graphHash = hashApplicationGraphV3(graph);
    const publishedGraph = {
      kind: "published-application-graph" as const,
      status: "published" as const,
      graphVersion: "factory.application-graph/v3" as const,
      revisionId: "restaurant-product-v3-published-1",
      revisionNumber: 1,
      graphHash,
      graph,
    };
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: graphHash,
      selections: base.graph.integration.compositionSelections ?? [],
    });

    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    try {
      const result = await executeV3Compilation(directory, {
        publishedGraph,
        compositionLock,
      });

      expect(result.rootDirectory).toBe(
        "restaurant-product-restaurant-product-v3-published-1",
      );
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.graphHash).toMatch(/^sha256:/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reports only immutable compilation evidence after materializing a queued Published Graph", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    const reporter = {
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    try {
      const result = await executeQueuedCompilation(
        directory,
        {
          compilationId: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          compilerVersion: "0.1.0",
          graphVersion: "factory.application-graph/v1",
          graph,
          compositionLock,
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
      expect(reporter.fail).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reports one bounded failure and hides execution exceptions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    const reporter = {
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      let observed: unknown;
      try {
        await executeQueuedCompilation(
          directory,
          {
            compilationId: "compilation-1",
            publishedRevisionId: "published-1",
            target: "application-bundle",
            compilerVersion: "0.1.0",
            graphVersion: "factory.application-graph/v1",
            graph: {
              ...graph,
              metadata: { ...graph.metadata, name: "must-not-leak" },
            },
            compositionLock: {
              ...compositionLock,
              lockDigest: "must-not-leak",
            },
          },
          reporter,
        );
      } catch (error) {
        observed = error;
      }

      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).toBe(
        "Queued compilation failed after bounded failure reporting.",
      );
      expect((observed as Error).cause).toBeUndefined();
      expect(reporter.complete).not.toHaveBeenCalled();
      expect(reporter.fail).toHaveBeenCalledTimes(1);
      expect(reporter.fail).toHaveBeenCalledWith({
        compilationId: "compilation-1",
      });
      expect(JSON.stringify(reporter.fail.mock.calls)).not.toContain(
        "must-not-leak",
      );
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    { transientFailures: 1, expectedAttempts: 2 },
    { transientFailures: 2, expectedAttempts: 3 },
  ])(
    "returns the successful compilation after $transientFailures transient completion rejection(s)",
    async ({ transientFailures, expectedAttempts }) => {
      const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
      let attempts = 0;
      const reporter = {
        complete: vi.fn().mockImplementation(async () => {
          attempts += 1;
          if (attempts <= transientFailures) {
            throw new Error("transient completion rejection must-not-leak");
          }
        }),
        fail: vi.fn().mockResolvedValue(undefined),
      };
      try {
        await expect(
          executeQueuedCompilation(
            directory,
            {
              compilationId: "compilation-1",
              publishedRevisionId: "published-1",
              target: "application-bundle",
              compilerVersion: "0.1.0",
              graph,
              compositionLock,
            },
            reporter,
          ),
        ).resolves.toMatchObject({ rootDirectory: "expense-published-1" });
        expect(reporter.complete).toHaveBeenCalledTimes(expectedAttempts);
        expect(reporter.fail).not.toHaveBeenCalled();
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );

  it("retries identical success evidence when the accepted response is lost", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    const reporter = {
      complete: vi
        .fn()
        .mockRejectedValueOnce(new Error("accepted response must-not-leak"))
        .mockResolvedValueOnce(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    try {
      const result = await executeQueuedCompilation(
        directory,
        {
          compilationId: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          compilerVersion: "0.1.0",
          graphVersion: "factory.application-graph/v1",
          graph,
          compositionLock,
        },
        reporter,
      );

      expect(result.rootDirectory).toBe("expense-published-1");
      expect(reporter.complete).toHaveBeenCalledTimes(2);
      expect(reporter.complete.mock.calls[1]?.[0]).toEqual(
        reporter.complete.mock.calls[0]?.[0],
      );
      expect(reporter.fail).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("leaves successful execution retryable when completion reporting is exhausted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "factory-compile-"));
    const reporter = {
      complete: vi.fn().mockRejectedValue(new Error("provider must-not-leak")),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      let observed: unknown;
      try {
        await executeQueuedCompilation(
          directory,
          {
            compilationId: "compilation-1",
            publishedRevisionId: "published-1",
            target: "application-bundle",
            compilerVersion: "0.1.0",
            graph,
            compositionLock,
          },
          reporter,
        );
      } catch (error) {
        observed = error;
      }

      expect(observed).toBeInstanceOf(Error);
      expect((observed as Error).message).toBe(
        "Queued compilation completion reporting failed after bounded attempts.",
      );
      expect((observed as Error).cause).toBeUndefined();
      expect(JSON.stringify(observed)).not.toContain("must-not-leak");
      expect(reporter.complete).toHaveBeenCalledTimes(3);
      const [firstAttempt, secondAttempt, thirdAttempt] =
        reporter.complete.mock.calls.map(([evidence]) => evidence);
      expect(secondAttempt).toEqual(firstAttempt);
      expect(thirdAttempt).toEqual(firstAttempt);
      expect(reporter.fail).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      logSpy.mockRestore();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
