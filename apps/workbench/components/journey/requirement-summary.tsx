import type { RequirementSpecV1 } from "@factory/graph";

/**
 * The parsed requirement summary: parsed semantics only — the outcome, the
 * actors, and the domain concepts. The verbatim brief never appears here,
 * and this read-only control is the browser boundary the acceptance suites
 * assert against.
 */

export interface RequirementSummaryProps {
  readonly requirement: RequirementSpecV1;
  readonly blueprintTitle: string;
}

export function RequirementSummary({
  requirement,
  blueprintTitle,
}: RequirementSummaryProps) {
  const actors = requirement.actors.map((actor) => actor.label).join(", ");
  const concepts = requirement.domainConcepts
    .map((concept) => concept.label)
    .join(", ");
  const summary = [
    requirement.outcome,
    actors.length > 0 ? `Actors: ${actors}` : "",
    concepts.length > 0 ? `Entities: ${concepts}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");

  return (
    <div className="requirement-summary">
      <h3>{blueprintTitle}</h3>
      <textarea
        aria-label="Requirement summary"
        readOnly
        value={summary}
        rows={Math.min(8, Math.max(3, summary.split("\n").length + 1))}
      />
    </div>
  );
}
