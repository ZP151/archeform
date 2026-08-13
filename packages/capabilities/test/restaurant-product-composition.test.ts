import { describe, expect, it } from "vitest";
import {
  assertApplicationGraphV3,
  hashApplicationGraphV3,
  type ApplicationGraphV3,
} from "@factory/graph";

import * as capabilities from "../src/index.js";
import {
  bindingContract,
  clientAuthorityKeys,
  normalizedBindingPolicies,
  restaurantJourneyKeys,
  restaurantPageContract,
  restaurantProductFixture,
} from "./restaurant-product-fixture.js";

type RestaurantApi = {
  composeRestaurantProductGraph(input: unknown): ApplicationGraphV3;
};
const api = capabilities as unknown as RestaurantApi;

function compose(): ApplicationGraphV3 {
  const fixture = restaurantProductFixture();
  return api.composeRestaurantProductGraph(fixture);
}

describe("Restaurant Application Graph V3 composition", () => {
  it("composes every exact page, block, region, screen, and shared binding", () => {
    expect(api.composeRestaurantProductGraph).toBeTypeOf("function");
    const graph = assertApplicationGraphV3(compose());
    expect(
      graph.page.pages.map((page) => [
        page.id,
        page.route,
        page.recipe.key,
        page.blocks.map(({ id, type }) => [id, type]),
        page.recipe.regions,
        page.screenIntent.key,
      ]),
    ).toEqual(
      restaurantPageContract.map(([key, route, recipe, blocks]) => [
        key,
        route,
        recipe,
        blocks,
        [{ key: "main", blockIds: blocks.map(([id]) => id) }],
        key,
      ]),
    );
    expect(normalizedBindingPolicies(graph)).toEqual(bindingContract);
  });

  it("adds only the frozen entity fields and classifies the closed authority complement", () => {
    const graph = compose();
    expect(graph.domain.entities.map(({ key }) => key)).toEqual([
      "restaurant-principal",
      "restaurant-location",
      "restaurant-table",
      "table-session",
      "menu-category",
      "menu-item",
      "menu-option-group",
      "menu-option",
      "order",
      "order-line",
      "order-line-option",
      "payment-attempt",
      "kitchen-ticket",
      "inventory-ledger",
      "audit-event",
    ]);
    const fields = Object.fromEntries(
      graph.domain.entities.map(({ key, fields }) => [
        key,
        fields.map(({ key: field }) => field),
      ]),
    );
    expect(fields["restaurant-principal"]).toEqual([
      "subjectRef",
      "role",
      "active",
      "displayName",
      "email",
      "locale",
      "marketingOptIn",
    ]);
    expect(fields["restaurant-location"]).toEqual([
      "name",
      "currency",
      "active",
      "taxRate",
      "serviceChargeRate",
      "timezone",
      "logoUrl",
      "serviceOpen",
    ]);
    expect(fields["restaurant-table"]).toEqual([
      "code",
      "number",
      "status",
      "active",
      "capacity",
    ]);
    expect(fields["audit-event"]).toEqual([
      "actorRole",
      "action",
      "subjectEntity",
      "subjectId",
      "occurredAt",
      "revisionId",
    ]);
    expect(graph.fieldAuthorities).toHaveLength(
      graph.domain.entities.reduce(
        (count, entity) => count + entity.fields.length,
        0,
      ),
    );
    expect(
      graph.fieldAuthorities
        .filter(({ authority }) => authority === "client")
        .map(({ entityKey, fieldKey }) => `${entityKey}.${fieldKey}`),
    ).toEqual(clientAuthorityKeys);
    expect(
      graph.fieldAuthorities.find(
        ({ entityKey, fieldKey }) =>
          entityKey === "order" && fieldKey === "total",
      )?.authority,
    ).toBe("server");
  });

  it("preserves exact flows and covers them with the seven actor-scoped journeys", () => {
    const graph = compose();
    expect(graph.flow.flows.map(({ id }) => id)).toEqual([
      "restaurant-table-session",
      "restaurant-order",
      "restaurant-inventory-ledger",
    ]);
    const table = graph.flow.flows[0];
    expect(
      table.transitions
        .filter(({ event }) => event === "expire")
        .map(({ roles }) => roles),
    ).toEqual([["manager"], ["manager"]]);
    expect(graph.journeys.map(({ key }) => key)).toEqual(restaurantJourneyKeys);
    expect(
      graph.journeys[0].steps.map(
        ({ flowKey, from, event, to, actorRoleKey }) =>
          `${flowKey}:${from}:${event}:${to}:${actorRoleKey}`,
      ),
    ).toEqual([
      "restaurant-order:cart:submit:submitted:customer",
      "restaurant-order:submitted:pay:paid:customer",
      "restaurant-order:paid:accept:accepted:kitchen",
      "restaurant-order:accepted:start-preparing:preparing:kitchen",
      "restaurant-order:preparing:mark-ready:ready:kitchen",
      "restaurant-order:ready:serve:served:cashier",
    ]);
    expect(
      graph.journeys
        .slice(1)
        .map((journey) =>
          journey.steps.map(
            ({ flowKey, from, event, to, actorRoleKey }) =>
              `${flowKey}:${from}:${event}:${to}:${actorRoleKey}`,
          ),
        ),
    ).toEqual([
      [
        "restaurant-order:cart:submit:submitted:customer",
        "restaurant-order:submitted:cancel:cancelled:manager",
      ],
      [
        "restaurant-order:cart:submit:submitted:customer",
        "restaurant-order:submitted:pay:paid:cashier",
        "restaurant-order:paid:cancel:cancelled:manager",
      ],
      [
        "restaurant-table-session:open:activate:active:manager",
        "restaurant-table-session:active:close:closed:manager",
      ],
      ["restaurant-table-session:open:expire:closed:manager"],
      [
        "restaurant-table-session:open:activate:active:manager",
        "restaurant-table-session:active:expire:closed:manager",
      ],
      [
        "restaurant-inventory-ledger:recorded:record-manager-adjustment:recorded:manager",
      ],
    ]);
  });

  it("returns fresh deterministic Graph data without mutating the V1 base", () => {
    const fixture = restaurantProductFixture();
    const before = structuredClone(fixture.baseDraft);
    const first = api.composeRestaurantProductGraph(fixture);
    const second = api.composeRestaurantProductGraph(fixture);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(hashApplicationGraphV3(first)).toBe(hashApplicationGraphV3(second));
    expect(fixture.baseDraft).toEqual(before);
  });

  it("fails closed for mutated targets, authority, actors, continuity, and missing policies", () => {
    const key = structuredClone(compose());
    key.page.pages[0].id = "customer-home-mutated";
    expect(() => assertApplicationGraphV3(key)).toThrow(/page|screen|binding/i);

    const target = structuredClone(compose());
    target.page.pages[0].blocks[0].bindings!.locationName =
      "graph.domain.restaurant-location.currency";
    expect(() => assertApplicationGraphV3(target)).toThrow(/target|binding/i);

    const authority = structuredClone(compose());
    authority.bindingPolicies.find(
      (policy) => policy.kind === "domain-field",
    )!.authority = "server";
    expect(() => assertApplicationGraphV3(authority)).toThrow(/authority/i);

    const actor = structuredClone(compose());
    actor.journeys[0].steps[2].actorRoleKey = "customer";
    expect(() => assertApplicationGraphV3(actor)).toThrow(/actor|granted/i);

    const discontinuous = structuredClone(compose());
    discontinuous.journeys[0].steps[3].from = "paid";
    expect(() => assertApplicationGraphV3(discontinuous)).toThrow(
      /transition|discontinuous/i,
    );

    const missing = structuredClone(compose());
    missing.bindingPolicies.pop();
    expect(() => assertApplicationGraphV3(missing)).toThrow(
      /exactly one policy/i,
    );
  });
});
