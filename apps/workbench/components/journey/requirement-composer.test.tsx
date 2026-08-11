// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RequirementComposer } from "./requirement-composer";

describe("RequirementComposer", () => {
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
    props: Partial<React.ComponentProps<typeof RequirementComposer>> = {},
  ) {
    act(() => {
      root.render(
        <RequirementComposer
          brief=""
          onBriefChange={vi.fn()}
          busy={false}
          error={null}
          onInterpret={vi.fn()}
          examplePrompts={[]}
          onApplyExample={vi.fn()}
          {...props}
        />,
      );
    });
  }

  it("renders the free-form brief as the primary input", () => {
    render();
    const textarea = container.querySelector(
      'textarea[aria-label="Requirement brief"]',
    );
    expect(textarea).not.toBeNull();
    expect(
      container.querySelector('button[name="Interpret requirement"]'),
    ).toBeNull();
    expect(
      [...container.querySelectorAll("button")].some((button) =>
        button.textContent?.includes("Interpret requirement"),
      ),
    ).toBe(true);
  });

  it("records typed brief text through the change handler", () => {
    const onBriefChange = vi.fn();
    render({ brief: "", onBriefChange });
    const textarea = container.querySelector(
      'textarea[aria-label="Requirement brief"]',
    ) as HTMLTextAreaElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set;
      setter!.call(textarea, "Build an expense application.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onBriefChange).toHaveBeenCalledWith("Build an expense application.");
  });

  it("disables the interpret action while busy or while the brief is empty", () => {
    const onInterpret = vi.fn();
    render({ brief: "", busy: true, onInterpret });
    const busyButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Interpret requirement"),
    );
    expect((busyButton as HTMLButtonElement).disabled).toBe(true);
    act(() => busyButton?.click());
    expect(onInterpret).not.toHaveBeenCalled();
  });

  it("submits the current brief on interpret", () => {
    const onInterpret = vi.fn();
    render({ brief: "Build an expense application.", onInterpret });
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Interpret requirement"),
    ) as HTMLButtonElement;
    act(() => button.click());
    expect(onInterpret).toHaveBeenCalledTimes(1);
  });

  it("surfaces a bounded interpretation error", () => {
    render({
      error: "Requirement interpretation is not configured.",
    });
    expect(container.textContent).toContain(
      "Requirement interpretation is not configured.",
    );
    expect(container.textContent).not.toContain("OPENAI_API_KEY");
  });

  it("offers example prompts behind one secondary popover", () => {
    const onApplyExample = vi.fn();
    render({
      examplePrompts: [
        "Build an expense approval application.",
        "Build an appointment booking application.",
      ],
      onApplyExample,
    });
    const toggle = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Example prompts"),
    ) as HTMLButtonElement;
    act(() => toggle.click());
    expect(container.textContent).toContain(
      "Build an expense approval application.",
    );
    const example = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Build an expense approval application."),
    ) as HTMLButtonElement;
    act(() => example.click());
    expect(onApplyExample).toHaveBeenCalledWith(
      "Build an expense approval application.",
    );
  });
});
