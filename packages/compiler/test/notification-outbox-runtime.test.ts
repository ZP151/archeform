import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
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
  ): Promise<Record<string, unknown> & { id: string }>;
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

function publishedExpenseWithNotification(): PublishedGraphInput {
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
  const selections =
    composeDefaultCapabilityDraft({ profile: "expense-approval" }).graph
      .integration.compositionSelections ?? [];
  return {
    publishedRevisionId: "published-expense-notification-runtime-1",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    }),
  };
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
    notificationOutbox,
    async $transaction<T>(operation: (client: unknown) => Promise<T>) {
      return operation(prisma);
    },
  };
  return [
    ["in-memory", new module.InMemoryRecordStore()],
    ["Prisma", new module.PrismaRecordStore(prisma)],
  ];
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
          template: null,
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
