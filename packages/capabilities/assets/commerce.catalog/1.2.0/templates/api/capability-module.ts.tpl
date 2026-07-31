import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule: CapabilityRuntimeModule & {
  readonly version: string;
  readonly applicationId: string;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  catalogHandler: {
    list: async ({ role, entityKey, store, assertAllowed }) => {
      await assertAllowed(role, entityKey, "read");
      return store.list(entityKey);
    },
    read: async ({ role, entityKey, recordId, store, assertAllowed }) => {
      await assertAllowed(role, entityKey, "read");
      const record = await store.find(entityKey, recordId);
      if (!record) throw new Error(`Catalog record '${recordId}' was not found.`);
      return record;
    },
  },
};
