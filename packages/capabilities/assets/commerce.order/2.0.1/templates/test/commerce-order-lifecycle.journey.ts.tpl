import { describe, expect, it } from "vitest";

import { commerceOrderCreateHandler } from "../../src/capabilities/commerce-order-create-handler.js";
import { commerceOrderTransactionOperationAdapter } from "../../src/capabilities/commerce-order-transaction-operation-adapter.js";

describe("commerce order lifecycle", () => {
  it("authorizes a persisted initial order before preparing a transition", async () => {
    const draft = await commerceOrderCreateHandler.create(
      { role: "{{customerRole}}", entityKey: "{{orderEntity}}", input: { note: "ok" } },
      {
        authorizer: { assertCreateAllowed: async () => undefined },
        store: { createInitial: async () => ({ id: "server-1", status: "draft", version: 0 }) },
      },
    );
    expect(draft).toEqual({ id: "server-1", status: "draft", version: 0 });
    expect(
      commerceOrderTransactionOperationAdapter.prepare(
        commerceOrderTransactionOperationAdapter.parseRequest({
          orderId: draft.id,
          expectedVersion: draft.version,
          transition: "submit",
          idempotencyKey: "submit-1",
          payloadDigest: "sha256:order-1",
        }),
      ).command.aggregate.entity,
    ).toBe("{{orderEntity}}");
  });
});
