import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  getCapabilityAsset,
  listProfileReadiness,
} from "../src/index.js";
import { lockCapabilityAsset } from "../src/assets/index.js";

const commerceProfiles = [
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const;

function transactionSelection(profile: (typeof commerceProfiles)[number]) {
  return composeDefaultCapabilityDraft({
    profile,
  }).graph.integration.compositionSelections?.find(
    ({ lock }) => lock.key === "commerce.transaction",
  );
}

describe("Commerce transaction profile composition", () => {
  it.each(commerceProfiles)(
    "locks commerce.transaction@1.0.0 for %s",
    (profile) => {
      expect(transactionSelection(profile)?.lock).toEqual(
        lockCapabilityAsset(getCapabilityAsset("commerce.transaction")),
      );
    },
  );

  it("binds the transaction to declared Restaurant symbols", () => {
    expect(transactionSelection("restaurant-ordering")?.bindings).toEqual({
      aggregateEntity: { graphSymbol: "graph.domain.order" },
      transactionFlow: { graphSymbol: "graph.flow.restaurant-order" },
      actorRole: { graphSymbol: "graph.policy.customer" },
    });
  });

  it("binds the transaction to declared Ecommerce symbols", () => {
    expect(transactionSelection("simple-ecommerce")?.bindings).toEqual({
      aggregateEntity: { graphSymbol: "graph.domain.order" },
      transactionFlow: { graphSymbol: "graph.flow.ecommerce-order" },
      actorRole: { graphSymbol: "graph.policy.shopper" },
    });
  });

  it.each([
    ["retail-counter", "counter-sale", "counter-sale-flow"],
    ["grocery-pickup", "pickup-order", "pickup-order-flow"],
  ] as const)(
    "remaps the transaction binding to valid %s symbols",
    (profile, aggregateEntity, transactionFlow) => {
      const composition = composeDefaultCapabilityDraft({ profile });
      const selection = transactionSelection(profile);

      expect(selection?.bindings).toEqual({
        aggregateEntity: { graphSymbol: `graph.domain.${aggregateEntity}` },
        transactionFlow: { graphSymbol: `graph.flow.${transactionFlow}` },
        actorRole: { graphSymbol: "graph.policy.shopper" },
      });
      expect(composition.graph.domain.entities).toContainEqual(
        expect.objectContaining({ key: aggregateEntity }),
      );
      expect(composition.graph.flow.flows).toContainEqual(
        expect.objectContaining({ id: transactionFlow }),
      );
    },
  );

  it.each(commerceProfiles)(
    "keeps commerce.transaction partial for %s without compiled runtime evidence",
    (profile) => {
      const readiness = listProfileReadiness().find(
        (candidate) => candidate.profile === profile,
      );

      expect(readiness?.capabilities).toContainEqual({
        key: "commerce.transaction",
        status: "partial",
      });
      expect(readiness?.capabilities).not.toContainEqual({
        key: "commerce.transaction",
        status: "available",
      });
    },
  );
});
