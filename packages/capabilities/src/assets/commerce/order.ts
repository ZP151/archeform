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
      "sha256:a8cf6404ad489d22ef2e3285704439a44a1fea437656fa97cc4c635305ee16e6",
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
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
