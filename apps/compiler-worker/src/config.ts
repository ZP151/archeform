export interface WorkerConfig {
  readonly redisUrl: string;
  readonly queueName: string;
  readonly artifactRoot: string;
}

export function readWorkerConfig(
  environment: Record<string, string | undefined> = process.env,
): WorkerConfig {
  return {
    redisUrl: environment.REDIS_URL ?? "redis://localhost:6379",
    queueName: environment.FACTORY_COMPILATION_QUEUE ?? "factory-compilations",
    artifactRoot: environment.FACTORY_ARTIFACT_ROOT ?? "generated",
  };
}
