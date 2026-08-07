import type { CapabilityAssetV1 } from "../contract.js";

export const workflowAssetV1_0_1: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "core.workflow",
    version: "1.0.1",
    category: "core",
    name: "Workflow",
    description: "Runs declared state transitions, guards, and human tasks.",
    packageRoot: "packages/capabilities/assets/core.workflow/1.0.1",
    manifestDigest:
      "sha256:f6a10ca009bbb14952c2a6767458582ade9b526376e476c39927edde546a7a7e",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["flow.transition", "flow.assign-task"],
    inputSchema: [{ key: "flowKey", type: "flow.flow", required: true }],
    outputSlots: ["api.runtime", "flow.effect", "test.fixture"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.workflow.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:209d5d649840437f334ac53aa593634c9cdb8fbfe5cc7525ed96f80ac91947bb",
      },
    ],
    parameters: [{ key: "flowKey", type: "graph-symbol", required: true }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
