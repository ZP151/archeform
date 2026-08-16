// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PageModel } from "@factory/graph";

import { PageTree } from "./page-tree";

const pageModel: PageModel = {
  pages: [
    {
      id: "dashboard",
      route: "/",
      title: "Dashboard",
      blocks: [{ id: "hero-1", type: "hero", props: { heading: "Hi" } }],
    },
    {
      id: "detail",
      route: "/detail",
      title: "Detail",
      blocks: [{ id: "detail-1", type: "detail" }],
    },
  ],
  navigation: [
    { id: "nav-dashboard", pageId: "dashboard", label: "Dashboard" },
    { id: "nav-detail", pageId: "detail", label: "Detail" },
  ],
};

describe("PageTree", () => {
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

  function render(props: {
    selectedPageId?: string;
    onSelect?: (pageId: string) => void;
    onMove?: (pageId: string, direction: -1 | 1) => void;
    onAddPage?: (title: string) => void;
    addError?: string | null;
  }) {
    const onSelect = props.onSelect ?? vi.fn();
    const onMove = props.onMove ?? vi.fn();
    const onAddPage = props.onAddPage ?? vi.fn();
    act(() => {
      root.render(
        <PageTree
          pageModel={pageModel}
          selectedPageId={props.selectedPageId ?? "dashboard"}
          onSelect={onSelect}
          onMove={onMove}
          onAddPage={onAddPage}
          addError={props.addError ?? null}
        />,
      );
    });
    return { onSelect, onMove, onAddPage };
  }

  it("lists every generated page with its route", () => {
    render({});
    const items = [...container.querySelectorAll(".page-tree-item")];
    expect(items.map((item) => item.textContent)).toEqual([
      "Dashboard/",
      "Detail/detail",
    ]);
    const active = container.querySelector(
      '.page-tree-item[aria-current="page"]',
    );
    expect(active?.textContent).toContain("Dashboard");
  });

  it("selects a page and moves it within the declared order", () => {
    const { onSelect, onMove } = render({});
    const items = [...container.querySelectorAll(".page-tree-item")];
    act(() => {
      (items[1] as HTMLButtonElement).click();
    });
    expect(onSelect).toHaveBeenCalledWith("detail");

    const down = container.querySelector(
      'button[aria-label="Move Dashboard down"]',
    ) as HTMLButtonElement;
    expect(down.disabled).toBe(false);
    act(() => {
      down.click();
    });
    expect(onMove).toHaveBeenCalledWith("dashboard", 1);

    const up = container.querySelector(
      'button[aria-label="Move Dashboard up"]',
    ) as HTMLButtonElement;
    expect(up.disabled).toBe(true);
  });

  it("adds a page from the tree input", () => {
    const { onAddPage } = render({});
    const input = container.querySelector(
      'input[aria-label="New page title"]',
    ) as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set;
      setter!.call(input, "Order tracking");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector(".page-tree-add")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    expect(onAddPage).toHaveBeenCalledWith("Order tracking");
    expect(input.value).toBe("");
  });

  it("surfaces add errors without persisting them", () => {
    render({ addError: "Page title needs at least one letter or number." });
    expect(container.querySelector(".page-tree-error")?.textContent).toContain(
      "needs at least one letter",
    );
  });
});
