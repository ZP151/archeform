import { describe, expect, it } from "vitest";

import { createProfileDraft } from "../profile-starters";
import {
  buildExpenseApprovalDraft,
  createExpenseApprovalDecision,
} from "./build-model";
import {
  expenseApprovalRequirementStarter,
  expenseApprovalRequirementStarterSpec,
  startExpenseApprovalDiscuss,
} from "./discuss-model";
import { visualGraphDiffFromPlan } from "./graph-diff-visual";
import type { PlanAlternativeKey } from "./plan-alternatives";
import {
  applyApprovedDraftDiff,
  beginGoldenPathJourney,
  acceptAlternative,
  applyAdjustment,
  applyPlanToDraft,
  currentStage,
  isExpenseApprovalApplication,
  persistDraft,
  recordSimulationDenial,
  recordDraftRestore,
  requireSpec,
  stageProgress,
  startRelease,
  updateRelease,
  withAlternatives,
  withSimulation,
} from "./journey-model";
import {
  createExpenseApprovalPlanningBase,
  planExpenseApprovalAlternatives,
} from "./plan-alternatives";
import {
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  previewStarted,
  publishingSucceeded,
  verificationStarted,
  verificationSucceeded,
} from "./release-model";
import { startExpenseApprovalSimulation } from "./simulator";

function plannedJourney() {
  let journey = beginGoldenPathJourney(createProfileDraft("expense-approval"));
  journey = requireSpec(journey, expenseApprovalRequirementStarterSpec());
  const alternatives = planExpenseApprovalAlternatives(
    expenseApprovalRequirementStarter(),
  );
  if (!alternatives.ok)
    throw new Error("Starter alternatives must be plan-ready.");
  journey = withAlternatives(journey, alternatives.alternatives);
  const standard = alternatives.alternatives[0]!;
  const base = createExpenseApprovalPlanningBase();
  journey = acceptAlternative(
    journey,
    standard.key,
    visualGraphDiffFromPlan(base, standard.plan),
  );
  journey = applyPlanToDraft(
    journey,
    buildExpenseApprovalDraft(standard.plan, base),
  );
  journey = applyAdjustment(
    journey,
    (() => {
      const latest = journey.draftHistory[journey.draftHistory.length - 1]!;
      return { ...latest, revision: latest.revision + 1, id: "draft-adjusted" };
    })(),
    "colour token brand adjusted",
  );
  journey = persistDraft(journey, {
    applicationGraphId: "graph-expense",
    draftRevisionId: "draft-adjusted",
    revisionNumber: 3,
    graph: journey.draftHistory[journey.draftHistory.length - 1]!.graph,
  });
  journey = withSimulation(
    journey,
    startExpenseApprovalSimulation(
      journey.draftHistory[journey.draftHistory.length - 1]!,
    ),
  );
  journey = startRelease(
    journey,
    beginRelease({
      applicationGraphId: "graph-expense",
      draftRevisionId: "draft-adjusted",
    }),
  );
  return journey;
}

describe("beginGoldenPathJourney", () => {
  it("starts a fresh deterministic journey over the Expense Approval starter", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    expect(journey.kind).toBe("journey");
    expect(journey.applicationGraphId).toMatch(/\S/);
    expect(journey.session).toMatchObject({ mode: "discuss", answers: [] });
    expect(journey.spec).toBeNull();
    expect(journey.alternatives).toBeNull();
    expect(journey.selectedAlternative).toBeNull();
    expect(journey.visualDiff).toBeNull();
    expect(journey.simulation).toBeNull();
    expect(journey.persistedDraft).toBeNull();
    expect(journey.release).toBeNull();
    expect(journey.draftHistory).toHaveLength(1);
    expect(journey.draftHistory[0]).toMatchObject({
      status: "draft",
      revision: 1,
    });
    expect(journey.timeline.events.map((event) => event.kind)).toEqual([
      "journey",
    ]);
  });

  it("uses the control-plane record id when the caller provides one", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
      "record-abc123",
    );
    expect(journey.applicationGraphId).toBe("record-abc123");
  });
});

describe("isExpenseApprovalApplication", () => {
  it("accepts the Expense Approval starter and rejects other profiles", () => {
    expect(
      isExpenseApprovalApplication(createProfileDraft("expense-approval")),
    ).toBe(true);
    expect(
      isExpenseApprovalApplication(createProfileDraft("restaurant-ordering")),
    ).toBe(false);
    expect(
      isExpenseApprovalApplication(createProfileDraft("simple-ecommerce")),
    ).toBe(false);
  });
});

describe("currentStage", () => {
  it("advances discuss -> plan -> build -> simulate -> release", () => {
    let journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    expect(currentStage(journey)).toBe("discuss");
    journey = requireSpec(journey, expenseApprovalRequirementStarterSpec());
    expect(currentStage(journey)).toBe("plan");
    const alternatives = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    if (!alternatives.ok)
      throw new Error("Starter alternatives must be plan-ready.");
    journey = withAlternatives(journey, alternatives.alternatives);
    const base = createExpenseApprovalPlanningBase();
    journey = acceptAlternative(
      journey,
      alternatives.alternatives[0]!.key,
      visualGraphDiffFromPlan(base, alternatives.alternatives[0]!.plan),
    );
    expect(currentStage(journey)).toBe("build");
    journey = applyPlanToDraft(
      journey,
      buildExpenseApprovalDraft(alternatives.alternatives[0]!.plan, base),
    );
    expect(currentStage(journey)).toBe("build");
    journey = persistDraft(journey, {
      applicationGraphId: "graph-expense",
      draftRevisionId: "draft-2",
      revisionNumber: 2,
      graph: journey.draftHistory[journey.draftHistory.length - 1]!.graph,
    });
    expect(currentStage(journey)).toBe("simulate");
    journey = withSimulation(
      journey,
      startExpenseApprovalSimulation(
        journey.draftHistory[journey.draftHistory.length - 1]!,
      ),
    );
    expect(currentStage(journey)).toBe("release");
  });
});

describe("stageProgress", () => {
  it("blocks every stage until its prerequisites exist", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    const progress = stageProgress(journey);
    expect(progress).toMatchObject({
      discuss: "current",
      plan: "blocked",
      build: "blocked",
      simulate: "blocked",
      release: "blocked",
    });
    const completed = stageProgress(plannedJourney());
    expect(completed).toMatchObject({
      discuss: "done",
      plan: "done",
      build: "done",
      simulate: "done",
      release: "current",
    });
  });
});

describe("requireSpec", () => {
  it("records the built requirement spec and its evidence", () => {
    let journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    journey = requireSpec(journey, expenseApprovalRequirementStarterSpec());
    expect(journey.spec?.requirementId).toBe("expense-approval");
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "discuss",
      status: "succeeded",
    });
  });

  it("fails closed on a repeated spec", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    const built = requireSpec(journey, expenseApprovalRequirementStarterSpec());
    expect(() =>
      requireSpec(built, expenseApprovalRequirementStarterSpec()),
    ).toThrow(/spec/i);
  });
});

describe("plan and acceptance", () => {
  it("records alternatives and the accepted one with its visual diff", () => {
    let journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    journey = requireSpec(journey, expenseApprovalRequirementStarterSpec());
    const alternatives = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    if (!alternatives.ok)
      throw new Error("Starter alternatives must be plan-ready.");
    journey = withAlternatives(journey, alternatives.alternatives);
    expect(journey.alternatives).toHaveLength(3);
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "plan",
      status: "succeeded",
    });
    const base = createExpenseApprovalPlanningBase();
    const diff = visualGraphDiffFromPlan(
      base,
      alternatives.alternatives[0]!.plan,
    );
    journey = acceptAlternative(journey, "standard", diff);
    expect(journey.selectedAlternative).toBe("standard");
    expect(journey.visualDiff).toEqual(diff);
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "plan",
      status: "succeeded",
    });
    expect(() =>
      acceptAlternative(journey, "unknown" as PlanAlternativeKey, diff),
    ).toThrow(/alternative/i);
    expect(() => acceptAlternative(journey, "standard", diff)).not.toThrow();
  });

  it("blocks planning before the requirement spec exists", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    expect(() => withAlternatives(journey, [])).toThrow(/spec/i);
    expect(() => acceptAlternative(journey, "standard", [])).toThrow(/spec/i);
  });
});

describe("draft build and adjustments", () => {
  it("appends the built Draft and each adjustment as immutable revisions", () => {
    let journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    journey = requireSpec(journey, expenseApprovalRequirementStarterSpec());
    const alternatives = planExpenseApprovalAlternatives(
      expenseApprovalRequirementStarter(),
    );
    if (!alternatives.ok)
      throw new Error("Starter alternatives must be plan-ready.");
    const base = createExpenseApprovalPlanningBase();
    journey = withAlternatives(journey, alternatives.alternatives);
    journey = acceptAlternative(
      journey,
      alternatives.alternatives[0]!.key,
      visualGraphDiffFromPlan(base, alternatives.alternatives[0]!.plan),
    );
    journey = applyPlanToDraft(
      journey,
      buildExpenseApprovalDraft(alternatives.alternatives[0]!.plan, base),
    );
    expect(journey.draftHistory).toHaveLength(2);
    expect(journey.draftHistory[1]!.revision).toBe(2);
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "build",
      status: "succeeded",
    });
    journey = applyAdjustment(
      journey,
      {
        ...journey.draftHistory[1]!,
        revision: 3,
        id: "draft-r3",
      },
      "colour token brand adjusted",
    );
    expect(journey.draftHistory).toHaveLength(3);
    expect(journey.adjustmentLog).toEqual(["colour token brand adjusted"]);
    expect(journey.draftHistory[2]!.revision).toBe(3);
  });

  it("fails closed when adjusting or restoring without a built Draft", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    expect(() => applyAdjustment(journey, {} as never, "label")).toThrow(
      /draft/i,
    );
    expect(() => recordDraftRestore(journey, {} as never)).toThrow(/draft/i);
  });

  it("records a restore as the next immutable revision", () => {
    let journey = plannedJourney();
    const restored = {
      ...journey.draftHistory[0]!,
      revision: 9,
      id: "draft-r9",
    };
    journey = recordDraftRestore(journey, restored);
    expect(journey.draftHistory.at(-1)).toBe(restored);
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "build",
      status: "succeeded",
    });
  });
});

describe("persistence and simulation", () => {
  it("requires a built Draft before persisting", () => {
    const journey = beginGoldenPathJourney(
      createProfileDraft("expense-approval"),
    );
    expect(() =>
      persistDraft(journey, {
        applicationGraphId: "graph-expense",
        draftRevisionId: "draft-1",
        revisionNumber: 1,
        graph: journey.draftHistory[0]!.graph,
      }),
    ).toThrow(/draft/i);
  });

  it("records the persisted application Draft and simulation evidence", () => {
    let journey = plannedJourney();
    expect(journey.persistedDraft).toMatchObject({
      applicationGraphId: "graph-expense",
      draftRevisionId: "draft-adjusted",
    });
    const simulateEvent = journey.timeline.events.find(
      (event) => event.kind === "simulate",
    );
    expect(simulateEvent).toMatchObject({ status: "succeeded" });
  });

  it("records authorization denials as bounded evidence", () => {
    let journey = plannedJourney();
    const before = journey.timeline.events.length;
    journey = recordSimulationDenial(journey, "policy-denied");
    const denial = journey.timeline.events.at(-1)!;
    expect(denial).toMatchObject({
      kind: "authorization-denial",
      status: "failed",
      reason: "policy-denied",
    });
    expect(journey.timeline.events.length).toBe(before + 1);
    expect(() => recordSimulationDenial(journey, "not safe reason!")).toThrow(
      /reason/i,
    );
  });
});

describe("release", () => {
  it("starts the release and merges its evidence timeline once", () => {
    const journey = plannedJourney();
    expect(journey.release?.phase).toBe("publishing");
    expect(journey.release?.kind).toBe("release");
    expect(journey.release?.timeline.events).toHaveLength(1);
    expect(journey.releaseTimelineMerged).toBe(1);
    expect(journey.timeline.events.at(-1)).toMatchObject({
      kind: "publish",
      status: "running",
    });
    expect(
      journey.timeline.events.filter((event) => event.kind === "publish"),
    ).toHaveLength(1);
  });

  it("merges each advanced release stage into the journey timeline once", () => {
    let journey = plannedJourney();
    journey = updateRelease(
      journey,
      publishingSucceeded(journey.release!, "published-1"),
    );
    journey = updateRelease(
      journey,
      compilationStarted(journey.release!, "compilation-1"),
    );
    journey = updateRelease(
      journey,
      compilationSucceeded(journey.release!, "compilation-1"),
    );
    journey = updateRelease(
      journey,
      verificationStarted(journey.release!, "verification-1"),
    );
    journey = updateRelease(
      journey,
      verificationSucceeded(journey.release!, [
        { stepId: "employee-submits-expense", status: "succeeded" },
      ]),
    );
    const previewed = previewStarted(
      journey.release!,
      "preview-1",
      "http://127.0.0.1:43101",
    );
    journey = updateRelease(journey, previewed);

    const kinds = journey.timeline.events.map((event) => event.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["publish", "compile", "verify", "boot"]),
    );
    const counts = Object.fromEntries(
      [...new Set(kinds)].map((kind) => [
        kind,
        journey.timeline.events.filter((event) => event.kind === kind).length,
      ]),
    );
    expect(counts).toMatchObject({
      publish: 2, // running + succeeded
      compile: 2, // running + succeeded
      verify: 2, // running + succeeded
      boot: 1, // succeeded only
    });
    // Re-applying the same release must not duplicate merged evidence.
    const once = journey.timeline.events.length;
    journey = updateRelease(journey, previewed);
    expect(journey.timeline.events).toHaveLength(once);
  });

  it("advances the carried release through updateRelease", () => {
    const journey = plannedJourney();
    const publishing = publishingSucceeded(journey.release!, "published-1");
    const advanced = updateRelease(journey, publishing);
    expect(advanced.release?.phase).toBe("compiling");
    expect(() => updateRelease(journey, publishing)).not.toThrow();
    expect(() =>
      updateRelease(
        { ...journey, release: null },
        beginRelease({
          applicationGraphId: "graph-expense",
          draftRevisionId: "draft-adjusted",
        }),
      ),
    ).toThrow(/release/i);
  });

  it("applies an approved Draft Diff and clears the release", () => {
    const journey = plannedJourney();
    const approved = applyApprovedDraftDiff(journey, {
      applicationGraphId: "graph-expense",
      draftRevisionId: "draft-approved",
      revisionNumber: 4,
      graph: journey.draftHistory.at(-1)!.graph,
    });
    expect(approved.persistedDraft).toMatchObject({
      draftRevisionId: "draft-approved",
    });
    expect(approved.release).toBeNull();
    expect(approved.timeline.events.at(-1)).toMatchObject({
      kind: "build",
      status: "succeeded",
    });
  });

  it("fails closed when approving a Draft Diff without a failed release", () => {
    const journey = plannedJourney();
    expect(() =>
      applyApprovedDraftDiff(
        { ...journey, release: null },
        {
          applicationGraphId: "graph-expense",
          draftRevisionId: "draft-approved",
          revisionNumber: 4,
          graph: journey.draftHistory.at(-1)!.graph,
        },
      ),
    ).toThrow(/release/i);
  });
});

describe("determinism", () => {
  it("identical journeys produce identical states", () => {
    expect(plannedJourney()).toEqual(plannedJourney());
  });
});

describe("createExpenseApprovalDecision reuse", () => {
  it("builds a checksum-bound decision for the accepted plan", () => {
    const plan = plannedJourney();
    const base = createExpenseApprovalPlanningBase();
    const decision = createExpenseApprovalDecision(
      plan.alternatives![0]!.plan,
      base,
    );
    expect(decision.decision).toBe("approved");
    expect(decision.planChecksum).toMatch(/^sha256:/);
    expect(decision.diffChecksum).toMatch(/^sha256:/);
  });
});
