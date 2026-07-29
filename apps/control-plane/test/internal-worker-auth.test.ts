import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { assertInternalWorkerToken } from "../src/internal-worker-auth.js";

describe("internal Worker authentication", () => {
  it.each([undefined, "", "wrong-worker-token"])(
    "rejects a missing or non-matching Worker token",
    (receivedToken) => {
      expect(() =>
        assertInternalWorkerToken(receivedToken, "configured-worker-token"),
      ).toThrow(UnauthorizedException);
    },
  );

  it("rejects every request when no Worker token is configured", () => {
    expect(() =>
      assertInternalWorkerToken("provided-worker-token", undefined),
    ).toThrow(UnauthorizedException);
  });

  it("accepts only the exact configured Worker token", () => {
    expect(() =>
      assertInternalWorkerToken(
        "configured-worker-token",
        "configured-worker-token",
      ),
    ).not.toThrow();
  });
});
