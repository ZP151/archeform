import { describe, expect, it } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  applyGraphDiffToDraft,
  createBlankApplicationDraft,
  hashApplicationGraph,
  type ApplicationGraphV1,
} from "@factory/graph";

import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const bookingBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";

/**
 * The honest generated-journey authority: for each acceptance prompt the
 * deterministic fixture + planner + composer derive the product Graph, and
 * the bundle must carry a role journey and a denied-action test derived from
 * that Graph's declared scenario — never from a product template.
 */
async function composedGraphFor(brief: string): Promise<ApplicationGraphV1> {
  const interpretation = await fixtureInterpreter.interpret({ brief });
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

function bundleInputFor(graph: ApplicationGraphV1): PublishedGraphInput {
  return {
    publishedRevisionId: `published-${graph.metadata.id}`,
    graph,
    compositionLock: createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections ?? [],
    }),
  };
}

function journeyFileFor(graph: ApplicationGraphV1): string {
  const bundle = generateApplicationBundle(bundleInputFor(graph));
  const file = bundle.files.find(
    (candidate) => candidate.path === "api/test/journey.generated.test.ts",
  );
  if (!file) throw new Error("Missing generated journey test.");
  return file.content;
}

describe("generated role journeys from Graph-declared scenarios", () => {
  it("executes the Expense submit/approve journey and its audit evidence", async () => {
    const graph = await composedGraphFor(expenseBrief);
    const journey = journeyFileFor(graph);

    expect(journey).toContain(
      'let record = await applicationRuntime.create("employee", "expense"',
    );
    expect(journey).toContain(
      'record = await applicationRuntime.transition("employee", "expense", record.id, "submit")',
    );
    expect(journey).toContain(
      'record = await applicationRuntime.transition("manager", "expense", record.id, "approve")',
    );
    expect(journey).toContain('expect(record.status).toBe("submitted")');
    expect(journey).toContain('expect(record.status).toBe("approved")');
    // The declared audit role reads the recorded evidence.
    expect(journey).toContain('applicationRuntime.auditLog("finance")');
  });

  it("executes the Appointment book and reschedule journey with its declared roles", async () => {
    const graph = await composedGraphFor(bookingBrief);
    const journey = journeyFileFor(graph);

    expect(journey).toContain(
      'let record = await applicationRuntime.create("customer", "appointment"',
    );
    expect(journey).toContain(
      'record = await applicationRuntime.transition("customer", "appointment", record.id, "request")',
    );
    expect(journey).toContain(
      'record = await applicationRuntime.transition("staff", "appointment", record.id, "reschedule")',
    );
    expect(journey).toContain('expect(record.status).toBe("confirmed")');
    expect(journey).toContain('expect(record.status).toBe("rescheduled")');
  });

  it("denies an event fired by a role outside the declared transition roles", async () => {
    const expense = journeyFileFor(await composedGraphFor(expenseBrief));
    // submit is declared for employee; manager is denied and the record
    // stays at the initial stage.
    expect(expense).toContain(
      "denies an event fired outside the declared transition roles",
    );
    expect(expense).toContain(
      'applicationRuntime.transition("manager", "expense", record.id, "submit")',
    );
    expect(expense).toContain("rejects.toThrow('cannot trigger')");
    expect(expense).toContain('expect(record.status).toBe("draft")');

    const booking = journeyFileFor(await composedGraphFor(bookingBrief));
    // request is declared for customer; staff is denied.
    expect(booking).toContain(
      'applicationRuntime.transition("staff", "appointment", record.id, "request")',
    );
    expect(booking).toContain("rejects.toThrow('cannot trigger')");
    expect(booking).toContain('expect(record.status).toBe("requested")');
  });

  it("keeps the two products' generated journeys materially different", async () => {
    const expense = journeyFileFor(await composedGraphFor(expenseBrief));
    const booking = journeyFileFor(await composedGraphFor(bookingBrief));
    expect(expense).not.toBe(booking);
    expect(expense).not.toContain("appointment");
    expect(booking).not.toContain("expense");
    expect(booking).not.toContain("employee");
  });
});
