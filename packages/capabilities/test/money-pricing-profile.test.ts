import { describe, expect, it } from "vitest";

import { composeDefaultCapabilityDraft } from "../src/index.js";

function moneySelection(profile: "restaurant-ordering" | "simple-ecommerce") {
  const composition = composeDefaultCapabilityDraft({ profile });
  const selection = composition.graph.integration.compositionSelections?.find(
    ({ lock }) => lock.key === "commerce.money-pricing",
  );
  if (!selection) throw new Error("Money pricing must be selected.");
  return selection;
}

describe("Money pricing profile composition", () => {
  it("locks one immutable money package for Restaurant and Ecommerce", () => {
    const restaurant = moneySelection("restaurant-ordering");
    const ecommerce = moneySelection("simple-ecommerce");

    expect(restaurant.lock).toEqual(ecommerce.lock);
    expect(restaurant.lock).toMatchObject({
      key: "commerce.money-pricing",
      version: "1.0.0",
      lifecycle: "golden",
    });
  });

  it("binds the shared money package to distinct declared profile symbols", () => {
    expect(moneySelection("restaurant-ordering").bindings).toEqual({
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderLineEntity: { graphSymbol: "graph.domain.order-line" },
      catalogEntity: { graphSymbol: "graph.domain.menu-item" },
      customerRole: { graphSymbol: "graph.policy.customer" },
      merchantRole: { graphSymbol: "graph.policy.manager" },
    });
    expect(moneySelection("simple-ecommerce").bindings).toEqual({
      orderEntity: { graphSymbol: "graph.domain.order" },
      orderLineEntity: { graphSymbol: "graph.domain.product-line" },
      catalogEntity: { graphSymbol: "graph.domain.product" },
      customerRole: { graphSymbol: "graph.policy.shopper" },
      merchantRole: { graphSymbol: "graph.policy.merchant" },
    });
  });
});
