import { describe, expect, it } from "vitest";

import { composeDefaultCapabilityDraft } from "../src/index.js";

const orderOperationsLockKeys = (
  profile: ReturnType<typeof composeDefaultCapabilityDraft>,
) =>
  profile.assetLocks
    .filter(({ key }) => key.startsWith("commerce.") || key === "core.crud")
    .map(({ key, version }) => `${key}@${version}`);

describe("Order Operations composition profiles", () => {
  it.each([
    ["retail-counter", "retail-item", "counter-sale", "cashier"],
    ["grocery-pickup", "grocery-item", "pickup-order", "fulfilment"],
  ] as const)(
    "composes %s from the current generic order packages",
    (profile, catalogEntity, orderEntity, fulfilmentRole) => {
      const candidate = composeDefaultCapabilityDraft({ profile });
      const ecommerce = composeDefaultCapabilityDraft({
        profile: "simple-ecommerce",
      });

      expect(orderOperationsLockKeys(candidate)).toEqual(
        orderOperationsLockKeys(ecommerce),
      );
      expect(candidate.assetLocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "commerce.catalog",
            version: "1.2.0",
          }),
          expect.objectContaining({ key: "commerce.order", version: "2.1.2" }),
          expect.objectContaining({
            key: "commerce.transaction",
            version: "2.2.1",
          }),
        ]),
      );
      expect(candidate.graph.domain.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: catalogEntity }),
          expect.objectContaining({ key: orderEntity }),
        ]),
      );
      expect(candidate.graph.policy.roles).toContain(fulfilmentRole);
      expect(candidate.graph.domain.entities.map(({ key }) => key)).not.toEqual(
        expect.arrayContaining(["restaurant-table", "kitchen-ticket"]),
      );
    },
  );
});
