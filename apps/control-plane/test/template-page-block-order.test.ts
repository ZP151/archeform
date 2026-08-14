import { describe, expect, it } from "vitest";

import { createCuratedRestaurantTemplateGraph } from "../src/template/template.service.js";
import {
  applyTemplatePageBlockOrderEdit,
  captureTemplatePageBlockOrderRevisionInput,
  type AppendTemplatePageBlockOrderRevisionInput,
} from "../src/template/template-page-block-order.js";

const invalidRequest = "Template Draft request is invalid.";
const revisionMoved = "Template Draft revision moved; reload before editing.";

function restaurantGraph() {
  return createCuratedRestaurantTemplateGraph(
    "restaurant-template-001",
    "Maison Rivage",
  );
}

function command(
  overrides: Partial<AppendTemplatePageBlockOrderRevisionInput> = {},
): AppendTemplatePageBlockOrderRevisionInput {
  return {
    baseDraftRevisionId: "draft-3",
    surfaceKey: "customer-mobile",
    pageId: "customer-home",
    regionKey: "main",
    blockIds: ["home-items", "home-hero", "home-categories"],
    ...overrides,
  };
}

describe("template Page block order", () => {
  it.each([
    {
      surfaceKey: "customer-mobile" as const,
      pageId: "customer-home",
      blockIds: ["home-items", "home-hero", "home-categories"],
    },
    {
      surfaceKey: "merchant-desktop" as const,
      pageId: "merchant-dashboard",
      blockIds: ["dashboard-tables", "dashboard-metrics", "dashboard-orders"],
    },
  ])(
    "returns a fresh Graph changing only $surfaceKey/$pageId order",
    ({ surfaceKey, pageId, blockIds }) => {
      const graph = restaurantGraph();
      const before = structuredClone(graph);
      const expected = structuredClone(graph);
      const expectedPage = expected.page.pages.find(
        (page) => page.id === pageId,
      )!;
      const expectedById = new Map(
        expectedPage.blocks.map((block) => [block.id, block]),
      );
      Object.assign(expectedPage, {
        blocks: blockIds.map((blockId) => expectedById.get(blockId)!),
      });
      Object.assign(expectedPage.recipe.regions[0]!, {
        blockIds: [...blockIds],
      });

      const result = applyTemplatePageBlockOrderEdit(
        graph,
        command({ surfaceKey, pageId, blockIds }),
      );
      const resultPage = result.graph.page.pages.find(
        (page) => page.id === pageId,
      )!;

      expect(result).toMatchObject({
        baseDraftRevisionId: "draft-3",
        surfaceKey,
        pageId,
        regionKey: "main",
        blockIds,
      });
      expect(result.graph).toEqual(expected);
      expect(result.graph).not.toBe(graph);
      expect(resultPage.blocks).not.toBe(
        graph.page.pages.find((page) => page.id === pageId)!.blocks,
      );
      for (const resultBlock of resultPage.blocks) {
        const original = graph.page.pages
          .find((page) => page.id === pageId)!
          .blocks.find((block) => block.id === resultBlock.id)!;
        expect(resultBlock).toEqual(original);
        expect(resultBlock).not.toBe(original);
      }
      expect(graph).toEqual(before);
    },
  );

  it.each([
    ["missing id", command({ blockIds: ["home-hero", "home-items"] })],
    [
      "extra id",
      command({
        blockIds: [
          "home-items",
          "home-hero",
          "home-categories",
          "foreign-block",
        ],
      }),
    ],
    [
      "duplicate id",
      command({ blockIds: ["home-items", "home-hero", "home-hero"] }),
    ],
    ["unknown page", command({ pageId: "customer-unknown" })],
    ["surface mismatch", command({ surfaceKey: "merchant-desktop" })],
    ["wrong region", command({ regionKey: "sidebar" as never })],
  ] as const)("rejects %s with one fixed error", (_label, input) => {
    expect(() =>
      applyTemplatePageBlockOrderEdit(restaurantGraph(), input),
    ).toThrow(new Error(invalidRequest));
  });

  it("distinguishes an unchanged current-base permutation from malformed input", () => {
    expect(() =>
      applyTemplatePageBlockOrderEdit(
        restaurantGraph(),
        command({
          blockIds: ["home-hero", "home-categories", "home-items"],
        }),
      ),
    ).toThrow(new Error(revisionMoved));
  });

  it("rejects a Graph whose page and main-region orders already disagree", () => {
    const graph = restaurantGraph();
    const page = graph.page.pages.find(({ id }) => id === "customer-home")!;
    Object.assign(page.recipe.regions[0]!, {
      blockIds: ["home-categories", "home-hero", "home-items"],
    });

    expect(() => applyTemplatePageBlockOrderEdit(graph, command())).toThrow(
      new Error(invalidRequest),
    );
  });

  it.each([
    [
      "missing property",
      (({ regionKey: _removed, ...rest }) => rest)(command()),
    ],
    ["extra property", { ...command(), graph: restaurantGraph() }],
    ["one block", command({ blockIds: ["home-items"] })],
    [
      "twenty-one blocks",
      command({
        blockIds: Array.from({ length: 21 }, (_, index) => `block-${index}`),
      }),
    ],
    ["invalid Graph key", command({ blockIds: ["Home-items", "home-hero"] })],
  ] as const)("rejects %s during strict admission", (_label, input) => {
    expect(() => captureTemplatePageBlockOrderRevisionInput(input)).toThrow(
      new Error(invalidRequest),
    );
  });

  it("rejects sparse, accessor, symbol, custom-key, and custom-prototype arrays without reading values", () => {
    let getterCalls = 0;
    const sparse = ["home-items", , "home-categories"];
    const accessor = ["home-items", "home-hero", "home-categories"];
    Object.defineProperty(accessor, "1", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "home-hero";
      },
    });
    const symbol = ["home-items", "home-hero", "home-categories"];
    Object.defineProperty(symbol, Symbol("hostile"), {
      enumerable: true,
      value: "hidden",
    });
    const customKey = ["home-items", "home-hero", "home-categories"] as
      string[] | (string[] & { extra: string });
    Object.assign(customKey, { extra: "hidden" });
    const customPrototype = ["home-items", "home-hero", "home-categories"];
    Object.setPrototypeOf(customPrototype, Object.create(Array.prototype));

    for (const blockIds of [
      sparse,
      accessor,
      symbol,
      customKey,
      customPrototype,
    ]) {
      expect(() =>
        captureTemplatePageBlockOrderRevisionInput({
          ...command(),
          blockIds,
        }),
      ).toThrow(new Error(invalidRequest));
    }
    expect(getterCalls).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "redacts a hostile body Proxy %s trap before conversions",
    (trap) => {
      let conversions = 0;
      const input = new Proxy(command(), {
        [trap]() {
          throw new Error("HOSTILE_BODY_SENTINEL");
        },
      });
      Object.defineProperty(input, Symbol.toPrimitive, {
        value() {
          conversions += 1;
          return "HOSTILE_BODY_SENTINEL";
        },
      });

      expect(() => captureTemplatePageBlockOrderRevisionInput(input)).toThrow(
        new Error(invalidRequest),
      );
      expect(conversions).toBe(0);
    },
  );

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "redacts a hostile blockIds Proxy %s trap before conversions",
    (trap) => {
      let conversions = 0;
      const blockIds = new Proxy(
        ["home-items", "home-hero", "home-categories"],
        {
          [trap]() {
            throw new Error("HOSTILE_ARRAY_SENTINEL");
          },
        },
      );
      Object.defineProperty(blockIds, Symbol.toPrimitive, {
        value() {
          conversions += 1;
          return "HOSTILE_ARRAY_SENTINEL";
        },
      });

      expect(() =>
        captureTemplatePageBlockOrderRevisionInput({
          ...command(),
          blockIds,
        }),
      ).toThrow(new Error(invalidRequest));
      expect(conversions).toBe(0);
    },
  );

  it("preflights the bounded own length before prototype or own-key reflection", () => {
    const calls = { descriptors: 0, prototype: 0, keys: 0 };
    const blockIds = new Proxy(
      Array.from({ length: 21 }, (_, index) => `block-${index}`),
      {
        getOwnPropertyDescriptor(target, key) {
          calls.descriptors += 1;
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
        getPrototypeOf(target) {
          calls.prototype += 1;
          return Reflect.getPrototypeOf(target);
        },
        ownKeys(target) {
          calls.keys += 1;
          return Reflect.ownKeys(target);
        },
      },
    );

    expect(() =>
      captureTemplatePageBlockOrderRevisionInput({ ...command(), blockIds }),
    ).toThrow(new Error(invalidRequest));
    expect(calls).toEqual({ descriptors: 1, prototype: 0, keys: 0 });
  });

  it("bounds a hostile own-key list before per-key descriptor amplification", () => {
    const fabricatedKeys = Array.from(
      { length: 100_000 },
      (_, index) => `fabricated-${index}`,
    );
    const calls = { descriptors: 0, prototype: 0, keys: 0 };
    const blockIds = new Proxy(["home-items", "home-hero", "home-categories"], {
      getOwnPropertyDescriptor(target, key) {
        calls.descriptors += 1;
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return (
          descriptor ?? {
            configurable: true,
            enumerable: true,
            value: "home-items",
            writable: true,
          }
        );
      },
      getPrototypeOf(target) {
        calls.prototype += 1;
        return Reflect.getPrototypeOf(target);
      },
      ownKeys(target) {
        calls.keys += 1;
        return [...Reflect.ownKeys(target), ...fabricatedKeys];
      },
    });

    expect(() =>
      captureTemplatePageBlockOrderRevisionInput({ ...command(), blockIds }),
    ).toThrow(new Error(invalidRequest));
    expect(calls).toEqual({ descriptors: 1, prototype: 1, keys: 1 });
  });
});
