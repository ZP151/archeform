import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import {
  BullMqCompilationQueue,
  COMPILATION_QUEUE,
} from "./compilation-queue.js";
import { CompositionController } from "./composition/composition.controller.js";
import {
  COMPOSITION_PLANNER,
  CompositionService,
  createCompositionPlannerProvider,
} from "./composition/composition.service.js";
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
import {
  BullMqVerificationRunQueue,
  VERIFICATION_RUN_QUEUE,
} from "./verification-run-queue.js";

@Module({
  imports: [PrismaModule, PortfolioModule],
  controllers: [
    AppController,
    LifecycleController,
    VerificationController,
    CompositionController,
  ],
  providers: [
    AppService,
    LifecycleService,
    VerificationService,
    CompositionService,
    BullMqCompilationQueue,
    BullMqPreviewRunQueue,
    BullMqVerificationRunQueue,
    { provide: COMPILATION_QUEUE, useExisting: BullMqCompilationQueue },
    { provide: PREVIEW_RUN_QUEUE, useExisting: BullMqPreviewRunQueue },
    {
      provide: VERIFICATION_RUN_QUEUE,
      useExisting: BullMqVerificationRunQueue,
    },
    {
      provide: GRAPH_PROPOSAL_PROVIDER,
      useFactory: createGraphProposalProvider,
    },
    {
      provide: COMPOSITION_PLANNER,
      useFactory: createCompositionPlannerProvider,
    },
  ],
})
export class AppModule {}
