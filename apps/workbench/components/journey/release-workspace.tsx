"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ListChecks,
  Rocket,
  RotateCcw,
  Trash2,
} from "lucide-react";

import type { ReleaseState } from "../../lib/product-journey/release-model";
import type { ReleaseJourneyController } from "../../lib/product-journey/use-release-journey";

/**
 * The release workspace: one product's immutable release pipeline —
 * publish -> compile -> isolated verification -> preview -> cleanup — driven
 * by the release journey controller. Evidence stays count-first on this
 * surface ("N steps · X passed · Y failed"); the full release timeline is
 * rendered behind the Activity sheet, never permanently beneath the
 * workspace. A failed verification shows its bounded safe diagnosis and,
 * when the worker proposed one, a reviewable Draft Diff. The model never
 * applies a diff automatically — approving submits it to the review
 * boundary, and the approved Draft is handed back to the parent to adopt.
 */

type Props = {
  readonly controller: ReleaseJourneyController;
  /** Opens the Activity sheet, which renders the full release timeline. */
  readonly onViewEvidence: () => void;
};

type PhaseStep = {
  readonly kind: "publish" | "compile" | "verify" | "boot" | "cleanup";
  readonly label: string;
  readonly status: "running" | "succeeded" | "failed" | "pending";
};

const RELEASE_PHASES: readonly {
  readonly kind: PhaseStep["kind"];
  readonly label: string;
}[] = [
  { kind: "publish", label: "Publish" },
  { kind: "compile", label: "Compile" },
  { kind: "verify", label: "Verify" },
  { kind: "boot", label: "Preview" },
  { kind: "cleanup", label: "Cleanup" },
];

/**
 * The phase rail is derived deterministically from the release timeline:
 * the latest event of each phase kind decides its state, and a failed
 * release marks the first phase whose latest event is still running.
 */
function phaseRailOf(release: ReleaseState): PhaseStep[] {
  const steps: PhaseStep[] = RELEASE_PHASES.map((phase) => {
    const latest = [...release.timeline.events]
      .reverse()
      .find((event) => event.kind === phase.kind);
    const status: PhaseStep["status"] =
      latest === undefined
        ? "pending"
        : latest.status === "succeeded"
          ? "succeeded"
          : latest.status === "failed"
            ? "failed"
            : "running";
    return { ...phase, status };
  });
  if (release.phase !== "failed") return steps;
  const failingIndex = steps.findIndex((step) => step.status === "running");
  if (failingIndex < 0) return steps;
  return steps.map((step, index) =>
    index === failingIndex
      ? { ...step, status: "failed" as const }
      : index > failingIndex
        ? { ...step, status: "pending" as const }
        : { ...step, status: "succeeded" as const },
  );
}

function operationText(operation: {
  readonly op: string;
  readonly [key: string]: unknown;
}): string {
  switch (operation.op) {
    case "add-binding":
      return `Add binding: ${String(operation.capability)} on ${String(
        operation.graphSymbol,
      )}`;
    case "remove-binding":
      return `Remove binding: ${String(operation.capability)} on ${String(
        operation.graphSymbol,
      )}`;
    case "replace-input":
      return `Replace input ${String(operation.entity)}.${String(
        operation.field,
      )} = ${JSON.stringify(operation.value)}`;
    case "change-constraint":
      return `Change constraint ${String(operation.entity)}.${String(
        operation.field,
      )} (${String(operation.constraint)}) = ${JSON.stringify(
        operation.value,
      )}`;
    default:
      return `Operation: ${operation.op}`;
  }
}

function PhaseIcon({ status }: { readonly status: PhaseStep["status"] }) {
  if (status === "succeeded") {
    return <CheckCircle2 size={16} aria-hidden="true" className="is-done" />;
  }
  if (status === "failed") {
    return <AlertTriangle size={16} aria-hidden="true" className="is-failed" />;
  }
  if (status === "running") {
    return <Clock size={16} aria-hidden="true" className="is-running" />;
  }
  return <span className="phase-dot" aria-hidden="true" />;
}

export function ReleaseWorkspace({ controller, onViewEvidence }: Props) {
  const { release, busy } = controller;
  if (release === null) {
    return (
      <section className="release-workspace" aria-label="Release">
        <div className="release-empty">
          <Rocket size={20} aria-hidden="true" />
          <p>
            Compose a product to release it: publish the Draft as an immutable
            revision, compile, run isolated verification, preview, and clean up.
          </p>
        </div>
      </section>
    );
  }

  const steps = phaseRailOf(release);
  const evidence = release.evidenceSummary;
  const failed = release.phase === "failed";
  const cleanedUp = release.phase === "cleaned-up";

  return (
    <section className="release-workspace" aria-label="Release">
      <header className="release-heading">
        <span className="release-heading-title">Release</span>
        <span className="release-heading-note">{release.label}</span>
      </header>

      <ol className="release-phase-rail" aria-label="Release pipeline phases">
        {steps.map((step) => (
          <li
            key={step.kind}
            className={`release-phase release-phase-${step.status}`}
          >
            <PhaseIcon status={step.status} />
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      {evidence !== undefined && (
        <div className="release-evidence-summary" aria-live="polite">
          <ListChecks size={16} aria-hidden="true" />
          <span>
            {evidence.steps} steps · {evidence.passed} passed ·{" "}
            {evidence.failed} failed
          </span>
          <button
            type="button"
            className="release-link-button"
            onClick={onViewEvidence}
          >
            View evidence
          </button>
        </div>
      )}

      {!failed && !cleanedUp && <ReleaseAction controller={controller} />}

      {failed && <FailureCard controller={controller} />}

      {cleanedUp && (
        <div className="release-done-note">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Preview stopped and cleaned up.</span>
          <button
            type="button"
            className="release-button"
            onClick={controller.resetRelease}
            disabled={!controller.canReset}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Release again
          </button>
        </div>
      )}
    </section>
  );
}

function ReleaseAction({
  controller,
}: {
  readonly controller: ReleaseJourneyController;
}) {
  const { release, busy } = controller;
  if (release === null) return null;
  const working = busy ? (
    <Clock size={14} aria-hidden="true" className="is-running" />
  ) : null;

  if (release.phase === "publishing") {
    return (
      <div className="release-action-card">
        <p>
          Publish the current Draft as an immutable revision before it can
          compile or verify.
        </p>
        <button
          type="button"
          className="release-button release-button-primary"
          onClick={controller.publishRelease}
          disabled={!controller.canPublish}
        >
          {working ?? <Rocket size={14} aria-hidden="true" />}
          {busy ? "Publishing…" : "Publish Draft"}
        </button>
      </div>
    );
  }

  if (release.phase === "compiling") {
    return (
      <div className="release-action-card">
        <p>
          Compile the Published Graph into its immutable application bundle.
        </p>
        <button
          type="button"
          className="release-button release-button-primary"
          onClick={controller.compileRelease}
          disabled={!controller.canCompile}
        >
          {working ?? <Rocket size={14} aria-hidden="true" />}
          {busy ? "Compiling…" : "Compile Published Graph"}
        </button>
      </div>
    );
  }

  if (release.phase === "verifying") {
    return (
      <div className="release-action-card">
        <p>
          Verify the bundle in isolation: the worker derives the journey plan
          from the Published Graph, probes every declared role journey plus an
          authorization denial, and keeps one evidence bundle.
        </p>
        <button
          type="button"
          className="release-button release-button-primary"
          onClick={controller.verifyRelease}
          disabled={!controller.canVerify}
        >
          {working ?? <Rocket size={14} aria-hidden="true" />}
          {busy ? "Verifying…" : "Run Isolated Verification"}
        </button>
      </div>
    );
  }

  if (release.phase === "starting-preview") {
    return (
      <div className="release-action-card">
        <p>Boot the compiled bundle as a local preview runtime.</p>
        <button
          type="button"
          className="release-button release-button-primary"
          onClick={controller.previewRelease}
          disabled={!controller.canPreview}
        >
          {working ?? <Rocket size={14} aria-hidden="true" />}
          {busy ? "Booting preview…" : "Start Preview"}
        </button>
      </div>
    );
  }

  if (release.phase === "preview" && release.previewUrl !== null) {
    return (
      <div className="release-preview-card">
        <span className="release-preview-label">Preview running</span>
        <code className="release-preview-url">{release.previewUrl}</code>
        <a
          className="release-button"
          href={release.previewUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={14} aria-hidden="true" />
          Open preview
        </a>
        <button
          type="button"
          className="release-button"
          onClick={controller.cleanupRelease}
          disabled={!controller.canCleanup}
        >
          <Trash2 size={14} aria-hidden="true" />
          Stop and clean up
        </button>
      </div>
    );
  }

  return (
    <div className="release-action-card">
      <p>Waiting for the preview runtime…</p>
    </div>
  );
}

function FailureCard({
  controller,
}: {
  readonly controller: ReleaseJourneyController;
}) {
  const { release, busy } = controller;
  if (release === null) return null;
  const diff = release.proposedDraftDiff;

  return (
    <div className="release-failure-card">
      <AlertTriangle size={16} aria-hidden="true" className="is-failed" />
      <span>
        Release stopped:{" "}
        <code className="release-diagnosis">{release.diagnosis}</code>
      </span>

      {diff !== undefined && (
        <div className="release-draft-diff">
          <p className="release-draft-diff-heading">
            Reviewable Draft Diff — {diff.summary}
          </p>
          <ul className="release-draft-diff-operations">
            {diff.operations.map((operation, index) => (
              <li key={`${operation.op}-${index}`}>
                {operationText(
                  operation as unknown as {
                    op: string;
                    [key: string]: unknown;
                  },
                )}
              </li>
            ))}
          </ul>
          <p className="release-draft-diff-note">
            The release model never applies a diff automatically. Approving
            submits it to the review boundary; the approved Draft is handed back
            for you to adopt.
          </p>
          <button
            type="button"
            className="release-button release-button-primary"
            onClick={controller.approveDraftDiff}
            disabled={!controller.canApproveDraftDiff}
          >
            {busy ? "Approving…" : "Approve Draft Diff"}
          </button>
          {controller.approvalError !== null && (
            <p className="release-approval-error">
              Approval refused:{" "}
              <code className="release-diagnosis">
                {controller.approvalError}
              </code>
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="release-button"
        onClick={controller.resetRelease}
        disabled={!controller.canReset}
      >
        <RotateCcw size={14} aria-hidden="true" />
        Restart release
      </button>
    </div>
  );
}
