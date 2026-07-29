export interface WorkerConfig {
  readonly redisUrl: string;
  readonly queueName: string;
  readonly previewQueueName: string;
  readonly artifactRoot: string;
  readonly controlPlaneUrl: string;
}

export function readWorkerConfig(
  environment: Record<string, string | undefined> = process.env,
): WorkerConfig {
  return {
    redisUrl: environment.REDIS_URL ?? "redis://localhost:6379",
    queueName: environment.FACTORY_COMPILATION_QUEUE ?? "factory-compilations",
    previewQueueName:
      environment.FACTORY_PREVIEW_QUEUE ?? "factory-preview-runs",
    artifactRoot: environment.FACTORY_ARTIFACT_ROOT ?? "generated",
    controlPlaneUrl:
      environment.FACTORY_CONTROL_PLANE_URL ?? "http://localhost:3000",
  };
}
