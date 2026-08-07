import { describe, expect, it } from "vitest";

import {
  applyApprovedComposition,
  applyGraphDiffToDraft,
  assertPlanAgainstRequirement,
  CompositionError,
  createDraftRevision,
  hashApplicationGraph,
  hashCompositionDiff,
  hashCompositionPlan,
  hashRequirementSpec,
  parseCompositionClarification,
  parseCompositionDecision,
  parseCompositionPlan,
  type ApplicationGraphV1,
  type CompositionDecisionV1,
  type CompositionPlanV1,
  type RequirementSpecV1,
} from "../src/index.js";

const requirement: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-tracking",
  outcome: "Employees submit expenses that managers review and approve.",
  actors: [
    { key: "employee", label: "Employee" },
    { key: "manager", label: "Manager" },
  ],
  domainConcepts: [{ key: "expense", label: "Expense claim" }],
  workflows: [{ key: "submit-approve", label: "Submit and approve" }],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a draft",
      when: "the employee submits",
      then: "the expense reaches submitted status",
    },
  ],
};

const expenseGraph: ApplicationGraphV1 = {
  apiVersion: "factory.application-graph/v1",
  metadata: {
    id: "expense-approval",
    workspaceId: "local-workspace",
    name: "Expense approval",
  },
  page: {
    pages: [
      {
        id: "expense-list",
        route: "/expenses",
        title: "Expenses",
        blocks: [
          { id: "expense-table", type: "data-table", entity: "expense" },
        ],
      },
    ],
    navigation: [{ id: "expenses", label: "Expenses", pageId: "expense-list" }],
  },
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
  policy: {
    roles: ["employee", "manager"],
    permissions: [
      { role: "employee", resource: "expense", actions: ["create", "read"] },
      { role: "manager", resource: "expense", actions: ["read", "approve"] },
    ],
  },
  flow: {
    flows: [
      {
        id: "expense-approval",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted", "approved", "rejected"],
        events: ["submit", "approve", "reject"],
        transitions: [
          { from: "draft", event: "submit", to: "submitted" },
          {
            from: "submitted",
            event: "approve",
            to: "approved",
            roles: ["manager"],
          },
        ],
      },
    ],
  },
  integration: {
    providers: [],
    capabilities: [
      { key: "core.workflow", providerId: "factory", operation: "advance" },
    ],
  },
  experience: {
    theme: { mode: "system", tokens: {} },
    locales: ["en"],
  },
};

const draft = createDraftRevision(expenseGraph, "expense-approval");

function planFixture(): CompositionPlanV1 {
  return {
    apiVersion: "factory.composition-plan/v1",
    planId: "expense-plan-1",
    requirementChecksum: hashRequirementSpec(requirement),
    draftBaseChecksum: hashApplicationGraph(draft.graph),
    capabilityLocks: [
      {
        key: "core.workflow",
        version: "1.1.0",
        manifestDigest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      },
    ],
    graphBindings: [
      {
        capabilityKey: "core.workflow",
        inputKey: "subjectEntity",
        graphSymbol: "graph.domain.expense",
      },
    ],
    outputSlots: [
      {
        capabilityKey: "core.workflow",
        slot: "flow",
        surface: "flow",
      },
    ],
    dependencyGraph: [],
    compatibility: {
      result: "compatible",
      reasons: ["core.workflow is compatible with the expense Draft."],
    },
    risks: [],
    assumptions: ["Expense amounts are decimals."],
    complexity: "low",
    acceptanceJourneys: [
      {
        key: "submit-then-approve",
        description: "Employee submits; manager approves.",
      },
    ],
    explanation:
      "core.workflow drives the declared submit/approve state machine over the expense entity.",
    proposedOperations: [
      {
        op: "add",
        path: "/flow/flows/0/transitions/-",
        value: { from: "submitted", event: "reject", to: "rejected" },
      },
    ],
  };
}

const safeDiff = {
  apiVersion: "factory.graph-diff/v1",
  operations: planFixture().proposedOperations,
};

function approvedDecision(plan: CompositionPlanV1): CompositionDecisionV1 {
  return {
    apiVersion: "factory.composition-decision/v1",
    decisionId: "expense-decision-1",
    draftId: draft.id,
    planChecksum: hashCompositionPlan(plan),
    diffChecksum: hashCompositionDiff(safeDiff),
    reviewer: "reviewer-a",
    decision: "approved",
    rationale: "Plan and Diff are consistent with the requirement.",
    decidedAt: "2026-08-08T00:00:00.000Z",
  };
}

describe("CompositionPlanV1", () => {
  it("parses a complete plan bound to a requirement and Draft", () => {
    const plan = parseCompositionPlan(planFixture());
    expect(plan.planId).toBe("expense-plan-1");
  });

  it("rejects a mutable asset lock without a manifest digest", () => {
    const { manifestDigest: _digest, ...mutableLock } =
      planFixture().capabilityLocks[0];
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        capabilityLocks: [mutableLock],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects package paths and URLs in lock keys and text", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        capabilityLocks: [
          {
            key: "packages/core/workflow",
            version: "1.1.0",
            manifestDigest:
              "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          },
        ],
      }),
    ).toThrow(CompositionError);
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        explanation: "Fetch pricing from https://pricing.example.com.",
      }),
    ).toThrow(CompositionError);
  });

  it("rejects duplicate graph bindings for the same capability input", () => {
    const bindings = planFixture().graphBindings;
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        graphBindings: [...bindings, bindings[0]],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects output slots for a capability that is not locked", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        outputSlots: [
          { capabilityKey: "core.crud", slot: "crud", surface: "api" },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a stale requirement checksum at binding time", () => {
    const plan = parseCompositionPlan({
      ...planFixture(),
      requirementChecksum:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(() => assertPlanAgainstRequirement(plan, requirement)).toThrow(
      CompositionError,
    );
  });

  it("rejects bindings whose Graph symbols do not exist in the base Draft", () => {
    const plan = parseCompositionPlan({
      ...planFixture(),
      graphBindings: [
        {
          capabilityKey: "core.workflow",
          inputKey: "subjectEntity",
          graphSymbol: "graph.domain.nonexistent",
        },
      ],
    });
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("parses a bounded clarification set", () => {
    const clarification = parseCompositionClarification({
      apiVersion: "factory.composition-clarification/v1",
      requirementChecksum: hashRequirementSpec(requirement),
      questions: [
        { key: "currency", question: "Which currency do expenses use?" },
      ],
    });
    expect(clarification.questions).toHaveLength(1);
  });

  it("hashes canonically regardless of object key order", () => {
    const plan = planFixture();
    const first = hashCompositionPlan(plan);
    const reordered: unknown = {
      acceptanceJourneys: plan.acceptanceJourneys,
      apiVersion: plan.apiVersion,
      assumptions: plan.assumptions,
      capabilityLocks: plan.capabilityLocks,
      compatibility: plan.compatibility,
      complexity: plan.complexity,
      dependencyGraph: plan.dependencyGraph,
      draftBaseChecksum: plan.draftBaseChecksum,
      explanation: plan.explanation,
      graphBindings: plan.graphBindings,
      outputSlots: plan.outputSlots,
      planId: plan.planId,
      proposedOperations: plan.proposedOperations,
      requirementChecksum: plan.requirementChecksum,
      risks: plan.risks,
    };
    expect(hashCompositionPlan(reordered)).toBe(first);
  });
});

describe("CompositionDecisionV1 and Draft-only application", () => {
  it("applies an approved plan-bound Diff to a mutable Draft", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = approvedDecision(plan);
    const next = applyApprovedComposition(decision, plan, draft, safeDiff);
    expect(next.revision).toBe(draft.revision + 1);
    expect(next.graph.flow.flows[0].transitions).toHaveLength(3);
  });

  it("rejects an unapproved decision", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = { ...approvedDecision(plan), decision: "rejected" };
    expect(() =>
      applyApprovedComposition(decision, plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects an altered plan checksum", () => {
    const plan = parseCompositionPlan(planFixture());
    const decision = {
      ...approvedDecision(plan),
      planChecksum:
        "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    };
    expect(() =>
      applyApprovedComposition(decision, plan, draft, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects a diff whose checksum does not match the decision", () => {
    const plan = parseCompositionPlan(planFixture());
    const tampered = {
      apiVersion: "factory.graph-diff/v1",
      operations: [{ op: "remove", path: "/flow/flows/0/transitions/0" }],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, tampered),
    ).toThrow(CompositionError);
  });

  it("refuses a non-Draft base revision even with matching checksums", () => {
    const plan = parseCompositionPlan(planFixture());
    const published = { ...draft, status: "published" as const };
    expect(() =>
      applyApprovedComposition(
        approvedDecision(plan),
        plan,
        published,
        safeDiff,
      ),
    ).toThrow(CompositionError);
  });

  it("refuses a stale Draft whose graph hash drifted", () => {
    const plan = parseCompositionPlan(planFixture());
    const drifted = applyGraphDiffToDraft(draft, {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        { op: "replace", path: "/metadata/name", value: "Renamed expense" },
      ],
    });
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, drifted, safeDiff),
    ).toThrow(CompositionError);
  });

  it("rejects unsafe operations outside the plan's declared Diff", () => {
    const plan = parseCompositionPlan(planFixture());
    const unsafe = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        { op: "replace", path: "/integration/assetLocks", value: [] },
      ],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, unsafe),
    ).toThrow(CompositionError);
  });

  // The plan-level guard fires during parse, so the bad operation must ride
  // inside the plan's own proposedOperations (an apply-level check would be
  // masked by the decision checksum binding).
  it("rejects a plan whose proposedOperations rewrite the whole integration subtree", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          {
            op: "replace",
            path: "/integration",
            value: {
              providers: [],
              capabilities: [],
              assetLocks: [
                {
                  key: "core.workflow",
                  version: "2.0.0",
                  packageRoot:
                    "packages/capabilities/assets/core.workflow/2.0.0",
                  manifestDigest:
                    "sha256:2222222222222222222222222222222222222222222222222222222222222222",
                  lifecycle: "golden",
                },
              ],
              compositionProfile: "expense-approval",
            },
          },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects a plan whose proposedOperations remove the integration root", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [{ op: "remove", path: "/integration" }],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects an escaped ~1__proto__ add path after pointer decoding", () => {
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        proposedOperations: [
          { op: "add", path: "/page/~1__proto__", value: { injected: true } },
        ],
      }),
    ).toThrow(CompositionError);
  });

  it("rejects case variants of prototype keys in operation paths", () => {
    for (const path of [
      "/page/Constructor",
      "/page/PROTOTYPE",
      "/page/~1__PROTO__",
      "/flow/Prototype",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          proposedOperations: [{ op: "add", path, value: { injected: true } }],
        }),
      ).toThrow(CompositionError);
    }
  });

  it("rejects prototype-key material in business text but keeps natural prose", () => {
    for (const payload of [
      "__proto__",
      "constructor",
      "prototype",
      "Constructor",
      "constructor ",
      " prototype",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }),
      ).toThrow(CompositionError);
    }
    expect(() =>
      parseCompositionPlan({
        ...planFixture(),
        explanation: "Reference __proto__ is never legitimate.",
      }),
    ).toThrow(CompositionError);
    expect(
      parseCompositionPlan({
        ...planFixture(),
        explanation: "The prototype journey was reviewed.",
      }).explanation,
    ).toBe("The prototype journey was reviewed.");
  });

  it("rejects www-prefixed domains while keeping bare placeholder domains", () => {
    for (const payload of [
      "See www.example.com for the ledger policy.",
      "See WWW.example.com for the ledger policy.",
      "Hosted at (www.example.com) behind a proxy.",
      "Mirror;www.x.com hosts the report.",
    ]) {
      expect(() =>
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }),
      ).toThrow(CompositionError);
    }
    for (const payload of [
      "See example.com for the ledger policy.",
      "bwww.example.com hosts the report.",
    ]) {
      expect(
        parseCompositionPlan({
          ...planFixture(),
          explanation: payload,
        }).explanation,
      ).toBe(payload);
    }
  });

  it("rejects a Diff with an operation the plan never declared", () => {
    const plan = parseCompositionPlan(planFixture());
    const undeclared = {
      apiVersion: "factory.graph-diff/v1",
      operations: [
        ...safeDiff.operations,
        { op: "replace", path: "/metadata/name", value: "Renamed" },
      ],
    };
    expect(() =>
      applyApprovedComposition(approvedDecision(plan), plan, draft, undeclared),
    ).toThrow(CompositionError);
  });

  it("rejects an altered decidedAt in the persisted decision record", () => {
    expect(() =>
      parseCompositionDecision({
        ...approvedDecision(parseCompositionPlan(planFixture())),
        decidedAt: "not-a-date",
      }),
    ).toThrow(CompositionError);
  });
});
