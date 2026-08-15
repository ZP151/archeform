import { isDeepStrictEqual } from "node:util";

import {
  createCapabilityCompositionLock,
  getCanonicalRestaurantAuthority,
  type CapabilityCompositionLockV1,
} from "@factory/capabilities";
import {
  adaptPublishedApplicationGraph,
  hashApplicationGraphV3,
  type PublishedApplicationGraphV3Input,
} from "@factory/graph";
import { restaurantScreenRecipes } from "@factory/screen-recipes";

export type RestaurantProductCompilationInputV1 = {
  readonly publishedGraph: PublishedApplicationGraphV3Input;
  readonly compositionLock: CapabilityCompositionLockV1;
};

export type RestaurantSurfaceKey = "customer-mobile" | "merchant-desktop";

const invalidInputMessage = "Restaurant product compilation input is invalid.";
const canonicalGraphHash =
  "sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23";
const canonicalHomeOrder = [
  "home-hero",
  "home-categories",
  "home-items",
] as const;

function failInvalid(): never {
  throw new Error(invalidInputMessage);
}

function copyStrictPlainData(
  input: unknown,
  ancestors = new WeakSet<object>(),
): unknown {
  if (typeof input === "function" || typeof input === "symbol") {
    throw new Error(invalidInputMessage);
  }
  if (input === null || typeof input !== "object") return input;
  if (ancestors.has(input)) throw new Error(invalidInputMessage);
  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype)
        throw new Error(invalidInputMessage);
      const keys = Reflect.ownKeys(input);
      if (
        keys.some((key) => {
          if (key === "length") return false;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key))
            return true;
          const index = Number(key);
          const descriptor = Object.getOwnPropertyDescriptor(input, key);
          return (
            index >= input.length ||
            descriptor?.enumerable !== true ||
            !("value" in descriptor)
          );
        }) ||
        keys.length !== input.length + 1
      ) {
        throw new Error(invalidInputMessage);
      }
      const copy: unknown[] = [];
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          input,
          String(index),
        );
        if (!descriptor || !("value" in descriptor))
          throw new Error(invalidInputMessage);
        copy.push(copyStrictPlainData(descriptor.value, ancestors));
      }
      return copy;
    }

    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null)
      throw new Error(invalidInputMessage);
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (
        typeof key !== "string" ||
        descriptor?.enumerable !== true ||
        !("value" in descriptor)
      ) {
        throw new Error(invalidInputMessage);
      }
      copy[key] = copyStrictPlainData(descriptor.value, ancestors);
    }
    return copy;
  } finally {
    ancestors.delete(input);
  }
}

function assertBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    failInvalid();
  }
}

function assertGraphKey(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    !/^[a-z][a-zA-Z0-9-]*$/.test(value)
  ) {
    failInvalid();
  }
}

function assertInteger(value: unknown, minimum: number, maximum: number): void {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    failInvalid();
  }
}

function assertPrice(value: unknown): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100_000 ||
    Number(value.toFixed(2)) !== value
  ) {
    failInvalid();
  }
  const minor = Math.round(value * 100);
  if (!Number.isInteger(minor) || minor < 0 || minor > 10_000_000) {
    failInvalid();
  }
}

function assertSafeImageUrl(value: unknown): void {
  assertBoundedString(value, 1, 2048);
  const lower = value.toLowerCase();
  if (
    !value.startsWith("/") &&
    !value.startsWith("#") &&
    !value.startsWith("?") &&
    !lower.startsWith("http://") &&
    !lower.startsWith("https://")
  ) {
    failInvalid();
  }
}

function assertCatalogSeed(
  graph: PublishedApplicationGraphV3Input["graph"],
): void {
  const seedData = graph.domain.seedData;
  const scenario = graph.seedScenarios[0];
  if (
    !Array.isArray(seedData) ||
    graph.seedScenarios.length !== 1 ||
    scenario?.key !== "fine-dining-service" ||
    scenario.records.length !== seedData.length
  ) {
    failInvalid();
  }

  const identities = new Set<string>();
  for (let index = 0; index < seedData.length; index += 1) {
    const seed = seedData[index]!;
    const mirror = scenario.records[index]!;
    assertGraphKey(seed.entity);
    assertGraphKey(seed.id);
    const identity = `${seed.entity}\u0000${seed.id}`;
    if (identities.has(identity)) failInvalid();
    identities.add(identity);
    if (
      mirror.entityKey !== seed.entity ||
      !isDeepStrictEqual(mirror.values, seed.values)
    ) {
      failInvalid();
    }
  }

  const categoryEntities = graph.domain.entities.filter(
    ({ key }) => key === "menu-category",
  );
  const itemEntities = graph.domain.entities.filter(
    ({ key }) => key === "menu-item",
  );
  if (
    categoryEntities.length !== 1 ||
    itemEntities.length !== 1 ||
    !isDeepStrictEqual(
      categoryEntities[0]!.fields.map(({ key, type, required }) => ({
        key,
        type,
        required,
      })),
      [
        { key: "name", type: "string", required: true },
        { key: "sortOrder", type: "integer", required: true },
        { key: "active", type: "boolean", required: true },
      ],
    ) ||
    !isDeepStrictEqual(
      itemEntities[0]!.fields.map(({ key, type, required }) => ({
        key,
        type,
        required,
      })),
      [
        { key: "categoryKey", type: "string", required: true },
        { key: "name", type: "string", required: true },
        { key: "description", type: "text", required: true },
        { key: "price", type: "decimal", required: true },
        { key: "available", type: "boolean", required: true },
        { key: "stock", type: "integer", required: true },
        { key: "preparationMinutes", type: "integer", required: true },
        { key: "imageUrl", type: "url", required: true },
      ],
    )
  ) {
    failInvalid();
  }

  const categories = seedData.filter(
    ({ entity }) => entity === "menu-category",
  );
  const items = seedData.filter(({ entity }) => entity === "menu-item");
  if (
    categories.length !== 1 ||
    categories[0]!.id !== "mains" ||
    items.length !== 2 ||
    !isDeepStrictEqual(
      items.map(({ id }) => id),
      ["margherita-pizza", "mushroom-risotto"],
    )
  ) {
    failInvalid();
  }

  const categoryKeys = new Set(categories.map(({ id }) => id));
  for (const category of categories) {
    if (
      !isDeepStrictEqual(Object.keys(category.values), [
        "name",
        "sortOrder",
        "active",
      ])
    ) {
      failInvalid();
    }
    assertBoundedString(category.values.name, 1, 120);
    assertInteger(category.values.sortOrder, 0, 10_000);
    if (typeof category.values.active !== "boolean") failInvalid();
  }
  for (const item of items) {
    if (
      !isDeepStrictEqual(Object.keys(item.values), [
        "categoryKey",
        "name",
        "description",
        "price",
        "available",
        "stock",
        "preparationMinutes",
        "imageUrl",
      ])
    ) {
      failInvalid();
    }
    assertGraphKey(item.values.categoryKey);
    if (!categoryKeys.has(item.values.categoryKey)) failInvalid();
    assertBoundedString(
      item.values.name,
      item.id === "margherita-pizza" ? 2 : 1,
      120,
    );
    assertBoundedString(item.values.description, 1, 1000);
    assertPrice(item.values.price);
    if (typeof item.values.available !== "boolean") failInvalid();
    assertInteger(item.values.stock, 0, 10_000);
    assertInteger(item.values.preparationMinutes, 1, 1440);
    assertSafeImageUrl(item.values.imageUrl);
  }

  const menuItemAuthorities = graph.fieldAuthorities.filter(
    ({ entityKey }) => entityKey === "menu-item",
  );
  if (
    !isDeepStrictEqual(menuItemAuthorities, [
      { entityKey: "menu-item", fieldKey: "categoryKey", authority: "client" },
      { entityKey: "menu-item", fieldKey: "name", authority: "client" },
      { entityKey: "menu-item", fieldKey: "description", authority: "client" },
      { entityKey: "menu-item", fieldKey: "price", authority: "client" },
      { entityKey: "menu-item", fieldKey: "available", authority: "client" },
      { entityKey: "menu-item", fieldKey: "stock", authority: "server" },
      {
        entityKey: "menu-item",
        fieldKey: "preparationMinutes",
        authority: "client",
      },
      { entityKey: "menu-item", fieldKey: "imageUrl", authority: "client" },
    ]) ||
    !graph.policy.permissions.some(
      ({ role, resource, actions }) =>
        role === "manager" &&
        resource === "menu-item" &&
        actions.includes("update"),
    )
  ) {
    failInvalid();
  }
}

function normalizeAllowedRestaurantValues(
  graph: PublishedApplicationGraphV3Input["graph"],
): PublishedApplicationGraphV3Input["graph"] {
  const normalized = structuredClone(graph);
  normalized.metadata.name = "Maison Aurelia private dining";
  normalized.page.pages.find(({ id }) => id === "customer-menu")!.title =
    "Menu";
  const home = normalized.page.pages.find(({ id }) => id === "customer-home")!;
  home.blocks = canonicalHomeOrder.map((blockId) =>
    home.blocks.find(({ id }) => id === blockId)!,
  );
  home.recipe.regions[0]!.blockIds = [...canonicalHomeOrder];
  const seedIndex = normalized.domain.seedData!.findIndex(
    ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
  );
  normalized.domain.seedData![seedIndex]!.values.name = "Margherita pizza";
  normalized.seedScenarios[0]!.records[seedIndex]!.values.name =
    "Margherita pizza";
  normalized.experience.theme.mode = "light";
  const authority = getCanonicalRestaurantAuthority();
  normalized.policy.roles = structuredClone(authority.roles);
  normalized.policy.permissions = structuredClone(authority.permissions);
  return normalized;
}

function assertExactRestaurantGraph(
  graph: PublishedApplicationGraphV3Input["graph"],
): void {
  const customerPages = [
    "customer-home",
    "customer-menu",
    "customer-dish-detail",
    "customer-cart",
    "customer-checkout",
    "customer-orders",
    "customer-order-detail",
    "customer-profile",
  ];
  const merchantPages = [
    "merchant-dashboard",
    "merchant-menu-management",
    "merchant-orders",
    "merchant-kitchen-queue",
    "merchant-tables",
    "merchant-users-roles",
    "merchant-settings",
  ];
  const journeyKeys = [
    "customer-place-order",
    "manager-cancel-submitted-order",
    "manager-cancel-paid-order",
    "manager-table-session",
    "manager-expire-open-table-session",
    "manager-expire-active-table-session",
    "manager-adjust-inventory",
  ];
  const actionRank = new Map(
    [
      "create",
      "read",
      "update",
      "delete",
      "audit",
      "submit",
      "pay",
      "serve",
      "accept",
      "start-preparing",
      "mark-ready",
      "cancel",
      "activate",
      "close",
      "expire",
      "record-manager-adjustment",
    ].map((action, index) => [action, index]),
  );
  for (const { actions } of graph.policy.permissions) {
    const ranks = actions.map((action) => actionRank.get(action));
    if (
      new Set(actions).size !== actions.length ||
      ranks.some((rank) => rank === undefined) ||
      ranks.some((rank, index) => index > 0 && rank! <= ranks[index - 1]!)
    ) {
      failInvalid();
    }
  }
  const home = graph.page.pages.find(({ id }) => id === "customer-home");
  const homeBlockIds = home?.blocks.map(({ id }) => id);
  const homeRegionIds = home?.recipe.regions[0]?.blockIds;
  if (
    home?.recipe.regions.length !== 1 ||
    home.recipe.regions[0]?.key !== "main" ||
    !isDeepStrictEqual(homeBlockIds, homeRegionIds) ||
    homeBlockIds?.length !== canonicalHomeOrder.length ||
    new Set(homeBlockIds).size !== canonicalHomeOrder.length ||
    !canonicalHomeOrder.every((id) => homeBlockIds.includes(id))
  ) {
    failInvalid();
  }
  const pageContract = graph.page.pages.map(
    ({ id, route, surfaceKey, recipe, blocks }) => {
      const orderedBlocks =
        id === "customer-home"
          ? canonicalHomeOrder.map((blockId) =>
              blocks.find((block) => block.id === blockId)!,
            )
          : blocks;
      const regions =
        id === "customer-home"
          ? [{ key: "main", blockIds: [...canonicalHomeOrder] }]
          : recipe.regions;
      return [
        id,
        route,
        surfaceKey,
        recipe.key,
        regions,
        orderedBlocks.map(({ id: blockId, type }) => [blockId, type]),
      ];
    },
  );
  const recipeContract = restaurantScreenRecipes.map((recipe) => [
    recipe.pageKey,
    recipe.route,
    recipe.surface,
    recipe.key,
    [{ key: "main", blockIds: recipe.blocks.map(({ id }) => id) }],
    recipe.blocks.map(({ id, type }) => [id, type]),
  ]);
  const bindingContract = graph.bindingPolicies.map((policy) => [
    policy.pageId,
    policy.blockId,
    policy.bindingKey,
    policy.kind,
    policy.kind === "domain-field"
      ? `${policy.entityKey}.${policy.fieldKey}`
      : policy.kind === "flow-transition"
        ? `${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}`
        : `${policy.roleKey}:${policy.resource}:${policy.action}`,
    policy.access,
  ]);
  const recipeBindingContract = restaurantScreenRecipes.flatMap((recipe) =>
    recipe.blocks.flatMap((block) =>
      Object.entries(block.bindings).map(([bindingKey, binding]) => [
        recipe.pageKey,
        block.id,
        bindingKey,
        binding.kind,
        binding.target,
        binding.mode,
      ]),
    ),
  );
  if (
    graph.integration.compositionProfile !== "restaurant-ordering" ||
    !isDeepStrictEqual(
      graph.surfaces.map(({ key }) => key),
      ["customer-mobile", "merchant-desktop"],
    ) ||
    !isDeepStrictEqual(
      graph.page.pages.map(({ id }) => id),
      [...customerPages, ...merchantPages],
    ) ||
    !isDeepStrictEqual(pageContract, recipeContract) ||
    !["customer", "cashier", "kitchen", "manager"].every((role) =>
      graph.policy.roles.includes(role),
    ) ||
    !isDeepStrictEqual(
      graph.journeys.map(({ key }) => key),
      journeyKeys,
    ) ||
    graph.fieldAuthorities.length !== 99 ||
    graph.bindingPolicies.length !== 135 ||
    !isDeepStrictEqual(bindingContract, recipeBindingContract)
  ) {
    throw new Error(invalidInputMessage);
  }
}

function assertValidRestaurantAuthority(
  graph: PublishedApplicationGraphV3Input["graph"],
): void {
  if (
    graph.policy.roles.length !== new Set(graph.policy.roles).size ||
    !graph.policy.roles.every(
      (role) =>
        role.length >= 1 &&
        role.length <= 128 &&
        /^[a-z][a-zA-Z0-9-]*$/.test(role),
    )
  ) {
    failInvalid();
  }
  const roleSet = new Set(graph.policy.roles);
  for (const { role, resource, actions } of graph.policy.permissions) {
    if (!roleSet.has(role)) failInvalid();
    if (
      resource.length < 1 ||
      resource.length > 128 ||
      !/^[a-z][a-zA-Z0-9-]*$/.test(resource)
    ) {
      failInvalid();
    }
    if (actions.length === 0 || new Set(actions).size !== actions.length) {
      failInvalid();
    }
  }
}

export function assertRestaurantProductCompilationInput(
  input: unknown,
): RestaurantProductCompilationInputV1 {
  try {
    const copied = copyStrictPlainData(input) as Record<string, unknown>;
    if (
      copied === null ||
      typeof copied !== "object" ||
      Object.keys(copied).length !== 2 ||
      !Object.hasOwn(copied, "publishedGraph") ||
      !Object.hasOwn(copied, "compositionLock")
    ) {
      throw new Error(invalidInputMessage);
    }
    const publishedGraph = adaptPublishedApplicationGraph(
      copied.publishedGraph,
    );
    if (publishedGraph.graphVersion !== "factory.application-graph/v3") {
      throw new Error(invalidInputMessage);
    }
    if (
      hashApplicationGraphV3(publishedGraph.graph) !== publishedGraph.graphHash
    ) {
      throw new Error(invalidInputMessage);
    }
    if (
      publishedGraph.kind !== "published-application-graph" ||
      publishedGraph.status !== "published" ||
      publishedGraph.revisionId !== "restaurant-product-v3-published-1" ||
      publishedGraph.revisionNumber !== 1
    ) {
      throw new Error(invalidInputMessage);
    }
    const compositionLock =
      copied.compositionLock as CapabilityCompositionLockV1;
    const canonicalLock = createCapabilityCompositionLock({
      graphChecksum: publishedGraph.graphHash,
      selections: compositionLock.packages,
    });
    if (JSON.stringify(compositionLock) !== JSON.stringify(canonicalLock)) {
      throw new Error(invalidInputMessage);
    }
    const graphSelectionLocks = (
      publishedGraph.graph.integration.compositionSelections ?? []
    ).map((selection) => selection.lock);
    const lockPackageLocks = compositionLock.packages.map(
      (selection) => selection.lock,
    );
    if (
      JSON.stringify(lockPackageLocks) !== JSON.stringify(graphSelectionLocks)
    ) {
      throw new Error(invalidInputMessage);
    }
    assertExactRestaurantGraph(publishedGraph.graph);
    assertValidRestaurantAuthority(publishedGraph.graph);
    assertBoundedString(publishedGraph.graph.metadata.name, 2, 80);
    const menu = publishedGraph.graph.page.pages.find(
      ({ id }) => id === "customer-menu",
    );
    assertBoundedString(menu?.title, 2, 80);
    if (
      publishedGraph.graph.experience.theme.mode !== "light" &&
      publishedGraph.graph.experience.theme.mode !== "dark"
    ) {
      throw new Error(invalidInputMessage);
    }
    assertCatalogSeed(publishedGraph.graph);
    if (
      hashApplicationGraphV3(
        normalizeAllowedRestaurantValues(publishedGraph.graph),
      ) !== canonicalGraphHash
    ) {
      throw new Error(invalidInputMessage);
    }
    return structuredClone({ publishedGraph, compositionLock: canonicalLock });
  } catch {
    throw new Error(invalidInputMessage);
  }
}
