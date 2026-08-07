import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

import type { CapabilityCompositionLockV1 } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

import { redisConnection } from "./compilation-queue.js";

export const VERIFICATION_RUN_QUEUE = Symbol("VERIFICATION_RUN_QUEUE");

/**
 * The immutable verification job payload. The worker receives exactly this
 * snapshot: the run identity, the compilation identity, the profile key, and
 * the Published Graph + composition lock + artifact manifest the compilation
 * recorded. The graph is intentionally NOT an exchange envelope — the worker
 * validates the exact keys fail closed before anything runs.
 */
export interface VerificationJob {
  readonly verificationRunId: string;
  readonly compilationId: string;
  readonly profileKey: string;
  readonly publishedRevisionId: string;
  readonly graph: ApplicationGraphV1;
  readonly compositionLock: CapabilityCompositionLockV1;
  readonly artifacts: readonly {
    readonly path: string;
    readonly digest: string;
    readonly sizeBytes: number;
  }[];
}

export interface VerificationRunQueue {
  enqueue(job: VerificationJob): Promise<void>;
}

/**
 * The queue boundary keeps the verification service independent from BullMQ.
 * Jobs are enqueued only for freshly created runs; idempotent retries return
 * the existing run without re-enqueueing.
 */
@Injectable()
export class BullMqVerificationRunQueue
  implements VerificationRunQueue, OnModuleDestroy
{
  private readonly queue = new Queue<VerificationJob>(
    process.env.FACTORY_VERIFICATION_QUEUE ?? "factory-verification-runs",
    { connection: redisConnection() },
  );

  async enqueue(job: VerificationJob): Promise<void> {
    await this.queue.add("verify", job, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
