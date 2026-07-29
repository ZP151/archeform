import type { CapabilityAssetV1 } from "../contract.js";

export const restaurantKitchenAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "restaurant.kitchen",
    version: "1.0.0",
    category: "restaurant",
    name: "Restaurant kitchen",
    description:
      "Creates and advances prioritised kitchen tickets through readiness.",
    packageRoot: "packages/capabilities/assets/restaurant.kitchen/1.0.0",
    manifestDigest:
      "sha256:27a32df37226efab22d45dfec266db6ed78151c9e788ba908358a991e30bb2e6",
    lifecycle: "golden",
    profiles: ["restaurant-ordering"],
    effects: [
      "kitchen.ticket.create",
      "kitchen.ticket.accept",
      "kitchen.ticket.prepare",
      "kitchen.ticket.ready",
    ],
    inputSchema: [
      { key: "ticketEntity", type: "domain.entity", required: true },
      { key: "orderEntity", type: "domain.entity", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "api.command",
      "database.schema",
      "flow.effect",
      "web.merchant",
      "realtime.event",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/restaurant.kitchen.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:f0d92517f5052d0791b9ba33f1be83d404ff8fac15d5b6612bb1da57bdf1215e",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
