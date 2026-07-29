import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule: CapabilityRuntimeModule & {
  readonly version: string;
  readonly applicationId: string;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  effectHandler: async ({ entityKey, recordId, operation, store }) => {
    if (operation !== "decrement") {
      throw new Error(`Unsupported inventory operation '${operation}'.`);
    }
    const items = await store.listCartItems(entityKey, recordId);
    if (items.length === 0) {
      throw new Error(`Cannot decrement inventory for an empty cart '${recordId}'.`);
    }
    for (const item of items) {
      await store.decrementInventory(
        item.catalogEntity,
        item.catalogRecordId,
        item.quantity,
      );
    }
  },
};
