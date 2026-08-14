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
  artifactRows: readonly WorkbenchCompilationArtifact[] = artifacts,
  id = "compilation-1",
): WorkbenchCompilation {
  const result =
    status === "succeeded"
      ? {
          status: "succeeded" as const,
          artifactCount: artifactRows.length,
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
    id,
    publishedRevisionId: "published-1",
    target: "application-bundle",
    result,
    artifacts: artifactRows,
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

  function inputLabelled(labelText: string) {
    const label = Array.from(container.querySelectorAll("label")).find(
      (candidate) => candidate.textContent === labelText,
    );
    expect(label, `label ${labelText}`).toBeDefined();
    const input = container.querySelector<HTMLInputElement>(
      `#${label!.htmlFor}`,
    );
    expect(input, `input ${labelText}`).not.toBeNull();
    return input!;
  }

  function changeInput(input: HTMLInputElement, value: string) {
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
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

  it("filters only registered paths by a controlled, clamped, case-insensitive literal without requesting content", () => {
    const bracketArtifact: WorkbenchCompilationArtifact = {
      path: "Web/[Draft]/route.ts",
      digest:
        "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      mediaType: "text/typescript",
      sizeBytes: 64,
    };
    const onInspectArtifact = vi.fn();
    renderSource({
      currentCompilation: compilation("succeeded", [
        webArtifact,
        bracketArtifact,
        apiArtifact,
      ]),
      onInspectArtifact,
    });
    const filter = inputLabelled("Filter source files");

    expect(filter.type).toBe("search");
    expect(filter.maxLength).toBe(120);
    changeInput(filter, "web/[");
    expect(
      Array.from(container.querySelectorAll("[data-source-path]")).map(
        (row) => (row as HTMLElement).dataset.sourcePath,
      ),
    ).toEqual(["Web/[Draft]/route.ts"]);
    expect(onInspectArtifact).not.toHaveBeenCalled();

    changeInput(filter, "not-registered");
    expect(container.querySelectorAll("[data-source-path]")).toHaveLength(0);
    expect(container.querySelector(".source-filter-status")?.textContent).toBe(
      "No source files match.",
    );
    expect(onInspectArtifact).not.toHaveBeenCalled();

    changeInput(filter, "");
    expect(
      Array.from(container.querySelectorAll("[data-source-path]")).map(
        (row) => (row as HTMLElement).dataset.sourcePath,
      ),
    ).toEqual(["Web/[Draft]/route.ts", "api/package.json", "web/app/page.tsx"]);

    changeInput(filter, "x".repeat(121));
    expect(filter.value).toBe("x".repeat(120));
    expect(onInspectArtifact).not.toHaveBeenCalled();
  });

  it("keeps both search controls labelled, source-scoped, and in keyboard order", () => {
    renderSource();
    const filter = inputLabelled("Filter source files");
    const find = inputLabelled("Find in current file");
    const firstArtifact = container.querySelector("[data-source-path]")!;
    const downstreamAction = container.querySelector(
      ".generated-preview-actions button",
    )!;

    expect(filter.id).not.toBe(find.id);
    expect(filter.type).toBe("search");
    expect(find.type).toBe("search");
    expect(filter.maxLength).toBe(120);
    expect(find.maxLength).toBe(120);
    expect(find.disabled).toBe(true);
    expect(
      filter.compareDocumentPosition(firstArtifact) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      firstArtifact.compareDocumentPosition(find) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      find.compareDocumentPosition(downstreamAction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it("finds case-insensitive literal non-overlapping matches in only the current verified file", () => {
    const content =
      'Alpha alpha ALPHA; literal .* then .*; <script id="source-hostile">script</script><img onerror="evil()">';
    const onInspectArtifact = vi.fn();
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
      onInspectArtifact,
    });
    const find = inputLabelled("Find in current file");
    const code = container.querySelector(".source-content-viewer code")!;

    expect(find.disabled).toBe(false);
    expect(code.textContent).toBe(content);
    expect(container.querySelector(".source-match-status")).toBeNull();

    changeInput(find, "alpha");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "3 matches.",
    );
    expect(
      container.querySelectorAll(".source-content-viewer mark"),
    ).toHaveLength(3);
    expect(code.textContent).toBe(content);

    changeInput(find, ".*");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "2 matches.",
    );
    expect(
      Array.from(container.querySelectorAll(".source-content-viewer mark")).map(
        (mark) => mark.textContent,
      ),
    ).toEqual([".*", ".*"]);

    changeInput(find, "script");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "3 matches.",
    );
    expect(code.textContent).toBe(content);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("#source-hostile")).toBeNull();
    expect(onInspectArtifact).not.toHaveBeenCalled();
  });

  it("reports fixed zero, singular, and exact non-overlapping match states", () => {
    const content = "aaaaa one";
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
    });
    const find = inputLabelled("Find in current file");

    changeInput(find, "missing");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "No matches.",
    );
    expect(container.querySelectorAll("mark")).toHaveLength(0);

    changeInput(find, "one");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "1 match.",
    );

    changeInput(find, "aa");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "2 matches.",
    );
    expect(container.querySelectorAll("mark")).toHaveLength(2);

    changeInput(find, "");
    expect(container.querySelector(".source-match-status")).toBeNull();
    expect(
      container.querySelector(".source-content-viewer code")?.textContent,
    ).toBe(content);
  });

  it("counts the full file, renders only the first 500 ranges, and clamps find to 120 UTF-16 code units", () => {
    const content = "a".repeat(601);
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
    });
    const find = inputLabelled("Find in current file");

    changeInput(find, "a");
    expect(container.querySelector(".source-match-status")?.textContent).toBe(
      "601 matches. Highlighting the first 500.",
    );
    expect(
      container.querySelectorAll(".source-content-viewer mark"),
    ).toHaveLength(500);
    expect(
      container.querySelector(".source-content-viewer code")?.textContent,
    ).toBe(content);

    changeInput(find, "😀".repeat(61));
    expect(find.value).toBe("😀".repeat(60));
    expect(find.value.length).toBe(120);
  });

  it("clears find when a new Compilation object replaces the current one with the same identity and descriptors", () => {
    const firstCompilation = compilation("succeeded");
    const replacementCompilation = compilation("succeeded");
    const exactSnapshot: WorkbenchArtifactContent = {
      path: webArtifact.path,
      digest: webArtifact.digest,
      content: "needle needle",
    };
    renderSource({
      currentCompilation: firstCompilation,
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });
    const find = inputLabelled("Find in current file");
    changeInput(find, "needle");
    expect(container.querySelectorAll("mark")).toHaveLength(2);
    expect(replacementCompilation).not.toBe(firstCompilation);
    expect(replacementCompilation.id).toBe(firstCompilation.id);

    renderSource({
      currentCompilation: replacementCompilation,
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });

    expect(inputLabelled("Find in current file").value).toBe("");
    expect(container.querySelectorAll("mark")).toHaveLength(0);
  });

  it("clears and disables find across selection, request, failure, descriptor, and Compilation invalidation", () => {
    const exactSnapshot: WorkbenchArtifactContent = {
      path: webArtifact.path,
      digest: webArtifact.digest,
      content: "needle needle",
    };
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });
    let find = inputLabelled("Find in current file");
    changeInput(find, "needle");
    expect(container.querySelectorAll("mark")).toHaveLength(2);

    renderSource({
      selectedArtifact: webArtifact,
      artifactLoading: true,
      artifactSnapshot: exactSnapshot,
    });
    find = inputLabelled("Find in current file");
    expect(find.disabled).toBe(true);
    expect(find.value).toBe("");
    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(container.querySelector(".source-content-viewer code")).toBeNull();

    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });
    find = inputLabelled("Find in current file");
    changeInput(find, "needle");
    renderSource({
      selectedArtifact: webArtifact,
      artifactError: "Generated artifact could not be inspected.",
    });
    find = inputLabelled("Find in current file");
    expect(find.disabled).toBe(true);
    expect(find.value).toBe("");

    renderSource({
      currentCompilation: compilation("succeeded", artifacts, "compilation-2"),
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });
    find = inputLabelled("Find in current file");
    changeInput(find, "needle");
    renderSource({
      currentCompilation: compilation("succeeded", artifacts, "compilation-3"),
      selectedArtifact: webArtifact,
      artifactSnapshot: exactSnapshot,
    });
    find = inputLabelled("Find in current file");
    expect(find.disabled).toBe(false);
    expect(find.value).toBe("");
    expect(container.querySelectorAll("mark")).toHaveLength(0);

    changeInput(find, "needle");
    renderSource({
      currentCompilation: compilation("succeeded", artifacts, "compilation-3"),
      selectedArtifact: apiArtifact,
      artifactSnapshot: {
        path: apiArtifact.path,
        digest: apiArtifact.digest,
        content: "needle",
      },
    });
    find = inputLabelled("Find in current file");
    expect(find.disabled).toBe(false);
    expect(find.value).toBe("");

    changeInput(find, "needle");
    renderSource({
      currentCompilation: compilation("queued", artifacts, "compilation-3"),
      selectedArtifact: apiArtifact,
      artifactSnapshot: {
        path: apiArtifact.path,
        digest: apiArtifact.digest,
        content: "needle",
      },
    });
    expect(
      Array.from(container.querySelectorAll("label")).some(
        (label) => label.textContent === "Find in current file",
      ),
    ).toBe(false);
    renderSource({
      currentCompilation: compilation("succeeded", artifacts, "compilation-3"),
      selectedArtifact: apiArtifact,
      artifactSnapshot: {
        path: apiArtifact.path,
        digest: apiArtifact.digest,
        content: "needle",
      },
    });
    find = inputLabelled("Find in current file");
    expect(find.disabled).toBe(false);
    expect(find.value).toBe("");
    expect(container.querySelectorAll("mark")).toHaveLength(0);
  });
});
