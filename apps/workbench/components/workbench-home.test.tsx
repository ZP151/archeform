// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";

import type { WorkbenchApplicationSummary } from "../lib/control-plane-client";
import { workbenchGraph } from "../lib/workbench-graph";
import type { PlanReviewAlternative } from "./journey/plan-review";
import { Workbench } from "./workbench";
import {
  WorkbenchHome,
  type WorkbenchHomeJourneyProps,
} from "./workbench-home";

const expenseBrief =
  "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.";
const vagueBrief =
  "I need an application where people can submit things for approval.";

function briefJourney(
  overrides: Partial<WorkbenchHomeJourneyProps> = {},
): WorkbenchHomeJourneyProps {
  return {
    stage: "brief",
    busy: false,
    error: null,
    brief: "",
    onBriefChange: vi.fn(),
    onInterpret: vi.fn(),
    examplePrompts: [
      expenseBrief,
      "Build an appointment booking application. Customers choose a service and an available time, staff confirm or reschedule appointments, and administrators manage services, schedules, and cancellations.",
    ],
    onApplyExample: vi.fn(),
    requirement: null,
    blueprintTitle: "Requirement",
    openQuestions: [],
    answers: {},
    onAnswerChange: vi.fn(),
    onContinue: vi.fn(),
    planAlternatives: null,
    chosenKey: null,
    onChoose: vi.fn(),
    diffChecksum: null,
    onApply: vi.fn(),
    ...overrides,
  };
}

const planAlternatives: readonly PlanReviewAlternative[] = [
  {
    key: "standard",
    label: "Standard",
    capabilityLocks: [
      { key: "core.identity-policy", version: "1.0.0" },
      { key: "commerce.catalog", version: "1.0.0" },
    ],
    operations: 4,
    complexity: "standard",
    acceptanceJourneys: 2,
  },
  {
    key: "minimal",
    label: "Minimal",
    capabilityLocks: [{ key: "core.identity-policy", version: "1.0.0" }],
    operations: 2,
    complexity: "minimal",
    acceptanceJourneys: 1,
  },
];

const restaurantDraft: WorkbenchApplicationSummary = {
  id: "graph-restaurant",
  key: "restaurant-ordering",
  name: "Restaurant ordering",
  compositionProfile: "restaurant-ordering",
  latestDraft: {
    revisionNumber: 3,
    createdAt: "2026-07-30T03:00:00.000Z",
  },
  latestPublished: null,
  latestCompilation: null,
  goldenAssetMaturity: {
    status: "golden",
    goldenAssets: 6,
    totalAssets: 6,
  },
};

const failedExpense: WorkbenchApplicationSummary = {
  id: "graph-expense",
  key: "expense-approval",
  name: "Expense approval",
  compositionProfile: "expense-approval",
  latestDraft: {
    revisionNumber: 4,
    createdAt: "2026-07-30T02:00:00.000Z",
  },
  latestPublished: {
    revisionNumber: 2,
    publishedAt: "2026-07-30T02:10:00.000Z",
  },
  latestCompilation: {
    id: "compilation-failed",
    status: "failed",
    completedAt: "2026-07-30T02:15:00.000Z",
  },
  goldenAssetMaturity: {
    status: "golden",
    goldenAssets: 4,
    totalAssets: 4,
  },
};

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function waitForAssertion(assertion: () => void): Promise<void> {
  let latestError: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
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

describe("WorkbenchHome", () => {
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
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("makes the requirement composer the default Home decision", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney()}
        />,
      );
    });

    expect(
      container.querySelector('textarea[aria-label="Requirement brief"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Interpret requirement");
    expect(container.textContent).toContain("Example prompts");
    // No Profile starter cards, no template picker, no separate creation
    // button: composition starts from the free-form requirement.
    expect(container.querySelector('[title="Profile starter"]')).toBeNull();
    expect(container.querySelector('[title="Golden Profile"]')).toBeNull();
    expect(
      container.querySelector('button[aria-label="Create a new application"]'),
    ).toBeNull();
    expect(container.textContent).not.toContain("Profiles");
  });

  it("replaces the composer with clarification questions when the journey asks them", async () => {
    const interpretation = await new FixtureRequirementInterpreter().interpret({
      brief: vagueBrief,
      answers: {},
    });
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney({
            stage: "clarifying",
            requirement: interpretation.spec,
            blueprintTitle: interpretation.blueprint.title,
            openQuestions: interpretation.clarifications.flatMap(
              (clarification) => clarification.questions,
            ),
          })}
        />,
      );
    });

    expect(
      container.querySelector('textarea[aria-label="Requirement summary"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Answer the open questions");
    expect(
      container.querySelector('input[aria-label="approval-object"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Continue");
  });

  it("shows the deterministic plan alternatives for comparison", async () => {
    const interpretation = await new FixtureRequirementInterpreter().interpret({
      brief: expenseBrief,
      answers: {},
    });
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney({
            stage: "planning",
            requirement: interpretation.spec,
            blueprintTitle: interpretation.blueprint.title,
            planAlternatives,
          })}
        />,
      );
    });

    expect(container.textContent).toContain(
      "Choose how the product is composed",
    );
    expect(container.textContent).toContain("Choose Standard");
    expect(container.textContent).toContain("Choose Minimal");
    expect(container.textContent).toContain("4 operations");
    expect(container.textContent).toContain("2 acceptance journeys");
  });

  it("reviews the approved plan Diff before applying it to the Draft", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney({
            stage: "reviewing",
            diffChecksum: "sha256:diff",
          })}
        />,
      );
    });

    expect(container.textContent).toContain("Plan Diff accepted");
    expect(container.textContent).toContain("sha256:diff");
    expect(container.textContent).toContain("Apply to Draft");
  });

  it("returns to the composer with the bounded error after a failed journey", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney({
            stage: "failed",
            error: "The control plane is not ready yet; try again shortly.",
          })}
        />,
      );
    });

    expect(
      container.querySelector('textarea[aria-label="Requirement brief"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("not ready yet");
    expect(container.textContent).toContain("Interpret requirement");
  });

  it("shows safe capability, intake, and compilation intelligence", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onOpen={vi.fn()}
          journey={briefJourney()}
          portfolioSummary={{
            apiVersion: "factory.workspace-portfolio-summary/v1",
            profiles: [
              {
                profile: "restaurant-ordering",
                label: "Restaurant ordering",
                category: "commerce",
                requiredPackages: 18,
                optionalPackages: 1,
              },
            ],
            readiness: [
              {
                apiVersion: "factory.profile-readiness/v1",
                profile: "restaurant-ordering",
                label: "Restaurant ordering",
                generatedTargets: [
                  "simulator",
                  "web",
                  "api",
                  "database",
                  "tests",
                  "docs",
                ],
                capabilities: [
                  { key: "commerce.catalog", status: "available" },
                  { key: "commerce.transaction", status: "partial" },
                  { key: "commerce.order-amendment", status: "partial" },
                  { key: "payment.provider", status: "provider-required" },
                ],
              },
              {
                apiVersion: "factory.profile-readiness/v1",
                profile: "simple-ecommerce",
                label: "Simple ecommerce",
                generatedTargets: [
                  "simulator",
                  "web",
                  "api",
                  "database",
                  "tests",
                  "docs",
                ],
                capabilities: [
                  { key: "commerce.catalog", status: "available" },
                  { key: "commerce.transaction", status: "partial" },
                  { key: "payment.provider", status: "provider-required" },
                ],
              },
            ],
            coverage: [
              {
                apiVersion: "factory.profile-coverage/v1",
                key: "commerce.order-operations",
                label: "Order operations",
                status: "partial",
                packageKeys: [
                  "commerce.order",
                  "commerce.inventory",
                  "core.audit",
                ],
                profiles: [
                  "restaurant-ordering",
                  "simple-ecommerce",
                  "retail-counter",
                  "grocery-pickup",
                ],
              },
            ],
            capabilities: {
              golden: 23,
              lockedVersions: 48,
              candidate: 0,
              provider: 0,
            },
            capabilityFamilies: [
              {
                key: "core.identity-policy",
                lifecycle: "golden",
                version: "1.0.0",
                profileCount: 2,
                validation: "verified",
                generatedTargetState: "ready",
              },
            ],
            intake: {
              portfolioSources: 43,
              intakeEligible: 19,
              candidateBlueprints: 19,
              quarantined: 0,
              blocked: 0,
            },
            supply: {
              apiVersion: "factory.capability-supply-summary/v1",
              families: [
                {
                  key: "commerce-transaction",
                  profiles: [
                    "restaurant-ordering",
                    "simple-ecommerce",
                    "retail-counter",
                    "grocery-pickup",
                  ],
                  discovery: 4,
                  quarantined: 0,
                  blocked: 0,
                  action: "integrate",
                },
              ],
            },
            compilations: { queued: 0, running: 1, succeeded: 3, failed: 1 },
          }}
        />,
      );
    });

    expect(container.textContent).toContain("Capability coverage");
    expect(container.textContent).toContain("Source intake");
    expect(container.textContent).toContain("Compilation health");
    expect(container.textContent).toContain("Restaurant ordering");
    expect(container.textContent).toContain("Golden");
    expect(container.textContent).toContain("Eligible");
    expect(container.textContent).toContain("Profile readiness");
    expect(container.textContent).toContain("Profile coverage");
    expect(container.textContent).toContain("Order operations");
    expect(container.textContent).toContain("Planned");
    expect(container.textContent).toContain("Capability supply");
    expect(container.textContent).toContain("commerce-transaction");
    expect(container.textContent).toContain("Identity and policy");
    expect(container.textContent).toContain("Available 1");
    expect(container.textContent).toContain("Provider 1");
    expect(container.textContent).not.toContain("https://github.com");
  });

  it("opens Restaurant from Home and keeps compilation disabled until publish", () => {
    const onOpen = vi.fn();
    const onCompile = vi.fn();

    act(() => {
      root.render(
        <WorkbenchHome
          applications={[restaurantDraft]}
          loading={false}
          onCompile={onCompile}
          onOpen={onOpen}
          journey={briefJourney()}
        />,
      );
    });

    expect(container.textContent).toContain("Restaurant ordering");
    expect(container.textContent).toContain("6 / 6 Golden assets");
    expect(container.textContent).toContain("Draft r.3");
    const open = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Restaurant ordering"]',
    );
    const compile = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Compile Restaurant ordering"]',
    );
    expect(open).not.toBeNull();
    expect(compile?.disabled).toBe(true);
    expect(compile?.title).toBe("Publish this application before compiling.");

    act(() => open?.click());

    expect(onOpen).toHaveBeenCalledWith("restaurant-ordering");
    expect(onCompile).not.toHaveBeenCalled();
  });

  it("surfaces failed recent activity while compile stays actionable", () => {
    const onCompile = vi.fn();

    act(() => {
      root.render(
        <WorkbenchHome
          applications={[failedExpense, restaurantDraft]}
          loading={false}
          onCompile={onCompile}
          onOpen={vi.fn()}
          journey={briefJourney()}
        />,
      );
    });

    expect(container.textContent).toContain("Recent activity");
    expect(container.textContent).toContain("Needs attention");
    expect(container.textContent).toContain("Draft r.4 · Published r.2");
    const compile = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Compile Expense approval"]',
    );
    expect(compile?.disabled).toBe(false);

    act(() => {
      compile?.click();
    });

    expect(onCompile).toHaveBeenCalledWith("expense-approval");
  });

  it("keeps the newest application summary when an older refresh resolves last", async () => {
    const currentSummary: WorkbenchApplicationSummary = {
      ...restaurantDraft,
      latestPublished: {
        revisionNumber: 2,
        publishedAt: "2026-07-30T03:10:00.000Z",
      },
      latestCompilation: {
        id: "compilation-1",
        status: "failed",
        completedAt: "2026-07-30T04:00:00.000Z",
      },
    };
    const staleSummary: WorkbenchApplicationSummary = {
      ...currentSummary,
      latestCompilation: {
        id: "compilation-1",
        status: "queued",
        completedAt: null,
      },
    };
    let resolveStaleSummary!: (response: Response) => void;
    const staleSummaryResponse = new Promise<Response>((resolve) => {
      resolveStaleSummary = resolve;
    });
    let summaryRequests = 0;
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (
          method === "GET" &&
          url.pathname === "/workspaces/local/application-graphs/ops-workspace"
        ) {
          return responseJson({
            id: "graph-initial",
            draftRevisions: [
              {
                id: "draft-initial",
                revisionNumber: 1,
                graph: workbenchGraph,
              },
            ],
            publishedRevisions: [],
          });
        }
        if (
          method === "GET" &&
          url.pathname === "/workspaces/local/application-graphs"
        ) {
          summaryRequests += 1;
          return summaryRequests === 1
            ? staleSummaryResponse
            : responseJson([currentSummary]);
        }
        return new Response("unexpected request", { status: 500 });
      },
    );
    vi.stubGlobal("fetch", fetcher);

    await act(async () => {
      root.render(
        <Workbench
          controlPlaneUrl="http://control-plane.test"
          initialGraph={workbenchGraph}
        />,
      );
    });
    await waitForAssertion(() => {
      expect(summaryRequests).toBe(2);
      expect(container.textContent).toContain("Compilation failed");
    });

    await act(async () => {
      resolveStaleSummary(responseJson([staleSummary]));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("Compilation failed");
    expect(container.textContent).not.toContain("Compilation queued");
  });

  it("retries the control-plane bootstrap while the plane is still booting", async () => {
    vi.useFakeTimers();
    try {
      let bootstrapAttempts = 0;
      const fetcher = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          const method = init?.method ?? "GET";
          if (
            method === "GET" &&
            url.pathname ===
              "/workspaces/local/application-graphs/ops-workspace"
          ) {
            bootstrapAttempts += 1;
            if (bootstrapAttempts < 3) {
              // The compose stack starts the control plane cold; until it
              // accepts connections the mount-time bootstrap fails.
              throw new Error("connection refused");
            }
            return responseJson({
              id: "graph-initial",
              draftRevisions: [
                {
                  id: "draft-initial",
                  revisionNumber: 1,
                  graph: workbenchGraph,
                },
              ],
              publishedRevisions: [],
            });
          }
          if (
            method === "GET" &&
            url.pathname === "/workspaces/local/application-graphs"
          ) {
            return responseJson([]);
          }
          return new Response("unexpected request", { status: 500 });
        },
      );
      vi.stubGlobal("fetch", fetcher);

      await act(async () => {
        root.render(
          <Workbench
            controlPlaneUrl="http://control-plane.test"
            initialGraph={workbenchGraph}
          />,
        );
      });

      // The first attempt fails; the shell must not stay wedged on the
      // unavailable state forever.
      expect(bootstrapAttempts).toBe(1);
      expect(container.textContent).toContain("Control Plane unavailable");

      // Advance the bounded retry schedule: attempt 2 fails again, attempt 3
      // succeeds and the shell reports the plane ready.
      await act(async () => {
        vi.advanceTimersByTime(2_000);
      });
      expect(bootstrapAttempts).toBe(2);
      await act(async () => {
        vi.advanceTimersByTime(2_000);
      });
      expect(bootstrapAttempts).toBe(3);
      expect(container.textContent).toContain("Control Plane ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["succeeded", "failed"] as const)(
    "refreshes application activity after a queued compilation %s and whenever Home activates",
    async (terminalStatus) => {
      let compilationStatus: "none" | "queued" | "succeeded" | "failed" =
        "none";
      const events: string[] = [];
      const applicationSummary = (): WorkbenchApplicationSummary => ({
        ...restaurantDraft,
        latestPublished: {
          revisionNumber: 2,
          publishedAt: "2026-07-30T03:10:00.000Z",
        },
        latestCompilation:
          compilationStatus === "none"
            ? null
            : {
                id: "compilation-1",
                status: compilationStatus,
                completedAt:
                  compilationStatus === "queued"
                    ? null
                    : "2026-07-30T04:00:00.000Z",
              },
      });
      const fetcher = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          const method = init?.method ?? "GET";
          if (
            method === "GET" &&
            url.pathname ===
              "/workspaces/local/application-graphs/ops-workspace"
          ) {
            return responseJson({
              id: "graph-initial",
              draftRevisions: [
                {
                  id: "draft-initial",
                  revisionNumber: 1,
                  graph: workbenchGraph,
                },
              ],
              publishedRevisions: [],
            });
          }
          if (
            method === "GET" &&
            url.pathname === "/workspaces/local/application-graphs"
          ) {
            events.push(`summary:${compilationStatus}`);
            return responseJson([applicationSummary()]);
          }
          if (
            method === "GET" &&
            url.pathname ===
              "/workspaces/local/application-graphs/restaurant-ordering"
          ) {
            return responseJson({
              id: "graph-restaurant",
              draftRevisions: [
                {
                  id: "draft-restaurant",
                  revisionNumber: 3,
                  graph: workbenchGraph,
                },
              ],
              publishedRevisions: [
                {
                  id: "published-restaurant",
                  revisionNumber: 2,
                  sourceDraftRevisionId: "draft-restaurant",
                  graphHash: "sha256:published",
                },
              ],
            });
          }
          if (method === "POST" && url.pathname === "/compilations") {
            compilationStatus = "queued";
            events.push("compilation:queued");
            return responseJson(
              {
                id: "compilation-1",
                publishedRevisionId: "published-restaurant",
                target: "application-bundle",
                result: { status: "queued" },
              },
              201,
            );
          }
          if (
            method === "GET" &&
            url.pathname === "/compilations/compilation-1"
          ) {
            compilationStatus = terminalStatus;
            events.push(`compilation:${terminalStatus}`);
            return responseJson({
              id: "compilation-1",
              publishedRevisionId: "published-restaurant",
              target: "application-bundle",
              result: {
                status: terminalStatus,
                completedAt: "2026-07-30T04:00:00.000Z",
              },
            });
          }
          if (
            method === "GET" &&
            url.pathname === "/compilations/compilation-1/preview-runs/current"
          ) {
            return responseJson(null);
          }
          return new Response("unexpected request", { status: 500 });
        },
      );
      vi.stubGlobal("fetch", fetcher);

      await act(async () => {
        root.render(
          <Workbench
            controlPlaneUrl="http://control-plane.test"
            initialGraph={workbenchGraph}
          />,
        );
      });
      await waitForAssertion(() => {
        expect(
          container.querySelector<HTMLButtonElement>(
            'button[aria-label="Compile Restaurant ordering"]',
          ),
        ).not.toBeNull();
      });

      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Compile Restaurant ordering"]',
          )
          ?.click();
      });
      await waitForAssertion(() => {
        expect(events).toContain(`compilation:${terminalStatus}`);
        expect(events).toContain(`summary:${terminalStatus}`);
      });
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
      const terminalRefreshesBeforeHome = events.filter(
        (event) => event === `summary:${terminalStatus}`,
      ).length;

      act(() => {
        container
          .querySelector<HTMLButtonElement>('button[aria-label="Home"]')
          ?.click();
      });
      await waitForAssertion(() => {
        expect(container.textContent).toContain(
          `Compilation ${terminalStatus}`,
        );
        expect(
          events.filter((event) => event === `summary:${terminalStatus}`),
        ).toHaveLength(terminalRefreshesBeforeHome + 1);
        expect(container.textContent).not.toContain(
          "Loading local applications…",
        );
      });
    },
  );

  it("does not report a semantic match when Published metadata belongs to an older Draft", async () => {
    const publishedRestaurant: WorkbenchApplicationSummary = {
      ...restaurantDraft,
      latestPublished: {
        revisionNumber: 2,
        publishedAt: "2026-07-30T03:10:00.000Z",
      },
    };
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (
          method === "GET" &&
          url.pathname === "/workspaces/local/application-graphs/ops-workspace"
        ) {
          return responseJson({
            id: "graph-initial",
            draftRevisions: [
              {
                id: "draft-initial",
                revisionNumber: 1,
                graph: workbenchGraph,
              },
            ],
            publishedRevisions: [],
          });
        }
        if (
          method === "GET" &&
          url.pathname === "/workspaces/local/application-graphs"
        ) {
          return responseJson([publishedRestaurant]);
        }
        if (
          method === "GET" &&
          url.pathname ===
            "/workspaces/local/application-graphs/restaurant-ordering"
        ) {
          return responseJson({
            id: "graph-restaurant",
            draftRevisions: [
              {
                id: "draft-current",
                revisionNumber: 3,
                graph: workbenchGraph,
              },
            ],
            publishedRevisions: [
              {
                id: "published-restaurant",
                revisionNumber: 2,
                sourceDraftRevisionId: "draft-older",
                graphHash: "sha256:published",
              },
            ],
          });
        }
        return new Response("unexpected request", { status: 500 });
      },
    );
    vi.stubGlobal("fetch", fetcher);

    await act(async () => {
      root.render(
        <Workbench
          controlPlaneUrl="http://control-plane.test"
          initialGraph={workbenchGraph}
        />,
      );
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Open Restaurant ordering"]',
        ),
      ).not.toBeNull();
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Open Restaurant ordering"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container
          .querySelector<HTMLButtonElement>('button[aria-label="Page"]')
          ?.getAttribute("aria-current"),
      ).toBe("page");
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Select revision"]',
        )?.textContent,
      ).toContain("r.3");
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Code"]')
        ?.click();
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Publish a revision to compare");
      expect(container.textContent).not.toContain(
        "Matches Published semantics",
      );
    });
  });
});
