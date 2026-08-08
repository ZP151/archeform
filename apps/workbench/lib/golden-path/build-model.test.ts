import { describe, expect, it } from "vitest";

import {
  assertValidApplicationGraph,
  hashApplicationGraph,
  resolveExperienceDesignSystem,
  resolvePageLayout,
  type CompositionDecisionV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
} from "@factory/graph";
import { expenseApprovalRequirementStarter } from "./discuss-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";
import { visualGraphDiff } from "./graph-diff-visual";
import {
  adjustExperienceToken,
  adjustPageLayout,
  applyBuildDecision,
  buildExpenseApprovalDraft,
  createExpenseApprovalDecision,
  restoreDraftRevision,
} from "./build-model";

function acceptedPlan(): { plan: CompositionPlanV1; base: DraftRevisionV1 } {
  const base = createExpenseApprovalPlanningBase();
  const result = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!result.ok) throw new Error("Alternatives must be plan-ready.");
  return { plan: result.alternatives[0]!.plan, base };
}

describe("Build mode: accepted plan to mutable Draft", () => {
  it("applies the accepted plan through the immutable lifecycle", () => {
    const { plan, base } = acceptedPlan();
    const built = buildExpenseApprovalDraft(plan, base);
    expect(built.status).toBe("draft");
    expect(built.revision).toBe(base.revision + 1);
    expect(built.id).toBe(base.id);
    expect(() => assertValidApplicationGraph(built.graph)).not.toThrow();
    const flow = built.graph.flow.flows.find((f) => f.id === "expense-review")!;
    expect(flow.transitions.some((t) => t.event === "submit")).toBe(true);
    expect(hashApplicationGraph(built.graph)).not.toBe(
      hashApplicationGraph(base.graph),
    );
  });

  it("is deterministic across calls", () => {
    const { plan, base } = acceptedPlan();
    const first = buildExpenseApprovalDraft(plan, base);
    const second = buildExpenseApprovalDraft(plan, base);
    expect(hashApplicationGraph(first.graph)).toBe(
      hashApplicationGraph(second.graph),
    );
    expect(first.revision).toBe(second.revision);
  });

  it("records an approved, checksum-bound decision for the exact plan and Diff", () => {
    const { plan, base } = acceptedPlan();
    const decision = createExpenseApprovalDecision(plan, base);
    expect(decision.decision).toBe("approved");
    expect(decision.planChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(decision.diffChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(decision.draftId).toBe(base.id);
  });

  it("fails closed on a rejected decision", () => {
    const { plan, base } = acceptedPlan();
    const decision = {
      ...createExpenseApprovalDecision(plan, base),
      decision: "rejected",
    } as const;
    expect(() => applyBuildDecision(plan, base, decision)).toThrow(/approved/);
  });

  it("fails closed on a tampered decision checksum", () => {
    const { plan, base } = acceptedPlan();
    const decision: CompositionDecisionV1 = {
      ...createExpenseApprovalDecision(plan, base),
      diffChecksum: "sha256:" + "0".repeat(64),
    };
    expect(() => applyBuildDecision(plan, base, decision)).toThrow(/checksum/);
  });

  it("fails closed on a stale base Draft", () => {
    const { plan } = acceptedPlan();
    const stale = createExpenseApprovalPlanningBase();
    stale.graph.experience.theme.tokens = { brand: "#123456" };
    expect(() => buildExpenseApprovalDraft(plan, stale)).toThrow(/checksum/);
  });

  it("never builds without an accepted plan (no operations, no Draft)", () => {
    const { base } = acceptedPlan();
    expect(() =>
      applyBuildDecision(null as never, base, null as never),
    ).toThrow();
  });
});

describe("Build mode: Experience adjustments through the Diff lifecycle", () => {
  function buildDraft(): DraftRevisionV1 {
    const { plan, base } = acceptedPlan();
    return buildExpenseApprovalDraft(plan, base);
  }

  it("adjusts one declared Experience token deterministically", () => {
    const draft = buildDraft();
    const adjusted = adjustExperienceToken(
      draft,
      "colour",
      "brand",
      "#0a5c4d",
      "light",
    );
    expect(adjusted.revision).toBe(draft.revision + 1);
    expect(adjusted.status).toBe("draft");
    const resolved = resolveExperienceDesignSystem(adjusted.graph.experience);
    expect(resolved.tokens.colour.light.brand).toBe("#0a5c4d");
    expect(resolved.tokens.colour.dark.brand).toBe(
      resolveExperienceDesignSystem(draft.graph.experience).tokens.colour.dark
        .brand,
    );
    expect(() => assertValidApplicationGraph(adjusted.graph)).not.toThrow();
  });

  it("rejects unsafe token values and invalid adjustments", () => {
    const draft = buildDraft();
    expect(() =>
      adjustExperienceToken(draft, "colour", "brand", "#f00;", "light"),
    ).toThrow();
    expect(() =>
      adjustExperienceToken(draft, "typography", "x", "1rem; position: fixed;"),
    ).toThrow();
    expect(() =>
      adjustExperienceToken(draft, "colour", "brand", "#0a5c4d"),
    ).toThrow(/theme/i);
    expect(() =>
      adjustExperienceToken(draft, "typography", "x", "1rem", "light"),
    ).toThrow(/applies only to colour/);
  });

  it("adjusts one approved page layout variant per page", () => {
    const draft = buildDraft();
    const adjusted = adjustPageLayout(draft, "expenses", "form");
    const resolved = resolveExperienceDesignSystem(adjusted.graph.experience);
    expect(resolved.selection.pageLayouts.expenses).toBe("form");
    expect(
      resolvePageLayout(resolved, {
        id: "new-expense",
        blocks: [{ type: "create-form" }],
      }),
    ).toBe("form");
    expect(() => adjustPageLayout(draft, "ghost-page", "table")).toThrow(
      /ghost-page/,
    );
  });

  it("repeats an adjustment idempotently over the immutable lifecycle", () => {
    const draft = buildDraft();
    const once = adjustExperienceToken(
      draft,
      "colour",
      "brand",
      "#0a5c4d",
      "light",
    );
    const twice = adjustExperienceToken(
      once,
      "colour",
      "brand",
      "#0a5c4d",
      "light",
    );
    expect(twice.revision).toBe(once.revision + 1);
    expect(
      resolveExperienceDesignSystem(twice.graph.experience).tokens.colour.light
        .brand,
    ).toBe("#0a5c4d");
  });
});

describe("Build mode: Draft revision comparison and restore", () => {
  it("compares revisions entry-level, including Experience adjustments", () => {
    const draft = buildExpenseApprovalDraft(
      acceptedPlan().plan,
      createExpenseApprovalPlanningBase(),
    );
    const adjusted = adjustPageLayout(draft, "expenses", "table");
    const diff = visualGraphDiff(draft.graph, adjusted.graph);
    expect(diff).toEqual([
      {
        scope: "experience",
        kind: "changed",
        key: "design-system",
        detail: "updates 1 page layout selection",
      },
    ]);
  });

  it("restores an earlier revision as the next immutable revision", () => {
    const draft = buildExpenseApprovalDraft(
      acceptedPlan().plan,
      createExpenseApprovalPlanningBase(),
    );
    const adjusted = adjustExperienceToken(
      draft,
      "colour",
      "brand",
      "#0a5c4d",
      "light",
    );
    const history = [draft, adjusted];
    const restored = restoreDraftRevision(history, draft);
    expect(restored.revision).toBe(adjusted.revision + 1);
    expect(restored.status).toBe("draft");
    expect(hashApplicationGraph(restored.graph)).toBe(
      hashApplicationGraph(draft.graph),
    );
    expect(() => assertValidApplicationGraph(restored.graph)).not.toThrow();
  });

  it("refuses to restore a revision outside the history", () => {
    const draft = buildExpenseApprovalDraft(
      acceptedPlan().plan,
      createExpenseApprovalPlanningBase(),
    );
    const outsider = createExpenseApprovalPlanningBase();
    expect(() => restoreDraftRevision([draft], outsider)).toThrow(/history/);
  });
});
