import { describe, expect, it } from "vitest";

import * as browserGraph from "../src/browser.js";
import {
  hashApplicationGraph,
  hashApplicationGraphV2,
  hashApplicationGraphV3,
  upgradeApplicationGraphV1ToV2Draft,
} from "../src/index.js";
import {
  adaptPublishedApplicationGraph,
  upgradeApplicationGraphV2ToV3Draft,
  type ApplicationGraphV2ToV3UpgradeContext,
  type PublishedApplicationGraphV3Input,
} from "../src/application-graph-adapter.js";

function validV1Graph(): Record<string, any> {
  return {
    apiVersion: "factory.application-graph/v1",
    metadata: {
      id: "legacy-app",
      workspaceId: "local-workspace",
      name: "Legacy application",
    },
    page: {
      pages: [
        {
          id: "home",
          route: "/",
          title: "Home",
          blocks: [
            {
              id: "summary",
              type: "summary",
              entity: "order",
              bindings: {
                note: "graph.domain.order.note",
                title: "graph.domain.order.title",
              },
            },
          ],
        },
      ],
      navigation: [
        { id: "home-nav", label: "Home", pageId: "home", icon: "house" },
      ],
    },
    domain: {
      entities: [
        {
          key: "order",
          label: "Order",
          fields: [
            { key: "note", type: "text", required: false },
            { key: "title", type: "string", required: false },
          ],
          indexes: [],
        },
      ],
      relations: [],
    },
    policy: { roles: ["customer"], permissions: [] },
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
        audienceRoles: ["customer"],
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
          entityKeys: ["order"],
          capabilityKeys: [],
          recipeKey: "legacy-home",
          preferredViewport: "responsive",
        },
        recipe: {
          key: "legacy-home",
          version: "1.0.0",
          regions: [{ key: "main", blockIds: ["summary"] }],
        },
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
    fieldAuthorities: [
      { entityKey: "order", fieldKey: "note", authority: "client" },
      { entityKey: "order", fieldKey: "title", authority: "client" },
    ],
    bindingPolicies: [
      {
        pageId: "home",
        blockId: "summary",
        bindingKey: "note",
        entityKey: "order",
        fieldKey: "note",
        access: "write",
        authority: "client",
      },
      {
        pageId: "home",
        blockId: "summary",
        bindingKey: "title",
        entityKey: "order",
        fieldKey: "title",
        access: "read",
        authority: "client",
      },
    ],
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

function v2ToV3UpgradeContext(): ApplicationGraphV2ToV3UpgradeContext {
  return {
    migrationVersion: "factory.application-graph-v2-to-v3/v1",
    targetDraftRevisionId: "draft-v3-1",
    targetDraftRevisionNumber: 1,
    journeys: [],
  };
}

function publishedV3(): PublishedApplicationGraphV3Input {
  const upgraded = upgradeApplicationGraphV2ToV3Draft(
    publishedV2() as never,
    v2ToV3UpgradeContext(),
  );
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

const publishedFixtures = [
  ["V1", publishedV1],
  ["V2", publishedV2],
  ["V3", publishedV3],
] as const;

type HostileArrayKind =
  | "subclass"
  | "custom-prototype"
  | "own-map"
  | "own-iterator"
  | "accessor-index"
  | "sparse-inherited-index";

function hostileArray(
  kind: HostileArrayKind,
  values: readonly unknown[],
): { value: unknown[]; behaviorCalls: () => number } {
  let calls = 0;
  if (kind === "subclass") {
    class HostileArray extends Array<unknown> {
      public override map<U>(
        callback: (value: unknown, index: number, array: unknown[]) => U,
        thisArg?: unknown,
      ): U[] {
        calls += 1;
        return Array.prototype.map.call(this, callback, thisArg) as U[];
      }
    }
    const value = new HostileArray();
    for (const item of values) Array.prototype.push.call(value, item);
    return { value, behaviorCalls: () => calls };
  }

  if (kind === "custom-prototype") {
    const value = Array.from(values);
    const prototype = Object.create(Array.prototype) as Record<
      PropertyKey,
      unknown
    >;
    prototype.map = function (...args: unknown[]) {
      calls += 1;
      return Reflect.apply(Array.prototype.map, this, args);
    };
    Object.setPrototypeOf(value, prototype);
    return { value, behaviorCalls: () => calls };
  }

  if (kind === "own-map") {
    const value = Array.from(values);
    Object.defineProperty(value, "map", {
      enumerable: true,
      configurable: true,
      value(...args: unknown[]) {
        calls += 1;
        return Reflect.apply(Array.prototype.map, this, args);
      },
    });
    return { value, behaviorCalls: () => calls };
  }

  if (kind === "own-iterator") {
    const value = Array.from(values);
    Object.defineProperty(value, Symbol.iterator, {
      configurable: true,
      value() {
        calls += 1;
        return Array.prototype[Symbol.iterator].call(this);
      },
    });
    return { value, behaviorCalls: () => calls };
  }

  if (kind === "accessor-index") {
    const item = values[0];
    const value = new Array(Math.max(values.length, 1));
    for (let index = 1; index < values.length; index += 1) {
      value[index] = values[index];
    }
    Object.defineProperty(value, "0", {
      enumerable: true,
      configurable: true,
      get() {
        calls += 1;
        return item;
      },
    });
    return { value, behaviorCalls: () => calls };
  }

  const item = values[0];
  const value = new Array(Math.max(values.length, 1));
  for (let index = 1; index < values.length; index += 1) {
    value[index] = values[index];
  }
  const prototype = Object.create(Array.prototype);
  Object.defineProperty(prototype, "0", {
    enumerable: true,
    get() {
      calls += 1;
      return item;
    },
  });
  Object.setPrototypeOf(value, prototype);
  return { value, behaviorCalls: () => calls };
}

const hostileArrayKinds: readonly HostileArrayKind[] = [
  "subclass",
  "custom-prototype",
  "own-map",
  "own-iterator",
  "accessor-index",
  "sparse-inherited-index",
];

const publishedOwnExtraCases = [
  {
    label: "non-enumerable envelope",
    select: (candidate: Record<string, any>) => candidate,
    addExtra: (target: object) =>
      Object.defineProperty(target, "compilerTarget", {
        value: "web",
        enumerable: false,
      }),
  },
  {
    label: "symbol envelope",
    select: (candidate: Record<string, any>) => candidate,
    addExtra: (target: Record<PropertyKey, unknown>) =>
      (target[Symbol("compilerTarget")] = "web"),
  },
  {
    label: "non-enumerable nested record",
    select: (candidate: Record<string, any>) => candidate.graph.metadata,
    addExtra: (target: object) =>
      Object.defineProperty(target, "compilerTarget", {
        value: "web",
        enumerable: false,
      }),
  },
  {
    label: "symbol nested record",
    select: (candidate: Record<string, any>) => candidate.graph.metadata,
    addExtra: (target: Record<PropertyKey, unknown>) =>
      (target[Symbol("compilerTarget")] = "web"),
  },
  {
    label: "non-enumerable nested array",
    select: (candidate: Record<string, any>) => candidate.graph.page.pages,
    addExtra: (target: object) =>
      Object.defineProperty(target, "compilerTarget", {
        value: "web",
        enumerable: false,
      }),
  },
  {
    label: "symbol nested array",
    select: (candidate: Record<string, any>) => candidate.graph.page.pages,
    addExtra: (target: Record<PropertyKey, unknown>) =>
      (target[Symbol("compilerTarget")] = "web"),
  },
] as const;

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

describe("Application Graph V2-to-V3 Draft upgrade", () => {
  it("creates a fresh V3 Draft, wraps Domain policies in order, and retains immutable V2 lineage", () => {
    const source = publishedV2();
    const context = v2ToV3UpgradeContext();
    const sourceBytes = JSON.stringify(source);
    const contextBytes = JSON.stringify(context);

    const upgraded = upgradeApplicationGraphV2ToV3Draft(
      source as never,
      context,
    );

    expect(upgraded).toMatchObject({
      kind: "application-graph-draft-revision",
      status: "draft",
      revisionId: "draft-v3-1",
      revisionNumber: 1,
      graphVersion: "factory.application-graph/v3",
      lineage: {
        kind: "application-graph-v2-upgrade",
        migrationVersion: "factory.application-graph-v2-to-v3/v1",
        source: {
          kind: "published-application-graph",
          status: "published",
          graphVersion: "factory.application-graph/v2",
          revisionId: "published-v2-1",
          revisionNumber: 1,
          graphHash: source.graphHash,
        },
      },
    });
    expect(upgraded.lineage.source).not.toHaveProperty("graph");
    expect(upgraded.graphHash).toBe(hashApplicationGraphV3(upgraded.graph));
    expect(upgraded.graph.page).toEqual(source.graph.page);
    expect(upgraded.graph.page).not.toBe(source.graph.page);
    expect(upgraded.graph.page.pages[0].blocks[0].bindings).toEqual(
      source.graph.page.pages[0].blocks[0].bindings,
    );
    expect(upgraded.graph.bindingPolicies).toEqual(
      source.graph.bindingPolicies.map((policy: Record<string, any>) => ({
        kind: "domain-field",
        ...policy,
      })),
    );
    expect(upgraded.graph.journeys).toEqual(context.journeys);
    expect(JSON.stringify(source)).toBe(sourceBytes);
    expect(JSON.stringify(context)).toBe(contextBytes);
    expect(upgraded.graph).not.toBe(source.graph);
  });

  it("strictly validates the Published V2 source and exact upgrade context", () => {
    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        {
          ...publishedV2(),
          graphHash: `sha256:${"9".repeat(64)}`,
        } as never,
        v2ToV3UpgradeContext(),
      ),
    ).toThrow(/hash/i);

    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        publishedV2() as never,
        {
          ...v2ToV3UpgradeContext(),
          targetDraftRevisionNumber: 0,
        } as never,
      ),
    ).toThrow(/positive|revision/i);

    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(publishedV2() as never, {
        ...v2ToV3UpgradeContext(),
        targetDraftRevisionId: "published-v2-1",
      }),
    ).toThrow(
      "A V2-to-V3 upgrade requires a new Draft revision id different from its Published source.",
    );

    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        publishedV2() as never,
        {
          ...v2ToV3UpgradeContext(),
          bindingPolicies: [],
        } as never,
      ),
    ).toThrow(/Unrecognized key/);

    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        publishedV2() as never,
        {
          ...v2ToV3UpgradeContext(),
          journeys: [() => "not-a-journey"],
        } as never,
      ),
    ).toThrow(/Composition record is invalid/);
  });

  it.each([
    [
      "non-enumerable bindingPolicies",
      (context: Record<PropertyKey, unknown>) =>
        Object.defineProperty(context, "bindingPolicies", {
          value: [],
          enumerable: false,
        }),
    ],
    [
      "symbol pageEdits",
      (context: Record<PropertyKey, unknown>) =>
        (context[Symbol("pageEdits")] = []),
    ],
  ] as const)("rejects the %s context extra", (_label, addExtra) => {
    const context = v2ToV3UpgradeContext() as unknown as Record<
      PropertyKey,
      unknown
    >;
    addExtra(context);
    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        publishedV2() as never,
        context as never,
      ),
    ).toThrow(/unrecognized extra key/i);
  });

  it.each(hostileArrayKinds)(
    "rejects a %s journeys array without invoking caller behavior",
    (kind) => {
      const context = v2ToV3UpgradeContext() as Record<string, any>;
      const hostile = hostileArray(kind, context.journeys);
      context.journeys = hostile.value;
      expect(() =>
        upgradeApplicationGraphV2ToV3Draft(
          publishedV2() as never,
          context as never,
        ),
      ).toThrow(/plain|array|record|invalid|extra key/i);
      expect(hostile.behaviorCalls()).toBe(0);
    },
  );

  it("rejects a nested hostile context array without invoking its map", () => {
    const context = v2ToV3UpgradeContext() as Record<string, any>;
    const hostile = hostileArray("subclass", []);
    context.pageEdits = { changes: hostile.value };
    expect(() =>
      upgradeApplicationGraphV2ToV3Draft(
        publishedV2() as never,
        context as never,
      ),
    ).toThrow(/plain|array|record|invalid/i);
    expect(hostile.behaviorCalls()).toBe(0);
  });
});

describe("explicit Published Application Graph adapter", () => {
  it("validates and preserves explicit V1, V2, and V3 branches", () => {
    const v1 = publishedV1();
    const adaptedV1 = adaptPublishedApplicationGraph(v1);
    expect(adaptedV1).toEqual(v1);
    expect(adaptedV1).not.toBe(v1);

    const v2 = publishedV2();
    const adaptedV2 = adaptPublishedApplicationGraph(v2);
    expect(adaptedV2).toEqual(v2);
    expect(adaptedV2.graphVersion).toBe("factory.application-graph/v2");

    const v3 = publishedV3();
    const adaptedV3 = adaptPublishedApplicationGraph(v3);
    expect(adaptedV3).toEqual(v3);
    expect(adaptedV3).not.toBe(v3);
    expect(adaptedV3.graphVersion).toBe("factory.application-graph/v3");
  });

  it.each([
    ["missing version", ({ graphVersion: _ignored, ...rest }) => rest],
    [
      "unknown version",
      (value) => ({ ...value, graphVersion: "factory.application-graph/v4" }),
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

    for (const candidate of [publishedV1(), publishedV2(), publishedV3()]) {
      const metadata = candidate.graph.metadata;
      candidate.graph.metadata = Object.assign(
        Object.create({ name: metadata.name }),
        {
          id: metadata.id,
          workspaceId: metadata.workspaceId,
        },
      );
      expect(() => adaptPublishedApplicationGraph(candidate)).toThrow(
        /plain|prototype|own|record/i,
      );
    }
  });

  it.each(publishedOwnExtraCases)(
    "rejects a $label for every Published Graph version",
    ({ select, addExtra }) => {
      for (const [_version, createPublished] of publishedFixtures) {
        const candidate = createPublished() as Record<string, any>;
        addExtra(select(candidate) as never);
        expect(() => adaptPublishedApplicationGraph(candidate)).toThrow(
          /unrecognized extra key/i,
        );
      }
    },
  );

  it.each(
    publishedFixtures.flatMap(([version, createPublished]) =>
      hostileArrayKinds.map(
        (kind) => [version, kind, createPublished] as const,
      ),
    ),
  )(
    "rejects a %s Published Graph with a %s pages array without invoking caller behavior",
    (_version, kind, createPublished) => {
      const candidate = createPublished() as Record<string, any>;
      const hostile = hostileArray(kind, candidate.graph.page.pages);
      candidate.graph.page.pages = hostile.value;
      expect(() => adaptPublishedApplicationGraph(candidate)).toThrow(
        /plain|array|record|invalid|extra key/i,
      );
      expect(hostile.behaviorCalls()).toBe(0);
    },
  );

  it.each(publishedFixtures)(
    "rejects a %s Published Graph with a nested hostile array without invoking its map",
    (_version, createPublished) => {
      const candidate = createPublished() as Record<string, any>;
      const blocks = candidate.graph.page.pages[0].blocks;
      const hostile = hostileArray("subclass", blocks);
      candidate.graph.page.pages[0].blocks = hostile.value;
      expect(() => adaptPublishedApplicationGraph(candidate)).toThrow(
        /plain|array|record|invalid/i,
      );
      expect(hostile.behaviorCalls()).toBe(0);
    },
  );

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

    expect(() =>
      adaptPublishedApplicationGraph({
        apiVersion: "factory.draft-preview-snapshot/v2",
        graphVersion: "factory.application-graph/v3",
        state: "active",
      }),
    ).toThrow();
  });

  it("rejects V3 hash mismatch, extra keys, inherited input, and non-plain nested records", () => {
    expect(() =>
      adaptPublishedApplicationGraph({
        ...publishedV3(),
        graphHash: `sha256:${"8".repeat(64)}`,
      }),
    ).toThrow(/hash/i);
    expect(() =>
      adaptPublishedApplicationGraph({
        ...publishedV3(),
        compilerTarget: "web",
      }),
    ).toThrow(/Unrecognized key/);

    const inherited = Object.assign(
      Object.create({ revisionNumber: 1 }),
      publishedV3(),
    );
    delete inherited.revisionNumber;
    expect(() => adaptPublishedApplicationGraph(inherited)).toThrow(
      /plain|prototype|own|record/i,
    );

    class ProviderPayload {
      public readonly result = "untrusted";
    }
    const nonPlain = publishedV3() as Record<string, any>;
    nonPlain.graph.page.pages[0].blocks[0].props = {
      payload: { result: "untrusted" },
    };
    nonPlain.graphHash = hashApplicationGraphV3(nonPlain.graph);
    nonPlain.graph.page.pages[0].blocks[0].props = {
      payload: new ProviderPayload(),
    };
    expect(() => adaptPublishedApplicationGraph(nonPlain)).toThrow(
      /plain|prototype|record/i,
    );
  });

  it("exports identical browser-safe V1/V2/V3 adapter and Snapshot surfaces", () => {
    expect(browserGraph.upgradeApplicationGraphV1ToV2Draft).toBe(
      upgradeApplicationGraphV1ToV2Draft,
    );
    expect(browserGraph.adaptPublishedApplicationGraph).toBe(
      adaptPublishedApplicationGraph,
    );
    expect(browserGraph.hashApplicationGraphV2).toBe(hashApplicationGraphV2);
    expect(browserGraph.hashApplicationGraphV3).toBe(hashApplicationGraphV3);
    expect(browserGraph.upgradeApplicationGraphV2ToV3Draft).toBe(
      upgradeApplicationGraphV2ToV3Draft,
    );
    expect(browserGraph.transitionDraftPreviewSnapshot).toBeTypeOf("function");
    expect(browserGraph.assertApplicationGraphV3).toBeTypeOf("function");
    expect(browserGraph.assertDraftPreviewSnapshotV2).toBeTypeOf("function");
    expect(browserGraph.hashDraftPreviewSnapshotV2).toBeTypeOf("function");
    expect(browserGraph.transitionDraftPreviewSnapshotV2).toBeTypeOf(
      "function",
    );
  });
});
