import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  CapabilityAssetManifestV1,
  CapabilityAssetV1,
} from "./assets/index.js";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function capabilityManifestPayload(
  manifest: CapabilityAssetManifestV1,
): string {
  const { manifestDigest: _manifestDigest, ...unsignedManifest } = manifest;
  return canonicalJson(unsignedManifest);
}

export function capabilityManifestDigest(
  manifest: CapabilityAssetManifestV1,
): string {
  return `sha256:${createHash("sha256")
    .update(capabilityManifestPayload(manifest))
    .digest("hex")}`;
}

export function verifyCapabilityAssetDigest(asset: CapabilityAssetV1): boolean {
  return (
    capabilityManifestDigest(asset.manifest) === asset.manifest.manifestDigest
  );
}

export function verifyCapabilityAssetPackage(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): string[] {
  const packageRoot = resolve(repositoryRoot, asset.manifest.packageRoot);
  const required = [
    "component.json",
    "adapter.json",
    asset.manifest.verification.fixture,
    asset.manifest.verification.contractTest,
  ];
  const missing = required.filter(
    (relativePath) => !existsSync(resolve(packageRoot, relativePath)),
  );
  if (missing.length) return missing;

  const component = JSON.parse(
    readFileSync(resolve(packageRoot, "component.json"), "utf8"),
  ) as CapabilityAssetManifestV1;
  const adapter = JSON.parse(
    readFileSync(resolve(packageRoot, "adapter.json"), "utf8"),
  ) as {
    apiVersion?: string;
    kind?: string;
    source?: unknown;
    outputSlots?: unknown;
  };

  const invalid: string[] = [];
  if (canonicalJson(component) !== canonicalJson(asset.manifest)) {
    invalid.push("component.json: canonical manifest mismatch");
  }
  if (capabilityManifestDigest(component) !== component.manifestDigest) {
    invalid.push("component.json: manifestDigest");
  }
  if (adapter.apiVersion !== "factory.adapter/v1") {
    invalid.push("adapter.json: apiVersion");
  }
  if (adapter.kind !== "declarative") invalid.push("adapter.json: kind");
  if ("source" in adapter) invalid.push("adapter.json: external source");
  if (
    canonicalJson(adapter.outputSlots) !==
    canonicalJson(asset.manifest.outputSlots)
  ) {
    invalid.push("adapter.json: outputSlots");
  }
  return invalid;
}
