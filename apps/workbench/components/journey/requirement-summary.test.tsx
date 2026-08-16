// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RequirementSpecV1 } from "@factory/graph";

import { RequirementSummary } from "./requirement-summary";

const expenseSpec: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-approval-requirement",
  outcome:
    "Employees submit expenses and managers decide them; finance audits the decisions.",
  actors: [
    {
      key: "employee",
      label: "Employee",
      description: "Submits expenses.",
    },
    {
      key: "manager",
      label: "Manager",
      description: "Approves or rejects.",
    },
    {
      key: "finance",
      label: "Finance",
      description: "Audits decisions.",
    },
  ],
  domainConcepts: [
    { key: "expense", label: "Expense", description: "A claim." },
  ],
  workflows: [
    {
      key: "expense-approval",
      label: "Expense approval",
      description: "Flow.",
    },
  ],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [
    {
      key: "manager-approves",
      given: "a submitted expense",
      when: "the manager approves it",
      then: "the expense is approved",
    },
  ],
};

describe("RequirementSummary", () => {
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

  it("renders the parsed requirement summary under the labeled control", () => {
    act(() => {
      root.render(
        <RequirementSummary
          requirement={expenseSpec}
          blueprintTitle="Expense Approval"
        />,
      );
    });
    const summary = container.querySelector(
      'textarea[aria-label="Requirement summary"]',
    ) as HTMLTextAreaElement;
    expect(summary).not.toBeNull();
    expect(summary.readOnly).toBe(true);
    expect(summary.value).toContain("expense");
    expect(summary.value).toContain("manager");
    expect(summary.value).toContain("finance");
    expect(container.textContent).toContain("Expense Approval");
  });
});
