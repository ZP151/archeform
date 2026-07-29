import type { CapabilityAssetV1 } from "../contract.js";

export const restaurantReportingAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "restaurant.reporting",
    version: "1.0.0",
    category: "restaurant",
    name: "Restaurant reporting",
    description:
      "Projects operational restaurant summaries and low-stock items.",
    packageRoot: "packages/capabilities/assets/restaurant.reporting/1.0.0",
    manifestDigest:
      "sha256:7725e06fba76c691a9d5ef2d02ec669a40dba05a8e03db6d8c26797c70ddb4cc",
    lifecycle: "golden",
    profiles: ["restaurant-ordering"],
    effects: ["report.restaurant.summary", "report.restaurant.low-stock"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "inventoryEntity", type: "domain.entity", required: true },
      { key: "lowStockThreshold", type: "integer", required: false },
    ],
    outputSlots: [
      "api.runtime",
      "report.read-model",
      "web.merchant",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/restaurant.reporting.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:f0d92517f5052d0791b9ba33f1be83d404ff8fac15d5b6612bb1da57bdf1215e",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
