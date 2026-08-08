import { describe, expect, it } from "vitest";
import {
  initialWorkbenchState,
  previewRunPresentation,
  transitionWorkbench,
} from "./workbench-model";

describe("transitionWorkbench", () => {
  it("starts on Home and opens an application editor surface on demand", () => {
    expect(initialWorkbenchState.activeSurface).toBe("home");

    const opened = transitionWorkbench(initialWorkbenchState, {
      type: "open",
      surface: "page",
    });

    expect(opened.activeSurface).toBe("page");
  });

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
    expect(next.activeSurface).toBe("home");
  });

  it("opens and closes each dismissible overlay independently", () => {
    expect(initialWorkbenchState.inspectorOpen).toBe(true);
    expect(initialWorkbenchState.historyOpen).toBe(false);
    expect(initialWorkbenchState.activityOpen).toBe(false);
    expect(initialWorkbenchState.libraryOpen).toBe(false);

    const activity = transitionWorkbench(initialWorkbenchState, {
      type: "toggle-activity",
    });
    expect(activity.activityOpen).toBe(true);
    expect(activity.inspectorOpen).toBe(true);

    const library = transitionWorkbench(activity, { type: "toggle-library" });
    expect(library.libraryOpen).toBe(true);
    expect(library.activityOpen).toBe(true);

    const dismissed = transitionWorkbench(library, {
      type: "toggle-activity",
    });
    expect(dismissed.activityOpen).toBe(false);
    expect(dismissed.libraryOpen).toBe(true);

    const closedInspector = transitionWorkbench(dismissed, {
      type: "toggle-inspector",
    });
    expect(closedInspector.inspectorOpen).toBe(false);
  });

  it("orders the overlay stack most-recently-opened last for Escape", () => {
    expect(initialWorkbenchState.overlayStack).toEqual(["inspector"]);

    const activity = transitionWorkbench(initialWorkbenchState, {
      type: "toggle-activity",
    });
    expect(activity.overlayStack).toEqual(["inspector", "activity"]);

    const library = transitionWorkbench(activity, { type: "toggle-library" });
    expect(library.overlayStack).toEqual(["inspector", "activity", "library"]);

    // Escape closes the top entry first: the overlay opened most recently.
    const topClosed = transitionWorkbench(library, {
      type: "toggle-library",
    });
    expect(topClosed.libraryOpen).toBe(false);
    expect(topClosed.overlayStack).toEqual(["inspector", "activity"]);

    const history = transitionWorkbench(topClosed, { type: "open-history" });
    expect(history.historyOpen).toBe(true);
    expect(history.overlayStack).toEqual(["inspector", "activity", "history"]);

    const historyClosed = transitionWorkbench(history, {
      type: "close-history",
    });
    expect(historyClosed.historyOpen).toBe(false);
    expect(historyClosed.overlayStack).toEqual(["inspector", "activity"]);
  });

  it("advances the command-focus token so the composer can land focus", () => {
    const first = transitionWorkbench(initialWorkbenchState, {
      type: "command-focus",
    });
    const second = transitionWorkbench(first, { type: "command-focus" });

    expect(first.commandFocusToken).toBe(1);
    expect(second.commandFocusToken).toBe(2);
    expect(second.activeSurface).toBe("home");
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
