"use client";

import React, { useMemo } from "react";
import { Check, CircleHelp, ClipboardList } from "lucide-react";

import type { RequirementSpecV1 } from "@factory/graph";

import {
  canPlan,
  clarificationQuestions,
  expenseApprovalRequirementStarterSpec,
  type ClarificationKey,
  type DiscussSession,
} from "../../lib/golden-path/discuss-model";

interface DiscussPanelProps {
  readonly session: DiscussSession;
  readonly spec: RequirementSpecV1 | null;
  readonly onAnswer: (key: ClarificationKey, answer: string) => void;
  readonly onDefer: (key: ClarificationKey) => void;
  readonly onBuildSpec: () => void;
  readonly onProceed: () => void;
}

/** Discuss mode: deterministic outcome brief + bounded clarification set. */
export function DiscussPanel(props: DiscussPanelProps): React.JSX.Element {
  const { session, spec, onAnswer, onDefer, onBuildSpec, onProceed } = props;
  const questions = useMemo(() => clarificationQuestions(), []);
  const brief =
    spec?.outcome ?? expenseApprovalRequirementStarterSpec().outcome;
  const ready = canPlan(session);

  return (
    <section
      className="golden-path-panel"
      aria-label="Discuss the Expense Approval outcome"
    >
      <h2>Discuss</h2>
      <div className="golden-path-outcome">
        <CircleHelp size={18} aria-hidden="true" />
        <p>{brief}</p>
      </div>
      <div className="golden-path-questions">
        {questions.map((question) => {
          const answer = session.answers.find(
            (candidate) => candidate.key === question.key,
          );
          const answered = answer !== undefined;
          const deferred = answer?.deferred === true;
          return (
            <div className="golden-path-question" key={question.key}>
              <p>
                <strong>{question.key}</strong>
                {question.required && !answered ? (
                  <span className="golden-path-required">required</span>
                ) : null}
              </p>
              <p>{question.question}</p>
              <div className="golden-path-options">
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      answered && !deferred && answer!.answer === option
                        ? "is-selected"
                        : ""
                    }
                    aria-label={`Answer '${question.key}' with '${option}'`}
                    aria-pressed={
                      answered && !deferred && answer!.answer === option
                    }
                    onClick={() => onAnswer(question.key, option)}
                  >
                    {answered && !deferred && answer!.answer === option ? (
                      <Check size={14} aria-hidden="true" />
                    ) : null}
                    {option}
                  </button>
                ))}
                <button
                  type="button"
                  className={deferred ? "is-deferred" : ""}
                  aria-label={`Defer '${question.key}'`}
                  onClick={() => onDefer(question.key)}
                >
                  {deferred ? "Deferred" : "Defer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="golden-path-actions">
        <button
          type="button"
          className="golden-path-primary"
          aria-label="Build requirement spec"
          disabled={!ready || spec !== null}
          onClick={onBuildSpec}
        >
          <ClipboardList size={16} aria-hidden="true" />
          Build requirement spec
        </button>
        {!ready && spec === null ? (
          <p className="golden-path-hint">
            Answer every required question (or defer it) to plan.
          </p>
        ) : null}
      </div>
      {spec !== null ? (
        <div className="golden-path-spec" aria-label="Requirement spec summary">
          <h3>Requirement spec · {spec.requirementId}</h3>
          <p>{spec.outcome}</p>
          <div>
            <h4>Actors</h4>
            <ul>
              {spec.actors.map((actor) => (
                <li key={actor.key}>
                  <strong>{actor.label}</strong>
                  {actor.description !== undefined
                    ? ` — ${actor.description}`
                    : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Workflows</h4>
            <ul>
              {spec.workflows.map((workflow) => (
                <li key={workflow.key}>{workflow.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Constraints</h4>
            <ul>
              {spec.constraints.map((constraint) => (
                <li key={constraint.key}>{constraint.statement}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Acceptance scenarios</h4>
            <ul>
              {spec.acceptanceScenarios.map((scenario) => (
                <li key={scenario.key}>
                  {scenario.key}: {scenario.when} → {scenario.then}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="golden-path-primary"
            aria-label="Proceed to Plan"
            onClick={onProceed}
          >
            Proceed to Plan
          </button>
        </div>
      ) : null}
    </section>
  );
}
