import { describe, expect, it } from "vitest";
import {
  bindRestaurantMenuParameters,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraphV3 } from "@factory/graph";
import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { assertRestaurantProductCompilationInput } from "../src/targets/restaurant-v3/contracts.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import { renderRestaurantCustomerRuntime } from "../src/targets/restaurant-v3/runtime-api.js";
import { renderRestaurantCustomerAppModule } from "../src/targets/restaurant-v3/customer-target.js";
function input(count = 3) {
  const { publishedGraph, compositionLock } = restaurantProductV3Fixture();
  const result = { publishedGraph, compositionLock };
  result.publishedGraph.graph = bindRestaurantMenuParameters(
    result.publishedGraph.graph,
    {
      apiVersion: "factory.restaurant-menu-parameters/v1",
      mode: "provided",
      currency: "USD",
      items: Array.from({ length: count }, (_, i) => ({
        name: `Dish ${i + 1}`,
        description: null,
        priceMinor: 1231 + i,
      })),
    },
  );
  return rehash(result);
}
function rehash(
  result: Pick<
    ReturnType<typeof restaurantProductV3Fixture>,
    "publishedGraph" | "compositionLock"
  >,
) {
  result.publishedGraph.graphHash = hashApplicationGraphV3(
    result.publishedGraph.graph,
  );
  result.compositionLock = createCapabilityCompositionLock({
    graphChecksum: result.publishedGraph.graphHash,
    selections:
      result.publishedGraph.graph.integration.compositionSelections ?? [],
  });
  return result;
}
describe("supplied Restaurant menu compilation", () => {
  it.each([1, 3, 100])(
    "admits %i items and generates exact minor prices",
    (count) => {
      const value = input(count);
      expect(
        assertRestaurantProductCompilationInput(value).publishedGraph.graph,
      ).toEqual(value.publishedGraph.graph);
      const runtime = renderRestaurantCustomerRuntime(
        planRestaurantProduct(value),
      );
      expect(runtime.seedModule).toContain("menu-item-001");
      expect(runtime.seedModule).toContain("1231");
    },
  );
  it.each([
    "zero",
    "101",
    "reorder",
    "gap",
    "duplicate",
    "mirror",
    "stock",
    "category",
    "price",
    "unsafe",
    "options",
    "unrelated",
    "hash",
    "lock",
  ])("rejects %s corruption", (kind) => {
    const value = input();
    const graph = value.publishedGraph.graph;
    const items = graph.domain.seedData!.filter(
      (x) => x.entity === "menu-item",
    );
    if (kind === "zero")
      graph.domain.seedData = graph.domain.seedData!.filter(
        (x) => x.entity !== "menu-item",
      );
    if (kind === "101") {
      const large = input(100).publishedGraph.graph;
      graph.domain.seedData = large.domain.seedData;
      graph.domain.seedData!.push({
        ...structuredClone(large.domain.seedData!.at(-1)!),
        id: "menu-item-101",
      });
    }
    if (kind === "reorder") {
      const a = graph.domain.seedData!.indexOf(items[0]!);
      [graph.domain.seedData![a], graph.domain.seedData![a + 1]] = [
        graph.domain.seedData![a + 1]!,
        graph.domain.seedData![a]!,
      ];
    }
    if (kind === "gap") items[0]!.id = "menu-item-005";
    if (kind === "duplicate") items[1]!.id = items[0]!.id;
    if (kind === "stock") items[0]!.values.stock = 2;
    if (kind === "category") items[0]!.values.categoryKey = "other";
    if (kind === "price") items[0]!.values.price = 12.001;
    if (kind === "unsafe") items[0]!.values.name = "https://bad.test";
    if (kind === "options")
      graph.domain.seedData!.push({
        entity: "menu-option",
        id: "dangling",
        values: {},
      });
    if (kind === "unrelated")
      graph.domain.seedData!.find(
        (x) => x.entity === "menu-category",
      )!.values.name = "Other";
    if (kind !== "mirror")
      graph.seedScenarios[0]!.records = graph.domain.seedData!.map(
        ({ entity, values }) => ({
          entityKey: entity,
          values: structuredClone(values),
        }),
      );
    else items[0]!.values.name = "Mismatch";
    if (kind === "hash" || kind === "lock") {
      items[0]!.values.name = "Changed";
      graph.seedScenarios[0]!.records = graph.domain.seedData!.map(
        ({ entity, values }) => ({
          entityKey: entity,
          values: structuredClone(values),
        }),
      );
      if (kind === "lock")
        value.publishedGraph.graphHash = hashApplicationGraphV3(graph);
    } else {
      try {
        rehash(value);
      } catch {}
    }
    expect(() => assertRestaurantProductCompilationInput(value)).toThrow();
  });
  it("branches before rendering a sentinel image and uses existing local utensils", () => {
    expect(renderRestaurantCustomerAppModule()).toContain(
      'value.imageUrl === "#"',
    );
    expect(renderRestaurantCustomerAppModule()).toContain(
      'customerIcons["utensils-crossed"]',
    );
  });
});
