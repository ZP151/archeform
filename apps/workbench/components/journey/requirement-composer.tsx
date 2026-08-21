import { useEffect, useRef, useState } from "react";
import { Lightbulb, Sparkles } from "lucide-react";

/**
 * The primary creation decision: a free-form business requirement. The brief
 * is transient input held only while the journey is open; the parsed
 * interpretation that follows carries no verbatim brief prose. Example
 * prompts live behind one secondary popover — no Profile cards, no template
 * selection, no guided starter.
 */

export interface RequirementComposerProps {
  readonly brief: string;
  readonly onBriefChange: (brief: string) => void;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onInterpret: () => void;
  readonly examplePrompts: readonly string[];
  readonly onApplyExample: (brief: string) => void;
  /** Bumped by the shell's Ctrl+K (or Cmd+K) to land focus here. */
  readonly commandFocusToken?: number;
  /** A one-shot request from Home to focus the empty-workspace entry. */
  readonly autoFocusRequest?: number;
  readonly onAutoFocusHandled?: () => void;
}

export function RequirementComposer({
  brief,
  onBriefChange,
  busy,
  error,
  onInterpret,
  examplePrompts,
  onApplyExample,
  commandFocusToken,
  autoFocusRequest = 0,
  onAutoFocusHandled,
}: RequirementComposerProps) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement>(null);
  const lastAutoFocusRequest = useRef(0);
  const canInterpret = brief.trim().length > 0 && !busy;

  useEffect(() => {
    if (autoFocusRequest > lastAutoFocusRequest.current) {
      lastAutoFocusRequest.current = autoFocusRequest;
      briefRef.current?.focus();
      onAutoFocusHandled?.();
    }
  }, [autoFocusRequest, onAutoFocusHandled]);

  useEffect(() => {
    if (commandFocusToken !== undefined && commandFocusToken > 0) {
      briefRef.current?.focus();
    }
  }, [commandFocusToken]);

  return (
    <section aria-label="Describe a product">
      <h2>Describe a product</h2>
      <p>
        Tell us who it is for and what they need to accomplish; Archeform will
        shape a complete first Draft.
      </p>
      <textarea
        ref={briefRef}
        aria-label="Requirement brief"
        value={brief}
        onChange={(event) => onBriefChange(event.target.value)}
        placeholder="e.g. Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes…"
        rows={7}
      />
      <div className="composer-meta">
        <span className="composer-count">{brief.length} characters</span>
        <button
          type="button"
          className="secondary-action"
          aria-expanded={examplesOpen}
          onClick={() => setExamplesOpen((open) => !open)}
        >
          <Lightbulb size={14} aria-hidden="true" />
          Example prompts
        </button>
      </div>
      {examplesOpen && examplePrompts.length > 0 && (
        <ul className="example-prompts">
          {examplePrompts.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                className="example-prompt"
                onClick={() => onApplyExample(prompt)}
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error !== null && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <button
        type="button"
        className="primary-action"
        disabled={!canInterpret}
        onClick={onInterpret}
      >
        <Sparkles size={16} aria-hidden="true" />
        Create product
      </button>
    </section>
  );
}
