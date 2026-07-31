import type { CapabilityAssetV1 } from "../contract.js";

export const restaurantCashierAssetV1_1_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "restaurant.cashier",
    version: "1.1.0",
    category: "restaurant",
    name: "Restaurant cashier",
    description:
      "Simulates full payment, records reversals, serves orders, and renders receipts.",
    packageRoot: "packages/capabilities/assets/restaurant.cashier/1.1.0",
    manifestDigest:
      "sha256:c95c35b2069c9c331d8b7cb591ec0472c72acf59fddfdb65c1550e05283fd6ba",
    lifecycle: "golden",
    bindingContract: "factory.capability-binding/v1",
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
      { key: "orderFlow", type: "flow.flow", required: true },
      { key: "cashierPage", type: "page.page", required: true },
      { key: "merchantRole", type: "policy.role", required: true },
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
    parameters: [
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "paymentEntity", type: "graph-symbol", required: true },
      { key: "orderFlow", type: "graph-symbol", required: true },
      { key: "cashierPage", type: "graph-symbol", required: true },
      { key: "merchantRole", type: "graph-symbol", required: true },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
