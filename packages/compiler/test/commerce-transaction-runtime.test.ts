import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import { generateApplicationBundle } from "../src/index.js";

const compilerTestDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-commerce-transaction-runtime",
);

afterAll(async () => {
  await rm(compilerTestDirectory, { recursive: true, force: true });
});

type StoredRecord = Record<string, unknown> & {
  readonly id: string;
  readonly status?: string;
  readonly version?: number;
};

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<StoredRecord>;
  read(
    role: string,
    entityKey: string,
    recordId: string,
  ): Promise<StoredRecord>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: {
      readonly catalogEntity: string;
      readonly catalogRecordId: string;
      readonly quantity: number;
    },
  ): Promise<{ readonly id: string }>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options: {
      readonly expectedVersion: number;
      readonly idempotencyKey: string;
    },
  ): Promise<{
    readonly receiptId: string;
    readonly replayed: boolean;
    readonly orderId: string;
    readonly transition: string;
  }>;
  capabilityEvents(
    role: string,
  ): Promise<
    readonly { readonly capability: string; readonly operation: string }[]
  >;
};

type CommerceProfile = "simple-ecommerce" | "retail-counter" | "grocery-pickup";

function commerceInput(profile: CommerceProfile = "simple-ecommerce") {
  const graph = composeDefaultCapabilityDraft({
    profile,
  }).graph;
  return {
    publishedRevisionId: "commerce-transaction-runtime-1",
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
    const bundle = generateApplicationBundle(commerceInput());
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
    )) as { readonly applicationRuntime: GeneratedRuntime };
    return await run(module.applicationRuntime);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("generic Commerce transaction runtime", () => {
  it("does not emit disconnected transaction schema or migration fragments", () => {
    const bundle = generateApplicationBundle(commerceInput());
    const files = Object.fromEntries(
      bundle.files.map((file) => [file.path, file.content]),
    );

    expect(files).not.toHaveProperty("api/src/commerce-transaction-runtime.ts");
    expect(files).not.toHaveProperty("api/prisma/commerce-transaction.prisma");
    expect(files).not.toHaveProperty(
      "database/prisma/commerce-transaction.prisma",
    );
    expect(files).not.toHaveProperty(
      "tests/commerce-transaction.journey.test.ts",
    );
    expect(files).not.toHaveProperty(
      "api/src/capabilities/commerce-transaction-runtime.ts",
    );
    expect(files).not.toHaveProperty(
      "database/prisma/fragments/commerce-transaction.prisma",
    );
    expect(files["api/src/main.ts"]).not.toContain(
      "CommerceTransactionExecutor",
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CommerceTransactionReceipt",
    );
    expect(
      files["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "CommerceTransactionReceipt"');
  });

  it("fails closed when a Commerce graph has no locked transaction package", () => {
    const graph = structuredClone(
      composeDefaultCapabilityDraft({
        profile: "simple-ecommerce",
      }).graph,
    );
    graph.integration.compositionSelections =
      graph.integration.compositionSelections?.filter(
        ({ lock }) => lock.key !== "commerce.transaction",
      );

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "commerce-without-transaction-lock",
        graph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(graph),
          selections: graph.integration.compositionSelections ?? [],
        }),
      }),
    ).toThrow(
      "Commerce compilation requires exactly one locked Golden commerce.transaction package.",
    );
  });

  it("reserves stock on submission and compensates it on a merchant cancellation", async () => {
    await withGeneratedRuntime(async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });

      await expect(
        runtime.transition("shopper", "order", order.id, "submit", {
          expectedVersion: 0,
          idempotencyKey: "submit-everyday-tote-1",
        }),
      ).resolves.toMatchObject({ transition: "submit", replayed: false });
      await expect(
        runtime.read("shopper", "order", order.id),
      ).resolves.toMatchObject({ status: "submitted", version: 1 });
      await expect(
        runtime.read("merchant", "product", "everyday-tote"),
      ).resolves.toMatchObject({ stock: 19 });

      await expect(
        runtime.transition("merchant", "order", order.id, "cancel", {
          expectedVersion: 1,
          idempotencyKey: "cancel-everyday-tote-1",
        }),
      ).resolves.toMatchObject({ transition: "cancel", replayed: false });
      await expect(
        runtime.read("merchant", "order", order.id),
      ).resolves.toMatchObject({ status: "cancelled", version: 2 });
      await expect(
        runtime.read("merchant", "product", "everyday-tote"),
      ).resolves.toMatchObject({ stock: 20 });
      await expect(runtime.capabilityEvents("merchant")).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            capability: "inventory.reserve",
            operation: "reserve",
          }),
          expect.objectContaining({
            capability: "inventory.release",
            operation: "release",
          }),
        ]),
      );
    });
  }, 30_000);

  it.each([
    [
      "retail-counter",
      "counter-sale",
      "retail-item",
      "counter-item-cup",
      "cashier",
    ],
    [
      "grocery-pickup",
      "pickup-order",
      "grocery-item",
      "grocery-item-apples",
      "fulfilment",
    ],
  ] as const)(
    "shares the reservation lifecycle with %s",
    async (
      profile,
      orderEntity,
      catalogEntity,
      catalogRecordId,
      merchantRole,
    ) => {
      await mkdir(compilerTestDirectory, { recursive: true });
      const directory = await mkdtemp(join(compilerTestDirectory, "runtime-"));
      try {
        const bundle = generateApplicationBundle(commerceInput(profile));
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
          pathToFileURL(resolve(directory, "api/src/application-runtime.ts"))
            .href
        )) as { readonly applicationRuntime: GeneratedRuntime };
        const runtime = module.applicationRuntime;
        const order = await runtime.create("shopper", orderEntity, {});
        await runtime.addCartItem("shopper", orderEntity, order.id, {
          catalogEntity,
          catalogRecordId,
          quantity: 1,
        });

        await expect(
          runtime.transition("shopper", orderEntity, order.id, "submit", {
            expectedVersion: 0,
            idempotencyKey: `${profile}-submit-1`,
          }),
        ).resolves.toMatchObject({ transition: "submit", replayed: false });
        await expect(
          runtime.read("shopper", orderEntity, order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
        await expect(
          runtime.read(merchantRole, catalogEntity, catalogRecordId),
        ).resolves.toMatchObject({ stock: 19 });
        await expect(
          runtime.transition(merchantRole, orderEntity, order.id, "cancel", {
            expectedVersion: 1,
            idempotencyKey: `${profile}-cancel-1`,
          }),
        ).resolves.toMatchObject({ transition: "cancel", replayed: false });
        await expect(
          runtime.read(merchantRole, orderEntity, order.id),
        ).resolves.toMatchObject({ status: "cancelled", version: 2 });
        await expect(
          runtime.read(merchantRole, catalogEntity, catalogRecordId),
        ).resolves.toMatchObject({ stock: 20 });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
