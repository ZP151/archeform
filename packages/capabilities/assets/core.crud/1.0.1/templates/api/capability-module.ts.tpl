import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  recordHandler: {
    create: async ({ store, entityKey, input }) => store.create(entityKey, input),
    list: async ({ store, entityKey }) => store.list(entityKey),
  },
} satisfies CapabilityRuntimeModule;
