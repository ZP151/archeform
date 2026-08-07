import { VerificationContractError } from "@factory/graph";

import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import {
  expenseApprovalApiRegistry,
  type IdempotencyJourneyFixture,
  type RegisteredApiAction,
  type RoleJourneyFixture,
} from "./role-journey.js";

/**
 * Static, per-profile verification plans. A profile is the deterministic
 * bridge between one Published Compilation (the Expense Approval composition)
 * and the six bounded probes: it declares the ordered step plan, the declared
 * fixture journeys (keyed by step ID), and the allowlisted API registry every
 * journey action must resolve in.
 *
 * Profiles live in `src` (not under `test`) because the worker's `rootDir`
 * is `src`: the queued job resolves them at runtime, so they must ship with
 * the compiled worker, while the acceptance graph + lock fixture lives under
 * `test/fixtures/` and is consumed by tests and the Docker acceptance
 * command.
 */

export type VerificationJourney =
  RoleJourneyFixture | IdempotencyJourneyFixture;

export type VerificationProfile = {
  readonly profileKey: string;
  readonly stepPlan: readonly VerificationStepPlanEntry[];
  /** Declared fixture journeys, keyed by the step ID that runs them. */
  readonly journeys: Readonly<Record<string, VerificationJourney>>;
  /** The allowlisted API registry every journey action must resolve in. */
  readonly apiRegistry: readonly RegisteredApiAction[];
};

/**
 * The Expense Approval acceptance profile. The generated application is
 * session-bound (`core.identity-policy` resolves principals from
 * `x-factory-fixture-session`), so every journey carries the compiler's
 * `fixture-session-<role>` convention instead of a role header. The plan is
 * ordered so the seeded record moves draft -> submitted -> approved, with the
 * denied approval last: it must fail against the manager-approved record.
 */
const expenseApprovalStepPlan: readonly VerificationStepPlanEntry[] = [
  { stepId: "migration", kind: "migration" },
  { stepId: "health", kind: "health" },
  { stepId: "employee-creates-expense", kind: "role-journey" },
  { stepId: "employee-submits-expense", kind: "idempotency" },
  { stepId: "manager-approves-expense", kind: "role-journey" },
  { stepId: "employee-denied-approval", kind: "authorization-denial" },
];

const expenseApprovalJourneys: Readonly<Record<string, VerificationJourney>> = {
  "employee-creates-expense": {
    journeyId: "employee-creates-expense",
    action: "expense.create",
    sessionId: "fixture-session-employee",
  },
  "employee-submits-expense": {
    journeyId: "employee-submits-expense",
    action: "expense.submit",
    sessionId: "fixture-session-employee",
    idempotencyKey: "submit-expense-fixture-01",
    expectedVersion: 0,
  },
  "manager-approves-expense": {
    journeyId: "manager-approves-expense",
    action: "expense.approve",
    sessionId: "fixture-session-manager",
  },
  "employee-denied-approval": {
    journeyId: "employee-denied-approval",
    action: "expense.approve",
    sessionId: "fixture-session-employee",
  },
};

const profiles: Readonly<Record<string, VerificationProfile>> = {
  "expense-approval": {
    profileKey: "expense-approval",
    stepPlan: Object.freeze(expenseApprovalStepPlan),
    journeys: Object.freeze(expenseApprovalJourneys),
    apiRegistry: Object.freeze(expenseApprovalApiRegistry),
  },
};

for (const profile of Object.values(profiles)) {
  for (const entry of profile.stepPlan) {
    if (entry.kind === "migration" || entry.kind === "health") continue;
    if (profile.journeys[entry.stepId] === undefined) {
      throw new VerificationContractError(
        `Verification profile ${profile.profileKey} has no journey for step ${entry.stepId}.`,
      );
    }
  }
}

/**
 * Resolves a registered profile, failing closed on any key that is not the
 * acceptance profile. Profile keys are bounded identifiers chosen by the
 * platform, never by job input.
 */
export function resolveVerificationProfile(
  profileKey: string,
): VerificationProfile {
  const profile = profiles[profileKey];
  if (!profile) {
    throw new VerificationContractError(
      `No verification profile is registered: ${profileKey}`,
    );
  }
  return profile;
}
