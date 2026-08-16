import { describe, expect, it } from "vitest";

import {
  findUiPattern,
  uiPatternRegistry,
  validateUiPatternRegistry,
} from "../src/index.js";

describe("UI pattern registry", () => {
  it("provides each frozen reusable interaction pattern exactly once", () => {
    expect(uiPatternRegistry.map((item) => item.key)).toEqual([
      "bottom-tab-navigation",
      "compact-sidebar-navigation",
      "form-field",
      "confirmation-dialog",
      "data-table",
      "loading-state",
      "empty-state",
      "validation-state",
      "error-state",
      "confirmation-state",
      "denial-state",
    ]);
    expect(new Set(uiPatternRegistry.map((item) => item.key)).size).toBe(11);
  });

  it("declares semantic slots, primitive nesting, and keyboard behavior", () => {
    const navigation = findUiPattern("bottom-tab-navigation");
    expect(navigation.slots).toEqual(["items"]);
    expect(navigation.primitives).toContain("button");
    expect(navigation.accessibility.keyboard).toContain("ArrowLeft");
    expect(navigation.fixture.state).toBe("confirmation");
  });

  it("rejects unknown primitive nesting and style-only duplicates", () => {
    expect(() =>
      validateUiPatternRegistry([
        ...uiPatternRegistry,
        {
          ...findUiPattern("form-field"),
          key: "form-field-gold",
          styleOnlyDuplicateOf: "form-field",
        },
      ]),
    ).toThrow("Style-only duplicate");
    expect(() =>
      validateUiPatternRegistry([
        { ...findUiPattern("form-field"), primitives: ["unknown-primitive"] },
      ]),
    ).toThrow("Unknown primitive");
  });

  it("exports distinct copyable pattern source with exact state fixtures", () => {
    expect(
      new Set(uiPatternRegistry.map((item) => item.source.code)).size,
    ).toBe(uiPatternRegistry.length);
    expect(findUiPattern("bottom-tab-navigation").source.code).toContain(
      'aria-label="Primary navigation"',
    );
    expect(findUiPattern("confirmation-dialog").source.code).toContain(
      "<dialog",
    );
    expect(findUiPattern("data-table").source.code).toContain("<table");
    for (const item of uiPatternRegistry) {
      expect(item.fixtures).toHaveLength(6);
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it("rejects incomplete, reordered, or otherwise mutated pattern manifests", () => {
    expect(() => validateUiPatternRegistry([])).toThrow("exact frozen");
    expect(() =>
      validateUiPatternRegistry([...uiPatternRegistry].reverse()),
    ).toThrow("exact frozen");
    const changed = structuredClone(uiPatternRegistry);
    changed[0]!.version = "9.9.9";
    expect(() => validateUiPatternRegistry(changed)).toThrow("exact frozen");
    const changedFixture = structuredClone(uiPatternRegistry);
    changedFixture[0]!.fixtures[0]!.id = "invented";
    expect(() => validateUiPatternRegistry(changedFixture)).toThrow(
      "exact frozen",
    );
  });

  it("executes pattern inputs and every state branch without emitting hostile markup", () => {
    const source = findUiPattern(
      "bottom-tab-navigation",
    ).source.code.replaceAll("export ", "");
    const render = new Function(`${source}; return renderBottomTabs;`)() as (
      input: Record<string, unknown>,
      state: string,
    ) => string;
    expect(
      render({ items: [{ label: "Menu", current: true }] }, "confirmation"),
    ).toContain("Menu");
    expect(render({}, "loading")).toContain("aria-busy");
    expect(render({}, "empty")).toContain("Nothing here yet");
    expect(render({}, "validation")).toContain("highlighted");
    expect(render({}, "error")).toContain('role="alert"');
    expect(render({}, "denial")).toContain("Access denied");
    expect(
      render(
        { items: [{ label: "<script>alert(1)</script>", current: true }] },
        "confirmation",
      ),
    ).not.toContain("<script>");
    const moveFocus = new Function(
      `${source}; return handlePatternKeyDown;`,
    )() as (
      event: { key: string; preventDefault(): void },
      index: number,
      count: number,
    ) => number;
    expect(moveFocus({ key: "ArrowRight", preventDefault() {} }, 0, 3)).toBe(1);
    expect(moveFocus({ key: "ArrowLeft", preventDefault() {} }, 0, 3)).toBe(2);
    expect(moveFocus({ key: "Home", preventDefault() {} }, 2, 3)).toBe(0);
    expect(moveFocus({ key: "End", preventDefault() {} }, 0, 3)).toBe(2);
  });

  it("renders declared Lucide icon keys and sanitizes navigation destinations", () => {
    const source = findUiPattern(
      "compact-sidebar-navigation",
    ).source.code.replaceAll("export ", "");
    const render = new Function(
      `${source}; return renderCompactSidebar;`,
    )() as (input: Record<string, unknown>, state: string) => string;
    const safe = render(
      {
        items: [
          {
            href: "/merchant",
            label: "Dashboard",
            icon: "layout-dashboard",
            current: true,
          },
        ],
      },
      "confirmation",
    );
    expect(safe).toContain('data-lucide="layout-dashboard"');
    expect(safe).toContain('href="/merchant"');
    expect(
      render(
        {
          items: [
            {
              href: "javascript:alert(1)",
              label: "Unsafe",
              icon: "house",
            },
          ],
        },
        "confirmation",
      ),
    ).not.toContain("javascript:");
  });
});
