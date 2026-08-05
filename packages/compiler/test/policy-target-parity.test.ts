import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "@factory/capabilities";
import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  buildCompilationInput,
  createCompilerTargetRegistryV1,
  sha256Digest,
  type GeneratedFile,
  type PublishedGraphInput,
} from "../src/index.js";
import { policyTargetPlugin } from "../src/targets/policy/target.js";

const profiles: readonly FactoryProfile[] = [
  "expense-approval",
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
];

/**
 * Frozen legacy policy digests captured from generateApplicationBundle on the
 * pre-migration tree (2026-08-06). The plugin must reproduce these exact
 * bytes for every Profile; an intentional change requires a separately
 * documented decision, not a silent refactor drift. `model.conf` is a static
 * file identical across Profiles; `policy.csv` and `api/src/policy.ts` derive
 * from each Profile's declared PolicyModel.
 */
const LEGACY_DIGESTS: Readonly<
  Record<FactoryProfile, Readonly<Record<string, string>>>
> = {
  "expense-approval": {
    "api/policy/model.conf":
      "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
    "api/policy/policy.csv":
      "0670fa73b726663e7390b98ffb0c30129f86478a08ad4ee3f6e0319785cd5162",
    "api/src/policy.ts":
      "b91d46513f1e86d64232c3c9628f21bb750f74aaf91b737f6bfcc453161cbc17",
  },
  "restaurant-ordering": {
    "api/policy/model.conf":
      "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
    "api/policy/policy.csv":
      "62630f3572cb1a7d47caf86422ba4a71d01446f892082c89512660f3760925fb",
    "api/src/policy.ts":
      "62557d0df0f47d247e9f3b1f3402d03aa06373bbee569643421ec991c4aa1b76",
  },
  "simple-ecommerce": {
    "api/policy/model.conf":
      "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
    "api/policy/policy.csv":
      "1c222d6f7d6f283541569be9640ad76356e95c9970b0d1d20ec692aad074b5fc",
    "api/src/policy.ts":
      "acc31bbae31a56762bd56e39ffccf68b2a6c31882002a641e19f8564f87a21de",
  },
  "retail-counter": {
    "api/policy/model.conf":
      "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
    "api/policy/policy.csv":
      "f56836da30a270bbf73d7d3dfce09cc7824116fa5f763330f90540191408192a",
    "api/src/policy.ts":
      "8fc413e98f92ab9ee3823881142567dfeff3816d9d319aa138228c626b81ce96",
  },
  "grocery-pickup": {
    "api/policy/model.conf":
      "10f281d006f6e3b3210e56fa0ffc1771993156fdc5e131f8bdc975b03ef0ef26",
    "api/policy/policy.csv":
      "89fc5db4fc50c2d127d1db8f4b12be1042a4352c72a43c5a8319807acbfba2f6",
    "api/src/policy.ts":
      "492cffa36c4d9203cc2b6661ea50ac14315255beb2bcd2fec1cad0b4ecef05c2",
  },
};

function persistedSelections(
  graph: ApplicationGraphV1,
): readonly CapabilitySelectionV1[] {
  const profile = graph.integration.compositionProfile as
    FactoryProfile | undefined;
  const selectionByKey = new Map(
    profile
      ? composeDefaultCapabilityDraft({
          profile,
        }).graph.integration.compositionSelections?.map((selection) => [
          selection.lock.key,
          selection,
        ])
      : [],
  );
  return (graph.integration.assetLocks ?? []).map((lock) => {
    const selection = selectionByKey.get(lock.key);
    return {
      lock,
      bindings:
        selection?.lock.version === lock.version &&
        selection.lock.manifestDigest === lock.manifestDigest
          ? selection.bindings
          : {},
    };
  });
}

function compileFor(profile: FactoryProfile): PublishedGraphInput {
  const graph = assertValidApplicationGraph(
    composeProfileDraft({ profile }).graph,
  );
  return {
    publishedRevisionId: "parity",
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: persistedSelections(graph),
    }),
  };
}

describe("policy target file/byte/digest parity", () => {
  const registry = createCompilerTargetRegistryV1();
  registry.register(policyTargetPlugin);

  it.each(profiles)(
    "renders $profile policy with exact legacy bytes and digests",
    (profile) => {
      const files = registry.run(
        "casbin-policy",
        buildCompilationInput(compileFor(profile)),
      );
      const byPath = new Map(files.map((file) => [file.path, file.content]));

      for (const [path, legacyDigest] of Object.entries(
        LEGACY_DIGESTS[profile],
      )) {
        const content = byPath.get(path);
        expect(content, `missing ${path}`).toBeDefined();
        expect(sha256Digest(content!)).toBe(legacyDigest);
        expect(Buffer.byteLength(content!, "utf8")).toBeGreaterThan(0);
      }
      expect(files).toHaveLength(3);
    },
  );

  it("produces the same policy set from repeated renders", () => {
    const input = buildCompilationInput(compileFor("simple-ecommerce"));
    const first = registry.run("casbin-policy", input);
    const second = registry.run("casbin-policy", input);

    expect(
      first.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    ).toEqual(
      second.map((file) => `${file.path}:${sha256Digest(file.content)}`),
    );
  });
});

describe("policy target fail-closed validation", () => {
  const completeSet = (): readonly GeneratedFile[] => [
    {
      path: "api/policy/model.conf",
      content:
        "[request_definition]\nr = sub, obj, act\n\n[matchers]\nm = r.sub == p.sub && r.obj == p.obj && r.act == p.act\n",
    },
    { path: "api/policy/policy.csv", content: "p, shopper, product, read\n" },
    {
      path: "api/src/policy.ts",
      content:
        'import { newEnforcer } from "casbin";\n\nexport async function enforce() {}\n',
    },
  ];

  it("accepts the complete policy set", () => {
    expect(policyTargetPlugin.validate(completeSet())).toEqual({ ok: true });
  });

  it("rejects a set missing a declared policy file", () => {
    const result = policyTargetPlugin.validate(completeSet().slice(1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "api/policy/model.conf",
          code: "missing.policy-file",
        }),
      );
    }
  });

  it("rejects an undeclared policy file", () => {
    const result = policyTargetPlugin.validate([
      ...completeSet(),
      { path: "api/policy/unexpected.csv", content: "x" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "api/policy/unexpected.csv",
          code: "unexpected.policy-file",
        }),
      );
    }
  });

  it("rejects a malformed policy file", () => {
    const files = completeSet();
    files[0] = { path: "api/policy/model.conf", content: "not a model" };

    const result = policyTargetPlugin.validate(files);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: "api/policy/model.conf",
          code: "malformed.policy-file",
        }),
      );
    }
  });

  it("rejects a registry run whose validation fails", () => {
    const registry = createCompilerTargetRegistryV1();
    const failing = {
      ...policyTargetPlugin,
      render: () => completeSet().slice(1),
    };

    registry.register(failing);
    expect(() =>
      registry.run(
        "casbin-policy",
        buildCompilationInput(compileFor("simple-ecommerce")),
      ),
    ).toThrow("validation failed");
  });
});
