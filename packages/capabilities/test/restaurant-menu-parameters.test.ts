import { describe, expect, it } from "vitest";
import * as capabilities from "../src/index.js";
import { restaurantProductFixture } from "./restaurant-product-fixture.js";
const api = capabilities as unknown as {
  parseRestaurantMenuParameters(input: unknown): any;
  hashRestaurantMenuParameters(input: unknown): string;
  bindRestaurantMenuParameters(graph: any, input: unknown): any;
  canonicalRestaurantMenuParameters(): any;
};
const menu = (count = 3) => ({
  apiVersion: "factory.restaurant-menu-parameters/v1",
  mode: "provided",
  currency: "USD",
  items: Array.from({ length: count }, (_, i) => ({
    name: `Dish ${i + 1}`,
    description: null,
    priceMinor: 1001 + i,
  })),
});
describe("Restaurant menu parameter boundary", () => {
  it("exports the accepted strict boundary", () => {
    expect(api.parseRestaurantMenuParameters).toBeTypeOf("function");
  });
  it.each([1, 3, 100])(
    "binds %i ordinal menu items and preserves unrelated Graph data",
    (count) => {
      const graph = capabilities.composeRestaurantProductGraph(
        restaurantProductFixture(),
      );
      const result = api.bindRestaurantMenuParameters(graph, menu(count));
      const items = result.domain.seedData.filter(
        (x: any) => x.entity === "menu-item",
      );
      expect(items).toHaveLength(count);
      expect(items[0]).toEqual({
        entity: "menu-item",
        id: "menu-item-001",
        values: {
          categoryKey: "mains",
          name: "Dish 1",
          description: "Description not provided.",
          price: 10.01,
          available: true,
          stock: 100,
          preparationMinutes: 15,
          imageUrl: "#",
        },
      });
      expect(items.at(-1).id).toBe(
        `menu-item-${String(count).padStart(3, "0")}`,
      );
      expect(result.seedScenarios[0].records).toEqual(
        result.domain.seedData.map(({ entity, values }: any) => ({
          entityKey: entity,
          values,
        })),
      );
      const unrelated = (x: any) =>
        x.domain.seedData.filter(
          (r: any) =>
            !["menu-item", "menu-option-group", "menu-option"].includes(
              r.entity,
            ),
        );
      expect(unrelated(result)).toEqual(unrelated(graph));
      expect(
        result.domain.seedData.some((r: any) =>
          r.entity.startsWith("menu-option"),
        ),
      ).toBe(false);
      expect({
        ...result,
        domain: graph.domain,
        seedScenarios: graph.seedScenarios,
      }).toEqual(graph);
    },
  );
  it("keeps canonical mode byte identical and canonicalizes NFC checksums", () => {
    const graph = capabilities.composeRestaurantProductGraph(
      restaurantProductFixture(),
    );
    expect(
      api.bindRestaurantMenuParameters(
        graph,
        api.canonicalRestaurantMenuParameters(),
      ),
    ).toEqual(graph);
    const a = menu(1);
    a.items[0]!.name = "Cafe\u0301";
    const b = menu(1);
    b.items[0]!.name = "Café";
    expect(api.parseRestaurantMenuParameters(a).items[0].name).toBe("Café");
    expect(api.hashRestaurantMenuParameters(a)).toBe(
      api.hashRestaurantMenuParameters(b),
    );
    expect(api.hashRestaurantMenuParameters(a)).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
  });
  it.each([0, 101])("rejects %i provided items", (n) =>
    expect(() => api.parseRestaurantMenuParameters(menu(n))).toThrow(),
  );
  it.each([-1, 1.01, Infinity, NaN, 10000001])(
    "rejects unsafe price %s",
    (priceMinor) => {
      const x = menu(1);
      x.items[0]!.priceMinor = priceMinor;
      expect(() => api.parseRestaurantMenuParameters(x)).toThrow();
    },
  );
  it.each([
    " name",
    "",
    "x".repeat(121),
    "https://bad.test",
    "__proto__",
    "bad\nname",
  ])("rejects unsafe names", (name) => {
    const x = menu(1);
    x.items[0]!.name = name;
    expect(() => api.parseRestaurantMenuParameters(x)).toThrow();
  });
  it("rejects unknown keys, accessors, sparse arrays and prototypes without invoking getters", () => {
    for (const x of [
      { ...menu(), extra: true },
      { ...menu(), currency: "EUR" },
      { ...menu(), mode: "canonical-default" },
      { ...menu(), items: new Array(3) },
      Object.assign(Object.create({}), menu()),
    ])
      expect(() => api.parseRestaurantMenuParameters(x)).toThrow();
    const x = menu();
    let read = false;
    Object.defineProperty(x.items[0], "name", {
      get() {
        read = true;
        return "Dish";
      },
      enumerable: true,
    });
    expect(() => api.parseRestaurantMenuParameters(x)).toThrow();
    expect(read).toBe(false);
  });
});
