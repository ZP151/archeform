import { describe, expect, it } from "vitest";

import {
  FixtureRequirementInterpreter,
  type RequirementInterpretationV1,
} from "@factory/adapters";
import { planProductAlternatives } from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashApplicationGraph,
  hashRequirementSpec,
} from "@factory/graph";

import {
  beginProductJourney,
  journeyTransition,
  openClarificationQuestions,
  planAlternativeSummary,
  createRequirementInput,
  type ProductJourneyState,
} from "./journey-model";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const bookingBrief =
  "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.";
const vagueBrief =
  "I need an application where people can submit things for approval.";

async function interpretedBrief(
  brief: string,
  answers: Readonly<Record<string, string>> = {},
): Promise<RequirementInterpretationV1> {
  return fixtureInterpreter.interpret({ brief, answers });
}

function stateWith(
  overrides: Partial<ProductJourneyState>,
): ProductJourneyState {
  return { ...beginProductJourney(), ...overrides };
}

/** The deterministic blank Draft the control plane creates for this spec. */
function blankDraftFor(interpretation: RequirementInterpretationV1) {
  return createBlankApplicationDraft({
    applicationId: interpretation.spec.requirementId,
    workspaceId: "local-workspace",
    name: interpretation.spec.requirementId,
  });
}

describe("Product journey model", () => {
  it("begins in the brief stage over an empty workspace", () => {
    const state = beginProductJourney();
    expect(state.kind).toBe("product-journey");
    expect(state.stage).toBe("brief");
    expect(state.brief).toBe("");
    expect(state.answers).toEqual({});
    expect(state.interpretation).toBeNull();
    expect(state.review).toBeNull();
    expect(state.alternatives).toBeNull();
    expect(state.selectedAlternativeKey).toBeNull();
    expect(state.diffChecksum).toBeNull();
    expect(state.error).toBeNull();
  });

  it("records the free-form brief as transient input only", () => {
    const state = journeyTransition(beginProductJourney(), {
      type: "submit-brief",
      brief: expenseBrief,
    });
    expect(state.stage).toBe("brief");
    expect(state.brief).toBe(expenseBrief);
    expect(state.error).toBeNull();
  });

  it("rejects an empty or oversized brief", () => {
    expect(() =>
      journeyTransition(beginProductJourney(), {
        type: "submit-brief",
        brief: "   ",
      }),
    ).toThrow(/brief/i);
    expect(() =>
      journeyTransition(beginProductJourney(), {
        type: "submit-brief",
        brief: "x".repeat(12_001),
      }),
    ).toThrow(/brief/i);
  });

  it("moves to clarifying when the interpretation asks open questions", async () => {
    const interpretation = await interpretedBrief(vagueBrief);
    const state = journeyTransition(stateWith({ stage: "brief" }), {
      type: "interpretation-accepted",
      interpretation,
    });
    expect(state.stage).toBe("clarifying");
    expect(state.interpretation).toBe(interpretation);
    expect(openClarificationQuestions(state).length).toBeGreaterThan(0);
    expect(state.review).toBeNull();
  });

  it("moves straight to planning when nothing needs clarifying", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    const state = journeyTransition(stateWith({ stage: "brief" }), {
      type: "interpretation-accepted",
      interpretation,
    });
    expect(state.stage).toBe("planning");
    expect(openClarificationQuestions(state)).toEqual([]);
  });

  it("records bounded clarification answers and re-interprets with them", async () => {
    const first = await interpretedBrief(vagueBrief);
    let state = journeyTransition(stateWith({ stage: "brief" }), {
      type: "interpretation-accepted",
      interpretation: first,
    });
    expect(state.stage).toBe("clarifying");
    // The fixture resolves its open questions under their raw spec keys; the
    // route passes the same answers map to the interpreter on re-interpret.
    // Both open questions must be answered before the fixture stops asking.
    state = journeyTransition(state, {
      type: "clarify-answered",
      answers: {
        "approval-object": "expense reports",
        "approval-levels": "single",
      },
    });
    expect(state.answers["approval-object"]).toBe("expense reports");
    expect(state.answers["approval-levels"]).toBe("single");
    const second = await interpretedBrief(vagueBrief, state.answers);
    state = journeyTransition(state, {
      type: "interpretation-accepted",
      interpretation: second,
    });
    expect(state.stage).toBe("planning");
    expect(openClarificationQuestions(state)).toEqual([]);
  });

  it("refuses oversized clarification answers", async () => {
    const interpretation = await interpretedBrief(vagueBrief);
    const state = journeyTransition(stateWith({ stage: "brief" }), {
      type: "interpretation-accepted",
      interpretation,
    });
    expect(() =>
      journeyTransition(state, {
        type: "clarify-answered",
        answers: { "q-something": "x".repeat(65) },
      }),
    ).toThrow(/answer/i);
  });

  it("stores the created review bound to the exact requirement checksum", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    let state = journeyTransition(stateWith({ stage: "brief" }), {
      type: "interpretation-accepted",
      interpretation,
    });
    state = journeyTransition(state, {
      type: "review-created",
      review: {
        id: "review-expense",
        applicationGraphId: interpretation.spec.requirementId,
        status: "planning",
        requirementChecksum: interpretation.blueprint.requirementChecksum,
        draftBaseChecksum: hashApplicationGraph(
          blankDraftFor(interpretation).graph,
        ),
      },
    });
    expect(state.stage).toBe("planning");
    expect(state.review?.requirementChecksum).toBe(
      interpretation.blueprint.requirementChecksum,
    );
  });

  it("stores the deterministic plan alternatives for comparison", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    const alternatives = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft: blankDraftFor(interpretation),
    });
    let state = stateWith({
      stage: "planning",
      interpretation,
      review: {
        id: "review-expense",
        applicationGraphId: interpretation.spec.requirementId,
        status: "planned",
        requirementChecksum: interpretation.blueprint.requirementChecksum,
        draftBaseChecksum: "sha256:blank",
      },
    });
    state = journeyTransition(state, {
      type: "alternatives-received",
      alternatives,
    });
    expect(state.alternatives?.map(({ key }) => key)).toEqual([
      "standard",
      "minimal",
    ]);
    const summaries =
      state.alternatives?.map((alternative) =>
        planAlternativeSummary(alternative.plan),
      ) ?? [];
    expect(summaries[0].planId).toBe(
      `${interpretation.spec.requirementId}-standard`,
    );
    expect(summaries[0].capabilityLocks.length).toBeGreaterThan(
      summaries[1].capabilityLocks.length,
    );
    expect(summaries[0].operations).toBeGreaterThan(0);
  });

  it("compares alternatives by bounded summary without raw plan material", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    const alternatives = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft: blankDraftFor(interpretation),
    });
    const summary = planAlternativeSummary(alternatives[0].plan);
    expect(summary).toEqual({
      planId: `${interpretation.spec.requirementId}-standard`,
      capabilityLocks: expect.any(Array),
      operations: expect.any(Number),
      complexity: expect.any(String),
      acceptanceJourneys: expect.any(Number),
    });
    expect(JSON.stringify(summary)).not.toContain("proposedOperations");
  });

  it("accepts one alternative and records the approved Diff checksum", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    const alternatives = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft: blankDraftFor(interpretation),
    });
    let state = stateWith({
      stage: "planning",
      interpretation,
      review: {
        id: "review-expense",
        applicationGraphId: interpretation.spec.requirementId,
        status: "planned",
        requirementChecksum: interpretation.blueprint.requirementChecksum,
        draftBaseChecksum: "sha256:blank",
      },
      alternatives,
    });
    state = journeyTransition(state, {
      type: "alternative-chosen",
      key: "minimal",
      diffChecksum: "sha256:diff",
    });
    expect(state.stage).toBe("reviewing");
    expect(state.selectedAlternativeKey).toBe("minimal");
    expect(state.diffChecksum).toBe("sha256:diff");
    expect(() =>
      journeyTransition(state, {
        type: "alternative-chosen",
        key: "standard",
        diffChecksum: "sha256:diff",
      }),
    ).toThrow(/already/i);
  });

  it("refuses an alternative that is not part of the plan surface", async () => {
    const state = stateWith({
      stage: "planning",
      review: {
        id: "review-expense",
        applicationGraphId: "expense-approval-requirement",
        status: "planned",
        requirementChecksum: "sha256:req",
        draftBaseChecksum: "sha256:blank",
      },
      alternatives: [],
    });
    expect(() =>
      journeyTransition(state, {
        type: "alternative-chosen",
        key: "enterprise",
        diffChecksum: "sha256:diff",
      }),
    ).toThrow(/plan surface/);
  });

  it("accepts the Diff and reaches the applied stage", async () => {
    const state = journeyTransition(
      stateWith({
        stage: "reviewing",
        selectedAlternativeKey: "standard",
        diffChecksum: "sha256:diff",
      }),
      { type: "applied" },
    );
    expect(state.stage).toBe("applied");
  });

  it("fails closed with a bounded error and returns to the brief to retry", async () => {
    let state = journeyTransition(beginProductJourney(), {
      type: "fail",
      error: "No AI provider is configured.",
    });
    expect(state.stage).toBe("failed");
    expect(state.error).toBe("No AI provider is configured.");
    state = journeyTransition(state, {
      type: "submit-brief",
      brief: expenseBrief,
    });
    expect(state.stage).toBe("brief");
    expect(state.error).toBeNull();
    expect(state.brief).toBe(expenseBrief);
  });

  it("resets an applied journey so the next product can start", () => {
    const state = journeyTransition(
      stateWith({
        stage: "applied",
        selectedAlternativeKey: "standard",
        diffChecksum: "sha256:diff",
        brief: expenseBrief,
      }),
      { type: "reset" },
    );
    expect(state).toEqual(beginProductJourney());
  });

  it("resets a failed journey to retry from a clean workspace", () => {
    const state = journeyTransition(
      stateWith({ stage: "failed", error: "No AI provider is configured." }),
      { type: "reset" },
    );
    expect(state).toEqual(beginProductJourney());
  });

  it("refuses to reset a journey with an in-flight requirement", () => {
    expect(() =>
      journeyTransition(stateWith({ stage: "clarifying", brief: vagueBrief }), {
        type: "reset",
      }),
    ).toThrow(/in-flight/i);
  });

  it("guards stage order: no review, alternatives, or choice without its prerequisite", async () => {
    const brief = stateWith({ stage: "brief" });
    expect(() =>
      journeyTransition(brief, { type: "review-created", review: {} as never }),
    ).toThrow(/interpret/i);
    const planning = stateWith({
      stage: "planning",
      interpretation: await interpretedBrief(expenseBrief),
    });
    expect(() =>
      journeyTransition(planning, {
        type: "alternatives-received",
        alternatives: [],
      }),
    ).toThrow(/review/);
    expect(() => journeyTransition(planning, { type: "applied" })).toThrow(
      /accept/i,
    );
  });

  it("proves the requirement input carries the exact spec checksum and never the brief", async () => {
    const interpretation = await interpretedBrief(expenseBrief);
    const state = stateWith({
      stage: "planning",
      brief: expenseBrief,
      interpretation,
    });
    const input = createRequirementInput(state);
    expect(input.requirement).toBe(interpretation.spec);
    expect(input.blueprint).toBe(interpretation.blueprint);
    expect(input.blueprint.requirementChecksum).toBe(
      hashRequirementSpec(input.requirement),
    );
    // The raw brief never reaches the persisted requirement boundary: the
    // parsed spec carries semantics, never the verbatim brief prose.
    expect(JSON.stringify(input)).not.toContain(
      "Managers approve or reject them, and finance can audit all decisions.",
    );
  });

  it("rejects the requirement input before an interpretation exists", () => {
    expect(() => createRequirementInput(beginProductJourney())).toThrow(
      /interpret/i,
    );
  });

  it("keeps the two acceptance briefs materially different through the journey", async () => {
    const expense = await interpretedBrief(expenseBrief);
    const booking = await interpretedBrief(bookingBrief);
    const expenseInput = createRequirementInput(
      stateWith({ stage: "planning", interpretation: expense }),
    );
    const bookingInput = createRequirementInput(
      stateWith({ stage: "planning", interpretation: booking }),
    );
    expect(expenseInput.blueprint.requirementChecksum).not.toBe(
      bookingInput.blueprint.requirementChecksum,
    );
    const expenseKeys = JSON.stringify(expenseInput.requirement.domainConcepts);
    const bookingKeys = JSON.stringify(bookingInput.requirement.domainConcepts);
    expect(expenseKeys).not.toBe(bookingKeys);
    expect(expenseKeys).toContain("expense");
    expect(bookingKeys).toContain("appointment");
  });
});
