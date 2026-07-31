import { describe, expect, it } from "vitest";

import type {
  CommerceTransactionCommandV1,
  TransactionOperationAdapterV1,
} from "../../src/capabilities/commerce-transaction-executor.js";

describe("commerce transaction operation adapter journey", () => {
  it("keeps a typed command boundary", () => {
    const command: CommerceTransactionCommandV1 = {
      scope: "{{aggregateEntity}}:demo",
      idempotencyKey: "submit-001",
      payloadDigest: "sha256:demo",
      aggregate: { entity: "{{aggregateEntity}}", id: "demo", expectedVersion: 0 },
      transition: "{{transactionFlow}}",
    };
    expect(command.aggregate.entity).toBe("{{aggregateEntity}}");
    expect<undefined | TransactionOperationAdapterV1<unknown, unknown, unknown>>(undefined).toBeUndefined();
  });
});
