import { describe, expect, it } from "vitest";

import {
  applyGraphDiffToDraft,
  hashApplicationGraph,
  type DraftRevisionV1,
} from "@factory/graph";

import { expenseApprovalRequirementStarter } from "./discuss-model";
import {
  allowedActions,
  resetExpenseApprovalSimulation,
  startExpenseApprovalSimulation,
  switchRole,
  transitionExpenseRecord,
  visibleNavigation,
} from "./simulator";
import { buildExpenseApprovalDraft } from "./build-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";

function builtExpenseApprovalDraft(): DraftRevisionV1 {
  const base = createExpenseApprovalPlanningBase();
  const planned = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!planned.ok) throw new Error("Alternatives must be plan-ready.");
  return buildExpenseApprovalDraft(planned.alternatives[0]!.plan, base);
}

describe("startExpenseApprovalSimulation", () => {
  it("seeds deterministic scenario records over the mutable Draft", () => {
    const draft = builtExpenseApprovalDraft();
    const first = startExpenseApprovalSimulation(draft);
    const second = startExpenseApprovalSimulation(draft);

    expect(first).toEqual(second);
    expect(first.records).toEqual([
      {
        id: "expense-100",
        amount: 40,
        description: "Taxi to client meeting",
        status: "draft",
      },
      {
        id: "expense-101",
        amount: 1200,
        description: "Team dinner with stakeholders",
        status: "submitted",
      },
      {
        id: "expense-102",
        amount: 60,
        description: "Printer ink refill",
        status: "submitted",
      },
    ]);
    expect(first.role).toBe("employee");
    expect(first.auditEvents).toEqual([]);
    expect(first.denials).toEqual([]);
  });

  it("labels the simulation clearly and never presents it as a deployment", () => {
    const state = startExpenseApprovalSimulation(builtExpenseApprovalDraft());
    expect(state.kind).toBe("simulation");
    expect(state.label).toMatch(/Draft/);
    expect(state.label).toMatch(/not a deployment/i);
    expect(state.label).not.toMatch(/production/i);
    expect(state.label).not.toMatch(/ready|live/i);
  });
});

describe("switchRole", () => {
  it("switches among the Draft's policy roles without mutating prior state", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");
    const finance = switchRole(draft, manager, "finance");
    const back = switchRole(draft, finance, "employee");

    expect(manager.role).toBe("manager");
    expect(finance.role).toBe("finance");
    expect(back.role).toBe("employee");
    expect(start.role).toBe("employee");
    expect(manager.records).toEqual(start.records);
  });

  it("rejects roles outside the Draft's policy roles", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    expect(() => switchRole(draft, start, "admin")).toThrow(/admin/);
    expect(() => switchRole(draft, start, "guest")).toThrow(/guest/);
  });
});

describe("allowedActions", () => {
  it("derives the per-role action surface from policy permissions", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);

    expect(allowedActions(draft, start)).toEqual(["create", "read", "submit"]);
    expect(allowedActions(draft, switchRole(draft, start, "manager"))).toEqual([
      "approve",
      "read",
      "reject",
    ]);
    expect(allowedActions(draft, switchRole(draft, start, "finance"))).toEqual([
      "audit",
      "read",
    ]);
  });
});

describe("visibleNavigation", () => {
  it("shows entries whose page entities the role can read", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);

    for (const role of ["employee", "manager", "finance"]) {
      const state = switchRole(draft, start, role);
      expect(visibleNavigation(draft, state)).toEqual([
        expect.objectContaining({ id: "expenses", pageId: "expenses" }),
      ]);
    }
  });
});

describe("transitionExpenseRecord", () => {
  it("submits a draft record from the employee role without an audit event", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);

    const outcome = transitionExpenseRecord(
      draft,
      start,
      "expense-100",
      "submit",
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.record).toMatchObject({
      id: "expense-100",
      status: "submitted",
    });
    expect(
      outcome.state.records.find((r) => r.id === "expense-100")?.status,
    ).toBe("submitted");
    // The plan-built submit transition declares no effects: no audit event.
    expect(outcome.state.auditEvents).toEqual([]);
    expect(outcome.state.denials).toEqual([]);
  });

  it("approves a submitted record and records the declared audit effect", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");

    const outcome = transitionExpenseRecord(
      draft,
      manager,
      "expense-101",
      "approve",
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.record.status).toBe("approved");
    expect(outcome.state.auditEvents).toHaveLength(1);
    const event = outcome.state.auditEvents[0];
    expect(event).toMatchObject({
      at: 0,
      recordId: "expense-101",
      event: "approve",
      from: "submitted",
      to: "approved",
      role: "manager",
    });
    // The event carries the flow-declared effects verbatim.
    const flow = draft.graph.flow.flows.find((f) => f.id === "expense-review");
    const transition = flow?.transitions.find(
      (t) => t.event === "approve" && t.from === "submitted",
    );
    expect(event.effects).toEqual(transition?.effects);
    expect(event.effects.some((e) => e.capability === "audit.record")).toBe(
      true,
    );
  });

  it("rejects a submitted record as the second deterministic audit event", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");

    const approved = transitionExpenseRecord(
      draft,
      manager,
      "expense-101",
      "approve",
    );
    const rejected = transitionExpenseRecord(
      draft,
      approved.ok && approved.state ? approved.state : manager,
      "expense-102",
      "reject",
    );
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.record.status).toBe("rejected");
    expect(rejected.state.auditEvents.map((e) => e.at)).toEqual([0, 1]);
    expect(rejected.state.auditEvents[1]).toMatchObject({
      event: "reject",
      recordId: "expense-102",
      role: "manager",
    });
  });

  it("denies actions outside the role's policy surface and records the denial", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);

    for (const role of ["employee", "finance"]) {
      const state = switchRole(draft, start, role);
      const outcome = transitionExpenseRecord(
        draft,
        state,
        "expense-101",
        "approve",
      );
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toBe("policy-denied");
      expect(outcome.state.records).toEqual(state.records);
      expect(outcome.state.denials.at(-1)).toMatchObject({
        role,
        action: "approve",
        recordId: "expense-101",
        reason: "policy-denied",
      });
    }
  });

  it("gates the roleless submit transition behind policy (manager cannot submit)", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");

    const outcome = transitionExpenseRecord(
      draft,
      manager,
      "expense-100",
      "submit",
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("policy-denied");
    expect(outcome.state.denials.at(-1)).toMatchObject({
      role: "manager",
      action: "submit",
      reason: "policy-denied",
    });
  });

  it("denies transitions from a state the flow does not allow", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);

    // expense-102 is already submitted: submit only leaves draft.
    const outcome = transitionExpenseRecord(
      draft,
      start,
      "expense-102",
      "submit",
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("flow-state");
    expect(outcome.state.records).toEqual(start.records);

    // Approved records cannot be approved again.
    const manager = switchRole(draft, start, "manager");
    const approved = transitionExpenseRecord(
      draft,
      manager,
      "expense-101",
      "approve",
    );
    if (!approved.ok) throw new Error("First approval must succeed.");
    const again = transitionExpenseRecord(
      draft,
      approved.state,
      "expense-101",
      "approve",
    );
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe("flow-state");
  });

  it("rejects when the flow's transition roles exclude the role despite policy", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");

    // Narrow the approve transition to the employee role; the manager still
    // holds the policy action, so the flow gate must deny the transition.
    const flow = draft.graph.flow.flows.find((f) => f.id === "expense-review");
    const index = flow?.transitions.findIndex(
      (t) => t.event === "approve" && t.from === "submitted",
    );
    if (index === undefined || index < 0) {
      throw new Error("Built Draft has no approve transition.");
    }
    const narrowed = applyGraphDiffToDraft(draft, {
      apiVersion: "factory.graph-diff/v1",
      baseGraphHash: hashApplicationGraph(draft.graph),
      operations: [
        {
          op: "replace",
          path: `/flow/flows/0/transitions/${index}/roles`,
          value: ["employee"],
        },
      ],
    });

    const outcome = transitionExpenseRecord(
      narrowed,
      manager,
      "expense-101",
      "approve",
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("transition-role");
    expect(outcome.state.denials.at(-1)).toMatchObject({
      role: "manager",
      action: "approve",
      reason: "transition-role",
    });
  });

  it("fails fast on an unknown record id", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    expect(() =>
      transitionExpenseRecord(draft, start, "expense-404", "submit"),
    ).toThrow(/expense-404/);
  });

  it("never mutates the input state across any outcome", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const snapshot = JSON.stringify(start);

    transitionExpenseRecord(draft, start, "expense-100", "submit");
    transitionExpenseRecord(
      draft,
      switchRole(draft, start, "manager"),
      "expense-101",
      "approve",
    );
    transitionExpenseRecord(draft, start, "expense-101", "approve");
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("resetExpenseApprovalSimulation", () => {
  it("restores the deterministic seed after transitions and denials", () => {
    const draft = builtExpenseApprovalDraft();
    const start = startExpenseApprovalSimulation(draft);
    const manager = switchRole(draft, start, "manager");
    const advanced = transitionExpenseRecord(
      draft,
      manager,
      "expense-101",
      "approve",
    );
    if (!advanced.ok) throw new Error("Approval must succeed.");
    const denied = transitionExpenseRecord(
      draft,
      start,
      "expense-101",
      "approve",
    );
    if (denied.ok) throw new Error("Employee approval must be denied.");

    const reset = resetExpenseApprovalSimulation(draft, denied.state);
    expect(reset).toEqual(start);
    expect(denied.state).not.toEqual(start);
  });
});
