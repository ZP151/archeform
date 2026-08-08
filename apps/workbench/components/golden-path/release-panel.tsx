"use client";

import React from "react";
import { ExternalLink, Rocket, Square } from "lucide-react";

import type { PersistedDraft } from "../../lib/golden-path/journey-model";
import type { ReleaseState } from "../../lib/golden-path/release-model";

interface ReleasePanelProps {
  readonly persistedDraft: PersistedDraft | null;
  readonly release: ReleaseState | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onPublishAndRelease: () => void;
  readonly onStopPreview: () => void;
  readonly onApproveDraftDiff: () => void;
}

/**
 * Release mode: one action advances publish -> compile -> isolated
 * verification -> preview over the immutable lifecycle, with a cleanup
 * control. Clearly labelled: a local preview over the Draft lifecycle, never
 * a deployment. A failed verification surfaces a reviewable Draft Diff that
 * the caller may choose to apply — it is never applied here.
 */
export function ReleasePanel(props: ReleasePanelProps): React.JSX.Element {
  const { persistedDraft, release, busy, error } = props;
  const releaseTerminal =
    release?.phase === "cleaned-up" || release?.phase === "failed";
  const canRelease = persistedDraft !== null && !busy && !releaseTerminal;

  return (
    <section
      className="golden-path-panel"
      aria-label="Release the Expense Approval preview"
    >
      <h2>Release</h2>
      {error !== null ? (
        <p className="golden-path-error" role="alert">
          {error}
        </p>
      ) : null}
      {busy ? (
        <p className="golden-path-busy" role="status">
          Working…
        </p>
      ) : null}

      {persistedDraft === null ? (
        <p className="golden-path-hint">
          Apply the Draft to the application before releasing.
        </p>
      ) : (
        <p className="golden-path-note">
          Applied Draft {persistedDraft.draftRevisionId} · r.
          {persistedDraft.revisionNumber} on {persistedDraft.applicationGraphId}
        </p>
      )}

      <div className="golden-path-actions">
        <button
          type="button"
          className="golden-path-primary"
          aria-label="Publish and release"
          disabled={!canRelease}
          onClick={props.onPublishAndRelease}
        >
          <Rocket size={16} aria-hidden="true" />
          Publish and release
        </button>
      </div>

      {release !== null ? (
        <div className="golden-path-release">
          <p className="golden-path-release-label">{release.label}</p>
          <p className="golden-path-release-phase">Phase: {release.phase}</p>
          {release.diagnosis !== undefined ? (
            <p className="golden-path-error">Diagnosis: {release.diagnosis}</p>
          ) : null}
          {release.evidenceSummary !== undefined ? (
            <p>
              Isolated verification: {release.evidenceSummary.steps} steps ·{" "}
              {release.evidenceSummary.passed} passed ·{" "}
              {release.evidenceSummary.failed} failed
            </p>
          ) : null}
          {release.previewUrl !== undefined && release.previewUrl !== null ? (
            <div className="golden-path-preview">
              <p>
                Preview booted at{" "}
                <a
                  href={release.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open preview"
                >
                  {release.previewUrl}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </p>
              <button
                type="button"
                className="golden-path-secondary"
                aria-label="Stop preview"
                disabled={busy || release.phase !== "preview"}
                onClick={props.onStopPreview}
              >
                <Square size={14} aria-hidden="true" />
                Stop preview
              </button>
            </div>
          ) : null}
          {release.phase === "failed" &&
          release.proposedDraftDiff !== undefined ? (
            <div className="golden-path-diff-review">
              <h3>Review the proposed Draft Diff</h3>
              <p>
                The failed isolated verification proposes{" "}
                {release.proposedDraftDiff.operations.length} operation(s) over
                revision {release.proposedDraftDiff.baseDraftRevisionId}. Review
                it and apply it as the next Draft revision.
              </p>
              <button
                type="button"
                className="golden-path-primary"
                aria-label="Approve and apply the Draft Diff"
                disabled={busy}
                onClick={props.onApproveDraftDiff}
              >
                Approve and apply the Draft Diff
              </button>
            </div>
          ) : null}
          <div
            className="golden-path-timeline"
            aria-label="Release evidence timeline"
          >
            <h3>Release evidence</h3>
            <ul>
              {release.timeline.events.map((event, index) => (
                <li key={`${index}-${event.kind}`}>
                  {event.kind} · {event.status}
                  {event.reason !== undefined ? ` · ${event.reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
