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
      "sha256:a16fc83805e0e6b2468b93241374f790ac23b024cee1e8b4a1d54020b93fbd75",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["flow.transition", "flow.assign-task"],
    inputSchema: [{ key: "flows", type: "flow.model", required: true }],
    outputSlots: ["api.runtime", "flow.effect", "test.fixture"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.workflow.ts",
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
};
