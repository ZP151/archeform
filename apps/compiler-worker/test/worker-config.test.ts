import { describe, expect, it } from "vitest";

import { readWorkerConfig } from "../src/config.js";

describe("worker configuration", () => {
  it("requires an internal Worker token without providing a default", () => {
    expect(() => readWorkerConfig({})).toThrow(
      "FACTORY_INTERNAL_WORKER_TOKEN must be configured.",
    );
    expect(() =>
      readWorkerConfig({ FACTORY_INTERNAL_WORKER_TOKEN: "   " }),
    ).toThrow("FACTORY_INTERNAL_WORKER_TOKEN must be configured.");
  });

  it("uses local non-secret infrastructure defaults", () => {
    expect(
      readWorkerConfig({
        FACTORY_INTERNAL_WORKER_TOKEN: "configured-worker-token",
      }),
    ).toEqual({
      redisUrl: "redis://localhost:6379",
      queueName: "factory-compilations",
      previewQueueName: "factory-preview-runs",
      verificationQueueName: "factory-verification-runs",
      previewOperationTimeoutMs: 600_000,
      artifactRoot: "generated",
      controlPlaneUrl: "http://localhost:3000",
      internalWorkerToken: "configured-worker-token",
      redisPassword: undefined,
    });
  });

  it("accepts explicit infrastructure settings", () => {
    const redisPassword = ["local", "@", ":", "/", "?", "password"].join("");
    expect(
      readWorkerConfig({
        REDIS_URL: "redis://redis:6379/2",
        FACTORY_REDIS_PASSWORD: redisPassword,
        FACTORY_COMPILATION_QUEUE: "integration-compilations",
        FACTORY_PREVIEW_QUEUE: "integration-previews",
        FACTORY_VERIFICATION_QUEUE: "integration-verifications",
        FACTORY_PREVIEW_OPERATION_TIMEOUT_MS: "120000",
        FACTORY_ARTIFACT_ROOT: "C:/artifacts",
        FACTORY_CONTROL_PLANE_URL: "http://control-plane:3000",
        FACTORY_INTERNAL_WORKER_TOKEN: "configured-worker-token",
      }),
    ).toEqual({
      redisUrl: "redis://redis:6379/2",
      queueName: "integration-compilations",
      previewQueueName: "integration-previews",
      verificationQueueName: "integration-verifications",
      previewOperationTimeoutMs: 120_000,
      artifactRoot: "C:/artifacts",
      controlPlaneUrl: "http://control-plane:3000",
      internalWorkerToken: "configured-worker-token",
      redisPassword,
    });
  });

  it.each(["0", "-1", "100", "3600001", "not-a-number", "1000.5"])(
    "rejects unsafe preview operation timeout %s",
    (previewOperationTimeoutMs) => {
      expect(() =>
        readWorkerConfig({
          FACTORY_INTERNAL_WORKER_TOKEN: "configured-worker-token",
          FACTORY_PREVIEW_OPERATION_TIMEOUT_MS: previewOperationTimeoutMs,
        }),
      ).toThrow(
        "FACTORY_PREVIEW_OPERATION_TIMEOUT_MS must be an integer from 1000 to 3600000.",
      );
    },
  );
});
