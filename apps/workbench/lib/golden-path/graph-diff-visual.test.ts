import { describe, expect, it } from "vitest";

import { applyGraphDiffToDraft } from "@factory/graph";
import { expenseApprovalRequirementStarter } from "./discuss-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";
import { visualGraphDiff, visualGraphDiffFromPlan } from "./graph-diff-visual";

describe("visual Graph Diff over the constrained operations", () => {
  it("derives entry-level changes only from the plan's operations", () => {
    const base = createExpenseApprovalPlanningBase();
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const diff = visualGraphDiffFromPlan(base, result.alternatives[0]!.plan);
    expect(diff).toEqual([
      {
        scope: "flow",
        kind: "changed",
        key: "expense-review",
        detail: "adds 1 transition (submit: draft -> submitted)",
      },
    ]);
  });

  it("is empty when base and applied graphs are identical", () => {
    const base = createExpenseApprovalPlanningBase();
    expect(visualGraphDiff(base.graph, base.graph)).toEqual([]);
  });

  it("never touches pages, entities, or roles when operations do not", () => {
    const base = createExpenseApprovalPlanningBase();
    const applied = applyGraphDiffToDraft(base, {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        {
          op: "add",
          path: "/flow/flows/0/transitions/-",
          value: { from: "draft", event: "submit", to: "submitted" },
        },
      ],
    });
    expect(applied.graph.page.pages).toEqual(base.graph.page.pages);
    expect(applied.graph.domain.entities).toEqual(base.graph.domain.entities);
    expect(applied.graph.policy.roles).toEqual(base.graph.policy.roles);
  });

  it("fails closed on a stale base Draft checksum", () => {
    const base = createExpenseApprovalPlanningBase();
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const mutated = createExpenseApprovalPlanningBase();
    mutated.graph.experience.theme.tokens = { brand: "#123456" };
    expect(() =>
      visualGraphDiffFromPlan(mutated, result.alternatives[0]!.plan),
    ).toThrow(/checksum/i);
  });
});
