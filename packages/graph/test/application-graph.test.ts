import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  createGraphSymbolIndex,
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

function draftGraphWithBindings(bindings: Record<string, unknown>): unknown {
  return {
    ...expenseGraph,
    integration: {
      ...expenseGraph.integration,
      compositionSelections: [
        {
          lock: {
            key: "core.crud",
            version: "1.0.1",
            packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
            manifestDigest:
              "sha256:ac6197b00e529f519f1b062c9189a368eb9b94be125444a7c2f90cec46200f26",
            lifecycle: "golden",
          },
          bindings,
        },
      ],
    },
  };
}

describe("ApplicationGraphV1", () => {
  it("resolves duplicate field keys only under their declared entity owner", () => {
    const graph = structuredClone(expenseGraph);
    graph.domain.entities.push(
      {
        key: "product",
        label: "Product",
        fields: [
          { key: "code", type: "string", required: true, unique: true },
          { key: "stock", type: "integer", required: true },
        ],
        indexes: [{ fields: ["code"], unique: true }],
      },
      {
        key: "store",
        label: "Store",
        fields: [{ key: "code", type: "string", required: true, unique: true }],
        indexes: [{ fields: ["code"], unique: true }],
      },
    );

    const index = createGraphSymbolIndex(graph);

    expect(index.field("product", "stock")).toMatchObject({
      type: "integer",
      required: true,
    });
    expect(index.field("store", "stock")).toBeUndefined();
    expect(index.field("product", "code")).toMatchObject({ type: "string" });
    expect(index.field("store", "code")).toMatchObject({ type: "string" });
    expect(index.fieldsByEntity.get("product")?.get("stock")).toBe(
      index.field("product", "stock"),
    );
  });

  it("keeps every Graph symbol kind in its own namespace", () => {
    const graph = structuredClone(expenseGraph);
    graph.page.pages.push({
      id: "expenses",
      route: "/expense-overview",
      title: "Expense overview",
      blocks: [],
    });
    graph.integration.providers.push({
      id: "mail-provider",
      type: "email",
      version: "1.0.0",
    });

    const index = createGraphSymbolIndex(graph);

    expect(index.page("expenses")).toMatchObject({
      route: "/expense-overview",
    });
    expect(index.navigation("expenses")).toMatchObject({
      pageId: "expense-list",
    });
    expect(index.entity("expense")).toMatchObject({ label: "Expense" });
    expect(index.role("employee")).toBe("employee");
    expect(index.flow("expense-approval")).toMatchObject({ entity: "expense" });
    expect(index.provider("mail-provider")).toMatchObject({ type: "email" });
    expect(index.experienceToken("accent")).toBe("#0f766e");
    expect(index.page("employee")).toBeUndefined();
    expect(index.navigation("expense")).toBeUndefined();
    expect(index.provider("accent")).toBeUndefined();
  });

  it("rejects duplicate navigation ids before typed indexing can select one", () => {
    const graph = structuredClone(expenseGraph);
    graph.page.navigation.push({
      id: "expenses",
      label: "Duplicate expenses",
      pageId: "expense-list",
    });

    expect(validateApplicationGraph(graph)).toContainEqual(
      expect.objectContaining({ code: "page.navigation.id.duplicate" }),
    );
    expect(() => parseApplicationGraph(graph)).toThrow(GraphSemanticError);
    expect(() => createGraphSymbolIndex(graph)).toThrow(GraphSemanticError);
  });

  it("rejects duplicate flow ids before typed indexing can select one", () => {
    const graph = structuredClone(expenseGraph);
    graph.flow.flows.push({
      id: "expense-approval",
      entity: "expense",
      initialState: "draft",
      states: ["draft"],
      events: [],
      transitions: [],
    });

    expect(validateApplicationGraph(graph)).toContainEqual(
      expect.objectContaining({ code: "flow.id.duplicate" }),
    );
    expect(() => parseApplicationGraph(graph)).toThrow(GraphSemanticError);
    expect(() => createGraphSymbolIndex(graph)).toThrow(GraphSemanticError);
  });

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

  it("rejects the reserved Candidate capability namespace in parsing and semantic validation", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.integration = {
      providers: [{ id: "external-adapter", type: "http", version: "1.0.0" }],
      capabilities: [
        {
          key: "candidate.safe-adapter",
          providerId: "external-adapter",
          operation: "project",
        },
      ],
    };

    expect(() => parseApplicationGraph(invalid)).toThrow(GraphSemanticError);
    expect(validateApplicationGraph(invalid)).toContainEqual({
      code: "integration.capability.candidate_reserved",
      message:
        "Capability 'candidate.safe-adapter' uses the reserved Candidate namespace.",
      path: ["integration", "capabilities", 0, "key"],
    });
  });

  it.each([
    ["API version", { apiVersion: "factory.candidate-capability/v1" }],
    ["identity", { id: "safe-adapter", version: "1.0.0" }],
    [
      "path",
      { candidatePath: "ecosystem/intake/candidates/safe-adapter/1.0.0" },
    ],
    [
      "digest",
      {
        candidateDigest:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    ],
  ])(
    "rejects Candidate %s at the Application Graph boundary",
    (_, candidatePart) => {
      const invalid = structuredClone(expenseGraph) as unknown as Record<
        string,
        unknown
      >;
      invalid.integration = {
        providers: [],
        capabilities: [],
        compositionProfile: "expense-approval",
        assetLocks: [
          {
            key: "candidate.safe-adapter",
            version: "1.0.0",
            packageRoot: "ecosystem/intake/candidates/safe-adapter/1.0.0",
            manifestDigest:
              "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            lifecycle: "candidate",
            ...candidatePart,
          },
        ],
      };

      expect(() => parseApplicationGraph(invalid)).toThrow();
    },
  );

  it("accepts only Draft composition selections with exact Golden identities and closed bindings", () => {
    const validLock = {
      key: "core.crud",
      version: "1.0.1",
      packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
      manifestDigest:
        "sha256:ac6197b00e529f519f1b062c9189a368eb9b94be125444a7c2f90cec46200f26",
      lifecycle: "golden" as const,
    };
    const selected = {
      ...expenseGraph,
      integration: {
        ...expenseGraph.integration,
        compositionSelections: [
          {
            lock: validLock,
            bindings: {
              routeKey: { graphSymbol: "graph.page.expense-list" },
              enabled: true,
              priority: 1,
              entityKey: { graphSymbol: "graph.domain.expense" },
            },
          },
        ],
      },
    };

    expect(parseApplicationGraph(selected)).toEqual(selected);
    expect(() =>
      parseApplicationGraph({
        ...selected,
        integration: {
          ...selected.integration,
          compositionSelections: [
            { lock: validLock, bindings: { sourcePath: "x" } },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      parseApplicationGraph({
        ...selected,
        integration: {
          ...selected.integration,
          compositionSelections: [
            {
              lock: { ...validLock, source: "untrusted" },
              bindings: {},
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      parseApplicationGraph({
        ...selected,
        integration: {
          ...selected.integration,
          compositionSelections: [
            {
              lock: validLock,
              bindings: {
                entityKey: {
                  graphSymbol: "graph.domain.expense",
                  sourcePath: "x",
                },
              },
            },
          ],
        },
      }),
    ).toThrow();
  });

  it.each([
    {
      boundary: "credential-like material",
      value: `sk-proj-${"x".repeat(32)}`,
    },
    {
      boundary: "SQL-looking material",
      value: "SELECT value FROM records",
    },
    { boundary: "normal user-facing copy", value: "Reservation request" },
  ])("rejects direct string $boundary in a Draft binding", ({ value }) => {
    expect(() =>
      parseApplicationGraph(draftGraphWithBindings({ label: value })),
    ).toThrow();
  });

  it("keeps PageModel copy and exact Graph-symbol bindings in their separate valid boundaries", () => {
    const selected = draftGraphWithBindings({
      entityKey: { graphSymbol: "graph.domain.expense" },
      routeKey: { graphSymbol: "graph.page.expense-list" },
      actorRole: { graphSymbol: "graph.policy.employee" },
      flowKey: { graphSymbol: "graph.flow.expense-approval" },
    }) as ApplicationGraphV1;
    selected.page.navigation[0]!.label = "Make a reservation";

    expect(parseApplicationGraph(selected)).toEqual(selected);
  });

  it.each([
    ["domain", "graph.domain.missing"],
    ["page", "graph.page.missing"],
    ["policy", "graph.policy.missing"],
    ["flow", "graph.flow.missing"],
  ])(
    "rejects a Draft binding whose %s Graph symbol does not resolve",
    (_, graphSymbol) => {
      const selected = draftGraphWithBindings({
        reference: { graphSymbol },
      });

      expect(() => parseApplicationGraph(selected)).toThrow(GraphSemanticError);
      expect(validateApplicationGraph(selected)).toContainEqual(
        expect.objectContaining({
          code: "integration.composition_binding.symbol_missing",
          message: `Graph symbol '${graphSymbol}' does not exist in the Application Graph.`,
        }),
      );
    },
  );

  it("rejects prototype-reserved Draft composition binding keys", () => {
    expect(() =>
      parseApplicationGraph(draftGraphWithBindings({ constructor: true })),
    ).toThrow();
  });

  it("rejects simultaneous legacy asset locks and Draft composition selections", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.integration.compositionProfile = "expense-approval";
    invalid.integration.assetLocks = [
      {
        key: "core.crud",
        version: "1.0.1",
        packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
        manifestDigest:
          "sha256:ac6197b00e529f519f1b062c9189a368eb9b94be125444a7c2f90cec46200f26",
        lifecycle: "golden",
      },
    ];
    Object.assign(invalid.integration, { compositionSelections: [] });

    expect(() => parseApplicationGraph(invalid)).toThrow();
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
