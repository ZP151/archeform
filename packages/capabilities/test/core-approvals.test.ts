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
  approvalEntity: { graphSymbol: "graph.domain.expense" },
  approvalRole: { graphSymbol: "graph.policy.manager" },
} as Readonly<Record<string, CapabilityBindingValueV1>>;

describe("core.approvals capability family", () => {
  it("publishes a verified current approvals package with typed bindings", () => {
    const asset = getCapabilityAsset("core.approvals");

    expect(asset.manifest).toMatchObject({
      key: "core.approvals",
      version: "1.0.0",
      category: "core",
      lifecycle: "golden",
      bindingContract: "factory.capability-binding/v1",
      profiles: [],
      effects: ["approval.request"],
      provides: [{ interfaceKey: "approval.request", version: "v1" }],
    });
    expect(verifyCapabilityAssetDigest(asset)).toBe(true);
    expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
  });

  it("resolves the family against an approval entity and role binding", () => {
    const asset = getCapabilityAsset("core.approvals");
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

  it("rejects a binding for an undeclared input key", () => {
    const asset = getCapabilityAsset("core.approvals");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                ...validBindings,
                unexpectedInput: { graphSymbol: "graph.domain.expense" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });

  it("rejects a missing required approval entity binding", () => {
    const asset = getCapabilityAsset("core.approvals");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                approvalRole: { graphSymbol: "graph.policy.manager" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });

  it("rejects a missing required approval role binding", () => {
    const asset = getCapabilityAsset("core.approvals");

    expect(() =>
      resolveCapabilityCompositionForAssets(
        {
          selections: [
            {
              lock: lockCapabilityAsset(asset),
              bindings: {
                approvalEntity: { graphSymbol: "graph.domain.expense" },
              },
            },
          ],
        },
        [asset],
      ),
    ).toThrow();
  });
});
