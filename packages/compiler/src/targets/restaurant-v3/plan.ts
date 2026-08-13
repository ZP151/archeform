import type { ApplicationGraphV3 } from "@factory/graph";

import {
  assertRestaurantProductCompilationInput,
  type RestaurantProductCompilationInputV1,
} from "./contracts.js";

export type RestaurantPagePlanV1 = ApplicationGraphV3["page"]["pages"][number];
export type RestaurantNavigationItemV1 =
  ApplicationGraphV3["surfaces"][number]["navigation"]["items"][number];

export type RestaurantProductPlanV1 = {
  readonly apiVersion: "factory.restaurant-product-plan/v1";
  readonly publishedRevisionId: string;
  readonly publishedRevisionNumber: number;
  readonly graphHash: `sha256:${string}`;
  readonly application: ApplicationGraphV3["metadata"];
  readonly surfaces: ApplicationGraphV3["surfaces"];
  readonly pages: ApplicationGraphV3["page"]["pages"];
  readonly domain: ApplicationGraphV3["domain"];
  readonly policy: ApplicationGraphV3["policy"];
  readonly flows: ApplicationGraphV3["flow"]["flows"];
  readonly journeys: ApplicationGraphV3["journeys"];
  readonly fieldAuthorities: ApplicationGraphV3["fieldAuthorities"];
  readonly bindingPolicies: ApplicationGraphV3["bindingPolicies"];
  readonly seedScenarios: ApplicationGraphV3["seedScenarios"];
  readonly experience: ApplicationGraphV3["experience"];
  readonly runtimeSchemaVersion: 1;
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function planRestaurantProduct(
  input: RestaurantProductCompilationInputV1,
): RestaurantProductPlanV1 {
  const { publishedGraph } = assertRestaurantProductCompilationInput(input);
  const graph = publishedGraph.graph;
  const plain = JSON.parse(
    JSON.stringify({
      apiVersion: "factory.restaurant-product-plan/v1",
      publishedRevisionId: publishedGraph.revisionId,
      publishedRevisionNumber: publishedGraph.revisionNumber,
      graphHash: publishedGraph.graphHash,
      application: graph.metadata,
      surfaces: graph.surfaces,
      pages: graph.page.pages,
      domain: graph.domain,
      policy: graph.policy,
      flows: graph.flow.flows,
      journeys: graph.journeys,
      fieldAuthorities: graph.fieldAuthorities,
      bindingPolicies: graph.bindingPolicies,
      seedScenarios: graph.seedScenarios,
      experience: graph.experience,
      runtimeSchemaVersion: 1,
    }),
  ) as RestaurantProductPlanV1;
  return deepFreeze(plain);
}
