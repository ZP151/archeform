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
import { VerificationController } from "./verification/verification.controller.js";
import { VerificationService } from "./verification/verification.service.js";

@Module({
  imports: [PrismaModule, PortfolioModule],
  controllers: [AppController, LifecycleController, VerificationController],
  providers: [
    AppService,
    LifecycleService,
    VerificationService,
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
