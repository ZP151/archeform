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
      "/menu",
      "/cart",
      "/kitchen",
    ]);
    expect(first.routeFallback).toEqual({
      rootRoute: "/menu",
      unknownRoute: "not-found",
    });
    expect(first.navigation).toEqual([
      { id: "menu", label: "Menu", route: "/menu" },
      { id: "cart", label: "Cart", route: "/cart" },
      { id: "kitchen", label: "Kitchen", route: "/kitchen" },
    ]);
    expect(first.pages[0]?.blocks).toEqual([
      {
        id: "menu-catalog",
        type: "catalog",
        entity: "menu-item",
        props: {},
      },
    ]);
    expect(createPublicProjection).toBe(createGeneratedPageRuntimeProjection);
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

  it("rejects unsupported PageModel blocks before projection", () => {
    const graph = profileGraph("restaurant-ordering");
    blockById(graph, "menu-catalog").type = "custom-html";

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "Unsupported PageModel block 'custom-html'.",
    );
  });

  it.each([
    ["collection", "expense-approval", "expense-list"],
    ["form", "expense-approval", "expense-form"],
    ["catalog", "restaurant-ordering", "menu-catalog"],
    ["cart", "restaurant-ordering", "cart-lines"],
    ["queue", "restaurant-ordering", "kitchen-queue"],
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
    ["cart", "restaurant-ordering", "cart-lines", "menu-item"],
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
    ["catalog", "cart.add", "restaurant-ordering"],
    ["checkout", "payment.simulate", "simple-ecommerce"],
  ] as const)(
    "rejects %s blocks when Factory capability %s is absent",
    (blockType, capabilityKey, profile) => {
      const graph = profileGraph(profile);
      graph.integration.capabilities = graph.integration.capabilities.filter(
        (capability) => capability.key !== capabilityKey,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        `PageModel block '${blockType}' requires Factory capability '${capabilityKey}'.`,
      );
    },
  );

  it("does not accept a non-Factory capability with the required key", () => {
    const graph = profileGraph("restaurant-ordering");
    graph.integration.capabilities = graph.integration.capabilities.map(
      (capability) =>
        capability.key === "cart.add"
          ? { ...capability, providerId: "external" }
          : capability,
    );

    expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
      "PageModel block 'catalog' requires Factory capability 'cart.add'.",
    );
  });

  it.each([
    ["catalog", "cart.add", "remove", "restaurant-ordering"],
    ["checkout", "payment.simulate", "other", "simple-ecommerce"],
  ] as const)(
    "rejects %s blocks when Factory capability %s declares operation %s",
    (blockType, capabilityKey, wrongOperation, profile) => {
      const graph = profileGraph(profile);
      graph.integration.capabilities = graph.integration.capabilities.map(
        (capability) =>
          capability.key === capabilityKey
            ? { ...capability, operation: wrongOperation }
            : capability,
      );

      expect(() => createGeneratedPageRuntimeProjection(graph)).toThrow(
        `PageModel block '${blockType}' requires Factory capability '${capabilityKey}'.`,
      );
    },
  );
});
