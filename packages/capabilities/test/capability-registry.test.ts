import { describe, expect, it } from "vitest";

import {
  capabilityCatalog,
  capabilitiesForProfile,
  composeProfileDraft,
  getCapability,
  getProfileComposition,
  profileGraphs,
  type FactoryProfile,
} from "../src/index.js";
import { validateApplicationGraph } from "@factory/graph";
import { generateApplicationBundle } from "@factory/compiler";

describe("capability catalog", () => {
  it("exposes independently composable core and commerce capabilities", () => {
    expect(capabilityCatalog.map((capability) => capability.key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
      "commerce.catalog",
      "commerce.cart",
      "commerce.inventory",
      "commerce.order",
      "commerce.simulated-payment",
    ]);
  });

  it("returns a complete, deterministic capability set for each initial profile", () => {
    expect(
      capabilitiesForProfile("expense-approval").map(({ key }) => key),
    ).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
    ]);
    expect(
      capabilitiesForProfile("restaurant-ordering").map(({ key }) => key),
    ).toContain("commerce.simulated-payment");
    expect(
      capabilitiesForProfile("simple-ecommerce").map(({ key }) => key),
    ).toContain("commerce.inventory");
  });

  it("rejects unknown capability keys", () => {
    expect(() => getCapability("commerce.unknown")).toThrow(
      "Unknown Factory capability: commerce.unknown",
    );
  });

  it("composes an audit-free Expense Graph without dangling effects or audit policy", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.notification"],
    });

    expect(composition.optionalCapabilities).toEqual(["core.notification"]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "audit.record" }),
        ]),
      }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Restaurant Graph without its terminal notification effect", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
      optionalCapabilities: [],
    });

    expect(composition.optionalCapabilities).toEqual([]);
    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes a notification-free Expense Graph without notification effects", () => {
    const composition = composeProfileDraft({
      profile: "expense-approval",
      optionalCapabilities: ["core.audit"],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "notification.send" }),
    );
    expect(
      composition.graph.flow.flows.flatMap((flow) => flow.transitions),
    ).not.toContainEqual(
      expect.objectContaining({
        effects: expect.arrayContaining([
          expect.objectContaining({ capability: "notification.send" }),
        ]),
      }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("composes an audit-free Ecommerce Graph without audit effects or permissions", () => {
    const composition = composeProfileDraft({
      profile: "simple-ecommerce",
      optionalCapabilities: [],
    });

    expect(composition.graph.integration.capabilities).not.toContainEqual(
      expect.objectContaining({ key: "audit.record" }),
    );
    expect(composition.graph.policy.permissions).not.toContainEqual(
      expect.objectContaining({ actions: expect.arrayContaining(["audit"]) }),
    );
    expect(validateApplicationGraph(composition.graph)).toEqual([]);
  });

  it("rejects duplicate optional capability selections", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["core.audit", "core.audit"],
      }),
    ).toThrow("Optional capability selections must be unique.");
  });

  it("reports the profile and enabled effects in the composition summary", () => {
    const composition = composeProfileDraft({
      profile: "restaurant-ordering",
    });

    expect(composition.profile).toBe("restaurant-ordering");
    expect(composition.enabledEffects).toEqual(
      expect.arrayContaining(["audit.record", "notification.send"]),
    );
  });

  it("marks catalog-supported audit and notification capabilities as locked recipe requirements", () => {
    expect(
      getProfileComposition("restaurant-ordering").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.audit");
    expect(
      getProfileComposition("simple-ecommerce").requiredCapabilities.map(
        ({ key }) => key,
      ),
    ).toContain("core.notification");
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
  });

  it("rejects optional capability selections that are not declared by the profile recipe", () => {
    expect(() =>
      composeProfileDraft({
        profile: "expense-approval",
        optionalCapabilities: ["commerce.cart"],
      }),
    ).toThrow(
      "Optional capability 'commerce.cart' is not supported by profile 'expense-approval'.",
    );
    expect(() =>
      getProfileComposition("not-a-profile" as FactoryProfile),
    ).toThrow("Unknown Factory profile 'not-a-profile'.");
  });

  it("ships independently valid Graph starters for the three acceptance profiles", () => {
    expect(profileGraphs.map(({ profile }) => profile)).toEqual([
      "expense-approval",
      "restaurant-ordering",
      "simple-ecommerce",
    ]);
    for (const profile of profileGraphs) {
      expect(validateApplicationGraph(profile.graph)).toEqual([]);
    }
  });

  it("ships deterministic catalog seed scenarios for Restaurant and Ecommerce", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    const ecommerce = profileGraphs.find(
      ({ profile }) => profile === "simple-ecommerce",
    )!.graph;

    expect(restaurant.domain.seedData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entity: "menu-item" }),
      ]),
    );
    expect(ecommerce.domain.seedData).toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "product" })]),
    );
  });

  it("declares cart and inventory operations for each commerce profile", () => {
    for (const profile of [
      "restaurant-ordering",
      "simple-ecommerce",
    ] as const) {
      const graph = profileGraphs.find(
        (entry) => entry.profile === profile,
      )!.graph;
      expect(
        graph.integration.capabilities.map((capability) => capability.key),
      ).toEqual(
        expect.arrayContaining([
          "cart.add",
          "inventory.decrement",
          "payment.simulate",
        ]),
      );
    }
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(
      restaurant.domain.entities.find((entity) => entity.key === "menu-item")!
        .fields,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stock", type: "integer" }),
      ]),
    );
  });

  it("grants the Restaurant manager read-only audit access to generated capability evidence", () => {
    const restaurant = profileGraphs.find(
      ({ profile }) => profile === "restaurant-ordering",
    )!.graph;
    expect(restaurant.policy.permissions).toContainEqual({
      role: "manager",
      resource: "order",
      actions: ["read", "audit"],
    });
  });

  it.each(profileGraphs)(
    "compiles $profile as an independent published application",
    ({ profile, graph }) => {
      const bundle = generateApplicationBundle({
        publishedRevisionId: `${profile}-published-1`,
        graph,
      });

      expect(bundle.rootDirectory).toBe(`${profile}-${profile}-published-1`);
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
});
