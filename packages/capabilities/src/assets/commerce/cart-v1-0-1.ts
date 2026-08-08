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
      "sha256:20b9900c018b5590bb6481b1c6fb30a0bece3fd1b42baa8ebfceb6a6bd5c5216",
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
      fixtureDigest:
        "sha256:d67eabef3aa20729725939d0bcd03a7e7aa9ce58a76e8968f09bf2e8adfb512d",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:01b2ad5e8635728d62061fb06bed09267295d9ea6d1beb29f114c3d9ab9e1fa7",
      status: "verified",
    },
  },
};
