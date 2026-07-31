import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule: CapabilityRuntimeModule & {
  readonly version: string;
  readonly applicationId: string;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  orderHandler: {
    create: async ({ role, entityKey, input, store, assertAllowed }) => {
      await assertAllowed(role, entityKey, "create");
      return store.create(entityKey, input);
    },
    transition: async ({
      role,
      entityKey,
      recordId,
      nextState,
      expectedVersion,
      idempotencyKey,
      store,
      assertAllowed,
    }) => {
      await assertAllowed(role, entityKey, "update");
      if (!idempotencyKey) throw new Error("Order transition requires an idempotency key.");
      const record = await store.find(entityKey, recordId);
      if (!record) throw new Error(`Order '${recordId}' was not found.`);
      if (record.version !== expectedVersion) throw new Error(`Order '${recordId}' has a stale version.`);
      return store.update(entityKey, recordId, {
        status: nextState,
        version: expectedVersion + 1,
      });
    },
  },
};
