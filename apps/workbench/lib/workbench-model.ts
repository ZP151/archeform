export type Surface = "page" | "domain" | "flow" | "policy" | "ai" | "code";
export type Theme = "light" | "dark";

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
  | { type: "toggle-theme" }
  | { type: "toggle-properties" }
  | { type: "propose-draft-change"; source: string };

export const initialWorkbenchState: WorkbenchState = {
  activeSurface: "page",
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
