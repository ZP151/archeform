import {
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const notificationAssetV1_0_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.notification",
    version: "1.0.1",
    category: "core",
    name: "Notifications",
    description: "Emits bounded in-app and provider-ready notification events.",
    packageRoot: "packages/capabilities/assets/core.notification/1.0.1",
    manifestDigest:
      "sha256:3df4c1c47c26f0d9ab5c7c770721079b83a1d1b8655052e3030455b45c4d2f4e",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["notification.send"],
    inputSchema: [
      { key: "template", type: "message.template", required: false },
    ],
    outputSlots: ["api.runtime", "test.fixture", "flow.effect"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.notification.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:b9a745255d242339486fff29d6f7abd3f751e36df3e348f896956a31c6b53266",
      },
    ],
    parameters: [
      { key: "recipientRole", type: "graph-symbol", required: true },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
  disable(graph) {
    removeCapabilityOperations(graph, ["notification.send"]);
  },
};
