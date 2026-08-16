// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RequirementSpecV1 } from "@factory/graph";

import { PlanReview, type PlanReviewAlternative } from "./plan-review";

const expenseSpec: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-approval-requirement",
  outcome:
    "Employees submit expenses and managers decide them; finance audits the decisions.",
  actors: [
    { key: "employee", label: "Employee", description: "Submits expenses." },
    { key: "manager", label: "Manager", description: "Approves or rejects." },
    { key: "finance", label: "Finance", description: "Audits decisions." },
  ],
  domainConcepts: [],
  workflows: [],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [],
};

const alternatives: readonly PlanReviewAlternative[] = [
  {
    key: "standard",
    label: "Standard composition",
    capabilityLocks: [
      { key: "crud", version: "1.0.0" },
      { key: "audit.record", version: "1.0.0" },
    ],
    operations: 14,
    complexity: "medium",
    acceptanceJourneys: 3,
  },
  {
    key: "minimal",
    label: "Minimal composition",
    capabilityLocks: [{ key: "crud", version: "1.0.0" }],
    operations: 9,
    complexity: "low",
    acceptanceJourneys: 2,
  },
];

describe("PlanReview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render(
    props: Partial<React.ComponentProps<typeof PlanReview>> = {},
  ) {
    act(() => {
      root.render(
        <PlanReview
          requirement={expenseSpec}
          blueprintTitle="Expense Approval"
          alternatives={alternatives}
          chosenKey={null}
          busy={false}
          error={null}
          onChoose={vi.fn()}
          {...props}
        />,
      );
    });
  }

  it("compares the requirement summary and every bounded alternative", () => {
    render();
    expect(
      container.querySelector('textarea[aria-label="Requirement summary"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Standard composition");
    expect(container.textContent).toContain("Minimal composition");
    expect(container.textContent).toContain("14 operations");
    expect(container.textContent).toContain("9 operations");
    expect(container.textContent).toContain("medium");
    expect(container.textContent).toContain("3 acceptance journeys");
    expect(container.textContent).toContain("2 acceptance journeys");
  });

  it("chooses an alternative through the handler", () => {
    const onChoose = vi.fn();
    render({ onChoose });
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Choose Minimal composition"),
    ) as HTMLButtonElement;
    act(() => button.click());
    expect(onChoose).toHaveBeenCalledWith("minimal");
  });

  it("marks the chosen alternative and locks further choices while busy", () => {
    const onChoose = vi.fn();
    render({ chosenKey: "standard", busy: true, onChoose });
    const chosen = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Chosen"),
    );
    expect(chosen).not.toBeNull();
    const minimal = [...container.querySelectorAll("button")].find(
      (candidate) =>
        candidate.textContent?.includes("Choose Minimal composition"),
    ) as HTMLButtonElement;
    expect(minimal.disabled).toBe(true);
    act(() => minimal.click());
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("surfaces a bounded error from the plan surface", () => {
    render({ error: "Product requirement already has a decision." });
    expect(container.textContent).toContain(
      "Product requirement already has a decision.",
    );
  });
});
