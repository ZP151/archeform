import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  listProfileReadiness,
  resolveCapabilityAssetLock,
} from "../src/index.js";
import {
  commerceTransactionAssetV1_0_0,
  lockCapabilityAsset,
} from "../src/assets/index.js";

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

function legacyTransactionLock(profile: (typeof commerceProfiles)[number]) {
  return composeProfileDraft({ profile }).graph.integration.assetLocks?.find(
    (lock) => lock.key === "commerce.transaction",
  );
}

describe("Commerce transaction profile composition", () => {
  it.each(commerceProfiles)(
    "%s retains V1 until an operation adapter is locked",
    (profile) => {
      expect(transactionSelection(profile)?.lock).toMatchObject({
        key: "commerce.transaction",
        version: "1.0.0",
      });
    },
  );

  it.each(commerceProfiles)(
    "%s legacy Profile recipe retains V1 until an operation adapter is locked",
    (profile) => {
      expect(legacyTransactionLock(profile)).toMatchObject({
        key: "commerce.transaction",
        version: "1.0.0",
      });
    },
  );

  it("resolves a saved V1 transaction lock without upgrading it", () => {
    const historicalLock = lockCapabilityAsset(commerceTransactionAssetV1_0_0);

    expect(resolveCapabilityAssetLock(historicalLock)).toBe(
      commerceTransactionAssetV1_0_0,
    );
  });

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
