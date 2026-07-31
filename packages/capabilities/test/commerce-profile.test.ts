import { describe, expect, it } from "vitest";

import {
  assertCommerceLineConfigurationProfile,
  assertLineConfigurationSelectionRule,
  type CommerceLineConfigurationProfileProjectionV1,
} from "../src/commerce/profile.js";

const validProfile: CommerceLineConfigurationProfileProjectionV1 = {
  apiVersion: "factory.commerce-line-configuration-profile/v1",
  catalogEntity: "product",
  lineEntity: "order-line",
  optionGroupEntity: "product-option-group",
  optionEntity: "product-option",
  snapshotEntity: "order-line-option",
  customerRole: "shopper",
  merchantRole: "merchant",
  catalogRoute: "/catalog",
  merchantRoute: "/merchant/catalog",
  entityFields: {
    "product-option-group": {
      name: "string",
      selectionMode: "enum",
      minimumSelections: "integer",
      maximumSelections: "integer",
      active: "boolean",
      sortOrder: "integer",
    },
    "product-option": {
      label: "string",
      priceDelta: "decimal",
      available: "boolean",
      sortOrder: "integer",
    },
    "order-line-option": {
      label: "string",
      priceDelta: "decimal",
      quantity: "integer",
    },
  },
  relations: [
    ["product", "product-option-group"],
    ["product-option-group", "product-option"],
    ["order-line", "order-line-option"],
    ["order-line-option", "product-option"],
  ],
};

describe("commerce line-configuration profile semantics", () => {
  it("accepts the portable entity, route, role, and snapshot contract", () => {
    expect(() =>
      assertCommerceLineConfigurationProfile(validProfile),
    ).not.toThrow();
  });

  it("rejects a profile without the catalog-to-option-group relation", () => {
    expect(() =>
      assertCommerceLineConfigurationProfile({
        ...validProfile,
        relations: validProfile.relations.slice(1),
      }),
    ).toThrow(/option group.*catalog/i);
  });

  it("rejects unsupported selection modes and invalid cardinalities", () => {
    expect(() =>
      assertLineConfigurationSelectionRule({
        selectionMode: "unknown",
        minimumSelections: 1,
        maximumSelections: 1,
        availableOptionCount: 1,
      }),
    ).toThrow(/selection mode/i);
    expect(() =>
      assertLineConfigurationSelectionRule({
        selectionMode: "multiple",
        minimumSelections: 3,
        maximumSelections: 2,
        availableOptionCount: 2,
      }),
    ).toThrow(/maximumSelections/i);
  });
});
