export interface MoneyAmountV1 {
  readonly minor: string;
  readonly currency: string;
}

export interface PriceLineInputV1 {
  readonly key: string;
  readonly unitMinor: string;
  readonly quantity: number;
  readonly currency?: string;
}

export type PricePromotionV1 =
  | {
      readonly key: string;
      readonly kind: "percent";
      readonly basisPoints: number;
    }
  | {
      readonly key: string;
      readonly kind: "fixed";
      readonly minor: string;
      readonly currency?: string;
    };

export interface PriceQuoteInputV1 {
  readonly currency: string;
  readonly lines: readonly PriceLineInputV1[];
  readonly promotions: readonly PricePromotionV1[];
  readonly taxBasisPoints: number;
}

export interface PriceQuoteLineV1 {
  readonly key: string;
  readonly subtotalMinor: string;
  readonly discountMinor: string;
  readonly taxMinor: string;
  readonly totalMinor: string;
}

export interface PriceQuoteV1 {
  readonly currency: string;
  readonly subtotalMinor: string;
  readonly discountMinor: string;
  readonly taxMinor: string;
  readonly totalMinor: string;
  readonly lines: readonly PriceQuoteLineV1[];
}

export interface RefundAllocationInputV1 {
  readonly currency: string;
  readonly capturedMinor: string;
  readonly requestedMinor: string;
  readonly lines: readonly {
    readonly key: string;
    readonly capturedMinor: string;
    readonly currency?: string;
  }[];
}

export interface RefundAllocationV1 {
  readonly currency: string;
  readonly requestedMinor: string;
  readonly allocations: readonly {
    readonly key: string;
    readonly minor: string;
  }[];
}

const minorPattern = /^(0|[1-9][0-9]*)$/;
const currencyPattern = /^[A-Z]{3}$/;

function assertCurrency(value: string, expected?: string): string {
  if (
    !currencyPattern.test(value) ||
    (expected !== undefined && value !== expected)
  ) {
    throw new Error("Money currency is invalid.");
  }
  return value;
}

function parseMinor(value: string, label = "Money minor amount"): bigint {
  if (!minorPattern.test(value)) throw new Error(`${label} is invalid.`);
  return BigInt(value);
}

function assertKey(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value;
}

function assertUniqueKeys(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} keys must be unique.`);
  }
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

type AllocationInput = Readonly<{ key: string; weight: bigint }>;

function allocateProportionally(
  total: bigint,
  values: readonly AllocationInput[],
): ReadonlyMap<string, bigint> {
  const denominator = values.reduce((sum, value) => sum + value.weight, 0n);
  if (denominator <= 0n) throw new Error("Money allocation requires value.");
  const provisional = values.map(({ key, weight }) => {
    const numerator = total * weight;
    return {
      key,
      amount: numerator / denominator,
      remainder: numerator % denominator,
    };
  });
  let remaining =
    total - provisional.reduce((sum, value) => sum + value.amount, 0n);
  for (const value of [...provisional].sort((left, right) => {
    if (left.remainder !== right.remainder) {
      return left.remainder > right.remainder ? -1 : 1;
    }
    return left.key.localeCompare(right.key);
  })) {
    if (remaining === 0n) break;
    value.amount += 1n;
    remaining -= 1n;
  }
  return new Map(provisional.map(({ key, amount }) => [key, amount]));
}

function calculateDiscount(
  subtotal: bigint,
  promotions: readonly PricePromotionV1[],
  currency: string,
): bigint {
  assertUniqueKeys(
    promotions.map((promotion) => assertKey(promotion.key, "Promotion")),
    "Promotion",
  );
  let remaining = subtotal;
  for (const promotion of promotions) {
    let discount: bigint;
    if (promotion.kind === "percent") {
      if (
        !Number.isInteger(promotion.basisPoints) ||
        promotion.basisPoints < 0 ||
        promotion.basisPoints > 10_000
      ) {
        throw new Error("Promotion basis points are invalid.");
      }
      discount = roundHalfUp(
        remaining * BigInt(promotion.basisPoints),
        10_000n,
      );
    } else {
      if (promotion.kind !== "fixed")
        throw new Error("Promotion kind is invalid.");
      if (promotion.currency !== undefined)
        assertCurrency(promotion.currency, currency);
      discount = parseMinor(promotion.minor, "Promotion minor amount");
    }
    remaining -= discount > remaining ? remaining : discount;
  }
  return subtotal - remaining;
}

function stringifyMinor(value: bigint): string {
  return value.toString();
}

/**
 * Quotes server-authoritative prices from declared catalog amounts. All
 * calculations use integer minor units and the returned line values sum to
 * the returned order totals.
 */
export function quotePrice(input: PriceQuoteInputV1): PriceQuoteV1 {
  const currency = assertCurrency(input.currency);
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error("Money quote requires at least one line.");
  }
  if (
    !Number.isInteger(input.taxBasisPoints) ||
    input.taxBasisPoints < 0 ||
    input.taxBasisPoints > 100_000
  ) {
    throw new Error("Tax basis points are invalid.");
  }
  const lines = input.lines.map((line) => {
    const key = assertKey(line.key, "Money line");
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Money line quantity is invalid.");
    }
    if (line.currency !== undefined) assertCurrency(line.currency, currency);
    const subtotal = parseMinor(line.unitMinor) * BigInt(line.quantity);
    return { key, subtotal };
  });
  assertUniqueKeys(
    lines.map((line) => line.key),
    "Money line",
  );
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0n);
  const discount = calculateDiscount(subtotal, input.promotions, currency);
  const discountedLineAmounts = allocateProportionally(
    discount,
    lines.map((line) => ({ key: line.key, weight: line.subtotal })),
  );
  const taxable = subtotal - discount;
  const tax = roundHalfUp(taxable * BigInt(input.taxBasisPoints), 10_000n);
  const taxableLineAmounts = lines.map((line) => ({
    key: line.key,
    weight: line.subtotal - (discountedLineAmounts.get(line.key) ?? 0n),
  }));
  const taxLineAmounts = allocateProportionally(tax, taxableLineAmounts);
  const renderedLines = lines.map((line) => {
    const lineDiscount = discountedLineAmounts.get(line.key) ?? 0n;
    const lineTax = taxLineAmounts.get(line.key) ?? 0n;
    return Object.freeze({
      key: line.key,
      subtotalMinor: stringifyMinor(line.subtotal),
      discountMinor: stringifyMinor(lineDiscount),
      taxMinor: stringifyMinor(lineTax),
      totalMinor: stringifyMinor(line.subtotal - lineDiscount + lineTax),
    });
  });
  return Object.freeze({
    currency,
    subtotalMinor: stringifyMinor(subtotal),
    discountMinor: stringifyMinor(discount),
    taxMinor: stringifyMinor(tax),
    totalMinor: stringifyMinor(subtotal - discount + tax),
    lines: Object.freeze(renderedLines),
  });
}

/**
 * Proportionally allocates a validated partial or full refund. Equal
 * remainders resolve lexicographically by the declared immutable line key.
 */
export function allocateRefund(
  input: RefundAllocationInputV1,
): RefundAllocationV1 {
  const currency = assertCurrency(input.currency);
  const captured = parseMinor(input.capturedMinor, "Captured minor amount");
  const requested = parseMinor(input.requestedMinor, "Refund minor amount");
  if (requested > captured) throw new Error("Money refund exceeds capture.");
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error("Money refund requires captured lines.");
  }
  const lines = input.lines.map((line) => {
    const key = assertKey(line.key, "Refund line");
    if (line.currency !== undefined) assertCurrency(line.currency, currency);
    return {
      key,
      captured: parseMinor(line.capturedMinor, "Refund line minor amount"),
    };
  });
  assertUniqueKeys(
    lines.map((line) => line.key),
    "Refund line",
  );
  if (lines.reduce((sum, line) => sum + line.captured, 0n) !== captured) {
    throw new Error("Money refund lines do not match capture.");
  }
  const amounts = allocateProportionally(
    requested,
    lines.map((line) => ({ key: line.key, weight: line.captured })),
  );
  return Object.freeze({
    currency,
    requestedMinor: stringifyMinor(requested),
    allocations: Object.freeze(
      [...amounts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, minor]) =>
          Object.freeze({ key, minor: stringifyMinor(minor) }),
        ),
    ),
  });
}
