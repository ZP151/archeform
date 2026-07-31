import { describe, expect, it } from "vitest";

import { portfolioPublicSummary } from "../src/summary.js";

describe("portfolioPublicSummary", () => {
  it("exposes only aggregate intake counts", () => {
    expect(portfolioPublicSummary).toEqual({
      apiVersion: "factory.portfolio-public-summary/v1",
      scenarioCount: 108,
      candidateBlueprints: 19,
      sourceCounts: {
        total: 43,
        intakeEligible: 19,
        directDependency: 1,
        selectiveSource: 11,
        provider: 7,
        policyOnly: 24,
      },
    });
    expect(JSON.stringify(portfolioPublicSummary)).not.toMatch(
      /https?:\/\/|\.git|sha256:|token|secret|password/iu,
    );
  });
});
