import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  applyGraphDiffToDraft,
  createDraftRevision,
  GraphDiffError,
  GraphSemanticError,
  hashApplicationGraph,
  parseApplicationGraph,
  parseDiagnosis,
  parseDraftDiff,
  parseVerificationEvidence,
  VerificationContractError,
  type ApplicationGraphV1,
  type DiagnosisV1,
  type DraftDiffOperationV1,
  type DraftDiffV1,
  type GraphDiffV1,
  type VerificationEvidenceV1,
} from "@factory/graph";
import { Prisma } from "@prisma/client";

import {
  exactRecord,
  requiredString,
  succeededCompilation,
  validatedGraph,
  verifiedPublishedCompositionLock,
} from "../lifecycle.service.js";
import { PrismaService } from "../prisma.service.js";
import {
  VERIFICATION_RUN_QUEUE,
  type VerificationRunQueue,
} from "../verification-run-queue.js";

const verificationRunIdPattern = /^[a-z0-9-]{1,128}$/;
const profileKeyPattern = /^[a-z][a-z0-9-]{0,63}$/;

const terminalRunStatuses = new Set(["succeeded", "failed", "cancelled"]);

function evidenceDigestOf(evidence: VerificationEvidenceV1): string {
  // The parsed evidence bundle is rebuilt in schema key order, so its string
  // form is deterministic; the digest therefore identifies the exact bundle.
  const digest = createHash("sha256")
    .update(JSON.stringify(evidence))
    .digest("hex");
  return `sha256:${digest}`;
}

function isZodShapeError(error: unknown): boolean {
  // @factory/graph surfaces shape failures as raw ZodError and semantic
  // failures as GraphSemanticError; both mean "not applicable", never an
  // internal failure.
  return error instanceof Error && error.name === "ZodError";
}

function parseBounded<T>(
  label: string,
  parse: (input: unknown) => T,
  input: unknown,
): T {
  try {
    return parse(input);
  } catch (error) {
    if (error instanceof VerificationContractError) {
      throw new BadRequestException(
        `${label} failed verification contract validation.`,
      );
    }
    throw error;
  }
}

/**
 * Translates only change-constraint operations into a Graph Diff. Add-binding,
 * remove-binding, and replace-input operations are refused: they would need
 * composition lock metadata or generated input shape knowledge that a review
 * boundary cannot fabricate honestly.
 */
function translateOperations(
  operations: readonly DraftDiffOperationV1[],
  graph: ApplicationGraphV1,
): GraphDiffV1 {
  const patch: GraphDiffV1["operations"] = [];
  for (const operation of operations) {
    if (operation.op !== "change-constraint") {
      throw new UnprocessableEntityException({
        code: "draft_diff_not_approvable",
        reason:
          "Only change-constraint operations translate deterministically into a Graph change.",
      });
    }
    const entityIndex = graph.domain.entities.findIndex(
      (entity) => entity.key === operation.entity,
    );
    if (entityIndex < 0) {
      throw new UnprocessableEntityException({
        code: "draft_diff_not_approvable",
        reason: "The Draft Diff names an entity the Graph does not define.",
      });
    }
    const fieldIndex = graph.domain.entities[entityIndex].fields.findIndex(
      (field) => field.key === operation.field,
    );
    if (fieldIndex < 0) {
      throw new UnprocessableEntityException({
        code: "draft_diff_not_approvable",
        reason: "The Draft Diff names a field the entity does not define.",
      });
    }
    patch.push({
      op: "add",
      path: `/domain/entities/${entityIndex}/fields/${fieldIndex}/${operation.constraint}`,
      value: operation.value,
    });
  }
  return { apiVersion: "factory.graph-diff/v1", operations: patch };
}

@Injectable()
export class VerificationService {
  public constructor(
    private readonly prisma: PrismaService,
    @Inject(VERIFICATION_RUN_QUEUE)
    private readonly verificationQueue: VerificationRunQueue,
  ) {}

  public async createRun(compilationId: string, input: unknown) {
    const body = exactRecord(
      input,
      ["verificationRunId", "profileKey"],
      ["verificationRunId"],
    );
    const verificationRunId = requiredString(body, "verificationRunId");
    // profileKey is optional: absent, the worker derives the verification
    // plan from the Published Graph itself. The run row records null.
    const profileKey =
      body.profileKey === undefined
        ? undefined
        : requiredString(body, "profileKey");
    if (!verificationRunIdPattern.test(verificationRunId)) {
      throw new BadRequestException(
        "verificationRunId must be a bounded factory identifier.",
      );
    }
    if (profileKey !== undefined && !profileKeyPattern.test(profileKey)) {
      throw new BadRequestException(
        "profileKey must be a bounded graph identifier.",
      );
    }
    const existing = await this.prisma.verificationRun.findUnique({
      where: { verificationRunId },
    });
    if (existing) {
      if (existing.compilationId !== compilationId) {
        throw new ConflictException(
          "Verification run identity is already bound to another compilation.",
        );
      }
      return existing;
    }
    const compilation = await this.prisma.compilation.findUnique({
      where: { id: compilationId },
      include: {
        publishedRevision: true,
        artifacts: { orderBy: { path: "asc" } },
      },
    });
    if (!compilation || compilation.id !== compilationId) {
      throw new NotFoundException("Compilation was not found.");
    }
    if (!succeededCompilation(compilation.result)) {
      throw new UnprocessableEntityException({
        code: "compilation_not_succeeded",
        reason: "Only succeeded compilations can be verified.",
      });
    }
    if (!compilation.publishedRevision) {
      throw new ConflictException(
        "Compilation carries no published revision to verify.",
      );
    }
    // The immutable job snapshot is validated BEFORE the run row is created:
    // the published graph must hash to the recorded revision hash, and the
    // stored composition lock must match its recorded digest. Rejected input
    // never leaves a run row behind and never enqueues a job.
    const { graph, graphHash } = validatedGraph(
      compilation.publishedRevision.graph,
    );
    if (graphHash !== compilation.publishedRevision.graphHash) {
      throw new ConflictException(
        "Published graph hash does not match the recorded revision.",
      );
    }
    const compositionLock = verifiedPublishedCompositionLock(
      compilation.publishedRevision.compositionLock,
      compilation.publishedRevision.compositionLockHash,
      graphHash,
    );
    const run = await this.prisma.verificationRun.create({
      data: {
        verificationRunId,
        compilationId,
        profileKey: profileKey ?? null,
        status: "pending",
        stepIds: [],
      },
    });
    await this.verificationQueue.enqueue({
      verificationRunId,
      compilationId,
      profileKey,
      publishedRevisionId: compilation.publishedRevision.id,
      graph,
      compositionLock,
      artifacts: compilation.artifacts.map(({ path, digest, sizeBytes }) => {
        if (sizeBytes === null) {
          throw new ConflictException(
            "Compilation artifacts must record their size.",
          );
        }
        return { path, digest, sizeBytes };
      }),
    });
    return run;
  }

  public async getRun(verificationRunId: string) {
    const run = await this.prisma.verificationRun.findUnique({
      where: { verificationRunId },
    });
    if (!run) throw new NotFoundException("Verification run was not found.");
    return run;
  }

  public async reportEvidence(verificationRunId: string, input: unknown) {
    const body = exactRecord(
      input,
      ["evidence", "diagnosis", "draftDiff"],
      ["evidence"],
    );
    const evidence = parseBounded(
      "Evidence",
      parseVerificationEvidence,
      body.evidence,
    );
    if (evidence.verificationRunId !== verificationRunId) {
      throw new BadRequestException(
        "Evidence run identity does not match the addressed run.",
      );
    }
    const diagnosis =
      body.diagnosis === undefined
        ? undefined
        : parseBounded("Diagnosis", parseDiagnosis, body.diagnosis);
    const draftDiff =
      body.draftDiff === undefined
        ? undefined
        : parseBounded("Draft diff", parseDraftDiff, body.draftDiff);
    const digest = evidenceDigestOf(evidence);
    const run = await this.prisma.verificationRun.findUnique({
      where: { verificationRunId },
    });
    if (!run) throw new NotFoundException("Verification run was not found.");
    if (terminalRunStatuses.has(run.status)) {
      if (run.evidenceDigest === digest) return run;
      throw new ConflictException(
        "Verification run is already completed with different evidence.",
      );
    }
    const status = evidence.steps.some((step) => step.status === "failed")
      ? "failed"
      : "succeeded";
    return this.prisma.verificationRun.update({
      where: { verificationRunId },
      data: {
        status,
        startedAt: run.startedAt ?? new Date(),
        completedAt: new Date(),
        stepIds: evidence.steps.map((step) => step.stepId),
        evidenceDigest: digest,
        evidence: evidence as unknown as Prisma.InputJsonValue,
        diagnosis: diagnosis as unknown as Prisma.InputJsonValue,
        draftDiff: draftDiff as unknown as Prisma.InputJsonValue,
      },
    });
  }

  public async approveDraftDiff(verificationRunId: string, input: unknown) {
    const body = exactRecord(input, ["draftDiff"], ["draftDiff"]);
    const diff = parseBounded("Draft diff", parseDraftDiff, body.draftDiff);
    const run = await this.prisma.verificationRun.findUnique({
      where: { verificationRunId },
    });
    if (!run) throw new NotFoundException("Verification run was not found.");
    const compilation = await this.prisma.compilation.findUnique({
      where: { id: run.compilationId },
      include: { publishedRevision: true },
    });
    if (!compilation?.publishedRevision) {
      throw new UnprocessableEntityException({
        code: "draft_diff_rejected",
        reason: "Compilation carries no published revision to verify against.",
      });
    }
    const applicationGraphId = compilation.publishedRevision.applicationGraphId;
    const latestDraft = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    if (!latestDraft)
      throw new NotFoundException("Draft revision was not found.");
    let graph: ApplicationGraphV1;
    try {
      graph = parseApplicationGraph(latestDraft.graph);
    } catch (error) {
      if (error instanceof GraphSemanticError || isZodShapeError(error)) {
        throw new UnprocessableEntityException({
          code: "draft_diff_rejected",
          reason: "The persisted draft is not a valid application graph.",
        });
      }
      throw error;
    }
    // The Draft Diff names the graph identity it addresses; the resolution
    // contract binds `draft-<metadata id>` to the application graph aggregate.
    if (diff.baseDraftRevisionId !== `draft-${graph.metadata.id}`) {
      throw new UnprocessableEntityException({
        code: "draft_diff_mismatch",
        reason: "The Draft Diff names a different application graph identity.",
      });
    }
    if (hashApplicationGraph(graph) !== diff.baseGraphHash) {
      throw new UnprocessableEntityException({
        code: "draft_diff_stale",
        reason: "The Draft Diff targets a stale draft snapshot.",
      });
    }
    const graphDiff = translateOperations(diff.operations, graph);
    try {
      const nextDraft = applyGraphDiffToDraft(
        createDraftRevision(graph, latestDraft.id),
        graphDiff,
      );
      const validatedNextGraph = parseApplicationGraph(nextDraft.graph);
      const draftRevision = await this.prisma.draftRevision.create({
        data: {
          applicationGraphId,
          revisionNumber: latestDraft.revisionNumber + 1,
          graph: validatedNextGraph as unknown as Prisma.InputJsonValue,
        },
      });
      return { draftRevision, draftDiff: diff };
    } catch (error) {
      if (
        error instanceof GraphDiffError ||
        error instanceof GraphSemanticError ||
        isZodShapeError(error)
      ) {
        throw new UnprocessableEntityException({
          code: "draft_diff_rejected",
          reason: "The Draft Diff cannot be applied to the current draft.",
        });
      }
      throw error;
    }
  }
}
