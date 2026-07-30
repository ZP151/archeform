import type { CapabilityAssetV1 } from "../contract.js";

export const crudAssetV1_0_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.crud",
    version: "1.0.1",
    category: "core",
    name: "Managed records",
    description:
      "Creates, reads, updates, and deletes validated domain records.",
    packageRoot: "packages/capabilities/assets/core.crud/1.0.1",
    manifestDigest:
      "sha256:ac6197b00e529f519f1b062c9189a368eb9b94be125444a7c2f90cec46200f26",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["data.create", "data.read", "data.update", "data.delete"],
    inputSchema: [{ key: "entities", type: "domain.entities", required: true }],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "test.fixture",
      "web.route",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.crud.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:5e1bcc06560ccdd1062c786618a883de6df9234d2134c89361b3adaab0700955",
      },
    ],
    parameters: [
      { key: "entityKey", type: "graph-symbol", required: true },
      { key: "routeKey", type: "graph-symbol", required: true },
    ],
    graphContributions: [
      {
        id: "managed-entity",
        model: "domain",
        collection: "entities",
        operation: "extend",
        parameterRefs: ["entityKey"],
        digest:
          "sha256:80ae0802501d2d97c3270f88251426a1cb53fa0cabcb8fddf8142975ba38f2d7",
      },
    ],
    executableContributions: [
      {
        id: "managed-route",
        outputSlot: "web.route",
        namespace: "packages/core.crud/web/routes/",
        source: "templates/web/crud-route.tsx.tpl",
        target: "web/src/app/{{routeKey}}/page.tsx",
        parameterRefs: ["entityKey", "routeKey"],
        targetRuntimeInterfaceVersion: "factory.web-route/v1",
        orderingRequirements: ["database-schema"],
        mergeProtocol: "replace-file",
        digest:
          "sha256:0249329a78a7fc15eaf285892df9e6bb21b3ae04808d73316eae1b320bb0197c",
      },
      {
        id: "database-schema",
        outputSlot: "database.schema",
        namespace: "packages/core.crud/database/schema/",
        source: "templates/database/crud-schema.prisma.tpl",
        target: "database/prisma/fragments/{{entityKey}}.prisma",
        parameterRefs: ["entityKey"],
        targetRuntimeInterfaceVersion: "factory.prisma-schema/v1",
        orderingRequirements: [],
        mergeProtocol: "append-fragment",
        digest:
          "sha256:b8a6d2392a3f881f6f742e6e2fa1bb2ff30966b3cc345221f186ad9a685f9b90",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
