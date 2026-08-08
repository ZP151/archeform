import { createDraftRevision, type DraftRevisionV1 } from "@factory/graph";

import { createProfileDraft } from "../profile-starters";

/**
 * The planning base Draft: the profile starter without the `submit`
 * transition, which is exactly the Graph change the recipe fixture proposes.
 * The accepted plan reproduces the canonical starter wiring through the
 * governed loop.
 *
 * Browser-safe: this module has no Node dependency and may be imported from
 * client components. The deterministic planner itself (`plan-alternatives`)
 * reads recipe fixtures from disk and runs only server-side, behind the
 * Golden Path plan route.
 */
export function createExpenseApprovalPlanningBase(): DraftRevisionV1 {
  const starter = createProfileDraft("expense-approval");
  const flow = starter.flow.flows.find((f) => f.id === "expense-review");
  if (flow === undefined) {
    throw new Error("Expense starter has no expense-review flow.");
  }
  flow.transitions = flow.transitions.filter(
    (transition) =>
      !(
        transition.from === "draft" &&
        transition.event === "submit" &&
        transition.to === "submitted"
      ),
  );
  return createDraftRevision(starter, "expense-approval-planning-base");
}
