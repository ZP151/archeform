import { describe, expect, it, vi } from "vitest";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
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
        { lock: auditLock, bindings: {} },
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
        { lock: auditLock, bindings: {} },
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
      loadSpy.mockRestore();
      resolveSpy.mockRestore();
    }
  });
});
