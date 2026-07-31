import { describe, expect, it } from "vitest";

import {
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  getCapabilityAsset,
  type CapabilitySelectionV1,
} from "../src/index.js";
import { lockCapabilityAsset } from "../src/assets/index.js";
import {
  assertCommerceLineConfigurationProfile,
  createCommerceLineConfigurationProfileProjection,
} from "../src/commerce/profile.js";

const foundationKeys = [
  "commerce.inventory-ledger",
  "commerce.line-configuration",
  "core.identity-context",
  "core.location-context",
] as const;

function foundationSelections(
  profile: ReturnType<typeof composeDefaultCapabilityDraft>,
): readonly CapabilitySelectionV1[] {
  const selections = profile.graph.integration.compositionSelections ?? [];
  return selections.filter((selection) =>
    foundationKeys.includes(
      selection.lock.key as (typeof foundationKeys)[number],
    ),
  );
}

function foundationBinding(
  profile: ReturnType<typeof composeDefaultCapabilityDraft>,
  key: (typeof foundationKeys)[number],
): CapabilitySelectionV1["bindings"] {
  return foundationSelections(profile).find(
    (selection) => selection.lock.key === key,
  )!.bindings;
}

describe("commercial profile composition", () => {
  it.each([
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ] as const)(
    "locks portable configurable-line semantics for %s",
    (profile) => {
      const composition = composeDefaultCapabilityDraft({ profile });
      const selection =
        composition.graph.integration.compositionSelections?.find(
          ({ lock }) => lock.key === "commerce.line-configuration",
        );

      expect(selection?.lock.version).toBe("1.1.0");
      expect(() =>
        assertCommerceLineConfigurationProfile(
          createCommerceLineConfigurationProfileProjection(
            composition.graph,
            selection?.bindings ?? {},
          ),
        ),
      ).not.toThrow();
    },
  );

  it("uses the same Foundation identities with different Restaurant and Ecommerce bindings", () => {
    const restaurant = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const ecommerce = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    const restaurantFoundation = foundationSelections(restaurant);
    const ecommerceFoundation = foundationSelections(ecommerce);

    expect(restaurantFoundation.map(({ lock }) => lock.key)).toEqual(
      foundationKeys,
    );
    expect(ecommerceFoundation.map(({ lock }) => lock.key)).toEqual(
      foundationKeys,
    );
    expect(restaurantFoundation.map(({ lock }) => lock)).toEqual(
      ecommerceFoundation.map(({ lock }) => lock),
    );
    expect(restaurantFoundation).not.toEqual(ecommerceFoundation);
    expect(restaurant.graph.domain.entities).toContainEqual(
      expect.objectContaining({ key: "menu-option-group" }),
    );
    expect(ecommerce.graph.domain.entities).toContainEqual(
      expect.objectContaining({ key: "product-option-group" }),
    );
  });

  it.each([
    {
      key: "core.identity-context" as const,
      restaurant: {
        principalEntity: {
          graphSymbol: "graph.domain.restaurant-principal",
        },
        sessionEntity: { graphSymbol: "graph.domain.table-session" },
        defaultRole: { graphSymbol: "graph.policy.customer" },
      },
      ecommerce: {
        principalEntity: { graphSymbol: "graph.domain.shopper" },
        sessionEntity: { graphSymbol: "graph.domain.shopper-session" },
        defaultRole: { graphSymbol: "graph.policy.shopper" },
      },
    },
    {
      key: "core.location-context" as const,
      restaurant: {
        locationEntity: { graphSymbol: "graph.domain.restaurant-table" },
        contextEntity: { graphSymbol: "graph.domain.table-session" },
        locationCodeField: { graphSymbol: "graph.domain.code" },
        customerRole: { graphSymbol: "graph.policy.customer" },
      },
      ecommerce: {
        locationEntity: { graphSymbol: "graph.domain.store" },
        contextEntity: { graphSymbol: "graph.domain.shopper-session" },
        locationCodeField: { graphSymbol: "graph.domain.code" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
      },
    },
    {
      key: "commerce.line-configuration" as const,
      restaurant: {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        lineEntity: { graphSymbol: "graph.domain.order-line" },
        optionGroupEntity: {
          graphSymbol: "graph.domain.menu-option-group",
        },
        optionEntity: { graphSymbol: "graph.domain.menu-option" },
        customerRole: { graphSymbol: "graph.policy.customer" },
        merchantRole: { graphSymbol: "graph.policy.manager" },
        catalogPage: { graphSymbol: "graph.page.customer-menu" },
        merchantPage: { graphSymbol: "graph.page.merchant-menu" },
      },
      ecommerce: {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        lineEntity: { graphSymbol: "graph.domain.product-line" },
        optionGroupEntity: {
          graphSymbol: "graph.domain.product-option-group",
        },
        optionEntity: { graphSymbol: "graph.domain.product-option" },
        customerRole: { graphSymbol: "graph.policy.shopper" },
        merchantRole: { graphSymbol: "graph.policy.merchant" },
        catalogPage: { graphSymbol: "graph.page.catalog" },
        merchantPage: { graphSymbol: "graph.page.merchant-catalog" },
      },
    },
    {
      key: "commerce.inventory-ledger" as const,
      restaurant: {
        catalogEntity: { graphSymbol: "graph.domain.menu-item" },
        stockField: { graphSymbol: "graph.domain.stock" },
        movementEntity: { graphSymbol: "graph.domain.inventory-ledger" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        locationEntity: {
          graphSymbol: "graph.domain.restaurant-location",
        },
        merchantRole: { graphSymbol: "graph.policy.manager" },
        auditRole: { graphSymbol: "graph.policy.manager" },
      },
      ecommerce: {
        catalogEntity: { graphSymbol: "graph.domain.product" },
        stockField: { graphSymbol: "graph.domain.stock" },
        movementEntity: { graphSymbol: "graph.domain.stock-movement" },
        orderEntity: { graphSymbol: "graph.domain.order" },
        locationEntity: { graphSymbol: "graph.domain.store" },
        merchantRole: { graphSymbol: "graph.policy.merchant" },
        auditRole: { graphSymbol: "graph.policy.merchant" },
      },
    },
  ])(
    "binds $key to distinct declared Restaurant and Ecommerce symbols",
    ({ key, restaurant: expectedRestaurant, ecommerce: expectedEcommerce }) => {
      const restaurant = composeDefaultCapabilityDraft({
        profile: "restaurant-ordering",
      });
      const ecommerce = composeDefaultCapabilityDraft({
        profile: "simple-ecommerce",
      });

      expect(foundationBinding(restaurant, key)).toEqual(expectedRestaurant);
      expect(foundationBinding(ecommerce, key)).toEqual(expectedEcommerce);
    },
  );

  it("keeps representative Restaurant and Ecommerce surfaces and fixtures distinct", () => {
    const restaurant = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph;
    const ecommerce = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    }).graph;

    expect(restaurant.page.pages).toContainEqual(
      expect.objectContaining({
        id: "merchant-menu",
        title: "Menu management",
      }),
    );
    expect(ecommerce.page.pages).toContainEqual(
      expect.objectContaining({
        id: "merchant-catalog",
        title: "Product management",
      }),
    );
    expect(restaurant.policy.roles).toEqual(
      expect.arrayContaining(["customer", "manager"]),
    );
    expect(ecommerce.policy.roles).toEqual(
      expect.arrayContaining(["shopper", "merchant"]),
    );
    expect(restaurant.domain.entities).toContainEqual(
      expect.objectContaining({
        key: "menu-option-group",
        label: "Menu option group",
      }),
    );
    expect(ecommerce.domain.entities).toContainEqual(
      expect.objectContaining({
        key: "product-option-group",
        label: "Product option group",
      }),
    );
    expect(restaurant.domain.seedData).toContainEqual(
      expect.objectContaining({
        entity: "menu-option-group",
        id: "pizza-size",
      }),
    );
    expect(ecommerce.domain.seedData).toContainEqual(
      expect.objectContaining({
        entity: "product-option-group",
        id: "tote-colour",
      }),
    );
  });

  it.each([
    {
      profile: "restaurant-ordering" as const,
      movement: "inventory-ledger",
      provenance: [
        ["restaurant-location", "locationId"],
        ["menu-item", "menuItemId"],
        ["order", "orderId"],
      ] as const,
    },
    {
      profile: "simple-ecommerce" as const,
      movement: "stock-movement",
      provenance: [
        ["store", "storeCode"],
        ["product", "productId"],
        ["order", "orderId"],
      ] as const,
    },
  ])(
    "declares distinct source fields for each $profile inventory-ledger provenance relation",
    ({ profile, movement, provenance }) => {
      const graph = composeDefaultCapabilityDraft({ profile }).graph;
      const movementEntity = graph.domain.entities.find(
        ({ key }) => key === movement,
      )!;

      for (const [target, field] of provenance) {
        expect(graph.domain.relations).toContainEqual({
          from: movement,
          to: target,
          kind: "many-to-one",
          field,
        });
        expect(movementEntity.fields).toContainEqual(
          expect.objectContaining({
            key: field,
            type: "string",
          }),
        );
      }
      expect(new Set(provenance.map(([, field]) => field)).size).toBe(3);
    },
  );

  it("uses one shopper journey and one merchant journey throughout Ecommerce", () => {
    const composition = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    const graph = composition.graph;
    const roleBindings = (
      graph.integration.compositionSelections ?? []
    ).flatMap(({ lock, bindings }) =>
      Object.entries(bindings)
        .filter(
          ([, binding]) =>
            typeof binding === "object" &&
            binding.graphSymbol.startsWith("graph.policy."),
        )
        .map(([binding, value]) => ({
          package: lock.key,
          binding,
          role:
            typeof value === "object"
              ? value.graphSymbol.replace("graph.policy.", "")
              : value,
        })),
    );

    expect(graph.policy.roles).toEqual(["shopper", "merchant"]);
    expect(roleBindings).not.toContainEqual(
      expect.objectContaining({ role: "customer" }),
    );
    expect(roleBindings).not.toContainEqual(
      expect.objectContaining({ role: "operator" }),
    );
    expect(roleBindings).toEqual(
      expect.arrayContaining([
        {
          package: "commerce.catalog",
          binding: "customerRole",
          role: "shopper",
        },
        { package: "commerce.cart", binding: "customerRole", role: "shopper" },
        {
          package: "core.identity-context",
          binding: "defaultRole",
          role: "shopper",
        },
        { package: "core.audit", binding: "actorRole", role: "merchant" },
        {
          package: "commerce.inventory-ledger",
          binding: "merchantRole",
          role: "merchant",
        },
        {
          package: "commerce.inventory-ledger",
          binding: "auditRole",
          role: "merchant",
        },
      ]),
    );
    expect(
      graph.flow.flows
        .find(({ id }) => id === "ecommerce-order")
        ?.transitions.find(({ event }) => event === "fulfil")?.roles,
    ).toEqual(["merchant"]);
    expect(graph.policy.permissions).toEqual(
      expect.arrayContaining([
        {
          role: "shopper",
          resource: "order",
          actions: ["create", "read", "update"],
        },
        {
          role: "merchant",
          resource: "order",
          actions: ["read", "update", "audit"],
        },
      ]),
    );
  });

  it.each([
    {
      profile: "restaurant-ordering" as const,
      customerRole: "customer",
      merchantRole: "manager",
      optionGroup: "menu-option-group",
      option: "menu-option",
      line: "order-line",
    },
    {
      profile: "simple-ecommerce" as const,
      customerRole: "shopper",
      merchantRole: "merchant",
      optionGroup: "product-option-group",
      option: "product-option",
      line: "product-line",
    },
  ])(
    "requires configurable-line PolicyModel permissions for $profile",
    ({ profile, customerRole, merchantRole, optionGroup, option, line }) => {
      const composition = composeDefaultCapabilityDraft({ profile });
      const requiredPermissions = [
        { role: customerRole, resource: optionGroup, actions: ["read"] },
        { role: customerRole, resource: option, actions: ["read"] },
        {
          role: customerRole,
          resource: line,
          actions: ["create", "read", "update", "delete"],
        },
        {
          role: merchantRole,
          resource: optionGroup,
          actions: ["create", "read", "update"],
        },
        {
          role: merchantRole,
          resource: option,
          actions: ["create", "read", "update"],
        },
        {
          role: merchantRole,
          resource: line,
          actions: ["read", "audit"],
        },
      ];

      for (const permission of requiredPermissions) {
        expect(composition.graph.policy.permissions).toContainEqual(permission);
      }

      const graphWithoutCustomerRead = structuredClone(composition.graph);
      graphWithoutCustomerRead.policy.permissions =
        graphWithoutCustomerRead.policy.permissions.filter(
          (permission) =>
            !(
              permission.role === customerRole &&
              permission.resource === optionGroup
            ),
        );

      expect(() =>
        composeCapabilityDraft({
          graph: graphWithoutCustomerRead,
          selections:
            graphWithoutCustomerRead.integration.compositionSelections ?? [],
        }),
      ).toThrow(`${customerRole}:${optionGroup}`);
    },
  );

  it.each([
    {
      profile: "restaurant-ordering" as const,
      package: "core.identity-context",
      role: "customer",
      resource: "restaurant-principal",
      action: "read",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "core.identity-context",
      role: "customer",
      resource: "table-session",
      action: "create",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "core.location-context",
      role: "customer",
      resource: "restaurant-table",
      action: "read",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "commerce.line-configuration",
      role: "manager",
      resource: "menu-option",
      action: "update",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "commerce.inventory-ledger",
      role: "manager",
      resource: "inventory-ledger",
      action: "create",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "commerce.inventory-ledger",
      role: "manager",
      resource: "restaurant-location",
      action: "read",
    },
    {
      profile: "restaurant-ordering" as const,
      package: "commerce.inventory-ledger",
      role: "manager",
      resource: "inventory-ledger",
      action: "audit",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "core.identity-context",
      role: "shopper",
      resource: "shopper",
      action: "read",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "core.identity-context",
      role: "shopper",
      resource: "shopper-session",
      action: "create",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "core.location-context",
      role: "shopper",
      resource: "store",
      action: "read",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "commerce.line-configuration",
      role: "merchant",
      resource: "product-option",
      action: "update",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "commerce.inventory-ledger",
      role: "merchant",
      resource: "stock-movement",
      action: "create",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "commerce.inventory-ledger",
      role: "merchant",
      resource: "store",
      action: "read",
    },
    {
      profile: "simple-ecommerce" as const,
      package: "commerce.inventory-ledger",
      role: "merchant",
      resource: "stock-movement",
      action: "audit",
    },
  ])(
    "fails closed when $profile removes $package permission $role:$resource:$action",
    ({ profile, role, resource, action }) => {
      const composition = composeDefaultCapabilityDraft({ profile });
      const graph = structuredClone(composition.graph);
      const matchingPermissions = graph.policy.permissions.filter(
        (permission) =>
          permission.role === role && permission.resource === resource,
      );
      expect(
        matchingPermissions.some((permission) =>
          permission.actions.includes(action),
        ),
      ).toBe(true);
      for (const permission of matchingPermissions) {
        permission.actions = permission.actions.filter(
          (candidate) => candidate !== action,
        );
      }
      graph.policy.permissions = graph.policy.permissions.filter(
        (permission) => permission.actions.length > 0,
      );

      expect(() =>
        composeCapabilityDraft({
          graph,
          selections: graph.integration.compositionSelections ?? [],
        }),
      ).toThrow(`${role}:${resource}`);
    },
  );

  it("rejects an undeclared provider overlap before resolving bindings", () => {
    const composition = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const selections = [
      ...(composition.graph.integration.compositionSelections ?? []),
      {
        lock: lockCapabilityAsset(getCapabilityAsset("restaurant.menu")),
        bindings: {},
      },
    ];

    expect(() =>
      composeCapabilityDraft({
        graph: composition.graph,
        selections,
      }),
    ).toThrow("inventory.adjust");
  });

  it.each([
    {
      name: "non-unique idempotency field",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        const ledger = graph.domain.entities.find(
          ({ key }) => key === "inventory-ledger",
        )!;
        ledger.fields.find(({ key }) => key === "idempotencyKey")!.unique =
          false;
      },
    },
    {
      name: "missing unique idempotency index",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        const ledger = graph.domain.entities.find(
          ({ key }) => key === "inventory-ledger",
        )!;
        ledger.indexes = ledger.indexes.filter(
          ({ fields, unique }) =>
            unique !== true || fields.join(",") !== "idempotencyKey",
        );
      },
    },
    {
      name: "missing movement-to-location relation",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        graph.domain.relations = graph.domain.relations.filter(
          ({ from, to }) =>
            !(from === "inventory-ledger" && to === "restaurant-location"),
        );
      },
    },
    {
      name: "missing movement-to-location relation field",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        const relation = graph.domain.relations.find(
          ({ from, to }) =>
            from === "inventory-ledger" && to === "restaurant-location",
        )!;
        delete relation.field;
      },
    },
    {
      name: "movement-to-location relation using the catalog field",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        const relation = graph.domain.relations.find(
          ({ from, to }) =>
            from === "inventory-ledger" && to === "restaurant-location",
        )!;
        relation.field = "menuItemId";
      },
    },
    {
      name: "missing movement-to-catalog relation",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        graph.domain.relations = graph.domain.relations.filter(
          ({ from, to }) =>
            !(from === "inventory-ledger" && to === "menu-item"),
        );
      },
    },
    {
      name: "missing movement-to-order relation",
      mutate: (
        graph: ReturnType<typeof composeDefaultCapabilityDraft>["graph"],
      ) => {
        graph.domain.relations = graph.domain.relations.filter(
          ({ from, to }) => !(from === "inventory-ledger" && to === "order"),
        );
      },
    },
  ])("rejects the active Restaurant composition with $name", ({ mutate }) => {
    const composition = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const graph = structuredClone(composition.graph);
    mutate(graph);

    expect(() =>
      composeCapabilityDraft({
        graph,
        selections: graph.integration.compositionSelections ?? [],
      }),
    ).toThrow("commerce.inventory-ledger");
  });

  it("does not impose inventory-ledger provenance when the package is not selected", () => {
    const profile = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const selections = (
      profile.graph.integration.compositionSelections ?? []
    ).filter(({ lock }) => lock.key !== "commerce.inventory-ledger");

    const result = composeCapabilityDraft({
      graph: profile.graph,
      selections,
    });

    expect(
      result.composition.packages.some(
        ({ lock }) => lock.key === "commerce.inventory-ledger",
      ),
    ).toBe(false);
  });

  it("rejects a Foundation binding that references no declared Graph symbol", () => {
    const profile = composeDefaultCapabilityDraft({
      profile: "simple-ecommerce",
    });
    const selections = (profile.graph.integration.compositionSelections ?? [])
      .map((selection) => structuredClone(selection))
      .map((selection) =>
        selection.lock.key === "core.location-context"
          ? {
              ...selection,
              bindings: {
                ...selection.bindings,
                locationEntity: {
                  graphSymbol: "graph.domain.missing",
                },
              },
            }
          : selection,
      );

    expect(() =>
      composeCapabilityDraft({
        graph: profile.graph,
        selections,
      }),
    ).toThrow("graph.domain.missing");
  });
});
