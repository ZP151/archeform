import { describe, expect, it } from "vitest";

import {
  createDraftRevision,
  hashApplicationGraph,
  type ApplicationGraphV1,
  type GraphDiffV1,
} from "@factory/graph";

import {
  FixtureGraphProposalProvider,
  GraphProposalError,
  OpenAIGraphProposalProvider,
  type OpenAIResponseTransport,
} from "../src/ai.js";

const graph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: { id: "expense", workspaceId: "local", name: "Expense approval" },
  page: {
    pages: [{ id: "expenses", route: "/expenses", title: "Expenses", blocks: [] }],
    navigation: [{ id: "expenses", label: "Expenses", pageId: "expenses" }],
  },
  domain: {
    entities: [{ key: "expense", label: "Expense", fields: [{ key: "amount", type: "decimal", required: true }], indexes: [] }],
    relations: [],
  },
  policy: { roles: ["employee"], permissions: [{ role: "employee", resource: "expense", actions: ["create", "read"] }] },
  flow: { flows: [] },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
};

const addReceiptField: GraphDiffV1 = {
  apiVersion: "factory.graph-diff/v1",
  baseGraphHash: hashApplicationGraph(graph),
  operations: [{ op: "add", path: "/domain/entities/0/fields/-", value: { key: "receiptUrl", type: "url", required: false } }],
};

describe("AI Graph proposal adapter", () => {
  it("returns a fixture proposal that has already been validated against the in-memory Draft", async () => {
    const provider = new FixtureGraphProposalProvider({
      diff: addReceiptField,
      impact: { summary: "Adds a receipt URL.", affectedModels: ["domain"], risks: [] },
      testSuggestions: [{ id: "receipt-optional", title: "Creates an expense without a receipt", type: "journey" }],
    });

    const proposal = await provider.propose({ graph, brief: "Capture receipt URLs when available." });

    expect(proposal.diff).toEqual(addReceiptField);
    expect(proposal.impact.affectedModels).toEqual(["domain"]);
    expect(proposal).not.toHaveProperty("brief");
    expect(() => createDraftRevision(graph, "draft")).not.toThrow();
  });

  it("reads the OpenAI key only when a proposal is requested and requests strict non-persistent JSON", async () => {
    let environmentReads = 0;
    let receivedRequest: Parameters<OpenAIResponseTransport["create"]>[0] | undefined;
    const transport: OpenAIResponseTransport = {
      async create(request) {
        receivedRequest = request;
        return {
          outputText: JSON.stringify({
            diff: addReceiptField,
            impact: { summary: "Adds a receipt URL.", affectedModels: ["domain"], risks: [] },
            testSuggestions: [],
          }),
        };
      },
    };
    const provider = new OpenAIGraphProposalProvider({
      transport,
      readEnvironment: () => {
        environmentReads += 1;
        return "test-key";
      },
    });

    expect(environmentReads).toBe(0);
    await provider.propose({ graph, brief: "Add optional receipts." });

    expect(environmentReads).toBe(1);
    expect(receivedRequest).toMatchObject({ store: false, strictJson: true });
    expect(receivedRequest?.apiKey).toBe("test-key");
    expect(receivedRequest?.input).toContain("Add optional receipts.");
    expect(receivedRequest?.instructions).toContain("RFC 6901 JSON Pointer");
    expect(receivedRequest?.instructions).toContain("If adding a domain field");
  });

  it("rejects a response whose Graph Diff cannot apply to the draft", async () => {
    const provider = new FixtureGraphProposalProvider({
      diff: {
        apiVersion: "factory.graph-diff/v1",
        operations: [{ op: "replace", path: "/metadata/workspaceId", value: "other" }],
      },
      impact: { summary: "Invalid.", affectedModels: ["metadata"], risks: ["scope"] },
      testSuggestions: [],
    });

    await expect(provider.propose({ graph, brief: "Do not move this workspace." })).rejects.toBeInstanceOf(GraphProposalError);
  });

  it("classifies a transport rejection without exposing provider data", async () => {
    const provider = new OpenAIGraphProposalProvider({
      transport: { async create() { throw new Error("provider-specific detail must stay private"); } },
      readEnvironment: () => "test-key",
    });

    await expect(provider.propose({ graph, brief: "Add a field." })).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI Graph proposal request failed.",
    });
  });

  it("fails closed when the environment-only API key is unavailable", async () => {
    const provider = new OpenAIGraphProposalProvider({
      transport: { async create() { throw new Error("Transport must not be called."); } },
      readEnvironment: () => undefined,
    });

    await expect(provider.propose({ graph, brief: "Any proposal." })).rejects.toThrow("OPENAI_API_KEY");
  });
});
