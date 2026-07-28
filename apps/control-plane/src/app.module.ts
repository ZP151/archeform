import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import {
  BullMqCompilationQueue,
  COMPILATION_QUEUE,
} from "./compilation-queue.js";
import { LifecycleController } from "./lifecycle.controller.js";
import { LifecycleService } from "./lifecycle.service.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  controllers: [AppController, LifecycleController],
  providers: [
    AppService,
    LifecycleService,
    PrismaService,
    BullMqCompilationQueue,
    { provide: COMPILATION_QUEUE, useExisting: BullMqCompilationQueue },
  ],
})
export class AppModule {}
