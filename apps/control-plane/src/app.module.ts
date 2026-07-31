import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import {
  BullMqCompilationQueue,
  COMPILATION_QUEUE,
} from "./compilation-queue.js";
import {
  createGraphProposalProvider,
  GRAPH_PROPOSAL_PROVIDER,
} from "./graph-proposal.provider.js";
import { LifecycleController } from "./lifecycle.controller.js";
import { LifecycleService } from "./lifecycle.service.js";
import { PrismaModule } from "./prisma.module.js";
import {
  BullMqPreviewRunQueue,
  PREVIEW_RUN_QUEUE,
} from "./preview-run-queue.js";
import { PortfolioModule } from "./portfolio/portfolio.module.js";

@Module({
  imports: [PrismaModule, PortfolioModule],
  controllers: [AppController, LifecycleController],
  providers: [
    AppService,
    LifecycleService,
    BullMqCompilationQueue,
    BullMqPreviewRunQueue,
    { provide: COMPILATION_QUEUE, useExisting: BullMqCompilationQueue },
    { provide: PREVIEW_RUN_QUEUE, useExisting: BullMqPreviewRunQueue },
    {
      provide: GRAPH_PROPOSAL_PROVIDER,
      useFactory: createGraphProposalProvider,
    },
  ],
})
export class AppModule {}
