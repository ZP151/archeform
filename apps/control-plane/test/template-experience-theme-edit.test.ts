import { describe, expect, it } from "vitest";

import { applyTemplateDataFieldEdit } from "../src/template/template-data-field-edit.js";
import {
  applyTemplateExperienceThemeEdit,
  captureTemplateExperienceThemeRevisionInput,
  type AppendTemplateExperienceThemeRevisionInput,
} from "../src/template/template-experience-theme-edit.js";
import { createCuratedRestaurantTemplateGraph } from "../src/template/template.service.js";

const invalidRequest = "Template Draft request is invalid.";
const revisionMoved = "Template Draft revision moved; reload before editing.";

function command(
  overrides: Partial<AppendTemplateExperienceThemeRevisionInput> = {},
): AppendTemplateExperienceThemeRevisionInput {
  return {
    baseDraftRevisionId: "draft-5",
    mode: "dark",
    ...overrides,
  };
}

function restaurantR5Graph() {
  return applyTemplateDataFieldEdit(
    createCuratedRestaurantTemplateGraph(
      "restaurant-template-001",
      "Maison Rivage",
    ),
    {
      baseDraftRevisionId: "draft-4",
      entityKey: "menu-item",
      recordId: "margherita-pizza",
      fieldKey: "name",
      value: "Heirloom tomato pizza",
    },
  ).graph;
}

describe("template Restaurant Experience theme edit", () => {
  it.each([
    ["base first", command()],
    ["mode first", { mode: "dark", baseDraftRevisionId: "draft-5" }],
  ] as const)(
    "captures one frozen primitive command with %s",
    (_label, input) => {
      const captured = captureTemplateExperienceThemeRevisionInput(input);

      expect(captured).toEqual(command());
      expect(captured).not.toBe(input);
      expect(Object.isFrozen(captured)).toBe(true);
    },
  );

  it.each([
    ["missing property", { baseDraftRevisionId: "draft-5" }],
    ["extra property", { ...command(), tokens: {} }],
    ["array", ["draft-5", "dark"]],
    ["empty base", command({ baseDraftRevisionId: "" })],
    ["upper-case base", command({ baseDraftRevisionId: "Draft-5" })],
    ["overlong base", command({ baseDraftRevisionId: `d${"a".repeat(128)}` })],
    ["wrong mode", command({ mode: "light" as never })],
    ["cased mode", command({ mode: "Dark" as never })],
    ["wrapped mode", command({ mode: new String("dark") as never })],
  ] as const)("rejects %s with one fixed capture error", (_label, input) => {
    expect(() => captureTemplateExperienceThemeRevisionInput(input)).toThrow(
      new Error(invalidRequest),
    );
  });

  it("rejects symbol, non-enumerable, accessor, inherited, and custom-prototype properties without invoking getters", () => {
    let getterCalls = 0;
    const symbol = { ...command(), [Symbol("hostile")]: "hidden" };
    const nonEnumerable = { ...command() };
    Object.defineProperty(nonEnumerable, "hidden", {
      enumerable: false,
      value: "hidden",
    });
    const accessor = { ...command() } as Record<string, unknown>;
    Object.defineProperty(accessor, "mode", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "dark";
      },
    });
    const inherited = Object.assign(
      Object.create({ hostile: true }),
      command(),
    );
    const customPrototype = Object.assign(Object.create(null), command());

    for (const input of [
      symbol,
      nonEnumerable,
      accessor,
      inherited,
      customPrototype,
    ]) {
      expect(() => captureTemplateExperienceThemeRevisionInput(input)).toThrow(
        new Error(invalidRequest),
      );
    }
    expect(getterCalls).toBe(0);
  });

  it.each(["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const)(
    "redacts a hostile body Proxy %s trap",
    (trap) => {
      const input = new Proxy(command(), {
        [trap]() {
          throw new Error("HOSTILE_EXPERIENCE_BODY_SENTINEL");
        },
      });

      expect(() => captureTemplateExperienceThemeRevisionInput(input)).toThrow(
        new Error(invalidRequest),
      );
    },
  );

  it("rejects a revoked Proxy and conversion hooks without invoking caller behavior", () => {
    let conversionCalls = 0;
    const hostileMode = {
      toString() {
        conversionCalls += 1;
        return "dark";
      },
      valueOf() {
        conversionCalls += 1;
        return "dark";
      },
      toJSON() {
        conversionCalls += 1;
        return "dark";
      },
    };
    const revoked = Proxy.revocable(command(), {});
    revoked.revoke();

    expect(() =>
      captureTemplateExperienceThemeRevisionInput(revoked.proxy),
    ).toThrow(new Error(invalidRequest));
    expect(() =>
      captureTemplateExperienceThemeRevisionInput({
        ...command(),
        mode: hostileMode,
      }),
    ).toThrow(new Error(invalidRequest));
    expect(conversionCalls).toBe(0);
  });

  it("changes only experience.theme.mode and leaves the complete r.5 caller Graph immutable", () => {
    const graph = restaurantR5Graph();
    const before = structuredClone(graph);
    const expected = structuredClone(graph);
    expected.experience.theme.mode = "dark";

    const result = applyTemplateExperienceThemeEdit(graph, command());

    expect(result).toMatchObject(command());
    expect(result.graph).toEqual(expected);
    expect(result.graph).not.toBe(graph);
    expect(graph).toEqual(before);
    expect(result.graph.experience).not.toBe(graph.experience);
    const restored = structuredClone(result.graph);
    restored.experience.theme.mode = "light";
    expect(restored).toEqual(before);
  });

  it("maps an already-dark current Graph to the fixed reload conflict", () => {
    const graph = restaurantR5Graph();
    graph.experience.theme.mode = "dark";

    expect(() => applyTemplateExperienceThemeEdit(graph, command())).toThrow(
      new Error(revisionMoved),
    );
  });

  it.each(["system", "missing theme", "unrelated Graph drift"] as const)(
    "rejects %s with the fixed invalid request",
    (failure) => {
      const graph = restaurantR5Graph();
      if (failure === "system") graph.experience.theme.mode = "system";
      else if (failure === "missing theme") {
        delete (graph.experience as { theme?: unknown }).theme;
      } else {
        graph.metadata.id = "Invalid Graph Key";
      }

      expect(() => applyTemplateExperienceThemeEdit(graph, command())).toThrow(
        new Error(invalidRequest),
      );
    },
  );
});
