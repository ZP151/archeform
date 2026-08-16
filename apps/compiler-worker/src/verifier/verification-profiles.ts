import { createHash } from "node:crypto";

import { VerificationContractError } from "@factory/graph";

import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import {
  expenseApprovalApiRegistry,
  restaurantOrderingApiRegistry,
  simpleCommerceApiRegistry,
  type IdempotencyJourneyFixture,
  type RegisteredApiAction,
  type RoleJourneyFixture,
} from "./role-journey.js";

/**
 * Static, per-profile verification plans. A profile is the deterministic
 * bridge between one Published Compilation (the Expense Approval, Simple
 * Ecommerce, or Restaurant Ordering composition) and the six bounded probes:
 * it declares the ordered step plan, the declared fixture journeys (keyed by
 * step ID), and the allowlisted API registry every journey action must
 * resolve in.
 *
 * Profiles live in `src` (not under `test`) because the worker's `rootDir`
 * is `src`: the queued job resolves them at runtime, so they must ship with
 * the compiled worker, while the acceptance graph + lock fixture lives under
 * `test/fixtures/` and is consumed by tests and the Docker acceptance
 * command.
 */

/**
 * The declared Restaurant verifier fixtures. These constants are the single
 * source of truth shared by the worker profile (journey bodies and headers)
 * and the Docker acceptance command (seed values and the demo-token
 * environment contract): the seeded menu-item price must equal the amount a
 * simulated payment must cover, and the cashier session digest must match the
 * merchant E2E session digest the database seed derives from the same demo
 * token. They are deterministic, authored fixture data — never environment
 * input.
 */
export const restaurantVerifierDemoToken =
  "factory-verifier-restaurant-demo-token-2026-08";
export const restaurantVerifierMenuItemPrice = 24.5;
export const restaurantVerifierCashierSessionTokenDigest = createHash("sha256")
  .update(`${restaurantVerifierDemoToken}:merchant-e2e:cashier`, "utf8")
  .digest("hex");

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
    // The generated create handler fails closed on missing required fields,
    // so the journey must declare the expense's required payload (status is
    // runtime-supplied by the flow's initialState).
    body: JSON.stringify({ amount: "125.50", description: "Team lunch" }),
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

/**
 * The Simple Ecommerce acceptance profile. Like Expense Approval, the
 * generated application is session-bound, so every journey carries the
 * compiler's `fixture-session-<role>` convention. The shopper stocks the
 * seeded record through the commerce line route (the order-operations
 * runtime computes the payment due from the cart lines and refuses an
 * empty cart), then the plan moves it cart -> submitted -> paid -> fulfilled
 * through the declared flow events, with the denied cancel last: it must
 * fail against the fulfilled record. The catalog read is a session-bearing
 * role journey (the generic controller denies 403 without a fixture
 * session).
 */
const simpleCommerceStepPlan: readonly VerificationStepPlanEntry[] = [
  { stepId: "migration", kind: "migration" },
  { stepId: "health", kind: "health" },
  { stepId: "shopper-creates-order", kind: "role-journey" },
  { stepId: "shopper-adds-cart-item", kind: "role-journey" },
  { stepId: "shopper-submits-order", kind: "idempotency" },
  { stepId: "shopper-pays-order", kind: "role-journey" },
  { stepId: "merchant-fulfils-order", kind: "role-journey" },
  { stepId: "shopper-reads-catalog", kind: "role-journey" },
  { stepId: "shopper-denied-cancel", kind: "authorization-denial" },
];

const simpleCommerceJourneys: Readonly<Record<string, VerificationJourney>> = {
  "shopper-creates-order": {
    journeyId: "shopper-creates-order",
    action: "order.create",
    sessionId: "fixture-session-shopper",
    // The generated create handler runtime-supplies status and version, so
    // the journey exercises the runtime defaulting path with an empty body.
  },
  "shopper-adds-cart-item": {
    journeyId: "shopper-adds-cart-item",
    action: "order.line-add",
    sessionId: "fixture-session-shopper",
    // Stock the seeded order through the commerce line route: order
    // operations compute the payment due from the cart lines and refuse an
    // empty cart, so the flow must begin with a line.
    body: JSON.stringify({
      catalogEntity: "product",
      catalogRecordId: "everyday-tote",
      quantity: 1,
    }),
  },
  "shopper-submits-order": {
    journeyId: "shopper-submits-order",
    action: "order.submit",
    sessionId: "fixture-session-shopper",
    idempotencyKey: "submit-order-fixture-01",
    expectedVersion: 0,
  },
  "shopper-pays-order": {
    journeyId: "shopper-pays-order",
    action: "order.pay",
    sessionId: "fixture-session-shopper",
    body: JSON.stringify({
      expectedVersion: 1,
      idempotencyKey: "pay-order-fixture-01",
    }),
  },
  "merchant-fulfils-order": {
    journeyId: "merchant-fulfils-order",
    action: "order.fulfil",
    sessionId: "fixture-session-merchant",
    body: JSON.stringify({
      expectedVersion: 2,
      idempotencyKey: "fulfil-order-fixture-01",
    }),
  },
  "shopper-reads-catalog": {
    journeyId: "shopper-reads-catalog",
    action: "product.read",
    sessionId: "fixture-session-shopper",
  },
  "shopper-denied-cancel": {
    journeyId: "shopper-denied-cancel",
    action: "order.cancel",
    sessionId: "fixture-session-shopper",
  },
};

/**
 * The Restaurant Ordering acceptance profile. The generated application is
 * role-header bound (`x-factory-role`) and header-idempotent: commands read
 * their idempotency key from `x-factory-idempotency-key` and their session
 * from `x-factory-table-session-token`, and replays return the stored outcome
 * rather than 403, so every command is a role journey with declared headers
 * and distinct keys — never the body-keyed idempotency probe. The merchant
 * E2E fixtures the database seed renders (fixed ids, digests derived from the
 * demo token) are the static vehicles for the cashier payment and the table
 * seat; the demo session the verifier resolves carries the declared token.
 * Denials cover every principal pair that must not cross a role boundary.
 */
const restaurantOrderingStepPlan: readonly VerificationStepPlanEntry[] = [
  { stepId: "migration", kind: "migration" },
  { stepId: "health", kind: "health" },
  { stepId: "customer-resolves-demo-session", kind: "role-journey" },
  { stepId: "customer-reads-menu", kind: "role-journey" },
  { stepId: "cashier-pays-merchant-order", kind: "role-journey" },
  { stepId: "merchant-seats-table", kind: "role-journey" },
  { stepId: "kitchen-lists-tickets", kind: "role-journey" },
  { stepId: "manager-reads-summary", kind: "role-journey" },
  { stepId: "manager-reads-low-stock", kind: "role-journey" },
  { stepId: "customer-denied-cancel", kind: "authorization-denial" },
  { stepId: "kitchen-denied-payment", kind: "authorization-denial" },
  { stepId: "customer-denied-reports", kind: "authorization-denial" },
];

const restaurantOrderingJourneys: Readonly<
  Record<string, VerificationJourney>
> = {
  "customer-resolves-demo-session": {
    journeyId: "customer-resolves-demo-session",
    action: "table-session.resolve",
    principal: "customer",
    headers: [
      {
        name: "x-factory-idempotency-key",
        value: "restaurant-resolve-demo-session-1",
      },
    ],
    body: JSON.stringify({
      token: restaurantVerifierDemoToken,
      expectedVersion: 0,
    }),
  },
  "customer-reads-menu": {
    journeyId: "customer-reads-menu",
    action: "menu-item.list",
    principal: "customer",
  },
  "cashier-pays-merchant-order": {
    journeyId: "cashier-pays-merchant-order",
    action: "order.pay",
    principal: "cashier",
    headers: [
      {
        name: "x-factory-table-session-token",
        value: restaurantVerifierCashierSessionTokenDigest,
      },
      {
        name: "x-factory-idempotency-key",
        value: "merchant-e2e-cashier-payment-1",
      },
    ],
    body: JSON.stringify({
      expectedVersion: 0,
      amount: restaurantVerifierMenuItemPrice,
      method: "card",
    }),
  },
  "merchant-seats-table": {
    journeyId: "merchant-seats-table",
    action: "restaurant-table.seat",
    principal: "manager",
    headers: [
      {
        name: "x-factory-idempotency-key",
        value: "merchant-e2e-cashier-seat-1",
      },
    ],
    body: JSON.stringify({ expectedVersion: 0, guestCount: 2 }),
  },
  "kitchen-lists-tickets": {
    journeyId: "kitchen-lists-tickets",
    action: "kitchen-ticket.list",
    principal: "kitchen",
  },
  "manager-reads-summary": {
    journeyId: "manager-reads-summary",
    action: "order.audit-summary",
    principal: "manager",
  },
  "manager-reads-low-stock": {
    journeyId: "manager-reads-low-stock",
    action: "inventory.audit-low-stock",
    principal: "manager",
  },
  "customer-denied-cancel": {
    journeyId: "customer-denied-cancel",
    action: "order.cancel",
    principal: "customer",
    body: JSON.stringify({ expectedVersion: 0, reason: "Verifier denial" }),
  },
  "kitchen-denied-payment": {
    journeyId: "kitchen-denied-payment",
    action: "order.pay",
    principal: "kitchen",
  },
  "customer-denied-reports": {
    journeyId: "customer-denied-reports",
    action: "order.audit-summary",
    principal: "customer",
  },
};

const profiles: Readonly<Record<string, VerificationProfile>> = {
  "expense-approval": {
    profileKey: "expense-approval",
    stepPlan: Object.freeze(expenseApprovalStepPlan),
    journeys: Object.freeze(expenseApprovalJourneys),
    apiRegistry: Object.freeze(expenseApprovalApiRegistry),
  },
  "simple-ecommerce": {
    profileKey: "simple-ecommerce",
    stepPlan: Object.freeze(simpleCommerceStepPlan),
    journeys: Object.freeze(simpleCommerceJourneys),
    apiRegistry: Object.freeze(simpleCommerceApiRegistry),
  },
  "restaurant-ordering": {
    profileKey: "restaurant-ordering",
    stepPlan: Object.freeze(restaurantOrderingStepPlan),
    journeys: Object.freeze(restaurantOrderingJourneys),
    apiRegistry: Object.freeze(restaurantOrderingApiRegistry),
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
 * Resolves a registered profile, failing closed on any key that is not one
 * of the three platform-authored acceptance profiles. Profile keys are
 * bounded identifiers chosen by the platform, never by job input.
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
