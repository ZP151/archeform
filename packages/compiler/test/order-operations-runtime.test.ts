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
  ): Promise<Record<string, unknown> & { id: string; version?: number }>;
  applyOrderOperation(
    role: string,
    entityKey: string,
    recordId: string,
    input: {
      command: "refund";
      expectedVersion: number;
      idempotencyKey: string;
      amount: string;
      reason: string;
    },
  ): Promise<{
    record: Record<string, unknown> & { id: string; version?: number };
    plan: { auditAction: string; paymentDelta: string };
  }>;
};

type GeneratedRuntimeModule = {
  readonly applicationRuntime: GeneratedRuntime;
  readonly ApplicationRuntime: new (store?: unknown) => GeneratedRuntime;
  readonly InMemoryRecordStore: new () => unknown;
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

function restaurantFiles() {
  const graph = composeDefaultCapabilityDraft({
    profile: "restaurant-ordering",
  }).graph;
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });

  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: "restaurant-generated-api-contract-1",
      graph,
      compositionLock,
    }).files.map((file) => [file.path, file.content]),
  );
}

async function withGeneratedRuntime<T>(
  run: (runtime: GeneratedRuntime) => Promise<T>,
): Promise<T> {
  return withGeneratedRuntimeModule(async (module) =>
    run(module.applicationRuntime),
  );
}

async function withGeneratedRuntimeModule<T>(
  run: (module: GeneratedRuntimeModule) => Promise<T>,
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
    )) as GeneratedRuntimeModule;
    return await run(module);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Order Operations runtime compilation", () => {
  it("emits type-safe mutable capability work lists and aligns specialised receipt contracts", () => {
    const ecommerce = ecommerceFiles();
    const restaurant = restaurantFiles();

    expect(ecommerce["api/src/capabilities/commerce.inventory.ts"]).toContain(
      "const applied: CapabilityCommerceLineItem[] = [];",
    );
    expect(
      ecommerce["api/src/capabilities/commerce.line-configuration.ts"],
    ).toContain(
      "const configured: { id: string; label: string; priceDelta: number }[] = [];",
    );
    expect(restaurant["api/src/prisma-record-store.ts"]).not.toContain(
      "OrderOperationReceipt",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "model OrderLine",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "model MenuOptionGroup",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "model MenuOption",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "model OrderLineOption",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "locationId String",
    );
    expect(restaurant["database/prisma/schema.prisma"]).toContain(
      "idempotencyKey String",
    );
    expect(
      restaurant["database/prisma/migrations/0001_initial/migration.sql"],
    ).toContain('CREATE TABLE "MenuOptionGroup"');
  });

  it("emits the locked shared order-operations handler for a commerce Profile", () => {
    const files = ecommerceFiles();

    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export interface OrderOperationsHandler",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "export function getOrderOperationsHandler",
    );
    expect(
      files["api/src/capabilities/commerce.order-operations.ts"],
    ).toContain("planCommerceOrderOperation");
  });

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

  it("delegates order creation and transitions only to the locked Order handler", () => {
    const files = ecommerceFiles();

    expect(files["api/src/capabilities/contract.ts"]).toContain(
      "export interface OrderHandler",
    );
    expect(files["api/src/capabilities/registry.ts"]).toContain(
      "export function getOrderHandler",
    );
    expect(files["api/src/capabilities/commerce.order.ts"]).toContain(
      "orderHandler: {",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getOrderHandler().create({",
    );
    expect(files["api/src/application-runtime.ts"]).toContain("version: 0");
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getOrderHandler().transition({",
    );
    expect(files["api/prisma/schema.prisma"]).toContain("version Int");
  });

  it("applies a refund through the locked order-operations handler", async () => {
    await withGeneratedRuntime(async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });
      await runtime.transition("shopper", "order", order.id, "submit", {
        expectedVersion: 0,
        idempotencyKey: "order-submit-refund-1",
      });
      await runtime.transition("shopper", "order", order.id, "pay", {
        expectedVersion: 1,
        idempotencyKey: "order-pay-refund-1",
      });

      await expect(
        runtime.applyOrderOperation("merchant", "order", order.id, {
          command: "refund",
          expectedVersion: 2,
          idempotencyKey: "order-refund-1",
          amount: "4.00",
          reason: "Customer request",
        }),
      ).resolves.toMatchObject({
        record: { status: "paid", version: 3 },
        plan: { auditAction: "order.refunded", paymentDelta: "refund-partial" },
      });
    });
  });

  it("compiles a persistent receipt contract instead of storing order operations in a runtime Map", () => {
    const files = ecommerceFiles();

    expect(files["api/prisma/schema.prisma"]).toContain(
      "model OrderOperationReceipt",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getOrderOperationReceipt",
    );
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "orderOperationReceipts = new Map",
    );
    expect(files["api/src/prisma-record-store.ts"]).toContain("upsert");
  });

  it("maps persistent receipt columns back into the runtime payment contract", () => {
    const files = ecommerceFiles();

    expect(files["api/src/prisma-record-store.ts"]).toContain(
      "payment: { due: entry.due, captured: entry.captured, refunded: entry.refunded }",
    );
  });

  it("retains a processed operation receipt when an application runtime is recreated", async () => {
    await withGeneratedRuntimeModule(
      async ({ ApplicationRuntime, InMemoryRecordStore }) => {
        const store = new InMemoryRecordStore();
        const firstRuntime = new ApplicationRuntime(store);
        const order = await firstRuntime.create("shopper", "order", {});
        await firstRuntime.addCartItem("shopper", "order", order.id, {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          quantity: 1,
        });
        await firstRuntime.transition("shopper", "order", order.id, "submit", {
          expectedVersion: 0,
          idempotencyKey: "persistent-submit-1",
        });
        await firstRuntime.transition("shopper", "order", order.id, "pay", {
          expectedVersion: 1,
          idempotencyKey: "persistent-pay-1",
        });
        await firstRuntime.applyOrderOperation("merchant", "order", order.id, {
          command: "refund",
          expectedVersion: 2,
          idempotencyKey: "persistent-refund-1",
          amount: "4.00",
          reason: "Customer request",
        });

        const restartedRuntime = new ApplicationRuntime(store);
        await expect(
          restartedRuntime.applyOrderOperation("merchant", "order", order.id, {
            command: "refund",
            expectedVersion: 3,
            idempotencyKey: "persistent-refund-1",
            amount: "4.00",
            reason: "Duplicate request",
          }),
        ).rejects.toThrow("Commerce order command was already processed.");
      },
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
      expect(submitted).toMatchObject({ status: "submitted", version: 1 });
      const paid = await runtime.transition(
        "shopper",
        "order",
        order.id,
        "pay",
        { expectedVersion: 1, idempotencyKey: "order-pay-1" },
      );
      expect(paid).toMatchObject({ status: "paid", version: 2 });
      await expect(
        runtime.transition("merchant", "order", order.id, "fulfil", {
          expectedVersion: 2,
          idempotencyKey: "order-fulfil-1",
        }),
      ).resolves.toMatchObject({ status: "fulfilled", version: 3 });
    });
  });
});
