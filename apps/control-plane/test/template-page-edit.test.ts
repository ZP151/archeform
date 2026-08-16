import { describe, expect, it } from "vitest";

import { createCuratedRestaurantTemplateGraph } from "../src/template/template.service.js";
import {
  applyTemplatePageTitleEdit,
  type AppendTemplatePageRevisionInput,
} from "../src/template/template-page-edit.js";

const invalidRequest = "Template Draft request is invalid.";

function restaurantGraph() {
  return createCuratedRestaurantTemplateGraph(
    "restaurant-template-001",
    "Maison Rivage",
  );
}

function command(
  overrides: Partial<AppendTemplatePageRevisionInput> = {},
): AppendTemplatePageRevisionInput {
  return {
    baseDraftRevisionId: "draft-2",
    surfaceKey: "customer-mobile",
    pageId: "customer-menu",
    title: "Seasonal Menu",
    ...overrides,
  };
}

describe("template Page title edit", () => {
  it.each([
    {
      surfaceKey: "customer-mobile" as const,
      pageId: "customer-menu",
      title: "  Seasonal Menu  ",
      expectedTitle: "Seasonal Menu",
    },
    {
      surfaceKey: "merchant-desktop" as const,
      pageId: "merchant-menu-management",
      title: "Seasonal Menu Management",
      expectedTitle: "Seasonal Menu Management",
    },
  ])(
    "returns a fresh valid Graph V3 changing only $surfaceKey/$pageId title",
    ({ surfaceKey, pageId, title, expectedTitle }) => {
      const graph = restaurantGraph();
      const before = structuredClone(graph);
      const expected = structuredClone(graph);
      const expectedPage = expected.page.pages.find(
        (page) => page.id === pageId,
      );
      if (!expectedPage) throw new Error("Test page is missing.");
      expectedPage.title = expectedTitle;

      const result = applyTemplatePageTitleEdit(
        graph,
        command({ surfaceKey, pageId, title }),
      );

      expect(result).toMatchObject({
        surfaceKey,
        pageId,
        title: expectedTitle,
      });
      expect(result.graph).toEqual(expected);
      expect(result.graph).not.toBe(graph);
      expect(result.graph.page.pages).not.toBe(graph.page.pages);
      expect(graph).toEqual(before);
    },
  );

  it.each([
    { label: "unknown page", input: command({ pageId: "customer-unknown" }) },
    {
      label: "surface mismatch",
      input: command({ surfaceKey: "merchant-desktop" }),
    },
    { label: "unchanged title", input: command({ title: "Menu" }) },
    { label: "one-character title", input: command({ title: "M" }) },
    { label: "overlong title", input: command({ title: "M".repeat(81) }) },
    { label: "control character", input: command({ title: "Menu\u0000" }) },
    {
      label: "unknown surface",
      input: command({ surfaceKey: "customer-tablet" as never }),
    },
    {
      label: "extra property",
      input: { ...command(), graph: restaurantGraph() },
    },
  ])("rejects $label with one fixed redacted error", ({ input }) => {
    expect(() => applyTemplatePageTitleEdit(restaurantGraph(), input)).toThrow(
      invalidRequest,
    );
    try {
      applyTemplatePageTitleEdit(restaurantGraph(), input);
    } catch (error) {
      expect((error as Error).message).toBe(invalidRequest);
      expect((error as Error).message).not.toContain("customer-unknown");
      expect((error as Error).message).not.toContain("customer-tablet");
    }
  });

  it("rejects inherited, accessor, symbol, and non-enumerable envelopes without invoking getters", () => {
    let getterCalls = 0;
    const inherited = Object.assign(
      Object.create({ title: "Inherited" }),
      command(),
    );
    const accessor = { ...command() } as Record<string, unknown>;
    Object.defineProperty(accessor, "title", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "Accessor Menu";
      },
    });
    const symbol = { ...command(), [Symbol("hostile")]: "hidden" };
    const nonEnumerable = { ...command() };
    Object.defineProperty(nonEnumerable, "hidden", {
      enumerable: false,
      value: "hidden",
    });

    for (const input of [inherited, accessor, symbol, nonEnumerable]) {
      expect(() =>
        applyTemplatePageTitleEdit(restaurantGraph(), input),
      ).toThrow(invalidRequest);
    }
    expect(getterCalls).toBe(0);
  });

  it("rejects hostile primitive conversions without calling caller code", () => {
    let conversionCalls = 0;
    const hostileTitle = {
      toString() {
        conversionCalls += 1;
        return "Hostile Menu";
      },
      valueOf() {
        conversionCalls += 1;
        return "Hostile Menu";
      },
    };

    expect(() =>
      applyTemplatePageTitleEdit(restaurantGraph(), {
        ...command(),
        title: hostileTitle,
      }),
    ).toThrow(invalidRequest);
    expect(conversionCalls).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "redacts a hostile Proxy %s trap failure",
    (trap) => {
      const input = new Proxy(command(), {
        [trap]() {
          throw new Error("HOSTILE_PROXY_SENTINEL");
        },
      });

      expect(() =>
        applyTemplatePageTitleEdit(restaurantGraph(), input),
      ).toThrow(invalidRequest);
      try {
        applyTemplatePageTitleEdit(restaurantGraph(), input);
      } catch (error) {
        expect((error as Error).message).toBe(invalidRequest);
        expect((error as Error).message).not.toContain(
          "HOSTILE_PROXY_SENTINEL",
        );
      }
    },
  );
});
