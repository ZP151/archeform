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
  try {
    const dispatch = await dispatchClient.get(job.action, job.previewRunId);
    if (
      dispatch.action !== job.action ||
      dispatch.previewRunId !== job.previewRunId
    ) {
      throw new Error("Control Plane preview dispatch did not match the job.");
    }
    if (job.action === "start") {
      await reporter.ready(
        job.previewRunId,
        await previewRuntime.start(artifactRoot, dispatch),
      );
      return;
    }
    await previewRuntime.stop(artifactRoot, dispatch);
    await reporter.stopped(job.previewRunId);
  } catch (error) {
    const diagnostic =
      error instanceof PreviewRunFailure
        ? error.code
        : job.action === "start"
          ? "preview_start_failed"
          : "preview_stop_failed";
    await reporter.failed(job.previewRunId, { diagnostic });
    throw new Error("Preview run failed.");
  }
}
