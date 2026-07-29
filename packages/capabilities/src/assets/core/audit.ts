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
      "sha256:a04575f365a2218de74f2aeb571d4e0db1311492a6e2fbb408f9633aec75902b",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["audit.record"],
    inputSchema: [{ key: "retention", type: "duration", required: false }],
    outputSlots: ["api.runtime", "policy.rule", "test.fixture", "flow.effect"],
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
