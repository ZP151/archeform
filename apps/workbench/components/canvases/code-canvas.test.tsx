// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  WorkbenchArtifactContent,
  WorkbenchCompilation,
  WorkbenchCompilationArtifact,
} from "../../lib/control-plane-client";
import { workbenchGraph } from "../../lib/workbench-graph";
import { CodeCanvas } from "./code-canvas";

const apiArtifact: WorkbenchCompilationArtifact = {
  path: "api/package.json",
  digest:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  mediaType: "application/json",
  sizeBytes: 128,
};

const webArtifact: WorkbenchCompilationArtifact = {
  path: "web/app/page.tsx",
  digest:
    "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  mediaType: "text/typescript",
  sizeBytes: 256,
};

const artifacts = Object.freeze([webArtifact, apiArtifact]);

function compilation(
  status: "queued" | "failed" | "succeeded",
): WorkbenchCompilation {
  const result =
    status === "succeeded"
      ? {
          status: "succeeded" as const,
          artifactCount: artifacts.length,
          completedAt: "2026-08-14T12:00:00.000Z",
        }
      : status === "failed"
        ? {
            status: "failed" as const,
            failureCode: "compilation.failed" as const,
            completedAt: "2026-08-14T12:00:00.000Z",
          }
        : { status: "queued" as const };
  return {
    id: "compilation-1",
    publishedRevisionId: "published-1",
    target: "application-bundle",
    result,
    artifacts,
  };
}

describe("CodeCanvas Source explorer", () => {
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

  function renderSource({
    currentCompilation = compilation("succeeded"),
    selectedArtifact = null,
    artifactLoading = false,
    artifactSnapshot = null,
    artifactError = null,
    onInspectArtifact = vi.fn(),
  }: {
    currentCompilation?: WorkbenchCompilation | null;
    selectedArtifact?: WorkbenchCompilationArtifact | null;
    artifactLoading?: boolean;
    artifactSnapshot?: WorkbenchArtifactContent | null;
    artifactError?: string | null;
    onInspectArtifact?: (path: string) => void;
  } = {}) {
    act(() => {
      root.render(
        <CodeCanvas
          artifactError={artifactError}
          artifactLoading={artifactLoading}
          artifactSnapshot={artifactSnapshot}
          canExport={false}
          compilation={currentCompilation}
          exchangeStatus={null}
          graph={workbenchGraph}
          onExportPublishedGraph={vi.fn()}
          onImportPublishedGraph={vi.fn()}
          onInspectArtifact={onInspectArtifact}
          onOpenPreview={vi.fn()}
          onStartPreview={vi.fn()}
          onStopPreview={vi.fn()}
          previewRun={null}
          publishedRevision={null}
          selectedArtifact={selectedArtifact}
        />,
      );
    });
    return { onInspectArtifact };
  }

  it.each([
    ["absent", null],
    ["queued", compilation("queued")],
    ["failed", compilation("failed")],
  ])(
    "exposes no interactive Source tree for an %s Compilation",
    (_label, value) => {
      renderSource({ currentCompilation: value });

      expect(
        container.querySelector('section[aria-label="Source"]'),
      ).toBeNull();
      expect(
        container.querySelector(
          'nav[aria-label="Registered source artifacts"]',
        ),
      ).toBeNull();
    },
  );

  it("renders every succeeded manifest row once in code-unit path order without mutating the input", () => {
    const { onInspectArtifact } = renderSource();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-source-path]"),
    );

    expect(buttons.map((button) => button.dataset.sourcePath)).toEqual([
      "api/package.json",
      "web/app/page.tsx",
    ]);
    expect(artifacts.map(({ path }) => path)).toEqual([
      "web/app/page.tsx",
      "api/package.json",
    ]);
    expect(buttons[0]?.textContent).toContain("application/json");
    expect(buttons[0]?.textContent).toContain("128 B");
    expect(buttons[0]?.getAttribute("aria-label")).toContain(
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );

    act(() => buttons[1]?.click());
    expect(onInspectArtifact).toHaveBeenCalledWith("web/app/page.tsx");
  });

  it("clears stale code while the selected descriptor is pending and keeps native selection semantics", () => {
    renderSource({
      selectedArtifact: webArtifact,
      artifactLoading: true,
      artifactSnapshot: {
        path: apiArtifact.path,
        digest: apiArtifact.digest,
        content: '{"stale":true}\n',
      },
    });
    const viewer = container.querySelector(
      'section[aria-label="Verified source content"]',
    )!;

    expect(viewer.textContent).toContain("web/app/page.tsx");
    expect(viewer.textContent).toContain("Verifying registered artifact");
    expect(viewer.querySelector("code")).toBeNull();
    expect(
      container
        .querySelector('[data-source-path="web/app/page.tsx"]')
        ?.getAttribute("aria-current"),
    ).toBe("true");
  });

  it.each([
    {
      label: "fixed failure",
      snapshot: null,
      error: "Generated artifact could not be inspected.",
    },
    {
      label: "mismatched path",
      snapshot: {
        path: "api/package.json",
        digest: webArtifact.digest,
        content: "unverified wrong path",
      },
      error: null,
    },
    {
      label: "mismatched digest",
      snapshot: {
        path: webArtifact.path,
        digest: apiArtifact.digest,
        content: "unverified wrong digest",
      },
      error: null,
    },
  ])("renders no source code for $label", ({ snapshot, error }) => {
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: snapshot,
      artifactError: error,
    });
    const viewer = container.querySelector(
      'section[aria-label="Verified source content"]',
    )!;

    expect(viewer.textContent).toContain("web/app/page.tsx");
    if (error) expect(viewer.textContent).toContain(error);
    expect(viewer.querySelector("code")).toBeNull();
  });

  it("renders exact admitted content as inert text only while path and digest still match", () => {
    const content = '<script id="source-hostile">window.evil=true</script>\n';
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
    });
    const viewer = container.querySelector(
      'section[aria-label="Verified source content"]',
    )!;

    expect(viewer.querySelector("code")?.textContent).toBe(content);
    expect(viewer.textContent).toContain(webArtifact.digest);
    expect(viewer.querySelector("script")).toBeNull();
    expect(container.querySelector("#source-hostile")).toBeNull();
  });
});
