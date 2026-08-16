import {
  removeCapabilityOperations,
  type CapabilityAssetV1,
} from "../contract.js";

export const filesMediaAssetV1_0_0: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    bindingContract: "factory.capability-binding/v1",
    key: "core.files-media",
    version: "1.0.0",
    category: "core",
    name: "Files and media",
    description:
      "Registers file and media references against an owning domain entity.",
    packageRoot: "packages/capabilities/assets/core.files-media/1.0.0",
    manifestDigest:
      "sha256:5c4fbf964825b8504efc91c965b68e63eb6c7e139201d333d806989f16d2e249",
    lifecycle: "golden",
    profiles: [],
    effects: ["files.media.register"],
    inputSchema: [
      { key: "mediaEntity", type: "domain.entity", required: true },
      {
        key: "fileField",
        type: "domain.field",
        required: true,
        ownerBinding: "mediaEntity",
        fieldTypes: ["string", "url"],
      },
    ],
    outputSlots: ["api.runtime", "flow.effect"],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.files-media.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:f1611f5a2f48b0ccccbcb6e1842ace9edf5440e8bccd7b9a19552498cd5f2a87",
      },
    ],
    parameters: [
      { key: "mediaEntity", type: "graph-symbol", required: true },
      { key: "fileField", type: "graph-symbol", required: true },
    ],
    provides: [{ interfaceKey: "files.media", version: "v1" }],
    verification: {
      fixture: "fixtures/default.json",
      fixtureDigest:
        "sha256:4098e8d30b623e735c584140580690ff00e84397b53f3fda228ee187fc695422",
      contractTest: "tests/contract.json",
      contractTestDigest:
        "sha256:5450abdaf2bbf487d8a92ce272b3890c36dd7a29a5654005dde09464923733e5",
      status: "verified",
    },
  },
  disable(graph) {
    removeCapabilityOperations(graph, ["files.media.register"]);
  },
};
