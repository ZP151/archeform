import { VerificationContractError } from "@factory/graph";

import type { HttpMethod } from "./verification-environment.js";
import { isSafeRequestPath } from "./verification-environment.js";

/**
 * Declared fixture data for role journeys. Journeys are static, per-profile
 * fixtures: a principal role, a registry action, and an optional declared
 * body. They never accept arbitrary URLs, routes, or code — every route is
 * resolved from the profile's allowlisted API registry before any request.
 */

export type RegisteredApiAction = {
  /** The declared action name, e.g. `expense.create`. */
  readonly action: string;
  readonly method: HttpMethod;
  /** A concrete allowlisted route in the generated API, e.g. `/api/expense`. */
  readonly route: string;
  readonly expectedStatus: number;
};

export type RoleJourneyFixture = {
  /** Bounds into the verification step ID; `[a-z0-9-]{1,64}`. */
  readonly journeyId: string;
  /** Must resolve in the profile registry; unknown actions fail closed. */
  readonly action: string;
  /** The `x-factory-role` header value; absent means an anonymous request. */
  readonly principal?: string;
  /**
   * The `x-factory-fixture-session` header value for session-bound generated
   * applications. Mutually exclusive with `principal`: a journey resolves
   * exactly one principal kind, never both.
   */
  readonly sessionId?: string;
  /** A bounded flat declared JSON body, e.g. a create payload. */
  readonly body?: string;
};

export type IdempotencyJourneyFixture = RoleJourneyFixture & {
  /** The declared idempotency key for the repeated request. */
  readonly idempotencyKey: string;
  /** The declared expected version for the transition. */
  readonly expectedVersion: number;
};

const actionPattern = /^[a-zA-Z0-9._-]{1,64}$/;
const journeyIdPattern = /^[a-z0-9-]{1,64}$/;
const principalPattern = /^[a-zA-Z0-9._-]{1,64}$/;
const idempotencyKeyPattern = /^[a-z0-9-]{1,128}$/;
const httpMethods: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

/**
 * Expense approval: employees create and submit expenses; managers read,
 * approve, and reject; finance audits. Record-bearing routes reference the
 * declared fixture record `expense-fixture-01`; denial journeys resolve
 * policy before the record lookup.
 */
export const expenseApprovalApiRegistry: readonly RegisteredApiAction[] = [
  {
    action: "expense.create",
    method: "POST",
    route: "/api/expense",
    expectedStatus: 201,
  },
  {
    action: "expense.list",
    method: "GET",
    route: "/api/expense",
    expectedStatus: 200,
  },
  {
    action: "expense.read",
    method: "GET",
    route: "/api/expense/expense-fixture-01",
    expectedStatus: 200,
  },
  {
    action: "expense.submit",
    method: "POST",
    route: "/api/expense/expense-fixture-01/events/submit",
    expectedStatus: 201,
  },
  {
    action: "expense.approve",
    method: "POST",
    route: "/api/expense/expense-fixture-01/events/approve",
    expectedStatus: 201,
  },
  {
    action: "expense.reject",
    method: "POST",
    route: "/api/expense/expense-fixture-01/events/reject",
    expectedStatus: 201,
  },
];

/**
 * Simple ecommerce: shoppers read the seeded catalog and place orders;
 * merchants manage the catalog and run order operations (cancel, capture
 * payment). Order transitions carry `{expectedVersion, idempotencyKey}`.
 */
export const simpleCommerceApiRegistry: readonly RegisteredApiAction[] = [
  {
    action: "product.list",
    method: "GET",
    route: "/api/product",
    expectedStatus: 200,
  },
  {
    action: "product.read",
    method: "GET",
    route: "/api/product/everyday-tote",
    expectedStatus: 200,
  },
  {
    action: "order.create",
    method: "POST",
    route: "/api/order",
    expectedStatus: 201,
  },
  {
    action: "order.place",
    method: "POST",
    route: "/api/order/order-fixture-01/events/place",
    expectedStatus: 201,
  },
  {
    action: "order.cancel",
    method: "POST",
    route: "/api/order/order-fixture-01/events/cancel",
    expectedStatus: 201,
  },
  {
    action: "order.capture-payment",
    method: "POST",
    route: "/api/order/order-fixture-01/events/capture-payment",
    expectedStatus: 201,
  },
];

export function resolveRegistryAction(
  registry: readonly RegisteredApiAction[],
  actionName: string,
): RegisteredApiAction {
  const action = registry.find((candidate) => candidate.action === actionName);
  if (!action) {
    throw new VerificationContractError(
      `API action is not registered: ${actionName}`,
    );
  }
  validateApiAction(action);
  return action;
}

/**
 * Fails closed on any malformed or untrusted registry entry: the route must
 * be a bounded Graph-facing route, the method and status bounded, and the
 * action name a declared identifier. A hostile fixture is a programming
 * error, never a bounded probe result.
 */
export function validateApiAction(action: RegisteredApiAction): void {
  if (
    !action ||
    typeof action.action !== "string" ||
    !actionPattern.test(action.action) ||
    !httpMethods.includes(action.method) ||
    typeof action.route !== "string" ||
    !isSafeRequestPath(action.route) ||
    !Number.isInteger(action.expectedStatus) ||
    action.expectedStatus < 100 ||
    action.expectedStatus > 599
  ) {
    throw new VerificationContractError(
      "API actions must be declared fixture data.",
    );
  }
}

/**
 * Resolves and validates a journey fixture against its profile registry.
 * Unknown actions, unbounded journey IDs, and untrusted principals fail
 * closed before any request is sent.
 */
export function validateRoleJourney(
  journey: RoleJourneyFixture,
  registry: readonly RegisteredApiAction[],
): RegisteredApiAction {
  if (
    !journey ||
    typeof journey.journeyId !== "string" ||
    !journeyIdPattern.test(journey.journeyId) ||
    typeof journey.action !== "string"
  ) {
    throw new VerificationContractError(
      "Role journeys must be declared fixture data.",
    );
  }
  if (journey.principal !== undefined) {
    if (
      typeof journey.principal !== "string" ||
      !principalPattern.test(journey.principal)
    ) {
      throw new VerificationContractError(
        "Role journey principals must be declared fixture data.",
      );
    }
  }
  if (journey.sessionId !== undefined) {
    if (
      typeof journey.sessionId !== "string" ||
      !principalPattern.test(journey.sessionId)
    ) {
      throw new VerificationContractError(
        "Role journey sessions must be declared fixture data.",
      );
    }
    if (journey.principal !== undefined) {
      throw new VerificationContractError(
        "Role journeys resolve exactly one principal kind.",
      );
    }
  }
  if (journey.body !== undefined) {
    if (typeof journey.body !== "string" || journey.body.length === 0) {
      throw new VerificationContractError(
        "Role journey bodies must be declared fixture data.",
      );
    }
  }
  return resolveRegistryAction(registry, journey.action);
}

export function validateIdempotencyJourney(
  journey: IdempotencyJourneyFixture,
  registry: readonly RegisteredApiAction[],
): RegisteredApiAction {
  const action = validateRoleJourney(journey, registry);
  if (
    typeof journey.idempotencyKey !== "string" ||
    !idempotencyKeyPattern.test(journey.idempotencyKey) ||
    !Number.isInteger(journey.expectedVersion) ||
    journey.expectedVersion < 0
  ) {
    throw new VerificationContractError(
      "Idempotency journeys must declare a bounded key and version.",
    );
  }
  return action;
}
