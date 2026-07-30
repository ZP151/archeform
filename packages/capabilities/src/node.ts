import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import type {
  CapabilityAssetManifestV1,
  CapabilityAssetV1,
  CapabilityExecutableContributionV1,
  CapabilityGraphContributionV1,
  CapabilityOutputSlot,
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

export interface ResolvedCapabilityAssetContribution {
  readonly assetKey: string;
  readonly assetVersion: string;
  readonly namespace: string;
  readonly source: string;
  readonly target: string;
  readonly outputSlot: CapabilityExecutableContributionV1["outputSlot"];
  readonly digest: string;
  readonly content: string;
  readonly targetRuntimeInterfaceVersion: string;
}

const targetPrefixes = {
  "web.component": ["web/src/components/"],
  "web.route": ["web/src/app/"],
  "web.navigation": ["web/src/navigation/"],
  "api.router": ["api/src/routes/"],
  "api.service": ["api/src/services/"],
  "database.schema": ["database/prisma/fragments/"],
  "database.migration": ["database/prisma/migrations/"],
  "flow.handler": ["api/src/flows/handlers/"],
  "policy.rule": ["api/policy/fragments/"],
  "test.fixture": ["api/test/fixtures/"],
  "test.journey": ["api/test/journeys/"],
  "docs.section": ["docs/generated/"],
} as const satisfies Partial<Record<CapabilityOutputSlot, readonly string[]>>;

const legacyTemplateTargetPrefixes: Readonly<
  Partial<Record<CapabilityOutputSlot, readonly string[]>>
> = {
  "api.runtime": ["api/src/capabilities/"],
};

const additiveGraphCollections: Readonly<
  Partial<Record<CapabilityGraphContributionV1["model"], readonly string[]>>
> = {
  page: ["pages", "navigation"],
  domain: ["entities", "relations", "seedData"],
  policy: ["roles", "permissions"],
  flow: ["flows"],
  integration: ["providers", "capabilities"],
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

function insideRoot(root: string, path: string): boolean {
  return path.startsWith(`${root}${sep}`);
}

function templateTargetPrefixesFor(
  outputSlot: CapabilityOutputSlot,
): readonly string[] | undefined {
  return (
    (
      targetPrefixes as Partial<Record<CapabilityOutputSlot, readonly string[]>>
    )[outputSlot] ?? legacyTemplateTargetPrefixes[outputSlot]
  );
}

function assertDeclaredParameterReferences(
  contributionType: "Graph" | "executable",
  contribution: {
    readonly id: string;
    readonly parameterRefs: readonly string[];
  },
  declaredParameters: ReadonlySet<string>,
): void {
  for (const parameterRef of contribution.parameterRefs) {
    if (!declaredParameters.has(parameterRef)) {
      throw new Error(
        `Capability ${contributionType} contribution '${contribution.id}' references undeclared parameter '${parameterRef}'.`,
      );
    }
  }
}

function assertGraphContribution(
  contribution: CapabilityGraphContributionV1,
  declaredParameters: ReadonlySet<string>,
): void {
  assertDeclaredParameterReferences("Graph", contribution, declaredParameters);
  const collections = additiveGraphCollections[contribution.model];
  if (!collections?.includes(contribution.collection)) {
    throw new Error(
      `Capability Graph contribution '${contribution.id}' collection '${contribution.model}.${contribution.collection}' is not an allowed additive collection.`,
    );
  }
  const { digest: _digest, ...unsignedContribution } = contribution;
  if (sha256(canonicalJson(unsignedContribution)) !== contribution.digest) {
    throw new Error(
      `Capability Graph contribution '${contribution.id}' digest does not match.`,
    );
  }
}

function assertExecutableContribution(
  contribution: CapabilityExecutableContributionV1,
  manifest: CapabilityAssetManifestV1,
  packageRoot: string,
): ResolvedCapabilityAssetContribution {
  if (!safePackageRelativePath(contribution.source)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' has an unsafe source path.`,
    );
  }
  if (!safePackageRelativePath(contribution.target)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' has an unsafe target path.`,
    );
  }
  if (!manifest.outputSlots.includes(contribution.outputSlot)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' uses undeclared output slot '${contribution.outputSlot}'.`,
    );
  }
  const prefixes = (
    targetPrefixes as Partial<Record<CapabilityOutputSlot, readonly string[]>>
  )[contribution.outputSlot];
  if (!prefixes?.some((prefix) => contribution.target.startsWith(prefix))) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' targets '${contribution.target}' outside '${contribution.outputSlot}'.`,
    );
  }
  const namespacePath = contribution.namespace.endsWith("/")
    ? contribution.namespace.slice(0, -1)
    : contribution.namespace;
  const namespacePrefix = `packages/${manifest.key}/`;
  if (
    !safePackageRelativePath(namespacePath) ||
    !contribution.namespace.startsWith(namespacePrefix)
  ) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' namespace '${contribution.namespace}' is outside declared namespace '${namespacePrefix}'.`,
    );
  }
  assertDeclaredParameterReferences(
    "executable",
    contribution,
    new Set((manifest.parameters ?? []).map(({ key }) => key)),
  );
  const sourcePath = resolve(packageRoot, contribution.source);
  if (!insideRoot(packageRoot, sourcePath)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' escapes its package.`,
    );
  }
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' is missing from its package.`,
    );
  }
  const content = readFileSync(sourcePath, "utf8");
  if (sha256(content) !== contribution.digest) {
    throw new Error(
      `Capability executable contribution '${contribution.id}' digest does not match.`,
    );
  }
  return {
    assetKey: manifest.key,
    assetVersion: manifest.version,
    namespace: contribution.namespace,
    source: contribution.source,
    target: contribution.target,
    outputSlot: contribution.outputSlot,
    digest: contribution.digest,
    content,
    targetRuntimeInterfaceVersion: contribution.targetRuntimeInterfaceVersion,
  };
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
  const prefixes = templateTargetPrefixesFor(template.outputSlot);
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
  const resolvedRepositoryRoot = resolve(repositoryRoot);
  if (!safePackageRelativePath(asset.manifest.packageRoot)) {
    return ["packageRoot: unsafe package path"];
  }
  const packageRoot = resolve(
    resolvedRepositoryRoot,
    asset.manifest.packageRoot,
  );
  if (!insideRoot(resolvedRepositoryRoot, packageRoot)) {
    return ["packageRoot: escapes repository"];
  }
  const requiredPackageFiles = ["component.json", "adapter.json"];
  const missing = requiredPackageFiles.filter(
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
    parameters?: unknown;
    graphContributions?: unknown;
    executableContributions?: unknown;
  };

  const invalid: string[] = [];
  for (const [evidenceType, relativePath] of [
    ["fixture", asset.manifest.verification.fixture],
    ["contract test", asset.manifest.verification.contractTest],
  ] as const) {
    if (!safePackageRelativePath(relativePath)) {
      invalid.push(`verification: unsafe ${evidenceType} path`);
      continue;
    }
    const evidencePath = resolve(packageRoot, relativePath);
    if (!insideRoot(packageRoot, evidencePath)) {
      invalid.push(`verification: ${evidenceType} escapes package`);
    } else if (!existsSync(evidencePath)) {
      invalid.push(relativePath);
    }
  }
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
  for (const field of [
    "parameters",
    "graphContributions",
    "executableContributions",
  ] as const) {
    if (canonicalJson(adapter[field]) !== canonicalJson(component[field])) {
      invalid.push(`adapter.json: ${field}`);
    }
  }
  const declaredParameters = new Set(
    (component.parameters ?? []).map(({ key }) => key),
  );
  for (const contribution of component.graphContributions ?? []) {
    try {
      assertGraphContribution(contribution, declaredParameters);
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `graph contribution: ${error.message}`
          : "graph contribution: invalid",
      );
    }
  }
  for (const contribution of component.executableContributions ?? []) {
    try {
      assertExecutableContribution(contribution, component, packageRoot);
    } catch (error) {
      invalid.push(
        error instanceof Error
          ? `executable contribution: ${error.message}`
          : "executable contribution: invalid",
      );
    }
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

export function loadCapabilityAssetContributions(
  asset: CapabilityAssetV1,
  repositoryRoot: string,
): readonly ResolvedCapabilityAssetContribution[] {
  const invalid = verifyCapabilityAssetPackage(asset, repositoryRoot);
  if (invalid.length) {
    throw new Error(
      `Capability package '${asset.manifest.key}' is invalid: ${invalid.join(", ")}`,
    );
  }
  const packageRoot = resolve(repositoryRoot, asset.manifest.packageRoot);
  const targets = new Set<string>();
  return (asset.manifest.executableContributions ?? []).map((contribution) => {
    if (targets.has(contribution.target)) {
      throw new Error(
        `Capability package '${asset.manifest.key}' declares duplicate contribution target '${contribution.target}'.`,
      );
    }
    targets.add(contribution.target);
    return assertExecutableContribution(
      contribution,
      asset.manifest,
      packageRoot,
    );
  });
}
