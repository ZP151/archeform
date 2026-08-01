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

describe("Identity policy capability package", () => {
  it("publishes a verified, provider-neutral local identity policy package", () => {
    const asset = getCapabilityAsset("core.identity-policy");

    expect(asset.manifest).toMatchObject({
      key: "core.identity-policy",
      version: "1.0.0",
      lifecycle: "golden",
      profiles: ["expense-approval", "simple-ecommerce"],
      provides: expect.arrayContaining([
        { interfaceKey: "identity.principal-context", version: "v1" },
        { interfaceKey: "authorization.decision", version: "v1" },
      ]),
      outputSlots: [
        "api.runtime",
        "api.service",
        "policy.rule",
        "test.fixture",
        "web.navigation",
      ],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });
});
