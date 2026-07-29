import type { CapabilityAssetV1 } from "../contract.js";

export const workflowAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.workflow",
    version: "1.0.0",
    category: "core",
    name: "Workflow",
    description: "Runs declared state transitions, guards, and human tasks.",
    packageRoot: "packages/capabilities/assets/core.workflow/1.0.0",
    manifestDigest:
      "sha256:a10d674dcc62b220d76e0c702a5fb04d4d0cabfd3c9c6a018bff92341b25258e",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["flow.transition", "flow.assign-task"],
    inputSchema: [{ key: "flows", type: "flow.model", required: true }],
    outputSlots: ["api.runtime", "flow.effect", "test.fixture"],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
