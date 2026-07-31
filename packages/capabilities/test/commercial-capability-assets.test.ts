import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  getCapabilityAsset,
  resolveCapabilityComposition,
  type CapabilitySelectionV1,
} from "../src/index.js";
import { lockCapabilityAsset } from "../src/assets/index.js";
import {
  capabilityManifestDigest,
  createVerifiedCapabilityCompositionLock,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

function selection(
  key: string,
  bindings: CapabilitySelectionV1["bindings"],
): CapabilitySelectionV1 {
  return {
    lock: lockCapabilityAsset(getCapabilityAsset(key)),
    bindings,
  };
}

const catalog = selection("commerce.catalog", {
  catalogEntity: { graphSymbol: "graph.domain.catalog-item" },
  catalogPage: { graphSymbol: "graph.page.catalog" },
  customerRole: { graphSymbol: "graph.policy.customer" },
});
const cart = selection("commerce.cart", {
  catalogEntity: { graphSymbol: "graph.domain.catalog-item" },
  orderEntity: { graphSymbol: "graph.domain.order" },
  cartPage: { graphSymbol: "graph.page.cart" },
  customerRole: { graphSymbol: "graph.policy.customer" },
});
const order = selection("commerce.order", {
  orderEntity: { graphSymbol: "graph.domain.order" },
  orderFlow: { graphSymbol: "graph.flow.order-lifecycle" },
});
const identity = () =>
  selection("core.identity-context", {
    principalEntity: { graphSymbol: "graph.domain.principal" },
    sessionEntity: { graphSymbol: "graph.domain.principal-session" },
    defaultRole: { graphSymbol: "graph.policy.customer" },
  });
const location = () =>
  selection("core.location-context", {
    locationEntity: { graphSymbol: "graph.domain.location" },
    contextEntity: { graphSymbol: "graph.domain.location-context" },
    locationCodeField: { graphSymbol: "graph.domain.location-code" },
    customerRole: { graphSymbol: "graph.policy.customer" },
  });
const configuredLine = () =>
  selection("commerce.line-configuration", {
    catalogEntity: { graphSymbol: "graph.domain.catalog-item" },
    lineEntity: { graphSymbol: "graph.domain.configured-line" },
    optionGroupEntity: { graphSymbol: "graph.domain.option-group" },
    optionEntity: { graphSymbol: "graph.domain.option" },
    customerRole: { graphSymbol: "graph.policy.customer" },
    merchantRole: { graphSymbol: "graph.policy.merchant" },
    catalogPage: { graphSymbol: "graph.page.catalog" },
    merchantPage: { graphSymbol: "graph.page.merchant-catalog" },
  });
const inventoryLedger = () =>
  selection("commerce.inventory-ledger", {
    catalogEntity: { graphSymbol: "graph.domain.catalog-item" },
    stockField: { graphSymbol: "graph.domain.stock" },
    movementEntity: { graphSymbol: "graph.domain.stock-movement" },
    orderEntity: { graphSymbol: "graph.domain.order" },
    locationEntity: { graphSymbol: "graph.domain.location" },
    merchantRole: { graphSymbol: "graph.policy.merchant" },
    auditRole: { graphSymbol: "graph.policy.auditor" },
  });

const foundationKeys = [
  "core.identity-context",
  "core.location-context",
  "commerce.line-configuration",
  "commerce.inventory-ledger",
] as const;

describe("commercial capability foundation assets", () => {
  it("resolves the complete provider closure in deterministic dependency order", () => {
    const composition = resolveCapabilityComposition({
      selections: [
        inventoryLedger(),
        location(),
        order,
        identity(),
        configuredLine(),
        cart,
        catalog,
      ],
    });

    expect(composition.resolvedDependencyOrder).toEqual([
      "commerce.catalog",
      "commerce.cart",
      "commerce.order",
      "core.identity-context",
      "core.location-context",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
    ]);
    expect(composition.providedAndRequiredInterfaces).toEqual(
      expect.arrayContaining([
        "provides:core.principal-context@v1",
        "provides:core.location-context@v1",
        "provides:commerce.configured-line@v1",
        "provides:commerce.stock-movement@v1",
        "requires:commerce.catalog-item@v1",
        "requires:commerce.order-event@v1",
        "requires:core.location-context@v1",
      ]),
    );
  });

  it("rejects line configuration before lock creation when location context is absent", () => {
    expect(() =>
      resolveCapabilityComposition({
        selections: [catalog, configuredLine()],
      }),
    ).toThrow(
      "Capability package 'commerce.line-configuration' requirement 'core.location-context@v1' has no provider.",
    );
  });

  it("registers four physical Golden packages with exact interfaces and Graph-symbol bindings", () => {
    const expectedInterfaces = {
      "core.identity-context": {
        provides: [{ interfaceKey: "core.principal-context", version: "v1" }],
        requires: undefined,
      },
      "core.location-context": {
        provides: [{ interfaceKey: "core.location-context", version: "v1" }],
        requires: undefined,
      },
      "commerce.line-configuration": {
        provides: [{ interfaceKey: "commerce.configured-line", version: "v1" }],
        requires: [
          { interfaceKey: "commerce.catalog-item", version: "v1" },
          { interfaceKey: "core.location-context", version: "v1" },
        ],
      },
      "commerce.inventory-ledger": {
        provides: [{ interfaceKey: "commerce.stock-movement", version: "v1" }],
        requires: [
          { interfaceKey: "commerce.catalog-item", version: "v1" },
          { interfaceKey: "commerce.order-event", version: "v1" },
          { interfaceKey: "core.location-context", version: "v1" },
        ],
      },
    } as const;

    for (const key of foundationKeys) {
      const asset = getCapabilityAsset(key);
      const expectedVersion =
        key === "commerce.line-configuration" ? "1.1.0" : "1.0.0";
      expect(asset.manifest).toMatchObject({
        apiVersion: "factory.capability/v1",
        key,
        version: expectedVersion,
        packageRoot: `packages/capabilities/assets/${key}/${expectedVersion}`,
        lifecycle: "golden",
        verification: {
          status: "verified",
          fixtureDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          contractTestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        },
      });
      expect(asset.manifest.provides).toEqual(expectedInterfaces[key].provides);
      expect(asset.manifest.requires).toEqual(expectedInterfaces[key].requires);
      expect(asset.manifest.parameters?.length).toBeGreaterThan(0);
      expect(
        asset.manifest.parameters?.every(
          (parameter) => parameter.type === "graph-symbol",
        ),
      ).toBe(true);
      expect(asset.manifest.templates).toHaveLength(1);
      expect(
        asset.manifest.executableContributions?.length ??
          asset.manifest.runtimeHandlers?.length ??
          0,
      ).toBeGreaterThan(0);
      for (const contribution of asset.manifest.executableContributions ?? []) {
        expect(asset.manifest.outputSlots).toContain(contribution.outputSlot);
      }
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    }
  });

  it("rejects tampered package content during physical verification", async () => {
    const asset = getCapabilityAsset("commerce.line-configuration");
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "factory-commercial-assets-"),
    );
    temporaryRoots.push(temporaryRoot);
    const temporaryPackageRoot = resolve(
      temporaryRoot,
      asset.manifest.packageRoot,
    );
    await cp(
      resolve(repositoryRoot, asset.manifest.packageRoot),
      temporaryPackageRoot,
      { recursive: true },
    );
    const source =
      asset.manifest.executableContributions?.[0]?.source ??
      asset.manifest.templates[0]?.source;
    expect(source).toBeDefined();
    if (!source) return;
    const sourcePath = resolve(temporaryPackageRoot, source);
    const original = await readFile(sourcePath, "utf8");
    await writeFile(sourcePath, `${original}\nexport const tampered = true;\n`);

    expect(verifyCapabilityAssetPackage(asset, temporaryRoot)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/contribution|template/),
        expect.stringContaining("digest does not match"),
      ]),
    );
  });

  it("rejects tampered Foundation evidence before creating a composition lock", async () => {
    const asset = getCapabilityAsset("core.identity-context");
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "factory-commercial-evidence-"),
    );
    temporaryRoots.push(temporaryRoot);
    const temporaryPackageRoot = resolve(
      temporaryRoot,
      asset.manifest.packageRoot,
    );
    await cp(
      resolve(repositoryRoot, asset.manifest.packageRoot),
      temporaryPackageRoot,
      { recursive: true },
    );
    await writeFile(
      resolve(temporaryPackageRoot, asset.manifest.verification.fixture),
      '{"principal":{"status":"disabled"}}\n',
    );

    expect(() =>
      createVerifiedCapabilityCompositionLock(
        {
          graphChecksum:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          selections: [identity()],
        },
        temporaryRoot,
      ),
    ).toThrow("verification evidence digest");
  });

  it("rejects malformed Foundation contract evidence even when the file is present", async () => {
    const asset = getCapabilityAsset("core.identity-context");
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "factory-commercial-contract-"),
    );
    temporaryRoots.push(temporaryRoot);
    const temporaryPackageRoot = resolve(
      temporaryRoot,
      asset.manifest.packageRoot,
    );
    await cp(
      resolve(repositoryRoot, asset.manifest.packageRoot),
      temporaryPackageRoot,
      { recursive: true },
    );
    await writeFile(
      resolve(temporaryPackageRoot, asset.manifest.verification.contractTest),
      "not-json\n",
    );

    expect(verifyCapabilityAssetPackage(asset, temporaryRoot)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("verification evidence digest"),
        expect.stringContaining("contract test invalid JSON"),
      ]),
    );
  });

  it("rejects malformed UTF-8 evidence whose decoded text matches authenticated replacement bytes", async () => {
    const asset = getCapabilityAsset("core.identity-context");
    const temporaryRoot = await mkdtemp(
      join(tmpdir(), "factory-commercial-raw-evidence-"),
    );
    temporaryRoots.push(temporaryRoot);
    const temporaryPackageRoot = resolve(
      temporaryRoot,
      asset.manifest.packageRoot,
    );
    await cp(
      resolve(repositoryRoot, asset.manifest.packageRoot),
      temporaryPackageRoot,
      { recursive: true },
    );
    const validReplacementJson = '{"marker":"\uFFFD"}\n';
    const manifestWithoutDigest = {
      ...asset.manifest,
      manifestDigest: "",
      verification: {
        ...asset.manifest.verification,
        fixtureDigest: `sha256:${createHash("sha256")
          .update(validReplacementJson)
          .digest("hex")}`,
      },
    };
    const manifest = {
      ...manifestWithoutDigest,
      manifestDigest: capabilityManifestDigest(manifestWithoutDigest),
    };
    await writeFile(
      resolve(temporaryPackageRoot, "component.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeFile(
      resolve(temporaryPackageRoot, asset.manifest.verification.fixture),
      Buffer.concat([
        Buffer.from('{"marker":"'),
        Buffer.from([0x80]),
        Buffer.from('"}\n'),
      ]),
    );

    expect(
      verifyCapabilityAssetPackage({ ...asset, manifest }, temporaryRoot),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("fixture invalid UTF-8"),
      ]),
    );
  });
});
