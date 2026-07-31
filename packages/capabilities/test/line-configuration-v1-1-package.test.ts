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
  it("publishes one immutable configuration package for every commerce Profile", () => {
    const asset = capabilityAssets.find(
      (candidate) =>
        candidate.manifest.key === "commerce.line-configuration" &&
        candidate.manifest.version === "1.1.0",
    );

    expect(asset).toBeDefined();
    if (!asset) return;

    expect(asset.manifest).toMatchObject({
      key: "commerce.line-configuration",
      version: "1.1.0",
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
    expect(
      getCapabilityAsset("commerce.line-configuration").manifest.version,
    ).toBe("1.0.0");
  });
});
