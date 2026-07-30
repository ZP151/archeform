import { describe, expect, it } from "vitest";

import {
  cartAsset,
  catalogAsset,
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
  bindings: {},
};
const catalogSelection: CapabilitySelectionV1 = {
  lock: lockCapabilityAsset(catalogAsset),
  bindings: {},
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
      "sha256:1ed2caf694231c8f343a2070d48e67f12abcaed180a2f53520a805b47cc3f47c",
    );
    expect(Object.isFrozen(lock)).toBe(true);
    expect(Object.isFrozen(lock.packages)).toBe(true);
  });

  it("creates the same lock for bindings inserted in a different key order", () => {
    const parameterAsset = asset("core.binding-order-test", {
      parameters: [
        { key: "alpha", type: "string", required: true },
        { key: "beta", type: "string", required: true },
      ],
    });
    const first = createCapabilityCompositionLockForAssets(
      {
        graphChecksum: digest("a"),
        selections: [
          selection(parameterAsset, { alpha: "first", beta: "second" }),
        ],
      },
      [parameterAsset],
    );
    const reordered = createCapabilityCompositionLockForAssets(
      {
        graphChecksum: digest("a"),
        selections: [
          selection(parameterAsset, { beta: "second", alpha: "first" }),
        ],
      },
      [parameterAsset],
    );

    expect(first).toEqual(reordered);
    expect(Object.keys(first.packages[0]?.bindings ?? {})).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("rejects an undeclared parameter and an unsafe string parameter", () => {
    const pathAsset = asset("core.path-test", {
      parameters: [{ key: "route", type: "string", required: true }],
    });
    const unsafeSelection: CapabilitySelectionV1 = {
      lock: lockCapabilityAsset(cartAsset),
      bindings: { rawModelOutput: "anything" },
    };
    const pathSelection = selection(pathAsset, { route: "admin/secrets" });

    expect(() =>
      resolveCapabilityComposition({ selections: [unsafeSelection] }),
    ).toThrow("does not declare parameter");
    expect(() =>
      resolveSyntheticComposition({
        assets: [pathAsset],
        selections: [pathSelection],
      }),
    ).toThrow("must not contain a path");
  });

  it("rejects incorrect primitive values, source delimiters, and invalid Graph symbols", () => {
    const parameterAsset = asset("core.parameter-test", {
      parameters: [
        { key: "enabled", type: "boolean", required: true },
        { key: "label", type: "string", required: true },
        { key: "entity", type: "graph-symbol", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: "true",
            label: "Catalog",
            entity: { graphSymbol: "graph.domain.product" },
          }),
        ],
      }),
    ).toThrow("must be a boolean");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: true,
            label: "${process.env.SECRET}",
            entity: { graphSymbol: "graph.domain.product" },
          }),
        ],
      }),
    ).toThrow("must not contain source delimiters");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            enabled: true,
            label: "Catalog",
            entity: { graphSymbol: "domain.product" },
          }),
        ],
      }),
    ).toThrow("must be a Graph symbol");
  });

  it("rejects URL schemes and shell commands", () => {
    const parameterAsset = asset("core.string-safety-test", {
      parameters: [{ key: "value", type: "string", required: true }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { value: "mailto:user" })],
      }),
    ).toThrow("must not contain a URL");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { value: "  mailto:user" })],
      }),
    ).toThrow("must not contain a URL");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { value: "Open mailto:user" })],
      }),
    ).toThrow("must not contain a URL");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { value: "rm workspace" })],
      }),
    ).toThrow("must not contain a command");
    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { value: "Note: vegan" })],
      }),
    ).not.toThrow();
  });

  it.each(["<img src=x onerror=alert(1)>", "process.exit(1)"])(
    "rejects executable source string %s",
    (value) => {
      const parameterAsset = asset("core.executable-source-test", {
        parameters: [{ key: "value", type: "string", required: true }],
      });

      expect(() =>
        resolveSyntheticComposition({
          assets: [parameterAsset],
          selections: [selection(parameterAsset, { value })],
        }),
      ).toThrow("must not contain source delimiters");
    },
  );

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
        { key: "permissionResource", type: "string", required: true },
        { key: "resourceKey", type: "string", required: true },
      ],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [
          selection(parameterAsset, {
            permissionResource: "order",
            resourceKey: "order",
          }),
        ],
      }),
    ).not.toThrow();
  });

  it.each([
    "secret",
    "secretValue",
    "secretvalue",
    "password",
    "passwordValue",
    "passwordvalue",
    "credential",
    "credentialValue",
    "credentialvalue",
    "command",
    "commandText",
    "commandtext",
    "source",
    "sourcePath",
    "sourcepath",
    "url",
    "urlTarget",
    "urltarget",
    "path",
    "filePath",
    "filepath",
    "apiKey",
    "apikey",
    "accessToken",
    "accesstoken",
  ])("rejects forbidden semantic parameter key %s", (parameterKey) => {
    const parameterAsset = asset("core.forbidden-parameter-test", {
      parameters: [{ key: parameterKey, type: "string", required: true }],
    });

    expect(() =>
      resolveSyntheticComposition({
        assets: [parameterAsset],
        selections: [selection(parameterAsset, { [parameterKey]: "value" })],
      }),
    ).toThrow("is not safe for composition bindings");
  });

  it.each(["constructor", "toString", "__proto__"])(
    "rejects prototype-reserved parameter key %s",
    (parameterKey) => {
      const parameterAsset = asset("core.prototype-test", {
        parameters: [{ key: parameterKey, type: "string", required: true }],
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
