import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  assertGoldenCapabilityAssetLocks,
  assertGoldenCapabilityComposition,
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  getCapabilityAsset,
  resolveCapabilityAssetLock,
  resolveCapabilityComposition,
  type CapabilitySelectionV1,
} from "../src/index.js";
import {
  createCapabilityCompositionLockForAssets,
  resolveCapabilityCompositionForAssets,
  type ResolveCapabilityCompositionInput,
} from "../src/composition.js";
import { createVerifiedCapabilityCompositionLock } from "../src/node.js";

const digest = (character: string): string => `sha256:${character.repeat(64)}`;
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

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
  it("captures a public asset lock before resolving it", () => {
    let keyReads = 0;
    const changingLock = {
      ...lockCapabilityAsset(getCapabilityAsset("core.audit")),
    };
    Object.defineProperty(changingLock, "key", {
      configurable: true,
      enumerable: true,
      get: () => {
        keyReads += 1;
        Object.defineProperty(changingLock, "key", {
          enumerable: true,
          value: "restaurant.menu",
        });
        return "core.audit";
      },
    });

    expect(() => resolveCapabilityAssetLock(changingLock)).toThrow(
      "FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID",
    );
    expect(keyReads).toBe(0);
  });

  it("captures Golden lock validation context before observing it", () => {
    let profileReads = 0;
    const context = {
      capabilityKeys: ["audit.record"],
    } as Parameters<typeof assertGoldenCapabilityAssetLocks>[1];
    Object.defineProperty(context, "profile", {
      configurable: true,
      enumerable: true,
      get: () => {
        profileReads += 1;
        Object.defineProperty(context, "profile", {
          enumerable: true,
          value: "simple-ecommerce",
        });
        return "restaurant-ordering";
      },
    });

    expect(() =>
      assertGoldenCapabilityAssetLocks(
        [lockCapabilityAsset(getCapabilityAsset("core.audit"))],
        context,
      ),
    ).toThrow("FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID");
    expect(profileReads).toBe(0);
  });

  it("captures Golden composition context before observing it", () => {
    const draft = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    let graphReads = 0;
    const context = {
      profile: "simple-ecommerce",
      capabilityKeys: draft.graph.integration.capabilities.map(
        ({ key }) => key,
      ),
    } as Parameters<typeof assertGoldenCapabilityComposition>[1];
    Object.defineProperty(context, "graph", {
      configurable: true,
      enumerable: true,
      get: () => {
        graphReads += 1;
        Object.defineProperty(context, "graph", {
          enumerable: true,
          value: composeDefaultCapabilityDraft({
            profile: "restaurant-ordering",
          }).graph,
        });
        return draft.graph;
      },
    });

    expect(() =>
      assertGoldenCapabilityComposition(
        draft.graph.integration.compositionSelections ?? [],
        context,
      ),
    ).toThrow("FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID");
    expect(graphReads).toBe(0);
  });

  it.each([
    {
      label: "default profile composition",
      compose: composeDefaultCapabilityDraft,
    },
    { label: "legacy profile composition", compose: composeProfileDraft },
  ])("captures $label input before observing it", ({ compose }) => {
    let profileReads = 0;
    const input = {} as Parameters<typeof compose>[0];
    Object.defineProperty(input, "profile", {
      configurable: true,
      enumerable: true,
      get: () => {
        profileReads += 1;
        Object.defineProperty(input, "profile", {
          enumerable: true,
          value: "simple-ecommerce",
        });
        return "restaurant-ordering";
      },
    });

    expect(() => compose(input)).toThrow(
      "FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID",
    );
    expect(profileReads).toBe(0);
  });

  it("captures a verified lock selection before physical package verification", () => {
    let lockReads = 0;
    const selected = {
      bindings: {
        actorRole: { graphSymbol: "graph.policy.customer" },
      },
    } as unknown as CapabilitySelectionV1;
    Object.defineProperty(selected, "lock", {
      configurable: true,
      enumerable: true,
      get: () => {
        lockReads += 1;
        Object.defineProperty(selected, "lock", {
          enumerable: true,
          value: lockCapabilityAsset(getCapabilityAsset("core.audit")),
        });
        return lockCapabilityAsset(getCapabilityAsset("restaurant.menu"));
      },
    });

    expect(() =>
      createVerifiedCapabilityCompositionLock(
        { graphChecksum: digest("a"), selections: [selected] },
        repositoryRoot,
      ),
    ).toThrow("FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID");
    expect(lockReads).toBe(0);
  });

  it("captures draft selections before checking provider overlaps", () => {
    const draft = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    let lockReads = 0;
    const selected = { bindings: {} } as unknown as CapabilitySelectionV1;
    Object.defineProperty(selected, "lock", {
      configurable: true,
      enumerable: true,
      get: () => {
        lockReads += 1;
        Object.defineProperty(selected, "lock", {
          enumerable: true,
          value: lockCapabilityAsset(getCapabilityAsset("restaurant.menu")),
        });
        return lockCapabilityAsset(getCapabilityAsset("restaurant.reporting"));
      },
    });

    expect(() =>
      composeCapabilityDraft({
        graph: draft.graph,
        selections: [
          ...(draft.graph.integration.compositionSelections ?? []),
          selected,
        ],
      }),
    ).toThrow("FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID");
    expect(lockReads).toBe(0);
  });

  it("creates one coherent lock from each owned strict contract", () => {
    const typedAsset = asset("core.coherent-contract-test", {
      bindingContract: "factory.capability-binding/v1",
      inputSchema: [{ key: "entity", type: "domain.entity", required: true }],
      parameters: [{ key: "entity", type: "graph-symbol", required: true }],
    } as unknown as Partial<CapabilityAssetManifestV1>);
    const originalGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
    const compiledParameters = new WeakSet<object>();
    Object.getOwnPropertyDescriptors = ((value: object) => {
      const descriptors = originalGetOwnPropertyDescriptors(value);
      const keyDescriptor = descriptors.key;
      const typeDescriptor = descriptors.type;
      const isOwnedParameter =
        Object.getPrototypeOf(value) === null &&
        Object.isFrozen(value) &&
        keyDescriptor &&
        "value" in keyDescriptor &&
        keyDescriptor.value === "entity" &&
        typeDescriptor &&
        "value" in typeDescriptor &&
        typeDescriptor.value === "graph-symbol";
      if (!isOwnedParameter) return descriptors;
      if (!compiledParameters.has(value)) {
        compiledParameters.add(value);
        return descriptors;
      }
      return {
        ...descriptors,
        type: { ...typeDescriptor, value: "number" },
      };
    }) as typeof Object.getOwnPropertyDescriptors;

    try {
      const createLock = () =>
        createCapabilityCompositionLockForAssets(
          {
            graphChecksum: digest("a"),
            selections: [
              selection(typedAsset, {
                entity: { graphSymbol: "graph.domain.product" },
              }),
            ],
          },
          [typedAsset],
        );
      const first = createLock();
      const second = createLock();

      expect(first.packages).toEqual([
        {
          lock: lockCapabilityAsset(typedAsset),
          bindings: {
            entity: { graphSymbol: "graph.domain.product" },
          },
        },
      ]);
      expect(first.lockDigest).toBe(second.lockDigest);
      expect(first.lockDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      Object.getOwnPropertyDescriptors = originalGetOwnPropertyDescriptors;
    }
  });

  it("keeps one digest across 100 resolutions of the largest default composition", () => {
    const largestSelections =
      composeDefaultCapabilityDraft({ profile: "restaurant-ordering" }).graph
        .integration.compositionSelections ?? [];

    expect(largestSelections).toHaveLength(18);
    expect(largestSelections).not.toContainEqual(
      expect.objectContaining({
        lock: expect.objectContaining({ key: "core.notification" }),
      }),
    );
    const digests = new Set(
      Array.from(
        { length: 100 },
        () =>
          createCapabilityCompositionLock({
            graphChecksum: digest("a"),
            selections: largestSelections,
          }).lockDigest,
      ),
    );

    expect(digests.size).toBe(1);
    expect([...digests][0]).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

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

  it.each(["expense.approval-outcome", "ecommerce.order-outcome"])(
    "accepts declared notification template enum value %s",
    (template) => {
      const notification = getCapabilityAsset("core.notification");

      const composition = resolveCapabilityComposition({
        selections: [
          selection(notification, {
            recipientRole: { graphSymbol: "graph.policy.employee" },
            template,
          }),
        ],
      });

      expect(composition.packages[0]?.bindings.template).toBe(template);
    },
  );

  it("rejects an undeclared notification template enum value", () => {
    const notification = getCapabilityAsset("core.notification");

    expect(() =>
      resolveCapabilityComposition({
        selections: [
          selection(notification, {
            recipientRole: { graphSymbol: "graph.policy.employee" },
            template: "expense.arbitrary-message",
          }),
        ],
      }),
    ).toThrow(
      "must be one of: expense.approval-outcome, ecommerce.order-outcome",
    );
  });

  it("rejects a direct string bound to a non-enum parameter", () => {
    const graphSymbolAsset = asset("core.non-enum-string-test", {
      parameters: [
        { key: "recipientRole", type: "graph-symbol", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [graphSymbolAsset],
        selections: [
          selection(graphSymbolAsset, {
            recipientRole: "employee",
          }),
        ],
      }),
    ).toThrow("must be a Graph symbol");
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

  it("rejects an accessor-backed parameters declaration without invoking it", () => {
    let parameterReads = 0;
    const parameterAsset = asset("core.parameter-reread-test", {
      bindingContract: "factory.capability-binding/v1",
      inputSchema: [{ key: "entity", type: "domain.entity", required: true }],
    } as unknown as Partial<CapabilityAssetManifestV1>);
    Object.defineProperty(parameterAsset.manifest, "parameters", {
      enumerable: true,
      get: () => {
        parameterReads += 1;
        return parameterReads === 1
          ? [{ key: "entity", type: "graph-symbol", required: true }]
          : [{ key: "entity", type: "number", required: false }];
      },
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { entity: 7 })],
      }),
    ).toThrow();
    expect(parameterReads).toBe(0);
  });

  it("rejects an accessor-backed parameter-array element without invoking it", () => {
    let parameterReads = 0;
    const parameters: unknown[] = [];
    Object.defineProperty(parameters, "0", {
      enumerable: true,
      get: () => {
        parameterReads += 1;
        return { key: "entity", type: "graph-symbol", required: true };
      },
    });
    parameters.length = 1;
    const parameterAsset = asset("core.parameter-array-accessor-test", {
      parameters: parameters as CapabilityAssetManifestV1["parameters"],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            entity: { graphSymbol: "graph.domain.product" },
          }),
        ],
      }),
    ).toThrow();
    expect(parameterReads).toBe(0);
  });

  it.each([
    {
      label: "an inherited parameter-array index",
      parameters: () => {
        const inherited: unknown[] = [];
        Object.setPrototypeOf(inherited, [
          { key: "entity", type: "graph-symbol", required: true },
        ]);
        inherited.length = 1;
        return inherited;
      },
    },
    {
      label: "a sparse parameter array",
      parameters: () => new Array(1),
    },
    {
      label: "an extra own parameter-array property",
      parameters: () => {
        const values = [
          { key: "entity", type: "graph-symbol", required: true },
        ];
        Object.assign(values, { unexpected: true });
        return values;
      },
    },
    {
      label: "a symbol-keyed parameter array",
      parameters: () => {
        const values = [
          { key: "entity", type: "graph-symbol", required: true },
        ];
        Object.defineProperty(values, Symbol("unexpected"), { value: true });
        return values;
      },
    },
    {
      label: "a parameter array with a custom prototype",
      parameters: () => {
        const values = [
          { key: "entity", type: "graph-symbol", required: true },
        ];
        Object.setPrototypeOf(values, Object.create(Array.prototype));
        return values;
      },
    },
    {
      label: "a cyclic parameter array",
      parameters: () => {
        const values: unknown[] = [
          { key: "entity", type: "graph-symbol", required: true },
        ];
        values.push(values);
        return values;
      },
    },
  ])("rejects $label", ({ parameters }) => {
    const parameterAsset = asset("core.noncanonical-parameter-array-test", {
      parameters: parameters() as CapabilityAssetManifestV1["parameters"],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            entity: { graphSymbol: "graph.domain.product" },
          }),
        ],
      }),
    ).toThrow();
  });

  it.each([
    {
      label: "selection",
      key: "core.selection-accessor-test",
      createSelection: (onRead: () => void) =>
        Object.defineProperties(
          {
            bindings: {
              entity: { graphSymbol: "graph.domain.product" },
            },
          },
          {
            lock: {
              enumerable: true,
              get: () => {
                onRead();
                return lockCapabilityAsset(
                  asset("core.selection-accessor-test"),
                );
              },
            },
          },
        ) as CapabilitySelectionV1,
    },
    {
      label: "lock",
      key: "core.lock-accessor-test",
      createSelection: (onRead: () => void) => {
        const accessorLock = Object.defineProperty(
          lockCapabilityAsset(asset("core.lock-accessor-test")),
          "key",
          {
            enumerable: true,
            get: () => {
              onRead();
              return "core.lock-accessor-test";
            },
          },
        );
        return {
          lock: accessorLock,
          bindings: { entity: { graphSymbol: "graph.domain.product" } },
        } as CapabilitySelectionV1;
      },
    },
    {
      label: "bindings",
      key: "core.bindings-accessor-test",
      createSelection: (onRead: () => void) =>
        Object.defineProperties(
          { lock: lockCapabilityAsset(asset("core.bindings-accessor-test")) },
          {
            bindings: {
              enumerable: true,
              get: () => {
                onRead();
                return { entity: { graphSymbol: "graph.domain.product" } };
              },
            },
          },
        ) as CapabilitySelectionV1,
    },
  ])(
    "rejects a $label accessor without invoking it",
    ({ key, createSelection }) => {
      let accessorReads = 0;
      const selected = createSelection(() => {
        accessorReads += 1;
      });
      const selectedAsset = asset(key, {
        parameters: [{ key: "entity", type: "graph-symbol", required: true }],
      });

      expect(() =>
        resolveSyntheticComposition({
          assets: [selectedAsset],
          selections: [selected],
        }),
      ).toThrow();
      expect(accessorReads).toBe(0);
    },
  );

  it.each([
    {
      label: "asset shell",
      createAlias: (
        selectedAsset: CapabilityAssetV1,
        assets: readonly CapabilityAssetV1[],
      ) => selectedAsset,
    },
    {
      label: "assets array",
      createAlias: (
        _selectedAsset: CapabilityAssetV1,
        assets: readonly CapabilityAssetV1[],
      ) => assets,
    },
  ])(
    "enforces asset capture when the $label is shared through input",
    ({ createAlias }) => {
      const selectedAsset = Object.assign(asset("core.shared-asset-test"), {
        unexpected: true,
      }) as CapabilityAssetV1;
      const assets = [selectedAsset];
      const selected = selection(selectedAsset);
      const input = {
        selections: [selected],
        ignoredAlias: createAlias(selectedAsset, assets),
      } as ResolveCapabilityCompositionInput;

      expect(() =>
        resolveCapabilityCompositionForAssets(input, assets),
      ).toThrow();
    },
  );

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
