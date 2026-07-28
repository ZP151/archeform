import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { LifecycleController } from "./lifecycle.controller.js";
import { LifecycleService } from "./lifecycle.service.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  controllers: [AppController, LifecycleController],
  providers: [AppService, LifecycleService, PrismaService],
})
export class AppModule {}
