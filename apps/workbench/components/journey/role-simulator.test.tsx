// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  type ApplicationGraphV1,
} from "@factory/graph";

import { RoleSimulator } from "./role-simulator";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";

async function composedExpenseGraph(): Promise<ApplicationGraphV1> {
  const interpretation = await fixtureInterpreter.interpret({
    brief: expenseBrief,
    answers: {},
  });
  const baseDraft = createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: interpretation.spec.requirementId,
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const { diff } = composeProductDraft({
    plan: standard.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  return applyGraphDiffToDraft(baseDraft, diff).graph;
}

describe("RoleSimulator", () => {
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

  async function renderSimulator() {
    const graph = await composedExpenseGraph();
    await act(async () => {
      root.render(<RoleSimulator graph={graph} />);
    });
    return container;
  }

  it("starts the declared scenario at the seeded record stage", async () => {
    const view = await renderSimulator();
    expect(view.querySelector(".role-simulator")).not.toBeNull();
    expect(view.querySelector("option")?.textContent).toBe("Expense");
    expect(view.textContent).toContain("sample-expense");
    expect(view.textContent).toContain("Stage: draft");
  });

  it("offers only the events declared valid from the current stage", async () => {
    const view = await renderSimulator();
    const events = view.querySelector(".simulation-events")!;
    expect(events.textContent).toContain("submit → submitted");
    expect(events.textContent).toContain("(employee)");
    // approve/reject are declared from 'submitted', not from 'draft'.
    expect(events.textContent).not.toContain("approve");
  });

  it("advances the record and records the journey history on dispatch", async () => {
    const view = await renderSimulator();
    const submit = view.querySelector<HTMLButtonElement>(
      ".simulation-events button",
    )!;
    await act(async () => submit.click());
    expect(view.textContent).toContain("Stage: submitted");
    expect(view.querySelector(".simulation-history")?.textContent).toContain(
      "employee submit draft → submitted",
    );
    // From 'submitted' the declared events appear.
    expect(view.querySelector(".simulation-events")?.textContent).toContain(
      "approve → approved",
    );
    expect(view.querySelector(".simulation-events")?.textContent).toContain(
      "reject → rejected",
    );
  });

  it("shows a denial when a role outside the declaration fires an event", async () => {
    const view = await renderSimulator();
    const roleSelect = view.querySelectorAll<HTMLSelectElement>(
      ".role-simulator-heading select",
    )[1];
    await act(async () => {
      const native = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )!.set!;
      native.call(roleSelect, "manager");
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const submit = view.querySelector<HTMLButtonElement>(
      ".simulation-events button",
    )!;
    await act(async () => submit.click());
    expect(view.querySelector(".simulation-denials")?.textContent).toContain(
      "Role 'manager' cannot perform 'submit'.",
    );
    expect(view.textContent).toContain("Stage: draft");
  });

  it("restarts the journey from the scenario when Reset is pressed", async () => {
    const view = await renderSimulator();
    const submit = view.querySelector<HTMLButtonElement>(
      ".simulation-events button",
    )!;
    await act(async () => submit.click());
    expect(view.textContent).toContain("Stage: submitted");

    const reset = Array.from(
      view.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent === "Reset")!;
    await act(async () => reset.click());
    expect(view.textContent).toContain("Stage: draft");
    expect(view.querySelector(".simulation-history")).toBeNull();
  });
});
