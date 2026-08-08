import { resolve } from "node:path";

import {
  createDraftRevision,
  type CompositionClarificationV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProfileRecipeCatalogV1,
  type ProfileRecipeV1,
  type RequirementSpecV1,
} from "@factory/graph";
import {
  currentCapabilityAssets,
  planComposition,
} from "@factory/capabilities/node";
import { createProfileDraft } from "../profile-starters";
import {
  answerClarification,
  buildRequirementSpec,
  startExpenseApprovalDiscuss,
  type ClarificationKey,
  type DiscussSession,
} from "./discuss-model";

/**
 * Plan mode over the deterministic planner: up to three bounded,
 * schema-valid CompositionPlanV1 alternatives for the accepted requirement.
 * Alternatives differ deterministically by requirement framing variants,
 * never by random or model choice. Acceptance (S3) reuses the checksum-bound
 * review contract: stale base checksums, altered locks, unsafe operations,
 * and unresolved required questions fail closed.
 *
 * The planning base is the profile starter without the `submit` transition:
 * the deterministic planner proposes only fixture-derived Graph changes, and
 * the expense recipe's workflow fixture is exactly that transition. The
 * accepted plan therefore reproduces the canonical starter wiring through
 * the governed loop instead of manual assembly.
 */

export type PlanAlternativeKey = "standard" | "strict" | "light";

export interface PlanAlternative {
  readonly key: PlanAlternativeKey;
  readonly label: string;
  readonly summary: string;
  readonly requirement: RequirementSpecV1;
  readonly plan: CompositionPlanV1;
  readonly affectedPages: readonly string[];
  readonly affectedEntities: readonly string[];
  readonly affectedRoles: readonly string[];
  readonly affectedFlows: readonly string[];
  readonly knownLimitations: readonly string[];
}

export type PlanAlternativesResult =
  | { readonly ok: true; readonly alternatives: readonly PlanAlternative[] }
  | {
      readonly ok: false;
      readonly reason: "unresolved-required-questions";
      readonly unresolved: readonly ClarificationKey[];
    }
  | {
      readonly ok: false;
      readonly reason: "clarification";
      readonly clarification: CompositionClarificationV1;
    };

/** The deterministic framing variants that produce the alternatives. */
export const EXPENSE_APPROVAL_FRAMINGS: readonly {
  readonly key: PlanAlternativeKey;
  readonly label: string;
  readonly summary: string;
  readonly answers: readonly { key: ClarificationKey; answer: string }[];
  readonly limitations: readonly string[];
}[] = [
  {
    key: "standard",
    label: "Standard approval",
    summary:
      "Manager approval up to 1000 currency units, audit trail required on approval transitions, no escalation.",
    answers: [
      { key: "approval-threshold", answer: "1000" },
      { key: "manager-role", answer: "manager" },
      { key: "audit-trail", answer: "audit-required" },
      { key: "multi-level-approval", answer: "no-escalation" },
    ],
    limitations: [
      "Fixture-derived transitions carry no capability effects: the plan-built Draft's submit transition declares no audit effect (approve and reject keep their declared effects).",
    ],
  },
  {
    key: "strict",
    label: "Strict control",
    summary:
      "Manager approval up to 500 currency units, audit trail required, expenses above the threshold escalate to finance.",
    answers: [
      { key: "approval-threshold", answer: "500" },
      { key: "manager-role", answer: "manager" },
      { key: "audit-trail", answer: "audit-required" },
      { key: "multi-level-approval", answer: "finance-escalation" },
    ],
    limitations: [
      "Finance escalation is recorded in the requirement, but the approved asset portfolio has no second-approval flow: the recipe wires a single manager decision.",
      "Fixture-derived transitions carry no capability effects: the plan-built Draft's submit transition declares no audit effect (approve and reject keep their declared effects).",
    ],
  },
  {
    key: "light",
    label: "Light touch",
    summary:
      "Manager approval up to 5000 currency units, optional audit recording on transitions, no escalation.",
    answers: [
      { key: "approval-threshold", answer: "5000" },
      { key: "manager-role", answer: "manager" },
      { key: "audit-trail", answer: "audit-optional" },
      { key: "multi-level-approval", answer: "no-escalation" },
    ],
    limitations: [
      "Audit recording is declared optional in this framing; the recipe still locks the audit capability for the approval trail.",
      "Fixture-derived transitions carry no capability effects: the plan-built Draft's submit transition declares no audit effect (approve and reject keep their declared effects).",
    ],
  },
];

const EXPENSE_APPROVAL_RECIPE: ProfileRecipeV1 = {
  id: "expense-approval",
  name: "Expense approval",
  domain: "expense-approval",
  description:
    "Expense records with manager approval workflow and finance audit trail.",
  capabilities: [
    { key: "core.approvals", version: "1.0.0" },
    { key: "core.audit", version: "1.0.2" },
    { key: "core.crud", version: "1.0.1" },
    { key: "core.identity-policy", version: "1.0.0" },
    { key: "core.notification", version: "1.1.1" },
    { key: "core.policy-declarations", version: "1.0.0" },
    { key: "core.workflow", version: "1.0.1" },
  ],
  bindings: [
    {
      capabilityKey: "core.workflow",
      inputKey: "flowKey",
      required: true,
      target: "flow.flow",
    },
  ],
  surfaces: ["web", "api", "database"],
  acceptanceJourneys: [
    "employee-submit",
    "manager-approve",
    "manager-reject",
    "unauthorized-approve-denied",
    "finance-audit",
  ],
  status: "anchor",
} as const;

/**
 * The deterministic recipe catalogue for the first Golden Path acceptance
 * profile: one anchor recipe over the approved expense-approval assets.
 */
export function expenseApprovalRecipeCatalog(): ProfileRecipeCatalogV1 {
  return {
    apiVersion: "factory.profile-recipe-catalog/v1",
    schemaVersion: "v1",
    recipes: [EXPENSE_APPROVAL_RECIPE],
  };
}

/**
 * The planning base Draft: the profile starter without the `submit`
 * transition, which is exactly the Graph change the recipe fixture proposes.
 * The accepted plan reproduces the canonical starter wiring through the
 * governed loop.
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

/**
 * Deterministic repository root for fixture reads, matching the control
 * plane's convention. Overridable for non-standard checkouts.
 */
export function factoryRepositoryRoot(): string {
  const override = process.env.FACTORY_REPOSITORY_ROOT;
  return override === undefined
    ? resolve(process.cwd(), "../..")
    : resolve(override);
}

function framingSession(
  framing: (typeof EXPENSE_APPROVAL_FRAMINGS)[number],
): DiscussSession {
  let session = startExpenseApprovalDiscuss();
  for (const { key, answer } of framing.answers) {
    session = answerClarification(session, key, answer);
  }
  return session;
}

function affectedSections(
  plan: CompositionPlanV1,
): Pick<
  PlanAlternative,
  "affectedPages" | "affectedEntities" | "affectedRoles" | "affectedFlows"
> {
  const pages = new Set<string>();
  const entities = new Set<string>();
  const roles = new Set<string>();
  const flows = new Set<string>();
  for (const binding of plan.graphBindings) {
    const symbol = binding.graphSymbol;
    if (symbol.startsWith("graph.page.")) pages.add(symbol.slice(11));
    else if (symbol.startsWith("graph.domain.")) {
      entities.add(symbol.slice(13).split(".")[0]!);
    } else if (symbol.startsWith("graph.policy.")) {
      roles.add(symbol.slice(13).split(".")[0]!);
    } else if (symbol.startsWith("graph.flow.")) {
      flows.add(symbol.slice(11));
    }
  }
  for (const operation of plan.proposedOperations) {
    if (!operation.path.startsWith("/flow/flows/")) continue;
    const flow = plan.graphBindings.find((binding) =>
      binding.graphSymbol.startsWith("graph.flow."),
    );
    if (flow !== undefined) flows.add(flow.graphSymbol.slice(11));
  }
  return {
    affectedPages: [...pages].sort(),
    affectedEntities: [...entities].sort(),
    affectedRoles: [...roles].sort(),
    affectedFlows: [...flows].sort(),
  };
}

/**
 * Generates up to three deterministic plan alternatives for the accepted
 * Discuss session. Unresolved required questions block Plan entirely
 * (fail-closed); a planner clarification for every framing yields a bounded
 * clarification result instead of guessed alternatives.
 */
export function planExpenseApprovalAlternatives(
  session: DiscussSession,
  baseDraft: DraftRevisionV1 = createExpenseApprovalPlanningBase(),
  repositoryRoot: string = factoryRepositoryRoot(),
): PlanAlternativesResult {
  const spec = buildRequirementSpec(session);
  if (!spec.ok) {
    return {
      ok: false,
      reason: "unresolved-required-questions",
      unresolved: spec.unresolved,
    };
  }
  const alternatives: PlanAlternative[] = [];
  const clarifications: CompositionClarificationV1[] = [];
  for (const framing of EXPENSE_APPROVAL_FRAMINGS) {
    const framingResult = buildRequirementSpec(framingSession(framing));
    if (!framingResult.ok) {
      throw new Error(`Framing '${framing.key}' must be plan-ready.`);
    }
    const outcome = planComposition(
      framingResult.spec,
      expenseApprovalRecipeCatalog(),
      baseDraft,
      repositoryRoot,
      currentCapabilityAssets,
    );
    if (outcome.kind === "clarification") {
      clarifications.push(outcome.clarification);
      continue;
    }
    alternatives.push({
      key: framing.key,
      label: framing.label,
      summary: framing.summary,
      requirement: framingResult.spec,
      plan: outcome.plan,
      ...affectedSections(outcome.plan),
      knownLimitations: framing.limitations,
    });
  }
  if (alternatives.length === 0) {
    const first = clarifications[0];
    if (first === undefined) {
      throw new Error("Framings produced neither a plan nor a clarification.");
    }
    return { ok: false, reason: "clarification", clarification: first };
  }
  return { ok: true, alternatives };
}
