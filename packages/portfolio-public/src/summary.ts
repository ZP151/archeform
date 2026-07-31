export interface PortfolioPublicSummaryV1 {
  readonly apiVersion: "factory.portfolio-public-summary/v1";
  readonly scenarioCount: number;
  readonly sourceCounts: {
    readonly total: number;
    readonly intakeEligible: number;
    readonly directDependency: number;
    readonly selectiveSource: number;
    readonly provider: number;
    readonly policyOnly: number;
  };
}

/**
 * Deliberately source-free Portfolio telemetry for product surfaces. Detailed
 * repository metadata remains in the quarantine-only External Intake package.
 */
export const portfolioPublicSummary: PortfolioPublicSummaryV1 = Object.freeze({
  apiVersion: "factory.portfolio-public-summary/v1",
  scenarioCount: 108,
  sourceCounts: Object.freeze({
    total: 43,
    intakeEligible: 19,
    directDependency: 1,
    selectiveSource: 11,
    provider: 7,
    policyOnly: 24,
  }),
});
