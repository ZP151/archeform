import { registeredDefinition } from "./definition-selection-catalogue.js";

/** Private compatibility names; all definition content comes from the fixed JSON catalogue. */
export const teamTaskDefinition = registeredDefinition("team-task-tracking");
export const canonicalTeamTaskInterpretation = teamTaskDefinition.canonical;
