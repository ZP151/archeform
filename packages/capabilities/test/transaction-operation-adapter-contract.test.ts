import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  lockCapabilityAsset,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import { commerceTransactionAssetV2_1_0 } from "../src/assets/commerce/transaction-v2-1-0.js";
import { commerceTransactionAssetV1_0_0 } from "../src/assets/commerce/transaction-v1-0-0.js";
import { commerceTransactionAssetV2_0_0 } from "../src/assets/commerce/transaction-v2-0-0.js";
import {
  resolveCapabilityCompositionForAssets,
  type CapabilitySelectionV1,
} from "../src/composition.js";
import {
  loadCapabilityAssetContributions,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function physicalDigest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function provider(key: string, interfaceKey: string): CapabilityAssetV1 {
  return {
    manifest: {
      apiVersion: "factory.capability/v1",
      key,
      version: "1.0.0",
      category: "commerce",
      name: key,
      description: `Test provider for ${interfaceKey}.`,
      packageRoot: `packages/capabilities/assets/${key}/1.0.0`,
      manifestDigest: `sha256:${key.slice(0, 1).repeat(64)}`,
      lifecycle: "golden",
      profiles: ["simple-ecommerce"],
      effects: [],
      inputSchema: [],
      outputSlots: [],
      templates: [],
      parameters: [],
      provides: [{ interfaceKey, version: "v1" }],
      verification: {
        fixture: "fixtures/default.json",
        contractTest: "tests/contract.json",
        status: "verified",
      },
    },
  };
}

function selection(
  asset: CapabilityAssetV1,
  bindings: CapabilitySelectionV1["bindings"] = {},
): CapabilitySelectionV1 {
  return {
    lock: lockCapabilityAsset(asset),
    bindings: {
      ...bindings,
      ...(asset.manifest.key === "commerce.transaction"
        ? {
            aggregateEntity: { graphSymbol: "graph.domain.order" },
            transactionFlow: { graphSymbol: "graph.flow.order-transaction" },
            actorRole: { graphSymbol: "graph.policy.customer" },
          }
        : {}),
    },
  };
}

const stockMovement = provider(
  "commerce.stock-provider",
  "commerce.stock-movement",
);
const orderEvent = provider("commerce.order-provider", "commerce.order-event");
const operationAdapter = provider(
  "commerce.operation-adapter",
  "factory.transaction-operation-adapter",
);
const secondOperationAdapter = provider(
  "commerce.operation-adapter-two",
  "factory.transaction-operation-adapter",
);

describe("transaction operation adapter contract", () => {
  it("requires exactly one V1 operation adapter provider", () => {
    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            selection(commerceTransactionAssetV2_1_0),
            selection(stockMovement),
            selection(orderEvent),
          ],
        },
        [commerceTransactionAssetV2_1_0, stockMovement, orderEvent],
      ),
    ).toThrow("factory.transaction-operation-adapter@v1' has no provider");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            selection(commerceTransactionAssetV2_1_0),
            selection(stockMovement),
            selection(orderEvent),
            selection(operationAdapter),
            selection(secondOperationAdapter),
          ],
        },
        [
          commerceTransactionAssetV2_1_0,
          stockMovement,
          orderEvent,
          operationAdapter,
          secondOperationAdapter,
        ],
      ),
    ).toThrow(
      "factory.transaction-operation-adapter@v1' has multiple providers",
    );
  });

  it("publishes the bounded operation interface through four exact digest-covered contributions", () => {
    expect(commerceTransactionAssetV2_1_0.manifest.requires).toContainEqual({
      interfaceKey: "factory.transaction-operation-adapter",
      version: "v1",
    });
    expect(
      commerceTransactionAssetV2_1_0.manifest.executableContributions,
    ).toEqual([
      expect.objectContaining({
        id: "commerce-transaction-executor",
        outputSlot: "api.runtime",
        target: "api/src/capabilities/commerce-transaction-executor.ts",
        targetRuntimeInterfaceVersion: "factory.transaction-executor/v1",
      }),
      expect.objectContaining({
        id: "commerce-transaction-schema",
        outputSlot: "database.schema",
      }),
      expect.objectContaining({
        id: "commerce-transaction-migration",
        outputSlot: "database.migration",
      }),
      expect.objectContaining({
        id: "commerce-transaction-journey",
        outputSlot: "test.journey",
      }),
    ]);
  });

  it("preserves historical transaction packages while verifying the V2.1 package bytes", () => {
    expect(commerceTransactionAssetV1_0_0.manifest.manifestDigest).toBe(
      "sha256:4a62a9d7d2953f4397386cc375ec0109c3d666b075ac02eba6dde827389e5b7a",
    );
    expect(commerceTransactionAssetV2_0_0.manifest.manifestDigest).toBe(
      "sha256:a960b040f07da0a948daad23f4566c465df1f997634b507ab386ab77b5fe7b7e",
    );
    expect(verifyCapabilityAssetDigest(commerceTransactionAssetV2_1_0)).toBe(
      true,
    );
    expect(
      verifyCapabilityAssetPackage(
        commerceTransactionAssetV2_1_0,
        repositoryRoot,
      ),
    ).toEqual([]);
    const contributions = loadCapabilityAssetContributions(
      commerceTransactionAssetV2_1_0,
      repositoryRoot,
    );
    expect(contributions).toHaveLength(4);
    for (const contribution of contributions) {
      expect(physicalDigest(contribution.content)).toBe(contribution.digest);
    }
    expect(
      contributions.find(
        ({ target }) =>
          target === "api/src/capabilities/commerce-transaction-executor.ts",
      )?.content,
    ).toContain("TransactionOperationAdapterV1");
  });
});
