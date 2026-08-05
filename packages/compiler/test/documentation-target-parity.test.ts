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
import { documentationTargetPlugin } from "../src/targets/documentation/target.js";

const profiles: readonly FactoryProfile[] = [
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
];

/**
 * Frozen legacy documentation digests captured from generateApplicationBundle
 * on the pre-migration tree (2026-08-06). The plugin must reproduce these
 * exact bytes for every Profile; an intentional change requires a separately
 * documented decision, not a silent refactor drift.
 */
const LEGACY_DIGESTS: Readonly<
  Record<FactoryProfile, Readonly<Record<string, string>>>
> = {
  "expense-approval": {
    "docs/api-reference.md":
      "3799f8b372ff48aa8ba772c3ee63dbc30658e1967f1b54ae0066763c85ded877",
    "docs/entity-relationship.md":
      "157ab27bde49c85b03363dd0b321de1e098091c78ef53d5b3deef53e13cd48c0",
    "docs/permission-matrix.md":
      "d832d9089e26865722f13adfd234e395e714a2b166ceb612830cc063af37a8d1",
    "docs/application.md":
      "dba02075b118e133f1f5cb5ffbc691bb19d98840d09ef4d5beee8f33fff8254c",
  },
  "restaurant-ordering": {
    "docs/api-reference.md":
      "2df7002e78ef0182ebbd52f592b464925381f83b6b72aa966aa42927f1ff2f16",
    "docs/entity-relationship.md":
      "c3a4e015fd4f6cc7bb5789d474de4148b865aacfd7c6cc75255858ee9cc6f899",
    "docs/permission-matrix.md":
      "947741a9aa9d39334d5b273162f912b48dbaa7abb57d4c14a04c9332b8684c79",
    "docs/application.md":
      "7e57ab5992e67412930d5f5750eaa677618bb494e2b1d5831bc2502e64fee8cb",
  },
  "simple-ecommerce": {
    "docs/api-reference.md":
      "c9601a2e36b4f986a399b73bddd37eba27789763a7a85cc555d684c4f1c4cf3f",
    "docs/entity-relationship.md":
      "f582454684aba98191e364d66bef8466377688bf2b03ae059081f6acdcb5d02f",
    "docs/permission-matrix.md":
      "33619df6d5b95aa489aebc6dc7f4cd2055b3628ee0ed55b05921fe58ae221ddc",
    "docs/application.md":
      "45d1c18dcc53fff12ef19aa9263ffe5b3a44873adc3828824bd0b79959f43741",
  },
  "retail-counter": {
    "docs/api-reference.md":
      "5c14933e3448f7361f29437c5a671ae69c25b029a2b78db4af9542d0e1b1421e",
    "docs/entity-relationship.md":
      "37a6b817beb5039abaf70209d3c53edb3bc13031ac9b20d4fc25dba482835553",
    "docs/permission-matrix.md":
      "62f79cc0d7dd13fb46cfcd18b96b033a1403905f1ba17995fabc2d6942076258",
    "docs/application.md":
      "64fe92bb3fd3d6a2fabb7ac1b4f54d1fcadca00200f180252d4a98f12c886c86",
  },
  "grocery-pickup": {
    "docs/api-reference.md":
      "2fa2022dddbe99ec094de68e01a5783c692d58662873831ab3c38a04d749c5a2",
    "docs/entity-relationship.md":
      "d9cd2ad6928b9fec8bf6911a2bac1720d98a381bb365670af1fad34c1f23e316",
    "docs/permission-matrix.md":
      "943653c45f0e4b44efa76b560834907246ce828dbee7ea47cc5f9e617399be59",
    "docs/application.md":
      "130eb5a0740a616daf6b34b5053e8c8ed19557859ecae6a880b37631c0f47ac0",
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

describe("documentation target file/byte/digest parity", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(documentationTargetPlugin);

  it.each(profiles)(
    "renders $profile documentation with exact legacy bytes and digests",
    (profile) => {
      const files = registry.run(
        "documentation",
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
    },
  );

  it("produces the same documentation set from repeated renders", () => {
    const input = buildCompilationInput(compileFor("simple-ecommerce"));
    const first = registry.run("documentation", input);
    const second = registry.run("documentation", input);

    expect(
      first.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    ).toEqual(
      second.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    );
  });
});

describe("documentation target fail-closed validation", () => {
  const completeSet = (): readonly GeneratedFile[] => [
    { path: "docs/api-reference.md", content: "# API reference\n" },
    { path: "docs/entity-relationship.md", content: "# ERD\n" },
    { path: "docs/permission-matrix.md", content: "# Matrix\n" },
    { path: "docs/application.md", content: "# Application\n" },
  ];

  it("accepts the complete documentation set", () => {
    expect(documentationTargetPlugin.validate(completeSet())).toEqual({
      ok: true,
    });
  });

  it("rejects a set missing a declared documentation file", () => {
    const result = documentationTargetPlugin.validate(completeSet().slice(1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "docs/api-reference.md",
          code: "missing.documentation-file",
        }),
      );
    }
  });

  it("rejects an undeclared documentation file", () => {
    const result = documentationTargetPlugin.validate([
      ...completeSet(),
      { path: "docs/unexpected.md", content: "x" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "docs/unexpected.md",
          code: "unexpected.documentation-file",
        }),
      );
    }
  });

  it("rejects an empty documentation file", () => {
    const files = completeSet();
    files[3] = { path: "docs/application.md", content: "" };

    const result = documentationTargetPlugin.validate(files);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "docs/application.md",
          code: "empty.documentation-file",
        }),
      );
    }
  });

  it("rejects a registry run whose validation fails", () => {
    const registry = createCompilerTargetRegistryV1();
    const failing = {
      ...documentationTargetPlugin,
      render: () => completeSet().slice(1),
    };

    registry.register(failing);
    expect(() =>
      registry.run(
        "documentation",
        buildCompilationInput(compileFor("simple-ecommerce")),
      ),
    ).toThrow("validation failed");
  });
});
