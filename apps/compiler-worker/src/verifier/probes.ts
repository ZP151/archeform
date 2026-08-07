import type { VerificationStepV1 } from "@factory/graph";

import type { VerificationStepPlanEntry } from "./verification-lifecycle.js";
import type { VerificationEnvironment } from "./verification-environment.js";
import {
  validateApiAction,
  validateIdempotencyJourney,
  validateRoleJourney,
  type IdempotencyJourneyFixture,
  type RegisteredApiAction,
  type RoleJourneyFixture,
} from "./role-journey.js";

/**
 * The six bounded probes. Each probe returns exactly one allowlisted
 * VerificationStepV1: a fixed prose summary, the declared status/role/action,
 * and measured duration. Response bodies and process output are never read,
 * so they can never leak into evidence; any malformed or hostile fixture
 * throws before a request is sent.
 */

export type ProbeContext = {
  readonly entry: VerificationStepPlanEntry;
  readonly environment: VerificationEnvironment;
  readonly signal: AbortSignal;
};

function passedStep(
  entry: VerificationStepPlanEntry,
  kind: VerificationStepV1["kind"],
  summary: string,
  durationMs: number,
  facts: Pick<VerificationStepV1, "httpStatus" | "role" | "action"> = {},
): VerificationStepV1 {
  return {
    stepId: entry.stepId,
    kind,
    status: "passed",
    summary,
    durationMs,
    ...facts,
  };
}

function failedStep(
  entry: VerificationStepPlanEntry,
  kind: VerificationStepV1["kind"],
  failureCode: string,
  summary: string,
  durationMs: number,
  facts: Pick<VerificationStepV1, "httpStatus" | "role" | "action"> = {},
): VerificationStepV1 {
  return {
    stepId: entry.stepId,
    kind,
    status: "failed",
    failureCode,
    summary,
    durationMs,
    ...facts,
  };
}

function journeyFacts(
  principal: string | undefined,
  action: string,
): Pick<VerificationStepV1, "role" | "action"> {
  return principal === undefined ? { action } : { role: principal, action };
}

/**
 * The declared fixture header for one journey: a fixture session for
 * session-bound generated applications, or the API role header for
 * principal-bound ones. Both kinds are validated in role-journey.ts before
 * any request is sent; a journey can never declare both.
 */
function journeyHeaders(
  journey: RoleJourneyFixture,
): readonly { name: string; value: string }[] | undefined {
  if (journey.sessionId !== undefined) {
    return [{ name: "x-factory-fixture-session", value: journey.sessionId }];
  }
  return journey.principal === undefined
    ? undefined
    : [{ name: "x-factory-role", value: journey.principal }];
}

/**
 * The evidence contract bounds httpStatus to 100..599. A status of 0 means
 * the endpoint never responded (network failure or timeout) — no HTTP status
 * exists, so the step must not carry an httpStatus field at all; the failure
 * code distinguishes the no-response case.
 */
function statusFacts(status: number): Pick<VerificationStepV1, "httpStatus"> {
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? { httpStatus: status }
    : {};
}

/** The generated app exposes one deterministic migration command. */
export async function runMigrationProbe(
  context: ProbeContext,
): Promise<VerificationStepV1> {
  const result = await context.environment.migrate([
    "npx",
    "prisma",
    "migrate",
    "status",
  ]);
  if (result.succeeded) {
    return passedStep(
      context.entry,
      "migration",
      "Database schema is applied and up to date.",
      result.durationMs,
    );
  }
  return failedStep(
    context.entry,
    "migration",
    "migration.failed",
    "Database schema is not applied.",
    result.durationMs,
  );
}

export async function runHealthProbe(
  context: ProbeContext,
): Promise<VerificationStepV1> {
  const result = await context.environment.health();
  if (result.status === 200 && result.ok) {
    return passedStep(
      context.entry,
      "health",
      "Health endpoint returned 200.",
      result.durationMs,
      statusFacts(result.status),
    );
  }
  if (result.status === 0) {
    return failedStep(
      context.entry,
      "health",
      "health.unreachable",
      "Health endpoint did not respond.",
      result.durationMs,
    );
  }
  return failedStep(
    context.entry,
    "health",
    "health.failed",
    "Health endpoint did not return 200.",
    result.durationMs,
    statusFacts(result.status),
  );
}

/** A registered API action returns exactly its declared status. */
export async function runApiProbe(
  context: ProbeContext,
  action: RegisteredApiAction,
): Promise<VerificationStepV1> {
  validateApiAction(action);
  const result = await context.environment.request(
    action.method,
    action.route,
    "api",
  );
  if (result.status === action.expectedStatus) {
    return passedStep(
      context.entry,
      "api",
      "API action returned the expected status.",
      result.durationMs,
      { ...statusFacts(result.status), action: action.action },
    );
  }
  if (result.status === 0) {
    return failedStep(
      context.entry,
      "api",
      "api.unreachable",
      "API action did not respond.",
      result.durationMs,
      { action: action.action },
    );
  }
  return failedStep(
    context.entry,
    "api",
    "api.unexpected_status",
    "API action did not return the expected status.",
    result.durationMs,
    { ...statusFacts(result.status), action: action.action },
  );
}

/** A declared role journey completes with exactly its declared status. */
export async function runRoleJourneyProbe(
  context: ProbeContext,
  journey: RoleJourneyFixture,
  registry: readonly RegisteredApiAction[],
): Promise<VerificationStepV1> {
  const action = validateRoleJourney(journey, registry);
  const result = await context.environment.request(
    action.method,
    action.route,
    "api",
    {
      headers: journeyHeaders(journey),
      body: journey.body,
    },
  );
  if (result.status === action.expectedStatus) {
    return passedStep(
      context.entry,
      "role-journey",
      "Role journey completed as declared.",
      result.durationMs,
      {
        ...statusFacts(result.status),
        ...journeyFacts(journey.principal, journey.action),
      },
    );
  }
  if (result.status === 0) {
    return failedStep(
      context.entry,
      "role-journey",
      "role-journey.unreachable",
      "Role journey did not respond.",
      result.durationMs,
      journeyFacts(journey.principal, journey.action),
    );
  }
  return failedStep(
    context.entry,
    "role-journey",
    "role-journey.unexpected_status",
    "Role journey did not complete as declared.",
    result.durationMs,
    {
      ...statusFacts(result.status),
      ...journeyFacts(journey.principal, journey.action),
    },
  );
}

/**
 * A declared denial journey must be rejected with 403: the generated
 * application denies policy violations before any record lookup, so this
 * probe proves the denial without depending on seeded records.
 */
export async function runAuthorizationDenialProbe(
  context: ProbeContext,
  journey: RoleJourneyFixture,
  registry: readonly RegisteredApiAction[],
): Promise<VerificationStepV1> {
  const action = validateRoleJourney(journey, registry);
  const result = await context.environment.request(
    action.method,
    action.route,
    "api",
    {
      headers: journeyHeaders(journey),
      body: journey.body,
    },
  );
  if (result.status === 403) {
    return passedStep(
      context.entry,
      "authorization-denial",
      "Authorization denied the principal as declared.",
      result.durationMs,
      {
        ...statusFacts(result.status),
        ...journeyFacts(journey.principal, journey.action),
      },
    );
  }
  if (result.status === 0) {
    return failedStep(
      context.entry,
      "authorization-denial",
      "authorization.unreachable",
      "Authorization denial could not be confirmed because the API did not respond.",
      result.durationMs,
      journeyFacts(journey.principal, journey.action),
    );
  }
  return failedStep(
    context.entry,
    "authorization-denial",
    "authorization.denial_mismatch",
    "Authorization did not deny the principal as declared.",
    result.durationMs,
    {
      ...statusFacts(result.status),
      ...journeyFacts(journey.principal, journey.action),
    },
  );
}

/**
 * A declared transition is applied once and the repeated idempotency key is
 * rejected: the first request must return the declared status, and the
 * byte-identical replay must be rejected with 403 — the generated
 * application's proof that no duplicate side effects ran.
 */
export async function runIdempotencyProbe(
  context: ProbeContext,
  journey: IdempotencyJourneyFixture,
  registry: readonly RegisteredApiAction[],
): Promise<VerificationStepV1> {
  const action = validateIdempotencyJourney(journey, registry);
  const requestOptions = {
    headers: journeyHeaders(journey),
    body: JSON.stringify({
      expectedVersion: journey.expectedVersion,
      idempotencyKey: journey.idempotencyKey,
    }),
  };
  const first = await context.environment.request(
    action.method,
    action.route,
    "api",
    requestOptions,
  );
  if (first.status !== action.expectedStatus) {
    if (first.status === 0) {
      return failedStep(
        context.entry,
        "idempotency",
        "idempotency.unreachable",
        "The first request did not respond.",
        first.durationMs,
        journeyFacts(journey.principal, journey.action),
      );
    }
    return failedStep(
      context.entry,
      "idempotency",
      "idempotency.first_request_unexpected",
      "The first request did not complete as declared.",
      first.durationMs,
      {
        ...statusFacts(first.status),
        ...journeyFacts(journey.principal, journey.action),
      },
    );
  }
  const repeated = await context.environment.request(
    action.method,
    action.route,
    "api",
    requestOptions,
  );
  if (repeated.status !== 403) {
    return failedStep(
      context.entry,
      "idempotency",
      "idempotency.replay_not_rejected",
      "Repeated idempotency key was not rejected.",
      repeated.durationMs,
      {
        ...statusFacts(repeated.status),
        ...journeyFacts(journey.principal, journey.action),
      },
    );
  }
  return passedStep(
    context.entry,
    "idempotency",
    "Repeated idempotency key was rejected without duplicate side effects.",
    first.durationMs + repeated.durationMs,
    {
      ...statusFacts(repeated.status),
      ...journeyFacts(journey.principal, journey.action),
    },
  );
}
