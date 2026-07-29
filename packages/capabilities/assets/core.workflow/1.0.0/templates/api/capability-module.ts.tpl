import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  workflowHandler: {
    applyTransition: async ({ store, entityKey, recordId, nextState }) =>
      store.update(entityKey, recordId, { status: nextState }),
  },
} satisfies CapabilityRuntimeModule;
