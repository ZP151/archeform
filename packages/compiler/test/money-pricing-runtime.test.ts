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
  "..",
  ".generated-money-pricing-runtime",
);

type PriceQuote = {
  readonly currency: string;
  readonly subtotalMinor: string;
  readonly discountMinor: string;
  readonly taxMinor: string;
  readonly totalMinor: string;
  readonly lines: readonly {
    readonly catalogRecordId: string;
    readonly quantity: number;
    readonly unitMinor: string;
    readonly totalMinor: string;
  }[];
};

type GeneratedRuntime = {
  quotePrice(
    role: string,
    input: {
      readonly catalogEntity: string;
      readonly lines: readonly {
        readonly catalogRecordId: string;
        readonly quantity: number;
      }[];
    },
  ): Promise<PriceQuote>;
};

function ecommerceInput() {
  const graph = composeDefaultCapabilityDraft({
    profile: "simple-ecommerce",
  }).graph;
  return {
    publishedRevisionId: "money-pricing-runtime-1",
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

describe("Money pricing runtime compilation", () => {
  it("emits an Ecommerce API quote endpoint without accepting a client price", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(ecommerceInput()).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(files["api/src/main.ts"]).toContain("commerce/quote-price");
    expect(files["api/src/main.ts"]).toContain(
      "catalogRecordId: string; quantity: number",
    );
    expect(files["api/src/main.ts"]).not.toContain("unitMinor");
  });

  it("merges the locked price snapshot persistence into the generated Prisma targets", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(ecommerceInput()).files.map((file) => [
        file.path,
        file.content,
      ]),
    );

    expect(files["api/prisma/schema.prisma"]).toContain("model PriceSnapshot");
    expect(files["database/prisma/schema.prisma"]).toContain(
      "model PriceAllocation",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "PriceSnapshot"');
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "PriceAllocation"');
  });

  it("derives an Ecommerce quote from locked Catalog records instead of client prices", async () => {
    await withGeneratedRuntime(async (runtime) => {
      await expect(
        runtime.quotePrice("shopper", {
          catalogEntity: "product",
          lines: [{ catalogRecordId: "everyday-tote", quantity: 2 }],
        }),
      ).resolves.toEqual({
        currency: "USD",
        subtotalMinor: "9600",
        discountMinor: "0",
        taxMinor: "0",
        totalMinor: "9600",
        lines: [
          {
            catalogRecordId: "everyday-tote",
            quantity: 2,
            unitMinor: "4800",
            totalMinor: "9600",
          },
        ],
      });
    });
  });

  it("rejects a quote that targets a Catalog entity outside the published binding", async () => {
    await withGeneratedRuntime(async (runtime) => {
      await expect(
        runtime.quotePrice("shopper", {
          catalogEntity: "menu-item",
          lines: [{ catalogRecordId: "everyday-tote", quantity: 1 }],
        }),
      ).rejects.toThrow("does not match the configured catalog entity");
    });
  });
});
