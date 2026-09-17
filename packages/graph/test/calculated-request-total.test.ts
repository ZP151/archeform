import { describe, expect, it } from "vitest";
import * as graph from "../src/index.js";
import * as browser from "../src/browser.js";

const positive = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: 0, inclusive: false },
} as const;
const signed = {
  apiVersion: "factory.numeric-field-domain/v1",
  minimum: { value: -2147483648, inclusive: true },
} as const;
describe("exact quantity unit price total", () => {
  it("exports the closed browser-safe descriptor and runtime", () => {
    expect(graph.createCalculatedRequestTotalRuntime).toBeTypeOf("function");
    expect(browser.createCalculatedRequestTotalRuntime).toBe(
      graph.createCalculatedRequestTotalRuntime,
    );
    const descriptor = {
      apiVersion: "factory.quantity-unit-price-total/v1",
      quantityFieldKey: "quantity",
      unitPriceFieldKey: "price",
    };
    expect(graph.quantityUnitPriceTotalSchema.parse(descriptor)).toEqual(
      descriptor,
    );
    for (const invalid of [
      { ...descriptor, expression: "x*y" },
      { ...descriptor, apiVersion: "v2" },
      { ...descriptor, quantityFieldKey: "x.y" },
    ])
      expect(
        graph.quantityUnitPriceTotalSchema.safeParse(invalid).success,
      ).toBe(false);
  });
  it.each([
    [12, 125.5, 1506],
    [3, 0.1, 0.3],
    [3, 0.07, 0.21],
    [2, 1e-100, 2e-100],
    [2147483647, 1, 2147483647],
    [-2147483648, 1, -2147483648],
    [0, 3, 0],
    [-3, -0.1, 0.3],
  ])("multiplies canonical decimals %s and %s exactly", (q, p, expected) => {
    expect(
      graph
        .createCalculatedRequestTotalRuntime()
        .calculate(q, p, signed, signed),
    ).toBe(expected);
  });
  it.each([
    [3, 0.10000000000000002],
    [2147483647, 1e308],
    [2147483648, 1],
    [1.5, 1],
    ["3", 0.1],
    [3, "0.1"],
    [null, 1],
    [true, 1],
    [{}, 1],
    [[], 1],
    [3, []],
    [3, NaN],
    [3, Infinity],
    [0, 1],
    [-1, 1],
  ])("rejects invalid HTTP operands %j %j", (q, p) => {
    expect(
      graph
        .createCalculatedRequestTotalRuntime()
        .calculate(q, p, positive, positive),
    ).toBeNull();
  });
  it("rejects malformed or empty domain declarations without guessing bounds", () => {
    const runtime = graph.createCalculatedRequestTotalRuntime();
    for (const domain of [
      null,
      {},
      { apiVersion: positive.apiVersion },
      { ...positive, minimum: { value: 0.5, inclusive: true } },
      { ...positive, maximum: { value: 0, inclusive: true } },
      { ...positive, extra: true },
    ])
      expect(runtime.calculate(3, 0.1, domain as never, positive)).toBeNull();
  });
  it("validates trusted values before any precision loss and bounds resource use", () => {
    const runtime = graph.createCalculatedRequestTotalRuntime();
    for (const value of [
      "01",
      "00.1",
      "0.10000000000000000001",
      "0.09999999999999999999",
      "1e-324",
      "1e309",
      "0e1025",
      "0e-1025",
      " 1",
      "+1",
      "NaN",
      "1e1025",
      "1e-1025",
      "1e999999999999",
      "0".repeat(1025),
      {},
      { toString: () => "1" },
    ])
      expect(runtime.normalizeTrusted(value, "decimal", positive)).toBeNull();
    expect(
      runtime.normalizeTrusted("0.10000000000000000001", "decimal", {
        ...positive,
        maximum: { value: 0.1, inclusive: true },
      }),
    ).toBeNull();
    expect(runtime.normalizeTrusted("1.2500e2", "decimal", positive)).toBe(125);
    expect(runtime.normalizeTrusted("0e1024", "decimal", signed)).toBe(0);
    expect(runtime.normalizeTrusted("1.25E+2", "decimal", positive)).toBe(125);
    expect(runtime.normalizeTrusted(-0, "decimal", signed)).toBe(0);
    expect(
      runtime.validateTrustedTotal("3", "0.10", "0.30", positive, positive),
    ).toBe(true);
    expect(
      runtime.validateTrustedTotal(
        "3",
        "0.10",
        "0.30000000000000000001",
        positive,
        positive,
      ),
    ).toBe(false);
    expect(runtime.validateTrustedTotal(3, 0.1, 0.31, positive, positive)).toBe(
      false,
    );
  });
});
