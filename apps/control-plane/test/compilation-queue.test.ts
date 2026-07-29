import { describe, expect, it } from "vitest";

import { redisConnection } from "../src/compilation-queue.js";

describe("Control Plane Redis connection", () => {
  it("passes a reserved-character password separately from the Redis URL", () => {
    const password = ["local", "@", ":", "/", "?", "password"].join("");

    const connection = redisConnection({
      REDIS_URL: "redis://redis:6379",
      FACTORY_REDIS_PASSWORD: password,
    });

    expect(connection).toEqual({
      url: "redis://redis:6379",
      password,
    });
    expect(connection.url).not.toContain(password);
  });
});
