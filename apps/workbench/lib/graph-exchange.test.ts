import { describe, expect, it } from "vitest";
import { createPublishedGraphExchange } from "@factory/graph";

import {
  graphExchangeFilename,
  parseGraphExchangeText,
  serializeGraphExchange,
} from "./graph-exchange";
import { workbenchGraph } from "./workbench-graph";

describe("Graph exchange file helpers", () => {
  it("serializes a digest-verified Graph with a stable Git-friendly name", () => {
    const exchange = createPublishedGraphExchange(workbenchGraph, 4);

    expect(graphExchangeFilename(exchange)).toBe(
      "ops-workspace.published-r4.factory-graph.json",
    );
    expect(parseGraphExchangeText(serializeGraphExchange(exchange))).toEqual(exchange);
  });

  it("rejects JSON that is not a verified Published Graph exchange", () => {
    expect(() => parseGraphExchangeText('{"source":"arbitrary code"}')).toThrow(
      "Choose a valid Factory Published Graph exchange file.",
    );
  });
});
