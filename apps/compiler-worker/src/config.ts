export interface WorkerConfig {
  readonly redisUrl: string;
  readonly redisPassword: string | undefined;
  readonly queueName: string;
  readonly previewQueueName: string;
  readonly artifactRoot: string;
  readonly controlPlaneUrl: string;
  readonly internalWorkerToken: string;
}

export function readWorkerConfig(
  environment: Record<string, string | undefined> = process.env,
): WorkerConfig {
  const internalWorkerToken = environment.FACTORY_INTERNAL_WORKER_TOKEN;
  if (!internalWorkerToken || internalWorkerToken.trim().length === 0) {
    throw new Error("FACTORY_INTERNAL_WORKER_TOKEN must be configured.");
  }
  return {
    redisUrl: environment.REDIS_URL ?? "redis://localhost:6379",
    redisPassword: environment.FACTORY_REDIS_PASSWORD,
    queueName: environment.FACTORY_COMPILATION_QUEUE ?? "factory-compilations",
    previewQueueName:
      environment.FACTORY_PREVIEW_QUEUE ?? "factory-preview-runs",
    artifactRoot: environment.FACTORY_ARTIFACT_ROOT ?? "generated",
    controlPlaneUrl:
      environment.FACTORY_CONTROL_PLANE_URL ?? "http://localhost:3000",
    internalWorkerToken,
  };
}
