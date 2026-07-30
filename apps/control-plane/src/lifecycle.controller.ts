import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { LifecycleService } from "./lifecycle.service.js";
import { assertInternalWorkerToken } from "./internal-worker-auth.js";

function emptyBody(body: unknown): void {
  if (body === undefined) return;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Request body must be an empty object.");
  }
  const fields = Object.keys(body);
  if (fields.length > 0) {
    throw new BadRequestException(
      `Unsupported request field: ${fields.sort()[0]}.`,
    );
  }
}

@Controller()
export class LifecycleController {
  constructor(
    @Inject(LifecycleService) private readonly lifecycle: LifecycleService,
  ) {}

  @Post("workspaces/local/application-graphs")
  createLocalApplicationGraph(@Body() body: unknown) {
    return this.lifecycle.createLocalApplicationGraph(body);
  }

  @Get("workspaces/local/application-graphs")
  listLocalApplicationSummaries() {
    return this.lifecycle.listLocalApplicationSummaries();
  }

  @Post("workspaces/local/application-graphs/import")
  importPublishedGraph(@Body() body: unknown) {
    return this.lifecycle.importPublishedGraph(body);
  }

  @Get("workspaces/local/application-graphs/:key")
  getLocalApplicationGraph(@Param("key") key: string) {
    return this.lifecycle.getLocalApplicationGraph(key);
  }

  @Post("application-graphs/:applicationGraphId/draft-revisions")
  appendDraftRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.lifecycle.appendDraftRevision(applicationGraphId, body);
  }

  @Get("application-graphs/:applicationGraphId/draft-revisions")
  listDraftRevisions(@Param("applicationGraphId") applicationGraphId: string) {
    return this.lifecycle.listDraftRevisions(applicationGraphId);
  }

  @Post("application-graphs/:applicationGraphId/ai-proposals")
  proposeDraftRevision(
    @Param("applicationGraphId") applicationGraphId: string,
    @Body() body: unknown,
  ) {
    return this.lifecycle.proposeDraftRevision(applicationGraphId, body);
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

  @Get(
    "application-graphs/:applicationGraphId/published-revisions/:publishedRevisionId/export",
  )
  exportPublishedGraph(
    @Param("applicationGraphId") applicationGraphId: string,
    @Param("publishedRevisionId") publishedRevisionId: string,
  ) {
    return this.lifecycle.exportPublishedGraph(
      applicationGraphId,
      publishedRevisionId,
    );
  }

  @Post("compilations")
  createCompilation(@Body() body: unknown) {
    return this.lifecycle.createCompilation(body);
  }

  @Get("compilations/:compilationId")
  getCompilation(@Param("compilationId") compilationId: string) {
    return this.lifecycle.getCompilation(compilationId);
  }

  @Get("compilations/:compilationId/artifact-content")
  getCompilationArtifact(
    @Param("compilationId") compilationId: string,
    @Query("path") path: string | undefined,
  ) {
    return this.lifecycle.getCompilationArtifact(compilationId, path);
  }

  @Post("compilations/:compilationId/preview-runs")
  createPreviewRun(
    @Param("compilationId") compilationId: string,
    @Body() body: unknown,
  ) {
    emptyBody(body);
    return this.lifecycle.createPreviewRun(compilationId);
  }

  @Get("compilations/:compilationId/preview-runs/current")
  getCurrentPreviewRun(@Param("compilationId") compilationId: string) {
    return this.lifecycle.getCurrentPreviewRun(compilationId);
  }

  @Post("preview-runs/:previewRunId/stop")
  stopPreviewRun(
    @Param("previewRunId") previewRunId: string,
    @Body() body: unknown,
  ) {
    emptyBody(body);
    return this.lifecycle.stopPreviewRun(previewRunId);
  }

  @Post("internal/compilations/:compilationId/complete")
  completeCompilation(
    @Param("compilationId") compilationId: string,
    @Body() body: unknown,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    return this.lifecycle.completeCompilation(compilationId, body);
  }

  @Get("internal/preview-runs/:previewRunId/dispatch")
  getPreviewDispatch(
    @Param("previewRunId") previewRunId: string,
    @Query("action") action: string | undefined,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    return this.lifecycle.getPreviewDispatch(previewRunId, action);
  }

  @Post("internal/preview-runs/:previewRunId/ready")
  reportPreviewReady(
    @Param("previewRunId") previewRunId: string,
    @Body() body: unknown,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    return this.lifecycle.reportPreviewReady(previewRunId, body);
  }

  @Post("internal/preview-runs/:previewRunId/failed")
  reportPreviewFailed(
    @Param("previewRunId") previewRunId: string,
    @Body() body: unknown,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    return this.lifecycle.reportPreviewFailed(previewRunId, body);
  }

  @Post("internal/preview-runs/:previewRunId/stopped")
  reportPreviewStopped(
    @Param("previewRunId") previewRunId: string,
    @Body() body: unknown,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    emptyBody(body);
    return this.lifecycle.reportPreviewStopped(previewRunId);
  }
}
