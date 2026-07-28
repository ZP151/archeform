import type { PageModel } from "@factory/graph";

/**
 * Converts one schema-declared Puck Hero property into a Graph Draft change.
 * The editor cannot introduce routes, arbitrary components, or source code.
 */
export function replaceHeroHeading(
  page: PageModel,
  blockId: string,
  heading: string,
): PageModel {
  return {
    ...page,
    pages: page.pages.map((entry) => ({
      ...entry,
      blocks: entry.blocks.map((block) =>
        block.id === blockId && block.type === "hero"
          ? { ...block, props: { ...block.props, heading } }
          : block,
      ),
    })),
  };
}
