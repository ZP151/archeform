import { describe, expect, it } from "vitest";
import { canonicalTeamTaskInterpretation } from "../../../packages/adapters/src/requirements/task-definition-selection.js";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
} from "@factory/graph";

import { VerificationContractError } from "@factory/graph";

import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import {
  appointmentBookingGraph,
  composedAppointmentProductGraph,
  composedExpenseProductGraph,
  expenseApprovalGraph,
  expenseWithCollidingTransitionGraph,
  expenseWithoutEnumValuesGraph,
  graphLock,
  longIdGraph,
  orderGraph,
  singleRoleGraph,
} from "./fixtures/graph-products.js";

const identityPolicy = graphLock([{ key: "core.identity-policy" }]);

describe("graph-derived verification plan", () => {
  it("derives protected Task requests and five distinct activation keys through recompletion", () => {
    const { spec, blueprint } = canonicalTeamTaskInterpretation();
    const baseDraft = createBlankApplicationDraft({
      applicationId: "task-verifier",
      workspaceId: "local",
      name: "Task verifier",
    });
    const [standard] = planProductAlternatives({
      requirement: spec,
      blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(
      baseDraft,
      composeProductDraft({ plan: standard.plan, blueprint, baseDraft }).diff,
    ).graph;
    const selections = graph.integration.compositionSelections!;
    delete graph.integration.compositionSelections;
    const lock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections,
    });
    const profile = deriveVerificationProfile(graph, lock);
    expect(profile.journeys["task-start"]).toMatchObject({
      sessionId: "fixture-session-member",
      replayExpectation: "stored-success",
      body: '{"expectedVersion":0}',
    });
    expect(
      Object.keys(JSON.parse(profile.journeys["task-create"].body!)),
    ).toEqual(["values"]);
    const final = profile.journeys["task-recomplete"];
    expect(final).toBeDefined();
    expect(final.body).toBe('{"expectedVersion":3}');
    expect(final.chain!.map((step) => step.action)).toEqual([
      "task.create",
      "task.start-fresh",
      "task.complete-fresh",
      "task.reopen-fresh",
    ]);
    expect(
      final
        .chain!.slice(1)
        .map((step) => JSON.parse(step.body!).expectedVersion),
    ).toEqual([0, 1, 2]);
    const keys = [
      ...final.chain!.map((step) => step.idempotencyKeyOverride),
      final.headers![0].value,
    ];
    expect(
      keys.every(
        (key) => typeof key === "string" && /^[a-z0-9-]{1,128}$/.test(key),
      ),
    ).toBe(true);
    expect(new Set(keys).size).toBe(5);
    expect(
      profile.apiRegistry
        .filter((a) => a.action.startsWith("task.") && a.method === "POST")
        .every(
          (a) => a.expectedStatus === (a.action === "task.create" ? 201 : 200),
        ),
    ).toBe(true);
    expect(
      profile.apiRegistry
        .filter((a) => a.method !== "GET")
        .every((a) => a.action.startsWith("task.")),
    ).toBe(true);
    expect(profile.journeys["task-denied-start"].headers).not.toEqual(
      profile.journeys["task-start"].headers,
    );
    expect(JSON.stringify(deriveVerificationProfile(graph, lock))).toBe(
      JSON.stringify(profile),
    );
  });
  it("derives the full plan for the Expense Approval graph", () => {
    const profile = deriveVerificationProfile(
      expenseApprovalGraph(),
      identityPolicy,
    );

    expect(profile.profileKey).toBe("graph-expense-approval");
    expect(profile.stepPlan).toEqual([
      { stepId: "migration", kind: "migration" },
      { stepId: "health", kind: "health" },
      { stepId: "expense-create", kind: "role-journey" },
      { stepId: "expense-read", kind: "role-journey" },
      { stepId: "expense-submit", kind: "idempotency" },
      { stepId: "expense-approve", kind: "role-journey" },
      { stepId: "expense-reject", kind: "role-journey" },
      { stepId: "expense-denied-submit", kind: "authorization-denial" },
    ]);
    expect(profile.journeys["expense-create"]).toEqual({
      journeyId: "expense-create",
      action: "expense.create",
      sessionId: "fixture-session-employee",
      body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
    });
    expect(profile.journeys["expense-read"]).toEqual({
      journeyId: "expense-read",
      action: "expense.read",
      sessionId: "fixture-session-employee",
    });
    // The first making-progress transition is exercised once and replayed.
    expect(profile.journeys["expense-submit"]).toEqual({
      journeyId: "expense-submit",
      action: "expense.submit",
      sessionId: "fixture-session-employee",
      idempotencyKey: "verify-expense-submit-sample-expense",
      expectedVersion: 0,
    });
    // Branching transitions cannot both drive the seeded record (after approve
    // the seeded record left the submit source state), so each drives its own
    // fresh record: create -> submit-fresh as the employee, then the
    // transition as its own role (the path step resolves the `-fresh` template
    // action, never the seeded static route).
    expect(profile.journeys["expense-approve"]).toEqual({
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
    });
    expect(profile.journeys["expense-reject"]).toEqual({
      journeyId: "expense-reject",
      action: "expense.reject",
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
    });
    // Authorization denial: a role the first transition does not allow.
    expect(profile.journeys["expense-denied-submit"]).toEqual({
      journeyId: "expense-denied-submit",
      action: "expense.submit",
      sessionId: "fixture-session-manager",
    });
    expect(profile.apiRegistry).toEqual([
      {
        action: "expense.list",
        method: "GET",
        route: "/api/expense",
        expectedStatus: 200,
      },
      {
        action: "expense.create",
        method: "POST",
        route: "/api/expense",
        expectedStatus: 201,
      },
      {
        action: "expense.read",
        method: "GET",
        route: "/api/expense/sample-expense",
        expectedStatus: 200,
      },
      {
        action: "expense.submit",
        method: "POST",
        route: "/api/expense/sample-expense/events/submit",
        expectedStatus: 201,
      },
      // The shared path step of the approve/reject chains dedupes to one
      // `-fresh` template action; it never appears in evidence. It is
      // registered with the first chain that drives it, before the chained
      // final transitions' own template entries.
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
      {
        action: "expense.reject",
        method: "POST",
        route: "/api/expense/{recordId}/events/reject",
        expectedStatus: 201,
      },
    ]);
  });

  it("derives an independent plan for the Appointment Booking graph", () => {
    const profile = deriveVerificationProfile(
      appointmentBookingGraph(),
      identityPolicy,
    );

    expect(profile.profileKey).toBe("graph-appointment-booking");
    expect(profile.stepPlan.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "appointment-create",
      "appointment-read",
      "appointment-book",
      "appointment-confirm",
      "appointment-cancel",
      "appointment-denied-book",
    ]);
    expect(profile.journeys["appointment-create"]).toEqual({
      journeyId: "appointment-create",
      action: "appointment.create",
      sessionId: "fixture-session-customer",
      body: '{"customerName":"Verifier customerName","slot":"2026-09-01T09:00:00Z","slotLimit":7}',
    });
    expect(profile.journeys["appointment-book"]).toEqual({
      journeyId: "appointment-book",
      action: "appointment.book",
      sessionId: "fixture-session-customer",
      idempotencyKey: "verify-appointment-book-sample-appointment",
      expectedVersion: 0,
    });
    // confirm leaves the initial state directly: the chain needs only the
    // create step.
    expect(profile.journeys["appointment-confirm"]).toEqual({
      journeyId: "appointment-confirm",
      action: "appointment.confirm",
      sessionId: "fixture-session-clinic",
      chain: [
        {
          action: "appointment.create",
          sessionId: "fixture-session-customer",
          body: '{"customerName":"Verifier customerName","slot":"2026-09-01T09:00:00Z","slotLimit":7}',
        },
      ],
    });
    // cancel leaves confirmed: the chain drives book-fresh first (the path
    // step resolves the `-fresh` template action, never the seeded route).
    expect(profile.journeys["appointment-cancel"]).toEqual({
      journeyId: "appointment-cancel",
      action: "appointment.cancel",
      sessionId: "fixture-session-customer",
      chain: [
        {
          action: "appointment.create",
          sessionId: "fixture-session-customer",
          body: '{"customerName":"Verifier customerName","slot":"2026-09-01T09:00:00Z","slotLimit":7}',
        },
        {
          action: "appointment.book-fresh",
          sessionId: "fixture-session-customer",
        },
      ],
    });
    // The clinic is the first role the book transition does not allow.
    expect(profile.journeys["appointment-denied-book"]).toEqual({
      journeyId: "appointment-denied-book",
      action: "appointment.book",
      sessionId: "fixture-session-clinic",
    });
  });

  it("derives an anonymous denial when every role may act on the first transition", () => {
    const profile = deriveVerificationProfile(
      singleRoleGraph(),
      identityPolicy,
    );

    expect(profile.journeys["widget-denied-archive"]).toEqual({
      journeyId: "widget-denied-archive",
      action: "widget.archive",
    });
    expect(profile.journeys["widget-denied-archive"]).not.toHaveProperty(
      "sessionId",
    );
    expect(profile.journeys["widget-denied-archive"]).not.toHaveProperty(
      "principal",
    );
    expect(profile.journeys["widget-archive"]).toEqual({
      journeyId: "widget-archive",
      action: "widget.archive",
      sessionId: "fixture-session-owner",
      idempotencyKey: "verify-widget-archive-sample-widget",
      expectedVersion: 0,
    });
  });

  it("omits order entity transitions when the commerce order handler is locked", () => {
    const profile = deriveVerificationProfile(
      orderGraph(),
      graphLock([{ key: "commerce.order", orderEntity: "order" }]),
    );

    expect(profile.stepPlan).toEqual([
      { stepId: "migration", kind: "migration" },
      { stepId: "health", kind: "health" },
      { stepId: "order-create", kind: "role-journey" },
      { stepId: "order-read", kind: "role-journey" },
    ]);
    // The runtime supplies `version` for order entities, so it is never
    // declared in the derived create body.
    expect(profile.journeys["order-create"].body).toBe('{"amount":37.5}');
    expect(
      profile.apiRegistry.some((action) => action.action === "order.pay"),
    ).toBe(false);
    expect(
      profile.stepPlan.some(
        (step) =>
          step.stepId.startsWith("order-") && step.stepId.includes("pay"),
      ),
    ).toBe(false);
  });

  it("binds principals directly when the identity policy is not locked", () => {
    const profile = deriveVerificationProfile(
      expenseApprovalGraph(),
      graphLock([]),
    );

    expect(profile.journeys["expense-create"]).toEqual({
      journeyId: "expense-create",
      action: "expense.create",
      principal: "employee",
      body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
    });
    expect(profile.journeys["expense-create"]).not.toHaveProperty("sessionId");
    // Chain steps carry the same principal kind as the journey.
    expect(profile.journeys["expense-approve"]).toEqual({
      journeyId: "expense-approve",
      action: "expense.approve",
      principal: "manager",
      chain: [
        {
          action: "expense.create",
          principal: "employee",
          body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
        },
        { action: "expense.submit-fresh", principal: "employee" },
      ],
    });
  });

  it("derives identical plans deterministically", () => {
    const first = deriveVerificationProfile(
      expenseApprovalGraph(),
      identityPolicy,
    );
    const second = deriveVerificationProfile(
      expenseApprovalGraph(),
      identityPolicy,
    );

    expect(second).toEqual(first);
  });

  it("fails closed on an enum field without declared values", () => {
    expect(() =>
      deriveVerificationProfile(
        expenseWithoutEnumValuesGraph(),
        identityPolicy,
      ),
    ).toThrow(VerificationContractError);
  });

  it("fails closed on a graph without entities", () => {
    const graph = expenseApprovalGraph();
    expect(() =>
      deriveVerificationProfile(
        {
          ...graph,
          domain: { ...graph.domain, entities: [] },
        },
        identityPolicy,
      ),
    ).toThrow(VerificationContractError);
  });

  it("resolves the entity-create collision with a distinct transition identity", () => {
    // A flow may legitimately declare a `create` transition (the blueprint
    // draws transition events from the same bounded verbs as the grants), but
    // the entity create journey already claims `<entity>-create`. The
    // transition journey must take its own identity — otherwise the derivation
    // dead-ends the whole product at verification (real-model regression: a
    // workflow declaring create/update/delete transitions threw a step-ID
    // collision contract violation the moment the composed product was
    // verified).
    const profile = deriveVerificationProfile(
      expenseWithCollidingTransitionGraph(),
      identityPolicy,
    );
    // The appended create transition (draft -> submitted, after submit) walks
    // a fresh record: the handler create, then the transition on it.
    expect(profile.stepPlan).toContainEqual({
      stepId: "expense-create-transition",
      kind: "role-journey",
    });
    expect(profile.journeys["expense-create-transition"]).toEqual({
      journeyId: "expense-create-transition",
      action: "expense.create-transition",
      sessionId: "fixture-session-employee",
      chain: [
        {
          action: "expense.create",
          sessionId: "fixture-session-employee",
          body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
        },
      ],
    });
    // The handler and the transition coexist under distinct registry actions.
    expect(
      profile.apiRegistry.find((action) => action.action === "expense.create"),
    ).toMatchObject({
      method: "POST",
      route: "/api/expense",
      expectedStatus: 201,
    });
    expect(
      profile.apiRegistry.find(
        (action) => action.action === "expense.create-transition",
      ),
    ).toMatchObject({
      method: "POST",
      route: "/api/expense/{recordId}/events/create",
      expectedStatus: 201,
    });
    // The entity create journey keeps its own identity untouched.
    expect(profile.journeys["expense-create"].action).toBe("expense.create");
  });

  it("derives a self-loop create transition on its own identity (real-model shape)", () => {
    // The real model declares `create` as the first transition, a draft ->
    // draft self-loop: the transition journey still claims its own identity,
    // and the authorization denial probes the transition route, not the create
    // handler.
    const graph = expenseApprovalGraph();
    const flow = graph.flow.flows[0];
    const withSelfLoopCreate = {
      ...graph,
      flow: {
        flows: [
          {
            ...flow,
            events: ["create", ...flow.events],
            transitions: [
              {
                from: "draft",
                event: "create",
                to: "draft",
                roles: ["employee"],
              },
              ...flow.transitions,
            ],
          },
        ],
      },
    };
    const profile = deriveVerificationProfile(
      withSelfLoopCreate,
      identityPolicy,
    );
    expect(profile.stepPlan).toContainEqual({
      stepId: "expense-create-transition",
      kind: "role-journey",
    });
    expect(profile.stepPlan).toContainEqual({
      stepId: "expense-denied-create",
      kind: "authorization-denial",
    });
    expect(profile.journeys["expense-denied-create"].action).toBe(
      "expense.create-transition",
    );
    expect(profile.journeys["expense-create-transition"].chain).toEqual([
      {
        action: "expense.create",
        sessionId: "fixture-session-employee",
        body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01T00:00:00.000Z"}',
      },
    ]);
  });

  it("drives the colliding-create denial over a fresh record (real-model regression)", () => {
    // The real-model workflow's first transition is the colliding create (a
    // draft -> draft self-loop): the denial probes the transition route, which
    // is a `{recordId}` template with no seeded record to address. The denial
    // journey must carry the same fresh-record chain as the transition journey
    // it denies — otherwise the probe fails closed on the literal template
    // route and crashes (`unknown.probe_crashed`) instead of denying.
    const graph = expenseApprovalGraph();
    const flow = graph.flow.flows[0];
    const withSelfLoopCreate = {
      ...graph,
      flow: {
        flows: [
          {
            ...flow,
            events: ["create", ...flow.events],
            transitions: [
              {
                from: "draft",
                event: "create",
                to: "draft",
                roles: ["employee"],
              },
              ...flow.transitions,
            ],
          },
        ],
      },
    };
    const profile = deriveVerificationProfile(
      withSelfLoopCreate,
      identityPolicy,
    );
    const denial = profile.journeys["expense-denied-create"];
    expect(denial.action).toBe("expense.create-transition");
    // The denial addresses a real record: the same chain the transition
    // journey drives, so the probe substitutes the captured id instead of
    // sending the literal template route.
    expect(denial.chain).toEqual(
      profile.journeys["expense-create-transition"].chain,
    );
  });

  it("digest-bounds the profile key for over-long graph ids", () => {
    const profile = deriveVerificationProfile(longIdGraph(), identityPolicy);

    expect(profile.profileKey).not.toBe(`graph-${"l".repeat(128)}`);
    // The profile key contract requires a leading letter; the digest fallback
    // never starts with a hex digit.
    expect(profile.profileKey).toMatch(/^graph-a[0-9a-f]{31}$/);
    expect(
      deriveVerificationProfile(longIdGraph(), identityPolicy).profileKey,
    ).toBe(profile.profileKey);
  });

  it("derives the full plan for the composed Expense Approval product", () => {
    const profile = deriveVerificationProfile(
      composedExpenseProductGraph(),
      identityPolicy,
    );

    expect(profile.profileKey).toBe("graph-expense-approval-product");
    // The derived session entity's create requires an existing principal
    // (subjectRef natural-key foreign key), no role may create principals,
    // and nothing seeds them: the create journey is omitted honestly rather
    // than claimed. The employee has no create permission either.
    expect(profile.stepPlan.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "expense-create",
      "expense-read",
      "expense-submit",
      "expense-approve",
      "expense-reject",
      "expense-denied-submit",
      "employee-read",
    ]);
    // The date field renders as zone-qualified ISO-8601 so the generated
    // create handler's Prisma call accepts it (run-7 regression: date-only
    // values 403'd with "premature end of input").
    expect(profile.journeys["expense-create"].body).toBe(
      '{"amount":37.5,"category":"travel","date":"2026-09-01T00:00:00.000Z"}',
    );
    // Branching transitions drive their own fresh records.
    expect(profile.journeys["expense-approve"].chain).toEqual([
      {
        action: "expense.create",
        sessionId: "fixture-session-employee",
        body: '{"amount":37.5,"category":"travel","date":"2026-09-01T00:00:00.000Z"}',
      },
      { action: "expense.submit-fresh", sessionId: "fixture-session-employee" },
    ]);
    expect(profile.journeys["expense-reject"].chain).toEqual(
      profile.journeys["expense-approve"].chain,
    );
    expect(profile.journeys["expense-denied-submit"].sessionId).toBe(
      "fixture-session-manager",
    );
    expect(profile.journeys["employee-read"].action).toBe("employee.read");
    // The identity entities stay as registry surfaces (list) but never claim
    // undrivable create/read evidence.
    expect(
      profile.apiRegistry.some(
        (action) =>
          action.action === "expense-approval-requirement-session.list",
      ),
    ).toBe(true);
    expect(
      profile.apiRegistry.some(
        (action) =>
          action.action === "expense-approval-requirement-session.create",
      ),
    ).toBe(false);
    expect(
      profile.apiRegistry.some(
        (action) => action.action === "expense.approve",
      ) &&
        profile.apiRegistry.some((action) =>
          action.route.includes("{recordId}"),
        ),
    ).toBe(true);
  });

  it("derives the full plan for the composed Appointment Booking product", () => {
    const profile = deriveVerificationProfile(
      composedAppointmentProductGraph(),
      identityPolicy,
    );

    expect(profile.profileKey).toBe("graph-appointment-booking-product");
    expect(profile.stepPlan.map((step) => step.stepId)).toEqual([
      "migration",
      "health",
      "service-create",
      "service-read",
      "appointment-create",
      "appointment-read",
      "appointment-request",
      "appointment-confirm",
      "appointment-reschedule",
      "appointment-cancel-requested",
      "appointment-cancel",
      "appointment-denied-request",
      "schedule-create",
      "schedule-read",
    ]);
    // The required serviceKey foreign key binds to the seeded service record
    // (run-7 regression: "Argument `service` is missing" at seed time).
    expect(profile.journeys["appointment-create"].body).toBe(
      '{"serviceKey":"sample-service","startsAt":"2026-09-01T09:00:00Z","customerName":"Verifier customerName"}',
    );
    // confirm and cancel-requested both leave the initial state directly; the
    // chain is only the create step.
    expect(profile.journeys["appointment-confirm"].chain).toEqual([
      {
        action: "appointment.create",
        sessionId: "fixture-session-customer",
        body: '{"serviceKey":"sample-service","startsAt":"2026-09-01T09:00:00Z","customerName":"Verifier customerName"}',
      },
    ]);
    expect(profile.journeys["appointment-cancel-requested"].chain).toEqual(
      profile.journeys["appointment-confirm"].chain,
    );
    // reschedule and cancel leave confirmed: the chain drives request-fresh
    // first (the path step resolves the `-fresh` template action, never the
    // seeded static route).
    expect(profile.journeys["appointment-reschedule"].chain).toEqual([
      {
        action: "appointment.create",
        sessionId: "fixture-session-customer",
        body: '{"serviceKey":"sample-service","startsAt":"2026-09-01T09:00:00Z","customerName":"Verifier customerName"}',
      },
      {
        action: "appointment.request-fresh",
        sessionId: "fixture-session-customer",
      },
    ]);
    expect(profile.journeys["appointment-cancel"].chain).toEqual(
      profile.journeys["appointment-reschedule"].chain,
    );
    expect(profile.journeys["appointment-cancel"].sessionId).toBe(
      "fixture-session-administrator",
    );
    expect(profile.journeys["appointment-confirm"].sessionId).toBe(
      "fixture-session-staff",
    );
    // schedule-create carries the date field zone-qualified.
    expect(profile.journeys["schedule-create"].body).toBe(
      '{"day":"2026-09-01T00:00:00.000Z","capacity":7}',
    );
    expect(profile.journeys["appointment-denied-request"].sessionId).toBe(
      "fixture-session-staff",
    );
    expect(
      profile.apiRegistry.some(
        (action) =>
          action.action === "appointment-booking-requirement-session.create",
      ),
    ).toBe(false);
    expect(
      profile.apiRegistry.some(
        (action) => action.action === "appointment.request",
      ) &&
        profile.apiRegistry.find(
          (action) => action.action === "appointment.request",
        )!.route,
    ).toBe("/api/appointment/sample-appointment/events/request");
  });
});
import { approvalLegacyFixtures } from "../../../packages/compiler/test/fixtures/approval-legacy.js";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";
function correctionGraph(name: "expense" | "purchase") {
  const graph = structuredClone(
    approvalLegacyFixtures[name].input.graph,
  ) as unknown as ApplicationGraphV1;
  const flow = graph.flow.flows[0]!;
  const requester = flow.transitions[0]!.roles![0]!;
  flow.states = ["draft", "submitted", "approved", "returned"];
  flow.events.push("update");
  flow.transitions[2]!.to = "returned";
  flow.transitions.push({
    from: "returned",
    event: "update",
    to: "draft",
    roles: [requester],
    effects: [{ capability: "audit.record", operation: "record" }],
  });
  graph.policy.permissions.find(
    (p) => p.resource === flow.entity && p.role === requester,
  )!.actions = ["create", "read", "update", "submit"];
  graph.domain.entities
    .find((e) => e.key === flow.entity)!
    .fields.find((f) => f.key === "status")!.values = [
    "draft",
    "submitted",
    "approved",
    "returned",
  ];
  return {
    graph,
    lock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections!,
    }),
  };
}
describe("exact correction verification protocol", () => {
  it.each(["expense", "purchase"] as const)(
    "derives immutable published %s protocol from the separate lock",
    (name) => {
      const { graph } = correctionGraph(name);
      const selections = graph.integration.compositionSelections!;
      delete graph.integration.compositionSelections;
      const lock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections,
      });
      const before = JSON.stringify({ graph, lock });
      const profile = deriveVerificationProfile(graph, lock);
      const entity = graph.flow.flows[0]!.entity;
      expect(profile.journeys[entity + "-submit"]).toMatchObject({
        replayExpectation: "stored-success",
        body: '{"expectedVersion":0}',
      });
      expect(JSON.stringify({ graph, lock })).toBe(before);
      for (const kind of ["missing-package", "binding", "checksum", "status"]) {
        const changed = structuredClone(graph);
        const packages = structuredClone(selections);
        if (kind === "missing-package") packages.pop();
        if (kind === "binding")
          packages.find((s) => s.lock.key === "core.crud")!.bindings.entityKey =
            { graphSymbol: "graph.domain." + changed.domain.entities[1]!.key };
        if (kind === "status")
          changed.domain.entities[0]!.fields.find(
            (f) => f.key === "status",
          )!.required = false;
        const invalid = createCapabilityCompositionLock({
          graphChecksum:
            kind === "checksum"
              ? "sha256:" + "0".repeat(64)
              : hashApplicationGraph(changed),
          selections: packages,
        });
        expect(
          Object.values(
            deriveVerificationProfile(changed, invalid).journeys,
          ).some(
            (j) =>
              "replayExpectation" in j &&
              j.replayExpectation === "stored-success",
          ),
        ).toBe(false);
      }
    },
  );
  it.each(["missing", "integer", "incomplete-enum", "optional"])(
    "does not select incompatible stored status %s with a matching lock",
    (kind) => {
      const { graph } = correctionGraph("expense");
      const entity = graph.domain.entities.find((e) => e.key === "expense")!;
      const status = entity.fields.find((f) => f.key === "status")!;
      if (kind === "missing") {
        entity.fields = entity.fields.filter((f) => f.key !== "status");
        entity.indexes = [];
        for (const seed of graph.domain.seedData ?? [])
          if (seed.entity === "expense") delete seed.values.status;
      }
      if (kind === "integer") {
        Object.assign(status, { type: "integer" });
        delete status.values;
        for (const seed of graph.domain.seedData ?? [])
          if (seed.entity === "expense") seed.values.status = 0;
      }
      if (kind === "incomplete-enum")
        status.values = ["draft", "submitted", "approved"];
      if (kind === "optional") status.required = false;
      const lock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections: graph.integration.compositionSelections!,
      });
      const profile = deriveVerificationProfile(graph, lock);
      expect(
        Object.values(profile.journeys).some(
          (j) =>
            "replayExpectation" in j &&
            j.replayExpectation === "stored-success",
        ),
      ).toBe(false);
    },
  );
  it.each(["shape", "grant", "page", "binding", "lock", "checksum"])(
    "leaves malformed %s outside correction protocol",
    (kind) => {
      const { graph, lock: originalLock } = correctionGraph("expense");
      let lock = structuredClone(originalLock);
      if (kind === "shape") graph.flow.flows[0]!.transitions.pop();
      if (kind === "grant")
        graph.policy.permissions.find(
          (p) => p.resource === "expense" && p.actions.includes("submit"),
        )!.actions = ["create", "read", "submit"];
      if (kind === "page")
        graph.page.pages
          .flatMap((p) => p.blocks)
          .find((b) => b.type === "queue")!.type = "list";
      if (kind === "binding")
        graph.integration.compositionSelections![0]!.bindings = {};
      if (kind === "lock") lock.packages[0]!.lock.version = "9.9.9";
      if (kind !== "lock" && kind !== "checksum")
        lock = {
          ...lock,
          applicationGraphChecksum: hashApplicationGraph(graph),
          packages: structuredClone(graph.integration.compositionSelections!),
        };
      if (kind === "checksum")
        lock.applicationGraphChecksum = "sha256:" + "0".repeat(64);
      const profile = deriveVerificationProfile(graph, lock);
      expect(
        Object.values(profile.journeys).some(
          (j) =>
            "replayExpectation" in j &&
            j.replayExpectation === "stored-success",
        ),
      ).toBe(false);
      expect(
        JSON.parse(profile.journeys["expense-create"]!.body!),
      ).not.toHaveProperty("values");
    },
  );
  it.each(["expense", "purchase"] as const)(
    "derives header keys, values and every versioned mutation for %s",
    (name) => {
      const { graph, lock } = correctionGraph(name);
      const entity = graph.flow.flows[0]!.entity;
      const profile = deriveVerificationProfile(graph, lock);
      expect(
        JSON.parse(profile.journeys[entity + "-create"]!.body!),
      ).toHaveProperty("values");
      expect(profile.journeys[entity + "-submit"]).toMatchObject({
        replayExpectation: "stored-success",
        body: '{"expectedVersion":0}',
      });
      expect(
        profile.apiRegistry.find((a) => a.action === entity + ".approve"),
      ).toMatchObject({ method: "POST", expectedStatus: 200 });
      expect(
        profile.apiRegistry.find((a) => a.action === entity + ".update"),
      ).toMatchObject({
        method: "PATCH",
        route: "/api/" + entity + "/{recordId}",
        expectedStatus: 200,
      });
      expect(JSON.parse(profile.journeys[entity + "-reject"]!.body!)).toEqual({
        expectedVersion: 1,
        reason: "Please correct this verification fixture.",
      });
      expect(
        JSON.parse(profile.journeys[entity + "-update"]!.body!),
      ).toMatchObject({ expectedVersion: 2, values: expect.any(Object) });
      expect(
        profile.journeys[entity + "-update"]!.chain!.map((step) =>
          JSON.parse(step.body!),
        ),
      ).toEqual([
        { values: expect.any(Object) },
        { expectedVersion: 0 },
        {
          expectedVersion: 1,
          reason: "Please correct this verification fixture.",
        },
      ]);
      expect(JSON.parse(profile.journeys[entity + "-approve"]!.body!)).toEqual({
        expectedVersion: 1,
      });
      expect(
        profile.apiRegistry.find((a) => a.action === entity + ".create")!
          .expectedStatus,
      ).toBe(201);
      for (const journey of Object.values(profile.journeys).filter(
        (j) => j.action.startsWith(entity + ".") && j.body,
      ))
        expect(journey.headers).toEqual([
          {
            name: "x-factory-idempotency-key",
            value: expect.stringMatching(/^verify-[a-f0-9]{40}$/),
          },
        ]);
    },
  );
});
