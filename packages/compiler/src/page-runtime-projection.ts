import { hasRestaurantOrderingComposition } from "@factory/capabilities";
import type { ApplicationGraphV1 } from "@factory/graph";

export const generatedPageRuntimeApiVersion =
  "factory.generated-page-runtime/v1" as const;

export const generatedPageRuntimeBlockTypes = [
  "hero",
  "form",
  "collection",
  "catalog",
  "catalog-configurator",
  "cart",
  "queue",
  "checkout",
  "restaurant-entry",
  "menu-browser",
  "order-cart",
  "payment-checkout",
  "order-tracker",
  "receipt",
  "table-board",
  "menu-manager",
  "kitchen-board",
  "cashier-console",
  "restaurant-dashboard",
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

export interface GeneratedPageRuntimeCommerceV1 {
  readonly orderEntity: string | null;
  readonly paymentEvent: string | null;
}

export interface GeneratedPageRuntimeBindingsV1 {
  /** Resolved only from the immutable composition lock by the compiler. */
  readonly orderEntity?: string;
}

export interface GeneratedPageRuntimeProjectionV1 {
  readonly apiVersion: typeof generatedPageRuntimeApiVersion;
  readonly applicationName: string;
  readonly themeMode: ApplicationGraphV1["experience"]["theme"]["mode"];
  readonly pages: readonly GeneratedPageRuntimePageV1[];
  readonly navigation: readonly GeneratedPageRuntimeNavigationV1[];
  readonly routeFallback: GeneratedPageRuntimeRouteFallbackV1;
  readonly commerce: GeneratedPageRuntimeCommerceV1;
}

type PageBlock = ApplicationGraphV1["page"]["pages"][number]["blocks"][number];

const entityBoundBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "form",
  "collection",
  "catalog",
  "catalog-configurator",
  "cart",
  "queue",
  "checkout",
  "restaurant-entry",
  "menu-browser",
  "order-cart",
  "payment-checkout",
  "order-tracker",
  "receipt",
  "table-board",
  "menu-manager",
  "kitchen-board",
  "cashier-console",
]);

const orderEntityBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "cart",
  "checkout",
  "order-cart",
  "payment-checkout",
  "order-tracker",
  "receipt",
  "cashier-console",
]);

const interactiveCommerceBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "catalog",
  "cart",
  "checkout",
]);

const restaurantStructuralBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>(
  [
    "restaurant-entry",
    "menu-browser",
    "order-cart",
    "payment-checkout",
    "order-tracker",
    "receipt",
    "table-board",
    "menu-manager",
    "kitchen-board",
    "cashier-console",
    "restaurant-dashboard",
  ],
);

const restaurantCustomerBlockTypes = new Set<GeneratedPageRuntimeBlockTypeV1>([
  "restaurant-entry",
  "menu-browser",
  "order-cart",
  "payment-checkout",
  "order-tracker",
  "receipt",
]);

const restaurantAuthorityKeys = new Set([
  "locationid",
  "restaurantlocationid",
  "restauranttablecode",
  "restauranttableid",
  "session",
  "sessionid",
  "sessiontoken",
  "tablecode",
  "tableid",
  "tablesessionid",
  "tablesessiontoken",
  "token",
  "tokendigest",
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
  "catalog-configurator": {
    key: "catalog.option.select",
    operation: "select",
  },
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
  if (
    route === "/api" ||
    route.startsWith("/api/") ||
    route === "/_next" ||
    route.startsWith("/_next/") ||
    route === "/favicon.ico"
  ) {
    throw new Error(
      `PageModel route '${route}' is reserved by the generated Next application.`,
    );
  }
}

function resolveCommerceRuntime(
  graph: ApplicationGraphV1,
  factoryCapabilities: readonly ApplicationGraphV1["integration"]["capabilities"][number][],
  bindings: GeneratedPageRuntimeBindingsV1,
): GeneratedPageRuntimeCommerceV1 {
  const commerceBlocks = graph.page.pages.flatMap((page) =>
    page.blocks.filter(
      (block): block is PageBlock & { type: GeneratedPageRuntimeBlockTypeV1 } =>
        interactiveCommerceBlockTypes.has(
          block.type as GeneratedPageRuntimeBlockTypeV1,
        ),
    ),
  );
  if (commerceBlocks.length === 0) {
    return { orderEntity: null, paymentEvent: null };
  }

  if (
    !factoryCapabilities.some(
      (capability) =>
        capability.key === "cart.add" && capability.operation === "add",
    )
  ) {
    throw new Error(
      "Interactive commerce PageModel blocks require Factory capability 'cart.add' with operation 'add'.",
    );
  }

  if (
    !factoryCapabilities.some(
      (capability) =>
        capability.key === "payment.simulate" &&
        capability.operation === "simulate",
    )
  ) {
    throw new Error(
      "Interactive commerce PageModel blocks require Factory capability 'payment.simulate' with operation 'simulate'.",
    );
  }

  const orderEntity =
    bindings.orderEntity ??
    (graph.domain.entities.some((entity) => entity.key === "order")
      ? "order"
      : undefined);
  if (
    !orderEntity ||
    !graph.domain.entities.some((entity) => entity.key === orderEntity)
  ) {
    throw new Error(
      "Interactive commerce PageModel blocks require a declared locked order entity.",
    );
  }

  const orderFlow = graph.flow.flows.find(
    (flow) => flow.entity === orderEntity,
  );
  if (!orderFlow) {
    throw new Error(
      `Interactive commerce PageModel blocks require a FlowModel for entity '${orderEntity}'.`,
    );
  }

  const paymentTransition = orderFlow.transitions.find((transition) =>
    (transition.effects ?? []).some(
      (effect) =>
        effect.capability === "payment.simulate" &&
        effect.operation === "simulate",
    ),
  );
  if (!paymentTransition) {
    throw new Error(
      `Interactive commerce PageModel blocks require an '${orderEntity}' FlowModel transition with Factory effect 'payment.simulate' and operation 'simulate'.`,
    );
  }

  return {
    orderEntity,
    paymentEvent: paymentTransition?.event ?? null,
  };
}

function projectBlock(
  block: PageBlock,
  entityKeys: ReadonlySet<string>,
  factoryCapabilities: readonly ApplicationGraphV1["integration"]["capabilities"][number][],
  hasRestaurantRuntime: boolean,
  orderEntity: string | null,
): GeneratedPageRuntimeBlockV1 {
  if (!isGeneratedPageRuntimeBlockType(block.type)) {
    throw new Error(`Unsupported PageModel block '${block.type}'.`);
  }
  if (restaurantStructuralBlockTypes.has(block.type) && !hasRestaurantRuntime) {
    throw new Error(
      `Restaurant PageModel block '${block.type}' requires the complete locked Restaurant package set.`,
    );
  }
  if (restaurantCustomerBlockTypes.has(block.type)) {
    const authorityKeys = [
      ...Object.keys(block.props ?? {}),
      ...Object.keys(block.bindings ?? {}),
    ].map((key) => key.replace(/[-_]/g, "").toLowerCase());
    if (authorityKeys.some((key) => restaurantAuthorityKeys.has(key))) {
      throw new Error(
        `Restaurant Customer block '${block.type}' accepts only an opaque table-session route token; raw table or session bindings are forbidden.`,
      );
    }
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
  const expectedOrderEntity =
    orderEntity ?? (hasRestaurantRuntime ? "order" : undefined);
  if (
    entity &&
    orderEntityBlockTypes.has(block.type) &&
    (!expectedOrderEntity || entity !== expectedOrderEntity)
  ) {
    throw new Error(
      `PageModel block '${block.type}' requires the '${expectedOrderEntity ?? "order"}' entity.`,
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
  bindings: GeneratedPageRuntimeBindingsV1 = {},
): GeneratedPageRuntimeProjectionV1 {
  const entityKeys = new Set(graph.domain.entities.map((entity) => entity.key));
  const factoryCapabilities = graph.integration.capabilities.filter(
    (capability) => capability.providerId === "factory",
  );
  const hasRestaurantRuntime = hasRestaurantOrderingComposition(graph);
  const commerce = resolveCommerceRuntime(graph, factoryCapabilities, bindings);
  const pages = graph.page.pages.map((page) => {
    assertCanonicalLocalRoute(page.route);
    return {
      id: page.id,
      route: page.route,
      title: page.title,
      blocks: page.blocks.map((block) =>
        projectBlock(
          block,
          entityKeys,
          factoryCapabilities,
          hasRestaurantRuntime,
          commerce.orderEntity,
        ),
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
    commerce,
  };
}
