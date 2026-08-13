import { describe, expect, it } from "vitest";

import {
  findUiPrimitive,
  uiPrimitiveRegistry,
  validateUiPrimitiveRegistry,
} from "../src/index.js";

describe("UI primitive registry", () => {
  it("provides the frozen accessible primitive set with complete interaction states", () => {
    expect(uiPrimitiveRegistry.map((item) => item.key)).toEqual([
      "button",
      "input",
      "label",
      "select",
      "checkbox",
      "switch",
      "dialog",
      "drawer",
      "tabs",
      "table",
      "card",
      "badge",
      "separator",
      "skeleton",
      "toast",
    ]);
    for (const item of uiPrimitiveRegistry) {
      expect(item.version).toBe("1.0.0");
      expect(item.states).toEqual([
        "loading",
        "empty",
        "validation",
        "error",
        "confirmation",
        "denial",
      ]);
      expect(item.accessibility.keyboard).not.toHaveLength(0);
      expect(item.accessibility.focus).toBeTruthy();
      expect(item.responsive).toEqual(["mobile", "tablet", "desktop"]);
    }
  });

  it("provides copyable Factory-authored source and rejects a duplicate key", () => {
    const button = findUiPrimitive("button");
    expect(button.source.ownership).toBe("factory-authored");
    expect(button.source.license).toBe("UNLICENSED");
    expect(button.source.code).toContain("<button");
    expect(button.iconPolicy).toBe("lucide-only");
    expect(() =>
      validateUiPrimitiveRegistry([...uiPrimitiveRegistry, button]),
    ).toThrow("Duplicate primitive key");
  });

  it("ships distinct semantic source and deterministic fixtures for every state", () => {
    expect(
      new Set(uiPrimitiveRegistry.map((item) => item.source.code)).size,
    ).toBe(uiPrimitiveRegistry.length);
    expect(findUiPrimitive("input").source.code).toContain("<input");
    expect(findUiPrimitive("select").source.code).toContain("<select");
    expect(findUiPrimitive("checkbox").source.code).toContain(
      'type="checkbox"',
    );
    expect(findUiPrimitive("dialog").source.code).toContain("<dialog");
    expect(findUiPrimitive("tabs").source.code).toContain('role="tablist"');
    expect(findUiPrimitive("table").source.code).toContain("<table");
    expect(findUiPrimitive("toast").source.code).toContain('role="status"');
    for (const item of uiPrimitiveRegistry) {
      expect(item.fixtures.map(({ state }) => state)).toEqual([
        "loading",
        "empty",
        "validation",
        "error",
        "confirmation",
        "denial",
      ]);
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(item.source)).toBe(true);
    }
  });

  it("fails closed on empty, reordered, invented, or arbitrarily changed registries", () => {
    expect(() => validateUiPrimitiveRegistry([])).toThrow("exact frozen");
    expect(() =>
      validateUiPrimitiveRegistry([...uiPrimitiveRegistry].reverse()),
    ).toThrow("exact frozen");
    const changed = structuredClone(uiPrimitiveRegistry);
    changed[0]!.key = "invented";
    expect(() => validateUiPrimitiveRegistry(changed)).toThrow("exact frozen");
    const changedSource = structuredClone(uiPrimitiveRegistry);
    changedSource[0]!.source.code = "<div>arbitrary</div>";
    expect(() => validateUiPrimitiveRegistry(changedSource)).toThrow(
      "exact frozen",
    );
  });

  it("executes copyable source against inputs and states without emitting hostile markup", () => {
    const source = findUiPrimitive("input").source.code.replaceAll(
      "export ",
      "",
    );
    const render = new Function(`${source}; return renderInput;`)() as (
      input: Record<string, unknown>,
      state: string,
    ) => string;
    expect(
      render({ label: "Guest name", value: "Ada" }, "confirmation"),
    ).toContain("Ada");
    expect(render({}, "error")).toContain("Something went wrong");
    expect(
      render({ label: "<script>alert(1)</script>" }, "confirmation"),
    ).not.toContain("<script>");

    const buttonSource = findUiPrimitive("button").source.code.replaceAll(
      "export ",
      "",
    );
    const renderButton = new Function(
      `${buttonSource}; return renderButton;`,
    )() as (input: Record<string, unknown>, state: string) => string;
    expect(renderButton({}, "loading")).toContain("aria-busy");
    expect(renderButton({}, "empty")).toContain("Nothing here yet");
    expect(renderButton({}, "validation")).toContain("highlighted");
    expect(renderButton({}, "error")).toContain('role="alert"');
    expect(renderButton({}, "denial")).toContain("Access denied");

    let restored = false;
    const restoreFocus = new Function(
      `${findUiPrimitive("dialog").source.code.replaceAll("export ", "")}; return restoreInvokingFocus;`,
    )() as (element: { focus(): void }) => void;
    restoreFocus({ focus: () => (restored = true) });
    expect(restored).toBe(true);
  });
});
