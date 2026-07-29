import {
  removeAuditPermissions,
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const auditAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.audit",
    version: "1.0.0",
    category: "core",
    name: "Audit trail",
    description:
      "Records actor, action, subject, and immutable timestamp evidence.",
    packageRoot: "packages/capabilities/assets/core.audit/1.0.0",
    manifestDigest:
      "sha256:fe69596d29f87db7e491eeb5c77160dc800669fbc49eb6572deaf2ecc65f55d3",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["audit.record"],
    inputSchema: [{ key: "retention", type: "duration", required: false }],
    outputSlots: ["api.runtime", "policy.rule", "test.fixture", "flow.effect"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.audit.ts",
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
    removeCapabilityOperations(graph, ["audit.record"]);
    removeAuditPermissions(graph);
  },
};
