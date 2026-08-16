"use client";

import { AlertTriangle, ArrowRight, Code2, Clock3 } from "lucide-react";

import type { WorkbenchApplicationSummary } from "../../lib/control-plane-client";

function lifecycleLabel(application: WorkbenchApplicationSummary): string {
  const revisions = [
    application.latestDraft
      ? `Draft r.${application.latestDraft.revisionNumber}`
      : null,
    application.latestPublished
      ? `Published r.${application.latestPublished.revisionNumber}`
      : null,
  ].filter((revision): revision is string => revision !== null);
  return revisions.length > 0 ? revisions.join(" · ") : "No revisions";
}

export function activityTime(application: WorkbenchApplicationSummary): string {
  return (
    application.latestCompilation?.completedAt ??
    application.latestPublished?.publishedAt ??
    application.latestDraft?.createdAt ??
    ""
  );
}

export function activityLabel(
  application: WorkbenchApplicationSummary,
): string {
  if (application.latestCompilation) {
    return `Compilation ${application.latestCompilation.status}`;
  }
  if (application.latestPublished) {
    return `Published r.${application.latestPublished.revisionNumber}`;
  }
  return application.latestDraft
    ? `Draft r.${application.latestDraft.revisionNumber}`
    : "Application created";
}

function RecentProductItem({
  application,
  compiling,
  onCompile,
  onOpen,
}: {
  readonly application: WorkbenchApplicationSummary;
  readonly compiling: boolean;
  readonly onCompile: (applicationKey: string) => void;
  readonly onOpen: (applicationKey: string) => void;
}) {
  const canCompile = application.latestPublished !== null;
  const failed = application.latestCompilation?.status === "failed";
  return (
    <article className="recent-product">
      <div className="recent-product-heading">
        <strong>{application.name}</strong>
        {failed && (
          <span className="recent-failed" title="Latest compilation failed">
            <AlertTriangle size={12} aria-hidden="true" />
            Failed
          </span>
        )}
      </div>
      <div className="recent-product-meta">
        <span>{lifecycleLabel(application)}</span>
        <span>
          <Clock3 size={12} aria-hidden="true" />
          {activityLabel(application)}
        </span>
      </div>
      <div className="recent-product-actions">
        <button
          aria-label={`Open ${application.name}`}
          className="quiet-button"
          onClick={() => onOpen(application.key)}
          type="button"
        >
          Open <ArrowRight size={14} aria-hidden="true" />
        </button>
        <button
          aria-label={`Compile ${application.name}`}
          className="compile-button"
          disabled={!canCompile || compiling}
          onClick={() => onCompile(application.key)}
          title={
            canCompile
              ? "Compile the latest Published revision."
              : "Publish this application before compiling."
          }
          type="button"
        >
          <Code2 size={14} aria-hidden="true" />
          {compiling ? "Queueing…" : "Compile"}
        </button>
      </div>
    </article>
  );
}

/**
 * The compact recent-products row: the newest applications by activity, with
 * Open and Compile as the only actions. Rendered only when records exist;
 * empty workspaces keep the composer as the sole decision.
 */
export function RecentProducts({
  applications,
  loading,
  compilingKey,
  onCompile,
  onOpen,
}: {
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly loading: boolean;
  readonly compilingKey: string | null;
  readonly onCompile: (applicationKey: string) => void;
  readonly onOpen: (applicationKey: string) => void;
}) {
  if (loading) {
    return <p role="status">Loading local applications…</p>;
  }
  if (applications.length === 0) return null;
  const recent = [...applications]
    .sort((left, right) =>
      activityTime(right).localeCompare(activityTime(left)),
    )
    .slice(0, 5);
  return (
    <section className="recent-products" aria-label="Recent products">
      <h2>Recent products</h2>
      <div className="recent-products-grid">
        {recent.map((application) => (
          <RecentProductItem
            application={application}
            compiling={compilingKey === application.key}
            key={application.id}
            onCompile={onCompile}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
