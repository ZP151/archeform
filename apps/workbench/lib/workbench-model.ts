export type Surface =
  | "home"
  | "page"
  | "domain"
  | "flow"
  | "policy"
  | "ai"
  | "code"
  | "golden-path";
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

export type WorkbenchState = {
  activeSurface: Surface;
  lifecycle: "draft" | "published";
  revision: string;
  theme: Theme;
  propertiesOpen: boolean;
  draftProposals: number;
  lastProposal: string | null;
};

export type WorkbenchAction =
  | { type: "open"; surface: Surface }
  | { type: "publish" }
  | { type: "synchronize-draft"; revision: string }
  | { type: "toggle-theme" }
  | { type: "toggle-properties" }
  | { type: "propose-draft-change"; source: string };

export const initialWorkbenchState: WorkbenchState = {
  activeSurface: "home",
  lifecycle: "draft",
  revision: "r.18",
  theme: "light",
  propertiesOpen: true,
  draftProposals: 0,
  lastProposal: null,
};

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
    case "toggle-properties":
      return { ...state, propertiesOpen: !state.propertiesOpen };
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
