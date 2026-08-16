import { describe, expect, it, vi } from "vitest";

import {
  VerificationContractError,
  verificationStepSchema,
} from "@factory/graph";

import {
  VerificationEnvironment,
  VerificationLifecycleError,
} from "../src/verifier/verification-environment.js";
import {
  runApiProbe,
  runAuthorizationDenialProbe,
  runHealthProbe,
  runIdempotencyProbe,
  runMigrationProbe,
  runRoleJourneyProbe,
  type ProbeContext,
} from "../src/verifier/probes.js";
import {
  expenseApprovalApiRegistry,
  simpleCommerceApiRegistry,
  type IdempotencyJourneyFixture,
  type RegisteredApiAction,
  type RoleJourneyFixture,
} from "../src/verifier/role-journey.js";
import { resolveVerificationProfile } from "../src/verifier/verification-profiles.js";
import {
  acceptanceCompilation,
  acceptanceProfileKey,
} from "./fixtures/expense-approval.js";

function boundedRequest(
  status: number,
  overrides: Partial<{ ok: boolean; durationMs: number }> = {},
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    durationMs: 12,
    ...overrides,
  };
}

function probeContext(
  overrides: Partial<{
    stepId: string;
    kind: ProbeContext["entry"]["kind"];
    request: ReturnType<typeof vi.fn>;
    health: ReturnType<typeof vi.fn>;
    migrate: ReturnType<typeof vi.fn>;
  }> = {},
) {
  const request = overrides.request ?? vi.fn(async () => boundedRequest(201));
  const health = overrides.health ?? vi.fn(async () => boundedRequest(200));
  const migrate =
    overrides.migrate ??
    vi.fn(async () => ({ succeeded: true, durationMs: 20 }));
  const context: ProbeContext = {
    entry: {
      stepId: overrides.stepId ?? "probe",
      kind: overrides.kind ?? "api",
    },
    environment: {
      request,
      health,
      migrate,
    } as unknown as VerificationEnvironment,
    signal: new AbortController().signal,
  };
  return { request, health, migrate, context };
}

describe("runMigrationProbe", () => {
  it("passes when the schema is applied", async () => {
    const { migrate, context } = probeContext({ kind: "migration" });
    const step = await runMigrationProbe(context);
    expect(step.status).toBe("passed");
    expect(step.summary).toMatch(/up to date/i);
    expect(step.durationMs).toBe(20);
    expect(migrate).toHaveBeenCalledWith([
      "npx",
      "prisma",
      "migrate",
      "status",
    ]);
  });

  it("fails bounded when the schema is not applied", async () => {
    const { context } = probeContext({
      kind: "migration",
      migrate: vi.fn(async () => ({ succeeded: false, durationMs: 20 })),
    });
    const step = await runMigrationProbe(context);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("migration.failed");
    expect(step.summary).not.toMatch(/up to date/i);
  });
});

describe("runHealthProbe", () => {
  it("passes when the health endpoint returns 200", async () => {
    const { context } = probeContext({ kind: "health" });
    const step = await runHealthProbe(context);
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("health");
    expect(step.httpStatus).toBe(200);
  });

  it("fails bounded when the health endpoint is unreachable, with contract-valid evidence", async () => {
    const { context } = probeContext({
      kind: "health",
      health: vi.fn(async () => boundedRequest(0, { ok: false })),
    });
    const step = await runHealthProbe(context);
    expect(step.status).toBe("failed");
    // A no-response is distinct from a wrong status: no httpStatus field (the
    // contract bounds it to 100..599) and its own bounded code.
    expect(step.failureCode).toBe("health.unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded with a bounded httpStatus when the health endpoint responds with a wrong status", async () => {
    const { context } = probeContext({
      kind: "health",
      health: vi.fn(async () => boundedRequest(503)),
    });
    const step = await runHealthProbe(context);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("health.failed");
    expect(step.httpStatus).toBe(503);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });
});

describe("runApiProbe", () => {
  const productRead: RegisteredApiAction = {
    action: "product.read",
    method: "GET",
    route: "/api/product/everyday-tote",
    expectedStatus: 200,
  };

  it("passes when the declared API action returns its expected status", async () => {
    const { request, context } = probeContext({
      kind: "api",
      request: vi.fn(async () => boundedRequest(200)),
    });
    const step = await runApiProbe(context, productRead);
    expect(step.status).toBe("passed");
    expect(step.action).toBe("product.read");
    expect(step.httpStatus).toBe(200);
    expect(request).toHaveBeenCalledWith(
      "GET",
      "/api/product/everyday-tote",
      "api",
    );
  });

  it("fails bounded on an unexpected status", async () => {
    const { context } = probeContext({
      kind: "api",
      request: vi.fn(async () => boundedRequest(500)),
    });
    const step = await runApiProbe(context, productRead);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("api.unexpected_status");
    expect(step.httpStatus).toBe(500);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded with a distinct code and no httpStatus when the API is unreachable", async () => {
    const { context } = probeContext({
      kind: "api",
      request: vi.fn(async () => boundedRequest(0, { ok: false })),
    });
    const step = await runApiProbe(context, productRead);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("api.unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails closed on an untrusted route before any request", async () => {
    const { request, context } = probeContext({ kind: "api" });
    const hostile: RegisteredApiAction = {
      action: "product.read",
      method: "GET",
      route: "/api/product?secret=1",
      expectedStatus: 200,
    };
    await expect(runApiProbe(context, hostile)).rejects.toThrow(
      VerificationContractError,
    );
    expect(request).not.toHaveBeenCalled();
  });
});

describe("runRoleJourneyProbe", () => {
  it("completes a successful Expense submission as the declared employee", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee",
      body: '{"amount":42,"description":"Taxi to client"}',
    };
    const step = await runRoleJourneyProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("role-journey");
    expect(step.role).toBe("employee");
    expect(step.action).toBe("expense.create");
    expect(step.httpStatus).toBe(201);
    // The declared role header and bounded body must reach the API.
    expect(request).toHaveBeenCalledWith(
      "POST",
      "/api/expense",
      "api",
      expect.objectContaining({
        headers: [{ name: "x-factory-role", value: "employee" }],
        body: '{"amount":42,"description":"Taxi to client"}',
      }),
    );
  });

  it("fails bounded when the journey does not complete as declared", async () => {
    const { context } = probeContext({
      kind: "role-journey",
      request: vi.fn(async () => boundedRequest(403)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee",
    };
    const step = await runRoleJourneyProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("role-journey.unexpected_status");
    expect(step.httpStatus).toBe(403);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded with a distinct code and no httpStatus when the API is unreachable", async () => {
    const { context } = probeContext({
      kind: "role-journey",
      request: vi.fn(async () => boundedRequest(0, { ok: false })),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee",
    };
    const step = await runRoleJourneyProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("role-journey.unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("forwards a declared fixture session header instead of a role header", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "manager-approves-expense",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
    };
    const step = await runRoleJourneyProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("passed");
    expect(step.action).toBe("expense.approve");
    expect(request).toHaveBeenCalledWith(
      "POST",
      "/api/expense/expense-fixture-01/events/approve",
      "api",
      expect.objectContaining({
        headers: [
          {
            name: "x-factory-fixture-session",
            value: "fixture-session-manager",
          },
        ],
      }),
    );
  });

  it("fails closed when a journey declares both a session and a role principal", async () => {
    const { context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "manager-approves-expense",
      action: "expense.approve",
      principal: "manager",
      sessionId: "fixture-session-manager",
    };
    await expect(
      runRoleJourneyProbe(context, journey, expenseApprovalApiRegistry),
    ).rejects.toThrow(VerificationContractError);
  });
});

describe("chain journeys", () => {
  // Mirrors the graph-derived registry for a branching flow: the create is a
  // static route, the path step is a `-fresh` template action, and the chained
  // final transition is a natural-name template action.
  const chainRegistry: readonly RegisteredApiAction[] = [
    {
      action: "expense.create",
      method: "POST",
      route: "/api/expense",
      expectedStatus: 201,
    },
    {
      action: "expense.submit-fresh",
      method: "POST",
      route: "/api/expense/{recordId}/events/submit",
      expectedStatus: 201,
    },
    {
      action: "expense.approve",
      method: "POST",
      route: "/api/expense/{recordId}/events/approve",
      expectedStatus: 201,
    },
  ];

  function capturingRequest(
    overrides: { createStatus?: number } = {},
  ): ReturnType<typeof vi.fn> {
    return vi.fn(
      async (
        _method: string,
        _path: string,
        _port: string,
        _options: unknown,
        capture: boolean,
      ) => {
        if (capture === true) {
          return {
            ...boundedRequest(overrides.createStatus ?? 201),
            recordId: "cm-chain-record-01",
          };
        }
        return boundedRequest(201);
      },
    );
  }

  it("creates a fresh record, walks the path steps, then drives the transition on it", async () => {
    const request = capturingRequest();
    const { context } = probeContext({ kind: "role-journey", request });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [
        {
          action: "expense.create",
          sessionId: "fixture-session-employee",
          body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
        },
        {
          action: "expense.submit-fresh",
          sessionId: "fixture-session-employee",
        },
      ],
    };
    const step = await runRoleJourneyProbe(context, journey, chainRegistry);
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("role-journey");
    // Session-bound journeys resolve their principal through the fixture
    // session header; the evidence contract records `role` only for
    // principal-bound journeys.
    expect(step.role).toBeUndefined();
    expect(step.action).toBe("expense.approve");
    // The captured id addresses every later step and the final transition:
    // the seeded static route is never used for a chain step.
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls[0]).toEqual([
      "POST",
      "/api/expense",
      "api",
      expect.objectContaining({
        headers: [
          {
            name: "x-factory-fixture-session",
            value: "fixture-session-employee",
          },
        ],
        body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
      }),
      true,
    ]);
    expect(request.mock.calls[1]).toEqual([
      "POST",
      "/api/expense/cm-chain-record-01/events/submit",
      "api",
      expect.objectContaining({
        headers: [
          {
            name: "x-factory-fixture-session",
            value: "fixture-session-employee",
          },
        ],
      }),
      false,
    ]);
    expect(request.mock.calls[2]).toEqual([
      "POST",
      "/api/expense/cm-chain-record-01/events/approve",
      "api",
      expect.objectContaining({
        headers: [
          {
            name: "x-factory-fixture-session",
            value: "fixture-session-manager",
          },
        ],
      }),
    ]);
  });

  it("fails bounded when a chain prologue step does not complete as declared", async () => {
    const request = vi.fn(async () => boundedRequest(403));
    const { context } = probeContext({ kind: "role-journey", request });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [
        {
          action: "expense.create",
          sessionId: "fixture-session-employee",
          body: '{"amount":37.5}',
        },
      ],
    };
    const step = await runRoleJourneyProbe(context, journey, chainRegistry);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("role-journey.chain_unexpected");
    expect(step.httpStatus).toBe(403);
    // Session-bound chain steps record the action but no role field.
    expect(step.role).toBeUndefined();
    expect(step.action).toBe("expense.create");
    // The failed step stops the chain: the final transition is never sent.
    expect(request).toHaveBeenCalledTimes(1);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded when a chain prologue step is unreachable", async () => {
    const request = vi.fn(async () => boundedRequest(0, { ok: false }));
    const { context } = probeContext({ kind: "role-journey", request });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [
        {
          action: "expense.create",
          sessionId: "fixture-session-employee",
          body: '{"amount":37.5}',
        },
      ],
    };
    const step = await runRoleJourneyProbe(context, journey, chainRegistry);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("role-journey.chain_unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded when the chain create returns no bounded record id", async () => {
    const request = vi.fn(async () => boundedRequest(201));
    const { context } = probeContext({ kind: "role-journey", request });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [
        {
          action: "expense.create",
          sessionId: "fixture-session-employee",
          body: '{"amount":37.5}',
        },
      ],
    };
    const step = await runRoleJourneyProbe(context, journey, chainRegistry);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("role-journey.record_id_not_captured");
    // The final transition must never fall back to the seeded record.
    expect(request).toHaveBeenCalledTimes(1);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails closed when a chain does not begin with a record create", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [
        {
          action: "expense.submit-fresh",
          sessionId: "fixture-session-employee",
        },
      ],
    };
    await expect(
      runRoleJourneyProbe(context, journey, chainRegistry),
    ).rejects.toThrow(VerificationContractError);
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed when a chain step changes the journey's principal kind", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
      chain: [{ action: "expense.create", principal: "employee" }],
    };
    await expect(
      runRoleJourneyProbe(context, journey, chainRegistry),
    ).rejects.toThrow(VerificationContractError);
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed when an anonymous journey declares chain principals", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve",
      action: "expense.approve",
      chain: [
        { action: "expense.create", sessionId: "fixture-session-employee" },
      ],
    };
    await expect(
      runRoleJourneyProbe(context, journey, chainRegistry),
    ).rejects.toThrow(VerificationContractError);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("runAuthorizationDenialProbe", () => {
  it("confirms an approval denial when a non-manager tries to approve", async () => {
    const { request, context } = probeContext({
      kind: "authorization-denial",
      request: vi.fn(async () => boundedRequest(403)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve-denied",
      action: "expense.approve",
      principal: "employee",
    };
    const step = await runAuthorizationDenialProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("authorization-denial");
    expect(step.role).toBe("employee");
    expect(step.action).toBe("expense.approve");
    expect(step.httpStatus).toBe(403);
    expect(request).toHaveBeenCalledWith(
      "POST",
      "/api/expense/expense-fixture-01/events/approve",
      "api",
      expect.objectContaining({
        headers: [{ name: "x-factory-role", value: "employee" }],
      }),
    );
  });

  it("confirms a payment denial when a shopper tries to cancel", async () => {
    const { context } = probeContext({
      kind: "authorization-denial",
      request: vi.fn(async () => boundedRequest(403)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "order-cancel-denied",
      action: "order.cancel",
      principal: "shopper",
    };
    const step = await runAuthorizationDenialProbe(
      context,
      journey,
      simpleCommerceApiRegistry,
    );
    expect(step.status).toBe("passed");
    expect(step.httpStatus).toBe(403);
  });

  it("fails bounded when the denial does not happen", async () => {
    const { context } = probeContext({
      kind: "authorization-denial",
      request: vi.fn(async () => boundedRequest(201)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve-denied",
      action: "expense.approve",
      principal: "employee",
    };
    const step = await runAuthorizationDenialProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("authorization.denial_mismatch");
    expect(step.httpStatus).toBe(201);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded with a distinct code and no httpStatus when the API is unreachable", async () => {
    const { context } = probeContext({
      kind: "authorization-denial",
      request: vi.fn(async () => boundedRequest(0, { ok: false })),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-approve-denied",
      action: "expense.approve",
      principal: "employee",
    };
    const step = await runAuthorizationDenialProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("authorization.unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("drives a fresh-record chain before denying the transition route (real-model regression)", async () => {
    // The graph-derived denial for a colliding create transition targets the
    // `{recordId}` template route: the probe must create its own record (as
    // the allowed role), substitute the captured id, and only then probe the
    // transition as the denied principal — the literal template route would
    // fail closed and crash (`unknown.probe_crashed`) instead of denying.
    const request = vi.fn(
      async (
        _method: string,
        _path: string,
        _port: string,
        _options: unknown,
        capture: boolean,
      ) => {
        if (capture === true) {
          return { ...boundedRequest(201), recordId: "cm-chain-record-01" };
        }
        return boundedRequest(403);
      },
    );
    const { context } = probeContext({
      kind: "authorization-denial",
      request,
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-denied-create",
      action: "expense.create-transition",
      principal: "manager",
      chain: [
        {
          action: "expense.create",
          principal: "employee",
          body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
        },
      ],
    };
    const registry: readonly RegisteredApiAction[] = [
      {
        action: "expense.create",
        method: "POST",
        route: "/api/expense",
        expectedStatus: 201,
      },
      {
        action: "expense.create-transition",
        method: "POST",
        route: "/api/expense/{recordId}/events/create",
        expectedStatus: 201,
      },
    ];
    const step = await runAuthorizationDenialProbe(context, journey, registry);
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("authorization-denial");
    expect(step.role).toBe("manager");
    expect(step.action).toBe("expense.create-transition");
    expect(step.httpStatus).toBe(403);
    expect(request).toHaveBeenCalledTimes(2);
    // The create ran as the allowed role with record capture...
    expect(request.mock.calls[0]).toEqual([
      "POST",
      "/api/expense",
      "api",
      expect.objectContaining({
        headers: [{ name: "x-factory-role", value: "employee" }],
      }),
      true,
    ]);
    // ...then the transition as the denied principal against the substituted
    // concrete route — never the literal template.
    expect(request.mock.calls[1]).toEqual([
      "POST",
      "/api/expense/cm-chain-record-01/events/create",
      "api",
      expect.objectContaining({
        headers: [{ name: "x-factory-role", value: "manager" }],
      }),
    ]);
  });
});

describe("runIdempotencyProbe", () => {
  function journey(): IdempotencyJourneyFixture {
    return {
      journeyId: "order-submit",
      action: "order.submit",
      principal: "shopper",
      idempotencyKey: "verify-order-submit-01",
      expectedVersion: 0,
    };
  }

  it("passes when the repeated idempotency key is rejected", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(boundedRequest(201))
      .mockResolvedValueOnce(boundedRequest(403));
    const { context } = probeContext({ kind: "idempotency", request });
    const step = await runIdempotencyProbe(
      context,
      journey(),
      simpleCommerceApiRegistry,
    );
    expect(step.status).toBe("passed");
    expect(step.kind).toBe("idempotency");
    expect(step.httpStatus).toBe(403);
    expect(step.summary).toMatch(/repeated idempotency key/i);
    // The replay must be byte-identical: same route, role, version, and key.
    expect(request).toHaveBeenCalledTimes(2);
    for (const call of request.mock.calls) {
      expect(call).toEqual([
        "POST",
        "/api/order/order-fixture-01/events/submit",
        "api",
        expect.objectContaining({
          headers: [{ name: "x-factory-role", value: "shopper" }],
          body: '{"expectedVersion":0,"idempotencyKey":"verify-order-submit-01"}',
        }),
      ]);
    }
  });

  it("fails bounded when the first request does not complete as declared", async () => {
    const request = vi.fn(async () => boundedRequest(404));
    const { context } = probeContext({ kind: "idempotency", request });
    const step = await runIdempotencyProbe(
      context,
      journey(),
      simpleCommerceApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("idempotency.first_request_unexpected");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("fails bounded with a distinct code and no httpStatus when the first request is unreachable", async () => {
    const request = vi.fn(async () => boundedRequest(0, { ok: false }));
    const { context } = probeContext({ kind: "idempotency", request });
    const step = await runIdempotencyProbe(
      context,
      journey(),
      simpleCommerceApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("idempotency.unreachable");
    expect(step.httpStatus).toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });

  it("fails bounded when the replay is not rejected", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(boundedRequest(201))
      .mockResolvedValueOnce(boundedRequest(201));
    const { context } = probeContext({ kind: "idempotency", request });
    const step = await runIdempotencyProbe(
      context,
      journey(),
      simpleCommerceApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("idempotency.replay_not_rejected");
  });
});

describe("probe evidence redaction", () => {
  it("never echoes hostile response or fixture material into summaries", async () => {
    const { context } = probeContext({
      kind: "role-journey",
      request: vi.fn(async () => boundedRequest(500)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee",
      body: '{"amount":42,"description":"secret-token:sk-abc123"}',
    };
    const step = await runRoleJourneyProbe(
      context,
      journey,
      expenseApprovalApiRegistry,
    );
    expect(step.status).toBe("failed");
    expect(step.summary).not.toContain("sk-abc123");
    expect(step.summary).not.toContain("secret-token");
    expect(step.summary).not.toContain("42");
    // The bounded summary must satisfy the contract's redaction backstop.
    expect(verificationStepSchema.safeParse(step).success).toBe(true);
  });
});

describe("unknown route rejection", () => {
  it("fails closed before any request when the journey action is not registered", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-grant-admin",
      action: "expense.grant-admin",
      principal: "employee",
    };
    await expect(
      runRoleJourneyProbe(context, journey, expenseApprovalApiRegistry),
    ).rejects.toThrow(VerificationContractError);
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed on a journey with an untrusted principal", async () => {
    const { request, context } = probeContext({ kind: "role-journey" });
    const journey: RoleJourneyFixture = {
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee; rm -rf /",
    };
    await expect(
      runRoleJourneyProbe(context, journey, expenseApprovalApiRegistry),
    ).rejects.toThrow(VerificationContractError);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("VerificationEnvironment request fixtures", () => {
  function environment(fetchMockOverride?: ReturnType<typeof vi.fn>) {
    const fetchMock =
      fetchMockOverride ??
      vi.fn(async () => new Response("{}", { status: 201 }));
    const env = new VerificationEnvironment({
      artifactRoot: "generated",
      previewRunId: "preview-verify-01h3k6f",
      rootDirectory: "expense-approval-published-expense-approval",
      composeProjectName: "factory-preview-preview-verify-01h3k6f",
      artifacts: [
        { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
        { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
      ],
      operationTimeoutMs: 1_000,
      startPreviewRun: vi.fn(async () => ({
        webPort: 3000,
        apiPort: 3001,
        previewUrl: "http://127.0.0.1:3000",
      })),
      stopPreviewRun: vi.fn(async () => undefined),
      fetch: fetchMock as unknown as typeof fetch,
    });
    return { fetchMock, env };
  }

  it("forwards declared role headers and bodies into the isolated API", async () => {
    const { fetchMock, env } = environment();
    await env.boot();
    const result = await env.request("POST", "/api/expense", "api", {
      headers: [{ name: "x-factory-role", value: "employee" }],
      body: '{"amount":42}',
    });
    expect(result.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/expense",
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-factory-role": "employee",
          "content-type": "application/json",
        },
        body: '{"amount":42}',
      }),
    );
  });

  it("forwards declared fixture session headers into the isolated API", async () => {
    const { fetchMock, env } = environment();
    await env.boot();
    const result = await env.request(
      "POST",
      "/api/expense/expense-fixture-01/events/approve",
      "api",
      {
        headers: [
          {
            name: "x-factory-fixture-session",
            value: "fixture-session-manager",
          },
        ],
      },
    );
    expect(result.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/expense/expense-fixture-01/events/approve",
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-factory-fixture-session": "fixture-session-manager",
        },
      }),
    );
  });

  it("rejects header names and values that are not declared fixture data", async () => {
    const { fetchMock, env } = environment();
    await env.boot();
    await expect(
      env.request("GET", "/api/expense", "api", {
        headers: [{ name: "authorization", value: "Bearer sk-abc" }],
      }),
    ).rejects.toThrow(VerificationLifecycleError);
    await expect(
      env.request("GET", "/api/expense", "api", {
        headers: [{ name: "x-factory-role", value: "employee; rm -rf /" }],
      }),
    ).rejects.toThrow(VerificationLifecycleError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects credential-named headers even when the value is identifier-shaped", async () => {
    // The name allowlist is the enforcement: a credential header name must
    // never reach the isolated API even with a benign-shaped value.
    const { fetchMock, env } = environment();
    await env.boot();
    for (const credentialName of ["authorization", "x-api-key", "cookie"]) {
      await expect(
        env.request("GET", "/api/expense", "api", {
          headers: [{ name: credentialName, value: "BearerX" }],
        }),
      ).rejects.toThrow(VerificationLifecycleError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects bodies that are not bounded flat declared JSON", async () => {
    const { fetchMock, env } = environment();
    await env.boot();
    await expect(
      env.request("POST", "/api/expense", "api", {
        body: '{"nested":{"secret":"sk-abc"}}',
      }),
    ).rejects.toThrow(VerificationLifecycleError);
    await expect(
      env.request("POST", "/api/expense", "api", {
        body: `{"amount":${"9".repeat(600)}}`,
      }),
    ).rejects.toThrow(VerificationLifecycleError);
    await expect(
      env.request("POST", "/api/expense", "api", { body: "not json" }),
    ).rejects.toThrow(VerificationLifecycleError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures the bounded record id of a probe-created record when asked", async () => {
    const { env } = environment(
      vi.fn(
        async () =>
          new Response('{"id":"cm-chain-record-01","status":"draft"}', {
            status: 201,
          }),
      ),
    );
    await env.boot();
    const result = await env.request(
      "POST",
      "/api/expense",
      "api",
      { body: '{"amount":37.5}' },
      true,
    );
    expect(result.status).toBe(201);
    expect(result.recordId).toBe("cm-chain-record-01");
  });

  it("never captures a record id unless the probe asks", async () => {
    const { env } = environment(
      vi.fn(
        async () =>
          new Response('{"id":"cm-chain-record-01","status":"draft"}', {
            status: 201,
          }),
      ),
    );
    await env.boot();
    const result = await env.request("POST", "/api/expense", "api", {
      body: '{"amount":37.5}',
    });
    expect(result.status).toBe(201);
    expect(result.recordId).toBeUndefined();
  });

  it("returns no capture when the create did not return a bounded id", async () => {
    const { env } = environment();
    await env.boot();
    // The mock environment answers a body without a top-level id string.
    const fetchMock = vi.fn(
      async () => new Response('{"created":true}', { status: 201 }),
    );
    const bare = new VerificationEnvironment({
      artifactRoot: "generated",
      previewRunId: "preview-verify-bare",
      rootDirectory: "expense-approval-published-expense-approval",
      composeProjectName: "factory-preview-preview-verify-bare",
      artifacts: [
        { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
        { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
      ],
      operationTimeoutMs: 1_000,
      startPreviewRun: vi.fn(async () => ({
        webPort: 3000,
        apiPort: 3001,
        previewUrl: "http://127.0.0.1:3000",
      })),
      stopPreviewRun: vi.fn(async () => undefined),
      fetch: fetchMock as unknown as typeof fetch,
    });
    await bare.boot();
    const result = await bare.request(
      "POST",
      "/api/expense",
      "api",
      { body: '{"amount":37.5}' },
      true,
    );
    expect(result.status).toBe(201);
    expect(result.recordId).toBeUndefined();
  });

  it("returns no capture for an over-limit response body", async () => {
    const { env } = environment();
    await env.boot();
    const fetchMock = vi.fn(
      async () =>
        new Response(`{"id":"cm-big","blob":"${"x".repeat(20 * 1024)}"}`, {
          status: 201,
        }),
    );
    const overLimit = new VerificationEnvironment({
      artifactRoot: "generated",
      previewRunId: "preview-verify-overlimit",
      rootDirectory: "expense-approval-published-expense-approval",
      composeProjectName: "factory-preview-preview-verify-overlimit",
      artifacts: [
        { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
        { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
      ],
      operationTimeoutMs: 1_000,
      startPreviewRun: vi.fn(async () => ({
        webPort: 3000,
        apiPort: 3001,
        previewUrl: "http://127.0.0.1:3000",
      })),
      stopPreviewRun: vi.fn(async () => undefined),
      fetch: fetchMock as unknown as typeof fetch,
    });
    await overLimit.boot();
    const result = await overLimit.request(
      "POST",
      "/api/expense",
      "api",
      { body: '{"amount":37.5}' },
      true,
    );
    expect(result.status).toBe(201);
    expect(result.recordId).toBeUndefined();
  });
});

describe("expense-approval acceptance profile", () => {
  it("declares the create payload the generated runtime requires", () => {
    // Regression: the generated API's create handler fails closed on any
    // missing required field (403 via the generic rejection path). The
    // journey fixture must declare a body covering the graph's required
    // fields; without it the real acceptance fails at
    // employee-creates-expense against the generated API while the fake
    // test API (which answers 201 regardless of body) stays green.
    const profile = resolveVerificationProfile(acceptanceProfileKey);
    const graph = acceptanceCompilation().graph;
    const expense = graph.domain.entities.find(
      (entity) => entity.key === "expense",
    );
    expect(expense).toBeDefined();
    const requiredFields = expense!.fields
      .filter((field) => field.required && field.key !== "status")
      .map((field) => field.key);
    expect(requiredFields.length).toBeGreaterThan(0);
    const create = profile.journeys["employee-creates-expense"];
    expect(create.body).toBeDefined();
    const body = JSON.parse(create.body as string) as Record<string, unknown>;
    for (const field of requiredFields) {
      expect(body).toHaveProperty(field);
    }
  });
});
