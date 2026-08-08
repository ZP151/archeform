"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

import type { WorkbenchAiProposal } from "../../lib/control-plane-client";

/**
 * The AI canvas: propose a Draft change inside declared boundaries. The
 * deterministic planner still selects every accepted change; this surface
 * only drafts the proposal for review.
 */
export function AiCanvas({
  disabled,
  onPropose,
  proposal,
}: {
  disabled: boolean;
  onPropose: (brief: string) => Promise<string>;
  proposal: WorkbenchAiProposal | null;
}) {
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const value = brief.trim();
    if (!value) return;
    setSubmitting(true);
    setError(null);
    void onPropose(value)
      .then(() => setBrief(""))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Proposal failed."),
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="ai-canvas">
      <div className="ai-orbit">
        <Bot size={26} />
        <span className="orbit-dot first" />
        <span className="orbit-dot second" />
        <span className="orbit-dot third" />
      </div>
      <div>
        <p>AI policy assistant</p>
        <h2>Propose a Graph change inside declared boundaries.</h2>
        <textarea
          aria-label="Describe a Graph change"
          disabled={disabled || submitting}
          maxLength={12_000}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Add a receipt field to expenses and suggest the test coverage."
          value={brief}
        />
        <button
          disabled={disabled || submitting || !brief.trim()}
          onClick={submit}
          type="button"
        >
          {submitting ? "Proposing…" : "Propose Draft change"}
        </button>
        {proposal && (
          <section
            className="ai-proposal-evidence"
            aria-label="AI proposal impact and test suggestions"
          >
            <strong>{proposal.summary}</strong>
            <p>
              Affects{" "}
              {proposal.affectedModels.length
                ? proposal.affectedModels.join(", ")
                : "no declared model"}
              .
            </p>
            {proposal.risks.length > 0 && (
              <p>Risks: {proposal.risks.join(", ")}</p>
            )}
            {proposal.testSuggestions.length > 0 && (
              <ul>
                {proposal.testSuggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <code>{suggestion.type}</code> {suggestion.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {error && <small className="ai-error">{error}</small>}
      </div>
    </div>
  );
}
