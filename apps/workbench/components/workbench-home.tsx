"use client";

import type {
  CompositionClarificationV1,
  RequirementSpecV1,
} from "@factory/graph";

import type { WorkbenchApplicationSummary } from "../lib/control-plane-client";
import type { ProductJourneyStage } from "../lib/product-journey/journey-model";
import type { ProductJourneyFailure } from "../lib/product-journey/interpret-contract";
import { ClarificationPanel } from "./journey/clarification-panel";
import { GraphDiffReview } from "./journey/graph-diff-review";
import { PlanReview, type PlanReviewAlternative } from "./journey/plan-review";
import { RequirementComposer } from "./journey/requirement-composer";
import { RecentProducts } from "./shell/recent-products";

/**
 * Home is the product creation decision: the free-form composer is the
 * default, clarifying questions, plan comparison, and the approved Diff
 * review replace it as the journey progresses, and a failed journey returns
 * to the composer with the bounded error visible. A compact recent-products
 * row appears only when local applications exist, so an empty workspace
 * keeps the composer as the sole decision.
 */

export type WorkbenchHomeJourneyProps = {
  readonly stage: ProductJourneyStage;
  readonly busy: boolean;
  readonly error: string | null;
  readonly failure: ProductJourneyFailure | null;
  /** The transient brief editing buffer; the composer binds to it. */
  readonly brief: string;
  readonly onBriefChange: (brief: string) => void;
  readonly onInterpret: () => void;
  readonly examplePrompts: readonly string[];
  readonly onApplyExample: (brief: string) => void;
  readonly requirement: RequirementSpecV1 | null;
  readonly blueprintTitle: string;
  readonly openQuestions: readonly CompositionClarificationV1["questions"][number][];
  readonly answers: Readonly<Record<string, string>>;
  readonly onAnswerChange: (key: string, answer: string) => void;
  readonly onContinue: () => void;
  readonly planAlternatives: readonly PlanReviewAlternative[] | null;
  readonly chosenKey: string | null;
  readonly onChoose: (key: string) => void;
  readonly diffChecksum: string | null;
  readonly onApply: () => void;
};

type Props = {
  readonly applications: readonly WorkbenchApplicationSummary[];
  readonly loading: boolean;
  readonly compilingKey?: string | null;
  /** Bumped by Ctrl+K (or Cmd+K) so the composer can land focus. */
  readonly commandFocusToken?: number;
  readonly journey: WorkbenchHomeJourneyProps;
  readonly onOpen: (applicationKey: string) => void;
  readonly onCompile: (applicationKey: string) => void;
};

function JourneySlot({
  journey,
  commandFocusToken,
}: {
  readonly journey: WorkbenchHomeJourneyProps;
  readonly commandFocusToken?: number;
}) {
  if (journey.stage === "clarifying" && journey.requirement !== null) {
    return (
      <ClarificationPanel
        requirement={journey.requirement}
        blueprintTitle={journey.blueprintTitle}
        questions={journey.openQuestions}
        answers={journey.answers}
        onAnswerChange={journey.onAnswerChange}
        busy={journey.busy}
        error={journey.error}
        onContinue={journey.onContinue}
      />
    );
  }
  if (
    journey.stage === "planning" &&
    journey.requirement !== null &&
    journey.planAlternatives !== null
  ) {
    return (
      <PlanReview
        requirement={journey.requirement}
        blueprintTitle={journey.blueprintTitle}
        alternatives={journey.planAlternatives}
        chosenKey={journey.chosenKey}
        busy={journey.busy}
        error={journey.error}
        onChoose={journey.onChoose}
      />
    );
  }
  if (journey.stage === "reviewing") {
    return (
      <GraphDiffReview
        diffChecksum={journey.diffChecksum ?? "pending"}
        busy={journey.busy}
        error={journey.error}
        onApply={journey.onApply}
      />
    );
  }
  // brief, applied, and failed all return to the composer; a failure keeps
  // its bounded error visible above the composer.
  return (
    <RequirementComposer
      brief={journey.brief}
      onBriefChange={journey.onBriefChange}
      busy={journey.busy}
      error={journey.error}
      onInterpret={journey.onInterpret}
      examplePrompts={journey.examplePrompts}
      onApplyExample={journey.onApplyExample}
      commandFocusToken={commandFocusToken}
    />
  );
}

export function WorkbenchHome({
  applications,
  loading,
  compilingKey = null,
  commandFocusToken,
  journey,
  onOpen,
  onCompile,
}: Props) {
  const requirementFailure =
    journey.failure?.phase === "interpretation" ||
    journey.failure?.phase === "clarification"
      ? journey.failure
      : null;
  const requirementOutcome =
    journey.requirement !== null
      ? "accepted"
      : requirementFailure === null
        ? undefined
        : "failed";
  return (
    <div className="workbench-home" aria-label="Workbench Home">
      <section
        className="home-composer"
        aria-label="Product creation"
        data-requirement-outcome={requirementOutcome}
        data-requirement-failure-code={requirementFailure?.code}
        data-journey-outcome={journey.failure === null ? undefined : "failed"}
        data-journey-failure-phase={journey.failure?.phase}
        data-journey-failure-code={journey.failure?.code}
      >
        <JourneySlot journey={journey} commandFocusToken={commandFocusToken} />
      </section>
      <RecentProducts
        applications={applications}
        compilingKey={compilingKey}
        loading={loading}
        onCompile={onCompile}
        onOpen={onOpen}
      />
    </div>
  );
}
