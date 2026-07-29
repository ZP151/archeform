import { describe, expect, it } from "vitest";

import { composeProfileDraft } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import { createGeneratedPageRuntimeProjection as createPublicProjection } from "../src/index.js";
import { createGeneratedPageRuntimeProjection } from "../src/page-runtime-projection.js";

function profileGraph(
  profile: "expense-approval" | "restaurant-ordering" | "simple-ecommerce",
): ApplicationGraphV1 {
  return structuredClone(composeProfileDraft({ profile }).graph);
}

function blockById(graph: ApplicationGraphV1, id: string) {
  const block = graph.page.pages
    .flatMap((page) => page.blocks)
    .find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Expected PageModel block '${id}'.`);
  return block;
}

function genericCommerceGraph(
  blockType: "catalog" | "cart" | "checkout",
): ApplicationGraphV1 {
  const graph = profileGraph("simple-ecommerce");
  graph.page = {
    pages: [
      {
        id: "commerce-test",
        route: "/",
        title: "Commerce test",
        blocks: [
          {
            id: `${blockType}-test`,
            type: blockType,
            entity: blockType === "catalog" ? "product" : "order",
          },
        ],
      },
    ],
    navigation: [],
  };
  return graph;
}

describe("generated page runtime projection", () => {
  it("derives deterministic restaurant routes and first-page root fallback", () => {
    const graph = profileGraph("restaurant-ordering");

    const first = createGeneratedPageRuntimeProjection(graph);
    const second = createGeneratedPageRuntimeProjection(graph);

    expect(first).toEqual(second);
    expect(first.apiVersion).toBe("factory.generated-page-runtime/v1");
    expect(first.applicationName).toBe("Restaurant ordering");
    expect(first.themeMode).toBe("light");
    expect(first.pages.map((page) => page.route)).toEqual([
      "/table/:token",
      "/menu",
      "/cart",
      "/orders/current",
      "/receipt/:id",
      "/merchant/tables",
      "/merchant/menu",
      "/merchant/kitchen",
      "/merchant/cashier",
      "/merchant/analytics",
    ]);
    expect(first.routeFallback).toEqual({
      rootRoute: "/table/:token",
      unknownRoute: "not-found",
    });
    expect(first.navigation).toEqual([
      { id: "customer-menu", label: "Menu", route: "/menu" },
      { id: "customer-cart", label: "Cart", route: "/cart" },
      {
        id: "current-order",
        label: "Current order",
        route: "/orders/current",
      },
      {
        id: "merchant-tables",
        label: "Tables",
        route: "/merchant/tables",
      },
      {
        id: "merchant-menu",
        label: "Menu management",
        route: "/merchant/menu",
      },
      {
        id: "merchant-kitchen",
        label: "Kitchen",
        route: "/merchant/kitchen",
      },
      {
        id: "merchant-cashier",
        label: "Cashier",
        route: "/merchant/cashier",
      },
      {
        id: "merchant-analytics",
        label: "Analytics",
        route: "/merchant/analytics",
      },
    ]);
    expect(first.pages[0]?.blocks).toEqual([
      {
        id: "table-session-entry",
        type: "restaurant-entry",
        entity: "table-session",
        props: {},
      },
    ]);
    expect(first.commerce).toEqual({
      orderEntity: null,
      paymentEvent: null,
    });
    expect(createPublicProjection).toBe(createGeneratedPageRuntimeProjection);
  });

  it("projects Restaurant blocks as bounded structure without interaction data", () => {
    const graph = profileGraph("restaurant-ordering");
    const menu = blockById(graph, "menu-browser");
    menu.props = {
      title: "Menu",
      href: "https://external.example/must-not-be-emitted",
      onClick: "must-not-be-emitted()",
      renderer: { component: "must-not-be-emitted" },
    };
    menu.bindings = {
      request: "must-not-be-emitted",
      transition: "must-not-be-emitted",
    };

    const projection = createGeneratedPageRuntimeProjection(graph);
    const projectedMenu = projection.pages
      .flatMap((page) => page.blocks)
      .find((block) => block.id === "menu-browser");

    expect(projectedMenu).toEqual({
      id: "menu-browser",
      type: "menu-browser",
      entity: "menu-item",
      props: { title: "Menu" },
    });
    expect(JSON.stringify(projectedMenu)).not.toContain("external.example");
    expect(JSON.stringify(projectedMenu)).not.toContain("onClick");
    expect(JSON.stringify(projectedMenu)).not.toContain("bindings");
    expect(projection.commerce).toEqual({
      orderEntity: null,
      paymentEvent: null,
    });
  });

  it("rejects Restaurant-only blocks outside the validated Restaurant Profile", () => {
    const graph = profileGraph("simple-ecommerce");
    blockById(graph, "product-catalog").type = "menu-browser";

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "Restaurant PageModel block 'menu-browser' requires compositionProfile 'restaurant-ordering'.",
    );
  });

  it("uses a declared root page and reduces block props to safe strings", () => {
    const graph = profileGraph("simple-ecommerce");
    const rootPage = graph.page.pages[0]!;
    rootPage.blocks.unshift({
      id: "catalog-hero",
      type: "hero",
      props: {
        title: "Shop Factory goods",
        eyebrow: "Independent makers",
        heading: "Useful things for everyday work",
        onClick: "alert('must not be emitted')",
        renderer: { component: "must-not-be-emitted" },
      },
      bindings: { action: "must-not-be-emitted" },
    });
    const catalog = blockById(graph, "product-catalog");
    catalog.props = {
      title: "Seasonal products",
      href: "https://example.invalid/must-not-be-emitted",
      action: { executable: true },
    };
    catalog.bindings = { cartAction: "must-not-be-emitted" };

    const projection = createGeneratedPageRuntimeProjection(graph);

    expect(projection.routeFallback).toEqual({
      rootRoute: "/",
      unknownRoute: "not-found",
    });
    expect(projection.pages[0]?.blocks).toEqual([
      {
        id: "catalog-hero",
        type: "hero",
        props: {
          title: "Shop Factory goods",
          eyebrow: "Independent makers",
          heading: "Useful things for everyday work",
        },
      },
      {
        id: "product-catalog",
        type: "catalog",
        entity: "product",
        props: { title: "Seasonal products" },
      },
    ]);
  });

  it("rejects protocol-relative PageModel routes before projection", () => {
    const graph = profileGraph("restaurant-ordering");
    graph.page.pages[0]!.route = "//external.example";

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "PageModel route '//external.example' must be a canonical local route.",
    );
  });

  it.each([
    ["/api"],
    ["/api/orders"],
    ["/_next"],
    ["/_next/static/chunk.js"],
    ["/favicon.ico"],
  ])("rejects the generated Next route namespace %s", (route) => {
    const graph = profileGraph("restaurant-ordering");
    graph.page.pages[0]!.route = route;

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      `PageModel route '${route}' is reserved by the generated Next application.`,
    );
  });

  it.each([
    ["//external.example"],
    ["/menu?preview=true"],
    ["/menu#section"],
    ["https://external.example/menu"],
  ])("retains canonical-local rejection for route %s", (route) => {
    const graph = profileGraph("restaurant-ordering");
    graph.page.pages[0]!.route = route;

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      `PageModel route '${route}' must be a canonical local route.`,
    );
  });

  it("rejects unsupported PageModel blocks before projection", () => {
    const graph = profileGraph("restaurant-ordering");
    blockById(graph, "menu-browser").type = "custom-html";

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "Unsupported PageModel block 'custom-html'.",
    );
  });

  it.each([
    ["collection", "expense-approval", "expense-list"],
    ["form", "expense-approval", "expense-form"],
    ["restaurant-entry", "restaurant-ordering", "table-session-entry"],
    ["menu-browser", "restaurant-ordering", "menu-browser"],
    ["order-cart", "restaurant-ordering", "order-cart"],
    ["kitchen-board", "restaurant-ordering", "kitchen-board"],
    ["checkout", "simple-ecommerce", "checkout-form"],
  ] as const)(
    "rejects the missing entity binding required by %s blocks",
    (blockType, profile, blockId) => {
      const graph = profileGraph(profile);
      delete blockById(graph, blockId).entity;

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        `PageModel block '${blockType}' requires an entity binding.`,
      );
    },
  );

  it("rejects a binding to an undeclared DomainModel entity", () => {
    const graph = profileGraph("expense-approval");
    blockById(graph, "expense-list").entity = "missing-expense";

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "PageModel block 'collection' references unknown entity 'missing-expense'.",
    );
  });

  it.each([
    ["order-cart", "restaurant-ordering", "order-cart", "menu-item"],
    [
      "payment-checkout",
      "restaurant-ordering",
      "payment-checkout",
      "menu-item",
    ],
    ["checkout", "simple-ecommerce", "checkout-form", "product"],
  ] as const)(
    "rejects %s blocks bound to a non-order entity",
    (blockType, profile, blockId, nonOrderEntity) => {
      const graph = profileGraph(profile);
      blockById(graph, blockId).entity = nonOrderEntity;

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        `PageModel block '${blockType}' requires the 'order' entity.`,
      );
    },
  );

  it.each([
    [
      "catalog",
      "cart.add",
      "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'.",
    ],
    [
      "checkout",
      "payment.simulate",
      "Interactive commerce PageModel blocks require Factory capability 'payment.simulate' with operation 'simulate'.",
    ],
  ] as const)(
    "rejects %s blocks when Factory capability %s is absent",
    (blockType, capabilityKey, message) => {
      const graph = genericCommerceGraph(blockType);
      graph.integration.capabilities = graph.integration.capabilities.filter(
        (capability) => capability.key !== capabilityKey,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        message,
      );
    },
  );

  it("does not accept a non-Factory capability with the required key", () => {
    const graph = genericCommerceGraph("catalog");
    graph.integration.capabilities = graph.integration.capabilities.map(
      (capability) =>
        capability.key === "cart.add"
          ? { ...capability, providerId: "external" }
          : capability,
    );

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'.",
    );
  });

  it.each(["catalog", "cart", "checkout"] as const)(
    "rejects the %s interaction when the exact Factory cart capability is absent",
    (blockType) => {
      const graph = genericCommerceGraph(blockType);
      graph.integration.capabilities = graph.integration.capabilities.filter(
        (capability) => capability.key !== "cart.add",
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'.",
      );
    },
  );

  it.each(["catalog", "cart", "checkout"] as const)(
    "rejects the %s interaction when simulated payment is not an exact Factory capability",
    (blockType) => {
      const graph = genericCommerceGraph(blockType);
      graph.integration.providers = [
        ...graph.integration.providers,
        { id: "external", type: "payment-provider" },
      ];
      graph.integration.capabilities = graph.integration.capabilities.map(
        (capability) =>
          capability.key === "payment.simulate"
            ? { ...capability, providerId: "external" }
            : capability,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        "Interactive commerce PageModel blocks require Factory capability 'payment.simulate' with operation 'simulate'.",
      );
    },
  );

  it.each(["catalog", "cart", "checkout"] as const)(
    "rejects the %s interaction when the order flow lacks exact simulated payment",
    (blockType) => {
      const graph = genericCommerceGraph(blockType);
      graph.flow.flows = graph.flow.flows.map((flow) =>
        flow.entity === "order"
          ? {
              ...flow,
              transitions: flow.transitions.map((transition) => ({
                ...transition,
                effects: (transition.effects ?? []).filter(
                  (effect) => effect.capability !== "payment.simulate",
                ),
              })),
            }
          : flow,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        "Interactive commerce PageModel blocks require an 'order' FlowModel transition with Factory effect 'payment.simulate' and operation 'simulate'.",
      );
    },
  );

  it.each([
    ["catalog", "cart.add", "remove"],
    ["checkout", "payment.simulate", "other"],
  ] as const)(
    "rejects %s blocks when Factory capability %s declares operation %s",
    (blockType, capabilityKey, wrongOperation) => {
      const graph = genericCommerceGraph(blockType);
      graph.integration.capabilities = graph.integration.capabilities.map(
        (capability) =>
          capability.key === capabilityKey
            ? { ...capability, operation: wrongOperation }
            : capability,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        blockType === "catalog"
          ? "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'."
          : "Interactive commerce PageModel blocks require Factory capability 'payment.simulate' with operation 'simulate'.",
      );
    },
  );
});
