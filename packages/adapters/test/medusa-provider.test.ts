import { describe, expect, it } from "vitest";
import { hashApplicationGraph } from "@factory/graph";

import { medusaProvider } from "../src/medusa-provider.js";

const publishedGraph = {
  publishedRevisionId: "published-commerce-1",
  graph: {
    apiVersion: "factory.application-graph/v1" as const,
    metadata: { id: "simple-ecommerce", workspaceId: "local-workspace", name: "Simple ecommerce" },
    page: { pages: [], navigation: [] },
    domain: { entities: [{ key: "product", label: "Product", fields: [], indexes: [] }], relations: [] },
    policy: { roles: ["customer"], permissions: [] },
    flow: { flows: [] },
    integration: { providers: [], capabilities: [] },
    experience: { theme: { mode: "light" as const, tokens: {} }, locales: ["en"] },
  },
};

describe("Medusa provider contract", () => {
  it("keeps the native commerce compiler authoritative while proving a Published Graph projection", async () => {
    await expect(medusaProvider.compile(publishedGraph)).resolves.toEqual(
      expect.objectContaining({
        providerKey: "medusa",
        graphHash: hashApplicationGraph(publishedGraph.graph),
      }),
    );
  });

  it("rejects mutable Graph input before any external runtime action", async () => {
    await expect(medusaProvider.compile(publishedGraph.graph)).rejects.toThrow(
      "Published revision required",
    );
  });
});
