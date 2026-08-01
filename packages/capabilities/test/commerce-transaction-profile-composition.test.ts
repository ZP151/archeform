import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  listProfileReadiness,
  resolveCapabilityAssetLock,
} from "../src/index.js";
import {
  commerceTransactionAssetV1_0_0,
  commerceTransactionAssetV2_1_0,
  lockCapabilityAsset,
  orderAssetV2_0_3,
} from "../src/assets/index.js";

const commerceProfiles = [
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const;

const genericCommerceProfiles = [
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

function legacyCapabilityLock(
  profile: (typeof commerceProfiles)[number],
  key: "commerce.order" | "commerce.transaction",
) {
  return composeProfileDraft({ profile }).graph.integration.assetLocks?.find(
    (lock) => lock.key === key,
  );
}

describe("Commerce transaction profile composition", () => {
  it("rejects an unsupported future profile before it can select Generic Commerce locks", () => {
    const unsupportedProfile = "future-marketplace" as never;

    expect(() =>
      composeDefaultCapabilityDraft({ profile: unsupportedProfile }),
    ).toThrow("Unknown Factory profile 'future-marketplace'.");
    expect(() => composeProfileDraft({ profile: unsupportedProfile })).toThrow(
      "Unknown Factory profile 'future-marketplace'.",
    );
  });

  it.each(genericCommerceProfiles)(
    "%s selects the generic order lifecycle and transaction adapter locks",
    (profile) => {
      const locks = composeDefaultCapabilityDraft({
        profile,
      }).graph.integration.compositionSelections?.map(({ lock }) => lock);

      expect(locks).toContainEqual(
        expect.objectContaining({ key: "commerce.order", version: "2.1.2" }),
      );
      expect(locks).toContainEqual(
        expect.objectContaining({
          key: "commerce.transaction",
          version: "2.2.1",
        }),
      );
      expect(locks).not.toContainEqual(
        expect.objectContaining({ key: "commerce.order", version: "1.3.2" }),
      );
    },
  );

  it.each(genericCommerceProfiles)(
    "%s legacy Profile entry point also composes a new Draft with the successor locks",
    (profile) => {
      expect(legacyCapabilityLock(profile, "commerce.order")).toMatchObject({
        key: "commerce.order",
        version: "2.1.2",
      });
      expect(
        legacyCapabilityLock(profile, "commerce.transaction"),
      ).toMatchObject({
        key: "commerce.transaction",
        version: "2.2.1",
      });
    },
  );

  it("keeps Restaurant Ordering on its historical V1 commerce locks", () => {
    expect(transactionSelection("restaurant-ordering")?.lock).toMatchObject({
      key: "commerce.transaction",
      version: "1.0.0",
    });
    expect(
      legacyCapabilityLock("restaurant-ordering", "commerce.transaction"),
    ).toMatchObject({ key: "commerce.transaction", version: "1.0.0" });
    expect(
      legacyCapabilityLock("restaurant-ordering", "commerce.order"),
    ).toMatchObject({ key: "commerce.order", version: "1.2.0" });
  });

  it("resolves a saved V1 transaction lock without upgrading it", () => {
    const historicalLock = lockCapabilityAsset(commerceTransactionAssetV1_0_0);

    expect(resolveCapabilityAssetLock(historicalLock)).toBe(
      commerceTransactionAssetV1_0_0,
    );
  });

  it("resolves saved Generic Commerce lifecycle locks without upgrading them", () => {
    for (const historicalAsset of [
      orderAssetV2_0_3,
      commerceTransactionAssetV2_1_0,
    ]) {
      expect(
        resolveCapabilityAssetLock(lockCapabilityAsset(historicalAsset)),
      ).toBe(historicalAsset);
    }
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
