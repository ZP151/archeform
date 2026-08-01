import type { CapabilityAssetV1 } from "../contract.js";

export const orderAssetV2_1_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.order",
    version: "2.1.0",
    category: "commerce",
    name: "Generic order lifecycle for Transaction Command V2",
    description:
      "Creates authorized persisted orders and adapts bounded order events to the exact Transaction Command V2 contract.",
    packageRoot: "packages/capabilities/assets/commerce.order/2.1.0",
    manifestDigest:
      "sha256:f4eb93a5d11961333c9665c7c3ba614101679bff9366360628dd2b3840b35a97",
    lifecycle: "golden",
    profiles: ["simple-ecommerce", "retail-counter", "grocery-pickup"],
    effects: ["order.create", "order.transition"],
    inputSchema: [
      { key: "orderEntity", type: "domain.entity", required: true },
      { key: "orderFlow", type: "flow.flow", required: true },
      { key: "customerRole", type: "policy.role", required: true },
    ],
    outputSlots: ["api.runtime", "test.journey"],
    runtimeHandlers: ["order"],
    templates: [],
    parameters: [
      { key: "orderEntity", type: "graph-symbol", required: true },
      { key: "orderFlow", type: "graph-symbol", required: true },
      { key: "customerRole", type: "graph-symbol", required: true },
    ],
    executableContributions: [
      {
        id: "commerce-order-create-handler",
        outputSlot: "api.runtime",
        namespace: "packages/commerce.order/api/runtime/",
        source: "templates/api/commerce-order-create-handler.ts.tpl",
        target: "api/src/capabilities/commerce-order-create-handler.ts",
        parameterRefs: ["orderEntity", "orderFlow", "customerRole"],
        targetRuntimeInterfaceVersion: "factory.order-create-handler/v1",
        orderingRequirements: [],
        mergeProtocol: "replace-file",
        digest:
          "sha256:14f8d5f58ef89945dbb32d80035e1c673bdea57225710f0fa5d2059a142eab1b",
      },
      {
        id: "commerce-order-transaction-operation-adapter",
        outputSlot: "api.runtime",
        namespace: "packages/commerce.order/api/runtime/",
        source:
          "templates/api/commerce-order-transaction-operation-adapter.ts.tpl",
        target:
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
        parameterRefs: ["orderEntity", "orderFlow", "customerRole"],
        targetRuntimeInterfaceVersion:
          "factory.transaction-operation-adapter/v2",
        orderingRequirements: ["commerce-order-create-handler"],
        mergeProtocol: "replace-file",
        digest:
          "sha256:b522e47a9b38866bb9339b5205050bd80c07b3e65838fd7df21aa1e7a101953d",
      },
      {
        id: "commerce-order-lifecycle-journey",
        outputSlot: "test.journey",
        namespace: "packages/commerce.order/test/journeys/",
        source: "templates/test/commerce-order-lifecycle.journey.ts.tpl",
        target: "api/test/journeys/commerce-order-lifecycle.journey.ts",
        parameterRefs: ["orderEntity", "orderFlow", "customerRole"],
        targetRuntimeInterfaceVersion: "factory.journey/v1",
        orderingRequirements: [
          "commerce-order-create-handler",
          "commerce-order-transaction-operation-adapter",
        ],
        mergeProtocol: "replace-file",
        digest:
          "sha256:91400ed48f14d74e0f6671c41ab144fc53d083ea7f4c347af9cb13c8813583f5",
      },
    ],
    provides: [
      { interfaceKey: "commerce.order-event", version: "v1" },
      { interfaceKey: "factory.order-create-handler", version: "v1" },
      {
        interfaceKey: "factory.transaction-operation-adapter",
        version: "v2",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:f70c44f81a20009155019eb9b6097208baafcdbeeb67aba8a0de763128e498fb",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:3f8fb8d77f3254dadc235ca09713b284c3aed439fecb67b549be63b1c28a0981",
      status: "verified",
    },
  },
};
