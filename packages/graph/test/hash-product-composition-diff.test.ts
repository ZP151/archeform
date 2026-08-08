import { describe, expect, it } from "vitest";

import { hashProductCompositionDiff } from "../src/index.js";

/**
 * Product composition diffs are derived by the deterministic composer from
 * an accepted blueprint and capability plan. Unlike plan-carried
 * proposedOperations, they legitimately carry derived page routes (`/...`),
 * so the material scan of `hashCompositionDiff` cannot apply: the composed
 * Diff is re-validated as a complete Application Graph at apply time, and
 * the route-bearing diff is bound to the decision via its own canonical
 * digest.
 */
describe("hashProductCompositionDiff", () => {
  it("canonically hashes a route-bearing product composition diff", () => {
    const diff = {
      apiVersion: "factory.graph-diff/v1",
      baseGraphHash: "sha256:".padEnd(71, "a"),
      operations: [
        {
          op: "add",
          path: "/page/pages/-",
          value: {
            id: "expense-list",
            route: "/expense-list",
            title: "Expenses",
            blocks: [{ id: "expense-list-list", type: "list", entity: "expense" }],
          },
        },
        {
          op: "add",
          path: "/domain/entities/-",
          value: {
            key: "expense",
            label: "Expense",
            fields: [{ key: "amount", type: "decimal", required: true }],
          },
        },
      ],
    };
    expect(hashProductCompositionDiff(diff)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("changes when any operation value changes", () => {
    const base = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        {
          op: "add",
          path: "/page/pages/-",
          value: { id: "expense-list", route: "/expense-list", title: "Expenses", blocks: [] },
        },
      ],
    };
    const different = {
      ...base,
      operations: [
        {
          op: "add",
          path: "/page/pages/-",
          value: { id: "expense-list", route: "/expense-list", title: "Expenses queue", blocks: [] },
        },
      ],
    };
    expect(hashProductCompositionDiff(different)).not.toBe(
      hashProductCompositionDiff(base),
    );
  });

  it("rejects malformed diffs and key-order-independent hashing", () => {
    expect(() => hashProductCompositionDiff({ apiVersion: "factory.graph-diff/v1", operations: [] })).toThrow();
    const first = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        { op: "add", path: "/domain/entities/-", value: { key: "a", label: "A", fields: [] } },
      ],
    };
    const reordered = {
      operations: [
        { op: "add", path: "/domain/entities/-", value: { fields: [], label: "A", key: "a" } },
      ],
      apiVersion: "factory.graph-diff/v1",
    };
    expect(hashProductCompositionDiff(reordered)).toBe(
      hashProductCompositionDiff(first),
    );
  });
});
