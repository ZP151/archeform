import { describe, expect, it } from "vitest";

import { fixtureNativeProvider } from "../src/provider-contract.js";
import { hashApplicationGraph } from "@factory/graph";

const graph = {
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
};

describe("runtime provider contract", () => {
  it("projects a Published Graph through the native fixture provider", async () => {
    const result = await fixtureNativeProvider.compile({
      publishedRevisionId: "published-expense-1",
      graph,
    });

    expect(result).toEqual(
      expect.objectContaining({
        providerKey: "fixture-native",
        graphHash: hashApplicationGraph(graph),
        publishedRevisionId: "published-expense-1",
      }),
    );
    await expect(
      fixtureNativeProvider.teardown(result),
    ).resolves.toBeUndefined();
  });

  it("rejects a mutable Graph without a Published Revision identity", async () => {
    await expect(fixtureNativeProvider.compile(graph)).rejects.toThrow(
      "Published revision required",
    );
  });
});
