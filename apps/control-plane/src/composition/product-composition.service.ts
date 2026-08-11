import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  type CompositionReview,
  type DraftRevision,
} from "@prisma/client";

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
  graphDiffSchema,
  hashApplicationGraph,
  hashCompositionPlan,
  hashProductBlueprint,
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

type ProductCompositionRejectionCode =
  | "composition.request_envelope_invalid"
  | "composition.request_identity_invalid"
  | "composition.requirement_invalid"
  | "composition.blueprint_invalid"
  | "composition.requirement_blueprint_checksum_mismatch";

function productCompositionRejection(
  code: ProductCompositionRejectionCode,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: "Bad Request",
    code,
    message,
  });
}

function uniqueConstraint(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function serializationConflict(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "P2034"
  );
}

const PRODUCT_APPLY_TRANSACTION_ATTEMPTS = 2;

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
    _lifecycle: LifecycleService,
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

  private chosenProductWire(review: CompositionReview) {
    if (
      review.decisionId === null ||
      review.plan === null ||
      review.diff === null ||
      review.diffChecksum === null
    ) {
      throw new ConflictException(
        "Product decision is missing its approved composition.",
      );
    }
    let plan: CompositionPlanV1;
    let diff;
    try {
      plan = assertCompositionPlan(review.plan);
      diff = graphDiffSchema.parse(review.diff);
    } catch {
      throw new ConflictException(
        "Product decision is missing its approved composition.",
      );
    }
    return { review, plan, diff, checksum: review.diffChecksum };
  }

  /**
   * Creates the blank Application Graph, its first Draft revision, and a
   * fully planned review bound to the requirement and its checksum-bound
   * blueprint — all in one transaction. The plan proposal and its store
   * boundary run inside the same transaction, so a rejected proposal rolls
   * the whole creation back: a failed journey can never leak a partial Graph
   * that would occupy the requirement key forever. The Graph identity is the
   * requirement id; an id that already exists is a bounded conflict, never a
   * silent overwrite.
   */
  async createProductRequirement(input: unknown) {
    let body: Record<string, unknown>;
    try {
      body = exactRecord(
        input,
        ["requestId", "name", "requirement", "blueprint"],
        ["requestId", "requirement", "blueprint"],
      );
    } catch {
      throw productCompositionRejection(
        "composition.request_envelope_invalid",
        "Product requirement request is invalid.",
      );
    }
    let requestId: string;
    try {
      requestId = requiredString(body, "requestId");
    } catch {
      throw productCompositionRejection(
        "composition.request_identity_invalid",
        "Product request identity is invalid.",
      );
    }
    if (!/^[a-z][a-z0-9-]{7,80}$/.test(requestId)) {
      throw productCompositionRejection(
        "composition.request_identity_invalid",
        "Product request identity is invalid.",
      );
    }
    let requirement: RequirementSpecV1;
    try {
      requirement = parseRequirementSpec(body.requirement);
    } catch {
      throw productCompositionRejection(
        "composition.requirement_invalid",
        "Product requirement contract is invalid.",
      );
    }
    let blueprint: ProductBlueprintV1;
    try {
      blueprint = assertProductBlueprint(body.blueprint);
    } catch {
      throw productCompositionRejection(
        "composition.blueprint_invalid",
        "Product blueprint contract is invalid.",
      );
    }
    if (blueprint.requirementChecksum !== hashRequirementSpec(requirement)) {
      throw productCompositionRejection(
        "composition.requirement_blueprint_checksum_mismatch",
        "Product blueprint does not bind the requirement.",
      );
    }
    let name = requirement.requirementId;
    if (body.name !== undefined) {
      try {
        name = requiredString(body, "name");
      } catch {
        throw productCompositionRejection(
          "composition.request_envelope_invalid",
          "Product requirement request is invalid.",
        );
      }
    }
    const existing = await this.prisma.compositionReview.findUnique({
      where: { id: requestId },
    });
    if (existing) {
      return this.reconcileProductRequirement(
        existing,
        requirement,
        blueprint,
        name,
      );
    }
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
        const { graph } = validatedGraph(created.draftRevisions[0].graph);
        const baseDraft = createDraftRevision(
          graph,
          created.draftRevisions[0].id,
        );
        const storedAlternatives = this.proposeStoredAlternatives(
          requirement,
          blueprint,
          baseDraft,
        );
        const review = await transaction.compositionReview.create({
          data: {
            id: requestId,
            applicationGraphId: created.id,
            draftRevisionId: created.draftRevisions[0].id,
            requirement: requirement as unknown as Prisma.InputJsonValue,
            requirementChecksum: hashRequirementSpec(requirement),
            blueprint: blueprint as unknown as Prisma.InputJsonValue,
            draftBaseChecksum: hashApplicationGraph(blank.graph),
            productAlternatives:
              storedAlternatives as unknown as Prisma.InputJsonValue,
            status: "planned",
          },
        });
        return { applicationGraph: created, review };
      });
    } catch (error) {
      if (uniqueConstraint(error)) {
        const completed = await this.prisma.compositionReview.findUnique({
          where: { id: requestId },
        });
        if (completed) {
          return this.reconcileProductRequirement(
            completed,
            requirement,
            blueprint,
            name,
          );
        }
        throw new ConflictException(
          `Application Graph '${requirement.requirementId}' already exists.`,
        );
      }
      throw error;
    }
    return aggregate;
  }

  private async reconcileProductRequirement(
    review: {
      id: string;
      applicationGraphId: string;
      requirement: unknown;
      requirementChecksum: string;
      blueprint: unknown;
    },
    requirement: RequirementSpecV1,
    blueprint: ProductBlueprintV1,
    name: string,
  ) {
    const storedRequirement = this.storedRequirement(review);
    const storedBlueprint = this.storedBlueprint(review);
    if (
      review.requirementChecksum !== hashRequirementSpec(requirement) ||
      hashRequirementSpec(storedRequirement) !==
        hashRequirementSpec(requirement) ||
      hashProductBlueprint(storedBlueprint) !== hashProductBlueprint(blueprint)
    ) {
      throw new ConflictException(
        "Product request identity is already bound to different input.",
      );
    }
    const storedApplication = await this.prisma.applicationGraph.findUnique({
      where: { id: review.applicationGraphId },
      select: { name: true },
    });
    if (storedApplication?.name !== name) {
      throw new ConflictException(
        "Product request identity is already bound to different input.",
      );
    }
    return {
      applicationGraph: { id: review.applicationGraphId },
      review,
    };
  }

  /**
   * The plan seam's store boundary, shared by the atomic creation and the
   * explicit plan request: only schema-valid alternatives pass, and anything
   * else is a bounded conflict with nothing persisted. The proposal itself is
   * a fixed deterministic function of the accepted blueprint over the blank
   * Draft — never a model choice at this boundary.
   */
  private proposeStoredAlternatives(
    requirement: RequirementSpecV1,
    blueprint: ProductBlueprintV1,
    baseDraft: DraftRevisionV1,
  ): readonly { key: string; label: string; plan: CompositionPlanV1 }[] {
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
    return alternatives.map(({ key, label, plan }) => ({ key, label, plan }));
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
    const stored = this.proposeStoredAlternatives(
      requirement,
      blueprint,
      baseDraft,
    );
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
        return this.chosenProductWire(review);
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
    const transitioned = await this.prisma.compositionReview.updateMany({
      where: { id: reviewId, status: "planned", decisionId: null },
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
    const stored = await this.findReview(reviewId);
    if (transitioned.count !== 1) {
      if (stored.decisionId === decision.decisionId) {
        return this.chosenProductWire(stored);
      }
      throw new ConflictException(
        "Product requirement already has a decision.",
      );
    }
    return this.chosenProductWire(stored);
  }

  /**
   * Applies only the approved composition. The full Diff is re-derived at
   * apply time and must checksum-match the approved decision; the applied
   * Graph must resolve every plan binding before it becomes the next Draft
   * revision.
   */
  private async reconstructAppliedProduct(
    transaction: Prisma.TransactionClient,
    review: CompositionReview,
  ): Promise<{
    draftRevision: DraftRevision;
    review: CompositionReview;
  }> {
    const base = await transaction.draftRevision.findUnique({
      where: { id: review.draftRevisionId },
    });
    if (!base || base.applicationGraphId !== review.applicationGraphId) {
      throw new ConflictException(
        "Applied product base Draft revision was not found.",
      );
    }
    const draftRevision = await transaction.draftRevision.findUnique({
      where: {
        applicationGraphId_revisionNumber: {
          applicationGraphId: review.applicationGraphId,
          revisionNumber: base.revisionNumber + 1,
        },
      },
    });
    if (!draftRevision) {
      throw new ConflictException(
        "Applied product Draft revision was not found.",
      );
    }
    return { draftRevision, review };
  }

  private async applyProductTransaction(
    transaction: Prisma.TransactionClient,
    reviewId: string,
  ) {
    const review = await transaction.compositionReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException("Product requirement was not found.");
    }
    if (review.status === "applied") {
      return this.reconstructAppliedProduct(transaction, review);
    }
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
    const base = await transaction.draftRevision.findUnique({
      where: { id: review.draftRevisionId },
    });
    if (!base || base.applicationGraphId !== review.applicationGraphId) {
      throw new ConflictException(
        "Application Graph has no mutable Draft revision.",
      );
    }
    const latest = await transaction.draftRevision.findFirst({
      where: { applicationGraphId: review.applicationGraphId },
      orderBy: { revisionNumber: "desc" },
    });
    const { graph } = validatedGraph(base.graph);
    if (
      latest?.id !== base.id ||
      hashApplicationGraph(graph) !== review.draftBaseChecksum
    ) {
      throw new ConflictException(
        "Draft revision moved since the requirement was created; re-create the requirement.",
      );
    }
    const baseDraft = createDraftRevision(graph, base.id);
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
    const transitioned = await transaction.compositionReview.updateMany({
      where: {
        id: reviewId,
        status: "approved",
        decisionId: review.decisionId,
      },
      data: { status: "applied" },
    });
    if (transitioned.count !== 1) {
      const current = await transaction.compositionReview.findUnique({
        where: { id: reviewId },
      });
      if (current?.status === "applied") {
        return this.reconstructAppliedProduct(transaction, current);
      }
      throw new ConflictException("Product application conflicted.");
    }
    const draftRevision = await transaction.draftRevision.create({
      data: {
        applicationGraphId: review.applicationGraphId,
        revisionNumber: base.revisionNumber + 1,
        graph: applied.graph as unknown as Prisma.InputJsonValue,
      },
    });
    const updated = await transaction.compositionReview.findUnique({
      where: { id: reviewId },
    });
    if (!updated || updated.status !== "applied") {
      throw new ConflictException("Product application conflicted.");
    }
    return { draftRevision, review: updated };
  }

  async applyProduct(reviewId: string) {
    for (
      let attempt = 0;
      attempt < PRODUCT_APPLY_TRANSACTION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(
          (transaction) => this.applyProductTransaction(transaction, reviewId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (!serializationConflict(error)) throw error;
      }
    }
    throw new ConflictException(
      "Product application conflicted; retry the operation.",
    );
  }

  async getReview(reviewId: string) {
    const review = await this.findReview(reviewId);
    return { review };
  }
}
