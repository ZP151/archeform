import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { lockCapabilityAsset } from "../src/assets/index.js";
import {
  resolveCapabilityCompositionForAssets,
  type CapabilityBindingValueV1,
} from "../src/composition.js";
import { getCapabilityAsset } from "../src/index.js";
import {
  verifyCapabilityAssetDigest,
  verifyCapabilityAssetPackage,
} from "../src/node.js";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const validBindings = {
  searchEntity: { graphSymbol: "graph.domain.product" },
  searchField: {
    graphSymbol: "graph.domain.product",
    fieldKey: "description",
  },
} as Readonly<Record<string, CapabilityBindingValueV1>>;

describe("core.search capability family", () => {
  it("publishes a verified current search package with typed bindings", () => {
    const asset = getCapabilityAsset("core.search");

    expect(asset.manifest).toMatchObject({
      key: "core.search",
      version: "1.0.0",
      category: "core",
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["search.execute"],
      provides: [{ interfaceKey: "search.index", version: "v1" }],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("resolves the family against an indexed entity and search field binding", () => {
    const asset = getCapabilityAsset("core.search");
    const composition = resolveCapabilityCompositionForAssets(
      {
        selections: [
          { lock: lockCapabilityAsset(asset), bindings: validBindings },
        ],
      },
      [asset],
    );

    expect(composition.packages).toHaveLength(1);
    expect(composition.packages[0]?.bindings).toEqual(validBindings);
  });

  it("rejects a search field binding that omits its field key", () => {
    const asset = getCapabilityAsset("core.search");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                searchEntity: { graphSymbol: "graph.domain.product" },
                searchField: { graphSymbol: "graph.domain.product" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow("fieldKey");
  });

  it("rejects a binding for an undeclared input key", () => {
    const asset = getCapabilityAsset("core.search");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                ...validBindings,
                unexpectedInput: { graphSymbol: "graph.domain.product" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });

  it("rejects a missing required indexed entity binding", () => {
    const asset = getCapabilityAsset("core.search");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                searchField: {
                  graphSymbol: "graph.domain.product",
                  fieldKey: "description",
                },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });
});
