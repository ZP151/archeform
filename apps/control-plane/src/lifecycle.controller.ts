import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { LifecycleService } from "./lifecycle.service.js";

@Controller()
export class LifecycleController {
  constructor(
    @Inject(LifecycleService) private readonly lifecycle: LifecycleService,
  ) {}

  @Post("workspaces/local/application-graphs")
  createLocalApplicationGraph(@Body() body: unknown) {
    return this.lifecycle.createLocalApplicationGraph(body);
  }

  @Post("application-graphs/:applicationGraphId/draft-revisions")
  appendDraftRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.lifecycle.appendDraftRevision(applicationGraphId, body);
  }

  @Get("application-graphs/:applicationGraphId/draft")
  getDraft(@Param("applicationGraphId") applicationGraphId: string) {
    return this.lifecycle.getDraft(applicationGraphId);
  }

  @Post("application-graphs/:applicationGraphId/published-revisions")
  publishDraft(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.lifecycle.publishDraft(applicationGraphId, body);
  }

  @Get("application-graphs/:applicationGraphId/published-revisions")
  listPublishedRevisions(
    @Param("applicationGraphId") applicationGraphId: string,
  ) {
    return this.lifecycle.listPublishedRevisions(applicationGraphId);
  }

  @Post("compilations")
  createCompilation(@Body() body: unknown) {
    return this.lifecycle.createCompilation(body);
  }
}
