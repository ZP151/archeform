import type {
  PreviewDispatch,
  PreviewDispatchAction,
  PreviewDispatchClient,
} from "./preview-dispatch-client.js";
import type { PreviewReporter } from "./preview-reporter.js";
import {
  PreviewRunFailure,
  startPreviewRun,
  stopPreviewRun,
} from "./preview-runner.js";

export type PreviewRunJob = {
  readonly action: PreviewDispatchAction;
  readonly previewRunId: string;
};

export interface PreviewRuntime {
  start(
    artifactRoot: string,
    request: PreviewDispatch,
  ): ReturnType<typeof startPreviewRun>;
  stop(
    artifactRoot: string,
    request: PreviewDispatch,
  ): ReturnType<typeof stopPreviewRun>;
}

const runtime: PreviewRuntime = {
  start: startPreviewRun,
  stop: stopPreviewRun,
};

type QueuedPreviewStart = {
  stopRequested: boolean;
  runtimeEntered: boolean;
  readonly settled: Promise<void>;
  settle(): void;
};

const queuedPreviewStarts = new Map<string, QueuedPreviewStart>();
const skippedPreviewStarts = new Set<string>();

function registerQueuedPreviewStart(previewRunId: string): QueuedPreviewStart {
  let settle: () => void = () => undefined;
  const queuedStart: QueuedPreviewStart = {
    stopRequested: false,
    runtimeEntered: false,
    settled: new Promise<void>((resolvePromise) => {
      settle = resolvePromise;
    }),
    settle: () => settle(),
  };
  queuedPreviewStarts.set(previewRunId, queuedStart);
  return queuedStart;
}

export function createPreviewRuntime(
  operationTimeoutMs: number,
): PreviewRuntime {
  const options = { operationTimeoutMs };
  return {
    start: (artifactRoot, request) =>
      startPreviewRun(artifactRoot, request, undefined, options),
    stop: (artifactRoot, request) =>
      stopPreviewRun(artifactRoot, request, undefined, options),
  };
}

function previewRunJob(input: unknown): PreviewRunJob {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid preview queue job.");
  }
  const record = input as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "action" ||
    keys[1] !== "previewRunId" ||
    (record.action !== "start" && record.action !== "stop") ||
    typeof record.previewRunId !== "string" ||
    record.previewRunId.trim().length === 0
  ) {
    throw new Error("Invalid preview queue job.");
  }
  return {
    action: record.action,
    previewRunId: record.previewRunId,
  };
}

export async function executeQueuedPreviewRun(
  artifactRoot: string,
  input: unknown,
  dispatchClient: PreviewDispatchClient,
  reporter: PreviewReporter,
  previewRuntime: PreviewRuntime = runtime,
): Promise<void> {
  const job = previewRunJob(input);
  const queuedStart =
    job.action === "start"
      ? registerQueuedPreviewStart(job.previewRunId)
      : queuedPreviewStarts.get(job.previewRunId);
  if (job.action === "stop" && queuedStart) {
    queuedStart.stopRequested = true;
  }
  let phase = "dispatch";
  try {
    const dispatch = await dispatchClient.get(job.action, job.previewRunId);
    if (
      dispatch.action !== job.action ||
      dispatch.previewRunId !== job.previewRunId
    ) {
      throw new Error("Control Plane preview dispatch did not match the job.");
    }
    if (job.action === "start") {
      if (queuedStart?.stopRequested) {
        skippedPreviewStarts.add(job.previewRunId);
        return;
      }
      if (queuedStart) queuedStart.runtimeEntered = true;
      phase = "runtime-start";
      const evidence = await previewRuntime.start(artifactRoot, dispatch);
      phase = "ready-evidence";
      await reporter.ready(job.previewRunId, evidence);
      return;
    }
    if (queuedStart && !queuedStart.runtimeEntered) {
      await queuedStart.settled;
    }
    if (skippedPreviewStarts.has(job.previewRunId)) {
      await reporter.stopped(job.previewRunId);
      skippedPreviewStarts.delete(job.previewRunId);
      return;
    }
    phase = "runtime-stop";
    await previewRuntime.stop(artifactRoot, dispatch);
    phase = "stopped-evidence";
    await reporter.stopped(job.previewRunId);
  } catch (error) {
    if (
      job.action === "start" &&
      (queuedStart?.stopRequested ||
        (error instanceof PreviewRunFailure &&
          error.code === "preview_start_cancelled"))
    ) {
      if (!queuedStart?.runtimeEntered) {
        skippedPreviewStarts.add(job.previewRunId);
      }
      return;
    }
    const diagnostic =
      error instanceof PreviewRunFailure
        ? error.code
        : job.action === "start"
          ? "preview_start_failed"
          : "preview_stop_failed";
    await reporter.failed(job.previewRunId, { diagnostic });
    throw new Error(
      `Preview ${job.action} failed during ${phase} (${diagnostic}).`,
    );
  } finally {
    if (job.action === "start" && queuedStart) {
      queuedStart.settle();
      if (queuedPreviewStarts.get(job.previewRunId) === queuedStart) {
        queuedPreviewStarts.delete(job.previewRunId);
      }
    }
  }
}
