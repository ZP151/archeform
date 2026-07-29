import type { PreviewReporter } from "./preview-reporter.js";
import {
  removePreviewDirectory,
  startPreviewRun,
  stopPreviewRun,
  type PreviewRuntimeRequest,
} from "./preview-runner.js";

export type PreviewRunJob = PreviewRuntimeRequest & {
  readonly action: "start" | "stop";
  readonly compilationId: string;
};

export interface PreviewRuntime {
  start(
    artifactRoot: string,
    request: PreviewRuntimeRequest,
  ): ReturnType<typeof startPreviewRun>;
  stop(
    artifactRoot: string,
    request: PreviewRuntimeRequest,
  ): ReturnType<typeof stopPreviewRun>;
}

const runtime: PreviewRuntime = {
  start: startPreviewRun,
  stop: stopPreviewRun,
};

export async function executeQueuedPreviewRun(
  artifactRoot: string,
  job: PreviewRunJob,
  previewRuntime: PreviewRuntime = runtime,
  reporter: PreviewReporter,
  removeDirectory: typeof removePreviewDirectory = removePreviewDirectory,
): Promise<void> {
  try {
    if (job.action === "start") {
      await reporter.ready(
        job.previewRunId,
        await previewRuntime.start(artifactRoot, job),
      );
      return;
    }
    await previewRuntime.stop(artifactRoot, job);
    await removeDirectory(artifactRoot, job.rootDirectory);
    await reporter.stopped(job.previewRunId);
  } catch {
    const diagnostic =
      job.action === "start" ? "preview_start_failed" : "preview_stop_failed";
    await reporter.failed(job.previewRunId, { diagnostic });
    throw new Error("Preview run failed.");
  }
}
