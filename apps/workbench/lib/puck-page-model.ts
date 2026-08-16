import type { PageModel } from "@factory/graph";

type PageBlock = PageModel["pages"][number]["blocks"][number];

const puckTypeByBlockType = {
  hero: "Hero",
  collection: "Collection",
  form: "Form",
  catalog: "Catalog",
  cart: "Cart",
  queue: "Queue",
  checkout: "Checkout",
  stats: "Stats",
  list: "List",
  detail: "Detail",
  calendar: "Calendar",
  settings: "Settings",
} as const;

type SupportedBlockType = keyof typeof puckTypeByBlockType;
export type PuckBlockType = (typeof puckTypeByBlockType)[SupportedBlockType];

const blockTypeByPuckType = Object.fromEntries(
  Object.entries(puckTypeByBlockType).map(([blockType, puckType]) => [
    puckType,
    blockType,
  ]),
) as Record<PuckBlockType, SupportedBlockType>;

export type PuckVisualBlock = {
  readonly type: PuckBlockType;
  readonly props: Record<string, unknown>;
};

export const puckBlockTypes = Object.values(puckTypeByBlockType);

function isSupportedBlock(block: PageBlock): block is PageBlock & {
  readonly type: SupportedBlockType;
} {
  return Object.hasOwn(puckTypeByBlockType, block.type);
}

function displayTitle(block: PageBlock) {
  return typeof block.props?.title === "string" && block.props.title.trim()
    ? block.props.title
    : block.type
        .split("-")
        .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
        .join(" ");
}

function readText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** Converts Factory-owned supported blocks into the small Puck document surface. */
export function pageModelToPuckBlocks(
  pageModel: PageModel,
  pageId: string,
): readonly PuckVisualBlock[] {
  const page = pageModel.pages.find((entry) => entry.id === pageId);
  if (!page) return [];
  return page.blocks.filter(isSupportedBlock).map((block) => {
    if (block.type === "hero") {
      return {
        type: "Hero",
        props: {
          id: block.id,
          eyebrow: readText(block.props?.eyebrow, "Operations"),
          heading: readText(block.props?.heading, "Shape the next decision."),
        },
      };
    }
    return {
      type: puckTypeByBlockType[block.type],
      props: { id: block.id, title: displayTitle(block) },
    };
  });
}

function isPuckBlockType(value: unknown): value is PuckBlockType {
  return typeof value === "string" && Object.hasOwn(blockTypeByPuckType, value);
}

function generatedBlockId(
  type: SupportedBlockType,
  position: number,
  used: Set<string>,
) {
  const base = `puck-${type}-${position + 1}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Applies a Puck edit only to supported declared blocks. Unsupported Graph
 * blocks retain their relative slots, and existing entity bindings stay on
 * their declared block. All Puck props are reduced to the adapter's declared
 * text surface before they become Graph data.
 */
export function applyPuckBlocksToPageModel(
  pageModel: PageModel,
  pageId: string,
  visualBlocks: readonly PuckVisualBlock[],
): PageModel {
  const page = pageModel.pages.find((entry) => entry.id === pageId);
  if (!page) throw new Error(`Unknown page '${pageId}'.`);
  const supportedById = new Map(
    page.blocks.filter(isSupportedBlock).map((block) => [block.id, block]),
  );
  const used = new Set(page.blocks.map((block) => block.id));
  const outputIds = new Set<string>();
  const nextSupported: PageBlock[] = [];

  visualBlocks.forEach((visual, position) => {
    if (!isPuckBlockType(visual.type)) return;
    const blockType = blockTypeByPuckType[visual.type];
    const requestedId =
      typeof visual.props.id === "string" ? visual.props.id : undefined;
    const existing = requestedId ? supportedById.get(requestedId) : undefined;
    const canReuse =
      existing?.type === blockType && !outputIds.has(existing.id);
    const id = canReuse
      ? existing.id
      : generatedBlockId(blockType, position, new Set([...used, ...outputIds]));
    outputIds.add(id);
    const existingProps = existing?.props ?? {};

    if (blockType === "hero") {
      nextSupported.push({
        id,
        type: "hero",
        ...(existing?.entity ? { entity: existing.entity } : {}),
        ...(existing?.bindings
          ? { bindings: structuredClone(existing.bindings) }
          : {}),
        props: {
          ...existingProps,
          eyebrow: readText(
            visual.props.eyebrow,
            readText(existingProps.eyebrow, "Operations"),
          ),
          heading: readText(
            visual.props.heading,
            readText(existingProps.heading, "Shape the next decision."),
          ),
        },
      });
      return;
    }

    nextSupported.push({
      id,
      type: blockType,
      ...(existing?.entity ? { entity: existing.entity } : {}),
      ...(existing?.bindings
        ? { bindings: structuredClone(existing.bindings) }
        : {}),
      props: {
        ...existingProps,
        title: readText(
          visual.props.title,
          displayTitle(existing ?? { id, type: blockType }),
        ),
      },
    });
  });

  const nextBlocks: PageBlock[] = [];
  const remainingSupported = [...nextSupported];
  for (const block of page.blocks) {
    if (isSupportedBlock(block)) {
      const replacement = remainingSupported.shift();
      if (replacement) nextBlocks.push(replacement);
      continue;
    }
    nextBlocks.push(structuredClone(block));
  }
  nextBlocks.push(...remainingSupported);
  return {
    ...pageModel,
    pages: pageModel.pages.map((entry) =>
      entry.id === pageId
        ? {
            ...entry,
            blocks: nextBlocks,
          }
        : entry,
    ),
  };
}
