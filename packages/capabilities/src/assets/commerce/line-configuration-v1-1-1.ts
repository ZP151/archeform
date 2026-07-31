import type { CapabilityAssetV1 } from "../contract.js";

export const lineConfigurationAssetV1_1_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "commerce.line-configuration",
    version: "1.1.1",
    category: "commerce",
    name: "Line configuration",
    description:
      "Selects bounded product options, derives price snapshots on the server, and rejects unavailable combinations.",
    packageRoot:
      "packages/capabilities/assets/commerce.line-configuration/1.1.1",
    manifestDigest:
      "sha256:a96108f164319749e710cdee40f10a1d11e1ea00c741df894596e4feeb1792ee",
    lifecycle: "golden",
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
    effects: [
      "line.configuration.validate",
      "line.configuration.price",
      "line.configuration.availability.manage",
      "catalog.option-group.manage",
      "catalog.option.manage",
      "catalog.option.select",
    ],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
      { key: "lineEntity", type: "domain.entity", required: true },
      { key: "optionGroupEntity", type: "domain.entity", required: true },
      { key: "optionEntity", type: "domain.entity", required: true },
      { key: "customerRole", type: "policy.role", required: true },
      { key: "merchantRole", type: "policy.role", required: true },
      { key: "catalogPage", type: "page.page", required: true },
      { key: "merchantPage", type: "page.page", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "flow.effect",
      "test.fixture",
    ],
    runtimeHandlers: ["catalogConfiguration"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.line-configuration.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:b365a60a733a51ac03fbcca3781717a4e839988a97dadb1c3fee64637cf0a0ef",
      },
    ],
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "lineEntity", type: "graph-symbol", required: true },
      { key: "optionGroupEntity", type: "graph-symbol", required: true },
      { key: "optionEntity", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
      { key: "merchantRole", type: "graph-symbol", required: true },
      { key: "catalogPage", type: "graph-symbol", required: true },
      { key: "merchantPage", type: "graph-symbol", required: true },
    ],
    requires: [
      { interfaceKey: "commerce.catalog-item", version: "v1" },
      { interfaceKey: "core.location-context", version: "v1" },
    ],
    provides: [{ interfaceKey: "commerce.configured-line", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:5fe47a2349951bf1c244c8f4de820570225a92160fed0ab14e53a27c8bc4068b",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:6a52f4e8ce2fc36bb0190219f518c259cfd03fb20c6f839446e41feea52d8df4",
      status: "verified",
    },
  },
};
