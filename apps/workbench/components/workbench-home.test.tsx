// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkbenchApplicationSummary } from "../lib/control-plane-client";
import { workbenchGraph } from "../lib/workbench-graph";
import { Workbench } from "./workbench";
import { WorkbenchHome } from "./workbench-home";

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

  it("renders every registered Profile as a creation-ready Home card", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onCreate={vi.fn()}
          onOpen={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Expense approval");
    expect(container.textContent).toContain("Restaurant ordering");
    expect(container.textContent).toContain("Simple ecommerce");
    expect(container.textContent).toContain("Retail counter");
    expect(container.textContent).toContain("Grocery pickup");
    expect(container.querySelector('[title="Profile starter"]')).not.toBeNull();
    expect(container.querySelector('[title="Golden Profile"]')).toBeNull();
  });

  it("shows safe capability, intake, and compilation intelligence", () => {
    act(() => {
      root.render(
        <WorkbenchHome
          applications={[]}
          loading={false}
          onCompile={vi.fn()}
          onCreate={vi.fn()}
          onOpen={vi.fn()}
          portfolioSummary={{
            apiVersion: "factory.workspace-portfolio-summary/v1",
            profiles: [
              {
                profile: "restaurant-ordering",
                label: "Restaurant ordering",
                category: "commerce",
                requiredPackages: 17,
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
              golden: 20,
              lockedVersions: 40,
              candidate: 0,
              provider: 0,
            },
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
          onCreate={vi.fn()}
          onOpen={onOpen}
        />,
      );
    });

    expect(container.textContent).toContain("Restaurant ordering");
    expect(
      Array.from(container.querySelectorAll("h3")).some(
        (heading) => heading.textContent === "Restaurant ordering",
      ),
    ).toBe(true);
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

  it("reuses create and compile actions while surfacing failed recent activity", () => {
    const onCreate = vi.fn();
    const onCompile = vi.fn();

    act(() => {
      root.render(
        <WorkbenchHome
          applications={[failedExpense, restaurantDraft]}
          loading={false}
          onCompile={onCompile}
          onCreate={onCreate}
          onOpen={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Profiles");
    expect(
      Array.from(container.querySelectorAll("h3")).map(
        (heading) => heading.textContent,
      ),
    ).toEqual(
      expect.arrayContaining([
        "Restaurant ordering projects",
        "Expense approval projects",
      ]),
    );
    expect(container.textContent).toContain("Recent activity");
    expect(container.textContent).toContain("Needs attention");
    expect(container.textContent).toContain("Draft r.4 · Published r.2");
    const create = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Create a new application"]',
    );
    const compile = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Compile Expense approval"]',
    );
    expect(compile?.disabled).toBe(false);

    act(() => {
      create?.click();
      compile?.click();
    });

    expect(onCreate).toHaveBeenCalledOnce();
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
