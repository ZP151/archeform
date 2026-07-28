import { Queue, Worker } from "bullmq";

import { createControlPlaneReporter } from "./control-plane-reporter.js";
import { readWorkerConfig } from "./config.js";
import {
  executeQueuedCompilation,
  type CompilationJob,
} from "./queued-compilation.js";

const config = readWorkerConfig();
const connection = { url: config.redisUrl };
const reporter = createControlPlaneReporter(config.controlPlaneUrl);

const queue = new Queue(config.queueName, { connection });
const worker = new Worker<CompilationJob>(
  config.queueName,
  async (job) => {
    return executeQueuedCompilation(config.artifactRoot, job.data, reporter);
  },
  { connection },
);

worker.on("ready", () => {
  console.info(`Factory compiler worker ready for queue ${config.queueName}`);
});

async function shutdown(): Promise<void> {
  await Promise.all([worker.close(), queue.close()]);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
