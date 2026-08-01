import {
  removeAuditPermissions,
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const auditAssetV1_0_2: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.audit",
    version: "1.0.2",
    category: "core",
    name: "Audit trail",
    description:
      "Records actor, action, subject, and immutable timestamp evidence.",
    packageRoot: "packages/capabilities/assets/core.audit/1.0.2",
    manifestDigest:
      "sha256:e3b0137460e6c1b2a156b97a972623db656ce294c54c8913b4c3c43155828e7a",
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
          "sha256:00295cb26b710cad5cb4af026fff5d55836f26381be6ccc74cf1444a6867f7b6",
      },
    ],
    parameters: [{ key: "actorRole", type: "graph-symbol", required: true }],
    provides: [{ interfaceKey: "audit.event", version: "v1" }],
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
