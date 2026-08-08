import type { RequirementSpecV1 } from "@factory/graph";

import { RequirementSummary } from "./requirement-summary";

/**
 * The plan comparison step: the parsed requirement summary stays visible and
 * every deterministic plan alternative is presented as a bounded comparison
 * (capability locks, operation count, complexity, acceptance journeys) —
 * never raw plan material. One alternative is chosen before the Diff review.
 */

export interface PlanReviewAlternative {
  readonly key: string;
  readonly label: string;
  readonly capabilityLocks: readonly { key: string; version: string }[];
  readonly operations: number;
  readonly complexity: string;
  readonly acceptanceJourneys: number;
}

export interface PlanReviewProps {
  readonly requirement: RequirementSpecV1;
  readonly blueprintTitle: string;
  readonly alternatives: readonly PlanReviewAlternative[];
  readonly chosenKey: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onChoose: (key: string) => void;
}

export function PlanReview({
  requirement,
  blueprintTitle,
  alternatives,
  chosenKey,
  busy,
  error,
  onChoose,
}: PlanReviewProps) {
  return (
    <section aria-label="Review the product plan">
      <RequirementSummary
        requirement={requirement}
        blueprintTitle={blueprintTitle}
      />
      <h3>Choose how the product is composed</h3>
      <ul className="plan-alternatives">
        {alternatives.map((alternative) => {
          const chosen = alternative.key === chosenKey;
          return (
            <li key={alternative.key} className={chosen ? "chosen" : ""}>
              <h4>{alternative.label}</h4>
              <dl>
                <div>
                  <dt>Capability locks</dt>
                  <dd>{alternative.capabilityLocks.length}</dd>
                </div>
                <div>
                  <dt>Operations</dt>
                  <dd>{alternative.operations} operations</dd>
                </div>
                <div>
                  <dt>Complexity</dt>
                  <dd>{alternative.complexity}</dd>
                </div>
                <div>
                  <dt>Acceptance journeys</dt>
                  <dd>{alternative.acceptanceJourneys} acceptance journeys</dd>
                </div>
              </dl>
              <button
                type="button"
                className="secondary-action"
                disabled={busy || chosen}
                onClick={() => onChoose(alternative.key)}
              >
                {chosen ? "Chosen" : `Choose ${alternative.label}`}
              </button>
            </li>
          );
        })}
      </ul>
      {error !== null && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
    </section>
  );
}
