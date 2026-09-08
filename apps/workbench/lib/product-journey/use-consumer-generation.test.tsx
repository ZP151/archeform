// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  planProductAlternatives,
  type ProductPlanAlternative,
} from "@factory/capabilities/node";
import {
  createBlankApplicationDraft,
  hashRequirementSpec,
} from "@factory/graph";

import {
  useProductJourney,
  type ProductJourneyController,
} from "./use-product-journey";
import type {
  ReleaseJourneyController,
  ReleaseTarget,
} from "./use-release-journey";
import {
  useConsumerGeneration,
  type ConsumerGenerationController,
} from "./use-consumer-generation";

declare global {
  // eslint-disable-next-line no-var
  var __consumerGeneration: ConsumerGenerationController | undefined;
  // eslint-disable-next-line no-var
  var __freshJourney: ProductJourneyController | undefined;
}

const TARGET: ReleaseTarget = {
  applicationGraphId: "restaurant-ordering",
  draftRevisionId: "draft-restaurant-r2",
};

let validAlternatives: readonly ProductPlanAlternative[] = [];

function journeyFor(
  overrides: Partial<ProductJourneyController["state"]> = {},
): ProductJourneyController {
  return {
    state: {
      kind: "product-journey",
      stage: "planning",
      brief: "Build a restaurant ordering application.",
      answers: {},
      interpretationCycles: 1,
      interpretation: {
        spec: { productType: "restaurant-ordering" },
      },
      review: {
        id: "review-restaurant",
        applicationGraphId: "restaurant-ordering",
        status: "planning",
        requirementChecksum: "sha256:requirement",
        draftBaseChecksum: "sha256:base",
      },
      alternatives: validAlternatives,
      selectedAlternativeKey: null,
      diffChecksum: null,
      failure: null,
      error: null,
      ...overrides,
    } as ProductJourneyController["state"],
    busy: false,
    briefDraft: "Build a restaurant ordering application.",
    setBriefDraft: vi.fn(),
    answers: {},
    setAnswer: vi.fn(),
    openQuestions: [],
    blueprintTitle: "Restaurant ordering",
    planAlternatives: null,
    submitBrief: vi.fn(),
    answerQuestions: vi.fn(),
    createProduct: vi.fn(),
    chooseAlternative: vi.fn().mockResolvedValue(undefined),
    applyProduct: vi.fn(),
    reset: vi.fn(),
  };
}

function releaseFor(
  overrides: Partial<ReleaseJourneyController> = {},
): ReleaseJourneyController {
  return {
    release: {
      phase: "publishing",
      applicationGraphId: TARGET.applicationGraphId,
      draftRevisionId: TARGET.draftRevisionId,
    },
    busy: false,
    canPublish: true,
    canCompile: false,
    canVerify: false,
    canPreview: false,
    canCleanup: false,
    canApproveDraftDiff: false,
    canReset: false,
    approvalError: null,
    publishRelease: vi.fn(),
    compileRelease: vi.fn(),
    verifyRelease: vi.fn(),
    previewRelease: vi.fn(),
    cleanupRelease: vi.fn(),
    approveDraftDiff: vi.fn(),
    resetRelease: vi.fn().mockResolvedValue("resumed"),
    ...overrides,
  } as ReleaseJourneyController;
}

function Harness({
  journey,
  release,
  applyComposedProduct,
}: {
  readonly journey: ProductJourneyController;
  readonly release: ReleaseJourneyController;
  readonly applyComposedProduct: () => Promise<ReleaseTarget | null>;
}) {
  globalThis.__consumerGeneration = useConsumerGeneration({
    journey,
    release,
    applyComposedProduct,
  });
  return null;
}

function FreshDescribeHarness({
  release,
  applyComposedProduct,
}: {
  readonly release: ReleaseJourneyController;
  readonly applyComposedProduct: () => Promise<ReleaseTarget | null>;
}) {
  const journey = useProductJourney("http://control-plane.test");
  globalThis.__freshJourney = journey;
  globalThis.__consumerGeneration = useConsumerGeneration({
    journey,
    release,
    applyComposedProduct,
  });
  return null;
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

describe("useConsumerGeneration", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const fixture = await new FixtureRequirementInterpreter().interpret({
      brief:
        "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
      answers: {},
    });
    validAlternatives = planProductAlternatives({
      requirement: fixture.spec,
      blueprint: fixture.blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: fixture.spec.requirementId,
        workspaceId: "local-workspace",
        name: "Restaurant ordering",
      }),
    });
  });

  afterEach(() => {
    globalThis.__consumerGeneration = undefined;
    globalThis.__freshJourney = undefined;
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("selects the one standard Restaurant alternative once before applying the fresh Draft", async () => {
    const journey = journeyFor();
    const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);

    await act(async () => {
      root.render(
        <React.StrictMode>
          <Harness
            journey={journey}
            release={releaseFor()}
            applyComposedProduct={applyComposedProduct}
          />
        </React.StrictMode>,
      );
      await Promise.resolve();
    });

    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
    expect(applyComposedProduct).not.toHaveBeenCalled();
    expect(globalThis.__consumerGeneration?.active).toBe(true);
    expect(globalThis.__consumerGeneration?.status).toBe(
      "Preparing your Restaurant app…",
    );
  });

  it("waits for product planning to become idle before consuming its selection latch", async () => {
    const journey = journeyFor();
    const mutableJourney = journey as { busy: boolean };
    mutableJourney.busy = true;
    const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);

    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(journey.chooseAlternative).not.toHaveBeenCalled();

    mutableJourney.busy = false;
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(journey.chooseAlternative).toHaveBeenCalledTimes(1);
    expect(journey.chooseAlternative).toHaveBeenCalledWith("standard");
  });

  it("keeps generic, missing-standard, and duplicate-standard plans in manual review", async () => {
    const excludedJourneys = [
      journeyFor({
        interpretation: { spec: { productType: "expense-approval" } } as never,
      }),
      journeyFor({ alternatives: [] }),
      journeyFor({ alternatives: { malformed: true } as never }),
      journeyFor({ alternatives: [null] as never }),
      journeyFor({
        alternatives: [{ key: "standard" }, { key: "standard" }] as never,
      }),
      journeyFor({
        alternatives: [
          validAlternatives[0],
          { ...validAlternatives[0], key: "unexpected" },
        ] as never,
      }),
      journeyFor({
        alternatives: [
          { ...validAlternatives[0], plan: { apiVersion: "invalid" } },
        ] as never,
      }),
    ];

    for (const journey of excludedJourneys) {
      const applyComposedProduct = vi.fn().mockResolvedValue(TARGET);
      await act(async () => {
        root.render(
          <Harness
            journey={journey}
            release={releaseFor()}
            applyComposedProduct={applyComposedProduct}
          />,
        );
        await Promise.resolve();
      });
      expect(journey.chooseAlternative).not.toHaveBeenCalled();
      expect(applyComposedProduct).not.toHaveBeenCalled();
    }
  });

  it("does not advance release after an unmounted consumer apply resolves", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    let resolveTarget: ((target: ReleaseTarget) => void) | undefined;
    const applyComposedProduct = vi.fn(
      () =>
        new Promise<ReleaseTarget>((resolve) => {
          resolveTarget = resolve;
        }),
    );
    const release = releaseFor();
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={release}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    await act(async () => {
      resolveTarget?.(TARGET);
      await Promise.resolve();
    });

    expect(release.publishRelease).not.toHaveBeenCalled();
  });

  it("pauses a failed Draft adoption without permanently consuming the session", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    const applyComposedProduct = vi.fn().mockResolvedValue(null);
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(globalThis.__consumerGeneration?.status).toBe(
        "Delivery paused. Start a new Restaurant request to try again.",
      );
    });
    expect(applyComposedProduct).toHaveBeenCalledTimes(1);

    await act(async () => globalThis.__consumerGeneration?.retry());
    expect(journey.reset).toHaveBeenCalledTimes(1);
  });

  it("returns to Describe when immutable creation cannot be safely retried", async () => {
    const journey = journeyFor({
      stage: "reviewing",
      selectedAlternativeKey: "standard",
    });
    const failed = releaseFor({
      release: { ...releaseFor().release!, phase: "failed" },
      resetRelease: vi.fn().mockResolvedValue("start-over"),
    });
    await act(async () => {
      root.render(
        <Harness
          journey={journey}
          release={failed}
          applyComposedProduct={vi.fn().mockResolvedValue(TARGET)}
        />,
      );
    });
    expect(globalThis.__consumerGeneration?.active).toBe(true);
    // Model the real journey reset after Draft adoption.
    const idleJourney = {
      ...journey,
      state: {
        ...journey.state,
        stage: "brief" as const,
        review: null,
        interpretation: null,
        alternatives: null,
      },
    };
    await act(async () => {
      root.render(
        <Harness
          journey={idleJourney}
          release={failed}
          applyComposedProduct={vi.fn().mockResolvedValue(TARGET)}
        />,
      );
    });
    await act(async () => globalThis.__consumerGeneration?.retry());
    expect(failed.resetRelease).toHaveBeenCalledTimes(1);
    expect(journey.reset).toHaveBeenCalledTimes(2);
    expect(globalThis.__consumerGeneration?.active).toBe(false);
    expect(failed.publishRelease).not.toHaveBeenCalled();
  });

  it("starts from this tab's Describe submission before selecting standard and applying once", async () => {
    const interpreter = new FixtureRequirementInterpreter();
    const fixture = await interpreter.interpret({
      brief:
        "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
      answers: {},
    });
    const requirement = {
      ...fixture.spec,
      productType: "restaurant-ordering",
    } as typeof fixture.spec;
    const interpretation = {
      ...fixture,
      spec: requirement,
      blueprint: {
        ...fixture.blueprint,
        requirementChecksum: hashRequirementSpec(requirement),
      },
    };
    const alternatives = planProductAlternatives({
      requirement: fixture.spec,
      blueprint: fixture.blueprint,
      baseDraft: createBlankApplicationDraft({
        applicationId: fixture.spec.requirementId,
        workspaceId: "local-workspace",
        name: "Restaurant ordering",
      }),
    }).map(({ key, label, plan }) => ({ key, label, plan }));
    const calls: string[] = [];
    const choiceBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), "http://workbench.test");
        const method = init?.method ?? "GET";
        calls.push(`${method} ${url.pathname}`);
        const json = (value: unknown) =>
          new Response(JSON.stringify(value), {
            headers: { "content-type": "application/json" },
          });
        if (url.pathname === "/api/requirements/interpret") {
          return json({ interpretation });
        }
        if (method === "POST" && url.pathname === "/product/requirements") {
          return json({
            review: {
              id: "review-restaurant",
              applicationGraphId: "restaurant-ordering",
              status: "planning",
              requirementChecksum: hashRequirementSpec(interpretation.spec),
              draftBaseChecksum: "sha256:base",
            },
          });
        }
        if (method === "POST" && url.pathname.endsWith("/plan")) {
          return json({ alternatives });
        }
        if (method === "POST" && url.pathname.endsWith("/choices")) {
          choiceBodies.push(JSON.parse(String(init?.body ?? "{}")));
          return json({ checksum: "sha256:restaurant-diff" });
        }
        if (method === "POST" && url.pathname.endsWith("/apply")) {
          return json({
            draftRevision: {
              id: TARGET.draftRevisionId,
              revisionNumber: 2,
              graph: createBlankApplicationDraft({
                applicationId: "restaurant-ordering",
                workspaceId: "local-workspace",
                name: "Restaurant ordering",
              }).graph,
            },
            review: {
              applicationGraphId: TARGET.applicationGraphId,
              status: "applied",
            },
          });
        }
        return new Response(JSON.stringify({ error: "Unexpected route." }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const applyComposedProduct = vi.fn(async () => {
      await globalThis.__freshJourney?.applyProduct();
      return TARGET;
    });

    await act(async () => {
      root.render(
        <FreshDescribeHarness
          release={releaseFor()}
          applyComposedProduct={applyComposedProduct}
        />,
      );
    });
    act(() => {
      globalThis.__freshJourney?.setBriefDraft(
        "Build a restaurant ordering application.",
      );
    });
    await act(async () => {
      await globalThis.__freshJourney?.submitBrief();
    });
    await waitFor(() => {
      expect(globalThis.__freshJourney?.state.stage).toBe("brief");
      expect(applyComposedProduct).toHaveBeenCalledTimes(1);
    });

    expect(calls).toEqual([
      "POST /api/requirements/interpret",
      "POST /product/requirements",
      "POST /product/requirements/review-restaurant/plan",
      "POST /product/requirements/review-restaurant/choices",
      "POST /product/requirements/review-restaurant/apply",
    ]);
    expect(choiceBodies).toEqual([{ alternativeKey: "standard" }]);
  });
});
