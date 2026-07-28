import { describe, expect, it } from "vitest";
import { initialWorkbenchState, transitionWorkbench } from "./workbench-model";

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
});
