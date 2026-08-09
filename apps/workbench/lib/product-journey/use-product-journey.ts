import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { RequirementInterpretationV1 } from "@factory/adapters";
import type { ApplicationGraphV1 } from "@factory/graph";

import {
  ControlPlaneClient,
  ControlPlaneError,
  type WorkbenchProductApplied,
} from "../control-plane-client";
import type { PlanReviewAlternative } from "../../components/journey/plan-review";
import {
  ANSWER_MAX_LENGTH,
  beginProductJourney,
  journeyTransition,
  openClarificationQuestions,
  planAlternativeSummary,
  createRequirementInput,
  type ProductJourneyState,
} from "./journey-model";

/**
 * The product journey controller: orchestrates the pure journey state machine
 * against the interpret route and the control plane product closure surface.
 * The brief and answers are transient — they cross only the interpret route
 * and never persist; every persisted boundary carries schema-valid contracts
 * (requirement, checksum-bound blueprint, review id, alternative key, apply
 * signal). Failures close the journey with a bounded message and return to
 * the composer to retry.
 */

export interface ProductJourneyController {
  readonly state: ProductJourneyState;
  readonly busy: boolean;
  /** The transient brief editing buffer; the composer binds to it. */
  readonly briefDraft: string;
  readonly setBriefDraft: (brief: string) => void;
  /** The live clarification answers buffer, keyed by question key. */
  readonly answers: Readonly<Record<string, string>>;
  readonly setAnswer: (key: string, value: string) => void;
  readonly openQuestions: readonly { key: string; question: string }[];
  readonly blueprintTitle: string;
  readonly planAlternatives: readonly PlanReviewAlternative[] | null;
  submitBrief: () => Promise<void>;
  /** Re-interprets with the current answers buffer. */
  answerQuestions: () => Promise<void>;
  createProduct: () => Promise<void>;
  chooseAlternative: (key: string) => Promise<void>;
  /** Applies the approved Diff and returns the composed Graph for adoption. */
  applyProduct: () => Promise<WorkbenchProductApplied | null>;
  /** Clears the journey so the next product starts from a fresh workspace. */
  reset: () => void;
}

/**
 * Keeps the answers buffer honest: only keys the current interpretation still
 * asks about survive a new interpretation.
 */
function pruneAnswers(
  answers: Readonly<Record<string, string>>,
  interpretation: RequirementInterpretationV1,
): Record<string, string> {
  const openKeys = new Set(
    interpretation.clarifications.flatMap((clarification) =>
      clarification.questions.map((question) => question.key),
    ),
  );
  return Object.fromEntries(
    Object.entries(answers).filter(([key]) => openKeys.has(key)),
  );
}

async function interpretRoute(
  brief: string,
  answers: Readonly<Record<string, string>>,
): Promise<RequirementInterpretationV1> {
  // Transport failures are bounded here: no raw fetch error text crosses the
  // journey boundary.
  let response: Response;
  try {
    response = await fetch("/api/requirements/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brief, answers }),
    });
  } catch {
    throw new Error("Requirement interpretation failed.");
  }
  const body = (await response.json().catch(() => null)) as {
    interpretation?: RequirementInterpretationV1;
    error?: string;
  } | null;
  if (!response.ok || body === null || body.interpretation === undefined) {
    throw new Error(body?.error ?? "Requirement interpretation failed.");
  }
  return body.interpretation;
}

function boundedFailure(error: unknown, fallback: string): string {
  if (error instanceof ControlPlaneError) {
    switch (error.status) {
      case 400:
        return "The control plane rejected the product requirement.";
      case 404:
        return "The product requirement was not found; start over.";
      case 409:
        return "The product requirement moved or already has a decision; start over.";
      case 503:
        return "The control plane is not ready yet; try again shortly.";
      default:
        return fallback;
    }
  }
  if (error instanceof Error && error.message.length > 0) return error.message;
  return fallback;
}

export function useProductJourney(
  controlPlaneUrl: string,
): ProductJourneyController {
  const [state, dispatch] = useReducer(
    journeyTransition,
    undefined,
    beginProductJourney,
  );
  const [busy, setBusy] = useState(false);
  const [briefDraft, setBriefDraft] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const busyRef = useRef(false);
  /**
   * Latches the automatic planning step: once an accepted interpretation
   * reaches the planning stage, the review and its alternatives are created
   * exactly once (StrictMode-safe), and a failure or reset re-arms it.
   */
  const planningStartedRef = useRef(false);
  const controlPlane = useMemo(
    () => new ControlPlaneClient(controlPlaneUrl),
    [controlPlaneUrl],
  );

  /** One in-flight journey step at a time; concurrent calls are dropped. */
  const run = useCallback(async (work: () => Promise<void>): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await work();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const setAnswer = useCallback((key: string, value: string): void => {
    setAnswers((current) => {
      const next = { ...current };
      if (value.trim().length === 0) {
        // An emptied input is an unanswered question, not an empty answer.
        delete next[key];
        return next;
      }
      next[key] = value.slice(0, ANSWER_MAX_LENGTH);
      return next;
    });
  }, []);

  const submitBrief = useCallback(async (): Promise<void> => {
    await run(async () => {
      try {
        const brief = briefDraft.trim();
        dispatch({ type: "submit-brief", brief });
        const interpretation = await interpretRoute(brief, {});
        dispatch({ type: "interpretation-accepted", interpretation });
        setAnswers((current) => pruneAnswers(current, interpretation));
      } catch (error) {
        dispatch({
          type: "fail",
          error: boundedFailure(error, "Requirement interpretation failed."),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, briefDraft]);

  const answerQuestions = useCallback(async (): Promise<void> => {
    await run(async () => {
      try {
        dispatch({ type: "clarify-answered", answers });
        const interpretation = await interpretRoute(state.brief, answers);
        dispatch({ type: "interpretation-accepted", interpretation });
        setAnswers((current) => pruneAnswers(current, interpretation));
      } catch (error) {
        dispatch({
          type: "fail",
          error: boundedFailure(error, "Requirement interpretation failed."),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, state, answers]);

  const createProduct = useCallback(async (): Promise<void> => {
    await run(async () => {
      try {
        const input = createRequirementInput(state);
        const review = await controlPlane.createProductRequirement({
          name: state.interpretation?.blueprint.title,
          requirement: input.requirement,
          blueprint: input.blueprint,
        });
        dispatch({ type: "review-created", review });
        const alternatives = await controlPlane.requestProductPlan(review.id);
        dispatch({ type: "alternatives-received", alternatives });
      } catch (error) {
        dispatch({
          type: "fail",
          error: boundedFailure(
            error,
            "The product requirement could not be created.",
          ),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, state, controlPlane]);

  // An accepted interpretation with no open questions lands directly in the
  // planning stage; the review and its plan alternatives are created here,
  // once, so the plan surface appears without an extra manual step. A
  // failure or reset re-arms the latch for the next product.
  useEffect(() => {
    if (state.stage === "planning" && state.review === null) {
      if (planningStartedRef.current) return;
      planningStartedRef.current = true;
      void createProduct();
      return;
    }
    if (state.stage === "failed" || state.stage === "brief") {
      planningStartedRef.current = false;
    }
  }, [state.stage, state.review, createProduct]);

  const chooseAlternative = useCallback(
    async (key: string): Promise<void> => {
      await run(async () => {
        try {
          const review = state.review;
          if (review === null) {
            throw new Error("Create the product review before planning.");
          }
          const chosen = await controlPlane.chooseProductPlan(review.id, key);
          dispatch({
            type: "alternative-chosen",
            key,
            diffChecksum: chosen.checksum,
          });
        } catch (error) {
          dispatch({
            type: "fail",
            error: boundedFailure(
              error,
              "The plan decision could not be recorded.",
            ),
          });
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, state, controlPlane],
  );

  const applyProduct =
    useCallback(async (): Promise<WorkbenchProductApplied | null> => {
      let applied: WorkbenchProductApplied | null = null;
      await run(async () => {
        try {
          const review = state.review;
          if (review === null) {
            throw new Error("Create the product review before applying.");
          }
          applied = await controlPlane.applyProduct(review.id);
          dispatch({ type: "applied" });
        } catch (error) {
          dispatch({
            type: "fail",
            error: boundedFailure(
              error,
              "The composed product could not be applied.",
            ),
          });
        }
      });
      return applied;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, state, controlPlane]);

  const reset = useCallback((): void => {
    setBriefDraft("");
    setAnswers({});
    dispatch({ type: "reset" });
  }, []);

  const openQuestions = openClarificationQuestions(state);
  const blueprintTitle = state.interpretation?.blueprint.title ?? "Requirement";
  const planAlternatives = useMemo(
    () =>
      state.alternatives === null
        ? null
        : state.alternatives.map((alternative) => ({
            key: alternative.key,
            label: alternative.label,
            ...planAlternativeSummary(alternative.plan),
          })),
    [state.alternatives],
  );

  return {
    state,
    busy,
    briefDraft,
    setBriefDraft,
    answers,
    setAnswer,
    openQuestions,
    blueprintTitle,
    planAlternatives,
    submitBrief,
    answerQuestions,
    createProduct,
    chooseAlternative,
    applyProduct,
    reset,
  };
}
