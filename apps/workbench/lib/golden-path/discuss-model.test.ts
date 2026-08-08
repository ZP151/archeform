import { describe, expect, it } from "vitest";

import { assertRequirementSpec, hashRequirementSpec } from "@factory/graph";
import {
  EXPENSE_APPROVAL_CLARIFICATIONS,
  answerClarification,
  buildRequirementSpec,
  canPlan,
  clarificationQuestions,
  deferClarification,
  expenseApprovalRequirementStarter,
  expenseApprovalRequirementStarterSpec,
  startExpenseApprovalDiscuss,
  type ClarificationKey,
} from "./discuss-model";

describe("expense approval discuss model", () => {
  it("starts clarifying with no answers and blocks Plan", () => {
    const session = startExpenseApprovalDiscuss();
    expect(session.mode).toBe("discuss");
    expect(session.answers).toEqual([]);
    expect(canPlan(session)).toBe(false);
  });

  it("exposes a deterministic clarification question set", () => {
    expect(clarificationQuestions().map((q) => q.key)).toEqual([
      "approval-threshold",
      "manager-role",
      "audit-trail",
      "multi-level-approval",
    ]);
    expect(EXPENSE_APPROVAL_CLARIFICATIONS.map((q) => q.key)).toEqual(
      clarificationQuestions().map((q) => q.key),
    );
    expect(
      EXPENSE_APPROVAL_CLARIFICATIONS.filter((q) => q.required).map(
        (q) => q.key,
      ),
    ).toEqual(["approval-threshold", "manager-role", "audit-trail"]);
  });

  it("answers immutably and never mutates the input session", () => {
    const session = startExpenseApprovalDiscuss();
    const next = answerClarification(session, "approval-threshold", "1000");
    expect(session.answers).toEqual([]);
    expect(next).not.toBe(session);
    expect(next.answers).toEqual([
      { key: "approval-threshold", answer: "1000", deferred: false },
    ]);
  });

  it("fails closed on unknown questions and answers", () => {
    const session = startExpenseApprovalDiscuss();
    expect(() =>
      answerClarification(
        session,
        "unknown-question" as ClarificationKey,
        "1000",
      ),
    ).toThrow(/unknown clarification/i);
    expect(() =>
      answerClarification(session, "approval-threshold", "999999"),
    ).toThrow(/not a valid answer/i);
  });

  it("blocks Plan until every required question is answered", () => {
    let session = answerClarification(
      startExpenseApprovalDiscuss(),
      "approval-threshold",
      "1000",
    );
    expect(canPlan(session)).toBe(false);
    session = answerClarification(session, "manager-role", "manager");
    expect(canPlan(session)).toBe(false);
    session = answerClarification(session, "audit-trail", "audit-required");
    expect(canPlan(session)).toBe(true);
  });

  it("treats a deferred required question as unresolved", () => {
    const deferred = deferClarification(
      answerClarification(
        answerClarification(
          startExpenseApprovalDiscuss(),
          "approval-threshold",
          "1000",
        ),
        "manager-role",
        "manager",
      ),
      "audit-trail",
    );
    expect(canPlan(deferred)).toBe(false);
    const optionalDeferred = deferClarification(
      expenseApprovalRequirementStarter(),
      "multi-level-approval",
    );
    expect(canPlan(optionalDeferred)).toBe(true);
  });

  it("builds a schema-valid RequirementSpec only when Plan is allowed", () => {
    const blocked = buildRequirementSpec(startExpenseApprovalDiscuss());
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toBe("unresolved-required-questions");
    expect(blocked.unresolved).toEqual([
      "approval-threshold",
      "manager-role",
      "audit-trail",
    ]);

    const built = buildRequirementSpec(expenseApprovalRequirementStarter());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const spec = assertRequirementSpec(built.spec);
    expect(spec.apiVersion).toBe("factory.requirement-spec/v1");
    expect(spec.actors.map((a) => a.key)).toEqual([
      "employee",
      "manager",
      "finance",
    ]);
    expect(spec.domainConcepts.map((c) => c.key)).toEqual([
      "expense",
      "expense-principal",
      "expense-session",
    ]);
    expect(spec.workflows.map((w) => w.key)).toEqual(["expense-review"]);
    expect(spec.acceptanceScenarios.map((s) => s.key)).toEqual([
      "employee-submit",
      "manager-approve",
      "manager-reject",
      "unauthorized-approve-denied",
      "finance-audit",
    ]);
  });

  it("records answered questions with answers and deferred questions without", () => {
    const built = buildRequirementSpec(expenseApprovalRequirementStarter());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.spec.openQuestions).toHaveLength(4);
    expect(built.spec.openQuestions.every((q) => q.answer !== undefined)).toBe(
      true,
    );

    const deferred = buildRequirementSpec(
      deferClarification(
        expenseApprovalRequirementStarter(),
        "multi-level-approval",
      ),
    );
    expect(deferred.ok).toBe(true);
    if (!deferred.ok) return;
    const deferredEntry = deferred.spec.openQuestions.find((q) =>
      q.question.includes("escalate"),
    );
    expect(deferredEntry).toBeDefined();
    expect(deferredEntry!.answer).toBeUndefined();
  });

  it("derives bounded constraints from the answers", () => {
    const built = buildRequirementSpec(expenseApprovalRequirementStarter());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.spec.constraints.map((c) => `${c.key}:${c.kind}`)).toEqual([
      "approval-threshold:cost",
      "audit-trail:compliance",
    ]);
    expect(built.spec.constraints[0]!.statement).toContain("1000");
  });

  it("provides a deterministic starter session for the whole journey", () => {
    expect(canPlan(expenseApprovalRequirementStarter())).toBe(true);
    const spec = expenseApprovalRequirementStarterSpec();
    expect(hashRequirementSpec(spec)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(expenseApprovalRequirementStarter()).toEqual(
      expenseApprovalRequirementStarter(),
    );
  });

  it("exposes no Draft or Graph model surface from the Discuss model", () => {
    expect(Object.keys(startExpenseApprovalDiscuss()).sort()).toEqual([
      "answers",
      "mode",
    ]);
    const built = buildRequirementSpec(expenseApprovalRequirementStarter());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(Object.keys(built.spec).sort()).toEqual([
      "acceptanceScenarios",
      "actors",
      "apiVersion",
      "constraints",
      "domainConcepts",
      "openQuestions",
      "outcome",
      "requirementId",
      "workflows",
    ]);
  });
});
