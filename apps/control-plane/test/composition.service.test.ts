import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  createDraftRevision,
  hashApplicationGraph,
  hashCompositionDiff,
  hashCompositionPlan,
  hashRequirementSpec,
  type ApplicationGraphV1,
  type CompositionClarificationV1,
  type CompositionDecisionV1,
  type CompositionPlanV1,
  type RequirementSpecV1,
} from "@factory/graph";

import { CompositionService } from "../src/composition/composition.service.js";
import type { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";

const graph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "expense-approval",
    workspaceId: "local-workspace",
    name: "Expense approval",
  },
  page: { pages: [], navigation: [] },
  domain: {
    entities: [
      {
        key: "expense",
        label: "Expense",
        fields: [
          { key: "amount", type: "decimal", required: true },
          { key: "status", type: "enum", required: true },
        ],
        indexes: [{ fields: ["status"] }],
      },
    ],
    relations: [],
  },
  policy: { roles: [], permissions: [] },
  flow: {
    flows: [
      {
        id: "expense-approval",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted"],
        events: ["submit"],
        transitions: [],
      },
    ],
  },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
};

const requirement: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-tracking",
  outcome: "Employees can submit expenses that managers review and approve.",
  actors: [{ key: "employee", label: "Employee" }],
  domainConcepts: [{ key: "expense", label: "Expense claim" }],
  workflows: [{ key: "submit-approve", label: "Submit and approve" }],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a completed expense draft",
      when: "the employee submits",
      then: "the expense reaches submitted status",
    },
  ],
};

const graphHash = hashApplicationGraph(graph);

function planFixture(): CompositionPlanV1 {
  return {
    apiVersion: "factory.composition-plan/v1",
    planId: "expense-approval-plan",
    requirementChecksum: hashRequirementSpec(requirement),
    draftBaseChecksum: graphHash,
    capabilityLocks: [
      {
        key: "core.workflow",
        version: "1.0.1",
        manifestDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    ],
    graphBindings: [
      {
        capabilityKey: "core.workflow",
        inputKey: "flowKey",
        graphSymbol: "graph.flow.expense-approval",
      },
    ],
    outputSlots: [],
    dependencyGraph: [],
    compatibility: { result: "compatible", reasons: [] },
    risks: [],
    assumptions: [],
    complexity: "low",
    acceptanceJourneys: [
      { key: "submit-then-approve", description: "Submit and approve" },
    ],
    explanation: "Add the submit transition to the approval flow.",
    proposedOperations: [
      {
        op: "add",
        path: "/flow/flows/0/transitions/-",
        value: { from: "draft", event: "submit", to: "submitted" },
      },
    ],
  };
}

function diffFixture(plan: CompositionPlanV1) {
  return {
    apiVersion: "factory.graph-diff/v1" as const,
    baseGraphHash: plan.draftBaseChecksum,
    operations: plan.proposedOperations,
  };
}

function decisionFixture(
  plan: CompositionPlanV1,
  overrides: Partial<CompositionDecisionV1> = {},
): CompositionDecisionV1 {
  const diff = diffFixture(plan);
  return {
    apiVersion: "factory.composition-decision/v1",
    decisionId: "decision-1",
    draftId: "draft-cuid-1",
    planChecksum: hashCompositionPlan(plan),
    diffChecksum: hashCompositionDiff(diff),
    reviewer: "qa-reviewer",
    decision: "approved",
    rationale: "The plan binds the Draft and the constrained Diff.",
    decidedAt: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

function clarificationFixture(): CompositionClarificationV1 {
  return {
    apiVersion: "factory.composition-clarification/v1",
    requirementChecksum: hashRequirementSpec(requirement),
    questions: [
      { key: "question-1", question: "Which flow should host the journey?" },
    ],
  };
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
    publishedRevision: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    compilation: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    artifact: { createMany: vi.fn(), findFirst: vi.fn() },
    previewRun: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    verificationRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
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

const latestDraft = {
  id: "draft-cuid-1",
  applicationGraphId: "graph-1",
  revisionNumber: 5,
  graph,
};

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-1",
    applicationGraphId: "graph-1",
    draftRevisionId: "draft-cuid-1",
    requirement,
    requirementChecksum: hashRequirementSpec(requirement),
    draftBaseChecksum: graphHash,
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
    createdAt: new Date("2026-08-08T00:00:00.000Z"),
    updatedAt: new Date("2026-08-08T00:00:00.000Z"),
    ...overrides,
  };
}

function plannerStub(outcome: unknown) {
  return { propose: vi.fn().mockReturnValue(outcome) };
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
  const composition = new CompositionService(
    prisma as unknown as PrismaService,
    planner,
    lifecycle as unknown as LifecycleService,
  );
  return { composition, lifecycle };
}

describe("CompositionService.createRequirement", () => {
  it("creates a planning review bound to the latest Draft revision", async () => {
    const prisma = prismaMock();
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    prisma.compositionReview.create.mockResolvedValue(
      reviewRow({ status: "planning" }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    const result = await composition.createRequirement("graph-1", {
      requirement,
    });

    expect(prisma.compositionReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationGraphId: "graph-1",
        draftRevisionId: "draft-cuid-1",
        requirementChecksum: hashRequirementSpec(requirement),
        draftBaseChecksum: graphHash,
        status: "planning",
      }),
    });
    expect(result.review.status).toBe("planning");
  });

  it("refuses a published-only Graph with no mutable Draft", async () => {
    const prisma = prismaMock();
    prisma.draftRevision.findFirst.mockResolvedValue(null);
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(
      composition.createRequirement("graph-1", { requirement }),
    ).rejects.toThrow(BadRequestException);
  });

  it("redacts persisted keys by refusing raw model material in the requirement", async () => {
    const prisma = prismaMock();
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(
      composition.createRequirement("graph-1", {
        requirement: { ...requirement, rawModelResponse: "leak" },
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      composition.createRequirement("graph-1", {
        requirement: {
          ...requirement,
          openQuestions: [{ question: "?", prompts: ["leak"] }],
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.compositionReview.create).not.toHaveBeenCalled();
  });
});

describe("CompositionService.requestPlan", () => {
  it("stores a schema-valid plan and its constrained Diff when planned", async () => {
    const plan = planFixture();
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({ plan, status: "planned" }),
    );
    const planner = plannerStub({ kind: "plan", plan });
    const { composition } = serviceWith(prisma, planner);

    const result = await composition.requestPlan("graph-1", "review-1");

    expect(planner.propose).toHaveBeenCalledWith(
      requirement,
      expect.objectContaining({
        status: "draft",
        graph,
      }),
    );
    const diff = diffFixture(plan);
    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: expect.objectContaining({
        planChecksum: hashCompositionPlan(plan),
        diffChecksum: hashCompositionDiff(diff),
        planId: "expense-approval-plan",
        status: "planned",
      }),
    });
    expect(result.plan).toEqual(plan);
  });

  it("answers a bounded clarification without guessing when the planner clarifies", async () => {
    const clarification = clarificationFixture();
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({ clarification, status: "clarification_required" }),
    );
    const { composition } = serviceWith(
      prisma,
      plannerStub({ kind: "clarification", clarification }),
    );

    const result = await composition.requestPlan("graph-1", "review-1");

    expect(result.clarification).toEqual(clarification);
    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: expect.objectContaining({ status: "clarification_required" }),
    });
  });

  it("is idempotent: a planned review is returned without re-planning", async () => {
    const plan = planFixture();
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        planChecksum: hashCompositionPlan(plan),
        status: "planned",
      }),
    );
    const planner = plannerStub({ kind: "plan", plan });
    const { composition } = serviceWith(prisma, planner);

    const first = await composition.requestPlan("graph-1", "review-1");
    const second = await composition.requestPlan("graph-1", "review-1");

    expect(planner.propose).not.toHaveBeenCalled();
    expect(first.review.plan).toEqual(plan);
    expect(second.review.plan).toEqual(plan);
  });

  it("refuses a stale Draft that moved since the review was created", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestDraft,
      id: "draft-cuid-2",
      graph: {
        ...graph,
        experience: { theme: { mode: "dark", tokens: {} }, locales: ["en"] },
      },
    });
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("keeps the plan scope with the Graph: a review is not visible to another Graph", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({ applicationGraphId: "graph-other" }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("refuses to persist a plan whose operation value carries unsafe material", async () => {
    const unsafePlan: CompositionPlanV1 = {
      ...planFixture(),
      proposedOperations: [
        {
          op: "add",
          path: "/flow/flows/0/transitions/-",
          value: {
            from: "draft",
            event: "submit",
            to: "submitted",
            callbackUrl: "https://evil.example.com/ingest",
          },
        },
      ],
    };
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const { composition } = serviceWith(
      prisma,
      plannerStub({ kind: "plan", plan: unsafePlan }),
    );

    // The scan runs before the prisma update, so nothing unsafe is persisted.
    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(ConflictException);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses a seam plan that does not bind the review requirement", async () => {
    const foreignPlan: CompositionPlanV1 = {
      ...planFixture(),
      requirementChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    };
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const { composition } = serviceWith(
      prisma,
      plannerStub({ kind: "plan", plan: foreignPlan }),
    );

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow("Composition plan rejected");
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});

describe("CompositionService.decide", () => {
  const plan = planFixture();
  const diff = diffFixture(plan);

  it("records an approved decision bound to the stored plan and Diff", async () => {
    const decision = decisionFixture(plan);
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        planChecksum: hashCompositionPlan(plan),
        diff,
        diffChecksum: hashCompositionDiff(diff),
        status: "planned",
      }),
    );
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({
        plan,
        planChecksum: hashCompositionPlan(plan),
        diff,
        diffChecksum: hashCompositionDiff(diff),
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    const result = await composition.decide("graph-1", "review-1", {
      decision,
    });

    expect(prisma.compositionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: expect.objectContaining({
        decisionId: "decision-1",
        status: "approved",
      }),
    });
    expect(result.review.status).toBe("approved");
  });

  it("refuses a decision when no plan exists yet", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    const { composition } = serviceWith(prisma, plannerStub(null));

    // The status guard must be the refuser: a decision with otherwise
    // matching checksums still fails because the review has no plan state.
    await expect(
      composition.decide("graph-1", "review-1", {
        decision: decisionFixture(plan),
      }),
    ).rejects.toThrow("Review has no plan to decide on.");
  });

  it("refuses a decision whose plan checksum was altered", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        status: "planned",
        planChecksum: hashCompositionPlan(plan),
        diffChecksum: hashCompositionDiff(diff),
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));
    const tampered = decisionFixture(plan, {
      planChecksum:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    await expect(
      composition.decide("graph-1", "review-1", { decision: tampered }),
    ).rejects.toThrow("Decision plan checksum does not match the stored plan.");
  });

  it("refuses a decision whose Diff checksum was altered", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        status: "planned",
        planChecksum: hashCompositionPlan(plan),
        diffChecksum: hashCompositionDiff(diff),
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));
    const tampered = decisionFixture(plan, {
      diffChecksum:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    });

    await expect(
      composition.decide("graph-1", "review-1", { decision: tampered }),
    ).rejects.toThrow("Decision Diff checksum does not match the stored Diff.");
  });

  it("refuses a decision for a different Draft revision", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        status: "planned",
        planChecksum: hashCompositionPlan(plan),
        diffChecksum: hashCompositionDiff(diff),
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(
      composition.decide("graph-1", "review-1", {
        decision: decisionFixture(plan, { draftId: "draft-cuid-other" }),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("is idempotent for the same decision and refuses a conflicting one", async () => {
    const decision = decisionFixture(plan);
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    const same = await composition.decide("graph-1", "review-1", {
      decision,
    });
    expect(same.review.decisionId).toBe("decision-1");

    await expect(
      composition.decide("graph-1", "review-1", {
        decision: decisionFixture(plan, { decisionId: "decision-2" }),
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe("CompositionService.apply", () => {
  const plan = planFixture();
  const diff = diffFixture(plan);
  const decision = decisionFixture(plan);

  it("applies only the approved Diff through the Draft lifecycle", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        decision,
        decisionId: decision.decisionId,
        status: "applied",
      }),
    );
    const { composition, lifecycle } = serviceWith(prisma, plannerStub(null));

    const result = await composition.apply("graph-1", "review-1");

    expect(lifecycle.appendDraftRevision).toHaveBeenCalledWith(
      "graph-1",
      expect.objectContaining({
        graph: expect.objectContaining({
          flow: expect.objectContaining({
            flows: [
              expect.objectContaining({
                transitions: [
                  { from: "draft", event: "submit", to: "submitted" },
                ],
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

  it("refuses to apply an unapproved plan", async () => {
    const rejected = decisionFixture(plan, {
      decisionId: "decision-rejected-1",
      decision: "rejected",
    });
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        decision: rejected,
        decisionId: rejected.decisionId,
        status: "rejected",
        planChecksum: hashCompositionPlan(plan),
        diffChecksum: hashCompositionDiff(diff),
      }),
    );
    const { composition } = serviceWith(prisma, plannerStub(null));

    // The status guard must be the refuser: a fully recorded rejected review
    // still fails the approval gate, not the missing-plan/decision checks.
    await expect(composition.apply("graph-1", "review-1")).rejects.toThrow(
      "Only an approved plan can be applied to the Draft.",
    );
  });

  it("refuses to apply when the approved Diff no longer matches the decision", async () => {
    const tamperedDiff = {
      ...diff,
      operations: [
        {
          op: "add" as const,
          path: "/flow/flows/0/transitions/-",
          value: { from: "submitted", event: "approve", to: "approved" },
        },
      ],
    };
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff: tamperedDiff,
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(composition.apply("graph-1", "review-1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("refuses to apply against a Draft that moved since approval", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan,
        diff,
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    prisma.draftRevision.findFirst.mockResolvedValue({
      ...latestDraft,
      id: "draft-cuid-2",
      graph: {
        ...graph,
        experience: { theme: { mode: "dark", tokens: {} }, locales: ["en"] },
      },
    });
    const { composition } = serviceWith(prisma, plannerStub(null));

    await expect(composition.apply("graph-1", "review-1")).rejects.toThrow(
      ConflictException,
    );
  });

  it("bounds application errors when the approved Diff cannot resolve", async () => {
    const unreachablePlan: CompositionPlanV1 = {
      ...planFixture(),
      proposedOperations: [
        {
          op: "add",
          path: "/flow/flows/9/transitions/-",
          value: { from: "draft", event: "submit", to: "submitted" },
        },
      ],
    };
    const unreachableDiff = diffFixture(unreachablePlan);
    const decision = decisionFixture(unreachablePlan);
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        plan: unreachablePlan,
        planChecksum: hashCompositionPlan(unreachablePlan),
        diff: unreachableDiff,
        diffChecksum: hashCompositionDiff(unreachableDiff),
        decision,
        decisionId: decision.decisionId,
        status: "approved",
      }),
    );
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const { composition } = serviceWith(prisma, plannerStub(null));

    // The Graph-level failure surfaces as a bounded conflict, not a raw 500.
    await expect(composition.apply("graph-1", "review-1")).rejects.toThrow(
      "Composition application refused",
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});
