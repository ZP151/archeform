import type { ApplicationGraphV1 } from "@factory/graph/browser";

export type FactoryProfile =
  "expense-approval" | "restaurant-ordering" | "simple-ecommerce";

export type CapabilityCategory = "core" | "commerce" | "restaurant";

export type CapabilityOutputSlot =
  | "api.runtime"
  | "api.command"
  | "api.router"
  | "api.service"
  | "database.schema"
  | "database.migration"
  | "page.block"
  | "policy.rule"
  | "test.fixture"
  | "test.journey"
  | "flow.effect"
  | "flow.handler"
  | "web.customer"
  | "web.merchant"
  | "web.component"
  | "web.route"
  | "web.navigation"
  | "report.read-model"
  | "realtime.event"
  | "docs.section";

export type CapabilityRuntimeHandlerKindV1 =
  "record" | "workflow" | "cart" | "effect";

export type CapabilityParameterTypeV1 = "number" | "boolean" | "graph-symbol";

export interface CapabilityParameterSchemaV1 {
  readonly key: string;
  readonly type: CapabilityParameterTypeV1;
  readonly required: boolean;
}

export type CapabilityBindingContractV1 = "factory.capability-binding/v1";

export type CapabilityBindingInputTypeV1 =
  | "domain.entity"
  | "domain.field"
  | "page.page"
  | "page.navigation"
  | "policy.role"
  | "flow.flow"
  | "integration.provider"
  | "experience.token";

export type CapabilityBindingFieldTypeV1 =
  ApplicationGraphV1["domain"]["entities"][number]["fields"][number]["type"];

interface CapabilityBindingInputBaseV1 {
  readonly key: string;
  readonly required: boolean;
}

export interface CapabilityDomainFieldBindingInputV1 extends CapabilityBindingInputBaseV1 {
  readonly type: "domain.field";
  readonly ownerBinding: string;
  readonly fieldTypes: readonly CapabilityBindingFieldTypeV1[];
  readonly fieldRequired?: boolean;
  readonly fieldUnique?: boolean;
}

export interface CapabilityNonFieldBindingInputV1 extends CapabilityBindingInputBaseV1 {
  readonly type: Exclude<CapabilityBindingInputTypeV1, "domain.field">;
  readonly ownerBinding?: never;
  readonly fieldTypes?: never;
  readonly fieldRequired?: never;
  readonly fieldUnique?: never;
}

export type CapabilityBindingInputV1 =
  CapabilityDomainFieldBindingInputV1 | CapabilityNonFieldBindingInputV1;

export type LegacyCapabilityInputTypeV1 =
  | "currency.code"
  | "domain.entities"
  | "domain.entity"
  | "domain.field"
  | "duration"
  | "flow.model"
  | "http.header"
  | "integer"
  | "message.template"
  | "page.page"
  | "policy.role";

export interface LegacyCapabilityInputV1 {
  readonly key: string;
  readonly type: LegacyCapabilityInputTypeV1;
  readonly required: boolean;
}

export type CapabilityManifestInputV1 =
  LegacyCapabilityInputV1 | CapabilityBindingInputV1;

export type CapabilityGraphModelV1 = Exclude<
  keyof ApplicationGraphV1,
  "apiVersion" | "metadata"
>;

export interface CapabilityGraphContributionV1 {
  readonly id: string;
  readonly model: CapabilityGraphModelV1;
  readonly collection: string;
  readonly operation: "append" | "extend";
  readonly parameterRefs: readonly string[];
  readonly digest: string;
}

export interface CapabilityExecutableContributionV1 {
  readonly id: string;
  readonly outputSlot: CapabilityOutputSlot;
  readonly namespace: string;
  readonly source: string;
  readonly target: string;
  readonly parameterRefs: readonly string[];
  readonly targetRuntimeInterfaceVersion: string;
  readonly orderingRequirements: readonly string[];
  readonly mergeProtocol: "replace-file" | "append-fragment";
  readonly digest: string;
}

export interface CapabilityRequirementV1 {
  readonly interfaceKey: string;
  readonly version: string;
  readonly multiProvider?: boolean;
}

export interface CapabilityProvideV1 {
  readonly interfaceKey: string;
  readonly version: string;
}

export interface CapabilityTemplateContributionV1 {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly outputSlot: CapabilityOutputSlot;
  readonly digest: string;
}

export interface CapabilityAssetManifestV1 {
  readonly apiVersion: "factory.capability/v1";
  readonly bindingContract?: CapabilityBindingContractV1;
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
  readonly inputSchema: readonly CapabilityManifestInputV1[];
  readonly outputSlots: readonly CapabilityOutputSlot[];
  readonly runtimeHandlers?: readonly CapabilityRuntimeHandlerKindV1[];
  readonly templates: readonly CapabilityTemplateContributionV1[];
  readonly parameters?: readonly CapabilityParameterSchemaV1[];
  readonly graphContributions?: readonly CapabilityGraphContributionV1[];
  readonly executableContributions?: readonly CapabilityExecutableContributionV1[];
  readonly requires?: readonly CapabilityRequirementV1[];
  readonly provides?: readonly CapabilityProvideV1[];
  readonly verification: {
    readonly fixture: string;
    readonly fixtureDigest?: string;
    readonly contractTest: string;
    readonly contractTestDigest?: string;
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
