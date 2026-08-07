import {
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const notificationAssetV1_1_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "core.notification",
    version: "1.1.1",
    category: "core",
    name: "Notifications",
    description:
      "Persists durable notification intents with declared templates for deterministic local delivery.",
    packageRoot: "packages/capabilities/assets/core.notification/1.1.1",
    manifestDigest:
      "sha256:207eaa0fd719013129ba84bd8f66f82219b619ee1f5c9e2d4e3d896c339e6132",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["notification.send"],
    inputSchema: [
      { key: "recipientRole", type: "policy.role", required: true },
      { key: "template", type: "message.template", required: false },
    ],
    outputSlots: [
      "api.runtime",
      "api.persistence",
      "api.worker",
      "test.fixture",
      "flow.effect",
    ],
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
      {
        key: "template",
        type: "enum",
        required: false,
        values: ["expense.approval-outcome", "ecommerce.order-outcome"],
      },
    ],
    provides: [{ interfaceKey: "notification.outbox", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:60466a2c1fb5d4dba4900ecbc38d9ae5a79c106c5edd35a160fae3a690875d4e",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:494d52acbf679f22246a7979f0436c0b3dcb65d0ca4f4e85b728b25166462cd9",
      status: "verified",
    },
  },
  disable(graph) {
    removeCapabilityOperations(graph, ["notification.send"]);
  },
};
