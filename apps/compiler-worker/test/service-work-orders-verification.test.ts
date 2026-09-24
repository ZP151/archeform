import { describe, expect, it } from "vitest";
import { serviceWorkOrdersInput } from "../../../packages/compiler/test/fixtures/service-work-orders.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";
import {
  runAuthorizationDenialProbe,
  runIdempotencyProbe,
  runRoleJourneyProbe,
} from "../src/verifier/probes.js";
import {
  validateIdempotencyJourney,
  validateRoleJourney,
  type IdempotencyJourneyFixture,
} from "../src/verifier/role-journey.js";

const profile = (input = serviceWorkOrdersInput()) => {
  return deriveVerificationProfile(input.graph, input.compositionLock);
};
const dispatcher = "fixture-session-dispatcher";
const technicianA = "fixture-session-technician-a";
const technicianB = "fixture-session-technician-b";

// These are transport/probe tests. Runtime history contents are covered by the
// compiler's emitted-runtime tests, not inferred from this scripted transport.
async function exercise(
  id: string,
  options: {
    missingId?: boolean;
    wrongReplayId?: boolean;
    finalStatus?: number;
  } = {},
  plan = profile(),
) {
  const journey = plan.journeys[id];
  expect(journey, id).toBeDefined();
  const entry = plan.stepPlan.find((entry) => entry.stepId === id)!;
  const calls: {
    method: string;
    path: string;
    session: string | null;
    key: string | null;
    body: any;
  }[] = [];
  const env = new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-work-orders-probe",
    rootDirectory: "work-orders-probe",
    composeProjectName: "factory-preview-work-orders-probe",
    artifacts: [],
    startPreviewRun: async () => ({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    }),
    stopPreviewRun: async () => undefined,
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        method: init!.method!,
        path: new URL(String(url)).pathname,
        session: headers.get("x-factory-fixture-session"),
        key: headers.get("x-factory-idempotency-key"),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const prologueLength = journey.chain?.length ?? 0;
      const action =
        calls.length <= prologueLength
          ? journey.chain![calls.length - 1].action
          : journey.action;
      const registration = plan.apiRegistry.find(
        (row) => row.action === action,
      )!;
      const final = calls.length > prologueLength;
      const status = final
        ? (options.finalStatus ??
          (entry.kind === "authorization-denial"
            ? 403
            : registration.expectedStatus))
        : registration.expectedStatus;
      const recordId = options.missingId
        ? undefined
        : options.wrongReplayId && calls.length === prologueLength + 2
          ? "different-order"
          : "fresh-order-01";
      return new Response(JSON.stringify({ id: recordId, version: 1 }), {
        status,
      });
    },
  });
  await env.boot();
  const context = {
    entry,
    environment: env,
    signal: new AbortController().signal,
  };
  const result =
    entry.kind === "idempotency"
      ? await runIdempotencyProbe(
          context,
          journey as IdempotencyJourneyFixture,
          plan.apiRegistry,
        )
      : entry.kind === "authorization-denial"
        ? await runAuthorizationDenialProbe(context, journey, plan.apiRegistry)
        : await runRoleJourneyProbe(context, journey, plan.apiRegistry);
  return { result, calls, journey };
}

describe("bounded Service Work Orders verification", () => {
  it("registers only the family API, with create 201, commands 200 and concealed records 404", () => {
    const plan = profile();
    for (const command of [
      "update",
      "assign",
      "reassign",
      "start",
      "resolve",
      "reopen",
      "cancel",
    ])
      expect(
        plan.apiRegistry.find((row) => row.action === "work-orders." + command),
      ).toEqual({
        action: "work-orders." + command,
        method: "POST",
        route: "/api/work-order/{recordId}/events/" + command,
        expectedStatus: 200,
      });
    expect(
      plan.apiRegistry.find((row) => row.action === "work-orders.create"),
    ).toMatchObject({
      method: "POST",
      route: "/api/work-order",
      expectedStatus: 201,
    });
    expect(
      plan.apiRegistry.find(
        (row) => row.action === "work-orders.former-history",
      ),
    ).toMatchObject({
      method: "GET",
      route: "/api/work-order/{recordId}/history",
      expectedStatus: 404,
    });
  });

  it("keeps every journey within existing validators and fresh record/key bounds", () => {
    const plan = profile();
    expect(Object.keys(plan.journeys).length).toBeGreaterThan(15);
    const allKeys = new Set<string>();
    for (const entry of plan.stepPlan.filter(
      (entry) => !["health", "migration"].includes(entry.kind),
    )) {
      const journey = plan.journeys[entry.stepId];
      expect(() =>
        entry.kind === "idempotency"
          ? validateIdempotencyJourney(
              journey as IdempotencyJourneyFixture,
              plan.apiRegistry,
            )
          : validateRoleJourney(journey, plan.apiRegistry),
      ).not.toThrow();
      const action = plan.apiRegistry.find(
        (row) => row.action === journey.action,
      )!;
      if (action.route.includes("{recordId}"))
        expect(journey.chain?.[0].action).toBe("work-orders.create");
      expect(journey.chain?.length ?? 0).toBeLessThanOrEqual(8);
      for (const step of [...(journey.chain ?? []), journey]) {
        expect(step.principal).toBeUndefined();
        expect([dispatcher, technicianA, technicianB]).toContain(
          step.sessionId,
        );
        if (step.body) expect(step.body.length).toBeLessThanOrEqual(512);
      }
      const keys = [
        ...(journey.chain ?? []).map((step) => step.idempotencyKeyOverride!),
        journey.headers![0].value,
      ];
      // The former assignee deliberately repeats its own earlier start receipt.
      if (entry.stepId !== "work-orders-former-replay")
        expect(new Set(keys).size).toBe(keys.length);
      for (const key of new Set(keys)) {
        expect(allKeys.has(key)).toBe(false);
        allKeys.add(key);
      }
    }
  });

  it.each([
    ["create", [], 0],
    ["correct-open", ["create"], 0],
    ["assign", ["create"], 0],
    ["start", ["create", "assign"], 1],
    ["correct-in-progress", ["create", "assign", "start"], 2],
    ["resolve", ["create", "assign", "start"], 2],
    ["reopen", ["create", "assign", "start", "resolve"], 3],
    [
      "resolve-again",
      ["create", "assign", "start", "resolve", "reopen", "start"],
      5,
    ],
    ["reassign-open", ["create", "assign"], 1],
    ["reassign-in-progress", ["create", "assign", "start"], 2],
    ["resolve-reassigned", ["create", "assign", "start", "reassign"], 3],
    ["cancel-open", ["create"], 0],
    ["cancel-in-progress", ["create", "assign", "start"], 2],
    [
      "cancel-after-reopen",
      ["create", "assign", "start", "resolve", "reopen"],
      4,
    ],
  ] as const)(
    "drives %s with committed versions and the identical stored retry",
    async (name, chain, version) => {
      const { result, calls, journey } = await exercise("work-orders-" + name);
      expect(result.status).toBe("passed");
      expect(
        journey.chain?.map((step) => step.action.replace("work-orders.", "")) ??
          [],
      ).toEqual(chain);
      expect(calls).toHaveLength(chain.length + 2);
      expect(calls.at(-1)).toEqual(calls.at(-2));
      expect((journey as IdempotencyJourneyFixture).expectedVersion).toBe(
        version,
      );
      expect((journey as IdempotencyJourneyFixture).replayExpectation).toBe(
        "stored-success",
      );
      if (name !== "create")
        expect(calls.at(-1)!.body.expectedVersion).toBe(version);
      for (const [index, call] of calls.slice(1, chain.length).entries()) {
        expect(call.path).toContain("/fresh-order-01/events/");
        expect(call.body.expectedVersion).toBe(index);
      }
    },
  );

  it("sends all replacement metadata and reason, including explicit clearing", async () => {
    const { calls } = await exercise("work-orders-correct-in-progress");
    expect(calls.at(-1)!.body).toEqual({
      expectedVersion: 2,
      reason: "Correct the saved service details",
      values: {
        title: "Verifier corrected repair",
        serviceLocation: "North plant room",
        priority: "high",
        description: null,
        dueDate: null,
      },
    });
    expect(calls.at(-1)!.session).toBe(dispatcher);
  });

  it("hands in-progress work from technician A to B without restarting it", async () => {
    const { calls } = await exercise("work-orders-resolve-reassigned");
    expect(calls.map((call) => call.session)).toEqual([
      dispatcher,
      dispatcher,
      technicianA,
      dispatcher,
      technicianB,
      technicianB,
    ]);
    expect(calls[1].body).toEqual({
      expectedVersion: 0,
      assigneePrincipalId: "fixture-principal-technician-a",
    });
    expect(calls[3].body).toEqual({
      expectedVersion: 2,
      assigneePrincipalId: "fixture-principal-technician-b",
      reason: "Transfer work to the available technician",
    });
    expect(calls[4].body).toEqual({
      expectedVersion: 3,
      resolutionNote: "Replaced the worn seal and verified normal operation.",
    });
  });

  it.each(["detail", "history", "start", "resolve", "replay"])(
    "conceals former-assignee %s after reassignment using a 404 role journey",
    async (name) => {
      const { result, calls, journey } = await exercise(
        "work-orders-former-" + name,
      );
      expect(result.status).toBe("passed");
      expect(result.kind).toBe("role-journey");
      expect(journey.chain!.map((step) => step.action)).toEqual([
        "work-orders.create",
        "work-orders.assign",
        "work-orders.start",
        "work-orders.reassign",
      ]);
      expect(calls.at(-1)!.session).toBe(technicianA);
      expect(calls.at(-1)!.path).toContain("/fresh-order-01");
      if (name === "replay") expect(calls.at(-1)).toEqual(calls[2]);
    },
  );

  it.each(["technician-denied-create", "technician-denied-update"])(
    "keeps %s as a 403 authorization check",
    async (name) => {
      const { result } = await exercise("work-orders-" + name);
      expect(result.status).toBe("passed");
      expect(result.kind).toBe("authorization-denial");
    },
  );

  it("fails a former-assignee check when the server exposes the order", async () => {
    expect(
      (await exercise("work-orders-former-detail", { finalStatus: 200 })).result
        .status,
    ).toBe("failed");
  });
  it("fails closed when create cannot supply a captured record ID", async () => {
    const { result, calls } = await exercise("work-orders-resolve", {
      missingId: true,
    });
    expect(result.status).toBe("failed");
    expect(calls).toHaveLength(1);
  });
  it("does not accept a stored retry returning a different record ID", async () => {
    expect(
      (await exercise("work-orders-cancel-open", { wrongReplayId: true }))
        .result.status,
    ).toBe("failed");
  });
});

import {
  roleWorkOrdersInput,
  workOrdersRoleCases,
} from "../../../packages/compiler/test/fixtures/service-work-orders-runtime.js";
it.each(workOrdersRoleCases)(
  "keeps fixed fixture identity across all 21 journeys for $name roles",
  async ({ dispatcher: dispatchRole, technician }) => {
    const plan = profile(roleWorkOrdersInput(dispatchRole, technician));
    const canonicalPlan = profile();
    expect(Object.keys(plan.journeys)).toHaveLength(21);
    for (const [id, journey] of Object.entries(plan.journeys)) {
      expect(
        () => validateRoleJourney(journey, plan.apiRegistry),
        id,
      ).not.toThrow();
      const { result, calls } = await exercise(id, {}, plan);
      expect(result.status, id).toBe("passed");
      expect(journey.chain?.length ?? 0).toBeLessThanOrEqual(8);
      for (const call of calls) {
        expect([dispatcher, technicianA, technicianB], id).toContain(
          call.session,
        );
        if (call.path.endsWith("/assign"))
          expect(call.body.assigneePrincipalId).toBe(
            "fixture-principal-technician-a",
          );
        if (call.path.endsWith("/reassign"))
          expect(call.body.assigneePrincipalId).toBe(
            "fixture-principal-technician-b",
          );
      }
      const canonical = canonicalPlan.journeys[id];
      expect(
        [...(journey.chain ?? []), journey].map((step) => step.sessionId),
      ).toEqual(
        [...(canonical.chain ?? []), canonical].map((step) => step.sessionId),
      );
    }
    const journey = plan.journeys["work-orders-create"];
    expect(() =>
      validateRoleJourney(
        { ...journey, sessionId: "s".repeat(65) },
        plan.apiRegistry,
      ),
    ).toThrow();
    expect(() =>
      validateRoleJourney(
        {
          ...journey,
          headers: [
            { name: "x-factory-idempotency-key", value: "h".repeat(65) },
          ],
        },
        plan.apiRegistry,
      ),
    ).toThrow();
  },
);

it.each(["x-factory-fixture-session", "x-factory-idempotency-key"])(
  "rejects arbitrary over-64 %s headers before fetch",
  async (name) => {
    let requests = 0;
    const env = new VerificationEnvironment({
      artifactRoot: "generated",
      previewRunId: "preview-work-orders-boundary",
      rootDirectory: "work-orders-boundary",
      composeProjectName: "factory-preview-work-orders-boundary",
      artifacts: [],
      startPreviewRun: async () => ({
        webPort: 3000,
        apiPort: 3001,
        previewUrl: "http://127.0.0.1:3000",
      }),
      stopPreviewRun: async () => undefined,
      fetch: async () => {
        requests++;
        return new Response("{}");
      },
    });
    await env.boot();
    await expect(
      env.request("GET", "/api/work-order", "api", {
        headers: [{ name, value: "a".repeat(65) }],
      }),
    ).rejects.toMatchObject({ code: "invalid_request_header" });
    expect(requests).toBe(0);
  },
);
