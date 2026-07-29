import { describe, expect, it } from "vitest";

import {
  assertRestaurantOrderingProfile,
  composeProfileDraft,
  validateRestaurantOrderingProfile,
} from "../src/index.js";
import { generateApplicationBundle } from "../../compiler/src/index.js";

const restaurantGraph = () =>
  composeProfileDraft({ profile: "restaurant-ordering" }).graph;

const restaurantField = (
  graph: ReturnType<typeof restaurantGraph>,
  entityKey: string,
  fieldKey: string,
) =>
  graph.domain.entities
    .find((entity) => entity.key === entityKey)!
    .fields.find((field) => field.key === fieldKey)!;

const restaurantTransition = (
  graph: ReturnType<typeof restaurantGraph>,
  entityKey: string,
  from: string,
  event: string,
) =>
  graph.flow.flows
    .find((flow) => flow.entity === entityKey)!
    .transitions.find(
      (transition) => transition.from === from && transition.event === event,
    )!;

describe("Restaurant Ordering profile", () => {
  it("accepts the complete starter and returns a bounded projection", () => {
    const projection = assertRestaurantOrderingProfile(restaurantGraph());

    expect(projection).toEqual({
      apiVersion: "factory.restaurant-profile/v1",
      entities: {
        "restaurant-location": "restaurant-location",
        "restaurant-table": "restaurant-table",
        "table-session": "table-session",
        "menu-category": "menu-category",
        "menu-item": "menu-item",
        order: "order",
        "order-line": "order-line",
        "payment-attempt": "payment-attempt",
        "kitchen-ticket": "kitchen-ticket",
        "inventory-ledger": "inventory-ledger",
      },
      roles: {
        customer: "customer",
        kitchen: "kitchen",
        cashier: "cashier",
        manager: "manager",
      },
      pageGroups: {
        customer: [
          "/table/:token",
          "/menu",
          "/cart",
          "/orders/current",
          "/receipt/:id",
        ],
        merchant: [
          "/merchant/tables",
          "/merchant/menu",
          "/merchant/kitchen",
          "/merchant/cashier",
          "/merchant/analytics",
        ],
      },
      order: {
        entity: "order",
        states: [
          "cart",
          "submitted",
          "paid",
          "accepted",
          "preparing",
          "ready",
          "served",
          "cancelled",
        ],
        versionField: "orderVersion",
      },
    });
  });

  it("rejects a Restaurant Graph without a table-session token digest", () => {
    const graph = restaurantGraph();
    const tableSession = graph.domain.entities.find(
      (entity) => entity.key === "table-session",
    )!;
    tableSession.fields = tableSession.fields.filter(
      (field) => field.key !== "tokenDigest",
    );

    expect(() => assertRestaurantOrderingProfile(graph)).toThrow("tokenDigest");
  });

  it("requires the six Restaurant assets instead of generic simulated payment", () => {
    const graph = restaurantGraph();
    expect(graph.integration.assetLocks?.map((lock) => lock.key)).toEqual(
      expect.arrayContaining([
        "restaurant.table-session",
        "restaurant.menu",
        "restaurant.ordering",
        "restaurant.kitchen",
        "restaurant.cashier",
        "restaurant.reporting",
      ]),
    );
    expect(graph.integration.assetLocks).not.toContainEqual(
      expect.objectContaining({ key: "commerce.simulated-payment" }),
    );

    expect(
      validateRestaurantOrderingProfile(graph).filter((issue) =>
        issue.code.startsWith("restaurant.asset-lock."),
      ),
    ).toEqual([]);
  });

  it("rejects generic simulated payment when the Restaurant cashier owns payment", () => {
    const graph = restaurantGraph();
    graph.integration.assetLocks!.push({
      ...graph.integration.assetLocks![0]!,
      key: "commerce.simulated-payment",
    });

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.asset-lock.unexpected",
          message: expect.stringContaining("commerce.simulated-payment"),
        }),
      ]),
    );
  });

  it("identifies every missing Restaurant contract kind", () => {
    const cases = [
      {
        code: "restaurant.role.missing",
        expected: "cashier",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.policy.roles = graph.policy.roles.filter(
            (role) => role !== "cashier",
          );
        },
      },
      {
        code: "restaurant.field.missing",
        expected: "tokenDigest",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const entity = graph.domain.entities.find(
            (candidate) => candidate.key === "table-session",
          )!;
          entity.fields = entity.fields.filter(
            (field) => field.key !== "tokenDigest",
          );
        },
      },
      {
        code: "restaurant.asset-lock.missing",
        expected: "commerce.order",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.integration.assetLocks = graph.integration.assetLocks?.filter(
            (lock) => lock.key !== "commerce.order",
          );
        },
      },
      {
        code: "restaurant.page.missing",
        expected: "/merchant/kitchen",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.page.pages = graph.page.pages.filter(
            (page) => page.route !== "/merchant/kitchen",
          );
        },
      },
      {
        code: "restaurant.block.missing",
        expected: "menu-browser",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const page = graph.page.pages.find(
            (candidate) => candidate.route === "/menu",
          )!;
          page.blocks = page.blocks.filter(
            (block) => block.type !== "menu-browser",
          );
        },
      },
      {
        code: "restaurant.event.missing",
        expected: "mark-ready",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const flow = graph.flow.flows.find(
            (candidate) => candidate.entity === "order",
          )!;
          flow.events = flow.events.filter((event) => event !== "mark-ready");
        },
      },
      {
        code: "restaurant.transition.missing",
        expected: "preparing --mark-ready--> ready",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const flow = graph.flow.flows.find(
            (candidate) => candidate.entity === "order",
          )!;
          flow.transitions = flow.transitions.filter(
            (transition) => transition.event !== "mark-ready",
          );
        },
      },
    ] as const;

    for (const testCase of cases) {
      const graph = restaurantGraph();
      testCase.mutate(graph);

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: testCase.code,
            message: expect.stringContaining(testCase.expected),
          }),
        ]),
      );
    }
  });

  it("sorts validation issues deterministically by path and code", () => {
    const graph = restaurantGraph();
    graph.policy.roles = graph.policy.roles.filter(
      (role) => role !== "customer",
    );
    graph.domain.entities = graph.domain.entities.filter(
      (entity) => entity.key !== "restaurant-location",
    );

    const issues = validateRestaurantOrderingProfile(graph);
    const issueKeys = issues.map(
      (issue) => `${JSON.stringify(issue.path)}:${issue.code}`,
    );

    expect(issueKeys).toEqual([...issueKeys].sort());
  });

  it("rejects a kitchen transition assigned to the cashier role", () => {
    const graph = restaurantGraph();
    const flow = graph.flow.flows.find(
      (candidate) => candidate.entity === "order",
    )!;
    flow.transitions.find(
      (transition) => transition.event === "mark-ready",
    )!.roles = ["cashier"];

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.transition.invalid",
          message: expect.stringContaining("kitchen"),
        }),
      ]),
    );
  });

  it("keeps lifecycle-produced timestamps optional in the starter", () => {
    const graph = restaurantGraph();

    expect(
      [
        ["order", "submittedAt"],
        ["order", "paidAt"],
        ["payment-attempt", "paidAt"],
        ["kitchen-ticket", "acceptedAt"],
        ["kitchen-ticket", "startedAt"],
        ["kitchen-ticket", "readyAt"],
      ].map(([entityKey, fieldKey]) => ({
        entityKey,
        fieldKey,
        required: restaurantField(graph, entityKey!, fieldKey!).required,
      })),
    ).toEqual([
      { entityKey: "order", fieldKey: "submittedAt", required: false },
      { entityKey: "order", fieldKey: "paidAt", required: false },
      {
        entityKey: "payment-attempt",
        fieldKey: "paidAt",
        required: false,
      },
      {
        entityKey: "kitchen-ticket",
        fieldKey: "acceptedAt",
        required: false,
      },
      {
        entityKey: "kitchen-ticket",
        fieldKey: "startedAt",
        required: false,
      },
      {
        entityKey: "kitchen-ticket",
        fieldKey: "readyAt",
        required: false,
      },
    ]);
  });

  it("compiles lifecycle-produced timestamps to nullable Prisma and SQL columns", () => {
    const graph = restaurantGraph();
    graph.page = { pages: [], navigation: [] };
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "published-restaurant-nullable-timestamps-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );
    const prisma = files["api/prisma/schema.prisma"]!;
    const migration =
      files["database/prisma/migrations/0001_initial/migration.sql"]!;

    for (const field of [
      "submittedAt",
      "paidAt",
      "acceptedAt",
      "startedAt",
      "readyAt",
    ]) {
      expect(prisma).toContain(`${field} DateTime?`);
      expect(migration).not.toContain(`"${field}" TIMESTAMP(3) NOT NULL`);
    }
  });

  it("rejects removal of required customer and merchant permissions", () => {
    const cases = [
      { role: "customer", resource: "menu-item", action: "read" },
      { role: "kitchen", resource: "kitchen-ticket", action: "update" },
      { role: "cashier", resource: "payment-attempt", action: "create" },
      { role: "manager", resource: "order", action: "cancel" },
    ] as const;

    for (const permissionCase of cases) {
      const graph = restaurantGraph();
      const permission = graph.policy.permissions.find(
        (candidate) =>
          candidate.role === permissionCase.role &&
          candidate.resource === permissionCase.resource &&
          candidate.actions.includes(permissionCase.action),
      )!;
      permission.actions = permission.actions.filter(
        (action) => action !== permissionCase.action,
      );

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.permission.missing",
            message: expect.stringContaining(permissionCase.role),
          }),
        ]),
      );
    }
  });

  it("rejects an undeclared Restaurant permission action", () => {
    const graph = restaurantGraph();
    graph.policy.permissions
      .find(
        (permission) =>
          permission.role === "customer" && permission.resource === "menu-item",
      )!
      .actions.push("delete");

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.permission.unexpected",
          message: expect.stringContaining("delete"),
        }),
      ]),
    );
  });

  it("rejects a duplicate Restaurant permission", () => {
    const graph = restaurantGraph();
    const permission = graph.policy.permissions.find(
      (candidate) =>
        candidate.role === "customer" && candidate.resource === "menu-item",
    )!;
    graph.policy.permissions.push({
      ...permission,
      actions: [...permission.actions],
    });

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.permission.unexpected",
          message: expect.stringContaining("customer:menu-item"),
        }),
      ]),
    );
  });

  it("rejects an incorrect initial state for either Restaurant flow", () => {
    const cases = [
      { entity: "table-session", initialState: "active", expected: "open" },
      { entity: "order", initialState: "submitted", expected: "cart" },
    ] as const;

    for (const flowCase of cases) {
      const graph = restaurantGraph();
      graph.flow.flows.find(
        (flow) => flow.entity === flowCase.entity,
      )!.initialState = flowCase.initialState;

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.initial-state.invalid",
            message: expect.stringContaining(flowCase.expected),
          }),
        ]),
      );
    }
  });

  it("requires every declared inventory, payment, order, and audit transition effect", () => {
    const cases = [
      ["table-session", "active", "close", "audit.record", "record"],
      ["order", "cart", "submit", "order.create", "create"],
      ["order", "cart", "submit", "inventory.reserve", "reserve"],
      ["order", "cart", "submit", "audit.record", "record"],
      ["order", "submitted", "pay", "payment.simulate", "simulate"],
      ["order", "submitted", "pay", "inventory.decrement", "decrement"],
      ["order", "submitted", "pay", "order.transition", "transition"],
      ["order", "submitted", "pay", "audit.record", "record"],
      ["order", "paid", "accept", "order.transition", "transition"],
      ["order", "paid", "accept", "audit.record", "record"],
      [
        "order",
        "accepted",
        "start-preparing",
        "order.transition",
        "transition",
      ],
      ["order", "accepted", "start-preparing", "audit.record", "record"],
      ["order", "preparing", "mark-ready", "order.transition", "transition"],
      ["order", "preparing", "mark-ready", "audit.record", "record"],
      ["order", "ready", "serve", "order.transition", "transition"],
      ["order", "ready", "serve", "audit.record", "record"],
      ["order", "submitted", "cancel", "inventory.release", "release"],
      ["order", "submitted", "cancel", "order.transition", "transition"],
      ["order", "submitted", "cancel", "audit.record", "record"],
      ["order", "paid", "cancel", "order.transition", "transition"],
      ["order", "paid", "cancel", "audit.record", "record"],
    ] as const;

    for (const [entity, from, event, capability, operation] of cases) {
      const graph = restaurantGraph();
      const transition = restaurantTransition(graph, entity, from, event);
      transition.effects = transition.effects?.filter(
        (effect) =>
          effect.capability !== capability || effect.operation !== operation,
      );

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.transition.effect.missing",
            message: expect.stringContaining(`${capability}/${operation}`),
          }),
        ]),
      );
    }
  });

  it("rejects mutation of a required transition effect operation", () => {
    const graph = restaurantGraph();
    const transition = restaurantTransition(graph, "order", "submitted", "pay");
    transition.effects!.find(
      (effect) => effect.capability === "payment.simulate",
    )!.operation = "capture";

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.transition.effect.missing",
          message: expect.stringContaining("payment.simulate/simulate"),
        }),
      ]),
    );
  });

  it("sorts prefix-related issue paths by locale-independent code units", () => {
    const graph = restaurantGraph();
    graph.domain.entities = graph.domain.entities.filter(
      (entity) => entity.key !== "order" && entity.key !== "order-line",
    );

    const missingEntityPaths = validateRestaurantOrderingProfile(graph)
      .filter((issue) => issue.code === "restaurant.entity.missing")
      .map((issue) => issue.path.at(-1));

    expect(missingEntityPaths).toEqual(["order", "order-line"]);
  });
});
