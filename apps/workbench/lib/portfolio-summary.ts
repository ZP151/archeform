import type { WorkbenchWorkspacePortfolioSummary } from "./control-plane-client.js";

export type PortfolioMetricTone = "ready" | "neutral" | "attention";

export type PortfolioHomeModel = {
  readonly profiles: readonly {
    readonly id: string;
    readonly label: string;
    readonly detail: string;
  }[];
  readonly capabilityMetrics: readonly PortfolioMetric[];
  readonly intakeMetrics: readonly PortfolioMetric[];
  readonly compilationMetrics: readonly PortfolioMetric[];
};

export type PortfolioMetric = {
  readonly label: string;
  readonly value: number;
  readonly tone: PortfolioMetricTone;
};

export function toPortfolioHomeModel(
  summary: WorkbenchWorkspacePortfolioSummary,
): PortfolioHomeModel {
  return {
    profiles: summary.profiles.map((profile) => ({
      id: profile.profile,
      label: profile.label,
      detail: `${profile.requiredPackages} required · ${profile.optionalPackages} optional`,
    })),
    capabilityMetrics: [
      { label: "Golden", value: summary.capabilities.golden, tone: "ready" },
      {
        label: "Versions",
        value: summary.capabilities.lockedVersions,
        tone: "neutral",
      },
      {
        label: "Candidates",
        value: summary.capabilities.candidate,
        tone: "neutral",
      },
      {
        label: "Providers",
        value: summary.capabilities.provider,
        tone: "neutral",
      },
    ],
    intakeMetrics: [
      {
        label: "Sources",
        value: summary.intake.portfolioSources,
        tone: "neutral",
      },
      {
        label: "Eligible",
        value: summary.intake.intakeEligible,
        tone: "ready",
      },
      {
        label: "Quarantined",
        value: summary.intake.quarantined,
        tone: "neutral",
      },
      {
        label: "Blocked",
        value: summary.intake.blocked,
        tone: "neutral",
      },
    ],
    compilationMetrics: [
      {
        label: "Queued",
        value: summary.compilations.queued,
        tone: "neutral",
      },
      {
        label: "Running",
        value: summary.compilations.running,
        tone: "neutral",
      },
      {
        label: "Succeeded",
        value: summary.compilations.succeeded,
        tone: "ready",
      },
      {
        label: "Failed",
        value: summary.compilations.failed,
        tone: summary.compilations.failed > 0 ? "attention" : "neutral",
      },
    ],
  };
}
