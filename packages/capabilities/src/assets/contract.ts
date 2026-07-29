import type { ApplicationGraphV1 } from "@factory/graph/browser";

export type FactoryProfile =
  "expense-approval" | "restaurant-ordering" | "simple-ecommerce";

export type CapabilityCategory = "core" | "commerce";

export type CapabilityOutputSlot =
  | "api.runtime"
  | "database.schema"
  | "page.block"
  | "policy.rule"
  | "test.fixture"
  | "flow.effect";

export interface CapabilityAssetManifestV1 {
  readonly apiVersion: "factory.capability/v1";
  readonly key: string;
  readonly version: string;
  readonly category: CapabilityCategory;
  readonly name: string;
  readonly description: string;
  readonly packageRoot: string;
  readonly manifestDigest: string;
  readonly lifecycle: "golden";
  readonly profiles: readonly FactoryProfile[];
  readonly effects: readonly string[];
  readonly inputSchema: readonly {
    readonly key: string;
    readonly type: string;
    readonly required: boolean;
  }[];
  readonly outputSlots: readonly CapabilityOutputSlot[];
  readonly verification: {
    readonly fixture: string;
    readonly contractTest: string;
    readonly status: "verified";
  };
}

export interface CapabilityAssetV1 {
  readonly manifest: CapabilityAssetManifestV1;
  readonly disable?: (graph: ApplicationGraphV1) => void;
}

export type CapabilityAssetLockV1 = Pick<
  CapabilityAssetManifestV1,
  "key" | "version" | "packageRoot" | "manifestDigest" | "lifecycle"
>;

export function lockCapabilityAsset(
  asset: CapabilityAssetV1,
): CapabilityAssetLockV1 {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    asset.manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
}

export function removeCapabilityOperations(
  graph: ApplicationGraphV1,
  operations: readonly string[],
): void {
  const excluded = new Set(operations);
  graph.integration.capabilities = graph.integration.capabilities.filter(
    (capability) => !excluded.has(capability.key),
  );
  graph.flow.flows = graph.flow.flows.map((flow) => ({
    ...flow,
    transitions: flow.transitions.map((transition) => {
      const effects = transition.effects?.filter(
        (effect) => !excluded.has(effect.capability),
      );
      if (effects?.length) return { ...transition, effects };
      const { effects: _effects, ...withoutEffects } = transition;
      return withoutEffects;
    }),
  }));
}

export function removeAuditPermissions(graph: ApplicationGraphV1): void {
  graph.policy.permissions = graph.policy.permissions.flatMap((permission) => {
    const actions = permission.actions.filter((action) => action !== "audit");
    return actions.length ? [{ ...permission, actions }] : [];
  });
}
