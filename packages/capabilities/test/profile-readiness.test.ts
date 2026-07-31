import { describe, expect, it } from "vitest";

import { listProfileReadiness } from "../src/index.js";
import { createProfileReadiness } from "../src/profile-readiness.js";

describe("Profile readiness", () => {
  it("reports Restaurant order operations as partial without claiming provider features", () => {
    const restaurant = listProfileReadiness().find(
      ({ profile }) => profile === "restaurant-ordering",
    );

    expect(restaurant?.capabilities).toEqual(
      expect.arrayContaining([
        { key: "commerce.catalog", status: "available" },
        { key: "commerce.cart", status: "available" },
        { key: "restaurant.table-session", status: "available" },
        { key: "restaurant.kitchen", status: "available" },
        { key: "commerce.transaction", status: "partial" },
        { key: "commerce.order-amendment", status: "planned" },
        { key: "identity.member", status: "provider-required" },
        { key: "payment.provider", status: "provider-required" },
      ]),
    );
    expect(restaurant?.generatedTargets).toEqual([
      "simulator",
      "web",
      "api",
      "database",
      "tests",
      "docs",
    ]);
  });

  it("describes every registered profile without leaking Restaurant-only assets", () => {
    const readiness = listProfileReadiness();

    expect(readiness.map(({ profile }) => profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ]);
    expect(
      readiness.find(({ profile }) => profile === "expense-approval")
        ?.capabilities,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: expect.stringMatching(/^commerce\./) }),
      ]),
    );
    expect(
      readiness.find(({ profile }) => profile === "simple-ecommerce")
        ?.capabilities,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "restaurant.kitchen" }),
      ]),
    );
  });

  it("rejects an unrelated available capability overridden by a profile gap", () => {
    expect(() =>
      createProfileReadiness([
        {
          profile: "restaurant-ordering",
          label: "Restaurant ordering",
          availableCapabilities: [
            "commerce.transaction",
            "commerce.order-amendment",
          ],
        },
      ]),
    ).toThrow(
      "Profile readiness duplicates capability 'commerce.order-amendment' for 'restaurant-ordering'.",
    );
  });
});
