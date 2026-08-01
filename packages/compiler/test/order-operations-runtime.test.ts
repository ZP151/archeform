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
  ".generated-runtime",
);

type GeneratedRuntime = {
  list(
    role: string,
    entityKey: string,
  ): Promise<readonly (Record<string, unknown> & { id: string })[]>;
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string; version?: number }>;
  read(
    role: string,
    entityKey: string,
    recordId: string,
  ): Promise<Record<string, unknown> & { id: string; version?: number }>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: {
      catalogEntity: string;
      catalogRecordId: string;
      quantity: number;
    },
  ): Promise<{ id: string }>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options?: { expectedVersion?: number; idempotencyKey?: string },
  ): Promise<{
    receiptId: string;
    replayed: boolean;
    orderId: string;
    transition: string;
  }>;
};

function ecommerceFiles() {
  const graph = composeDefaultCapabilityDraft({
    profile: "simple-ecommerce",
  }).graph;
  const selections = graph.integration.compositionSelections ?? [];
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections,
  });

  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: "order-operations-runtime-1",
      graph,
      compositionLock,
    }).files.map((file) => [file.path, file.content]),
  );
}

function ecommerceInput() {
  const graph = composeDefaultCapabilityDraft({
    profile: "simple-ecommerce",
  }).graph;
  return {
    publishedRevisionId: "order-operations-runtime-1",
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

describe("Order Operations runtime compilation", () => {
  it("delegates catalog reads only to the locked Catalog handler", () => {
    const files = ecommerceFiles();

    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export interface CatalogHandler",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "export function getCatalogHandler",
    );
    expect(files["api/src/capabilities/commerce.catalog.ts"]).toContain(
      "catalogHandler: {",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getCatalogHandler().list({",
    );
  });

  it("delegates order creation and transitions only to the locked V2 lifecycle", () => {
    const files = ecommerceFiles();

    expect(
      files["api/src/capabilities/commerce-order-create-handler.ts"],
    ).toContain("commerceOrderCreateHandler");
    const operationAdapter =
      files[
        "api/src/capabilities/commerce-order-transaction-operation-adapter.ts"
      ];
    expect(operationAdapter).toContain(
      "createCommerceOrderTransactionOperationAdapter",
    );
    expect(operationAdapter).toContain('entity: "order"');
    expect(operationAdapter).toContain('flowId: "ecommerce-order"');
    expect(
      files["api/src/capabilities/commerce-transaction-executor.ts"],
    ).toContain("class CommerceTransactionExecutor");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "commerceOrderCreateHandler.create(",
    );
    expect(files["api/src/application-runtime.ts"]).toContain("version: 0");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "commerceOrderTransactionOperationAdapter.createStore",
    );
    expect(files["api/prisma/schema.prisma"]).toContain(
      "model CommerceTransactionReceipt",
    );
  });

  it("executes catalog, cart, and versioned order operations through package handlers", async () => {
    await withGeneratedRuntime(async (runtime) => {
      await expect(runtime.list("shopper", "product")).resolves.toHaveLength(2);
      const order = await runtime.create("shopper", "order", {});
      expect(order.version).toBe(0);
      const unguardedOrder = await runtime.create("shopper", "order", {});
      await expect(
        runtime.transition("shopper", "order", unguardedOrder.id, "submit"),
      ).rejects.toThrow(
        "Order transitions require an expected version and idempotency key.",
      );
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });
      const submitted = await runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        { expectedVersion: 0, idempotencyKey: "order-submit-1" },
      );
      expect(submitted).toMatchObject({
        orderId: order.id,
        transition: "submit",
        replayed: false,
      });
      await expect(
        runtime.read("shopper", "order", order.id),
      ).resolves.toMatchObject({
        status: "submitted",
        version: 1,
      });
      const paid = await runtime.transition(
        "shopper",
        "order",
        order.id,
        "pay",
        { expectedVersion: 1, idempotencyKey: "order-pay-1" },
      );
      expect(paid).toMatchObject({ transition: "pay", replayed: false });
      await expect(
        runtime.read("shopper", "order", order.id),
      ).resolves.toMatchObject({
        status: "paid",
        version: 2,
      });
      await expect(
        runtime.transition("merchant", "order", order.id, "fulfil", {
          expectedVersion: 2,
          idempotencyKey: "order-fulfil-1",
        }),
      ).resolves.toMatchObject({ transition: "fulfil", replayed: false });
      await expect(
        runtime.read("merchant", "order", order.id),
      ).resolves.toMatchObject({
        status: "fulfilled",
        version: 3,
      });
    });
  });
});
