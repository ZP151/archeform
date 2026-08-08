// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { expenseApprovalRequirementStarter } from "../../lib/golden-path/discuss-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "../../lib/golden-path/plan-alternatives";
import { PlanPanel } from "./plan-panel";
import { renderComponent } from "./render-helper";

function alternatives() {
  const result = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!result.ok) throw new Error("Starter alternatives must be plan-ready.");
  return result.alternatives;
}

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

describe("PlanPanel", () => {
  it("compares the deterministic alternatives", () => {
    const container = renderComponent(
      <PlanPanel
        alternatives={alternatives()}
        selectedKey={null}
        visualDiff={null}
        onAccept={vi.fn()}
        onProceed={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Standard approval");
    expect(container.textContent).toContain("Strict control");
    expect(container.textContent).toContain("Light touch");
    expect(container.textContent).toContain("expense-review");
  });

  it("accepts an alternative", () => {
    const onAccept = vi.fn();
    const container = renderComponent(
      <PlanPanel
        alternatives={alternatives()}
        selectedKey={null}
        visualDiff={null}
        onAccept={onAccept}
        onProceed={vi.fn()}
      />,
    );
    click(container, "Accept 'standard'");
    expect(onAccept).toHaveBeenCalledWith("standard");
  });

  it("renders the accepted plan's visual Graph Diff and proceeds", () => {
    const onProceed = vi.fn();
    const plan = alternatives()[0]!.plan;
    const container = renderComponent(
      <PlanPanel
        alternatives={alternatives()}
        selectedKey="standard"
        visualDiff={[
          {
            scope: "flow",
            kind: "changed",
            key: "expense-review",
            detail: "adds 1 transition (submit: draft -> submitted)",
          },
        ]}
        onAccept={vi.fn()}
        onProceed={onProceed}
      />,
    );
    const diff = container.querySelector('[aria-label="Visual Graph Diff"]');
    expect(diff?.textContent).toContain("expense-review");
    expect(diff?.textContent).toContain("submit: draft -> submitted");
    expect(diff?.textContent).toContain(plan.planId);
    click(container, "Proceed to Build");
    expect(onProceed).toHaveBeenCalledOnce();
  });
});
