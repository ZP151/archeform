export type Surface =
  "home" | "page" | "domain" | "flow" | "policy" | "ai" | "code" | "release";
export type Theme = "light" | "dark";
export type PreviewRunStatus =
  "starting" | "ready" | "stopping" | "stopped" | "failed";

type PreviewRunState = {
  readonly status: PreviewRunStatus;
  readonly previewUrl: string | null;
};

export type PreviewRunPresentation = {
  readonly visible: boolean;
  readonly label: string;
  readonly canStart: boolean;
  readonly canOpen: boolean;
  readonly canStop: boolean;
};

export type OverlayId = "inspector" | "history" | "activity" | "library";

export type WorkbenchState = {
  activeSurface: Surface;
  lifecycle: "draft" | "published";
  revision: string;
  theme: Theme;
  /** The contextual Inspector overlay. */
  inspectorOpen: boolean;
  /** The revision timeline overlay, opened after its records load. */
  historyOpen: boolean;
  /** The Activity overlay (recent activity, compilation health, evidence). */
  activityOpen: boolean;
  /** The Library overlay (portfolio intelligence). */
  libraryOpen: boolean;
  /**
   * Open overlays, most recently opened last. Escape closes the top entry so
   * the overlay a user just opened is the one that dismisses first.
   */
  overlayStack: readonly OverlayId[];
  /** Incremented by the Ctrl+K command trigger; the composer focuses on it. */
  commandFocusToken: number;
  draftProposals: number;
  lastProposal: string | null;
};

export type WorkbenchAction =
  | { type: "open"; surface: Surface }
  | { type: "publish" }
  | { type: "synchronize-draft"; revision: string }
  | { type: "toggle-theme" }
  | { type: "toggle-inspector" }
  | { type: "open-history" }
  | { type: "close-history" }
  | { type: "toggle-activity" }
  | { type: "toggle-library" }
  | { type: "command-focus" }
  | { type: "propose-draft-change"; source: string };

export const initialWorkbenchState: WorkbenchState = {
  activeSurface: "home",
  lifecycle: "draft",
  revision: "r.18",
  theme: "light",
  inspectorOpen: false,
  historyOpen: false,
  activityOpen: false,
  libraryOpen: false,
  overlayStack: [],
  commandFocusToken: 0,
  draftProposals: 0,
  lastProposal: null,
};

function pushOverlay(
  stack: readonly OverlayId[],
  id: OverlayId,
): readonly OverlayId[] {
  return stack.includes(id) ? stack : [...stack, id];
}

function dropOverlay(
  stack: readonly OverlayId[],
  id: OverlayId,
): readonly OverlayId[] {
  return stack.filter((entry) => entry !== id);
}

export function transitionWorkbench(
  state: WorkbenchState,
  action: WorkbenchAction,
): WorkbenchState {
  switch (action.type) {
    case "open":
      return { ...state, activeSurface: action.surface };
    case "publish":
      return { ...state, lifecycle: "published" };
    case "synchronize-draft":
      return { ...state, lifecycle: "draft", revision: action.revision };
    case "toggle-theme":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };
    case "toggle-inspector":
      return {
        ...state,
        inspectorOpen: !state.inspectorOpen,
        overlayStack: state.inspectorOpen
          ? dropOverlay(state.overlayStack, "inspector")
          : pushOverlay(state.overlayStack, "inspector"),
      };
    case "open-history":
      return {
        ...state,
        historyOpen: true,
        overlayStack: pushOverlay(state.overlayStack, "history"),
      };
    case "close-history":
      return {
        ...state,
        historyOpen: false,
        overlayStack: dropOverlay(state.overlayStack, "history"),
      };
    case "toggle-activity":
      return {
        ...state,
        activityOpen: !state.activityOpen,
        overlayStack: state.activityOpen
          ? dropOverlay(state.overlayStack, "activity")
          : pushOverlay(state.overlayStack, "activity"),
      };
    case "toggle-library":
      return {
        ...state,
        libraryOpen: !state.libraryOpen,
        overlayStack: state.libraryOpen
          ? dropOverlay(state.overlayStack, "library")
          : pushOverlay(state.overlayStack, "library"),
      };
    case "command-focus":
      return {
        ...state,
        commandFocusToken: state.commandFocusToken + 1,
      };
    case "propose-draft-change":
      return {
        ...state,
        lifecycle: "draft",
        draftProposals: state.draftProposals + 1,
        lastProposal: action.source,
      };
  }
}

export function previewRunPresentation(
  compilationSucceeded: boolean,
  preview: PreviewRunState | null,
): PreviewRunPresentation {
  if (!preview) {
    return {
      visible: compilationSucceeded,
      label: "Preview not started",
      canStart: compilationSucceeded,
      canOpen: false,
      canStop: false,
    };
  }

  const label: Record<PreviewRunStatus, string> = {
    starting: "Preview starting",
    ready: "Preview ready",
    stopping: "Preview stopping",
    stopped: "Preview stopped",
    failed: "Preview failed",
  };
  const active =
    preview.status === "starting" ||
    preview.status === "ready" ||
    preview.status === "stopping" ||
    preview.status === "failed";

  return {
    visible: compilationSucceeded,
    label: label[preview.status],
    canStart: compilationSucceeded && !active,
    canOpen:
      compilationSucceeded &&
      preview.status === "ready" &&
      preview.previewUrl !== null,
    canStop:
      compilationSucceeded &&
      (preview.status === "ready" || preview.status === "failed"),
  };
}
