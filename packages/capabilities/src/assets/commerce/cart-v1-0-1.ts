import type { CapabilityAssetV1 } from "../contract.js";

export const cartAssetV1_0_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.cart",
    version: "1.0.1",
    category: "commerce",
    name: "Cart",
    description: "Maintains a customer-owned set of purchasable line items.",
    packageRoot: "packages/capabilities/assets/commerce.cart/1.0.1",
    manifestDigest:
      "sha256:02209db2f89a645d72e5e413fcf0dfce65bce0c030174e9704ad08831f1ad094",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["cart.add", "cart.remove", "cart.checkout"],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "cartPage", type: "page.page", required: true },
      { key: "customerRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "test.fixture",
    ],
    runtimeHandlers: ["cart"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.cart.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:58995ba83eb0fb80c87394d165574a97b14c554d0f418a129bd68f76bd8c1ea4",
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
