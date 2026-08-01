// core.audit v1.0.2
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
    await store.appendAudit({
      actor: role,
      action: operation,
      entity: entityKey,
      recordId,
      at: now,
    });
  },
};
