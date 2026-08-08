// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  expenseApprovalRequirementStarter,
  expenseApprovalRequirementStarterSpec,
  startExpenseApprovalDiscuss,
} from "../../lib/golden-path/discuss-model";
import { DiscussPanel } from "./discuss-panel";
import { renderComponent } from "./render-helper";

function click(container: HTMLElement, label: string): void {
  const element = container.querySelector(
    `[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(element, `Expected element '${label}'`).not.toBeNull();
  act(() => element!.click());
}

describe("DiscussPanel", () => {
  it("shows the deterministic outcome brief and the clarification set", () => {
    const container = renderComponent(
      <DiscussPanel
        session={startExpenseApprovalDiscuss()}
        spec={null}
        onAnswer={vi.fn()}
        onDefer={vi.fn()}
        onBuildSpec={vi.fn()}
        onProceed={vi.fn()}
      />,
    );
    expect(container.textContent).toContain(
      "employees submit expense records with amount and description",
    );
    expect(container.textContent).toContain("approval-threshold");
    expect(container.textContent).toContain("audit-trail");
    expect(container.textContent).toContain("multi-level-approval");
  });

  it("records answers and deferrals through the model surface", () => {
    const onAnswer = vi.fn();
    const onDefer = vi.fn();
    const container = renderComponent(
      <DiscussPanel
        session={startExpenseApprovalDiscuss()}
        spec={null}
        onAnswer={onAnswer}
        onDefer={onDefer}
        onBuildSpec={vi.fn()}
        onProceed={vi.fn()}
      />,
    );
    click(container, "Answer 'approval-threshold' with '1000'");
    expect(onAnswer).toHaveBeenCalledWith("approval-threshold", "1000");
    click(container, "Defer 'multi-level-approval'");
    expect(onDefer).toHaveBeenCalledWith("multi-level-approval");
  });

  it("gates the spec build on resolved required questions", () => {
    const onBuildSpec = vi.fn();
    const container = renderComponent(
      <DiscussPanel
        session={startExpenseApprovalDiscuss()}
        spec={null}
        onAnswer={vi.fn()}
        onDefer={vi.fn()}
        onBuildSpec={onBuildSpec}
        onProceed={vi.fn()}
      />,
    );
    const build = container.querySelector(
      '[aria-label="Build requirement spec"]',
    ) as HTMLButtonElement;
    expect(build.disabled).toBe(true);
  });

  it("builds the spec when required questions are answered", () => {
    const onBuildSpec = vi.fn();
    const container = renderComponent(
      <DiscussPanel
        session={expenseApprovalRequirementStarter()}
        spec={null}
        onAnswer={vi.fn()}
        onDefer={vi.fn()}
        onBuildSpec={onBuildSpec}
        onProceed={vi.fn()}
      />,
    );
    const build = container.querySelector(
      '[aria-label="Build requirement spec"]',
    ) as HTMLButtonElement;
    expect(build.disabled).toBe(false);
    act(() => build.click());
    expect(onBuildSpec).toHaveBeenCalledOnce();
  });

  it("summarises the built spec and proceeds to Plan", () => {
    const onProceed = vi.fn();
    const container = renderComponent(
      <DiscussPanel
        session={expenseApprovalRequirementStarter()}
        spec={expenseApprovalRequirementStarterSpec()}
        onAnswer={vi.fn()}
        onDefer={vi.fn()}
        onBuildSpec={vi.fn()}
        onProceed={onProceed}
      />,
    );
    expect(container.textContent).toContain("Employee");
    expect(container.textContent).toContain("Manager");
    expect(container.textContent).toContain("Finance");
    expect(container.textContent).toContain("employee-submit");
    expect(container.textContent).toContain("manager-approve");
    expect(container.textContent).toContain("unauthorized-approve-denied");
    click(container, "Proceed to Plan");
    expect(onProceed).toHaveBeenCalledOnce();
  });
});
