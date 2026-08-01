import type { CapabilityRuntimeModule } from "./contract.js";

export interface PriceQuoteInput {
  readonly currency: string;
  readonly lines: readonly {
    readonly catalogId: string;
    readonly unitMinor: string;
    readonly quantity: number;
  }[];
}

export interface PriceQuote {
  readonly currency: string;
  readonly subtotalMinor: string;
  readonly discountMinor: string;
  readonly taxMinor: string;
  readonly totalMinor: string;
}

const minorPattern = /^(0|[1-9][0-9]*)$/;
const decimalPattern = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/;
const currency = "USD";

function toMinorUnits(value: unknown): string {
  const source =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : typeof value === "string"
        ? value
        : "";
  const match = decimalPattern.exec(source);
  if (!match) throw new Error("Catalog price must be a non-negative decimal.");
  const fraction = `${match[2] ?? ""}00`.slice(0, 2);
  return (BigInt(match[1]!) * 100n + BigInt(fraction)).toString();
}

export function quoteOrderPrice(input: PriceQuoteInput): PriceQuote {
  if (!/^[A-Z]{3}$/.test(input.currency) || !input.lines.length) {
    throw new Error("Price quote is invalid.");
  }
  const subtotal = input.lines.reduce((sum, line) => {
    if (
      !line.catalogId ||
      !minorPattern.test(line.unitMinor) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      throw new Error("Price quote line is invalid.");
    }
    return sum + BigInt(line.unitMinor) * BigInt(line.quantity);
  }, 0n);
  return Object.freeze({
    currency: input.currency,
    subtotalMinor: subtotal.toString(),
    discountMinor: "0",
    taxMinor: "0",
    totalMinor: subtotal.toString(),
  });
}

export const capabilityModule: CapabilityRuntimeModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  moneyPricingHandler: {
    quote: async ({ role, catalogEntity, lines, store, assertAllowed }) => {
      if (catalogEntity !== "{{catalogEntity}}") {
        throw new Error("Catalog entity does not match the configured catalog entity.");
      }
      if (!lines.length) throw new Error("Price quote requires at least one line.");
      await assertAllowed(role, catalogEntity, "read");
      const resolved = await Promise.all(
        lines.map(async (line) => {
          if (!line.catalogRecordId || !Number.isInteger(line.quantity) || line.quantity < 1) {
            throw new Error("Price quote line is invalid.");
          }
          const catalogRecord = await store.find(catalogEntity, line.catalogRecordId);
          if (!catalogRecord) {
            throw new Error(`Catalog record '${line.catalogRecordId}' was not found.`);
          }
          return {
            catalogRecordId: line.catalogRecordId,
            quantity: line.quantity,
            unitMinor: toMinorUnits(catalogRecord["{{priceField}}"]),
          };
        }),
      );
      const quote = quoteOrderPrice({
        currency,
        lines: resolved.map((line) => ({
          catalogId: line.catalogRecordId,
          unitMinor: line.unitMinor,
          quantity: line.quantity,
        })),
      });
      return Object.freeze({
        ...quote,
        lines: Object.freeze(
          resolved.map((line) =>
            Object.freeze({
              ...line,
              totalMinor: (BigInt(line.unitMinor) * BigInt(line.quantity)).toString(),
            }),
          ),
        ),
      });
    },
  },
};
