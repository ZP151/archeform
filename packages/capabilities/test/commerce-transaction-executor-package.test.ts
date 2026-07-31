import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  capabilityAssets,
  currentCapabilityAssets,
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

function physicalDigest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

describe("commerce transaction executor package", () => {
  it("registers V2 as a Golden package while retaining V1 as the current historical lock", () => {
    const current = currentCapabilityAssets.filter(
      ({ manifest }) => manifest.key === "commerce.transaction",
    );
    const v1 = currentCapabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "1.0.0",
    );
    const v2 = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "2.0.0",
    );

    expect(current).toHaveLength(1);
    expect(current[0]?.manifest.version).toBe("1.0.0");
    expect(v1?.manifest.manifestDigest).toBe(
      "sha256:4a62a9d7d2953f4397386cc375ec0109c3d666b075ac02eba6dde827389e5b7a",
    );
    expect(v2?.manifest.lifecycle).toBe("golden");
  });

  it("declares exactly four verified transaction executor contributions", () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "2.0.0",
    );

    expect(asset?.manifest.executableContributions).toEqual([
      expect.objectContaining({
        id: "commerce-transaction-executor",
        outputSlot: "api.runtime",
        target: "api/src/capabilities/commerce-transaction-executor.ts",
        targetRuntimeInterfaceVersion: "factory.transaction-executor/v1",
        mergeProtocol: "replace-file",
      }),
      expect.objectContaining({
        id: "commerce-transaction-schema",
        outputSlot: "database.schema",
        mergeProtocol: "append-fragment",
      }),
      expect.objectContaining({
        id: "commerce-transaction-migration",
        outputSlot: "database.migration",
        mergeProtocol: "append-fragment",
      }),
      expect.objectContaining({
        id: "commerce-transaction-journey",
        outputSlot: "test.journey",
      }),
    ]);
  });

  it("keeps V2 contribution bytes digest-covered and exposes the bounded executor contract", () => {
    const asset = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "2.0.0",
    );

    expect(asset).toBeDefined();
    if (!asset) return;

    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    const contributions = loadCapabilityAssetContributions(
      asset,
      repositoryRoot,
    );
    expect(contributions).toHaveLength(4);
    for (const contribution of contributions) {
      expect(physicalDigest(contribution.content)).toBe(contribution.digest);
    }
    const executor = contributions.find(
      ({ target }) =>
        target === "api/src/capabilities/commerce-transaction-executor.ts",
    )?.content;
    const journey = contributions.find(
      ({ target }) =>
        target === "api/test/journeys/commerce-transaction.journey.ts",
    )?.content;
    expect(executor).toContain("CommerceTransactionStoreV1");
    expect(executor).toContain("transaction(async () =>");
    expect(executor).toContain("applyExpectedAggregateVersion");
    expect(executor).toContain("appendInventoryMovement");
    expect(executor).toContain("appendAuditRecord");
    expect(executor).toContain("appendOutboxEvent");
    expect(executor).toContain("completeReceipt");
    expect(journey).toContain("class InMemoryCommerceTransactionStore");
    expect(journey).toContain('payloadDigest: "sha256:changed"');
    expect(journey).toContain("seedPending(command())");
    expect(journey).toContain('failAt = "audit"');
  });
});
