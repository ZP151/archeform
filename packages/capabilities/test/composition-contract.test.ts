import { describe, expect, it } from "vitest";

import {
  cartAsset,
  catalogAsset,
  crudAssetV1_0_1,
  lockCapabilityAsset,
  type CapabilityAssetManifestV1,
  type CapabilityAssetV1,
} from "../src/assets/index.js";
import {
  createCapabilityCompositionLock,
  resolveCapabilityComposition,
  type CapabilitySelectionV1,
} from "../src/index.js";
import {
  createCapabilityCompositionLockForAssets,
  resolveCapabilityCompositionForAssets,
} from "../src/composition.js";

const digest = (character: string): string => `sha256:${character.repeat(64)}`;

function manifest(
  key: string,
  overrides: Partial<CapabilityAssetManifestV1> = {},
): CapabilityAssetManifestV1 {
  return {
    apiVersion: "factory.capability/v1",
    key,
    version: "1.0.0",
    category: "core",
    name: key,
    description: `Test package ${key}`,
    packageRoot: `packages/capabilities/assets/${key}/1.0.0`,
    manifestDigest: digest(key.charAt(0)),
    lifecycle: "golden",
    profiles: ["simple-ecommerce"],
    effects: [],
    inputSchema: [],
    outputSlots: [],
    templates: [],
    parameters: [],
    graphContributions: [],
    executableContributions: [],
    requires: [],
    provides: [],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
    ...overrides,
  };
}

function asset(
  key: string,
  overrides: Partial<CapabilityAssetManifestV1> = {},
): CapabilityAssetV1 {
  return { manifest: manifest(key, overrides) };
}

function selection(
  selectedAsset: CapabilityAssetV1,
  bindings: CapabilitySelectionV1["bindings"] = {},
): CapabilitySelectionV1 {
  return { lock: lockCapabilityAsset(selectedAsset), bindings };
}

function resolveSyntheticComposition(input: {
  readonly assets: readonly CapabilityAssetV1[];
  readonly selections: readonly CapabilitySelectionV1[];
}) {
  return resolveCapabilityCompositionForAssets(
    { selections: input.selections },
    input.assets,
  );
}

const cartSelection: CapabilitySelectionV1 = {
  lock: lockCapabilityAsset(cartAsset),
  bindings: {
    catalogEntity: { graphSymbol: "graph.domain.product" },
    orderEntity: { graphSymbol: "graph.domain.order" },
    cartPage: { graphSymbol: "graph.page.checkout" },
    customerRole: { graphSymbol: "graph.policy.customer" },
  },
};
const catalogSelection: CapabilitySelectionV1 = {
  lock: lockCapabilityAsset(catalogAsset),
  bindings: {
    catalogEntity: { graphSymbol: "graph.domain.product" },
    catalogPage: { graphSymbol: "graph.page.catalog" },
    customerRole: { graphSymbol: "graph.policy.customer" },
  },
};

describe("capability composition contract", () => {
  it("creates the same lock for the same selections in a different input order", () => {
    const lock = createCapabilityCompositionLock({
      graphChecksum: digest("a"),
      selections: [cartSelection, catalogSelection],
    });
    const reordered = createCapabilityCompositionLock({
      graphChecksum: digest("a"),
      selections: [catalogSelection, cartSelection],
    });

    expect(lock).toEqual(reordered);
    expect(lock.packages.map(({ lock: identity }) => identity.key)).toEqual([
      "commerce.cart",
      "commerce.catalog",
    ]);
    expect(lock.lockDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(lock.lockDigest).toBe(
      "sha256:9f48d968ed136c8ed505975995b09e99b631e8ef8cc719b94ca30cda1da14463",
    );
    expect(Object.isFrozen(lock)).toBe(true);
    expect(Object.isFrozen(lock.packages)).toBe(true);
  });

  it("creates the same lock for bindings inserted in a different key order", () => {
    const parameterAsset = asset("core.binding-order-test", {
      parameters: [
        { key: "alpha", type: "number", required: true },
        { key: "beta", type: "boolean", required: true },
      ],
    });
    const first = createCapabilityCompositionLockForAssets(
      {
        graphChecksum: digest("a"),
        selections: [selection(parameterAsset, { alpha: 1, beta: true })],
      },
      [parameterAsset],
    );
    const reordered = createCapabilityCompositionLockForAssets(
      {
        graphChecksum: digest("a"),
        selections: [selection(parameterAsset, { beta: true, alpha: 1 })],
      },
      [parameterAsset],
    );

    expect(first).toEqual(reordered);
    expect(Object.keys(first.packages[0]?.bindings ?? {})).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("removes unknown scalar fields from a runtime selection lock", () => {
    const runtimeSelection = JSON.parse(
      JSON.stringify({
        lock: {
          ...lockCapabilityAsset(cartAsset),
          rawPrompt: "SHOULD_NOT_SURVIVE",
          credential: "SHOULD_NOT_SURVIVE",
        },
        bindings: cartSelection.bindings,
      }),
    ) as CapabilitySelectionV1;

    const lock = createCapabilityCompositionLock({
      graphChecksum: digest("a"),
      selections: [runtimeSelection, catalogSelection],
    });

    expect(lock.packages[0]?.lock).toEqual(lockCapabilityAsset(cartAsset));
    expect(Object.keys(lock.packages[0]?.lock ?? {})).toEqual([
      "key",
      "version",
      "packageRoot",
      "manifestDigest",
      "lifecycle",
    ]);
  });

  it("removes unknown nested fields from a runtime selection lock", () => {
    const runtimeSelection = JSON.parse(
      JSON.stringify({
        lock: {
          ...lockCapabilityAsset(cartAsset),
          metadata: { rawPrompt: "SHOULD_NOT_SURVIVE" },
        },
        bindings: cartSelection.bindings,
      }),
    ) as CapabilitySelectionV1;

    const lock = createCapabilityCompositionLock({
      graphChecksum: digest("a"),
      selections: [runtimeSelection, catalogSelection],
    });

    expect(lock.packages[0]?.lock).toEqual(lockCapabilityAsset(cartAsset));
    expect(JSON.stringify(lock.packages[0]?.lock)).not.toContain("rawPrompt");
  });

  it("rejects an undeclared parameter and a legacy string parameter contract", () => {
    const legacyStringAsset = {
      manifest: {
        ...manifest("core.legacy-string-test"),
        parameters: [{ key: "label", type: "string", required: true }],
      },
    } as unknown as CapabilityAssetV1;
    const unsafeSelection = {
      lock: lockCapabilityAsset(cartAsset),
      bindings: { rawModelOutput: "anything" },
    } as unknown as CapabilitySelectionV1;

    expect(() =>
      resolveCapabilityComposition({ selections: [unsafeSelection] }),
    ).toThrow("does not declare parameter");
    expect(() =>
      resolveSyntheticComposition({
        assets: [legacyStringAsset],
        selections: [
          selection(legacyStringAsset, {
            label: "Make a reservation",
          } as unknown as CapabilitySelectionV1["bindings"]),
        ],
      }),
    ).toThrow("does not support parameter type 'string'");
  });

  it("resolves finite numbers, booleans, and exact Graph symbols", () => {
    const parameterAsset = asset("core.parameter-test", {
      parameters: [
        { key: "enabled", type: "boolean", required: true },
        { key: "priority", type: "number", required: true },
        { key: "entity", type: "graph-symbol", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: true,
            priority: 1,
            entity: { graphSymbol: "graph.domain.product" },
          }),
        ],
      }),
    ).not.toThrow();
  });

  it("creates a lock from exact Graph-symbol binding objects", () => {
    const lock = createCapabilityCompositionLock({
      graphChecksum: digest("a"),
      selections: [
        selection(crudAssetV1_0_1, {
          entityKey: { graphSymbol: "graph.domain.expense" },
          routeKey: { graphSymbol: "graph.page.expense" },
        }),
      ],
    });

    expect(lock.packages[0]?.bindings).toEqual({
      entityKey: { graphSymbol: "graph.domain.expense" },
      routeKey: { graphSymbol: "graph.page.expense" },
    });
  });

  it("keeps an owner-aware field key in a strict composition lock", () => {
    const typedAsset = asset("core.typed-field-lock-test", {
      bindingContract: "factory.capability-binding/v1",
      inputSchema: [
        { key: "entity", type: "domain.entity", required: true },
        {
          key: "field",
          type: "domain.field",
          required: true,
          ownerBinding: "entity",
          fieldTypes: ["integer"],
        },
      ],
      parameters: [
        { key: "entity", type: "graph-symbol", required: true },
        { key: "field", type: "graph-symbol", required: true },
      ],
    } as unknown as Partial<CapabilityAssetManifestV1>);
    const bindings = {
      entity: { graphSymbol: "graph.domain.product" },
      field: {
        graphSymbol: "graph.domain.product",
        fieldKey: "stock",
      },
    } as unknown as CapabilitySelectionV1["bindings"];

    const lock = createCapabilityCompositionLockForAssets(
      {
        graphChecksum: digest("a"),
        selections: [selection(typedAsset, bindings)],
      },
      [typedAsset],
    );

    expect(lock.packages[0]?.bindings).toEqual(bindings);
  });

  it("rejects Graph-symbol binding objects with extra fields", () => {
    const runtimeSelection = selection(crudAssetV1_0_1, {
      entityKey: {
        graphSymbol: "graph.domain.expense",
        extra: true,
      },
      routeKey: { graphSymbol: "graph.page.expense" },
    } as unknown as CapabilitySelectionV1["bindings"]);

    expect(() =>
      createCapabilityCompositionLock({
        graphChecksum: digest("a"),
        selections: [runtimeSelection],
      }),
    ).toThrow("must be a Graph symbol");
  });

  it("rejects direct strings and invalid Graph symbols", () => {
    const parameterAsset = asset("core.parameter-test", {
      parameters: [
        { key: "enabled", type: "boolean", required: true },
        { key: "entity", type: "graph-symbol", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: true,
            entity: "Make a reservation",
          } as unknown as CapabilitySelectionV1["bindings"]),
        ],
      }),
    ).toThrow("must be a Graph symbol");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: true,
            entity: { graphSymbol: "domain.product" },
          }),
        ],
      }),
    ).toThrow("must be a Graph symbol");
  });

  it("rejects a missing required parameter", () => {
    const parameterAsset = asset("core.required-test", {
      parameters: [{ key: "enabled", type: "boolean", required: true }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset)],
      }),
    ).toThrow("requires parameter 'enabled'");
  });

  it("allows intended permissionResource and resourceKey parameters", () => {
    const parameterAsset = asset("core.permission-test", {
      parameters: [
        { key: "permissionResource", type: "graph-symbol", required: true },
        { key: "resourceKey", type: "graph-symbol", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            permissionResource: { graphSymbol: "graph.policy.order" },
            resourceKey: { graphSymbol: "graph.domain.order" },
          }),
        ],
      }),
    ).not.toThrow();
  });

  it.each(["constructor", "toString", "__proto__"])(
    "rejects prototype-reserved parameter key %s",
    (parameterKey) => {
      const parameterAsset = asset("core.prototype-test", {
        parameters: [{ key: parameterKey, type: "boolean", required: true }],
      });

      expect(() =>
        resolveSyntheticComposition({
          assets: [parameterAsset],
          selections: [selection(parameterAsset)],
        }),
      ).toThrow("must use a safe parameter key");
    },
  );

  it("rejects a requirement with no provider", () => {
    const consumer = asset("core.consumer", {
      requires: [{ interfaceKey: "commerce.catalog", version: "v1" }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [consumer],
        selections: [selection(consumer)],
      }),
    ).toThrow("has no provider");
  });

  it("rejects multiple providers unless the requirement permits them", () => {
    const providerA = asset("core.provider-a", {
      provides: [{ interfaceKey: "commerce.catalog", version: "v1" }],
    });
    const providerB = asset("core.provider-b", {
      provides: [{ interfaceKey: "commerce.catalog", version: "v1" }],
    });
    const consumer = asset("core.consumer", {
      requires: [{ interfaceKey: "commerce.catalog", version: "v1" }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [providerA, providerB, consumer],
        selections: [
          selection(providerA),
          selection(providerB),
          selection(consumer),
        ],
      }),
    ).toThrow("has multiple providers");

    const multiConsumer = asset("core.multi-consumer", {
      requires: [
        {
          interfaceKey: "commerce.catalog",
          version: "v1",
          multiProvider: true,
        },
      ],
    });
    const composition = resolveSyntheticComposition({
      assets: [providerA, providerB, multiConsumer],
      selections: [
        selection(providerB),
        selection(multiConsumer),
        selection(providerA),
      ],
    });

    expect(composition.resolvedDependencyOrder).toEqual([
      "core.provider-a",
      "core.provider-b",
      "core.multi-consumer",
    ]);
  });

  it("rejects dependency cycles", () => {
    const packageA = asset("core.cycle-a", {
      requires: [{ interfaceKey: "cycle.b", version: "v1" }],
      provides: [{ interfaceKey: "cycle.a", version: "v1" }],
    });
    const packageB = asset("core.cycle-b", {
      requires: [{ interfaceKey: "cycle.a", version: "v1" }],
      provides: [{ interfaceKey: "cycle.b", version: "v1" }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [packageA, packageB],
        selections: [selection(packageA), selection(packageB)],
      }),
    ).toThrow("dependency cycle");
  });

  it("rejects duplicate package keys", () => {
    const first = asset("core.duplicate");
    const second = asset("core.duplicate", {
      version: "2.0.0",
      packageRoot: "packages/capabilities/assets/core.duplicate/2.0.0",
      manifestDigest: digest("d"),
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [first, second],
        selections: [selection(first), selection(second)],
      }),
    ).toThrow("Duplicate capability package key");
  });

  it("rejects a selection whose lock digest does not match its manifest", () => {
    const selectedAsset = asset("core.digest-test");
    const validSelection = selection(selectedAsset);

    expect(() =>
      resolveSyntheticComposition({
        assets: [selectedAsset],
        selections: [
          {
            ...validSelection,
            lock: { ...validSelection.lock, manifestDigest: digest("f") },
          },
        ],
      }),
    ).toThrow("does not match a registered Golden asset");
  });
});
