import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { currentCapabilityAssets } from "../src/assets/index.js";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("commerce transaction package", () => {
  it("registers the Golden transaction package with all verified assets", () => {
    const assets = currentCapabilityAssets.filter(
      ({ manifest }) => manifest.key === "commerce.transaction",
    );
    const asset = assets[0];

    expect(assets).toHaveLength(1);
    expect(asset).toBeDefined();
    if (!asset) return;

    expect(asset.manifest).toMatchObject({
      apiVersion: "factory.capability/v1",
      bindingContract: "factory.capability-binding/v1",
      key: "commerce.transaction",
      version: "1.0.0",
      packageRoot: "packages/capabilities/assets/commerce.transaction/1.0.0",
      lifecycle: "golden",
      profiles: [
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ],
      provides: [{ interfaceKey: "commerce.transaction", version: "v1" }],
      requires: expect.arrayContaining([
        { interfaceKey: "commerce.stock-movement", version: "v1" },
        { interfaceKey: "commerce.order-event", version: "v1" },
      ]),
      outputSlots: [
        "api.runtime",
        "api.command",
        "database.schema",
        "database.migration",
        "test.fixture",
        "test.journey",
        "flow.handler",
        "docs.section",
      ],
      verification: {
        fixture: "fixtures/default.json",
        fixtureDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        contractTest: "tests/contract.json",
        contractTestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        status: "verified",
      },
    });
    expect(asset.manifest.templates.map(({ target }) => target)).toEqual([
      "api/src/capabilities/commerce-transaction-runtime.ts",
      "database/prisma/fragments/commerce-transaction.prisma",
    ]);
    expect(asset.manifest.parameters).toHaveLength(
      asset.manifest.inputSchema.length,
    );
    expect(
      asset.manifest.parameters?.every(({ type }) => type === "graph-symbol"),
    ).toBe(true);
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });
});
