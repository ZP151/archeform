import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

export const PREVIEW_RUN_QUEUE = Symbol("PREVIEW_RUN_QUEUE");

export type PreviewRunJob = {
  readonly action: "start" | "stop";
  readonly previewRunId: string;
  readonly compilationId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
};

export interface PreviewRunQueue {
  enqueue(job: PreviewRunJob): Promise<void>;
}

@Injectable()
export class BullMqPreviewRunQueue implements PreviewRunQueue, OnModuleDestroy {
  private readonly queue = new Queue<PreviewRunJob>(
    process.env.FACTORY_PREVIEW_QUEUE ?? "factory-preview-runs",
    { connection: { url: process.env.REDIS_URL ?? "redis://localhost:6379" } },
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
