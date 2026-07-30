import type { CapabilityAssetV1 } from "../contract.js";

export const catalogAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.catalog",
    version: "1.0.0",
    category: "commerce",
    name: "Catalog",
    description: "Publishes browsable products or menu items.",
    packageRoot: "packages/capabilities/assets/commerce.catalog/1.0.0",
    manifestDigest:
      "sha256:650a56c597ba71cbd7cfdbce15e7e19d1b7fc40a0d4f15ba0d2ed4eb2e66b42b",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["catalog.list", "catalog.read"],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
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
        target: "api/src/capabilities/commerce.catalog.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
    ],
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "catalogPage", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    provides: [{ interfaceKey: "commerce.catalog-item", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
