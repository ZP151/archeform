import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DraftDiffV1 } from "@factory/graph";

import {
  ControlPlaneClient,
  ControlPlaneError,
  type WorkbenchDraft,
  type WorkbenchVerificationRun,
} from "../control-plane-client";
import { isPendingCompilation } from "../compilation-status";
import {
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  previewStarted,
  previewStopped,
  publishingSucceeded,
  releaseFailed,
  verificationStarted,
  verificationSucceeded,
  type ReleaseState,
} from "./release-model";
import { normalizeReleaseDiagnosisCode } from "./release-diagnosis";

/**
 * The release journey controller: drives one product's immutable release
 * pipeline — publish -> compile -> isolated verification -> preview -> cleanup
 * — through the pure release state machine against the control plane. The
 * verification run is created WITHOUT a profile key, so the worker derives
 * the verification plan from the Published Graph itself: any composed product
 * (not just the static acceptance profiles) releases through the same
 * pipeline. Verification failure carries a bounded safe diagnosis and,
 * when the worker proposed one, a reviewable Draft Diff; the model never
 * applies it — approving submits the diff to the review boundary and hands
 * the new Draft revision back to the parent to adopt.
 */

export interface ReleaseTarget {
  readonly applicationGraphId: string;
  readonly draftRevisionId: string;
}

export interface ReleaseJourneyController {
  readonly release: ReleaseState | null;
  readonly busy: boolean;
  readonly canPublish: boolean;
  readonly canCompile: boolean;
  readonly canVerify: boolean;
  readonly canPreview: boolean;
  readonly canCleanup: boolean;
  readonly canApproveDraftDiff: boolean;
  readonly canReset: boolean;
  /** A bounded safe reason code when the Draft Diff approval was refused. */
  readonly approvalError: string | null;
  publishRelease: () => void;
  compileRelease: () => void;
  verifyRelease: () => void;
  previewRelease: () => void;
  cleanupRelease: () => void;
  approveDraftDiff: () => void;
  resetRelease: () => void;
}

const POLL_INTERVAL_MS = 1_500;
const RELEASE_PHASE_TIMEOUT_MS = 300_000;
const VERIFICATION_PHASE_TIMEOUT_MS = 900_000;

class ReleasePhaseTimeoutError extends Error {
  public constructor() {
    super("Release phase timed out.");
    this.name = "ReleasePhaseTimeoutError";
  }
}

function safeCodeOf(error: unknown, fallback: string): string {
  if (error instanceof ControlPlaneError) {
    switch (error.status) {
      case 400:
        return "release.rejected";
      case 404:
        return "release.not_found";
      case 409:
        return "release.conflict";
      case 503:
        return "release.unavailable";
      default:
        return fallback;
    }
  }
  return fallback;
}

/** Evidence steps, extracted defensively from the reported evidence bundle. */
function evidenceStepsOf(
  run: WorkbenchVerificationRun,
): readonly { readonly stepId: string; readonly status: string }[] {
  if (!run.evidence || typeof run.evidence !== "object") return [];
  const steps = (run.evidence as { readonly steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];
  return steps.filter(
    (step) =>
      step !== null &&
      typeof step === "object" &&
      typeof (step as { readonly stepId?: unknown }).stepId === "string" &&
      typeof (step as { readonly status?: unknown }).status === "string",
  ) as readonly { readonly stepId: string; readonly status: string }[];
}

/** The worker's diagnosis code, bounded to a safe reason code. */
function diagnosisCodeOf(run: WorkbenchVerificationRun): string {
  const code = (run.diagnosis as { readonly code?: unknown } | null)?.code;
  return normalizeReleaseDiagnosisCode(code);
}

/** The reviewable Draft Diff, only when the worker actually proposed one. */
function draftDiffOf(run: WorkbenchVerificationRun): DraftDiffV1 | undefined {
  const diff = run.draftDiff;
  if (!diff || typeof diff !== "object") return undefined;
  const candidate = diff as DraftDiffV1;
  if (
    candidate.apiVersion !== "factory.draft-diff/v1" ||
    !Array.isArray(candidate.operations)
  ) {
    return undefined;
  }
  return candidate;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bounds a remote release phase and invalidates its late continuation. Fetch
 * does not currently accept a signal through ControlPlaneClient, so the
 * active predicate prevents a response that arrives after the deadline from
 * advancing the release state.
 */
async function withReleasePhaseDeadline(
  work: (isActive: () => boolean) => Promise<void>,
  timeoutMs = RELEASE_PHASE_TIMEOUT_MS,
): Promise<void> {
  let active = true;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work(() => active),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new ReleasePhaseTimeoutError()),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    active = false;
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export function useReleaseJourney(
  controlPlaneUrl: string,
  target: ReleaseTarget | null,
  onApproved: (draft: WorkbenchDraft) => void,
): ReleaseJourneyController {
  const controlPlane = useMemo(
    () => new ControlPlaneClient(controlPlaneUrl),
    [controlPlaneUrl],
  );
  const [release, setRelease] = useState<ReleaseState | null>(null);
  const [busy, setBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const releaseRef = useRef<ReleaseState | null>(null);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const seededTargetRef = useRef<string | null>(null);

  useEffect(() => {
    releaseRef.current = release;
  }, [release]);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // A new release target re-seeds the release state machine; clearing the
  // target empties the surface.
  useEffect(() => {
    const key =
      target === null
        ? null
        : `${target.applicationGraphId}@${target.draftRevisionId}`;
    if (key === seededTargetRef.current) return;
    seededTargetRef.current = key;
    setApprovalError(null);
    setRelease(target === null ? null : beginRelease(target));
  }, [target]);

  const run = useCallback(async (work: () => Promise<void>): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await work();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const fail = useCallback((fallback: string, error: unknown): void => {
    const current = releaseRef.current;
    if (current === null) return;
    setRelease(releaseFailed(current, safeCodeOf(error, fallback)));
  }, []);

  const publishRelease = useCallback((): void => {
    if (busyRef.current || target === null) return;
    const current = releaseRef.current;
    if (current === null || current.phase !== "publishing") return;
    void run(async () => {
      try {
        const published = await controlPlane.publishDraft(
          target.applicationGraphId,
          target.draftRevisionId,
        );
        const latest = releaseRef.current;
        if (latest === null) return;
        setRelease(publishingSucceeded(latest, published.id));
      } catch (error) {
        fail("release.failed", error);
      }
    });
  }, [target, controlPlane, run, fail]);

  const compileRelease = useCallback((): void => {
    if (busyRef.current) return;
    const current = releaseRef.current;
    const publishedRevisionId = current?.publishedRevisionId;
    if (
      current === null ||
      current.phase !== "compiling" ||
      publishedRevisionId === undefined
    ) {
      return;
    }
    void run(async () => {
      try {
        await withReleasePhaseDeadline(async (isActive) => {
          const queued =
            await controlPlane.createCompilation(publishedRevisionId);
          if (!isActive()) return;
          const started = releaseRef.current;
          if (started === null) return;
          // The started state is held locally: the model binds the terminal
          // transition to the compilation identifier it started, and the ref
          // has not committed the started state until this action's render.
          const startedState = compilationStarted(started, queued.id);
          setRelease(startedState);
          while (aliveRef.current && isActive()) {
            const latest = await controlPlane.getCompilation(queued.id);
            if (!isActive()) return;
            if (!isPendingCompilation(latest.result.status)) {
              if (latest.result.status === "succeeded") {
                setRelease(compilationSucceeded(startedState, queued.id));
              } else if (latest.result.status === "failed") {
                setRelease(
                  releaseFailed(startedState, latest.result.failureCode),
                );
              }
              return;
            }
            await sleep(POLL_INTERVAL_MS);
          }
        });
      } catch (error) {
        fail(
          error instanceof ReleasePhaseTimeoutError
            ? "compilation.timeout"
            : "compilation.failed",
          error,
        );
      }
    });
  }, [controlPlane, run, fail]);

  const verifyRelease = useCallback((): void => {
    if (busyRef.current) return;
    const current = releaseRef.current;
    const compilationId = current?.compilationId;
    if (
      current === null ||
      current.phase !== "verifying" ||
      compilationId === undefined
    ) {
      return;
    }
    void run(async () => {
      try {
        await withReleasePhaseDeadline(async (isActive) => {
          // No profile key: the worker derives the verification plan from the
          // Published Graph, so any composed product verifies identically.
          const queued = await controlPlane.createVerificationRun(
            compilationId,
            `verify-${crypto.randomUUID()}`,
          );
          if (!isActive()) return;
          const started = releaseRef.current;
          if (started === null) return;
          // The started state is held locally for the same reason as the
          // compilation: the terminal transition must see the verification run
          // identifier the model bound, which the ref cannot show until this
          // action's render commits.
          const startedState = verificationStarted(
            started,
            queued.verificationRunId,
          );
          setRelease(startedState);
          while (aliveRef.current && isActive()) {
            const latest = await controlPlane.getVerificationRun(
              queued.verificationRunId,
            );
            if (!isActive()) return;
            if (latest.status === "succeeded") {
              const steps = evidenceStepsOf(latest);
              if (steps.length === 0) {
                // A "succeeded" run that reports no steps cannot be summarized
                // honestly; fail closed instead of fabricating counts.
                setRelease(
                  releaseFailed(startedState, "verification.evidence_missing"),
                );
                return;
              }
              setRelease(verificationSucceeded(startedState, steps));
              return;
            }
            if (latest.status === "failed" || latest.status === "cancelled") {
              setRelease(
                releaseFailed(
                  startedState,
                  latest.status === "cancelled"
                    ? "verification.cancelled"
                    : diagnosisCodeOf(latest),
                  draftDiffOf(latest),
                ),
              );
              return;
            }
            await sleep(POLL_INTERVAL_MS);
          }
        }, VERIFICATION_PHASE_TIMEOUT_MS);
      } catch (error) {
        fail(
          error instanceof ReleasePhaseTimeoutError
            ? "verification.timeout"
            : "verification.failed",
          error,
        );
      }
    });
  }, [controlPlane, run, fail]);

  const previewRelease = useCallback((): void => {
    if (busyRef.current) return;
    const current = releaseRef.current;
    const compilationId = current?.compilationId;
    if (
      current === null ||
      current.phase !== "starting-preview" ||
      compilationId === undefined
    ) {
      return;
    }
    void run(async () => {
      try {
        const started = await controlPlane.startPreviewRun(compilationId);
        while (aliveRef.current) {
          const latest = await controlPlane.getCurrentPreviewRun(compilationId);
          if (latest?.status === "ready" && latest.previewUrl !== null) {
            const at = releaseRef.current;
            if (at === null) return;
            setRelease(previewStarted(at, latest.id, latest.previewUrl));
            return;
          }
          if (
            latest?.status === "failed" ||
            latest?.status === "stopped" ||
            latest === null
          ) {
            const at = releaseRef.current;
            if (at === null) return;
            setRelease(releaseFailed(at, "preview.failed"));
            return;
          }
          await sleep(POLL_INTERVAL_MS);
        }
      } catch (error) {
        fail("preview.failed", error);
      }
    });
  }, [controlPlane, run, fail]);

  const cleanupRelease = useCallback((): void => {
    if (busyRef.current) return;
    const current = releaseRef.current;
    const previewRunId = current?.previewRunId;
    const compilationId = current?.compilationId;
    if (
      current === null ||
      current.phase !== "preview" ||
      previewRunId === undefined ||
      compilationId === undefined
    ) {
      return;
    }
    void run(async () => {
      try {
        // The stop endpoint only enqueues the worker action; the preview-run
        // row reaches "stopped" only after the worker confirms the compose
        // project and its artifact directory are gone. The cleaned-up phase
        // must never be shown before that confirmation.
        await controlPlane.stopPreviewRun(previewRunId);
        while (aliveRef.current) {
          const latest = await controlPlane.getCurrentPreviewRun(compilationId);
          if (latest?.status === "stopped") {
            const at = releaseRef.current;
            if (at === null) return;
            setRelease(previewStopped(at));
            return;
          }
          if (latest?.status === "failed" || latest === null) {
            const at = releaseRef.current;
            if (at === null) return;
            setRelease(releaseFailed(at, "cleanup.failed"));
            return;
          }
          await sleep(POLL_INTERVAL_MS);
        }
      } catch (error) {
        fail("cleanup.failed", error);
      }
    });
  }, [controlPlane, run, fail]);

  const approveDraftDiff = useCallback((): void => {
    if (busyRef.current) return;
    const current = releaseRef.current;
    const verificationRunId = current?.verificationRunId;
    const proposedDraftDiff = current?.proposedDraftDiff;
    if (
      current === null ||
      current.phase !== "failed" ||
      proposedDraftDiff === undefined ||
      verificationRunId === undefined
    ) {
      return;
    }
    void run(async () => {
      try {
        const approved = await controlPlane.approveVerificationDraftDiff(
          verificationRunId,
          proposedDraftDiff,
        );
        setApprovalError(null);
        onApproved(approved.draft);
      } catch (error) {
        setApprovalError(safeCodeOf(error, "approval.failed"));
      }
    });
  }, [controlPlane, run, onApproved]);

  const resetRelease = useCallback((): void => {
    if (target === null) return;
    setApprovalError(null);
    setRelease(beginRelease(target));
  }, [target]);

  return {
    release,
    busy,
    canPublish: release !== null && release.phase === "publishing" && !busy,
    canCompile:
      release !== null &&
      release.phase === "compiling" &&
      release.publishedRevisionId !== undefined &&
      !busy,
    canVerify:
      release !== null &&
      release.phase === "verifying" &&
      release.compilationId !== undefined &&
      !busy,
    canPreview:
      release !== null &&
      release.phase === "starting-preview" &&
      release.compilationId !== undefined &&
      !busy,
    canCleanup:
      release !== null &&
      release.phase === "preview" &&
      release.previewRunId !== undefined &&
      !busy,
    canApproveDraftDiff:
      release !== null &&
      release.phase === "failed" &&
      release.proposedDraftDiff !== undefined &&
      !busy,
    canReset:
      release !== null &&
      (release.phase === "failed" || release.phase === "cleaned-up") &&
      !busy,
    approvalError,
    publishRelease,
    compileRelease,
    verifyRelease,
    previewRelease,
    cleanupRelease,
    approveDraftDiff,
    resetRelease,
  };
}
