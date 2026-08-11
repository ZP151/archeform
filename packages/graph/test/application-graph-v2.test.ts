import { describe, expect, it } from "vitest";

import {
  assertApplicationGraphV2,
  hashApplicationGraphV2,
} from "../src/index.js";

function validGraphV2(): Record<string, any> {
  return {
    apiVersion: "factory.application-graph/v2",
    metadata: {
      id: "restaurant-app",
      workspaceId: "local-workspace",
      name: "Maison Ember",
    },
    surfaces: [
      {
        apiVersion: "factory.application-surface/v1",
        key: "customer-mobile",
        label: "Customer",
        kind: "customer",
        audienceRoles: ["customer"],
        device: "mobile",
        entryPageKey: "home",
        navigation: {
          pattern: "bottom-tabs",
          items: [
            { pageKey: "home", label: "Home", icon: "house" },
            { pageKey: "orders", label: "Orders", icon: "receipt" },
          ],
        },
        responsive: { minimumWidth: 320, maximumContentWidth: 480 },
      },
    ],
    page: {
      pages: [
        {
          id: "home",
          route: "/",
          title: "Home",
          blocks: [
            {
              id: "order-summary",
              type: "order-summary",
              entity: "order",
              bindings: { total: "graph.domain.order.total" },
            },
          ],
          surfaceKey: "customer-mobile",
          screenIntent: {
            apiVersion: "factory.screen-intent/v1",
            key: "home",
            label: "Home",
            purpose: "discovery",
            primaryJourneyKeys: ["place-order"],
            entityKeys: ["order"],
            capabilityKeys: ["commerce.orders"],
            recipeKey: "restaurant-customer-home",
            preferredViewport: "mobile",
          },
          recipe: {
            key: "restaurant-customer-home",
            version: "1.0.0",
            regions: [{ key: "main", blockIds: ["order-summary"] }],
          },
        },
        {
          id: "orders",
          route: "/orders",
          title: "Orders",
          blocks: [],
          surfaceKey: "customer-mobile",
          screenIntent: {
            apiVersion: "factory.screen-intent/v1",
            key: "orders",
            label: "Orders",
            purpose: "tracking",
            primaryJourneyKeys: ["place-order"],
            entityKeys: ["order"],
            capabilityKeys: ["commerce.orders"],
            recipeKey: "restaurant-customer-orders",
            preferredViewport: "mobile",
          },
          recipe: {
            key: "restaurant-customer-orders",
            version: "1.0.0",
            regions: [],
          },
        },
      ],
    },
    domain: {
      entities: [
        {
          key: "order",
          label: "Order",
          fields: [
            { key: "total", type: "decimal", required: true },
            {
              key: "status",
              type: "enum",
              required: true,
              values: ["draft", "submitted"],
            },
            { key: "placedAt", type: "datetime", required: true },
          ],
          indexes: [],
        },
      ],
      relations: [],
    },
    policy: {
      roles: ["customer"],
      permissions: [
        {
          role: "customer",
          resource: "order",
          actions: ["read", "submit"],
        },
      ],
    },
    flow: {
      flows: [
        {
          id: "order-flow",
          entity: "order",
          initialState: "draft",
          states: ["draft", "submitted"],
          events: ["submit"],
          transitions: [
            {
              from: "draft",
              event: "submit",
              to: "submitted",
              roles: ["customer"],
            },
          ],
        },
      ],
    },
    integration: {
      providers: [],
      capabilities: [
        {
          key: "commerce.orders",
          providerId: "factory",
          operation: "manage",
        },
      ],
    },
    experience: {
      theme: { mode: "light", tokens: { accent: "ember" } },
      locales: ["en"],
      responsiveNavigation: [
        { surfaceKey: "customer-mobile", compactAt: 720, collapse: "tabs" },
      ],
    },
    seedScenarios: [
      {
        key: "dinner-service",
        label: "Dinner service",
        actorKeys: ["customer"],
        records: [
          {
            entityKey: "order",
            values: {
              total: 42,
              status: "draft",
              placedAt: "2026-08-12T12:00:00.000Z",
            },
          },
        ],
      },
    ],
    journeys: [
      {
        key: "place-order",
        label: "Place order",
        actorRoleKey: "customer",
        flowKeys: ["order-flow"],
        entryPageKey: "home",
        outcome: "A customer submits an order.",
      },
    ],
    fieldAuthorities: [
      { entityKey: "order", fieldKey: "total", authority: "server" },
      { entityKey: "order", fieldKey: "status", authority: "server" },
      { entityKey: "order", fieldKey: "placedAt", authority: "server" },
    ],
    bindingPolicies: [
      {
        pageId: "home",
        blockId: "order-summary",
        bindingKey: "total",
        entityKey: "order",
        fieldKey: "total",
        access: "read",
        authority: "server",
      },
    ],
  };
}

describe("ApplicationGraphV2", () => {
  it("accepts a strict graph and hashes canonical object keys with meaningful array order", () => {
    const graph = validGraphV2();
    expect(assertApplicationGraphV2(graph)).toEqual(graph);

    const reordered = {
      ...graph,
      metadata: {
        name: graph.metadata.name,
        workspaceId: graph.metadata.workspaceId,
        id: graph.metadata.id,
      },
    };
    expect(hashApplicationGraphV2(reordered)).toBe(
      hashApplicationGraphV2(graph),
    );
    expect(hashApplicationGraphV2(graph)).toBe(
      "sha256:5259c788d7fe1629c0e8271e6dd00925227227305e8dcb5a9df5124f8cdb5dae",
    );
    expect(hashApplicationGraphV2(graph)).toMatch(/^sha256:[a-f0-9]{64}$/);

    const arrayReordered = validGraphV2();
    arrayReordered.page.pages.reverse();
    expect(hashApplicationGraphV2(arrayReordered)).not.toBe(
      hashApplicationGraphV2(graph),
    );
  });

  it("rejects unknown versions and extra keys at nested boundaries", () => {
    expect(() =>
      assertApplicationGraphV2({
        ...validGraphV2(),
        apiVersion: "factory.application-graph/v3",
      }),
    ).toThrow();

    const extraPageKey = validGraphV2();
    extraPageKey.page.pages[0].provider = "external-provider";
    expect(() => assertApplicationGraphV2(extraPageKey)).toThrow(
      /Unrecognized key/,
    );

    const extraBindingPolicyKey = validGraphV2();
    extraBindingPolicyKey.bindingPolicies[0].sourcePath = "src/order.ts";
    expect(() => assertApplicationGraphV2(extraBindingPolicyKey)).toThrow(
      /Unrecognized key/,
    );
  });

  it("rejects duplicate surfaces, cross-surface navigation, and missing page ownership", () => {
    const duplicateSurface = validGraphV2();
    duplicateSurface.surfaces.push(
      structuredClone(duplicateSurface.surfaces[0]),
    );
    expect(() => assertApplicationGraphV2(duplicateSurface)).toThrow(
      /surface.*duplicated/i,
    );

    const crossSurface = validGraphV2();
    crossSurface.surfaces.push({
      apiVersion: "factory.application-surface/v1",
      key: "merchant-desktop",
      label: "Merchant",
      kind: "merchant",
      audienceRoles: ["customer"],
      device: "desktop",
      entryPageKey: "orders",
      navigation: {
        pattern: "sidebar",
        items: [{ pageKey: "home", label: "Home", icon: "house" }],
      },
      responsive: { minimumWidth: 768 },
    });
    expect(() => assertApplicationGraphV2(crossSurface)).toThrow(
      /same surface|cross-surface/i,
    );

    const missingSurface = validGraphV2();
    missingSurface.page.pages[0].surfaceKey = "missing-surface";
    expect(() => assertApplicationGraphV2(missingSurface)).toThrow(
      /unknown surface/i,
    );
  });

  it("requires exact page recipe and region-to-block coverage", () => {
    const mismatchedRecipe = validGraphV2();
    mismatchedRecipe.page.pages[0].recipe.key = "different-recipe";
    expect(() => assertApplicationGraphV2(mismatchedRecipe)).toThrow(/recipe/i);

    const missingBlock = validGraphV2();
    missingBlock.page.pages[0].recipe.regions[0].blockIds = [];
    expect(() => assertApplicationGraphV2(missingBlock)).toThrow(
      /exactly once/i,
    );

    const duplicatedBlock = validGraphV2();
    duplicatedBlock.page.pages[0].recipe.regions.push({
      key: "aside",
      blockIds: ["order-summary"],
    });
    expect(() => assertApplicationGraphV2(duplicatedBlock)).toThrow(
      /exactly once/i,
    );

    const duplicateBlockId = validGraphV2();
    duplicateBlockId.page.pages[0].blocks.push(
      structuredClone(duplicateBlockId.page.pages[0].blocks[0]),
    );
    expect(() => assertApplicationGraphV2(duplicateBlockId)).toThrow(
      /block.*duplicated/i,
    );
  });

  it("requires customer and merchant surfaces to share a business entity", () => {
    const shared = validGraphV2();
    shared.surfaces[0].navigation.items = [
      { pageKey: "home", label: "Home", icon: "house" },
    ];
    shared.surfaces.push({
      apiVersion: "factory.application-surface/v1",
      key: "merchant-desktop",
      label: "Merchant",
      kind: "merchant",
      audienceRoles: ["customer"],
      device: "desktop",
      entryPageKey: "orders",
      navigation: {
        pattern: "sidebar",
        items: [{ pageKey: "orders", label: "Orders", icon: "receipt" }],
      },
      responsive: { minimumWidth: 768 },
    });
    shared.page.pages[1].surfaceKey = "merchant-desktop";
    shared.experience.responsiveNavigation.push({
      surfaceKey: "merchant-desktop",
      compactAt: 960,
      collapse: "drawer",
    });
    expect(() => assertApplicationGraphV2(shared)).not.toThrow();

    const shadowDomain = structuredClone(shared);
    shadowDomain.domain.entities.push({
      key: "merchant-order",
      label: "Merchant Order",
      fields: [],
      indexes: [],
    });
    shadowDomain.page.pages[1].screenIntent.entityKeys = ["merchant-order"];
    expect(() => assertApplicationGraphV2(shadowDomain)).toThrow(
      /share.*business entity|shadow domain/i,
    );
  });

  it("resolves screen entities, capabilities, and journeys", () => {
    const cases: Array<[string, (graph: Record<string, any>) => void]> = [
      [
        "entity",
        (graph) => {
          graph.page.pages[0].screenIntent.entityKeys = ["missing-entity"];
        },
      ],
      [
        "capability",
        (graph) => {
          graph.page.pages[0].screenIntent.capabilityKeys = [
            "missing.capability",
          ];
        },
      ],
      [
        "journey",
        (graph) => {
          graph.page.pages[0].screenIntent.primaryJourneyKeys = [
            "missing-journey",
          ];
        },
      ],
    ];

    for (const [label, mutate] of cases) {
      const graph = validGraphV2();
      mutate(graph);
      expect(() => assertApplicationGraphV2(graph)).toThrow(
        new RegExp(`unknown ${label}`, "i"),
      );
    }
  });

  it("validates the Graph-owned journey namespace and flow reachability", () => {
    const duplicateJourney = validGraphV2();
    duplicateJourney.journeys.push(
      structuredClone(duplicateJourney.journeys[0]),
    );
    expect(() => assertApplicationGraphV2(duplicateJourney)).toThrow(
      /journey.*duplicated/i,
    );

    const missingRole = validGraphV2();
    missingRole.journeys[0].actorRoleKey = "manager";
    expect(() => assertApplicationGraphV2(missingRole)).toThrow(
      /unknown role/i,
    );

    const duplicateFlow = validGraphV2();
    duplicateFlow.journeys[0].flowKeys = ["order-flow", "order-flow"];
    expect(() => assertApplicationGraphV2(duplicateFlow)).toThrow(
      /flow.*duplicated/i,
    );

    const missingFlow = validGraphV2();
    missingFlow.journeys[0].flowKeys = ["missing-flow"];
    expect(() => assertApplicationGraphV2(missingFlow)).toThrow(
      /unknown flow/i,
    );

    const unreachableFlow = validGraphV2();
    unreachableFlow.journeys = [];
    unreachableFlow.page.pages.forEach(
      (page: Record<string, any>) =>
        (page.screenIntent.primaryJourneyKeys = []),
    );
    expect(() => assertApplicationGraphV2(unreachableFlow)).toThrow(
      /not reachable/i,
    );

    const missingEntryPage = validGraphV2();
    missingEntryPage.journeys[0].entryPageKey = "missing-page";
    expect(() => assertApplicationGraphV2(missingEntryPage)).toThrow(
      /unknown page/i,
    );

    const missingJourneyActor = validGraphV2();
    missingJourneyActor.policy.roles.push("manager");
    missingJourneyActor.policy.permissions.push({
      role: "manager",
      resource: "order",
      actions: ["submit"],
    });
    missingJourneyActor.flow.flows[0].transitions[0].roles = ["manager"];
    expect(() => assertApplicationGraphV2(missingJourneyActor)).toThrow(
      /journey.*actor|actor.*transition/i,
    );
  });

  it("requires an actor grant for every flow transition", () => {
    const noActor = validGraphV2();
    delete noActor.flow.flows[0].transitions[0].roles;
    expect(() => assertApplicationGraphV2(noActor)).toThrow(/actor grant/i);

    const noPermission = validGraphV2();
    noPermission.policy.permissions[0].actions = ["read"];
    expect(() => assertApplicationGraphV2(noPermission)).toThrow(
      /not granted/i,
    );
  });

  it("requires exactly one resolved policy per block binding", () => {
    const noPolicy = validGraphV2();
    noPolicy.bindingPolicies = [];
    expect(() => assertApplicationGraphV2(noPolicy)).toThrow(
      /exactly one policy/i,
    );

    const duplicatePolicy = validGraphV2();
    duplicatePolicy.bindingPolicies.push(
      structuredClone(duplicatePolicy.bindingPolicies[0]),
    );
    expect(() => assertApplicationGraphV2(duplicatePolicy)).toThrow(
      /binding policy.*duplicated|exactly one policy/i,
    );

    for (const [field, value, message] of [
      ["pageId", "missing-page", "unknown page"],
      ["blockId", "missing-block", "unknown block"],
      ["bindingKey", "missing-binding", "unknown binding"],
      ["entityKey", "missing-entity", "unknown entity"],
      ["fieldKey", "missingField", "unknown field"],
    ] as const) {
      const unresolved = validGraphV2();
      unresolved.bindingPolicies[0][field] = value;
      expect(() => assertApplicationGraphV2(unresolved)).toThrow(
        new RegExp(message, "i"),
      );
    }

    const inheritedBinding = validGraphV2();
    inheritedBinding.bindingPolicies.push({
      ...structuredClone(inheritedBinding.bindingPolicies[0]),
      bindingKey: "constructor",
    });
    expect(() => assertApplicationGraphV2(inheritedBinding)).toThrow(
      /unknown binding/i,
    );

    const relabelledTarget = validGraphV2();
    relabelledTarget.domain.entities[0].fields.push({
      key: "note",
      type: "text",
      required: false,
    });
    relabelledTarget.fieldAuthorities.push({
      entityKey: "order",
      fieldKey: "note",
      authority: "client",
    });
    Object.assign(relabelledTarget.bindingPolicies[0], {
      fieldKey: "note",
      access: "read",
      authority: "client",
    });
    expect(() => assertApplicationGraphV2(relabelledTarget)).toThrow(
      /binding target|graph\.domain\.order\.note|does not match/i,
    );
  });

  it("requires exactly one intrinsic authority for every domain field", () => {
    const missing = validGraphV2();
    missing.fieldAuthorities.pop();
    expect(() => assertApplicationGraphV2(missing)).toThrow(
      /field authority|exactly one|coverage/i,
    );

    const duplicate = validGraphV2();
    duplicate.fieldAuthorities.push(
      structuredClone(duplicate.fieldAuthorities[0]),
    );
    expect(() => assertApplicationGraphV2(duplicate)).toThrow(/duplicated/i);

    const unknownEntity = validGraphV2();
    unknownEntity.fieldAuthorities[0].entityKey = "missing-entity";
    expect(() => assertApplicationGraphV2(unknownEntity)).toThrow(
      /unknown entity/i,
    );

    const unknownField = validGraphV2();
    unknownField.fieldAuthorities[0].fieldKey = "missingField";
    expect(() => assertApplicationGraphV2(unknownField)).toThrow(
      /unknown field/i,
    );
  });

  it("rejects client writes to server-authoritative bindings", () => {
    const serverWrite = validGraphV2();
    Object.assign(serverWrite.bindingPolicies[0], {
      access: "write",
      authority: "server",
    });
    expect(() => assertApplicationGraphV2(serverWrite)).toThrow(
      /server-authoritative|server authority/i,
    );

    const protectedClientWrite = validGraphV2();
    Object.assign(protectedClientWrite.bindingPolicies[0], {
      access: "write",
      authority: "client",
    });
    expect(() => assertApplicationGraphV2(protectedClientWrite)).toThrow(
      /server-derived|read-only|total/i,
    );

    const intrinsicClientWrite = validGraphV2();
    intrinsicClientWrite.fieldAuthorities[0].authority = "client";
    Object.assign(intrinsicClientWrite.bindingPolicies[0], {
      access: "write",
      authority: "client",
    });
    expect(() => assertApplicationGraphV2(intrinsicClientWrite)).not.toThrow();
  });

  it("validates seed actors, entities, required fields, and temporal values", () => {
    const missingActor = validGraphV2();
    missingActor.seedScenarios[0].actorKeys = ["manager"];
    expect(() => assertApplicationGraphV2(missingActor)).toThrow(
      /unknown role/i,
    );

    const missingEntity = validGraphV2();
    missingEntity.seedScenarios[0].records[0].entityKey = "missing-entity";
    expect(() => assertApplicationGraphV2(missingEntity)).toThrow(
      /unknown entity/i,
    );

    const missingRequired = validGraphV2();
    delete missingRequired.seedScenarios[0].records[0].values.total;
    expect(() => assertApplicationGraphV2(missingRequired)).toThrow(
      /required field/i,
    );

    const invalidTemporal = validGraphV2();
    invalidTemporal.seedScenarios[0].records[0].values.placedAt = "tomorrow";
    expect(() => assertApplicationGraphV2(invalidTemporal)).toThrow(
      /temporal|datetime/i,
    );

    for (const fieldKey of ["constructor", "toString"] as const) {
      const inheritedRequired = validGraphV2();
      inheritedRequired.domain.entities[0].fields.push({
        key: fieldKey,
        type: "string",
        required: true,
      });
      inheritedRequired.fieldAuthorities.push({
        entityKey: "order",
        fieldKey,
        authority: "client",
      });
      expect(() => assertApplicationGraphV2(inheritedRequired)).toThrow(
        new RegExp(`required field '${fieldKey}'`, "i"),
      );
    }

    const forbiddenPrototypeField = validGraphV2();
    Object.defineProperty(
      forbiddenPrototypeField.domain.entities[0].fields,
      forbiddenPrototypeField.domain.entities[0].fields.length,
      {
        value: { key: "__proto__", type: "string", required: true },
        enumerable: true,
      },
    );
    expect(() => assertApplicationGraphV2(forbiddenPrototypeField)).toThrow();
  });
});
