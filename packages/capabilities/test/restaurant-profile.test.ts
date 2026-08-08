import { describe, expect, it } from "vitest";

import {
  assertRestaurantOrderingProfile,
  composeCapabilityDraft,
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  resolveCapabilityAssetLock,
  type CapabilitySelectionV1,
  validateRestaurantOrderingProfile,
} from "../src/index.js";
import { hashApplicationGraph } from "../../graph/src/index.js";
import {
  generateApplicationBundle as compileApplicationBundle,
  type PublishedGraphInput,
} from "../../compiler/src/index.js";

function persistedRestaurantLock(graph: PublishedGraphInput["graph"]) {
  const canonicalSelections = new Map(
    composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph.integration.compositionSelections?.map((selection) => [
      `${selection.lock.key}@${selection.lock.version}:${selection.lock.manifestDigest}`,
      selection,
    ]),
  );
  const locks =
    graph.integration.assetLocks ??
    graph.integration.compositionSelections?.map(({ lock }) => lock) ??
    [];
  const selections = locks.map((lock): CapabilitySelectionV1 => {
    const canonical = canonicalSelections.get(
      `${lock.key}@${lock.version}:${lock.manifestDigest}`,
    );
    if (canonical) return canonical;
    const manifest = resolveCapabilityAssetLock(lock).manifest;
    if ((manifest.parameters ?? []).some(({ required }) => required)) {
      throw new Error(
        `Fixture package '${manifest.key}@${manifest.version}' requires canonical bindings.`,
      );
    }
    return { lock, bindings: {} };
  });
  if (!selections.length) {
    throw new Error("Restaurant fixture requires a nonempty lock.");
  }
  return createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections,
  });
}

function generateApplicationBundle(
  input: Omit<PublishedGraphInput, "compositionLock"> | PublishedGraphInput,
) {
  return compileApplicationBundle(
    "compositionLock" in input
      ? input
      : {
          ...input,
          compositionLock: persistedRestaurantLock(input.graph),
        },
  );
}

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
  it("composes the active Restaurant starter from its Restaurant-owned packages", () => {
    const activeDraft = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const selectedKeys =
      activeDraft.graph.integration.compositionSelections?.map(
        ({ lock }) => lock.key,
      ) ?? [];
    const blockTypes = activeDraft.graph.page.pages.flatMap((page) =>
      page.blocks.map((block) => block.type),
    );

    expect(selectedKeys).toEqual(
      expect.arrayContaining([
        "restaurant.table-session",
        "restaurant.ordering",
        "restaurant.kitchen",
        "restaurant.cashier",
        "restaurant.reporting",
      ]),
    );
    expect(selectedKeys).not.toContain("commerce.simulated-payment");
    expect(blockTypes).toEqual(
      expect.arrayContaining([
        "restaurant-entry",
        "menu-browser",
        "order-cart",
        "payment-checkout",
        "kitchen-board",
        "cashier-console",
        "restaurant-dashboard",
      ]),
    );
  });

  it("locks strict v1.1 Restaurant package bindings for the active starter", () => {
    const selections = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    }).graph.integration.compositionSelections;
    const restaurantSelections = selections
      ?.filter(({ lock }) => lock.key.startsWith("restaurant."))
      .map(({ lock, bindings }) => ({
        key: lock.key,
        version: lock.version,
        bindings,
      }));

    expect(restaurantSelections).toHaveLength(6);
    expect(restaurantSelections).toEqual(
      expect.arrayContaining([
        {
          key: "restaurant.table-session",
          version: "1.1.0",
          bindings: {
            tableEntity: { graphSymbol: "graph.domain.restaurant-table" },
            sessionEntity: { graphSymbol: "graph.domain.table-session" },
            entryPage: { graphSymbol: "graph.page.table-entry" },
            customerRole: { graphSymbol: "graph.policy.customer" },
          },
        },
        {
          key: "restaurant.ordering",
          version: "1.1.0",
          bindings: {
            orderEntity: { graphSymbol: "graph.domain.order" },
            orderLineEntity: { graphSymbol: "graph.domain.order-line" },
            orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
            menuPage: { graphSymbol: "graph.page.customer-menu" },
            cartPage: { graphSymbol: "graph.page.customer-cart" },
            customerRole: { graphSymbol: "graph.policy.customer" },
          },
        },
        {
          key: "restaurant.kitchen",
          version: "1.1.0",
          bindings: {
            ticketEntity: { graphSymbol: "graph.domain.kitchen-ticket" },
            orderEntity: { graphSymbol: "graph.domain.order" },
            kitchenPage: { graphSymbol: "graph.page.merchant-kitchen" },
            merchantRole: { graphSymbol: "graph.policy.kitchen" },
          },
        },
        {
          key: "restaurant.cashier",
          version: "1.1.0",
          bindings: {
            orderEntity: { graphSymbol: "graph.domain.order" },
            paymentEntity: { graphSymbol: "graph.domain.payment-attempt" },
            orderFlow: { graphSymbol: "graph.flow.restaurant-order" },
            cashierPage: { graphSymbol: "graph.page.merchant-cashier" },
            merchantRole: { graphSymbol: "graph.policy.cashier" },
          },
        },
        {
          key: "restaurant.reporting",
          version: "1.1.0",
          bindings: {
            orderEntity: { graphSymbol: "graph.domain.order" },
            inventoryEntity: { graphSymbol: "graph.domain.inventory-ledger" },
            analyticsPage: { graphSymbol: "graph.page.merchant-analytics" },
            merchantRole: { graphSymbol: "graph.policy.manager" },
          },
        },
        {
          // Batch 5: restaurant.menu joins the Restaurant-owned lock set
          // through its typed category/item/inventory bindings.
          key: "restaurant.menu",
          version: "1.0.0",
          bindings: {
            categoryEntity: { graphSymbol: "graph.domain.menu-category" },
            itemEntity: { graphSymbol: "graph.domain.menu-item" },
            inventoryEntity: { graphSymbol: "graph.domain.menu-item" },
          },
        },
      ]),
    );
  });

  it("rejects a strict Restaurant binding with the wrong Graph model", () => {
    const activeDraft = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const graph = structuredClone(activeDraft.graph);
    delete graph.integration.compositionSelections;
    const selections = activeDraft.graph.integration.compositionSelections!.map(
      (selection) =>
        selection.lock.key === "restaurant.table-session"
          ? {
              ...selection,
              bindings: {
                ...selection.bindings,
                tableEntity: { graphSymbol: "graph.page.table-entry" },
              },
            }
          : selection,
    );

    expect(() => composeCapabilityDraft({ graph, selections })).toThrow(
      "must reference graph.domain",
    );
  });

  it("compiles the active Restaurant starter with its locked package outputs", () => {
    const activeDraft = composeDefaultCapabilityDraft({
      profile: "restaurant-ordering",
    });
    const files = new Set(
      generateApplicationBundle({
        publishedRevisionId: "published-active-restaurant-starter-1",
        graph: activeDraft.graph,
      }).files.map((file) => file.path),
    );

    for (const packageKey of [
      "restaurant.table-session",
      "restaurant.ordering",
      "restaurant.kitchen",
      "restaurant.cashier",
      "restaurant.reporting",
    ]) {
      expect(files).toContain(`api/src/capabilities/${packageKey}.ts`);
    }
    expect(files).not.toContain(
      "api/src/capabilities/commerce.simulated-payment.ts",
    );
  });

  it("accepts the complete starter and returns a bounded projection", () => {
    const projection = assertRestaurantOrderingProfile(restaurantGraph());

    expect(projection).toEqual({
      apiVersion: "factory.restaurant-profile/v1",
      entities: {
        "restaurant-principal": "restaurant-principal",
        "restaurant-location": "restaurant-location",
        "restaurant-table": "restaurant-table",
        "table-session": "table-session",
        "menu-category": "menu-category",
        "menu-item": "menu-item",
        "menu-option-group": "menu-option-group",
        "menu-option": "menu-option",
        order: "order",
        "order-line": "order-line",
        "order-line-option": "order-line-option",
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
      inventoryLedger: {
        entity: "inventory-ledger",
        orderIdField: "orderId",
        provenanceField: "provenance",
        provenance: {
          orderReservation: "order-reservation",
          orderRelease: "order-release",
          managerAdjustment: "manager-adjustment",
        },
        adjustmentReasonField: "adjustmentReason",
        adjustmentReasons: [
          "stock-count",
          "restock",
          "spoilage",
          "damage",
          "correction",
        ],
        managerAdjustment: {
          role: "manager",
          capability: "inventory.adjust",
          operation: "adjust",
          auditCapability: "audit.record",
          auditOperation: "record",
          orderId: "forbidden",
          reason: "required",
        },
        orderDerived: {
          orderId: "required",
          provenance: ["order-reservation", "order-release"],
        },
      },
    });
  });

  it("models order provenance and bounded manager adjustment reasons without a fake order", () => {
    const graph = restaurantGraph();
    const orderId = restaurantField(graph, "inventory-ledger", "orderId");
    const provenance = restaurantField(graph, "inventory-ledger", "provenance");
    const adjustmentReason = restaurantField(
      graph,
      "inventory-ledger",
      "adjustmentReason",
    );

    expect(orderId).toMatchObject({ type: "string", required: false });
    expect(provenance).toEqual({
      key: "provenance",
      type: "enum",
      required: true,
      values: ["order-reservation", "order-release", "manager-adjustment"],
    });
    expect(adjustmentReason).toEqual({
      key: "adjustmentReason",
      type: "enum",
      required: false,
      values: ["stock-count", "restock", "spoilage", "damage", "correction"],
    });
  });

  it("declares a location-scoped idempotent Restaurant inventory ledger", () => {
    const graph = restaurantGraph();
    const ledger = graph.domain.entities.find(
      ({ key }) => key === "inventory-ledger",
    )!;

    expect(ledger.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "locationId",
          type: "string",
          required: true,
        }),
        expect.objectContaining({
          key: "idempotencyKey",
          type: "string",
          required: true,
          unique: true,
        }),
      ]),
    );
    expect(ledger.indexes).toContainEqual({
      fields: ["idempotencyKey"],
      unique: true,
    });
    expect(graph.domain.relations).toEqual(
      expect.arrayContaining([
        {
          from: "inventory-ledger",
          to: "restaurant-location",
          kind: "many-to-one",
          field: "locationId",
        },
        {
          from: "inventory-ledger",
          to: "menu-item",
          kind: "many-to-one",
          field: "menuItemId",
        },
        {
          from: "inventory-ledger",
          to: "order",
          kind: "many-to-one",
          field: "orderId",
        },
      ]),
    );
  });

  it("rejects missing or invalid Restaurant inventory-ledger structure", () => {
    const cases = [
      {
        name: "location field",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const ledger = graph.domain.entities.find(
            ({ key }) => key === "inventory-ledger",
          )!;
          ledger.fields = ledger.fields.filter(
            ({ key }) => key !== "locationId",
          );
        },
      },
      {
        name: "idempotency uniqueness",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const field = restaurantField(
            graph,
            "inventory-ledger",
            "idempotencyKey",
          );
          field.unique = false;
        },
      },
      {
        name: "idempotency unique index",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          const ledger = graph.domain.entities.find(
            ({ key }) => key === "inventory-ledger",
          )!;
          ledger.indexes = ledger.indexes.filter(
            ({ fields }) => fields.join(",") !== "idempotencyKey",
          );
        },
      },
      {
        name: "location relation",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.domain.relations = graph.domain.relations.filter(
            ({ from, to }) =>
              !(from === "inventory-ledger" && to === "restaurant-location"),
          );
        },
      },
      {
        name: "item relation field",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.domain.relations.find(
            ({ from, to }) => from === "inventory-ledger" && to === "menu-item",
          )!.field = "wrongItemId";
        },
      },
      {
        name: "order relation field",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.domain.relations.find(
            ({ from, to }) => from === "inventory-ledger" && to === "order",
          )!.field = "wrongOrderId";
        },
      },
    ] as const;

    for (const testCase of cases) {
      const graph = restaurantGraph();
      testCase.mutate(graph);

      expect(validateRestaurantOrderingProfile(graph), testCase.name).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: expect.stringMatching(
              /restaurant\.(field\.missing|inventory-ledger\.invalid|inventory-provenance\.invalid)/,
            ),
          }),
        ]),
      );
    }
  });

  it("requires the sole standalone inventory adjustment path to be manager-audited", () => {
    const graph = restaurantGraph();
    const flow = graph.flow.flows.find(
      (candidate) => candidate.entity === "inventory-ledger",
    );

    expect(flow).toEqual({
      id: "restaurant-inventory-ledger",
      entity: "inventory-ledger",
      initialState: "recorded",
      states: ["recorded"],
      events: ["record-manager-adjustment"],
      transitions: [
        {
          from: "recorded",
          event: "record-manager-adjustment",
          to: "recorded",
          roles: ["manager"],
          effects: [
            { capability: "inventory.adjust", operation: "adjust" },
            { capability: "audit.record", operation: "record" },
          ],
        },
      ],
    });
  });

  it("rejects widened inventory provenance and adjustment reason fields", () => {
    const cases = [
      {
        expected: "inventory-ledger.orderId",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          restaurantField(graph, "inventory-ledger", "orderId").required = true;
        },
      },
      {
        expected: "inventory-ledger.provenance",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          restaurantField(graph, "inventory-ledger", "provenance").values = [
            "order-reservation",
            "manager-adjustment",
            "unknown",
          ];
        },
      },
      {
        expected: "inventory-ledger.adjustmentReason",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          restaurantField(
            graph,
            "inventory-ledger",
            "adjustmentReason",
          ).values = ["stock-count", ""];
        },
      },
      {
        expected: "inventory-ledger.adjustmentReason",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          restaurantField(
            graph,
            "inventory-ledger",
            "adjustmentReason",
          ).required = true;
        },
      },
    ] as const;

    for (const testCase of cases) {
      const graph = restaurantGraph();
      testCase.mutate(graph);

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.inventory-provenance.invalid",
            message: expect.stringContaining(testCase.expected),
          }),
        ]),
      );
    }
  });

  it("rejects every incomplete manager adjustment constraint", () => {
    const cases = [
      {
        expected: "manager",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.flow.flows.find(
            (flow) => flow.entity === "inventory-ledger",
          )!.transitions[0]!.roles = [];
        },
      },
      {
        expected: "inventory.adjust/adjust",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.flow.flows.find(
            (flow) => flow.entity === "inventory-ledger",
          )!.transitions[0]!.effects = [
            { capability: "audit.record", operation: "record" },
          ];
        },
      },
      {
        expected: "audit.record/record",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.flow.flows.find(
            (flow) => flow.entity === "inventory-ledger",
          )!.transitions[0]!.effects = [
            { capability: "inventory.adjust", operation: "adjust" },
          ];
        },
      },
      {
        expected: "inventory.adjust",
        mutate: (graph: ReturnType<typeof restaurantGraph>) => {
          graph.integration.capabilities =
            graph.integration.capabilities.filter(
              (capability) => capability.key !== "inventory.adjust",
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
            message: expect.stringContaining(testCase.expected),
          }),
        ]),
      );
    }
  });

  it("rejects a manager adjustment attached to an order context", () => {
    const graph = restaurantGraph();
    restaurantTransition(graph, "order", "submitted", "pay").effects!.push({
      capability: "inventory.adjust",
      operation: "adjust",
    });

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.inventory-provenance.invalid",
          message: expect.stringContaining(
            "manager adjustment must not carry an order context",
          ),
        }),
      ]),
    );
  });

  it("rejects an additional unattributed inventory-ledger recording path", () => {
    const graph = restaurantGraph();
    const flow = graph.flow.flows.find(
      (candidate) => candidate.entity === "inventory-ledger",
    )!;
    flow.events.push("record-unattributed");
    flow.transitions.push({
      from: "recorded",
      event: "record-unattributed",
      to: "recorded",
      roles: ["manager"],
      effects: [{ capability: "audit.record", operation: "record" }],
    });

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.inventory-provenance.invalid",
          message: expect.stringContaining("sole standalone ledger path"),
        }),
      ]),
    );
  });

  it("rejects mixed order-derived inventory provenance effects deterministically", () => {
    const cases = [
      {
        from: "cart",
        event: "submit",
        conflicting: {
          capability: "inventory.release",
          operation: "release",
        },
        expectedEffect: "inventory.reserve/reserve",
        transitionIndex: 0,
      },
      {
        from: "cart",
        event: "submit",
        conflicting: {
          capability: "inventory.adjust",
          operation: "adjust",
        },
        expectedEffect: "inventory.reserve/reserve",
        transitionIndex: 0,
      },
      {
        from: "submitted",
        event: "cancel",
        conflicting: {
          capability: "inventory.reserve",
          operation: "reserve",
        },
        expectedEffect: "inventory.release/release",
        transitionIndex: 6,
      },
      {
        from: "submitted",
        event: "cancel",
        conflicting: {
          capability: "inventory.adjust",
          operation: "adjust",
        },
        expectedEffect: "inventory.release/release",
        transitionIndex: 6,
      },
    ] as const;

    for (const testCase of cases) {
      const graph = restaurantGraph();
      restaurantTransition(
        graph,
        "order",
        testCase.from,
        testCase.event,
      ).effects!.push(testCase.conflicting);

      const first = validateRestaurantOrderingProfile(graph).filter(
        (issue) => issue.code === "restaurant.inventory-provenance.invalid",
      );
      const second = validateRestaurantOrderingProfile(graph).filter(
        (issue) => issue.code === "restaurant.inventory-provenance.invalid",
      );

      expect(first).toEqual([
        {
          code: "restaurant.inventory-provenance.invalid",
          message: `Restaurant 'order' transition '${testCase.from} --${testCase.event}--> ${testCase.event === "submit" ? "submitted" : "cancelled"}' must declare exactly one inventory provenance effect '${testCase.expectedEffect}' and no conflicting provenance effect.`,
          path: [
            "flow",
            "flows",
            1,
            "transitions",
            testCase.transitionIndex,
            "effects",
          ],
        },
      ]);
      expect(second).toEqual(first);
    }
  });

  it("rejects order-derived provenance effects on manager adjustment", () => {
    for (const orderEffect of [
      { capability: "inventory.reserve", operation: "reserve" },
      { capability: "inventory.release", operation: "release" },
    ]) {
      const graph = restaurantGraph();
      const transition = graph.flow.flows.find(
        (flow) => flow.entity === "inventory-ledger",
      )!.transitions[0]!;
      transition.effects!.push(orderEffect);

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.inventory-provenance.invalid",
            message: expect.stringContaining(
              "exactly one inventory provenance effect 'inventory.adjust/adjust'",
            ),
            path: expect.arrayContaining(["transitions", "effects"]),
          }),
        ]),
      );
    }
  });

  it("rejects misplaced reservation or release effects on other transitions", () => {
    const cases = [
      {
        from: "submitted",
        event: "pay",
        misplaced: {
          capability: "inventory.reserve",
          operation: "reserve",
        },
      },
      {
        from: "paid",
        event: "cancel",
        misplaced: {
          capability: "inventory.release",
          operation: "release",
        },
      },
    ] as const;

    for (const testCase of cases) {
      const graph = restaurantGraph();
      restaurantTransition(
        graph,
        "order",
        testCase.from,
        testCase.event,
      ).effects!.push(testCase.misplaced);

      expect(validateRestaurantOrderingProfile(graph)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "restaurant.inventory-provenance.invalid",
            message: expect.stringContaining(
              "must not declare misplaced order-derived inventory provenance effects",
            ),
            path: expect.arrayContaining(["transitions", "effects"]),
          }),
        ]),
      );
    }
  });

  it("requires order-derived inventory records to retain the orderId relation", () => {
    const graph = restaurantGraph();
    graph.domain.relations.find(
      (relation) =>
        relation.from === "inventory-ledger" && relation.to === "order",
    )!.field = "menuItemId";

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.inventory-provenance.invalid",
          message: expect.stringContaining("orderId relation"),
        }),
      ]),
    );
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

  it("requires the Restaurant and commercial Foundation assets instead of generic simulated payment", () => {
    const graph = restaurantGraph();
    expect(graph.integration.assetLocks?.map((lock) => lock.key)).toEqual(
      expect.arrayContaining([
        "restaurant.table-session",
        "restaurant.ordering",
        "restaurant.kitchen",
        "restaurant.cashier",
        "restaurant.reporting",
        "commerce.inventory-ledger",
        "commerce.line-configuration",
        "core.identity-context",
        "core.location-context",
      ]),
    );
    expect(graph.integration.assetLocks).toContainEqual(
      expect.objectContaining({ key: "restaurant.menu" }),
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

  it("requires the commercial Foundation entities and locks", () => {
    const graph = restaurantGraph();
    graph.domain.entities = graph.domain.entities.filter(
      (entity) => entity.key !== "menu-option",
    );
    graph.integration.assetLocks = graph.integration.assetLocks?.filter(
      (lock) => lock.key !== "core.location-context",
    );

    expect(validateRestaurantOrderingProfile(graph)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "restaurant.entity.missing",
          message: expect.stringContaining("menu-option"),
        }),
        expect.objectContaining({
          code: "restaurant.asset-lock.missing",
          message: expect.stringContaining("core.location-context"),
        }),
      ]),
    );
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
