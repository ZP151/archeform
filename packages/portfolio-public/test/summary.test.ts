import { describe, expect, it } from "vitest";

import { portfolioPublicSummary } from "../src/summary.js";

describe("portfolioPublicSummary", () => {
  it("exposes only aggregate intake counts", () => {
    expect(portfolioPublicSummary).toMatchObject({
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

  it("projects only safe aggregate capability supply lanes", () => {
    expect(portfolioPublicSummary.supply).toMatchObject({
      apiVersion: "factory.capability-supply-summary/v1",
      families: expect.arrayContaining([
        expect.objectContaining({
          key: "commerce-transaction",
          profiles: [
            "restaurant-ordering",
            "simple-ecommerce",
            "retail-counter",
            "grocery-pickup",
          ],
        }),
      ]),
    });
    expect(JSON.stringify(portfolioPublicSummary.supply)).not.toMatch(
      /url|path|source|token|prompt|response/iu,
    );
  });
});
