import type { CapabilityAssetV1 } from "../contract.js";

export const orderAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.order",
    version: "1.0.0",
    category: "commerce",
    name: "Order lifecycle",
    description: "Creates orders and manages declared fulfilment states.",
    packageRoot: "packages/capabilities/assets/commerce.order/1.0.0",
    manifestDigest:
      "sha256:aebf024e27d45d02b4c40fae31260735c74b84a6e87492287dafaf0bc7e8b14e",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["order.create", "order.transition"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "flow.effect",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.order.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
