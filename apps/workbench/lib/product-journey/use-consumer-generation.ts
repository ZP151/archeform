import { useCallback, useEffect, useRef, useState } from "react";

import { consumerFamilyFor, type ConsumerFamily } from "./consumer-family";

import type { ProductJourneyController } from "./use-product-journey";
import type {
  ReleaseJourneyController,
  ReleaseTarget,
} from "./use-release-journey";

/**
 * The short-lived consumer bridge for the accepted consumer families.
 * It owns no server state: it only advances the existing product and release
 * controllers after their preceding authoritative state has succeeded.
 */
export interface ConsumerGenerationController {
  readonly family: ConsumerFamily | null;
  readonly suppliedMenu: boolean;
  readonly manualReview: boolean;
  readonly setManualReview: (manual: boolean) => void;
  readonly active: boolean;
  readonly status: string | null;
  readonly readyUrl: string | null;
  readonly retry: () => void;
}

type Input = {
  readonly journey: ProductJourneyController;
  readonly release: ReleaseJourneyController;
  readonly onStartOver?: () => void;
  readonly applyComposedProduct: (options?: {
    readonly resetJourney?: boolean;
  }) => Promise<ReleaseTarget | null>;
};

function isLoopbackPreviewUrl(url: string | null | undefined): url is string {
  if (url === null || url === undefined) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.username.length === 0 &&
      parsed.password.length === 0 &&
      (parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

function statusFor(
  release: ReleaseJourneyController["release"],
  family: ConsumerFamily | null,
): string {
  const label = family === "approval" ? "Approval" : "Restaurant";
  switch (release?.phase) {
    case "publishing":
      return `Preparing your ${label} app…`;
    case "compiling":
      return `Building your ${label} app…`;
    case "verifying":
      return `Checking your ${label} app…`;
    case "starting-preview":
      return `Starting your local ${label} app…`;
    case "preview":
      return `Your local ${label} app is ready.`;
    case "failed":
      return "Delivery paused. Review the delivery and try again.";
    case "cleaned-up":
      return `Your local ${label} preview has stopped.`;
    default:
      return `Preparing your ${label} app…`;
  }
}

/**
 * Automatically selects only an eligible deterministic `standard` plan,
 * applies the exact fresh Draft, then advances the existing local lifecycle one
 * phase at a time. Refs are session and phase latches, so React StrictMode,
 * repeated renders, late work, and a changed target cannot duplicate calls.
 */
export function useConsumerGeneration({
  journey,
  release,
  applyComposedProduct,
  onStartOver,
}: Input): ConsumerGenerationController {
  const [manualReview, setManualReview] = useState(false);
  const [target, setTarget] = useState<ReleaseTarget | null>(null);
  const [targetSuppliedMenu, setTargetSuppliedMenu] = useState(false);
  const [targetFamily, setTargetFamily] = useState<ConsumerFamily | null>(null);
  const [adoptionFailureSession, setAdoptionFailureSession] = useState<
    string | null
  >(null);
  const aliveRef = useRef(true);
  const selectingSessionRef = useRef<string | null>(null);
  const applyingSessionRef = useRef<string | null>(null);
  const advancedPhasesRef = useRef(new Set<string>());
  const latestSessionRef = useRef<string | null>(null);
  const awaitingReleaseTargetRef = useRef<string | null>(null);
  const latestTargetKeyRef = useRef<string | null>(null);

  const family = consumerFamilyFor(journey);
  const reviewId = journey.state.review?.id;
  const sessionKey =
    reviewId !== undefined && family !== null ? `${reviewId}@${family}` : null;
  const journeyBusy = journey.busy;
  latestSessionRef.current = sessionKey;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const eligible = !manualReview && family !== null;

  useEffect(() => {
    if (
      !eligible ||
      sessionKey === null ||
      journeyBusy ||
      journey.state.stage !== "planning" ||
      journey.state.selectedAlternativeKey !== null ||
      selectingSessionRef.current === sessionKey
    ) {
      return;
    }
    selectingSessionRef.current = sessionKey;
    void journey.chooseAlternative("standard");
  }, [eligible, journey, journeyBusy, sessionKey]);

  useEffect(() => {
    if (
      !eligible ||
      sessionKey === null ||
      journeyBusy ||
      journey.state.stage !== "reviewing" ||
      journey.state.selectedAlternativeKey !== "standard" ||
      adoptionFailureSession === sessionKey ||
      applyingSessionRef.current === sessionKey
    ) {
      return;
    }
    applyingSessionRef.current = sessionKey;
    void applyComposedProduct({ resetJourney: false }).then((freshTarget) => {
      // A late response never binds a different Describe run or an unmounted
      // Workbench. The expected applied state may be reset only after this
      // exact fresh target has been captured.
      if (!aliveRef.current || latestSessionRef.current !== sessionKey) {
        return;
      }
      if (freshTarget === null) {
        applyingSessionRef.current = null;
        setAdoptionFailureSession(sessionKey);
        return;
      }
      setTargetSuppliedMenu(
        journey.state.interpretation?.businessParameters?.mode === "provided",
      );
      setTargetFamily(family);
      setTarget(freshTarget);
      awaitingReleaseTargetRef.current = `${freshTarget.applicationGraphId}@${freshTarget.draftRevisionId}`;
      journey.reset();
    });
  }, [
    adoptionFailureSession,
    applyComposedProduct,
    eligible,
    family,
    journey,
    journeyBusy,
    sessionKey,
  ]);

  const releaseKey =
    target === null
      ? null
      : `${target.applicationGraphId}@${target.draftRevisionId}`;
  latestTargetKeyRef.current = releaseKey;
  const releaseMatchesTarget =
    target !== null &&
    release.release?.applicationGraphId === target.applicationGraphId &&
    release.release?.draftRevisionId === target.draftRevisionId;

  useEffect(() => {
    if (target === null) return;
    if (releaseMatchesTarget) {
      awaitingReleaseTargetRef.current = null;
      return;
    }
    if (awaitingReleaseTargetRef.current === releaseKey) return;
    advancedPhasesRef.current.clear();
    setTarget(null);
  }, [releaseKey, releaseMatchesTarget, target]);

  useEffect(() => {
    if (
      target === null ||
      !releaseMatchesTarget ||
      release.release === null ||
      release.busy
    ) {
      return;
    }
    const phase = release.release.phase;
    if (
      phase !== "publishing" &&
      phase !== "compiling" &&
      phase !== "verifying" &&
      phase !== "starting-preview"
    ) {
      return;
    }
    const key = `${releaseKey}@${phase}`;
    if (advancedPhasesRef.current.has(key)) return;
    advancedPhasesRef.current.add(key);
    switch (phase) {
      case "publishing":
        release.publishRelease();
        return;
      case "compiling":
        release.compileRelease();
        return;
      case "verifying":
        release.verifyRelease();
        return;
      case "starting-preview":
        release.previewRelease();
        return;
    }
  }, [release, releaseKey, releaseMatchesTarget, target]);

  const retry = useCallback(() => {
    if (adoptionFailureSession !== null) {
      applyingSessionRef.current = null;
      selectingSessionRef.current = null;
      setAdoptionFailureSession(null);
      journey.reset();
      return;
    }
    if (target === null || release.release?.phase !== "failed") return;
    advancedPhasesRef.current.clear();
    const recoveringKey = releaseKey;
    void release.resetRelease().then((outcome) => {
      if (
        outcome !== "start-over" ||
        !aliveRef.current ||
        latestTargetKeyRef.current !== recoveringKey
      )
        return;
      applyingSessionRef.current = null;
      selectingSessionRef.current = null;
      awaitingReleaseTargetRef.current = null;
      setTarget(null);
      journey.reset();
      onStartOver?.();
    });
  }, [
    adoptionFailureSession,
    journey,
    onStartOver,
    release,
    releaseKey,
    target,
  ]);

  const readyUrl =
    target !== null &&
    releaseMatchesTarget &&
    release.release?.phase === "preview" &&
    release.release.evidenceSummary !== undefined &&
    release.release.evidenceSummary.steps > 0 &&
    isLoopbackPreviewUrl(release.release.previewUrl)
      ? release.release.previewUrl
      : null;

  const automaticInFlight =
    eligible &&
    sessionKey !== null &&
    (journey.state.stage === "planning" ||
      journey.state.stage === "reviewing" ||
      adoptionFailureSession === sessionKey ||
      (journey.state.stage === "applied" &&
        applyingSessionRef.current === sessionKey));

  const activeFamily = target !== null ? targetFamily : family;
  const label = activeFamily === "approval" ? "Approval" : "Restaurant";

  return {
    family: activeFamily,
    suppliedMenu:
      target !== null
        ? targetSuppliedMenu
        : journey.state.interpretation?.businessParameters?.mode === "provided",
    manualReview,
    setManualReview,
    active: target !== null || automaticInFlight,
    status:
      target === null
        ? adoptionFailureSession === sessionKey
          ? `Delivery paused. Start a new ${label} request to try again.`
          : automaticInFlight
            ? `Preparing your ${label} app…`
            : null
        : statusFor(
            releaseMatchesTarget ? release.release : null,
            activeFamily,
          ),
    readyUrl,
    retry,
  };
}
