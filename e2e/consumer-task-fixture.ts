import { OpenAIRequirementInterpreterAdapter } from "@factory/adapters";

/**
 * This is a selection replay, not an intent-classification test.  It drives
 * the public interpreter through its registered definition parser without a
 * provider, network request, prompt capture, or model response artifact.
 */
export const taskFixtureBrief =
  "Build a local shared team task board. Team members create tasks, start them, complete them, and reopen completed work. Viewers can read the board. Each task has a title, optional description, display-only assignee, due date, and low, medium, or high priority.";

export async function taskInterpretationFixture(
  requirementId = "team-task-tracking-fixture",
) {
  return new OpenAIRequirementInterpreterAdapter({
    readEnvironment: () => "test-key",
    transport: {
      async create() {
        return {
          outputText: JSON.stringify({
            resultKind: "definition-selection",
            definitionSelection: {
              definitionKey: "team-task-tracking",
              requirementId,
              title: "Team Task Tracking",
              outcome:
                "Team members manage a shared local task board while viewers read the same board.",
              disposition: "supported-default",
              materialQuestions: [],
              businessParameters: null,
            },
            generatedInterpretation: null,
          }),
        };
      },
    },
  }).interpret({
    brief: taskFixtureBrief,
    answers: {},
  });
}
