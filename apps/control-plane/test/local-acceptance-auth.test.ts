import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { assertLocalAcceptanceCapability } from "../src/local-acceptance-auth.js";

const workerToken = "configured-worker-token";
const acceptanceToken = "a".repeat(64);

describe("local acceptance authentication", () => {
  it.each([
    [undefined, acceptanceToken],
    ["", acceptanceToken],
    ["wrong-worker-token", acceptanceToken],
    [workerToken, undefined],
    [workerToken, ""],
    [workerToken, "A".repeat(64)],
    [workerToken, "b".repeat(64)],
  ])(
    "rejects missing, malformed, or non-matching capabilities",
    (worker, acceptance) => {
      expect(() =>
        assertLocalAcceptanceCapability(
          worker,
          acceptance,
          workerToken,
          acceptanceToken,
        ),
      ).toThrow(UnauthorizedException);
    },
  );

  it("fails closed when either configured capability is absent or malformed", () => {
    expect(() =>
      assertLocalAcceptanceCapability(
        workerToken,
        acceptanceToken,
        undefined,
        acceptanceToken,
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      assertLocalAcceptanceCapability(
        workerToken,
        acceptanceToken,
        workerToken,
        undefined,
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      assertLocalAcceptanceCapability(
        workerToken,
        acceptanceToken,
        workerToken,
        "short",
      ),
    ).toThrow(UnauthorizedException);
  });

  it("accepts only both exact configured capabilities", () => {
    expect(() =>
      assertLocalAcceptanceCapability(
        workerToken,
        acceptanceToken,
        workerToken,
        acceptanceToken,
      ),
    ).not.toThrow();
  });

  it("uses one indistinguishable failure for either invalid capability", () => {
    const messages = [
      () =>
        assertLocalAcceptanceCapability(
          "wrong-worker-token",
          acceptanceToken,
          workerToken,
          acceptanceToken,
        ),
      () =>
        assertLocalAcceptanceCapability(
          workerToken,
          "b".repeat(64),
          workerToken,
          acceptanceToken,
        ),
    ].map((attempt) => {
      try {
        attempt();
        return "accepted";
      } catch (error) {
        return (error as Error).message;
      }
    });

    expect(new Set(messages).size).toBe(1);
  });
});
