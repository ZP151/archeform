// @vitest-environment happy-dom

import React, { act } from "react";
import { describe, expect, it } from "vitest";

import { createProfileDraft } from "../../lib/profile-starters";
import { LineageCanvas } from "./lineage-canvas";
import { renderComponent } from "./render-helper";

describe("LineageCanvas", () => {
  it("renders the deterministic lineage nodes as presentation only", () => {
    const container = renderComponent(
      <LineageCanvas graph={createProfileDraft("expense-approval")} />,
    );
    const canvas = container.querySelector(
      '[aria-label="Golden Path lineage canvas"]',
    );
    expect(canvas).not.toBeNull();
    expect(
      canvas?.querySelectorAll(".react-flow__node").length,
    ).toBeGreaterThan(0);
    expect(canvas?.textContent).toContain("expense");
  });

  it("shows the selected node's detail without mutating anything", () => {
    const container = renderComponent(
      <LineageCanvas
        graph={createProfileDraft("expense-approval")}
        release={{
          phase: "preview",
          publishedRevisionId: "published-1",
          compilationId: "compilation-1",
          verificationRunId: "verification-run-1",
          previewRunId: "preview-1",
        }}
      />,
    );
    const canvas = container.querySelector(
      '[aria-label="Golden Path lineage canvas"]',
    );
    const node = canvas?.querySelector(
      ".react-flow__node",
    ) as HTMLElement | null;
    expect(node).not.toBeNull();
    const id = node!.getAttribute("data-id");
    expect(id).toMatch(/\S/);
    const interactive = node!.querySelector("button") as HTMLElement | null;
    expect(
      interactive,
      "The lineage node must expose an interactive element",
    ).not.toBeNull();
    act(() => interactive!.click());
    const strip = container.querySelector('[aria-label="Lineage selection"]');
    expect(strip?.textContent).toContain(id!);
  });
});
