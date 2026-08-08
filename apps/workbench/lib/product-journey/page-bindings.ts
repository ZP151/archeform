import {
  EXPERIENCE_DESIGN_SYSTEM_CATALOGUE,
  EXPERIENCE_DESIGN_SYSTEM_DEFAULTS,
  assertExperienceDesignSystem,
  type DensityPreset,
  type ExperienceDesignSystemV1,
  type ExperienceModel,
  type PageLayoutVariant,
  type PageModel,
  type ShellVariant,
} from "@factory/graph";

/**
 * The constrained edit surface the Product Studio may apply to a composed
 * Draft. Every op is a pure change to the declared surface: approved block
 * types, safe text props, declared entities, and schema-validated tokens.
 * Nothing here can introduce routes, arbitrary components, CSS, scripts,
 * packages, URLs, or source code — the Graph schema and the approved
 * catalogues close those doors.
 */

export type StudioWorkspace = {
  readonly page: PageModel;
  readonly experience: ExperienceModel;
  readonly entityKeys: readonly string[];
};

/** The composer's declared block vocabulary; only these may be inserted. */
export const insertableBlockTypes = [
  "hero",
  "stats",
  "list",
  "form",
  "detail",
  "queue",
  "calendar",
  "settings",
] as const;

export type InsertableBlockType = (typeof insertableBlockTypes)[number];

/** Blocks whose runtime projection understands an entity binding. */
const bindableBlockTypes = ["list", "detail", "calendar", "stats", "settings"];

/** Text props a block type declares; every value is bounded business text. */
const textPropsByBlockType: Readonly<Record<string, readonly string[]>> = {
  hero: ["eyebrow", "heading"],
};

export const tokenGroups = [
  "colour",
  "typography",
  "spacing",
  "radius",
  "elevation",
  "motion",
] as const;

export type TokenGroup = (typeof tokenGroups)[number];

export type StudioEdit =
  | {
      readonly type: "reorder-page";
      readonly pageId: string;
      readonly position: number;
    }
  | {
      readonly type: "insert-block";
      readonly pageId: string;
      readonly blockType: InsertableBlockType;
      readonly position?: number;
    }
  | {
      readonly type: "delete-block";
      readonly pageId: string;
      readonly blockId: string;
    }
  | {
      readonly type: "reorder-block";
      readonly pageId: string;
      readonly blockId: string;
      readonly position: number;
    }
  | {
      readonly type: "copy-block";
      readonly pageId: string;
      readonly blockId: string;
    }
  | {
      readonly type: "set-block-text";
      readonly pageId: string;
      readonly blockId: string;
      readonly prop: "eyebrow" | "heading" | "title";
      readonly value: string;
    }
  | {
      readonly type: "bind-block-entity";
      readonly pageId: string;
      readonly blockId: string;
      readonly entity: string;
    }
  | {
      readonly type: "set-page-layout";
      readonly pageId: string;
      readonly layout: PageLayoutVariant;
    }
  | {
      readonly type: "set-design-token";
      readonly group: TokenGroup;
      readonly key: string;
      readonly value: string;
      readonly mode?: "light" | "dark";
    }
  | {
      readonly type: "set-component-variant";
      readonly component: string;
      readonly variant: string;
    }
  | { readonly type: "set-density"; readonly density: DensityPreset }
  | { readonly type: "set-shell"; readonly shell: ShellVariant };

type PageEntry = PageModel["pages"][number];
type PageBlock = PageEntry["blocks"][number];

const MAX_BLOCK_TEXT = 120;
const DEFAULT_HERO_TEXT = {
  eyebrow: "Operations",
  heading: "Shape the next decision.",
} as const;

function findPage(page: PageModel, pageId: string): PageEntry {
  const entry = page.pages.find((candidate) => candidate.id === pageId);
  if (entry === undefined) throw new Error(`Unknown page '${pageId}'.`);
  return entry;
}

function findBlock(
  page: PageModel,
  pageId: string,
  blockId: string,
): PageBlock {
  const entry = findPage(page, pageId);
  const block = entry.blocks.find((candidate) => candidate.id === blockId);
  if (block === undefined) {
    throw new Error(`Page '${pageId}' has no block '${blockId}'.`);
  }
  return block;
}

function withPages(
  workspace: StudioWorkspace,
  update: (pages: readonly PageEntry[]) => readonly PageEntry[],
): StudioWorkspace {
  return {
    ...workspace,
    page: { ...workspace.page, pages: [...update(workspace.page.pages)] },
  };
}

function withPage(
  workspace: StudioWorkspace,
  pageId: string,
  update: (entry: PageEntry) => PageEntry,
): StudioWorkspace {
  return withPages(workspace, (pages) =>
    pages.map((entry) => (entry.id === pageId ? update(entry) : entry)),
  );
}

function humanize(blockType: string): string {
  return blockType
    .split("-")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function uniqueId(base: string, used: ReadonlySet<string>): string {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function defaultBlockFor(blockType: InsertableBlockType): PageBlock {
  if (blockType === "hero") {
    return {
      id: "",
      type: "hero",
      props: { ...DEFAULT_HERO_TEXT },
    };
  }
  return { id: "", type: blockType, props: { title: humanize(blockType) } };
}

function assertTextValue(prop: string, value: string): string {
  const text = value.trim();
  if (!text) throw new Error(`Block text '${prop}' is required.`);
  if (text.length > MAX_BLOCK_TEXT) {
    throw new Error(`Block text is limited to ${MAX_BLOCK_TEXT} characters.`);
  }
  return text;
}

/** The declared design system, seeded from deterministic defaults when absent. */
function currentDesignSystem(
  experience: ExperienceModel,
): ExperienceDesignSystemV1 {
  return experience.designSystem ?? EXPERIENCE_DESIGN_SYSTEM_DEFAULTS;
}

/**
 * Validates the candidate system through the Graph schema and stores it as
 * the Draft's declared design system. Failures never echo the rejected value.
 */
function commitDesignSystem(
  experience: ExperienceModel,
  candidate: ExperienceDesignSystemV1,
): ExperienceModel {
  let validated: ExperienceDesignSystemV1;
  try {
    validated = assertExperienceDesignSystem(candidate);
  } catch {
    throw new Error(
      "Design token rejected: the value is not in the approved token language.",
    );
  }
  return { ...experience, designSystem: validated };
}

function applyPageEdit(
  workspace: StudioWorkspace,
  edit: Extract<StudioEdit, { readonly pageId: string }>,
  update: (entry: PageEntry) => PageEntry,
): StudioWorkspace {
  findPage(workspace.page, edit.pageId);
  return withPage(workspace, edit.pageId, update);
}

export function applyStudioEdit(
  workspace: StudioWorkspace,
  edit: StudioEdit,
): StudioWorkspace {
  switch (edit.type) {
    case "reorder-page": {
      const pages = [...workspace.page.pages];
      const index = pages.findIndex((entry) => entry.id === edit.pageId);
      if (index === -1) throw new Error(`Unknown page '${edit.pageId}'.`);
      if (edit.position < 0 || edit.position >= pages.length) {
        throw new Error(
          `Page position must be between 0 and ${pages.length - 1}.`,
        );
      }
      const [moved] = pages.splice(index, 1);
      pages.splice(edit.position, 0, moved as PageEntry);
      return withPages(workspace, () => pages);
    }

    case "insert-block": {
      if (!insertableBlockTypes.includes(edit.blockType)) {
        throw new Error(`Block type '${edit.blockType}' is not approved.`);
      }
      const page = findPage(workspace.page, edit.pageId);
      const used = new Set(page.blocks.map((block) => block.id));
      const block: PageBlock = {
        ...defaultBlockFor(edit.blockType),
        id: uniqueId(`studio-${edit.blockType}-1`, used),
      };
      const blocks = [...page.blocks];
      const position =
        edit.position === undefined
          ? blocks.length
          : Math.max(0, Math.min(edit.position, blocks.length));
      blocks.splice(position, 0, block);
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks,
      }));
    }

    case "delete-block": {
      const page = findPage(workspace.page, edit.pageId);
      if (!page.blocks.some((block) => block.id === edit.blockId)) {
        throw new Error(
          `Page '${edit.pageId}' has no block '${edit.blockId}'.`,
        );
      }
      if (page.blocks.length <= 1) {
        throw new Error(`Page '${edit.pageId}' must keep at least one block.`);
      }
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks: entry.blocks.filter((block) => block.id !== edit.blockId),
      }));
    }

    case "reorder-block": {
      const page = findPage(workspace.page, edit.pageId);
      const blocks = [...page.blocks];
      const index = blocks.findIndex((block) => block.id === edit.blockId);
      if (index === -1) {
        throw new Error(
          `Page '${edit.pageId}' has no block '${edit.blockId}'.`,
        );
      }
      if (edit.position < 0 || edit.position >= blocks.length) {
        throw new Error(
          `Block position must be between 0 and ${blocks.length - 1}.`,
        );
      }
      const [moved] = blocks.splice(index, 1);
      blocks.splice(edit.position, 0, moved as PageBlock);
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks,
      }));
    }

    case "copy-block": {
      const block = findBlock(workspace.page, edit.pageId, edit.blockId);
      const page = findPage(workspace.page, edit.pageId);
      const used = new Set(page.blocks.map((candidate) => candidate.id));
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks: [
          ...entry.blocks,
          {
            ...structuredClone(block),
            id: uniqueId(`studio-${block.id}-copy`, used),
          },
        ],
      }));
    }

    case "set-block-text": {
      const block = findBlock(workspace.page, edit.pageId, edit.blockId);
      const declared = textPropsByBlockType[block.type] ?? ["title"];
      if (!declared.includes(edit.prop)) {
        throw new Error(
          `Block type '${block.type}' does not declare text prop '${edit.prop}'.`,
        );
      }
      const value = assertTextValue(edit.prop, edit.value);
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks: entry.blocks.map((candidate) =>
          candidate.id === edit.blockId
            ? {
                ...candidate,
                props: { ...candidate.props, [edit.prop]: value },
              }
            : candidate,
        ),
      }));
    }

    case "bind-block-entity": {
      const block = findBlock(workspace.page, edit.pageId, edit.blockId);
      if (!bindableBlockTypes.includes(block.type)) {
        throw new Error(`Block type '${block.type}' cannot bind an entity.`);
      }
      if (!workspace.entityKeys.includes(edit.entity)) {
        throw new Error(`Unknown entity '${edit.entity}'.`);
      }
      return withPage(workspace, edit.pageId, (entry) => ({
        ...entry,
        blocks: entry.blocks.map((candidate) =>
          candidate.id === edit.blockId
            ? { ...candidate, entity: edit.entity }
            : candidate,
        ),
      }));
    }

    case "set-page-layout": {
      findPage(workspace.page, edit.pageId);
      const designSystem = currentDesignSystem(workspace.experience);
      return {
        ...workspace,
        experience: commitDesignSystem(workspace.experience, {
          ...designSystem,
          selection: {
            ...designSystem.selection,
            pageLayouts: {
              ...designSystem.selection.pageLayouts,
              [edit.pageId]: edit.layout,
            },
          },
        }),
      };
    }

    case "set-design-token": {
      if (!tokenGroups.includes(edit.group)) {
        throw new Error(`Design token group '${edit.group}' is not approved.`);
      }
      const designSystem = currentDesignSystem(workspace.experience);
      const tokens = designSystem.tokens;
      const candidate: ExperienceDesignSystemV1 = {
        ...designSystem,
        tokens:
          edit.group === "colour"
            ? {
                ...tokens,
                colour: {
                  ...tokens.colour,
                  [edit.mode ?? "light"]: {
                    ...tokens.colour[edit.mode ?? "light"],
                    [edit.key]: edit.value,
                  },
                },
              }
            : {
                ...tokens,
                [edit.group]: {
                  ...tokens[edit.group],
                  [edit.key]: edit.value,
                },
              },
      };
      return {
        ...workspace,
        experience: commitDesignSystem(workspace.experience, candidate),
      };
    }

    case "set-component-variant": {
      const approved = (
        EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.components as Record<
          string,
          readonly string[]
        >
      )[edit.component];
      if (approved === undefined) {
        throw new Error(
          `Component '${edit.component}' is not in the approved component catalogue.`,
        );
      }
      if (!approved.includes(edit.variant)) {
        throw new Error(
          `Variant '${edit.variant}' is not approved for component '${edit.component}'.`,
        );
      }
      const designSystem = currentDesignSystem(workspace.experience);
      return {
        ...workspace,
        experience: commitDesignSystem(workspace.experience, {
          ...designSystem,
          components: {
            ...designSystem.components,
            [edit.component]: edit.variant,
          },
        }),
      };
    }

    case "set-density": {
      const designSystem = currentDesignSystem(workspace.experience);
      return {
        ...workspace,
        experience: commitDesignSystem(workspace.experience, {
          ...designSystem,
          selection: {
            ...designSystem.selection,
            density: edit.density,
          },
        }),
      };
    }

    case "set-shell": {
      const designSystem = currentDesignSystem(workspace.experience);
      return {
        ...workspace,
        experience: commitDesignSystem(workspace.experience, {
          ...designSystem,
          selection: {
            ...designSystem.selection,
            shell: edit.shell,
          },
        }),
      };
    }

    default: {
      const exhaustive: never = edit;
      return exhaustive;
    }
  }
}
