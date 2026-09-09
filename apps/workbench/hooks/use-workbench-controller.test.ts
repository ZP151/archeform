// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublishedGraphExchange } from "@factory/graph";

import { workbenchGraph } from "../lib/workbench-graph";

const mocks = vi.hoisted(() => ({
  journey: null as {
    applyProduct: ReturnType<typeof vi.fn>;
    reset?: ReturnType<typeof vi.fn>;
    state?: { review: { id: string } | null };
  } | null,
  openTemplateDraft: vi.fn(),
  bootstrapLocalDraft: vi.fn(),
  importPublishedGraph: vi.fn(),
}));

vi.mock("../lib/product-journey/use-product-journey", () => ({
  useProductJourney: () => mocks.journey,
}));

vi.mock("../lib/control-plane-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../lib/control-plane-client")>();
  class ControlPlaneClient {
    bootstrapLocalDraft = mocks.bootstrapLocalDraft;
    importPublishedGraph = mocks.importPublishedGraph;
    appendDraft = vi.fn(async () => ({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-manual-r3",
      revisionNumber: 3,
      graph: workbenchGraph,
    }));
    listLocalApplicationSummaries = vi.fn(async () => []);
    getWorkspacePortfolioSummary = vi.fn(async () => null);
    openTemplateDraft = mocks.openTemplateDraft;
    openLocalApplication = vi.fn(async () => ({
      draft: {
        applicationGraphId: "other",
        draftRevisionId: "draft-other",
        revisionNumber: 1,
        graph: workbenchGraph,
      },
      publishedRevision: null,
    }));
  }
  return { ...actual, ControlPlaneClient };
});

import type {
  WorkbenchDraft,
  WorkbenchProductApplied,
  WorkbenchTemplateDraftInstance,
} from "../lib/control-plane-client";
import {
  matchesAppliedTemplateDraft,
  useWorkbenchController,
  type WorkbenchController,
} from "./use-workbench-controller";

const applied = {
  applicationGraphId: "restaurant-ordering",
  revisionNumber: 2,
} as WorkbenchProductApplied;

function templateDraft(
  overrides: Partial<WorkbenchTemplateDraftInstance["draft"]> = {},
): WorkbenchTemplateDraftInstance {
  return {
    draft: {
      applicationGraphId: "restaurant-ordering",
      draftRevisionId: "draft-restaurant-r2",
      revisionNumber: 2,
      ...overrides,
    },
  } as WorkbenchTemplateDraftInstance;
}

describe("matchesAppliedTemplateDraft", () => {
  it("accepts only the exact V3 Draft identity returned by this apply result", () => {
    expect(matchesAppliedTemplateDraft(applied, templateDraft())).toBe(true);
    expect(
      matchesAppliedTemplateDraft(
        applied,
        templateDraft({
          draftRevisionId: "draft-restaurant-r3",
          revisionNumber: 3,
        }),
      ),
    ).toBe(false);
    expect(
      matchesAppliedTemplateDraft(
        applied,
        templateDraft({ applicationGraphId: "another-restaurant" }),
      ),
    ).toBe(false);
  });
});

describe("useWorkbenchController composed-product adoption", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  let controller: WorkbenchController | null = null;
  let rerender: (() => void) | null = null;

  beforeEach(() => {
    mocks.bootstrapLocalDraft.mockResolvedValue({
      applicationGraphId: "initial",
      draftRevisionId: "draft-initial",
      revisionNumber: 1,
      graph: workbenchGraph,
    });
  });

  afterEach(() => {
    if (root !== null) act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    controller = null;
    rerender = null;
    mocks.journey = null;
    mocks.openTemplateDraft.mockReset();
    mocks.bootstrapLocalDraft.mockReset();
    mocks.importPublishedGraph.mockReset();
    vi.useRealTimers();
  });

  function mount(): WorkbenchController {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    function Harness() {
      controller = useWorkbenchController({
        initialGraph: workbenchGraph,
        controlPlaneUrl: "http://control-plane.test",
      });
      return null;
    }
    act(() => root?.render(React.createElement(Harness)));
    rerender = () => act(() => root?.render(React.createElement(Harness)));
    if (controller === null) throw new Error("controller did not mount");
    return controller;
  }

  it("captures the exact applied V1 Draft while automatic delivery remains on Home", async () => {
    mocks.journey = {
      applyProduct: vi.fn().mockResolvedValue({
        applicationGraphId: "approval-application",
        revisionNumber: 2,
        graph: workbenchGraph,
      }),
    };
    mount();
    await act(async () => {
      await Promise.resolve();
    });
    mocks.bootstrapLocalDraft.mockResolvedValue({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
      revisionNumber: 2,
      graph: workbenchGraph,
    });
    let target: unknown;
    await act(async () => {
      target = await controller?.applyComposedProduct({ resetJourney: false });
    });
    expect(target).toEqual({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
    });
    expect(controller?.state.activeSurface).toBe("home");
    expect(controller?.remoteDraft?.draftRevisionId).toBe("draft-approval-r2");
  });

  it("does not adopt a late opened Draft after another application supersedes apply", async () => {
    let resolveApplied: ((value: WorkbenchProductApplied) => void) | undefined;
    let resolveOpened:
      ((value: WorkbenchTemplateDraftInstance) => void) | undefined;
    mocks.journey = {
      applyProduct: vi.fn(
        () =>
          new Promise<WorkbenchProductApplied>((resolve) => {
            resolveApplied = resolve;
          }),
      ),
    };
    mocks.openTemplateDraft.mockImplementation(
      () =>
        new Promise<WorkbenchTemplateDraftInstance>((resolve) => {
          resolveOpened = resolve;
        }),
    );
    const live = mount();
    const applying = live.applyComposedProduct({ resetJourney: false });
    await act(async () => {
      resolveApplied?.({
        ...applied,
        graph: {
          apiVersion: "factory.application-graph/v3",
          metadata: { id: "restaurant-ordering" },
        },
      } as unknown as WorkbenchProductApplied);
      await Promise.resolve();
    });
    act(() => controller?.openApplication("other"));
    await act(async () => {
      resolveOpened?.(templateDraft());
      await Promise.resolve();
    });

    await expect(applying).resolves.toBeNull();
    expect(controller?.templateDraft).toBeNull();
    expect(controller?.release.release).toMatchObject({
      applicationGraphId: "other",
      draftRevisionId: "draft-other",
    });
  });

  it.each(["other-application", "newer-revision", "failed-bootstrap"])(
    "refuses %s when opening the applied V1 Draft",
    async (fault) => {
      mocks.journey = {
        applyProduct: vi.fn().mockResolvedValue({
          applicationGraphId: "approval-application",
          revisionNumber: 2,
          graph: workbenchGraph,
        }),
      };
      mount();
      await act(async () => {
        await Promise.resolve();
      });
      if (fault === "failed-bootstrap")
        mocks.bootstrapLocalDraft.mockRejectedValue(new Error("Unavailable"));
      else
        mocks.bootstrapLocalDraft.mockResolvedValue({
          applicationGraphId:
            fault === "other-application" ? "other" : "approval-application",
          draftRevisionId: "draft-late",
          revisionNumber: fault === "newer-revision" ? 3 : 2,
          graph: workbenchGraph,
        });
      let target: unknown;
      await act(async () => {
        target = await controller?.applyComposedProduct({
          resetJourney: false,
        });
      });
      expect(target).toBeNull();
      expect(controller?.remoteDraft).toBeNull();
      expect(controller?.release.release).toBeNull();
      expect(controller?.state.activeSurface).toBe("home");
    },
  );

  it.each([
    "open",
    "start-over",
    "new-session",
    "unmount",
    "new-apply",
    "late-failure",
  ])(
    "refuses a late V1 bootstrap after %s without clearing a newer target",
    async (action) => {
      mocks.journey = {
        applyProduct: vi.fn().mockResolvedValue({
          applicationGraphId: "approval-application",
          revisionNumber: 2,
          graph: workbenchGraph,
        }),
        state: { review: { id: "review-approval" } },
      };
      mount();
      await act(async () => {
        await Promise.resolve();
      });
      let resolveDraft!: (draft: WorkbenchDraft) => void;
      let rejectDraft!: (error: Error) => void;
      mocks.bootstrapLocalDraft.mockImplementationOnce(
        () =>
          new Promise<WorkbenchDraft>((resolve, reject) => {
            resolveDraft = resolve;
            rejectDraft = reject;
          }),
      );
      let applying!: Promise<unknown>;
      await act(async () => {
        applying = controller!.applyComposedProduct({ resetJourney: false });
        await Promise.resolve();
      });
      await act(async () => {
        if (action === "open" || action === "late-failure")
          controller?.openApplication("other");
        if (action === "start-over") controller?.commandFocus();
        if (action === "new-session") {
          mocks.journey!.state = { review: { id: "review-new" } };
          rerender?.();
        }
        if (action === "unmount") {
          root?.unmount();
          root = null;
        }
        if (action === "new-apply") {
          mocks.bootstrapLocalDraft.mockResolvedValueOnce({
            applicationGraphId: "approval-application",
            draftRevisionId: "draft-newer-request",
            revisionNumber: 2,
            graph: workbenchGraph,
          });
          expect(
            await controller?.applyComposedProduct({ resetJourney: false }),
          ).toEqual({
            applicationGraphId: "approval-application",
            draftRevisionId: "draft-newer-request",
          });
        }
        await Promise.resolve();
      });
      await act(async () => {
        if (action === "late-failure")
          rejectDraft(new Error("Late bootstrap failure"));
        else
          resolveDraft({
            applicationGraphId: "approval-application",
            draftRevisionId: "draft-stale",
            revisionNumber: 2,
            graph: workbenchGraph,
          });
        await Promise.resolve();
      });
      await expect(applying).resolves.toBeNull();
      if (action === "open" || action === "late-failure") {
        expect(controller?.remoteDraft?.applicationGraphId).toBe("other");
        expect(controller?.release.release?.applicationGraphId).toBe("other");
        expect(controller?.operationError).toBeNull();
      } else if (action === "new-apply")
        expect(controller?.release.release?.draftRevisionId).toBe(
          "draft-newer-request",
        );
      else expect(controller?.remoteDraft).toBeNull();
    },
  );

  it("keeps manual V1 apply navigation in Page Studio", async () => {
    mocks.journey = {
      applyProduct: vi.fn().mockResolvedValue({
        applicationGraphId: "approval-application",
        revisionNumber: 2,
        graph: workbenchGraph,
      }),
      reset: vi.fn(),
    };
    mount();
    await act(async () => {
      await Promise.resolve();
    });
    mocks.bootstrapLocalDraft.mockResolvedValue({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
      revisionNumber: 2,
      graph: workbenchGraph,
    });
    await act(async () => {
      await controller?.applyComposedProduct();
    });
    expect(controller?.state.activeSurface).toBe("page");
    expect(mocks.journey.reset).toHaveBeenCalledTimes(1);
    await act(async () => {
      controller?.saveDraft();
      await Promise.resolve();
    });
    expect(controller?.remoteDraft?.draftRevisionId).toBe("draft-manual-r3");
    expect(controller?.release.release?.draftRevisionId).toBe(
      "draft-manual-r3",
    );
  });

  it("does not run a scheduled initial bootstrap retry over a newer applied Draft", async () => {
    vi.useFakeTimers();
    mocks.bootstrapLocalDraft.mockRejectedValueOnce(
      new Error("Control plane still booting"),
    );
    mocks.journey = {
      applyProduct: vi.fn().mockResolvedValue({
        applicationGraphId: "approval-application",
        revisionNumber: 2,
        graph: workbenchGraph,
      }),
    };
    mount();
    await act(async () => {
      await Promise.resolve();
    });
    mocks.bootstrapLocalDraft.mockResolvedValue({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
      revisionNumber: 2,
      graph: workbenchGraph,
    });
    await act(async () => {
      await controller?.applyComposedProduct({ resetJourney: false });
    });
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(mocks.bootstrapLocalDraft).toHaveBeenCalledTimes(2);
    expect(controller?.remoteDraft?.draftRevisionId).toBe("draft-approval-r2");
    expect(controller?.release.release?.draftRevisionId).toBe(
      "draft-approval-r2",
    );
  });

  const importedDraft: WorkbenchDraft = {
    applicationGraphId: "imported-application",
    draftRevisionId: "draft-imported-r1",
    revisionNumber: 1,
    graph: workbenchGraph,
  };
  const exchangeText = () =>
    JSON.stringify(createPublishedGraphExchange(workbenchGraph, 4));
  const exchangeFile = () =>
    new File([exchangeText()], "published.factory-graph.json", {
      type: "application/json",
    });

  it("invalidates a pending consumer apply as soon as import starts", async () => {
    let resolveApply!: (value: WorkbenchProductApplied) => void;
    mocks.journey = {
      applyProduct: vi.fn(
        () =>
          new Promise<WorkbenchProductApplied>((resolve) => {
            resolveApply = resolve;
          }),
      ),
    };
    mount();
    await act(async () => {
      await Promise.resolve();
    });
    let applying!: Promise<unknown>;
    await act(async () => {
      applying = controller!.applyComposedProduct({ resetJourney: false });
    });
    const file = exchangeFile();
    let resolveText!: (text: string) => void;
    vi.spyOn(file, "text").mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveText = resolve;
        }),
    );
    mocks.importPublishedGraph.mockResolvedValue(importedDraft);
    await act(async () => {
      controller?.importPublishedGraph(file);
    });
    const bootstrapCalls = mocks.bootstrapLocalDraft.mock.calls.length;
    await act(async () => {
      resolveApply({
        applicationGraphId: "approval-application",
        revisionNumber: 2,
        reviewStatus: "applied",
        graph: workbenchGraph,
      });
      await Promise.resolve();
    });
    await expect(applying).resolves.toBeNull();
    expect(mocks.bootstrapLocalDraft).toHaveBeenCalledTimes(bootstrapCalls);
    await act(async () => {
      resolveText(exchangeText());
      await Promise.resolve();
    });
    expect(controller?.remoteDraft?.applicationGraphId).toBe(
      "imported-application",
    );
  });

  it("cancels an active consumer target before importing and releases only the imported Draft afterward", async () => {
    mocks.journey = {
      applyProduct: vi.fn().mockResolvedValue({
        applicationGraphId: "approval-application",
        revisionNumber: 2,
        graph: workbenchGraph,
      }),
    };
    mount();
    await act(async () => {
      await Promise.resolve();
    });
    mocks.bootstrapLocalDraft.mockResolvedValue({
      applicationGraphId: "approval-application",
      draftRevisionId: "draft-approval-r2",
      revisionNumber: 2,
      graph: workbenchGraph,
    });
    await act(async () => {
      await controller?.applyComposedProduct({ resetJourney: false });
    });
    expect(controller?.release.release?.draftRevisionId).toBe(
      "draft-approval-r2",
    );
    let resolveImport!: (draft: WorkbenchDraft) => void;
    mocks.importPublishedGraph.mockImplementation(
      () =>
        new Promise<WorkbenchDraft>((resolve) => {
          resolveImport = resolve;
        }),
    );
    await act(async () => {
      controller?.importPublishedGraph(exchangeFile());
    });
    expect(controller?.release.release).toBeNull();
    await act(async () => {
      resolveImport(importedDraft);
      await Promise.resolve();
    });
    expect(controller?.release.release?.applicationGraphId).toBe(
      "imported-application",
    );
    expect(controller?.release.release?.draftRevisionId).toBe(
      "draft-imported-r1",
    );
  });

  it.each([
    ["file", "open"],
    ["file", "apply"],
    ["file", "unmount"],
    ["response", "open"],
    ["response", "apply"],
    ["response", "unmount"],
  ] as const)(
    "refuses an obsolete import %s after %s",
    async (phase, action) => {
      mocks.journey = {
        applyProduct: vi.fn().mockResolvedValue({
          applicationGraphId: "approval-application",
          revisionNumber: 2,
          graph: workbenchGraph,
        }),
      };
      mount();
      await act(async () => {
        await Promise.resolve();
      });
      const file = exchangeFile();
      let resolveText!: (text: string) => void;
      let resolveImport!: (draft: WorkbenchDraft) => void;
      if (phase === "file") {
        vi.spyOn(file, "text").mockImplementation(
          () =>
            new Promise<string>((resolve) => {
              resolveText = resolve;
            }),
        );
        mocks.importPublishedGraph.mockResolvedValue(importedDraft);
      } else
        mocks.importPublishedGraph.mockImplementation(
          () =>
            new Promise<WorkbenchDraft>((resolve) => {
              resolveImport = resolve;
            }),
        );
      await act(async () => {
        controller?.importPublishedGraph(file);
      });
      await act(async () => {
        if (action === "open") controller?.openApplication("other");
        if (action === "apply") {
          mocks.bootstrapLocalDraft.mockResolvedValue({
            applicationGraphId: "approval-application",
            draftRevisionId: "draft-newer-request",
            revisionNumber: 2,
            graph: workbenchGraph,
          });
          await controller?.applyComposedProduct({ resetJourney: false });
        }
        if (action === "unmount") {
          root?.unmount();
          root = null;
        }
        await Promise.resolve();
      });
      const latestDraft = controller?.remoteDraft;
      await act(async () => {
        if (phase === "file") resolveText(exchangeText());
        else resolveImport(importedDraft);
        await Promise.resolve();
      });
      if (phase === "file")
        expect(mocks.importPublishedGraph).not.toHaveBeenCalled();
      expect(controller?.remoteDraft).toEqual(latestDraft);
      expect(controller?.operationError).toBeNull();
      expect(controller?.exchangeStatus).not.toContain("Imported as Draft");
    },
  );

  it.each(["file", "response"] as const)(
    "ignores a late import %s failure after another application opens",
    async (phase) => {
      mocks.journey = { applyProduct: vi.fn() };
      mount();
      await act(async () => {
        await Promise.resolve();
      });
      const file = exchangeFile();
      let rejectImport!: (error: Error) => void;
      if (phase === "file")
        vi.spyOn(file, "text").mockImplementation(
          () =>
            new Promise<string>((_resolve, reject) => {
              rejectImport = reject;
            }),
        );
      else
        mocks.importPublishedGraph.mockImplementation(
          () =>
            new Promise<WorkbenchDraft>((_resolve, reject) => {
              rejectImport = reject;
            }),
        );
      await act(async () => {
        controller?.importPublishedGraph(file);
      });
      await act(async () => {
        controller?.openApplication("other");
        await Promise.resolve();
      });
      const currentStatus = controller?.exchangeStatus;
      await act(async () => {
        rejectImport(new Error("Obsolete import failure"));
        await Promise.resolve();
      });
      expect(controller?.remoteDraft?.applicationGraphId).toBe("other");
      expect(controller?.operationError).toBeNull();
      expect(controller?.exchangeStatus).toBe(currentStatus);
    },
  );
});
