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
const verificationWorker = new Worker<VerificationRunInput>(
  config.verificationQueueName,
  async (job) =>
    executeQueuedVerificationRun(
      config.artifactRoot,
      job.data,
      verificationReporter,
      {
        operationTimeoutMs: config.previewOperationTimeoutMs,
        executeCompilation,
        startPreviewRun,
        stopPreviewRun,
        processRunner: runDockerCompose,
        fetch,
      },
    ),
  { connection },
);

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
