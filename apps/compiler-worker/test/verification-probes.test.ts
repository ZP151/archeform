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

  it("fails bounded when the health endpoint is unreachable", async () => {
    const { context } = probeContext({
      kind: "health",
      health: vi.fn(async () => boundedRequest(0, { ok: false })),
    });
    const step = await runHealthProbe(context);
    expect(step.status).toBe("failed");
    expect(step.failureCode).toBe("health.failed");
    expect(step.httpStatus).toBe(0);
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

  it("confirms a payment denial when a shopper tries to capture payment", async () => {
    const { context } = probeContext({
      kind: "authorization-denial",
      request: vi.fn(async () => boundedRequest(403)),
    });
    const journey: RoleJourneyFixture = {
      journeyId: "order-capture-denied",
      action: "order.capture-payment",
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
  });
});

describe("runIdempotencyProbe", () => {
  function journey(): IdempotencyJourneyFixture {
    return {
      journeyId: "order-place",
      action: "order.place",
      principal: "shopper",
      idempotencyKey: "verify-order-place-01",
      expectedVersion: 1,
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
        "/api/order/order-fixture-01/events/place",
        "api",
        expect.objectContaining({
          headers: [{ name: "x-factory-role", value: "shopper" }],
          body: '{"expectedVersion":1,"idempotencyKey":"verify-order-place-01"}',
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
  function environment() {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
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
});
