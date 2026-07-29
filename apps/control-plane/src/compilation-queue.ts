import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

import type { ApplicationGraphV1 } from "@factory/graph";

export const COMPILATION_QUEUE = Symbol("COMPILATION_QUEUE");

export interface CompilationJob {
  readonly compilationId: string;
  readonly publishedRevisionId: string;
  readonly target: string;
  readonly compilerVersion: string;
  readonly graph: ApplicationGraphV1;
}

export interface CompilationQueue {
  enqueue(job: CompilationJob): Promise<void>;
}

export function redisConnection(
  environment: Record<string, string | undefined> = process.env,
) {
  const password = environment.FACTORY_REDIS_PASSWORD;
  return {
    url: environment.REDIS_URL ?? "redis://localhost:6379",
    ...(password && password.length > 0 ? { password } : {}),
  };
}

/**
 * The queue boundary keeps the lifecycle service independent from BullMQ and
 * prevents callers from supplying a Worker result. The Worker receives a
 * validated Published Graph snapshot only.
 */
@Injectable()
export class BullMqCompilationQueue
  implements CompilationQueue, OnModuleDestroy
{
  private readonly queue = new Queue<CompilationJob>(
    process.env.FACTORY_COMPILATION_QUEUE ?? "factory-compilations",
    { connection: redisConnection() },
  );

  async enqueue(job: CompilationJob): Promise<void> {
    await this.queue.add("compile", job, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
