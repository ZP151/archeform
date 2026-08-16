import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyApprovedComposition,
  assertPlanAgainstRequirement,
  CompositionError,
  createDraftRevision,
  GraphDiffError,
  GraphSemanticError,
  hashApplicationGraph,
  hashCompositionDiff,
  hashCompositionPlan,
  hashRequirementSpec,
  parseCompositionClarification,
  parseCompositionDecision,
  parseRequirementSpec,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";
import {
  currentCapabilityAssets,
  planComposition,
  planProductAlternatives,
  type PlanCompositionOutcomeV1,
  type ProductPlanAlternative,
} from "@factory/capabilities/node";

import {
  LifecycleService,
  exactRecord,
  validatedGraph,
} from "../lifecycle.service.js";
// A value import: Nest resolves the constructor parameter from
// `design:paramtypes`, so the injectable class must carry a runtime token.
import { PrismaService } from "../prisma.service.js";

/**
 * The deterministic planning seam. Only schema-valid proposals may cross it:
 * a plan or a bounded clarification, never free-form output. The product
 * closure seam proposes deterministic plan alternatives for an accepted
 * blueprint over a blank Draft — still a fixed deterministic function, never
 * a model choice.
 */
export interface CompositionPlannerProvider {
  propose(
    requirement: RequirementSpecV1,
    baseDraft: DraftRevisionV1,
  ): PlanCompositionOutcomeV1;
  proposeProduct(input: {
    readonly requirement: RequirementSpecV1;
    readonly blueprint: ProductBlueprintV1;
    readonly baseDraft: DraftRevisionV1;
  }): readonly ProductPlanAlternative[];
}

export const COMPOSITION_PLANNER = Symbol("COMPOSITION_PLANNER");

/**
 * Wiring until the authoritative portfolio catalogue lands: an empty
 * catalogue yields a schema-valid clarification, never a guess. The recipe
 * catalogue is populated with the 100+ recipe portfolio before release.
 */
export function createCompositionPlannerProvider(): CompositionPlannerProvider {
  return {
    propose: (requirement, baseDraft) =>
      planComposition(
        requirement,
        {
          apiVersion: "factory.profile-recipe-catalog/v1",
          schemaVersion: "v1",
          recipes: [],
        },
        baseDraft,
        FACTORY_REPOSITORY_ROOT,
        currentCapabilityAssets,
      ),
    proposeProduct: ({ requirement, blueprint, baseDraft }) =>
      planProductAlternatives({ requirement, blueprint, baseDraft }),
  };
}

const FACTORY_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);

/** A bounded, review-safe projection of a plan (no free-form fields). */
export function safePlanSummary(plan: CompositionPlanV1) {
  return {
    planId: plan.planId,
    capabilityLocks: plan.capabilityLocks.map(({ key, version }) => ({
      key,
      version,
    })),
    graphBindings: plan.graphBindings.map(
      ({ capabilityKey, inputKey, graphSymbol }) => ({
        capabilityKey,
        inputKey,
        graphSymbol,
      }),
    ),
    outputSlots: plan.outputSlots.map(({ capabilityKey, slot, surface }) => ({
      capabilityKey,
      slot,
      surface,
    })),
    operationCount: plan.proposedOperations.length,
    complexity: plan.complexity,
    acceptanceJourneys: plan.acceptanceJourneys.length,
  };
}

@Injectable()
export class CompositionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COMPOSITION_PLANNER)
    private readonly planner: CompositionPlannerProvider,
    private readonly lifecycle: LifecycleService,
  ) {}

  private static parse<T>(parseFn: (input: unknown) => T, input: unknown): T {
    try {
      return parseFn(input);
    } catch {
      throw new BadRequestException("Composition record is invalid.");
    }
  }

  private async findReview(applicationGraphId: string, reviewId: string) {
    const review = await this.prisma.compositionReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || review.applicationGraphId !== applicationGraphId) {
      throw new NotFoundException("Composition review was not found.");
    }
    return review;
  }

  private async latestDraft(applicationGraphId: string) {
    const draft = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    if (!draft) {
      throw new BadRequestException(
        "Application Graph has no mutable Draft revision to compose against.",
      );
    }
    return draft;
  }

  /** Creates a Draft-scoped requirement review bound to the latest revision. */
  async createRequirement(applicationGraphId: string, input: unknown) {
    const body = exactRecord(input, ["requirement"], ["requirement"]);
    const requirement = CompositionService.parse(
      parseRequirementSpec,
      body.requirement,
    );
    const draft = await this.latestDraft(applicationGraphId);
    const { graph } = validatedGraph(draft.graph);
    const review = await this.prisma.compositionReview.create({
      data: {
        applicationGraphId,
        draftRevisionId: draft.id,
        requirement: requirement as unknown as Prisma.InputJsonValue,
        requirementChecksum: hashRequirementSpec(requirement),
        draftBaseChecksum: hashApplicationGraph(graph),
        status: "planning",
      },
    });
    return { review };
  }

  /**
   * Plans the review's requirement against the same Draft revision it was
   * created on. The Draft must not have moved; planning is idempotent.
   */
  async requestPlan(applicationGraphId: string, reviewId: string) {
    const review = await this.findReview(applicationGraphId, reviewId);
    if (review.planChecksum || review.clarification) return { review };
    const draft = await this.latestDraft(applicationGraphId);
    const { graph } = validatedGraph(draft.graph);
    if (
      hashApplicationGraph(graph) !== review.draftBaseChecksum ||
      review.draftRevisionId !== draft.id
    ) {
      throw new ConflictException(
        "Draft revision moved since the review was created; re-create the requirement review.",
      );
    }
    const baseDraft = createDraftRevision(graph, draft.id);
    const requirement = CompositionService.parse(
      parseRequirementSpec,
      review.requirement,
    );
    let outcome: PlanCompositionOutcomeV1;
    try {
      outcome = this.planner.propose(requirement, baseDraft);
    } catch (error) {
      // The provider is a constrained seam: its bounded failures surface as
      // composition conflicts, never raw 500s, and nothing is persisted.
      if (error instanceof CompositionError) {
        throw new ConflictException(
          `Composition planning failed: ${error.message}`,
        );
      }
      throw error;
    }
    if (outcome.kind === "clarification") {
      const clarification = CompositionService.parse(
        parseCompositionClarification,
        outcome.clarification,
      );
      const updated = await this.prisma.compositionReview.update({
        where: { id: reviewId },
        data: {
          clarification: clarification as unknown as Prisma.InputJsonValue,
          status: "clarification_required",
        },
      });
      return { review: updated, clarification };
    }
    const plan = outcome.plan;
    const diff = {
      apiVersion: "factory.graph-diff/v1" as const,
      baseGraphHash: plan.draftBaseChecksum,
      operations: plan.proposedOperations,
    };
    // The plan must satisfy the stored requirement and must carry nothing the
    // review boundary may persist (unsafe material fails at hash/scan).
    let planChecksum: string;
    let diffChecksum: string;
    try {
      assertPlanAgainstRequirement(plan, requirement);
      planChecksum = hashCompositionPlan(plan);
      diffChecksum = hashCompositionDiff(diff);
    } catch (error) {
      if (error instanceof CompositionError) {
        throw new ConflictException(
          `Composition plan rejected: ${error.message}`,
        );
      }
      throw error;
    }
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: {
        plan: plan as unknown as Prisma.InputJsonValue,
        planChecksum,
        planId: plan.planId,
        diff: diff as unknown as Prisma.InputJsonValue,
        diffChecksum,
        safeSummary: safePlanSummary(plan) as unknown as Prisma.InputJsonValue,
        status: "planned",
      },
    });
    return { review: updated, plan, safeSummary: safePlanSummary(plan) };
  }

  async getReview(applicationGraphId: string, reviewId: string) {
    const review = await this.findReview(applicationGraphId, reviewId);
    return { review };
  }

  /**
   * Records a reviewer decision. The decision must bind the exact stored
   * plan and Diff checksums; identical decisions are idempotent.
   */
  async decide(applicationGraphId: string, reviewId: string, input: unknown) {
    const body = exactRecord(input, ["decision"], ["decision"]);
    const decision = CompositionService.parse(
      parseCompositionDecision,
      body.decision,
    );
    const review = await this.findReview(applicationGraphId, reviewId);
    if (review.decisionId !== null) {
      if (review.decisionId === decision.decisionId) return { review };
      throw new ConflictException("Review already has a decision.");
    }
    if (review.status !== "planned") {
      throw new ConflictException("Review has no plan to decide on.");
    }
    if (decision.draftId !== review.draftRevisionId) {
      throw new BadRequestException(
        "Decision Draft does not match the review.",
      );
    }
    if (decision.planChecksum !== review.planChecksum) {
      throw new ConflictException(
        "Decision plan checksum does not match the stored plan.",
      );
    }
    if (decision.diffChecksum !== review.diffChecksum) {
      throw new ConflictException(
        "Decision Diff checksum does not match the stored Diff.",
      );
    }
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: {
        decision: decision as unknown as Prisma.InputJsonValue,
        decisionId: decision.decisionId,
        status: decision.decision,
      },
    });
    return { review: updated };
  }

  /**
   * Applies only the approved constrained Diff through the existing Draft
   * lifecycle: the Draft must not have moved, and the stored decision must
   * still approve the stored plan and Diff.
   */
  async apply(applicationGraphId: string, reviewId: string) {
    const review = await this.findReview(applicationGraphId, reviewId);
    if (review.status !== "approved") {
      throw new ConflictException(
        "Only an approved plan can be applied to the Draft.",
      );
    }
    if (!review.plan || !review.diff || !review.decision) {
      throw new ConflictException(
        "Approved review is missing its plan or Diff.",
      );
    }
    const draft = await this.latestDraft(applicationGraphId);
    const { graph } = validatedGraph(draft.graph);
    if (
      hashApplicationGraph(graph) !== review.draftBaseChecksum ||
      review.draftRevisionId !== draft.id
    ) {
      throw new ConflictException(
        "Draft revision moved since the review was created; re-create the requirement review.",
      );
    }
    const baseDraft = createDraftRevision(graph, draft.id);
    let applied: DraftRevisionV1;
    try {
      applied = applyApprovedComposition(
        review.decision,
        review.plan,
        baseDraft,
        review.diff,
      );
    } catch (error) {
      if (
        error instanceof CompositionError ||
        error instanceof GraphDiffError ||
        error instanceof GraphSemanticError
      ) {
        throw new ConflictException(
          `Composition application refused: ${error.message}`,
        );
      }
      throw error;
    }
    const draftRevision = await this.lifecycle.appendDraftRevision(
      applicationGraphId,
      { graph: applied.graph },
    );
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: { status: "applied" },
    });
    return { draftRevision, review: updated };
  }
}
