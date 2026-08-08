// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { buildExpenseApprovalDraft } from "../../lib/golden-path/build-model";
import { expenseApprovalRequirementStarter } from "../../lib/golden-path/discuss-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "../../lib/golden-path/plan-alternatives";
import {
  startExpenseApprovalSimulation,
  switchRole,
  transitionExpenseRecord,
} from "../../lib/golden-path/simulator";
import { SimulatePanel } from "./simulate-panel";
import { renderComponent } from "./render-helper";

function builtDraft() {
  const result = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!result.ok) throw new Error("Starter alternatives must be plan-ready.");
  return buildExpenseApprovalDraft(
    result.alternatives[0]!.plan,
    createExpenseApprovalPlanningBase(),
  );
}

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

describe("SimulatePanel", () => {
  it("starts the deterministic role simulation over the Draft", () => {
    const onStart = vi.fn();
    const container = renderComponent(
      <SimulatePanel
        draft={builtDraft()}
        simulation={null}
        onStart={onStart}
        onReset={vi.fn()}
        onSwitchRole={vi.fn()}
        onTransition={vi.fn()}
      />,
    );
    click(container, "Start simulation");
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("derives the per-role action surface from policy", () => {
    const draft = builtDraft();
    const onTransition = vi.fn();
    const employee = startExpenseApprovalSimulation(draft);
    const container = renderComponent(
      <SimulatePanel
        draft={draft}
        simulation={employee}
        onStart={vi.fn()}
        onReset={vi.fn()}
        onSwitchRole={vi.fn()}
        onTransition={onTransition}
      />,
    );
    expect(container.textContent).toContain("employee");
    expect(container.textContent).toContain("expense-100");
    expect(container.textContent).toContain("Taxi to client meeting");
    click(container, "Apply submit to expense-100");
    expect(onTransition).toHaveBeenCalledWith("expense-100", "submit");
    expect(
      container.querySelector('[aria-label="Apply approve to expense-100"]'),
    ).toBeNull();
  });

  it("switches roles and shows manager approve/reject actions", () => {
    const draft = builtDraft();
    const onSwitchRole = vi.fn();
    const manager = switchRole(
      draft,
      startExpenseApprovalSimulation(draft),
      "manager",
    );
    const container = renderComponent(
      <SimulatePanel
        draft={draft}
        simulation={manager}
        onStart={vi.fn()}
        onReset={vi.fn()}
        onSwitchRole={onSwitchRole}
        onTransition={vi.fn()}
      />,
    );
    click(container, "Switch role to finance");
    expect(onSwitchRole).toHaveBeenCalledWith("finance");
    expect(
      container.querySelector('[aria-label="Apply approve to expense-101"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Apply reject to expense-102"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Apply submit to expense-100"]'),
    ).toBeNull();
  });

  it("shows the audit trail and recorded denials", () => {
    const draft = builtDraft();
    let simulation = switchRole(
      draft,
      startExpenseApprovalSimulation(draft),
      "manager",
    );
    const approved = transitionExpenseRecord(
      draft,
      simulation,
      "expense-101",
      "approve",
    );
    if (!approved.ok) throw new Error("Manager approval must succeed.");
    simulation = approved.state;
    const denied = transitionExpenseRecord(
      draft,
      simulation,
      "expense-100",
      "submit",
    );
    if (denied.ok) throw new Error("Manager submit must be policy-denied.");
    simulation = denied.state;
    const container = renderComponent(
      <SimulatePanel
        draft={draft}
        simulation={simulation}
        onStart={vi.fn()}
        onReset={vi.fn()}
        onSwitchRole={vi.fn()}
        onTransition={vi.fn()}
      />,
    );
    const trail = container.querySelector('[aria-label="Audit trail"]');
    expect(trail?.textContent).toContain("approve");
    expect(trail?.textContent).toContain("expense-101");
    const denials = container.querySelector('[aria-label="Denial trail"]');
    expect(denials?.textContent).toContain("policy-denied");
    expect(denials?.textContent).toContain("submit");
  });

  it("resets to the deterministic seed", () => {
    const draft = builtDraft();
    const onReset = vi.fn();
    const container = renderComponent(
      <SimulatePanel
        draft={draft}
        simulation={startExpenseApprovalSimulation(draft)}
        onStart={vi.fn()}
        onReset={onReset}
        onSwitchRole={vi.fn()}
        onTransition={vi.fn()}
      />,
    );
    click(container, "Reset simulation");
    expect(onReset).toHaveBeenCalledOnce();
  });
});
