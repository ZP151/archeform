import { describe, expect, it } from "vitest";

import { readWorkerConfig } from "../src/config.js";

describe("worker configuration", () => {
  it("uses a local Redis default for development", () => {
    expect(readWorkerConfig({})).toEqual({
      redisUrl: "redis://localhost:6379",
      queueName: "factory-compilations",
      previewQueueName: "factory-preview-runs",
      artifactRoot: "generated",
      controlPlaneUrl: "http://localhost:3000",
    });
  });

  it("accepts explicit infrastructure settings", () => {
    expect(
      readWorkerConfig({
        REDIS_URL: "redis://redis:6379/2",
        FACTORY_COMPILATION_QUEUE: "integration-compilations",
        FACTORY_PREVIEW_QUEUE: "integration-previews",
        FACTORY_ARTIFACT_ROOT: "C:/artifacts",
        FACTORY_CONTROL_PLANE_URL: "http://control-plane:3000",
      }),
    ).toEqual({
      redisUrl: "redis://redis:6379/2",
      queueName: "integration-compilations",
      previewQueueName: "integration-previews",
      artifactRoot: "C:/artifacts",
      controlPlaneUrl: "http://control-plane:3000",
    });
  });
});
