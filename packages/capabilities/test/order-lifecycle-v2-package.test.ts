import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  capabilityAssets,
  createCommerceOrderCreateHandler,
  createCommerceOrderCreateHandlerV2_0_1,
  createCommerceOrderLifecycleOperationAdapter,
  createCommerceOrderLifecycleOperationAdapterV2_0_1,
} from "../src/assets/index.js";
import {
  loadCapabilityAssetContributions,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function renderTemplate(template: string): string {
  return template
    .replaceAll("{{orderEntity}}", "order")
    .replaceAll("{{orderFlow}}", "submit")
    .replaceAll("{{customerRole}}", "shopper");
}

async function importRenderedTemplate<T>(template: string): Promise<T> {
  const javascript = ts.transpileModule(renderTemplate(template), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return (await import(
    `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
  )) as T;
}

describe("generic order lifecycle V2 package", () => {
  it("executes rendered 2.0.2 templates with the canonical closed request boundaries", async () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.0.2",
    );
    expect(asset).toBeDefined();
    if (!asset) return;

    const contributions = loadCapabilityAssetContributions(
      asset,
      repositoryRoot,
    );
    const createTemplate = contributions.find(
      ({ targetRuntimeInterfaceVersion }) =>
        targetRuntimeInterfaceVersion === "factory.order-create-handler/v1",
    );
    const transitionTemplate = contributions.find(
      ({ targetRuntimeInterfaceVersion }) =>
        targetRuntimeInterfaceVersion ===
        "factory.transaction-operation-adapter/v1",
    );
    expect(createTemplate).toBeDefined();
    expect(transitionTemplate).toBeDefined();
    if (!createTemplate || !transitionTemplate) return;

    const { commerceOrderCreateHandler } = await importRenderedTemplate<{
      readonly commerceOrderCreateHandler: {
        create(
          request: unknown,
          dependencies: Readonly<{
            store: {
              createInitial(
                input: Readonly<Record<string, unknown>>,
              ): Promise<unknown>;
            };
            authorizer: { assertCreateAllowed(role: string): Promise<void> };
          }>,
        ): Promise<unknown>;
      };
    }>(createTemplate.content);
    const { commerceOrderTransactionOperationAdapter } =
      await importRenderedTemplate<{
        readonly commerceOrderTransactionOperationAdapter: {
          parseRequest(request: unknown): unknown;
        };
      }>(transitionTemplate.content);

    const calls: string[] = [];
    const dependencies = {
      authorizer: {
        assertCreateAllowed: async () => void calls.push("authorize"),
      },
      store: {
        createInitial: async () => {
          calls.push("create");
          return { id: "server-1", status: "cart", version: 0 };
        },
      },
    };

    await expect(
      commerceOrderCreateHandler.create(
        { role: "shopper", entityKey: "order", input: {}, unexpected: true },
        dependencies,
      ),
    ).rejects.toThrow();
    await expect(
      commerceOrderCreateHandler.create(
        { role: "shopper", entityKey: "order", input: { id: "caller-id" } },
        dependencies,
      ),
    ).rejects.toThrow();
    expect(calls).toEqual([]);

    await expect(
      commerceOrderCreateHandler.create(
        { role: "shopper", entityKey: "order", input: { note: "ok" } },
        dependencies,
      ),
    ).resolves.toEqual({ id: "server-1", status: "cart", version: 0 });
    expect(calls).toEqual(["authorize", "create"]);

    expect(() =>
      commerceOrderTransactionOperationAdapter.parseRequest({
        orderId: "server-1",
        expectedVersion: 0,
        transition: "submit",
        idempotencyKey: "submit-1",
        payloadDigest: "not-a-sha",
      }),
    ).toThrow();
    expect(() =>
      commerceOrderTransactionOperationAdapter.parseRequest({
        orderId: "server-1",
        expectedVersion: 0,
        transition: "submit",
        idempotencyKey: "submit-1",
        payloadDigest: `sha256:${"a".repeat(64)}`,
        unexpected: true,
      }),
    ).toThrow();
  });

  it("registers a verified 2.0.1 lifecycle successor with digest-covered create and transition contributions", () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.0.1",
    );

    expect(asset?.manifest.provides).toEqual(
      expect.arrayContaining([
        { interfaceKey: "factory.order-create-handler", version: "v1" },
        {
          interfaceKey: "factory.transaction-operation-adapter",
          version: "v1",
        },
      ]),
    );
    expect(verifyCapabilityAssetDigest(asset!)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset!, repositoryRoot)).toEqual([]);
    expect(
      loadCapabilityAssetContributions(asset!, repositoryRoot).map(
        ({ targetRuntimeInterfaceVersion }) => targetRuntimeInterfaceVersion,
      ),
    ).toEqual(
      expect.arrayContaining([
        "factory.order-create-handler/v1",
        "factory.transaction-operation-adapter/v1",
      ]),
    );
  });

  it("executes the declared create envelope through one bound Authorizer and Store", async () => {
    const handler = createCommerceOrderCreateHandlerV2_0_1();
    const calls: string[] = [];
    const created = await handler.create(
      { role: "shopper", entityKey: "order", input: { note: "ok" } },
      {
        authorizer: {
          assertCreateAllowed: async (role) => {
            calls.push(`authorize:${role}`);
          },
        },
        store: {
          createInitial: async (input) => {
            calls.push(`create:${input.note}`);
            return { id: "server-1", status: "cart", version: 0 };
          },
        },
      },
    );

    expect(calls).toEqual(["authorize:shopper", "create:ok"]);
    expect(created).toEqual({ id: "server-1", status: "cart", version: 0 });
    expect(Object.isFrozen(created)).toBe(true);
  });

  it.each([
    { role: "shopper", entityKey: "cart", input: {} },
    { role: "shopper", entityKey: "order", input: { id: "caller-id" } },
    { role: "shopper", entityKey: "order", input: { status: "draft" } },
    { role: "shopper", entityKey: "order", input: { version: 0 } },
    { role: "", entityKey: "order", input: {} },
  ])(
    "rejects unsafe creation input before dependencies: %#",
    async (request) => {
      const handler = createCommerceOrderCreateHandlerV2_0_1();
      const calls: string[] = [];

      await expect(
        handler.create(request, {
          authorizer: {
            assertCreateAllowed: async () => {
              calls.push("authorize");
            },
          },
          store: {
            createInitial: async () => {
              calls.push("create");
              return { id: "server-1", status: "cart", version: 0 };
            },
          },
        }),
      ).rejects.toThrow();

      expect(calls).toEqual([]);
    },
  );

  it("does not persist when authorization is denied", async () => {
    const handler = createCommerceOrderCreateHandlerV2_0_1();
    const calls: string[] = [];

    await expect(
      handler.create(
        { role: "shopper", entityKey: "order", input: {} },
        {
          authorizer: {
            assertCreateAllowed: async () => {
              calls.push("authorize");
              throw new Error("denied");
            },
          },
          store: {
            createInitial: async () => {
              calls.push("create");
              return { id: "server-1", status: "cart", version: 0 };
            },
          },
        },
      ),
    ).rejects.toThrow("denied");

    expect(calls).toEqual(["authorize"]);
  });

  it("parses and prepares the declared 2.0.1 fixture transition", () => {
    const fixture = JSON.parse(
      readFileSync(
        resolve(
          repositoryRoot,
          "packages/capabilities/assets/commerce.order/2.0.1/fixtures/default.json",
        ),
        "utf8",
      ),
    ) as { transition: unknown };
    const adapter = createCommerceOrderLifecycleOperationAdapterV2_0_1();

    const prepared = adapter.prepare(adapter.parseRequest(fixture.transition));

    expect(prepared.command.aggregate).toEqual({
      entity: "order",
      id: "server-1",
      expectedVersion: 0,
    });
    expect(prepared.context).toEqual({
      orderId: "server-1",
      transition: "submit",
    });
  });

  it("registers one Golden lifecycle package with separate create and transition providers", () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.0.0",
    );

    expect(asset?.manifest.effects).toEqual([
      "order.create",
      "order.transition",
    ]);
    expect(asset?.manifest.provides).toEqual(
      expect.arrayContaining([
        { interfaceKey: "factory.order-create-handler", version: "v1" },
        {
          interfaceKey: "factory.transaction-operation-adapter",
          version: "v1",
        },
        { interfaceKey: "commerce.order-event", version: "v1" },
      ]),
    );
    expect(asset?.manifest.runtimeHandlers).toContain("order");
    expect(verifyCapabilityAssetDigest(asset!)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset!, repositoryRoot)).toEqual([]);
  });

  it("keeps the create handler and transaction operation adapter digest-covered", () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.0.0",
    );
    expect(asset).toBeDefined();
    if (!asset) return;

    const contributions = loadCapabilityAssetContributions(
      asset,
      repositoryRoot,
    );
    expect(contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetRuntimeInterfaceVersion: "factory.order-create-handler/v1",
        }),
        expect.objectContaining({
          targetRuntimeInterfaceVersion:
            "factory.transaction-operation-adapter/v1",
        }),
      ]),
    );
    expect(
      contributions.find(
        ({ targetRuntimeInterfaceVersion }) =>
          targetRuntimeInterfaceVersion === "factory.order-create-handler/v1",
      )?.content,
    ).toContain('status: "draft"');
    expect(
      contributions.find(
        ({ targetRuntimeInterfaceVersion }) =>
          targetRuntimeInterfaceVersion ===
          "factory.transaction-operation-adapter/v1",
      )?.content,
    ).toContain("createStore");
  });

  it("creates only a version-zero draft and prepares the declared fixture transition", () => {
    const createHandler = createCommerceOrderCreateHandler();
    const adapter = createCommerceOrderLifecycleOperationAdapter();
    const draft = createHandler.create(
      createHandler.parseRequest({ orderId: "order-1" }),
    );
    const transition = adapter.prepare(
      adapter.parseRequest({
        orderId: draft.id,
        expectedVersion: draft.version,
        transition: "submit",
        idempotencyKey: "submit-1",
        payloadDigest: `sha256:${"a".repeat(64)}`,
      }),
    );

    expect(draft).toEqual({ id: "order-1", status: "draft", version: 0 });
    expect(transition.command.aggregate).toEqual({
      entity: "order",
      id: "order-1",
      expectedVersion: 0,
    });
    expect(() =>
      createHandler.parseRequest({ orderId: "", status: "draft" }),
    ).toThrow();
  });
});
