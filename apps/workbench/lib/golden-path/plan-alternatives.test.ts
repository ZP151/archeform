import { describe, expect, it } from "vitest";

import {
  assertCompositionPlan,
  assertProfileRecipeCatalog,
  assertRequirementSpec,
} from "@factory/graph";
import {
  expenseApprovalRequirementStarter,
  startExpenseApprovalDiscuss,
} from "./discuss-model";
import {
  createExpenseApprovalPlanningBase,
  expenseApprovalRecipeCatalog,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";

describe("expense approval plan alternatives", () => {
  it("creates up to three schema-valid deterministic alternatives", () => {
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alternatives.map((alternative) => alternative.key)).toEqual([
      "standard",
      "strict",
      "light",
    ]);
    for (const alternative of result.alternatives) {
      expect(() => assertCompositionPlan(alternative.plan)).not.toThrow();
      expect(() =>
        assertRequirementSpec(alternative.requirement),
      ).not.toThrow();
    }
  });

  it("is deterministic across calls", () => {
    const first = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    const second = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(first).toEqual(second);
  });

  it("carries capability locks, compatibility, risks, journeys, and limitations", () => {
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const alternative of result.alternatives) {
      expect(alternative.plan.capabilityLocks.map((lock) => lock.key)).toEqual([
        "core.approvals",
        "core.audit",
        "core.crud",
        "core.identity-policy",
        "core.notification",
        "core.policy-declarations",
        "core.workflow",
      ]);
      expect(alternative.plan.compatibility.result).toBe("compatible");
      expect(alternative.plan.acceptanceJourneys.length).toBeGreaterThan(0);
      expect(alternative.plan.risks.length).toBeGreaterThan(0);
      expect(alternative.knownLimitations.length).toBeGreaterThan(0);
      expect(alternative.affectedFlows).toContain("expense-review");
      expect(alternative.affectedEntities).toContain("expense");
      expect(alternative.affectedRoles).toContain("employee");
    }
  });

  it("proposes exactly the missing submit transition on the planning base", () => {
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const alternative of result.alternatives) {
      expect(alternative.plan.proposedOperations).toEqual([
        {
          op: "add",
          path: "/flow/flows/0/transitions/-",
          value: { from: "draft", event: "submit", to: "submitted" },
        },
      ]);
    }
  });

  it("framing variants differ deterministically by requirement framing", () => {
    const result = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [standard, strict, light] = result.alternatives;
    expect(standard.plan.requirementChecksum).not.toBe(
      strict.plan.requirementChecksum,
    );
    expect(strict.requirement.constraints.map((c) => c.key)).toContain(
      "escalation",
    );
    expect(light.requirement.constraints.map((c) => c.key)).not.toContain(
      "audit-trail",
    );
    expect(light.plan.planId).toBe(standard.plan.planId);
    expect(strict.knownLimitations.some((l) => l.includes("escalation"))).toBe(
      true,
    );
  });

  it("fails closed when required questions are unresolved", () => {
    const result = planExpenseApprovalAlternatives(
      startExpenseApprovalDiscuss(),
    );
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "unresolved-required-questions") return;
    expect(result.unresolved).toEqual([
      "approval-threshold",
      "manager-role",
      "audit-trail",
    ]);
  });

  it("plans only against a mutable Draft revision", () => {
    const base = createExpenseApprovalPlanningBase();
    expect(base.status).toBe("draft");
    expect(base.revision).toBe(1);
    const flow = base.graph.flow.flows.find((f) => f.id === "expense-review")!;
    expect(flow.transitions).toEqual([
      {
        from: "submitted",
        event: "approve",
        to: "approved",
        roles: ["manager"],
        effects: [
          { capability: "audit.record", operation: "record" },
          { capability: "notification.send", operation: "send" },
        ],
      },
      {
        from: "submitted",
        event: "reject",
        to: "rejected",
        roles: ["manager"],
        effects: [
          { capability: "audit.record", operation: "record" },
          { capability: "notification.send", operation: "send" },
        ],
      },
    ]);
  });

  it("exposes a schema-valid anchor recipe catalogue", () => {
    const catalog = expenseApprovalRecipeCatalog();
    expect(() => assertProfileRecipeCatalog(catalog)).not.toThrow();
    expect(catalog.recipes[0]!.status).toBe("anchor");
    expect(catalog.recipes[0]!.acceptanceJourneys).toContain("manager-approve");
  });
});
