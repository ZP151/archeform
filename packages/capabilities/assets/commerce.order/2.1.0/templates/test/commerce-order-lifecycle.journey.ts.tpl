import { describe, expect, it } from "vitest";

import { commerceOrderCreateHandler } from "../../src/capabilities/commerce-order-create-handler.js";
import { commerceOrderTransactionOperationAdapter } from "../../src/capabilities/commerce-order-transaction-operation-adapter.js";

describe("commerce order Transaction Command V2 lifecycle", () => {
  it("authorizes creation and prepares separate Flow and event fields", async () => {
    const draft = await commerceOrderCreateHandler.create(
      {
        role: "{{customerRole}}",
        entityKey: "{{orderEntity}}",
        input: { note: "ok" },
      },
      {
        authorizer: { assertCreateAllowed: async () => undefined },
        store: {
          createInitial: async () => ({
            id: "server-1",
            status: "cart",
            version: 0,
          }),
        },
      },
    );
    const prepared = commerceOrderTransactionOperationAdapter.prepare(
      commerceOrderTransactionOperationAdapter.parseRequest({
        orderId: draft.id,
        expectedVersion: draft.version,
        expectedState: draft.status,
        event: "submit",
        idempotencyKey: "submit-1",
        payloadDigest:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    );
    expect(prepared.command).toMatchObject({
      flowId: "{{orderFlow}}",
      event: "submit",
      aggregate: { entity: "{{orderEntity}}" },
    });
  });
});
