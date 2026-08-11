// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkbenchApplicationSummary } from "../../lib/control-plane-client";
import { workbenchGraph } from "../../lib/workbench-graph";
import { Workbench } from "../workbench";

const restaurantSummary: WorkbenchApplicationSummary = {
  id: "graph-restaurant",
  key: "restaurant-ordering",
  name: "Restaurant ordering",
  compositionProfile: "restaurant-ordering",
  latestDraft: {
    revisionNumber: 3,
    createdAt: "2026-07-30T03:00:00.000Z",
  },
  latestPublished: {
    revisionNumber: 2,
    publishedAt: "2026-07-30T03:10:00.000Z",
  },
  latestCompilation: {
    id: "compilation-1",
    status: "succeeded",
    completedAt: "2026-07-30T04:00:00.000Z",
  },
  goldenAssetMaturity: {
    status: "golden",
    goldenAssets: 6,
    totalAssets: 6,
  },
};

const portfolioSummary = {
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
      packageKeys: ["commerce.order", "core.audit"],
      profiles: ["restaurant-ordering", "simple-ecommerce"],
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
        profiles: ["restaurant-ordering"],
        discovery: 4,
        quarantined: 0,
        blocked: 0,
        action: "integrate",
      },
    ],
  },
  compilations: { queued: 0, running: 1, succeeded: 3, failed: 1 },
};

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * The composable control-plane stub for shell tests: bootstrap, summaries,
 * portfolio, publish, compile, preview, history, and open-application records
 * are all served from one fetch so the rebuilt shell can be exercised
 * end-to-end without a running stack.
 */
function stubControlPlane(
  options: {
    readonly applications?: readonly WorkbenchApplicationSummary[];
    readonly portfolio?: unknown;
  } = {},
): ReturnType<typeof vi.fn> {
  const applications = options.applications ?? [];
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
            { id: "draft-initial", revisionNumber: 1, graph: workbenchGraph },
          ],
          publishedRevisions: [],
        });
      }
      if (
        method === "GET" &&
        url.pathname === "/workspaces/local/application-graphs"
      ) {
        return responseJson([...applications]);
      }
      if (
        method === "GET" &&
        url.pathname === "/workspaces/local/portfolio-summary"
      ) {
        return options.portfolio === undefined
          ? responseJson(portfolioSummary)
          : responseJson(null, 404);
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
      if (
        method === "POST" &&
        url.pathname === "/application-graphs/graph-initial/published-revisions"
      ) {
        return responseJson(
          {
            id: "published-1",
            revisionNumber: 1,
            sourceDraftRevisionId: "draft-initial",
            graphHash: "sha256:publish",
          },
          201,
        );
      }
      if (
        method === "GET" &&
        url.pathname === "/application-graphs/graph-initial/draft-revisions"
      ) {
        return responseJson([
          { id: "draft-initial", revisionNumber: 1, graph: workbenchGraph },
        ]);
      }
      if (
        method === "GET" &&
        url.pathname === "/application-graphs/graph-initial/published-revisions"
      ) {
        return responseJson([]);
      }
      if (method === "POST" && url.pathname === "/compilations") {
        return responseJson(
          {
            id: "compilation-1",
            publishedRevisionId: "published-1",
            target: "application-bundle",
            result: { status: "queued" },
          },
          201,
        );
      }
      if (method === "GET" && url.pathname === "/compilations/compilation-1") {
        return responseJson({
          id: "compilation-1",
          publishedRevisionId: "published-1",
          target: "application-bundle",
          result: {
            status: "succeeded",
            artifactCount: 1,
            completedAt: "2026-07-30T04:00:00.000Z",
          },
          artifacts: [
            {
              path: "api/test/journey.generated.test.ts",
              digest: "sha256:journey",
              mediaType: "text/plain",
            },
          ],
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
  return fetcher;
}

async function waitForAssertion(assertion: () => void): Promise<void> {
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

describe("Workbench shell", () => {
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

  function renderWorkbench(
    applications?: readonly WorkbenchApplicationSummary[],
  ) {
    vi.stubGlobal("fetch", stubControlPlane({ applications }));
    act(() => {
      root.render(
        <Workbench
          controlPlaneUrl="http://control-plane.test"
          initialGraph={workbenchGraph}
        />,
      );
    });
  }

  it("navigates rail destinations with arrow keys and exposes hints as tooltips", () => {
    renderWorkbench();

    const rail = container.querySelector<HTMLElement>(
      'nav[aria-label="Workbench navigation"]',
    );
    expect(rail).not.toBeNull();
    const labels = [
      "Home",
      "Page",
      "Domain",
      "Flow",
      "Policy",
      "AI",
      "Code",
      "Release",
    ];
    const buttons = labels.map((label) =>
      container.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      )!,
    );
    expect(buttons.every(Boolean)).toBe(true);
    // Tooltips carry the declared hint for each destination.
    expect(buttons[0].title).toContain(
      "Compose products and operate applications",
    );
    expect(buttons[3].title).toContain("Connect decisions");

    buttons[0].focus();
    act(() => {
      buttons[0].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(buttons[1]);
    act(() => {
      buttons[1].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(buttons[2]);
    act(() => {
      buttons[2].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(buttons[1]);
    act(() => {
      buttons[1].dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    act(() => {
      buttons[buttons.length - 1].dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("restores focus to the Activity trigger after the sheet closes", async () => {
    renderWorkbench();

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Activity"]',
    )!;
    act(() => trigger.click());
    await waitForAssertion(() => {
      const sheet = container.querySelector<HTMLElement>(".activity-sheet");
      expect(sheet).not.toBeNull();
      expect(sheet?.contains(document.activeElement)).toBe(true);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await waitForAssertion(() => {
      expect(container.querySelector(".activity-sheet")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("focuses the requirement brief through the Ctrl+K command trigger", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(
        container.querySelector('textarea[aria-label="Requirement brief"]'),
      ).not.toBeNull();
    });
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    await waitForAssertion(() => {
      expect(document.activeElement).toBe(
        container.querySelector('textarea[aria-label="Requirement brief"]'),
      );
    });

    // From another surface the command opens Home and lands in the brief.
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Page"]')
        ?.click();
    });
    expect(
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Page"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    await waitForAssertion(() => {
      expect(
        container
          .querySelector<HTMLButtonElement>('button[aria-label="Home"]')
          ?.getAttribute("aria-current"),
      ).toBe("page");
      expect(document.activeElement).toBe(
        container.querySelector('textarea[aria-label="Requirement brief"]'),
      );
    });
  });

  it("shows contextual inspector facts for each surface and no placeholder fields", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Control Plane ready");
    });
    const inspector = () =>
      container.querySelector<HTMLElement>(".inspector-sheet");
    expect(inspector()).not.toBeNull();
    expect(inspector()?.textContent).toContain("Ops workspace");
    // The inspector never renders placeholder inputs or decorative menus.
    expect(inspector()?.querySelector("input, select")).toBeNull();
    expect(inspector()?.textContent).not.toContain("•••");

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Domain"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(inspector()?.textContent).toContain("1 entities");
      expect(inspector()?.textContent).toContain("2 fields");
    });
    expect(
      container.querySelector('input[aria-label="title Unique"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[aria-label="status Unique"]'),
    ).not.toBeNull();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Flow"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(inspector()?.textContent).toContain("1 flows");
      expect(inspector()?.textContent).toContain("2 transitions");
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Policy"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(inspector()?.textContent).toContain("2 roles");
      expect(inspector()?.textContent).toContain("2 permissions");
    });
  });

  it("switches the theme from the utility bar", () => {
    renderWorkbench();

    const main = container.querySelector<HTMLElement>("main.workbench")!;
    expect(main.dataset.theme).toBe("light");
    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Switch to dark theme"]',
    )!;
    act(() => toggle.click());
    expect(main.dataset.theme).toBe("dark");
    expect(
      container.querySelector('button[aria-label="Switch to light theme"]'),
    ).not.toBeNull();
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Switch to light theme"]',
        )
        ?.click();
    });
    expect(main.dataset.theme).toBe("light");
  });

  it("keeps Publish and Compile as the primary actions with honest availability", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      const publish = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish draft"]',
      );
      expect(publish).not.toBeNull();
      expect(publish?.disabled).toBe(false);
    });
    // Nothing may compile until a revision is Published.
    expect(container.querySelector('button[aria-label="Compile"]')).toBeNull();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Publish draft"]')
        ?.click();
    });
    await waitForAssertion(() => {
      const publish = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish draft"]',
      );
      expect(publish?.disabled).toBe(true);
      expect(publish?.textContent).toContain("Published");
      expect(
        container.querySelector('button[aria-label="Compile"]'),
      ).not.toBeNull();
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Compile"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Compile succeeded");
    });
  });

  it("keeps the composer as the sole Home decision when no applications exist", () => {
    renderWorkbench([]);

    expect(
      container.querySelector('textarea[aria-label="Requirement brief"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("Recent products");
    expect(
      container.querySelector('button[aria-label="Open Restaurant ordering"]'),
    ).toBeNull();
  });

  it("shows the compact recent-products row only when records exist", async () => {
    renderWorkbench([restaurantSummary]);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Recent products");
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Open Restaurant ordering"]',
        ),
      ).not.toBeNull();
    });
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Compile Restaurant ordering"]',
      )?.disabled,
    ).toBe(false);
  });

  it("keeps portfolio intelligence off Home and inside the Library drawer", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Control Plane ready");
    });
    // Home is the composer and the recent row only.
    expect(container.textContent).not.toContain("Portfolio intelligence");
    expect(container.textContent).not.toContain("Capability supply");
    expect(container.textContent).not.toContain("Compilation health");

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Library"]',
    )!;
    act(() => trigger.click());
    await waitForAssertion(() => {
      const drawer = container.querySelector<HTMLElement>(".library-drawer");
      expect(drawer).not.toBeNull();
      expect(drawer?.contains(document.activeElement)).toBe(true);
      expect(drawer?.textContent).toContain("Capability supply");
      expect(drawer?.textContent).toContain("Source intake");
      expect(drawer?.textContent).toContain("Compilation health");
      expect(drawer?.textContent).toContain("commerce-transaction");
      expect(drawer?.textContent).toContain("Identity and policy");
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await waitForAssertion(() => {
      expect(container.querySelector(".library-drawer")).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(container.textContent).not.toContain("Capability supply");
    });
  });

  it("shows compilation health and immutable-output evidence in the Activity sheet", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Control Plane ready");
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Publish draft"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('button[aria-label="Compile"]'),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Compile"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Compile succeeded");
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Activity"]')
        ?.click();
    });
    await waitForAssertion(() => {
      const sheet = container.querySelector<HTMLElement>(".activity-sheet");
      expect(sheet).not.toBeNull();
      expect(sheet?.textContent).toContain("Compilation health");
      expect(sheet?.textContent).toContain("1 immutable output");
      expect(sheet?.textContent).toContain(
        "api/test/journey.generated.test.ts",
      );
    });
  });

  it("opens the revision timeline from History and restores focus", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Control Plane ready");
    });
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="History"]',
    )!;
    act(() => trigger.click());
    await waitForAssertion(() => {
      const timeline = container.querySelector<HTMLElement>(
        'section[aria-label="Application Graph revision timeline"]',
      );
      expect(timeline).not.toBeNull();
      expect(timeline?.contains(document.activeElement)).toBe(true);
      expect(timeline?.textContent).toContain("Draft");
      expect(timeline?.textContent).toContain("r.1");
      expect(timeline?.textContent).toContain("1 pages · 1 entities · 1 flows");
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Application Graph revision timeline"]',
        ),
      ).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("removes placeholder settings, account, and inspector controls", () => {
    renderWorkbench();

    expect(
      container.querySelector('button[aria-label="Workbench settings"]'),
    ).toBeNull();
    expect(
      container.querySelector('button[aria-label="Open account menu"]'),
    ).toBeNull();
    expect(
      container.querySelector('button[aria-label="More inspector options"]'),
    ).toBeNull();
    expect(container.textContent).not.toContain("•••");
    expect(container.textContent).not.toContain("Team members");
  });
});
