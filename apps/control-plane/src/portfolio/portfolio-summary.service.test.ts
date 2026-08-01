import { describe, expect, it, vi } from "vitest";

import { WorkspacePortfolioSummaryService } from "./portfolio-summary.service.js";

describe("WorkspacePortfolioSummaryService", () => {
  it("reports only safe portfolio counts for an existing workspace", async () => {
    const prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ id: "workspace-1" }),
      },
      applicationGraph: {
        count: vi.fn().mockResolvedValue(3),
      },
      compilation: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { result: { status: "succeeded" } },
            { result: { status: "failed" } },
            { result: { status: "queued" } },
            { result: { status: "unknown" } },
          ]),
      },
    };
    const service = new WorkspacePortfolioSummaryService(prisma as never);

    await expect(service.get("workspace-1")).resolves.toMatchObject({
      apiVersion: "factory.workspace-portfolio-summary/v1",
      profiles: expect.arrayContaining([
        expect.objectContaining({
          profile: "restaurant-ordering",
          requiredPackages: 16,
        }),
      ]),
      readiness: expect.arrayContaining([
        expect.objectContaining({
          profile: "restaurant-ordering",
          capabilities: expect.arrayContaining([
            { key: "commerce.catalog", status: "available" },
            { key: "commerce.order-amendment", status: "planned" },
          ]),
        }),
      ]),
      capabilities: {
        golden: 19,
        lockedVersions: 38,
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
      supply: expect.objectContaining({
        apiVersion: "factory.capability-supply-summary/v1",
        families: expect.arrayContaining([
          expect.objectContaining({ key: "commerce-transaction" }),
        ]),
      }),
      compilations: {
        queued: 1,
        running: 0,
        succeeded: 1,
        failed: 1,
      },
    });
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: "workspace-1" },
      select: { id: true },
    });
    expect(prisma.applicationGraph.count).toHaveBeenCalledWith({
      where: { workspaceId: "workspace-1" },
    });
    expect(prisma.compilation.findMany).toHaveBeenCalledWith({
      where: {
        publishedRevision: { applicationGraph: { workspaceId: "workspace-1" } },
      },
      select: { result: true },
    });
  });

  it("resolves the Workbench local workspace alias without exposing a database identifier", async () => {
    const prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ id: "workspace-1" }),
      },
      applicationGraph: { count: vi.fn().mockResolvedValue(0) },
      compilation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new WorkspacePortfolioSummaryService(prisma as never);

    await expect(service.get("local")).resolves.toMatchObject({
      apiVersion: "factory.workspace-portfolio-summary/v1",
      compilations: { queued: 0, running: 0, succeeded: 0, failed: 0 },
    });
    expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { slug: "local-workspace" },
      select: { id: true },
    });
    expect(prisma.applicationGraph.count).toHaveBeenCalledWith({
      where: { workspaceId: "workspace-1" },
    });
  });
});
