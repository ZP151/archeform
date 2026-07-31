import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
  type FactoryProfile,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { describe, expect, it, vi } from "vitest";

import { executeQueuedCompilation } from "../src/queued-compilation.js";

function publishedOrderOperationsInput(profile: FactoryProfile) {
  const composition = composeDefaultCapabilityDraft({ profile });
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(composition.graph),
    selections: composition.graph.integration.compositionSelections ?? [],
  });
  return { graph: composition.graph, compositionLock };
}

describe("Order Operations published compilation", () => {
  it.each([
    ["retail-counter", "counter-sale"],
    ["grocery-pickup", "pickup-order"],
  ] as const)(
    "materializes the Published %s Graph without Restaurant runtime files",
    async (profile, orderEntity) => {
      const artifactRoot = await mkdtemp(join(tmpdir(), "factory-orders-"));
      const reporter = { complete: vi.fn().mockResolvedValue(undefined) };
      const published = publishedOrderOperationsInput(profile);
      try {
        const result = await executeQueuedCompilation(
          artifactRoot,
          {
            compilationId: `${profile}-compilation-1`,
            publishedRevisionId: `${profile}-published-1`,
            target: "application-bundle",
            compilerVersion: "0.1.0",
            ...published,
          },
          reporter,
        );

        expect(result.rootDirectory).toBe(`${profile}-${profile}-published-1`);
        expect(result.artifacts.map(({ path }) => path)).not.toEqual(
          expect.arrayContaining([
            "api/src/restaurant/restaurant-command.service.ts",
          ]),
        );
        await expect(
          readFile(
            join(
              artifactRoot,
              result.rootDirectory,
              "api/src/application-runtime.ts",
            ),
            "utf8",
          ),
        ).resolves.toContain(`entityKey === "${orderEntity}"`);
        expect(reporter.complete).toHaveBeenCalledWith(
          expect.objectContaining({
            compilationId: `${profile}-compilation-1`,
            rootDirectory: result.rootDirectory,
          }),
        );
      } finally {
        await rm(artifactRoot, { recursive: true, force: true });
      }
    },
  );
});
