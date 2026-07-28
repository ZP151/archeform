import { Queue, Worker } from "bullmq";
import type { PublishedGraphInput } from "@factory/compiler";

import { executeCompilation } from "./compilation-executor.js";
import { readWorkerConfig } from "./config.js";

const config = readWorkerConfig();
const connection = { url: config.redisUrl };

const queue = new Queue(config.queueName, { connection });
const worker = new Worker<PublishedGraphInput>(
  config.queueName,
  async (job) => {
    return executeCompilation(config.artifactRoot, job.data);
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
