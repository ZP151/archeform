import { describe, expect, it } from "vitest";
import { hashApplicationGraphV3 } from "@factory/graph";
import { createCapabilityCompositionLock } from "@factory/capabilities";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { assertRestaurantProductCompilationInput } from "../src/targets/restaurant-v3/contracts.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import * as compilerFacade from "../src/index.js";
import * as restaurantTarget from "../src/targets/restaurant-v3/index.js";

const boundaryError = "Restaurant product compilation input is invalid.";

function validInput() {
  const { publishedGraph, compositionLock } = restaurantProductV3Fixture();
  return { publishedGraph, compositionLock };
}

function rehash(input: ReturnType<typeof validInput>) {
  input.publishedGraph.graphHash = hashApplicationGraphV3(
    input.publishedGraph.graph,
  );
  input.compositionLock = createCapabilityCompositionLock({
    graphChecksum: input.publishedGraph.graphHash,
    selections:
      input.publishedGraph.graph.integration.compositionSelections ?? [],
  });
  return input;
}

function rehashIfValid(input: ReturnType<typeof validInput>) {
  try {
    rehash(input);
  } catch {
    // Invalid Graphs still belong at the hostile-safe compilation boundary.
  }
  return input;
}

function restaurantV6Input() {
  const input = validInput();
  const graph = input.publishedGraph.graph;
  graph.metadata.name = "Maison Rivage";
  const menu = graph.page.pages.find(({ id }) => id === "customer-menu")!;
  menu.title = "Seasonal Menu";
  const home = graph.page.pages.find(({ id }) => id === "customer-home")!;
  home.blocks = [home.blocks[2]!, home.blocks[0]!, home.blocks[1]!];
  home.recipe.regions[0]!.blockIds = [
    "home-items",
    "home-hero",
    "home-categories",
  ];
  const seed = graph.domain.seedData!.find(
    ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
  )!;
  seed.values.name = "Heirloom tomato pizza";
  const scenario = graph.seedScenarios[0]!;
  scenario.records[graph.domain.seedData!.indexOf(seed)]!.values.name =
    "Heirloom tomato pizza";
  graph.experience.theme.mode = "dark";
  return rehash(input);
}

function seedRecord(
  input: ReturnType<typeof validInput>,
  entity: string,
  id: string,
) {
  return input.publishedGraph.graph.domain.seedData!.find(
    (seed) => seed.entity === entity && seed.id === id,
  )!;
}

describe("Restaurant V3 compilation contract", () => {
  it("exports only the pure Draft-preview closure assertion through the target and Compiler facade", () => {
    expect(
      (
        restaurantTarget as typeof restaurantTarget & {
          assertRestaurantDraftPreviewGraphClosure?: unknown;
        }
      ).assertRestaurantDraftPreviewGraphClosure,
    ).toBeTypeOf("function");
    expect(
      (
        compilerFacade as typeof compilerFacade & {
          assertRestaurantDraftPreviewGraphClosure?: unknown;
        }
      ).assertRestaurantDraftPreviewGraphClosure,
    ).toBe(
      (
        restaurantTarget as typeof restaurantTarget & {
          assertRestaurantDraftPreviewGraphClosure?: unknown;
        }
      ).assertRestaurantDraftPreviewGraphClosure,
    );
  });

  it("pins the delivered Published Restaurant V3 closure", () => {
    const fixture = restaurantProductV3Fixture();
    expect({
      hash: fixture.graphHash,
      pages: fixture.graph.page.pages.length,
      journeys: fixture.graph.journeys.length,
      fieldAuthorities: fixture.graph.fieldAuthorities.length,
      bindingPolicies: fixture.graph.bindingPolicies.length,
    }).toEqual({
      hash: "sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23",
      pages: 15,
      journeys: 7,
      fieldAuthorities: 99,
      bindingPolicies: 135,
    });
  });

  it("admits only the exact Published V3 wrapper and produces frozen V3-native data", () => {
    const input = validInput();
    const captured = assertRestaurantProductCompilationInput(input);
    const plan = planRestaurantProduct(captured);

    expect(captured).toEqual(input);
    expect(captured).not.toBe(input);
    expect(plan).toMatchObject({
      apiVersion: "factory.restaurant-product-plan/v1",
      publishedRevisionId: "restaurant-product-v3-published-1",
      graphHash:
        "sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23",
      runtimeSchemaVersion: 1,
    });
    expect(plan.pages).toHaveLength(15);
    expect(plan.surfaces.map(({ key }) => key)).toEqual([
      "customer-mobile",
      "merchant-desktop",
    ]);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
    expect(JSON.stringify(plan)).not.toMatch(
      /factory\.application-graph\/v1|"status":"draft"|preview/i,
    );
  });

  it("admits only the delivered r.6 value family and retains every admitted value in the plan", () => {
    const input = restaurantV6Input();
    const captured = assertRestaurantProductCompilationInput(input);
    const plan = planRestaurantProduct(captured);
    const home = plan.pages.find(({ id }) => id === "customer-home")!;

    expect(captured.publishedGraph.graphHash).toBe(
      hashApplicationGraphV3(input.publishedGraph.graph),
    );
    expect(plan.application.name).toBe("Maison Rivage");
    expect(plan.pages.find(({ id }) => id === "customer-menu")!.title).toBe(
      "Seasonal Menu",
    );
    expect(home.blocks.map(({ id }) => id)).toEqual([
      "home-items",
      "home-hero",
      "home-categories",
    ]);
    expect(home.recipe.regions[0]!.blockIds).toEqual([
      "home-items",
      "home-hero",
      "home-categories",
    ]);
    expect(
      plan.domain.seedData!.find(
        ({ entity, id }) => entity === "menu-item" && id === "margherita-pizza",
      )!.values.name,
    ).toBe("Heirloom tomato pizza");
    expect(plan.seedScenarios[0]!.records[3]!.values.name).toBe(
      "Heirloom tomato pizza",
    );
    expect(plan.experience.theme.mode).toBe("dark");
  });

  it("admits a bounded role addition with a matching permission", () => {
    const input = validInput();
    input.publishedGraph.graph.policy.roles = [
      ...input.publishedGraph.graph.policy.roles,
      "waiter",
    ];
    input.publishedGraph.graph.policy.permissions = [
      ...input.publishedGraph.graph.policy.permissions,
      { role: "waiter", resource: "order-line", actions: ["create"] },
    ];
    rehash(input);

    const captured = assertRestaurantProductCompilationInput(input);
    expect(captured.publishedGraph.graph.policy.roles).toContain("waiter");
    expect(
      captured.publishedGraph.graph.policy.permissions.some(
        (permission) =>
          permission.role === "waiter" &&
          permission.resource === "order-line" &&
          permission.actions.includes("create"),
      ),
    ).toBe(true);
  });

  it("admits an added permission for an existing role", () => {
    const input = validInput();
    input.publishedGraph.graph.policy.permissions = [
      ...input.publishedGraph.graph.policy.permissions,
      { role: "manager", resource: "menu-item", actions: ["delete"] },
    ];
    rehash(input);

    expect(() => assertRestaurantProductCompilationInput(input)).not.toThrow();
  });

  it.each([
    [
      "removed canonical role",
      (input: any) => {
        input.publishedGraph.graph.policy.roles =
          input.publishedGraph.graph.policy.roles.filter(
            (role: string) => role !== "customer",
          );
      },
    ],
    [
      "undeclared permission role",
      (input: any) => {
        input.publishedGraph.graph.policy.permissions = [
          ...input.publishedGraph.graph.policy.permissions,
          { role: "intruder", resource: "order", actions: ["submit"] },
        ];
      },
    ],
    [
      "malformed role key",
      (input: any) => {
        input.publishedGraph.graph.policy.roles = [
          ...input.publishedGraph.graph.policy.roles,
          "Bad Role!",
        ];
      },
    ],
  ])("rejects authority drift: %s", (_label, mutate) => {
    const input = validInput();
    mutate(input);
    rehashIfValid(input);
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each([
    [
      "unequal Home orders",
      (input: any) => {
        input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-home",
        ).recipe.regions[0].blockIds = [
          "home-hero",
          "home-categories",
          "home-items",
        ];
      },
    ],
    [
      "duplicate Home block",
      (input: any) => {
        input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-home",
        ).blocks[0] = input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-home",
        ).blocks[1];
      },
    ],
    [
      "missing Home block",
      (input: any) => {
        input.publishedGraph.graph.page.pages
          .find(({ id }: any) => id === "customer-home")
          .blocks.pop();
      },
    ],
    [
      "extra Home block",
      (input: any) => {
        const home = input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-home",
        );
        home.blocks.push(structuredClone(home.blocks[0]));
      },
    ],
    [
      "another page title",
      (input: any) => {
        input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-cart",
        ).title = "HOSTILE_CART_TITLE";
      },
    ],
    [
      "block type",
      (input: any) => {
        input.publishedGraph.graph.page.pages[0].blocks[0].type = "metric-card";
      },
    ],
    [
      "navigation order",
      (input: any) => {
        input.publishedGraph.graph.surfaces[0].navigation.items.reverse();
      },
    ],
    [
      "entity field",
      (input: any) => {
        input.publishedGraph.graph.domain.entities.find(
          ({ key }: any) => key === "menu-item",
        ).fields[0].required = false;
      },
    ],
    [
      "relation",
      (input: any) => {
        input.publishedGraph.graph.domain.relations.reverse();
      },
    ],
    [
      "non-editable seed value",
      (input: any) => {
        seedRecord(input, "menu-item", "mushroom-risotto").values.description =
          "HOSTILE_SEED_DRIFT";
      },
    ],
    [
      "scenario record order",
      (input: any) => {
        input.publishedGraph.graph.seedScenarios[0].records.reverse();
      },
    ],
    [
      "permission",
      (input: any) => {
        input.publishedGraph.graph.policy.permissions
          .find(({ actions }: any) => actions.length > 1)
          .actions.reverse();
      },
    ],
    [
      "flow",
      (input: any) => {
        input.publishedGraph.graph.flow.flows[0].transitions.reverse();
      },
    ],
    [
      "journey",
      (input: any) => {
        input.publishedGraph.graph.journeys[0].steps.reverse();
      },
    ],
    [
      "authority",
      (input: any) => {
        input.publishedGraph.graph.fieldAuthorities.find(
          ({ entityKey, fieldKey }: any) =>
            entityKey === "menu-item" && fieldKey === "stock",
        ).authority = "client";
      },
    ],
    [
      "binding",
      (input: any) => {
        input.publishedGraph.graph.bindingPolicies.reverse();
      },
    ],
    [
      "locale",
      (input: any) => {
        input.publishedGraph.graph.experience.locales = ["fr"];
      },
    ],
    [
      "theme token",
      (input: any) => {
        input.publishedGraph.graph.experience.theme.tokens[
          "experience-recipe"
        ] = "HOSTILE_THEME";
      },
    ],
    [
      "integration",
      (input: any) => {
        input.publishedGraph.graph.integration.capabilities.reverse();
      },
    ],
    [
      "application identity",
      (input: any) => {
        input.publishedGraph.graph.metadata.id = "hostile-application";
      },
    ],
  ])("rejects r.6 plus unlisted %s drift", (_label, mutate) => {
    const input = restaurantV6Input();
    mutate(input);
    rehashIfValid(input);
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each([
    [
      "lock package order",
      (input: any) => {
        input.compositionLock = structuredClone(input.compositionLock);
        input.compositionLock.packages.reverse();
      },
    ],
  ])("rejects valid Graph with changed %s", (_label, mutate) => {
    const input = restaurantV6Input();
    mutate(input);
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it("admits a non-canonical revision identity and number over an unchanged Graph", () => {
    const input = restaurantV6Input();
    input.publishedGraph.revisionId = "template-instance-published-2";
    input.publishedGraph.revisionNumber = 2;

    const captured = assertRestaurantProductCompilationInput(input);

    expect(captured.publishedGraph.revisionId).toBe(
      "template-instance-published-2",
    );
    expect(captured.publishedGraph.revisionNumber).toBe(2);
    expect(captured.publishedGraph.graphHash).toBe(
      hashApplicationGraphV3(input.publishedGraph.graph),
    );
  });

  it("rejects a self-consistent lock that was not derived from the captured Graph", () => {
    const input = restaurantV6Input();
    expect(
      input.publishedGraph.graph.integration.compositionSelections?.length,
    ).toBeGreaterThan(0);
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: input.publishedGraph.graphHash,
      selections: [],
    });

    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each([
    [
      "untrimmed application name",
      (input: any) => {
        input.publishedGraph.graph.metadata.name = " Maison Rivage";
      },
    ],
    [
      "short application name",
      (input: any) => {
        input.publishedGraph.graph.metadata.name = "M";
      },
    ],
    [
      "controlled menu title",
      (input: any) => {
        input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-menu",
        ).title = "Seasonal\u0000Menu";
      },
    ],
    [
      "long menu title",
      (input: any) => {
        input.publishedGraph.graph.page.pages.find(
          ({ id }: any) => id === "customer-menu",
        ).title = "M".repeat(81);
      },
    ],
    [
      "untrimmed mirrored item name",
      (input: any) => {
        seedRecord(input, "menu-item", "margherita-pizza").values.name =
          " Heirloom tomato pizza";
        input.publishedGraph.graph.seedScenarios[0].records[3].values.name =
          " Heirloom tomato pizza";
      },
    ],
    [
      "long mirrored item name",
      (input: any) => {
        seedRecord(input, "menu-item", "margherita-pizza").values.name =
          "M".repeat(121);
        input.publishedGraph.graph.seedScenarios[0].records[3].values.name =
          "M".repeat(121);
      },
    ],
    [
      "unsupported theme mode",
      (input: any) => {
        input.publishedGraph.graph.experience.theme.mode = "sepia";
      },
    ],
  ])("rejects invalid allowed-delta value: %s", (_label, mutate) => {
    const input = restaurantV6Input();
    mutate(input);
    rehashIfValid(input);
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each([
    [
      "second scenario",
      (input: any) => {
        input.publishedGraph.graph.seedScenarios.push(
          structuredClone(input.publishedGraph.graph.seedScenarios[0]),
        );
      },
    ],
    [
      "mirror length",
      (input: any) => {
        input.publishedGraph.graph.seedScenarios[0].records.pop();
      },
    ],
    [
      "mirror entity",
      (input: any) => {
        input.publishedGraph.graph.seedScenarios[0].records[3].entityKey =
          "menu-category";
      },
    ],
    [
      "mirror value",
      (input: any) => {
        input.publishedGraph.graph.seedScenarios[0].records[4].values.name =
          "HOSTILE_MIRROR";
      },
    ],
    [
      "duplicate entity/id",
      (input: any) => {
        input.publishedGraph.graph.domain.seedData[4].id = "margherita-pizza";
      },
    ],
    [
      "missing category",
      (input: any) => {
        input.publishedGraph.graph.domain.seedData.splice(2, 1);
        input.publishedGraph.graph.seedScenarios[0].records.splice(2, 1);
      },
    ],
    [
      "unresolved category",
      (input: any) => {
        input.publishedGraph.graph.domain.seedData[3].values.categoryKey =
          "missing-category";
        input.publishedGraph.graph.seedScenarios[0].records[3].values.categoryKey =
          "missing-category";
      },
    ],
    [
      "extra menu item",
      (input: any) => {
        const extra = structuredClone(
          input.publishedGraph.graph.domain.seedData[4],
        );
        extra.id = "extra-menu-item";
        input.publishedGraph.graph.domain.seedData.push(extra);
        input.publishedGraph.graph.seedScenarios[0].records.push({
          entityKey: extra.entity,
          values: structuredClone(extra.values),
        });
      },
    ],
    [
      "menu field order",
      (input: any) => {
        input.publishedGraph.graph.domain.entities
          .find(({ key }: any) => key === "menu-item")
          .fields.reverse();
      },
    ],
    [
      "manager update permission",
      (input: any) => {
        input.publishedGraph.graph.policy.permissions.find(
          ({ role, resource }: any) =>
            role === "manager" && resource === "menu-item",
        ).actions = [];
      },
    ],
  ])("rejects invalid strict catalog structure: %s", (_label, mutate) => {
    const input = restaurantV6Input();
    mutate(input);
    rehashIfValid(input);
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each([
    "array subclass",
    "sparse array",
    "nested accessor",
    "array toJSON",
  ] as const)(
    "rejects hostile %s before caller behavior can influence admission",
    (kind) => {
      const input = restaurantV6Input() as any;
      let calls = 0;
      const pages = input.publishedGraph.graph.page.pages;
      if (kind === "array subclass") {
        Object.setPrototypeOf(pages, Object.create(Array.prototype));
      } else if (kind === "sparse array") {
        pages.length += 1;
      } else if (kind === "nested accessor") {
        Object.defineProperty(pages[0], "title", {
          enumerable: true,
          get() {
            calls += 1;
            return "HOSTILE_TITLE";
          },
        });
      } else {
        pages.toJSON = () => {
          calls += 1;
          return [];
        };
      }
      expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
        new Error(boundaryError),
      );
      expect(calls).toBe(0);
    },
  );

  it.each([
    ["raw Graph", () => restaurantProductV3Fixture().graph],
    ["Draft revision", () => restaurantProductV3Fixture().baseDraft],
    [
      "Snapshot V2",
      () => ({ apiVersion: "factory.draft-preview-snapshot/v2" }),
    ],
    [
      "Published V1",
      () => ({
        ...validInput(),
        publishedGraph: {
          ...validInput().publishedGraph,
          graphVersion: "factory.application-graph/v1",
        },
      }),
    ],
    [
      "Published V2",
      () => ({
        ...validInput(),
        publishedGraph: {
          ...validInput().publishedGraph,
          graphVersion: "factory.application-graph/v2",
        },
      }),
    ],
    [
      "wrong V3 hash",
      () => ({
        ...validInput(),
        publishedGraph: {
          ...validInput().publishedGraph,
          graphHash: `sha256:${"8".repeat(64)}`,
        },
      }),
    ],
    [
      "wrong lock checksum",
      () => ({
        ...validInput(),
        compositionLock: {
          ...validInput().compositionLock,
          applicationGraphChecksum: `sha256:${"7".repeat(64)}`,
        },
      }),
    ],
    [
      "missing wrapper key",
      () => ({ publishedGraph: validInput().publishedGraph }),
    ],
    ["extra wrapper key", () => ({ ...validInput(), target: "customer" })],
    [
      "non-plain wrapper",
      () => Object.assign(Object.create({ target: "customer" }), validInput()),
    ],
  ] as const)("rejects %s with one redacted error", (_label, create) => {
    expect(() => assertRestaurantProductCompilationInput(create())).toThrow(
      new Error(boundaryError),
    );
  });

  it("rejects a structurally valid non-Restaurant V3 product", () => {
    const input = validInput();
    input.publishedGraph.graph.integration.compositionProfile =
      "simple-ecommerce";
    input.publishedGraph.graphHash = hashApplicationGraphV3(
      input.publishedGraph.graph,
    );
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: input.publishedGraph.graphHash,
      selections:
        input.publishedGraph.graph.integration.compositionSelections ?? [],
    });
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it("rejects validly rehashed Restaurant route drift", () => {
    const input = validInput();
    input.publishedGraph.graph.page.pages[0].route = "/welcome";
    input.publishedGraph.graphHash = hashApplicationGraphV3(
      input.publishedGraph.graph,
    );
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: input.publishedGraph.graphHash,
      selections:
        input.publishedGraph.graph.integration.compositionSelections ?? [],
    });
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it("keeps production compilation closed to another page's validly rehashed block reorder", () => {
    const input = validInput();
    const page = input.publishedGraph.graph.page.pages.find(
      ({ id }) => id === "customer-menu",
    )!;
    page.blocks.reverse();
    page.recipe.regions[0]!.blockIds.reverse();
    input.publishedGraph.graphHash = hashApplicationGraphV3(
      input.publishedGraph.graph,
    );
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: input.publishedGraph.graphHash,
      selections:
        input.publishedGraph.graph.integration.compositionSelections ?? [],
    });

    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });

  it.each(["accessor", "symbol", "non-enumerable", "cycle"] as const)(
    "rejects a %s without invoking caller behavior",
    (kind) => {
      let calls = 0;
      const input = validInput() as Record<PropertyKey, unknown>;
      if (kind === "accessor") {
        Object.defineProperty(input, "publishedGraph", {
          enumerable: true,
          get() {
            calls += 1;
            return validInput().publishedGraph;
          },
        });
      } else if (kind === "symbol") {
        input[Symbol("target")] = "customer";
      } else if (kind === "non-enumerable") {
        Object.defineProperty(input, "target", { value: "customer" });
      } else {
        (input.publishedGraph as Record<string, unknown>).cycle = input;
      }
      expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
        new Error(boundaryError),
      );
      expect(calls).toBe(0);
    },
  );

  it("redacts hostile reflection failures without conversion calls", () => {
    let conversions = 0;
    const hostile = new Proxy(validInput(), {
      ownKeys() {
        throw new Error("caller secret");
      },
    });
    Object.defineProperty(hostile, Symbol.toPrimitive, {
      value() {
        conversions += 1;
        return "caller secret";
      },
    });
    expect(() => assertRestaurantProductCompilationInput(hostile)).toThrow(
      new Error(boundaryError),
    );
    expect(conversions).toBe(0);
  });

  it("rejects caller callbacks without invoking toJSON", () => {
    let calls = 0;
    const input = validInput() as any;
    input.compositionLock = structuredClone(input.compositionLock);
    input.compositionLock.toJSON = () => {
      calls += 1;
      return input.compositionLock;
    };
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
    expect(calls).toBe(0);
  });

  it("rejects validly rehashed authority drift", () => {
    const input = validInput();
    const authority = input.publishedGraph.graph.fieldAuthorities.find(
      ({ authority, entityKey, fieldKey }) =>
        authority === "client" &&
        input.publishedGraph.graph.bindingPolicies
          .filter(
            (policy) =>
              policy.kind === "domain-field" &&
              policy.entityKey === entityKey &&
              policy.fieldKey === fieldKey,
          )
          .every(
            (policy) =>
              policy.kind !== "domain-field" || policy.access === "read",
          ),
    )!;
    authority.authority = "server";
    input.publishedGraph.graph.bindingPolicies
      .filter(
        (policy) =>
          policy.kind === "domain-field" &&
          policy.entityKey === authority.entityKey &&
          policy.fieldKey === authority.fieldKey,
      )
      .forEach((policy) => {
        if (policy.kind === "domain-field") policy.authority = "server";
      });
    input.publishedGraph.graphHash = hashApplicationGraphV3(
      input.publishedGraph.graph,
    );
    input.compositionLock = createCapabilityCompositionLock({
      graphChecksum: input.publishedGraph.graphHash,
      selections:
        input.publishedGraph.graph.integration.compositionSelections ?? [],
    });
    expect(() => assertRestaurantProductCompilationInput(input)).toThrow(
      new Error(boundaryError),
    );
  });
});
