import { describe, expect, it } from "vitest";
import {
  initialWorkbenchState,
  previewRunPresentation,
  transitionWorkbench,
} from "./workbench-model";

describe("transitionWorkbench", () => {
  it("keeps one active workbench surface while preserving the published revision", () => {
    const draft = transitionWorkbench(initialWorkbenchState, {
      type: "open",
      surface: "flow",
    });
    const published = transitionWorkbench(draft, { type: "publish" });

    expect(draft.activeSurface).toBe("flow");
    expect(published.lifecycle).toBe("published");
    expect(published.revision).toBe("r.18");
  });

  it("toggles the retained theme without changing the active decision surface", () => {
    const next = transitionWorkbench(initialWorkbenchState, {
      type: "toggle-theme",
    });

    expect(next.theme).toBe("dark");
    expect(next.activeSurface).toBe("page");
  });

  it("records editor intent as a Draft proposal without mutating lifecycle ownership", () => {
    const proposed = transitionWorkbench(initialWorkbenchState, {
      type: "propose-draft-change",
      source: "Puck Page Studio",
    });

    expect(proposed.lifecycle).toBe("draft");
    expect(proposed.draftProposals).toBe(1);
    expect(proposed.lastProposal).toBe("Puck Page Studio");
  });

  it("reopens authoring as Draft when an editor changes a previously Published revision", () => {
    const published = transitionWorkbench(initialWorkbenchState, {
      type: "publish",
    });
    const edited = transitionWorkbench(published, {
      type: "propose-draft-change",
      source: "Domain Studio",
    });

    expect(edited.lifecycle).toBe("draft");
    expect(edited.lastProposal).toBe("Domain Studio");
  });

  it("adopts a persisted Draft revision without treating it as published", () => {
    const synced = transitionWorkbench(initialWorkbenchState, {
      type: "synchronize-draft",
      revision: "r.4",
    });

    expect(synced.revision).toBe("r.4");
    expect(synced.lifecycle).toBe("draft");
  });
});

describe("previewRunPresentation", () => {
  it.each([
    ["starting", "Preview starting", false, false, false],
    ["ready", "Preview ready", false, true, true],
    ["stopping", "Preview stopping", false, false, false],
    ["stopped", "Preview stopped", true, false, false],
    ["failed", "Preview failed", false, false, true],
  ] as const)(
    "presents %s without exposing controls before the Compilation succeeds",
    (status, label, canStart, canOpen, canStop) => {
      const preview = { status, previewUrl: "http://127.0.0.1:43101" };

      expect(previewRunPresentation(false, preview)).toEqual({
        visible: false,
        label,
        canStart: false,
        canOpen: false,
        canStop: false,
      });
      expect(previewRunPresentation(true, preview)).toEqual({
        visible: true,
        label,
        canStart,
        canOpen,
        canStop,
      });
    },
  );

  it("starts a succeeded Compilation when no preview run has been created", () => {
    expect(previewRunPresentation(true, null)).toEqual({
      visible: true,
      label: "Preview not started",
      canStart: true,
      canOpen: false,
      canStop: false,
    });
  });
});
