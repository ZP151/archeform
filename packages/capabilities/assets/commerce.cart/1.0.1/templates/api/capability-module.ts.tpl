import type { CapabilityRuntimeModule } from "./contract.js";

export const capabilityModule: CapabilityRuntimeModule & {
  readonly version: string;
  readonly applicationId: string;
} = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  cartHandler: {
    add: async ({
      role,
      orderEntity,
      orderRecordId,
      catalogEntity,
      catalogRecordId,
      quantity,
      store,
      assertAllowed,
    }) => {
      await assertAllowed(role, orderEntity, "create");
      await assertAllowed(role, catalogEntity, "read");
      const order = await store.find(orderEntity, orderRecordId);
      if (!order) throw new Error(`Cart '${orderRecordId}' was not found.`);
      if (order.status !== "cart") {
        throw new Error(`Order '${orderRecordId}' is not an active cart.`);
      }
      const catalogRecord = await store.find(catalogEntity, catalogRecordId);
      if (!catalogRecord) {
        throw new Error(`Catalog record '${catalogRecordId}' was not found.`);
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Cart quantity must be a positive integer.");
      }
      return store.addCartItem({
        actor: role,
        orderEntity,
        orderRecordId,
        catalogEntity,
        catalogRecordId,
        quantity,
      });
    },
    list: async ({
      role,
      orderEntity,
      orderRecordId,
      store,
      assertAllowed,
    }) => {
      await assertAllowed(role, orderEntity, "read");
      return store.listCartItems(orderEntity, orderRecordId);
    },
  },
};
