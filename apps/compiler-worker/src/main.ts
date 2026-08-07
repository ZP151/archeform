import { Queue, Worker } from "bullmq";

import { executeCompilation } from "./compilation-executor.js";
import { createControlPlaneReporter } from "./control-plane-reporter.js";
import { readWorkerConfig } from "./config.js";
import {
  executeQueuedCompilation,
  type CompilationJob,
} from "./queued-compilation.js";
import {
  createPreviewRuntime,
  executeQueuedPreviewRun,
  type PreviewRunJob,
} from "./queued-preview-run.js";
import { createPreviewReporter } from "./preview-reporter.js";
import { createPreviewDispatchClient } from "./preview-dispatch-client.js";
import {
  runDockerCompose,
  startPreviewRun,
  stopPreviewRun,
} from "./preview-runner.js";
import { createVerificationReporter } from "./verification-reporter.js";
import {
  executeQueuedVerificationRun,
  type VerificationRunInput,
} from "./verifier/verification-job.js";

const config = readWorkerConfig();
const connection = {
  url: config.redisUrl,
  ...(config.redisPassword ? { password: config.redisPassword } : {}),
};
const reporter = createControlPlaneReporter(
  config.controlPlaneUrl,
  config.internalWorkerToken,
);
const previewReporter = createPreviewReporter(
  config.controlPlaneUrl,
  config.internalWorkerToken,
);
const previewDispatchClient = createPreviewDispatchClient(
  config.controlPlaneUrl,
  config.internalWorkerToken,
);
const previewRuntime = createPreviewRuntime(config.previewOperationTimeoutMs);
const verificationReporter = createVerificationReporter(
  config.controlPlaneUrl,
  config.internalWorkerToken,
);

const queue = new Queue(config.queueName, { connection });
const worker = new Worker<CompilationJob>(
  config.queueName,
  async (job) => {
    return executeQueuedCompilation(config.artifactRoot, job.data, reporter);
  },
  { connection },
);
const previewQueue = new Queue(config.previewQueueName, { connection });
const previewWorker = new Worker<PreviewRunJob>(
  config.previewQueueName,
  async (job) =>
    executeQueuedPreviewRun(
      config.artifactRoot,
      job.data,
      previewDispatchClient,
      previewReporter,
      previewRuntime,
    ),
  { connection, concurrency: 2 },
);
const verificationQueue = new Queue(config.verificationQueueName, {
  connection,
});

/**
 * Bounded diagnostic line for queue-level verification failures. The job
 * adapter reports one terminal evidence bundle for failures inside the
 * handler, but a job can still fail at the queue layer (a stale job, a
 * malformed payload, a crash before the boundary runs); without a listener
 * that failure would be invisible to the acceptance harness. Only the job id
 * and a bounded, newline-free message are ever logged.
 */
function boundedFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return (
    raw.replace(/[\x00-\x1f\x7f]/g, " ").trim() || "unknown failure"
  ).slice(0, 180);
}

const verificationWorker = new Worker<VerificationRunInput>(
  config.verificationQueueName,
  async (job) =>
    executeQueuedVerificationRun(
      config.artifactRoot,
      job.data,
      verificationReporter,
      {
        operationTimeoutMs: config.previewOperationTimeoutMs,
        executeCompilation: async (artifactRoot, input) => {
          console.info(
            `Factory verification job ${job.id}: compiling the immutable input`,
          );
          try {
            const result = await executeCompilation(artifactRoot, input);
            console.info(
              `Factory verification job ${job.id}: compilation finished`,
            );
            return result;
          } catch (error) {
            console.error(
              `Factory verification job ${job.id}: compilation failed (${boundedFailureMessage(error)})`,
            );
            throw error;
          }
        },
        startPreviewRun: async (artifactRoot, request) => {
          console.info(
            `Factory verification job ${job.id}: booting the isolated preview`,
          );
          try {
            const result = await startPreviewRun(artifactRoot, request);
            console.info(
              `Factory verification job ${job.id}: preview boot finished`,
            );
            return result;
          } catch (error) {
            console.error(
              `Factory verification job ${job.id}: preview boot failed (${boundedFailureMessage(error)})`,
            );
            throw error;
          }
        },
        stopPreviewRun: async (artifactRoot, request) => {
          console.info(
            `Factory verification job ${job.id}: stopping the preview`,
          );
          try {
            await stopPreviewRun(artifactRoot, request);
            console.info(`Factory verification job ${job.id}: preview stopped`);
          } catch (error) {
            console.error(
              `Factory verification job ${job.id}: preview stop failed (${boundedFailureMessage(error)})`,
            );
            throw error;
          }
        },
        processRunner: runDockerCompose,
        fetch,
      },
    ),
  { connection },
);

verificationWorker.on("failed", (job, error) => {
  console.error(
    `Factory verification job ${boundedFailureMessage(job?.id ?? "unknown")} failed: ${boundedFailureMessage(error)}`,
  );
});
verificationWorker.on("stalled", (jobId) => {
  console.error(
    `Factory verification job stalled: ${boundedFailureMessage(jobId)}`,
  );
});
verificationWorker.on("error", (error) => {
  console.error(
    `Factory verification worker error: ${boundedFailureMessage(error)}`,
  );
});

worker.on("ready", () => {
  console.info(`Factory compiler worker ready for queue ${config.queueName}`);
});
previewWorker.on("ready", () => {
  console.info(
    `Factory preview worker ready for queue ${config.previewQueueName}`,
  );
});
verificationWorker.on("ready", () => {
  console.info(
    `Factory verification worker ready for queue ${config.verificationQueueName}`,
  );
});

async function shutdown(): Promise<void> {
  await Promise.all([
    worker.close(),
    queue.close(),
    previewWorker.close(),
    previewQueue.close(),
    verificationWorker.close(),
    verificationQueue.close(),
  ]);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
