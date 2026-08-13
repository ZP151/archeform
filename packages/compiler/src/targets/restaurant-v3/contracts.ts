import { isDeepStrictEqual } from "node:util";

import {
  createCapabilityCompositionLock,
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
  const pageContract = graph.page.pages.map(
    ({ id, route, surfaceKey, recipe, blocks }) => [
      id,
      route,
      surfaceKey,
      recipe.key,
      recipe.regions,
      blocks.map(({ id: blockId, type }) => [blockId, type]),
    ],
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
    !isDeepStrictEqual(graph.policy.roles, [
      "customer",
      "cashier",
      "kitchen",
      "manager",
    ]) ||
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
      publishedGraph.graphHash !==
      "sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23"
    ) {
      throw new Error(invalidInputMessage);
    }
    assertExactRestaurantGraph(publishedGraph.graph);
    const compositionLock =
      copied.compositionLock as CapabilityCompositionLockV1;
    const canonicalLock = createCapabilityCompositionLock({
      graphChecksum: publishedGraph.graphHash,
      selections: compositionLock.packages,
    });
    if (JSON.stringify(compositionLock) !== JSON.stringify(canonicalLock)) {
      throw new Error(invalidInputMessage);
    }
    return structuredClone({ publishedGraph, compositionLock: canonicalLock });
  } catch {
    throw new Error(invalidInputMessage);
  }
}
