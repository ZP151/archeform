import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import {
  applyGraphDiffToDraft,
  assertCompositionPlan,
  assertPlanBindingsResolve,
  assertProductBlueprint,
  CompositionError,
  createBlankApplicationDraft,
  createDraftRevision,
  GraphDiffError,
  GraphSemanticError,
  hashApplicationGraph,
  hashCompositionPlan,
  hashRequirementSpec,
  parseRequirementSpec,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProductBlueprintV1,
  type RequirementSpecV1,
} from "@factory/graph";
import {
  composeProductDraft,
  type ProductPlanAlternative,
} from "@factory/capabilities/node";

import {
  LifecycleService,
  exactRecord,
  requiredString,
  validatedGraph,
} from "../lifecycle.service.js";
import { PrismaService } from "../prisma.service.js";
import {
  COMPOSITION_PLANNER,
  type CompositionPlannerProvider,
  safePlanSummary,
} from "./composition.service.js";

const LOCAL_WORKSPACE_SLUG = "local-workspace";
const LOCAL_WORKSPACE_NAME = "Local workspace";

function uniqueConstraint(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * The honest product closure journey over a blank Draft. A free-form
 * requirement is interpreted elsewhere into the checksum-bound RequirementSpec
 * and ProductBlueprint; this service stores only those schema-valid contracts,
 * proposes the deterministic plan alternatives, records the chosen
 * alternative's re-derived full Diff under an approved decision, and applies
 * the exact composed Graph through the existing Draft lifecycle. Raw model
 * responses, prompts, and provider transport material never enter the store.
 */
@Injectable()
export class ProductCompositionService {
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

  private async findReview(reviewId: string) {
    const review = await this.prisma.compositionReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException("Product requirement was not found.");
    }
    return review;
  }

  private async latestDraft(applicationGraphId: string) {
    const draft = await this.prisma.draftRevision.findFirst({
      where: { applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    if (!draft) {
      throw new NotFoundException(
        "Application Graph has no mutable Draft revision.",
      );
    }
    return draft;
  }

  /** The review's Draft must never move; every product step binds to it. */
  private async reviewBaseDraft(review: {
    applicationGraphId: string;
    draftRevisionId: string;
    draftBaseChecksum: string;
  }): Promise<DraftRevisionV1> {
    const draft = await this.latestDraft(review.applicationGraphId);
    const { graph } = validatedGraph(draft.graph);
    if (
      hashApplicationGraph(graph) !== review.draftBaseChecksum ||
      review.draftRevisionId !== draft.id
    ) {
      throw new ConflictException(
        "Draft revision moved since the requirement was created; re-create the requirement.",
      );
    }
    return createDraftRevision(graph, draft.id);
  }

  private storedRequirement(review: {
    requirement: unknown;
  }): RequirementSpecV1 {
    const requirement = ProductCompositionService.parse(
      parseRequirementSpec,
      review.requirement,
    );
    return requirement;
  }

  private storedBlueprint(review: { blueprint: unknown }): ProductBlueprintV1 {
    const blueprint = ProductCompositionService.parse(
      assertProductBlueprint,
      review.blueprint,
    );
    return blueprint;
  }

  /**
   * Creates the blank Application Graph, its first Draft revision, and a
   * planning review bound to the requirement and its checksum-bound blueprint.
   * The Graph identity is the requirement id; an id that already exists is a
   * bounded conflict, never a silent overwrite.
   */
  async createProductRequirement(input: unknown) {
    const body = exactRecord(
      input,
      ["name", "requirement", "blueprint"],
      ["requirement", "blueprint"],
    );
    const requirement = ProductCompositionService.parse(
      parseRequirementSpec,
      body.requirement,
    );
    const blueprint = ProductCompositionService.parse(
      assertProductBlueprint,
      body.blueprint,
    );
    if (blueprint.requirementChecksum !== hashRequirementSpec(requirement)) {
      throw new BadRequestException(
        "Blueprint requirement checksum does not match the requirement.",
      );
    }
    const name =
      body.name === undefined
        ? requirement.requirementId
        : requiredString(body, "name");
    const blank = createBlankApplicationDraft({
      applicationId: requirement.requirementId,
      workspaceId: LOCAL_WORKSPACE_SLUG,
      name,
    });
    const workspace = await this.prisma.workspace.upsert({
      where: { slug: LOCAL_WORKSPACE_SLUG },
      update: {},
      create: { slug: LOCAL_WORKSPACE_SLUG, name: LOCAL_WORKSPACE_NAME },
    });
    let aggregate;
    try {
      aggregate = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.applicationGraph.create({
          data: {
            workspaceId: workspace.id,
            key: requirement.requirementId,
            name,
            draftRevisions: {
              create: {
                revisionNumber: 1,
                graph: blank.graph as unknown as Prisma.InputJsonValue,
              },
            },
          },
          include: { draftRevisions: true },
        });
        const review = await transaction.compositionReview.create({
          data: {
            applicationGraphId: created.id,
            draftRevisionId: created.draftRevisions[0].id,
            requirement: requirement as unknown as Prisma.InputJsonValue,
            requirementChecksum: hashRequirementSpec(requirement),
            blueprint: blueprint as unknown as Prisma.InputJsonValue,
            draftBaseChecksum: hashApplicationGraph(blank.graph),
            status: "planning",
          },
        });
        return { applicationGraph: created, review };
      });
    } catch (error) {
      if (uniqueConstraint(error)) {
        throw new ConflictException(
          `Application Graph '${requirement.requirementId}' already exists.`,
        );
      }
      throw error;
    }
    return aggregate;
  }

  /**
   * Proposes the deterministic plan alternatives over the blank Draft. The
   * planning seam only returns schema-valid alternatives; anything else is a
   * bounded conflict and nothing is persisted. Idempotent once planned.
   */
  async requestProductPlan(reviewId: string) {
    const review = await this.findReview(reviewId);
    if (review.productAlternatives !== null) {
      return {
        review,
        alternatives: review.productAlternatives as unknown as readonly {
          key: string;
          label: string;
          plan: CompositionPlanV1;
        }[],
      };
    }
    if (review.status !== "planning") {
      throw new ConflictException(
        "Product requirement is not awaiting a plan.",
      );
    }
    const requirement = this.storedRequirement(review);
    const blueprint = this.storedBlueprint(review);
    if (blueprint.requirementChecksum !== review.requirementChecksum) {
      throw new ConflictException(
        "Stored blueprint does not bind the stored requirement.",
      );
    }
    const baseDraft = await this.reviewBaseDraft(review);
    let alternatives: readonly ProductPlanAlternative[];
    try {
      alternatives = this.planner.proposeProduct({
        requirement,
        blueprint,
        baseDraft,
      });
    } catch (error) {
      if (error instanceof CompositionError) {
        throw new ConflictException(
          `Composition planning failed: ${error.message}`,
        );
      }
      throw error;
    }
    // The store boundary re-asserts every plan the seam proposes; invalid
    // material fails before anything is persisted.
    for (const alternative of alternatives) {
      try {
        assertCompositionPlan(alternative.plan);
      } catch {
        throw new ConflictException(
          "Composition planning failed: the seam proposed an invalid plan.",
        );
      }
    }
    const stored = alternatives.map(({ key, label, plan }) => ({
      key,
      label,
      plan,
    }));
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: {
        productAlternatives: stored as unknown as Prisma.InputJsonValue,
        status: "planned",
      },
    });
    return { review: updated, alternatives: stored };
  }

  /**
   * Approves one stored alternative by re-deriving its complete Diff against
   * the still-blank Draft. The deterministic re-derivation is the source of
   * truth: the decision binds the re-derived Diff checksum, never a plan
   * carrier. Identical choices are idempotent.
   */
  async chooseProductPlan(reviewId: string, input: unknown) {
    const body = exactRecord(input, ["alternativeKey"], ["alternativeKey"]);
    const alternativeKey = requiredString(body, "alternativeKey");
    const review = await this.findReview(reviewId);
    if (review.decisionId !== null) {
      if (review.decisionId === `product-${reviewId}-${alternativeKey}`) {
        return { review };
      }
      throw new ConflictException(
        "Product requirement already has a decision.",
      );
    }
    if (review.status !== "planned") {
      throw new ConflictException(
        "Product requirement has no plan to choose from.",
      );
    }
    if (review.productAlternatives === null) {
      throw new ConflictException(
        "Product requirement has no stored plan alternatives.",
      );
    }
    const alternatives = review.productAlternatives as unknown as readonly {
      key: string;
      label: string;
      plan: CompositionPlanV1;
    }[];
    const alternative = alternatives.find(
      (candidate) => candidate.key === alternativeKey,
    );
    if (!alternative) {
      throw new BadRequestException(
        `Unknown plan alternative '${alternativeKey}'.`,
      );
    }
    const plan = assertCompositionPlan(alternative.plan);
    const blueprint = this.storedBlueprint(review);
    const baseDraft = await this.reviewBaseDraft(review);
    let composed;
    try {
      composed = composeProductDraft({ plan, blueprint, baseDraft });
    } catch (error) {
      if (
        error instanceof CompositionError ||
        error instanceof GraphDiffError ||
        error instanceof GraphSemanticError
      ) {
        throw new ConflictException(`Composition refused: ${error.message}`);
      }
      throw error;
    }
    const decision = {
      apiVersion: "factory.composition-decision/v1" as const,
      decisionId: `product-${reviewId}-${alternative.key}`,
      draftId: review.draftRevisionId,
      planChecksum: hashCompositionPlan(plan),
      diffChecksum: composed.checksum,
      reviewer: "product-planner",
      decision: "approved" as const,
      rationale:
        "Deterministic composition of the accepted blueprint over the approved capability catalogue.",
      decidedAt: new Date().toISOString(),
    };
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: {
        plan: plan as unknown as Prisma.InputJsonValue,
        planChecksum: decision.planChecksum,
        planId: plan.planId,
        diff: composed.diff as unknown as Prisma.InputJsonValue,
        diffChecksum: decision.diffChecksum,
        decision: decision as unknown as Prisma.InputJsonValue,
        decisionId: decision.decisionId,
        safeSummary: safePlanSummary(plan) as unknown as Prisma.InputJsonValue,
        status: "approved",
      },
    });
    return {
      review: updated,
      plan,
      diff: composed.diff,
      checksum: composed.checksum,
    };
  }

  /**
   * Applies only the approved composition. The full Diff is re-derived at
   * apply time and must checksum-match the approved decision; the applied
   * Graph must resolve every plan binding before it becomes the next Draft
   * revision.
   */
  async applyProduct(reviewId: string) {
    const review = await this.findReview(reviewId);
    if (review.status !== "approved") {
      throw new ConflictException(
        "Only an approved product plan can be applied to the Draft.",
      );
    }
    if (!review.plan || !review.blueprint || !review.decision) {
      throw new ConflictException(
        "Approved product review is missing its plan, blueprint, or decision.",
      );
    }
    const plan = assertCompositionPlan(review.plan);
    const blueprint = this.storedBlueprint(review);
    const baseDraft = await this.reviewBaseDraft(review);
    let composed;
    try {
      composed = composeProductDraft({ plan, blueprint, baseDraft });
    } catch (error) {
      if (
        error instanceof CompositionError ||
        error instanceof GraphDiffError ||
        error instanceof GraphSemanticError
      ) {
        throw new ConflictException(`Composition refused: ${error.message}`);
      }
      throw error;
    }
    if (composed.checksum !== review.diffChecksum) {
      throw new ConflictException(
        "Composed Diff checksum does not match the approved decision.",
      );
    }
    let applied: DraftRevisionV1;
    try {
      applied = applyGraphDiffToDraft(baseDraft, composed.diff);
      assertPlanBindingsResolve(plan, applied);
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
      review.applicationGraphId,
      { graph: applied.graph },
    );
    const updated = await this.prisma.compositionReview.update({
      where: { id: reviewId },
      data: { status: "applied" },
    });
    return { draftRevision, review: updated };
  }

  async getReview(reviewId: string) {
    const review = await this.findReview(reviewId);
    return { review };
  }
}
