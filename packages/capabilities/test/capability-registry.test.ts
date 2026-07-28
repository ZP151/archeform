import { describe, expect, it } from "vitest";

import {
  capabilityCatalog,
  capabilitiesForProfile,
  getCapability,
  profileGraphs,
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
    expect(capabilitiesForProfile("expense-approval").map(({ key }) => key)).toEqual([
      "core.audit",
      "core.crud",
      "core.notification",
      "core.workflow",
    ]);
    expect(capabilitiesForProfile("restaurant-ordering").map(({ key }) => key)).toContain(
      "commerce.simulated-payment",
    );
    expect(capabilitiesForProfile("simple-ecommerce").map(({ key }) => key)).toContain(
      "commerce.inventory",
    );
  });

  it("rejects unknown capability keys", () => {
    expect(() => getCapability("commerce.unknown")).toThrow(
      "Unknown Factory capability: commerce.unknown",
    );
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
    const restaurant = profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!.graph;
    const ecommerce = profileGraphs.find(({ profile }) => profile === "simple-ecommerce")!.graph;

    expect(restaurant.domain.seedData).toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "menu-item" })]),
    );
    expect(ecommerce.domain.seedData).toEqual(
      expect.arrayContaining([expect.objectContaining({ entity: "product" })]),
    );
  });

  it("declares cart and inventory operations for each commerce profile", () => {
    for (const profile of ["restaurant-ordering", "simple-ecommerce"] as const) {
      const graph = profileGraphs.find((entry) => entry.profile === profile)!.graph;
      expect(graph.integration.capabilities.map((capability) => capability.key)).toEqual(
        expect.arrayContaining(["cart.add", "inventory.decrement", "payment.simulate"]),
      );
    }
    const restaurant = profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!.graph;
    expect(restaurant.domain.entities.find((entity) => entity.key === "menu-item")!.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "stock", type: "integer" })]),
    );
  });

  it("grants the Restaurant manager read-only audit access to generated capability evidence", () => {
    const restaurant = profileGraphs.find(({ profile }) => profile === "restaurant-ordering")!.graph;
    expect(restaurant.policy.permissions).toContainEqual(
      { role: "manager", resource: "order", actions: ["read", "audit"] },
    );
  });

  it.each(profileGraphs)("compiles $profile as an independent published application", ({ profile, graph }) => {
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
  });
});
