// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { buildExpenseApprovalDraft } from "../../lib/golden-path/build-model";
import { expenseApprovalRequirementStarter } from "../../lib/golden-path/discuss-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "../../lib/golden-path/plan-alternatives";
import type { PersistedDraft } from "../../lib/golden-path/journey-model";
import { BuildPanel } from "./build-panel";
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

const persisted: PersistedDraft = {
  applicationGraphId: "graph-expense",
  draftRevisionId: "draft-2",
  revisionNumber: 2,
  graph: builtDraft().graph,
};

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

/** Set a controlled input through the native setter so React sees the change. */
function fillInput(element: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set;
  act(() => {
    setter!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("BuildPanel", () => {
  it("applies the accepted plan to the Draft", () => {
    const onApplyPlan = vi.fn();
    const base = createExpenseApprovalPlanningBase();
    const container = renderComponent(
      <BuildPanel
        acceptedPlanLabel="Standard approval"
        planId="plan-expense-standard"
        draftHistory={[base]}
        adjustmentLog={[]}
        persistedDraft={null}
        busy={false}
        error={null}
        onApplyPlan={onApplyPlan}
        onAdjustToken={vi.fn()}
        onAdjustLayout={vi.fn()}
        onApplyToDraft={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Standard approval");
    click(container, "Apply plan to Draft");
    expect(onApplyPlan).toHaveBeenCalledOnce();
  });

  it("restores an earlier revision as the next immutable revision", () => {
    const onRestore = vi.fn();
    const base = createExpenseApprovalPlanningBase();
    const built = builtDraft();
    const container = renderComponent(
      <BuildPanel
        acceptedPlanLabel="Standard approval"
        planId="plan-expense-standard"
        draftHistory={[base, built]}
        adjustmentLog={[]}
        persistedDraft={null}
        busy={false}
        error={null}
        onApplyPlan={vi.fn()}
        onAdjustToken={vi.fn()}
        onAdjustLayout={vi.fn()}
        onApplyToDraft={vi.fn()}
        onRestore={onRestore}
      />,
    );
    click(container, `Restore ${base.id} · r.${base.revision}`);
    expect(onRestore).toHaveBeenCalledWith(base.id, base.revision);
  });

  it("validates token values before adjusting the Experience", () => {
    const onAdjustToken = vi.fn();
    const base = createExpenseApprovalPlanningBase();
    const container = renderComponent(
      <BuildPanel
        acceptedPlanLabel="Standard approval"
        planId="plan-expense-standard"
        draftHistory={[base, builtDraft()]}
        adjustmentLog={[]}
        persistedDraft={null}
        busy={false}
        error={null}
        onApplyPlan={vi.fn()}
        onAdjustToken={onAdjustToken}
        onAdjustLayout={vi.fn()}
        onApplyToDraft={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    const value = container.querySelector(
      '[aria-label="Colour token value"]',
    ) as HTMLInputElement;
    fillInput(value, "#zz-not-a-colour");
    click(container, "Apply token adjustment");
    expect(onAdjustToken).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/valid colour/i);
    fillInput(value, "#146b8e");
    click(container, "Apply token adjustment");
    expect(onAdjustToken).toHaveBeenCalledWith("brand", "#146b8e");
  });

  it("applies an approved page layout selection", () => {
    const onAdjustLayout = vi.fn();
    const draft = builtDraft();
    const base = createExpenseApprovalPlanningBase();
    const container = renderComponent(
      <BuildPanel
        acceptedPlanLabel="Standard approval"
        planId="plan-expense-standard"
        draftHistory={[base, draft]}
        adjustmentLog={[]}
        persistedDraft={null}
        busy={false}
        error={null}
        onApplyPlan={vi.fn()}
        onAdjustToken={vi.fn()}
        onAdjustLayout={onAdjustLayout}
        onApplyToDraft={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    const variant = container.querySelector(
      '[aria-label="Page layout variant"]',
    ) as HTMLSelectElement;
    act(() => {
      variant.value = "dashboard";
      variant.dispatchEvent(new Event("change", { bubbles: true }));
    });
    click(container, "Apply layout adjustment");
    expect(onAdjustLayout).toHaveBeenCalledWith(
      draft.graph.page.pages[0]!.id,
      "dashboard",
    );
  });

  it("persists the built Draft and shows the applied revision", () => {
    const onApplyToDraft = vi.fn();
    const base = createExpenseApprovalPlanningBase();
    const container = renderComponent(
      <BuildPanel
        acceptedPlanLabel="Standard approval"
        planId="plan-expense-standard"
        draftHistory={[base, builtDraft()]}
        adjustmentLog={["colour token brand adjusted"]}
        persistedDraft={persisted}
        busy={false}
        error={null}
        onApplyPlan={vi.fn()}
        onAdjustToken={vi.fn()}
        onAdjustLayout={vi.fn()}
        onApplyToDraft={onApplyToDraft}
        onRestore={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("draft-2");
    expect(container.textContent).toContain("colour token brand adjusted");
    const apply = container.querySelector(
      '[aria-label="Apply to Draft"]',
    ) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
  });
});
