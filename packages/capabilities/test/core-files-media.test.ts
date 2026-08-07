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
  mediaEntity: { graphSymbol: "graph.domain.product" },
  fileField: {
    graphSymbol: "graph.domain.product",
    fieldKey: "imageUrl",
  },
} as Readonly<Record<string, CapabilityBindingValueV1>>;

describe("core.files-media capability family", () => {
  it("publishes a verified current files/media package with typed bindings", () => {
    const asset = getCapabilityAsset("core.files-media");

    expect(asset.manifest).toMatchObject({
      key: "core.files-media",
      version: "1.0.0",
      category: "core",
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["files.media.register"],
      provides: [{ interfaceKey: "files.media", version: "v1" }],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("resolves the family against an owning entity and file field binding", () => {
    const asset = getCapabilityAsset("core.files-media");
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

  it("rejects a file field binding that omits its field key", () => {
    const asset = getCapabilityAsset("core.files-media");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                mediaEntity: { graphSymbol: "graph.domain.product" },
                fileField: { graphSymbol: "graph.domain.product" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow("fieldKey");
  });

  it("rejects a binding for an undeclared input key", () => {
    const asset = getCapabilityAsset("core.files-media");

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

  it("rejects a missing required owning entity binding", () => {
    const asset = getCapabilityAsset("core.files-media");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                fileField: {
                  graphSymbol: "graph.domain.product",
                  fieldKey: "imageUrl",
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
