// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperienceModel, PageModel } from "@factory/graph";

import { ProductStudio } from "./product-studio";

// Puck's editor shell (dnd, portals, observers) is not a happy-dom target;
// the mock records the selected page and its data so the Studio wiring —
// tree selection, page edits, design edits — stays under test.
vi.mock("@puckeditor/core", () => ({
  Puck: ({
    data,
    headerTitle,
  }: {
    data: { content: readonly { type: string }[] };
    headerTitle: string;
  }) => (
    <div data-testid="puck">
      <span>{headerTitle}</span>
      <span>{data.content.map((block) => block.type).join(",")}</span>
      <select className="_ViewportControls-zoomSelect_test">
        <option value="0.25">25% (Auto)</option>
      </select>
    </div>
  ),
}));

const page: PageModel = {
  pages: [
    {
      id: "expense-dashboard",
      route: "/",
      title: "Dashboard",
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          props: { eyebrow: "Operations", heading: "Shape the next decision." },
        },
        {
          id: "stats-1",
          type: "stats",
          entity: "expense",
          props: { title: "Expense stats" },
        },
      ],
    },
    {
      id: "expense-list",
      route: "/expenses",
      title: "Expenses",
      blocks: [
        {
          id: "list-1",
          type: "list",
          entity: "expense",
          props: { title: "Expenses" },
        },
      ],
    },
  ],
  navigation: [
    { id: "nav-dashboard", pageId: "expense-dashboard", label: "Dashboard" },
    { id: "nav-list", pageId: "expense-list", label: "Expenses" },
  ],
};

const experience: ExperienceModel = {
  theme: { mode: "system", tokens: {} },
  locales: ["en"],
};

describe("ProductStudio", () => {
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

  function Harness(props: {
    onPageModelChange?: (page: PageModel) => void;
    onExperienceModelChange?: (experience: ExperienceModel) => void;
  }) {
    const [currentPage, setCurrentPage] = React.useState(page);
    const [currentExperience, setCurrentExperience] =
      React.useState(experience);
    return (
      <ProductStudio
        page={currentPage}
        experience={currentExperience}
        entityKeys={["expense", "employee"]}
        onPageModelChange={(next) => {
          setCurrentPage(next);
          props.onPageModelChange?.(next);
        }}
        onExperienceModelChange={(next) => {
          setCurrentExperience(next);
          props.onExperienceModelChange?.(next);
        }}
      />
    );
  }

  function render(props: {
    onPageModelChange?: (page: PageModel) => void;
    onExperienceModelChange?: (experience: ExperienceModel) => void;
  }) {
    const onPageModelChange = props.onPageModelChange ?? vi.fn();
    const onExperienceModelChange = props.onExperienceModelChange ?? vi.fn();
    act(() => {
      root.render(
        <Harness
          onPageModelChange={onPageModelChange}
          onExperienceModelChange={onExperienceModelChange}
        />,
      );
    });
    return { onPageModelChange, onExperienceModelChange };
  }

  it("renders the page tree, the Puck canvas, and the responsive preview", () => {
    render({});
    expect(container.querySelector(".page-tree")).not.toBeNull();
    expect(
      container.querySelector('[data-testid="puck"]')?.textContent,
    ).toContain("Dashboard");
    expect(container.querySelector(".responsive-preview")).not.toBeNull();
    expect(
      container.querySelector(".preview-viewports button")?.textContent,
    ).toContain("Desktop");
  });

  it("gives the embedded Puck viewport zoom selector an accessible name", () => {
    render({});
    expect(
      container
        .querySelector('select[class*="_ViewportControls-zoomSelect_"]')
        ?.getAttribute("aria-label"),
    ).toBe("Viewport zoom");
  });

  it("loads the selected page into Puck and updates the preview route", () => {
    render({});
    const items = [...container.querySelectorAll(".page-tree-item")];
    act(() => {
      (items[1] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="puck"]')?.textContent,
    ).toContain("Expenses");
    expect(
      container.querySelector(".responsive-preview-heading small")?.textContent,
    ).toBe("/expenses");
  });

  it("reorders a page through the constrained binding", () => {
    const { onPageModelChange } = render({});
    act(() => {
      (
        container.querySelector(
          'button[aria-label="Move Dashboard down"]',
        ) as HTMLButtonElement
      ).click();
    });
    expect(onPageModelChange).toHaveBeenCalledTimes(1);
    const reordered = (onPageModelChange as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as PageModel;
    expect(reordered.pages.map((entry) => entry.id)).toEqual([
      "expense-list",
      "expense-dashboard",
    ]);
  });

  it("adds a page with a constrained hero and selects it", () => {
    const { onPageModelChange } = render({});
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
    expect(onPageModelChange).toHaveBeenCalledTimes(1);
    const next = (onPageModelChange as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as PageModel;
    expect(next.pages.map((entry) => entry.id)).toContain(
      "order-tracking-page",
    );
    const added = next.pages.find(
      (entry) => entry.id === "order-tracking-page",
    );
    expect(added?.route).toBe("/order-tracking");
    expect(added?.blocks[0]).toMatchObject({
      type: "hero",
      props: { eyebrow: "New route", heading: "Order tracking" },
    });
    expect(next.navigation).toContainEqual(
      expect.objectContaining({
        pageId: "order-tracking-page",
        label: "Order tracking",
      }),
    );
    expect(
      container.querySelector('[data-testid="puck"]')?.textContent,
    ).toContain("Order tracking");
  });
});
