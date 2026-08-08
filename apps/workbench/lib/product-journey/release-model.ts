import type { DraftDiffV1, DraftRevisionV1 } from "@factory/graph";

import {
  appendTimelineEvent,
  createTimeline,
  type TimelineState,
} from "./timeline";

/**
 * One-action release over the immutable lifecycle of any composed product:
 * an eligible Published Draft advances publish -> compile -> isolated
 * verification -> preview, with a cleanup control. Every progress event is a
 * pure transition that fails closed on a wrong phase, a mismatched
 * identifier, or a terminal phase; failures carry only bounded safe reason
 * codes. The model holds identifiers and safe evidence summaries only — never
 * generated source, Patches, or running state — and exposes no apply surface.
 * A failed verification may carry a reviewable Draft Diff that the caller may
 * choose to review; the model never applies it.
 *
 * The model is product-agnostic: it carries no profile, entity, or
 * scenario-specific condition, so any Published Graph can advance through
 * the same release lifecycle.
 *
 * Clearly labelled: every release state states it is a local preview over
 * the Draft lifecycle, never a deployment.
 */

export type ReleasePhase =
  | "publishing"
  | "compiling"
  | "verifying"
  | "starting-preview"
  | "preview"
  | "failed"
  | "cleaned-up";

export interface ReleaseEvidenceSummary {
  readonly steps: number;
  readonly passed: number;
  readonly failed: number;
}

export interface ReleaseState {
  readonly kind: "release";
  readonly label: string;
  readonly phase: ReleasePhase;
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
  readonly publishedRevisionId?: string;
  readonly compilationId?: string;
  readonly verificationRunId?: string;
  readonly evidenceSummary?: ReleaseEvidenceSummary;
  readonly previewRunId?: string;
  readonly previewUrl?: string | null;
  readonly diagnosis?: string;
  readonly proposedDraftDiff?: DraftDiffV1;
  readonly timeline: TimelineState;
}

const RELEASE_LABEL =
  "Local preview release over the immutable Draft lifecycle (not a deployment).";

const safeReasonCode = /^[a-z][a-z0-9._-]*$/;

export class ReleaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReleaseError";
  }
}

function assertReason(reason: string): void {
  if (!safeReasonCode.test(reason)) {
    throw new ReleaseError(
      "Release diagnosis must be a bounded safe reason code.",
    );
  }
}

function requirePhase(
  state: ReleaseState,
  phase: ReleasePhase,
  action: string,
): void {
  if (state.phase !== phase) {
    throw new ReleaseError(
      `Cannot ${action} from phase '${state.phase}'; expected '${phase}'.`,
    );
  }
}

/** Only a Published Draft may enter the release pipeline. */
export function assertReleaseEligibility(draft: DraftRevisionV1): void {
  if (draft.status !== "published") {
    throw new ReleaseError(
      "Only a Published Draft is eligible for the release pipeline.",
    );
  }
}

export function beginRelease(input: {
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
}): ReleaseState {
  return {
    kind: "release",
    label: RELEASE_LABEL,
    phase: "publishing",
    applicationGraphId: input.applicationGraphId,
    draftRevisionId: input.draftRevisionId,
    timeline: appendTimelineEvent(
      createTimeline("Release evidence"),
      {
        kind: "publish",
        status: "running",
        durationMs: 0,
        title: "Publishing the Draft",
      },
    ),
  };
}

export function publishingSucceeded(
  state: ReleaseState,
  publishedRevisionId: string,
): ReleaseState {
  requirePhase(state, "publishing", "publish");
  return {
    ...state,
    phase: "compiling",
    publishedRevisionId,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "publish",
      status: "succeeded",
      durationMs: 0,
      title: "Draft published as an immutable revision",
    }),
  };
}

export function compilationStarted(
  state: ReleaseState,
  compilationId: string,
): ReleaseState {
  requirePhase(state, "compiling", "compile");
  return {
    ...state,
    phase: "compiling",
    compilationId,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "compile",
      status: "running",
      durationMs: 0,
      title: "Compiling the Published Graph",
    }),
  };
}

export function compilationSucceeded(
  state: ReleaseState,
  compilationId: string,
): ReleaseState {
  requirePhase(state, "compiling", "complete compilation");
  if (state.compilationId !== compilationId) {
    throw new ReleaseError(
      `Compilation '${compilationId}' does not match the started compilation.`,
    );
  }
  return {
    ...state,
    phase: "verifying",
    timeline: appendTimelineEvent(state.timeline, {
      kind: "compile",
      status: "succeeded",
      durationMs: 0,
      title: "Compilation succeeded",
    }),
  };
}

export function verificationStarted(
  state: ReleaseState,
  verificationRunId: string,
): ReleaseState {
  requirePhase(state, "verifying", "verify");
  return {
    ...state,
    phase: "verifying",
    verificationRunId,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "verify",
      status: "running",
      durationMs: 0,
      title: "Isolated verification run started",
    }),
  };
}

export function evidenceSummaryOf(
  steps: readonly { readonly stepId: string; readonly status: string }[],
): ReleaseEvidenceSummary {
  // Evidence steps report the isolated lifecycle statuses (passed / failed /
  // skipped); skipped steps count toward the total but neither side.
  let passed = 0;
  let failed = 0;
  for (const step of steps) {
    if (step.status === "passed") passed += 1;
    if (step.status === "failed") failed += 1;
  }
  return { steps: steps.length, passed, failed };
}

export function verificationSucceeded(
  state: ReleaseState,
  steps: readonly { readonly stepId: string; readonly status: string }[],
): ReleaseState {
  requirePhase(state, "verifying", "complete verification");
  return {
    ...state,
    phase: "starting-preview",
    evidenceSummary: evidenceSummaryOf(steps),
    timeline: appendTimelineEvent(state.timeline, {
      kind: "verify",
      status: "succeeded",
      durationMs: 0,
      title: "Isolated verification passed",
    }),
  };
}

export function previewStarted(
  state: ReleaseState,
  previewRunId: string,
  previewUrl: string,
): ReleaseState {
  requirePhase(state, "starting-preview", "start the preview");
  // The runtime preview URL stays on the state; it never enters the timeline
  // (timeline links are app-relative evidence refs only).
  return {
    ...state,
    phase: "preview",
    previewRunId,
    previewUrl,
    timeline: appendTimelineEvent(state.timeline, {
      kind: "boot",
      status: "succeeded",
      durationMs: 0,
      title: "Isolated preview booted",
    }),
  };
}

export function previewStopped(state: ReleaseState): ReleaseState {
  requirePhase(state, "preview", "stop the preview");
  if (state.previewRunId === undefined) {
    throw new ReleaseError("Cannot stop a preview that was never started.");
  }
  return {
    ...state,
    phase: "cleaned-up",
    timeline: appendTimelineEvent(state.timeline, {
      kind: "cleanup",
      status: "succeeded",
      durationMs: 0,
      title: "Preview stopped and cleaned up",
    }),
  };
}

/**
 * Fails the release from any non-terminal phase with a bounded safe reason
 * code. An optional reviewable Draft Diff may be carried for review; it is
 * never applied here.
 */
export function releaseFailed(
  state: ReleaseState,
  reason: string,
  proposedDraftDiff?: DraftDiffV1,
): ReleaseState {
  if (state.phase === "failed" || state.phase === "cleaned-up") {
    throw new ReleaseError(`Cannot fail a release in phase '${state.phase}'.`);
  }
  assertReason(reason);
  return {
    ...state,
    phase: "failed",
    diagnosis: reason,
    ...(proposedDraftDiff === undefined ? {} : { proposedDraftDiff }),
    timeline: appendTimelineEvent(state.timeline, {
      kind: "diagnosis",
      status: "failed",
      durationMs: 0,
      reason,
      title: "Release stopped with a bounded safe diagnosis",
    }),
  };
}
