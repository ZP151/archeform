// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { workbenchGraph } from "../lib/workbench-graph";

const mocks = vi.hoisted(() => ({
  journey: null as { applyProduct: ReturnType<typeof vi.fn> } | null,
  openTemplateDraft: vi.fn(),
}));

vi.mock("../lib/product-journey/use-product-journey", () => ({
  useProductJourney: () => mocks.journey,
}));

vi.mock("../lib/control-plane-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../lib/control-plane-client")>();
  class ControlPlaneClient {
    bootstrapLocalDraft = vi.fn(async () => ({
      applicationGraphId: "initial",
      draftRevisionId: "draft-initial",
      revisionNumber: 1,
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

  afterEach(() => {
    if (root !== null) act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    controller = null;
    mocks.journey = null;
    mocks.openTemplateDraft.mockReset();
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
    if (controller === null) throw new Error("controller did not mount");
    return controller;
  }

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
    controller?.openApplication("other");
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
});
