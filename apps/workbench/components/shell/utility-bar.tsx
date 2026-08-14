"use client";

import {
  Activity,
  Check,
  ChevronDown,
  CircleDot,
  Code2,
  FolderKanban,
  History,
  Library,
  Moon,
  PanelRight,
  Sun,
} from "lucide-react";

import type { WorkbenchApplicationSummary } from "../../lib/control-plane-client";
import type { Theme } from "../../lib/workbench-model";

type Props = {
  readonly applicationName: string;
  readonly currentApplicationKey: string;
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly revision: string;
  readonly lifecycle: "draft" | "published";
  readonly connectionState:
    | "connecting"
    | "ready"
    | "offline"
    | "saving"
    | "proposing"
    | "publishing"
    | "published"
    | "compiling";
  readonly theme: Theme;
  readonly inspectorOpen: boolean;
  readonly activityOpen: boolean;
  readonly libraryOpen: boolean;
  readonly showLibrary: boolean;
  /** False when the open product has no legacy Inspector/History projection. */
  readonly showDraftTools: boolean;
  readonly published: boolean;
  /** False while no Draft is bound or the lifecycle already published. */
  readonly canPublish: boolean;
  readonly onSwitchApplication: (applicationKey: string) => void;
  readonly onToggleInspector: () => void;
  readonly onToggleActivity: () => void;
  readonly onToggleLibrary: () => void;
  readonly onToggleHistory: () => void;
  readonly onToggleTheme: () => void;
  readonly onPublish: () => void;
  readonly onCompile: () => void;
  readonly inspectorTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly activityTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly libraryTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly historyTriggerRef: React.RefObject<HTMLButtonElement | null>;
};

/**
 * The utility bar: the open application with a working project switcher, the
 * Draft/Published lifecycle, the overlay triggers (Inspector, History,
 * Activity, Library), the theme toggle, and the two primary actions —
 * Publish (immutable) and Compile (Published only).
 */
export function UtilityBar({
  applicationName,
  currentApplicationKey,
  applications,
  revision,
  lifecycle,
  connectionState,
  theme,
  inspectorOpen,
  activityOpen,
  libraryOpen,
  showLibrary,
  showDraftTools,
  published,
  canPublish,
  onSwitchApplication,
  onToggleInspector,
  onToggleActivity,
  onToggleLibrary,
  onToggleHistory,
  onToggleTheme,
  onPublish,
  onCompile,
  inspectorTriggerRef,
  activityTriggerRef,
  libraryTriggerRef,
  historyTriggerRef,
}: Props) {
  const busyConnection =
    connectionState === "saving" ||
    connectionState === "proposing" ||
    connectionState === "publishing" ||
    connectionState === "compiling";

  return (
    <header className="topbar">
      <div className="project-control">
        <label className="project-switcher">
          <FolderKanban size={15} aria-hidden="true" />
          <select
            aria-label="Switch application"
            disabled={applications.length === 0}
            value={currentApplicationKey}
            onChange={(event) => onSwitchApplication(event.target.value)}
          >
            {applications.length === 0 ? (
              <option value="">{applicationName}</option>
            ) : (
              applications.map((application) => (
                <option key={application.key} value={application.key}>
                  {application.name}
                </option>
              ))
            )}
          </select>
        </label>
        <span className="top-divider" aria-hidden="true" />
        <button
          className="revision-picker"
          aria-label="Select revision"
          title="Current Draft revision"
          type="button"
        >
          {revision}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <span className={`lifecycle lifecycle-${lifecycle}`}>
          <CircleDot size={12} aria-hidden="true" />
          {connectionState === "offline"
            ? "Offline"
            : lifecycle === "draft"
              ? "Draft"
              : "Published"}
        </span>
      </div>
      <div className="top-actions">
        {showDraftTools && (
          <>
            <button
              className="utility-button advanced-button"
              ref={inspectorTriggerRef}
              onClick={onToggleInspector}
              aria-pressed={inspectorOpen}
              aria-label="Advanced"
              title="Open advanced settings"
              type="button"
            >
              <PanelRight size={16} aria-hidden="true" />
              <span>Advanced</span>
            </button>
            <button
              className="utility-button"
              ref={historyTriggerRef}
              onClick={onToggleHistory}
              aria-label="History"
              title="Draft snapshots and immutable publications"
              type="button"
            >
              <History size={16} aria-hidden="true" />
            </button>
          </>
        )}
        {showDraftTools && (
          <button
            className="utility-button"
            ref={activityTriggerRef}
            onClick={onToggleActivity}
            aria-pressed={activityOpen}
            aria-label="Activity"
            title="Recent activity and compilation evidence"
            type="button"
          >
            <Activity size={16} aria-hidden="true" />
          </button>
        )}
        {showLibrary && (
          <button
            className="utility-button"
            ref={libraryTriggerRef}
            onClick={onToggleLibrary}
            aria-pressed={libraryOpen}
            aria-label="Library"
            title="Portfolio intelligence"
            type="button"
          >
            <Library size={16} aria-hidden="true" />
          </button>
        )}
        <button
          className="utility-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          title="Toggle theme"
          type="button"
        >
          {theme === "light" ? (
            <Moon size={16} aria-hidden="true" />
          ) : (
            <Sun size={16} aria-hidden="true" />
          )}
        </button>
        <button
          className="publish-button"
          onClick={onPublish}
          aria-label="Publish draft"
          disabled={!canPublish || busyConnection || published}
          type="button"
        >
          {published ? (
            <>
              <Check size={15} aria-hidden="true" />
              Published
            </>
          ) : (
            "Publish"
          )}
        </button>
        {published && (
          <button
            className="compile-button"
            onClick={onCompile}
            aria-label="Compile"
            disabled={busyConnection}
            type="button"
          >
            <Code2 size={15} aria-hidden="true" />
            {connectionState === "compiling" ? "Queueing…" : "Compile"}
          </button>
        )}
      </div>
    </header>
  );
}
