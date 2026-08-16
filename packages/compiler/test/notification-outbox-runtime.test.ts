import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  capabilityAssets,
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { describe, expect, it } from "vitest";

import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

type NotificationOutboxEntry = {
  id: string;
  dedupeKey: string;
  actor: string;
  recipientRole: string;
  template: string | null;
  entity: string;
  recordId: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  availableAt: string;
  deliveredAt: string | null;
  lastError: string | null;
};

type NotificationOutboxInput = Omit<
  NotificationOutboxEntry,
  "id" | "status" | "attempts" | "deliveredAt" | "lastError"
>;

type PrismaNotificationOutboxRow = Omit<
  NotificationOutboxEntry,
  "availableAt" | "deliveredAt"
> & {
  availableAt: Date;
  deliveredAt: Date | null;
};

type GeneratedStore = {
  create(
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
  find(
    entityKey: string,
    recordId: string,
  ): Promise<(Record<string, unknown> & { id: string }) | undefined>;
  update(
    entityKey: string,
    recordId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
  enqueueNotification(
    input: NotificationOutboxInput,
  ): Promise<NotificationOutboxEntry>;
  claimDueNotifications(
    now: string,
    limit: number,
  ): Promise<readonly NotificationOutboxEntry[]>;
  markNotificationDelivered(id: string, deliveredAt: string): Promise<void>;
  recordNotificationFailure(
    id: string,
    error: string,
    status: "pending" | "failed",
    availableAt: string,
  ): Promise<NotificationOutboxEntry>;
  inTransaction<T>(
    operation: (store: GeneratedStore) => Promise<T>,
  ): Promise<T>;
};

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: string }>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options?: { expectedVersion?: number; idempotencyKey?: string },
  ): Promise<Record<string, unknown> & { id: string }>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: {
      catalogEntity: string;
      catalogRecordId: string;
      quantity: number;
    },
  ): Promise<Record<string, unknown>>;
};

type GeneratedFixtureTransport = {
  readonly deliveryAttempts: number;
  readonly delivered: readonly NotificationOutboxEntry[];
};

type GeneratedModule = {
  ApplicationRuntime: new (store: GeneratedStore) => GeneratedRuntime;
  InMemoryRecordStore: new () => GeneratedStore;
  PrismaRecordStore: new (prisma: unknown) => GeneratedStore;
  FixtureNotificationTransport?: new (
    failuresBeforeSuccess?: number,
  ) => GeneratedFixtureTransport;
  NotificationOutboxWorker?: new (
    store: GeneratedStore,
    transport: GeneratedFixtureTransport,
  ) => {
    drain(
      now: string,
      limit?: number,
    ): Promise<readonly NotificationOutboxEntry[]>;
  };
};

const testDirectory = dirname(fileURLToPath(import.meta.url));

function publishedExpenseWithNotification(
  template?: string,
  notificationVersion?: "1.1.0",
): PublishedGraphInput {
  const graph = composeProfileDraft({ profile: "expense-approval" }).graph;
  graph.flow.flows = graph.flow.flows.map((flow) => ({
    ...flow,
    transitions: flow.transitions.map((transition) =>
      transition.event === "submit"
        ? {
            ...transition,
            effects: [
              ...(transition.effects ?? []),
              { capability: "notification.send", operation: "send" },
            ],
          }
        : transition,
    ),
  }));
  let selections =
    composeDefaultCapabilityDraft({ profile: "expense-approval" }).graph
      .integration.compositionSelections ?? [];
  if (notificationVersion) {
    const historical = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "core.notification" &&
        manifest.version === notificationVersion,
    );
    if (!historical) throw new Error("Historical notification asset missing.");
    const historicalLock = lockFromAsset(historical);
    graph.integration.assetLocks = graph.integration.assetLocks?.map((lock) =>
      lock.key === "core.notification" ? historicalLock : lock,
    );
    selections = selections.map((selection) => {
      if (selection.lock.key !== "core.notification") return selection;
      const { template: _currentTemplate, ...historicalBindings } =
        selection.bindings;
      return {
        ...selection,
        lock: historicalLock,
        bindings: historicalBindings,
      };
    });
  }
  if (template !== undefined) {
    selections = selections.map((selection) =>
      selection.lock.key === "core.notification"
        ? {
            ...selection,
            bindings: { ...selection.bindings, template },
          }
        : selection,
    );
  }
  return {
    publishedRevisionId: "published-expense-notification-runtime-1",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}

function publishedProfileWithNotification(
  profile: "expense-approval" | "simple-ecommerce",
): PublishedGraphInput {
  const graph = composeProfileDraft({ profile }).graph;
  const selections =
    composeDefaultCapabilityDraft({ profile }).graph.integration
      .compositionSelections ?? [];
  return {
    publishedRevisionId: `published-${profile}-notification-journey-1`,
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}

function publishedRestaurantWithNotification(): PublishedGraphInput {
  const graph = composeProfileDraft({
    profile: "restaurant-ordering",
    optionalCapabilities: ["core.notification"],
  }).graph;
  const selections = [
    ...(composeDefaultCapabilityDraft({ profile: "restaurant-ordering" }).graph
      .integration.compositionSelections ?? []),
    {
      lock: graph.integration.assetLocks!.find(
        ({ key }) => key === "core.notification",
      )!,
      bindings: {
        recipientRole: { graphSymbol: "graph.policy.customer" },
      },
    },
  ];
  return {
    publishedRevisionId: "published-restaurant-notification-runtime-1",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
}

function lockFromAsset(asset: (typeof capabilityAssets)[number]) {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    asset.manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
}

async function withGeneratedModule<T>(
  input: PublishedGraphInput,
  run: (module: GeneratedModule) => Promise<T>,
  includeWorker = false,
): Promise<T> {
  const directory = await mkdtemp(join(testDirectory, "notification-runtime-"));
  try {
    const bundle = generateApplicationBundle(input);
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/src/"))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    const runtime = await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    );
    const prisma = await import(
      pathToFileURL(resolve(directory, "api/src/prisma-record-store.ts")).href
    );
    const worker = includeWorker
      ? await import(
          pathToFileURL(
            resolve(directory, "api/src/notification-outbox-worker.ts"),
          ).href
        )
      : {};
    return await run({
      ...runtime,
      ...prisma,
      ...worker,
    } as GeneratedModule);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function createGeneratedStores(
  module: GeneratedModule,
): readonly (readonly [string, GeneratedStore])[] {
  const rows = new Map<string, PrismaNotificationOutboxRow>();
  const notificationOutbox = {
    async findUnique({ where }: { where: { id: string } }) {
      return rows.get(where.id) ?? null;
    },
    async findMany({
      where,
      take,
    }: {
      where: { status: string; availableAt: { lte: Date } };
      take: number;
    }) {
      return [...rows.values()]
        .filter(
          (entry) =>
            entry.status === where.status &&
            entry.availableAt <= where.availableAt.lte,
        )
        .slice(0, take);
    },
    async upsert({
      where,
      create,
    }: {
      where: { dedupeKey: string };
      create: NotificationOutboxInput & { availableAt: Date };
    }) {
      const existing = [...rows.values()].find(
        (entry) => entry.dedupeKey === where.dedupeKey,
      );
      if (existing) return existing;
      const entry = {
        id: `notification-${rows.size + 1}`,
        ...create,
        status: "pending" as const,
        attempts: 0,
        deliveredAt: null,
        lastError: null,
      };
      rows.set(entry.id, entry);
      return entry;
    },
    async updateMany({
      where,
      data,
    }: {
      where: {
        id: string;
        status?: string;
        attempts?: number;
        availableAt?: { lte: Date };
      };
      data: Partial<
        Omit<
          NotificationOutboxEntry,
          "availableAt" | "deliveredAt" | "attempts"
        >
      > & {
        availableAt?: Date;
        deliveredAt?: Date;
        attempts?: number | { increment: number };
      };
    }) {
      const entry = rows.get(where.id);
      if (
        !entry ||
        (where.status !== undefined && entry.status !== where.status) ||
        (where.attempts !== undefined && entry.attempts !== where.attempts) ||
        (where.availableAt !== undefined &&
          entry.availableAt > where.availableAt.lte)
      ) {
        return { count: 0 };
      }
      const { attempts, ...values } = data;
      Object.assign(entry, values);
      if (typeof attempts === "number") entry.attempts = attempts;
      if (typeof attempts === "object") {
        entry.attempts += attempts.increment;
      }
      return { count: 1 };
    },
  };
  const prisma = {
    factory_NotificationOutbox: notificationOutbox,
    async $transaction<T>(operation: (client: unknown) => Promise<T>) {
      return operation(prisma);
    },
  };
  return [
    ["in-memory", new module.InMemoryRecordStore()],
    ["Prisma", new module.PrismaRecordStore(prisma)],
  ];
}

function createTransactionalPrismaFixture() {
  type State = {
    records: Map<string, Record<string, unknown> & { id: string }>;
    notifications: Map<string, PrismaNotificationOutboxRow>;
  };
  let state: State = { records: new Map(), notifications: new Map() };

  const cloneState = (source: State): State => structuredClone(source);
  const clientFor = (active: State) => {
    const expense = {
      async findMany() {
        return [...active.records.values()];
      },
      async findUnique({ where }: { where: { id: string } }) {
        return active.records.get(where.id) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const id = `expense-${active.records.size + 1}`;
        const record = { id, ...data };
        active.records.set(id, record);
        return record;
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) {
        const record = active.records.get(where.id);
        if (!record) throw new Error(`Record '${where.id}' was not found.`);
        Object.assign(record, data);
        return record;
      },
    };
    const notificationOutbox = {
      async findUnique({ where }: { where: { id: string } }) {
        return active.notifications.get(where.id) ?? null;
      },
      async upsert({
        where,
        create,
      }: {
        where: { dedupeKey: string };
        create: NotificationOutboxInput & { availableAt: Date };
      }) {
        const existing = [...active.notifications.values()].find(
          (entry) => entry.dedupeKey === where.dedupeKey,
        );
        if (existing) return existing;
        const entry = {
          id: `notification-${active.notifications.size + 1}`,
          ...create,
          status: "pending" as const,
          attempts: 0,
          deliveredAt: null,
          lastError: null,
        };
        active.notifications.set(entry.id, entry);
        return entry;
      },
      async findMany() {
        return [...active.notifications.values()];
      },
      async updateMany() {
        return { count: 0 };
      },
    };
    return { expense, factory_NotificationOutbox: notificationOutbox };
  };
  const prisma = {
    ...clientFor(state),
    async $transaction<T>(operation: (client: unknown) => Promise<T>) {
      const transactionState = cloneState(state);
      const result = await operation(clientFor(transactionState));
      state = transactionState;
      return result;
    },
  };
  return { prisma, getState: () => cloneState(state) };
}

const notificationInput: NotificationOutboxInput = {
  dedupeKey: "notification-transition-proof",
  actor: "employee",
  recipientRole: "employee",
  template: null,
  entity: "expense",
  recordId: "expense-1",
  availableAt: "2026-08-01T00:00:00.000Z",
};

describe("generated durable notification outbox runtime", () => {
  it("emits a documented one-shot local fixture drain command", () => {
    const files = Object.fromEntries(
      generateApplicationBundle(publishedExpenseWithNotification()).files.map(
        (file) => [file.path, file.content],
      ),
    );

    expect(JSON.parse(files["api/package.json"] ?? "{}").scripts).toMatchObject(
      {
        "notification:drain": "tsx src/notification-outbox-drain.ts",
      },
    );
    expect(files["api/src/notification-outbox-drain.ts"]).toContain(
      "new PrismaRecordStore(prisma)",
    );
    expect(files["api/src/notification-outbox-drain.ts"]).toContain(
      "new FixtureNotificationTransport()",
    );
    expect(files["api/README.md"]).toContain("pnpm notification:drain");
    expect(files["README.md"]).toContain(
      "docker compose exec api pnpm notification:drain",
    );
  });

  it("rejects a Restaurant durable notification lock instead of omitting its outbox", () => {
    expect(() =>
      generateApplicationBundle(publishedRestaurantWithNotification()),
    ).toThrow("Restaurant Ordering does not support notification.outbox/v1");
  });

  it.each([
    {
      profile: "expense-approval" as const,
      recipientRole: "employee",
      template: "expense.approval-outcome",
      entity: "expense",
      actor: "manager",
    },
    {
      profile: "simple-ecommerce" as const,
      recipientRole: "shopper",
      template: "ecommerce.order-outcome",
      entity: "order",
      actor: "shopper",
    },
  ])(
    "drains the generated $profile worker with its locked role and template",
    async ({ profile, recipientRole, template, entity, actor }) => {
      await withGeneratedModule(
        publishedProfileWithNotification(profile),
        async (module) => {
          const store = new module.InMemoryRecordStore();
          const runtime = new module.ApplicationRuntime(store);
          let record: Record<string, unknown> & { id: string };

          if (profile === "expense-approval") {
            record = await runtime.create("employee", "expense", {
              amount: "42.00",
              description: "Team lunch",
            });
            await runtime.transition(
              "employee",
              "expense",
              record.id,
              "submit",
            );
            await runtime.transition(
              "manager",
              "expense",
              record.id,
              "approve",
            );
          } else {
            record = await runtime.create("shopper", "order", {});
            await runtime.addCartItem("shopper", "order", record.id, {
              catalogEntity: "product",
              catalogRecordId: "everyday-tote",
              quantity: 1,
            });
            await runtime.transition("shopper", "order", record.id, "submit", {
              expectedVersion: 0,
              idempotencyKey: "profile-notification-submit-1",
            });
            await runtime.transition("shopper", "order", record.id, "pay", {
              expectedVersion: 1,
              idempotencyKey: "profile-notification-pay-2",
            });
          }

          const Transport = module.FixtureNotificationTransport!;
          const Worker = module.NotificationOutboxWorker!;
          const transport = new Transport();
          const worker = new Worker(store, transport);
          const drained = await worker.drain("9999-12-31T23:59:59.999Z");

          expect(drained).toEqual([
            expect.objectContaining({
              actor,
              recipientRole,
              template,
              entity,
              recordId: record.id,
              status: "delivered",
            }),
          ]);
          expect(transport.delivered).toEqual([
            expect.objectContaining({ recipientRole, template }),
          ]);
        },
        true,
      );
    },
  );

  it("retries one fixture failure at a deterministic time and then delivers", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        for (const [storeName, store] of createGeneratedStores(module)) {
          const Transport = module.FixtureNotificationTransport!;
          const Worker = module.NotificationOutboxWorker!;
          const transport = new Transport(1);
          const worker = new Worker(store, transport);
          const pending = await store.enqueueNotification({
            ...notificationInput,
            dedupeKey: `transient-worker-proof-${storeName}`,
          });
          expect(pending.status, storeName).toBe("pending");

          const firstDrain = await worker.drain("2026-08-01T00:00:00.000Z");
          expect(firstDrain, storeName).toEqual([
            expect.objectContaining({
              status: "pending",
              attempts: 1,
              availableAt: "2026-08-01T00:01:00.000Z",
              lastError: "fixture-delivery-failed",
            }),
          ]);

          const secondDrain = await worker.drain("2026-08-01T00:01:00.000Z");
          expect(secondDrain, storeName).toEqual([
            expect.objectContaining({
              status: "delivered",
              attempts: 1,
              deliveredAt: "2026-08-01T00:01:00.000Z",
              lastError: null,
            }),
          ]);
          expect(transport.deliveryAttempts, storeName).toBe(2);
          expect(transport.delivered, storeName).toHaveLength(1);
        }
      },
      true,
    );
  });

  it("stops after three fixture failures and records terminal failure", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        for (const [storeName, store] of createGeneratedStores(module)) {
          const Transport = module.FixtureNotificationTransport!;
          const Worker = module.NotificationOutboxWorker!;
          const transport = new Transport(3);
          const worker = new Worker(store, transport);
          await store.enqueueNotification({
            ...notificationInput,
            dedupeKey: `terminal-worker-proof-${storeName}`,
          });

          await worker.drain("2026-08-01T00:00:00.000Z");
          await worker.drain("2026-08-01T00:01:00.000Z");
          const thirdDrain = await worker.drain("2026-08-01T00:03:00.000Z");
          const fourthDrain = await worker.drain("9999-12-31T23:59:59.999Z");

          expect(thirdDrain, storeName).toEqual([
            expect.objectContaining({
              status: "failed",
              attempts: 3,
              availableAt: "2026-08-01T00:03:00.000Z",
              deliveredAt: null,
              lastError: "fixture-delivery-failed",
            }),
          ]);
          expect(fourthDrain, storeName).toEqual([]);
          expect(transport.deliveryAttempts, storeName).toBe(3);
          expect(transport.delivered, storeName).toEqual([]);
        }
      },
      true,
    );
  });

  it("does not hand an already delivered entry to the transport again", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        for (const [storeName, store] of createGeneratedStores(module)) {
          const Transport = module.FixtureNotificationTransport!;
          const Worker = module.NotificationOutboxWorker!;
          const transport = new Transport();
          const worker = new Worker(store, transport);
          await store.enqueueNotification({
            ...notificationInput,
            dedupeKey: `idempotent-worker-proof-${storeName}`,
          });

          await worker.drain("2026-08-01T00:00:00.000Z");
          await worker.drain("2026-08-01T00:00:00.000Z");

          expect(transport.deliveryAttempts, storeName).toBe(1);
          expect(transport.delivered, storeName).toHaveLength(1);
        }
      },
      true,
    );
  });

  it("propagates acknowledgement failure without recording a transport retry", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        const acknowledgementFailureStore: GeneratedStore = {
          create: store.create.bind(store),
          find: store.find.bind(store),
          update: store.update.bind(store),
          enqueueNotification: store.enqueueNotification.bind(store),
          claimDueNotifications: store.claimDueNotifications.bind(store),
          async markNotificationDelivered() {
            throw new Error("acknowledgement-unavailable");
          },
          recordNotificationFailure:
            store.recordNotificationFailure.bind(store),
          inTransaction: store.inTransaction.bind(store),
        };
        const Transport = module.FixtureNotificationTransport!;
        const Worker = module.NotificationOutboxWorker!;
        const transport = new Transport();
        const worker = new Worker(acknowledgementFailureStore, transport);
        const input = {
          ...notificationInput,
          dedupeKey: "acknowledgement-failure-proof",
        };
        await store.enqueueNotification(input);

        await expect(worker.drain("2026-08-01T00:00:00.000Z")).rejects.toThrow(
          "acknowledgement-unavailable",
        );

        expect(transport.deliveryAttempts).toBe(1);
        expect(transport.delivered).toHaveLength(1);
        expect(await store.enqueueNotification(input)).toMatchObject({
          status: "pending",
          attempts: 0,
          lastError: null,
        });
      },
      true,
    );
  });

  it("enqueues one locked recipient intent without accepting client message content", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        const runtime = new module.ApplicationRuntime(store);
        const expense = await runtime.create("employee", "expense", {
          amount: "42.00",
          description: "Team lunch",
        });

        await runtime.transition("employee", "expense", expense.id, "submit");

        const pending = await store.claimDueNotifications(
          "9999-12-31T23:59:59.999Z",
          10,
        );
        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
          actor: "employee",
          recipientRole: "employee",
          template: "expense.approval-outcome",
          entity: "expense",
          recordId: expense.id,
          status: "pending",
          attempts: 0,
          deliveredAt: null,
          lastError: null,
        });
        expect(pending[0]).not.toHaveProperty("message");
        expect(pending[0]).not.toHaveProperty("recipient");
        expect(pending[0]).not.toHaveProperty("provider");
        expect(pending[0]).not.toHaveProperty("url");
      },
    );
  });

  it("carries a validated 1.1.1 template identifier into the generated outbox", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification("expense.approval-outcome"),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        const runtime = new module.ApplicationRuntime(store);
        const expense = await runtime.create("employee", "expense", {
          amount: "42.00",
          description: "Team lunch",
        });

        await runtime.transition("employee", "expense", expense.id, "submit");

        const pending = await store.claimDueNotifications(
          "9999-12-31T23:59:59.999Z",
          10,
        );
        expect(pending).toHaveLength(1);
        expect(pending[0]?.template).toBe("expense.approval-outcome");
      },
    );
  });

  it("replays a historical 1.1.0 notification lock with a null template", async () => {
    const published = publishedExpenseWithNotification(undefined, "1.1.0");
    const graphLock = published.graph.integration.assetLocks?.find(
      ({ key }) => key === "core.notification",
    );
    const compositionLock = published.compositionLock.packages.find(
      ({ lock }) => lock.key === "core.notification",
    )?.lock;

    expect(graphLock).toMatchObject({
      key: "core.notification",
      version: "1.1.0",
    });
    expect(compositionLock).toEqual(graphLock);

    await withGeneratedModule(published, async (module) => {
      const store = new module.InMemoryRecordStore();
      const runtime = new module.ApplicationRuntime(store);
      const expense = await runtime.create("employee", "expense", {
        amount: "42.00",
        description: "Team lunch",
      });

      await runtime.transition("employee", "expense", expense.id, "submit");

      const pending = await store.claimDueNotifications(
        "9999-12-31T23:59:59.999Z",
        10,
      );
      expect(pending).toHaveLength(1);
      expect(pending[0]?.template).toBeNull();
    });
  });

  it("rolls back both a domain mutation and notification enqueue when a transaction fails", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        const expense = await store.create("expense", {
          amount: "9.00",
          description: "Taxi",
          status: "draft",
        });

        await expect(
          store.inTransaction(async (transaction) => {
            await transaction.update("expense", expense.id, {
              status: "submitted",
            });
            await transaction.enqueueNotification({
              dedupeKey: "rollback-proof",
              actor: "employee",
              recipientRole: "employee",
              template: null,
              entity: "expense",
              recordId: expense.id,
              availableAt: "2026-08-01T00:00:00.000Z",
            });
            throw new Error("abort transaction");
          }),
        ).rejects.toThrow("abort transaction");

        expect(await store.find("expense", expense.id)).toMatchObject({
          status: "draft",
        });
        expect(
          await store.claimDueNotifications("9999-12-31T23:59:59.999Z", 10),
        ).toEqual([]);
      },
    );
  });

  it("rolls back generated Prisma domain and outbox writes after post-enqueue failure", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const fixture = createTransactionalPrismaFixture();
        const store = new module.PrismaRecordStore(fixture.prisma);
        const expense = await store.create("expense", {
          amount: "9.00",
          description: "Taxi",
          status: "draft",
        });

        await expect(
          store.inTransaction(async (transaction) => {
            await transaction.update("expense", expense.id, {
              status: "submitted",
            });
            await transaction.enqueueNotification({
              ...notificationInput,
              dedupeKey: "prisma-post-enqueue-rollback-proof",
              recordId: expense.id,
            });
            throw new Error("post-enqueue failure");
          }),
        ).rejects.toThrow("post-enqueue failure");

        expect(fixture.getState().records.get(expense.id)).toMatchObject({
          status: "draft",
        });
        expect(fixture.getState().notifications).toHaveLength(0);
      },
    );
  });

  it("hands a due entry to only one concurrent claimant", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        await store.enqueueNotification({
          dedupeKey: "single-claim-proof",
          actor: "employee",
          recipientRole: "employee",
          template: null,
          entity: "expense",
          recordId: "expense-1",
          availableAt: "2026-08-01T00:00:00.000Z",
        });

        const claims = await Promise.all([
          store.claimDueNotifications("2026-08-01T00:00:00.000Z", 1),
          store.claimDueNotifications("2026-08-01T00:00:00.000Z", 1),
        ]);

        expect(claims.flat()).toHaveLength(1);
      },
    );
  });

  it("lets the worker choose retryable or terminal failure state", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        for (const [storeName, store] of createGeneratedStores(module)) {
          const entry = await store.enqueueNotification(notificationInput);

          const retryable = await store.recordNotificationFailure(
            entry.id,
            "fixture-unavailable",
            "pending",
            "2026-08-01T00:01:00.000Z",
          );
          expect(retryable, storeName).toMatchObject({
            status: "pending",
            attempts: 1,
            availableAt: "2026-08-01T00:01:00.000Z",
            lastError: "fixture-unavailable",
          });

          const terminal = await store.recordNotificationFailure(
            entry.id,
            "fixture-rejected",
            "failed",
            "2026-08-01T00:02:00.000Z",
          );
          expect(terminal, storeName).toMatchObject({
            status: "failed",
            attempts: 2,
            availableAt: "2026-08-01T00:02:00.000Z",
            lastError: "fixture-rejected",
          });
        }
      },
    );
  });

  it("does not deliver a terminal failed entry", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        for (const [storeName, store] of createGeneratedStores(module)) {
          const entry = await store.enqueueNotification({
            ...notificationInput,
            dedupeKey: `terminal-delivery-proof-${storeName}`,
          });
          await store.recordNotificationFailure(
            entry.id,
            "fixture-rejected",
            "failed",
            "2026-08-01T00:01:00.000Z",
          );

          await store.markNotificationDelivered(
            entry.id,
            "2026-08-01T00:02:00.000Z",
          );

          expect(
            await store.enqueueNotification({
              ...notificationInput,
              dedupeKey: `terminal-delivery-proof-${storeName}`,
            }),
            storeName,
          ).toMatchObject({
            status: "failed",
            attempts: 1,
            deliveredAt: null,
            lastError: "fixture-rejected",
          });
        }
      },
    );
  });

  it("preserves a concurrent successful transaction when another transaction rolls back", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        let signalStarted!: () => void;
        let releaseFailure!: () => void;
        const started = new Promise<void>((resolveStarted) => {
          signalStarted = resolveStarted;
        });
        const mayFail = new Promise<void>((resolveFailure) => {
          releaseFailure = resolveFailure;
        });
        const failing = store.inTransaction(async (transaction) => {
          await transaction.create("expense", {
            description: "Rolled back",
          });
          signalStarted();
          await mayFail;
          throw new Error("abort first transaction");
        });
        await started;
        const succeeding = store.inTransaction(async (transaction) =>
          transaction.create("expense", { description: "Committed" }),
        );

        releaseFailure();
        await expect(failing).rejects.toThrow("abort first transaction");
        const committed = await succeeding;

        expect(await store.find("expense", committed.id)).toMatchObject({
          description: "Committed",
        });
      },
    );
  });

  it("preserves a direct mutation that races a failing transaction", async () => {
    await withGeneratedModule(
      publishedExpenseWithNotification(),
      async (module) => {
        const store = new module.InMemoryRecordStore();
        let signalStarted!: () => void;
        let releaseFailure!: () => void;
        const started = new Promise<void>((resolveStarted) => {
          signalStarted = resolveStarted;
        });
        const mayFail = new Promise<void>((resolveFailure) => {
          releaseFailure = resolveFailure;
        });
        const failing = store.inTransaction(async (transaction) => {
          await transaction.create("expense", {
            description: "Rolled back",
          });
          signalStarted();
          await mayFail;
          throw new Error("abort transaction before direct create");
        });
        await started;
        const succeeding = store.create("expense", {
          description: "Direct commit",
        });

        releaseFailure();
        await expect(failing).rejects.toThrow(
          "abort transaction before direct create",
        );
        const committed = await succeeding;

        expect(await store.find("expense", committed.id)).toMatchObject({
          description: "Direct commit",
        });
      },
    );
  });
});
