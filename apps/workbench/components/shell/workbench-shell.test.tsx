// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkbenchApplicationSummary } from "../../lib/control-plane-client";
import { workbenchGraph } from "../../lib/workbench-graph";
import { templateDraftResponse } from "../../test/template-draft-fixture";
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
    readonly templateDrafts?: readonly ReturnType<
      typeof templateDraftResponse
    >[];
    readonly failFirstTemplateClone?: boolean;
    readonly failTemplatePageRevision?: boolean;
    readonly failFirstTemplateDataRevision?: boolean;
    readonly failFirstTemplateExperienceRevision?: boolean;
  } = {},
): ReturnType<typeof vi.fn> {
  const applications = options.applications ?? [];
  let templateCloneAttempts = 0;
  let templateDataRevisionAttempts = 0;
  let templateExperienceRevisionAttempts = 0;
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      if (
        method === "GET" &&
        url.pathname === "/workspaces/local/curated-templates"
      ) {
        return responseJson(
          options.templateDrafts ? [options.templateDrafts[0].template] : [],
        );
      }
      if (
        method === "POST" &&
        url.pathname ===
          "/workspaces/local/curated-templates/restaurant-dual-surface/instances"
      ) {
        templateCloneAttempts += 1;
        if (options.failFirstTemplateClone && templateCloneAttempts === 1) {
          return responseJson({ error: "temporarily unavailable" }, 503);
        }
        return responseJson(options.templateDrafts?.[0] ?? null, 201);
      }
      if (
        method === "POST" &&
        url.pathname === "/template-draft-instances/application-1/revisions"
      ) {
        return responseJson(options.templateDrafts?.[1] ?? null, 201);
      }
      if (
        method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/page-revisions"
      ) {
        if (options.failTemplatePageRevision) {
          return responseJson(
            { message: "HOSTILE_PAGE_SAVE_HTTP_SENTINEL" },
            503,
          );
        }
        return responseJson(options.templateDrafts?.[2] ?? null, 201);
      }
      if (
        method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/data-field-revisions"
      ) {
        templateDataRevisionAttempts += 1;
        if (
          options.failFirstTemplateDataRevision &&
          templateDataRevisionAttempts === 1
        ) {
          return responseJson({ message: "HOSTILE_DATA_SAVE_SENTINEL" }, 503);
        }
        return responseJson(options.templateDrafts?.at(-1) ?? null, 201);
      }
      if (
        method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/experience-theme-revisions"
      ) {
        templateExperienceRevisionAttempts += 1;
        if (
          options.failFirstTemplateExperienceRevision &&
          templateExperienceRevisionAttempts === 1
        ) {
          return responseJson(
            { message: "HOSTILE_EXPERIENCE_SAVE_SENTINEL" },
            503,
          );
        }
        return responseJson(options.templateDrafts?.at(-1) ?? null, 201);
      }
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
      if (method === "POST" && url.pathname === "/api/requirements/interpret") {
        return new Promise<Response>(() => undefined);
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
              digest:
                "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
    templateDrafts?: readonly ReturnType<typeof templateDraftResponse>[],
    failFirstTemplateClone = false,
    failTemplatePageRevision = false,
    failFirstTemplateDataRevision = false,
    failFirstTemplateExperienceRevision = false,
  ) {
    const fetcher = stubControlPlane({
      applications,
      templateDrafts,
      failFirstTemplateClone,
      failTemplatePageRevision,
      failFirstTemplateDataRevision,
      failFirstTemplateExperienceRevision,
    });
    vi.stubGlobal("fetch", fetcher);
    act(() => {
      root.render(
        <Workbench
          controlPlaneUrl="http://control-plane.test"
          initialGraph={workbenchGraph}
        />,
      );
    });
    return fetcher;
  }

  it("loads bounded shell, Home, and Builder style modules exactly once", () => {
    const globalCss = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );
    const modules = [
      "tokens.css",
      "base.css",
      "shell.css",
      "workspace-home.css",
      "builder-workspace.css",
      "template-draft.css",
      "template-data.css",
      "template-experience.css",
      "template-preview.css",
      "template-page.css",
    ];
    for (const module of modules) {
      const importRule = `@import \"../styles/${module}\";`;
      expect(globalCss.split(importRule)).toHaveLength(2);
      const source = readFileSync(
        join(process.cwd(), "styles", module),
        "utf8",
      );
      expect(source.trim().split(/\r?\n/u).length).toBeLessThanOrEqual(300);
    }
    for (const extractedSelector of [
      ":root {",
      ".rail {",
      ".topbar {",
      ".workspace-navigation {",
      ".builder-navigation {",
      ".workbench-home {",
      ".builder-workspace {",
      ".work-area {",
      ".workbench-operations {",
      ".canvas {",
      ".canvas-board {",
      ".project-switcher {",
      ".overlay-sheet {",
    ]) {
      expect(globalCss).not.toContain(extractedSelector);
    }
    const tokens = readFileSync(
      join(process.cwd(), "styles/tokens.css"),
      "utf8",
    );
    expect(tokens).toContain("--canvas: #f5f7f9;");
    expect(tokens).toContain("--accent: #067a5c;");
    expect(tokens).toContain("--canvas: #10161d;");
    const shellCss = readFileSync(
      join(process.cwd(), "styles/shell.css"),
      "utf8",
    );
    expect(shellCss).not.toMatch(
      /button\[aria-label="(?:History|Activity|Library)"\][^{]*\{[^}]*display:\s*none/gu,
    );
  });

  it("does not move focus when closed overlays first mount", () => {
    const sentinel = document.createElement("button");
    sentinel.textContent = "Before workbench";
    document.body.append(sentinel);
    sentinel.focus();

    renderWorkbench();

    expect(document.activeElement).toBe(sentinel);
    sentinel.remove();
  });

  it("keeps Apps as the only workspace-level destination", () => {
    renderWorkbench();

    const rail = container.querySelector<HTMLElement>(
      'nav[aria-label="Workspace navigation"]',
    );
    expect(rail).not.toBeNull();
    const buttons = rail?.querySelectorAll("button") ?? [];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("aria-label")).toBe("Apps");
    expect(buttons[0]?.getAttribute("title")).toContain("describe or resume");
  });

  it("moves a product request into the legacy non-template Builder destinations", async () => {
    renderWorkbench();

    const brief = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Requirement brief"]',
    )!;
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setValue?.call(
        brief,
        "Build a restaurant product for customers and merchant operators.",
      );
      brief.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>("button.primary-action")
        ?.click();
    });

    await waitForAssertion(() => {
      expect(
        container.querySelector('section[aria-label="Builder workspace"]'),
      ).not.toBeNull();
      expect(
        container.querySelector('section[aria-label="Product conversation"]'),
      ).not.toBeNull();
      expect(
        container.querySelector('section[aria-label="Responsive preview"]'),
      ).not.toBeNull();
    });

    const workspaceNav = container.querySelector<HTMLElement>(
      'nav[aria-label="Workspace navigation"]',
    )!;
    expect(
      Array.from(workspaceNav.querySelectorAll("button"), (button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual(["Apps"]);
    expect(
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'nav[aria-label="Builder navigation"] button',
        ),
        (button) => button.getAttribute("aria-label"),
      ),
    ).toEqual(["Page", "Data", "Workflow", "Access", "AI", "Code", "Publish"]);

    const page = container.querySelector<HTMLButtonElement>(
      'nav[aria-label="Builder navigation"] button[aria-label="Page"]',
    )!;
    const data = container.querySelector<HTMLButtonElement>(
      'nav[aria-label="Builder navigation"] button[aria-label="Data"]',
    )!;
    page.focus();
    act(() => {
      page.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(data);

    const advanced = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Advanced"]',
    )!;
    expect(advanced).not.toBeNull();
    expect(advanced.title).toBe("Open advanced settings");
    expect(advanced.title).not.toMatch(/Graph|lock|evidence/iu);
    expect(container.querySelector(".inspector-sheet")).toBeNull();
    act(() => advanced.click());
    await waitForAssertion(() => {
      expect(container.querySelector(".inspector-sheet")).not.toBeNull();
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await waitForAssertion(() => {
      expect(container.querySelector(".inspector-sheet")).toBeNull();
      expect(document.activeElement).toBe(advanced);
    });
  });

  it("returns to Apps immediately and stays reset while interpretation is pending", async () => {
    renderWorkbench();
    const brief = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Requirement brief"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(brief, "Build a restaurant ordering product.");
      brief.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>("button.primary-action")
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('section[aria-label="Builder workspace"]'),
      ).not.toBeNull();
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Apps"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('section[aria-label="Apps"]'),
      ).not.toBeNull();
      expect(
        container.querySelector('section[aria-label="Builder workspace"]'),
      ).toBeNull();
    });
  });

  it("closes Library before entering Builder", async () => {
    renderWorkbench();
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Library"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.querySelector(".library-drawer")).not.toBeNull();
    });

    const brief = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Requirement brief"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(brief, "Build a restaurant ordering product.");
      brief.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>("button.primary-action")
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('section[aria-label="Builder workspace"]'),
      ).not.toBeNull();
      expect(container.querySelector(".library-drawer")).toBeNull();
      expect(
        container.querySelector('button[aria-label="Library"]'),
      ).toBeNull();
    });
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
  });

  it("shows contextual inspector facts for each surface and no placeholder fields", async () => {
    renderWorkbench();

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Control Plane ready");
    });
    const inspector = () =>
      container.querySelector<HTMLElement>(".inspector-sheet");
    expect(inspector()).toBeNull();
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Advanced"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(inspector()).not.toBeNull();
    });
    expect(inspector()?.textContent).toContain("Ops workspace");
    // The inspector never renders placeholder inputs or decorative menus.
    expect(inspector()?.querySelector("input, select")).toBeNull();
    expect(inspector()?.textContent).not.toContain("•••");
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

  it("clones a V3 template, isolates legacy actions, and appends a renamed Draft", async () => {
    const first = templateDraftResponse(1);
    const second = templateDraftResponse(2);
    const third = templateDraftResponse(3, {
      pageId: "customer-menu",
      title: "Seasonal Menu",
    });
    const sameNameTemplates: readonly WorkbenchApplicationSummary[] = [
      {
        ...restaurantSummary,
        id: "graph-other-template",
        key: "other-template-clone",
        name: "Maison Aurelia",
        templateOrigin: {
          templateKey: "restaurant-dual-surface",
          templateVersion: "1.0.0",
        },
      },
      {
        ...restaurantSummary,
        id: "application-1",
        key: "restaurant-template-001",
        name: "Maison Aurelia",
        templateOrigin: {
          templateKey: "restaurant-dual-surface",
          templateVersion: "1.0.0",
        },
      },
    ];
    const fetcher = renderWorkbench(sameNameTemplates, [first, second, third]);

    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        ),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        )
        ?.click();
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.1");
      expect(container.textContent).toContain("8 customer pages");
      expect(container.textContent).toContain("7 merchant pages");
    });
    expect(
      container.querySelector<HTMLSelectElement>(
        'select[aria-label="Switch application"]',
      )?.value,
    ).toBe("restaurant-template-001");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish draft"]',
      )?.disabled,
    ).toBe(false);
    expect(container.querySelector('button[aria-label="Compile"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Advanced"]')).toBeNull();
    expect(container.querySelector('button[aria-label="History"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Activity"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Library"]')).toBeNull();

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Application name"]',
    );
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "Maison Rivage");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Save application name"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.2");
      expect(container.textContent).toContain("Maison Rivage");
    });

    const revisionCall = fetcher.mock.calls.find(([input, init]) => {
      const url = new URL(String(input));
      return (
        init?.method === "POST" &&
        url.pathname === "/template-draft-instances/application-1/revisions"
      );
    });
    expect(JSON.parse(String(revisionCall?.[1]?.body))).toEqual({
      baseDraftRevisionId: "draft-1",
      name: "Maison Rivage",
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Select Menu"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('button[aria-label="Edit Menu"]'),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Menu"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Page workspace"]',
        ),
      ).not.toBeNull();
    });
    expect(
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'nav[aria-label="Builder navigation"] button',
        ),
        (button) => button.getAttribute("aria-label"),
      ),
    ).toEqual(["Page", "Data", "Access", "Experience"]);
    const pageTitle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Page title"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(pageTitle, "Seasonal Menu");
      pageTitle.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Draft r.3 · Preview active");
      expect(container.textContent).toContain("Seasonal Menu");
    });
    const pageRevisionCall = fetcher.mock.calls.find(([input, init]) => {
      const url = new URL(String(input));
      return (
        init?.method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/page-revisions"
      );
    });
    expect(JSON.parse(String(pageRevisionCall?.[1]?.body))).toEqual({
      baseDraftRevisionId: "draft-2",
      surfaceKey: "customer-mobile",
      pageId: "customer-menu",
      title: "Seasonal Menu",
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Back to preview"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.3");
      expect(
        container.querySelector(
          'button[aria-label="Select Seasonal Menu"][aria-current="page"]',
        ),
      ).not.toBeNull();
    });
  });

  it("keeps r.4 previews authoritative through a failed Data save and replaces the instance only on strict r.5", async () => {
    const fourth = templateDraftResponse(
      4,
      { pageId: "customer-menu", title: "Seasonal Menu" },
      {
        pageId: "customer-home",
        blockIds: ["home-items", "home-hero", "home-categories"],
      },
    );
    const fifth = templateDraftResponse(
      5,
      { pageId: "customer-menu", title: "Seasonal Menu" },
      {
        pageId: "customer-home",
        blockIds: ["home-items", "home-hero", "home-categories"],
      },
      "Heirloom tomato pizza",
    );
    const fetcher = renderWorkbench(
      undefined,
      [fourth, fifth],
      false,
      false,
      true,
    );

    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        ),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.4");
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Home"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Page workspace"]',
        ),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Data"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Data workspace"]',
        ),
      ).not.toBeNull();
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Dish name"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "  Heirloom tomato pizza  ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    await waitForAssertion(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Template data could not be saved.",
      );
    });
    expect(input.value).toBe("  Heirloom tomato pizza  ");
    expect(container.textContent).toContain("Draft r.4 · Preview active");
    expect(
      Array.from(
        container.querySelectorAll("[data-template-data-preview] strong"),
      ).map((element) => element.textContent),
    ).toEqual(["Margherita pizza", "Margherita pizza"]);
    expect(container.textContent).not.toContain("HOSTILE_DATA_SAVE_SENTINEL");

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Save dish name as new Draft"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Draft r.5 · Preview active");
      expect(
        Array.from(
          container.querySelectorAll("[data-template-data-preview] strong"),
        ).map((element) => element.textContent),
      ).toEqual(["Heirloom tomato pizza", "Heirloom tomato pizza"]);
    });
    const calls = fetcher.mock.calls.filter(([input, init]) => {
      const url = new URL(String(input));
      return (
        init?.method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/data-field-revisions"
      );
    });
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({
      baseDraftRevisionId: "draft-4",
      entityKey: "menu-item",
      recordId: "margherita-pizza",
      fieldKey: "name",
      value: "Heirloom tomato pizza",
    });
  });

  it("adds keyboard-reachable Experience and keeps r.5 light through failure before strict r.6 dark replacement", async () => {
    const fifth = templateDraftResponse(
      5,
      { pageId: "customer-menu", title: "Seasonal Menu" },
      {
        pageId: "customer-home",
        blockIds: ["home-items", "home-hero", "home-categories"],
      },
      "Heirloom tomato pizza",
      "light",
    );
    const sixth = templateDraftResponse(
      6,
      { pageId: "customer-menu", title: "Seasonal Menu" },
      {
        pageId: "customer-home",
        blockIds: ["home-items", "home-hero", "home-categories"],
      },
      "Heirloom tomato pizza",
      "dark",
    );
    const fetcher = renderWorkbench(
      undefined,
      [fifth, sixth],
      false,
      false,
      false,
      true,
    );

    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        ),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.5");
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Home"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Page workspace"]',
        ),
      ).not.toBeNull();
    });

    const builderButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'nav[aria-label="Builder navigation"] button',
      ),
    );
    expect(
      builderButtons.map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Page", "Data", "Access", "Experience"]);
    builderButtons[0]!.focus();
    act(() => {
      builderButtons[0]!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(builderButtons[3]);
    act(() => builderButtons[3]!.click());
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Experience workspace"]',
        ),
      ).not.toBeNull();
    });

    const dark = container.querySelector<HTMLInputElement>(
      'input[type="radio"][aria-label="Dark"]',
    )!;
    const frames = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "[data-template-experience-preview]",
        ),
        (frame) => frame.dataset.templateTheme,
      );
    expect(frames()).toEqual(["light", "light"]);
    act(() => dark.click());
    expect(dark.checked).toBe(true);
    expect(frames()).toEqual(["light", "light"]);
    const form = container.querySelector("form")!;
    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await waitForAssertion(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Template experience could not be saved.",
      );
    });
    expect(container.textContent).not.toContain(
      "HOSTILE_EXPERIENCE_SAVE_SENTINEL",
    );
    expect(dark.checked).toBe(true);
    expect(frames()).toEqual(["light", "light"]);
    expect(document.activeElement).toBe(dark);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Save dark theme as new Draft"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Draft r.6 · Preview active");
      expect(frames()).toEqual(["dark", "dark"]);
    });
    expect(
      document.activeElement?.getAttribute(
        "data-template-experience-save-status",
      ),
    ).toBe("success");
    const calls = fetcher.mock.calls.filter(([input, init]) => {
      const url = new URL(String(input));
      return (
        init?.method === "POST" &&
        url.pathname ===
          "/template-draft-instances/application-1/experience-theme-revisions"
      );
    });
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({
      baseDraftRevisionId: "draft-5",
      mode: "dark",
    });
  });

  it("reuses the clone request identity after a recoverable response failure", async () => {
    const first = templateDraftResponse(1);
    const second = templateDraftResponse(2);
    const fetcher = renderWorkbench(undefined, [first, second], true);

    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        ),
      ).not.toBeNull();
    });
    const start = () => {
      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Start from Maison Aurelia"]',
          )
          ?.click();
      });
    };
    start();
    await waitForAssertion(() => {
      expect(container.textContent).toContain(
        "Control Plane request failed with 503.",
      );
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        )?.disabled,
      ).toBe(false);
    });
    start();
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.1");
    });

    const bodies = fetcher.mock.calls
      .filter(([input, init]) => {
        const url = new URL(String(input));
        return (
          init?.method === "POST" &&
          url.pathname.endsWith(
            "/curated-templates/restaurant-dual-surface/instances",
          )
        );
      })
      .map(
        ([, init]) => JSON.parse(String(init?.body)) as { requestId: string },
      );
    expect(bodies).toHaveLength(2);
    expect(bodies[1]?.requestId).toBe(bodies[0]?.requestId);
  });

  it("shows one fixed error when a template Page save fails", async () => {
    const first = templateDraftResponse(1);
    renderWorkbench(undefined, [first], false, true);

    await waitForAssertion(() => {
      expect(
        container.querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        ),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Start from Maison Aurelia"]',
        )
        ?.click();
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Preview synced · Draft r.1");
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Select Menu"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector('button[aria-label="Edit Menu"]'),
      ).not.toBeNull();
    });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Edit Menu"]')
        ?.click();
    });
    await waitForAssertion(() => {
      expect(
        container.querySelector(
          'section[aria-label="Template Page workspace"]',
        ),
      ).not.toBeNull();
    });
    const pageTitle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Page title"]',
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(pageTitle, "Seasonal Menu");
      pageTitle.dispatchEvent(new Event("input", { bubbles: true }));
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });

    await waitForAssertion(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        "Template page could not be saved.",
      );
    });
    expect(container.textContent).not.toContain(
      "HOSTILE_PAGE_SAVE_HTTP_SENTINEL",
    );
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
