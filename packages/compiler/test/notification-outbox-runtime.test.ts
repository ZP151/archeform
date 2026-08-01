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
    input: Omit<
      NotificationOutboxEntry,
      "id" | "status" | "attempts" | "deliveredAt" | "lastError"
    >,
  ): Promise<NotificationOutboxEntry>;
  claimDueNotifications(
    now: string,
    limit: number,
  ): Promise<readonly NotificationOutboxEntry[]>;
  markNotificationDelivered(id: string, deliveredAt: string): Promise<void>;
  recordNotificationFailure(
    id: string,
    error: string,
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

type GeneratedModule = {
  ApplicationRuntime: new (store: GeneratedStore) => GeneratedRuntime;
  InMemoryRecordStore: new () => GeneratedStore;
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
    return await run(
      (await import(
        pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
      )) as GeneratedModule,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("generated durable notification outbox runtime", () => {
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
