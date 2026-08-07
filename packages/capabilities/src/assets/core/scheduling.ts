import {
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const schedulingAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "core.scheduling",
    version: "1.0.0",
    category: "core",
    name: "Scheduling",
    description:
      "Plans a deterministic schedule slot against a domain entity datetime field.",
    packageRoot: "packages/capabilities/assets/core.scheduling/1.0.0",
    manifestDigest:
      "sha256:26b31d8dfefb61c9c5446c3c1e87c5bfd5688b3bb0897a31d422f4d74ef61f44",
    lifecycle: "golden",
    profiles: [],
    effects: ["schedule.plan"],
    inputSchema: [
      { key: "scheduleEntity", type: "domain.entity", required: true },
      {
        key: "scheduleField",
        type: "domain.field",
        required: true,
        ownerBinding: "scheduleEntity",
        fieldTypes: ["datetime"],
      },
    ],
    outputSlots: ["api.runtime", "flow.effect"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.scheduling.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:783d5ed9bfae85dde6fc08d015a44027dd4c9f66be3613abcaaa8dfdea6e44d5",
      },
    ],
    parameters: [
      { key: "scheduleEntity", type: "graph-symbol", required: true },
      { key: "scheduleField", type: "graph-symbol", required: true },
    ],
    provides: [{ interfaceKey: "schedule.plan", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
  disable(graph) {
    removeCapabilityOperations(graph, ["schedule.plan"]);
  },
};
