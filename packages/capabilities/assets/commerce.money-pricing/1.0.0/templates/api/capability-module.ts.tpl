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
  readonly totalMinor: string;
}

const minorPattern = /^(0|[1-9][0-9]*)$/;

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
    totalMinor: subtotal.toString(),
  });
}

export const capabilityModule: CapabilityRuntimeModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
};
