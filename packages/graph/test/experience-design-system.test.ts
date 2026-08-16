import { describe, expect, it } from "vitest";

import {
  assertValidApplicationGraph,
  defaultPageLayoutFor,
  EXPERIENCE_DESIGN_SYSTEM_CATALOGUE,
  EXPERIENCE_DESIGN_SYSTEM_DEFAULTS,
  experienceDesignSystemSchema,
  GraphSemanticError,
  resolveExperienceDesignSystem,
  type ExperienceDesignSystemV1,
  type PageModel,
} from "../src/index.js";

const declaredSystemFixture: ExperienceDesignSystemV1 = {
  apiVersion: "factory.experience-design-system/v1",
  tokens: {
    colour: {
      light: { brand: "#0a5c4d", "focus-ring": "brand" },
      dark: { brand: "#4fc3a1" },
    },
    typography: { "font-size-base": "1.125rem" },
    spacing: { "space-6": "2rem" },
    radius: {},
    elevation: { "elevation-lg": "none" },
    motion: { "duration-fast": "100ms" },
  },
  selection: {
    shell: "sidebar",
    density: "standard",
    pageLayouts: { expenses: "table", "new-expense": "form" },
  },
  components: {
    button: "primary",
    input: "default",
    card: "default",
    badge: "default",
    table: "default",
    form: "default",
    "nav-item": "active",
  },
  states: ["focus", "contrast", "validation", "loading", "empty", "error"],
};

function pageFixture(
  id: string,
  blockTypes: readonly string[],
): PageModel["pages"][number] {
  return {
    id,
    route: `/${id}`,
    title: id,
    blocks: blockTypes.map((type, index) => ({
      id: `${id}-block-${index}`,
      type,
    })),
  };
}

describe("Experience Design System catalogue", () => {
  it("declares the approved shell, layout, density, state, and component surfaces", () => {
    expect(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.shell).toEqual([
      "sidebar",
      "topbar",
    ]);
    expect(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.pageLayouts).toEqual([
      "table",
      "form",
      "detail",
      "dashboard",
    ]);
    expect(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.density).toEqual([
      "standard",
      "compact",
    ]);
    expect(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.states).toEqual([
      "focus",
      "contrast",
      "validation",
      "loading",
      "empty",
      "error",
    ]);
    expect(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.components.button).toEqual([
      "primary",
      "secondary",
      "ghost",
      "danger",
    ]);
  });

  it("provides schema-valid deterministic defaults", () => {
    expect(
      experienceDesignSystemSchema.safeParse(EXPERIENCE_DESIGN_SYSTEM_DEFAULTS)
        .success,
    ).toBe(true);
    expect(EXPERIENCE_DESIGN_SYSTEM_DEFAULTS).toEqual(
      structuredClone(EXPERIENCE_DESIGN_SYSTEM_DEFAULTS),
    );
  });

  it("rejects arbitrary CSS, packages, and scripts in token values", () => {
    const unsafeValues = [
      "#fff;",
      "#f00 { color: red; }",
      "url(https://evil.example/x.css)",
      "expression(alert(1))",
      'brand" onload="alert(1)',
      "1rem; position: fixed;",
      "0 1px 2px red; --x: y",
      "javascript:alert(1)",
      "120ms; transition: all",
    ];
    for (const value of unsafeValues) {
      const result = experienceDesignSystemSchema.safeParse({
        apiVersion: "factory.experience-design-system/v1",
        tokens: { colour: { light: { brand: value }, dark: {} } },
        selection: { shell: "sidebar", density: "standard" },
        components: {},
      });
      expect(result.success, `token value '${value}' must be rejected`).toBe(
        false,
      );
    }
  });

  it("validates colour tokens to hex or named colours", () => {
    const parse = (value: string) =>
      experienceDesignSystemSchema.safeParse({
        apiVersion: "factory.experience-design-system/v1",
        tokens: { colour: { light: { brand: value }, dark: {} } },
        selection: { shell: "sidebar", density: "standard" },
        components: {},
      });
    expect(parse("#0a5c4d").success).toBe(true);
    expect(parse("#f00").success).toBe(true);
    expect(parse("#f00a").success).toBe(true);
    expect(parse("brand").success).toBe(true);
    expect(parse("#12345").success).toBe(false);
    expect(parse("brand;").success).toBe(false);
    expect(parse("#123456789").success).toBe(false);
  });

  it("validates typography, spacing, radius, elevation, and motion values", () => {
    const parse = (tokens: Record<string, unknown>) =>
      experienceDesignSystemSchema.safeParse({
        apiVersion: "factory.experience-design-system/v1",
        tokens: tokens as never,
        selection: { shell: "sidebar", density: "standard" },
        components: {},
      });
    expect(
      parse({ typography: { "font-size-base": "1rem", family: "system-ui" } })
        .success,
    ).toBe(true);
    expect(parse({ typography: { x: "16px;" } }).success).toBe(false);
    expect(parse({ spacing: { x: "0.5rem" } }).success).toBe(true);
    expect(parse({ spacing: { x: "auto" } }).success).toBe(false);
    expect(parse({ radius: { x: "0.25rem" } }).success).toBe(true);
    expect(parse({ elevation: { x: "0px 1px 2px #00000014" } }).success).toBe(
      true,
    );
    expect(parse({ elevation: { x: "none" } }).success).toBe(true);
    expect(parse({ elevation: { x: "0 1px 2px" } }).success).toBe(false);
    expect(parse({ motion: { x: "120ms" } }).success).toBe(true);
    expect(parse({ motion: { x: "cubic-bezier(0.2, 0, 0, 1)" } }).success).toBe(
      true,
    );
    expect(parse({ motion: { x: "0.2s;" } }).success).toBe(false);
  });

  it("validates the approved shell, density, state, and component selections", () => {
    const base = {
      apiVersion: "factory.experience-design-system/v1",
      tokens: {},
    } as const;
    const parse = (selection: unknown, components: unknown) =>
      experienceDesignSystemSchema.safeParse({
        ...base,
        selection,
        components,
      });
    expect(parse({ shell: "topbar", density: "compact" }, {}).success).toBe(
      true,
    );
    expect(parse({ shell: "dark-mode", density: "standard" }, {}).success).toBe(
      false,
    );
    expect(parse({ shell: "sidebar", density: "tiny" }, {}).success).toBe(
      false,
    );
    expect(parse({ shell: "sidebar", density: "standard" }, {}).success).toBe(
      true,
    );
    expect(
      parse(
        {
          shell: "sidebar",
          density: "standard",
          pageLayouts: { expenses: "table" },
        },
        {},
      ).success,
    ).toBe(true);
    expect(
      parse(
        {
          shell: "sidebar",
          density: "standard",
          pageLayouts: { expenses: "tabl" },
        },
        {},
      ).success,
    ).toBe(false);
    expect(
      parse({ shell: "sidebar", density: "standard" }, { button: "primary" })
        .success,
    ).toBe(true);
    expect(
      parse({ shell: "sidebar", density: "standard" }, { button: "neon" })
        .success,
    ).toBe(false);
    expect(
      parse({ shell: "sidebar", density: "standard" }, { neon: "primary" })
        .success,
    ).toBe(false);
    expect(
      parse({ shell: "sidebar", density: "standard" }, { button: "primary" })
        .success,
    ).toBe(true);
  });

  it("rejects an explicitly empty accessible-states declaration (absent means defaults)", () => {
    const result = experienceDesignSystemSchema.safeParse({
      apiVersion: "factory.experience-design-system/v1",
      tokens: {},
      selection: { shell: "sidebar", density: "standard" },
      components: {},
      states: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields (no arbitrary extension)", () => {
    const result = experienceDesignSystemSchema.safeParse({
      apiVersion: "factory.experience-design-system/v1",
      tokens: {},
      selection: { shell: "sidebar", density: "standard" },
      components: {},
      css: "body { color: red; }",
    });
    expect(result.success).toBe(false);
  });
});

describe("resolveExperienceDesignSystem", () => {
  it("resolves deterministic defaults when a graph declares no design system", () => {
    const resolved = resolveExperienceDesignSystem({
      theme: { mode: "light", tokens: {} },
      locales: ["en"],
    });
    expect(resolved).toEqual(EXPERIENCE_DESIGN_SYSTEM_DEFAULTS);
    expect(resolved).toEqual(
      resolveExperienceDesignSystem({
        theme: { mode: "light", tokens: {} },
        locales: ["en"],
      }),
    );
  });

  it("merges declared tokens over the defaults deterministically", () => {
    const resolved = resolveExperienceDesignSystem({
      theme: { mode: "light", tokens: {} },
      designSystem: declaredSystemFixture,
      locales: ["en"],
    });
    expect(resolved.tokens.colour.light.brand).toBe("#0a5c4d");
    expect(resolved.tokens.colour.light.background).toBe(
      EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.colour.light.background,
    );
    expect(resolved.tokens.colour.dark.brand).toBe("#4fc3a1");
    expect(resolved.tokens.typography["font-size-base"]).toBe("1.125rem");
    expect(resolved.tokens.typography["font-size-lg"]).toBe(
      EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.typography["font-size-lg"],
    );
    expect(resolved.tokens.spacing["space-6"]).toBe("2rem");
    expect(resolved.tokens.elevation["elevation-lg"]).toBe("none");
    expect(resolved.tokens.motion["duration-fast"]).toBe("100ms");
    expect(resolved.selection.pageLayouts).toEqual({
      expenses: "table",
      "new-expense": "form",
    });
    expect(resolved.components["nav-item"]).toBe("active");
    expect(resolved.components.button).toBe("primary");
    expect(resolved.states).toEqual(declaredSystemFixture.states);
    expect(experienceDesignSystemSchema.safeParse(resolved).success).toBe(true);
  });

  it("resolves a deterministic default page layout per page kind", () => {
    const designSystem = resolveExperienceDesignSystem({
      theme: { mode: "light", tokens: {} },
      locales: ["en"],
    });
    expect(defaultPageLayoutFor(pageFixture("expenses", ["data-table"]))).toBe(
      "table",
    );
    expect(
      defaultPageLayoutFor(pageFixture("new-expense", ["create-form"])),
    ).toBe("form");
    expect(defaultPageLayoutFor(pageFixture("detail", ["data-detail"]))).toBe(
      "detail",
    );
    expect(
      defaultPageLayoutFor(pageFixture("mixed", ["create-form", "data-table"])),
    ).toBe("table");
    expect(designSystem.selection.pageLayouts).toEqual({});
  });

  it("accepts an optional designSystem on existing graphs and validates it", () => {
    const graph = {
      apiVersion: "factory.application-graph/v1",
      metadata: { id: "app", workspaceId: "ws", name: "App" },
      page: {
        pages: [
          pageFixture("expenses", ["data-table"]),
          pageFixture("new-expense", ["create-form"]),
        ],
        navigation: [],
      },
      domain: { entities: [], relations: [] },
      policy: { roles: [], permissions: [] },
      flow: { flows: [], events: [] },
      integration: { providers: [], capabilities: [] },
      experience: {
        theme: { mode: "light", tokens: {} },
        designSystem: declaredSystemFixture,
        locales: ["en"],
      },
    };
    expect(() => assertValidApplicationGraph(graph)).not.toThrow();
  });

  it("rejects page layouts for unknown pages at the graph level", () => {
    const graph = {
      apiVersion: "factory.application-graph/v1",
      metadata: { id: "app", workspaceId: "ws", name: "App" },
      page: {
        pages: [pageFixture("expenses", ["data-table"])],
        navigation: [],
      },
      domain: { entities: [], relations: [] },
      policy: { roles: [], permissions: [] },
      flow: { flows: [], events: [] },
      integration: { providers: [], capabilities: [] },
      experience: {
        theme: { mode: "light", tokens: {} },
        designSystem: {
          ...declaredSystemFixture,
          selection: {
            ...declaredSystemFixture.selection,
            pageLayouts: { "ghost-page": "table" },
          },
        },
        locales: ["en"],
      },
    };
    let thrown: unknown;
    try {
      assertValidApplicationGraph(graph);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GraphSemanticError);
    const issues = (thrown as GraphSemanticError).issues;
    expect(issues.map((issue) => issue.code)).toContain(
      "experience.design_system.page_layout_unknown_page",
    );
    expect(issues.some((issue) => issue.path.includes("ghost-page"))).toBe(
      true,
    );
  });
});
