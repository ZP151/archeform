"use client";

import React, { useMemo, useState } from "react";
import { Rocket } from "lucide-react";

import type {
  ApplicationGraphV1,
  DraftDiffV1,
  PageLayoutVariant,
} from "@factory/graph";

import type {
  ControlPlaneClient,
  WorkbenchDraft,
  WorkbenchPublishedRevision,
} from "../../lib/control-plane-client";
import {
  adjustExperienceToken,
  adjustPageLayout,
  applyBuildDecision,
  createExpenseApprovalDecision,
  restoreDraftRevision,
} from "../../lib/golden-path/build-model";
import {
  answerClarification,
  buildRequirementSpec,
  deferClarification,
  type ClarificationKey,
} from "../../lib/golden-path/discuss-model";
import { visualGraphDiffFromPlan } from "../../lib/golden-path/graph-diff-visual";
import {
  acceptAlternative,
  applyAdjustment,
  applyApprovedDraftDiff,
  applyPlanToDraft,
  beginGoldenPathJourney,
  currentStage,
  isExpenseApprovalApplication,
  persistDraft,
  recordDraftRestore,
  recordSimulationDenial,
  requireSpec,
  stageProgress,
  startRelease,
  updateRelease,
  withAlternatives,
  withSimulation,
  type JourneyStage,
  type JourneyState,
} from "../../lib/golden-path/journey-model";
import type {
  PlanAlternativeKey,
  PlanAlternativesResult,
} from "../../lib/golden-path/plan-alternatives";
import { createExpenseApprovalPlanningBase } from "../../lib/golden-path/planning-base";
import { pollUntil } from "../../lib/golden-path/polling";
import {
  beginRelease,
  compilationStarted,
  compilationSucceeded,
  previewStarted,
  previewStopped,
  publishingSucceeded,
  releaseFailed,
  verificationStarted,
  verificationSucceeded,
} from "../../lib/golden-path/release-model";
import {
  resetExpenseApprovalSimulation,
  startExpenseApprovalSimulation,
  switchRole,
  transitionExpenseRecord,
} from "../../lib/golden-path/simulator";
import { BuildPanel } from "./build-panel";
import { DiscussPanel } from "./discuss-panel";
import { LineageCanvas } from "./lineage-canvas";
import { PlanPanel } from "./plan-panel";
import { ReleasePanel } from "./release-panel";
import { SimulatePanel } from "./simulate-panel";

interface GoldenPathWorkspaceProps {
  readonly graph: ApplicationGraphV1;
  readonly client: ControlPlaneClient;
  /** The control-plane record id of the open application (its Graph
   * metadata.id is a profile key, not the record the API keys on). */
  readonly applicationGraphId?: string;
  readonly onDraftApplied: (draft: WorkbenchDraft) => void;
  readonly onPublished: (published: WorkbenchPublishedRevision) => void;
}

const STAGES: readonly {
  readonly key: JourneyStage;
  readonly label: string;
}[] = [
  { key: "discuss", label: "Discuss" },
  { key: "plan", label: "Plan" },
  { key: "build", label: "Build" },
  { key: "simulate", label: "Simulate" },
  { key: "release", label: "Release" },
];

function pipelineFailure(
  message: string,
  code: string,
  draftDiff?: DraftDiffV1,
): Error & { readonly code: string; readonly draftDiff?: DraftDiffV1 } {
  const error = new Error(message) as Error & {
    code: string;
    draftDiff?: DraftDiffV1;
  };
  error.code = code;
  if (draftDiff !== undefined) error.draftDiff = draftDiff;
  return error;
}

function isDraftDiff(value: unknown): value is DraftDiffV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { readonly apiVersion?: unknown }).apiVersion ===
      "factory.draft-diff/v1"
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

/**
 * Golden Path mode shell: Discuss -> Plan -> Build -> Simulate -> Release
 * over the S1-S6 models, with the open application Graph as the persistence
 * carrier only. Every stage fails closed until its prerequisite exists; the
 * one-action release advances publish -> compile -> isolated verification ->
 * preview through the Control Plane client and stops the preview for
 * cleanup. Stage views, canvas, and evidence all come from the one journey
 * state — presentation never mutates business truth.
 */
export function GoldenPathWorkspace(
  props: GoldenPathWorkspaceProps,
): React.JSX.Element {
  const { graph, client, applicationGraphId, onDraftApplied, onPublished } =
    props;
  const [journey, setJourney] = useState<JourneyState>(() =>
    beginGoldenPathJourney(graph, applicationGraphId),
  );
  const [viewedStage, setViewedStage] = useState<JourneyStage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const eligible = isExpenseApprovalApplication(graph);
  const stage = currentStage(journey);
  const progress = useMemo(() => stageProgress(journey), [journey]);
  // The view only auto-follows the journey at the start; afterwards stage
  // navigation is explicit (panel Proceed buttons and the stepper), so an
  // advancing stage never yanks the user away from the current panel.
  const effectiveViewed = viewedStage ?? STAGES[0]!.key;
  const latest = journey.draftHistory[journey.draftHistory.length - 1]!;
  const accepted = useMemo(
    () =>
      journey.alternatives?.find(
        (alternative) => alternative.key === journey.selectedAlternative,
      ) ?? null,
    [journey.alternatives, journey.selectedAlternative],
  );
  const releaseLineage = useMemo(
    () =>
      journey.release === null
        ? undefined
        : {
            phase: journey.release.phase,
            ...(journey.release.publishedRevisionId === undefined
              ? {}
              : { publishedRevisionId: journey.release.publishedRevisionId }),
            ...(journey.release.compilationId === undefined
              ? {}
              : { compilationId: journey.release.compilationId }),
            ...(journey.release.verificationRunId === undefined
              ? {}
              : { verificationRunId: journey.release.verificationRunId }),
            ...(journey.release.previewRunId === undefined
              ? {}
              : { previewRunId: journey.release.previewRunId }),
          },
    [journey.release],
  );
  const complete = journey.release?.phase === "cleaned-up";

  if (!eligible) {
    return (
      <div className="golden-path-workspace" aria-label="Golden Path workspace">
        <header className="golden-path-header">
          <h1>Golden Path</h1>
          <p>
            This surface requires an Expense Approval application. Open or
            create one with the expense-review flow and an expense entity, then
            return to run the Golden Path.
          </p>
        </header>
      </div>
    );
  }

  const answer = (key: ClarificationKey, value: string): void => {
    setOperationError(null);
    setJourney((j) => ({
      ...j,
      session: answerClarification(j.session, key, value),
    }));
  };

  const defer = (key: ClarificationKey): void => {
    setOperationError(null);
    setJourney((j) => ({
      ...j,
      session: deferClarification(j.session, key),
    }));
  };

  const buildSpec = (): void => {
    setOperationError(null);
    const result = buildRequirementSpec(journey.session);
    if (!result.ok) {
      setOperationError("Unresolved required questions block Plan.");
      return;
    }
    setJourney((j) => requireSpec(j, result.spec));
  };

  // The deterministic planner reads recipe fixtures from disk and runs
  // server-side only; the client asks the Golden Path plan route for
  // alternatives and applies exactly what it returns.
  const produceAlternatives = async (): Promise<void> => {
    setOperationError(null);
    setBusy("Planning alternatives");
    try {
      const response = await fetch("/api/golden-path/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: journey.session }),
      });
      const result = (await response.json()) as PlanAlternativesResult;
      if (!response.ok || !result.ok) {
        setOperationError(
          result.ok === false && result.reason === "clarification"
            ? "The planner needs a clarification before it can propose alternatives."
            : "The planner needs every required question before it can propose alternatives.",
        );
        return;
      }
      setJourney((j) => withAlternatives(j, result.alternatives));
    } catch (error) {
      setOperationError(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  const accept = (key: PlanAlternativeKey): void => {
    setOperationError(null);
    const alternative = journey.alternatives?.find(
      (candidate) => candidate.key === key,
    );
    if (alternative === undefined) return;
    const base = createExpenseApprovalPlanningBase();
    setJourney((j) =>
      acceptAlternative(
        j,
        key,
        visualGraphDiffFromPlan(base, alternative.plan),
      ),
    );
  };

  const applyPlan = (): void => {
    setOperationError(null);
    const alternative = journey.alternatives?.find(
      (candidate) => candidate.key === journey.selectedAlternative,
    );
    if (alternative === undefined) return;
    const base = createExpenseApprovalPlanningBase();
    const decision = createExpenseApprovalDecision(alternative.plan, base, {
      decidedAt: new Date().toISOString(),
    });
    const draft = applyBuildDecision(alternative.plan, base, decision);
    setJourney((j) => applyPlanToDraft(j, draft));
  };

  const adjustToken = (token: string, value: string): void => {
    setOperationError(null);
    try {
      const draft = adjustExperienceToken(
        latest,
        "colour",
        token,
        value,
        "light",
      );
      setJourney((j) => applyAdjustment(j, draft, `colour token ${token}`));
    } catch (error) {
      setOperationError(messageOf(error));
    }
  };

  const adjustLayout = (pageId: string, variant: PageLayoutVariant): void => {
    setOperationError(null);
    try {
      const draft = adjustPageLayout(latest, pageId, variant);
      setJourney((j) => applyAdjustment(j, draft, `page layout of ${pageId}`));
    } catch (error) {
      setOperationError(messageOf(error));
    }
  };

  const restore = (revisionId: string, revision: number): void => {
    setOperationError(null);
    const target = journey.draftHistory.find(
      (candidate) =>
        candidate.id === revisionId && candidate.revision === revision,
    );
    if (target === undefined) return;
    const restored = restoreDraftRevision(journey.draftHistory, target);
    setJourney((j) => recordDraftRestore(j, restored));
  };

  const applyToDraft = async (): Promise<void> => {
    setBusy("Applying the Draft");
    setOperationError(null);
    try {
      // The plan-built graph carries the profile starter's identity; the
      // control plane binds revisions to the application aggregate by
      // metadata id, so stamp the carrier application's identity first.
      const persisted = {
        ...latest.graph,
        metadata: { ...latest.graph.metadata, ...graph.metadata },
      };
      const draft = await client.appendDraft(
        journey.applicationGraphId,
        persisted,
      );
      setJourney((j) => persistDraft(j, draft));
      onDraftApplied(draft);
    } catch (error) {
      setOperationError(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  const startSimulation = (): void => {
    setOperationError(null);
    setJourney((j) =>
      withSimulation(
        j,
        startExpenseApprovalSimulation(
          j.draftHistory[j.draftHistory.length - 1]!,
        ),
      ),
    );
  };

  const resetSimulation = (): void => {
    setOperationError(null);
    setJourney((j) =>
      withSimulation(
        j,
        resetExpenseApprovalSimulation(
          j.draftHistory[j.draftHistory.length - 1]!,
          j.simulation!,
        ),
      ),
    );
  };

  const switchSimulationRole = (role: string): void => {
    setOperationError(null);
    setJourney((j) => ({
      ...j,
      simulation: switchRole(
        j.draftHistory[j.draftHistory.length - 1]!,
        j.simulation!,
        role,
      ),
    }));
  };

  const transition = (recordId: string, event: string): void => {
    setOperationError(null);
    const outcome = transitionExpenseRecord(
      latest,
      journey.simulation!,
      recordId,
      event,
    );
    if (!outcome.ok) {
      setJourney((j) => recordSimulationDenial(j, outcome.reason));
    }
    setJourney((j) => ({ ...j, simulation: outcome.state }));
  };

  const publishAndRelease = async (): Promise<void> => {
    const persisted = journey.persistedDraft;
    if (persisted === null) return;
    setBusy("Releasing");
    setOperationError(null);
    let release = beginRelease({
      applicationGraphId: persisted.applicationGraphId,
      draftRevisionId: persisted.draftRevisionId,
    });
    setJourney((j) => startRelease(j, release));
    try {
      const published = await client.publishDraft(
        persisted.applicationGraphId,
        persisted.draftRevisionId,
      );
      release = publishingSucceeded(release, published.id);
      setJourney((j) => updateRelease(j, release));
      onPublished(published);

      const compilation = await client.createCompilation(published.id);
      release = compilationStarted(release, compilation.id);
      setJourney((j) => updateRelease(j, release));
      const compilationDone = await pollUntil(
        () => client.getCompilation(compilation.id),
        (compilation) =>
          compilation.result.status !== "queued" &&
          compilation.result.status !== "running",
      );
      if (
        compilationDone === null ||
        compilationDone.result.status !== "succeeded"
      ) {
        throw pipelineFailure("Compilation did not succeed.", "compile.failed");
      }
      release = compilationSucceeded(release, compilation.id);
      setJourney((j) => updateRelease(j, release));

      const verificationRunId = `verification-golden-path-${Date.now()}`;
      const run = await client.createVerificationRun(
        compilation.id,
        verificationRunId,
        "expense-approval",
      );
      release = verificationStarted(release, run.verificationRunId);
      setJourney((j) => updateRelease(j, release));
      const finished = await pollUntil(
        () => client.getVerificationRun(verificationRunId),
        (verification) => verification.status !== "pending",
      );
      if (finished === null || finished.status !== "succeeded") {
        throw pipelineFailure(
          "Isolated verification did not pass.",
          "verify.isolated_steps_failed",
          isDraftDiff(finished?.draftDiff) ? finished!.draftDiff : undefined,
        );
      }
      release = verificationSucceeded(
        release,
        finished.stepIds.map((stepId) => ({
          stepId,
          status: "succeeded" as const,
        })),
      );
      setJourney((j) => updateRelease(j, release));

      const started = await client.startPreviewRun(compilation.id);
      const ready = await pollUntil(
        () => client.getCurrentPreviewRun(compilation.id),
        (preview) =>
          preview !== null &&
          preview.status !== "starting" &&
          preview.status !== "stopping",
        { intervalMs: 1500, timeoutMs: 300_000 },
      );
      if (
        ready === null ||
        ready.status !== "ready" ||
        ready.previewUrl === null
      ) {
        throw pipelineFailure(
          "Preview did not become ready.",
          "preview.start_failed",
        );
      }
      release = previewStarted(release, started.id, ready.previewUrl);
      setJourney((j) => updateRelease(j, release));
    } catch (error) {
      const code =
        (error as { readonly code?: string }).code ?? "release.pipeline_failed";
      const draftDiff = (error as { readonly draftDiff?: DraftDiffV1 })
        .draftDiff;
      setJourney((j) =>
        updateRelease(j, releaseFailed(j.release!, code, draftDiff)),
      );
    } finally {
      setBusy(null);
    }
  };

  const stopPreview = async (): Promise<void> => {
    const release = journey.release;
    if (release === null || release.previewRunId === undefined) return;
    setBusy("Stopping the preview");
    setOperationError(null);
    try {
      await client.stopPreviewRun(release.previewRunId);
      setJourney((j) => updateRelease(j, previewStopped(j.release!)));
    } catch (error) {
      setOperationError(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  const approveDraftDiff = async (): Promise<void> => {
    const release = journey.release;
    if (
      release === null ||
      release.verificationRunId === undefined ||
      release.proposedDraftDiff === undefined
    ) {
      return;
    }
    setBusy("Applying the approved Draft Diff");
    setOperationError(null);
    try {
      const approval = await client.approveVerificationDraftDiff(
        release.verificationRunId,
        release.proposedDraftDiff,
      );
      setJourney((j) => applyApprovedDraftDiff(j, approval.draft));
      onDraftApplied(approval.draft);
    } catch (error) {
      setOperationError(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="golden-path-workspace" aria-label="Golden Path workspace">
      <header className="golden-path-header">
        <p className="golden-path-kicker">Golden Path · Expense Approval</p>
        <h1>From requirement to local preview</h1>
        <p>
          Describe, plan, build, simulate, and release the Expense Approval
          application over the immutable Draft lifecycle — a local preview,
          never a deployment.
        </p>
      </header>

      {operationError !== null ? (
        <p className="golden-path-error" role="alert">
          {operationError}
        </p>
      ) : null}
      {busy !== null ? (
        <p className="golden-path-busy" role="status">
          {busy}…
        </p>
      ) : null}

      <nav className="golden-path-stages" aria-label="Golden Path stages">
        {STAGES.map(({ key, label }) => {
          const status = progress[key];
          return (
            <button
              key={key}
              type="button"
              className={`golden-path-stage ${status}`}
              aria-label={`Golden Path stage ${label}`}
              aria-current={effectiveViewed === key ? "step" : undefined}
              disabled={status === "blocked"}
              onClick={() => setViewedStage(key)}
            >
              {label}
              {status === "done" ? " ✓" : ""}
            </button>
          );
        })}
      </nav>

      {effectiveViewed === "discuss" ? (
        <DiscussPanel
          session={journey.session}
          spec={journey.spec}
          onAnswer={answer}
          onDefer={defer}
          onBuildSpec={buildSpec}
          onProceed={() => setViewedStage("plan")}
        />
      ) : null}
      {effectiveViewed === "plan" ? (
        <PlanPanel
          alternatives={journey.alternatives}
          selectedKey={journey.selectedAlternative}
          visualDiff={journey.visualDiff}
          onAccept={accept}
          onProduce={produceAlternatives}
          onProceed={() => setViewedStage("build")}
        />
      ) : null}
      {effectiveViewed === "build" ? (
        <BuildPanel
          acceptedPlanLabel={accepted?.label ?? null}
          planId={accepted?.plan.planId ?? null}
          draftHistory={journey.draftHistory}
          adjustmentLog={journey.adjustmentLog}
          persistedDraft={journey.persistedDraft}
          busy={busy !== null}
          error={operationError}
          onApplyPlan={applyPlan}
          onAdjustToken={adjustToken}
          onAdjustLayout={adjustLayout}
          onApplyToDraft={() => void applyToDraft()}
          onRestore={restore}
          onProceed={() => setViewedStage("simulate")}
        />
      ) : null}
      {effectiveViewed === "simulate" ? (
        <SimulatePanel
          draft={latest}
          simulation={journey.simulation}
          onStart={startSimulation}
          onReset={resetSimulation}
          onSwitchRole={switchSimulationRole}
          onTransition={transition}
          onProceed={() => setViewedStage("release")}
        />
      ) : null}
      {effectiveViewed === "release" ? (
        <ReleasePanel
          persistedDraft={journey.persistedDraft}
          release={journey.release}
          busy={busy !== null}
          error={operationError}
          onPublishAndRelease={() => void publishAndRelease()}
          onStopPreview={() => void stopPreview()}
          onApproveDraftDiff={() => void approveDraftDiff()}
        />
      ) : null}

      <LineageCanvas graph={latest.graph} release={releaseLineage} />

      <section
        className="golden-path-timeline"
        aria-label="Golden Path evidence timeline"
      >
        <h2>Golden Path evidence</h2>
        <ul>
          {journey.timeline.events.map((event, index) => (
            <li key={`${index}-${event.kind}`}>
              {event.kind} · {event.status} · {event.title}
              {event.reason !== undefined ? ` · ${event.reason}` : ""}
            </li>
          ))}
        </ul>
      </section>

      {complete ? (
        <section className="golden-path-complete">
          <Rocket size={20} aria-hidden="true" />
          <p>
            Golden Path journey complete — the local preview ran over the
            immutable Draft lifecycle and was cleaned up.
          </p>
        </section>
      ) : null}
    </div>
  );
}
