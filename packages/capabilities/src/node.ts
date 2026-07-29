import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import type {
  CapabilityAssetManifestV1,
  CapabilityAssetV1,
  CapabilityTemplateContributionV1,
} from "./assets/index.js";

export interface ResolvedCapabilityAssetTemplate {
  readonly assetKey: string;
  readonly assetVersion: string;
  readonly source: string;
  readonly target: string;
  readonly outputSlot: CapabilityTemplateContributionV1["outputSlot"];
  readonly digest: string;
  readonly content: string;
}

const templateTargetPrefixes: Readonly<
  Partial<
    Record<CapabilityTemplateContributionV1["outputSlot"], readonly string[]>
  >
> = {
  "api.runtime": ["api/src/capabilities/"],
};

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

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function safePackageRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  );
}

function assertTemplateContribution(
  template: CapabilityTemplateContributionV1,
  packageRoot: string,
): ResolvedCapabilityAssetTemplate {
  if (!safePackageRelativePath(template.source)) {
    throw new Error(
      `Capability template '${template.id}' has an unsafe source path.`,
    );
  }
  if (!safePackageRelativePath(template.target)) {
    throw new Error(
      `Capability template '${template.id}' has an unsafe target path.`,
    );
  }
  const prefixes = templateTargetPrefixes[template.outputSlot];
  if (!prefixes?.some((prefix) => template.target.startsWith(prefix))) {
    throw new Error(
      `Capability template '${template.id}' targets '${template.target}' outside '${template.outputSlot}'.`,
    );
  }
  const sourcePath = resolve(packageRoot, template.source);
  if (!sourcePath.startsWith(`${packageRoot}${sep}`)) {
    throw new Error(
      `Capability template '${template.id}' escapes its package.`,
    );
  }
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Capability template '${template.id}' is missing from its package.`,
    );
  }
  const content = readFileSync(sourcePath, "utf8");
  if (sha256(content) !== template.digest) {
    throw new Error(
      `Capability template '${template.id}' digest does not match.`,
    );
  }
  return {
    assetKey: "",
    assetVersion: "",
    source: template.source,
    target: template.target,
    outputSlot: template.outputSlot,
    digest: template.digest,
    content,
  };
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
    templates?: unknown;
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
  if (canonicalJson(adapter.templates) !== canonicalJson(component.templates)) {
    invalid.push("adapter.json: templates");
  }
  for (const template of component.templates ?? []) {
    try {
      assertTemplateContribution(template, packageRoot);
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `template: ${error.message}`
          : "template: invalid",
      );
    }
  }
  return invalid;
}

export function loadCapabilityAssetTemplates(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): readonly ResolvedCapabilityAssetTemplate[] {
  const invalid = verifyCapabilityAssetPackage(asset, repositoryRoot);
  if (invalid.length) {
    throw new Error(
      `Capability package '${asset.manifest.key}' is invalid: ${invalid.join(", ")}`,
    );
  }
  const packageRoot = resolve(repositoryRoot, asset.manifest.packageRoot);
  const targets = new Set<string>();
  return asset.manifest.templates.map((template) => {
    if (targets.has(template.target)) {
      throw new Error(
        `Capability package '${asset.manifest.key}' declares duplicate template target '${template.target}'.`,
      );
    }
    targets.add(template.target);
    const resolved = assertTemplateContribution(template, packageRoot);
    return {
      ...resolved,
      assetKey: asset.manifest.key,
      assetVersion: asset.manifest.version,
    };
  });
}
