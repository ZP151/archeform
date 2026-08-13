import type { WorkbenchContextKey } from "@factory/workbench-ui";

import type { Surface } from "../lib/workbench-model";
import type { ProductJourneyStage } from "../lib/product-journey/journey-model";

export type WorkbenchJourneyStage = ProductJourneyStage;

export function isBuildingStage(
  stage: WorkbenchJourneyStage,
  busy: boolean,
): boolean {
  if (busy) return true;
  switch (stage) {
    case "brief":
    case "failed":
      return false;
    case "clarifying":
    case "planning":
    case "reviewing":
    case "applied":
      return true;
  }
}

export function resolveWorkbenchContext(
  surface: Surface,
  stage: WorkbenchJourneyStage,
  busy: boolean,
): WorkbenchContextKey {
  return surface === "home" && !isBuildingStage(stage, busy)
    ? "workspace-home"
    : "builder";
}
