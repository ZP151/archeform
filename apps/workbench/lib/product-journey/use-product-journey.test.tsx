// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FixtureRequirementInterpreter,
  type RequirementInterpretationV1,
} from "@factory/adapters";
import { planProductAlternatives } from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";

import {
  useProductJourney,
  type ProductJourneyController,
} from "./use-product-journey";
import { ANSWER_MAX_LENGTH } from "./journey-model";
import type { WorkbenchProductApplied } from "../control-plane-client";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const vagueBrief =
  "I need an application where people can submit things for approval.";

declare global {
  // eslint-disable-next-line no-var
  var __controller: ProductJourneyController | undefined;
}

function Harness({ controlPlaneUrl }: { controlPlaneUrl: string }) {
  const controller = useProductJourney(controlPlaneUrl);
  globalThis.__controller = controller;
  return null;
}

function blankDraftGraph(requirementId: string) {
  return createBlankApplicationDraft({
    applicationId: requirementId,
    workspaceId: "local-workspace",
    name: requirementId,
  }).graph;
}

async function interpretationFor(
  brief: string,
  answers: Readonly<Record<string, string>> = {},
): Promise<RequirementInterpretationV1> {
  return fixtureInterpreter.interpret({ brief, answers });
}

function withOpenQuestion(
  interpretation: RequirementInterpretationV1,
  key: string,
  question: string,
  policy: {
    readonly category:
      | "experience.visual-style"
      | "authorization"
      | "visibility"
      | "role"
      | "business-rule"
      | "data"
      | "integration";
    readonly defaultPolicy: "factory-standard-visual" | "required";
  } = { category: "business-rule", defaultPolicy: "required" },
): RequirementInterpretationV1 {
  const spec = {
    ...structuredClone(interpretation.spec),
    openQuestions: [{ category: policy.category, question }],
  };
  const requirementChecksum = hashRequirementSpec(spec);
  return {
    spec,
    blueprint: {
      ...structuredClone(interpretation.blueprint),
      requirementChecksum,
    },
    clarifications: [
      {
        apiVersion: "factory.composition-clarification/v1",
        requirementChecksum,
        questions: [
          {
            key,
            category: policy.category,
            defaultPolicy: policy.defaultPolicy,
            question,
          },
        ],
      },
    ],
  };
}

function alternativesFor(interpretation: RequirementInterpretationV1) {
  return planProductAlternatives({
    requirement: interpretation.spec,
    blueprint: interpretation.blueprint,
    baseDraft: createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    }),
  }).map(({ key, label, plan }) => ({ key, label, plan }));
}

type RouteStub = {
  readonly matches: (url: string, init?: RequestInit) => boolean;
  readonly respond: (init?: RequestInit) => unknown;
  readonly status?: number;
  readonly error?: string;
  readonly failureBody?: unknown;
};

/**
 * Routes the stubbed fetch: the interpret route answers from the real
 * fixture interpreter; the control-plane product surface answers with
 * deterministic review, plan, choice, and apply records.
 */
function stubTransport(overrides: {
  readonly createProduct?: (init?: RequestInit) => unknown;
  readonly createProductRejection?: {
    readonly status: number;
    readonly body: unknown;
  };
  readonly plan?: (init?: RequestInit) => unknown;
  readonly choices?: (init?: RequestInit) => unknown;
  readonly apply?: (init?: RequestInit) => unknown;
  readonly interpret?: (init?: RequestInit) => unknown;
  readonly interpretRejection?: {
    readonly status: number;
    readonly body: unknown;
  };
}) {
  const routes: RouteStub[] = [];
  const interpretBody = (
    init?: RequestInit,
  ): { brief: string; answers: Record<string, string> } => {
    try {
      const parsed = JSON.parse(String(init?.body ?? "{}")) as {
        brief?: unknown;
        answers?: unknown;
      };
      return {
        brief: typeof parsed.brief === "string" ? parsed.brief : "",
        answers:
          typeof parsed.answers === "object" && parsed.answers !== null
            ? (parsed.answers as Record<string, string>)
            : {},
      };
    } catch {
      return { brief: "", answers: {} };
    }
  };
  routes.push({
    matches: (url) => url.endsWith("/api/requirements/interpret"),
    respond: async (init) => {
      if (overrides.interpret !== undefined) return overrides.interpret(init);
      const { brief, answers } = interpretBody(init);
      return { interpretation: await interpretationFor(brief, answers) };
    },
    status: overrides.interpretRejection?.status,
    failureBody: overrides.interpretRejection?.body,
  });
  routes.push({
    matches: (url, init) =>
      url.endsWith("/product/requirements") &&
      (init?.method ?? "GET") === "POST",
    respond: (init) => {
      if (overrides.createProduct !== undefined)
        return overrides.createProduct(init);
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        requirement?: { requirementId?: string };
      };
      const requirementId =
        body.requirement?.requirementId ?? "expense-approval-requirement";
      // The review must bind the exact requirement checksum the journey
      // validated; the state machine rejects anything else.
      const requirementChecksum = hashRequirementSpec(
        body.requirement as never,
      );
      return {
        review: {
          id: "review-1",
          applicationGraphId: requirementId,
          status: "planning",
          requirementChecksum,
          draftBaseChecksum: "sha256:blank",
        },
      };
    },
    status: overrides.createProductRejection?.status,
    failureBody: overrides.createProductRejection?.body,
  });
  routes.push({
    matches: (url) => url.endsWith("/plan"),
    respond: (init) => {
      if (overrides.plan !== undefined) return overrides.plan(init);
      const interpretation = globalThis.__controller?.state.interpretation;
      if (interpretation === null || interpretation === undefined) {
        return { alternatives: [] };
      }
      return { alternatives: alternativesFor(interpretation) };
    },
  });
  routes.push({
    matches: (url) => url.endsWith("/choices"),
    respond: (init) => {
      if (overrides.choices !== undefined) return overrides.choices(init);
      return { checksum: "sha256:diff" };
    },
  });
  routes.push({
    matches: (url) => url.endsWith("/apply"),
    respond: (init) => {
      if (overrides.apply !== undefined) return overrides.apply(init);
      return {
        draftRevision: {
          id: "draft-cuid-2",
          revisionNumber: 2,
          graph: blankDraftGraph("expense-approval-requirement"),
        },
        review: {
          applicationGraphId: "expense-approval-requirement",
          status: "applied",
        },
      };
    },
  });

  const fetchStub = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      for (const route of routes) {
        if (!route.matches(url, init)) continue;
        const status = route.status ?? 200;
        const payload =
          status === 200
            ? await route.respond(init)
            : (route.failureBody ?? { error: route.error });
        return new Response(JSON.stringify(payload), {
          status,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Unexpected route." }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

async function waitFor(assertion: () => void): Promise<void> {
  let latestError: unknown;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      latestError = error;
    }
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
  throw latestError;
}

function controller(): ProductJourneyController {
  const current = globalThis.__controller;
  if (current === undefined) throw new Error("Hook not mounted.");
  return current;
}

describe("useProductJourney", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(<Harness controlPlaneUrl="http://control-plane.test" />);
    });
  });

  afterEach(() => {
    globalThis.__controller = undefined;
    act(() => root.unmount());
    vi.useRealTimers();
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("interprets a brief into the planning stage with a checksum-bound blueprint", async () => {
    stubTransport({});
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    expect(
      controller().state.stage,
      controller().state.error ?? "no journey error",
    ).toBe("planning");
    expect(controller().state.interpretation?.spec.requirementId).toBe(
      "expense-approval-requirement",
    );
    expect(
      controller().state.interpretation?.blueprint.requirementChecksum,
    ).toBe(hashRequirementSpec(controller().state.interpretation!.spec));
    expect(controller().busy).toBe(false);
  });

  it("asks open questions and re-interprets with the answers", async () => {
    stubTransport({});
    act(() => {
      controller().setBriefDraft(vagueBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    expect(controller().state.stage).toBe("clarifying");
    expect(controller().openQuestions.length).toBe(2);
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    expect(controller().answers).toEqual({
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
    await act(async () => {
      await controller().answerQuestions();
    });
    expect(controller().state.stage).toBe("planning");
    expect(controller().openQuestions).toEqual([]);
    // Answered values remain cumulative for the full transient journey. A
    // later provider rephrasing can therefore inherit the prior answer rather
    // than asking the user again or losing context.
    expect(controller().answers).toEqual({
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
  });

  it("converges a semantically repeated question in the second interpretation without losing its answer", async () => {
    const first = await interpretationFor(vagueBrief);
    const repeated = withOpenQuestion(
      first,
      "approval-level-count",
      "What number of approval levels are required?",
    );
    let calls = 0;
    const transport = stubTransport({
      interpret: () => ({ interpretation: calls++ === 0 ? first : repeated }),
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    await act(async () => controller().answerQuestions());

    expect(
      controller().state.stage,
      controller().state.error ?? "no journey error",
    ).toBe("planning");
    expect(controller().openQuestions).toEqual([]);
    expect(controller().answers).toMatchObject({
      "approval-object": "expense reports",
      "approval-levels": "single",
      "approval-level-count": "single",
    });
    const interpretBodies = transport.mock.calls
      .filter(([url]) => String(url).includes("/api/requirements/interpret"))
      .map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
    expect(interpretBodies).toHaveLength(2);
    expect(interpretBodies[1].answers).toMatchObject({
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
    expect(interpretBodies[1].clarificationContext).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "approval-object",
          question: expect.any(String),
          answer: "expense reports",
        }),
        expect.objectContaining({
          key: "approval-levels",
          question: expect.any(String),
          answer: "single",
        }),
      ]),
    );
    expect(interpretBodies[1].priorInterpretation).toEqual(first);
  });

  it("uses a declared safe default for noncritical ambiguity at the two-cycle bound", async () => {
    const first = await interpretationFor(vagueBrief);
    const visualQuestion = withOpenQuestion(
      first,
      "visual-theme",
      "Which visual theme should the product use?",
      {
        category: "experience.visual-style",
        defaultPolicy: "factory-standard-visual",
      },
    );
    let calls = 0;
    stubTransport({
      interpret: () => ({
        interpretation: calls++ === 0 ? first : visualQuestion,
      }),
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    await act(async () => controller().answerQuestions());

    expect(controller().state.stage).toBe("planning");
    expect(controller().answers["visual-theme"]).toBe(
      "Use the product's standard visual theme.",
    );
    expect(calls).toBe(2);
  });

  it("fails with a bounded message when critical ambiguity remains after two interpretation cycles", async () => {
    const first = await interpretationFor(vagueBrief);
    const criticalQuestion = withOpenQuestion(
      first,
      "payment-approver",
      "Which role may approve a payment?",
      { category: "authorization", defaultPolicy: "required" },
    );
    let calls = 0;
    stubTransport({
      interpret: () => ({
        interpretation: calls++ === 0 ? first : criticalQuestion,
      }),
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    await act(async () => controller().answerQuestions());

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "Critical requirement ambiguity remains after two interpretation cycles.",
    );
    expect(controller().state.failure?.code).toBe(
      "journey.clarification_exhausted",
    );
    expect(calls).toBe(2);
  });

  it("does not default a visual question that also contains a critical payment decision", async () => {
    const first = await interpretationFor(vagueBrief);
    const mixedQuestion = withOpenQuestion(
      first,
      "visual-payment-provider",
      "Which visual style and payment provider should be used?",
      { category: "integration", defaultPolicy: "required" },
    );
    let calls = 0;
    stubTransport({
      interpret: () => ({
        interpretation: calls++ === 0 ? first : mixedQuestion,
      }),
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    await act(async () => controller().answerQuestions());

    expect(controller().state.stage).toBe("failed");
    expect(controller().answers["visual-payment-provider"]).toBeUndefined();
    expect(calls).toBe(2);
  });

  it("fails the initial interpretation independently when its phase timeout expires", async () => {
    vi.useFakeTimers();
    const interpretation = await interpretationFor(expenseBrief);
    stubTransport({
      interpret: () =>
        new Promise((resolve) => {
          window.setTimeout(() => resolve({ interpretation }), 556_000);
        }),
    });
    act(() => controller().setBriefDraft(expenseBrief));
    let pending!: Promise<void>;
    act(() => {
      pending = controller().submitBrief();
    });
    await act(async () => vi.advanceTimersByTimeAsync(555_000));

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "Requirement interpretation timed out.",
    );
    expect(controller().state.failure).toEqual({
      phase: "interpretation",
      code: "requirement.timeout",
      message: "Requirement interpretation timed out.",
    });
    expect(controller().state.brief).toBe(expenseBrief);
    expect(controller().briefDraft).toBe(expenseBrief);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await pending;
    vi.useRealTimers();
  });

  it("fails clarification independently when its phase timeout expires", async () => {
    vi.useFakeTimers();
    const first = await interpretationFor(vagueBrief);
    const second = await interpretationFor(vagueBrief, {
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
    let calls = 0;
    stubTransport({
      interpret: () => {
        calls += 1;
        if (calls === 1) return { interpretation: first };
        return new Promise((resolve) => {
          window.setTimeout(() => resolve({ interpretation: second }), 556_000);
        });
      },
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    let pending!: Promise<void>;
    act(() => {
      pending = controller().answerQuestions();
    });
    await act(async () => vi.advanceTimersByTimeAsync(555_000));

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "Requirement clarification timed out.",
    );
    expect(controller().state.failure).toEqual({
      phase: "clarification",
      code: "requirement.timeout",
      message: "Requirement clarification timed out.",
    });
    expect(controller().state.brief).toBe(vagueBrief);
    expect(controller().answers).toMatchObject({
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await pending;
  });

  it("allows the bounded clarification phase to cover provider repair rounds", async () => {
    vi.useFakeTimers();
    const first = await interpretationFor(vagueBrief);
    const second = await interpretationFor(vagueBrief, {
      "approval-object": "expense reports",
      "approval-levels": "single",
    });
    let calls = 0;
    stubTransport({
      interpret: () => {
        calls += 1;
        if (calls === 1) return { interpretation: first };
        return new Promise((resolve) => {
          window.setTimeout(() => resolve({ interpretation: second }), 181_000);
        });
      },
    });
    act(() => controller().setBriefDraft(vagueBrief));
    await act(async () => controller().submitBrief());
    act(() => {
      controller().setAnswer("approval-object", "expense reports");
      controller().setAnswer("approval-levels", "single");
    });
    let pending!: Promise<void>;
    act(() => {
      pending = controller().answerQuestions();
    });
    await act(async () => vi.advanceTimersByTimeAsync(180_000));

    expect(controller().state.stage).toBe("clarifying");

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await pending;
    expect(controller().state.stage).toBe("planning");
  });

  it("keeps the interpretation deadline active while the response body stalls", async () => {
    const interpretation = await interpretationFor(expenseBrief);
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            json: () =>
              new Promise((resolve) => {
                window.setTimeout(() => resolve({ interpretation }), 556_000);
              }),
          }) as Response,
      ),
    );
    act(() => controller().setBriefDraft(expenseBrief));
    let pending!: Promise<void>;
    act(() => {
      pending = controller().submitBrief();
    });
    await act(async () => vi.advanceTimersByTimeAsync(555_000));

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "Requirement interpretation timed out.",
    );
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await pending;
  });

  it("reconciles a late product review completion with the same request identity", async () => {
    const interpretation = await interpretationFor(expenseBrief);
    vi.useFakeTimers();
    const requestIds: string[] = [];
    const lateReview = new Promise((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            review: {
              id: "request-late-review",
              applicationGraphId: interpretation.spec.requirementId,
              status: "planned",
              requirementChecksum: hashRequirementSpec(interpretation.spec),
              draftBaseChecksum: "sha256:blank",
            },
          }),
        181_000,
      );
    });
    stubTransport({
      interpret: () => ({ interpretation }),
      createProduct: (init) => {
        requestIds.push(
          (JSON.parse(String(init?.body)) as { requestId: string }).requestId,
        );
        return lateReview;
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());
    await act(async () => vi.advanceTimersByTimeAsync(180_000));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestIds).toHaveLength(2);
    expect(new Set(requestIds).size).toBe(1);
    expect(controller().state.stage).toBe("planning");
    expect(controller().state.review?.id).toBe("request-late-review");
  });

  it("bounds product planning independently", async () => {
    const interpretation = await interpretationFor(expenseBrief);
    vi.useFakeTimers();
    stubTransport({
      interpret: () => ({ interpretation }),
      plan: () =>
        new Promise((resolve) => {
          window.setTimeout(() => resolve({ alternatives: [] }), 181_000);
        }),
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());
    await act(async () => vi.advanceTimersByTimeAsync(360_000));

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "Product plan reconciliation timed out.",
    );
    expect(controller().state.failure).toEqual({
      phase: "planning",
      code: "product.planning_reconciliation_timeout",
      message: "Product plan reconciliation timed out.",
    });
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
  });

  it("bounds the answers buffer and treats an emptied input as unanswered", () => {
    stubTransport({});
    act(() => {
      controller().setAnswer("approval-object", "x".repeat(1_001));
      controller().setAnswer("approval-levels", "single");
    });
    expect(controller().answers["approval-object"]).toHaveLength(
      ANSWER_MAX_LENGTH,
    );
    act(() => {
      controller().setAnswer("approval-levels", "   ");
    });
    expect(controller().answers["approval-levels"]).toBeUndefined();
  });

  it("auto-creates the review and receives deterministic alternatives exactly once", async () => {
    let createCalls = 0;
    stubTransport({
      createProduct: (init) => {
        createCalls += 1;
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          requirement?: { requirementId?: string };
        };
        const requirementId =
          body.requirement?.requirementId ?? "expense-approval-requirement";
        return {
          review: {
            id: "review-1",
            applicationGraphId: requirementId,
            status: "planning",
            requirementChecksum: hashRequirementSpec(body.requirement as never),
            draftBaseChecksum: "sha256:blank",
          },
        };
      },
    });
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    // Each journey step is its own frame (as with real clicks): the act flush
    // between steps is what re-renders the controller with the new state.
    await act(async () => {
      await controller().submitBrief();
    });
    // An accepted interpretation with no open questions lands in planning and
    // the review is created automatically — no manual step in between.
    expect(controller().state.stage).toBe("planning");
    expect(controller().state.review?.status).toBe("planning");
    expect(controller().state.alternatives?.map(({ key }) => key)).toEqual([
      "standard",
      "minimal",
    ]);
    expect(controller().planAlternatives?.map(({ key }) => key)).toEqual([
      "standard",
      "minimal",
    ]);
    expect(createCalls).toBe(1);
    const [standard] = controller().planAlternatives ?? [];
    expect(JSON.stringify(standard)).not.toContain("proposedOperations");
  });

  it("records the chosen alternative and its Diff checksum", async () => {
    stubTransport({});
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    await act(async () => {
      await controller().chooseAlternative("minimal");
    });
    expect(controller().state.stage).toBe("reviewing");
    expect(controller().state.selectedAlternativeKey).toBe("minimal");
    expect(controller().state.diffChecksum).toBe("sha256:diff");
  });

  it("aborts each stalled choice attempt and stops after one reconciliation", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    stubTransport({
      choices: (init) => {
        signals.push(init?.signal as AbortSignal);
        return new Promise(() => undefined);
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());

    let pending!: Promise<void>;
    act(() => {
      pending = controller().chooseAlternative("standard");
    });
    await act(async () => vi.advanceTimersByTimeAsync(180_000));

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await act(async () => vi.advanceTimersByTimeAsync(180_000));
    await pending;

    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(true);
    expect(controller().state.failure).toEqual({
      phase: "decision",
      code: "product.failed",
      message: "Product decision reconciliation timed out.",
    });
  });

  it("reconciles one lost choice response with the same alternative", async () => {
    let calls = 0;
    stubTransport({
      choices: () => {
        calls += 1;
        if (calls === 1) throw new TypeError("response lost");
        return { checksum: "sha256:stable-diff" };
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());

    await act(async () => controller().chooseAlternative("standard"));

    expect(calls).toBe(2);
    expect(controller().state.stage).toBe("reviewing");
    expect(controller().state.diffChecksum).toBe("sha256:stable-diff");
  });

  it("applies the approved product and returns the composed Graph for adoption", async () => {
    stubTransport({});
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    await act(async () => {
      await controller().chooseAlternative("standard");
    });
    // The controller is captured in a box: TS resolves a `let` written only
    // inside a closure to `never` at outer read sites, so the apply result is
    // captured through a property write instead.
    const captured: { applied: WorkbenchProductApplied | null } = {
      applied: null,
    };
    await act(async () => {
      captured.applied = await controller().applyProduct();
    });
    expect(controller().state.stage).toBe("applied");
    expect(captured.applied?.applicationGraphId).toBe(
      "expense-approval-requirement",
    );
    expect(captured.applied?.reviewStatus).toBe("applied");
    expect(captured.applied?.graph).not.toBeNull();
  });

  it("aborts each stalled apply attempt and stops after one reconciliation", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    stubTransport({
      apply: (init) => {
        signals.push(init?.signal as AbortSignal);
        return new Promise(() => undefined);
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());
    await act(async () => controller().chooseAlternative("standard"));

    let pending!: Promise<WorkbenchProductApplied | null>;
    act(() => {
      pending = controller().applyProduct();
    });
    await act(async () => vi.advanceTimersByTimeAsync(180_000));

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await act(async () => vi.advanceTimersByTimeAsync(180_000));
    await pending;

    expect(signals).toHaveLength(2);
    expect(signals[1].aborted).toBe(true);
    expect(controller().state.failure).toEqual({
      phase: "apply",
      code: "product.failed",
      message: "Product application reconciliation timed out.",
    });
  });

  it("reconciles one lost apply response to the exact applied result", async () => {
    let calls = 0;
    const graph = blankDraftGraph("expense-approval-requirement");
    stubTransport({
      apply: () => {
        calls += 1;
        if (calls === 1) throw new TypeError("accepted response lost");
        return {
          draftRevision: {
            id: "draft-cuid-2",
            revisionNumber: 2,
            graph,
          },
          review: {
            applicationGraphId: "expense-approval-requirement",
            status: "applied",
          },
        };
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));
    await act(async () => controller().submitBrief());
    await act(async () => controller().chooseAlternative("standard"));

    const captured: { applied: WorkbenchProductApplied | null } = {
      applied: null,
    };
    await act(async () => {
      captured.applied = await controller().applyProduct();
    });

    expect(calls).toBe(2);
    expect(captured.applied).toEqual({
      applicationGraphId: "expense-approval-requirement",
      revisionNumber: 2,
      graph,
      reviewStatus: "applied",
    });
    expect(controller().state.stage).toBe("applied");
  });

  it("fails closed when the interpret provider is unavailable and retries", async () => {
    stubTransport({
      interpret: () => {
        throw new Error("boom");
      },
    });
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toContain(
      "Requirement interpretation failed",
    );
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    expect(controller().state.stage).toBe("failed");
  });

  it.each([
    [
      400,
      "requirement.request_invalid",
      "Check the requirement and try again.",
    ],
    [
      422,
      "requirement.output_invalid",
      "Requirement interpretation was rejected.",
    ],
    [
      502,
      "requirement.provider_rejected",
      "Requirement interpretation could not start.",
    ],
    [
      503,
      "requirement.provider_not_configured",
      "Requirement interpretation is not configured.",
    ],
    [
      503,
      "requirement.provider_unavailable",
      "Requirement interpretation is temporarily unavailable.",
    ],
    [504, "requirement.timeout", "Requirement interpretation timed out."],
    [500, "requirement.failed", "Requirement interpretation failed."],
  ] as const)(
    "maps exact interpretation failure %s/%s to fixed local state",
    async (status, code, message) => {
      stubTransport({
        interpretRejection: {
          status,
          body: {
            error: {
              apiVersion: "factory.requirement-interpretation-error/v1",
              code,
            },
          },
        },
      });
      act(() => controller().setBriefDraft(expenseBrief));

      await act(async () => controller().submitBrief());

      expect(controller().state.stage).toBe("failed");
      expect(controller().state.error).toBe(message);
      expect(controller().state.failure).toEqual({
        phase: "interpretation",
        code,
        message,
      });
    },
  );

  it.each([
    {
      status: 503,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.provider_unavailable",
          detail: "HOSTILE-SENTINEL-MUST-NOT-SURFACE",
        },
      },
    },
    {
      status: 502,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.provider_unavailable",
        },
      },
    },
    {
      status: 503,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v2",
          code: "requirement.provider_unavailable",
        },
      },
    },
    {
      status: 503,
      body: {
        error: {
          apiVersion: "factory.requirement-interpretation-error/v1",
          code: "requirement.hostile-unknown",
        },
      },
    },
  ])(
    "collapses malformed, extra, unknown, or status-mismatched failure bodies",
    async ({ status, body }) => {
      stubTransport({ interpretRejection: { status, body } });
      act(() => controller().setBriefDraft(expenseBrief));

      await act(async () => controller().submitBrief());

      expect(controller().state.failure).toEqual({
        phase: "interpretation",
        code: "requirement.failed",
        message: "Requirement interpretation failed.",
      });
      expect(JSON.stringify(controller().state)).not.toContain(
        "HOSTILE-SENTINEL-MUST-NOT-SURFACE",
      );
    },
  );

  it("strictly revalidates the exact success envelope before accepting it", async () => {
    const interpretation = await interpretationFor(expenseBrief);
    stubTransport({
      interpret: () => ({
        interpretation,
        extra: "HOSTILE-SENTINEL-MUST-NOT-SURFACE",
      }),
    });
    act(() => controller().setBriefDraft(expenseBrief));

    await act(async () => controller().submitBrief());

    expect(controller().state.failure).toEqual({
      phase: "interpretation",
      code: "requirement.failed",
      message: "Requirement interpretation failed.",
    });
    expect(controller().state.interpretation).toBeNull();
    expect(JSON.stringify(controller().state)).not.toContain(
      "HOSTILE-SENTINEL-MUST-NOT-SURFACE",
    );
  });

  it("bounds a rejected product requirement to a retryable message", async () => {
    stubTransport({
      createProduct: () => {
        throw new Error("P2002");
      },
    });
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
      await controller().createProduct();
    });
    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBeTruthy();
    expect(controller().state.brief).toBe(expenseBrief);
  });

  it("surfaces only the approved rejection code with the safe product failure", async () => {
    stubTransport({
      createProductRejection: {
        status: 400,
        body: {
          code: "composition.blueprint_invalid",
          message: "Rejected must-not-echo blueprint details.",
          rejectedValue: "must-not-echo",
        },
      },
    });
    act(() => controller().setBriefDraft(expenseBrief));

    await act(async () => {
      await controller().submitBrief();
    });

    expect(controller().state.stage).toBe("failed");
    expect(controller().state.error).toBe(
      "The control plane rejected the product requirement. (composition.blueprint_invalid)",
    );
    expect(controller().state.error).not.toContain("must-not-echo");
    expect(controller().state.failure?.code).toBe(
      "composition.blueprint_invalid",
    );
  });

  it("resets a finished journey so the next product starts clean", async () => {
    stubTransport({});
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    await act(async () => {
      await controller().createProduct();
    });
    await act(async () => {
      await controller().chooseAlternative("standard");
    });
    await act(async () => {
      await controller().applyProduct();
    });
    expect(controller().state.stage).toBe("applied");
    act(() => {
      controller().reset();
    });
    expect(controller().state.stage).toBe("brief");
    expect(controller().state.brief).toBe("");
    expect(controller().state.interpretation).toBeNull();
    expect(controller().state.review).toBeNull();
    expect(controller().briefDraft).toBe("");
    expect(controller().answers).toEqual({});
  });

  it("proves the persisted boundary never carries the verbatim brief", async () => {
    const transport = stubTransport({});
    act(() => {
      controller().setBriefDraft(expenseBrief);
    });
    await act(async () => {
      await controller().submitBrief();
    });
    await act(async () => {
      await controller().createProduct();
    });
    const createCall = transport.mock.calls.find(([url]) =>
      String(url).endsWith("/product/requirements"),
    );
    expect(createCall).toBeDefined();
    const createBody = String(createCall?.[1]?.body ?? "");
    expect(createBody).not.toContain(
      "Managers approve or reject them, and finance can audit all decisions.",
    );
    const interpretCalls = transport.mock.calls.filter(([url]) =>
      String(url).includes("/api/requirements/interpret"),
    );
    expect(interpretCalls.length).toBe(1);
  });
});
