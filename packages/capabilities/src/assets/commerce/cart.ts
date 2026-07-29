import type { CapabilityAssetV1 } from "../contract.js";

export const cartAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.cart",
    version: "1.0.0",
    category: "commerce",
    name: "Cart",
    description: "Maintains a customer-owned set of purchasable line items.",
    packageRoot: "packages/capabilities/assets/commerce.cart/1.0.0",
    manifestDigest:
      "sha256:f3f0ba58748cd7a8464950b56b68f77fa9826f7c9c7839813e4d2126e048d2cb",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["cart.add", "cart.remove", "cart.checkout"],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
      { key: "orderEntity", type: "domain.entity", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.cart.ts",
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
