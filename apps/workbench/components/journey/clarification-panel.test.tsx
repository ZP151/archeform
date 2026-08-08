// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RequirementSpecV1 } from "@factory/graph";

import { ClarificationPanel } from "./clarification-panel";

const vagueSpec: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "approval-brief",
  outcome: "People submit items and approvers decide them.",
  actors: [
    { key: "submitter", label: "Submitter", description: "Submits items." },
    { key: "approver", label: "Approver", description: "Decides items." },
  ],
  domainConcepts: [],
  workflows: [],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [],
};

const questions = [
  { key: "approval-object", question: "What item requires approval?" },
  {
    key: "approval-levels",
    question: "How many levels of approval are required?",
  },
];

describe("ClarificationPanel", () => {
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

  it("asks every open question with a bounded answer field", () => {
    act(() => {
      root.render(
        <ClarificationPanel
          requirement={vagueSpec}
          blueprintTitle="Approval"
          questions={questions}
          answers={{}}
          onAnswerChange={vi.fn()}
          busy={false}
          error={null}
          onContinue={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain("What item requires approval?");
    expect(
      container.querySelector('textarea[aria-label="Requirement summary"]'),
    ).not.toBeNull();
    for (const question of questions) {
      expect(
        container.querySelector(`input[aria-label="${question.key}"]`),
      ).not.toBeNull();
    }
  });

  it("records answers through the change handler", () => {
    const onAnswerChange = vi.fn();
    act(() => {
      root.render(
        <ClarificationPanel
          requirement={vagueSpec}
          blueprintTitle="Approval"
          questions={questions}
          answers={{}}
          onAnswerChange={onAnswerChange}
          busy={false}
          error={null}
          onContinue={vi.fn()}
        />,
      );
    });
    const input = container.querySelector(
      'input[aria-label="approval-object"]',
    ) as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set;
      setter!.call(input, "expense reports");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onAnswerChange).toHaveBeenCalledWith(
      "approval-object",
      "expense reports",
    );
  });

  it("re-interprets with the answers on continue and disables while busy", () => {
    const onContinue = vi.fn();
    act(() => {
      root.render(
        <ClarificationPanel
          requirement={vagueSpec}
          blueprintTitle="Approval"
          questions={questions}
          answers={{ "approval-object": "expense reports" }}
          onAnswerChange={vi.fn()}
          busy={true}
          error={null}
          onContinue={onContinue}
        />,
      );
    });
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Continue"),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    act(() => button.click());
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("surfaces a bounded error from a failed re-interpretation", () => {
    act(() => {
      root.render(
        <ClarificationPanel
          requirement={vagueSpec}
          blueprintTitle="Approval"
          questions={questions}
          answers={{}}
          onAnswerChange={vi.fn()}
          busy={false}
          error="Requirement interpretation failed."
          onContinue={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain(
      "Requirement interpretation failed.",
    );
  });
});
