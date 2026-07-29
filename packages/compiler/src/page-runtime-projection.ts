import type { ApplicationGraphV1 } from "@factory/graph";

export const generatedPageRuntimeApiVersion =
  "factory.generated-page-runtime/v1" as const;

export const generatedPageRuntimeBlockTypes = [
  "hero",
  "form",
  "collection",
  "catalog",
  "cart",
  "queue",
  "checkout",
] as const;

export type GeneratedPageRuntimeBlockTypeV1 =
  (typeof generatedPageRuntimeBlockTypes)[number];

export type GeneratedPageRuntimeSafePropV1 = "title" | "eyebrow" | "heading";

export interface GeneratedPageRuntimeBlockV1 {
  readonly id: string;
  readonly type: GeneratedPageRuntimeBlockTypeV1;
  readonly entity?: string;
  readonly props: Readonly<
    Partial<Record<GeneratedPageRuntimeSafePropV1, string>>
  >;
}

export interface GeneratedPageRuntimePageV1 {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly blocks: readonly GeneratedPageRuntimeBlockV1[];
}

export interface GeneratedPageRuntimeNavigationV1 {
  readonly id: string;
  readonly label: string;
  readonly route: string;
}

export interface GeneratedPageRuntimeRouteFallbackV1 {
  readonly rootRoute: string | null;
  readonly unknownRoute: "not-found";
}

export interface GeneratedPageRuntimeProjectionV1 {
  readonly apiVersion: typeof generatedPageRuntimeApiVersion;
  readonly applicationName: string;
  readonly themeMode: ApplicationGraphV1["experience"]["theme"]["mode"];
  readonly pages: readonly GeneratedPageRuntimePageV1[];
  readonly navigation: readonly GeneratedPageRuntimeNavigationV1[];
  readonly routeFallback: GeneratedPageRuntimeRouteFallbackV1;
}

type PageBlock = ApplicationGraphV1["page"]["pages"][number]["blocks"][number];

const entityBoundBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "form",
  "collection",
  "catalog",
  "cart",
  "queue",
  "checkout",
]);

const orderEntityBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "cart",
  "checkout",
]);

const requiredFactoryCapabilityByBlockType: Readonly<
  Partial<
    Record<
      GeneratedPageRuntimeBlockTypeV1,
      Readonly<{ key: string; operation: string }>
    >
  >
> = {
  catalog: { key: "cart.add", operation: "add" },
  checkout: { key: "payment.simulate", operation: "simulate" },
};

const safePropKeys: readonly GeneratedPageRuntimeSafePropV1[] = [
  "title",
  "eyebrow",
  "heading",
];

function isGeneratedPageRuntimeBlockType(
  value: string,
): value is GeneratedPageRuntimeBlockTypeV1 {
  return generatedPageRuntimeBlockTypes.some((type) => type === value);
}

function projectSafeProps(
  props: PageBlock["props"],
): GeneratedPageRuntimeBlockV1["props"] {
  const projected: Partial<Record<GeneratedPageRuntimeSafePropV1, string>> = {};
  for (const key of safePropKeys) {
    const value = props?.[key];
    if (typeof value === "string") projected[key] = value;
  }
  return projected;
}

function requireBoundEntity(
  block: PageBlock,
  entityKeys: ReadonlySet<string>,
): string {
  if (!block.entity) {
    throw new Error(
      `PageModel block '${block.type}' requires an entity binding.`,
    );
  }
  if (!entityKeys.has(block.entity)) {
    throw new Error(
      `PageModel block '${block.type}' references unknown entity '${block.entity}'.`,
    );
  }
  return block.entity;
}

function assertCanonicalLocalRoute(route: string): void {
  const localOrigin = "https://factory.invalid";
  const resolved = new URL(route, localOrigin);
  if (
    !route.startsWith("/") ||
    resolved.origin !== localOrigin ||
    resolved.pathname !== route ||
    resolved.search ||
    resolved.hash
  ) {
    throw new Error(
      `PageModel route '${route}' must be a canonical local route.`,
    );
  }
}

function projectBlock(
  block: PageBlock,
  entityKeys: ReadonlySet<string>,
  factoryCapabilities: readonly ApplicationGraphV1["integration"]["capabilities"][number][],
): GeneratedPageRuntimeBlockV1 {
  if (!isGeneratedPageRuntimeBlockType(block.type)) {
    throw new Error(`Unsupported PageModel block '${block.type}'.`);
  }

  const requiredCapability = requiredFactoryCapabilityByBlockType[block.type];
  if (
    requiredCapability &&
    !factoryCapabilities.some(
      (capability) =>
        capability.key === requiredCapability.key &&
        capability.operation === requiredCapability.operation,
    )
  ) {
    throw new Error(
      `PageModel block '${block.type}' requires Factory capability '${requiredCapability.key}'.`,
    );
  }

  const entity = entityBoundBlockTypes.has(block.type)
    ? requireBoundEntity(block, entityKeys)
    : undefined;
  if (entity && orderEntityBlockTypes.has(block.type) && entity !== "order") {
    throw new Error(
      `PageModel block '${block.type}' requires the 'order' entity.`,
    );
  }

  return {
    id: block.id,
    type: block.type,
    ...(entity ? { entity } : {}),
    props: projectSafeProps(block.props),
  };
}

/**
 * Projects a published Graph PageModel into the bounded data surface consumed
 * by Factory-owned generated web components. It never forwards arbitrary
 * block properties, component references, URLs, bindings, or executable code.
 */
export function createGeneratedPageRuntimeProjection(
  graph: ApplicationGraphV1,
): GeneratedPageRuntimeProjectionV1 {
  const entityKeys = new Set(graph.domain.entities.map((entity) => entity.key));
  const factoryCapabilities = graph.integration.capabilities.filter(
    (capability) => capability.providerId === "factory",
  );
  const pages = graph.page.pages.map((page) => {
    assertCanonicalLocalRoute(page.route);
    return {
      id: page.id,
      route: page.route,
      title: page.title,
      blocks: page.blocks.map((block) =>
        projectBlock(block, entityKeys, factoryCapabilities),
      ),
    };
  });
  const pagesById = new Map(pages.map((page) => [page.id, page]));

  return {
    apiVersion: generatedPageRuntimeApiVersion,
    applicationName: graph.metadata.name,
    themeMode: graph.experience.theme.mode,
    pages,
    navigation: graph.page.navigation.map((item) => {
      const page = pagesById.get(item.pageId);
      if (!page) {
        throw new Error(
          `Navigation item '${item.id}' references unknown page '${item.pageId}'.`,
        );
      }
      return { id: item.id, label: item.label, route: page.route };
    }),
    routeFallback: {
      rootRoute:
        pages.find((page) => page.route === "/")?.route ??
        pages[0]?.route ??
        null,
      unknownRoute: "not-found",
    },
  };
}
