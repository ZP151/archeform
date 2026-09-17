import { z } from "zod";
import { graphFieldKeySchema } from "./composition-shared.js";
import {
  isNumericFieldDomainValidForType,
  type NumericFieldDomainV1,
  type NumericFieldType,
} from "./numeric-field-domain.js";

export const quantityUnitPriceTotalSchema = z
  .object({
    apiVersion: z.literal("factory.quantity-unit-price-total/v1"),
    quantityFieldKey: graphFieldKeySchema,
    unitPriceFieldKey: graphFieldKeySchema,
  })
  .strict();
export type QuantityUnitPriceTotalV1 = z.infer<
  typeof quantityUnitPriceTotalSchema
>;

/** Self-contained first-party runtime: its compiled function source may be emitted unchanged.
 * Trusted adapters must identify actual Decimal instances before passing their string encoding.
 * HTTP callers must use calculate, which never coerces a non-number input.
 */
export function createCalculatedRequestTotalRuntime() {
  type Decimal = { coefficient: bigint; exponent: number };
  const normalize = (coefficient: bigint, exponent: number): Decimal => {
    if (coefficient === 0n) return { coefficient: 0n, exponent: 0 };
    while (coefficient % 10n === 0n) {
      coefficient /= 10n;
      exponent++;
    }
    return { coefficient, exponent };
  };
  const parse = (value: unknown): Decimal | null => {
    const text =
      typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : typeof value === "string"
          ? value
          : null;
    if (text === null || text.length > 1024) return null;
    const match = /^(-?)(0|[1-9][0-9]*)(?:\.(\d+))?(?:[eE]([+-]?)(\d+))?$/.exec(
      text,
    );
    if (!match) return null;
    const exponentDigits = (match[5] ?? "0").replace(/^0+/, "") || "0";
    if (
      exponentDigits.length > 4 ||
      (exponentDigits.length === 4 && exponentDigits > "1024")
    )
      return null;
    const exponent =
      Number(exponentDigits) * (match[4] === "-" ? -1 : 1) -
      (match[3]?.length ?? 0);
    return normalize(
      BigInt(match[1]! + match[2]! + (match[3] ?? "")),
      exponent,
    );
  };
  const compare = (left: Decimal, right: Decimal): number => {
    const exponent = Math.min(left.exponent, right.exponent);
    const a = left.coefficient * 10n ** BigInt(left.exponent - exponent);
    const b = right.coefficient * 10n ** BigInt(right.exponent - exponent);
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const number = (value: Decimal): number | null => {
    const projected = Number(`${value.coefficient}e${value.exponent}`);
    const roundTrip = parse(projected);
    return roundTrip && compare(value, roundTrip) === 0
      ? projected === 0
        ? 0
        : projected
      : null;
  };
  const int32 = (value: number) =>
    Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  const validDomain = (
    domain: NumericFieldDomainV1,
    type: NumericFieldType,
  ): boolean => {
    if (
      !domain ||
      typeof domain !== "object" ||
      Array.isArray(domain) ||
      domain.apiVersion !== "factory.numeric-field-domain/v1" ||
      Object.keys(domain).some(
        (key) => !["apiVersion", "minimum", "maximum"].includes(key),
      )
    )
      return false;
    const { minimum, maximum } = domain;
    if (!minimum && !maximum) return false;
    for (const bound of [minimum, maximum]) {
      if (bound === undefined) continue;
      if (
        !bound ||
        typeof bound !== "object" ||
        Array.isArray(bound) ||
        Object.keys(bound).some(
          (key) => !["value", "inclusive"].includes(key),
        ) ||
        typeof bound.value !== "number" ||
        !Number.isFinite(bound.value) ||
        typeof bound.inclusive !== "boolean" ||
        (type === "integer" && !int32(bound.value))
      )
        return false;
    }
    if (type === "integer")
      return (
        (minimum ? minimum.value + (minimum.inclusive ? 0 : 1) : -2147483648) <=
        (maximum ? maximum.value - (maximum.inclusive ? 0 : 1) : 2147483647)
      );
    return (
      !minimum ||
      !maximum ||
      minimum.value < maximum.value ||
      (minimum.value === maximum.value &&
        minimum.inclusive &&
        maximum.inclusive)
    );
  };
  const normalizeTrusted = (
    value: unknown,
    type: NumericFieldType,
    domain?: NumericFieldDomainV1,
  ): number | null => {
    if (type !== "integer" && type !== "decimal") return null;
    const exact = parse(value);
    if (!exact || (domain !== undefined && !validDomain(domain, type)))
      return null;
    if (domain) {
      for (const [direction, bound] of [
        [1, domain.minimum],
        [-1, domain.maximum],
      ] as const) {
        if (!bound) continue;
        const comparison = compare(exact, parse(bound.value)!);
        if (
          comparison * direction < 0 ||
          (comparison === 0 && !bound.inclusive)
        )
          return null;
      }
    }
    const projected = number(exact);
    return projected === null || (type === "integer" && !int32(projected))
      ? null
      : projected;
  };
  const calculate = (
    quantity: unknown,
    unitPrice: unknown,
    quantityDomain: NumericFieldDomainV1,
    unitPriceDomain: NumericFieldDomainV1,
  ): number | null => {
    if (
      typeof quantity !== "number" ||
      typeof unitPrice !== "number" ||
      !validDomain(quantityDomain, "integer") ||
      !validDomain(unitPriceDomain, "decimal")
    )
      return null;
    const q = normalizeTrusted(quantity, "integer", quantityDomain),
      p = normalizeTrusted(unitPrice, "decimal", unitPriceDomain);
    if (q === null || p === null) return null;
    const a = parse(q)!,
      b = parse(p)!;
    return number(
      normalize(a.coefficient * b.coefficient, a.exponent + b.exponent),
    );
  };
  const validateTrustedTotal = (
    quantity: unknown,
    unitPrice: unknown,
    total: unknown,
    quantityDomain: NumericFieldDomainV1,
    unitPriceDomain: NumericFieldDomainV1,
  ): boolean => {
    const q = normalizeTrusted(quantity, "integer", quantityDomain),
      p = normalizeTrusted(unitPrice, "decimal", unitPriceDomain),
      t = normalizeTrusted(total, "decimal");
    if (q === null || p === null || t === null) return false;
    const expected = calculate(q, p, quantityDomain, unitPriceDomain);
    return expected !== null && expected === t;
  };
  return { calculate, normalizeTrusted, validateTrustedTotal };
}

/** Shared semantic check after the enclosing Blueprint or Graph schema parses. */
export function isCalculatedFieldSetValid(
  fields: readonly {
    key: string;
    type: string;
    required: boolean;
    calculation?: QuantityUnitPriceTotalV1;
    numericDomain?: NumericFieldDomainV1;
    unique?: boolean;
    values?: readonly string[];
    options?: readonly string[];
    referenceTo?: string;
  }[],
  forbiddenKeys: readonly string[] = [],
): boolean {
  const outputs = fields.filter((field) => field.calculation);
  if (outputs.length > 1) return false;
  for (const output of outputs) {
    const rule = output.calculation!;
    const quantity = fields.find(
      (field) => field.key === rule.quantityFieldKey,
    );
    const price = fields.find((field) => field.key === rule.unitPriceFieldKey);
    if (
      !quantity ||
      !price ||
      new Set([output.key, quantity.key, price.key]).size !== 3
    )
      return false;
    if (
      [output, quantity, price].some((field) =>
        [
          "id",
          "status",
          "version",
          "createdAt",
          "updatedAt",
          ...forbiddenKeys,
        ].includes(field.key),
      )
    )
      return false;
    if (
      !output.required ||
      !["currency", "decimal"].includes(output.type) ||
      output.numericDomain !== undefined ||
      output.unique ||
      output.options ||
      output.values ||
      output.referenceTo
    )
      return false;
    if (
      !quantity.required ||
      !["number", "integer"].includes(quantity.type) ||
      !price.required ||
      !["currency", "decimal"].includes(price.type)
    )
      return false;
    if (
      quantity.calculation ||
      price.calculation ||
      !quantity.numericDomain ||
      !price.numericDomain ||
      quantity.referenceTo ||
      price.referenceTo
    )
      return false;
    // Field-specific schema validation checks domain nonemptiness; no hidden sign policy.
    if (
      !isNumericFieldDomainValidForType(quantity.numericDomain, "integer") ||
      !isNumericFieldDomainValidForType(price.numericDomain, "decimal")
    )
      return false;
  }
  return true;
}
