import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getCapabilityAsset } from "../src/index.js";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("Order Operations capability packages", () => {
  it("publishes a locked order-operations package with a dedicated handler", () => {
    const asset = getCapabilityAsset("commerce.order-operations");

    expect(asset.manifest).toMatchObject({
      key: "commerce.order-operations",
      version: "1.1.0",
      lifecycle: "golden",
      runtimeHandlers: ["orderOperations"],
      provides: expect.arrayContaining([
        { interfaceKey: "commerce.order-operations", version: "v1" },
        { interfaceKey: "commerce.order-operation-receipt", version: "v1" },
      ]),
      requires: expect.arrayContaining([
        { interfaceKey: "commerce.order-event", version: "v1" },
        { interfaceKey: "commerce.stock-movement", version: "v1" },
      ]),
    });
    expect(asset.manifest.templates).toEqual([
      expect.objectContaining({
        target: "api/src/capabilities/commerce.order-operations.ts",
        outputSlot: "api.runtime",
      }),
    ]);
    expect(asset.manifest.executableContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "order-operation-receipt-schema",
          outputSlot: "database.schema",
        }),
        expect.objectContaining({
          id: "order-operation-receipt-migration",
          outputSlot: "database.migration",
        }),
      ]),
    );
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it.each([
    {
      key: "commerce.catalog",
      handler: "catalog",
      target: "api/src/capabilities/commerce.catalog.ts",
    },
    {
      key: "commerce.order",
      handler: "order",
      target: "api/src/capabilities/commerce.order.ts",
    },
  ] as const)(
    "publishes executable $key v1.2 with an isolated $handler handler",
    ({ key, handler, target }) => {
      const asset = getCapabilityAsset(key);

      expect(asset.manifest).toMatchObject({
        key,
        version: "1.2.0",
        lifecycle: "golden",
        runtimeHandlers: [handler],
        profiles: expect.arrayContaining([
          "restaurant-ordering",
          "simple-ecommerce",
          "retail-counter",
          "grocery-pickup",
        ]),
        verification: {
          status: "verified",
          fixtureDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          contractTestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        },
      });
      expect(asset.manifest.templates).toEqual([
        expect.objectContaining({
          target,
          outputSlot: "api.runtime",
        }),
      ]);
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    },
  );
});
