import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  capabilityAssets,
  createCommerceOrderCreateHandler,
  createCommerceOrderLifecycleOperationAdapter,
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

describe("generic order lifecycle V2 package", () => {
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
