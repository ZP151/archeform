export type Surface = "page" | "domain" | "flow" | "policy" | "ai" | "code";
export type Theme = "light" | "dark";

export type WorkbenchState = {
  activeSurface: Surface;
  lifecycle: "draft" | "published";
  revision: string;
  theme: Theme;
  propertiesOpen: boolean;
};

export type WorkbenchAction =
  | { type: "open"; surface: Surface }
  | { type: "publish" }
  | { type: "toggle-theme" }
  | { type: "toggle-properties" };

export const initialWorkbenchState: WorkbenchState = {
  activeSurface: "page",
  lifecycle: "draft",
  revision: "r.18",
  theme: "light",
  propertiesOpen: true,
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
  }
}
