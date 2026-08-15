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
    onDownloadSourceArchive = vi.fn(),
  }: {
    currentCompilation?: WorkbenchCompilation | null;
    selectedArtifact?: WorkbenchCompilationArtifact | null;
    artifactLoading?: boolean;
    artifactSnapshot?: WorkbenchArtifactContent | null;
    artifactError?: string | null;
    onInspectArtifact?: (path: string) => void;
    onDownloadSourceArchive?: (format: "zip" | "git") => void;
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
          onDownloadSourceArchive={onDownloadSourceArchive}
          onOpenPreview={vi.fn()}
          onStartPreview={vi.fn()}
          onStopPreview={vi.fn()}
          previewRun={null}
          publishedRevision={null}
          selectedArtifact={selectedArtifact}
        />,
      );
    });
    return { onInspectArtifact, onDownloadSourceArchive };
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

  function buttonLabelled(labelText: string) {
    const button = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((candidate) => candidate.textContent === labelText);
    expect(button, `button ${labelText}`).toBeDefined();
    return button!;
  }

  function transferStatus() {
    return (
      container.querySelector(".source-transfer-status")?.textContent ?? null
    );
  }

  function deferred() {
    let resolve!: () => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, reject, resolve };
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
      expect(
        Array.from(container.querySelectorAll("button")).some(
          (button) => button.textContent === "Copy current file",
        ),
      ).toBe(false);
      expect(
        Array.from(container.querySelectorAll("button")).some(
          (button) => button.textContent === "Download current file",
        ),
      ).toBe(false);
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

  it.each([
    {
      label: "no selection",
      selected: null,
      loading: false,
      error: null,
      snapshot: null,
    },
    {
      label: "selection pending",
      selected: webArtifact,
      loading: true,
      error: null,
      snapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content: "stale content",
      },
    },
    {
      label: "artifact failure",
      selected: webArtifact,
      loading: false,
      error: "Generated artifact could not be inspected.",
      snapshot: null,
    },
    {
      label: "null content",
      selected: webArtifact,
      loading: false,
      error: null,
      snapshot: null,
    },
    {
      label: "mismatched path",
      selected: webArtifact,
      loading: false,
      error: null,
      snapshot: {
        path: apiArtifact.path,
        digest: webArtifact.digest,
        content: "wrong path",
      },
    },
    {
      label: "mismatched digest",
      selected: webArtifact,
      loading: false,
      error: null,
      snapshot: {
        path: webArtifact.path,
        digest: apiArtifact.digest,
        content: "wrong digest",
      },
    },
  ])("keeps verified transfer disabled for $label", (testCase) => {
    renderSource({
      artifactError: testCase.error,
      artifactLoading: testCase.loading,
      artifactSnapshot: testCase.snapshot,
      selectedArtifact: testCase.selected,
    });

    expect(buttonLabelled("Copy current file").disabled).toBe(true);
    expect(buttonLabelled("Download current file").disabled).toBe(true);
    expect(transferStatus()).toBeNull();
  });

  it("enables native transfer actions only for current verified content without inspecting another artifact", () => {
    const onInspectArtifact = vi.fn();
    renderSource({ onInspectArtifact });
    expect(buttonLabelled("Copy current file").disabled).toBe(true);
    expect(buttonLabelled("Download current file").disabled).toBe(true);

    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content: "verified content",
      },
      onInspectArtifact,
    });

    const copy = buttonLabelled("Copy current file");
    const download = buttonLabelled("Download current file");
    expect(copy.disabled).toBe(false);
    expect(download.disabled).toBe(false);
    expect(copy.type).toBe("button");
    expect(download.type).toBe("button");
    expect(copy.closest(".source-transfer-actions")).not.toBeNull();
    expect(copy.closest(".source-content-heading")).toBe(
      download.closest(".source-content-heading"),
    );
    expect(onInspectArtifact).not.toHaveBeenCalled();
  });

  it("copies exact verified content once, blocks both actions while pending, and preserves search state", async () => {
    const gate = deferred();
    const writeText = vi.fn(() => gate.promise);
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:should-not-download");
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const content = '  café 😀\n<script id="source-hostile">SCRIPT</script>\n';
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
    const filter = inputLabelled("Filter source files");
    const find = inputLabelled("Find in current file");
    changeInput(filter, "WEB/APP");
    changeInput(find, "script");
    const copy = buttonLabelled("Copy current file");
    const download = buttonLabelled("Download current file");

    act(() => {
      copy.click();
      copy.click();
      download.click();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(content);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(copy.disabled).toBe(true);
    expect(download.disabled).toBe(true);
    expect(transferStatus()).toBe("Copying current file…");
    const status = container.querySelector(".source-transfer-status");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });

    expect(transferStatus()).toBe("Copied current file.");
    expect(copy.disabled).toBe(false);
    expect(download.disabled).toBe(false);
    expect(filter.value).toBe("WEB/APP");
    expect(find.value).toBe("script");
    expect(
      container.querySelectorAll(".source-content-viewer mark"),
    ).toHaveLength(3);
    expect(
      container.querySelector(".source-content-viewer code")?.textContent,
    ).toBe(content);
    expect(onInspectArtifact).not.toHaveBeenCalled();
  });

  it("uses only the fixed clipboard failure while preserving verified source and highlights", async () => {
    const gate = deferred();
    const writeText = vi.fn(() => gate.promise);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const content = "needle <script>needle</script>";
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
    });
    const find = inputLabelled("Find in current file");
    changeInput(find, "needle");
    act(() => buttonLabelled("Copy current file").click());
    expect(transferStatus()).toBe("Copying current file…");

    await act(async () => {
      gate.reject(new Error("HOSTILE_CLIPBOARD_DETAIL"));
      await gate.promise.catch(() => undefined);
    });

    expect(transferStatus()).toBe("Current file could not be copied.");
    expect(container.textContent).not.toContain("HOSTILE_CLIPBOARD_DETAIL");
    expect(
      container.querySelector(".source-content-viewer code")?.textContent,
    ).toBe(content);
    expect(
      container.querySelectorAll(".source-content-viewer mark"),
    ).toHaveLength(2);
  });

  it.each(["resolve", "reject"])(
    "suppresses a stale clipboard %s after selecting a new artifact",
    async (settlement) => {
      const gate = deferred();
      const writeText = vi.fn(() => gate.promise);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      const currentCompilation = compilation("succeeded");
      const onInspectArtifact = vi.fn();
      const content = "exact source A";
      renderSource({
        currentCompilation,
        selectedArtifact: webArtifact,
        artifactSnapshot: {
          path: webArtifact.path,
          digest: webArtifact.digest,
          content,
        },
        onInspectArtifact,
      });
      act(() => buttonLabelled("Copy current file").click());
      expect(transferStatus()).toBe("Copying current file…");

      act(() =>
        container
          .querySelector<HTMLButtonElement>(
            `[data-source-path="${apiArtifact.path}"]`,
          )
          ?.click(),
      );

      expect(onInspectArtifact).toHaveBeenCalledTimes(1);
      expect(onInspectArtifact).toHaveBeenCalledWith(apiArtifact.path);
      expect(transferStatus()).toBeNull();
      expect(buttonLabelled("Copy current file").disabled).toBe(true);
      expect(buttonLabelled("Download current file").disabled).toBe(true);
      renderSource({
        currentCompilation,
        selectedArtifact: apiArtifact,
        artifactLoading: true,
        artifactSnapshot: null,
        onInspectArtifact,
      });

      await act(async () => {
        if (settlement === "resolve") gate.resolve();
        else gate.reject(new Error("HOSTILE_STALE_CLIPBOARD_DETAIL"));
        await gate.promise.catch(() => undefined);
      });

      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(content);
      expect(transferStatus()).toBeNull();
      expect(container.textContent).not.toContain(
        "HOSTILE_STALE_CLIPBOARD_DETAIL",
      );
      renderSource({
        currentCompilation,
        selectedArtifact: apiArtifact,
        artifactSnapshot: {
          path: apiArtifact.path,
          digest: apiArtifact.digest,
          content: "exact source B",
        },
        onInspectArtifact,
      });
      expect(buttonLabelled("Copy current file").disabled).toBe(false);
      expect(buttonLabelled("Download current file").disabled).toBe(false);
      expect(transferStatus()).toBeNull();
    },
  );

  it.each([
    {
      label: "same-id Compilation replacement",
      next: () => ({
        currentCompilation: compilation("succeeded"),
        selectedArtifact: webArtifact,
        artifactLoading: false,
        artifactSnapshot: {
          path: webArtifact.path,
          digest: webArtifact.digest,
          content: "verified content",
        },
        artifactError: null,
      }),
      expectsActions: true,
    },
    {
      label: "selection pending",
      next: () => ({
        currentCompilation: compilation("succeeded"),
        selectedArtifact: webArtifact,
        artifactLoading: true,
        artifactSnapshot: null,
        artifactError: null,
      }),
      expectsActions: false,
    },
    {
      label: "selection failure",
      next: () => ({
        currentCompilation: compilation("succeeded"),
        selectedArtifact: webArtifact,
        artifactLoading: false,
        artifactSnapshot: null,
        artifactError: "Generated artifact could not be inspected.",
      }),
      expectsActions: false,
    },
  ])(
    "clears completed transfer state on $label",
    async ({ next, expectsActions }) => {
      vi.stubGlobal("navigator", {
        clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      });
      renderSource({
        currentCompilation: compilation("succeeded"),
        selectedArtifact: webArtifact,
        artifactSnapshot: {
          path: webArtifact.path,
          digest: webArtifact.digest,
          content: "verified content",
        },
      });
      await act(async () => {
        buttonLabelled("Copy current file").click();
        await Promise.resolve();
      });
      expect(transferStatus()).toBe("Copied current file.");

      renderSource(next());

      expect(transferStatus()).toBeNull();
      expect(buttonLabelled("Copy current file").disabled).toBe(
        !expectsActions,
      );
      expect(buttonLabelled("Download current file").disabled).toBe(
        !expectsActions,
      );
    },
  );

  it.each([
    ["web/app/page.tsx", "page.tsx"],
    ["web/report<final>?.tsx", "report_final__.tsx"],
    ["web/a\u0000b\u001fc\u007fd.ts", "a_b_c_d.ts"],
    ['web/a<b>c:d"e\\f|g?h*i.ts', "a_b_c_d_e_f_g_h_i.ts"],
    ["web/report.txt.  ", "report.txt"],
    ["web/...", "source.txt"],
    ["web/", "source.txt"],
    ["api/CON.json", "_CON.json"],
    ["api/lpt9.TXT", "_lpt9.TXT"],
    ["api/COM10.txt", "COM10.txt"],
  ])("uses safe download basename %s -> %s", (path, expectedFilename) => {
    const artifact = { ...webArtifact, path };
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:verified-source");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    let clickedDownload: string | null = null;
    let clickedHref: string | null = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
        clickedHref = this.href;
      });
    renderSource({
      currentCompilation: compilation("succeeded", [artifact]),
      selectedArtifact: artifact,
      artifactSnapshot: {
        path,
        digest: artifact.digest,
        content: "verified bytes",
      },
    });

    act(() => buttonLabelled("Download current file").click());

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(clickedDownload).toBe(expectedFilename);
    expect(clickedHref).toBe("blob:verified-source");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:verified-source");
    expect(transferStatus()).toBe("Download started.");
  });

  it("downloads one exact UTF-8 application/octet-stream Blob and preserves current find/filter state", async () => {
    const content = " \u0000café 😀\n<script>needle</script>\n ";
    const onInspectArtifact = vi.fn();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:exact-source");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    let clickedDownload: string | null = null;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
      });
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content,
      },
      onInspectArtifact,
    });
    const filter = inputLabelled("Filter source files");
    const find = inputLabelled("Find in current file");
    changeInput(filter, "WEB/APP");
    changeInput(find, "needle");

    act(() => buttonLabelled("Download current file").click());

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error("expected source Blob");
    expect(blob.type).toBe("application/octet-stream");
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(
      Array.from(new TextEncoder().encode(content)),
    );
    expect(click).toHaveBeenCalledTimes(1);
    expect(clickedDownload).toBe("page.tsx");
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exact-source");
    expect(transferStatus()).toBe("Download started.");
    expect(filter.value).toBe("WEB/APP");
    expect(find.value).toBe("needle");
    expect(
      container.querySelectorAll(".source-content-viewer mark"),
    ).toHaveLength(1);
    expect(
      container.querySelector(".source-content-viewer code")?.textContent,
    ).toBe(content);
    expect(onInspectArtifact).not.toHaveBeenCalled();
  });

  it("uses a fixed download failure and no revoke when Object URL creation fails", () => {
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation(() => {
        throw new Error("HOSTILE_CREATE_URL_DETAIL");
      });
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content: "verified content",
      },
    });

    act(() => buttonLabelled("Download current file").click());

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(transferStatus()).toBe("Current file could not be downloaded.");
    expect(container.textContent).not.toContain("HOSTILE_CREATE_URL_DETAIL");
  });

  it("revokes a created Object URL once when the local download click fails", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:click-failure");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("HOSTILE_DOWNLOAD_CLICK_DETAIL");
    });
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content: "verified content",
      },
    });

    act(() => buttonLabelled("Download current file").click());

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:click-failure");
    expect(transferStatus()).toBe("Current file could not be downloaded.");
    expect(container.textContent).not.toContain(
      "HOSTILE_DOWNLOAD_CLICK_DETAIL",
    );
  });

  it("keeps successful fixed download state when Object URL revoke itself fails", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:revoke-failure");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {
        throw new Error("HOSTILE_REVOKE_DETAIL");
      });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
    renderSource({
      selectedArtifact: webArtifact,
      artifactSnapshot: {
        path: webArtifact.path,
        digest: webArtifact.digest,
        content: "verified content",
      },
    });

    act(() => buttonLabelled("Download current file").click());

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(transferStatus()).toBe("Download started.");
    expect(container.textContent).not.toContain("HOSTILE_REVOKE_DETAIL");
  });

  it("downloads the source archive for a succeeded Compilation", () => {
    const { onDownloadSourceArchive } = renderSource({
      currentCompilation: compilation("succeeded"),
    });

    const zip = buttonLabelled("Download source ZIP");
    const git = buttonLabelled("Download source Git export");
    expect(zip.disabled).toBe(false);
    expect(git.disabled).toBe(false);

    act(() => zip.click());
    act(() => git.click());

    expect(onDownloadSourceArchive).toHaveBeenNthCalledWith(1, "zip");
    expect(onDownloadSourceArchive).toHaveBeenNthCalledWith(2, "git");
  });

  it("omits source archive download without a succeeded Compilation", () => {
    renderSource({ currentCompilation: null });

    expect(container.textContent).not.toContain("Download source ZIP");
    expect(container.textContent).not.toContain("Download source Git export");
  });
});
