import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
} from "@nestjs/common";

import { exactRecord } from "../lifecycle.service.js";
import { assertInternalWorkerToken } from "../internal-worker-auth.js";
import { VerificationService } from "./verification.service.js";

@Controller()
export class VerificationController {
  public constructor(
    @Inject(VerificationService)
    private readonly verification: VerificationService,
  ) {}

  @Post("compilations/:compilationId/verification-runs")
  createRun(
    @Param("compilationId") compilationId: string,
    @Body() body: unknown,
  ) {
    exactRecord(
      body,
      ["verificationRunId", "profileKey"],
      ["verificationRunId", "profileKey"],
    );
    return this.verification.createRun(compilationId, body);
  }

  @Get("verification-runs/:verificationRunId")
  getRun(@Param("verificationRunId") verificationRunId: string) {
    return this.verification.getRun(verificationRunId);
  }

  @Post("internal/verification-runs/:verificationRunId/evidence")
  reportEvidence(
    @Param("verificationRunId") verificationRunId: string,
    @Body() body: unknown,
    @Headers("x-factory-internal-token") internalToken: string | undefined,
  ) {
    assertInternalWorkerToken(internalToken);
    exactRecord(body, ["evidence", "diagnosis", "draftDiff"], ["evidence"]);
    return this.verification.reportEvidence(verificationRunId, body);
  }

  @Post("verification-runs/:verificationRunId/approve")
  approveDraftDiff(
    @Param("verificationRunId") verificationRunId: string,
    @Body() body: unknown,
  ) {
    exactRecord(body, ["draftDiff"], ["draftDiff"]);
    return this.verification.approveDraftDiff(verificationRunId, body);
  }
}
