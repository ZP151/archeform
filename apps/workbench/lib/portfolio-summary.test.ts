import { describe, expect, it } from "vitest";

import { toPortfolioHomeModel } from "./portfolio-summary.js";

describe("toPortfolioHomeModel", () => {
  it("turns the safe workspace summary into concise capability and intake cards", () => {
    const model = toPortfolioHomeModel({
      apiVersion: "factory.workspace-portfolio-summary/v1",
      profiles: [
        {
          profile: "restaurant-ordering",
          label: "Restaurant ordering",
          category: "commerce",
          requiredPackages: 16,
          optionalPackages: 1,
        },
      ],
      capabilities: {
        golden: 19,
        lockedVersions: 33,
        candidate: 0,
        provider: 0,
      },
      intake: {
        portfolioSources: 43,
        intakeEligible: 19,
        candidateBlueprints: 19,
        quarantined: 0,
        blocked: 0,
      },
      compilations: { queued: 1, running: 0, succeeded: 4, failed: 1 },
    });

    expect(model).toEqual({
      profiles: [
        {
          id: "restaurant-ordering",
          label: "Restaurant ordering",
          detail: "16 required · 1 optional",
        },
      ],
      capabilityMetrics: [
        { label: "Golden", value: 19, tone: "ready" },
        { label: "Versions", value: 33, tone: "neutral" },
        { label: "Candidates", value: 0, tone: "neutral" },
        { label: "Providers", value: 0, tone: "neutral" },
      ],
      intakeMetrics: [
        { label: "Sources", value: 43, tone: "neutral" },
        { label: "Eligible", value: 19, tone: "ready" },
        { label: "Candidate lanes", value: 19, tone: "ready" },
        { label: "Quarantined", value: 0, tone: "neutral" },
        { label: "Blocked", value: 0, tone: "neutral" },
      ],
      compilationMetrics: [
        { label: "Queued", value: 1, tone: "neutral" },
        { label: "Running", value: 0, tone: "neutral" },
        { label: "Succeeded", value: 4, tone: "ready" },
        { label: "Failed", value: 1, tone: "attention" },
      ],
    });
  });
});
