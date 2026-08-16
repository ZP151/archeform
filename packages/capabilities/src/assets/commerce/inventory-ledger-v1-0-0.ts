import type { CapabilityAssetV1 } from "../contract.js";

export const inventoryLedgerAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.inventory-ledger",
    version: "1.0.0",
    category: "commerce",
    name: "Inventory ledger",
    description:
      "Records immutable, idempotent stock movements scoped to a declared location.",
    packageRoot: "packages/capabilities/assets/commerce.inventory-ledger/1.0.0",
    manifestDigest:
      "sha256:611d7b77c806ffbaea4fbe262a7df4a459bb0f7a1d9e1b95150d8053744e4cbb",
    lifecycle: "golden",
    profiles: ["restaurant-ordering", "simple-ecommerce"],
    effects: [
      "inventory.reserve",
      "inventory.release",
      "inventory.decrement",
      "inventory.adjust",
      "inventory.ledger.read",
    ],
    inputSchema: [
      { key: "catalogEntity", type: "domain.entity", required: true },
      {
        key: "stockField",
        type: "domain.field",
        required: true,
        ownerBinding: "catalogEntity",
        fieldTypes: ["integer"],
        fieldRequired: true,
      },
      { key: "movementEntity", type: "domain.entity", required: true },
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "locationEntity", type: "domain.entity", required: true },
      { key: "merchantRole", type: "policy.role", required: true },
      { key: "auditRole", type: "policy.role", required: true },
    ],
    outputSlots: [
      "api.runtime",
      "api.service",
      "database.schema",
      "flow.handler",
      "web.merchant",
      "report.read-model",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/commerce.inventory-ledger.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
    ],
    parameters: [
      { key: "catalogEntity", type: "graph-symbol", required: true },
      { key: "stockField", type: "graph-symbol", required: true },
      { key: "movementEntity", type: "graph-symbol", required: true },
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "locationEntity", type: "graph-symbol", required: true },
      { key: "merchantRole", type: "graph-symbol", required: true },
      { key: "auditRole", type: "graph-symbol", required: true },
    ],
    graphContributions: [
      {
        id: "stock-movement-entities",
        model: "domain",
        collection: "entities",
        operation: "extend",
        parameterRefs: [
          "catalogEntity",
          "stockField",
          "movementEntity",
          "orderEntity",
          "locationEntity",
        ],
        digest:
          "sha256:dde4526425cd581769198880148dffd4cde3f905169df8fe3edcf10e493ab0b3",
      },
    ],
    executableContributions: [
      {
        id: "inventory-ledger-handler",
        outputSlot: "flow.handler",
        namespace: "packages/commerce.inventory-ledger/flow/handlers/",
        source: "templates/api/inventory-ledger.handler.ts.tpl",
        target: "api/src/flows/handlers/{{movementEntity}}-inventory-ledger.ts",
        parameterRefs: [
          "catalogEntity",
          "stockField",
          "movementEntity",
          "orderEntity",
          "locationEntity",
          "merchantRole",
          "auditRole",
        ],
        targetRuntimeInterfaceVersion: "factory.flow-handler/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:7545fb8de583f6ff1e334dc694be5a1c217bc473a0c53073ea61465d3bc95320",
      },
    ],
    requires: [
      { interfaceKey: "commerce.catalog-item", version: "v1" },
      { interfaceKey: "commerce.order-event", version: "v1" },
      { interfaceKey: "core.location-context", version: "v1" },
    ],
    provides: [{ interfaceKey: "commerce.stock-movement", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:582b408b9ada232cca271538f57202c5738717020815b901194b6faf3cd990b0",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:1e39d52256eb44a7ea380a70bda290555ffb16b3d7d28e0a6ce1f4c842680d9a",
      status: "verified",
    },
  },
};
