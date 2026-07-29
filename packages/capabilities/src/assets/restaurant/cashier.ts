import type { CapabilityAssetV1 } from "../contract.js";

export const restaurantCashierAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "restaurant.cashier",
    version: "1.0.0",
    category: "restaurant",
    name: "Restaurant cashier",
    description:
      "Simulates full payment, records reversals, serves orders, and renders receipts.",
    packageRoot: "packages/capabilities/assets/restaurant.cashier/1.0.0",
    manifestDigest:
      "sha256:4274b780d6aa6f48658d7dc6f2280d259933e3f9490821a21381dafa4f6ae16c",
    lifecycle: "golden",
    profiles: ["restaurant-ordering"],
    effects: [
      "payment.simulate",
      "payment.reversal.request",
      "order.serve",
      "receipt.render",
    ],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "paymentEntity", type: "domain.entity", required: true },
      { key: "currency", type: "currency.code", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "api.command",
      "database.schema",
      "flow.effect",
      "web.customer",
      "web.merchant",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/restaurant.cashier.ts",
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
