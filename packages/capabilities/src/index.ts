import {
  assertValidApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph/browser";

import {
  capabilityAssets,
  currentCapabilityAssets,
  lockCapabilityAsset,
  type CapabilityAssetV1,
  type CapabilityAssetLockV1,
  type CapabilityCategory,
  type FactoryProfile,
} from "./assets/index.js";
import {
  resolveCapabilityComposition,
  type CapabilityCompositionV1,
  type CapabilitySelectionV1,
} from "./composition.js";
import { assertRestaurantOrderingProfile } from "./restaurant/profile.js";

export type {
  CapabilityAssetLockV1,
  CapabilityAssetManifestV1,
  CapabilityCategory,
  CapabilityExecutableContributionV1,
  CapabilityGraphContributionV1,
  CapabilityOutputSlot,
  CapabilityParameterSchemaV1,
  CapabilityProvideV1,
  CapabilityRequirementV1,
  FactoryProfile,
} from "./assets/index.js";

export {
  createCapabilityCompositionLock,
  resolveCapabilityComposition,
} from "./composition.js";
export type {
  CapabilityBindingValueV1,
  CapabilityCompositionLockV1,
  CapabilityCompositionV1,
  CapabilitySelectionV1,
  CreateCapabilityCompositionLockInput,
  ResolveCapabilityCompositionInput,
} from "./composition.js";

export {
  assertRestaurantOrderingProfile,
  validateRestaurantOrderingProfile,
} from "./restaurant/profile.js";
export type {
  RestaurantAdjustmentReason,
  RestaurantEntityKey,
  RestaurantInventoryLedgerProvenance,
  RestaurantProfileProjectionV1,
  RestaurantProfileValidationIssue,
} from "./restaurant/profile.js";

export interface CapabilityDefinition {
  readonly key: string;
  readonly name: string;
  readonly category: CapabilityCategory;
  readonly description: string;
  readonly profiles: readonly FactoryProfile[];
  readonly effects: readonly string[];
}

export { capabilityAssets };

const definitionFor = (asset: CapabilityAssetV1): CapabilityDefinition => ({
  key: asset.manifest.key,
  name: asset.manifest.name,
  category: asset.manifest.category,
  description: asset.manifest.description,
  profiles: asset.manifest.profiles,
  effects: asset.manifest.effects,
});

export const capabilityCatalog = Object.freeze(
  currentCapabilityAssets.map(definitionFor),
);

export interface GoldenAssetValidationContext {
  readonly profile: string;
  readonly capabilityKeys: readonly string[];
}

export interface GoldenCompositionValidationContext extends GoldenAssetValidationContext {
  readonly graph: ApplicationGraphV1;
}

export function getCapabilityAsset(key: string): CapabilityAssetV1 {
  const asset = currentCapabilityAssets.find(
    (candidate) => candidate.manifest.key === key,
  );
  if (!asset) throw new Error(`Unknown Factory capability: ${key}`);
  return asset;
}

/**
 * Resolves a Published Graph lock to the exact Golden package identity it
 * recorded. Current profile composition intentionally uses getCapabilityAsset
 * instead, so new Drafts adopt the default package version.
 */
export function resolveCapabilityAssetLock(
  lock: CapabilityAssetLockV1,
): CapabilityAssetV1 {
  const asset = capabilityAssets.find((candidate) => {
    const expected = lockCapabilityAsset(candidate);
    return (
      expected.key === lock.key &&
      expected.version === lock.version &&
      expected.packageRoot === lock.packageRoot &&
      expected.manifestDigest === lock.manifestDigest &&
      expected.lifecycle === lock.lifecycle
    );
  });
  if (!asset) {
    throw new Error(
      `Capability asset lock '${lock.key}' does not match a registered Golden asset.`,
    );
  }
  return asset;
}

/**
 * The browser-safe Registry boundary: callers may only lock the exact Golden
 * asset/version/digest already shipped by this Factory workspace.
 */
export function assertGoldenCapabilityAssetLocks(
  locks: readonly CapabilityAssetLockV1[],
  context: GoldenAssetValidationContext,
): void {
  const assets = locks.map(resolveCapabilityAssetLock);
  assertResolvedGoldenCapabilityAssets(assets, context);
  for (const asset of assets) {
    if (
      currentCapabilityAssets.includes(asset) &&
      (asset.manifest.requires?.length ?? 0) > 0
    ) {
      throw new Error(
        `Current capability package '${asset.manifest.key}' requires canonical composition selections for dependency/provider admission.`,
      );
    }
  }
}

function assertResolvedGoldenCapabilityAssets(
  assets: readonly CapabilityAssetV1[],
  context: GoldenAssetValidationContext,
): void {
  const providedEffects = new Set<string>();
  const packageKeys: string[] = [];
  for (const { manifest } of assets) {
    packageKeys.push(manifest.key);
    for (const effect of manifest.effects) providedEffects.add(effect);
  }
  assertCapabilityRecipeEligibility(packageKeys, context.profile);
  for (const capabilityKey of context.capabilityKeys) {
    if (!providedEffects.has(capabilityKey)) {
      throw new Error(
        `Graph capability '${capabilityKey}' is not provided by a locked Golden asset.`,
      );
    }
  }
}

export function getCapability(key: string): CapabilityDefinition {
  return definitionFor(getCapabilityAsset(key));
}

export function capabilitiesForProfile(
  profile: FactoryProfile,
): readonly CapabilityDefinition[] {
  return capabilityCatalog.filter((capability) =>
    capability.profiles.includes(profile),
  );
}

export interface ProfileGraphStarter {
  readonly profile: FactoryProfile;
  readonly graph: ApplicationGraphV1;
}

export type OptionalCapabilityKey = "core.audit" | "core.notification";

export interface ProfileComposition {
  readonly profile: FactoryProfile;
  readonly requiredCapabilities: readonly CapabilityDefinition[];
  readonly optionalCapabilities: readonly CapabilityDefinition[];
  readonly defaultOptionalCapabilities: readonly OptionalCapabilityKey[];
}

export interface ProfileCompositionInput {
  readonly profile: FactoryProfile;
  readonly optionalCapabilities?: readonly string[];
}

export interface ProfileCompositionResult {
  readonly profile: FactoryProfile;
  readonly graph: ApplicationGraphV1;
  readonly optionalCapabilities: readonly OptionalCapabilityKey[];
  readonly enabledEffects: readonly string[];
  readonly assetLocks: NonNullable<
    ApplicationGraphV1["integration"]["assetLocks"]
  >;
}

export interface CapabilityDraftCompositionInput {
  readonly graph: ApplicationGraphV1;
  readonly selections: readonly CapabilitySelectionV1[];
}

export interface CapabilityDraftCompositionResult {
  readonly graph: ApplicationGraphV1;
  readonly composition: CapabilityCompositionV1;
}

function graphSymbolIds(
  graph: ApplicationGraphV1,
): Readonly<Record<string, ReadonlySet<string>>> {
  return {
    page: new Set([
      ...graph.page.pages.map(({ id }) => id),
      ...graph.page.navigation.map(({ id }) => id),
    ]),
    domain: new Set([
      ...graph.domain.entities.map(({ key }) => key),
      ...graph.domain.entities.flatMap(({ fields }) =>
        fields.map(({ key }) => key),
      ),
    ]),
    policy: new Set(graph.policy.roles),
    flow: new Set([
      ...graph.flow.flows.map(({ id }) => id),
      ...graph.flow.flows.flatMap(({ states }) => states),
      ...graph.flow.flows.flatMap(({ events }) => events),
    ]),
    integration: new Set([
      ...graph.integration.providers.map(({ id }) => id),
      ...graph.integration.capabilities.map(({ key }) => key),
    ]),
    experience: new Set([
      ...Object.keys(graph.experience.theme.tokens),
      ...graph.experience.locales,
    ]),
  };
}

function assertCompositionGraphSymbols(
  graph: ApplicationGraphV1,
  composition: CapabilityCompositionV1,
): void {
  const symbols = graphSymbolIds(graph);
  for (const selectedPackage of composition.packages) {
    for (const [bindingKey, bindingValue] of Object.entries(
      selectedPackage.bindings,
    )) {
      if (typeof bindingValue !== "object") continue;
      const [, model, id] = bindingValue.graphSymbol.split(".");
      if (!model || !id || !symbols[model]?.has(id)) {
        throw new Error(
          `Graph symbol '${bindingValue.graphSymbol}' does not exist in the base Graph for capability package '${selectedPackage.lock.key}' binding '${bindingKey}'.`,
        );
      }
    }
  }
}

function assertInventoryLedgerGraphSemantics(
  graph: ApplicationGraphV1,
  composition: CapabilityCompositionV1,
): void {
  const inventoryLedger = composition.packages.find(
    ({ lock }) => lock.key === "commerce.inventory-ledger",
  );
  if (!inventoryLedger) return;

  const boundDomainEntity = (bindingKey: string): string => {
    const binding = inventoryLedger.bindings[bindingKey];
    if (
      typeof binding !== "object" ||
      !binding.graphSymbol.startsWith("graph.domain.")
    ) {
      throw new Error(
        `Capability package 'commerce.inventory-ledger' binding '${bindingKey}' must reference graph.domain.`,
      );
    }
    return binding.graphSymbol.slice("graph.domain.".length);
  };

  const movementEntityKey = boundDomainEntity("movementEntity");
  const locationEntityKey = boundDomainEntity("locationEntity");
  const movementEntity = graph.domain.entities.find(
    ({ key }) => key === movementEntityKey,
  );
  const idempotencyField = movementEntity?.fields.find(
    ({ key }) => key === "idempotencyKey",
  );

  if (
    !movementEntity ||
    !idempotencyField ||
    idempotencyField.type !== "string" ||
    idempotencyField.required !== true ||
    idempotencyField.unique !== true
  ) {
    throw new Error(
      `Capability package 'commerce.inventory-ledger' movement entity '${movementEntityKey}' must declare a required unique string idempotencyKey field.`,
    );
  }

  const hasUniqueIdempotencyIndex = movementEntity.indexes.some(
    ({ fields, unique }) =>
      unique === true && fields.length === 1 && fields[0] === "idempotencyKey",
  );
  if (!hasUniqueIdempotencyIndex) {
    throw new Error(
      `Capability package 'commerce.inventory-ledger' movement entity '${movementEntityKey}' must declare a unique single-field idempotencyKey index.`,
    );
  }

  const hasLocationRelation = graph.domain.relations.some(
    ({ from, to, kind }) =>
      from === movementEntityKey &&
      to === locationEntityKey &&
      kind === "many-to-one",
  );
  if (!hasLocationRelation) {
    throw new Error(
      `Capability package 'commerce.inventory-ledger' movement entity '${movementEntityKey}' must declare a many-to-one relation to location entity '${locationEntityKey}'.`,
    );
  }
}

const allowedEffectProviderOverlaps: Readonly<
  Record<string, readonly string[]>
> = {
  "inventory.reserve": ["commerce.inventory", "commerce.inventory-ledger"],
  "inventory.release": ["commerce.inventory", "commerce.inventory-ledger"],
  "inventory.decrement": ["commerce.inventory", "commerce.inventory-ledger"],
};

function assertCapabilityEffectProviderOverlaps(
  packageKeys: readonly string[],
): void {
  const providers = new Map<string, string[]>();
  for (const packageKey of packageKeys) {
    const manifest = getCapabilityAsset(packageKey).manifest;
    for (const effect of manifest.effects) {
      providers.set(effect, [...(providers.get(effect) ?? []), manifest.key]);
    }
  }

  for (const [effect, packageProviders] of providers) {
    if (packageProviders.length < 2) continue;
    const actual = [...packageProviders].sort();
    const allowed = [...(allowedEffectProviderOverlaps[effect] ?? [])].sort();
    if (
      actual.length !== allowed.length ||
      actual.some((provider, index) => provider !== allowed[index])
    ) {
      throw new Error(
        `Capability effect '${effect}' has undeclared providers '${actual.join(", ")}'.`,
      );
    }
  }
}

function assertFoundationPolicyPermissions(
  graph: ApplicationGraphV1,
  composition: CapabilityCompositionV1,
): void {
  const boundSymbol = (
    selectedPackage: CapabilityCompositionV1["packages"][number],
    bindingKey: string,
    expectedModel: "domain" | "policy",
  ): string => {
    const binding = selectedPackage.bindings[bindingKey];
    if (typeof binding !== "object") {
      throw new Error(
        `Capability package '${selectedPackage.lock.key}' binding '${bindingKey}' must be an exact Graph symbol.`,
      );
    }
    const [, model, symbol] = binding.graphSymbol.split(".");
    if (model !== expectedModel || !symbol) {
      throw new Error(
        `Capability package '${selectedPackage.lock.key}' binding '${bindingKey}' must reference graph.${expectedModel}.`,
      );
    }
    return symbol;
  };

  const auditSelected = composition.packages.some(
    ({ lock }) => lock.key === "core.audit",
  );
  const requiredPermissions: {
    readonly packageKey: string;
    readonly role: string;
    readonly resource: string;
    readonly actions: readonly string[];
  }[] = [];

  for (const selectedPackage of composition.packages) {
    if (selectedPackage.lock.key === "core.identity-context") {
      const role = boundSymbol(selectedPackage, "defaultRole", "policy");
      requiredPermissions.push(
        {
          packageKey: selectedPackage.lock.key,
          role,
          resource: boundSymbol(selectedPackage, "principalEntity", "domain"),
          actions: ["read"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role,
          resource: boundSymbol(selectedPackage, "sessionEntity", "domain"),
          actions: ["create", "read", "update"],
        },
      );
    }

    if (selectedPackage.lock.key === "core.location-context") {
      const role = boundSymbol(selectedPackage, "customerRole", "policy");
      requiredPermissions.push(
        {
          packageKey: selectedPackage.lock.key,
          role,
          resource: boundSymbol(selectedPackage, "locationEntity", "domain"),
          actions: ["read"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role,
          resource: boundSymbol(selectedPackage, "contextEntity", "domain"),
          actions: ["read"],
        },
      );
    }

    if (selectedPackage.lock.key === "commerce.line-configuration") {
      const customerRole = boundSymbol(
        selectedPackage,
        "customerRole",
        "policy",
      );
      const merchantRole = boundSymbol(
        selectedPackage,
        "merchantRole",
        "policy",
      );
      const optionGroup = boundSymbol(
        selectedPackage,
        "optionGroupEntity",
        "domain",
      );
      const option = boundSymbol(selectedPackage, "optionEntity", "domain");
      const line = boundSymbol(selectedPackage, "lineEntity", "domain");
      requiredPermissions.push(
        {
          packageKey: selectedPackage.lock.key,
          role: customerRole,
          resource: optionGroup,
          actions: ["read"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: customerRole,
          resource: option,
          actions: ["read"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: customerRole,
          resource: line,
          actions: ["create", "read", "update", "delete"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: optionGroup,
          actions: ["create", "read", "update"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: option,
          actions: ["create", "read", "update"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: line,
          actions: auditSelected ? ["read", "audit"] : ["read"],
        },
      );
    }

    if (selectedPackage.lock.key === "commerce.inventory-ledger") {
      const merchantRole = boundSymbol(
        selectedPackage,
        "merchantRole",
        "policy",
      );
      const auditRole = boundSymbol(selectedPackage, "auditRole", "policy");
      const movementEntity = boundSymbol(
        selectedPackage,
        "movementEntity",
        "domain",
      );
      requiredPermissions.push(
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: boundSymbol(selectedPackage, "catalogEntity", "domain"),
          actions: ["read", "update"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: movementEntity,
          actions: ["create", "read"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: boundSymbol(selectedPackage, "orderEntity", "domain"),
          actions: ["read", "update"],
        },
        {
          packageKey: selectedPackage.lock.key,
          role: merchantRole,
          resource: boundSymbol(selectedPackage, "locationEntity", "domain"),
          actions: ["read"],
        },
      );
      if (auditSelected) {
        requiredPermissions.push({
          packageKey: selectedPackage.lock.key,
          role: auditRole,
          resource: movementEntity,
          actions: ["audit"],
        });
      }
    }
  }

  for (const required of requiredPermissions) {
    const grantedActions = new Set(
      graph.policy.permissions
        .filter(
          ({ role, resource }) =>
            role === required.role && resource === required.resource,
        )
        .flatMap(({ actions }) => actions),
    );
    if (required.actions.some((action) => !grantedActions.has(action))) {
      throw new Error(
        `Graph permission '${required.role}:${required.resource}' must include actions '${required.actions.join(", ")}' for capability package '${required.packageKey}'.`,
      );
    }
  }
}

function assertSelectedCapabilityPolicy(
  graph: ApplicationGraphV1,
  composition: CapabilityCompositionV1,
): void {
  for (const selectedPackage of composition.packages) {
    const roleBindings = Object.entries(selectedPackage.bindings).filter(
      ([, value]) =>
        typeof value === "object" &&
        value.graphSymbol.startsWith("graph.policy."),
    );
    for (const [bindingKey, value] of roleBindings) {
      if (typeof value !== "object") continue;
      const role = value.graphSymbol.replace("graph.policy.", "");
      if (!graph.policy.roles.includes(role)) {
        throw new Error(
          `Capability package '${selectedPackage.lock.key}' binding '${bindingKey}' references undeclared role '${role}'.`,
        );
      }
    }
  }
  assertFoundationPolicyPermissions(graph, composition);
}

function assertCompositionPolicyPermissions(
  graph: ApplicationGraphV1,
  composition: CapabilityCompositionV1,
): void {
  assertSelectedCapabilityPolicy(graph, composition);
}

export function composeCapabilityDraft(
  input: CapabilityDraftCompositionInput,
): CapabilityDraftCompositionResult {
  const graph = structuredClone(assertValidApplicationGraph(input.graph));
  assertCapabilityEffectProviderOverlaps(
    input.selections.map(({ lock }) => lock.key),
  );
  const composition = resolveCapabilityComposition({
    selections: input.selections,
  });
  assertCompositionGraphSymbols(graph, composition);
  assertInventoryLedgerGraphSemantics(graph, composition);
  assertCompositionPolicyPermissions(graph, composition);
  graph.integration.compositionSelections = composition.packages.map(
    (selection) => structuredClone(selection),
  );
  return {
    graph: assertValidApplicationGraph(graph),
    composition,
  };
}

type ProfileCompositionRecipe = {
  readonly requiredCapabilities: readonly string[];
  readonly optionalCapabilities: readonly OptionalCapabilityKey[];
};

const compositionRecipes: Readonly<
  Record<FactoryProfile, ProfileCompositionRecipe>
> = {
  "expense-approval": {
    requiredCapabilities: ["core.crud", "core.workflow"],
    optionalCapabilities: ["core.audit", "core.notification"],
  },
  "restaurant-ordering": {
    requiredCapabilities: [
      "core.audit",
      "core.crud",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.order",
      "core.identity-context",
      "core.location-context",
      "restaurant.table-session",
      "restaurant.ordering",
      "restaurant.kitchen",
      "restaurant.cashier",
      "restaurant.reporting",
    ],
    optionalCapabilities: ["core.notification"],
  },
  "simple-ecommerce": {
    requiredCapabilities: [
      "core.crud",
      "core.notification",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.order",
      "commerce.simulated-payment",
      "core.identity-context",
      "core.location-context",
    ],
    optionalCapabilities: ["core.audit"],
  },
};

const defaultCapabilityRecipes: Readonly<
  Record<FactoryProfile, ProfileCompositionRecipe>
> = {
  "expense-approval": compositionRecipes["expense-approval"],
  "restaurant-ordering": {
    requiredCapabilities: [
      "core.audit",
      "core.crud",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.inventory-ledger",
      "commerce.line-configuration",
      "commerce.order",
      "commerce.simulated-payment",
      "core.identity-context",
      "core.location-context",
    ],
    optionalCapabilities: ["core.notification"],
  },
  "simple-ecommerce": compositionRecipes["simple-ecommerce"],
};

function assertCapabilityRecipeEligibility(
  packageKeys: readonly string[],
  profile: string,
): void {
  const recipe = compositionRecipes[profile as FactoryProfile];
  if (!recipe) throw new Error(`Unknown Factory profile '${profile}'.`);
  const eligibleKeys = new Set([
    ...recipe.requiredCapabilities,
    ...recipe.optionalCapabilities,
    ...(defaultCapabilityRecipes[profile as FactoryProfile]
      ?.requiredCapabilities ?? []),
    ...(defaultCapabilityRecipes[profile as FactoryProfile]
      ?.optionalCapabilities ?? []),
  ]);
  for (const packageKey of packageKeys) {
    if (!eligibleKeys.has(packageKey)) {
      throw new Error(
        `Capability package '${packageKey}' is not eligible for recipe '${profile}'.`,
      );
    }
  }
}

export function assertGoldenCapabilityComposition(
  selections: readonly CapabilitySelectionV1[],
  context: GoldenCompositionValidationContext,
): CapabilityCompositionV1 {
  const { composition } = composeCapabilityDraft({
    graph: context.graph,
    selections,
  });
  assertResolvedGoldenCapabilityAssets(
    composition.packages.map(({ lock }) => resolveCapabilityAssetLock(lock)),
    context,
  );
  return composition;
}

const profileCompositionBindings: Readonly<
  Record<
    FactoryProfile,
    Readonly<Record<string, CapabilitySelectionV1["bindings"]>>
  >
> = {
  "expense-approval": {
    "core.audit": {
      actorRole: { graphSymbol: "graph.policy.employee" },
    },
    "core.crud": {
      entityKey: { graphSymbol: "graph.domain.expense" },
      routeKey: { graphSymbol: "graph.page.expenses" },
    },
    "core.notification": {
      recipientRole: { graphSymbol: "graph.policy.employee" },
    },
    "core.workflow": {
      flowKey: { graphSymbol: "graph.flow.expense-review" },
    },
  },
  "restaurant-ordering": {
    "core.audit": {
      actorRole: { graphSymbol: "graph.policy.customer" },
    },
    "core.crud": {
      entityKey: { graphSymbol: "graph.domain.menu-item" },
      routeKey: { graphSymbol: "graph.page.customer-menu" },
    },
    "core.notification": {
      recipientRole: { graphSymbol: "graph.policy.customer" },
    },
    "core.workflow": {
      flowKey: { graphSymbol: "graph.flow.restaurant-order" },
    },
    "commerce.catalog": {
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      catalogPage: { graphSymbol: "graph.page.customer-menu" },
      customerRole: { graphSymbol: "graph.policy.customer" },
    },
    "commerce.cart": {
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      orderEntity: { graphSymbol: "graph.domain.order" },
      cartPage: { graphSymbol: "graph.page.customer-cart" },
      customerRole: { graphSymbol: "graph.policy.customer" },
    },
    "commerce.inventory": {
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      stockField: { graphSymbol: "graph.domain.stock" },
    },
    "commerce.inventory-ledger": {
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      stockField: { graphSymbol: "graph.domain.stock" },
      movementEntity: { graphSymbol: "graph.domain.inventory-ledger" },
      orderEntity: { graphSymbol: "graph.domain.order" },
      locationEntity: { graphSymbol: "graph.domain.restaurant-location" },
      merchantRole: { graphSymbol: "graph.policy.manager" },
      auditRole: { graphSymbol: "graph.policy.manager" },
    },
    "commerce.line-configuration": {
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      lineEntity: { graphSymbol: "graph.domain.order-line" },
      optionGroupEntity: { graphSymbol: "graph.domain.menu-option-group" },
      optionEntity: { graphSymbol: "graph.domain.menu-option" },
      customerRole: { graphSymbol: "graph.policy.customer" },
      merchantRole: { graphSymbol: "graph.policy.manager" },
      catalogPage: { graphSymbol: "graph.page.customer-menu" },
      merchantPage: { graphSymbol: "graph.page.merchant-menu" },
    },
    "commerce.order": {
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
    },
    "commerce.simulated-payment": {
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
    },
    "core.identity-context": {
      principalEntity: { graphSymbol: "graph.domain.restaurant-principal" },
      sessionEntity: { graphSymbol: "graph.domain.table-session" },
      defaultRole: { graphSymbol: "graph.policy.customer" },
    },
    "core.location-context": {
      locationEntity: { graphSymbol: "graph.domain.restaurant-table" },
      contextEntity: { graphSymbol: "graph.domain.table-session" },
      locationCodeField: { graphSymbol: "graph.domain.code" },
      customerRole: { graphSymbol: "graph.policy.customer" },
    },
  },
  "simple-ecommerce": {
    "core.audit": {
      actorRole: { graphSymbol: "graph.policy.merchant" },
    },
    "core.crud": {
      entityKey: { graphSymbol: "graph.domain.product" },
      routeKey: { graphSymbol: "graph.page.catalog" },
    },
    "core.notification": {
      recipientRole: { graphSymbol: "graph.policy.shopper" },
    },
    "core.workflow": {
      flowKey: { graphSymbol: "graph.flow.ecommerce-order" },
    },
    "commerce.catalog": {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      catalogPage: { graphSymbol: "graph.page.catalog" },
      customerRole: { graphSymbol: "graph.policy.shopper" },
    },
    "commerce.cart": {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      orderEntity: { graphSymbol: "graph.domain.order" },
      cartPage: { graphSymbol: "graph.page.checkout" },
      customerRole: { graphSymbol: "graph.policy.shopper" },
    },
    "commerce.inventory": {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      stockField: { graphSymbol: "graph.domain.stock" },
    },
    "commerce.inventory-ledger": {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      stockField: { graphSymbol: "graph.domain.stock" },
      movementEntity: { graphSymbol: "graph.domain.stock-movement" },
      orderEntity: { graphSymbol: "graph.domain.order" },
      locationEntity: { graphSymbol: "graph.domain.store" },
      merchantRole: { graphSymbol: "graph.policy.merchant" },
      auditRole: { graphSymbol: "graph.policy.merchant" },
    },
    "commerce.line-configuration": {
      catalogEntity: { graphSymbol: "graph.domain.product" },
      lineEntity: { graphSymbol: "graph.domain.product-line" },
      optionGroupEntity: { graphSymbol: "graph.domain.product-option-group" },
      optionEntity: { graphSymbol: "graph.domain.product-option" },
      customerRole: { graphSymbol: "graph.policy.shopper" },
      merchantRole: { graphSymbol: "graph.policy.merchant" },
      catalogPage: { graphSymbol: "graph.page.catalog" },
      merchantPage: { graphSymbol: "graph.page.merchant-catalog" },
    },
    "commerce.order": {
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderFlow: { graphSymbol: "graph.flow.ecommerce-order" },
    },
    "commerce.simulated-payment": {
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderFlow: { graphSymbol: "graph.flow.ecommerce-order" },
    },
    "core.identity-context": {
      principalEntity: { graphSymbol: "graph.domain.shopper" },
      sessionEntity: { graphSymbol: "graph.domain.shopper-session" },
      defaultRole: { graphSymbol: "graph.policy.shopper" },
    },
    "core.location-context": {
      locationEntity: { graphSymbol: "graph.domain.store" },
      contextEntity: { graphSymbol: "graph.domain.shopper-session" },
      locationCodeField: { graphSymbol: "graph.domain.code" },
      customerRole: { graphSymbol: "graph.policy.shopper" },
    },
  },
};

const factoryCapabilities = (keys: readonly string[]) =>
  keys.map((key) => ({
    key,
    providerId: "factory",
    operation: key.split(".").at(-1) ?? key,
  }));

const starterGraph = (
  metadata: ApplicationGraphV1["metadata"],
  page: ApplicationGraphV1["page"],
  domain: ApplicationGraphV1["domain"],
  policy: ApplicationGraphV1["policy"],
  flow: ApplicationGraphV1["flow"],
  capabilityKeys: readonly string[],
): ApplicationGraphV1 => ({
  apiVersion: "factory.application-graph/v1",
  metadata,
  page,
  domain,
  policy,
  flow,
  integration: {
    providers: [],
    capabilities: factoryCapabilities(capabilityKeys),
  },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
});

const profileBaseGraphTemplates: readonly ProfileGraphStarter[] = Object.freeze(
  [
    {
      profile: "expense-approval",
      graph: starterGraph(
        {
          id: "expense-approval",
          workspaceId: "local-workspace",
          name: "Expense approval",
        },
        {
          pages: [
            {
              id: "expenses",
              route: "/expenses",
              title: "Expenses",
              blocks: [
                { id: "expense-list", type: "collection", entity: "expense" },
              ],
            },
            {
              id: "new-expense",
              route: "/expenses/new",
              title: "New expense",
              blocks: [{ id: "expense-form", type: "form", entity: "expense" }],
            },
          ],
          navigation: [
            {
              id: "expenses",
              label: "Expenses",
              pageId: "expenses",
              icon: "receipt",
            },
          ],
        },
        {
          entities: [
            {
              key: "expense",
              label: "Expense",
              fields: [
                { key: "amount", type: "decimal", required: true },
                { key: "description", type: "text", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["draft", "submitted", "approved", "rejected"],
                },
              ],
              indexes: [{ fields: ["status"] }],
            },
          ],
          relations: [],
        },
        {
          roles: ["employee", "manager", "finance"],
          permissions: [
            {
              role: "employee",
              resource: "expense",
              actions: ["create", "read"],
            },
            {
              role: "manager",
              resource: "expense",
              actions: ["read", "approve", "reject"],
            },
            {
              role: "finance",
              resource: "expense",
              actions: ["read", "audit"],
            },
          ],
        },
        {
          flows: [
            {
              id: "expense-review",
              entity: "expense",
              initialState: "draft",
              states: ["draft", "submitted", "approved", "rejected"],
              events: ["submit", "approve", "reject"],
              transitions: [
                {
                  from: "draft",
                  event: "submit",
                  to: "submitted",
                  effects: [
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "submitted",
                  event: "approve",
                  to: "approved",
                  roles: ["manager"],
                  effects: [
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "submitted",
                  event: "reject",
                  to: "rejected",
                  roles: ["manager"],
                  effects: [
                    { capability: "audit.record", operation: "record" },
                  ],
                },
              ],
            },
          ],
        },
        ["audit.record", "notification.send"],
      ),
    },
    {
      profile: "restaurant-ordering",
      graph: starterGraph(
        {
          id: "restaurant-ordering",
          workspaceId: "local-workspace",
          name: "Restaurant ordering",
        },
        {
          pages: [
            {
              id: "table-entry",
              route: "/table/:token",
              title: "Join table",
              blocks: [
                {
                  id: "table-session-entry",
                  type: "restaurant-entry",
                  entity: "table-session",
                },
              ],
            },
            {
              id: "customer-menu",
              route: "/menu",
              title: "Menu",
              blocks: [
                {
                  id: "menu-browser",
                  type: "menu-browser",
                  entity: "menu-item",
                },
              ],
            },
            {
              id: "customer-cart",
              route: "/cart",
              title: "Cart",
              blocks: [
                { id: "order-cart", type: "order-cart", entity: "order" },
                {
                  id: "payment-checkout",
                  type: "payment-checkout",
                  entity: "order",
                },
              ],
            },
            {
              id: "current-order",
              route: "/orders/current",
              title: "Current order",
              blocks: [
                { id: "order-tracker", type: "order-tracker", entity: "order" },
              ],
            },
            {
              id: "customer-receipt",
              route: "/receipt/:id",
              title: "Receipt",
              blocks: [{ id: "receipt", type: "receipt", entity: "order" }],
            },
            {
              id: "merchant-tables",
              route: "/merchant/tables",
              title: "Tables",
              blocks: [
                {
                  id: "table-board",
                  type: "table-board",
                  entity: "restaurant-table",
                },
              ],
            },
            {
              id: "merchant-menu",
              route: "/merchant/menu",
              title: "Menu management",
              blocks: [
                {
                  id: "menu-manager",
                  type: "menu-manager",
                  entity: "menu-item",
                },
              ],
            },
            {
              id: "merchant-kitchen",
              route: "/merchant/kitchen",
              title: "Kitchen",
              blocks: [
                {
                  id: "kitchen-board",
                  type: "kitchen-board",
                  entity: "kitchen-ticket",
                },
              ],
            },
            {
              id: "merchant-cashier",
              route: "/merchant/cashier",
              title: "Cashier",
              blocks: [
                {
                  id: "cashier-console",
                  type: "cashier-console",
                  entity: "order",
                },
              ],
            },
            {
              id: "merchant-analytics",
              route: "/merchant/analytics",
              title: "Restaurant analytics",
              blocks: [
                { id: "restaurant-dashboard", type: "restaurant-dashboard" },
              ],
            },
          ],
          navigation: [
            {
              id: "customer-menu",
              label: "Menu",
              pageId: "customer-menu",
              icon: "utensils",
            },
            {
              id: "customer-cart",
              label: "Cart",
              pageId: "customer-cart",
              icon: "shopping-bag",
            },
            {
              id: "current-order",
              label: "Current order",
              pageId: "current-order",
              icon: "receipt",
            },
            {
              id: "merchant-tables",
              label: "Tables",
              pageId: "merchant-tables",
              icon: "layout-grid",
            },
            {
              id: "merchant-menu",
              label: "Menu management",
              pageId: "merchant-menu",
              icon: "notebook-tabs",
            },
            {
              id: "merchant-kitchen",
              label: "Kitchen",
              pageId: "merchant-kitchen",
              icon: "chef-hat",
            },
            {
              id: "merchant-cashier",
              label: "Cashier",
              pageId: "merchant-cashier",
              icon: "badge-dollar-sign",
            },
            {
              id: "merchant-analytics",
              label: "Analytics",
              pageId: "merchant-analytics",
              icon: "chart-no-axes-combined",
            },
          ],
        },
        {
          entities: [
            {
              key: "restaurant-principal",
              label: "Restaurant guest",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                  unique: true,
                },
                {
                  key: "role",
                  type: "enum",
                  required: true,
                  values: ["customer", "manager"],
                },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["role", "active"] }],
            },
            {
              key: "restaurant-location",
              label: "Restaurant location",
              fields: [
                { key: "name", type: "string", required: true },
                { key: "currency", type: "string", required: true },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [],
            },
            {
              key: "restaurant-table",
              label: "Restaurant table",
              fields: [
                { key: "code", type: "string", required: true, unique: true },
                {
                  key: "number",
                  type: "integer",
                  required: true,
                  unique: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["open", "seated", "closed"],
                },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["status"] }],
            },
            {
              key: "table-session",
              label: "Table session",
              fields: [
                { key: "tableCode", type: "string", required: true },
                {
                  key: "tokenDigest",
                  type: "string",
                  required: true,
                  unique: true,
                },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["open", "active", "closed"],
                },
                { key: "openedAt", type: "datetime", required: true },
                { key: "expiresAt", type: "datetime", required: true },
                { key: "guestCount", type: "integer", required: true },
              ],
              indexes: [
                { fields: ["tableCode", "status"] },
                { fields: ["expiresAt"] },
              ],
            },
            {
              key: "menu-category",
              label: "Menu category",
              fields: [
                { key: "name", type: "string", required: true },
                { key: "sortOrder", type: "integer", required: true },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["active", "sortOrder"] }],
            },
            {
              key: "menu-item",
              label: "Menu item",
              fields: [
                { key: "categoryKey", type: "string", required: true },
                { key: "name", type: "string", required: true },
                { key: "description", type: "text", required: true },
                { key: "price", type: "decimal", required: true },
                { key: "available", type: "boolean", required: true },
                { key: "stock", type: "integer", required: true },
                {
                  key: "preparationMinutes",
                  type: "integer",
                  required: true,
                },
                { key: "imageUrl", type: "url", required: true },
              ],
              indexes: [
                { fields: ["categoryKey", "available"] },
                { fields: ["stock"] },
              ],
            },
            {
              key: "menu-option-group",
              label: "Menu option group",
              fields: [
                { key: "menuItemId", type: "string", required: true },
                { key: "name", type: "string", required: true },
                { key: "minimumSelections", type: "integer", required: true },
                { key: "maximumSelections", type: "integer", required: true },
                { key: "required", type: "boolean", required: true },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["menuItemId", "active"] }],
            },
            {
              key: "menu-option",
              label: "Menu option",
              fields: [
                { key: "optionGroupId", type: "string", required: true },
                { key: "name", type: "string", required: true },
                { key: "priceDelta", type: "decimal", required: true },
                { key: "available", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["optionGroupId", "available"] }],
            },
            {
              key: "order",
              label: "Order",
              fields: [
                { key: "tableSessionId", type: "string", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: [
                    "cart",
                    "submitted",
                    "paid",
                    "accepted",
                    "preparing",
                    "ready",
                    "served",
                    "cancelled",
                  ],
                },
                {
                  key: "paymentStatus",
                  type: "enum",
                  required: true,
                  values: ["unpaid", "paid", "reversal-requested"],
                },
                {
                  key: "fulfilmentType",
                  type: "enum",
                  required: true,
                  values: ["dine-in"],
                },
                { key: "orderNote", type: "text", required: true },
                { key: "priority", type: "integer", required: true },
                { key: "total", type: "decimal", required: true },
                { key: "orderVersion", type: "integer", required: true },
                { key: "submittedAt", type: "datetime", required: false },
                { key: "paidAt", type: "datetime", required: false },
              ],
              indexes: [
                { fields: ["tableSessionId", "status"] },
                { fields: ["paymentStatus", "paidAt"] },
              ],
            },
            {
              key: "order-line",
              label: "Order line",
              fields: [
                { key: "orderId", type: "string", required: true },
                { key: "menuItemId", type: "string", required: true },
                { key: "quantity", type: "integer", required: true },
                { key: "unitPrice", type: "decimal", required: true },
                { key: "lineNote", type: "text", required: true },
                { key: "modifiers", type: "json", required: true },
              ],
              indexes: [{ fields: ["orderId"] }],
            },
            {
              key: "order-line-option",
              label: "Order line option",
              fields: [
                { key: "orderLineId", type: "string", required: true },
                { key: "optionId", type: "string", required: true },
                { key: "priceDelta", type: "decimal", required: true },
              ],
              indexes: [{ fields: ["orderLineId"] }, { fields: ["optionId"] }],
            },
            {
              key: "payment-attempt",
              label: "Payment attempt",
              fields: [
                { key: "orderId", type: "string", required: true },
                {
                  key: "method",
                  type: "enum",
                  required: true,
                  values: ["cash", "card"],
                },
                { key: "amount", type: "decimal", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["pending", "succeeded", "failed", "reversed"],
                },
                {
                  key: "idempotencyKey",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "paidAt", type: "datetime", required: false },
              ],
              indexes: [
                { fields: ["orderId", "status"] },
                { fields: ["idempotencyKey"], unique: true },
              ],
            },
            {
              key: "kitchen-ticket",
              label: "Kitchen ticket",
              fields: [
                {
                  key: "orderId",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "tableNumber", type: "integer", required: true },
                { key: "priority", type: "integer", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["paid", "accepted", "preparing", "ready"],
                },
                { key: "acceptedAt", type: "datetime", required: false },
                { key: "startedAt", type: "datetime", required: false },
                { key: "readyAt", type: "datetime", required: false },
              ],
              indexes: [{ fields: ["priority", "status", "tableNumber"] }],
            },
            {
              key: "inventory-ledger",
              label: "Inventory ledger",
              fields: [
                { key: "locationId", type: "string", required: true },
                { key: "menuItemId", type: "string", required: true },
                { key: "orderId", type: "string", required: false },
                {
                  key: "idempotencyKey",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "delta", type: "integer", required: true },
                {
                  key: "provenance",
                  type: "enum",
                  required: true,
                  values: [
                    "order-reservation",
                    "order-release",
                    "manager-adjustment",
                  ],
                },
                {
                  key: "adjustmentReason",
                  type: "enum",
                  required: false,
                  values: [
                    "stock-count",
                    "restock",
                    "spoilage",
                    "damage",
                    "correction",
                  ],
                },
                { key: "recordedAt", type: "datetime", required: true },
              ],
              indexes: [
                { fields: ["locationId", "recordedAt"] },
                { fields: ["menuItemId", "recordedAt"] },
                { fields: ["orderId"] },
                { fields: ["idempotencyKey"], unique: true },
              ],
            },
          ],
          relations: [
            {
              from: "restaurant-location",
              to: "restaurant-table",
              kind: "one-to-many",
            },
            {
              from: "table-session",
              to: "restaurant-table",
              kind: "many-to-one",
              field: "tableCode",
            },
            {
              from: "menu-item",
              to: "menu-category",
              kind: "many-to-one",
              field: "categoryKey",
            },
            {
              from: "menu-option-group",
              to: "menu-item",
              kind: "many-to-one",
              field: "menuItemId",
            },
            {
              from: "menu-option",
              to: "menu-option-group",
              kind: "many-to-one",
              field: "optionGroupId",
            },
            {
              from: "order",
              to: "table-session",
              kind: "many-to-one",
              field: "tableSessionId",
            },
            {
              from: "order-line",
              to: "order",
              kind: "many-to-one",
              field: "orderId",
            },
            {
              from: "order-line",
              to: "menu-item",
              kind: "many-to-one",
              field: "menuItemId",
            },
            {
              from: "order-line-option",
              to: "order-line",
              kind: "many-to-one",
              field: "orderLineId",
            },
            {
              from: "order-line-option",
              to: "menu-option",
              kind: "many-to-one",
              field: "optionId",
            },
            {
              from: "payment-attempt",
              to: "order",
              kind: "many-to-one",
              field: "orderId",
            },
            {
              from: "kitchen-ticket",
              to: "order",
              kind: "one-to-one",
              field: "orderId",
            },
            {
              from: "inventory-ledger",
              to: "restaurant-location",
              kind: "many-to-one",
              field: "locationId",
            },
            {
              from: "inventory-ledger",
              to: "menu-item",
              kind: "many-to-one",
              field: "menuItemId",
            },
            {
              from: "inventory-ledger",
              to: "order",
              kind: "many-to-one",
              field: "orderId",
            },
          ],
          seedData: [
            {
              entity: "restaurant-location",
              id: "main-location",
              values: {
                name: "Main restaurant",
                currency: "USD",
                active: true,
              },
            },
            {
              entity: "restaurant-table",
              id: "table-12",
              values: { code: "T12", number: 12, status: "open", active: true },
            },
            {
              entity: "menu-category",
              id: "mains",
              values: { name: "Mains", sortOrder: 1, active: true },
            },
            {
              entity: "menu-item",
              id: "margherita-pizza",
              values: {
                categoryKey: "mains",
                name: "Margherita pizza",
                description: "Tomato, mozzarella, and basil",
                price: 14,
                available: true,
                stock: 12,
                preparationMinutes: 12,
                imageUrl: "/menu/margherita-pizza.jpg",
              },
            },
            {
              entity: "menu-item",
              id: "mushroom-risotto",
              values: {
                categoryKey: "mains",
                name: "Mushroom risotto",
                description: "Arborio rice and mushrooms",
                price: 18,
                available: true,
                stock: 8,
                preparationMinutes: 18,
                imageUrl: "/menu/mushroom-risotto.jpg",
              },
            },
            {
              entity: "menu-option-group",
              id: "pizza-size",
              values: {
                menuItemId: "margherita-pizza",
                name: "Size",
                minimumSelections: 1,
                maximumSelections: 1,
                required: true,
                active: true,
              },
            },
            {
              entity: "menu-option",
              id: "pizza-size-large",
              values: {
                optionGroupId: "pizza-size",
                name: "Large",
                priceDelta: 4,
                available: true,
              },
            },
          ],
        },
        {
          roles: ["customer", "kitchen", "cashier", "manager"],
          permissions: [
            {
              role: "customer",
              resource: "restaurant-principal",
              actions: ["read"],
            },
            {
              role: "customer",
              resource: "table-session",
              actions: ["create", "read", "update"],
            },
            {
              role: "customer",
              resource: "restaurant-table",
              actions: ["read"],
            },
            { role: "customer", resource: "menu-category", actions: ["read"] },
            { role: "customer", resource: "menu-item", actions: ["read"] },
            {
              role: "customer",
              resource: "order",
              actions: ["create", "read", "update"],
            },
            {
              role: "customer",
              resource: "order-line",
              actions: ["create", "read", "update", "delete"],
            },
            {
              role: "customer",
              resource: "menu-option-group",
              actions: ["read"],
            },
            {
              role: "customer",
              resource: "menu-option",
              actions: ["read"],
            },
            {
              role: "kitchen",
              resource: "kitchen-ticket",
              actions: ["read", "update"],
            },
            { role: "kitchen", resource: "order", actions: ["read", "update"] },
            {
              role: "cashier",
              resource: "payment-attempt",
              actions: ["create", "read"],
            },
            { role: "cashier", resource: "order", actions: ["read", "update"] },
            {
              role: "manager",
              resource: "restaurant-location",
              actions: ["read"],
            },
            {
              role: "manager",
              resource: "restaurant-table",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "table-session",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "menu-category",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "menu-item",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "menu-option-group",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "menu-option",
              actions: ["create", "read", "update"],
            },
            {
              role: "manager",
              resource: "order-line",
              actions: ["read", "audit"],
            },
            {
              role: "manager",
              resource: "order",
              actions: ["read", "audit"],
            },
            {
              role: "manager",
              resource: "order",
              actions: ["update", "cancel"],
            },
            {
              role: "manager",
              resource: "inventory-ledger",
              actions: ["create", "read", "audit"],
            },
          ],
        },
        {
          flows: [
            {
              id: "restaurant-table-session",
              entity: "table-session",
              initialState: "open",
              states: ["open", "active", "closed"],
              events: ["activate", "close", "expire"],
              transitions: [
                {
                  from: "open",
                  event: "activate",
                  to: "active",
                  roles: ["manager"],
                },
                {
                  from: "active",
                  event: "close",
                  to: "closed",
                  roles: ["manager"],
                  effects: [
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                { from: "open", event: "expire", to: "closed" },
                { from: "active", event: "expire", to: "closed" },
              ],
            },
            {
              id: "restaurant-order",
              entity: "order",
              initialState: "cart",
              states: [
                "cart",
                "submitted",
                "paid",
                "accepted",
                "preparing",
                "ready",
                "served",
                "cancelled",
              ],
              events: [
                "submit",
                "pay",
                "accept",
                "start-preparing",
                "mark-ready",
                "serve",
                "cancel",
              ],
              transitions: [
                {
                  from: "cart",
                  event: "submit",
                  to: "submitted",
                  roles: ["customer"],
                  effects: [
                    { capability: "order.create", operation: "create" },
                    { capability: "inventory.reserve", operation: "reserve" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "submitted",
                  event: "pay",
                  to: "paid",
                  roles: ["customer", "cashier"],
                  effects: [
                    { capability: "payment.simulate", operation: "simulate" },
                    {
                      capability: "inventory.decrement",
                      operation: "decrement",
                    },
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "paid",
                  event: "accept",
                  to: "accepted",
                  roles: ["kitchen"],
                  effects: [
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "accepted",
                  event: "start-preparing",
                  to: "preparing",
                  roles: ["kitchen"],
                  effects: [
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "preparing",
                  event: "mark-ready",
                  to: "ready",
                  roles: ["kitchen"],
                  effects: [
                    { capability: "order.transition", operation: "transition" },
                    { capability: "notification.send", operation: "send" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "ready",
                  event: "serve",
                  to: "served",
                  roles: ["cashier"],
                  effects: [
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "submitted",
                  event: "cancel",
                  to: "cancelled",
                  roles: ["manager"],
                  effects: [
                    { capability: "inventory.release", operation: "release" },
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
                {
                  from: "paid",
                  event: "cancel",
                  to: "cancelled",
                  roles: ["manager"],
                  effects: [
                    { capability: "order.transition", operation: "transition" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
              ],
            },
            {
              id: "restaurant-inventory-ledger",
              entity: "inventory-ledger",
              initialState: "recorded",
              states: ["recorded"],
              events: ["record-manager-adjustment"],
              transitions: [
                {
                  from: "recorded",
                  event: "record-manager-adjustment",
                  to: "recorded",
                  roles: ["manager"],
                  effects: [
                    { capability: "inventory.adjust", operation: "adjust" },
                    { capability: "audit.record", operation: "record" },
                  ],
                },
              ],
            },
          ],
        },
        [
          "catalog.list",
          "catalog.read",
          "cart.add",
          "cart.remove",
          "cart.checkout",
          "inventory.reserve",
          "inventory.release",
          "inventory.decrement",
          "order.create",
          "order.transition",
          "payment.simulate",
          "table-session.create",
          "table-session.validate",
          "table-session.close",
          "table-session.expire",
          "inventory.adjust",
          "inventory.ledger.read",
          "identity.context.resolve",
          "identity.context.validate",
          "location.context.resolve",
          "location.context.validate",
          "line.configuration.validate",
          "line.configuration.price",
          "line.configuration.availability.manage",
          "order.line.add",
          "order.line.update",
          "order.line.remove",
          "order.submit",
          "order.cancel",
          "order.history",
          "kitchen.ticket.create",
          "kitchen.ticket.accept",
          "kitchen.ticket.prepare",
          "kitchen.ticket.ready",
          "payment.reversal.request",
          "order.serve",
          "receipt.render",
          "report.restaurant.summary",
          "report.restaurant.low-stock",
          "notification.send",
          "audit.record",
        ],
      ),
    },
    {
      profile: "simple-ecommerce",
      graph: starterGraph(
        {
          id: "simple-ecommerce",
          workspaceId: "local-workspace",
          name: "Simple ecommerce",
        },
        {
          pages: [
            {
              id: "catalog",
              route: "/",
              title: "Catalog",
              blocks: [
                { id: "product-catalog", type: "catalog", entity: "product" },
              ],
            },
            {
              id: "checkout",
              route: "/checkout",
              title: "Checkout",
              blocks: [
                { id: "checkout-form", type: "checkout", entity: "order" },
              ],
            },
            {
              id: "orders",
              route: "/orders",
              title: "Orders",
              blocks: [
                { id: "order-list", type: "collection", entity: "order" },
              ],
            },
            {
              id: "merchant-catalog",
              route: "/merchant/catalog",
              title: "Product management",
              blocks: [
                {
                  id: "merchant-product-catalog",
                  type: "collection",
                  entity: "product",
                },
              ],
            },
          ],
          navigation: [
            {
              id: "catalog",
              label: "Catalog",
              pageId: "catalog",
              icon: "store",
            },
            {
              id: "orders",
              label: "Orders",
              pageId: "orders",
              icon: "package",
            },
            {
              id: "merchant-catalog",
              label: "Product management",
              pageId: "merchant-catalog",
              icon: "boxes",
            },
          ],
        },
        {
          entities: [
            {
              key: "shopper",
              label: "Shopper",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["active"] }],
            },
            {
              key: "shopper-session",
              label: "Shopping session",
              fields: [
                {
                  key: "subjectRef",
                  type: "string",
                  required: true,
                },
                { key: "storeCode", type: "string", required: true },
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["active", "expired"],
                },
                { key: "expiresAt", type: "datetime", required: true },
              ],
              indexes: [
                { fields: ["subjectRef", "status"] },
                { fields: ["expiresAt"] },
              ],
            },
            {
              key: "store",
              label: "Store",
              fields: [
                {
                  key: "code",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "name", type: "string", required: true },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["active"] }],
            },
            {
              key: "product",
              label: "Product",
              fields: [
                { key: "name", type: "string", required: true },
                { key: "price", type: "decimal", required: true },
                { key: "stock", type: "integer", required: true },
              ],
              indexes: [],
            },
            {
              key: "product-option-group",
              label: "Product option group",
              fields: [
                { key: "productId", type: "string", required: true },
                { key: "name", type: "string", required: true },
                { key: "minimumSelections", type: "integer", required: true },
                { key: "maximumSelections", type: "integer", required: true },
                { key: "required", type: "boolean", required: true },
                { key: "active", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["productId", "active"] }],
            },
            {
              key: "product-option",
              label: "Product option",
              fields: [
                { key: "optionGroupId", type: "string", required: true },
                { key: "name", type: "string", required: true },
                { key: "priceDelta", type: "decimal", required: true },
                { key: "available", type: "boolean", required: true },
              ],
              indexes: [{ fields: ["optionGroupId", "available"] }],
            },
            {
              key: "order",
              label: "Order",
              fields: [
                {
                  key: "status",
                  type: "enum",
                  required: true,
                  values: ["cart", "paid", "fulfilled"],
                },
              ],
              indexes: [{ fields: ["status"] }],
            },
            {
              key: "product-line",
              label: "Product line",
              fields: [
                { key: "orderId", type: "string", required: true },
                { key: "productId", type: "string", required: true },
                { key: "quantity", type: "integer", required: true },
                { key: "unitPrice", type: "decimal", required: true },
                { key: "configuration", type: "json", required: true },
              ],
              indexes: [{ fields: ["orderId"] }],
            },
            {
              key: "stock-movement",
              label: "Stock movement",
              fields: [
                { key: "productId", type: "string", required: true },
                { key: "orderId", type: "string", required: false },
                { key: "storeCode", type: "string", required: true },
                { key: "delta", type: "integer", required: true },
                { key: "reason", type: "string", required: true },
                {
                  key: "idempotencyKey",
                  type: "string",
                  required: true,
                  unique: true,
                },
                { key: "recordedAt", type: "datetime", required: true },
              ],
              indexes: [
                { fields: ["productId", "recordedAt"] },
                { fields: ["idempotencyKey"], unique: true },
              ],
            },
          ],
          relations: [
            {
              from: "shopper-session",
              to: "shopper",
              kind: "many-to-one",
              field: "subjectRef",
            },
            {
              from: "shopper-session",
              to: "store",
              kind: "many-to-one",
              field: "storeCode",
            },
            { from: "order", to: "product", kind: "many-to-many" },
            {
              from: "product-option-group",
              to: "product",
              kind: "many-to-one",
              field: "productId",
            },
            {
              from: "product-option",
              to: "product-option-group",
              kind: "many-to-one",
              field: "optionGroupId",
            },
            {
              from: "product-line",
              to: "order",
              kind: "many-to-one",
              field: "orderId",
            },
            {
              from: "product-line",
              to: "product",
              kind: "many-to-one",
              field: "productId",
            },
            {
              from: "stock-movement",
              to: "product",
              kind: "many-to-one",
              field: "productId",
            },
            {
              from: "stock-movement",
              to: "store",
              kind: "many-to-one",
              field: "storeCode",
            },
          ],
          seedData: [
            {
              entity: "store",
              id: "primary-store",
              values: { code: "WEB", name: "Online store", active: true },
            },
            {
              entity: "product",
              id: "everyday-tote",
              values: { name: "Everyday tote", price: 48, stock: 20 },
            },
            {
              entity: "product",
              id: "studio-lamp",
              values: { name: "Studio lamp", price: 85, stock: 8 },
            },
            {
              entity: "product-option-group",
              id: "tote-colour",
              values: {
                productId: "everyday-tote",
                name: "Colour",
                minimumSelections: 1,
                maximumSelections: 1,
                required: true,
                active: true,
              },
            },
            {
              entity: "product-option",
              id: "tote-colour-slate",
              values: {
                optionGroupId: "tote-colour",
                name: "Slate",
                priceDelta: 0,
                available: true,
              },
            },
          ],
        },
        {
          roles: ["shopper", "merchant"],
          permissions: [
            {
              role: "shopper",
              resource: "shopper",
              actions: ["read"],
            },
            {
              role: "shopper",
              resource: "shopper-session",
              actions: ["create", "read", "update"],
            },
            { role: "shopper", resource: "store", actions: ["read"] },
            { role: "shopper", resource: "product", actions: ["read"] },
            {
              role: "shopper",
              resource: "order",
              actions: ["create", "read", "update"],
            },
            {
              role: "shopper",
              resource: "product-option-group",
              actions: ["read"],
            },
            {
              role: "shopper",
              resource: "product-line",
              actions: ["create", "read", "update", "delete"],
            },
            {
              role: "shopper",
              resource: "product-option",
              actions: ["read"],
            },
            {
              role: "merchant",
              resource: "product",
              actions: ["create", "read", "update"],
            },
            {
              role: "merchant",
              resource: "product-option-group",
              actions: ["create", "read", "update"],
            },
            {
              role: "merchant",
              resource: "product-option",
              actions: ["create", "read", "update"],
            },
            {
              role: "merchant",
              resource: "product-line",
              actions: ["read", "audit"],
            },
            { role: "merchant", resource: "store", actions: ["read"] },
            {
              role: "merchant",
              resource: "order",
              actions: ["read", "update", "audit"],
            },
            {
              role: "merchant",
              resource: "stock-movement",
              actions: ["create", "read", "audit"],
            },
          ],
        },
        {
          flows: [
            {
              id: "ecommerce-order",
              entity: "order",
              initialState: "cart",
              states: ["cart", "paid", "fulfilled"],
              events: ["pay", "fulfil"],
              transitions: [
                {
                  from: "cart",
                  event: "pay",
                  to: "paid",
                  effects: [
                    { capability: "payment.simulate", operation: "simulate" },
                    {
                      capability: "inventory.decrement",
                      operation: "decrement",
                    },
                  ],
                },
                {
                  from: "paid",
                  event: "fulfil",
                  to: "fulfilled",
                  roles: ["merchant"],
                  effects: [
                    { capability: "audit.record", operation: "record" },
                  ],
                },
              ],
            },
          ],
        },
        [
          "catalog.list",
          "catalog.read",
          "cart.add",
          "cart.remove",
          "cart.checkout",
          "inventory.reserve",
          "inventory.release",
          "inventory.decrement",
          "inventory.adjust",
          "inventory.ledger.read",
          "identity.context.resolve",
          "identity.context.validate",
          "location.context.resolve",
          "location.context.validate",
          "line.configuration.validate",
          "line.configuration.price",
          "line.configuration.availability.manage",
          "order.create",
          "order.transition",
          "payment.simulate",
          "audit.record",
          "notification.send",
        ],
      ),
    },
  ],
);

export const profileGraphs: readonly ProfileGraphStarter[] = Object.freeze(
  profileBaseGraphTemplates.map(({ profile, graph }) =>
    Object.freeze({ profile, graph: structuredClone(graph) }),
  ),
);

function profileStarterFor(profile: FactoryProfile): ProfileGraphStarter {
  const starter = profileBaseGraphTemplates.find(
    (candidate) => candidate.profile === profile,
  );
  if (!starter) throw new Error(`Unknown Factory profile '${profile}'.`);
  return starter;
}

function createDefaultProfileBaseGraph(
  profile: FactoryProfile,
): ApplicationGraphV1 {
  const graph = structuredClone(profileStarterFor(profile).graph);
  if (profile !== "restaurant-ordering") return graph;

  const genericBlockTypes: Readonly<Record<string, string>> = {
    "restaurant-entry": "form",
    "menu-browser": "catalog",
    "order-cart": "cart",
    "payment-checkout": "checkout",
    "order-tracker": "collection",
    receipt: "collection",
    "table-board": "collection",
    "menu-manager": "collection",
    "kitchen-board": "collection",
    "cashier-console": "collection",
    "restaurant-dashboard": "hero",
  };
  graph.page.pages = graph.page.pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => ({
      ...block,
      type: genericBlockTypes[block.type] ?? block.type,
    })),
  }));
  return graph;
}

export function getProfileComposition(
  profile: FactoryProfile,
): ProfileComposition {
  const recipe = compositionRecipes[profile];
  if (!recipe) throw new Error(`Unknown Factory profile '${profile}'.`);
  profileStarterFor(profile);
  assertCapabilityEffectProviderOverlaps([
    ...recipe.requiredCapabilities,
    ...recipe.optionalCapabilities,
  ]);
  return {
    profile,
    requiredCapabilities: recipe.requiredCapabilities.map(getCapability),
    optionalCapabilities: recipe.optionalCapabilities.map(getCapability),
    defaultOptionalCapabilities: [...recipe.optionalCapabilities],
  };
}

/** Creates a default base Graph and routes the profile recipe through the
 * generic composition boundary. Control Plane repeats Graph validation before
 * persistence as an independent server-side boundary.
 */
export function composeDefaultCapabilityDraft(
  input: ProfileCompositionInput,
): ProfileCompositionResult {
  const recipe = defaultCapabilityRecipes[input.profile];
  if (!recipe) throw new Error(`Unknown Factory profile '${input.profile}'.`);
  const profileComposition: ProfileComposition = {
    profile: input.profile,
    requiredCapabilities: recipe.requiredCapabilities.map(getCapability),
    optionalCapabilities: recipe.optionalCapabilities.map(getCapability),
    defaultOptionalCapabilities: [...recipe.optionalCapabilities],
  };
  const requested = input.optionalCapabilities
    ? [...input.optionalCapabilities]
    : [...profileComposition.defaultOptionalCapabilities];
  const requestedSet = new Set(requested);
  if (requestedSet.size !== requested.length) {
    throw new Error("Optional capability selections must be unique.");
  }
  for (const capability of requested) {
    if (
      !profileComposition.defaultOptionalCapabilities.includes(
        capability as OptionalCapabilityKey,
      )
    ) {
      throw new Error(
        `Optional capability '${capability}' is not supported by profile '${input.profile}'.`,
      );
    }
  }

  const graph = createDefaultProfileBaseGraph(input.profile);
  for (const capability of profileComposition.defaultOptionalCapabilities) {
    if (requestedSet.has(capability)) continue;
    const asset = getCapabilityAsset(capability);
    if (!asset.disable) {
      throw new Error(
        `Optional capability asset '${capability}' does not declare a bounded disable adapter.`,
      );
    }
    asset.disable(graph);
  }

  const selectedCapabilityKeys = [
    ...profileComposition.requiredCapabilities.map(({ key }) => key),
    ...profileComposition.defaultOptionalCapabilities
      .filter((capability) => requestedSet.has(capability))
      .map((capability) => capability),
  ];
  assertCapabilityRecipeEligibility(selectedCapabilityKeys, input.profile);
  const selections = selectedCapabilityKeys.map(
    (key): CapabilitySelectionV1 => {
      const bindings = profileCompositionBindings[input.profile][key];
      if (!bindings) {
        throw new Error(
          `Profile '${input.profile}' does not declare bindings for capability '${key}'.`,
        );
      }
      return {
        lock: lockCapabilityAsset(getCapabilityAsset(key)),
        bindings: structuredClone(bindings),
      };
    },
  );

  const { graph: validatedGraph, composition } = composeCapabilityDraft({
    graph,
    selections,
  });
  return {
    profile: input.profile,
    graph: validatedGraph,
    optionalCapabilities: profileComposition.defaultOptionalCapabilities.filter(
      (capability) => requestedSet.has(capability),
    ),
    enabledEffects: validatedGraph.integration.capabilities.map(
      (capability) => capability.key,
    ),
    assetLocks: composition.packages.map(({ lock }) => lock),
  };
}

/** Legacy profile composer retained for explicit Restaurant profile callers.
 * Active Workbench starters use composeDefaultCapabilityDraft instead.
 */
export function composeProfileDraft(
  input: ProfileCompositionInput,
): ProfileCompositionResult {
  const composition = getProfileComposition(input.profile);
  const requested = input.optionalCapabilities
    ? [...input.optionalCapabilities]
    : [...composition.defaultOptionalCapabilities];
  const requestedSet = new Set(requested);
  if (requestedSet.size !== requested.length) {
    throw new Error("Optional capability selections must be unique.");
  }
  for (const capability of requested) {
    if (
      !composition.defaultOptionalCapabilities.includes(
        capability as OptionalCapabilityKey,
      )
    ) {
      throw new Error(
        `Optional capability '${capability}' is not supported by profile '${input.profile}'.`,
      );
    }
  }

  const graph = structuredClone(profileStarterFor(input.profile).graph);
  for (const capability of composition.defaultOptionalCapabilities) {
    if (requestedSet.has(capability)) continue;
    const asset = getCapabilityAsset(capability);
    if (!asset.disable) {
      throw new Error(
        `Optional capability asset '${capability}' does not declare a bounded disable adapter.`,
      );
    }
    asset.disable(graph);
  }

  const selectedAssets = [
    ...composition.requiredCapabilities.map((capability) =>
      getCapabilityAsset(capability.key),
    ),
    ...composition.defaultOptionalCapabilities
      .filter((capability) => requestedSet.has(capability))
      .map(getCapabilityAsset),
  ];
  const admittedComposition = assertGoldenCapabilityComposition(
    selectedAssets.map((asset) => ({
      lock: lockCapabilityAsset(asset),
      bindings: structuredClone(
        profileCompositionBindings[input.profile][asset.manifest.key] ?? {},
      ),
    })),
    {
      profile: input.profile,
      capabilityKeys: graph.integration.capabilities.map(
        (capability) => capability.key,
      ),
      graph,
    },
  );
  graph.integration.compositionProfile = input.profile;
  graph.integration.assetLocks = admittedComposition.packages.map(
    ({ lock }) => lock,
  );

  const validatedGraph = assertValidApplicationGraph(graph);
  if (input.profile === "restaurant-ordering") {
    assertRestaurantOrderingProfile(validatedGraph);
  }
  return {
    profile: input.profile,
    graph: validatedGraph,
    optionalCapabilities: composition.defaultOptionalCapabilities.filter(
      (capability) => requestedSet.has(capability),
    ),
    enabledEffects: validatedGraph.integration.capabilities.map(
      (capability) => capability.key,
    ),
    assetLocks: validatedGraph.integration.assetLocks ?? [],
  };
}
