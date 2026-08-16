import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  createDraftRevision,
  hashApplicationGraph,
  hashRequirementSpec,
  type ApplicationGraphV1,
  type DraftRevisionV1,
  type ProfileRecipeV1,
  type RequirementSpecV1,
} from "@factory/graph";
import type { ProfileRecipeCatalogV1 } from "@factory/graph";
import {
  currentCapabilityAssets,
  planComposition,
} from "@factory/capabilities/node";
import type { CapabilityAssetV1 } from "@factory/capabilities/node";
import type { OpenAIResponseTransport } from "../src/ai.js";

import {
  CompositionPlannerError,
  DeterministicCompositionPlannerAdapter,
  type CompositionPlannerInputV1,
} from "../src/composition/deterministic-planner.js";
import { OpenAIConstrainedCompositionPlannerAdapter } from "../src/composition/openai-planner.js";

/** The monorepo root: capability packageRoot paths are repository-relative. */
const repositoryRoot = resolve(process.cwd(), "..", "..");

const requirementFixture: RequirementSpecV1 = {
  apiVersion: "factory.requirement-spec/v1",
  requirementId: "expense-tracking",
  outcome: "Employees can submit expenses that managers review and approve.",
  actors: [
    {
      key: "employee",
      label: "Employee",
      description: "Submits expense claims",
    },
    { key: "manager", label: "Manager", description: "Reviews and approves" },
  ],
  domainConcepts: [
    {
      key: "expense",
      label: "Expense claim",
      description: "A submitted claim",
    },
  ],
  workflows: [
    {
      key: "submit-approve",
      label: "Submit and approve",
      description: "Draft, submit, approve, reject",
    },
  ],
  constraints: [],
  openQuestions: [],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a completed expense draft",
      when: "the employee submits and the manager approves",
      then: "the expense reaches approved status",
    },
  ],
};

const draftGraphFixture: ApplicationGraphV1 = {
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
  policy: { roles: ["employee", "manager"], permissions: [] },
  flow: {
    flows: [
      {
        id: "expense-approval",
        entity: "expense",
        initialState: "draft",
        states: ["draft", "submitted", "approved", "rejected"],
        events: ["submit", "approve", "reject"],
        transitions: [],
      },
    ],
  },
  integration: { providers: [], capabilities: [] },
  experience: { theme: { mode: "system", tokens: {} }, locales: ["en"] },
};

const draft: DraftRevisionV1 = createDraftRevision(
  draftGraphFixture,
  "draft-adapter-1",
);

function recipeFixture(): ProfileRecipeV1 {
  return {
    id: "expense-approval",
    name: "Expense approval",
    domain: "internal-workflow",
    description: "Employees submit expenses that managers review and approve.",
    capabilities: [{ key: "core.workflow", version: "1.0.1" }],
    bindings: [
      {
        capabilityKey: "core.workflow",
        inputKey: "flowKey",
        required: true,
        target: "flow.flow",
      },
    ],
    surfaces: ["api", "flow"],
    acceptanceJourneys: ["submit-then-approve"],
    status: "anchor",
  };
}

function catalogFixture(
  recipes: ProfileRecipeV1[] = [recipeFixture()],
): ProfileRecipeCatalogV1 {
  return {
    apiVersion: "factory.profile-recipe-catalog/v1",
    schemaVersion: "v1",
    recipes,
  };
}

/** The model's normalized requirement: the fixture plus one constraint. */
const modelRequirement: RequirementSpecV1 = {
  ...requirementFixture,
  constraints: [
    {
      key: "review-deadline",
      kind: "compliance",
      statement: "Managers review within five working days.",
    },
  ],
};

function inputFixture(
  brief: unknown,
  catalog: ProfileRecipeCatalogV1 = catalogFixture(),
): CompositionPlannerInputV1 {
  return {
    brief,
    baseDraft: draft,
    approvedAssets: currentCapabilityAssets,
    repositoryRoot,
    catalog,
  };
}

/** The plan the deterministic authority produces for the model requirement. */
function referencePlanFor(modelRequirementToUse: RequirementSpecV1) {
  const outcome = planComposition(
    modelRequirementToUse,
    catalogFixture(),
    draft,
    repositoryRoot,
    currentCapabilityAssets,
  );
  expect(outcome.kind).toBe("plan");
  if (outcome.kind !== "plan") throw new Error("expected a plan");
  return outcome.plan;
}

function modelPayload(modelRequirementToUse: RequirementSpecV1) {
  const reference = referencePlanFor(modelRequirementToUse);
  return {
    requirement: modelRequirementToUse,
    plan: {
      capabilityLocks: reference.capabilityLocks.map(({ key, version }) => ({
        key,
        version,
      })),
      graphBindings: reference.graphBindings,
      outputSlots: reference.outputSlots,
      compatibility: {
        result: "compatible" as const,
        reasons: ["Model review confirms the workflow lock."],
      },
      risks: [
        {
          key: "model-risk",
          level: "low" as const,
          description: "Model-observed review risk.",
        },
      ],
      assumptions: ["Model-added assumption."],
      explanation:
        "Model-confirmed plan: core.workflow drives the expense approval flow.",
    },
  };
}

function fixtureTransport(payload: unknown): OpenAIResponseTransport {
  return {
    create: vi.fn(async () => ({
      outputText: JSON.stringify(payload),
    })),
  };
}

describe("DeterministicCompositionPlannerAdapter", () => {
  it("returns a proposal whose plan equals the deterministic planner output", async () => {
    const adapter = new DeterministicCompositionPlannerAdapter();
    const outcome = await adapter.propose(inputFixture(requirementFixture));

    expect(outcome.kind).toBe("proposal");
    if (outcome.kind !== "proposal") throw new Error("expected a proposal");
    expect(outcome.requirement).toEqual(requirementFixture);
    expect(outcome.plan.planId).toBe("expense-tracking-expense-approval");
    expect(outcome.plan.requirementChecksum).toBe(
      hashRequirementSpec(requirementFixture),
    );
    expect(outcome.plan.draftBaseChecksum).toBe(
      hashApplicationGraph(draftGraphFixture),
    );
    expect(outcome.plan.capabilityLocks[0]).toEqual({
      key: "core.workflow",
      version: "1.0.1",
      manifestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
  });

  it("returns only parsed artifacts: no raw brief or model material on the outcome", async () => {
    const adapter = new DeterministicCompositionPlannerAdapter();
    const outcome = await adapter.propose(inputFixture(requirementFixture));

    expect(Object.keys(outcome).sort()).toEqual([
      "kind",
      "plan",
      "requirement",
    ]);
    expect(outcome).not.toHaveProperty("outputText");
    expect(outcome).not.toHaveProperty("prompt");
    expect(outcome).not.toHaveProperty("rawModelResponse");
  });

  it("refuses a structured brief that is not a schema-valid requirement", async () => {
    const adapter = new DeterministicCompositionPlannerAdapter();

    await expect(
      adapter.propose(inputFixture({ outcome: "free prose", noActors: true })),
    ).rejects.toThrow(CompositionPlannerError);
    await expect(
      adapter.propose(
        inputFixture({
          ...requirementFixture,
          outcome: "See https://evil.example.com for the process.",
        }),
      ),
    ).rejects.toThrow(CompositionPlannerError);
    await expect(
      adapter.propose(inputFixture({ ...requirementFixture, extraKey: 1 })),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("returns the bounded clarification for an unresolvable requirement", async () => {
    const adapter = new DeterministicCompositionPlannerAdapter();
    const outcome = await adapter.propose(
      inputFixture(requirementFixture, catalogFixture([])),
    );

    expect(outcome.kind).toBe("clarification");
    if (outcome.kind !== "clarification") {
      throw new Error("expected a clarification");
    }
    expect(outcome.clarification.requirementChecksum).toBe(
      hashRequirementSpec(requirementFixture),
    );
    expect(outcome.clarification.questions.length).toBeGreaterThan(0);
  });
});

describe("OpenAIConstrainedCompositionPlannerAdapter", () => {
  it("returns a proposal bound to the model requirement with authoritative derived fields", async () => {
    const transport = fixtureTransport(modelPayload(modelRequirement));
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport,
      readEnvironment: () => "test-key",
    });

    const outcome = await adapter.propose(
      inputFixture("Employees submit expenses; managers approve."),
    );

    expect(outcome.kind).toBe("proposal");
    if (outcome.kind !== "proposal") throw new Error("expected a proposal");
    expect(outcome.requirement).toEqual(modelRequirement);
    expect(outcome.plan.requirementChecksum).toBe(
      hashRequirementSpec(modelRequirement),
    );
    expect(outcome.plan.draftBaseChecksum).toBe(
      hashApplicationGraph(draftGraphFixture),
    );
    expect(outcome.plan.explanation).toContain("Model-confirmed plan");
    // Derived fields come from the deterministic planner, never the model.
    const reference = referencePlanFor(modelRequirement);
    expect(outcome.plan.proposedOperations).toEqual(
      reference.proposedOperations,
    );
    expect(outcome.plan.dependencyGraph).toEqual(reference.dependencyGraph);
    expect(outcome.plan.complexity).toBe(reference.complexity);
    // The model is allowed no raw material on the outcome.
    expect(Object.keys(outcome).sort()).toEqual([
      "kind",
      "plan",
      "requirement",
    ]);
  });

  it("fails closed when the model selects a capability version outside the approved assets", async () => {
    const payload = modelPayload(modelRequirement);
    payload.plan.capabilityLocks = [{ key: "core.workflow", version: "9.9.9" }];
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(payload),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("fails closed when the model's locks diverge from deterministic resolution", async () => {
    const payload = modelPayload(modelRequirement);
    payload.plan.capabilityLocks = [{ key: "core.workflow", version: "1.0.0" }];
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(payload),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("fails closed when the model's bindings diverge from deterministic resolution", async () => {
    const payload = modelPayload(modelRequirement);
    payload.plan.graphBindings = [
      {
        capabilityKey: "core.workflow",
        inputKey: "flowKey",
        graphSymbol: "graph.flow.nonexistent",
      },
    ];
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(payload),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("fails closed when the model's output carries a URL in business text", async () => {
    const payload = modelPayload(modelRequirement);
    payload.plan.explanation =
      "Plan confirmed at https://evil.example.com/ingest.";
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(payload),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("fails closed when the model names a package path as a capability lock", async () => {
    const payload = modelPayload(modelRequirement);
    payload.plan.capabilityLocks = [
      { key: "packages/core/workflow", version: "1.0.1" },
    ];
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(payload),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("fails closed when the model output is not strict-schema JSON", async () => {
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport({ requirement: {}, plan: {} }),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toThrow(CompositionPlannerError);
  });

  it("classifies provider transport failures without exposing provider data", async () => {
    const failing = (status: number): OpenAIResponseTransport => ({
      create: vi.fn(async () => {
        throw Object.assign(new Error("provider response"), { status });
      }),
    });
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: failing(429),
      readEnvironment: () => "test-key",
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toMatchObject({ code: "provider_rate_limited" });

    const auth = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: failing(401),
      readEnvironment: () => "test-key",
    });
    await expect(
      auth.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toMatchObject({ code: "provider_authentication_failed" });
  });

  it("refuses to plan without a local environment key", async () => {
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(modelPayload(modelRequirement)),
      readEnvironment: () => undefined,
    });

    await expect(
      adapter.propose(inputFixture("Employees submit expenses.")),
    ).rejects.toMatchObject({ code: "configuration_missing" });
  });

  it("returns the bounded clarification when deterministic resolution cannot plan", async () => {
    const adapter = new OpenAIConstrainedCompositionPlannerAdapter({
      transport: fixtureTransport(modelPayload(modelRequirement)),
      readEnvironment: () => "test-key",
    });

    const outcome = await adapter.propose(
      inputFixture("Employees submit expenses.", catalogFixture([])),
    );

    expect(outcome.kind).toBe("clarification");
  });
});
