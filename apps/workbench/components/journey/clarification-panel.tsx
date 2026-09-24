import type {
  CompositionClarificationV1,
  RequirementSpecV1,
} from "@factory/graph";

import { RequirementSummary } from "./requirement-summary";
import { ANSWER_MAX_LENGTH } from "../../lib/product-journey/journey-model";

/**
 * The clarification step: every open question of the parsed requirement gets
 * a bounded answer field, and the same answers map is re-interpreted on
 * continue. The requirement summary stays visible above the questions.
 */

export interface ClarificationPanelProps {
  readonly requirement: RequirementSpecV1;
  readonly blueprintTitle: string;
  readonly questions: readonly CompositionClarificationV1["questions"][number][];
  readonly answers: Readonly<Record<string, string>>;
  readonly onAnswerChange: (key: string, answer: string) => void;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onContinue: () => void;
  readonly submittedAnswers?: Readonly<Record<string, string>>;
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
  submittedAnswers,
}: ClarificationPanelProps) {
  return (
    <section
      aria-label={
        submittedAnswers
          ? "Previous questions and answers"
          : "Clarify the requirement"
      }
    >
      <RequirementSummary
        requirement={requirement}
        blueprintTitle={blueprintTitle}
      />
      <h3>
        {submittedAnswers
          ? "Previous questions and answers"
          : "Answer the open questions"}
      </h3>
      {submittedAnswers && (
        <p>
          These are your earlier questions and submitted answers. Review and
          edit them below.
        </p>
      )}
      <ol className="clarification-questions">
        {questions.map(({ key, category, defaultPolicy, question }) => (
          <li key={key}>
            <label htmlFor={`answer-${key}`}>{question}</label>
            {submittedAnswers && (
              <p>Submitted answer: {submittedAnswers[key] || "Unanswered"}</p>
            )}
            <input
              id={`answer-${key}`}
              aria-label={key}
              data-clarification-category={category}
              data-clarification-default-policy={defaultPolicy}
              value={answers[key] ?? ""}
              maxLength={ANSWER_MAX_LENGTH}
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
      {!submittedAnswers && (
        <button
          type="button"
          className="primary-action"
          disabled={busy}
          onClick={onContinue}
        >
          Continue
        </button>
      )}
    </section>
  );
}
