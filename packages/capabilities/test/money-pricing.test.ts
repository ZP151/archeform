import { describe, expect, it } from "vitest";

import { allocateRefund, quotePrice } from "../src/commerce/money-pricing.js";

describe("Factory money pricing", () => {
  it("uses integer minor units for a discounted, taxed order", () => {
    expect(
      quotePrice({
        currency: "USD",
        lines: [{ key: "tea", unitMinor: "199", quantity: 3 }],
        promotions: [{ key: "welcome", kind: "percent", basisPoints: 1000 }],
        taxBasisPoints: 850,
      }),
    ).toEqual({
      currency: "USD",
      subtotalMinor: "597",
      discountMinor: "60",
      taxMinor: "46",
      totalMinor: "583",
      lines: [
        {
          key: "tea",
          subtotalMinor: "597",
          discountMinor: "60",
          taxMinor: "46",
          totalMinor: "583",
        },
      ],
    });
  });

  it("allocates a partial refund deterministically by declared line key", () => {
    expect(
      allocateRefund({
        currency: "USD",
        capturedMinor: "100",
        requestedMinor: "51",
        lines: [
          { key: "b", capturedMinor: "50" },
          { key: "a", capturedMinor: "50" },
        ],
      }),
    ).toEqual({
      currency: "USD",
      requestedMinor: "51",
      allocations: [
        { key: "a", minor: "26" },
        { key: "b", minor: "25" },
      ],
    });
  });

  it("rejects float-shaped amounts, mixed currency, and over-refunds", () => {
    expect(() =>
      quotePrice({
        currency: "USD",
        lines: [{ key: "tea", unitMinor: "1.99", quantity: 1 }],
        promotions: [],
        taxBasisPoints: 0,
      }),
    ).toThrow("minor");
    expect(() =>
      quotePrice({
        currency: "USD",
        lines: [{ key: "tea", unitMinor: "199", quantity: 1, currency: "EUR" }],
        promotions: [],
        taxBasisPoints: 0,
      }),
    ).toThrow("currency");
    expect(() =>
      allocateRefund({
        currency: "USD",
        capturedMinor: "100",
        requestedMinor: "101",
        lines: [{ key: "tea", capturedMinor: "100" }],
      }),
    ).toThrow("refund");
  });
});
