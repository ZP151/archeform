import { describe, expect, it } from "vitest";
import { hashApplicationGraph } from "@factory/graph";

import { openFgaProvider } from "../src/openfga-provider.js";
import { fixtureNativeProvider } from "../src/provider-contract.js";

const publishedGraph = {
  publishedRevisionId: "published-expense-1",
  graph: {
    apiVersion: "factory.application-graph/v1" as const,
    metadata: {
      id: "expense-approval",
      workspaceId: "local-workspace",
      name: "Expense approval",
    },
    page: { pages: [], navigation: [] },
    domain: {
      entities: [{ key: "expense", label: "Expense", fields: [], indexes: [] }],
      relations: [],
    },
    policy: { roles: ["employee"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: {
      theme: { mode: "light" as const, tokens: {} },
      locales: ["en"],
    },
  },
};

describe("OpenFGA provider contract", () => {
  it("projects only a Published Graph through a fixture-only OpenFGA contract", async () => {
    await expect(openFgaProvider.compile(publishedGraph)).resolves.toEqual(
      expect.objectContaining({
        providerKey: "openfga",
        graphHash: hashApplicationGraph(publishedGraph.graph),
      }),
    );
  });

  it("does not accept a mutable Graph or provision an OpenFGA runtime", async () => {
    await expect(openFgaProvider.compile(publishedGraph.graph)).rejects.toThrow(
      "Published revision required",
    );
    expect(openFgaProvider).not.toBe(fixtureNativeProvider);
  });
});
