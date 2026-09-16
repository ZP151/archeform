import { describe, expect, it } from "vitest";

import * as graph from "../src/index.js";
import * as browser from "../src/browser.js";

const apiVersion = "factory.numeric-field-domain/v1" as const;
const positive = { apiVersion, minimum: { value: 0, inclusive: false } };
const bound = (value: number, inclusive = true) => ({ value, inclusive });

describe("numeric field domain", () => {
  it("exports the same browser-safe contract from both entries", () => {
    expect(graph.numericFieldDomainSchema).toBeDefined();
    expect(browser.numericFieldDomainSchema).toBe(
      graph.numericFieldDomainSchema,
    );
    expect(browser.isNumericFieldDomainValidForType).toBe(
      graph.isNumericFieldDomainValidForType,
    );
    expect(browser.isNumericFieldValueAllowed).toBe(
      graph.isNumericFieldValueAllowed,
    );
  });

  it.each([
    positive,
    { apiVersion, maximum: bound(10) },
    { apiVersion, minimum: bound(-10), maximum: bound(10, false) },
  ])("retains an exact supported policy %j", (domain) => {
    expect(graph.numericFieldDomainSchema.parse(domain)).toEqual(domain);
  });

  it.each([
    {},
    { apiVersion },
    { ...positive, apiVersion: "factory.numeric-field-domain/v2" },
    { ...positive, extra: true },
    { apiVersion, minimum: { ...bound(0), extra: true } },
    { apiVersion, maximum: { ...bound(0), extra: true } },
    { apiVersion, minimum: { value: 0 } },
    { apiVersion, minimum: { value: "0", inclusive: true } },
    { apiVersion, minimum: { value: 0, inclusive: "true" } },
    { apiVersion, minimum: null },
    ...[NaN, Infinity, -Infinity].map((value) => ({
      apiVersion,
      minimum: bound(value),
    })),
  ])("rejects malformed or open policy %j", (domain) => {
    expect(graph.numericFieldDomainSchema.safeParse(domain).success).toBe(
      false,
    );
  });

  it.each([
    ["integer", bound(0, false), bound(1, false), false],
    ["integer", bound(0, false), bound(1), true],
    ["integer", bound(0), bound(0), true],
    ["integer", bound(0), bound(0, false), false],
    ["integer", bound(2), bound(1), false],
    ["integer", bound(0.5), undefined, false],
    ["integer", bound(-2147483649), undefined, false],
    ["integer", undefined, bound(2147483648), false],
    ["integer", bound(2147483647, false), undefined, false],
    ["integer", undefined, bound(-2147483648, false), false],
    ["integer", bound(-2147483648), bound(2147483647), true],
    ["integer", bound(2147483647), undefined, true],
    ["integer", undefined, bound(-2147483648), true],
    ["decimal", bound(0, false), bound(1, false), true],
    ["decimal", bound(0), bound(0), true],
    ["decimal", bound(0, false), bound(0), false],
    ["decimal", bound(0), bound(0, false), false],
    ["decimal", bound(2), bound(1), false],
    ["decimal", bound(0.5), undefined, true],
  ] as const)(
    "checks %s interval %j to %j is nonempty: %s",
    (type, minimum, maximum, expected) => {
      expect(
        graph.isNumericFieldDomainValidForType(
          { apiVersion, minimum, maximum },
          type,
        ),
      ).toBe(expected);
    },
  );

  it.each([
    [125.5, "decimal", true],
    [0, "decimal", false],
    [-1, "decimal", false],
    [Number.MIN_VALUE, "decimal", true],
    ["125.5", "decimal", false],
    [" ", "decimal", false],
    [null, "decimal", false],
    [undefined, "decimal", false],
    [true, "decimal", false],
    [{ valueOf: () => 1 }, "decimal", false],
    [[], "decimal", false],
    [NaN, "decimal", false],
    [Infinity, "decimal", false],
    [-Infinity, "decimal", false],
    [12, "integer", true],
    [12.5, "integer", false],
    [2147483647, "integer", true],
    [2147483648, "integer", false],
    [3_000_000_000, "integer", false],
  ] as const)("validates primitive %j as %s: %s", (value, type, expected) => {
    expect(graph.isNumericFieldValueAllowed(value, type, positive)).toBe(
      expected,
    );
  });

  it.each(["integer", "decimal"] as const)(
    "enforces inclusive and exclusive upper and lower bounds for %s",
    (type) => {
      const inclusive = { apiVersion, minimum: bound(-2), maximum: bound(2) };
      const exclusive = {
        apiVersion,
        minimum: bound(-2, false),
        maximum: bound(2, false),
      };
      for (const endpoint of [-2, 2]) {
        expect(
          graph.isNumericFieldValueAllowed(endpoint, type, inclusive),
        ).toBe(true);
        expect(
          graph.isNumericFieldValueAllowed(endpoint, type, exclusive),
        ).toBe(false);
      }
      expect(graph.isNumericFieldValueAllowed(-3, type, inclusive)).toBe(false);
      expect(graph.isNumericFieldValueAllowed(3, type, inclusive)).toBe(false);
      expect(graph.isNumericFieldValueAllowed(0, type, exclusive)).toBe(true);
    },
  );

  it("enforces the negative Int32 endpoint without changing decimal representation", () => {
    const domain = { apiVersion, maximum: bound(0) };
    expect(
      graph.isNumericFieldValueAllowed(-2147483648, "integer", domain),
    ).toBe(true);
    expect(
      graph.isNumericFieldValueAllowed(-2147483649, "integer", domain),
    ).toBe(false);
    expect(
      graph.isNumericFieldValueAllowed(-2147483649, "decimal", domain),
    ).toBe(true);
  });
});
