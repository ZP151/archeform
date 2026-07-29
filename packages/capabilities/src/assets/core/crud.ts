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
      "sha256:22225b5eab4d86d135469e6f93805e90ba4a1f16b47250ac8ea406a8989ed956",
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
    verification: {
      fixture: "fixtures/default.json",
      contractTest: "tests/contract.json",
      status: "verified",
    },
  },
};
