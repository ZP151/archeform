import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import { generateApplicationBundle } from "../src/index.js";

const compilerTestDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-line-configuration-runtime",
);

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string; version?: number }>;
  configureLine(
    role: string,
    input: {
      readonly catalogEntity: string;
      readonly catalogRecordId: string;
      readonly optionIds: readonly string[];
      readonly quantity: number;
    },
  ): Promise<{
    readonly catalogEntity: string;
    readonly catalogRecordId: string;
    readonly quantity: number;
    readonly priceDelta: number;
    readonly options: readonly {
      readonly id: string;
      readonly label: string;
      readonly priceDelta: number;
    }[];
  }>;
};

function ecommerceInput() {
  const graph = composeDefaultCapabilityDraft({
    profile: "simple-ecommerce",
  }).graph;
  return {
    publishedRevisionId: "line-configuration-runtime-1",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections ?? [],
    }),
  };
}

async function withGeneratedRuntime<T>(
  run: (runtime: GeneratedRuntime) => Promise<T>,
): Promise<T> {
  await mkdir(compilerTestDirectory, { recursive: true });
  const directory = await mkdtemp(join(compilerTestDirectory, "runtime-"));
  try {
    const bundle = generateApplicationBundle(ecommerceInput());
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/src/"))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    const module = (await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    )) as { applicationRuntime: GeneratedRuntime };
    return await run(module.applicationRuntime);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Line configuration runtime compilation", () => {
  it("rejects a configured line outside the catalog entity bound by the published package", async () => {
    await withGeneratedRuntime(async (runtime) => {
      await expect(
        runtime.configureLine("shopper", {
          catalogEntity: "menu-item",
          catalogRecordId: "everyday-tote",
          optionIds: [],
          quantity: 1,
        }),
      ).rejects.toThrow("does not match the configured catalog entity");
    });
  });

  it("derives option labels and prices from available published records", async () => {
    await withGeneratedRuntime(async (runtime) => {
      await runtime.create("shopper", "order", {});

      await expect(
        runtime.configureLine("shopper", {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          optionIds: ["tote-colour-slate"],
          quantity: 2,
        }),
      ).resolves.toEqual({
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 2,
        priceDelta: 0,
        options: [{ id: "tote-colour-slate", label: "Slate", priceDelta: 0 }],
      });

      await expect(
        runtime.configureLine("shopper", {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          optionIds: ["missing-option"],
          quantity: 1,
        }),
      ).rejects.toThrow("Option 'missing-option' is unavailable.");
    });
  });
});
