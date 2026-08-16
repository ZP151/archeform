import { describe, expect, it } from "vitest";
import { generatedUiRegistry } from "@factory/generated-ui";

import {
  restaurantScreenRecipes,
  selectRestaurantScreenSource,
  validateRestaurantScreenRecipes,
  validateScreenRecipeClosure,
} from "../src/index.js";

describe("Restaurant screen recipes", () => {
  it("assembles the exact fifteen frozen pages with one ordered main region", () => {
    expect(restaurantScreenRecipes).toHaveLength(15);
    expect(restaurantScreenRecipes.map((recipe) => recipe.route)).toEqual([
      "/",
      "/menu",
      "/menu/:itemId",
      "/cart",
      "/checkout",
      "/orders",
      "/orders/:orderId",
      "/profile",
      "/merchant",
      "/merchant/menu",
      "/merchant/orders",
      "/merchant/kitchen",
      "/merchant/tables",
      "/merchant/users",
      "/merchant/settings",
    ]);
    expect(validateRestaurantScreenRecipes(restaurantScreenRecipes)).toEqual({
      valid: true,
    });
  });

  it("rejects unknown ports, wrong binding kinds, missing states, and style-only duplicate keys", () => {
    expect(() =>
      validateRestaurantScreenRecipes([
        {
          ...restaurantScreenRecipes[0]!,
          blocks: [
            {
              ...restaurantScreenRecipes[0]!.blocks[0]!,
              bindings: {
                locationName: {
                  kind: "flow-transition",
                  target: "restaurant-order:cart:submit:submitted",
                  mode: "request",
                },
              },
            },
          ],
        },
      ]),
    ).toThrow("Invalid binding");
    expect(() =>
      validateRestaurantScreenRecipes([
        {
          ...restaurantScreenRecipes[0]!,
          key: "restaurant-customer-home-gold",
          styleOnlyDuplicateOf: "restaurant-customer-home",
        },
      ]),
    ).toThrow("Style-only duplicate");
    expect(() =>
      validateRestaurantScreenRecipes([
        {
          ...restaurantScreenRecipes[0]!,
          blocks: [
            {
              ...restaurantScreenRecipes[0]!.blocks[0]!,
              bindings: {
                ...restaurantScreenRecipes[0]!.blocks[0]!.bindings,
                unexpected: {
                  kind: "domain-field",
                  target: "restaurant-location.name",
                  mode: "read",
                },
              },
            },
          ],
        },
      ]),
    ).toThrow("Unknown binding port");
    expect(() =>
      validateRestaurantScreenRecipes([
        { ...restaurantScreenRecipes[0]!, states: ["loading"] },
      ]),
    ).toThrow("Missing required state");
  });

  it("maps customer and merchant recipes to the frozen surface shells and bindings", () => {
    const customer = restaurantScreenRecipes.find(
      (recipe) => recipe.pageKey === "customer-checkout",
    )!;
    const merchant = restaurantScreenRecipes.find(
      (recipe) => recipe.pageKey === "merchant-kitchen-queue",
    )!;
    expect(customer.surface).toBe("customer-mobile");
    expect(customer.layoutKey).toBe("mobile-product-shell");
    expect(customer.blocks.map((block) => block.id)).toEqual([
      "checkout-summary",
      "checkout-payment",
    ]);
    expect(merchant.surface).toBe("merchant-desktop");
    expect(merchant.layoutKey).toBe("merchant-workspace-shell");
    expect(merchant.blocks[0]!.bindings.accept.kind).toBe("flow-transition");
  });

  it("exposes the complete independent page and port manifest", () => {
    const pages = restaurantScreenRecipes.map(
      (recipe) =>
        `${recipe.pageKey}|${recipe.surface}|${recipe.route}|${recipe.layoutKey}|${recipe.blocks.map((block) => block.id).join(",")}`,
    );
    expect(pages).toEqual([
      "customer-home|customer-mobile|/|mobile-product-shell|home-hero,home-categories,home-items",
      "customer-menu|customer-mobile|/menu|mobile-product-shell|menu-categories,menu-items",
      "customer-dish-detail|customer-mobile|/menu/:itemId|mobile-product-shell|dish-configurator",
      "customer-cart|customer-mobile|/cart|mobile-product-shell|cart-lines,cart-summary",
      "customer-checkout|customer-mobile|/checkout|mobile-product-shell|checkout-summary,checkout-payment",
      "customer-orders|customer-mobile|/orders|mobile-product-shell|customer-order-list",
      "customer-order-detail|customer-mobile|/orders/:orderId|mobile-product-shell|customer-order-summary,customer-payment-state,customer-order-timeline",
      "customer-profile|customer-mobile|/profile|mobile-product-shell|customer-profile-form",
      "merchant-dashboard|merchant-desktop|/merchant|merchant-workspace-shell|dashboard-metrics,dashboard-orders,dashboard-tables",
      "merchant-menu-management|merchant-desktop|/merchant/menu|merchant-workspace-shell|merchant-menu-table,merchant-availability",
      "merchant-orders|merchant-desktop|/merchant/orders|merchant-workspace-shell|merchant-order-list,merchant-order-summary,merchant-payment-state",
      "merchant-kitchen-queue|merchant-desktop|/merchant/kitchen|merchant-workspace-shell|kitchen-tickets",
      "merchant-tables|merchant-desktop|/merchant/tables|merchant-workspace-shell|merchant-table-map",
      "merchant-users-roles|merchant-desktop|/merchant/users|merchant-workspace-shell|merchant-role-matrix",
      "merchant-settings|merchant-desktop|/merchant/settings|merchant-workspace-shell|restaurant-settings-form",
    ]);
    const ports = Object.fromEntries(
      restaurantScreenRecipes.flatMap((recipe) =>
        recipe.blocks.map((block) => [
          block.id,
          Object.entries(block.bindings)
            .map(
              ([port, binding]) =>
                `${port}:${binding.kind}:${binding.target}:${binding.mode}`,
            )
            .sort()
            .join(","),
        ]),
      ),
    );
    expect(ports).toMatchObject({
      "home-hero":
        "locationName:domain-field:restaurant-location.name:read,serviceOpen:domain-field:restaurant-location.serviceOpen:read",
      "cart-summary":
        "canSubmit:policy-permission:customer:order:submit:evaluate,status:domain-field:order.status:read,submit:flow-transition:restaurant-order:cart:submit:submitted:request,total:domain-field:order.total:read",
      "checkout-payment":
        "amount:domain-field:payment-attempt.amount:read,attemptStatus:domain-field:payment-attempt.status:read,canPay:policy-permission:customer:order:pay:evaluate,method:domain-field:payment-attempt.method:write,pay:flow-transition:restaurant-order:submitted:pay:paid:request,paymentStatus:domain-field:order.paymentStatus:read",
      "kitchen-tickets":
        "accept:flow-transition:restaurant-order:paid:accept:accepted:request,acceptedAt:domain-field:kitchen-ticket.acceptedAt:read,canAccept:policy-permission:kitchen:order:accept:evaluate,canMarkReady:policy-permission:kitchen:order:mark-ready:evaluate,canStartPreparing:policy-permission:kitchen:order:start-preparing:evaluate,markReady:flow-transition:restaurant-order:preparing:mark-ready:ready:request,priority:domain-field:kitchen-ticket.priority:read,readyAt:domain-field:kitchen-ticket.readyAt:read,startPreparing:flow-transition:restaurant-order:accepted:start-preparing:preparing:request,startedAt:domain-field:kitchen-ticket.startedAt:read,ticketStatus:domain-field:kitchen-ticket.status:read",
      "merchant-table-map":
        "activate:flow-transition:restaurant-table-session:open:activate:active:request,active:domain-field:restaurant-table.active:write,canActivate:policy-permission:manager:table-session:activate:evaluate,canClose:policy-permission:manager:table-session:close:evaluate,canExpire:policy-permission:manager:table-session:expire:evaluate,capacity:domain-field:restaurant-table.capacity:write,close:flow-transition:restaurant-table-session:active:close:closed:request,code:domain-field:restaurant-table.code:write,expireActive:flow-transition:restaurant-table-session:active:expire:closed:request,expireOpen:flow-transition:restaurant-table-session:open:expire:closed:request,number:domain-field:restaurant-table.number:write,status:domain-field:restaurant-table.status:read",
      "restaurant-settings-form":
        "canConfigure:policy-permission:manager:restaurant-location:update:evaluate,currency:domain-field:restaurant-location.currency:write,logoUrl:domain-field:restaurant-location.logoUrl:write,name:domain-field:restaurant-location.name:write,serviceChargeRate:domain-field:restaurant-location.serviceChargeRate:write,serviceOpen:domain-field:restaurant-location.serviceOpen:write,taxRate:domain-field:restaurant-location.taxRate:write,timezone:domain-field:restaurant-location.timezone:write",
    });
  });

  it("declares immutable deterministic fixtures for every screenshot state", () => {
    for (const recipe of restaurantScreenRecipes) {
      expect(recipe.fixtures.map(({ state }) => state)).toEqual([
        "loading",
        "empty",
        "validation",
        "error",
        "confirmation",
        "denial",
      ]);
      expect(Object.isFrozen(recipe)).toBe(true);
    }
  });

  it("rejects version, fixture, state, order, and generated-port closure mutations", () => {
    expect(validateScreenRecipeClosure()).toBe(true);
    for (const mutate of [
      (
        items: ReturnType<
          typeof structuredClone<typeof restaurantScreenRecipes>
        >,
      ) => (items[0]!.version = "9.9.9"),
      (
        items: ReturnType<
          typeof structuredClone<typeof restaurantScreenRecipes>
        >,
      ) => (items[0]!.fixtures[0]!.id = "invented"),
      (
        items: ReturnType<
          typeof structuredClone<typeof restaurantScreenRecipes>
        >,
      ) => items[0]!.states.push("invented"),
    ]) {
      const changed = structuredClone(restaurantScreenRecipes);
      mutate(changed);
      expect(() => validateRestaurantScreenRecipes(changed)).toThrow(
        "exact frozen",
      );
    }
    expect(() =>
      validateRestaurantScreenRecipes([...restaurantScreenRecipes].reverse()),
    ).toThrow("exact frozen");
    const generated = structuredClone(generatedUiRegistry);
    const hero = generated.find(({ key }) => key === "menu-hero")!;
    hero.ports = ["locationName"];
    expect(() =>
      validateScreenRecipeClosure(restaurantScreenRecipes, generated),
    ).toThrow("Generated UI port closure");
  });

  it("deeply rejects every supplied generated registry mutation", () => {
    const mutations = [
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        items[2]!.ports.push("invented"),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        items[2]!.states.reverse(),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[2]!.source.code = "export function invented() {}"),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        (items[2]!.fixture.id = "invented"),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        items[2]!.responsive.reverse(),
      (items: ReturnType<typeof structuredClone<typeof generatedUiRegistry>>) =>
        items[2]!.composition.patternKeys.push("invented"),
    ];
    for (const mutate of mutations) {
      const generated = structuredClone(generatedUiRegistry);
      mutate(generated);
      expect(() =>
        validateScreenRecipeClosure(restaurantScreenRecipes, generated),
      ).toThrow("exact frozen");
    }
  });

  it("compiles the complete copyable source selection for every frozen screen", () => {
    for (const recipe of restaurantScreenRecipes) {
      const source = selectRestaurantScreenSource(recipe.key);
      expect(
        () => new Function(source.replaceAll("export ", "")),
      ).not.toThrow();
    }
  });
});
