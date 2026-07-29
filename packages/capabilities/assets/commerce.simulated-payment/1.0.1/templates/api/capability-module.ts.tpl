import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule: CapabilityRuntimeModule & {
  readonly version: string;
  readonly applicationId: string;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  effectHandler: async ({ role, entityKey, recordId, operation, store, now }) => {
    await store.appendCapabilityEvent({
      actor: role,
      capability: "payment.simulate",
      operation,
      entity: entityKey,
      recordId,
      outcome: "completed",
      at: now,
    });
  },
};
