import { describe, expect, it } from "vitest";

import { commerceOrderTransactionOperationAdapter } from "../../src/capabilities/commerce-order-transaction-operation-adapter.js";

describe("commerce order transaction operation", () => {
  it("prepares only a declared order transition", () => {
    const request = commerceOrderTransactionOperationAdapter.parseRequest({
      orderId: "order-1",
      expectedVersion: 0,
      transition: "submit",
      idempotencyKey: "submit-1",
      payloadDigest: "sha256:order-1",
    });
    expect(commerceOrderTransactionOperationAdapter.prepare(request).command.aggregate.entity).toBe("{{orderEntity}}");
  });
});
