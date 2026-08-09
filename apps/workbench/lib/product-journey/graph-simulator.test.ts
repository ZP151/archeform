import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  dispatchGraphSimulationEvent,
  startGraphSimulation,
} from "./graph-simulator";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const bookingBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

/**
 * The honest simulation authority: the same deterministic fixture + planner +
 * composer the Workbench journey uses, so the simulator runs the exact
 * composed Graphs the products publish.
 */
async function composedGraphFor(brief: string): Promise<ApplicationGraphV1> {
  const interpretation = await fixtureInterpreter.interpret({
    brief,
    answers: {},
  });
  const baseDraft = createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: interpretation.spec.requirementId,
  });
  const [standard] = planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  const { diff } = composeProductDraft({
    plan: standard.plan,
    blueprint: interpretation.blueprint,
    baseDraft,
  });
  return applyGraphDiffToDraft(baseDraft, diff).graph;
}

describe("graph simulation on composed products", () => {
  it("starts the declared expense scenario at the seeded record stage", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const state = startGraphSimulation(graph, "expense-approval");
    expect(state.scenarioKey).toBe("expense-approval");
    expect(state.flow.entity).toBe("expense");
    expect(state.flow.initialState).toBe("draft");
    expect(state.records).toEqual([
      expect.objectContaining({ id: "sample-expense", stage: "draft" }),
    ]);
    expect(state.transitions.map((transition) => transition.event)).toEqual(
      expect.arrayContaining(["submit", "approve", "reject"]),
    );
  });

  it("executes the Expense submit/approve journey with the audit effect from declared transitions", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const state = startGraphSimulation(graph, "expense-approval");
    const recordId = state.records[0].id;

    const submitted = dispatchGraphSimulationEvent(state, {
      roleKey: "employee",
      eventKey: "submit",
      recordId,
    });
    expect(submitted.records[0].stage).toBe("submitted");
    expect(submitted.records[0].history[0]).toEqual(
      expect.objectContaining({
        event: "submit",
        roleKey: "employee",
        from: "draft",
        to: "submitted",
      }),
    );

    const approved = dispatchGraphSimulationEvent(submitted, {
      roleKey: "manager",
      eventKey: "approve",
      recordId,
    });
    expect(approved.records[0].stage).toBe("approved");
    expect(approved.records[0].history).toHaveLength(2);
    // The approval decision carries the declared audit and notification
    // effects, in the order the flow declares them.
    expect(approved.records[0].history[1].effects).toEqual([
      { capability: "audit.record", operation: "record" },
      { capability: "notification.send", operation: "send" },
    ]);
  });

  it("executes the Appointment confirm, reschedule, cancel, and delete journey legs from declared transitions", async () => {
    const graph = await composedGraphFor(bookingBrief);
    const start = () => startGraphSimulation(graph, "appointment-lifecycle");

    // Booking an appointment is the customer's create journey: the seeded
    // record already starts "requested". The customer owns no transition —
    // a customer-owned "request" that confirmed the appointment would be a
    // self-confirmation, so the declared flow carries none.

    // confirm: staff confirms the requested appointment.
    const confirmed = dispatchGraphSimulationEvent(start(), {
      roleKey: "staff",
      eventKey: "confirm",
      recordId: start().records[0].id,
    });
    expect(confirmed.records[0].stage).toBe("confirmed");

    // reschedule: staff reschedules a confirmed appointment.
    const fresh = start();
    const rescheduled = dispatchGraphSimulationEvent(
      dispatchGraphSimulationEvent(fresh, {
        roleKey: "staff",
        eventKey: "confirm",
        recordId: fresh.records[0].id,
      }),
      {
        roleKey: "staff",
        eventKey: "reschedule",
        recordId: fresh.records[0].id,
      },
    );
    expect(rescheduled.records[0].stage).toBe("rescheduled");

    // cancel: an administrator cancels a confirmed appointment.
    const cancelled = dispatchGraphSimulationEvent(
      dispatchGraphSimulationEvent(fresh, {
        roleKey: "staff",
        eventKey: "confirm",
        recordId: fresh.records[0].id,
      }),
      {
        roleKey: "administrator",
        eventKey: "cancel",
        recordId: fresh.records[0].id,
      },
    );
    expect(cancelled.records[0].stage).toBe("cancelled");

    // delete: an administrator removes an appointment before confirmation.
    const cancelledEarly = dispatchGraphSimulationEvent(start(), {
      roleKey: "administrator",
      eventKey: "delete",
      recordId: start().records[0].id,
    });
    expect(cancelledEarly.records[0].stage).toBe("cancelled");
  });

  it("denies an event fired by a role outside the declared transition roles", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const state = startGraphSimulation(graph, "expense-approval");
    const recordId = state.records[0].id;

    const denied = dispatchGraphSimulationEvent(state, {
      roleKey: "manager",
      eventKey: "submit",
      recordId,
    });
    expect(denied.records[0].stage).toBe("draft");
    expect(denied.denials).toHaveLength(1);
    expect(denied.denials[0]).toEqual(
      expect.objectContaining({
        recordId,
        roleKey: "manager",
        eventKey: "submit",
      }),
    );
    expect(denied.denials[0].reason).toMatch(/cannot perform 'submit'/);
  });

  it("falls back to declared policy permissions when a transition declares no roles", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const stripped = {
      ...graph,
      flow: {
        ...graph.flow,
        flows: graph.flow.flows.map((flow) => ({
          ...flow,
          transitions: flow.transitions.map(
            ({ roles: _roles, ...rest }) => rest,
          ),
        })),
      },
    };
    const state = startGraphSimulation(stripped, "expense-approval");
    const recordId = state.records[0].id;

    // employee holds a declared `submit` permission on expense.
    const submitted = dispatchGraphSimulationEvent(state, {
      roleKey: "employee",
      eventKey: "submit",
      recordId,
    });
    expect(submitted.records[0].stage).toBe("submitted");

    // manager holds no `submit` permission, so the policy denies.
    const denied = dispatchGraphSimulationEvent(state, {
      roleKey: "manager",
      eventKey: "submit",
      recordId,
    });
    expect(denied.records[0].stage).toBe("draft");
    expect(denied.denials[0].reason).toMatch(/cannot perform 'submit'/);
  });

  it("rejects an event that is not valid from the current stage", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const state = startGraphSimulation(graph, "expense-approval");
    expect(() =>
      dispatchGraphSimulationEvent(state, {
        roleKey: "manager",
        eventKey: "approve",
        recordId: state.records[0].id,
      }),
    ).toThrow(/not valid from 'draft'/);
  });

  it("rejects unknown records and unknown scenarios", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const state = startGraphSimulation(graph, "expense-approval");
    expect(() =>
      dispatchGraphSimulationEvent(state, {
        roleKey: "employee",
        eventKey: "submit",
        recordId: "missing-record",
      }),
    ).toThrow(/Unknown record/);
    expect(() => startGraphSimulation(graph, "no-such-scenario")).toThrow(
      /Unknown scenario/,
    );
  });

  it("contains no product identifiers or profile switches", () => {
    // Resolved from the package root, which both vitest and tsc agree on.
    const simulatorSources = [
      resolve("lib/product-journey/graph-simulator.ts"),
      resolve("components/journey/role-simulator.tsx"),
    ];
    for (const filePath of simulatorSources) {
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toMatch(/expense/i);
      expect(source).not.toMatch(/appointment/i);
      expect(source).not.toMatch(/\bprofile\b/i);
    }
  });
});
