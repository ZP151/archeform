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
    if (!["reserve", "release", "decrement"].includes(operation)) {
      throw new Error(`Unsupported inventory operation '${operation}'.`);
    }
    if (operation === "decrement") return;

    const items = await store.listCartItems(entityKey, recordId);
    if (items.length === 0) {
      throw new Error(`Cannot ${operation} inventory for an empty cart '${recordId}'.`);
    }
    const delta = operation === "reserve" ? -1 : 1;
    const applied: typeof items = [];
    try {
      for (const item of items) {
        await store.adjustInventory(
          item.catalogEntity,
          item.catalogRecordId,
          "{{stockField}}",
          delta * item.quantity,
        );
        applied.push(item);
      }
    } catch (error) {
      for (const item of applied.reverse()) {
        await store.adjustInventory(
          item.catalogEntity,
          item.catalogRecordId,
          "{{stockField}}",
          -delta * item.quantity,
        );
      }
      throw error;
    }
  },
};
