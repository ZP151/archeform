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

export type DeclaredJourneyHeader = {
  /** A bounded header name, e.g. `x-factory-idempotency-key`. */
  readonly name: string;
  /** A bounded header value, e.g. a fixture session-token digest. */
  readonly value: string;
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
  /**
   * Declared extra headers for header-bound generated applications (the
   * Restaurant runtime reads the table-session token and the command
   * idempotency key from headers). At most two, never the reserved fixture
   * principal headers, and never duplicated.
   */
  readonly headers?: readonly DeclaredJourneyHeader[];
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
const headerNamePattern = /^[a-z][a-z0-9-]{0,63}$/;
// Mirrors the environment's safeHeaderValue contract: header values are
// bounded printable fixture data, never arbitrary text.
const headerValuePattern = /^[a-zA-Z0-9._-]{1,64}$/;
const maximumDeclaredJourneyHeaders = 2;
// A journey resolves its principal through exactly one fixture channel; a
// declared header may never smuggle a reserved channel name in.
const reservedHeaderNames = new Set([
  "x-factory-role",
  "x-factory-fixture-session",
]);
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
 * merchants run order operations (fulfil, cancel). The generated runtime
 * dispatches transitions strictly by the declared flow event name on
 * `/api/:entity/:recordId/events/:event`, so every order action here is a
 * real flow event (submit/pay/fulfil/cancel) — a route that is not a flow
 * event can never exist in the generated API and would fail closed.
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
    action: "order.submit",
    method: "POST",
    route: "/api/order/order-fixture-01/events/submit",
    expectedStatus: 201,
  },
  {
    action: "order.pay",
    method: "POST",
    route: "/api/order/order-fixture-01/events/pay",
    expectedStatus: 201,
  },
  {
    action: "order.fulfil",
    method: "POST",
    route: "/api/order/order-fixture-01/events/fulfil",
    expectedStatus: 201,
  },
  {
    action: "order.cancel",
    method: "POST",
    route: "/api/order/order-fixture-01/events/cancel",
    expectedStatus: 201,
  },
];

/**
 * Restaurant ordering: customers resolve a seeded table session and read the
 * menu; cashiers record payments against the seeded merchant E2E order (the
 * database seed derives its session-token digest from the same demo token the
 * verifier declares); managers seat tables and read reports; kitchen reads
 * the tickets a payment creates. Every command carries its idempotency key
 * and session token as declared headers — the Restaurant runtime reads them
 * from `x-factory-idempotency-key` / `x-factory-table-session-token`, never
 * from the body.
 */
export const restaurantOrderingApiRegistry: readonly RegisteredApiAction[] = [
  {
    action: "table-session.resolve",
    method: "POST",
    route: "/api/restaurant/table-sessions/resolve",
    expectedStatus: 201,
  },
  {
    action: "menu-item.list",
    method: "GET",
    route: "/api/restaurant/menu/items",
    expectedStatus: 200,
  },
  {
    action: "order.pay",
    method: "POST",
    route: "/api/restaurant/orders/merchant-e2e-cashier-order/payments",
    expectedStatus: 201,
  },
  {
    action: "kitchen-ticket.list",
    method: "GET",
    route: "/api/restaurant/merchant/kitchen-tickets",
    expectedStatus: 200,
  },
  {
    action: "order.audit-summary",
    method: "GET",
    route: "/api/restaurant/reports/summary",
    expectedStatus: 200,
  },
  {
    action: "inventory.audit-low-stock",
    method: "GET",
    route: "/api/restaurant/reports/low-stock",
    expectedStatus: 200,
  },
  {
    action: "restaurant-table.seat",
    method: "POST",
    route:
      "/api/restaurant/merchant/tables/merchant-e2e-cashier-table/events/seat",
    expectedStatus: 201,
  },
  {
    action: "order.cancel",
    method: "POST",
    route: "/api/restaurant/orders/merchant-e2e-cancellation-order/cancel",
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
  if (journey.headers !== undefined) {
    if (
      !Array.isArray(journey.headers) ||
      journey.headers.length === 0 ||
      journey.headers.length > maximumDeclaredJourneyHeaders
    ) {
      throw new VerificationContractError(
        "Role journey headers must be declared fixture data.",
      );
    }
    const seen = new Set<string>();
    for (const header of journey.headers) {
      if (
        !header ||
        typeof header.name !== "string" ||
        !headerNamePattern.test(header.name) ||
        reservedHeaderNames.has(header.name) ||
        typeof header.value !== "string" ||
        !headerValuePattern.test(header.value) ||
        seen.has(header.name)
      ) {
        throw new VerificationContractError(
          "Role journey headers must be declared fixture data.",
        );
      }
      seen.add(header.name);
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
