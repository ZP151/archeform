import { Controller, Get } from "@nestjs/common";

import { AppService, type HealthStatus } from "./app.service.js";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  health(): HealthStatus {
    return this.appService.getHealth();
  }
}
