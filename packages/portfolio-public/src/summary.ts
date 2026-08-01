export interface PortfolioPublicSummaryV1 {
  readonly apiVersion: "factory.portfolio-public-summary/v1";
  readonly scenarioCount: number;
  /**
   * Deterministic, non-promoting Candidate proposal lanes derived from
   * intake-eligible Portfolio records. This is intentionally distinct from
   * quarantined or Golden Candidate counts.
   */
  readonly candidateBlueprints: number;
  readonly sourceCounts: {
    readonly total: number;
    readonly intakeEligible: number;
    readonly directDependency: number;
    readonly selectiveSource: number;
    readonly provider: number;
    readonly policyOnly: number;
  };
  readonly supply: CapabilitySupplySummaryV1;
}

export type CapabilitySupplyFamilyKeyV1 =
  | "identity"
  | "catalog"
  | "commerce-transaction"
  | "inventory"
  | "availability"
  | "queue"
  | "payment"
  | "fulfillment"
  | "notification"
  | "document"
  | "search"
  | "analytics"
  | "integration";

export type CapabilitySupplyProfileV1 =
  | "expense-approval"
  | "restaurant-ordering"
  | "simple-ecommerce"
  | "retail-counter"
  | "grocery-pickup";

export type CapabilitySupplyActionV1 =
  "discover" | "qualify" | "integrate" | "provider-review" | "design" | "defer";

export interface CapabilitySupplySummaryV1 {
  readonly apiVersion: "factory.capability-supply-summary/v1";
  readonly families: readonly {
    readonly key: CapabilitySupplyFamilyKeyV1;
    readonly profiles: readonly CapabilitySupplyProfileV1[];
    readonly discovery: number;
    readonly quarantined: number;
    readonly blocked: number;
    readonly action: CapabilitySupplyActionV1;
  }[];
}

const commerceProfiles = Object.freeze([
  "restaurant-ordering",
  "simple-ecommerce",
  "retail-counter",
  "grocery-pickup",
] as const);
const allProfiles = Object.freeze([
  "expense-approval",
  ...commerceProfiles,
] as const);

export const capabilitySupplySummary: CapabilitySupplySummaryV1 = Object.freeze(
  {
    apiVersion: "factory.capability-supply-summary/v1",
    families: Object.freeze([
      {
        key: "identity",
        profiles: allProfiles,
        discovery: 2,
        quarantined: 0,
        blocked: 0,
        action: "qualify",
      },
      {
        key: "catalog",
        profiles: commerceProfiles,
        discovery: 4,
        quarantined: 0,
        blocked: 0,
        action: "integrate",
      },
      {
        key: "commerce-transaction",
        profiles: commerceProfiles,
        discovery: 4,
        quarantined: 0,
        blocked: 0,
        action: "integrate",
      },
      {
        key: "inventory",
        profiles: commerceProfiles,
        discovery: 3,
        quarantined: 0,
        blocked: 0,
        action: "integrate",
      },
      {
        key: "availability",
        profiles: ["restaurant-ordering", "grocery-pickup"],
        discovery: 1,
        quarantined: 0,
        blocked: 0,
        action: "design",
      },
      {
        key: "queue",
        profiles: ["restaurant-ordering"],
        discovery: 1,
        quarantined: 0,
        blocked: 0,
        action: "design",
      },
      {
        key: "payment",
        profiles: commerceProfiles,
        discovery: 2,
        quarantined: 0,
        blocked: 0,
        action: "provider-review",
      },
      {
        key: "fulfillment",
        profiles: commerceProfiles,
        discovery: 1,
        quarantined: 0,
        blocked: 0,
        action: "provider-review",
      },
      {
        key: "notification",
        profiles: allProfiles,
        discovery: 1,
        quarantined: 0,
        blocked: 0,
        action: "qualify",
      },
      {
        key: "document",
        profiles: allProfiles,
        discovery: 0,
        quarantined: 0,
        blocked: 0,
        action: "design",
      },
      {
        key: "search",
        profiles: commerceProfiles,
        discovery: 0,
        quarantined: 0,
        blocked: 0,
        action: "discover",
      },
      {
        key: "analytics",
        profiles: allProfiles,
        discovery: 0,
        quarantined: 0,
        blocked: 0,
        action: "discover",
      },
      {
        key: "integration",
        profiles: allProfiles,
        discovery: 0,
        quarantined: 0,
        blocked: 0,
        action: "defer",
      },
    ] satisfies readonly CapabilitySupplySummaryV1["families"][number][]),
  },
);

/**
 * Deliberately source-free Portfolio telemetry for product surfaces. Detailed
 * repository metadata remains in the quarantine-only External Intake package.
 */
export const portfolioPublicSummary: PortfolioPublicSummaryV1 = Object.freeze({
  apiVersion: "factory.portfolio-public-summary/v1",
  scenarioCount: 108,
  candidateBlueprints: 19,
  sourceCounts: Object.freeze({
    total: 43,
    intakeEligible: 19,
    directDependency: 1,
    selectiveSource: 11,
    provider: 7,
    policyOnly: 24,
  }),
  supply: capabilitySupplySummary,
});
