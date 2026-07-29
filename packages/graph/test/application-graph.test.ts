import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  createDraftRevision,
  createPublishedGraphExchange,
  GraphDiffError,
  GraphExchangeError,
  GraphSemanticError,
  hashApplicationGraph,
  parsePublishedGraphExchange,
  parseApplicationGraph,
  validateApplicationGraph,
  type ApplicationGraphV1,
} from "../src/index.js";

const expenseGraph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "expense-approval",
    workspaceId: "local-workspace",
    name: "Expense approval",
  },
  page: {
    pages: [
      {
        id: "expense-list",
        route: "/expenses",
        title: "Expenses",
        blocks: [
          { id: "expense-table", type: "data-table", entity: "expense" },
        ],
      },
    ],
    navigation: [{ id: "expenses", label: "Expenses", pageId: "expense-list" }],
  },
  domain: {
    entities: [
      {
        key: "expense",
        label: "Expense",
        fields: [
          { key: "amount", type: "decimal", required: true },
          { key: "status", type: "enum", required: true },
        ],
        indexes: [{ fields: ["status"] }],
      },
    ],
    relations: [],
  },
  policy: {
    roles: ["employee", "manager"],
    permissions: [
      { role: "employee", resource: "expense", actions: ["create", "read"] },
      { role: "manager", resource: "expense", actions: ["read", "approve"] },
    ],
  },
  flow: {
    flows: [
      {
        id: "expense-approval",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted", "approved", "rejected"],
        events: ["submit", "approve", "reject"],
        transitions: [
          { from: "draft", event: "submit", to: "submitted" },
          {
            from: "submitted",
            event: "approve",
            to: "approved",
            roles: ["manager"],
          },
          {
            from: "submitted",
            event: "reject",
            to: "rejected",
            roles: ["manager"],
          },
        ],
      },
    ],
  },
  integration: {
    providers: [],
    capabilities: [
      { key: "audit.record", providerId: "factory", operation: "record" },
    ],
  },
  experience: {
    theme: { mode: "system", tokens: { accent: "#0f766e" } },
    locales: ["en"],
  },
};

describe("ApplicationGraphV1", () => {
  it("parses a graph that can represent the expense profile", () => {
    expect(parseApplicationGraph(expenseGraph)).toEqual(expenseGraph);
    expect(validateApplicationGraph(expenseGraph)).toEqual([]);
  });

  it("retains immutable Golden capability asset locks in a valid Graph", () => {
    const locked = structuredClone(expenseGraph);
    locked.integration.compositionProfile = "expense-approval";
    locked.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:0f2d3b5b4dc3f351b53e9b874842afd6c7b4bcd9aeddfd8421199e95f2f544a6",
        lifecycle: "golden",
      },
    ];

    expect(parseApplicationGraph(locked)).toEqual(locked);
    expect(validateApplicationGraph(locked)).toEqual([]);
  });

  it("rejects duplicate capability asset locks", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.integration.compositionProfile = "expense-approval";
    invalid.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:0f2d3b5b4dc3f351b53e9b874842afd6c7b4bcd9aeddfd8421199e95f2f544a6",
        lifecycle: "golden",
      },
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:0f2d3b5b4dc3f351b53e9b874842afd6c7b4bcd9aeddfd8421199e95f2f544a6",
        lifecycle: "golden",
      },
    ];

    expect(validateApplicationGraph(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "integration.asset_lock.duplicate" }),
      ]),
    );
  });

  it("requires an explicit composition profile whenever Graph assets are locked", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.integration.assetLocks = [
      {
        key: "core.audit",
        version: "1.0.0",
        packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
        manifestDigest:
          "sha256:0f2d3b5b4dc3f351b53e9b874842afd6c7b4bcd9aeddfd8421199e95f2f544a6",
        lifecycle: "golden",
      },
    ];

    expect(validateApplicationGraph(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "integration.asset_lock.profile_missing",
        }),
      ]),
    );
  });

  it("finds cross-model semantic errors", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.page.navigation[0].pageId = "missing-page";
    invalid.domain.relations.push({
      from: "expense",
      to: "missing",
      kind: "many-to-one",
    });
    invalid.flow.flows[0].transitions[0].to = "missing-state";

    expect(validateApplicationGraph(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "page.navigation.target_missing" }),
        expect.objectContaining({ code: "domain.relation.target_missing" }),
        expect.objectContaining({ code: "flow.transition.target_missing" }),
      ]),
    );
  });

  it("accepts bounded seed scenarios and rejects records outside the DomainModel", () => {
    const seeded = structuredClone(expenseGraph);
    seeded.domain.seedData = [
      {
        entity: "expense",
        id: "seed-expense-1",
        values: { amount: 42, status: "draft" },
      },
    ];
    expect(validateApplicationGraph(seeded)).toEqual([]);

    seeded.domain.seedData = [
      { entity: "missing", values: { amount: 42 } },
      { entity: "expense", values: { impossible: true } },
    ];
    expect(validateApplicationGraph(seeded)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "domain.seed.entity_missing" }),
        expect.objectContaining({ code: "domain.seed.field_missing" }),
      ]),
    );
  });

  it("hashes equivalent object-key order deterministically", () => {
    const reordered = {
      ...expenseGraph,
      metadata: {
        name: "Expense approval",
        workspaceId: "local-workspace",
        id: "expense-approval",
      },
    };

    expect(hashApplicationGraph(expenseGraph)).toBe(
      hashApplicationGraph(reordered),
    );
    expect(hashApplicationGraph(expenseGraph)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("round-trips a published Graph exchange and rejects a mismatched digest", () => {
    const exchange = createPublishedGraphExchange(expenseGraph, 3);

    expect(parsePublishedGraphExchange(exchange)).toEqual(exchange);
    expect(exchange.publishedRevision).toEqual({
      revisionNumber: 3,
      graphHash: hashApplicationGraph(expenseGraph),
    });

    expect(() =>
      parsePublishedGraphExchange({
        ...exchange,
        publishedRevision: {
          ...exchange.publishedRevision,
          graphHash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      }),
    ).toThrow(GraphExchangeError);

    expect(() =>
      parsePublishedGraphExchange({
        ...exchange,
        source: "arbitrary generated source is not an exchange field",
      }),
    ).toThrow(GraphExchangeError);
  });

  it("applies a validated proposal only to a mutable draft", () => {
    const draft = createDraftRevision(expenseGraph, "draft-1");
    const result = applyGraphDiffToDraft(draft, {
      apiVersion: "factory.graph-diff/v1",
      baseGraphHash: hashApplicationGraph(expenseGraph),
      operations: [
        {
          op: "replace",
          path: "/metadata/name",
          value: "Travel expense approval",
        },
        {
          op: "add",
          path: "/domain/entities/0/fields/-",
          value: { key: "receiptUrl", type: "url", required: false },
        },
      ],
    });

    expect(result.revision).toBe(2);
    expect(result.graph.metadata.name).toBe("Travel expense approval");
    expect(result.graph.domain.entities[0].fields).toContainEqual({
      key: "receiptUrl",
      type: "url",
      required: false,
    });
  });

  it("rejects graph diffs that modify identity or immutable revisions", () => {
    const draft = createDraftRevision(expenseGraph, "draft-1");

    expect(() =>
      applyGraphDiffToDraft(draft, {
        apiVersion: "factory.graph-diff/v1",
        operations: [
          { op: "replace", path: "/metadata/workspaceId", value: "other" },
        ],
      }),
    ).toThrow(GraphDiffError);

    expect(() =>
      applyGraphDiffToDraft(
        { ...draft, status: "published" },
        {
          apiVersion: "factory.graph-diff/v1",
          operations: [
            { op: "replace", path: "/metadata/name", value: "Blocked" },
          ],
        },
      ),
    ).toThrow(GraphSemanticError);
  });

  it("rejects graph diffs that modify component selection or composition scope", () => {
    const draft = createDraftRevision(expenseGraph, "draft-1");

    expect(() =>
      applyGraphDiffToDraft(draft, {
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "add",
            path: "/integration/assetLocks/0",
            value: {
              key: "core.audit",
              version: "1.0.0",
              packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
              manifestDigest:
                "sha256:0f2d3b5b4dc3f351b53e9b874842afd6c7b4bcd9aeddfd8421199e95f2f544a6",
              lifecycle: "golden",
            },
          },
        ],
      }),
    ).toThrow(GraphDiffError);

    expect(() =>
      applyGraphDiffToDraft(draft, {
        apiVersion: "factory.graph-diff/v1",
        operations: [
          {
            op: "add",
            path: "/integration/compositionProfile",
            value: "simple-ecommerce",
          },
        ],
      }),
    ).toThrow(GraphDiffError);
  });
});
