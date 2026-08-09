import { describe, expect, it } from "vitest";

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

  it("fails closed on a derived step ID collision", () => {
    expect(() =>
      deriveVerificationProfile(
        expenseWithCollidingTransitionGraph(),
        identityPolicy,
      ),
    ).toThrow(VerificationContractError);
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
