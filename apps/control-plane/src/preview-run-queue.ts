import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

import { redisConnection } from "./compilation-queue.js";

export const PREVIEW_RUN_QUEUE = Symbol("PREVIEW_RUN_QUEUE");

export type PreviewRunJob = {
  readonly action: "start" | "stop";
  readonly previewRunId: string;
};

export interface PreviewRunQueue {
  enqueue(job: PreviewRunJob): Promise<void>;
}

@Injectable()
export class BullMqPreviewRunQueue implements PreviewRunQueue, OnModuleDestroy {
  private readonly queue = new Queue<PreviewRunJob>(
    process.env.FACTORY_PREVIEW_QUEUE ?? "factory-preview-runs",
    { connection: redisConnection() },
  );

  async enqueue(job: PreviewRunJob): Promise<void> {
    await this.queue.add(job.action, job, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
