import type { RequirementSpecV1 } from "@factory/graph";

import { RequirementSummary } from "./requirement-summary";

/**
 * The clarification step: every open question of the parsed requirement gets
 * a bounded answer field, and the same answers map is re-interpreted on
 * continue. The requirement summary stays visible above the questions.
 */

export interface ClarificationPanelProps {
  readonly requirement: RequirementSpecV1;
  readonly blueprintTitle: string;
  readonly questions: readonly { key: string; question: string }[];
  readonly answers: Readonly<Record<string, string>>;
  readonly onAnswerChange: (key: string, answer: string) => void;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onContinue: () => void;
}

export function ClarificationPanel({
  requirement,
  blueprintTitle,
  questions,
  answers,
  onAnswerChange,
  busy,
  error,
  onContinue,
}: ClarificationPanelProps) {
  return (
    <section aria-label="Clarify the requirement">
      <RequirementSummary
        requirement={requirement}
        blueprintTitle={blueprintTitle}
      />
      <h3>Answer the open questions</h3>
      <ol className="clarification-questions">
        {questions.map(({ key, question }) => (
          <li key={key}>
            <label htmlFor={`answer-${key}`}>{question}</label>
            <input
              id={`answer-${key}`}
              aria-label={key}
              value={answers[key] ?? ""}
              maxLength={64}
              onChange={(event) => onAnswerChange(key, event.target.value)}
            />
          </li>
        ))}
      </ol>
      {error !== null && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <button
        type="button"
        className="primary-action"
        disabled={busy}
        onClick={onContinue}
      >
        Continue
      </button>
    </section>
  );
}
