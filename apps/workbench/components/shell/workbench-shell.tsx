"use client";

import { useEffect, type ReactNode } from "react";
import { findWorkbenchContext } from "@factory/workbench-ui";

import type { WorkbenchController } from "../../hooks/use-workbench-controller";
import { resolveWorkbenchContext } from "../../state/workbench-shell-machine";
import { BuilderNavigation, IconRail } from "./icon-rail";
import { UtilityBar } from "./utility-bar";
import { InspectorSheet } from "./inspector-sheet";
import { ActivitySheet } from "./activity-sheet";
import { LibraryDrawer } from "./library-drawer";
import { HistoryPanel } from "./history-panel";

type Props = {
  readonly controller: WorkbenchController;
  readonly children: ReactNode;
};

/**
 * The workbench shell: icon rail, utility bar, the active surface canvas,
 * the status bar, and the four dismissible overlays (Inspector, History,
 * Activity, Library). Escape closes the topmost overlay; Ctrl+K (or Cmd+K)
 * lands focus in the requirement brief on Home.
 */
export function WorkbenchShell({ controller, children }: Props) {
  const {
    state,
    graph,
    remoteDraft,
    publishedRevision,
    compilation,
    connectionState,
    draftDirty,
    operationError,
    applications,
    applicationsLoading,
    portfolioSummary,
    portfolioLoading,
    compilingApplicationKey,
    revisionTimeline,
    historyOpen,
    historyLoading,
    artifactSnapshot,
    artifactLoading,
    activityTriggerRef,
    libraryTriggerRef,
    inspectorTriggerRef,
    historyTriggerRef,
    navigate,
    toggleTheme,
    toggleInspector,
    toggleActivity,
    toggleLibrary,
    toggleHistory,
    closeHistory,
    commandFocus,
    saveDraft,
    publish,
    queueCompilation,
    openApplication,
    compileApplication,
    inspectArtifact,
    release,
  } = controller;

  const contextKey = resolveWorkbenchContext(
    state.activeSurface,
    controller.journey.state.stage,
    controller.journey.busy,
  );
  const context = findWorkbenchContext(contextKey);
  const templateDraftActive = controller.templateDraft !== null;
  const resetJourney = controller.journey.reset;
  const busyConnection =
    connectionState === "saving" ||
    connectionState === "proposing" ||
    connectionState === "publishing" ||
    connectionState === "compiling";

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        // Close the topmost overlay: the one opened most recently.
        const top = state.overlayStack[state.overlayStack.length - 1];
        if (top === "history") closeHistory();
        else if (top === "inspector") toggleInspector();
        else if (top === "activity") toggleActivity();
        else if (top === "library") toggleLibrary();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        resetJourney();
        commandFocus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    state.overlayStack,
    closeHistory,
    toggleInspector,
    toggleActivity,
    toggleLibrary,
    commandFocus,
    resetJourney,
  ]);

  useEffect(() => {
    if (contextKey === "builder" && state.libraryOpen) toggleLibrary();
  }, [contextKey, state.libraryOpen, toggleLibrary]);

  useEffect(() => {
    if (!templateDraftActive) return;
    if (state.inspectorOpen) toggleInspector();
    if (historyOpen) closeHistory();
    if (state.activityOpen) toggleActivity();
    if (state.libraryOpen) toggleLibrary();
  }, [
    closeHistory,
    historyOpen,
    state.activityOpen,
    state.inspectorOpen,
    state.libraryOpen,
    templateDraftActive,
    toggleInspector,
    toggleActivity,
    toggleLibrary,
  ]);

  return (
    <main className={`workbench theme-${state.theme}`} data-theme={state.theme}>
      <IconRail
        activeSurface={state.activeSurface}
        onNavigate={(surface) => {
          resetJourney();
          navigate(surface);
        }}
      />
      <section className="shell">
        <UtilityBar
          applicationName={
            controller.templateDraft?.draft.graph.metadata.name ??
            graph.metadata.name
          }
          currentApplicationKey={
            controller.templateDraft?.draft.applicationKey ?? graph.metadata.id
          }
          applications={applications}
          revision={
            templateDraftActive
              ? `r.${controller.templateDraft?.draft.revisionNumber}`
              : state.revision
          }
          lifecycle={templateDraftActive ? "draft" : state.lifecycle}
          connectionState={connectionState}
          theme={state.theme}
          inspectorOpen={state.inspectorOpen}
          activityOpen={state.activityOpen}
          libraryOpen={state.libraryOpen}
          showLibrary={contextKey === "workspace-home" && !templateDraftActive}
          showDraftTools={!templateDraftActive}
          published={!templateDraftActive && state.lifecycle === "published"}
          canPublish={
            !templateDraftActive && remoteDraft !== null && !busyConnection
          }
          onSwitchApplication={openApplication}
          onToggleInspector={toggleInspector}
          onToggleActivity={toggleActivity}
          onToggleLibrary={toggleLibrary}
          onToggleHistory={toggleHistory}
          onToggleTheme={toggleTheme}
          onPublish={publish}
          onCompile={queueCompilation}
          inspectorTriggerRef={inspectorTriggerRef}
          activityTriggerRef={activityTriggerRef}
          libraryTriggerRef={libraryTriggerRef}
          historyTriggerRef={historyTriggerRef}
        />
        {contextKey === "builder" && (
          <BuilderNavigation
            activeSurface={state.activeSurface}
            onNavigate={navigate}
            allowedDestinations={
              templateDraftActive ? ["page", "data"] : undefined
            }
          />
        )}
        <section className="work-area">
          <div className={`canvas surface-${state.activeSurface}`}>
            <section
              className="canvas-board"
              aria-label={`${context.label} canvas`}
            >
              {children}
            </section>
            {state.lastProposal && (
              <p className="draft-proposal-status" role="status">
                <span /> {state.lastProposal} proposed a Draft change
                <small>{state.draftProposals}</small>
              </p>
            )}
          </div>
          {!templateDraftActive && (
            <HistoryPanel
              open={historyOpen}
              loading={historyLoading}
              currentDraftId={remoteDraft?.draftRevisionId ?? null}
              currentPublishedId={publishedRevision?.id ?? null}
              timeline={revisionTimeline}
              triggerRef={historyTriggerRef}
              onClose={closeHistory}
            />
          )}
          {!templateDraftActive && (
            <InspectorSheet
              open={state.inspectorOpen}
              surface={state.activeSurface}
              graph={graph}
              compilation={compilation}
              publishedRevisionId={publishedRevision?.id ?? null}
              revision={state.revision}
              lifecycle={state.lifecycle}
              draftProposals={state.draftProposals}
              lastProposal={state.lastProposal}
              triggerRef={inspectorTriggerRef}
              onClose={toggleInspector}
            />
          )}
          {!templateDraftActive && (
            <ActivitySheet
              open={state.activityOpen}
              applications={applications}
              loading={applicationsLoading}
              compilingKey={compilingApplicationKey}
              portfolio={portfolioSummary}
              compilation={compilation}
              artifactLoading={artifactLoading}
              artifactSnapshot={artifactSnapshot}
              release={release.release}
              onInspectArtifact={inspectArtifact}
              onCompile={compileApplication}
              onOpen={openApplication}
              triggerRef={activityTriggerRef}
              onClose={toggleActivity}
            />
          )}
          <LibraryDrawer
            open={
              !templateDraftActive &&
              contextKey === "workspace-home" &&
              state.libraryOpen
            }
            loading={portfolioLoading}
            portfolio={portfolioSummary}
            triggerRef={libraryTriggerRef}
            onClose={toggleLibrary}
          />
        </section>
        <div className="workbench-operations" role="status">
          <span className={`connection-dot connection-${connectionState}`} />
          <span>
            {connectionState === "offline"
              ? "Control Plane unavailable"
              : `Control Plane ${connectionState}`}
          </span>
          {!templateDraftActive && draftDirty && (
            <span className="draft-changed">Unsaved Draft</span>
          )}
          {operationError && (
            <span className="operation-error">{operationError}</span>
          )}
          {!templateDraftActive && draftDirty && remoteDraft && (
            <button
              className="quiet-button"
              onClick={saveDraft}
              disabled={connectionState === "saving"}
              type="button"
            >
              Save draft
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
