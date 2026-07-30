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
      "sha256:38cf669fe2b0f3bbff51c10980fe3c50cfd9dd7349688576a677c7c12398cd0f",
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
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "cartPage", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    requires: [{ interfaceKey: "commerce.catalog-item", version: "v1" }],
    provides: [{ interfaceKey: "commerce.cart", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
