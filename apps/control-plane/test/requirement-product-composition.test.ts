import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  assertCompositionPlan,
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
    draftRevision: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    compositionReview: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
  it("creates a blank Graph, its first Draft revision, and a planning review", async () => {
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
    prisma.compositionReview.create.mockResolvedValue(reviewRow());
    const { product } = serviceWith(prisma, plannerStub(null));

    const result = await product.createProductRequirement({
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
    expect(prisma.compositionReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "graph-1",
        draftRevisionId: "draft-cuid-1",
        requirementChecksum: hashRequirementSpec(requirement),
        blueprint,
        draftBaseChecksum: blankGraphHash,
        status: "planning",
      }),
    });
    expect(result.review.status).toBe("planning");
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
      product.createProductRequirement({ requirement, blueprint: foreign }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.applicationGraph.create).not.toHaveBeenCalled();
  });

  it("refuses free-form model material in the requirement body", async () => {
    const prisma = prismaMock();
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(
      product.createProductRequirement({
        requirement: { ...requirement, rawModelResponse: "leak" },
        blueprint,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      product.createProductRequirement({
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
      product.createProductRequirement({ requirement, blueprint }),
    ).rejects.toThrow(ConflictException);
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
    prisma.compositionReview.findUnique.mockResolvedValue(plannedReview());
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({
        productAlternatives: alternatives,
        status: "approved",
        decisionId: "product-review-1-standard",
      }),
    );
    const { product } = serviceWith(prisma, plannerStub(null));

    const result = await product.chooseProductPlan("review-1", {
      alternativeKey: "standard",
    });

    expect(result.checksum).toBe(hashProductCompositionDiff(expectedDiff.diff));
    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
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
        diffChecksum: expectedDiff.checksum,
        decisionId: "product-review-1-standard",
        status: "approved",
      }),
    );
    const { product } = serviceWith(prisma, plannerStub(null));

    const same = await product.chooseProductPlan("review-1", {
      alternativeKey: "standard",
    });
    expect(same.review.decisionId).toBe("product-review-1-standard");

    await expect(
      product.chooseProductPlan("review-1", { alternativeKey: "minimal" }),
    ).rejects.toThrow(ConflictException);
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

  it("applies the approved composition through the Draft lifecycle", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(approvedReview());
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    prisma.compositionReview.update.mockResolvedValue(
      approvedReview({ status: "applied" }),
    );
    const { product, lifecycle } = serviceWith(prisma, plannerStub(null));

    const result = await product.applyProduct("review-1");

    expect(lifecycle.appendDraftRevision).toHaveBeenCalledWith(
      "graph-1",
      expect.objectContaining({
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
    );
    expect(result.review.status).toBe("applied");
    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { status: "applied" },
    });
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
    prisma.draftRevision.findFirst.mockResolvedValue(latestBlankDraft);
    const { product } = serviceWith(prisma, plannerStub(null));

    await expect(product.applyProduct("review-1")).rejects.toThrow(
      "Composition refused",
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});
