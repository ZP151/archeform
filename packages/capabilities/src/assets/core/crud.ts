import type { CapabilityAssetV1 } from "../contract.js";

export const crudAsset: CapabilityAssetV1 = {
  manifest: {
    apiVersion: "factory.capability/v1",
    key: "core.crud",
    version: "1.0.0",
    category: "core",
    name: "Managed records",
    description:
      "Creates, reads, updates, and deletes validated domain records.",
    packageRoot: "packages/capabilities/assets/core.crud/1.0.0",
    manifestDigest:
      "sha256:a5ccea32f8afd153bbc94fe3cbd240e0440441f9e3cb0c2b1b720ef4d151e936",
    lifecycle: "golden",
    profiles: ["expense-approval", "restaurant-ordering", "simple-ecommerce"],
    effects: ["data.create", "data.read", "data.update", "data.delete"],
    inputSchema: [{ key: "entities", type: "domain.entities", required: true }],
    outputSlots: [
      "api.runtime",
      "database.schema",
      "page.block",
      "test.fixture",
    ],
    templates: [
      {
        id: "api-capability-module",
        source: "templates/api/capability-module.ts.tpl",
        target: "api/src/capabilities/core.crud.ts",
        outputSlot: "api.runtime",
        digest:
          "sha256:5e1bcc06560ccdd1062c786618a883de6df9234d2134c89361b3adaab0700955",
      },
    ],
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
