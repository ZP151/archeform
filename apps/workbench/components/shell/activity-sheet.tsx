"use client";

import { useEffect, useRef } from "react";

import type {
  WorkbenchApplicationSummary,
  WorkbenchArtifactContent,
  WorkbenchCompilation,
  WorkbenchWorkspacePortfolioSummary,
} from "../../lib/control-plane-client";
import { toPortfolioHomeModel } from "../../lib/portfolio-summary";
import type { ReleaseState } from "../../lib/product-journey/release-model";
import { MetricPanel } from "./portfolio-metrics";
import { activityLabel, activityTime, RecentProducts } from "./recent-products";

type Props = {
  readonly open: boolean;
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly loading: boolean;
  readonly compilingKey: string | null;
  readonly portfolio: WorkbenchWorkspacePortfolioSummary | null;
  readonly compilation: WorkbenchCompilation | null;
  readonly artifactLoading: boolean;
  readonly artifactSnapshot: WorkbenchArtifactContent | null;
  readonly release: ReleaseState | null;
  readonly onInspectArtifact: (artifactPath: string) => void;
  readonly onCompile: (applicationKey: string) => void;
  readonly onOpen: (applicationKey: string) => void;
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

/**
 * The Activity sheet: recent activity across applications, compilation health,
 * and the immutable-output evidence of the open Compilation. Evidence is
 * count-first — the manifest is a list of verified artifacts, never the raw
 * generated source, which stays one inspect click away.
 */
export function ActivitySheet({
  open,
  applications,
  loading,
  compilingKey,
  portfolio,
  compilation,
  artifactLoading,
  artifactSnapshot,
  release,
  onInspectArtifact,
  onCompile,
  onOpen,
  triggerRef,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const artifacts = compilation?.artifacts ?? [];

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return;
    }
    panelRef.current?.focus();
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <aside
      className="activity-sheet overlay-sheet"
      aria-label="Activity"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="overlay-sheet-heading">
        <div>
          <span className="eyebrow-label">Activity</span>
          <h2>Recent activity and evidence</h2>
        </div>
        <button
          className="overlay-close"
          aria-label="Close activity"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="activity-sections">
        {portfolio && (
          <MetricPanel
            metrics={toPortfolioHomeModel(portfolio).compilationMetrics}
            title="Compilation health"
          />
        )}
        <section className="activity-list" aria-label="Recent activity">
          <h3>Applications</h3>
          {loading ? (
            <p role="status">Loading local applications…</p>
          ) : applications.length === 0 ? (
            <p>No local applications yet.</p>
          ) : (
            <ul className="panel-list">
              {[...applications]
                .sort((left, right) =>
                  activityTime(right).localeCompare(activityTime(left)),
                )
                .map((application) => (
                  <li key={application.id}>
                    <strong>{application.name}</strong>
                    <span>{activityLabel(application)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <section
          className="activity-evidence"
          aria-label="Compilation evidence"
        >
          <h3>Compilation evidence</h3>
          {compilation === null ? (
            <p>Nothing compiled yet.</p>
          ) : (
            <>
              <p>
                {artifacts.length} immutable output
                {artifacts.length === 1 ? "" : "s"} ·{" "}
                {compilation.result.status}
              </p>
              {artifacts.length > 0 && (
                <ul className="panel-list artifact-list">
                  {artifacts.map((artifact) => (
                    <li key={artifact.path}>
                      <button
                        onClick={() => onInspectArtifact(artifact.path)}
                        type="button"
                        title={`Inspect ${artifact.path}`}
                      >
                        <code>{artifact.path}</code>
                      </button>
                      <span>{artifact.digest.slice(0, 18)}…</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
        <section className="activity-release" aria-label="Release evidence">
          <h3>Release evidence</h3>
          {release === null ? (
            <p>No release pipeline yet.</p>
          ) : (
            <>
              <p>
                {release.phase}
                {release.evidenceSummary !== undefined &&
                  ` · ${release.evidenceSummary.steps} steps · ${release.evidenceSummary.passed} passed · ${release.evidenceSummary.failed} failed`}
              </p>
              <ol className="release-timeline">
                {release.timeline.events.map((event, index) => (
                  <li
                    key={`${event.kind}-${index}`}
                    className={`release-timeline-event release-timeline-${event.status}`}
                  >
                    <span>{event.title}</span>
                    <code>{event.status}</code>
                    {event.reason !== undefined && <code>{event.reason}</code>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
        {(artifactLoading || artifactSnapshot) && (
          <section
            className="artifact-snapshot"
            aria-label="Generated source snapshot"
          >
            <div>
              <strong>
                {artifactSnapshot?.path ?? "Verifying generated artifact…"}
              </strong>
              {artifactSnapshot && (
                <small>
                  {artifactSnapshot.digest.slice(0, 18)}… · verified snapshot
                </small>
              )}
            </div>
            {artifactSnapshot && (
              <pre>
                <code>{artifactSnapshot.content}</code>
              </pre>
            )}
          </section>
        )}
        {!loading && applications.length > 0 && (
          <RecentProducts
            applications={applications}
            compilingKey={compilingKey}
            loading={loading}
            onCompile={onCompile}
            onOpen={onOpen}
          />
        )}
      </div>
    </aside>
  );
}
