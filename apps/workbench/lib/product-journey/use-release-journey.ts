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

interface ReleaseCheckpoint {
  state: ReleaseState;
  pendingMutation?: Promise<void>;
  verificationRequestId?: string;
}

interface OwnedPreviewRun {
  readonly id: string;
  readonly compilationId: string;
  readonly targetKey: string;
}

interface PendingPreviewStart {
  readonly compilationId: string;
  readonly targetKey: string;
  readonly result: Promise<OwnedPreviewRun>;
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
  resetRelease: () => Promise<"resumed" | "start-over">;
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

export function isLoopbackPreviewUrl(value: string | null): value is string {
  if (value === null) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      (url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "[::1]")
    );
  } catch {
    return false;
  }
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
  const targetGenerationRef = useRef(0);
  const busyRunRef = useRef<string | null>(null);
  const ownedPreviewRef = useRef<OwnedPreviewRun | null>(null);
  const pendingPreviewRef = useRef<PendingPreviewStart | null>(null);
  const previewCleanupRef = useRef<Promise<boolean> | null>(null);
  // Keep immutable identities even when their HTTP response arrives after a
  // UI deadline or navigation. A retry resumes this exact session target.
  const checkpointsRef = useRef(new Map<string, ReleaseCheckpoint>());
  const checkpointFor = useCallback((releaseTarget: ReleaseTarget) => {
    const key = `${releaseTarget.applicationGraphId}@${releaseTarget.draftRevisionId}`;
    let checkpoint = checkpointsRef.current.get(key);
    if (checkpoint === undefined) {
      checkpoint = { state: beginRelease(releaseTarget) };
      checkpointsRef.current.set(key, checkpoint);
    }
    return checkpoint;
  }, []);

  useEffect(() => {
    releaseRef.current = release;
  }, [release]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      targetGenerationRef.current += 1;
      busyRunRef.current = null;
      busyRef.current = false;
    };
  }, []);

  const isCurrentRun = useCallback(
    (targetKey: string, generation: number): boolean =>
      aliveRef.current &&
      seededTargetRef.current === targetKey &&
      targetGenerationRef.current === generation,
    [],
  );

  const stopOwnedPreview = useCallback(
    async (owned: OwnedPreviewRun): Promise<boolean> => {
      if (ownedPreviewRef.current?.id !== owned.id) return true;
      if (previewCleanupRef.current !== null) {
        return previewCleanupRef.current;
      }
      const stopping = withReleasePhaseDeadline(async (isActive) => {
        await controlPlane.stopPreviewRun(owned.id);
        while (isActive()) {
          const latest = await controlPlane.getCurrentPreviewRun(
            owned.compilationId,
          );
          if (latest?.id === owned.id && latest.status === "stopped") return;
          if (
            latest === null ||
            latest.id !== owned.id ||
            latest.status === "failed"
          ) {
            throw new Error("Preview cleanup could not be confirmed.");
          }
          await sleep(POLL_INTERVAL_MS);
        }
      })
        .then(() => {
          if (ownedPreviewRef.current?.id === owned.id) {
            ownedPreviewRef.current = null;
          }
          return true;
        })
        .catch(() => false)
        .finally(() => {
          previewCleanupRef.current = null;
        });
      previewCleanupRef.current = stopping;
      return stopping;
    },
    [controlPlane],
  );

  // A timed-out POST is still an outstanding resource obligation. Keep its
  // eventual identity and stop it before a replacement lifecycle can begin.
  const stopPreviewResources = useCallback(async (): Promise<boolean> => {
    const pending = pendingPreviewRef.current;
    if (pending !== null) {
      try {
        await withReleasePhaseDeadline(async () => {
          await pending.result;
        });
      } catch (error) {
        if (error instanceof ReleasePhaseTimeoutError) return false;
        // A lost response may still have created the compilation's run. The
        // existing current-run endpoint provides the reconciliation identity.
        let reconciled: OwnedPreviewRun | null = null;
        try {
          await withReleasePhaseDeadline(async (isActive) => {
            const current = await controlPlane.getCurrentPreviewRun(
              pending.compilationId,
            );
            if (
              isActive() &&
              current?.compilationId === pending.compilationId
            ) {
              reconciled = {
                id: current.id,
                compilationId: pending.compilationId,
                targetKey: pending.targetKey,
              };
            }
          });
        } catch {
          return false;
        }
        if (reconciled === null) return false;
        ownedPreviewRef.current = reconciled;
        if (pendingPreviewRef.current === pending)
          pendingPreviewRef.current = null;
      }
    }
    const owned = ownedPreviewRef.current;
    return owned === null || (await stopOwnedPreview(owned));
  }, [controlPlane, stopOwnedPreview]);

  // A new target must not publish while a preview started for an earlier
  // target still owns local runtime resources.  The stop endpoint targets the
  // stored run id; its confirmation is read from that run's compilation.
  useEffect(() => {
    const key =
      target === null
        ? null
        : `${target.applicationGraphId}@${target.draftRevisionId}`;
    if (key === seededTargetRef.current) return;
    const needsCleanup =
      ownedPreviewRef.current !== null || pendingPreviewRef.current !== null;
    seededTargetRef.current = key;
    targetGenerationRef.current += 1;
    const generation = targetGenerationRef.current;
    busyRunRef.current = null;
    setApprovalError(null);
    setRelease(target === null ? null : checkpointFor(target).state);
    if (needsCleanup) {
      busyRef.current = true;
      setBusy(true);
      void stopPreviewResources().then((stopped) => {
        if (
          !aliveRef.current ||
          seededTargetRef.current !== key ||
          targetGenerationRef.current !== generation
        )
          return;
        busyRef.current = false;
        setBusy(false);
        if (stopped) return;
        const next = target === null ? null : checkpointFor(target).state;
        setRelease(
          next === null ? null : releaseFailed(next, "cleanup.failed"),
        );
      });
      return;
    }
    busyRef.current = false;
    setBusy(false);
  }, [target, stopPreviewResources, checkpointFor]);

  useEffect(() => {
    return () => {
      if (
        ownedPreviewRef.current !== null ||
        pendingPreviewRef.current !== null
      ) {
        void stopPreviewResources();
      }
    };
  }, [stopPreviewResources]);

  const run = useCallback(
    async (input: {
      readonly key: string;
      readonly generation: number;
      readonly work: (isCurrent: () => boolean) => Promise<void>;
    }): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      const runKey = `${input.key}#${input.generation}`;
      busyRunRef.current = runKey;
      setBusy(true);
      try {
        await input.work(() => isCurrentRun(input.key, input.generation));
      } finally {
        if (busyRunRef.current === runKey) {
          busyRunRef.current = null;
          busyRef.current = false;
          if (isCurrentRun(input.key, input.generation)) setBusy(false);
        }
      }
    },
    [isCurrentRun],
  );

  const fail = useCallback(
    (input: {
      readonly key: string;
      readonly generation: number;
      readonly state: ReleaseState;
      readonly fallback: string;
      readonly error: unknown;
    }): void => {
      if (!isCurrentRun(input.key, input.generation)) return;
      setRelease(
        releaseFailed(input.state, safeCodeOf(input.error, input.fallback)),
      );
    },
    [isCurrentRun],
  );

  const publishRelease = useCallback((): void => {
    if (busyRef.current || target === null) return;
    const current = releaseRef.current;
    if (current === null || current.phase !== "publishing") return;
    const key = `${target.applicationGraphId}@${target.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        try {
          await withReleasePhaseDeadline(async (isActive) => {
            const checkpoint = checkpointFor(target);
            if (checkpoint.pendingMutation === undefined) {
              checkpoint.pendingMutation = controlPlane
                .publishDraft(target.applicationGraphId, target.draftRevisionId)
                .then((published) => {
                  checkpoint.state = publishingSucceeded(current, published.id);
                  checkpoint.pendingMutation = undefined;
                });
            }
            await checkpoint.pendingMutation;
            if (!isActive() || !isCurrent()) return;
            setRelease(checkpoint.state);
          });
        } catch (error) {
          fail({
            key,
            generation,
            state: current,
            fallback:
              error instanceof ReleasePhaseTimeoutError
                ? "release.failed"
                : "release.failed",
            error,
          });
        }
      },
    });
  }, [target, controlPlane, run, fail, checkpointFor]);

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
    const key = `${current.applicationGraphId}@${current.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        try {
          await withReleasePhaseDeadline(async (isActive) => {
            const checkpoint = checkpointFor(current);
            if (checkpoint.state.compilationId === undefined) {
              if (checkpoint.pendingMutation === undefined) {
                checkpoint.pendingMutation = controlPlane
                  .createCompilation(publishedRevisionId)
                  .then((queued) => {
                    checkpoint.state = compilationStarted(current, queued.id);
                    checkpoint.pendingMutation = undefined;
                  });
              }
              await checkpoint.pendingMutation;
            }
            if (!isActive() || !isCurrent()) return;
            const startedState = checkpoint.state;
            const compilationId = startedState.compilationId;
            if (compilationId === undefined)
              throw new Error("Compilation identity is missing.");
            setRelease(startedState);
            while (isCurrent() && isActive()) {
              const latest = await controlPlane.getCompilation(compilationId);
              if (!isActive() || !isCurrent()) return;
              if (!isPendingCompilation(latest.result.status)) {
                if (latest.result.status === "succeeded") {
                  checkpoint.state = compilationSucceeded(
                    startedState,
                    compilationId,
                  );
                  setRelease(checkpoint.state);
                } else if (latest.result.status === "failed") {
                  // A terminal failed job may be explicitly replaced, while
                  // its immutable Published revision remains reusable.
                  checkpoint.state = publishingSucceeded(
                    beginRelease(current),
                    publishedRevisionId,
                  );
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
          fail({
            key,
            generation,
            state: current,
            fallback:
              error instanceof ReleasePhaseTimeoutError
                ? "compilation.timeout"
                : "compilation.failed",
            error,
          });
        }
      },
    });
  }, [controlPlane, run, fail, checkpointFor]);

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
    const key = `${current.applicationGraphId}@${current.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        try {
          await withReleasePhaseDeadline(async (isActive) => {
            // No profile key: the worker derives the verification plan from the
            // Published Graph, so any composed product verifies identically.
            const checkpoint = checkpointFor(current);
            if (checkpoint.state.verificationRunId === undefined) {
              checkpoint.verificationRequestId ??= `verify-${crypto.randomUUID()}`;
              if (checkpoint.pendingMutation === undefined) {
                checkpoint.pendingMutation = controlPlane
                  .createVerificationRun(
                    compilationId,
                    checkpoint.verificationRequestId,
                  )
                  .then((queued) => {
                    checkpoint.state = verificationStarted(
                      current,
                      queued.verificationRunId,
                    );
                    checkpoint.pendingMutation = undefined;
                  });
              }
              await checkpoint.pendingMutation;
            }
            if (!isActive() || !isCurrent()) return;
            const startedState = checkpoint.state;
            const verificationRunId = startedState.verificationRunId;
            if (verificationRunId === undefined)
              throw new Error("Verification identity is missing.");
            setRelease(startedState);
            while (isCurrent() && isActive()) {
              const latest =
                await controlPlane.getVerificationRun(verificationRunId);
              if (!isActive() || !isCurrent()) return;
              if (latest.status === "succeeded") {
                const steps = evidenceStepsOf(latest);
                if (steps.length === 0) {
                  checkpoint.state = {
                    ...current,
                    verificationRunId: undefined,
                  };
                  checkpoint.verificationRequestId = undefined;
                  // A "succeeded" run that reports no steps cannot be summarized
                  // honestly; fail closed instead of fabricating counts.
                  setRelease(
                    releaseFailed(
                      startedState,
                      "verification.evidence_missing",
                    ),
                  );
                  return;
                }
                checkpoint.state = verificationSucceeded(startedState, steps);
                setRelease(checkpoint.state);
                return;
              }
              if (latest.status === "failed" || latest.status === "cancelled") {
                checkpoint.state = {
                  ...current,
                  verificationRunId: undefined,
                };
                checkpoint.verificationRequestId = undefined;
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
          fail({
            key,
            generation,
            state: current,
            fallback:
              error instanceof ReleasePhaseTimeoutError
                ? "verification.timeout"
                : "verification.failed",
            error,
          });
        }
      },
    });
  }, [controlPlane, run, fail, checkpointFor]);

  const previewRelease = useCallback((): void => {
    if (
      busyRef.current ||
      ownedPreviewRef.current !== null ||
      pendingPreviewRef.current !== null
    )
      return;
    const current = releaseRef.current;
    const compilationId = current?.compilationId;
    if (
      current === null ||
      current.phase !== "starting-preview" ||
      compilationId === undefined
    ) {
      return;
    }
    const key = `${current.applicationGraphId}@${current.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        let owned: OwnedPreviewRun | null = null;
        try {
          await withReleasePhaseDeadline(async (isActive) => {
            const pending: PendingPreviewStart = {
              compilationId,
              targetKey: key,
              result: controlPlane
                .startPreviewRun(compilationId)
                .then((started) => {
                  const acquired = {
                    id: started.id,
                    compilationId,
                    targetKey: key,
                  };
                  ownedPreviewRef.current = acquired;
                  if (pendingPreviewRef.current === pending)
                    pendingPreviewRef.current = null;
                  return acquired;
                }),
            };
            pendingPreviewRef.current = pending;
            owned = await pending.result;
            if (!isActive() || !isCurrent()) {
              await stopOwnedPreview(owned);
              return;
            }
            while (isCurrent() && isActive()) {
              const latest =
                await controlPlane.getCurrentPreviewRun(compilationId);
              if (!isActive() || !isCurrent()) return;
              if (
                latest?.id !== owned.id ||
                latest.compilationId !== compilationId
              ) {
                const stopped = await stopOwnedPreview(owned);
                if (isCurrent() && isActive())
                  setRelease(
                    releaseFailed(
                      current,
                      stopped
                        ? "runtime.preview_readiness_failed"
                        : "cleanup.failed",
                    ),
                  );
                return;
              }
              if (latest.status === "ready" && latest.previewUrl !== null) {
                if (!isLoopbackPreviewUrl(latest.previewUrl)) {
                  const stopped = await stopOwnedPreview(owned);
                  if (isCurrent() && isActive())
                    setRelease(
                      releaseFailed(
                        current,
                        stopped
                          ? "runtime.preview_readiness_failed"
                          : "cleanup.failed",
                      ),
                    );
                  return;
                }
                setRelease(
                  previewStarted(current, latest.id, latest.previewUrl),
                );
                return;
              }
              if (
                latest?.status === "failed" ||
                latest?.status === "stopped" ||
                latest === null
              ) {
                const stopped = await stopOwnedPreview(owned);
                if (isCurrent() && isActive())
                  setRelease(
                    releaseFailed(
                      current,
                      stopped ? "preview.failed" : "cleanup.failed",
                    ),
                  );
                return;
              }
              await sleep(POLL_INTERVAL_MS);
            }
          });
          if (owned !== null && !isCurrent()) {
            await stopOwnedPreview(owned);
          }
        } catch (error) {
          // Do not wait a second phase deadline for an unresolved POST here.
          // Its continuation retains ownership; explicit retry first awaits
          // cleanup through stopPreviewResources.
          const stopped =
            owned === null
              ? pendingPreviewRef.current === null
              : await stopOwnedPreview(owned);
          if (!stopped) {
            fail({
              key,
              generation,
              state: current,
              fallback: "cleanup.failed",
              error,
            });
            return;
          }
          fail({
            key,
            generation,
            state: current,
            fallback: "preview.failed",
            error,
          });
        }
      },
    });
  }, [controlPlane, run, fail, stopOwnedPreview]);

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
    const key = `${current.applicationGraphId}@${current.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        try {
          const stopped = await stopOwnedPreview({
            id: previewRunId,
            compilationId,
            targetKey: key,
          });
          if (!isCurrent()) return;
          setRelease(
            stopped
              ? previewStopped(current)
              : releaseFailed(current, "cleanup.failed"),
          );
        } catch (error) {
          fail({
            key,
            generation,
            state: current,
            fallback: "cleanup.failed",
            error,
          });
        }
      },
    });
  }, [run, fail, stopOwnedPreview]);

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
    const key = `${current.applicationGraphId}@${current.draftRevisionId}`;
    const generation = targetGenerationRef.current;
    void run({
      key,
      generation,
      work: async (isCurrent) => {
        try {
          const approved = await controlPlane.approveVerificationDraftDiff(
            verificationRunId,
            proposedDraftDiff,
          );
          if (!isCurrent()) return;
          setApprovalError(null);
          onApproved(approved.draft);
        } catch (error) {
          if (!isCurrent()) return;
          setApprovalError(safeCodeOf(error, "approval.failed"));
        }
      },
    });
  }, [controlPlane, run, onApproved]);

  const resetRelease = useCallback(async (): Promise<
    "resumed" | "start-over"
  > => {
    if (target === null || busyRef.current) return "resumed";
    let outcome: "resumed" | "start-over" = "resumed";
    const key = `${target.applicationGraphId}@${target.draftRevisionId}`;
    targetGenerationRef.current += 1;
    const generation = targetGenerationRef.current;
    busyRunRef.current = null;
    await run({
      key,
      generation,
      work: async (isCurrent) => {
        const stopped = await stopPreviewResources();
        if (!isCurrent()) return;
        setApprovalError(null);
        const checkpoint = checkpointFor(target);
        if (!stopped) {
          setRelease(releaseFailed(checkpoint.state, "cleanup.failed"));
          return;
        }
        try {
          await withReleasePhaseDeadline(async () => {
            await checkpoint.pendingMutation;
          });
          if (isCurrent()) setRelease(checkpoint.state);
        } catch (error) {
          if (!(error instanceof ReleasePhaseTimeoutError)) {
            if (checkpoint.verificationRequestId !== undefined) {
              // This endpoint is idempotent by the retained request ID.
              checkpoint.pendingMutation = undefined;
              if (isCurrent()) setRelease(checkpoint.state);
              return;
            }
            outcome = "start-over";
          }
          // An unresolved or rejected creation response is not permission to
          // issue another mutation against an identity that may already exist.
          if (isCurrent())
            setRelease(releaseFailed(checkpoint.state, "release.failed"));
        }
      },
    });
    return outcome;
  }, [run, stopPreviewResources, target, checkpointFor]);

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
