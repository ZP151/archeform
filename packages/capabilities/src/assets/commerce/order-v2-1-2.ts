import type { CapabilityAssetV1 } from "../contract.js";

export const orderAssetV2_1_2: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "commerce.order",
    version: "2.1.2",
    category: "commerce",
    name: "Strict-Type-safe bound-Flow generic order lifecycle for Transaction Command V2",
    description:
      "Creates authorized persisted orders and adapts only events declared by the exact Published order Flow through an explicitly typed frozen Transaction Command V2 boundary.",
    packageRoot: "packages/capabilities/assets/commerce.order/2.1.2",
    manifestDigest:
      "sha256:967f6311b4c94234773ee7090e538a5dd6795bb3cc7338b8fd738228e9bd78ce",
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
          "sha256:008b068d728f78a34e4562aaa025d81df64a9bd115c129f72f96f54340c1ac89",
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
        "sha256:be8bdb1605c48ae4c9d102f7b05a3291ae12fd9d76328a0396ee9b2319e01ef7",
      status: "verified",
    },
  },
};
