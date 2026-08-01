import type { CapabilityAssetV1 } from "../contract.js";

export const inventoryAssetV1_1_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.inventory",
    version: "1.1.1",
    category: "commerce",
    name: "Inventory reservation",
    description:
      "Reserves available stock on a declared order transition and compensates it on cancellation.",
    packageRoot: "packages/capabilities/assets/commerce.inventory/1.1.1",
    manifestDigest:
      "sha256:5ce03072bff9c17e79686807af1e912c41f772e89e30ec8d91ff77e248e05d40",
    lifecycle: "golden",
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
    effects: ["inventory.reserve", "inventory.release", "inventory.decrement"],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
      { key: "stockField", type: "domain.field", required: true },
    ],
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
          "sha256:f5e0f48adac22ecc5c3016bf28fa15a5803b62594bd4f564d4f56bb46a52eb16",
      },
    ],
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "stockField", type: "graph-symbol", required: true },
    ],
    requires: [{ interfaceKey: "commerce.order-event", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:ecd77b2a2e93b9babc143eafd3194997fae6a9f5cfceae29ea9c76c9ca732b86",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:a423510a3392d53c7280897abc6ef9bd84e8f24d7bc3588b4a99f0a354ec734b",
      status: "verified",
    },
  },
};
