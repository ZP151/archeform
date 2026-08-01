import type { CapabilityAssetV1 } from "../contract.js";

export const orderAssetV2_1_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.order",
    version: "2.1.1",
    category: "commerce",
    name: "Bound-Flow generic order lifecycle for Transaction Command V2",
    description:
      "Creates authorized persisted orders and adapts only events declared by the exact Published order Flow to Transaction Command V2.",
    packageRoot: "packages/capabilities/assets/commerce.order/2.1.1",
    manifestDigest:
      "sha256:c35159b0459dc74443ae19d5fa2ef2813bf177cd379b0e7101e56bfe1cda1fc1",
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
          "sha256:d4d818637d8b19eb2658d83a933c61c29ae03457dae688db5dfd23dc09cc1fcc",
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
          "sha256:6131de967f863c7576b385d833ecb0ed0ae61b1b48c3f97d534d7858e4cbfb8e",
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
        "sha256:b7509e39c22090c8f97de5a9530a760604a18d5c2ad2c870978e6b90824dac2f",
      status: "verified",
    },
  },
};
