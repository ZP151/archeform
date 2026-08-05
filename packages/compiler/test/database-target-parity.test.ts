import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "@factory/capabilities";
import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  buildCompilationInput,
  createCompilerTargetRegistryV1,
  sha256Digest,
  type GeneratedFile,
  type PublishedGraphInput,
} from "../src/index.js";
import { databaseTargetPlugin } from "../src/targets/database/target.js";

const profiles: readonly FactoryProfile[] = [
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
];

/**
 * Frozen legacy database digests captured from generateApplicationBundle on
 * the pre-migration tree (2026-08-06). The plugin must reproduce these exact
 * bytes for every Profile; an intentional change requires a separately
 * documented decision, not a silent refactor drift. The schema digest is
 * identical for `database/prisma/schema.prisma` and `api/prisma/schema.prisma`
 * (the API copy is a byte duplicate); the Restaurant profile carries the
 * specialized runtime schema/migration/seed, and the generic commerce
 * profiles carry the package-owned order-operations persistence fragments.
 */
const LEGACY_DIGESTS: Readonly<
  Record<FactoryProfile, Readonly<Record<string, string>>>
> = {
  "expense-approval": {
    "database/prisma/schema.prisma":
      "3ffa052a9b59176e3ef371f8a3851cf323f2d30edf3129634838cdcc7c3fdcd4",
    "api/prisma/schema.prisma":
      "3ffa052a9b59176e3ef371f8a3851cf323f2d30edf3129634838cdcc7c3fdcd4",
    "database/prisma/migrations/0001_initial/migration.sql":
      "2229af3704a3b919ad43b98472198a197f4da191118e4f441088fa6390fa04a8",
    "database/prisma/seed.ts":
      "463810888e67780ea59619fe70775ca49882c9ed8c46d560f116e3f4a9840532",
  },
  "restaurant-ordering": {
    "database/prisma/schema.prisma":
      "4be4e77f4ceff7c66949c3d89c5ab3c923d1f34c0a45e1fcbcecb49bba23ab0b",
    "api/prisma/schema.prisma":
      "4be4e77f4ceff7c66949c3d89c5ab3c923d1f34c0a45e1fcbcecb49bba23ab0b",
    "database/prisma/migrations/0001_initial/migration.sql":
      "dac861b44af2167057bb09f3cf55962237182814f381a7278b232a939fe134bf",
    "database/prisma/seed.ts":
      "15825eb263325df43d1ba92843517374c54cd8342a1d007749767f85399d52d1",
  },
  "simple-ecommerce": {
    "database/prisma/schema.prisma":
      "6c45c29c45944fd5d4cd3e63d144f98a6e2d2761aab1a384f7b18e50ac23c3a5",
    "api/prisma/schema.prisma":
      "6c45c29c45944fd5d4cd3e63d144f98a6e2d2761aab1a384f7b18e50ac23c3a5",
    "database/prisma/migrations/0001_initial/migration.sql":
      "8b010cfe57ef90e206e313b90854704c6c8cf9cce1391e589f912073c3dce74d",
    "database/prisma/seed.ts":
      "a70835831bd62564b7ab60b36d46dd945e616236fb4f050286c632ae88a84632",
  },
  "retail-counter": {
    "database/prisma/schema.prisma":
      "1b03b93fe1625033ed6dc5065a4c9bf8aca3c0ff96b72156ab720b17d99edc13",
    "api/prisma/schema.prisma":
      "1b03b93fe1625033ed6dc5065a4c9bf8aca3c0ff96b72156ab720b17d99edc13",
    "database/prisma/migrations/0001_initial/migration.sql":
      "4089f842108d95a40384c1d17dc5bbe2e0aa3d08bf674bec32e910cf0b230e61",
    "database/prisma/seed.ts":
      "46c474cce13b796b5e32d8593e85e8adc4a96612d343ae5d682587786e2ac26e",
  },
  "grocery-pickup": {
    "database/prisma/schema.prisma":
      "aef33691e236dbf123c4d332113e43144dc416d552b997e61a01bd55f53ed1cc",
    "api/prisma/schema.prisma":
      "aef33691e236dbf123c4d332113e43144dc416d552b997e61a01bd55f53ed1cc",
    "database/prisma/migrations/0001_initial/migration.sql":
      "8628a630337dad3dd46a2dd7a531b0f1197b6c450987a3c7265eae17dd2a9696",
    "database/prisma/seed.ts":
      "3498eb7d94108bd07954992c103521c2ef805c7ab0f5a6f0fa748d6dbf7fc966",
  },
};

function persistedSelections(
  graph: ApplicationGraphV1,
): readonly CapabilitySelectionV1[] {
  const profile = graph.integration.compositionProfile as
    FactoryProfile | undefined;
  const selectionByKey = new Map(
    profile
      ? composeDefaultCapabilityDraft({
          profile,
        }).graph.integration.compositionSelections?.map((selection) => [
          selection.lock.key,
          selection,
        ])
      : [],
  );
  return (graph.integration.assetLocks ?? []).map((lock) => {
    const selection = selectionByKey.get(lock.key);
    return {
      lock,
      bindings:
        selection?.lock.version === lock.version &&
        selection.lock.manifestDigest === lock.manifestDigest
          ? selection.bindings
          : {},
    };
  });
}

function compileFor(profile: FactoryProfile): PublishedGraphInput {
  const graph = assertValidApplicationGraph(
    composeProfileDraft({ profile }).graph,
  );
  return {
    publishedRevisionId: "parity",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: persistedSelections(graph),
    }),
  };
}

describe("database target file/byte/digest parity", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(databaseTargetPlugin);

  it.each(profiles)(
    "renders $profile database with exact legacy bytes and digests",
    (profile) => {
      const files = registry.run(
        "prisma-postgres",
        buildCompilationInput(compileFor(profile)),
      );
      const byPath = new Map(files.map((file) => [file.path, file.content]));

      for (const [path, legacyDigest] of Object.entries(
        LEGACY_DIGESTS[profile],
      )) {
        const content = byPath.get(path);
        expect(content, `missing ${path}`).toBeDefined();
        expect(sha256Digest(content!)).toBe(legacyDigest);
        expect(Buffer.byteLength(content!, "utf8")).toBeGreaterThan(0);
      }
      expect(files).toHaveLength(4);
      expect(byPath.get("api/prisma/schema.prisma")).toBe(
        byPath.get("database/prisma/schema.prisma"),
      );
    },
  );

  it("produces the same database set from repeated renders", () => {
    const input = buildCompilationInput(compileFor("simple-ecommerce"));
    const first = registry.run("prisma-postgres", input);
    const second = registry.run("prisma-postgres", input);

    expect(
      first.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    ).toEqual(
      second.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    );
  });
});

describe("database target fail-closed validation", () => {
  const completeSet = (): readonly GeneratedFile[] => [
    {
      path: "database/prisma/schema.prisma",
      content: 'generator client {\n  provider = "prisma-client-js"\n}\n',
    },
    {
      path: "api/prisma/schema.prisma",
      content: 'generator client {\n  provider = "prisma-client-js"\n}\n',
    },
    {
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content:
        'CREATE TABLE "Sample" (\n  "id" TEXT NOT NULL PRIMARY KEY\n);\n',
    },
    {
      path: "database/prisma/seed.ts",
      content: 'import { PrismaClient } from "@prisma/client";\n',
    },
  ];

  it("accepts the complete database set", () => {
    expect(databaseTargetPlugin.validate(completeSet())).toEqual({ ok: true });
  });

  it("rejects a set missing a declared database file", () => {
    const result = databaseTargetPlugin.validate(completeSet().slice(1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "database/prisma/schema.prisma",
          code: "missing.database-file",
        }),
      );
    }
  });

  it("rejects an undeclared database file", () => {
    const result = databaseTargetPlugin.validate([
      ...completeSet(),
      { path: "database/prisma/unexpected.prisma", content: "x" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "database/prisma/unexpected.prisma",
          code: "unexpected.database-file",
        }),
      );
    }
  });

  it.each([
    {
      label: "a schema without a generator client",
      path: "database/prisma/schema.prisma",
      content: "model Sample { id String @id }",
    },
    {
      label: "a migration without a CREATE TABLE",
      path: "database/prisma/migrations/0001_initial/migration.sql",
      content: "-- empty migration\n",
    },
    {
      label: "a seed without a prisma import",
      path: "database/prisma/seed.ts",
      content: "export const seed = [];\n",
    },
  ])("rejects $label", ({ path, content }) => {
    const files = completeSet();
    const index = files.findIndex((file) => file.path === path);
    files[index] = { path, content };

    const result = databaseTargetPlugin.validate(files);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path,
          code: "malformed.database-file",
        }),
      );
    }
  });

  it("rejects a registry run whose validation fails", () => {
    const registry = createCompilerTargetRegistryV1();
    const failing = {
      ...databaseTargetPlugin,
      render: () => completeSet().slice(1),
    };

    registry.register(failing);
    expect(() =>
      registry.run(
        "prisma-postgres",
        buildCompilationInput(compileFor("simple-ecommerce")),
      ),
    ).toThrow("validation failed");
  });
});
