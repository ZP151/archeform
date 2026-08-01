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

describe("Money pricing capability package", () => {
  it("publishes a verified locked money package with only declared contributions", () => {
    const asset = getCapabilityAsset("commerce.money-pricing");

    expect(asset.manifest).toMatchObject({
      key: "commerce.money-pricing",
      version: "1.0.0",
      lifecycle: "golden",
      profiles: ["restaurant-ordering", "simple-ecommerce"],
      provides: expect.arrayContaining([
        { interfaceKey: "commerce.price-quote", version: "v1" },
        { interfaceKey: "commerce.price-snapshot", version: "v1" },
        { interfaceKey: "commerce.refund-allocation", version: "v1" },
      ]),
      outputSlots: [
        "api.runtime",
        "database.schema",
        "database.migration",
        "flow.effect",
        "test.fixture",
      ],
    });
    expect(asset.manifest.executableContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "money-pricing-schema",
          outputSlot: "database.schema",
        }),
        expect.objectContaining({
          id: "money-pricing-migration",
          outputSlot: "database.migration",
        }),
      ]),
    );
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });
});
