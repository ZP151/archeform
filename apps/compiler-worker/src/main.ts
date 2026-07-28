import { Queue, Worker } from "bullmq";

import { readWorkerConfig } from "./config.js";

const config = readWorkerConfig();
const connection = { url: config.redisUrl };

const queue = new Queue(config.queueName, { connection });
const worker = new Worker(
  config.queueName,
  async (job) => {
    // A later slice invokes the deterministic target registry. This bootstrap
    // intentionally acknowledges no arbitrary code or provider payload.
    return { compilationId: job.data.compilationId, status: "queued" };
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
