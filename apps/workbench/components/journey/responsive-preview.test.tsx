// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperienceModel, PageModel } from "@factory/graph";

import { ResponsivePreview } from "./responsive-preview";

const page: PageModel["pages"][number] = {
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
};

const experience: ExperienceModel = {
  theme: { mode: "system", tokens: {} },
  locales: ["en"],
  designSystem: {
    apiVersion: "factory.experience-design-system/v1",
    tokens: {
      colour: {
        light: { brand: "#0d6e5b", background: "#f6f7f5" },
        dark: { brand: "#4fc3a1", background: "#101613" },
      },
      typography: {},
      spacing: {},
      radius: {},
      elevation: {},
      motion: {},
    },
    selection: { shell: "sidebar", density: "standard", pageLayouts: {} },
    components: { button: "primary" },
    states: ["focus"],
  },
};

describe("ResponsivePreview", () => {
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
    act(() => {
      root.render(<ResponsivePreview page={page} experience={experience} />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the selected page's blocks with route and viewport controls", () => {
    expect(
      container.querySelector(".responsive-preview-heading small")?.textContent,
    ).toBe("/");
    expect(container.querySelector(".generated-hero h1")?.textContent).toBe(
      "Shape the next decision.",
    );
    expect(container.querySelector(".generated-block h2")?.textContent).toBe(
      "Expense stats",
    );
    const viewports = [
      ...container.querySelectorAll(".preview-viewports button"),
    ];
    expect(viewports.map((button) => button.textContent)).toEqual([
      expect.stringContaining("Desktop"),
      expect.stringContaining("Tablet"),
      expect.stringContaining("Mobile"),
    ]);
    expect(
      container.querySelector('.preview-viewports button[aria-pressed="true"]')
        ?.textContent,
    ).toContain("Desktop");
  });

  it("switches the preview stage to the chosen viewport", () => {
    const stage = container.querySelector(".preview-stage") as HTMLElement;
    expect(stage.style.maxWidth).toBe("1280px");
    const tablet = [
      ...container.querySelectorAll(".preview-viewports button"),
    ][1];
    act(() => {
      (tablet as HTMLButtonElement).click();
    });
    expect(stage.style.maxWidth).toBe("768px");
    expect(
      container.querySelector('.preview-viewports button[aria-pressed="true"]')
        ?.textContent,
    ).toContain("Tablet");
  });

  it("emits the resolved design tokens as factory variables", () => {
    const style = container.querySelector(".responsive-preview style");
    expect(style?.textContent).toContain("--factory-colour-brand: #0d6e5b;");
    expect(style?.textContent).toContain(
      "--factory-colour-background: #f6f7f5;",
    );
    expect(style?.textContent).toContain(':root[data-theme="dark"] {');
    expect(style?.textContent).toContain("--factory-colour-brand: #4fc3a1;");
    expect(style?.textContent).toContain(
      "--factory-accent: var(--factory-colour-brand);",
    );
  });
});
