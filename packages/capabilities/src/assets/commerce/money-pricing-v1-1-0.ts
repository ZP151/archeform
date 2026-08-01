import type { CapabilityAssetV1 } from "../contract.js";

const priceSnapshotSchemaContribution = {
  id: "money-pricing-schema",
  outputSlot: "database.schema" as const,
  namespace: "packages/commerce.money-pricing/persistence",
  source: "contributions/database/price-snapshot.prisma",
  target: "database/prisma/fragments/price-snapshot.prisma",
  parameterRefs: ["orderEntity", "orderLineEntity"],
  targetRuntimeInterfaceVersion: "factory.prisma-schema/v1",
  orderingRequirements: [],
  mergeProtocol: "append-fragment" as const,
  digest:
    "sha256:180b0a8c1dd710fcab658a1a491c678cf896ee89cadefb500b78f133e05e38f3",
};

const priceSnapshotMigrationContribution = {
  id: "money-pricing-migration",
  outputSlot: "database.migration" as const,
  namespace: "packages/commerce.money-pricing/persistence",
  source: "contributions/database/price-snapshot.sql",
  target:
    "database/prisma/migrations/0001_initial/fragments/price-snapshot.sql",
  parameterRefs: ["orderEntity", "orderLineEntity"],
  targetRuntimeInterfaceVersion: "factory.prisma-migration/v1",
  orderingRequirements: ["money-pricing-schema"],
  mergeProtocol: "append-fragment" as const,
  digest:
    "sha256:68b11c3faab6fa79df30b539a73585bf61ee434824d06896d99bb566738cecaa",
};

export const moneyPricingAssetV1_1_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.money-pricing",
    version: "1.1.0",
    category: "commerce",
    name: "Money pricing",
    description:
      "Calculates server-authoritative price quotes, immutable price snapshots, and deterministic refund allocations.",
    packageRoot: "packages/capabilities/assets/commerce.money-pricing/1.1.0",
    manifestDigest:
      "sha256:09c15dd80f6bf8f15f37f7bd9f334f1a65c63e875fc0c6a7e4655a283b0d3a23",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: ["pricing.quote", "pricing.snapshot", "payment.refund.allocate"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "orderLineEntity", type: "domain.entity", required: true },
      { key: "catalogEntity", type: "domain.entity", required: true },
      {
        key: "priceField",
        type: "domain.field",
        ownerBinding: "catalogEntity",
        fieldTypes: ["decimal"],
        fieldRequired: true,
        required: true,
      },
      { key: "customerRole", type: "policy.role", required: true },
      { key: "merchantRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "database.migration",
      "flow.effect",
      "test.fixture",
    ],
    runtimeHandlers: ["moneyPricing"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.money-pricing.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:e9596ff692c0ad86869995edb6d2719641f9642bcb06b61644eae0611eb98710",
      },
    ],
    executableContributions: [
      priceSnapshotSchemaContribution,
      priceSnapshotMigrationContribution,
    ],
    parameters: [
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "orderLineEntity", type: "graph-symbol", required: true },
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "priceField", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
      { key: "merchantRole", type: "graph-symbol", required: true },
    ],
    requires: [
      { interfaceKey: "commerce.catalog-item", version: "v1" },
      { interfaceKey: "commerce.order-operations", version: "v1" },
    ],
    provides: [
      { interfaceKey: "commerce.price-quote", version: "v1" },
      { interfaceKey: "commerce.price-snapshot", version: "v1" },
      { interfaceKey: "commerce.refund-allocation", version: "v1" },
    ],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:3c576bc374e9c918d26aba99d0d1efa3b5e2314364a0fe938c31cb167453cc54",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:72187588f8aa8a9c684d3819abe4b7e35ef0fb2dfd47d4a788f0a090914c8a70",
      status: "verified",
    },
  },
};
