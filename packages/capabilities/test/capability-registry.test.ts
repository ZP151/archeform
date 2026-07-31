import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  assertGoldenCapabilityAssetLocks,
  assertGoldenCapabilityComposition,
  capabilityCatalog,
  capabilityAssets,
  capabilitiesForProfile,
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  getCapabilityAsset,
  getCapability,
  getProfileComposition,
  profileGraphs,
  resolveCapabilityAssetLock,
  type CapabilityAssetManifestV1,
  type CapabilityAssetV1,
  type CapabilityExecutableContributionV1,
  type CapabilityGraphContributionV1,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "../src/index.js";
import { lockCapabilityAsset } from "../src/assets/index.js";
import {
  capabilityManifestDigest,
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
  loadCapabilityAssetTemplates,
} from "../src/node.js";
import * as capabilityNode from "../src/node.js";
import { validateApplicationGraph } from "@factory/graph";

interface LoadedContribution {
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

type ContributionLoader = (
  asset: CapabilityAssetV1,
  repositoryRoot: string,
) => readonly LoadedContribution[];

const loadCapabilityAssetContributions =
  (
    capabilityNode as typeof capabilityNode & {
      loadCapabilityAssetContributions?: ContributionLoader;
    }
  ).loadCapabilityAssetContributions ??
  (loadCapabilityAssetTemplates as unknown as ContributionLoader);

const executableContent = "export const capability = '{{entityKey}}';\n";

function testDigest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function testCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(testCanonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) => `${JSON.stringify(key)}:${testCanonicalJson(entry)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function contributionDigest(contribution: Record<string, unknown>): string {
  const { digest: _digest, ...unsignedContribution } = contribution;
  return testDigest(testCanonicalJson(unsignedContribution));
}

function executableContribution(
  overrides: Partial<CapabilityExecutableContributionV1> = {},
): CapabilityExecutableContributionV1 {
  return {
    id: "managed-route",
    outputSlot: "web.route",
    namespace: "packages/test.contribution/web/routes/",
    source: "templates/web/route.tsx.tpl",
    target: "web/src/app/{{routeKey}}/page.tsx",
    parameterRefs: ["entityKey", "routeKey"],
    targetRuntimeInterfaceVersion: "factory.web-route/v1",
    orderingRequirements: [],
    mergeProtocol: "replace-file",
    digest: testDigest(executableContent),
    ...overrides,
  };
}

function testContributionAsset(input: {
  readonly executableContributions?: readonly CapabilityExecutableContributionV1[];
  readonly graphContributions?: readonly CapabilityGraphContributionV1[];
  readonly outputSlots?: CapabilityAssetManifestV1["outputSlots"];
  readonly fixture?: string;
  readonly contractTest?: string;
}): CapabilityAssetV1 {
  const registered = getCapabilityAsset("core.crud").manifest;
  const draftManifest: CapabilityAssetManifestV1 = {
    ...registered,
    key: "test.contribution",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/test.contribution/1.0.0",
    manifestDigest: "sha256:placeholder",
    outputSlots: input.outputSlots ?? ["web.route"],
    templates: [],
    parameters: [
      { key: "entityKey", type: "graph-symbol", required: true },
      { key: "routeKey", type: "graph-symbol", required: true },
    ],
    graphContributions: input.graphContributions ?? [],
    executableContributions: input.executableContributions ?? [
      executableContribution(),
    ],
    verification: {
      fixture: input.fixture ?? "fixtures/default.json",
      contractTest: input.contractTest ?? "tests/contract.json",
      status: "verified",
    },
  };
  return {
    manifest: {
      ...draftManifest,
      manifestDigest: capabilityManifestDigest(draftManifest),
    },
  };
}

async function writeTestContributionPackage(
  repositoryRoot: string,
  asset: CapabilityAssetV1,
  sources: Readonly<Record<string, string>> = {
    "templates/web/route.tsx.tpl": executableContent,
  },
  evidence: {
    readonly fixture?: boolean;
    readonly contractTest?: boolean;
  } = {},
): Promise<void> {
  const physicalRoot = resolve(repositoryRoot, asset.manifest.packageRoot);
  await mkdir(physicalRoot, { recursive: true });
  await writeFile(
    resolve(physicalRoot, "component.json"),
    JSON.stringify(asset.manifest, null, 2),
  );
  await writeFile(
    resolve(physicalRoot, "adapter.json"),
    JSON.stringify(
      {
        apiVersion: "factory.adapter/v1",
        kind: "declarative",
        outputSlots: asset.manifest.outputSlots,
        templates: asset.manifest.templates,
        parameters: asset.manifest.parameters,
        graphContributions: asset.manifest.graphContributions,
        executableContributions: asset.manifest.executableContributions,
        contributes: { effects: asset.manifest.effects },
      },
      null,
      2,
    ),
  );
  if (evidence.fixture !== false) {
    const fixturePath = resolve(
      physicalRoot,
      asset.manifest.verification.fixture,
    );
    await mkdir(dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, "{}");
  }
  if (evidence.contractTest !== false) {
    const contractPath = resolve(
      physicalRoot,
      asset.manifest.verification.contractTest,
    );
    await mkdir(dirname(contractPath), { recursive: true });
    await writeFile(contractPath, "{}");
  }
  for (const [source, content] of Object.entries(sources)) {
    const sourcePath = resolve(physicalRoot, source);
    await mkdir(dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, content);
  }
}

async function withTestContributionPackage(
  asset: CapabilityAssetV1,
  assertion: (repositoryRoot: string) => void | Promise<void>,
  sources?: Readonly<Record<string, string>>,
  evidence?: { readonly fixture?: boolean; readonly contractTest?: boolean },
): Promise<void> {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "factory-contribution-"));
  try {
    await writeTestContributionPackage(
      repositoryRoot,
      asset,
      sources,
      evidence,
    );
    await assertion(repositoryRoot);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
}

const historicalExecutableLocks = [
  {
    key: "core.audit",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
    manifestDigest:
      "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
    lifecycle: "golden" as const,
  },
  {
    key: "core.crud",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.crud/1.0.0",
    manifestDigest:
      "sha256:69bad8aab8bf23fe3820bba3d6fcf12e39c17399ae98390910f61e0792e8dfb7",
    lifecycle: "golden" as const,
  },
  {
    key: "core.notification",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.notification/1.0.0",
    manifestDigest:
      "sha256:25eaacb88682dffeb80340ad7dcdd0dc78a49dfcd1eaf1f2bd0a0618750a67b2",
    lifecycle: "golden" as const,
  },
  {
    key: "core.workflow",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/core.workflow/1.0.0",
    manifestDigest:
      "sha256:a16fc83805e0e6b2468b93241374f790ac23b024cee1e8b4a1d54020b93fbd75",
    lifecycle: "golden" as const,
  },
  {
    key: "commerce.inventory",
    version: "1.0.0",
    packageRoot: "packages/capabilities/assets/commerce.inventory/1.0.0",
    manifestDigest:
      "sha256:b503c3ce6ad627a09ec22d26b9a5cd675bfd3e04c6b0f45f9e02a72c5eba5de8",
    lifecycle: "golden" as const,
  },
  {
    key: "commerce.simulated-payment",
    version: "1.0.0",
    packageRoot:
      "packages/capabilities/assets/commerce.simulated-payment/1.0.0",
    manifestDigest:
      "sha256:0dff9794484428c760b0113c543891e3df87cd73f8082c4e15958f88e2b80981",
    lifecycle: "golden" as const,
  },
] as const;

const restaurantOperations = {
  "restaurant.table-session": [
    "table-session.create",
    "table-session.validate",
    "table-session.close",
    "table-session.expire",
  ],
  "restaurant.menu": [
    "menu.category.list",
    "menu.item.list",
    "menu.item.search",
    "menu.item.manage",
    "inventory.adjust",
  ],
  "restaurant.ordering": [
    "order.line.add",
    "order.line.update",
    "order.line.remove",
    "order.submit",
    "order.cancel",
    "order.history",
  ],
  "restaurant.kitchen": [
    "kitchen.ticket.create",
    "kitchen.ticket.accept",
    "kitchen.ticket.prepare",
    "kitchen.ticket.ready",
  ],
  "restaurant.cashier": [
    "payment.simulate",
    "payment.reversal.request",
    "order.serve",
    "receipt.render",
  ],
  "restaurant.reporting": [
    "report.restaurant.summary",
    "report.restaurant.low-stock",
  ],
} as const;

const restaurantOutputSlots = {
  "restaurant.table-session": [
    "api.runtime",
    "api.command",
    "database.schema",
    "flow.effect",
    "web.customer",
    "web.merchant",
    "test.fixture",
  ],
  "restaurant.menu": [
    "api.runtime",
    "api.command",
    "database.schema",
    "web.customer",
    "web.merchant",
    "test.fixture",
  ],
  "restaurant.ordering": [
    "api.runtime",
    "api.command",
    "database.schema",
    "flow.effect",
    "web.customer",
    "realtime.event",
    "test.fixture",
  ],
  "restaurant.kitchen": [
    "api.runtime",
    "api.command",
    "database.schema",
    "flow.effect",
    "web.merchant",
    "realtime.event",
    "test.fixture",
  ],
  "restaurant.cashier": [
    "api.runtime",
    "api.command",
    "database.schema",
    "flow.effect",
    "web.customer",
    "web.merchant",
    "test.fixture",
  ],
  "restaurant.reporting": [
    "api.runtime",
    "report.read-model",
    "web.merchant",
    "test.fixture",
  ],
} as const;

const restaurantAssetKeys = Object.keys(
  restaurantOperations,
) as (keyof typeof restaurantOperations)[];

describe("capability catalog", () => {
  it("locks shared commerce packages at identical versions for Restaurant and Ecommerce", () => {
    const restaurantBaseGraph = structuredClone(
      profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!
        .graph,
    );
    restaurantBaseGraph.metadata.id = "restaurant-composed-proof";
    restaurantBaseGraph.metadata.name = "Restaurant composed proof";

    const ecommerceBaseGraph = structuredClone(
      profileGraphs.find(({ profile }) => profile === "simple-ecommerce")!
        .graph,
    );
    ecommerceBaseGraph.metadata.id = "ecommerce-composed-proof";
    ecommerceBaseGraph.metadata.name = "Ecommerce composed proof";

    const selection = (
      key: string,
      bindings: CapabilitySelectionV1["bindings"],
    ): CapabilitySelectionV1 => ({
      lock: lockCapabilityAsset(getCapabilityAsset(key)),
      bindings,
    });
    const restaurantSelections = [
      selection("core.audit", {
        actorRole: { graphSymbol: "graph.policy.customer" },
      }),
      selection("core.crud", {
        entityKey: { graphSymbol: "graph.domain.menu-item" },
        routeKey: { graphSymbol: "graph.page.customer-menu" },
      }),
      selection("core.notification", {
        recipientRole: { graphSymbol: "graph.policy.customer" },
      }),
      selection("core.workflow", {
        flowKey: { graphSymbol: "graph.flow.restaurant-order" },
      }),
      selection("commerce.catalog", {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        catalogPage: { graphSymbol: "graph.page.customer-menu" },
        customerRole: { graphSymbol: "graph.policy.customer" },
      }),
      selection("commerce.cart", {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        cartPage: { graphSymbol: "graph.page.customer-cart" },
        customerRole: { graphSymbol: "graph.policy.customer" },
      }),
      selection("commerce.inventory", {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        stockField: { graphSymbol: "graph.domain.stock" },
      }),
      selection("commerce.inventory-ledger", {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        stockField: { graphSymbol: "graph.domain.stock" },
        movementEntity: { graphSymbol: "graph.domain.inventory-ledger" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        locationEntity: {
          graphSymbol: "graph.domain.restaurant-location",
        },
        merchantRole: { graphSymbol: "graph.policy.manager" },
        auditRole: { graphSymbol: "graph.policy.manager" },
      }),
      selection("commerce.line-configuration", {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        lineEntity: { graphSymbol: "graph.domain.order-line" },
        optionGroupEntity: {
          graphSymbol: "graph.domain.menu-option-group",
        },
        optionEntity: { graphSymbol: "graph.domain.menu-option" },
        customerRole: { graphSymbol: "graph.policy.customer" },
        merchantRole: { graphSymbol: "graph.policy.manager" },
        catalogPage: { graphSymbol: "graph.page.customer-menu" },
        merchantPage: { graphSymbol: "graph.page.merchant-menu" },
      }),
      selection("commerce.order", {
        orderEntity: { graphSymbol: "graph.domain.order" },
        orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
      }),
      selection("commerce.simulated-payment", {
        orderEntity: { graphSymbol: "graph.domain.order" },
        orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
      }),
      selection("core.identity-context", {
        principalEntity: {
          graphSymbol: "graph.domain.restaurant-principal",
        },
        sessionEntity: { graphSymbol: "graph.domain.table-session" },
        defaultRole: { graphSymbol: "graph.policy.customer" },
      }),
      selection("core.location-context", {
        locationEntity: { graphSymbol: "graph.domain.restaurant-table" },
        contextEntity: { graphSymbol: "graph.domain.table-session" },
        locationCodeField: { graphSymbol: "graph.domain.code" },
        customerRole: { graphSymbol: "graph.policy.customer" },
      }),
    ] as const;
    const ecommerceSelections = [
      selection("core.audit", {
        actorRole: { graphSymbol: "graph.policy.shopper" },
      }),
      selection("core.crud", {
        entityKey: { graphSymbol: "graph.domain.product" },
        routeKey: { graphSymbol: "graph.page.catalog" },
      }),
      selection("core.notification", {
        recipientRole: { graphSymbol: "graph.policy.shopper" },
      }),
      selection("core.workflow", {
        flowKey: { graphSymbol: "graph.flow.ecommerce-order" },
      }),
      selection("commerce.catalog", {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        catalogPage: { graphSymbol: "graph.page.catalog" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
      }),
      selection("commerce.cart", {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        cartPage: { graphSymbol: "graph.page.checkout" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
      }),
      selection("commerce.inventory", {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        stockField: { graphSymbol: "graph.domain.stock" },
      }),
      selection("commerce.inventory-ledger", {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        stockField: { graphSymbol: "graph.domain.stock" },
        movementEntity: { graphSymbol: "graph.domain.stock-movement" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        locationEntity: { graphSymbol: "graph.domain.store" },
        merchantRole: { graphSymbol: "graph.policy.merchant" },
        auditRole: { graphSymbol: "graph.policy.merchant" },
      }),
      selection("commerce.line-configuration", {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        lineEntity: { graphSymbol: "graph.domain.product-line" },
        optionGroupEntity: {
          graphSymbol: "graph.domain.product-option-group",
        },
        optionEntity: { graphSymbol: "graph.domain.product-option" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
        merchantRole: { graphSymbol: "graph.policy.merchant" },
        catalogPage: { graphSymbol: "graph.page.catalog" },
        merchantPage: { graphSymbol: "graph.page.merchant-catalog" },
      }),
      selection("commerce.order", {
        orderEntity: { graphSymbol: "graph.domain.order" },
        orderFlow: { graphSymbol: "graph.flow.ecommerce-order" },
      }),
      selection("commerce.simulated-payment", {
        orderEntity: { graphSymbol: "graph.domain.order" },
        orderFlow: { graphSymbol: "graph.flow.ecommerce-order" },
      }),
      selection("core.identity-context", {
        principalEntity: { graphSymbol: "graph.domain.shopper" },
        sessionEntity: { graphSymbol: "graph.domain.shopper-session" },
        defaultRole: { graphSymbol: "graph.policy.shopper" },
      }),
      selection("core.location-context", {
        locationEntity: { graphSymbol: "graph.domain.store" },
        contextEntity: { graphSymbol: "graph.domain.shopper-session" },
        locationCodeField: { graphSymbol: "graph.domain.code" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
      }),
    ] as const;

    const restaurant = composeCapabilityDraft({
      graph: restaurantBaseGraph,
      selections: restaurantSelections,
    });
    const ecommerce = composeCapabilityDraft({
      graph: ecommerceBaseGraph,
      selections: ecommerceSelections,
    });
    const sharedLocks = (composition: typeof restaurant) =>
      composition.composition.packages.map(({ lock }) => lock);
    const canonicalBindings = (composition: typeof restaurant) =>
      composition.composition.packages.map(({ lock, bindings }) => ({
        key: lock.key,
        bindings,
      }));

    expect(sharedLocks(restaurant)).toEqual(sharedLocks(ecommerce));
    expect(sharedLocks(restaurant)).toHaveLength(13);
    expect(getCapabilityAsset("commerce.catalog").manifest.provides).toEqual([
      { interfaceKey: "commerce.catalog-item", version: "v1" },
    ]);
    expect(getCapabilityAsset("commerce.cart").manifest).toMatchObject({
      requires: [{ interfaceKey: "commerce.catalog-item", version: "v1" }],
      provides: [{ interfaceKey: "commerce.cart", version: "v1" }],
    });
    expect(getCapabilityAsset("commerce.order").manifest).toMatchObject({
      requires: [{ interfaceKey: "commerce.cart", version: "v1" }],
      provides: [{ interfaceKey: "commerce.order-event", version: "v1" }],
    });
    for (const key of ["commerce.inventory", "commerce.simulated-payment"]) {
      expect(getCapabilityAsset(key).manifest.requires).toEqual([
        { interfaceKey: "commerce.order-event", version: "v1" },
      ]);
    }
    expect(canonicalBindings(restaurant)).not.toEqual(
      canonicalBindings(ecommerce),
    );
    expect(ecommerce.composition.packages).toContainEqual(
      expect.objectContaining({
        lock: expect.objectContaining({ key: "commerce.catalog" }),
        bindings: expect.objectContaining({
          customerRole: { graphSymbol: "graph.policy.shopper" },
        }),
      }),
    );
    expect(restaurant.graph.metadata.id).toBe("restaurant-composed-proof");
    expect(ecommerce.graph.metadata.id).toBe("ecommerce-composed-proof");
    expect(restaurant.graph.integration.compositionSelections).toEqual(
      restaurant.composition.packages,
    );
    expect(ecommerce.graph.integration.compositionSelections).toEqual(
      ecommerce.composition.packages,
    );
    expect(restaurantBaseGraph.integration).not.toHaveProperty(
      "compositionSelections",
    );
    expect(ecommerceBaseGraph.integration).not.toHaveProperty(
      "compositionSelections",
    );
    expect(validateApplicationGraph(restaurant.graph)).toEqual([]);
    expect(validateApplicationGraph(ecommerce.graph)).toEqual([]);
  });

  it("rejects a capability selection whose Graph symbol is absent from the base Graph", () => {
    const graph = structuredClone(
      profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!
        .graph,
    );

    expect(() =>
      composeCapabilityDraft({
        graph,
        selections: [
          {
            lock: lockCapabilityAsset(getCapabilityAsset("core.crud")),
            bindings: {
              entityKey: { graphSymbol: "graph.domain.missing-entity" },
              routeKey: { graphSymbol: "graph.page.customer-menu" },
            },
          },
        ],
      }),
    ).toThrow("Graph symbol 'graph.domain.missing-entity' does not exist");
  });

  it("exposes independently composable core and commerce capabilities", () => {
    expect(capabilityCatalog.map((capability) => capability.key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
      "core.identity-context",
      "core.location-context",
      "commerce.catalog",
      "commerce.cart",
      "commerce.line-configuration",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.order",
      "commerce.simulated-payment",
      "restaurant.table-session",
      "restaurant.menu",
      "restaurant.ordering",
      "restaurant.kitchen",
      "restaurant.cashier",
      "restaurant.reporting",
    ]);
  });

  it.each(restaurantAssetKeys)(
    "locks verified Restaurant asset %s with its exact operations",
    (key) => {
      const asset = capabilityAssets.find(
        (candidate) => candidate.manifest.key === key,
      );

      expect(asset?.manifest).toMatchObject({
        apiVersion: "factory.capability/v1",
        key,
        version: "1.0.0",
        category: "restaurant",
        lifecycle: "golden",
        profiles: ["restaurant-ordering"],
        effects: restaurantOperations[key],
        verification: { status: "verified" },
      });
      expect(asset?.manifest.templates.length).toBeGreaterThan(0);
    },
  );

  it.each(restaurantAssetKeys)(
    "bounds Restaurant asset %s templates to its declared output slots",
    (key) => {
      const asset = capabilityAssets.find(
        (candidate) => candidate.manifest.key === key,
      );
      expect(asset).toBeDefined();
      if (!asset) return;

      expect(asset.manifest.outputSlots).toEqual(restaurantOutputSlots[key]);
      expect(asset.manifest.templates).toEqual([
        expect.objectContaining({
          id: "api-capability-module",
          source: "templates/api/capability-module.ts.tpl",
          target: `api/src/capabilities/${key}.ts`,
          outputSlot: "api.runtime",
        }),
      ]);
      for (const template of asset.manifest.templates) {
        expect(asset.manifest.outputSlots).toContain(template.outputSlot);
      }
    },
  );

  it("resolves each catalog entry to an immutable Golden capability asset", () => {
    const asset = getCapabilityAsset("core.audit");

    expect(asset.manifest).toMatchObject({
      apiVersion: "factory.capability/v1",
      key: "core.audit",
      version: "1.0.1",
      lifecycle: "golden",
      packageRoot: "packages/capabilities/assets/core.audit/1.0.1",
    });
    expect(asset.manifest.manifestDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(asset.manifest.outputSlots).toEqual(
      expect.arrayContaining(["api.runtime", "test.fixture"]),
    );
  });

  it("preserves every base executable package lock while defaults select current versions", () => {
    for (const lock of historicalExecutableLocks) {
      expect(getCapabilityAsset(lock.key).manifest.version).toBe(
        lock.key === "commerce.inventory" ? "1.1.0" : "1.0.1",
      );
    }
    expect(() =>
      assertGoldenCapabilityAssetLocks(historicalExecutableLocks, {
        profile: "simple-ecommerce",
        capabilityKeys: [
          "audit.record",
          "data.create",
          "notification.send",
          "flow.transition",
          "inventory.decrement",
          "payment.simulate",
        ],
      }),
    ).not.toThrow();
  });

  it("verifies every registered capability manifest against its declared digest", () => {
    expect(capabilityAssets).toHaveLength(33);
    for (const asset of capabilityAssets) {
      expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    }
  });

  it("ships each Golden asset as a self-contained package with adapter and evidence", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
    }
  });

  it("resolves exactly one digest-verified package-local API template for every Golden asset", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      const templates = loadCapabilityAssetTemplates(asset, repositoryRoot);
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        assetKey: asset.manifest.key,
        outputSlot: "api.runtime",
        source: "templates/api/capability-module.ts.tpl",
        target: `api/src/capabilities/${asset.manifest.key}.ts`,
      });
      expect(templates[0]?.content).toContain("{{asset.key}}");
      expect(templates[0]?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });

  it("loads declared web and database contributions only inside their slots", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    const contributions = loadCapabilityAssetContributions(
      getCapabilityAsset("core.crud"),
      repositoryRoot,
    );

    expect(contributions.map(({ outputSlot }) => outputSlot)).toEqual(
      expect.arrayContaining(["web.route", "database.schema"]),
    );
    expect(contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetKey: "core.crud",
          assetVersion: "1.0.1",
          namespace: "packages/core.crud/web/routes/",
          outputSlot: "web.route",
          target: "web/src/app/{{routeKey}}/page.tsx",
          targetRuntimeInterfaceVersion: "factory.web-route/v1",
        }),
        expect.objectContaining({
          namespace: "packages/core.crud/database/schema/",
          outputSlot: "database.schema",
          target: "database/prisma/fragments/{{entityKey}}.prisma",
          targetRuntimeInterfaceVersion: "factory.prisma-schema/v1",
        }),
      ]),
    );
  });

  it("rejects a route contribution that writes into another package namespace", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution({ namespace: "packages/other.package/web/" }),
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("outside declared namespace");
    });
  });

  it.each([
    ["source", { source: "../route.tsx.tpl" }, "unsafe source path"],
    ["target", { target: "web/src/app/../page.tsx" }, "unsafe target path"],
  ] as const)(
    "rejects an executable contribution with an unsafe %s path",
    async (_pathKind, overrides, expectedMessage) => {
      const asset = testContributionAsset({
        executableContributions: [executableContribution(overrides)],
      });

      await withTestContributionPackage(asset, (repositoryRoot) => {
        expect(() =>
          loadCapabilityAssetContributions(asset, repositoryRoot),
        ).toThrow(expectedMessage);
      });
    },
  );

  it("rejects an executable contribution in an undeclared output slot", async () => {
    const asset = testContributionAsset({
      executableContributions: [executableContribution()],
      outputSlots: ["database.schema"],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("undeclared output slot 'web.route'");
    });
  });

  it("does not authorize executable contributions through a legacy template slot", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution({
          outputSlot: "api.runtime",
          namespace: "packages/test.contribution/api/runtime/",
          target: "api/src/capabilities/test.contribution.ts",
        }),
      ],
      outputSlots: ["api.runtime"],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("outside 'api.runtime'");
    });
  });

  it("rejects duplicate executable targets within one package", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution(),
        executableContribution({
          id: "duplicate-route",
          source: "templates/web/duplicate-route.tsx.tpl",
        }),
      ],
    });

    await withTestContributionPackage(
      asset,
      (repositoryRoot) => {
        expect(() =>
          loadCapabilityAssetContributions(asset, repositoryRoot),
        ).toThrow("duplicate package target");
      },
      {
        "templates/web/route.tsx.tpl": executableContent,
        "templates/web/duplicate-route.tsx.tpl": executableContent,
      },
    );
  });

  it("rejects a target shared by a legacy template and executable contribution", async () => {
    const base = testContributionAsset({
      executableContributions: [
        executableContribution({ target: "web/src/app/shared/page.tsx" }),
      ],
    });
    const draftManifest: CapabilityAssetManifestV1 = {
      ...base.manifest,
      manifestDigest: "sha256:placeholder",
      templates: [
        {
          id: "legacy-route",
          source: "templates/web/legacy-route.tsx.tpl",
          target: "web/src/app/shared/page.tsx",
          outputSlot: "web.route",
          digest: testDigest(executableContent),
        },
      ],
    };
    const asset: CapabilityAssetV1 = {
      manifest: {
        ...draftManifest,
        manifestDigest: capabilityManifestDigest(draftManifest),
      },
    };

    await withTestContributionPackage(
      asset,
      (repositoryRoot) => {
        expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              "duplicate package target 'web/src/app/shared/page.tsx'",
            ),
          ]),
        );
        expect(() =>
          loadCapabilityAssetContributions(asset, repositoryRoot),
        ).toThrow("duplicate package target");
      },
      {
        "templates/web/route.tsx.tpl": executableContent,
        "templates/web/legacy-route.tsx.tpl": executableContent,
      },
    );
  });

  it("rejects a digest-tampered executable contribution", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution({ digest: `sha256:${"a".repeat(64)}` }),
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("digest does not match");
    });
  });

  it("rejects undeclared executable contribution parameter references", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution({ parameterRefs: ["undeclaredParameter"] }),
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("undeclared parameter 'undeclaredParameter'");
    });
  });

  it("rejects undeclared Graph contribution parameter references", async () => {
    const asset = testContributionAsset({
      executableContributions: [],
      graphContributions: [
        {
          id: "managed-entity",
          model: "domain",
          collection: "entities",
          operation: "append",
          parameterRefs: ["undeclaredParameter"],
          digest: `sha256:${"a".repeat(64)}`,
        },
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("undeclared parameter 'undeclaredParameter'");
    });
  });

  it("rejects a Graph contribution outside an additive collection", async () => {
    const asset = testContributionAsset({
      executableContributions: [],
      graphContributions: [
        {
          id: "managed-entity",
          model: "domain",
          collection: "providers",
          operation: "append",
          parameterRefs: ["entityKey"],
          digest: `sha256:${"a".repeat(64)}`,
        },
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("is not an allowed additive collection");
    });
  });

  it("rejects a Graph contribution whose declared digest is invalid", async () => {
    const asset = testContributionAsset({
      executableContributions: [],
      graphContributions: [
        {
          id: "managed-entity",
          model: "domain",
          collection: "entities",
          operation: "append",
          parameterRefs: ["entityKey"],
          digest: `sha256:${"a".repeat(64)}`,
        },
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("Graph contribution 'managed-entity' digest does not match");
    });
  });

  it("rejects verification evidence paths that escape the package", async () => {
    const asset = testContributionAsset({ fixture: "../outside.json" });

    await withTestContributionPackage(
      asset,
      (repositoryRoot) => {
        expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
          expect.arrayContaining([
            expect.stringContaining("unsafe fixture path"),
          ]),
        );
      },
      undefined,
      { fixture: false },
    );
  });

  it.each([
    ["apiVersion", { apiVersion: "not.factory/v9" }],
    ["lifecycle", { lifecycle: "draft" }],
    [
      "Graph operation",
      {
        executableContributions: [],
        graphContributions: [
          (() => {
            const contribution = {
              id: "managed-entity",
              model: "domain",
              collection: "entities",
              operation: "replace",
              parameterRefs: ["entityKey"],
              digest: "sha256:placeholder",
            };
            return {
              ...contribution,
              digest: contributionDigest(contribution),
            };
          })(),
        ],
      },
    ],
    [
      "merge protocol",
      {
        executableContributions: [
          executableContribution({
            mergeProtocol: "concatenate" as "replace-file",
          }),
        ],
      },
    ],
    [
      "runtime interface version",
      {
        executableContributions: [
          executableContribution({
            targetRuntimeInterfaceVersion: "https://runtime.invalid/v1",
          }),
        ],
      },
    ],
  ] as const)(
    "rejects a runtime-invalid component %s",
    async (_case, patch) => {
      const base = testContributionAsset({});
      const draftManifest = {
        ...base.manifest,
        ...patch,
        manifestDigest: "sha256:placeholder",
      } as unknown as CapabilityAssetManifestV1;
      const asset: CapabilityAssetV1 = {
        manifest: {
          ...draftManifest,
          manifestDigest: capabilityManifestDigest(draftManifest),
        },
      };

      await withTestContributionPackage(asset, (repositoryRoot) => {
        expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).not.toEqual(
          [],
        );
        expect(() =>
          loadCapabilityAssetContributions(asset, repositoryRoot),
        ).toThrow("is invalid");
      });
    },
  );

  it("rejects adapter effects that contradict the component manifest", async () => {
    const asset = testContributionAsset({});

    await withTestContributionPackage(asset, async (repositoryRoot) => {
      const adapterPath = resolve(
        repositoryRoot,
        asset.manifest.packageRoot,
        "adapter.json",
      );
      const adapter = JSON.parse(readFileSync(adapterPath, "utf8")) as Record<
        string,
        unknown
      >;
      adapter.contributes = { effects: ["different.effect"] };
      await writeFile(adapterPath, JSON.stringify(adapter, null, 2));

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("adapter.json: contributes.effects"),
        ]),
      );
    });
  });

  it("rejects a package-root junction that resolves outside the repository", async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), "factory-junction-repository-"),
    );
    const externalRoot = await mkdtemp(
      join(tmpdir(), "factory-junction-external-"),
    );
    const asset = testContributionAsset({});
    const linkedPackageRoot = resolve(
      repositoryRoot,
      asset.manifest.packageRoot,
    );
    const externalPackageRoot = resolve(
      externalRoot,
      asset.manifest.packageRoot,
    );

    try {
      await writeTestContributionPackage(externalRoot, asset);
      await mkdir(dirname(linkedPackageRoot), { recursive: true });
      await symlink(externalPackageRoot, linkedPackageRoot, "junction");

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("packageRoot: unsafe physical path"),
        ]),
      );
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("unsafe physical path");
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
      await rm(externalRoot, { recursive: true, force: true });
    }
  });

  it("rejects a generated target that uses a Windows alternate data stream", async () => {
    const asset = testContributionAsset({
      executableContributions: [
        executableContribution({
          target: "web/src/app/page.tsx:alternate-stream",
        }),
      ],
    });

    await withTestContributionPackage(asset, (repositoryRoot) => {
      expect(() =>
        loadCapabilityAssetContributions(asset, repositoryRoot),
      ).toThrow("unsafe target path");
    });
  });

  it("rejects a verification evidence directory in place of a file", async () => {
    const asset = testContributionAsset({});

    await withTestContributionPackage(
      asset,
      async (repositoryRoot) => {
        await mkdir(
          resolve(
            repositoryRoot,
            asset.manifest.packageRoot,
            asset.manifest.verification.fixture,
          ),
          { recursive: true },
        );
        expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
          expect.arrayContaining([
            expect.stringContaining("fixture is not a regular package file"),
          ]),
        );
      },
      undefined,
      { fixture: false },
    );
  });

  it("rejects a changed core audit effect handler template", async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), "factory-changed-handler-"),
    );
    const registered = getCapabilityAsset("core.audit").manifest;
    const packageRoot =
      "packages/capabilities/assets/test.changed-handler/1.0.0";
    const draftManifest = {
      ...registered,
      key: "test.changed-handler",
      packageRoot,
    };
    const manifest = {
      ...draftManifest,
      manifestDigest: capabilityManifestDigest(draftManifest),
    };
    const asset: CapabilityAssetV1 = { manifest };
    const physicalRoot = resolve(repositoryRoot, packageRoot);
    const sourceTemplate = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../assets/core.audit/1.0.0/templates/api/capability-module.ts.tpl",
      ),
      "utf8",
    );

    try {
      await mkdir(resolve(physicalRoot, "templates/api"), { recursive: true });
      await mkdir(resolve(physicalRoot, "fixtures"), { recursive: true });
      await mkdir(resolve(physicalRoot, "tests"), { recursive: true });
      await writeFile(
        resolve(physicalRoot, "component.json"),
        JSON.stringify(manifest, null, 2),
      );
      await writeFile(
        resolve(physicalRoot, "adapter.json"),
        JSON.stringify(
          {
            apiVersion: "factory.adapter/v1",
            kind: "declarative",
            outputSlots: manifest.outputSlots,
            templates: manifest.templates,
            contributes: { effects: manifest.effects },
          },
          null,
          2,
        ),
      );
      await writeFile(resolve(physicalRoot, "fixtures/default.json"), "{}");
      await writeFile(resolve(physicalRoot, "tests/contract.json"), "{}");
      await writeFile(
        resolve(physicalRoot, "templates/api/capability-module.ts.tpl"),
        sourceTemplate.replace(
          "effectHandler: async",
          "effectHandler: async /* changed */",
        ),
      );

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "template: Capability template 'api-capability-module' digest does not match.",
          ),
        ]),
      );
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("rejects a package template that targets outside its declared output slot", async () => {
    const repositoryRoot = await mkdtemp(
      join(tmpdir(), "factory-unsafe-template-"),
    );
    const packageRoot = "packages/capabilities/assets/test.unsafe/1.0.0";
    const template = {
      id: "unsafe-target",
      source: "templates/api/module.ts.tpl",
      target: "../outside.ts",
      outputSlot: "api.runtime" as const,
      digest:
        "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
    };
    const draftManifest = {
      ...getCapabilityAsset("core.audit").manifest,
      key: "test.unsafe",
      packageRoot,
      templates: [template],
      manifestDigest: "sha256:placeholder",
    };
    const manifest = {
      ...draftManifest,
      manifestDigest: capabilityManifestDigest(draftManifest),
    };
    const asset: CapabilityAssetV1 = { manifest };
    const physicalRoot = resolve(repositoryRoot, packageRoot);

    try {
      await mkdir(resolve(physicalRoot, "fixtures"), { recursive: true });
      await mkdir(resolve(physicalRoot, "tests"), { recursive: true });
      await writeFile(
        resolve(physicalRoot, "component.json"),
        JSON.stringify(manifest, null, 2),
      );
      await writeFile(
        resolve(physicalRoot, "adapter.json"),
        JSON.stringify(
          {
            apiVersion: "factory.adapter/v1",
            kind: "declarative",
            outputSlots: manifest.outputSlots,
            templates: manifest.templates,
            contributes: { effects: manifest.effects },
          },
          null,
          2,
        ),
      );
      await writeFile(resolve(physicalRoot, "fixtures/default.json"), "{}");
      await writeFile(resolve(physicalRoot, "tests/contract.json"), "{}");

      expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual(
        expect.arrayContaining([expect.stringContaining("unsafe target path")]),
      );
      expect(() => loadCapabilityAssetTemplates(asset, repositoryRoot)).toThrow(
        "unsafe target path",
      );
    } finally {
      await rm(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("keeps each physical package manifest aligned with its registry contract", () => {
    const repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );

    for (const asset of capabilityAssets) {
      const component = JSON.parse(
        readFileSync(
          resolve(repositoryRoot, asset.manifest.packageRoot, "component.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(component).toEqual(asset.manifest);

      const adapter = JSON.parse(
        readFileSync(
          resolve(repositoryRoot, asset.manifest.packageRoot, "adapter.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(adapter).not.toHaveProperty("source");
      expect(adapter.outputSlots).toEqual(asset.manifest.outputSlots);
    }
  });

  it("rejects a lock that does not exactly match a registered Golden asset", () => {
    expect(() =>
      assertGoldenCapabilityAssetLocks(
        [
          {
            key: "core.audit",
            version: "1.0.0",
            packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
            manifestDigest:
              "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            lifecycle: "golden",
          },
        ],
        { profile: "expense-approval", capabilityKeys: ["audit.record"] },
      ),
    ).toThrow("does not match a registered Golden asset");
  });

  it.each([
    {
      boundary: "API version",
      input: () => ({
        apiVersion: "factory.candidate-capability/v1",
        id: "safe-adapter",
        version: "1.0.0",
        status: "quarantined",
      }),
    },
    {
      boundary: "identity",
      input: () => ({
        ...lockCapabilityAsset(getCapabilityAsset("core.audit")),
        key: "candidate.safe-adapter",
      }),
    },
    {
      boundary: "path",
      input: () => ({
        ...lockCapabilityAsset(getCapabilityAsset("core.audit")),
        packageRoot: "ecosystem/intake/candidates/safe-adapter/1.0.0",
      }),
    },
    {
      boundary: "digest",
      input: () => ({
        ...lockCapabilityAsset(getCapabilityAsset("core.audit")),
        manifestDigest:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      }),
    },
  ])(
    "rejects Candidate $boundary at the Golden registry lock boundary",
    ({ input }) => {
      expect(() => resolveCapabilityAssetLock(input() as never)).toThrow(
        "does not match a registered Golden asset",
      );
    },
  );

  it("returns a complete, deterministic capability set for each initial profile", () => {
    expect(
      capabilitiesForProfile("expense-approval").map(({ key }) => key),
    ).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
    ]);
    expect(
      capabilitiesForProfile("restaurant-ordering").map(({ key }) => key),
    ).toContain("commerce.simulated-payment");
    expect(
      capabilitiesForProfile("simple-ecommerce").map(({ key }) => key),
    ).toContain("commerce.inventory");
  });

  it("rejects unknown capability keys", () => {
    expect(() => getCapability("commerce.unknown")).toThrow(
      "Unknown Factory capability: commerce.unknown",
    );
  });

  it("composes an audit-free Expense Graph without dangling effects or audit policy", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.notification"],
    });

    expect(composition.optionalCapabilities).toEqual(["core.notification"]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "audit.record" }),
        ]),
      }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Restaurant Graph without its terminal notification effect", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
      optionalCapabilities: [],
    });

    expect(composition.optionalCapabilities).toEqual([]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Expense Graph without notification effects", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.audit"],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes an audit-free Ecommerce Graph without audit effects or permissions", () => {
    const composition = composeProfileDraft({
      profile: "simple-ecommerce",
      optionalCapabilities: [],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("rejects duplicate optional capability selections", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["core.audit", "core.audit"],
      }),
    ).toThrow("Optional capability selections must be unique.");
  });

  it("reports the profile and enabled effects in the composition summary", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
    });

    expect(composition.profile).toBe("restaurant-ordering");
    expect(composition.enabledEffects).toEqual(
      expect.arrayContaining(["audit.record", "notification.send"]),
    );
  });

  it("persists selected Golden identities as canonical composition selections", () => {
    const graph = composeDefaultCapabilityDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.audit"],
    }).graph;

    expect(graph.integration.compositionSelections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lock: expect.objectContaining({
            key: "core.audit",
            lifecycle: "golden",
          }),
        }),
        expect.objectContaining({
          lock: expect.objectContaining({
            key: "core.crud",
            lifecycle: "golden",
          }),
        }),
        expect.objectContaining({
          lock: expect.objectContaining({
            key: "core.workflow",
            lifecycle: "golden",
          }),
        }),
      ]),
    );
    expect(graph.integration.compositionSelections).not.toContainEqual(
      expect.objectContaining({
        lock: expect.objectContaining({ key: "core.notification" }),
      }),
    );
    expect(graph.integration).not.toHaveProperty("assetLocks");
    expect(graph.integration).not.toHaveProperty("compositionProfile");
  });

  it("selects the shared commercial Foundation recipe for Restaurant", () => {
    const graph = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph;

    expect(
      graph.integration.compositionSelections
        ?.map(({ lock }) => lock.key)
        .sort(),
    ).toEqual([
      "commerce.cart",
      "commerce.catalog",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.order",
      "commerce.simulated-payment",
      "core.audit",
      "core.crud",
      "core.identity-context",
      "core.location-context",
      "core.notification",
      "core.workflow",
    ]);
    expect(graph.integration).not.toHaveProperty("assetLocks");
  });

  it("assigns every Foundation operation to its exact selected providers", () => {
    const graph = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph;
    const selectedAssets = graph.integration.compositionSelections!.map(
      ({ lock }) => getCapabilityAsset(lock.key),
    );

    const expectedProviders = {
      "audit.record": ["core.audit"],
      "data.create": ["core.crud"],
      "data.read": ["core.crud"],
      "data.update": ["core.crud"],
      "data.delete": ["core.crud"],
      "flow.transition": ["core.workflow"],
      "flow.assign-task": ["core.workflow"],
      "notification.send": ["core.notification"],
      "catalog.list": ["commerce.catalog"],
      "catalog.read": ["commerce.catalog"],
      "cart.add": ["commerce.cart"],
      "cart.remove": ["commerce.cart"],
      "cart.checkout": ["commerce.cart"],
      "inventory.reserve": ["commerce.inventory", "commerce.inventory-ledger"],
      "inventory.release": ["commerce.inventory", "commerce.inventory-ledger"],
      "inventory.decrement": [
        "commerce.inventory",
        "commerce.inventory-ledger",
      ],
      "inventory.adjust": ["commerce.inventory-ledger"],
      "inventory.ledger.read": ["commerce.inventory-ledger"],
      "line.configuration.validate": ["commerce.line-configuration"],
      "line.configuration.price": ["commerce.line-configuration"],
      "line.configuration.availability.manage": ["commerce.line-configuration"],
      "catalog.option-group.manage": ["commerce.line-configuration"],
      "catalog.option.manage": ["commerce.line-configuration"],
      "catalog.option.select": ["commerce.line-configuration"],
      "order.create": ["commerce.order"],
      "order.transition": ["commerce.order"],
      "payment.simulate": ["commerce.simulated-payment"],
      "identity.context.resolve": ["core.identity-context"],
      "identity.context.validate": ["core.identity-context"],
      "location.context.resolve": ["core.location-context"],
      "location.context.validate": ["core.location-context"],
    } as const;

    expect(Object.keys(expectedProviders).sort()).toEqual(
      [
        ...new Set(selectedAssets.flatMap(({ manifest }) => manifest.effects)),
      ].sort(),
    );

    for (const [effect, expected] of Object.entries(expectedProviders)) {
      const providers = selectedAssets.filter((asset) =>
        asset.manifest.effects.includes(effect),
      );
      expect(providers.map(({ manifest }) => manifest.key).sort()).toEqual(
        [...expected].sort(),
      );
    }
  });

  it("keeps the complete Restaurant composition within the declared overlap policy", () => {
    const graph = composeProfileDraft({
      profile: "restaurant-ordering",
    }).graph;
    const selectedAssets = graph.integration.assetLocks!.map((lock) =>
      getCapabilityAsset(lock.key),
    );
    const providersByEffect = new Map<string, string[]>();
    for (const asset of selectedAssets) {
      for (const effect of asset.manifest.effects) {
        providersByEffect.set(effect, [
          ...(providersByEffect.get(effect) ?? []),
          asset.manifest.key,
        ]);
      }
    }

    expect(
      [...providersByEffect.entries()]
        .filter(([, providers]) => providers.length > 1)
        .map(([effect, providers]) => [effect, providers.sort()])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    ).toEqual([
      [
        "inventory.decrement",
        ["commerce.inventory", "commerce.inventory-ledger"],
      ],
      [
        "inventory.release",
        ["commerce.inventory", "commerce.inventory-ledger"],
      ],
      [
        "inventory.reserve",
        ["commerce.inventory", "commerce.inventory-ledger"],
      ],
    ]);
    expect(selectedAssets.map(({ manifest }) => manifest.key)).not.toContain(
      "restaurant.menu",
    );
  });

  it("enforces recipe eligibility without using manifest profile membership", () => {
    const cartLock = {
      key: "commerce.cart",
      version: "1.0.0",
      packageRoot: "packages/capabilities/assets/commerce.cart/1.0.0",
      manifestDigest:
        "sha256:38cf669fe2b0f3bbff51c10980fe3c50cfd9dd7349688576a677c7c12398cd0f",
      lifecycle: "golden" as const,
    };

    expect(() =>
      assertGoldenCapabilityAssetLocks([cartLock], {
        profile: "expense-approval",
        capabilityKeys: ["cart.add"],
      }),
    ).toThrow("is not eligible for recipe 'expense-approval'");

    expect(() =>
      assertGoldenCapabilityAssetLocks([cartLock], {
        profile: "restaurant-ordering",
        capabilityKeys: ["cart.add"],
      }),
    ).toThrow("requires canonical composition selections");
  });

  it("rejects an eligible Restaurant cart-only composition without its catalog provider", () => {
    const baseGraph = structuredClone(
      profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!
        .graph,
    );
    const cartSelection = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph.integration.compositionSelections!.find(
      ({ lock }) => lock.key === "commerce.cart",
    )!;

    expect(() =>
      assertGoldenCapabilityComposition([cartSelection], {
        profile: "restaurant-ordering",
        capabilityKeys: ["cart.add"],
        graph: baseGraph,
      }),
    ).toThrow("requirement 'commerce.catalog-item@v1' has no provider");
  });

  it("admits a dependency-complete Golden commerce composition", () => {
    const baseGraph = structuredClone(
      profileGraphs.find(({ profile }) => profile === "simple-ecommerce")!
        .graph,
    );
    const activeSelections = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    }).graph.integration.compositionSelections!;
    const commerceKeys = new Set([
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "commerce.simulated-payment",
    ]);
    const commerceSelections = activeSelections.filter(({ lock }) =>
      commerceKeys.has(lock.key),
    );
    const context = {
      profile: "simple-ecommerce",
      capabilityKeys: [
        "catalog.list",
        "cart.add",
        "inventory.reserve",
        "order.create",
        "payment.simulate",
      ],
      graph: baseGraph,
    } as const;

    expect(() =>
      assertGoldenCapabilityComposition(
        commerceSelections.filter(({ lock }) => lock.key === "commerce.cart"),
        context,
      ),
    ).toThrow("requirement 'commerce.catalog-item@v1' has no provider");

    const composition = assertGoldenCapabilityComposition(
      commerceSelections,
      context,
    );
    expect(composition.resolvedDependencyOrder).toEqual([
      "commerce.catalog",
      "commerce.cart",
      "commerce.order",
      "commerce.inventory",
      "commerce.simulated-payment",
    ]);
  });

  it("marks catalog-supported audit and notification capabilities as locked recipe requirements", () => {
    expect(
      getProfileComposition("restaurant-ordering").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.audit");
    expect(
      getProfileComposition("simple-ecommerce").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.notification");
  });

  it("rejects optional capability selections that are not declared by the profile recipe", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["commerce.cart"],
      }),
    ).toThrow(
      "Optional capability 'commerce.cart' is not supported by profile 'expense-approval'.",
    );
    expect(() =>
      getProfileComposition("not-a-profile" as FactoryProfile),
    ).toThrow("Unknown Factory profile 'not-a-profile'.");
  });

  it("ships independently valid Graph starters for the accepted profiles", () => {
    expect(profileGraphs.map(({ profile }) => profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ]);
    for (const profile of profileGraphs) {
      expect(validateApplicationGraph(profile.graph)).toEqual([]);
    }
  });

  it("ships deterministic catalog seed scenarios for Restaurant and Ecommerce", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    const ecommerce = profileGraphs.find(
      ({ profile }) => profile === "simple-ecommerce",
    )!.graph;

    expect(restaurant.domain.seedData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "menu-item" }),
      ]),
    );
    expect(ecommerce.domain.seedData).toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "product" })]),
    );
  });

  it("declares cart and inventory operations for each commerce profile", () => {
    for (const profile of [
      "restaurant-ordering",
      "simple-ecommerce",
    ] as const) {
      const graph = profileGraphs.find(
        (entry) => entry.profile === profile,
      )!.graph;
      expect(
        graph.integration.capabilities.map((capability) => capability.key),
      ).toEqual(
        expect.arrayContaining([
          "cart.add",
          "inventory.decrement",
          "payment.simulate",
        ]),
      );
    }
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(
      restaurant.domain.entities.find((entity) => entity.key === "menu-item")!
        .fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stock", type: "integer" }),
      ]),
    );
  });

  it("grants the Restaurant manager read-only audit access to generated capability evidence", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(restaurant.policy.permissions).toContainEqual({
      role: "manager",
      resource: "order",
      actions: ["read", "audit"],
    });
  });
});
