import { Injectable, NotFoundException } from "@nestjs/common";
import {
  capabilityAssets,
  capabilityCatalog,
  listFactoryProfiles,
} from "@factory/capabilities";
import { portfolioPublicSummary } from "@factory/portfolio-public";

import { PrismaService } from "../prisma.service.js";

export interface ProfilePortfolioSummaryV1 {
  readonly profile: string;
  readonly label: string;
  readonly category: "approval" | "commerce";
  readonly requiredPackages: number;
  readonly optionalPackages: number;
}

export interface WorkspacePortfolioSummaryV1 {
  readonly apiVersion: "factory.workspace-portfolio-summary/v1";
  readonly profiles: readonly ProfilePortfolioSummaryV1[];
  readonly capabilities: {
    readonly golden: number;
    readonly lockedVersions: number;
    readonly candidate: number;
    readonly provider: number;
  };
  readonly intake: {
    readonly portfolioSources: number;
    readonly intakeEligible: number;
    readonly candidateBlueprints: number;
    readonly quarantined: number;
    readonly blocked: number;
  };
  readonly compilations: {
    readonly queued: number;
    readonly running: number;
    readonly succeeded: number;
    readonly failed: number;
  };
}

type CompilationStatus = keyof WorkspacePortfolioSummaryV1["compilations"];

function compilationStatus(result: unknown): CompilationStatus | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return undefined;
  }
  const status = (result as { status?: unknown }).status;
  return status === "queued" ||
    status === "running" ||
    status === "succeeded" ||
    status === "failed"
    ? status
    : undefined;
}

@Injectable()
export class WorkspacePortfolioSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workspaceId: string): Promise<WorkspacePortfolioSummaryV1> {
    const workspaceLookup =
      workspaceId === "local"
        ? { slug: "local-workspace" }
        : { id: workspaceId };
    const workspace = await this.prisma.workspace.findUnique({
      where: workspaceLookup,
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException("Workspace was not found.");
    }

    await this.prisma.applicationGraph.count({
      where: { workspaceId: workspace.id },
    });
    const compilations = await this.prisma.compilation.findMany({
      where: {
        publishedRevision: { applicationGraph: { workspaceId: workspace.id } },
      },
      select: { result: true },
    });
    const compilationCounts: Record<CompilationStatus, number> = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
    };
    for (const compilation of compilations) {
      const status = compilationStatus(compilation.result);
      if (status) compilationCounts[status] += 1;
    }

    return {
      apiVersion: "factory.workspace-portfolio-summary/v1",
      profiles: listFactoryProfiles().map((profile) => ({
        profile: profile.profile,
        label: profile.label,
        category: profile.category,
        requiredPackages: profile.requiredCapabilities.length,
        optionalPackages: profile.defaultOptionalCapabilities.length,
      })),
      capabilities: {
        golden: capabilityCatalog.length,
        lockedVersions: capabilityAssets.length,
        candidate: 0,
        provider: 0,
      },
      intake: {
        portfolioSources: portfolioPublicSummary.sourceCounts.total,
        intakeEligible: portfolioPublicSummary.sourceCounts.intakeEligible,
        candidateBlueprints: portfolioPublicSummary.candidateBlueprints,
        quarantined: 0,
        blocked: 0,
      },
      compilations: compilationCounts,
    };
  }
}
