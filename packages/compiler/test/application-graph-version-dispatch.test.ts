import { describe, expect, it } from "vitest";

import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  hashApplicationGraph,
  upgradeApplicationGraphV1ToV2Draft,
  upgradeApplicationGraphV2ToV3Draft,
  type ApplicationGraphV1,
  type PublishedApplicationGraphInput,
} from "@factory/graph";

import {
  generateApplicationBundle,
  generateVersionedApplicationBundle,
  type PublishedApplicationGraphCompilationInput,
} from "../src/index.js";

function validV1Graph(): ApplicationGraphV1 {
  return {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }],
      relations: [],
    },
    policy: { roles: ["employee"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  };
}

function publishedV1(): PublishedApplicationGraphInput {
  const graph = validV1Graph();
  return {
    kind: "published-application-graph",
    status: "published",
    graphVersion: "factory.application-graph/v1",
    revisionId: "published-v1-1",
    revisionNumber: 1,
    graphHash: hashApplicationGraph(graph),
    graph,
  };
}

function publishedV2(): PublishedApplicationGraphInput {
  const source = publishedV1();
  if (source.graphVersion !== "factory.application-graph/v1") {
    throw new Error("Expected the V1 fixture.");
  }
  const upgraded = upgradeApplicationGraphV1ToV2Draft(source, {
    migrationVersion: "factory.application-graph-v1-to-v2/v1",
    targetDraftRevisionId: "draft-v2-1",
    targetDraftRevisionNumber: 1,
    surfaces: [],
    pageUpgrades: [],
    responsiveNavigation: [],
    seedScenarios: [],
    journeys: [],
    fieldAuthorities: [],
    bindingPolicies: [],
  });
  return {
    kind: "published-application-graph",
    status: "published",
    graphVersion: "factory.application-graph/v2",
    revisionId: "published-v2-1",
    revisionNumber: 1,
    graphHash: upgraded.graphHash,
    graph: upgraded.graph,
  };
}

function publishedV3(): PublishedApplicationGraphInput {
  const source = publishedV2();
  if (source.graphVersion !== "factory.application-graph/v2") {
    throw new Error("Expected the V2 fixture.");
  }
  const upgraded = upgradeApplicationGraphV2ToV3Draft(source, {
    migrationVersion: "factory.application-graph-v2-to-v3/v1",
    targetDraftRevisionId: "draft-v3-1",
    targetDraftRevisionNumber: 1,
    journeys: [],
  });
  return {
    kind: "published-application-graph",
    status: "published",
    graphVersion: "factory.application-graph/v3",
    revisionId: "published-v3-1",
    revisionNumber: 1,
    graphHash: upgraded.graphHash,
    graph: upgraded.graph,
  };
}

function versionedInput(
  publishedGraph: PublishedApplicationGraphInput = publishedV1(),
): PublishedApplicationGraphCompilationInput {
  return {
    publishedGraph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: publishedGraph.graphHash,
      selections: [],
    }),
  };
}

describe("Application Graph compiler version dispatch", () => {
  it("delegates a valid Published V1 envelope byte-identically to the legacy compiler", () => {
    const input = versionedInput();
    if (input.publishedGraph.graphVersion !== "factory.application-graph/v1") {
      throw new Error("Expected the V1 fixture.");
    }
    const legacy = generateApplicationBundle({
      publishedRevisionId: input.publishedGraph.revisionId,
      graph: input.publishedGraph.graph,
      compositionLock: input.compositionLock,
    });
    const versioned = generateVersionedApplicationBundle(input);

    expect(versioned).toEqual(legacy);
    expect(versioned.rootDirectory).toBe(legacy.rootDirectory);
    expect(versioned.graphHash).toBe(legacy.graphHash);
    expect(versioned.files.map(({ path }) => path)).toEqual(
      legacy.files.map(({ path }) => path),
    );
    expect(versioned.files.map(({ content }) => content)).toEqual(
      legacy.files.map(({ content }) => content),
    );
    expect(versioned.files.map(({ digest }) => digest)).toEqual(
      legacy.files.map(({ digest }) => digest),
    );
  });

  it.each([
    [
      "factory.application-graph/v2",
      publishedV2,
      "Published Application Graph version 'factory.application-graph/v2' is not supported by the current compiler.",
    ],
    [
      "factory.application-graph/v3",
      publishedV3,
      "Published Application Graph version 'factory.application-graph/v3' is not supported by the current compiler.",
    ],
  ] as const)(
    "rejects a strict valid %s envelope without projection or down-conversion",
    (_version, published, message) => {
      expect(() =>
        generateVersionedApplicationBundle(versionedInput(published())),
      ).toThrow(message);
    },
  );

  it("rejects missing, extra, inherited, and non-plain wrapper fields before adaptation", () => {
    const message =
      "Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.";
    const valid = versionedInput();
    expect(() =>
      generateVersionedApplicationBundle({
        compositionLock: valid.compositionLock,
      } as never),
    ).toThrow(message);
    expect(() =>
      generateVersionedApplicationBundle({
        publishedGraph: valid.publishedGraph,
      } as never),
    ).toThrow(message);
    expect(() =>
      generateVersionedApplicationBundle({
        ...valid,
        target: "next-web",
      } as never),
    ).toThrow(message);

    const inherited = Object.assign(
      Object.create({ publishedGraph: valid.publishedGraph }),
      { compositionLock: valid.compositionLock },
    );
    expect(() => generateVersionedApplicationBundle(inherited)).toThrow(
      message,
    );
    for (const candidate of [null, [], new Date(), "input"]) {
      expect(() =>
        generateVersionedApplicationBundle(candidate as never),
      ).toThrow(message);
    }
  });

  it("rejects symbol and non-enumerable own wrapper extras", () => {
    const message =
      "Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.";
    const symbolExtra = versionedInput() as unknown as Record<
      PropertyKey,
      unknown
    >;
    symbolExtra[Symbol("target")] = "next-web";
    expect(() =>
      generateVersionedApplicationBundle(symbolExtra as never),
    ).toThrow(message);

    const hiddenExtra = versionedInput();
    Object.defineProperty(hiddenExtra, "target", {
      value: "next-web",
      enumerable: false,
    });
    expect(() =>
      generateVersionedApplicationBundle(hiddenExtra as never),
    ).toThrow(message);
  });

  it.each([
    ["accessor publishedGraph", "publishedGraph", true],
    ["accessor compositionLock", "compositionLock", true],
    ["non-enumerable publishedGraph", "publishedGraph", false],
    ["non-enumerable compositionLock", "compositionLock", false],
  ] as const)(
    "rejects an %s descriptor with the exact wrapper error before invoking it",
    (_label, key, accessor) => {
      const message =
        "Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.";
      const valid = versionedInput();
      let getterCalls = 0;
      const candidate: Record<PropertyKey, unknown> = {
        publishedGraph: valid.publishedGraph,
        compositionLock: valid.compositionLock,
      };
      Object.defineProperty(candidate, key, {
        configurable: true,
        enumerable: accessor,
        ...(accessor
          ? {
              get() {
                getterCalls += 1;
                return valid[key];
              },
            }
          : { value: valid[key] }),
      });

      let thrown: unknown;
      try {
        generateVersionedApplicationBundle(candidate as never);
      } catch (error) {
        thrown = error;
      }

      expect(getterCalls).toBe(0);
      expect(thrown).toEqual(new Error(message));
    },
  );

  it("validates the exact wrapper before touching a malformed Published envelope", () => {
    expect(() =>
      generateVersionedApplicationBundle({
        ...versionedInput(),
        publishedGraph: { status: "draft" },
        extra: true,
      } as never),
    ).toThrow(
      "Versioned compilation input must be a plain record with exactly publishedGraph and compositionLock.",
    );
  });

  it("rejects malformed, cross-version, and wrong-hash envelopes in the Graph adapter", () => {
    expect(() =>
      generateVersionedApplicationBundle(
        versionedInput({
          ...publishedV2(),
          graphHash: `sha256:${"8".repeat(64)}`,
        } as never),
      ),
    ).toThrow(/hash does not match/i);
    expect(() =>
      generateVersionedApplicationBundle(
        versionedInput({
          ...publishedV3(),
          graphHash: `sha256:${"9".repeat(64)}`,
        } as never),
      ),
    ).toThrow(/hash does not match/i);
    expect(() =>
      generateVersionedApplicationBundle(
        versionedInput({
          ...publishedV1(),
          graphVersion: "factory.application-graph/v2",
        } as never),
      ),
    ).toThrow(/envelope version does not match/i);
    expect(() =>
      generateVersionedApplicationBundle(
        versionedInput({
          ...publishedV2(),
          graph: { apiVersion: "factory.application-graph/v2" },
        } as never),
      ),
    ).toThrow();
  });

  it("rejects Drafts and preview snapshots before version dispatch", () => {
    const lock = versionedInput().compositionLock;
    expect(() =>
      generateVersionedApplicationBundle({
        publishedGraph: {
          kind: "application-graph-draft-revision",
          status: "draft",
          graphVersion: "factory.application-graph/v3",
        },
        compositionLock: lock,
      } as never),
    ).toThrow(/Composition record is invalid/);
    expect(() =>
      generateVersionedApplicationBundle({
        publishedGraph: {
          apiVersion: "factory.draft-preview-snapshot/v2",
          graphVersion: "factory.application-graph/v3",
          disposition: "preview-only",
          state: "active",
        },
        compositionLock: lock,
      } as never),
    ).toThrow(/Composition record is invalid/);
  });
});
