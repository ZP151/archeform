import { describe, expect, it } from "vitest";

import { VerificationContractError } from "@factory/graph";

import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import {
  appointmentBookingGraph,
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
      body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01"}',
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
    expect(profile.journeys["expense-approve"]).toEqual({
      journeyId: "expense-approve",
      action: "expense.approve",
      sessionId: "fixture-session-manager",
    });
    expect(profile.journeys["expense-reject"]).toEqual({
      journeyId: "expense-reject",
      action: "expense.reject",
      sessionId: "fixture-session-manager",
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
      {
        action: "expense.approve",
        method: "POST",
        route: "/api/expense/sample-expense/events/approve",
        expectedStatus: 201,
      },
      {
        action: "expense.reject",
        method: "POST",
        route: "/api/expense/sample-expense/events/reject",
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
    expect(profile.journeys["appointment-confirm"].sessionId).toBe(
      "fixture-session-clinic",
    );
    expect(profile.journeys["appointment-cancel"].sessionId).toBe(
      "fixture-session-customer",
    );
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
      body: '{"amount":37.5,"category":"travel","incurredOn":"2026-09-01"}',
    });
    expect(profile.journeys["expense-create"]).not.toHaveProperty("sessionId");
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
});
