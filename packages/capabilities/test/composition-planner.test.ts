import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createDraftRevision,
  hashApplicationGraph,
  hashRequirementSpec,
  parseCompositionClarification,
  type ApplicationGraphV1,
  type DraftRevisionV1,
  type RequirementSpecV1,
} from "@factory/graph";
import type { ProfileRecipeCatalogV1, ProfileRecipeV1 } from "@factory/graph";

import { planComposition, type PlanCompositionOutcomeV1 } from "../src/node.js";
import { currentCapabilityAssets } from "../src/assets/index.js";
import type { CapabilityAssetV1 } from "../src/assets/index.js";

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
  constraints: [
    {
      key: "review-deadline",
      kind: "compliance",
      statement: "Managers review within five working days.",
    },
  ],
  openQuestions: [
    {
      question: "Should rejected claims be editable after rejection?",
    },
  ],
  acceptanceScenarios: [
    {
      key: "submit-then-approve",
      given: "an employee with a completed expense draft",
      when: "the employee submits and the manager approves",
      then: "the expense reaches approved status",
    },
  ],
};

/** A Draft whose flow lacks the fixture transition (draft -> submit -> submitted). */
const draftGraphFixture: ApplicationGraphV1 = {
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
    permissions: [],
  },
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
  integration: {
    providers: [],
    capabilities: [],
  },
  experience: {
    theme: { mode: "system", tokens: { accent: "#0f766e" } },
    locales: ["en"],
  },
};

function draftFixture(): DraftRevisionV1 {
  return createDraftRevision(draftGraphFixture, "draft-planner-1");
}

function recipeFixture(
  overrides: Partial<ProfileRecipeV1> = {},
): ProfileRecipeV1 {
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
    ...overrides,
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

/** A full manifest-shaped synthetic asset for planner injection tests. */
function syntheticAsset(
  key = "test.base",
  overrides: Partial<CapabilityAssetV1["manifest"]> = {},
): CapabilityAssetV1 {
  return {
    manifest: {
      apiVersion: "factory.capability/v1",
      key,
      version: "1.0.0",
      category: "core",
      name: "Test base",
      description: "Synthetic base capability for planner tests.",
      packageRoot: `packages/capabilities/assets/${key}/1.0.0`,
      manifestDigest:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      lifecycle: "golden",
      profiles: [],
      effects: ["test.effect"],
      inputSchema: [{ key: "flowKey", type: "flow.flow", required: true }],
      outputSlots: ["api.runtime", "flow.effect"],
      templates: [],
      parameters: [{ key: "flowKey", type: "graph-symbol", required: true }],
      verification: {
        fixture: "fixtures/default.json",
        contractTest: "tests/contract.json",
        status: "verified",
      },
      ...overrides,
    },
  };
}

/**
 * Materializes the fixture fragment for every synthetic package under a
 * scratch repository root so the fragment registry can read it.
 */
function materializeSyntheticRepository(
  assets: readonly CapabilityAssetV1[],
): string {
  const root = join(tmpdir(), `planner-${Math.random().toString(36).slice(2)}`);
  for (const asset of assets) {
    const fixturePath = join(
      root,
      asset.manifest.packageRoot,
      asset.manifest.verification.fixture,
    );
    mkdirSync(resolve(fixturePath, ".."), { recursive: true });
    writeFileSync(
      fixturePath,
      JSON.stringify({ from: "draft", event: "submit", to: "submitted" }),
      "utf8",
    );
  }
  return root;
}

function assertPlan(outcome: PlanCompositionOutcomeV1) {
  expect(outcome.kind).toBe("plan");
  if (outcome.kind !== "plan") throw new Error("expected a plan");
  return outcome.plan;
}

function assertClarification(outcome: PlanCompositionOutcomeV1) {
  expect(outcome.kind).toBe("clarification");
  if (outcome.kind !== "clarification") {
    throw new Error("expected a clarification");
  }
  return outcome.clarification;
}

describe("planComposition", () => {
  it("produces a deterministic golden plan from the workflow recipe", () => {
    const outcome = planComposition(
      requirementFixture,
      catalogFixture(),
      draftFixture(),
      repositoryRoot,
      currentCapabilityAssets,
    );
    const plan = assertPlan(outcome);

    expect(plan.planId).toBe("expense-tracking-expense-approval");
    expect(plan.requirementChecksum).toBe(
      hashRequirementSpec(requirementFixture),
    );
    expect(plan.draftBaseChecksum).toBe(
      hashApplicationGraph(draftGraphFixture),
    );
    expect(plan.capabilityLocks).toEqual([
      {
        key: "core.workflow",
        version: "1.0.1",
        manifestDigest:
          "sha256:16ebf7d8128f30e656d7c86e39ef36323991cf7af7ea18a5d81a3ac0e4c06884",
      },
    ]);
    expect(plan.graphBindings).toEqual([
      {
        capabilityKey: "core.workflow",
        inputKey: "flowKey",
        graphSymbol: "graph.flow.expense-approval",
      },
    ]);
    // api.runtime -> api and flow.effect -> flow are in the recipe surfaces;
    // test.fixture -> test is not, so it is excluded.
    expect(plan.outputSlots).toEqual([
      { capabilityKey: "core.workflow", slot: "api-runtime", surface: "api" },
      { capabilityKey: "core.workflow", slot: "flow-effect", surface: "flow" },
    ]);
    // The fixture transition (draft -> submit -> submitted) is absent from
    // the Draft flow, so the fragment registry emits one append operation.
    expect(plan.proposedOperations).toEqual([
      {
        op: "add",
        path: "/flow/flows/0/transitions/-",
        value: { from: "draft", event: "submit", to: "submitted" },
      },
    ]);
    expect(plan.acceptanceJourneys).toEqual([
      {
        key: "submit-then-approve",
        description: "the expense reaches approved status",
      },
    ]);
    // The open question becomes a risk; the recipe journey is covered so no
    // assumption is recorded.
    expect(plan.risks).toHaveLength(1);
    expect(plan.risks[0]).toMatchObject({ key: "question-1", level: "medium" });
    expect(plan.assumptions).toEqual([]);
    expect(plan.complexity).toBe("medium"); // 1 op + 1 binding + 2 slots
    expect(plan.compatibility).toEqual({ result: "compatible", reasons: [] });
    expect(plan.dependencyGraph).toEqual([]);
    expect(plan.explanation).toContain("core.workflow");
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("is deterministic across repeated runs", () => {
    const first = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture(),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    const second = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture(),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("prefers the highest-scoring recipe and breaks ties by catalog order", () => {
    // 2 points per covered scenario, 1 per covered workflow: "expense-high"
    // covers the scenario and the workflow (3), "expense-low" only the
    // scenario (2), so the higher-scoring recipe must win.
    const high = recipeFixture({
      id: "expense-high",
      acceptanceJourneys: ["submit-then-approve", "submit-approve"],
    });
    const low = recipeFixture({ id: "expense-low" });
    const plan = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture([low, high]),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(plan.planId).toBe("expense-tracking-expense-high");

    // Equal scores: the catalog-declared recipe wins (stable tie breaking).
    const tied = [
      recipeFixture({ id: "expense-first" }),
      recipeFixture({ id: "expense-second" }),
    ];
    const tiedPlan = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture(tied),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(tiedPlan.planId).toBe("expense-tracking-expense-first");
  });

  it("resolves inter-capability dependencies into the dependencyGraph", () => {
    const base = syntheticAsset("test.base", {
      provides: [{ interfaceKey: "test.base", version: "v1" }],
    });
    const dependent = syntheticAsset("test.dependent", {
      version: "1.1.0",
      provides: [],
      requires: [{ interfaceKey: "test.base", version: "v1" }],
    });
    const recipe = recipeFixture({
      id: "dependency-recipe",
      capabilities: [
        { key: "test.base", version: "1.0.0" },
        { key: "test.dependent", version: "1.1.0" },
      ],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
        {
          capabilityKey: "test.dependent",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    const root = materializeSyntheticRepository([base, dependent]);
    const plan = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        root,
        [base, dependent],
      ),
    );
    expect(plan.dependencyGraph).toEqual([
      { capabilityKey: "test.dependent", dependsOn: "test.base" },
    ]);
    expect(plan.capabilityLocks.map((lock) => lock.key).sort()).toEqual([
      "test.base",
      "test.dependent",
    ]);
  });

  it("reports every matching provider for multi-provider requirements", () => {
    const baseA = syntheticAsset("test.base-a", {
      provides: [{ interfaceKey: "test.base", version: "v1" }],
    });
    const baseB = syntheticAsset("test.base-b", {
      provides: [{ interfaceKey: "test.base", version: "v1" }],
    });
    const dependent = syntheticAsset("test.dependent", {
      version: "1.1.0",
      provides: [],
      requires: [
        { interfaceKey: "test.base", version: "v1", multiProvider: true },
      ],
    });
    const recipe = recipeFixture({
      id: "multi-provider-recipe",
      capabilities: [
        { key: "test.base-a", version: "1.0.0" },
        { key: "test.base-b", version: "1.0.0" },
        { key: "test.dependent", version: "1.1.0" },
      ],
      bindings: ["test.base-a", "test.base-b", "test.dependent"].map(
        (capabilityKey) => ({
          capabilityKey,
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        }),
      ),
    });
    const root = materializeSyntheticRepository([baseA, baseB, dependent]);
    const plan = assertPlan(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        root,
        [baseA, baseB, dependent],
      ),
    );
    expect(plan.dependencyGraph).toEqual([
      { capabilityKey: "test.dependent", dependsOn: "test.base-a" },
      { capabilityKey: "test.dependent", dependsOn: "test.base-b" },
    ]);
  });

  it("returns a clarification when a locked requirement has no provider", () => {
    const base = syntheticAsset("test.base");
    const dependent = syntheticAsset("test.dependent", {
      version: "1.1.0",
      provides: [],
      requires: [{ interfaceKey: "test.missing", version: "v1" }],
    });
    const recipe = recipeFixture({
      id: "broken-dependency",
      capabilities: [
        { key: "test.base", version: "1.0.0" },
        { key: "test.dependent", version: "1.1.0" },
      ],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
        {
          capabilityKey: "test.dependent",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        repositoryRoot,
        [base, dependent],
      ),
    );
    expect(clarification.requirementChecksum).toBe(
      hashRequirementSpec(requirementFixture),
    );
    expect(clarification.questions.length).toBeGreaterThanOrEqual(1);
    expect(clarification.questions[0].question).toContain("test.missing");
    expect(Object.isFrozen(clarification)).toBe(true);
  });

  it("returns a clarification when a required binding cannot resolve", () => {
    const graph = structuredClone(draftGraphFixture);
    graph.flow.flows = [];
    const noFlowDraft = createDraftRevision(graph, "draft-no-flows");

    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture(),
        noFlowDraft,
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(clarification.questions[0].question).toContain("flowKey");
    expect(clarification.questions[0].question).toContain("Graph symbol");
  });

  it("returns a clarification for a locked capability with no output slots", () => {
    const asset = syntheticAsset("test.base", { outputSlots: [] });
    const recipe = recipeFixture({
      id: "no-slots-recipe",
      capabilities: [{ key: "test.base", version: "1.0.0" }],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        repositoryRoot,
        [asset],
      ),
    );
    expect(clarification.questions[0].question).toContain("output slots");
  });

  it("returns a clarification for a non-golden lifecycle lock", () => {
    const asset = syntheticAsset("test.base", {
      lifecycle: "preview" as never,
    });
    const recipe = recipeFixture({
      id: "preview-recipe",
      capabilities: [{ key: "test.base", version: "1.0.0" }],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        repositoryRoot,
        [asset],
      ),
    );
    expect(clarification.questions[0].question).toContain("golden");
  });

  it("returns a clarification for an unknown capability version", () => {
    const recipe = recipeFixture({
      id: "future-version",
      capabilities: [{ key: "core.workflow", version: "9.9.9" }],
    });
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(clarification.questions[0].question).toContain(
      "core.workflow@9.9.9",
    );
  });

  it("returns a clarification when no fixture yields a Graph change", () => {
    const asset = syntheticAsset("test.base");
    const recipe = recipeFixture({
      id: "inert-recipe",
      capabilities: [{ key: "test.base", version: "1.0.0" }],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    // The synthetic package has no fixture file on disk (we never
    // materialize it), so the fragment registry yields nothing.
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        repositoryRoot,
        [asset],
      ),
    );
    expect(clarification.questions[0].question).toContain("no Graph change");
  });

  it("clarifies, rather than throwing, when a locked fixture is malformed", () => {
    const asset = syntheticAsset("test.base");
    const recipe = recipeFixture({
      id: "corrupt-fixture-recipe",
      capabilities: [{ key: "test.base", version: "1.0.0" }],
      bindings: [
        {
          capabilityKey: "test.base",
          inputKey: "flowKey",
          required: true,
          target: "flow.flow",
        },
      ],
    });
    const root = join(
      tmpdir(),
      `planner-corrupt-${Math.random().toString(36).slice(2)}`,
    );
    const fixturePath = join(
      root,
      asset.manifest.packageRoot,
      asset.manifest.verification.fixture,
    );
    mkdirSync(resolve(fixturePath, ".."), { recursive: true });
    writeFileSync(fixturePath, "{ this is not json", "utf8");
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([recipe]),
        draftFixture(),
        root,
        [asset],
      ),
    );
    expect(clarification.questions[0].question).toContain("no Graph change");
  });

  it("keeps clarifications schema-valid when the catalogue has no recipes", () => {
    const clarification = assertClarification(
      planComposition(
        requirementFixture,
        catalogFixture([]),
        draftFixture(),
        repositoryRoot,
        currentCapabilityAssets,
      ),
    );
    expect(clarification.questions.length).toBeGreaterThanOrEqual(1);
    expect(parseCompositionClarification(clarification)).toEqual(clarification);
    expect(clarification.questions[0].question).toContain("No recipe");
  });

  it("refuses to plan against a non-draft base revision", () => {
    const published = {
      ...draftFixture(),
      status: "published" as const,
    };
    expect(() =>
      planComposition(
        requirementFixture,
        catalogFixture(),
        published,
        repositoryRoot,
        currentCapabilityAssets,
      ),
    ).toThrow(/Draft/);
  });
});
