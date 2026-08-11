import { describe, expect, it } from "vitest";

import * as browserGraph from "../src/browser.js";
import {
  adaptPublishedApplicationGraph,
  hashApplicationGraph,
  hashApplicationGraphV2,
  upgradeApplicationGraphV1ToV2Draft,
} from "../src/index.js";

function validV1Graph(): Record<string, any> {
  return {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "legacy-app",
      workspaceId: "local-workspace",
      name: "Legacy application",
    },
    page: {
      pages: [{ id: "home", route: "/", title: "Home", blocks: [] }],
      navigation: [
        { id: "home-nav", label: "Home", pageId: "home", icon: "house" },
      ],
    },
    domain: { entities: [], relations: [] },
    policy: { roles: [], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: {
      theme: { mode: "light", tokens: {} },
      locales: ["en"],
    },
  };
}

function publishedV1(): Record<string, any> {
  const graph = validV1Graph();
  return {
    kind: "published-application-graph",
    status: "published",
    graphVersion: "factory.application-graph/v1",
    revisionId: "published-v1-7",
    revisionNumber: 7,
    graphHash: hashApplicationGraph(graph),
    graph,
  };
}

function upgradeContext(): Record<string, any> {
  return {
    migrationVersion: "factory.application-graph-v1-to-v2/v1",
    targetDraftRevisionId: "draft-v2-1",
    targetDraftRevisionNumber: 1,
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-responsive",
        label: "Customer",
        kind: "customer",
        audienceRoles: [],
        device: "responsive",
        entryPageKey: "home",
        navigation: {
          pattern: "topbar",
          items: [{ pageKey: "home", label: "Home", icon: "house" }],
        },
        responsive: { minimumWidth: 320 },
      },
    ],
    pageUpgrades: [
      {
        pageId: "home",
        surfaceKey: "customer-responsive",
        screenIntent: {
          apiVersion: "factory.screen-intent/v1",
          key: "home",
          label: "Home",
          purpose: "discovery",
          primaryJourneyKeys: [],
          entityKeys: [],
          capabilityKeys: [],
          recipeKey: "legacy-home",
          preferredViewport: "responsive",
        },
        recipe: { key: "legacy-home", version: "1.0.0", regions: [] },
      },
    ],
    responsiveNavigation: [
      {
        surfaceKey: "customer-responsive",
        compactAt: 720,
        collapse: "drawer",
      },
    ],
    seedScenarios: [],
    journeys: [],
    fieldAuthorities: [],
    bindingPolicies: [],
  };
}

function publishedV2(): Record<string, any> {
  const upgraded = upgradeApplicationGraphV1ToV2Draft(
    publishedV1() as never,
    upgradeContext() as never,
  );
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

describe("Application Graph V1-to-V2 Draft upgrade", () => {
  it("creates a fresh V2 Draft with immutable Published V1 lineage", () => {
    const source = publishedV1();
    const context = upgradeContext();
    const sourceBytes = JSON.stringify(source);
    const contextBytes = JSON.stringify(context);
    const sourceHash = source.graphHash;

    const upgraded = upgradeApplicationGraphV1ToV2Draft(
      source as never,
      context as never,
    );

    expect(upgraded).toMatchObject({
      kind: "application-graph-draft-revision",
      status: "draft",
      revisionId: "draft-v2-1",
      revisionNumber: 1,
      graphVersion: "factory.application-graph/v2",
      lineage: {
        kind: "application-graph-v1-upgrade",
        migrationVersion: "factory.application-graph-v1-to-v2/v1",
        source: {
          kind: "published-application-graph",
          status: "published",
          graphVersion: "factory.application-graph/v1",
          revisionId: "published-v1-7",
          revisionNumber: 7,
          graphHash: sourceHash,
        },
      },
    });
    expect(upgraded.lineage.source).not.toHaveProperty("graph");
    expect(upgraded.graphHash).toBe(hashApplicationGraphV2(upgraded.graph));
    expect(upgraded.graph.fieldAuthorities).toEqual(context.fieldAuthorities);
    expect(upgraded.graph.metadata).toEqual(source.graph.metadata);
    expect(upgraded.graph.page.pages[0]).toMatchObject({
      ...source.graph.page.pages[0],
      surfaceKey: "customer-responsive",
      screenIntent: context.pageUpgrades[0].screenIntent,
      recipe: context.pageUpgrades[0].recipe,
    });
    expect(JSON.stringify(source)).toBe(sourceBytes);
    expect(JSON.stringify(context)).toBe(contextBytes);
    expect(source.graphHash).toBe(sourceHash);
    expect(upgraded.graph).not.toBe(source.graph);
  });

  it("requires exact one-to-one page upgrade mapping", () => {
    const missing = upgradeContext();
    missing.pageUpgrades = [];
    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        missing as never,
      ),
    ).toThrow(/every V1 page|missing page/i);

    const duplicate = upgradeContext();
    duplicate.pageUpgrades.push(structuredClone(duplicate.pageUpgrades[0]));
    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        duplicate as never,
      ),
    ).toThrow(/exactly one|duplicated/i);

    const unknown = upgradeContext();
    unknown.pageUpgrades[0].pageId = "unknown-page";
    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        unknown as never,
      ),
    ).toThrow(/unknown page/i);
  });

  it("rejects invalid Published source binding and non-positive target revisions", () => {
    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        { ...publishedV1(), graphHash: `sha256:${"9".repeat(64)}` } as never,
        upgradeContext() as never,
      ),
    ).toThrow(/hash/i);

    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        { ...upgradeContext(), targetDraftRevisionNumber: 0 } as never,
      ),
    ).toThrow(/positive|revision/i);

    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        { ...publishedV1(), revisionNumber: 0 } as never,
        upgradeContext() as never,
      ),
    ).toThrow(/positive|revision/i);

    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        {
          ...upgradeContext(),
          targetDraftRevisionId: "published-v1-7",
        } as never,
      ),
    ).toThrow(/new|different/i);

    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        { ...publishedV1(), extra: true } as never,
        upgradeContext() as never,
      ),
    ).toThrow(/Unrecognized key/);

    expect(() =>
      upgradeApplicationGraphV1ToV2Draft(
        publishedV1() as never,
        { ...upgradeContext(), extra: true } as never,
      ),
    ).toThrow(/Unrecognized key/);
  });
});

describe("explicit Published Application Graph adapter", () => {
  it("validates and preserves explicit V1 and V2 branches", () => {
    const v1 = publishedV1();
    const adaptedV1 = adaptPublishedApplicationGraph(v1);
    expect(adaptedV1).toEqual(v1);
    expect(adaptedV1).not.toBe(v1);

    const v2 = publishedV2();
    const adaptedV2 = adaptPublishedApplicationGraph(v2);
    expect(adaptedV2).toEqual(v2);
    expect(adaptedV2.graphVersion).toBe("factory.application-graph/v2");
  });

  it.each([
    ["missing version", ({ graphVersion: _ignored, ...rest }) => rest],
    [
      "unknown version",
      (value) => ({ ...value, graphVersion: "factory.application-graph/v3" }),
    ],
    ["Draft lane", (value) => ({ ...value, status: "draft" })],
    ["extra key", (value) => ({ ...value, compilerTarget: "web" })],
    ["non-positive revision", (value) => ({ ...value, revisionNumber: 0 })],
    [
      "wrong hash",
      (value) => ({ ...value, graphHash: `sha256:${"8".repeat(64)}` }),
    ],
  ] as const)("rejects %s without inference", (_label, mutate) => {
    expect(() =>
      adaptPublishedApplicationGraph(mutate(publishedV1())),
    ).toThrow();
  });

  it("rejects nested extra keys instead of silently normalizing a Published V1 graph", () => {
    const extraNestedKey = publishedV1();
    extraNestedKey.graph.page.pages[0].sourcePath = "src/generated/home.tsx";
    expect(() => adaptPublishedApplicationGraph(extraNestedKey)).toThrow(
      /Unrecognized key|extra key/i,
    );

    const prototypeNamedExtra = publishedV1();
    Object.defineProperty(
      prototypeNamedExtra.graph.page.pages[0],
      "__proto__",
      {
        value: {},
        enumerable: true,
      },
    );
    expect(() => adaptPublishedApplicationGraph(prototypeNamedExtra)).toThrow(
      /Unrecognized key|extra key/i,
    );
  });

  it("rejects inherited Published envelope and Graph fields before normalization", () => {
    const inheritedEnvelopeSource = publishedV1();
    const inheritedEnvelope = Object.assign(
      Object.create({ status: inheritedEnvelopeSource.status }),
      inheritedEnvelopeSource,
    );
    delete inheritedEnvelope.status;
    expect(() => adaptPublishedApplicationGraph(inheritedEnvelope)).toThrow(
      /plain|prototype|own|record/i,
    );

    for (const candidate of [publishedV1(), publishedV2()]) {
      const metadata = candidate.graph.metadata;
      candidate.graph.metadata = Object.assign(
        Object.create({ name: metadata.name }),
        {
          id: metadata.id,
          workspaceId: metadata.workspaceId,
        },
      );
      candidate.graphHash =
        candidate.graphVersion === "factory.application-graph/v1"
          ? hashApplicationGraph(candidate.graph)
          : hashApplicationGraphV2(candidate.graph);
      expect(() => adaptPublishedApplicationGraph(candidate)).toThrow(
        /plain|prototype|own|record/i,
      );
    }
  });

  it("rejects non-plain nested records while allowing null-prototype records", () => {
    class ProviderPayload {
      public readonly result = "untrusted";
    }

    const nonPlain = publishedV1();
    nonPlain.graph.page.pages[0].blocks = [
      {
        id: "custom-block",
        type: "custom-block",
        props: { payload: new ProviderPayload() },
      },
    ];
    nonPlain.graphHash = hashApplicationGraph(nonPlain.graph);
    expect(() => adaptPublishedApplicationGraph(nonPlain)).toThrow(
      /plain|prototype|record/i,
    );

    const nullPrototype = publishedV1();
    nullPrototype.graph.metadata = Object.assign(
      Object.create(null),
      nullPrototype.graph.metadata,
    );
    nullPrototype.graphHash = hashApplicationGraph(nullPrototype.graph);
    expect(adaptPublishedApplicationGraph(nullPrototype)).toEqual(
      nullPrototype,
    );
  });

  it("rejects a cross-version graph and a preview snapshot", () => {
    expect(() =>
      adaptPublishedApplicationGraph({
        ...publishedV1(),
        graphVersion: "factory.application-graph/v2",
      }),
    ).toThrow(/version/i);

    expect(() =>
      adaptPublishedApplicationGraph({
        apiVersion: "factory.draft-preview-snapshot/v1",
        state: "active",
      }),
    ).toThrow();
  });

  it("exports the same browser-safe upgrade, adapter, and V2 hash surface", () => {
    expect(browserGraph.upgradeApplicationGraphV1ToV2Draft).toBe(
      upgradeApplicationGraphV1ToV2Draft,
    );
    expect(browserGraph.adaptPublishedApplicationGraph).toBe(
      adaptPublishedApplicationGraph,
    );
    expect(browserGraph.hashApplicationGraphV2).toBe(hashApplicationGraphV2);
    expect(browserGraph.transitionDraftPreviewSnapshot).toBeTypeOf("function");
  });
});
