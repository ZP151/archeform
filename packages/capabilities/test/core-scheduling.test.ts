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
  scheduleEntity: { graphSymbol: "graph.domain.delivery" },
  scheduleField: {
    graphSymbol: "graph.domain.delivery",
    fieldKey: "scheduledAt",
  },
} as Readonly<Record<string, CapabilityBindingValueV1>>;

describe("core.scheduling capability family", () => {
  it("publishes a verified current scheduling package with typed bindings", () => {
    const asset = getCapabilityAsset("core.scheduling");

    expect(asset.manifest).toMatchObject({
      key: "core.scheduling",
      version: "1.0.0",
      category: "core",
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["schedule.plan"],
      provides: [{ interfaceKey: "schedule.plan", version: "v1" }],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("resolves the family against a scheduled entity and datetime field binding", () => {
    const asset = getCapabilityAsset("core.scheduling");
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

  it("rejects a schedule field binding that omits its field key", () => {
    const asset = getCapabilityAsset("core.scheduling");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                scheduleEntity: { graphSymbol: "graph.domain.delivery" },
                scheduleField: { graphSymbol: "graph.domain.delivery" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow("fieldKey");
  });

  it("rejects a binding for an undeclared input key", () => {
    const asset = getCapabilityAsset("core.scheduling");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                ...validBindings,
                unexpectedInput: { graphSymbol: "graph.domain.delivery" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });

  it("rejects a missing required scheduled entity binding", () => {
    const asset = getCapabilityAsset("core.scheduling");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                scheduleField: {
                  graphSymbol: "graph.domain.delivery",
                  fieldKey: "scheduledAt",
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
