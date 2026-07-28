import type { PageModel } from "@factory/graph";

type PageEntry = PageModel["pages"][number];
type NavigationEntry = PageModel["navigation"][number];

const pageIdPattern = /^[a-z][a-z0-9-]*$/;

function assertPageDetails(page: Pick<PageEntry, "id" | "route" | "title">) {
  if (page.id.length > 128 || !pageIdPattern.test(page.id)) {
    throw new Error(`Page id '${page.id}' is invalid.`);
  }
  if (!page.route.startsWith("/")) {
    throw new Error(`Route '${page.route}' must begin with '/'.`);
  }
  if (!page.title.trim() || page.title.length > 160) {
    throw new Error(
      "Page title is required and must be at most 160 characters.",
    );
  }
}

function assertNavigationDetails(navigation: Omit<NavigationEntry, "pageId">) {
  if (navigation.id.length > 128 || !pageIdPattern.test(navigation.id)) {
    throw new Error(`Navigation id '${navigation.id}' is invalid.`);
  }
  if (!navigation.label.trim() || navigation.label.length > 80) {
    throw new Error(
      "Navigation label is required and must be at most 80 characters.",
    );
  }
  if (
    navigation.icon !== undefined &&
    (!navigation.icon.trim() || navigation.icon.length > 80)
  ) {
    throw new Error("Navigation icon must be between 1 and 80 characters.");
  }
}

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

/** Adds a route and, optionally, navigation that is forced to target that route. */
export function addPage(
  pageModel: PageModel,
  page: PageEntry & { readonly navigation?: Omit<NavigationEntry, "pageId"> },
): PageModel {
  assertPageDetails(page);
  if (page.navigation) assertNavigationDetails(page.navigation);
  if (pageModel.pages.some((candidate) => candidate.id === page.id)) {
    throw new Error(`Page '${page.id}' already exists.`);
  }
  if (pageModel.pages.some((candidate) => candidate.route === page.route)) {
    throw new Error(`PageModel already uses route '${page.route}'.`);
  }
  if (
    page.navigation &&
    pageModel.navigation.some(
      (candidate) => candidate.id === page.navigation?.id,
    )
  ) {
    throw new Error(`Navigation item '${page.navigation.id}' already exists.`);
  }
  const { navigation, ...entry } = page;
  return {
    ...pageModel,
    pages: [...pageModel.pages, structuredClone(entry)],
    navigation: navigation
      ? [...pageModel.navigation, { ...navigation, pageId: page.id }]
      : pageModel.navigation,
  };
}

/** Changes only route metadata; it cannot re-key a page or alter its blocks. */
export function setPageDetails(
  pageModel: PageModel,
  pageId: string,
  details: Partial<Pick<PageEntry, "route" | "title">>,
): PageModel {
  const page = pageModel.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Unknown page '${pageId}'.`);
  const route = details.route ?? page.route;
  const title = details.title ?? page.title;
  assertPageDetails({ id: page.id, route, title });
  if (
    pageModel.pages.some(
      (candidate) => candidate.id !== pageId && candidate.route === route,
    )
  ) {
    throw new Error(`PageModel already uses route '${route}'.`);
  }
  return {
    ...pageModel,
    pages: pageModel.pages.map((candidate) =>
      candidate.id === pageId ? { ...candidate, route, title } : candidate,
    ),
  };
}

/** Binds a pre-existing block to a declared entity selected by the parent Studio. */
export function setPageBlockEntity(
  pageModel: PageModel,
  pageId: string,
  blockId: string,
  entity: string | undefined,
): PageModel {
  const page = pageModel.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Unknown page '${pageId}'.`);
  if (!page.blocks.some((block) => block.id === blockId)) {
    throw new Error(`Page '${pageId}' has no block '${blockId}'.`);
  }
  return {
    ...pageModel,
    pages: pageModel.pages.map((candidate) =>
      candidate.id === pageId
        ? {
            ...candidate,
            blocks: candidate.blocks.map((block) =>
              block.id === blockId
                ? entity
                  ? { ...block, entity }
                  : (() => {
                      const { entity: _entity, ...unbound } = block;
                      return unbound;
                    })()
                : block,
            ),
          }
        : candidate,
    ),
  };
}
