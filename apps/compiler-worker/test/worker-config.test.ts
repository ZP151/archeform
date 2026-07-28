import { describe, expect, it } from "vitest";

import { readWorkerConfig } from "../src/config.js";

describe("worker configuration", () => {
  it("uses a local Redis default for development", () => {
    expect(readWorkerConfig({})).toEqual({
      redisUrl: "redis://localhost:6379",
      queueName: "factory-compilations",
    });
  });

  it("accepts explicit infrastructure settings", () => {
    expect(
      readWorkerConfig({
        REDIS_URL: "redis://redis:6379/2",
        FACTORY_COMPILATION_QUEUE: "integration-compilations",
      }),
    ).toEqual({
      redisUrl: "redis://redis:6379/2",
      queueName: "integration-compilations",
    });
  });
});
