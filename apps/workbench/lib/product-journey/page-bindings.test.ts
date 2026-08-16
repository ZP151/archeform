import { describe, expect, it } from "vitest";

import { FixtureRequirementInterpreter } from "@factory/adapters";
import {
  composeProductDraft,
  planProductAlternatives,
} from "@factory/capabilities/node";
import {
  EXPERIENCE_DESIGN_SYSTEM_DEFAULTS,
  applicationGraphSchema,
  applyGraphDiffToDraft,
  assertExperienceDesignSystem,
  createBlankApplicationDraft,
  type ExperienceModel,
  type PageModel,
} from "@factory/graph";

import {
  applyStudioEdit,
  insertableBlockTypes,
  tokenGroups,
  type StudioWorkspace,
} from "./page-bindings";

const fixtureInterpreter = new FixtureRequirementInterpreter();

const page: PageModel = {
  pages: [
    {
      id: "dashboard",
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
          props: { title: "Expense stats" },
        },
        {
          id: "list-1",
          type: "list",
          entity: "expense",
          props: { title: "Expenses" },
        },
      ],
    },
    {
      id: "detail",
      route: "/detail",
      title: "Detail",
      blocks: [
        {
          id: "detail-1",
          type: "detail",
          entity: "expense",
          props: { title: "Expense detail" },
        },
      ],
    },
  ],
  navigation: [
    {
      id: "nav-dashboard",
      pageId: "dashboard",
      label: "Dashboard",
      icon: "layout",
    },
    { id: "nav-detail", pageId: "detail", label: "Detail", icon: "file" },
  ],
};

const experience: ExperienceModel = {
  theme: { mode: "system", tokens: {} },
  locales: ["en"],
};

function workspace(overrides: Partial<StudioWorkspace> = {}): StudioWorkspace {
  return {
    page,
    experience,
    entityKeys: ["expense", "employee"],
    ...overrides,
  };
}

/**
 * The honest studio boundary: every edit op is a pure, constrained change to
 * the declared surface. Approved block types, safe text props, declared
 * entities, and schema-validated tokens; everything else fails closed.
 */
describe("page bindings", () => {
  it("inserts only approved composer block types", () => {
    const result = applyStudioEdit(workspace(), {
      type: "insert-block",
      pageId: "dashboard",
      blockType: "stats",
    });
    const statsBlocks = result.page.pages
      .find((entry) => entry.id === "dashboard")
      ?.blocks.filter((block) => block.type === "stats");
    expect(statsBlocks).toHaveLength(2);
    expect(statsBlocks?.[1].id).toMatch(/^studio-stats-\d+$/);
    expect(statsBlocks?.[1].props).toEqual({ title: "Stats" });
    // An unapproved type is rejected before it can reach the Graph.
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "insert-block",
        pageId: "dashboard",
        blockType: "catalog" as never,
      }),
    ).toThrow();
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "insert-block",
        pageId: "missing",
        blockType: "form",
      }),
    ).toThrow(/Unknown page/);
  });

  it("inserts a hero with the declared text surface", () => {
    const result = applyStudioEdit(workspace(), {
      type: "insert-block",
      pageId: "dashboard",
      blockType: "hero",
      position: 0,
    });
    const blocks = result.page.pages.find(
      (entry) => entry.id === "dashboard",
    )?.blocks;
    expect(blocks?.[0].type).toBe("hero");
    expect(blocks?.[0].props).toEqual({
      eyebrow: "Operations",
      heading: "Shape the next decision.",
    });
  });

  it("deletes a block but never the last block of a page", () => {
    const deleted = applyStudioEdit(workspace(), {
      type: "delete-block",
      pageId: "dashboard",
      blockId: "stats-1",
    });
    expect(
      deleted.page.pages.find((entry) => entry.id === "dashboard")?.blocks,
    ).not.toContainEqual(expect.objectContaining({ id: "stats-1" }));
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "delete-block",
        pageId: "dashboard",
        blockId: "missing",
      }),
    ).toThrow(/has no block/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "delete-block",
        pageId: "detail",
        blockId: "detail-1",
      }),
    ).toThrow(/at least one block/);
  });

  it("reorders pages and blocks within declared bounds", () => {
    const reordered = applyStudioEdit(workspace(), {
      type: "reorder-page",
      pageId: "detail",
      position: 0,
    });
    expect(reordered.page.pages.map((entry) => entry.id)).toEqual([
      "detail",
      "dashboard",
    ]);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "reorder-page",
        pageId: "missing",
        position: 0,
      }),
    ).toThrow(/Unknown page/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "reorder-page",
        pageId: "dashboard",
        position: 9,
      }),
    ).toThrow(/position/);

    const moved = applyStudioEdit(workspace(), {
      type: "reorder-block",
      pageId: "dashboard",
      blockId: "list-1",
      position: 0,
    });
    expect(
      moved.page.pages
        .find((entry) => entry.id === "dashboard")
        ?.blocks.map((block) => block.id),
    ).toEqual(["list-1", "hero-1", "stats-1"]);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "reorder-block",
        pageId: "dashboard",
        blockId: "missing",
        position: 0,
      }),
    ).toThrow(/has no block/);
  });

  it("copies a block with a fresh id while keeping its binding", () => {
    const copied = applyStudioEdit(workspace(), {
      type: "copy-block",
      pageId: "dashboard",
      blockId: "list-1",
    });
    const blocks = copied.page.pages.find(
      (entry) => entry.id === "dashboard",
    )?.blocks;
    const clone = blocks?.find(
      (block) => block.id !== "list-1" && block.type === "list",
    );
    expect(clone).toBeDefined();
    expect(clone?.entity).toBe("expense");
    expect(clone?.props).toEqual({ title: "Expenses" });
    expect(blocks?.filter((block) => block.type === "list")).toHaveLength(2);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "copy-block",
        pageId: "dashboard",
        blockId: "missing",
      }),
    ).toThrow(/has no block/);
  });

  it("sets only the declared text props with a 120-character bound", () => {
    const heading = "Q3 board review";
    const edited = applyStudioEdit(workspace(), {
      type: "set-block-text",
      pageId: "dashboard",
      blockId: "hero-1",
      prop: "heading",
      value: heading,
    });
    const hero = edited.page.pages
      .find((entry) => entry.id === "dashboard")
      ?.blocks.find((block) => block.id === "hero-1");
    expect(hero?.props).toEqual({
      eyebrow: "Operations",
      heading,
    });

    const titled = applyStudioEdit(workspace(), {
      type: "set-block-text",
      pageId: "dashboard",
      blockId: "stats-1",
      prop: "title",
      value: "Approved spend",
    });
    expect(
      titled.page.pages
        .find((entry) => entry.id === "dashboard")
        ?.blocks.find((block) => block.id === "stats-1")?.props,
    ).toEqual({ title: "Approved spend" });

    // A hero cannot carry a data title and a data block cannot carry a
    // hero heading; both fail closed.
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-block-text",
        pageId: "dashboard",
        blockId: "hero-1",
        prop: "title",
        value: "Nope",
      }),
    ).toThrow(/does not declare/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-block-text",
        pageId: "dashboard",
        blockId: "stats-1",
        prop: "heading",
        value: "Nope",
      }),
    ).toThrow(/does not declare/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-block-text",
        pageId: "dashboard",
        blockId: "hero-1",
        prop: "heading",
        value: "x".repeat(130),
      }),
    ).toThrow(/limited to 120/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-block-text",
        pageId: "dashboard",
        blockId: "hero-1",
        prop: "heading",
        value: "   ",
      }),
    ).toThrow(/required/);
  });

  it("binds a block to a declared entity only", () => {
    const bound = applyStudioEdit(workspace(), {
      type: "bind-block-entity",
      pageId: "dashboard",
      blockId: "stats-1",
      entity: "employee",
    });
    expect(
      bound.page.pages
        .find((entry) => entry.id === "dashboard")
        ?.blocks.find((block) => block.id === "stats-1")?.entity,
    ).toBe("employee");
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "bind-block-entity",
        pageId: "dashboard",
        blockId: "stats-1",
        entity: "not-declared",
      }),
    ).toThrow(/Unknown entity/);
    // Hero is a header block; it has no entity semantics.
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "bind-block-entity",
        pageId: "dashboard",
        blockId: "hero-1",
        entity: "expense",
      }),
    ).toThrow(/cannot bind/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "bind-block-entity",
        pageId: "dashboard",
        blockId: "missing",
        entity: "expense",
      }),
    ).toThrow(/has no block/);
  });

  it("sets an approved per-page layout selection", () => {
    for (const layout of ["table", "form", "detail", "dashboard"] as const) {
      const result = applyStudioEdit(workspace(), {
        type: "set-page-layout",
        pageId: "dashboard",
        layout,
      });
      const designSystem = result.experience.designSystem;
      expect(designSystem?.selection.pageLayouts.dashboard).toBe(layout);
      expect(designSystem).toBeDefined();
      assertExperienceDesignSystem(designSystem);
    }
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-page-layout",
        pageId: "missing",
        layout: "table",
      }),
    ).toThrow(/Unknown page/);
  });

  it("sets schema-valid design tokens and seeds defaults when none exist", () => {
    const result = applyStudioEdit(workspace(), {
      type: "set-design-token",
      group: "colour",
      mode: "light",
      key: "brand",
      value: "#0d6e5b",
    });
    expect(result.experience.designSystem?.tokens.colour.light.brand).toBe(
      "#0d6e5b",
    );
    // The seeded system carries the deterministic defaults untouched.
    expect(result.experience.designSystem?.selection.density).toBe("standard");
    expect(result.experience.designSystem?.components.button).toBe("primary");
    expect(result.experience.designSystem?.tokens.colour.dark.brand).toBe(
      EXPERIENCE_DESIGN_SYSTEM_DEFAULTS.tokens.colour.dark.brand,
    );
    expect(result.experience.locales).toEqual(["en"]);
    expect(result.experience.theme.mode).toBe("system");

    const dark = applyStudioEdit(workspace(), {
      type: "set-design-token",
      group: "colour",
      mode: "dark",
      key: "brand",
      value: "#4fc3a1",
    });
    expect(dark.experience.designSystem?.tokens.colour.dark.brand).toBe(
      "#4fc3a1",
    );

    for (const [group, key, value] of [
      ["typography", "font-size-base", "1.125rem"],
      ["spacing", "space-8", "2.5rem"],
      ["radius", "radius-base", "0.75rem"],
      ["elevation", "elevation-md", "0px 2px 8px #0000001f"],
      ["motion", "duration-base", "200ms"],
    ] as const) {
      const token = applyStudioEdit(workspace(), {
        type: "set-design-token",
        group,
        key,
        value,
      });
      expect(token.experience.designSystem?.tokens[group][key]).toBe(value);
    }

    // Token values are schema-validated, never free text: injected style
    // material is rejected without being echoed.
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-design-token",
        group: "colour",
        mode: "light",
        key: "brand",
        value: "url(javascript:alert(1))",
      }),
    ).toThrow(/Design token rejected/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-design-token",
        group: "colour",
        mode: "light",
        key: "brand!",
        value: "#0d6e5b",
      }),
    ).toThrow(/Design token rejected/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-design-token",
        group: "gradient" as never,
        key: "x",
        value: "#0d6e5b",
      }),
    ).toThrow(/group/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-design-token",
        group: "colour",
        mode: "light",
        key: "brand",
        value: "hsl(120 50% 40%)",
      }),
    ).toThrow(/Design token rejected/);
  });

  it("sets catalogue-approved component variants", () => {
    const result = applyStudioEdit(workspace(), {
      type: "set-component-variant",
      component: "button",
      variant: "danger",
    });
    expect(result.experience.designSystem?.components.button).toBe("danger");
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-component-variant",
        component: "button",
        variant: "flamingo",
      }),
    ).toThrow(/not approved/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-component-variant",
        component: "carousel",
        variant: "default",
      }),
    ).toThrow(/catalogue/);
  });

  it("sets density and shell from the approved presets", () => {
    const compact = applyStudioEdit(workspace(), {
      type: "set-density",
      density: "compact",
    });
    expect(compact.experience.designSystem?.selection.density).toBe("compact");
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-density",
        density: "huge" as never,
      }),
    ).toThrow();
    const topbar = applyStudioEdit(workspace(), {
      type: "set-shell",
      shell: "topbar",
    });
    expect(topbar.experience.designSystem?.selection.shell).toBe("topbar");
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-shell",
        shell: "drawer" as never,
      }),
    ).toThrow();
  });

  it("rejects edits that target pages or blocks outside the workspace", () => {
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "reorder-page",
        pageId: "missing",
        position: 0,
      }),
    ).toThrow(/Unknown page/);
    expect(() =>
      applyStudioEdit(workspace(), {
        type: "set-block-text",
        pageId: "dashboard",
        blockId: "missing",
        prop: "title",
        value: "Nope",
      }),
    ).toThrow(/has no block/);
  });
});

describe("page bindings on composed products", () => {
  it("keeps a bounded studio edit sequence valid on a real composed Graph", async () => {
    const interpretation = await fixtureInterpreter.interpret({
      brief:
        "Build an expense approval application. Employees submit expenses with amount, category, date, receipt, and notes. Managers approve or reject them, and finance can audit all decisions.",
      answers: {},
    });
    const baseDraft = createBlankApplicationDraft({
      applicationId: interpretation.spec.requirementId,
      workspaceId: "local-workspace",
      name: interpretation.spec.requirementId,
    });
    const [standard] = planProductAlternatives({
      requirement: interpretation.spec,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const { diff } = composeProductDraft({
      plan: standard.plan,
      blueprint: interpretation.blueprint,
      baseDraft,
    });
    const graph = applyGraphDiffToDraft(baseDraft, diff).graph;
    const draftWorkspace: StudioWorkspace = {
      page: graph.page,
      experience: graph.experience,
      entityKeys: graph.domain.entities.map((entity) => entity.key),
    };

    const [firstPage] = graph.page.pages;
    // Composed pages carry a hero or a stats/list headline block; edit
    // whichever the composer derived so the sequence works for any prompt.
    const headline =
      graph.page.pages
        .flatMap((entry) => entry.blocks)
        .find((block) => block.type === "hero") ??
      graph.page.pages
        .flatMap((entry) => entry.blocks)
        .find((block) => ["stats", "list"].includes(block.type));
    const headlinePageId = graph.page.pages.find((entry) =>
      entry.blocks.some((block) => block.id === headline?.id),
    )?.id;
    const headlineProp = headline?.type === "hero" ? "heading" : "title";
    const [lastPage] = [...graph.page.pages].reverse();
    const edited = [
      {
        type: "set-block-text",
        pageId: headlinePageId,
        blockId: headline?.id,
        prop: headlineProp as "heading" | "title",
        value: "Quarterly review",
      },
      {
        type: "insert-block",
        pageId: firstPage?.id,
        blockType: "stats" as const,
      },
      {
        type: "reorder-page",
        pageId: lastPage?.id,
        position: 0,
      },
      {
        type: "set-page-layout",
        pageId: firstPage?.id,
        layout: "dashboard" as const,
      },
      {
        type: "set-design-token",
        group: "colour",
        mode: "light",
        key: "brand",
        value: "#0d6e5b",
      },
      {
        type: "set-component-variant",
        component: "button",
        variant: "danger",
      },
      {
        type: "set-density",
        density: "compact",
      },
      {
        type: "set-shell",
        shell: "topbar",
      },
    ].reduce(
      (current, edit) => applyStudioEdit(current, edit as never),
      draftWorkspace,
    );

    expect(edited.page.pages[0].id).toBe(lastPage?.id);
    const headingEdit = edited.page.pages
      .flatMap((entry) => entry.blocks)
      .find((block) => block.id === headline?.id);
    expect(headingEdit?.props?.[headlineProp]).toBe("Quarterly review");
    expect(
      edited.page.pages
        .flatMap((entry) => entry.blocks)
        .filter((block) => block.type === "stats"),
    ).toHaveLength(2);
    expect(edited.experience.designSystem?.selection.shell).toBe("topbar");
    expect(edited.experience.designSystem?.selection.density).toBe("compact");
    expect(
      edited.experience.designSystem?.selection.pageLayouts[
        firstPage?.id ?? ""
      ],
    ).toBe("dashboard");
    expect(edited.experience.designSystem?.tokens.colour.light.brand).toBe(
      "#0d6e5b",
    );
    expect(edited.experience.designSystem?.components.button).toBe("danger");

    // The edited surface still parses as a valid Application Graph: the
    // studio may change only what the declared schemas permit.
    const rebuiltGraph = {
      ...graph,
      page: edited.page,
      experience: edited.experience,
    };
    const parsed = applicationGraphSchema.parse(rebuiltGraph);
    expect(parsed.metadata.id).toBe(interpretation.spec.requirementId);
  });
});

describe("page bindings surface", () => {
  it("exposes the approved insertion and token surfaces", () => {
    expect(insertableBlockTypes).toEqual([
      "hero",
      "stats",
      "list",
      "form",
      "detail",
      "queue",
      "calendar",
      "settings",
    ]);
    expect(tokenGroups).toEqual([
      "colour",
      "typography",
      "spacing",
      "radius",
      "elevation",
      "motion",
    ]);
  });
});
