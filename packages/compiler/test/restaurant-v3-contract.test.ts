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

  it("keeps production compilation closed to a validly rehashed block reorder", () => {
    const input = validInput();
    const page = input.publishedGraph.graph.page.pages.find(
      ({ id }) => id === "customer-home",
    )!;
    page.blocks = [page.blocks[2]!, page.blocks[0]!, page.blocks[1]!];
    page.recipe.regions[0]!.blockIds = [
      "home-items",
      "home-hero",
      "home-categories",
    ];
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
