import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertPlanAgainstRequirement,
  assertProfileRecipeCatalog,
  assertRequirementSpec,
  CompositionError,
  hashApplicationGraph,
  hashRequirementSpec,
  parseCompositionPlan,
  type ApplicationGraphV1,
  type CompositionClarificationV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ProfileRecipeCatalogV1,
  type ProfileRecipeV1,
  type RequirementSpecV1,
} from "@factory/graph";

import {
  resolveCapabilityCompositionForAssets,
  type CapabilitySelectionV1,
} from "./composition.js";
import {
  currentCapabilityAssets,
  type CapabilityAssetManifestV1,
  type CapabilityAssetV1,
} from "./assets/index.js";

export type PlanCompositionOutcomeV1 =
  | { readonly kind: "plan"; readonly plan: CompositionPlanV1 }
  | {
      readonly kind: "clarification";
      readonly clarification: CompositionClarificationV1;
    };

/** Deterministic output-slot prefix -> composition surface mapping. */
const SLOT_SURFACE_PREFIXES: Readonly<Record<string, string>> = {
  "api.runtime": "api",
  "api.persistence": "api",
  "api.worker": "api",
  "api.command": "api",
  "api.router": "api",
  "api.service": "api",
  "report.read-model": "api",
  "database.schema": "database",
  "database.migration": "database",
  "page.block": "web",
  "web.customer": "web",
  "web.merchant": "web",
  "web.component": "web",
  "web.route": "web",
  "web.navigation": "web",
  "policy.rule": "policy",
  "flow.effect": "flow",
  "flow.handler": "flow",
  "test.fixture": "test",
  "test.journey": "test",
  "docs.section": "documentation",
};

interface RecipeFailure {
  readonly recipeId: string;
  readonly question: string;
}

interface ResolvedBinding {
  readonly capabilityKey: string;
  readonly inputKey: string;
  readonly graphSymbol: string;
}

interface ResolvedRecipe {
  readonly recipe: ProfileRecipeV1;
  readonly assets: readonly CapabilityAssetV1[];
  readonly bindings: readonly ResolvedBinding[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    return Object.freeze(value);
  }
  return value;
}

function recipeScore(
  recipe: ProfileRecipeV1,
  scenarioKeys: ReadonlySet<string>,
  workflowKeys: ReadonlySet<string>,
): number {
  const journeySet = new Set(recipe.acceptanceJourneys);
  let score = 0;
  for (const key of journeySet) {
    if (scenarioKeys.has(key)) score += 2;
    if (workflowKeys.has(key)) score += 1;
  }
  return score;
}

/**
 * Resolves a graph symbol of the declared business type against the Draft.
 * Requirement-named symbols win over positional fallbacks; when nothing
 * matches, the input cannot be bound.
 */
function resolveGraphSymbol(
  type: string,
  draft: ApplicationGraphV1,
  requirement: RequirementSpecV1,
): string | undefined {
  if (type === "domain.entity") {
    const candidateKeys = draft.domain.entities.map((entity) => entity.key);
    const preferred = requirement.domainConcepts
      .map((concept) => concept.key)
      .find((key) => candidateKeys.includes(key));
    const chosen = preferred ?? candidateKeys[0];
    return chosen === undefined ? undefined : `graph.domain.${chosen}`;
  }
  if (type === "flow.flow") {
    const candidateIds = draft.flow.flows.map((flow) => flow.id);
    const preferred = requirement.workflows
      .map((workflow) => workflow.key)
      .find((id) => candidateIds.includes(id));
    const chosen = preferred ?? candidateIds[0];
    return chosen === undefined ? undefined : `graph.flow.${chosen}`;
  }
  if (type === "policy.role") {
    const candidateRoles = draft.policy.roles;
    const preferred = requirement.actors
      .map((actor) => actor.key)
      .find((key) => candidateRoles.includes(key));
    const chosen = preferred ?? candidateRoles[0];
    return chosen === undefined ? undefined : `graph.policy.${chosen}`;
  }
  if (type === "page.page") {
    const chosen = draft.page.pages[0]?.id;
    return chosen === undefined ? undefined : `graph.page.${chosen}`;
  }
  // domain.field, flow.model and other model inputs are not symbol
  // bindings; the plan cannot bind them.
  return undefined;
}

function manifestParameterTypes(
  manifest: CapabilityAssetManifestV1,
): ReadonlyMap<string, string> {
  return new Map(
    (manifest.inputSchema ?? []).map((input) => [input.key, input.type]),
  );
}

function bindingsForCapability(
  manifest: CapabilityAssetManifestV1,
  recipe: ProfileRecipeV1,
  draft: ApplicationGraphV1,
  requirement: RequirementSpecV1,
  failures: RecipeFailure[],
  risks: {
    key: string;
    level: "low" | "medium" | "high";
    description: string;
  }[],
): ResolvedBinding[] {
  const parameterTypes = manifestParameterTypes(manifest);
  const parameterKeys = new Set((manifest.parameters ?? []).map((p) => p.key));
  const recipeBindings = new Map(
    recipe.bindings
      .filter((binding) => binding.capabilityKey === manifest.key)
      .map((binding) => [binding.inputKey, binding]),
  );
  // A recipe binding requirement must name an input the capability declares;
  // anything else is a recipe/asset inconsistency the planner refuses to
  // paper over.
  for (const inputKey of recipeBindings.keys()) {
    if (!parameterKeys.has(inputKey)) {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' declares binding requirement '${inputKey}' for capability '${manifest.key}@${manifest.version}' that the capability does not declare.`,
      });
      return [];
    }
  }
  const resolved: ResolvedBinding[] = [];
  const parameters = manifest.parameters ?? [];
  for (const parameter of parameters) {
    const recipeBinding = recipeBindings.get(parameter.key);
    if (parameter.type !== "graph-symbol") {
      // The plan's typed bindings carry Graph symbols only. A required
      // scalar parameter, or a recipe requirement targeting one, cannot be
      // planned deterministically.
      if (recipeBinding !== undefined || parameter.required) {
        failures.push({
          recipeId: recipe.id,
          question: `Recipe '${recipe.id}' locks capability '${manifest.key}@${manifest.version}' whose required parameter '${parameter.key}' is not a graph symbol and cannot be planned.`,
        });
      }
      continue;
    }
    const target = recipeBinding?.target ?? parameterTypes.get(parameter.key);
    const graphSymbol =
      target === undefined
        ? undefined
        : resolveGraphSymbol(target, draft, requirement);
    if (graphSymbol !== undefined) {
      resolved.push({
        capabilityKey: manifest.key,
        inputKey: parameter.key,
        graphSymbol,
      });
    } else if (parameter.required || recipeBinding?.required) {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' cannot bind required input '${parameter.key}' of capability '${manifest.key}@${manifest.version}' to any Graph symbol in the Draft.`,
      });
    } else {
      risks.push({
        key: `omitted-binding-${parameter.key}`,
        level: "low",
        description: `Optional binding '${parameter.key}' of '${manifest.key}' was omitted because no Graph symbol matches.`,
      });
    }
  }
  return resolved;
}

function selectionsFor(
  resolved: ResolvedRecipe,
): readonly CapabilitySelectionV1[] {
  return resolved.assets.map((asset) => ({
    lock: {
      key: asset.manifest.key,
      version: asset.manifest.version,
      packageRoot: asset.manifest.packageRoot,
      manifestDigest: asset.manifest.manifestDigest,
      lifecycle: asset.manifest.lifecycle,
    },
    bindings: Object.fromEntries(
      resolved.bindings
        .filter((binding) => binding.capabilityKey === asset.manifest.key)
        .map((binding) => [
          binding.inputKey,
          { graphSymbol: binding.graphSymbol },
        ]),
    ),
  }));
}

function dependencyEdges(
  assets: readonly CapabilityAssetV1[],
): { capabilityKey: string; dependsOn: string }[] {
  // Collect every matching provider per interface identity: the resolver's
  // dependency closure selects all providers for multi-provider
  // requirements, so the plan artifact must report all of them, not a
  // last-write-wins single provider.
  const providers = new Map<string, string[]>();
  for (const asset of assets) {
    for (const provided of asset.manifest.provides ?? []) {
      const identity = `${provided.interfaceKey}@${provided.version}`;
      const existing = providers.get(identity);
      if (existing === undefined) {
        providers.set(identity, [asset.manifest.key]);
      } else if (!existing.includes(asset.manifest.key)) {
        existing.push(asset.manifest.key);
      }
    }
  }
  const edges: { capabilityKey: string; dependsOn: string }[] = [];
  for (const asset of assets) {
    for (const requirement of asset.manifest.requires ?? []) {
      const matches = providers.get(
        `${requirement.interfaceKey}@${requirement.version}`,
      );
      if (matches === undefined) continue;
      for (const provider of matches) {
        if (provider !== asset.manifest.key) {
          edges.push({
            capabilityKey: asset.manifest.key,
            dependsOn: provider,
          });
        }
      }
    }
  }
  return edges;
}

function outputSlotsFor(
  resolved: ResolvedRecipe,
): { capabilityKey: string; slot: string; surface: string }[] {
  const slots: { capabilityKey: string; slot: string; surface: string }[] = [];
  for (const asset of resolved.assets) {
    for (const outputSlot of asset.manifest.outputSlots) {
      const surface = SLOT_SURFACE_PREFIXES[outputSlot];
      if (surface === undefined) continue;
      if (!resolved.recipe.surfaces.includes(surface as never)) continue;
      slots.push({
        capabilityKey: asset.manifest.key,
        slot: outputSlot.replace(/\./g, "-"),
        surface,
      });
    }
  }
  return slots;
}

function transitionFragment(value: unknown): {
  from: string;
  event: string;
  to: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.from === "string" &&
    typeof record.event === "string" &&
    typeof record.to === "string"
  ) {
    return { from: record.from, event: record.event, to: record.to };
  }
  return null;
}

function operationsFor(
  resolved: ResolvedRecipe,
  draft: ApplicationGraphV1,
  repositoryRoot: string,
): { op: "add"; path: string; value: unknown }[] {
  const operations: { op: "add"; path: string; value: unknown }[] = [];
  for (const asset of resolved.assets) {
    const fixture = asset.manifest.verification.fixture;
    let fragment: {
      from: string;
      event: string;
      to: string;
    } | null = null;
    try {
      const raw = readFileSync(
        join(repositoryRoot, asset.manifest.packageRoot, fixture),
        "utf8",
      );
      // An unreadable or malformed fixture yields no fragment; the
      // deterministic planner never guesses content.
      fragment = transitionFragment(JSON.parse(raw));
    } catch {
      fragment = null;
    }
    if (fragment === null) continue;
    const boundFlow = resolved.bindings.find(
      (binding) =>
        binding.capabilityKey === asset.manifest.key &&
        binding.graphSymbol.startsWith("graph.flow."),
    );
    const flowId = boundFlow?.graphSymbol.slice("graph.flow.".length);
    const flowIndex = draft.flow.flows.findIndex((flow) => flow.id === flowId);
    const targetIndex = flowIndex === -1 ? 0 : flowIndex;
    const target = draft.flow.flows[targetIndex];
    if (target === undefined) continue;
    const alreadyPresent = target.transitions.some(
      (transition) =>
        transition.from === fragment.from &&
        transition.event === fragment.event &&
        transition.to === fragment.to,
    );
    if (alreadyPresent) continue;
    operations.push({
      op: "add",
      path: `/flow/flows/${targetIndex}/transitions/-`,
      value: fragment,
    });
  }
  return operations;
}

interface ResolvedCandidate {
  readonly recipe: ProfileRecipeV1;
  readonly resolved: ResolvedRecipe;
  readonly dependencies: { capabilityKey: string; dependsOn: string }[];
  readonly slots: { capabilityKey: string; slot: string; surface: string }[];
  readonly operations: { op: "add"; path: string; value: unknown }[];
  readonly risks: {
    key: string;
    level: "low" | "medium" | "high";
    description: string;
  }[];
}

/**
 * Deterministic requirement-to-plan resolution. The planner scores recipes
 * against the requirement's acceptance scenarios and workflows, then takes
 * the first resolvable recipe in score order (stable tie breaking preserves
 * catalogue order). Locks resolve only against approved current assets with
 * golden lifecycle; every binding target and fragment comes from the Draft
 * and the on-disk fixture, never from free text. Any unresolvable step
 * yields a bounded clarification instead of a guessed plan.
 */
export function planComposition(
  requirement: RequirementSpecV1,
  catalog: ProfileRecipeCatalogV1,
  baseDraft: DraftRevisionV1,
  repositoryRoot: string,
  assets: readonly CapabilityAssetV1[] = currentCapabilityAssets,
): PlanCompositionOutcomeV1 {
  const parsedRequirement = assertRequirementSpec(requirement);
  const parsedCatalog = assertProfileRecipeCatalog(catalog);
  if (baseDraft.status !== "draft") {
    throw new CompositionError(
      "Composition plans are planned only against mutable Draft revisions.",
    );
  }
  const requirementChecksum = hashRequirementSpec(parsedRequirement);
  const draftBaseChecksum = hashApplicationGraph(baseDraft.graph);

  const scenarioKeys = new Set(
    parsedRequirement.acceptanceScenarios.map((scenario) => scenario.key),
  );
  const workflowKeys = new Set(
    parsedRequirement.workflows.map((workflow) => workflow.key),
  );
  const orderedRecipes = [...parsedCatalog.recipes].sort((left, right) => {
    const scoreDifference =
      recipeScore(right, scenarioKeys, workflowKeys) -
      recipeScore(left, scenarioKeys, workflowKeys);
    // JavaScript Array.sort is stable: equal scores keep catalogue order.
    return scoreDifference;
  });

  const failures: RecipeFailure[] = [];
  for (const recipe of orderedRecipes) {
    const candidate = resolveCandidate(
      recipe,
      parsedRequirement,
      baseDraft,
      repositoryRoot,
      assets,
      failures,
    );
    if (candidate === undefined) continue;
    return {
      kind: "plan",
      plan: buildPlan(
        candidate,
        parsedRequirement,
        requirementChecksum,
        draftBaseChecksum,
      ),
    };
  }

  const deduplicated = new Map<string, RecipeFailure>();
  for (const failure of failures) {
    deduplicated.set(failure.question, failure);
  }
  const questions = [...deduplicated.values()]
    .slice(0, 30)
    .map((failure, index) => ({
      key: `question-${index + 1}`,
      question: failure.question,
    }));
  // A catalogue with no recipes produces no failures; the clarification
  // contract requires at least one question, so never emit an empty set.
  if (questions.length === 0) {
    questions.push({
      key: "question-1",
      question: "No recipe in the catalogue matches the requirement.",
    });
  }
  return deepFreeze({
    kind: "clarification",
    clarification: {
      apiVersion: "factory.composition-clarification/v1",
      requirementChecksum,
      questions,
    },
  });
}

function resolveCandidate(
  recipe: ProfileRecipeV1,
  requirement: RequirementSpecV1,
  baseDraft: DraftRevisionV1,
  repositoryRoot: string,
  assets: readonly CapabilityAssetV1[],
  failures: RecipeFailure[],
): ResolvedCandidate | undefined {
  // 1. Resolve locks against approved current assets (key + version +
  //    golden lifecycle), in recipe declaration order.
  const resolvedAssets: CapabilityAssetV1[] = [];
  for (const lock of recipe.capabilities) {
    const asset = assets.find(
      (candidate) =>
        candidate.manifest.key === lock.key &&
        candidate.manifest.version === lock.version,
    );
    if (asset === undefined) {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' locks capability '${lock.key}@${lock.version}' that is not among the approved current assets.`,
      });
      return undefined;
    }
    if (asset.manifest.lifecycle !== "golden") {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' locks capability '${lock.key}@${lock.version}' whose lifecycle is not golden.`,
      });
      return undefined;
    }
    resolvedAssets.push(asset);
  }
  // 2. Resolve typed bindings structurally against the Draft.
  const risks: ResolvedCandidate["risks"] = [];
  const bindings: ResolvedBinding[] = [];
  for (const asset of resolvedAssets) {
    const failuresBefore = failures.length;
    bindings.push(
      ...bindingsForCapability(
        asset.manifest,
        recipe,
        baseDraft.graph,
        requirement,
        failures,
        risks,
      ),
    );
    if (failures.length > failuresBefore) return undefined;
  }
  if (bindings.length === 0) {
    failures.push({
      recipeId: recipe.id,
      question: `Recipe '${recipe.id}' resolves no Graph bindings against the Draft.`,
    });
    return undefined;
  }
  const resolved: ResolvedRecipe = { recipe, assets: resolvedAssets, bindings };

  // 3. Validate the dependency closure through the deterministic resolver.
  try {
    resolveCapabilityCompositionForAssets(
      { selections: selectionsFor(resolved) },
      assets,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "capability composition invalid";
    const noProvider = message.match(/requirement '([^']+)' has no provider/);
    if (noProvider !== null) {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' requires interface '${noProvider[1]}' that no selected capability provides.`,
      });
    } else {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' capability composition is incompatible: ${message}`,
      });
    }
    return undefined;
  }

  // 4. Declared output slots, filtered to the recipe surfaces.
  const slots = outputSlotsFor(resolved);
  for (const asset of resolvedAssets) {
    if (asset.manifest.outputSlots.length === 0) {
      failures.push({
        recipeId: recipe.id,
        question: `Recipe '${recipe.id}' locks capability '${asset.manifest.key}@${asset.manifest.version}' that declares no output slots.`,
      });
      return undefined;
    }
  }

  // 5. Graph operations from the fixture fragment registry.
  const operations = operationsFor(resolved, baseDraft.graph, repositoryRoot);
  if (operations.length === 0) {
    failures.push({
      recipeId: recipe.id,
      question: `Recipe '${recipe.id}' yields no Graph change from its capability fixtures.`,
    });
    return undefined;
  }

  return {
    recipe,
    resolved,
    dependencies: dependencyEdges(resolvedAssets),
    slots,
    operations,
    risks,
  };
}

function buildPlan(
  candidate: ResolvedCandidate,
  requirement: RequirementSpecV1,
  requirementChecksum: string,
  draftBaseChecksum: string,
): CompositionPlanV1 {
  const { recipe, resolved, dependencies, slots, operations, risks } =
    candidate;
  const scenarioKeys = new Set(
    requirement.acceptanceScenarios.map((scenario) => scenario.key),
  );
  const workflowKeys = new Set(
    requirement.workflows.map((workflow) => workflow.key),
  );
  const journeys = requirement.acceptanceScenarios
    .slice(0, 20)
    .map((scenario) => ({ key: scenario.key, description: scenario.then }));
  const assumptions = recipe.acceptanceJourneys
    .filter(
      (journey) => !scenarioKeys.has(journey) && !workflowKeys.has(journey),
    )
    .slice(0, 20)
    .map(
      (journey) =>
        `Assumes recipe journey '${journey}' from recipe '${recipe.id}'.`,
    );
  const questionRisks = requirement.openQuestions
    .slice(0, 20)
    .map((openQuestion, index) => ({
      key: `question-${index + 1}`,
      level: "medium" as const,
      description: openQuestion.question,
    }));
  const contributions =
    operations.length + resolved.bindings.length + slots.length;
  const complexity =
    contributions <= 2 ? "low" : contributions <= 5 ? "medium" : "high";
  const planId = `${requirement.requirementId}-${recipe.id}`.slice(0, 128);

  const plan = parseCompositionPlan({
    apiVersion: "factory.composition-plan/v1",
    planId,
    requirementChecksum,
    draftBaseChecksum,
    capabilityLocks: resolved.assets.map((asset) => ({
      key: asset.manifest.key,
      version: asset.manifest.version,
      manifestDigest: asset.manifest.manifestDigest,
    })),
    graphBindings: resolved.bindings,
    outputSlots: slots,
    dependencyGraph: dependencies,
    compatibility: { result: "compatible", reasons: [] },
    risks: [...questionRisks, ...risks].slice(0, 20),
    assumptions,
    complexity,
    acceptanceJourneys: journeys,
    explanation: `Deterministic plan for requirement '${requirement.requirementId}' using recipe '${recipe.id}': locks ${resolved.assets.length} capabilities (${resolved.assets.map((asset) => asset.manifest.key).join(", ")}), binds ${resolved.bindings.length} Graph symbols, emits ${operations.length} Graph operations.`,
    proposedOperations: operations,
  });
  assertPlanAgainstRequirement(plan, requirement);
  return deepFreeze(plan);
}
