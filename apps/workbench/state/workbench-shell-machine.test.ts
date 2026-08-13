import { describe, expect, it } from "vitest";

import * as shellMachine from "./workbench-shell-machine.js";

describe("Workbench shell context", () => {
  it.each([
    ["home", "brief", false, "workspace-home"],
    ["home", "failed", false, "workspace-home"],
    ["home", "brief", true, "builder"],
    ["home", "clarifying", false, "builder"],
    ["home", "planning", false, "builder"],
    ["home", "reviewing", false, "builder"],
    ["page", "brief", false, "builder"],
    ["domain", "failed", false, "builder"],
    ["flow", "applied", false, "builder"],
    ["policy", "brief", false, "builder"],
    ["ai", "brief", false, "builder"],
    ["code", "brief", false, "builder"],
    ["release", "brief", false, "builder"],
  ] as const)(
    "maps %s / %s / busy=%s to %s",
    (surface, stage, busy, expected) => {
      expect(shellMachine.resolveWorkbenchContext(surface, stage, busy)).toBe(
        expected,
      );
    },
  );

  it("treats only active composition steps as Building on Home", () => {
    expect(shellMachine.isBuildingStage("brief", false)).toBe(false);
    expect(shellMachine.isBuildingStage("failed", false)).toBe(false);
    expect(shellMachine.isBuildingStage("brief", true)).toBe(true);
    expect(shellMachine.isBuildingStage("clarifying", false)).toBe(true);
    expect(shellMachine.isBuildingStage("planning", false)).toBe(true);
    expect(shellMachine.isBuildingStage("reviewing", false)).toBe(true);
    expect(shellMachine.isBuildingStage("applied", false)).toBe(true);
  });
});
