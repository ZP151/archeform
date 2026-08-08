// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GraphDiffReview } from "./graph-diff-review";

describe("GraphDiffReview", () => {
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

  it("shows the approved Diff checksum before applying", () => {
    act(() => {
      root.render(
        <GraphDiffReview
          diffChecksum="sha256:diff"
          busy={false}
          error={null}
          onApply={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain("sha256:diff");
  });

  it("applies the approved Diff through the primary action", () => {
    const onApply = vi.fn();
    act(() => {
      root.render(
        <GraphDiffReview
          diffChecksum="sha256:diff"
          busy={false}
          error={null}
          onApply={onApply}
        />,
      );
    });
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Apply to Draft"),
    ) as HTMLButtonElement;
    act(() => button.click());
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("disables the apply action while applying", () => {
    const onApply = vi.fn();
    act(() => {
      root.render(
        <GraphDiffReview
          diffChecksum="sha256:diff"
          busy={true}
          error={null}
          onApply={onApply}
        />,
      );
    });
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Apply to Draft"),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    act(() => button.click());
    expect(onApply).not.toHaveBeenCalled();
  });

  it("surfaces a bounded application error", () => {
    act(() => {
      root.render(
        <GraphDiffReview
          diffChecksum="sha256:diff"
          busy={false}
          error="Only an approved product plan can be applied to the Draft."
          onApply={vi.fn()}
        />,
      );
    });
    expect(container.textContent).toContain(
      "Only an approved product plan can be applied to the Draft.",
    );
  });
});
