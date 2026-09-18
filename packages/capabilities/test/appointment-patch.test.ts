import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import {
  getCapabilityAsset,
  resolveCapabilityAssetLock,
} from "../src/index.js";
import { verifyCapabilityAssetPackage } from "../src/node.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const legacyAppointmentLock = {
  key: "scheduling.appointment",
  version: "1.0.0",
  packageRoot: "packages/capabilities/assets/scheduling.appointment/1.0.0",
  manifestDigest:
    "sha256:eb3f409908e2f4708a3523767a27a0d30ad4277f2c89827b97f9e379dc82738b",
  lifecycle: "golden" as const,
};

describe("Appointment capability patch migration", () => {
  it("selects the accepted 1.0.1 package with its exact manifest digest", () => {
    const asset = getCapabilityAsset("scheduling.appointment");
    expect(asset.manifest.version).toBe("1.0.1");
    expect(asset.manifest.packageRoot).toBe(
      "packages/capabilities/assets/scheduling.appointment/1.0.1",
    );
    expect(asset.manifest.manifestDigest).toBe(
      "sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7",
    );
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("keeps the immutable 1.0.0 package resolvable by its historical lock", () => {
    const legacy = resolveCapabilityAssetLock(legacyAppointmentLock);
    expect(legacy.manifest.version).toBe("1.0.0");
    expect(legacy.manifest.packageRoot).toBe(legacyAppointmentLock.packageRoot);
    expect(legacy.manifest.manifestDigest).toBe(
      legacyAppointmentLock.manifestDigest,
    );
  });
});
