import type { PublishedGraphExchangeV1 } from "@factory/graph";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

export function graphExchangeFilename(exchange: PublishedGraphExchangeV1): string {
  return `${exchange.graph.metadata.id}.published-r${exchange.publishedRevision.revisionNumber}.factory-graph.json`;
}

export function serializeGraphExchange(exchange: PublishedGraphExchangeV1): string {
  return `${JSON.stringify(exchange, null, 2)}\n`;
}

/**
 * Performs a browser-safe shape preflight before an exchange reaches the
 * Control Plane. Digest and semantic validation remain server-side because
 * `@factory/graph` intentionally uses Node crypto for canonical hashing.
 */
export function parseGraphExchangeText(text: string): PublishedGraphExchangeV1 {
  try {
    const exchange: unknown = JSON.parse(text);
    if (!isRecord(exchange) || !hasOnlyKeys(exchange, ["apiVersion", "kind", "publishedRevision", "graph"])) {
      throw new Error("Unsupported exchange document.");
    }
    if (
      exchange.apiVersion !== "factory.published-graph-exchange/v1"
      || exchange.kind !== "published-application-graph"
      || !isRecord(exchange.publishedRevision)
      || !hasOnlyKeys(exchange.publishedRevision, ["revisionNumber", "graphHash"])
      || !Number.isInteger(exchange.publishedRevision.revisionNumber)
      || Number(exchange.publishedRevision.revisionNumber) < 1
      || typeof exchange.publishedRevision.graphHash !== "string"
      || !/^sha256:[a-f0-9]{64}$/.test(exchange.publishedRevision.graphHash)
      || !isRecord(exchange.graph)
    ) {
      throw new Error("Unsupported exchange document.");
    }
    return exchange as PublishedGraphExchangeV1;
  } catch {
    throw new Error("Choose a valid Factory Published Graph exchange file.");
  }
}
