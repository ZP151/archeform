import { Controller, Get, Inject, Param } from "@nestjs/common";

import { WorkspacePortfolioSummaryService } from "./portfolio-summary.service.js";

@Controller()
export class PortfolioSummaryController {
  constructor(
    @Inject(WorkspacePortfolioSummaryService)
    private readonly portfolioSummary: WorkspacePortfolioSummaryService,
  ) {}

  @Get("workspaces/:workspaceId/portfolio-summary")
  getPortfolioSummary(@Param("workspaceId") workspaceId: string) {
    return this.portfolioSummary.get(workspaceId);
  }
}
