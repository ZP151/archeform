"use client";

import { useEffect, useRef } from "react";

import type { WorkbenchRevisionTimeline } from "../../lib/control-plane-client";

type Props = {
  readonly open: boolean;
  readonly loading: boolean;
  readonly currentDraftId: string | null;
  readonly currentPublishedId: string | null;
  readonly timeline: WorkbenchRevisionTimeline | null;
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

/**
 * History: the Draft snapshots and immutable publications of the open
 * application Graph, newest first. Read-only revision detail behind a
 * dismissible overlay that restores focus to its trigger.
 */
export function HistoryPanel({
  open,
  loading,
  currentDraftId,
  currentPublishedId,
  timeline,
  triggerRef,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      panelRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  if (!open) return null;

  const entries = [
    ...(timeline?.drafts ?? [])
      .map((revision) => ({
        id: revision.id,
        kind: "Draft" as const,
        revision: revision.revisionNumber,
        isCurrent: revision.id === currentDraftId,
        detail: `${revision.graph.page.pages.length} pages · ${revision.graph.domain.entities.length} entities · ${revision.graph.flow.flows.length} flows`,
      }))
      .reverse(),
    ...(timeline?.published ?? [])
      .map((revision) => ({
        id: revision.id,
        kind: "Published" as const,
        revision: revision.revisionNumber,
        isCurrent: revision.id === currentPublishedId,
        detail: revision.graphHash.slice(0, 18),
      }))
      .reverse(),
  ];

  return (
    <section
      className="revision-timeline overlay-sheet"
      aria-label="Application Graph revision timeline"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="overlay-sheet-heading">
        <div>
          <span className="eyebrow-label">History</span>
          <h2>Revision timeline</h2>
        </div>
        <button
          className="overlay-close"
          aria-label="Close history"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      {loading ? (
        <p role="status">Loading revision timeline…</p>
      ) : (
        <ol className="timeline-entries">
          {entries.map((entry) => (
            <li
              className={entry.isCurrent ? "is-current" : ""}
              key={`${entry.kind}:${entry.id}`}
            >
              <span
                className={`revision-kind revision-kind-${entry.kind.toLowerCase()}`}
              >
                {entry.kind}
              </span>
              <strong>r.{entry.revision}</strong>
              <small>{entry.detail}</small>
              {entry.isCurrent && <em>Current</em>}
            </li>
          ))}
          {entries.length === 0 && (
            <li className="timeline-empty">No persisted revisions yet.</li>
          )}
        </ol>
      )}
    </section>
  );
}
