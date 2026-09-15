import { assertRequirementInterpretationResult } from "../../packages/adapters/src/requirements/requirement-interpreter";

/** Acceptance-only facts; provider-authored content must never be returned. */
export function approvalIntakeFacts(input: unknown) {
  try {
    const { interpretation } = assertRequirementInterpretationResult(input);
    const { spec, blueprint, clarifications } = interpretation;
    return {
      schemaValid: true as const,
      productType: spec.productType ?? "unspecified",
      actorCount: blueprint.actors.length,
      entityCount: blueprint.entities.length,
      questionCount: clarifications.reduce(
        (sum, group) => sum + group.questions.length,
        0,
      ),
      workflows: blueprint.workflows.map((workflow) => {
        const actorsWith = (actions: readonly string[]) =>
          blueprint.actors.filter((actor) =>
            actor.permissions.some(
              (permission) =>
                permission.entityKey === workflow.entityKey &&
                actions.every((action) =>
                  permission.actions.some((grant) => grant === action),
                ),
            ),
          ).length;
        const pages = blueprint.pageIntents.filter(
          (page) => page.entityKey === workflow.entityKey,
        );
        return {
          requesterCount: actorsWith(["create", "read", "submit"]),
          reviewerCount: actorsWith(["read", "approve", "reject"]),
          formPages: pages.filter((page) => page.intent === "form").length,
          queuePages: pages.filter((page) => page.intent === "queue").length,
          listPages: pages.filter((page) => page.intent === "list").length,
          hasSubmit: workflow.transitions.some(
            (event) => event.key === "submit",
          ),
          hasApprove: workflow.transitions.some(
            (event) => event.key === "approve",
          ),
          hasReject: workflow.transitions.some(
            (event) => event.key === "reject",
          ),
        };
      }),
    };
  } catch {
    return { schemaValid: false as const };
  }
}
