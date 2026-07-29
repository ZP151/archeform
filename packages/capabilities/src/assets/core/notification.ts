import {
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const notificationAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.notification",
    version: "1.0.0",
    category: "core",
    name: "Notifications",
    description: "Emits bounded in-app and provider-ready notification events.",
    packageRoot: "packages/capabilities/assets/core.notification/1.0.0",
    manifestDigest:
      "sha256:25eaacb88682dffeb80340ad7dcdd0dc78a49dfcd1eaf1f2bd0a0618750a67b2",
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
          "sha256:8ced82a4c3db325ab13c454b081a3f81add5e8bb3f341d51474e04d69e42a06b",
      },
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
