import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { restaurantProductV3Fixture } from "./fixtures/restaurant-product-v3.js";
import { planRestaurantProduct } from "../src/targets/restaurant-v3/plan.js";
import {
  selectRestaurantSurfaceSource,
  validateRestaurantSurfaceSource,
} from "../src/targets/restaurant-v3/source-registry.js";
import {
  projectRestaurantSurface,
  validateRestaurantSurfacePlan,
} from "../src/targets/restaurant-v3/surface-projection.js";

const customerPageKeys = [
  "customer-home",
  "customer-menu",
  "customer-dish-detail",
  "customer-cart",
  "customer-checkout",
  "customer-orders",
  "customer-order-detail",
  "customer-profile",
] as const;

function customerSurface() {
  const fixture = restaurantProductV3Fixture();
  return projectRestaurantSurface(
    planRestaurantProduct({
      publishedGraph: fixture.publishedGraph,
      compositionLock: fixture.compositionLock,
    }),
    "customer-mobile",
  );
}

describe("Restaurant V3 surface projection", () => {
  it("projects the exact customer page and visible navigation order", () => {
    const surface = customerSurface();
    expect(surface.pages.map(({ id }) => id)).toEqual(customerPageKeys);
    expect(
      surface.navigation.map(({ label, pageKey }) => [label, pageKey]),
    ).toEqual([
      ["Home", "customer-home"],
      ["Menu", "customer-menu"],
      ["Cart", "customer-cart"],
      ["Orders", "customer-orders"],
      ["Profile", "customer-profile"],
    ]);
    expect(
      surface.pages.map(({ route, recipe, blocks }) => [
        route,
        recipe.key,
        recipe.regions,
        blocks.map(({ id, type }) => [id, type]),
      ]),
    ).toEqual([
      [
        "/",
        "restaurant-customer-home",
        [
          {
            key: "main",
            blockIds: ["home-hero", "home-categories", "home-items"],
          },
        ],
        [
          ["home-hero", "menu-hero"],
          ["home-categories", "category-rail"],
          ["home-items", "menu-item-card"],
        ],
      ],
      [
        "/menu",
        "restaurant-customer-menu",
        [{ key: "main", blockIds: ["menu-categories", "menu-items"] }],
        [
          ["menu-categories", "category-rail"],
          ["menu-items", "menu-item-card"],
        ],
      ],
      [
        "/menu/:itemId",
        "restaurant-customer-dish-detail",
        [{ key: "main", blockIds: ["dish-configurator"] }],
        [["dish-configurator", "dish-configurator"]],
      ],
      [
        "/cart",
        "restaurant-customer-cart",
        [{ key: "main", blockIds: ["cart-lines", "cart-summary"] }],
        [
          ["cart-lines", "cart-line"],
          ["cart-summary", "order-summary"],
        ],
      ],
      [
        "/checkout",
        "restaurant-customer-checkout",
        [{ key: "main", blockIds: ["checkout-summary", "checkout-payment"] }],
        [
          ["checkout-summary", "order-summary"],
          ["checkout-payment", "payment-state"],
        ],
      ],
      [
        "/orders",
        "restaurant-customer-orders",
        [{ key: "main", blockIds: ["customer-order-list"] }],
        [["customer-order-list", "active-order-list"]],
      ],
      [
        "/orders/:orderId",
        "restaurant-customer-order-detail",
        [
          {
            key: "main",
            blockIds: [
              "customer-order-summary",
              "customer-payment-state",
              "customer-order-timeline",
            ],
          },
        ],
        [
          ["customer-order-summary", "order-summary"],
          ["customer-payment-state", "payment-state"],
          ["customer-order-timeline", "order-timeline"],
        ],
      ],
      [
        "/profile",
        "restaurant-customer-profile",
        [{ key: "main", blockIds: ["customer-profile-form"] }],
        [["customer-profile-form", "customer-profile-form"]],
      ],
    ]);
  });

  it("preserves every declared Domain, Flow, and Policy port from the frozen recipes", () => {
    const surface = customerSurface();
    const fixture = restaurantProductV3Fixture();
    const expected = fixture.graph.bindingPolicies
      .filter(({ pageId }) => pageId.startsWith("customer-"))
      .map((policy) => [
        `${policy.pageId}/${policy.blockId}/${policy.bindingKey}`,
        policy.kind === "domain-field"
          ? [
              policy.kind,
              `${policy.entityKey}.${policy.fieldKey}`,
              policy.access,
            ]
          : policy.kind === "flow-transition"
            ? [
                policy.kind,
                `${policy.flowKey}:${policy.from}:${policy.event}:${policy.to}`,
                policy.access,
              ]
            : [
                policy.kind,
                `${policy.roleKey}:${policy.resource}:${policy.action}`,
                policy.access,
              ],
      ]);
    const projected = surface.pages.flatMap(({ id: pageId, blocks }) =>
      blocks.flatMap(({ id: blockId, bindings = {} }) =>
        Object.entries(bindings).map(([bindingKey, binding]) => [
          `${pageId}/${blockId}/${bindingKey}`,
          [binding.kind, binding.target, binding.mode],
        ]),
      ),
    );
    expect(projected).toEqual(expected);
  });

  it("selects closed reviewed source with stable origins and browser-importable ESM", async () => {
    const surface = customerSurface();
    const source = selectRestaurantSurfaceSource("customer-mobile");
    expect(surface.source).toMatchObject({
      module: "src/generated/restaurant-ui.mjs",
      digest:
        "sha256:626d3460b3c7591df86fedf8df16430c61d77428e1ed272604fa4d798630cf5e",
      origins: [
        {
          package: "@factory/screen-recipes",
          version: "0.1.0",
          ownership: "factory-authored",
          license: "UNLICENSED",
          recipeKeys: customerPageKeys.map((key) => `restaurant-${key}`),
        },
      ],
    });
    expect(surface.source.module).not.toMatch(/merchant|private|@factory/);
    expect(surface.source.origins).toHaveLength(1);
    const imported = await import(
      `data:text/javascript;base64,${Buffer.from(source.code).toString("base64")}`
    );
    expect(imported.renderMobileProductShell).toBeTypeOf("function");
    expect(source.code).not.toMatch(/\beval\s*\(|\bFunction\s*\(/);
  });

  it.each([
    [
      "merchant source key",
      (surface: any) => {
        surface.pages[0].recipe.key = "restaurant-merchant-dashboard";
      },
    ],
    [
      "missing block",
      (surface: any) => {
        surface.pages[0].blocks.pop();
      },
    ],
    [
      "extra block",
      (surface: any) => {
        surface.pages[0].blocks.push(surface.pages[0].blocks[0]);
      },
    ],
    [
      "reordered block",
      (surface: any) => {
        surface.pages[0].blocks.reverse();
      },
    ],
    [
      "invented port",
      (surface: any) => {
        surface.pages[0].blocks[0].bindings.invented = {
          kind: "domain-field",
          target: "order.total",
          mode: "read",
        };
      },
    ],
  ] as const)("rejects %s", (_label, mutate) => {
    const candidate = structuredClone(customerSurface());
    mutate(candidate);
    expect(() => validateRestaurantSurfacePlan(candidate)).toThrow(
      "Restaurant surface projection is invalid.",
    );
  });

  it.each([
    [
      "private runtime import",
      (source: any) => {
        source.code += '\nimport "@factory/private";';
      },
    ],
    [
      "nondeterministic source bytes",
      (source: any) => {
        source.code += `\n// ${Date.now()}`;
      },
    ],
  ] as const)("rejects %s", (_label, mutate) => {
    const candidate = structuredClone(
      selectRestaurantSurfaceSource("customer-mobile"),
    );
    mutate(candidate);
    expect(() => validateRestaurantSurfaceSource(candidate)).toThrow(
      "Restaurant surface source is invalid.",
    );
  });

  it("deep-freezes the deterministic projection", () => {
    const first = customerSurface();
    const second = customerSurface();
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pages[0].blocks[0])).toBe(true);
  });
});
