import { Queue, Worker } from "bullmq";

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

worker.on("ready", () => {
  console.info(`Factory compiler worker ready for queue ${config.queueName}`);
});
previewWorker.on("ready", () => {
  console.info(
    `Factory preview worker ready for queue ${config.previewQueueName}`,
  );
});

async function shutdown(): Promise<void> {
  await Promise.all([
    worker.close(),
    queue.close(),
    previewWorker.close(),
    previewQueue.close(),
  ]);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
