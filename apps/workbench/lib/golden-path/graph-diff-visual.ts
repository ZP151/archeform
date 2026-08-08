import {
  applyGraphDiffToDraft,
  assertPlanAgainstDraft,
  resolveExperienceDesignSystem,
  type ApplicationGraphV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
  type ExperienceModel,
} from "@factory/graph";

/**
 * Entry-level visual Graph Diff (pages, entities, roles, flows, experience)
 * between a base Draft and the graph produced by a plan's constrained
 * `factory.graph-diff/v1` operations — never from generated source.
 * The plan must bind the exact base Draft revision (checksum-bound,
 * fail-closed).
 */

export interface VisualDiffEntry {
  readonly scope: "page" | "entity" | "role" | "flow" | "experience";
  readonly kind: "added" | "changed";
  readonly key: string;
  readonly detail: string;
}

function countDifferences(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): number {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  let count = 0;
  for (const key of keys) {
    if (before[key] !== after[key]) count += 1;
  }
  return count;
}

/**
 * Entry-level Experience change between two models, derived from the
 * resolved design systems (deterministic defaults included) plus the legacy
 * flat theme tokens. Returns undefined when nothing changed.
 */
function experienceDiffEntry(
  base: ExperienceModel,
  applied: ExperienceModel,
): VisualDiffEntry | undefined {
  const before = resolveExperienceDesignSystem(base);
  const after = resolveExperienceDesignSystem(applied);
  const parts: string[] = [];
  let tokenChanges =
    countDifferences(before.tokens.colour.light, after.tokens.colour.light) +
    countDifferences(before.tokens.colour.dark, after.tokens.colour.dark);
  for (const group of [
    "typography",
    "spacing",
    "radius",
    "elevation",
    "motion",
  ] as const) {
    tokenChanges += countDifferences(before.tokens[group], after.tokens[group]);
  }
  if (tokenChanges > 0) {
    parts.push(`${tokenChanges} token value${tokenChanges === 1 ? "" : "s"}`);
  }
  const layoutKeys = new Set([
    ...Object.keys(before.selection.pageLayouts),
    ...Object.keys(after.selection.pageLayouts),
  ]);
  const layoutChanges = [...layoutKeys].filter(
    (pageId) =>
      before.selection.pageLayouts[pageId] !==
      after.selection.pageLayouts[pageId],
  ).length;
  if (layoutChanges > 0) {
    parts.push(
      `${layoutChanges} page layout selection${layoutChanges === 1 ? "" : "s"}`,
    );
  }
  if (before.selection.shell !== after.selection.shell) {
    parts.push("shell recipe");
  }
  if (before.selection.density !== after.selection.density) {
    parts.push("density preset");
  }
  const componentKeys = new Set([
    ...Object.keys(before.components),
    ...Object.keys(after.components),
  ]);
  const componentChanges = [...componentKeys].filter(
    (component) => before.components[component] !== after.components[component],
  ).length;
  if (componentChanges > 0) {
    parts.push(
      `${componentChanges} component variant${componentChanges === 1 ? "" : "s"}`,
    );
  }
  if (JSON.stringify(before.states) !== JSON.stringify(after.states)) {
    parts.push("accessible states");
  }
  const legacyChanges = countDifferences(
    base.theme.tokens,
    applied.theme.tokens,
  );
  if (legacyChanges > 0) {
    parts.push(
      `${legacyChanges} legacy theme token${legacyChanges === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0) return undefined;
  return {
    scope: "experience",
    kind: "changed",
    key: "design-system",
    detail: `updates ${parts.join(", ")}`,
  };
}

export function visualGraphDiffFromPlan(
  base: DraftRevisionV1,
  plan: CompositionPlanV1,
): readonly VisualDiffEntry[] {
  assertPlanAgainstDraft(plan, base);
  const applied = applyGraphDiffToDraft(base, {
    apiVersion: "factory.graph-diff/v1",
    operations: plan.proposedOperations,
  });
  return visualGraphDiff(base.graph, applied.graph);
}

export function visualGraphDiff(
  base: ApplicationGraphV1,
  applied: ApplicationGraphV1,
): readonly VisualDiffEntry[] {
  const entries: VisualDiffEntry[] = [];
  for (const pageId of base.page.pages.map((page) => page.id)) {
    if (!applied.page.pages.some((page) => page.id === pageId)) {
      entries.push({
        scope: "page",
        kind: "changed",
        key: pageId,
        detail: "removed",
      });
    }
  }
  for (const page of applied.page.pages) {
    if (!base.page.pages.some((candidate) => candidate.id === page.id)) {
      entries.push({ scope: "page", kind: "added", key: page.id, detail: "" });
    }
  }
  for (const entity of applied.domain.entities) {
    if (
      !base.domain.entities.some((candidate) => candidate.key === entity.key)
    ) {
      entries.push({
        scope: "entity",
        kind: "added",
        key: entity.key,
        detail: "",
      });
    }
  }
  for (const role of applied.policy.roles) {
    if (!base.policy.roles.includes(role)) {
      entries.push({ scope: "role", kind: "added", key: role, detail: "" });
    }
  }
  for (const flow of applied.flow.flows) {
    const before = base.flow.flows.find(
      (candidate) => candidate.id === flow.id,
    );
    if (before === undefined) {
      entries.push({ scope: "flow", kind: "added", key: flow.id, detail: "" });
      continue;
    }
    const addedTransitions = flow.transitions.filter(
      (transition) =>
        !before.transitions.some(
          (candidate) =>
            candidate.from === transition.from &&
            candidate.event === transition.event &&
            candidate.to === transition.to,
        ),
    );
    if (addedTransitions.length > 0) {
      const detail = addedTransitions
        .map(
          (transition) =>
            `${transition.event}: ${transition.from} -> ${transition.to}`,
        )
        .join(", ");
      entries.push({
        scope: "flow",
        kind: "changed",
        key: flow.id,
        detail: `adds ${addedTransitions.length} transition${addedTransitions.length === 1 ? "" : "s"} (${detail})`,
      });
    }
  }
  const experienceEntry = experienceDiffEntry(
    base.experience,
    applied.experience,
  );
  if (experienceEntry !== undefined) entries.push(experienceEntry);
  return entries;
}
