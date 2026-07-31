import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { capabilityAssets, getCapabilityAsset } from "../src/index.js";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("Line configuration capability v1.1", () => {
  it("publishes the executable successor while retaining the previous immutable package", () => {
    const asset = capabilityAssets.find(
      (candidate) =>
        candidate.manifest.key === "commerce.line-configuration" &&
        candidate.manifest.version === "1.1.1",
    );

    expect(asset).toBeDefined();
    if (!asset) return;

    expect(asset.manifest).toMatchObject({
      key: "commerce.line-configuration",
      version: "1.1.1",
      lifecycle: "golden",
      profiles: [
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ],
      runtimeHandlers: ["catalogConfiguration"],
      outputSlots: [
        "api.runtime",
        "database.schema",
        "page.block",
        "flow.effect",
        "test.fixture",
      ],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    const previousAsset = capabilityAssets.find(
      (candidate) =>
        candidate.manifest.key === "commerce.line-configuration" &&
        candidate.manifest.version === "1.1.0",
    );
    expect(previousAsset).toBeDefined();
    if (!previousAsset) return;
    expect(verifyCapabilityAssetDigest(previousAsset)).toBe(true);
    expect(verifyCapabilityAssetPackage(previousAsset, repositoryRoot)).toEqual(
      [],
    );
    expect(
      getCapabilityAsset("commerce.line-configuration").manifest.version,
    ).toBe("1.1.1");
  });
});
