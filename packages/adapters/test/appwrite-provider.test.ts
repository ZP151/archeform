import { describe, expect, it } from "vitest";
import { hashApplicationGraph } from "@factory/graph";

import { appwriteProvider } from "../src/appwrite-provider.js";

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

describe("Appwrite provider contract", () => {
  it("projects only a Published Graph through a fixture-only Appwrite contract", async () => {
    await expect(appwriteProvider.compile(publishedGraph)).resolves.toEqual(
      expect.objectContaining({
        providerKey: "appwrite",
        graphHash: hashApplicationGraph(publishedGraph.graph),
      }),
    );
  });

  it("rejects a mutable Graph without making a provider request", async () => {
    await expect(
      appwriteProvider.compile(publishedGraph.graph),
    ).rejects.toThrow("Published revision required");
  });
});
