import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type {
  ClarificationAnswerContextV1,
  ClarificationQuestionV1,
  RequirementInterpretationV1,
} from "@factory/adapters/requirements/browser";
import { resolveClarificationCycle } from "@factory/adapters/requirements/browser";
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
import {
  parseInterpretationResponse,
  productJourneyFailure,
  requirementFailure,
  type ProductJourneyFailure,
  type ProductJourneyFailureCode,
  type ProductJourneyFailurePhase,
} from "./interpret-contract";

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
  readonly openQuestions: readonly ClarificationQuestionV1[];
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

async function interpretRoute(
  brief: string,
  answers: Readonly<Record<string, string>>,
  phase: "interpretation" | "clarification",
  clarificationContext: readonly ClarificationAnswerContextV1[] = [],
  priorInterpretation?: RequirementInterpretationV1,
): Promise<RequirementInterpretationV1> {
  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // One abortable deadline covers both headers and body consumption. The
  // response body can stall independently of fetch, so clearing the timer at
  // the header boundary would leave the journey unbounded.
  try {
    const result = await Promise.race([
      (async () => {
        const response = await fetch("/api/requirements/interpret", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brief,
            answers,
            clarificationContext,
            ...(priorInterpretation === undefined
              ? {}
              : { priorInterpretation }),
          }),
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as {
          interpretation?: RequirementInterpretationV1;
        } | null;
        return { response, body };
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(
            new ProductJourneyFailureError(
              requirementFailure(phase, "requirement.timeout"),
            ),
          );
        }, REQUIREMENT_INTERPRETATION_TIMEOUT_MS);
      }),
    ]);
    const parsed = parseInterpretationResponse(
      result.response.status,
      result.body,
      phase,
    );
    if (!parsed.ok) throw new ProductJourneyFailureError(parsed.failure);
    return parsed.interpretation;
  } catch (error) {
    if (timedOut) {
      throw new ProductJourneyFailureError(
        requirementFailure(phase, "requirement.timeout"),
      );
    }
    if (error instanceof ProductJourneyFailureError) throw error;
    throw new ProductJourneyFailureError(
      requirementFailure(phase, "requirement.failed"),
    );
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

const REQUIREMENT_INTERPRETATION_TIMEOUT_MS = 555_000;
const PRODUCT_PHASE_TIMEOUT_MS = 180_000;

class ProductJourneyFailureError extends Error {
  public constructor(public readonly failure: ProductJourneyFailure) {
    super(failure.message);
    this.name = "ProductJourneyFailureError";
  }
}

async function withProductPhaseDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  message: string,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error(message));
        }, PRODUCT_PHASE_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    if (timedOut) throw new Error(message);
    throw error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

async function withRecoverableProductPhase<T>(input: {
  readonly operation: (signal: AbortSignal) => Promise<T>;
  readonly timeoutMessage: string;
  readonly reconciliationTimeoutMessage: string;
}): Promise<T> {
  try {
    return await withProductPhaseDeadline(
      input.operation,
      input.timeoutMessage,
    );
  } catch (error) {
    // A Control Plane response is authoritative and must not be replayed.
    // Transport loss and a locally enforced deadline are ambiguous: the
    // server may have accepted the operation, so exactly one repeat asks the
    // idempotent server boundary to return the same result.
    if (
      error instanceof ControlPlaneError ||
      error instanceof ProductJourneyFailureError
    ) {
      throw error;
    }
    return withProductPhaseDeadline(
      input.operation,
      input.reconciliationTimeoutMessage,
    );
  }
}

const compositionFailureCodes = new Set<ProductJourneyFailureCode>([
  "composition.request_envelope_invalid",
  "composition.request_identity_invalid",
  "composition.requirement_invalid",
  "composition.blueprint_invalid",
  "composition.requirement_blueprint_checksum_mismatch",
]);

function boundedProductFailure(input: {
  readonly error: unknown;
  readonly phase: ProductJourneyFailurePhase;
  readonly fallbackCode: ProductJourneyFailureCode;
  readonly fallbackMessage: string;
}): ProductJourneyFailure {
  const { error, phase } = input;
  if (error instanceof ProductJourneyFailureError) return error.failure;
  if (error instanceof ControlPlaneError) {
    switch (error.status) {
      case 400: {
        const code =
          error.code !== undefined &&
          compositionFailureCodes.has(error.code as ProductJourneyFailureCode)
            ? (error.code as ProductJourneyFailureCode)
            : "product.failed";
        return productJourneyFailure(
          phase,
          code,
          code === "product.failed"
            ? "The control plane rejected the product requirement."
            : `The control plane rejected the product requirement. (${code})`,
        );
      }
      case 404:
        return productJourneyFailure(
          phase,
          "product.not_found",
          "The product requirement was not found; start over.",
        );
      case 409:
        return productJourneyFailure(
          phase,
          "product.conflict",
          "The product requirement moved or already has a decision; start over.",
        );
      case 503:
        return productJourneyFailure(
          phase,
          "product.unavailable",
          "The control plane is not ready yet; try again shortly.",
        );
      default:
        return productJourneyFailure(
          phase,
          input.fallbackCode,
          input.fallbackMessage,
        );
    }
  }
  const timeoutCodes: Readonly<Record<string, ProductJourneyFailureCode>> = {
    "Product review creation timed out.": "product.review_timeout",
    "Product review reconciliation timed out.":
      "product.review_reconciliation_timeout",
    "Product planning timed out.": "product.planning_timeout",
    "Product plan reconciliation timed out.":
      "product.planning_reconciliation_timeout",
    "Product decision timed out.": "product.failed",
    "Product decision reconciliation timed out.": "product.failed",
    "Product application timed out.": "product.failed",
    "Product application reconciliation timed out.": "product.failed",
  };
  if (error instanceof Error && timeoutCodes[error.message] !== undefined) {
    return productJourneyFailure(
      phase,
      timeoutCodes[error.message],
      error.message,
    );
  }
  return productJourneyFailure(
    phase,
    input.fallbackCode,
    input.fallbackMessage,
  );
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
  const generationRef = useRef(0);
  /**
   * Latches the automatic planning step: once an accepted interpretation
   * reaches the planning stage, the review and its alternatives are created
   * exactly once (StrictMode-safe), and a failure or reset re-arms it.
   */
  const planningStartedRef = useRef(false);
  const productRequestIdRef = useRef<string | null>(null);
  const controlPlane = useMemo(
    () => new ControlPlaneClient(controlPlaneUrl),
    [controlPlaneUrl],
  );

  /** One in-flight journey step at a time; concurrent calls are dropped. */
  const run = useCallback(
    async (
      work: (isCurrent: () => boolean) => Promise<void>,
    ): Promise<void> => {
      if (busyRef.current) return;
      const generation = generationRef.current;
      const isCurrent = () => generationRef.current === generation;
      busyRef.current = true;
      setBusy(true);
      try {
        await work(isCurrent);
      } finally {
        if (isCurrent()) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [],
  );

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
    await run(async (isCurrent) => {
      try {
        const brief = briefDraft.trim();
        dispatch({ type: "submit-brief", brief });
        const interpretation = await interpretRoute(
          brief,
          {},
          "interpretation",
        );
        if (!isCurrent()) return;
        dispatch({ type: "interpretation-accepted", interpretation });
        setAnswers({});
      } catch (error) {
        if (!isCurrent()) return;
        dispatch({
          type: "fail",
          failure: boundedProductFailure({
            error,
            phase: "interpretation",
            fallbackCode: "requirement.failed",
            fallbackMessage: "Requirement interpretation failed.",
          }),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, briefDraft]);

  const answerQuestions = useCallback(async (): Promise<void> => {
    await run(async (isCurrent) => {
      try {
        if (state.interpretationCycles >= 2) {
          dispatch({
            type: "fail",
            failure: productJourneyFailure(
              "clarification",
              "journey.interpretation_cycle_bound",
              "Requirement interpretation exceeded the two-cycle safety bound.",
            ),
          });
          return;
        }
        const cumulativeAnswers = { ...state.answers, ...answers };
        const priorQuestions = openClarificationQuestions(state);
        const clarificationContext = priorQuestions.flatMap((question) => {
          const answer = cumulativeAnswers[question.key]?.trim();
          return answer ? [{ ...question, answer }] : [];
        });
        dispatch({ type: "clarify-answered", answers: cumulativeAnswers });
        const proposed = await interpretRoute(
          state.brief,
          cumulativeAnswers,
          "clarification",
          clarificationContext,
          state.interpretation ?? undefined,
        );
        if (!isCurrent()) return;
        const resolved = resolveClarificationCycle({
          interpretation: proposed,
          priorQuestions,
          answers: cumulativeAnswers,
          applySafeDefaults: true,
        });
        dispatch({ type: "clarify-answered", answers: resolved.answers });
        dispatch({
          type: "interpretation-accepted",
          interpretation: resolved.interpretation,
        });
        setAnswers({ ...resolved.answers });
      } catch (error) {
        if (!isCurrent()) return;
        dispatch({
          type: "fail",
          failure: boundedProductFailure({
            error,
            phase: "clarification",
            fallbackCode: "requirement.failed",
            fallbackMessage: "Requirement interpretation failed.",
          }),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, state, answers]);

  const createProduct = useCallback(async (): Promise<void> => {
    await run(async (isCurrent) => {
      let review: ProductJourneyState["review"];
      try {
        const input = createRequirementInput(state);
        productRequestIdRef.current ??= `request-${globalThis.crypto.randomUUID()}`;
        const request = {
          requestId: productRequestIdRef.current,
          name: state.interpretation?.blueprint.title,
          requirement: input.requirement,
          blueprint: input.blueprint,
        };
        review = await withRecoverableProductPhase({
          operation: (signal) =>
            controlPlane.createProductRequirement(request, signal),
          timeoutMessage: "Product review creation timed out.",
          reconciliationTimeoutMessage:
            "Product review reconciliation timed out.",
        });
        if (!isCurrent()) return;
        dispatch({ type: "review-created", review });
      } catch (error) {
        if (!isCurrent()) return;
        dispatch({
          type: "fail",
          failure: boundedProductFailure({
            error,
            phase: "review",
            fallbackCode: "product.failed",
            fallbackMessage: "The product requirement could not be created.",
          }),
        });
        return;
      }
      try {
        const alternatives = await withRecoverableProductPhase({
          operation: (signal) =>
            controlPlane.requestProductPlan(review.id, signal),
          timeoutMessage: "Product planning timed out.",
          reconciliationTimeoutMessage:
            "Product plan reconciliation timed out.",
        });
        if (!isCurrent()) return;
        dispatch({ type: "alternatives-received", alternatives });
      } catch (error) {
        if (!isCurrent()) return;
        dispatch({
          type: "fail",
          failure: boundedProductFailure({
            error,
            phase: "planning",
            fallbackCode: "product.failed",
            fallbackMessage: "The product plan could not be created.",
          }),
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
      await run(async (isCurrent) => {
        try {
          const review = state.review;
          if (review === null) {
            throw new Error("Create the product review before planning.");
          }
          const chosen = await withRecoverableProductPhase({
            operation: (signal) =>
              controlPlane.chooseProductPlan(review.id, key, signal),
            timeoutMessage: "Product decision timed out.",
            reconciliationTimeoutMessage:
              "Product decision reconciliation timed out.",
          });
          if (!isCurrent()) return;
          dispatch({
            type: "alternative-chosen",
            key,
            diffChecksum: chosen.checksum,
          });
        } catch (error) {
          if (!isCurrent()) return;
          dispatch({
            type: "fail",
            failure: boundedProductFailure({
              error,
              phase: "decision",
              fallbackCode: "product.failed",
              fallbackMessage: "The plan decision could not be recorded.",
            }),
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
      await run(async (isCurrent) => {
        try {
          const review = state.review;
          if (review === null) {
            throw new Error("Create the product review before applying.");
          }
          const result = await withRecoverableProductPhase({
            operation: (signal) => controlPlane.applyProduct(review.id, signal),
            timeoutMessage: "Product application timed out.",
            reconciliationTimeoutMessage:
              "Product application reconciliation timed out.",
          });
          if (!isCurrent()) return;
          applied = result;
          dispatch({ type: "applied" });
        } catch (error) {
          if (!isCurrent()) return;
          dispatch({
            type: "fail",
            failure: boundedProductFailure({
              error,
              phase: "apply",
              fallbackCode: "product.failed",
              fallbackMessage: "The composed product could not be applied.",
            }),
          });
        }
      });
      return applied;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, state, controlPlane]);

  const reset = useCallback((): void => {
    generationRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setBriefDraft("");
    setAnswers({});
    productRequestIdRef.current = null;
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
