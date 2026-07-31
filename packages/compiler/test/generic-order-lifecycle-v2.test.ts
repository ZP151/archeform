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

const generatedDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-generic-order-lifecycle-v2",
);

afterAll(async () => {
  await rm(generatedDirectory, { recursive: true, force: true });
});

type CommerceProfile = "simple-ecommerce" | "retail-counter" | "grocery-pickup";

type StoredOrder = Readonly<{
  id: string;
  status: string;
  version: number;
}>;

type TransitionReceipt = Readonly<{
  receiptId: string;
  replayed: boolean;
  orderId: string;
  transition: string;
}>;

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<StoredOrder>;
  read(role: string, entityKey: string, recordId: string): Promise<StoredOrder>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: Readonly<{
      catalogEntity: string;
      catalogRecordId: string;
      quantity: number;
    }>,
  ): Promise<Readonly<{ id: string }>>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options: Readonly<{ expectedVersion: number; idempotencyKey: string }>,
  ): Promise<TransitionReceipt>;
  auditLog(role: string): Promise<readonly unknown[]>;
  capabilityEvents(role: string): Promise<readonly unknown[]>;
};

type GeneratedStore = {
  read?: never;
  find(entityKey: string, recordId: string): Promise<StoredOrder | undefined>;
  update(
    entityKey: string,
    recordId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  appendCapabilityEvent(event: {
    capability: string;
    [key: string]: unknown;
  }): Promise<void>;
};

type GeneratedModule = {
  readonly applicationRuntime: GeneratedRuntime;
  readonly ApplicationRuntime: new (store?: GeneratedStore) => GeneratedRuntime;
  readonly InMemoryRecordStore: new () => GeneratedStore;
};

const profileCases = [
  {
    profile: "simple-ecommerce",
    role: "shopper",
    orderEntity: "order",
    initialState: "cart",
    catalogEntity: "product",
    catalogRecordId: "everyday-tote",
  },
  {
    profile: "retail-counter",
    role: "shopper",
    orderEntity: "counter-sale",
    initialState: "cart",
    catalogEntity: "retail-item",
    catalogRecordId: "counter-item-cup",
  },
  {
    profile: "grocery-pickup",
    role: "shopper",
    orderEntity: "pickup-order",
    initialState: "cart",
    catalogEntity: "grocery-item",
    catalogRecordId: "grocery-item-apples",
  },
] as const satisfies readonly Readonly<{
  profile: CommerceProfile;
  role: string;
  orderEntity: string;
  initialState: string;
  catalogEntity: string;
  catalogRecordId: string;
}>[];

function compile(profile: CommerceProfile) {
  const graph = composeDefaultCapabilityDraft({ profile }).graph;
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });
  return generateApplicationBundle({
    publishedRevisionId: `generic-order-lifecycle-v2-${profile}`,
    graph,
    compositionLock,
  });
}

async function withGeneratedRuntime<T>(
  profile: CommerceProfile,
  run: (runtime: GeneratedRuntime) => Promise<T>,
): Promise<T> {
  return withGeneratedModule(profile, ({ applicationRuntime }) =>
    run(applicationRuntime),
  );
}

async function withGeneratedModule<T>(
  profile: CommerceProfile,
  run: (module: GeneratedModule) => Promise<T>,
): Promise<T> {
  await mkdir(generatedDirectory, { recursive: true });
  const directory = await mkdtemp(join(generatedDirectory, `${profile}-`));
  try {
    const bundle = compile(profile);
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
    )) as GeneratedModule;
    return await run(module);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Generic order lifecycle V2 compilation", () => {
  it.each(profileCases)(
    "$profile creates and transitions through the exact locked V2 lifecycle",
    async ({
      profile,
      role,
      orderEntity,
      initialState,
      catalogEntity,
      catalogRecordId,
    }) => {
      await withGeneratedRuntime(profile, async (runtime) => {
        const order = await runtime.create(role, orderEntity, {});

        expect(order).toMatchObject({
          id: expect.stringMatching(new RegExp(`^${orderEntity}-`)),
          status: initialState,
          version: 0,
        });
        await expect(
          runtime.read(role, orderEntity, order.id),
        ).resolves.toEqual(order);
        await runtime.addCartItem(role, orderEntity, order.id, {
          catalogEntity,
          catalogRecordId,
          quantity: 1,
        });

        const receipt = await runtime.transition(
          role,
          orderEntity,
          order.id,
          "submit",
          {
            expectedVersion: 0,
            idempotencyKey: `${profile}-submit-1`,
          },
        );

        expect(receipt).toMatchObject({
          receiptId: expect.any(String),
          replayed: false,
          orderId: order.id,
          transition: "submit",
        });
        await expect(
          runtime.read(role, orderEntity, order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
      });
    },
    30_000,
  );

  it("replays the same completed submission and rejects a changed payload", async () => {
    await withGeneratedRuntime("simple-ecommerce", async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });
      const options = {
        expectedVersion: 0,
        idempotencyKey: "replay-submit-1",
      } as const;

      const first = await runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        options,
      );
      await expect(
        runtime.transition("shopper", "order", order.id, "submit", options),
      ).resolves.toEqual({ ...first, replayed: true });
      await expect(
        runtime.transition("shopper", "order", order.id, "submit", {
          ...options,
          expectedVersion: 1,
        }),
      ).rejects.toThrow("idempotency payload mismatch");
    });
  });

  it("rejects a stale version without changing the aggregate or inventory", async () => {
    await withGeneratedRuntime("simple-ecommerce", async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });

      await expect(
        runtime.transition("shopper", "order", order.id, "submit", {
          expectedVersion: 1,
          idempotencyKey: "stale-submit-1",
        }),
      ).rejects.toThrow("stale aggregate version");
      await expect(
        runtime.read("shopper", "order", order.id),
      ).resolves.toMatchObject({ status: "cart", version: 0 });
      await expect(
        runtime.read("shopper", "product", "everyday-tote"),
      ).resolves.toMatchObject({ stock: 20 });
    });
  });

  it("returns the claimed receipt for a duplicate that is still pending", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ ApplicationRuntime, InMemoryRecordStore }) => {
        let releaseAggregate!: () => void;
        let aggregateEntered!: () => void;
        const aggregateBlocked = new Promise<void>((resolveBlocked) => {
          aggregateEntered = resolveBlocked;
        });
        const aggregateRelease = new Promise<void>((resolveRelease) => {
          releaseAggregate = resolveRelease;
        });
        const BaseStore = InMemoryRecordStore;
        class BlockingStore extends BaseStore {
          private blockOnce = true;

          override async update(
            entityKey: string,
            recordId: string,
            input: Record<string, unknown>,
          ): Promise<Record<string, unknown>> {
            const updated = await super.update(entityKey, recordId, input);
            if (this.blockOnce && input.status === "submitted") {
              this.blockOnce = false;
              aggregateEntered();
              await aggregateRelease;
            }
            return updated;
          }
        }

        const runtime = new ApplicationRuntime(new BlockingStore());
        const order = await runtime.create("shopper", "order", {});
        await runtime.addCartItem("shopper", "order", order.id, {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          quantity: 1,
        });
        const options = {
          expectedVersion: 0,
          idempotencyKey: "pending-submit-1",
        } as const;
        const first = runtime.transition(
          "shopper",
          "order",
          order.id,
          "submit",
          options,
        );
        await aggregateBlocked;
        const pending = await runtime.transition(
          "shopper",
          "order",
          order.id,
          "submit",
          options,
        );
        releaseAggregate();
        const completed = await first;

        expect(pending).toEqual({ ...completed, replayed: false });
        await expect(
          runtime.read("shopper", "order", order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
      },
    );
  });

  it("rolls back aggregate, inventory, audit, outbox, and receipt on failure", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ ApplicationRuntime, InMemoryRecordStore }) => {
        const BaseStore = InMemoryRecordStore;
        class FailingOutboxStore extends BaseStore {
          private failOnce = true;

          override async appendCapabilityEvent(event: {
            capability: string;
            [key: string]: unknown;
          }): Promise<void> {
            if (this.failOnce && event.capability === "inventory.reserve") {
              this.failOnce = false;
              throw new Error("outbox unavailable");
            }
            return super.appendCapabilityEvent(event);
          }
        }

        const runtime = new ApplicationRuntime(new FailingOutboxStore());
        const order = await runtime.create("shopper", "order", {});
        await runtime.addCartItem("shopper", "order", order.id, {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          quantity: 1,
        });
        const auditBefore = await runtime.auditLog("merchant");
        const outboxBefore = await runtime.capabilityEvents("merchant");
        const options = {
          expectedVersion: 0,
          idempotencyKey: "rollback-submit-1",
        } as const;

        await expect(
          runtime.transition("shopper", "order", order.id, "submit", options),
        ).rejects.toThrow("outbox unavailable");
        await expect(
          runtime.read("shopper", "order", order.id),
        ).resolves.toMatchObject({ status: "cart", version: 0 });
        await expect(
          runtime.read("shopper", "product", "everyday-tote"),
        ).resolves.toMatchObject({ stock: 20 });
        await expect(runtime.auditLog("merchant")).resolves.toEqual(
          auditBefore,
        );
        await expect(runtime.capabilityEvents("merchant")).resolves.toEqual(
          outboxBefore,
        );
        await expect(
          runtime.transition("shopper", "order", order.id, "submit", options),
        ).resolves.toMatchObject({ replayed: false });
      },
    );
  });

  it.each(profileCases)(
    "$profile activates the locked V2.1 schema, migration, and TypeScript imports",
    ({ profile }) => {
      const files = Object.fromEntries(
        compile(profile).files.map((file) => [file.path, file.content]),
      );

      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-order-create-handler.js"',
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-order-transaction-operation-adapter.js"',
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-transaction-executor.js"',
      );
      expect(files["api/prisma/schema.prisma"]).toContain(
        "model CommerceTransactionReceipt",
      );
      expect(files["database/prisma/schema.prisma"]).toContain(
        "model CommerceAggregateVersion",
      );
      expect(
        files["database/prisma/migrations/0001_initial/migration.sql"],
      ).toContain('CREATE TABLE "CommerceTransactionReceipt"');
      expect(files).not.toHaveProperty(
        "database/prisma/fragments/commerce-transaction.prisma",
      );
      expect(files).not.toHaveProperty(
        "database/prisma/migrations/commerce-transaction.sql",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getCatalogHandler",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getCartHandler",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getLineConfigurationHandler",
      );
    },
  );
});
