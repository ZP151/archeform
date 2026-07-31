import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { capabilityAssets, lockCapabilityAsset } from "../src/assets/index.js";
import { orderAssetV1_3_2 } from "../src/assets/commerce/order-v1-3-2.js";
import { createCommerceOrderTransactionOperationAdapter } from "../src/assets/commerce/order-v1-3-0.js";
import { restaurantOrderingAssetV1_2_2 } from "../src/assets/restaurant/ordering-v1-2-2.js";
import { createRestaurantOrderingTransactionOperationAdapter } from "../src/assets/restaurant/ordering-v1-2-0.js";
import { resolveCapabilityAssetLock } from "../src/index.js";
import {
  loadCapabilityAssetContributions,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("transaction operation adapter packages", () => {
  it.each([orderAssetV1_3_2, restaurantOrderingAssetV1_2_2])(
    "keeps each physical evidence file clean and the declared fixture executable for $manifest.key@$manifest.version",
    (asset) => {
      const files = [
        "adapter.json",
        "component.json",
        asset.manifest.verification.fixture,
        ...asset.manifest.executableContributions!.map(
          (contribution) => contribution.source,
        ),
        asset.manifest.verification.contractTest,
      ];

      for (const file of files) {
        expect(
          readFileSync(
            resolve(repositoryRoot, asset.manifest.packageRoot, file),
            "utf8",
          ).endsWith("\n\n"),
        ).toBe(false);
      }

      const fixture = JSON.parse(
        readFileSync(
          resolve(
            repositoryRoot,
            asset.manifest.packageRoot,
            asset.manifest.verification.fixture,
          ),
          "utf8",
        ),
      );
      const adapter =
        asset.manifest.key === "commerce.order"
          ? createCommerceOrderTransactionOperationAdapter()
          : createRestaurantOrderingTransactionOperationAdapter();

      expect(
        adapter.prepare(adapter.parseRequest(fixture)).command,
      ).toMatchObject({
        aggregate: { entity: "order", id: fixture.orderId },
        payloadDigest: fixture.payloadDigest,
      });
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    },
  );

  it.each([
    ["commerce.order", "1.3.0"],
    ["restaurant.ordering", "1.2.0"],
  ] as const)(
    "rejects the invalid historical fixture declared by %s@%s",
    (key, version) => {
      const asset = capabilityAssets.find(
        ({ manifest }) => manifest.key === key && manifest.version === version,
      );
      expect(asset).toBeDefined();
      if (!asset) return;

      const fixture = JSON.parse(
        readFileSync(
          resolve(
            repositoryRoot,
            asset.manifest.packageRoot,
            asset.manifest.verification.fixture,
          ),
          "utf8",
        ),
      );
      const adapter =
        key === "commerce.order"
          ? createCommerceOrderTransactionOperationAdapter()
          : createRestaurantOrderingTransactionOperationAdapter();

      expect(() => adapter.parseRequest(fixture)).toThrow(/payloadDigest/);
    },
  );

  it.each([
    ["commerce.order", "1.3.1"],
    ["restaurant.ordering", "1.2.1"],
  ] as const)(
    "executes the digest-covered declared fixture for %s@%s",
    (key, version) => {
      const asset = capabilityAssets.find(
        ({ manifest }) => manifest.key === key && manifest.version === version,
      );
      expect(asset).toBeDefined();
      if (!asset) return;

      const fixture = JSON.parse(
        readFileSync(
          resolve(
            repositoryRoot,
            asset.manifest.packageRoot,
            asset.manifest.verification.fixture,
          ),
          "utf8",
        ),
      );
      const adapter =
        key === "commerce.order"
          ? createCommerceOrderTransactionOperationAdapter()
          : createRestaurantOrderingTransactionOperationAdapter();

      expect(
        adapter.prepare(adapter.parseRequest(fixture)).command,
      ).toMatchObject({
        aggregate: { entity: "order", id: fixture.orderId },
        payloadDigest: fixture.payloadDigest,
      });
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
      expect(
        resolveCapabilityAssetLock(lockCapabilityAsset(asset)).manifest,
      ).toMatchObject({ key, version });
    },
  );

  it("generic order adapter prepares a bounded order command", () => {
    const adapter = createCommerceOrderTransactionOperationAdapter();
    const prepared = adapter.prepare(
      adapter.parseRequest({
        orderId: "order-42",
        expectedVersion: 3,
        transition: "submit",
        idempotencyKey: "submit-42",
        payloadDigest: `sha256:${"a".repeat(64)}`,
      }),
    );

    expect(prepared.command).toMatchObject({
      aggregate: { entity: "order", id: "order-42", expectedVersion: 3 },
      transition: "submit",
    });
    expect(prepared.context).toEqual({
      orderId: "order-42",
      transition: "submit",
    });
  });

  it("restaurant adapter rejects a request without a declared table session", () => {
    const adapter = createRestaurantOrderingTransactionOperationAdapter();

    expect(() => adapter.parseRequest({ lines: [] })).toThrow("table session");
  });

  it("restaurant adapter prepares typed table, line, payment, and cancellation facts", () => {
    const adapter = createRestaurantOrderingTransactionOperationAdapter();
    const prepared = adapter.prepare(
      adapter.parseRequest({
        orderId: "order-8",
        expectedVersion: 1,
        transition: "cancel",
        idempotencyKey: "cancel-8",
        payloadDigest: `sha256:${"b".repeat(64)}`,
        tableSession: { id: "session-8", tableId: "table-2" },
        lines: [{ menuItemId: "ramen", quantity: 2 }],
        paymentEvidence: { kind: "simulated", reference: "payment-8" },
        cancellationReason: "customer-request",
      }),
    );

    expect(prepared.command.aggregate).toEqual({
      entity: "order",
      id: "order-8",
      expectedVersion: 1,
    });
    expect(prepared.context).toMatchObject({
      tableSession: { id: "session-8", tableId: "table-2" },
      lines: [{ menuItemId: "ramen", quantity: 2 }],
      paymentEvidence: { kind: "simulated", reference: "payment-8" },
      cancellationReason: "customer-request",
    });
  });

  it.each([
    ["commerce.order", "1.3.0"],
    ["restaurant.ordering", "1.2.0"],
  ])(
    "registers %s@%s as the exact operation-adapter provider",
    (key, version) => {
      const asset = capabilityAssets.find(
        ({ manifest }) => manifest.key === key && manifest.version === version,
      );

      expect(asset?.manifest.provides).toContainEqual({
        interfaceKey: "factory.transaction-operation-adapter",
        version: "v1",
      });
      expect(asset?.manifest.executableContributions).toContainEqual(
        expect.objectContaining({
          targetRuntimeInterfaceVersion:
            "factory.transaction-operation-adapter/v1",
        }),
      );
      expect(
        resolveCapabilityAssetLock(lockCapabilityAsset(asset!)).manifest,
      ).toMatchObject({ key, version });
    },
  );

  it.each([
    ["commerce.order", "1.3.0"],
    ["restaurant.ordering", "1.2.0"],
  ] as const)(
    "keeps %s@%s source and evidence digest-covered",
    (key, version) => {
      const asset = capabilityAssets.find(
        ({ manifest }) => manifest.key === key && manifest.version === version,
      );

      expect(asset).toBeDefined();
      if (!asset) return;
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
      const contributions = loadCapabilityAssetContributions(
        asset,
        repositoryRoot,
      );
      expect(contributions).toHaveLength(2);
      expect(
        contributions.find(
          ({ targetRuntimeInterfaceVersion }) =>
            targetRuntimeInterfaceVersion ===
            "factory.transaction-operation-adapter/v1",
        )?.content,
      ).toContain("createStore");
    },
  );
});
