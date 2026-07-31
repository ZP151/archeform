import { describe, expect, it } from "vitest";

import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
  type CapabilitySelectionV1,
  type FactoryProfile,
} from "@factory/capabilities";
import { hashApplicationGraph, type ApplicationGraphV1 } from "@factory/graph";

import {
  generateApplicationBundle as compileApplicationBundle,
  type GenerateApplicationBundleOptions,
  type PublishedGraphInput,
} from "../src/index.js";

function generateApplicationBundle(
  input: Omit<PublishedGraphInput, "compositionLock"> | PublishedGraphInput,
  options?: GenerateApplicationBundleOptions,
) {
  const persistedSelections = (
    graph: ApplicationGraphV1,
  ): readonly CapabilitySelectionV1[] => {
    const profile = graph.integration.compositionProfile as
      FactoryProfile | undefined;
    const selectionByKey = new Map(
      profile
        ? composeDefaultCapabilityDraft({
            profile,
          }).graph.integration.compositionSelections?.map((selection) => [
            selection.lock.key,
            selection,
          ])
        : [],
    );
    return (graph.integration.assetLocks ?? []).map((lock) => {
      const selection = selectionByKey.get(lock.key);
      return {
        lock,
        bindings:
          selection?.lock.version === lock.version &&
          selection.lock.manifestDigest === lock.manifestDigest
            ? selection.bindings
            : {},
      };
    });
  };
  return compileApplicationBundle(
    "compositionLock" in input
      ? input
      : {
          ...input,
          compositionLock: createCapabilityCompositionLock({
            graphChecksum: hashApplicationGraph(input.graph),
            selections: persistedSelections(input.graph),
          }),
        },
    options,
  );
}

describe("profile compilation", () => {
  it("compiles Expense execution through the locked core package handlers", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "expense-executable-package-acceptance-1",
        graph: composeProfileDraft({ profile: "expense-approval" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain(
      "getRecordHandler",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getWorkflowHandler",
    );
    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      "effectHandler",
    );
  });

  it("generates package-owned handlers for audit and notification effects", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
    }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "core-effect-handlers-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/core.audit.ts"]).toContain(
      "effectHandler: async",
    );
    expect(files["api/src/capabilities/core.notification.ts"]).toContain(
      "effectHandler: async",
    );
    expect(files["api/src/capabilities/core.crud.ts"]).toContain(
      "recordHandler: {",
    );
    expect(files["api/src/capabilities/core.workflow.ts"]).toContain(
      "workflowHandler: {",
    );
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "effect.capability === 'audit.record'",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "getRecordHandler().create({",
    );
    expect(files["api/src/application-runtime.ts"]).toContain(
      "const workflowHandler = getWorkflowHandler();",
    );
  });

  it("compiles an audit-free Expense Graph deterministically", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.notification"],
    }).graph;

    const first = generateApplicationBundle({
      publishedRevisionId: "expense-audit-free-published-1",
      graph,
    });
    const second = generateApplicationBundle({
      publishedRevisionId: "expense-audit-free-published-1",
      graph,
    });

    expect(first).toEqual(second);
    expect(
      first.files.find((file) => file.path === "api/policy/policy.csv")
        ?.content,
    ).not.toContain(", audit");
    expect(first.files.map((file) => file.path)).not.toContain(
      "api/src/capabilities/core.audit.ts",
    );
  });

  it("counts declared audit capability effects in the generated Expense journey", () => {
    const graph = composeProfileDraft({
      profile: "expense-approval",
    }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "expense-audit-journey-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/test/journey.generated.test.ts"]).toContain(
      "toHaveLength(5)",
    );
  });

  it.each(["simple-ecommerce"] as const)(
    "generates a payment journey with package-owned Commerce effects for $profile",
    (profile) => {
      const files = Object.fromEntries(
        generateApplicationBundle({
          publishedRevisionId: `${profile}-payment-effects-1`,
          graph: composeProfileDraft({ profile }).graph,
        }).files.map((file) => [file.path, file.content]),
      );

      expect(files["api/test/journey.generated.test.ts"]).toContain(
        'applicationRuntime.transition("shopper", "order", record.id, "pay", { expectedVersion: 0, idempotencyKey: "generated-pay-1" })',
      );
      expect(
        files["api/src/capabilities/commerce.simulated-payment.ts"],
      ).toContain("effectHandler: async");
      expect(files["api/src/capabilities/commerce.inventory.ts"]).toContain(
        "effectHandler: async",
      );
      expect(files["api/src/application-runtime.ts"]).not.toContain(
        "effect.capability === 'inventory.decrement'",
      );
    },
  );

  it("delegates shared cart commands to the locked Commerce cart package", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "commerce-cart-package-acceptance-1",
        graph: composeProfileDraft({ profile: "simple-ecommerce" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/capabilities/commerce.cart.ts"]).toContain(
      "cartHandler",
    );
    expect(files["api/src/application-runtime.ts"]).toContain("getCartHandler");
    expect(files["api/src/application-runtime.ts"]).not.toContain(
      "const item = await this.store.addCartItem",
    );
  });

  it.each([
    ["simple-ecommerce", "product", "order"],
    ["retail-counter", "retail-item", "counter-sale"],
    ["grocery-pickup", "grocery-item", "pickup-order"],
  ] as const)(
    "compiles $profile through its locked generic Catalog and Order handlers",
    (profile, catalogEntity, orderEntity) => {
      const files = Object.fromEntries(
        generateApplicationBundle({
          publishedRevisionId: `${profile}-generic-order-handlers-1`,
          graph: composeProfileDraft({ profile }).graph,
        }).files.map((file) => [file.path, file.content]),
      );

      expect(files["api/src/capabilities/commerce.catalog.ts"]).toContain(
        "catalogHandler",
      );
      expect(files["api/src/capabilities/commerce.order.ts"]).toContain(
        "orderHandler",
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        `entityKey === \"${catalogEntity}\"`,
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        `entityKey === \"${orderEntity}\"`,
      );
      expect(
        files["api/src/restaurant/restaurant-command.service.ts"],
      ).toBeUndefined();
    },
  );

  it("selects the authoritative Restaurant command runtime only for the Restaurant Profile", () => {
    const restaurantFiles = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "restaurant-authoritative-runtime-1",
        graph: composeProfileDraft({ profile: "restaurant-ordering" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );
    const expenseFiles = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "expense-generic-runtime-1",
        graph: composeProfileDraft({ profile: "expense-approval" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(
      restaurantFiles["api/src/restaurant/restaurant-command.service.ts"],
    ).toContain("prisma.$transaction");
    expect(restaurantFiles["api/src/main.ts"]).toContain(
      "RestaurantCommandService",
    );
    expect(expenseFiles["api/src/main.ts"]).toContain("ApplicationRuntime");
    expect(
      expenseFiles["api/src/restaurant/restaurant-command.service.ts"],
    ).toBeUndefined();
  });

  it.each([
    "expense-approval",
    "restaurant-ordering",
    "simple-ecommerce",
    "retail-counter",
    "grocery-pickup",
  ] as const)(
    "compiles $profile as an independent published application",
    (profile) => {
      const graph = composeProfileDraft({ profile }).graph;
      const bundle = generateApplicationBundle({
        publishedRevisionId: profile + "-published-1",
        graph,
      });

      expect(bundle.rootDirectory).toBe(
        profile + "-" + profile + "-published-1",
      );
      expect(bundle.files.map((file) => file.path)).toEqual(
        expect.arrayContaining([
          "web/app/page.tsx",
          "api/src/main.ts",
          "database/prisma/schema.prisma",
          "api/policy/policy.csv",
          "api/src/flows/definitions.ts",
          "tests/journeys.generated.md",
        ]),
      );
    },
  );

  it.each([
    {
      profile: "expense-approval" as const,
      routes: ["/expenses", "/expenses/new"],
      blockTypes: ["collection", "form"],
    },
    {
      profile: "simple-ecommerce" as const,
      routes: ["/", "/checkout", "/orders"],
      blockTypes: ["catalog", "checkout", "collection"],
    },
    {
      profile: "retail-counter" as const,
      routes: ["/counter", "/counter/checkout", "/counter/sales"],
      blockTypes: ["catalog", "checkout", "collection"],
    },
    {
      profile: "grocery-pickup" as const,
      routes: ["/groceries", "/pickup/checkout", "/pickup/orders"],
      blockTypes: ["catalog", "checkout", "collection"],
    },
  ])(
    "emits the declared $profile PageModel routes and block types",
    ({ profile, routes, blockTypes }) => {
      const files = Object.fromEntries(
        generateApplicationBundle({
          publishedRevisionId: `${profile}-page-routes-1`,
          graph: composeProfileDraft({ profile }).graph,
        }).files.map((file) => [file.path, file.content]),
      );
      const runtime = files["web/app/page-runtime.tsx"];

      expect(runtime).toBeDefined();
      for (const route of routes) {
        expect(runtime).toContain(`"route": "${route}"`);
      }
      for (const blockType of blockTypes) {
        expect(runtime).toContain(`"type": "${blockType}"`);
      }
    },
  );

  it("keeps Restaurant page interpretation behind the Task 4 projection boundary", () => {
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "restaurant-task-3-shell-1",
        graph: composeProfileDraft({ profile: "restaurant-ordering" }).graph,
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["web/app/page-runtime.tsx"]).toContain(
      "factory.restaurant-runtime-shell/v1",
    );
    expect(files["web/app/page-runtime.tsx"]).not.toContain("menu-browser");
  });
});
