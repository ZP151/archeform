import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  applyGraphDiffToDraft,
  assertCompositionPlan,
  CompositionError,
  createBlankApplicationDraft,
  createDraftRevision,
  hashApplicationGraph,
  hashCompositionPlan,
  hashProductCompositionDiff,
  hashRequirementSpec,
  type ApplicationGraphV1,
  type DraftRevisionV1,
} from "@factory/graph";
import {
  composeProductDraft,
  planProductAlternatives,
  type ProductPlanAlternative,
} from "@factory/capabilities/node";

import { ProductCompositionService } from "../src/composition/product-composition.service.js";
import type { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";
import { expenseApprovalPrompt } from "../../packages/capabilities/test/product-fixtures.ts";

const { requirement, blueprint } = expenseApprovalPrompt();

function blankDraft(): DraftRevisionV1 {
  return createBlankApplicationDraft({
    applicationId: requirement.requirementId,
    workspaceId: "local-workspace",
    name: "Expense Approval",
  });
}

const blankGraph = blankDraft().graph;
const blankGraphHash = hashApplicationGraph(blankGraph);

function realAlternatives(): readonly ProductPlanAlternative[] {
  return planProductAlternatives({
    requirement,
    blueprint,
    baseDraft: blankDraft(),
  });
}

function prismaMock() {
  const prisma = {
    workspace: { upsert: vi.fn() },
    applicationGraph: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    draftRevision: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    compositionReview: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return {
    ...prisma,
    $transaction: vi.fn(
      async (operation: (transaction: typeof prisma) => Promise<unknown>) =>
        operation(prisma),
    ),
  };
}

const latestBlankDraft = {
  id: "draft-cuid-1",
  applicationGraphId: "graph-1",
  revisionNumber: 1,
  graph: blankGraph,
};

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-1",
    applicationGraphId: "graph-1",
    draftRevisionId: "draft-cuid-1",
    requirement,
    requirementChecksum: hashRequirementSpec(requirement),
    blueprint,
    productAlternatives: null,
    draftBaseChecksum: blankGraphHash,
    plan: null,
    planChecksum: null,
    planId: null,
    clarification: null,
    safeSummary: null,
    diff: null,
    diffChecksum: null,
    decision: null,
    decisionId: null,
    status: "planning",
    createdAt: new Date("2026-08-09T00:00:00.000Z"),
    updatedAt: new Date("2026-08-09T00:00:00.000Z"),
    ...overrides,
  };
}

function plannerStub(alternatives: unknown) {
  return {
    propose: vi.fn(),
    proposeProduct: vi.fn().mockReturnValue(alternatives),
  };
}

function serviceWith(
  prisma: ReturnType<typeof prismaMock>,
  planner: ReturnType<typeof plannerStub>,
) {
  const lifecycle = {
    appendDraftRevision: vi.fn().mockResolvedValue({
      id: "draft-cuid-6",
      applicationGraphId: "graph-1",
      revisionNumber: 6,
      graph: {},
    }),
  };
  const product = new ProductCompositionService(
    prisma as unknown as PrismaService,
    planner,
    lifecycle as unknown as LifecycleService,
  );
  return { product, lifecycle };
}

describe("ProductCompositionService.createProductRequirement", () => {
  it.each([
    {
      label: "request envelope",
      input: {
        requestId: "request-envelope-1234",
        requirement,
        blueprint,
        rejectedSecret: "must-not-echo",
      },
      code: "composition.request_envelope_invalid",
      message: "Product requirement request is invalid.",
    },
    {
      label: "request identity",
      input: { requestId: "bad", requirement, blueprint },
      code: "composition.request_identity_invalid",
      message: "Product request identity is invalid.",
    },
    {
      label: "requirement contract",
      input: {
        requestId: "request-requirement-1234",
        requirement: { ...requirement, rejectedSecret: "must-not-echo" },
        blueprint,
      },
      code: "composition.requirement_invalid",
      message: "Product requirement contract is invalid.",
    },
    {
      label: "blueprint contract",
      input: {
        requestId: "request-blueprint-1234",
        requirement,
        blueprint: { ...blueprint, rejectedSecret: "must-not-echo" },
      },
      code: "composition.blueprint_invalid",
      message: "Product blueprint contract is invalid.",
    },
    {
      label: "requirement and blueprint checksum binding",
      input: {
        requestId: "request-checksum-1234",
        requirement,
        blueprint: {
          ...blueprint,
          requirementChecksum:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      },
      code: "composition.requirement_blueprint_checksum_mismatch",
      message: "Product blueprint does not bind the requirement.",
    },
  ])(
    "returns a safe stable rejection body for an invalid $label",
    async (testCase) => {
      const prisma = prismaMock();
      const { product } = serviceWith(prisma, plannerStub(null));

      let rejection: BadRequestException | undefined;
      try {
        await product.createProductRequirement(testCase.input);
      } catch (error) {
        if (error instanceof BadRequestException) rejection = error;
        else throw error;
      }

      expect(rejection?.getStatus()).toBe(400);
      expect(rejection?.getResponse()).toEqual({
        statusCode: 400,
        error: "Bad Request",
        code: testCase.code,
        message: testCase.message,
      });
      expect(JSON.stringify(rejection?.getResponse())).not.toContain(
        "must-not-echo",
      );
      expect(prisma.workspace.upsert).not.toHaveBeenCalled();
    },
  );

  it("reconciles a late completion by caller request identity", async () => {
    const prisma = prismaMock();
    const existing = reviewRow({
      id: "request-12345678",
      productAlternatives: realAlternatives(),
      status: "planned",
    });
    prisma.compositionReview.findUnique.mockResolvedValue(existing);
    prisma.applicationGraph.findUnique.mockResolvedValue({
      id: "graph-1",
      name: "Expense Approval",
    });
    const planner = plannerStub(realAlternatives());
    const { product } = serviceWith(prisma, planner);

    const result = await product.createProductRequirement({
      requestId: "request-12345678",
      name: "Expense Approval",
      requirement,
      blueprint,
    });

    expect(result.review).toBe(existing);
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
    expect(planner.proposeProduct).not.toHaveBeenCalled();
  });

  it("rejects reuse of a request identity when the resolved product name changes", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({ id: "request-12345678" }),
    );
    prisma.applicationGraph.findUnique.mockResolvedValue({
      id: "graph-1",
      name: "Expense Approval",
    });
    const { product } = serviceWith(prisma, plannerStub(realAlternatives()));

    await expect(
      product.createProductRequirement({
        requestId: "request-12345678",
        name: "Renamed Expense Product",
        requirement,
        blueprint,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects omission of a name when it resolves differently from the original payload", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({ id: "request-12345678" }),
    );
    prisma.applicationGraph.findUnique.mockResolvedValue({
      id: "graph-1",
      name: "Expense Approval",
    });
    const { product } = serviceWith(prisma, plannerStub(realAlternatives()));

    await expect(
      product.createProductRequirement({
        requestId: "request-12345678",
        requirement,
        blueprint,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects reuse of a request identity for different product input", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({ id: "request-12345678" }),
    );
    const { product } = serviceWith(prisma, plannerStub(realAlternatives()));

    await expect(
      product.createProductRequirement({
        requestId: "request-12345678",
        requirement,
        blueprint: { ...blueprint, title: "Different Expense Product" },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("creates a blank Graph, its first Draft revision, and a fully planned review in one atomic step", async () => {
    const alternatives = realAlternatives();
    const prisma = prismaMock();
    prisma.workspace.upsert.mockResolvedValue({
      id: "ws-1",
      slug: "local-workspace",
    });
    prisma.applicationGraph.create.mockResolvedValue({
      id: "graph-1",
      key: "expense-approval",
      draftRevisions: [latestBlankDraft],
    });
    prisma.compositionReview.create.mockResolvedValue(
      reviewRow({ productAlternatives: alternatives, status: "planned" }),
    );
    const planner = plannerStub(alternatives);
    const { product } = serviceWith(prisma, planner);

    const result = await product.createProductRequirement({
      requestId: "request-create-1234",
      name: "Expense Approval",
      requirement,
      blueprint,
    });

    expect(prisma.applicationGraph.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        key: "expense-approval",
        name: "Expense Approval",
        draftRevisions: {
          create: expect.objectContaining({
            revisionNumber: 1,
            graph: expect.objectContaining({
              metadata: expect.objectContaining({
                id: "expense-approval",
                name: "Expense Approval",
              }),
            }),
          }),
        },
      }),
      include: { draftRevisions: true },
    });
    // The base revision is a true blank Draft: no product content anywhere.
    const createData = prisma.applicationGraph.create.mock.calls[0][0].data;
    const baseGraph = createData.draftRevisions.create
      .graph as ApplicationGraphV1;
    expect(baseGraph.page.pages).toEqual([]);
    expect(baseGraph.domain.entities).toEqual([]);
    expect(baseGraph.policy.roles).toEqual([]);
    expect(baseGraph.flow.flows).toEqual([]);
    expect(baseGraph.integration.compositionSelections).toBeUndefined();
    // The plan is proposed over the blank Draft inside the same transaction.
    expect(planner.proposeProduct).toHaveBeenCalledWith({
      requirement,
      blueprint,
      baseDraft: expect.objectContaining({
        status: "draft",
        graph: blankGraph,
      }),
    });
    const stored = alternatives.map(({ key, label, plan }) => ({
      key,
      label,
      plan,
    }));
    expect(prisma.compositionReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "graph-1",
        draftRevisionId: "draft-cuid-1",
        requirementChecksum: hashRequirementSpec(requirement),
        blueprint,
        draftBaseChecksum: blankGraphHash,
        productAlternatives: stored,
        status: "planned",
      }),
    });
    expect(result.review.status).toBe("planned");
  });

  it("refuses a blueprint that does not bind the given requirement", async () => {
    const prisma = prismaMock();
    const { product } = serviceWith(prisma, plannerStub(null));
    const foreign = {
      ...blueprint,
      requirementChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    };

    await expect(
      product.createProductRequirement({
        requestId: "request-foreign-1234",
        requirement,
        blueprint: foreign,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
  });

  it("refuses free-form model material in the requirement body", async () => {
    const prisma = prismaMock();
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.createProductRequirement({
        requestId: "request-material-1234",
        requirement: { ...requirement, rawModelResponse: "leak" },
        blueprint,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      product.createProductRequirement({
        requestId: "request-prompts-1234",
        requirement,
        blueprint,
        prompts: ["leak"],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
  });

  it("refuses a requirement whose application id already exists", async () => {
    const prisma = prismaMock();
    prisma.workspace.upsert.mockResolvedValue({
      id: "ws-1",
      slug: "local-workspace",
    });
    prisma.applicationGraph.create.mockRejectedValue({ code: "P2002" });
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.createProductRequirement({
        requestId: "request-conflict-1234",
        requirement,
        blueprint,
      }),
    ).rejects.toThrow(ConflictException);
    // The collision is a bounded conflict, never a silent overwrite: the
    // existing rows stay and nothing new is persisted.
    expect(prisma.compositionReview.create).not.toHaveBeenCalled();
  });

  it("rolls the entire creation back when the planning seam rejects the proposal", async () => {
    // A rejected plan proposal must leave no partial Graph/Review behind:
    // the occupied key would otherwise poison every later journey that
    // derives the same requirement id (the 409 "already exists" loop).
    const prisma = prismaMock();
    prisma.workspace.upsert.mockResolvedValue({
      id: "ws-1",
      slug: "local-workspace",
    });
    prisma.applicationGraph.create.mockResolvedValue({
      id: "graph-1",
      key: "expense-approval",
      draftRevisions: [latestBlankDraft],
    });
    const planner = plannerStub(null);
    planner.proposeProduct.mockImplementation(() => {
      throw new CompositionError("unsupported capability");
    });
    const { product } = serviceWith(prisma, planner);

    await expect(
      product.createProductRequirement({
        requestId: "request-rollback-1234",
        requirement,
        blueprint,
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.compositionReview.create).not.toHaveBeenCalled();
  });
});

describe("ProductCompositionService.requestProductPlan", () => {
  it("stores the deterministic plan alternatives for the blank Draft", async () => {
    const alternatives = realAlternatives();
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({ productAlternatives: alternatives, status: "planned" }),
    );
    const planner = plannerStub(alternatives);
    const { product } = serviceWith(prisma, planner);

    const result = await product.requestProductPlan("review-1");

    expect(planner.proposeProduct).toHaveBeenCalledWith({
      requirement,
      blueprint,
      baseDraft: expect.objectContaining({
        status: "draft",
        graph: blankGraph,
      }),
    });
    const stored = alternatives.map(({ key, label, plan }) => ({
      key,
      label,
      plan,
    }));
    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: expect.objectContaining({
        productAlternatives: stored,
        status: "planned",
      }),
    });
    expect(result.alternatives.map((alternative) => alternative.key)).toEqual([
      "standard",
      "minimal",
    ]);
  });

  it("is idempotent: an already-planned review is returned without re-planning", async () => {
    const alternatives = realAlternatives();
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({ productAlternatives: alternatives, status: "planned" }),
    );
    const planner = plannerStub(alternatives);
    const { product } = serviceWith(prisma, planner);

    const result = await product.requestProductPlan("review-1");

    expect(planner.proposeProduct).not.toHaveBeenCalled();
    expect(result.alternatives).toHaveLength(2);
  });

  it("refuses a Draft that moved since the requirement was created", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestBlankDraft,
      id: "draft-cuid-2",
      graph: {
        ...blankGraph,
        experience: { theme: { mode: "dark", tokens: {} }, locales: ["en"] },
      },
    });
    const { product } = serviceWith(prisma, plannerStub([]));

    await expect(product.requestProductPlan("review-1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses to persist an invalid alternative plan from the planning seam", async () => {
    const invalid: ProductPlanAlternative = {
      key: "standard",
      label: "Standard composition",
      plan: {
        apiVersion: "factory.composition-plan/v1",
        planId: "broken",
      } as never,
    };
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    const { product } = serviceWith(prisma, plannerStub([invalid]));

    await expect(product.requestProductPlan("review-1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});

describe("ProductCompositionService.chooseProductPlan", () => {
  const alternatives = realAlternatives();
  const [standard] = alternatives;
  const standardPlan = standard.plan;
  const expectedDiff = composeProductDraft({
    plan: standardPlan,
    blueprint,
    baseDraft: blankDraft(),
  });

  function plannedReview() {
    return reviewRow({
      productAlternatives: alternatives,
      status: "planned",
    });
  }

  it("approves the chosen alternative and stores the re-derived full Diff", async () => {
    const prisma = prismaMock();
    let stored = plannedReview();
    prisma.compositionReview.findUnique.mockImplementation(async () => stored);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      stored = { ...stored, ...data };
      return { count: 1 };
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    const result = await product.chooseProductPlan("review-1", {
      alternativeKey: "standard",
    });

    expect(result.checksum).toBe(hashProductCompositionDiff(expectedDiff.diff));
    expect(prisma.compositionReview.updateMany).toHaveBeenCalledWith({
      where: { id: "review-1", status: "planned", decisionId: null },
      data: expect.objectContaining({
        plan: standardPlan,
        planChecksum: hashCompositionPlan(standardPlan),
        planId: "expense-approval-standard",
        diff: expectedDiff.diff,
        diffChecksum: expectedDiff.checksum,
        decisionId: "product-review-1-standard",
        status: "approved",
      }),
    });
  });

  it("is idempotent for the same choice and refuses a conflicting one", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        productAlternatives: alternatives,
        plan: standardPlan,
        diff: expectedDiff.diff,
        diffChecksum: expectedDiff.checksum,
        decisionId: "product-review-1-standard",
        status: "approved",
      }),
    );
    const { product } = serviceWith(prisma, plannerStub(null));

    const same = await product.chooseProductPlan("review-1", {
      alternativeKey: "standard",
    });
    expect(same).toEqual({
      review: expect.objectContaining({
        decisionId: "product-review-1-standard",
        status: "approved",
      }),
      plan: standardPlan,
      diff: expectedDiff.diff,
      checksum: expectedDiff.checksum,
    });

    await expect(
      product.chooseProductPlan("review-1", { alternativeKey: "minimal" }),
    ).rejects.toThrow(ConflictException);
  });

  it("makes concurrent identical choices return the same complete decision wire", async () => {
    const prisma = prismaMock();
    let stored = plannedReview();
    prisma.compositionReview.findUnique.mockImplementation(async () => stored);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      if (stored.status !== "planned" || stored.decisionId !== null) {
        return { count: 0 };
      }
      stored = { ...stored, ...data };
      return { count: 1 };
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    const results = await Promise.all([
      product.chooseProductPlan("review-1", { alternativeKey: "standard" }),
      product.chooseProductPlan("review-1", { alternativeKey: "standard" }),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toEqual({
      review: expect.objectContaining({
        decisionId: "product-review-1-standard",
        status: "approved",
      }),
      plan: standardPlan,
      diff: expectedDiff.diff,
      checksum: expectedDiff.checksum,
    });
    expect(prisma.compositionReview.updateMany).toHaveBeenCalledTimes(2);
  });

  it("lets only one of two different concurrent choices own the decision", async () => {
    const prisma = prismaMock();
    let stored = plannedReview();
    prisma.compositionReview.findUnique.mockImplementation(async () => stored);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      if (stored.status !== "planned" || stored.decisionId !== null) {
        return { count: 0 };
      }
      stored = { ...stored, ...data };
      return { count: 1 };
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    const results = await Promise.allSettled([
      product.chooseProductPlan("review-1", { alternativeKey: "standard" }),
      product.chooseProductPlan("review-1", { alternativeKey: "minimal" }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    const rejection = results.find(({ status }) => status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: expect.any(ConflictException),
    });
    await expect(
      rejection?.status === "rejected"
        ? Promise.reject(rejection.reason)
        : Promise.resolve(),
    ).rejects.toThrow("Product requirement already has a decision.");
  });

  it("refuses an unknown alternative key", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(plannedReview());
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.chooseProductPlan("review-1", { alternativeKey: "enterprise" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses a choice when the review is not planned", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.chooseProductPlan("review-1", { alternativeKey: "standard" }),
    ).rejects.toThrow("Product requirement has no plan to choose from.");
  });

  it("refuses a choice when the Draft moved since the review", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(plannedReview());
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestBlankDraft,
      id: "draft-cuid-2",
      graph: {
        ...blankGraph,
        experience: { theme: { mode: "dark", tokens: {} }, locales: ["en"] },
      },
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.chooseProductPlan("review-1", { alternativeKey: "standard" }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});

describe("ProductCompositionService.applyProduct", () => {
  const [standard] = realAlternatives();
  const standardPlan = standard.plan;
  const composed = composeProductDraft({
    plan: standardPlan,
    blueprint,
    baseDraft: blankDraft(),
  });

  function approvedReview(overrides: Record<string, unknown> = {}) {
    return reviewRow({
      productAlternatives: realAlternatives(),
      plan: standardPlan,
      planChecksum: hashCompositionPlan(standardPlan),
      diff: composed.diff,
      diffChecksum: composed.checksum,
      decision: {
        apiVersion: "factory.composition-decision/v1",
        decisionId: "product-review-1-standard",
        draftId: "draft-cuid-1",
        planChecksum: hashCompositionPlan(standardPlan),
        diffChecksum: composed.checksum,
        reviewer: "product-planner",
        decision: "approved",
        rationale: "Deterministic composition of the accepted blueprint.",
        decidedAt: "2026-08-09T00:00:00.000Z",
      },
      decisionId: "product-review-1-standard",
      status: "approved",
      ...overrides,
    });
  }

  const appliedDraft = {
    id: "draft-cuid-2",
    applicationGraphId: "graph-1",
    revisionNumber: 2,
    graph: applyGraphDiffToDraft(blankDraft(), composed.diff).graph,
  };

  it("applies the approved composition in one Serializable Draft-and-review transaction", async () => {
    const prisma = prismaMock();
    let storedReview = approvedReview();
    prisma.compositionReview.findUnique.mockImplementation(
      async () => storedReview,
    );
    prisma.draftRevision.findUnique.mockResolvedValue(latestBlankDraft);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      storedReview = { ...storedReview, ...data };
      return { count: 1 };
    });
    prisma.draftRevision.create.mockResolvedValue(appliedDraft);
    const { product, lifecycle } = serviceWith(prisma, plannerStub(null));

    const result = await product.applyProduct("review-1");

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(prisma.draftRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "graph-1",
        revisionNumber: 2,
        graph: expect.objectContaining({
          metadata: expect.objectContaining({
            id: "expense-approval",
            name: "Expense Approval",
          }),
          page: expect.objectContaining({
            pages: expect.arrayContaining([
              expect.objectContaining({ route: "/expense-dashboard" }),
              expect.objectContaining({ route: "/expense-list" }),
            ]),
          }),
          domain: expect.objectContaining({
            entities: expect.arrayContaining([
              expect.objectContaining({ key: "expense" }),
              expect.objectContaining({ key: "expense-approval-principal" }),
            ]),
          }),
          flow: expect.objectContaining({
            flows: [
              expect.objectContaining({
                id: "expense-approval",
                transitions: expect.arrayContaining([
                  expect.objectContaining({
                    effects: [
                      { capability: "audit.record", operation: "record" },
                    ],
                  }),
                ]),
              }),
            ],
          }),
        }),
      }),
    });
    expect(lifecycle.appendDraftRevision).not.toHaveBeenCalled();
    expect(result.review.status).toBe("applied");
    expect(prisma.compositionReview.updateMany).toHaveBeenCalledWith({
      where: {
        id: "review-1",
        status: "approved",
        decisionId: "product-review-1-standard",
      },
      data: { status: "applied" },
    });
  });

  it("reconciles an accepted response loss to the exact base revision plus one result", async () => {
    const prisma = prismaMock();
    let storedReview = approvedReview();
    let storedDraft: typeof appliedDraft | null = null;
    prisma.compositionReview.findUnique.mockImplementation(
      async () => storedReview,
    );
    prisma.draftRevision.findUnique.mockImplementation(async ({ where }) =>
      where.applicationGraphId_revisionNumber ? storedDraft : latestBlankDraft,
    );
    prisma.draftRevision.findFirst.mockImplementation(async ({ where }) => {
      if (where?.revisionNumber === 2) return storedDraft;
      return latestBlankDraft;
    });
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      if (storedReview.status !== "approved") return { count: 0 };
      storedReview = { ...storedReview, ...data };
      return { count: 1 };
    });
    prisma.draftRevision.create.mockImplementation(async ({ data }) => {
      storedDraft = { ...appliedDraft, ...data };
      return storedDraft;
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    const accepted = await product.applyProduct("review-1");
    const reconciled = await product.applyProduct("review-1");

    expect(reconciled).toEqual(accepted);
    expect(reconciled).toEqual({
      draftRevision: appliedDraft,
      review: expect.objectContaining({ status: "applied" }),
    });
    expect(prisma.draftRevision.create).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent apply calls into one Draft and the same applied result", async () => {
    const prisma = prismaMock();
    let storedReview = approvedReview();
    let storedDraft: typeof appliedDraft | null = null;
    prisma.compositionReview.findUnique.mockImplementation(
      async () => storedReview,
    );
    prisma.draftRevision.findUnique.mockImplementation(async ({ where }) =>
      where.applicationGraphId_revisionNumber ? storedDraft : latestBlankDraft,
    );
    prisma.draftRevision.findFirst.mockImplementation(async ({ where }) => {
      if (where?.revisionNumber === 2) return storedDraft;
      return latestBlankDraft;
    });
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      if (storedReview.status !== "approved") return { count: 0 };
      storedReview = { ...storedReview, ...data };
      return { count: 1 };
    });
    prisma.draftRevision.create.mockImplementation(async ({ data }) => {
      storedDraft = { ...appliedDraft, ...data };
      return storedDraft;
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    const results = await Promise.all([
      product.applyProduct("review-1"),
      product.applyProduct("review-1"),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(results[0].draftRevision.revisionNumber).toBe(2);
    expect(prisma.draftRevision.create).toHaveBeenCalledTimes(1);
  });

  it("rolls back the approved-to-applied CAS when Draft creation fails", async () => {
    const prisma = prismaMock();
    let committedStatus = "approved";
    prisma.compositionReview.findUnique.mockResolvedValue(approvedReview());
    prisma.$transaction.mockImplementation(async (operation, options) => {
      expect(options).toEqual({
        isolationLevel: "Serializable",
      });
      let transactionStatus = committedStatus;
      const transaction = {
        ...prisma,
        compositionReview: {
          ...prisma.compositionReview,
          findUnique: vi.fn(async () =>
            approvedReview({ status: transactionStatus }),
          ),
          updateMany: vi.fn(async () => {
            transactionStatus = "applied";
            return { count: 1 };
          }),
        },
        draftRevision: {
          ...prisma.draftRevision,
          findUnique: vi.fn(async () => latestBlankDraft),
          findFirst: vi.fn(async () => latestBlankDraft),
          create: vi.fn(async () => {
            throw new Error("simulated Draft write failure");
          }),
        },
      };
      const result = await operation(transaction);
      committedStatus = transactionStatus;
      return result;
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      "simulated Draft write failure",
    );
    expect(committedStatus).toBe("approved");
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
    expect(prisma.draftRevision.create).not.toHaveBeenCalled();
  });

  it("retries one P2034 serialization conflict before applying", async () => {
    const prisma = prismaMock();
    let storedReview = approvedReview();
    prisma.compositionReview.findUnique.mockImplementation(
      async () => storedReview,
    );
    prisma.draftRevision.findUnique.mockResolvedValue(latestBlankDraft);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.updateMany.mockImplementation(async ({ data }) => {
      storedReview = { ...storedReview, ...data };
      return { count: 1 };
    });
    prisma.draftRevision.create.mockResolvedValue(appliedDraft);
    prisma.$transaction
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce(async (operation) => operation(prisma));
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).resolves.toEqual({
      draftRevision: appliedDraft,
      review: expect.objectContaining({ status: "applied" }),
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("maps repeated P2034 conflicts to one stable bounded conflict", async () => {
    const prisma = prismaMock();
    prisma.$transaction.mockRejectedValue({ code: "P2034" });
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      "Product application conflicted; retry the operation.",
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("refuses to apply an unapproved product review", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      approvedReview({ status: "planned", decisionId: null }),
    );
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      "Only an approved product plan can be applied to the Draft.",
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses when the re-derived Diff no longer matches the approved checksum", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      approvedReview({
        diffChecksum:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      }),
    );
    prisma.draftRevision.findUnique.mockResolvedValue(latestBlankDraft);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses to apply against a Draft that moved since approval", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(approvedReview());
    prisma.draftRevision.findUnique.mockResolvedValue(latestBlankDraft);
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestBlankDraft,
      id: "draft-cuid-2",
      graph: {
        ...blankGraph,
        experience: { theme: { mode: "dark", tokens: {} }, locales: ["en"] },
      },
    });
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("bounds application errors when the stored plan cannot re-compose", async () => {
    const tamperedPlan = {
      ...standardPlan,
      proposedOperations: standardPlan.proposedOperations.slice(0, 1),
    };
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      approvedReview({ plan: tamperedPlan }),
    );
    prisma.draftRevision.findUnique.mockResolvedValue(latestBlankDraft);
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      "Composition refused",
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});
