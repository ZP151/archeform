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
          requiredPackages: 18,
          optionalPackages: 1,
        },
      ],
      readiness: [
        {
          apiVersion: "factory.profile-readiness/v1",
          profile: "restaurant-ordering",
          label: "Restaurant ordering",
          generatedTargets: [
            "simulator",
            "web",
            "api",
            "database",
            "tests",
            "docs",
          ],
          capabilities: [
            { key: "commerce.catalog", status: "available" },
            { key: "commerce.transaction", status: "partial" },
            { key: "commerce.order-amendment", status: "partial" },
            { key: "payment.provider", status: "provider-required" },
          ],
        },
      ],
      coverage: [
        {
          apiVersion: "factory.profile-coverage/v1",
          key: "commerce.order-operations",
          label: "Order operations",
          status: "partial",
          packageKeys: ["commerce.order", "commerce.inventory", "core.audit"],
          profiles: [
            "restaurant-ordering",
            "simple-ecommerce",
            "retail-counter",
            "grocery-pickup",
          ],
        },
      ],
      capabilities: {
        golden: 22,
        lockedVersions: 46,
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
      supply: {
        apiVersion: "factory.capability-supply-summary/v1",
        families: [
          {
            key: "commerce-transaction",
            profiles: [
              "restaurant-ordering",
              "simple-ecommerce",
              "retail-counter",
              "grocery-pickup",
            ],
            discovery: 4,
            quarantined: 0,
            blocked: 0,
            action: "integrate",
          },
        ],
      },
      compilations: { queued: 1, running: 0, succeeded: 4, failed: 1 },
    });

    expect(model).toEqual({
      profiles: [
        {
          id: "restaurant-ordering",
          label: "Restaurant ordering",
          detail: "18 required · 1 optional",
        },
      ],
      readiness: [
        {
          id: "restaurant-ordering",
          label: "Restaurant ordering",
          generatedTargetCount: 6,
          available: 1,
          partial: 2,
          planned: 0,
          providerRequired: 1,
        },
      ],
      coverage: [
        {
          id: "commerce.order-operations",
          label: "Order operations",
          status: "partial",
          packageCount: 3,
          profileCount: 4,
        },
      ],
      capabilityMetrics: [
        { label: "Golden", value: 22, tone: "ready" },
        { label: "Versions", value: 46, tone: "neutral" },
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
      supply: [
        {
          key: "commerce-transaction",
          profiles: [
            "restaurant-ordering",
            "simple-ecommerce",
            "retail-counter",
            "grocery-pickup",
          ],
          discovery: 4,
          quarantined: 0,
          blocked: 0,
          action: "integrate",
        },
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
