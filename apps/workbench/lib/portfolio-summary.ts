import type { WorkbenchWorkspacePortfolioSummary } from "./control-plane-client.js";

export type PortfolioMetricTone = "ready" | "neutral" | "attention";

export type PortfolioHomeModel = {
  readonly profiles: readonly {
    readonly id: string;
    readonly label: string;
    readonly detail: string;
  }[];
  readonly readiness: readonly ProfileReadinessHomeModel[];
  readonly capabilityMetrics: readonly PortfolioMetric[];
  readonly intakeMetrics: readonly PortfolioMetric[];
  readonly supply: WorkbenchWorkspacePortfolioSummary["supply"]["families"];
  readonly compilationMetrics: readonly PortfolioMetric[];
};

export type ProfileReadinessHomeModel = {
  readonly id: string;
  readonly label: string;
  readonly generatedTargetCount: number;
  readonly available: number;
  readonly partial: number;
  readonly planned: number;
  readonly providerRequired: number;
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
    readiness: summary.readiness.map((profile) => {
      const counts = {
        available: 0,
        partial: 0,
        planned: 0,
        providerRequired: 0,
      };
      for (const capability of profile.capabilities) {
        if (capability.status === "available") counts.available += 1;
        if (capability.status === "partial") counts.partial += 1;
        if (capability.status === "planned") counts.planned += 1;
        if (capability.status === "provider-required") {
          counts.providerRequired += 1;
        }
      }
      return {
        id: profile.profile,
        label: profile.label,
        generatedTargetCount: profile.generatedTargets.length,
        ...counts,
      };
    }),
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
        label: "Candidate lanes",
        value: summary.intake.candidateBlueprints,
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
    supply: summary.supply.families.map((family) => ({
      ...family,
      profiles: [...family.profiles],
    })),
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
