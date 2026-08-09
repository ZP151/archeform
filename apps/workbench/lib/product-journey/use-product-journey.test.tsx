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
};

/**
 * Routes the stubbed fetch: the interpret route answers from the real
 * fixture interpreter; the control-plane product surface answers with
 * deterministic review, plan, choice, and apply records.
 */
function stubTransport(overrides: {
  readonly createProduct?: (init?: RequestInit) => unknown;
  readonly plan?: (init?: RequestInit) => unknown;
  readonly choices?: (init?: RequestInit) => unknown;
  readonly apply?: (init?: RequestInit) => unknown;
  readonly interpret?: (init?: RequestInit) => unknown;
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
          status === 200 ? await route.respond(init) : { error: route.error };
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
    expect(controller().state.stage).toBe("planning");
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
    // Nothing is left open, so the transient buffer is pruned back to empty:
    // answered questions leave no stale values behind.
    expect(controller().answers).toEqual({});
  });

  it("bounds the answers buffer and treats an emptied input as unanswered", () => {
    stubTransport({});
    act(() => {
      controller().setAnswer("approval-object", "x".repeat(65));
      controller().setAnswer("approval-levels", "single");
    });
    expect(controller().answers["approval-object"]).toHaveLength(64);
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
