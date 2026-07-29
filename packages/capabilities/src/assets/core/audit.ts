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
      "sha256:6eab1ec3580703b32f236b9ba6c191318a442acb7b70b8550aa51370444526a8",
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
          "sha256:883eb54bad1d3a0e9da7542e8a342231f3d1ab8f7d9e4824d9aacb530268447f",
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
