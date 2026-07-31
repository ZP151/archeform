import { describe, expect, it } from "vitest";

import {
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  type CapabilitySelectionV1,
} from "../src/index.js";

const foundationKeys = [
  "commerce.inventory-ledger",
  "commerce.line-configuration",
  "core.identity-context",
  "core.location-context",
] as const;

function foundationSelections(
  profile: ReturnType<typeof composeDefaultCapabilityDraft>,
): readonly CapabilitySelectionV1[] {
  const selections = profile.graph.integration.compositionSelections ?? [];
  return selections.filter((selection) =>
    foundationKeys.includes(
      selection.lock.key as (typeof foundationKeys)[number],
    ),
  );
}

describe("commercial profile composition", () => {
  it("uses the same Foundation identities with different Restaurant and Ecommerce bindings", () => {
    const restaurant = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const ecommerce = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    const restaurantFoundation = foundationSelections(restaurant);
    const ecommerceFoundation = foundationSelections(ecommerce);

    expect(restaurantFoundation.map(({ lock }) => lock.key)).toEqual(
      foundationKeys,
    );
    expect(ecommerceFoundation.map(({ lock }) => lock.key)).toEqual(
      foundationKeys,
    );
    expect(restaurantFoundation.map(({ lock }) => lock)).toEqual(
      ecommerceFoundation.map(({ lock }) => lock),
    );
    expect(restaurantFoundation).not.toEqual(ecommerceFoundation);
    expect(restaurant.graph.domain.entities).toContainEqual(
      expect.objectContaining({ key: "menu-option-group" }),
    );
    expect(ecommerce.graph.domain.entities).toContainEqual(
      expect.objectContaining({ key: "product-option-group" }),
    );
  });

  it("rejects a Foundation binding that references no declared Graph symbol", () => {
    const profile = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    const selections = (profile.graph.integration.compositionSelections ?? [])
      .map((selection) => structuredClone(selection))
      .map((selection) =>
        selection.lock.key === "core.location-context"
          ? {
              ...selection,
              bindings: {
                ...selection.bindings,
                locationEntity: {
                  graphSymbol: "graph.domain.missing",
                },
              },
            }
          : selection,
      );

    expect(() =>
      composeCapabilityDraft({
        graph: profile.graph,
        selections,
      }),
    ).toThrow("graph.domain.missing");
  });
});
