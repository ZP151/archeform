import { describe, expect, it } from "vitest";

import { listProfileCoverage } from "../src/index.js";

describe("Profile coverage", () => {
  it("maps shared order operations to the four commerce Profiles as partial", () => {
    const orderOperations = listProfileCoverage().find(
      ({ key }) => key === "commerce.order-operations",
    );

    expect(orderOperations).toEqual({
      apiVersion: "factory.profile-coverage/v1",
      key: "commerce.order-operations",
      label: "Order operations",
      status: "partial",
      packageKeys: ["commerce.order", "commerce.inventory", "core.audit"],
      profiles: [
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ],
    });
  });

  it("reports the required operations gaps without source metadata", () => {
    const coverage = listProfileCoverage();

    expect(coverage.map(({ key }) => key)).toEqual([
      "operations.table-session",
      "commerce.catalog-experience",
      "commerce.order-operations",
      "commerce.inventory-operations",
      "operations.console",
      "commerce.promotion-membership",
      "availability.reservation-queue",
      "commerce.fulfillment",
      "identity.party",
      "communication.notification",
      "analytics.operations",
    ]);
    expect(JSON.stringify(coverage)).not.toMatch(
      /https?:|repository|source|path|token|secret|prompt|response/iu,
    );
  });
});
