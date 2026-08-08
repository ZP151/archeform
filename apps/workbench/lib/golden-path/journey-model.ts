import type {
  ApplicationGraphV1,
  DraftRevisionV1,
  RequirementSpecV1,
} from "@factory/graph";

import {
  startExpenseApprovalDiscuss,
  type DiscussSession,
} from "./discuss-model";
import type { VisualDiffEntry } from "./graph-diff-visual";
import type { PlanAlternative, PlanAlternativeKey } from "./plan-alternatives";
import { createExpenseApprovalPlanningBase } from "./planning-base";
import type { ReleaseState } from "./release-model";
import type { SimulationState } from "./simulator";
import {
  appendTimelineEvent,
  createTimeline,
  type TimelineState,
} from "./timeline";

/**
 * The Golden Path journey state machine over the S1-S6 models. The journey is
 * self-contained and deterministic: it starts with a fresh Discuss session,
 * carries the planning-base Draft lineage (base -> built -> adjustments) as
 * immutable revisions, and records every stage on one bounded evidence
 * timeline. The open application is the persistence carrier only: the
 * journey's Draft lineage is the Expense Approval Draft, and stage progress
 * fails closed until each prerequisite exists (a spec before planning, an
 * accepted plan before building, a persisted Draft before simulation, a
 * simulated journey before the one-action release).
 */

export type JourneyStage =
  "discuss" | "plan" | "build" | "simulate" | "release";

export type StageStatus = "done" | "current" | "blocked";

export interface PersistedDraft {
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
  readonly revisionNumber: number;
  readonly graph: ApplicationGraphV1;
}

export interface JourneyState {
  readonly kind: "journey";
  readonly applicationGraphId: string;
  readonly session: DiscussSession;
  readonly spec: RequirementSpecV1 | null;
  readonly alternatives: readonly PlanAlternative[] | null;
  readonly selectedAlternative: PlanAlternativeKey | null;
  readonly visualDiff: readonly VisualDiffEntry[] | null;
  readonly draftHistory: readonly DraftRevisionV1[];
  readonly adjustmentLog: readonly string[];
  readonly simulation: SimulationState | null;
  readonly persistedDraft: PersistedDraft | null;
  readonly release: ReleaseState | null;
  readonly timeline: TimelineState;
  /** Number of release-timeline events already merged into the journey timeline. */
  readonly releaseTimelineMerged: number;
}

const safeReasonCode = /^[a-z][a-z0-9._-]*$/;

/** The carrier application must be Expense Approval shaped for the journey. */
export function isExpenseApprovalApplication(
  graph: ApplicationGraphV1,
): boolean {
  return (
    graph.flow.flows.some((flow) => flow.id === "expense-review") &&
    graph.domain.entities.some((entity) => entity.key === "expense")
  );
}

export function beginGoldenPathJourney(
  graph: ApplicationGraphV1,
  applicationGraphId?: string,
): JourneyState {
  return {
    kind: "journey",
    // The control plane keys graphs by its record id, not the Graph's
    // metadata.id, so the caller's record id wins when provided.
    applicationGraphId: applicationGraphId ?? graph.metadata.id,
    session: startExpenseApprovalDiscuss(),
    spec: null,
    alternatives: null,
    selectedAlternative: null,
    visualDiff: null,
    draftHistory: [createExpenseApprovalPlanningBase()],
    adjustmentLog: [],
    simulation: null,
    persistedDraft: null,
    release: null,
    timeline: appendTimelineEvent(
      createTimeline("Golden Path journey evidence"),
      {
        kind: "journey",
        status: "succeeded",
        durationMs: 0,
        title: "Golden Path journey started",
      },
    ),
    releaseTimelineMerged: 0,
  };
}

export function currentStage(state: JourneyState): JourneyStage {
  if (state.spec === null) return "discuss";
  if (state.selectedAlternative === null) return "plan";
  if (state.persistedDraft === null) return "build";
  if (state.simulation === null && state.release === null) return "simulate";
  return "release";
}

export function stageProgress(
  state: JourneyState,
): Record<JourneyStage, StageStatus> {
  const stage = currentStage(state);
  const status = (done: boolean, own: boolean): StageStatus =>
    done ? "done" : own ? "current" : "blocked";
  return {
    discuss: status(state.spec !== null, stage === "discuss"),
    plan: status(
      state.selectedAlternative !== null,
      state.spec !== null && stage === "plan",
    ),
    build: status(
      state.persistedDraft !== null,
      state.selectedAlternative !== null && stage === "build",
    ),
    simulate: status(
      state.release !== null || state.simulation !== null,
      state.persistedDraft !== null && stage === "simulate",
    ),
    release: status(
      state.release !== null &&
        (state.release.phase === "cleaned-up" ||
          state.release.phase === "failed"),
      state.persistedDraft !== null && stage === "release",
    ),
  };
}

export function requireSpec(
  state: JourneyState,
  spec: RequirementSpecV1,
): JourneyState {
  if (state.spec !== null) {
    throw new Error("The requirement spec is already built.");
  }
  return {
    ...state,
    spec,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "discuss",
      status: "succeeded",
      durationMs: 0,
      title: "Requirement spec built",
    }),
  };
}

export function withAlternatives(
  state: JourneyState,
  alternatives: readonly PlanAlternative[],
): JourneyState {
  if (state.spec === null) {
    throw new Error("Require the requirement spec before planning.");
  }
  return {
    ...state,
    alternatives,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "plan",
      status: "succeeded",
      durationMs: 0,
      title: "Plan alternatives produced",
    }),
  };
}

export function acceptAlternative(
  state: JourneyState,
  key: PlanAlternativeKey,
  visualDiff: readonly VisualDiffEntry[],
): JourneyState {
  if (state.spec === null) {
    throw new Error("Require the requirement spec before accepting a plan.");
  }
  if (
    state.alternatives === null ||
    !state.alternatives.some((alternative) => alternative.key === key)
  ) {
    throw new Error(`Alternative '${key}' is not part of the plan surface.`);
  }
  return {
    ...state,
    selectedAlternative: key,
    visualDiff,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "plan",
      status: "succeeded",
      durationMs: 0,
      title: `Alternative '${key}' accepted`,
    }),
  };
}

function requireBuiltDraft(state: JourneyState): void {
  if (state.draftHistory.length < 2) {
    throw new Error("Build the Draft from the accepted plan first.");
  }
}

export function applyPlanToDraft(
  state: JourneyState,
  draft: DraftRevisionV1,
): JourneyState {
  if (state.selectedAlternative === null) {
    throw new Error("Accept a plan alternative before building the Draft.");
  }
  return {
    ...state,
    draftHistory: [...state.draftHistory, draft],
    timeline: appendTimelineEvent(state.timeline, {
      kind: "build",
      status: "succeeded",
      durationMs: 0,
      title: "Accepted plan applied to the Draft",
    }),
  };
}

export function applyAdjustment(
  state: JourneyState,
  draft: DraftRevisionV1,
  label: string,
): JourneyState {
  requireBuiltDraft(state);
  return {
    ...state,
    draftHistory: [...state.draftHistory, draft],
    adjustmentLog: [...state.adjustmentLog, label],
    timeline: appendTimelineEvent(state.timeline, {
      kind: "build",
      status: "succeeded",
      durationMs: 0,
      title: `Experience adjusted: ${label}`,
    }),
  };
}

export function recordDraftRestore(
  state: JourneyState,
  restored: DraftRevisionV1,
): JourneyState {
  requireBuiltDraft(state);
  return {
    ...state,
    draftHistory: [...state.draftHistory, restored],
    timeline: appendTimelineEvent(state.timeline, {
      kind: "build",
      status: "succeeded",
      durationMs: 0,
      title: "Draft restored from an earlier revision",
    }),
  };
}

export function persistDraft(
  state: JourneyState,
  persisted: PersistedDraft,
): JourneyState {
  requireBuiltDraft(state);
  return {
    ...state,
    persistedDraft: persisted,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "build",
      status: "succeeded",
      durationMs: 0,
      title: "Draft applied to the application",
    }),
  };
}

export function withSimulation(
  state: JourneyState,
  simulation: SimulationState,
): JourneyState {
  if (state.persistedDraft === null) {
    throw new Error("Apply the Draft to the application before simulating.");
  }
  return {
    ...state,
    simulation,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "simulate",
      status: "succeeded",
      durationMs: 0,
      title: "Role and data simulation started",
    }),
  };
}

export function recordSimulationDenial(
  state: JourneyState,
  reason: string,
): JourneyState {
  if (state.simulation === null) {
    throw new Error("Start the role simulation before recording denials.");
  }
  if (!safeReasonCode.test(reason)) {
    throw new Error("Simulation denial reason must be a bounded safe code.");
  }
  return {
    ...state,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "authorization-denial",
      status: "failed",
      durationMs: 0,
      reason,
      title: "Authorization denial recorded",
    }),
  };
}

export function startRelease(
  state: JourneyState,
  release: ReleaseState,
): JourneyState {
  if (state.persistedDraft === null) {
    throw new Error("Apply the Draft to the application before releasing.");
  }
  if (release.kind !== "release") {
    throw new Error("The release pipeline must be a release state.");
  }
  return mergeReleaseEvidence(
    state,
    release,
    appendTimelineEvent(state.timeline, {
      kind: "journey",
      status: "succeeded",
      durationMs: 0,
      title: "One-action release started",
    }),
  );
}

/** Carries the release's own evidence timeline into the journey timeline. */
function mergeReleaseEvidence(
  state: JourneyState,
  release: ReleaseState,
  timeline: TimelineState,
): JourneyState {
  const pending = release.timeline.events.slice(state.releaseTimelineMerged);
  let merged = timeline;
  for (const event of pending) {
    merged = appendTimelineEvent(merged, {
      kind: event.kind,
      status: event.status,
      durationMs: event.durationMs,
      title: event.title,
      reason: event.reason,
      detail: event.detail,
      links: event.links,
    });
  }
  return {
    ...state,
    release,
    timeline: merged,
    releaseTimelineMerged: release.timeline.events.length,
  };
}

/** Carries an advanced release state back into the journey. */
export function updateRelease(
  state: JourneyState,
  release: ReleaseState,
): JourneyState {
  if (state.release === null) {
    throw new Error("Start the release before updating it.");
  }
  if (release.kind !== "release") {
    throw new Error("The release pipeline must be a release state.");
  }
  return mergeReleaseEvidence(state, release, state.timeline);
}

/**
 * A reviewed, approved Draft Diff from a failed isolated verification is
 * applied as the next Draft revision by the caller. The journey records the
 * result and clears the release (never auto-restarted); the next one-action
 * release starts fresh from the applied Draft.
 */
export function applyApprovedDraftDiff(
  state: JourneyState,
  persisted: PersistedDraft,
): JourneyState {
  requireBuiltDraft(state);
  if (state.release === null) {
    throw new Error("Approve the Draft Diff only after a failed release.");
  }
  return {
    ...state,
    persistedDraft: persisted,
    release: null,
    releaseTimelineMerged: 0,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "build",
      status: "succeeded",
      durationMs: 0,
      title: "Approved Draft Diff applied as the next revision",
    }),
  };
}
