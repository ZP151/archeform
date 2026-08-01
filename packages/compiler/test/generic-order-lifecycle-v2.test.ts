import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
  capabilityAssets,
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

type TransactionOutcome = Readonly<{
  aggregateEntity: string;
  aggregateId: string;
  aggregateVersion: number;
  actorRole: string;
  payloadDigest: string;
  event: string;
  flowId: string;
}>;

type ReceiptClaim =
  | Readonly<{
      kind: "claimed";
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>
  | Readonly<{
      kind: "completed";
      receiptId: string;
      outcome: TransactionOutcome;
    }>
  | Readonly<{ kind: "in-progress"; receiptId: string; retryAfterMs: number }>
  | Readonly<{ kind: "payload-mismatch"; receiptId: string }>;

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
  ): Promise<unknown>;
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
  applyExpectedAggregateVersion(
    input: Readonly<{
      entity: string;
      id: string;
      expectedVersion: number;
      expectedStatus: string;
      nextStatus: string;
    }>,
  ): Promise<boolean>;
  claimTransactionReceipt(
    input: Readonly<{
      scope: string;
      idempotencyKey: string;
      payloadDigest: string;
      leaseDurationMs?: number;
    }>,
  ): Promise<ReceiptClaim>;
  completeTransactionReceipt(
    input: Readonly<{
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
      outcome: TransactionOutcome;
    }>,
  ): Promise<void>;
  markTransactionReceiptRetryable(
    input: Readonly<{
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>,
  ): Promise<void>;
  appendCapabilityEvent(event: {
    capability: string;
    [key: string]: unknown;
  }): Promise<void>;
};

type GeneratedModule = {
  readonly applicationRuntime: GeneratedRuntime;
  readonly ApplicationRuntime: new (store?: GeneratedStore) => GeneratedRuntime;
  readonly InMemoryRecordStore: new () => GeneratedStore;
  readonly PrismaRecordStore: new (prisma: unknown) => GeneratedStore;
  readonly createCommerceOrderTransactionOperationAdapter: (
    declaredEvents: readonly string[],
  ) => {
    parseRequest(input: unknown): unknown;
    prepare(request: unknown): Readonly<{
      command: Readonly<Record<string, unknown>>;
      context: unknown;
    }>;
  };
};

function assetLock(asset: (typeof capabilityAssets)[number]) {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    asset.manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
}

const profileCases = [
  {
    profile: "simple-ecommerce",
    role: "shopper",
    orderEntity: "order",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "fulfil", "cancel"],
    catalogEntity: "product",
    catalogRecordId: "everyday-tote",
  },
  {
    profile: "retail-counter",
    role: "shopper",
    orderEntity: "counter-sale",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "issue-receipt", "cancel"],
    catalogEntity: "retail-item",
    catalogRecordId: "counter-item-cup",
  },
  {
    profile: "grocery-pickup",
    role: "shopper",
    orderEntity: "pickup-order",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "pick", "ready", "handoff", "cancel"],
    catalogEntity: "grocery-item",
    catalogRecordId: "grocery-item-apples",
  },
] as const satisfies readonly Readonly<{
  profile: CommerceProfile;
  role: string;
  orderEntity: string;
  initialState: string;
  declaredEvents: readonly string[];
  catalogEntity: string;
  catalogRecordId: string;
}>[];

function directV2Input(profile: CommerceProfile) {
  const graph = structuredClone(
    composeDefaultCapabilityDraft({ profile }).graph,
  );
  const successorOrder = capabilityAssets.find(
    ({ manifest }) =>
      manifest.key === "commerce.order" && manifest.version === "2.1.1",
  )!;
  const successorTransaction = capabilityAssets.find(
    ({ manifest }) =>
      manifest.key === "commerce.transaction" && manifest.version === "2.2.1",
  )!;
  graph.integration.compositionSelections =
    graph.integration.compositionSelections!.map((selection) => {
      if (selection.lock.key === "commerce.order") {
        return { ...selection, lock: assetLock(successorOrder) };
      }
      if (selection.lock.key === "commerce.transaction") {
        return {
          ...selection,
          lock: assetLock(successorTransaction),
        };
      }
      return selection;
    });
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });
  return { graph, compositionLock };
}

function compile(profile: CommerceProfile) {
  const { graph, compositionLock } = directV2Input(profile);
  return generateApplicationBundle({
    publishedRevisionId: `generic-order-lifecycle-v2-${profile}`,
    graph,
    compositionLock,
  });
}

function typecheckGeneratedReceiptContract(profile: CommerceProfile): string {
  const generatedRoot = resolve(generatedDirectory, `${profile}-type-contract`);
  const virtualSources = new Map<string, string>(
    compile(profile)
      .files.filter((file) => file.path.startsWith("api/src/"))
      .map((file) => [
        normalize(resolve(generatedRoot, file.path)),
        file.content,
      ]),
  );
  const consumerPath = normalize(
    resolve(generatedRoot, "api/src/order-transition-receipt-consumer.ts"),
  );
  virtualSources.set(
    consumerPath,
    [
      'import type { OrderTransitionReceipt } from "./application-runtime.js";',
      "declare const receipt: OrderTransitionReceipt;",
      "type Assert<T extends true> = T;",
      "type InProgressReceipt = Extract<OrderTransitionReceipt, { kind: 'in-progress' }>;",
      "type CompletedReceipt = Extract<OrderTransitionReceipt, { kind: 'completed' }>;",
      "type RequiredRetryDelay = Assert<InProgressReceipt extends { retryAfterMs: number } ? true : false>;",
      "type NoCompletedRetryDelay = Assert<'retryAfterMs' extends keyof CompletedReceipt ? false : true>;",
      "export const retryAfterMs: number = receipt.kind === 'in-progress' ? receipt.retryAfterMs : 0;",
      "export const inProgress: InProgressReceipt = { kind: 'in-progress', receiptId: 'receipt-1', replayed: false, orderId: 'order-1', transition: 'submit', retryAfterMs: 25 };",
    ].join("\n"),
  );

  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(options);
  const baseFileExists = host.fileExists.bind(host);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseReadFile = host.readFile.bind(host);
  host.fileExists = (fileName) =>
    virtualSources.has(normalize(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) =>
    virtualSources.get(normalize(fileName)) ?? baseReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const source = virtualSources.get(normalize(fileName));
    return source === undefined
      ? baseGetSourceFile(fileName, languageVersion, onError, shouldCreate)
      : ts.createSourceFile(fileName, source, languageVersion, true);
  };
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      if (moduleName.startsWith("./") && moduleName.endsWith(".js")) {
        const virtualModule = normalize(
          resolve(dirname(containingFile), moduleName.replace(/\.js$/, ".ts")),
        );
        if (virtualSources.has(virtualModule)) {
          return {
            extension: ts.Extension.Ts,
            resolvedFileName: virtualModule,
          };
        }
      }
      return ts.resolveModuleName(moduleName, containingFile, options, host)
        .resolvedModule;
    });

  const diagnostics = ts
    .getPreEmitDiagnostics(
      ts.createProgram({ rootNames: [consumerPath], options, host }),
    )
    .filter(
      (diagnostic) =>
        diagnostic.file !== undefined &&
        normalize(diagnostic.file.fileName) === consumerPath,
    );
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
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
    const runtimeModule = await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    );
    const adapterModule = await import(
      pathToFileURL(
        resolve(
          directory,
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
        ),
      ).href
    );
    const prismaModule = await import(
      pathToFileURL(resolve(directory, "api/src/prisma-record-store.ts")).href
    );
    return await run({
      ...runtimeModule,
      ...adapterModule,
      ...prismaModule,
    } as GeneratedModule);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Generic order lifecycle V2 compilation", () => {
  it("rejects the revoked Order V2 lock before contribution resolution", () => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    const revokedOrder = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.1.0",
    )!;
    const revokedLock = {
      ...compositionLock,
      packages: compositionLock.packages.map((selection) =>
        selection.lock.key === "commerce.order"
          ? { ...selection, lock: assetLock(revokedOrder) }
          : selection,
      ),
    };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "revoked-order-v2",
        graph,
        compositionLock: revokedLock,
      }),
    ).toThrow(
      "commerce.order@2.1.0 is revoked: fixed event vocabulary excludes bound Flow events",
    );
  });

  it("rejects the revoked Transaction V2 lock before contribution resolution", () => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    const revokedTransaction = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "2.2.0",
    )!;
    const revokedLock = {
      ...compositionLock,
      packages: compositionLock.packages.map((selection) =>
        selection.lock.key === "commerce.transaction"
          ? { ...selection, lock: assetLock(revokedTransaction) }
          : selection,
      ),
    };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "revoked-transaction-v2",
        graph,
        compositionLock: revokedLock,
      }),
    ).toThrow(
      "commerce.transaction@2.2.0 is revoked: PostgreSQL index identifier exceeds 63 bytes",
    );
  });

  it("publishes a discriminated transition receipt with a required retry delay", () => {
    expect(typecheckGeneratedReceiptContract("simple-ecommerce")).toBe("");
  });

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
          kind: "completed",
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
      const replayedTransition = runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        options,
      );
      await expect(replayedTransition).resolves.toMatchObject({
        replayed: true,
      });
      const changedPayloadTransition = runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        {
          ...options,
          expectedVersion: 1,
        },
      );
      await expect(changedPayloadTransition).rejects.toThrow(
        "idempotency payload mismatch",
      );
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

  it("returns in-progress for a duplicate while the first owner holds the lease", async () => {
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

          override async applyExpectedAggregateVersion(input: {
            entity: string;
            id: string;
            expectedVersion: number;
            expectedStatus: string;
            nextStatus: string;
          }): Promise<boolean> {
            if (this.blockOnce && input.nextStatus === "submitted") {
              this.blockOnce = false;
              aggregateEntered();
              await aggregateRelease;
            }
            return super.applyExpectedAggregateVersion(input);
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
        const secondTransition = runtime.transition(
          "shopper",
          "order",
          order.id,
          "submit",
          options,
        );
        await expect(secondTransition).resolves.toMatchObject({
          kind: "in-progress",
          retryAfterMs: expect.any(Number),
        });
        releaseAggregate();
        const completed = await first;

        expect(completed).toMatchObject({ kind: "completed", replayed: false });
        await expect(
          runtime.read("shopper", "order", order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
      },
    );
  });

  it("rotates an expired lease and rejects completion by the stale owner", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ InMemoryRecordStore }) => {
        const store = new InMemoryRecordStore();
        const input = {
          scope: "order:expired-1",
          idempotencyKey: "expired-submit-1",
          payloadDigest: `sha256:${"a".repeat(64)}`,
          leaseDurationMs: 1,
        } as const;
        const first = await store.claimTransactionReceipt(input);
        expect(first).toMatchObject({
          kind: "claimed",
          leaseEpoch: 1,
          leaseToken: expect.any(String),
        });
        if (first.kind !== "claimed") throw new Error("expected first claim");

        await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
        const takeover = await store.claimTransactionReceipt(input);
        expect(takeover).toMatchObject({
          kind: "claimed",
          leaseEpoch: 2,
          leaseToken: expect.not.stringMatching(first.leaseToken),
        });
        if (takeover.kind !== "claimed") throw new Error("expected takeover");

        const outcome: TransactionOutcome = {
          aggregateEntity: "order",
          aggregateId: "expired-1",
          aggregateVersion: 1,
          actorRole: "shopper",
          payloadDigest: input.payloadDigest,
          event: "submit",
          flowId: "ecommerce-order",
        };
        const staleOwner = {
          completeReceipt: () =>
            store.completeTransactionReceipt({
              receiptId: first.receiptId,
              leaseToken: first.leaseToken,
              leaseEpoch: first.leaseEpoch,
              outcome,
            }),
        };
        await expect(staleOwner.completeReceipt()).rejects.toThrow(
          "lease ownership",
        );
        await store.completeTransactionReceipt({
          receiptId: takeover.receiptId,
          leaseToken: takeover.leaseToken,
          leaseEpoch: takeover.leaseEpoch,
          outcome,
        });
        await expect(
          store.claimTransactionReceipt(input),
        ).resolves.toMatchObject({ kind: "completed", outcome });
      },
    );
  });

  it("keeps flow identity separate from the order event at the package adapter boundary", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ createCommerceOrderTransactionOperationAdapter }) => {
        const commerceOrderTransactionOperationAdapter =
          createCommerceOrderTransactionOperationAdapter([
            "submit",
            "pay",
            "fulfil",
            "cancel",
          ]);
        const prepared = commerceOrderTransactionOperationAdapter.prepare(
          commerceOrderTransactionOperationAdapter.parseRequest({
            orderId: "order-1",
            expectedVersion: 0,
            expectedState: "cart",
            event: "submit",
            idempotencyKey: "submit-command-shape-1",
            payloadDigest: `sha256:${"b".repeat(64)}`,
          }),
        );

        expect(Object.keys(prepared.command).sort()).toEqual([
          "aggregate",
          "event",
          "flowId",
          "idempotency",
        ]);
        expect(prepared.command).toMatchObject({
          flowId: "ecommerce-order",
          event: "submit",
          aggregate: {
            entity: "order",
            id: "order-1",
            expectedVersion: 0,
            expectedState: "cart",
          },
          idempotency: {
            scope: "order:order-1",
            key: "submit-command-shape-1",
          },
        });
      },
    );
  });

  it("rejects invalid factory event lists and caller-provided API allowlists", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ createCommerceOrderTransactionOperationAdapter }) => {
        for (const declaredEvents of [
          [],
          ["submit", "submit"],
          ["submit", 1],
          Array.from({ length: 129 }, (_, index) => `event-${index}`),
        ] as unknown as readonly string[][]) {
          expect(() =>
            createCommerceOrderTransactionOperationAdapter(declaredEvents),
          ).toThrow("Order Flow event list");
        }

        const originalEvents = ["submit"];
        const adapter =
          createCommerceOrderTransactionOperationAdapter(originalEvents);
        originalEvents.push("caller-added");
        const request = {
          orderId: "order-1",
          expectedVersion: 0,
          expectedState: "cart",
          idempotencyKey: "bound-event-1",
          payloadDigest: `sha256:${"c".repeat(64)}`,
        } as const;
        expect(() =>
          adapter.parseRequest({
            ...request,
            event: "caller-added",
          }),
        ).toThrow("Order transition is not declared.");
        expect(() =>
          adapter.parseRequest({
            ...request,
            event: "submit",
            allowedEvents: ["caller-added"],
          }),
        ).toThrow("Order transition contains undeclared fields.");
      },
    );
  });

  it.each([
    {
      name: "targets a different entity",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        graph.flow.flows.find(({ id }) => id === "ecommerce-order")!.entity =
          "product";
      },
      expected: "must target bound order entity",
    },
    {
      name: "declares no events",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        const flow = graph.flow.flows.find(
          ({ id }) => id === "ecommerce-order",
        )!;
        flow.events = [];
        flow.transitions = [];
      },
      expected: "must declare at least one event",
    },
    {
      name: "declares a duplicate event",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        const flow = graph.flow.flows.find(
          ({ id }) => id === "ecommerce-order",
        )!;
        flow.events = [...flow.events, "submit"];
      },
      expected: "must declare unique events",
    },
  ])("rejects a bound order Flow that $name", ({ mutate, expected }) => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    mutate(graph);
    const reboundLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: compositionLock.packages,
    });

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "invalid-bound-order-flow",
        graph,
        compositionLock: reboundLock,
      }),
    ).toThrow(expected);
  });

  it("uses one Prisma updateMany CAS constrained by id, version, and status", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ PrismaRecordStore }) => {
        const calls: unknown[] = [];
        const updateMany = vi.fn(async (input: unknown) => {
          calls.push(input);
          return { count: 1 };
        });
        const store = new PrismaRecordStore({
          order: { updateMany },
        });

        await expect(
          store.applyExpectedAggregateVersion({
            entity: "order",
            id: "order-1",
            expectedVersion: 3,
            expectedStatus: "cart",
            nextStatus: "submitted",
          }),
        ).resolves.toBe(true);
        expect(calls).toEqual([
          {
            where: { id: "order-1", version: 3, status: "cart" },
            data: { status: "submitted", version: { increment: 1 } },
          },
        ]);

        updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(
          store.applyExpectedAggregateVersion({
            entity: "order",
            id: "order-1",
            expectedVersion: 3,
            expectedStatus: "cart",
            nextStatus: "submitted",
          }),
        ).resolves.toBe(false);
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
    "$profile activates the direct-composable Transaction Command V2 schema, migration, and TypeScript imports",
    ({ profile, declaredEvents }) => {
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
        `createCommerceOrderTransactionOperationAdapter(${JSON.stringify(declaredEvents)})`,
      );
      expect(files["api/src/application-runtime.ts"]).not.toContain(
        "event === 'pay' ? 'confirm'",
      );
      expect(files["api/src/application-runtime.ts"]).not.toContain(
        "event === 'fulfil' ? 'fulfill'",
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
      for (const indexName of [
        "CommerceTransactionReceipt_state_leaseExpiresAt_idx",
        "ctx_receipt_aggregate_v_idx",
        "CommerceAggregateVersion_entity_aggregateId_version_idx",
      ]) {
        expect(files["database/prisma/schema.prisma"]).toContain(indexName);
        expect(
          files["database/prisma/migrations/0001_initial/migration.sql"],
        ).toContain(indexName);
      }
      expect(files["api/src/prisma-record-store.ts"]).toContain("updateMany");
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
