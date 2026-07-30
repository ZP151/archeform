import type { CapabilityAssetV1 } from "../contract.js";

export const inventoryAssetV1_0_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.inventory",
    version: "1.0.1",
    category: "commerce",
    name: "Inventory",
    description: "Tracks and reserves available stock or menu availability.",
    packageRoot: "packages/capabilities/assets/commerce.inventory/1.0.1",
    manifestDigest:
      "sha256:3c54c87db4dcc929d714c7442a6e2419080e552d827ec9dffe0e6bfd24718b94",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["inventory.reserve", "inventory.release", "inventory.decrement"],
    inputSchema: [{ key: "stockField", type: "domain.field", required: true }],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "flow.effect",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.inventory.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:fb3da1d03b9165d844dd5af38a0abbe7caabd8bfcf8dfc46105c034c899a15cb",
      },
    ],
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "stockField", type: "graph-symbol", required: true },
    ],
    requires: [{ interfaceKey: "commerce.order-event", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
