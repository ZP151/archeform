import {
  applyGraphDiffToDraft,
  assertPlanAgainstDraft,
  type ApplicationGraphV1,
  type CompositionPlanV1,
  type DraftRevisionV1,
} from "@factory/graph";

/**
 * Entry-level visual Graph Diff (pages, entities, roles, flows) between a
 * base Draft and the graph produced by a plan's constrained
 * `factory.graph-diff/v1` operations — never from generated source.
 * The plan must bind the exact base Draft revision (checksum-bound,
 * fail-closed).
 */

export interface VisualDiffEntry {
  readonly scope: "page" | "entity" | "role" | "flow";
  readonly kind: "added" | "changed";
  readonly key: string;
  readonly detail: string;
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
  return entries;
}
