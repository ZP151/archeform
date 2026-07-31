import type { CapabilityAssetV1 } from "../contract.js";

export const commerceTransactionAssetV2_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.transaction",
    version: "2.0.0",
    category: "commerce",
    name: "Commerce transaction executor",
    description:
      "Executes idempotent, version-checked commerce commands through a lock-governed atomic boundary.",
    packageRoot: "packages/capabilities/assets/commerce.transaction/2.0.0",
    manifestDigest:
      "sha256:a960b040f07da0a948daad23f4566c465df1f997634b507ab386ab77b5fe7b7e",
    lifecycle: "golden",
    profiles: [
      "restaurant-ordering",
      "simple-ecommerce",
      "retail-counter",
      "grocery-pickup",
    ],
    effects: ["commerce.transaction.execute"],
    inputSchema: [
      { key: "aggregateEntity", type: "domain.entity", required: true },
      { key: "transactionFlow", type: "flow.flow", required: true },
      { key: "actorRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "database.migration",
      "test.journey",
    ],
    runtimeHandlers: ["transaction"],
    templates: [],
    parameters: [
      { key: "aggregateEntity", type: "graph-symbol", required: true },
      { key: "transactionFlow", type: "graph-symbol", required: true },
      { key: "actorRole", type: "graph-symbol", required: true },
    ],
    executableContributions: [
      {
        id: "commerce-transaction-executor",
        outputSlot: "api.runtime",
        namespace: "packages/commerce.transaction/api/runtime/",
        source: "templates/api/commerce-transaction-executor.ts.tpl",
        target: "api/src/capabilities/commerce-transaction-executor.ts",
        parameterRefs: ["aggregateEntity", "transactionFlow", "actorRole"],
        targetRuntimeInterfaceVersion: "factory.transaction-executor/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:54598bb3d7c55732920a3f39f8c152da086603f36bde1933c01fe7d4cc1e8611",
      },
      {
        id: "commerce-transaction-schema",
        outputSlot: "database.schema",
        namespace: "packages/commerce.transaction/database/schema/",
        source: "templates/database/commerce-transaction.prisma.tpl",
        target: "database/prisma/fragments/commerce-transaction.prisma",
        parameterRefs: ["aggregateEntity", "transactionFlow", "actorRole"],
        targetRuntimeInterfaceVersion: "factory.prisma-schema/v1",
        orderingRequirements: ["commerce-transaction-executor"],
        mergeProtocol: "append-fragment",
        digest:
          "sha256:2276ebb4c5c818dc95ce928830a7daf8d167900fc42da8a9f7131a597d243994",
      },
      {
        id: "commerce-transaction-migration",
        outputSlot: "database.migration",
        namespace: "packages/commerce.transaction/database/migrations/",
        source: "templates/database/commerce-transaction.sql.tpl",
        target: "database/prisma/migrations/commerce-transaction.sql",
        parameterRefs: ["aggregateEntity", "transactionFlow", "actorRole"],
        targetRuntimeInterfaceVersion: "factory.prisma-migration/v1",
        orderingRequirements: ["commerce-transaction-schema"],
        mergeProtocol: "append-fragment",
        digest:
          "sha256:9c8a7dec61ca44f20d6ea2b24999024c3fee706ee70f9d94601aaecaade7aab2",
      },
      {
        id: "commerce-transaction-journey",
        outputSlot: "test.journey",
        namespace: "packages/commerce.transaction/test/journeys/",
        source: "templates/test/commerce-transaction.journey.ts.tpl",
        target: "api/test/journeys/commerce-transaction.journey.ts",
        parameterRefs: ["aggregateEntity", "transactionFlow", "actorRole"],
        targetRuntimeInterfaceVersion: "factory.journey/v1",
        orderingRequirements: ["commerce-transaction-executor"],
        mergeProtocol: "replace-file",
        digest:
          "sha256:d22f0c7013010ff17fefb8b14ae2dbe76a7728a6c4701ad5cada4d6f2d3e2515",
      },
    ],
    requires: [
      { interfaceKey: "commerce.stock-movement", version: "v1" },
      { interfaceKey: "commerce.order-event", version: "v1" },
    ],
    provides: [{ interfaceKey: "commerce.transaction", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:c2b6d917d1c20b9dde41991bb1b38903a0a1a2f26dbfbf7e8dfc9240ef4ef9d1",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:c680a0279a3615348d29ae6f78618e45a8e31d0740fdfb012fcec25b78547b1c",
      status: "verified",
    },
  },
};
