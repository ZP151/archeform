import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma.module.js";
import { PortfolioSummaryController } from "./portfolio-summary.controller.js";
import { WorkspacePortfolioSummaryService } from "./portfolio-summary.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [PortfolioSummaryController],
  providers: [WorkspacePortfolioSummaryService],
})
export class PortfolioModule {}
