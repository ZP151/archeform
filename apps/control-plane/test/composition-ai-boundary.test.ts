import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  CompositionError,
  createDraftRevision,
  hashApplicationGraph,
  hashRequirementSpec,
  type ApplicationGraphV1,
  type CompositionPlanV1,
  type RequirementSpecV1,
} from "@factory/graph";

import { CompositionService } from "../src/composition/composition.service.js";
import type { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";

/**
 * The AI boundary at the Control Plane seam. Whatever adapter implementation
 * is injected at COMPOSITION_PLANNER — deterministic today, a guarded model
 * adapter later — the service may only persist the constrained projection of
 * a schema-valid proposal or a bounded clarification, and provider failures
 * surface as bounded conflicts. Raw prompts, model responses, and credentials
 * never cross into persistence.
 */

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

function planFixture(
  overrides: Record<string, unknown> = {},
): CompositionPlanV1 {
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
    risks: [
      {
        key: "model-risk",
        level: "low",
        description: "A model-observed risk.",
      },
    ],
    assumptions: ["Model-added assumption."],
    complexity: "low",
    acceptanceJourneys: [
      { key: "submit-then-approve", description: "Submit and approve" },
    ],
    explanation: "Model-confirmed: add the submit transition.",
    proposedOperations: [
      {
        op: "add",
        path: "/flow/flows/0/transitions/-",
        value: { from: "draft", event: "submit", to: "submitted" },
      },
    ],
    ...overrides,
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

function throwingPlanner(error: unknown) {
  // The provider seam is synchronous: bounded failures throw, they never
  // return a rejected promise.
  return {
    propose: vi.fn().mockImplementation(() => {
      throw error;
    }),
  };
}

function serviceWith(
  prisma: ReturnType<typeof prismaMock>,
  planner: ReturnType<typeof plannerStub> | ReturnType<typeof throwingPlanner>,
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

/** Walks every key and string leaf; calls check for each string leaf. */
function walkStrings(value: unknown, check: (leaf: string) => void): void {
  if (typeof value === "string") {
    check(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) walkStrings(entry, check);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      check(key);
      walkStrings(child, check);
    }
  }
}

async function plannedService(planner: unknown) {
  const prisma = prismaMock();
  prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
  prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
  prisma.compositionReview.update.mockResolvedValue(
    reviewRow({ status: "planned" }),
  );
  const { composition } = serviceWith(
    prisma,
    planner as ReturnType<typeof plannerStub>,
  );
  return { prisma, composition };
}

describe("CompositionService AI planning boundary", () => {
  it("persists only the constrained projection of a provider plan", async () => {
    const { prisma, composition } = await plannedService(
      plannerStub({ kind: "plan", plan: planFixture() }),
    );

    const result = await composition.requestPlan("graph-1", "review-1");

    expect(result.review.status).toBe("planned");
    expect(result.safeSummary).toEqual({
      planId: "expense-approval-plan",
      capabilityLocks: [{ key: "core.workflow", version: "1.0.1" }],
      graphBindings: [
        {
          capabilityKey: "core.workflow",
          inputKey: "flowKey",
          graphSymbol: "graph.flow.expense-approval",
        },
      ],
      outputSlots: [],
      operationCount: 1,
      complexity: "low",
      acceptanceJourneys: 1,
    });
    // The safe projection carries no free-form text.
    expect(JSON.stringify(result.safeSummary)).not.toMatch(
      /explanation|assumptions|risks|model/,
    );

    // The plan step's persisted payload: the full plan plus its bounded
    // projection. Walk every key and string leaf.
    const stored = prisma.compositionReview.update.mock.calls[0][0].data;
    const serialized = JSON.stringify(stored);
    // Raw prompt, response, and credential material never crosses.
    expect(serialized).not.toMatch(
      /outputText|rawModelResponse|rawModelOutput|"prompt"|apiKey|OPENAI/,
    );
    // No unsafe material in any stored key or leaf.
    walkStrings(stored, (leaf) => {
      expect(leaf).not.toMatch(/:\/\//);
      expect(leaf).not.toContain("www.");
      expect(leaf).not.toContain("__proto__");
      expect(leaf).not.toMatch(/^[a-zA-Z]:[\\/]/);
    });
  });

  it("stores a bounded clarification without a plan and re-plans idempotently", async () => {
    const prisma = prismaMock();
    prisma.compositionReview.findUnique.mockResolvedValue(reviewRow());
    prisma.draftRevision.findFirst.mockResolvedValue(latestDraft);
    const planner = plannerStub({
      kind: "clarification",
      clarification: {
        apiVersion: "factory.composition-clarification/v1",
        requirementChecksum: hashRequirementSpec(requirement),
        questions: [
          { key: "question-1", question: "Which flow hosts the journey?" },
        ],
      },
    });
    prisma.compositionReview.update.mockResolvedValue(
      reviewRow({ status: "clarification_required" }),
    );
    const { composition } = serviceWith(prisma, planner);

    const first = await composition.requestPlan("graph-1", "review-1");

    expect(first.review.status).toBe("clarification_required");
    expect(first.review.planChecksum).toBeNull();
    expect(prisma.compositionReview.update.mock.calls[0][0].data).toMatchObject(
      {
        status: "clarification_required",
      },
    );
    const stored = prisma.compositionReview.update.mock.calls[0][0].data;
    expect(stored.clarification.questions[0]).toEqual({
      key: "question-1",
      question: "Which flow hosts the journey?",
    });
    expect(stored).not.toHaveProperty("plan");
    expect(stored).not.toHaveProperty("safeSummary");

    // A review that already carries a clarification is not re-planned.
    prisma.compositionReview.findUnique.mockResolvedValue(
      reviewRow({
        status: "clarification_required",
        clarification: stored.clarification,
      }),
    );
    const second = await composition.requestPlan("graph-1", "review-1");
    expect(second.review.id).toBe("review-1");
    expect(planner.propose).toHaveBeenCalledTimes(1);
  });

  it("maps a bounded provider failure to a conflict without persisting", async () => {
    const { prisma, composition } = await plannedService(
      throwingPlanner(
        new CompositionError(
          "The recipe catalogue cannot resolve this requirement.",
        ),
      ),
    );

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(
      new ConflictException(
        "Composition planning failed: The recipe catalogue cannot resolve this requirement.",
      ),
    );
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses a provider plan carrying unsafe business text before persistence", async () => {
    const { prisma, composition } = await plannedService(
      plannerStub({
        kind: "plan",
        plan: planFixture({
          explanation:
            "Model-confirmed: see https://evil.example.com/ingest for the process.",
        }),
      }),
    );

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(/Composition plan rejected/);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses a provider plan carrying a URL inside a Diff path", async () => {
    // QA-1: the operation-value scan never covered path strings, so URL
    // material embedded in a path persisted through the seam. The plan must be
    // rejected with nothing persisted.
    const { prisma, composition } = await plannedService(
      plannerStub({
        kind: "plan",
        plan: planFixture({
          proposedOperations: [
            {
              op: "replace",
              path: "/page/0/https://evil.example.com/ingest",
              value: { title: "clean" },
            },
          ],
        }),
      }),
    );

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(/Composition plan rejected/);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });

  it("refuses a provider plan carrying an escaped URL inside a Diff path", async () => {
    // QA-4-1: `~1`-escaped material decodes to a URL after the raw string
    // scan, so the raw pointer carries no literal `://`. The decoded-segment
    // scan must still refuse the plan with nothing persisted.
    const { prisma, composition } = await plannedService(
      plannerStub({
        kind: "plan",
        plan: planFixture({
          proposedOperations: [
            {
              op: "add",
              path: "/experience/theme/tokens/https:~1~1evil.example.com",
              value: "clean",
            },
          ],
        }),
      }),
    );

    await expect(
      composition.requestPlan("graph-1", "review-1"),
    ).rejects.toThrow(/Composition plan rejected/);
    expect(prisma.compositionReview.update).not.toHaveBeenCalled();
  });
});
