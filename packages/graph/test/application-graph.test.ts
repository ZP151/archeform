import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  createDraftRevision,
  GraphDiffError,
  GraphSemanticError,
  hashApplicationGraph,
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
        blocks: [{ id: "expense-table", type: "data-table", entity: "expense" }],
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
          { from: "submitted", event: "approve", to: "approved", roles: ["manager"] },
          { from: "submitted", event: "reject", to: "rejected", roles: ["manager"] },
        ],
      },
    ],
  },
  integration: {
    providers: [],
    capabilities: [{ key: "audit.record", providerId: "factory", operation: "record" }],
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

  it("finds cross-model semantic errors", () => {
    const invalid = structuredClone(expenseGraph);
    invalid.page.navigation[0].pageId = "missing-page";
    invalid.domain.relations.push({ from: "expense", to: "missing", kind: "many-to-one" });
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

    expect(hashApplicationGraph(expenseGraph)).toBe(hashApplicationGraph(reordered));
    expect(hashApplicationGraph(expenseGraph)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("applies a validated proposal only to a mutable draft", () => {
    const draft = createDraftRevision(expenseGraph, "draft-1");
    const result = applyGraphDiffToDraft(draft, {
      apiVersion: "factory.graph-diff/v1",
      baseGraphHash: hashApplicationGraph(expenseGraph),
      operations: [
        { op: "replace", path: "/metadata/name", value: "Travel expense approval" },
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
        operations: [{ op: "replace", path: "/metadata/workspaceId", value: "other" }],
      }),
    ).toThrow(GraphDiffError);

    expect(() =>
      applyGraphDiffToDraft(
        { ...draft, status: "published" },
        {
          apiVersion: "factory.graph-diff/v1",
          operations: [{ op: "replace", path: "/metadata/name", value: "Blocked" }],
        },
      ),
    ).toThrow(GraphSemanticError);
  });
});
