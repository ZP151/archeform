import { describe, expect, it } from "vitest";

import { commerceOrderCreateHandler } from "../../src/capabilities/commerce-order-create-handler.js";
import { commerceOrderTransactionOperationAdapter } from "../../src/capabilities/commerce-order-transaction-operation-adapter.js";

describe("commerce order lifecycle", () => {
  it("creates a validated initial draft before preparing a transition", () => {
    const draft = commerceOrderCreateHandler.create(
      commerceOrderCreateHandler.parseRequest({ orderId: "order-1" }),
    );
    expect(draft).toEqual({ id: "order-1", status: "draft", version: 0 });
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
