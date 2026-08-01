import { describe, expect, it, vi } from "vitest";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  getCapabilityAsset,
} from "@factory/capabilities";
import * as capabilityRegistry from "@factory/capabilities";
import * as capabilityNode from "@factory/capabilities/node";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";
import * as restaurantRuntimeRenderer from "../src/restaurant-runtime.js";

import {
  generateApplicationBundle,
  resolveTargetContributions,
  type PublishedGraphInput,
} from "../src/index.js";

const graph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: { id: "composed", workspaceId: "local", name: "Composed app" },
  page: { pages: [], navigation: [] },
  domain: {
    entities: [{ key: "item", label: "Item", fields: [], indexes: [] }],
    relations: [],
  },
  policy: { roles: ["operator"], permissions: [] },
  flow: { flows: [] },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
};

const crudManifest = getCapabilityAsset("core.crud").manifest;
const crudLock = {
  key: crudManifest.key,
  version: crudManifest.version,
  packageRoot: crudManifest.packageRoot,
  manifestDigest: crudManifest.manifestDigest,
  lifecycle: crudManifest.lifecycle,
};
const historicalCrudLock = {
  key: "core.crud",
  version: "1.0.0",
  packageRoot: "packages/capabilities/assets/core.crud/1.0.0",
  manifestDigest:
    "sha256:69bad8aab8bf23fe3820bba3d6fcf12e39c17399ae98390910f61e0792e8dfb7",
  lifecycle: "golden" as const,
};
const compositionLock = createCapabilityCompositionLock({
  graphChecksum: hashApplicationGraph(graph),
  selections: [
    {
      lock: crudLock,
      bindings: {
        entityKey: { graphSymbol: "graph.domain.item" },
        routeKey: { graphSymbol: "graph.page.catalog" },
      },
    },
  ],
});
const input: PublishedGraphInput = {
  publishedRevisionId: "published-composed-1",
  graph,
  compositionLock,
};

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

async function withTamperedCrudPackage(
  mutate: (manifest: Record<string, unknown>) => void,
  run: (temporaryRepositoryRoot: string) => void,
) {
  const temporaryRepositoryRoot = await mkdtemp(
    join(tmpdir(), "factory-composition-"),
  );
  try {
    await writeFile(
      join(temporaryRepositoryRoot, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
      "utf8",
    );
    const packageRoot = join(
      temporaryRepositoryRoot,
      "packages/capabilities/assets/core.crud/1.0.1",
    );
    await mkdir(dirname(packageRoot), { recursive: true });
    await cp(
      resolve(repositoryRoot, "packages/capabilities/assets/core.crud/1.0.1"),
      packageRoot,
      { recursive: true },
    );
    for (const filename of ["component.json", "adapter.json"]) {
      const path = join(packageRoot, filename);
      const manifest = JSON.parse(await readFile(path, "utf8")) as Record<
        string,
        unknown
      >;
      mutate(manifest);
      await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
    run(temporaryRepositoryRoot);
  } finally {
    await rm(temporaryRepositoryRoot, { recursive: true, force: true });
  }
}

describe("immutable composition compilation", () => {
  it("resolves an empty persisted lock without reading a capability repository", () => {
    const emptyLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: [],
    });

    expect(
      resolveTargetContributions(
        { ...input, compositionLock: emptyLock },
        { repositoryRoot: resolve(tmpdir(), "missing-factory-repository") },
      ),
    ).toEqual([]);
  });

  it("never substitutes Graph asset locks for an empty persisted composition lock", () => {
    const legacyGraph = structuredClone(graph);
    legacyGraph.integration = {
      providers: [],
      capabilities: [
        {
          key: "crud.create",
          providerId: "factory",
          operation: "create",
        },
      ],
      compositionProfile: "expense-approval",
      assetLocks: [crudLock],
    };
    const emptyLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(legacyGraph),
      selections: [],
    });

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-no-graph-lock-fallback-1",
        graph: legacyGraph,
        compositionLock: emptyLock,
      }),
    ).toThrow("require matching Golden asset locks");

    const restaurantGraph = composeProfileDraft({
      profile: "restaurant-ordering",
    }).graph;
    const emptyRestaurantLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(restaurantGraph),
      selections: [],
    });
    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "published-restaurant-empty-lock-1",
        graph: restaurantGraph,
        compositionLock: emptyRestaurantLock,
      }),
    ).toThrow("require matching Golden asset locks");

    legacyGraph.integration.capabilities = [];
    const noCapabilityLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(legacyGraph),
      selections: [],
    });
    const capabilityLock = generateApplicationBundle({
      publishedRevisionId: "published-empty-capability-lock-1",
      graph: legacyGraph,
      compositionLock: noCapabilityLock,
    }).files.find(({ path }) => path === "capability-lock.json")?.content;

    expect(JSON.parse(capabilityLock ?? "{}").assets).toEqual([]);
  });

  it("selects runtime mode only from persisted composition lock packages", () => {
    const graphWithConflictingLock = structuredClone(graph);
    graphWithConflictingLock.integration = {
      ...graphWithConflictingLock.integration,
      compositionProfile: "expense-approval",
      assetLocks: [historicalCrudLock],
    };
    const persistedLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graphWithConflictingLock),
      selections: compositionLock.packages,
    });

    const runtime = generateApplicationBundle({
      publishedRevisionId: "published-persisted-runtime-mode-1",
      graph: graphWithConflictingLock,
      compositionLock: persistedLock,
    }).files.find(
      ({ path }) => path === "api/src/application-runtime.ts",
    )?.content;

    expect(runtime).toContain(
      'import { getEffectHandler, getRecordHandler, getWorkflowHandler, providedEffects } from "./capabilities/registry.js";',
    );
  });

  it("renders deterministic target contributions from the exact persisted lock", () => {
    const first = resolveTargetContributions(input);
    const second = resolveTargetContributions(input);

    expect(first).toEqual(second);
    expect(first.map(({ path }) => path)).toEqual([
      "database/prisma/fragments/item.prisma",
      "web/src/app/catalog/page.tsx",
    ]);
    expect(first[1]?.content).toContain('data-entity="item"');

    const lockArtifact = generateApplicationBundle(input).files.find(
      ({ path }) => path === "composition-lock.json",
    );
    expect(lockArtifact?.content).toBe(
      `${JSON.stringify(compositionLock, null, 2)}\n`,
    );
  });

  it("compiles different routes and schemas from the same shared package version", () => {
    const application = (input: {
      readonly id: string;
      readonly name: string;
      readonly pageId: string;
      readonly route: string;
      readonly pageTitle: string;
      readonly entityKey: string;
      readonly entityLabel: string;
    }): PublishedGraphInput => {
      const baseGraph: ApplicationGraphV1 = {
        ...graph,
        metadata: {
          id: input.id,
          workspaceId: "local",
          name: input.name,
        },
        page: {
          pages: [
            {
              id: input.pageId,
              route: input.route,
              title: input.pageTitle,
              blocks: [],
            },
          ],
          navigation: [
            {
              id: input.pageId,
              label: input.pageTitle,
              pageId: input.pageId,
            },
          ],
        },
        domain: {
          entities: [
            {
              key: input.entityKey,
              label: input.entityLabel,
              fields: [{ key: "name", type: "string", required: true }],
              indexes: [],
            },
          ],
          relations: [],
          seedData: [
            {
              entity: input.entityKey,
              id: `${input.entityKey}-seed`,
              values: { name: input.entityLabel },
            },
          ],
        },
      };
      const composed = composeCapabilityDraft({
        graph: baseGraph,
        selections: [
          {
            lock: crudLock,
            bindings: {
              entityKey: { graphSymbol: `graph.domain.${input.entityKey}` },
              routeKey: { graphSymbol: `graph.page.${input.pageId}` },
            },
          },
        ],
      });
      const publishedGraph = structuredClone(composed.graph);
      delete publishedGraph.integration.compositionSelections;
      return {
        publishedRevisionId: `published-${input.id}`,
        graph: publishedGraph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(publishedGraph),
          selections: composed.composition.packages,
        }),
      };
    };
    const restaurantInput = application({
      id: "restaurant-shared-commerce",
      name: "Restaurant shared commerce",
      pageId: "menu",
      route: "/menu",
      pageTitle: "Menu",
      entityKey: "menu-item",
      entityLabel: "Menu item",
    });
    const ecommerceInput = application({
      id: "ecommerce-shared-commerce",
      name: "Ecommerce shared commerce",
      pageId: "catalog",
      route: "/catalog",
      pageTitle: "Catalog",
      entityKey: "product",
      entityLabel: "Product",
    });

    expect(restaurantInput.compositionLock.packages[0]?.lock).toEqual(
      ecommerceInput.compositionLock.packages[0]?.lock,
    );
    const restaurant = generateApplicationBundle(restaurantInput);
    const ecommerce = generateApplicationBundle(ecommerceInput);
    expect(restaurant.files).toContainEqual(
      expect.objectContaining({ path: "web/src/app/menu/page.tsx" }),
    );
    expect(ecommerce.files).toContainEqual(
      expect.objectContaining({ path: "web/src/app/catalog/page.tsx" }),
    );
    expect(restaurant.files).toContainEqual(
      expect.objectContaining({
        path: "database/prisma/fragments/menu-item.prisma",
      }),
    );
    expect(ecommerce.files).toContainEqual(
      expect.objectContaining({
        path: "database/prisma/fragments/product.prisma",
      }),
    );
    expect(
      restaurant.files.find(({ path }) => path === "web/app/page-runtime.tsx")
        ?.content,
    ).toContain("Menu");
    expect(
      ecommerce.files.find(({ path }) => path === "web/app/page-runtime.tsx")
        ?.content,
    ).toContain("Catalog");
    expect(
      restaurant.files.find(({ path }) => path === "database/prisma/seed.ts")
        ?.content,
    ).toContain("Menu item");
    expect(
      ecommerce.files.find(({ path }) => path === "database/prisma/seed.ts")
        ?.content,
    ).toContain("Product");
  });

  it("compiles complete immutable Restaurant and Ecommerce composition recipes", () => {
    const publishedProfile = (
      profile: "restaurant-ordering" | "simple-ecommerce",
    ): PublishedGraphInput => {
      const draft = composeDefaultCapabilityDraft({ profile }).graph;
      const selections = draft.integration.compositionSelections!;
      const publishedGraph = structuredClone(draft);
      delete publishedGraph.integration.compositionSelections;

      expect(draft.integration).not.toHaveProperty("assetLocks");
      expect(selections).toHaveLength(
        profile === "restaurant-ordering" ? 18 : 14,
      );
      expect(publishedGraph.integration).not.toHaveProperty(
        "compositionSelections",
      );
      return {
        publishedRevisionId: `published-${profile}-composition`,
        graph: publishedGraph,
        compositionLock: createCapabilityCompositionLock({
          graphChecksum: hashApplicationGraph(publishedGraph),
          selections,
        }),
      };
    };
    const restaurantInput = publishedProfile("restaurant-ordering");
    const ecommerceInput = publishedProfile("simple-ecommerce");

    expect(
      restaurantInput.compositionLock.packages.map(({ lock }) => lock.key),
    ).toEqual(
      expect.arrayContaining([
        "restaurant.table-session",
        "restaurant.ordering",
        "restaurant.kitchen",
        "restaurant.cashier",
        "restaurant.reporting",
      ]),
    );
    expect(
      ecommerceInput.compositionLock.packages.map(({ lock }) => lock.key),
    ).toContain("commerce.simulated-payment");
    expect(
      restaurantInput.compositionLock.packages.map(({ bindings }) => bindings),
    ).not.toEqual(
      ecommerceInput.compositionLock.packages.map(({ bindings }) => bindings),
    );

    const restaurant = generateApplicationBundle(restaurantInput);
    const ecommerce = generateApplicationBundle(ecommerceInput);
    const restaurantFiles = Object.fromEntries(
      restaurant.files.map(({ path, content }) => [path, content]),
    );
    const ecommerceFiles = Object.fromEntries(
      ecommerce.files.map(({ path, content }) => [path, content]),
    );

    expect(restaurantFiles).toHaveProperty(
      "web/src/app/customer-menu/page.tsx",
    );
    expect(ecommerceFiles).toHaveProperty("web/src/app/catalog/page.tsx");
    expect(restaurantFiles).toHaveProperty(
      "database/prisma/fragments/menu-item.prisma",
    );
    expect(ecommerceFiles).toHaveProperty(
      "database/prisma/fragments/product.prisma",
    );
    expect(restaurantFiles["web/app/page-runtime.tsx"]).toContain("Menu");
    expect(ecommerceFiles["web/app/page-runtime.tsx"]).toContain("Catalog");
    expect(restaurantFiles["database/prisma/seed.ts"]).toContain(
      "Margherita pizza",
    );
    expect(ecommerceFiles["database/prisma/seed.ts"]).toContain(
      "Everyday tote",
    );
    expect(
      restaurantFiles["api/src/capabilities/commerce.line-configuration.ts"],
    ).toContain('catalogEntity: "menu-item"');
    expect(
      ecommerceFiles["api/src/capabilities/commerce.line-configuration.ts"],
    ).toContain('catalogEntity: "product"');
    expect(restaurantFiles["api/test/journey.generated.test.ts"]).not.toEqual(
      ecommerceFiles["api/test/journey.generated.test.ts"],
    );
  });

  it("rejects a tampered persisted lock before rendering", () => {
    expect(() =>
      resolveTargetContributions({
        ...input,
        compositionLock: {
          ...compositionLock,
          lockDigest:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      }),
    ).toThrow("composition lock");
  });

  it("rejects a composition lock for a different Published Graph", () => {
    expect(() =>
      resolveTargetContributions({
        ...input,
        graph: { ...graph, metadata: { ...graph.metadata, name: "Tampered" } },
      }),
    ).toThrow("composition lock");
  });

  it("rejects a package that declares a duplicate web.route target", async () => {
    await withTamperedCrudPackage(
      (manifest) => {
        const contributions = manifest.executableContributions as Record<
          string,
          unknown
        >[];
        contributions.push({
          ...contributions[0],
          id: "duplicate-managed-route",
        });
      },
      (temporaryRepositoryRoot) => {
        expect(() =>
          resolveTargetContributions(input, {
            repositoryRoot: temporaryRepositoryRoot,
          }),
        ).toThrow("invalid");
      },
    );
  });

  it("rejects the same rendered web.route target across two locked packages", () => {
    const auditAsset = getCapabilityAsset("core.audit");
    const auditLock = {
      key: auditAsset.manifest.key,
      version: auditAsset.manifest.version,
      packageRoot: auditAsset.manifest.packageRoot,
      manifestDigest: auditAsset.manifest.manifestDigest,
      lifecycle: auditAsset.manifest.lifecycle,
    };
    const collisionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: [
        ...compositionLock.packages,
        {
          lock: auditLock,
          bindings: {
            actorRole: { graphSymbol: "graph.policy.operator" },
          },
        },
      ],
    });
    const crudAsset = getCapabilityAsset("core.crud");
    const crudRoute = capabilityNode
      .loadCapabilityAssetContributions(crudAsset, repositoryRoot)
      .find(({ outputSlot }) => outputSlot === "web.route")!;
    const auditRoute = {
      id: "audit-route",
      outputSlot: "web.route" as const,
      namespace: "packages/core.audit/web/routes/",
      source: crudRoute.source,
      target: "web/src/app/catalog/page.tsx",
      parameterRefs: [],
      targetRuntimeInterfaceVersion: crudRoute.targetRuntimeInterfaceVersion,
      orderingRequirements: [],
      mergeProtocol: "replace-file" as const,
      digest: crudRoute.digest,
    };
    const collisionAsset = {
      ...auditAsset,
      manifest: {
        ...auditAsset.manifest,
        outputSlots: [...auditAsset.manifest.outputSlots, "web.route" as const],
        executableContributions: [auditRoute],
      },
    };
    const resolveAsset = capabilityRegistry.resolveCapabilityAssetLock;
    const loadContributions = capabilityNode.loadCapabilityAssetContributions;
    const resolveSpy = vi
      .spyOn(capabilityRegistry, "resolveCapabilityAssetLock")
      .mockImplementation((lock) =>
        lock.key === auditLock.key ? collisionAsset : resolveAsset(lock),
      );
    const loadSpy = vi
      .spyOn(capabilityNode, "loadCapabilityAssetContributions")
      .mockImplementation((asset, root) =>
        asset.manifest.key === auditLock.key
          ? [
              {
                assetKey: auditLock.key,
                assetVersion: auditLock.version,
                namespace: auditRoute.namespace,
                source: auditRoute.source,
                target: auditRoute.target,
                outputSlot: auditRoute.outputSlot,
                digest: auditRoute.digest,
                content: "export default null;\n",
                targetRuntimeInterfaceVersion:
                  auditRoute.targetRuntimeInterfaceVersion,
              },
            ]
          : loadContributions(asset, root),
      );
    try {
      expect(() =>
        resolveTargetContributions({
          ...input,
          compositionLock: collisionLock,
        }),
      ).toThrow(
        "Capability target collision at 'web/src/app/catalog/page.tsx' between 'core.audit' and 'core.crud'.",
      );
    } finally {
      loadSpy.mockRestore();
      resolveSpy.mockRestore();
    }
  });

  it("rejects a package attempt to replace docker-compose.yml", async () => {
    await withTamperedCrudPackage(
      (manifest) => {
        const contributions = manifest.executableContributions as Record<
          string,
          unknown
        >[];
        if (contributions[0]) contributions[0].target = "docker-compose.yml";
      },
      (temporaryRepositoryRoot) => {
        expect(() =>
          resolveTargetContributions(input, {
            repositoryRoot: temporaryRepositoryRoot,
          }),
        ).toThrow("outside 'web.route'");
      },
    );
  });

  it("rejects a package contribution that collides with a compiler-owned migration", () => {
    const collisionGraph: ApplicationGraphV1 = {
      ...graph,
      integration: {
        ...graph.integration,
        compositionProfile: "restaurant-ordering",
      },
    };
    const auditAsset = getCapabilityAsset("core.audit");
    const auditLock = {
      key: auditAsset.manifest.key,
      version: auditAsset.manifest.version,
      packageRoot: auditAsset.manifest.packageRoot,
      manifestDigest: auditAsset.manifest.manifestDigest,
      lifecycle: auditAsset.manifest.lifecycle,
    };
    const collisionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(collisionGraph),
      selections: [
        ...compositionLock.packages,
        {
          lock: auditLock,
          bindings: {
            actorRole: { graphSymbol: "graph.policy.operator" },
          },
        },
      ],
    });
    const crudAsset = getCapabilityAsset("core.crud");
    const crudSchema = capabilityNode
      .loadCapabilityAssetContributions(crudAsset, repositoryRoot)
      .find(({ outputSlot }) => outputSlot === "database.schema")!;
    const migrationContribution = {
      id: "initial-migration",
      outputSlot: "database.schema" as const,
      namespace: "packages/core.audit/database/migrations/",
      source: crudSchema.source,
      target: "database/prisma/migrations/0001_initial/migration.sql",
      parameterRefs: [],
      targetRuntimeInterfaceVersion: crudSchema.targetRuntimeInterfaceVersion,
      orderingRequirements: [],
      mergeProtocol: "replace-file" as const,
      digest: crudSchema.digest,
    };
    const collisionAsset = {
      ...auditAsset,
      manifest: {
        ...auditAsset.manifest,
        outputSlots: [
          ...auditAsset.manifest.outputSlots,
          "database.schema" as const,
        ],
        executableContributions: [migrationContribution],
      },
    };
    const resolveAsset = capabilityRegistry.resolveCapabilityAssetLock;
    const loadContributions = capabilityNode.loadCapabilityAssetContributions;
    const loadTemplates = capabilityNode.loadCapabilityAssetTemplates;
    const resolveSpy = vi
      .spyOn(capabilityRegistry, "resolveCapabilityAssetLock")
      .mockImplementation((lock) =>
        lock.key === auditLock.key ? collisionAsset : resolveAsset(lock),
      );
    const loadSpy = vi
      .spyOn(capabilityNode, "loadCapabilityAssetContributions")
      .mockImplementation((asset, root) =>
        asset.manifest.key === auditLock.key
          ? [
              {
                assetKey: auditLock.key,
                assetVersion: auditLock.version,
                namespace: migrationContribution.namespace,
                source: migrationContribution.source,
                target: migrationContribution.target,
                outputSlot: migrationContribution.outputSlot,
                digest: migrationContribution.digest,
                content: "-- package migration\n",
                targetRuntimeInterfaceVersion:
                  migrationContribution.targetRuntimeInterfaceVersion,
              },
            ]
          : loadContributions(asset, root),
      );
    const templateSpy = vi
      .spyOn(capabilityNode, "loadCapabilityAssetTemplates")
      .mockImplementation((asset, root) =>
        asset.manifest.key === auditLock.key
          ? loadTemplates(auditAsset, root)
          : loadTemplates(asset, root),
      );
    const rendererSpy = vi
      .spyOn(restaurantRuntimeRenderer, "renderRestaurantRuntime")
      .mockImplementation(() => {
        throw new Error(
          "Content renderer was invoked before generated-path preflight.",
        );
      });

    try {
      expect(() =>
        generateApplicationBundle({
          ...input,
          graph: collisionGraph,
          compositionLock: collisionLock,
        }),
      ).toThrow(
        "Generated output collision at 'database/prisma/migrations/0001_initial/migration.sql'.",
      );
      expect(rendererSpy).not.toHaveBeenCalled();
    } finally {
      rendererSpy.mockRestore();
      templateSpy.mockRestore();
      loadSpy.mockRestore();
      resolveSpy.mockRestore();
    }
  });
});
