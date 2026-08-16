// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { workbenchGraph } from "../../lib/workbench-graph";
import type { WorkbenchHomeJourneyProps } from "../workbench-home";
import { BuildingPreview } from "./building-preview";

const journey: WorkbenchHomeJourneyProps = {
  stage: "planning",
  busy: false,
  error: null,
  failure: null,
  brief: "Build a restaurant product.",
  onBriefChange: vi.fn(),
  onInterpret: vi.fn(),
  examplePrompts: [],
  onApplyExample: vi.fn(),
  requirement: null,
  blueprintTitle: "Restaurant product",
  openQuestions: [],
  answers: {},
  onAnswerChange: vi.fn(),
  onContinue: vi.fn(),
  planAlternatives: null,
  chosenKey: null,
  onChoose: vi.fn(),
  diffChecksum: null,
  onApply: vi.fn(),
};

describe("BuildingPreview", () => {
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
    vi.unstubAllGlobals();
  });

  it("keeps the product conversation beside a responsive Draft preview", () => {
    act(() => {
      root.render(
        <BuildingPreview
          journey={journey}
          commandFocusToken={0}
          page={workbenchGraph.page.pages[0]}
          experience={workbenchGraph.experience}
          revision="r.1"
        />,
      );
    });

    const workspace = container.querySelector(
      'section[aria-label="Builder workspace"]',
    );
    expect(workspace).not.toBeNull();
    expect(
      workspace?.querySelector('section[aria-label="Product conversation"]'),
    ).not.toBeNull();
    expect(
      workspace?.querySelector('section[aria-label="Responsive preview"]'),
    ).not.toBeNull();
    expect(workspace?.textContent).toContain("Shaping the plan");
    expect(workspace?.textContent).toContain("Draft r.1");
    expect(workspace?.textContent).not.toContain("Graph");
  });
});
