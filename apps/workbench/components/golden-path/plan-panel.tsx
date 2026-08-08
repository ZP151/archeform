"use client";

import React from "react";
import { Check, Lightbulb } from "lucide-react";

import type { VisualDiffEntry } from "../../lib/golden-path/graph-diff-visual";
import type {
  PlanAlternative,
  PlanAlternativeKey,
} from "../../lib/golden-path/plan-alternatives";

interface PlanPanelProps {
  readonly alternatives: readonly PlanAlternative[] | null;
  readonly selectedKey: PlanAlternativeKey | null;
  readonly visualDiff: readonly VisualDiffEntry[] | null;
  readonly onAccept: (key: PlanAlternativeKey) => void;
  readonly onProduce?: () => void;
  readonly onProceed: () => void;
}

/** Plan mode: deterministic alternatives, acceptance, and the visual diff. */
export function PlanPanel(props: PlanPanelProps): React.JSX.Element {
  const {
    alternatives,
    selectedKey,
    visualDiff,
    onAccept,
    onProduce,
    onProceed,
  } = props;

  if (alternatives === null) {
    return (
      <section
        className="golden-path-panel"
        aria-label="Plan the Expense Approval application"
      >
        <h2>Plan</h2>
        <p>
          Produce three deterministic alternatives over the requirement spec and
          compare their visual Graph Diffs before accepting one.
        </p>
        {onProduce !== undefined ? (
          <button
            type="button"
            className="golden-path-primary"
            aria-label="Produce plan alternatives"
            onClick={onProduce}
          >
            <Lightbulb size={16} aria-hidden="true" />
            Produce plan alternatives
          </button>
        ) : null}
      </section>
    );
  }

  const selected = alternatives.find(
    (alternative) => alternative.key === selectedKey,
  );

  return (
    <section
      className="golden-path-panel"
      aria-label="Plan the Expense Approval application"
    >
      <h2>Plan</h2>
      <p>
        Compare the alternatives and accept one — acceptance binds the plan
        checksum before Build may start.
      </p>
      <div className="golden-path-alternatives">
        {alternatives.map((alternative) => (
          <article
            key={alternative.key}
            className={alternative.key === selectedKey ? "is-selected" : ""}
          >
            <h3>{alternative.label}</h3>
            <p>{alternative.summary}</p>
            <p className="golden-path-plan-id">{alternative.plan.planId}</p>
            <div className="golden-path-plan-scope">
              <p>
                Affects {alternative.affectedPages.length} page(s),{" "}
                {alternative.affectedEntities.length} entit(y/ies),{" "}
                {alternative.affectedRoles.length} role(s),{" "}
                {alternative.affectedFlows.length} flow(s).
              </p>
              <p>Flows: {alternative.affectedFlows.join(", ") || "none"}</p>
              {alternative.knownLimitations.length > 0 ? (
                <ul className="golden-path-limitations">
                  {alternative.knownLimitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="golden-path-secondary"
              aria-label={`Accept '${alternative.key}'`}
              disabled={alternative.key === selectedKey}
              onClick={() => onAccept(alternative.key)}
            >
              {alternative.key === selectedKey ? (
                <Check size={14} aria-hidden="true" />
              ) : null}
              {alternative.key === selectedKey ? "Accepted" : "Accept"}
            </button>
          </article>
        ))}
      </div>
      {selected !== undefined && visualDiff !== null ? (
        <div className="golden-path-diff" aria-label="Visual Graph Diff">
          <h3>Visual Graph Diff · {selected.plan.planId}</h3>
          <p>
            The accepted plan changes the Graph over the planning base — the
            Draft is not touched until Build.
          </p>
          <ul>
            {visualDiff.map((entry) => (
              <li key={`${entry.scope}-${entry.key}`}>
                <span className="golden-path-diff-scope">{entry.scope}</span>{" "}
                <span className="golden-path-diff-kind">{entry.kind}</span>{" "}
                {entry.key}
                {entry.detail !== undefined ? ` — ${entry.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="golden-path-actions">
        <button
          type="button"
          className="golden-path-primary"
          aria-label="Proceed to Build"
          disabled={selectedKey === null}
          onClick={onProceed}
        >
          Proceed to Build
        </button>
      </div>
    </section>
  );
}
