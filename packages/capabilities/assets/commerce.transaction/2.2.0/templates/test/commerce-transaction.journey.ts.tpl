import { describe, expect, it } from "vitest";

import type {
  TransactionCommandV2,
  TransactionOperationAdapterV2,
} from "../../src/capabilities/commerce-transaction-executor.js";

describe("commerce transaction V2 operation adapter journey", () => {
  it("keeps Flow identity separate from the event", () => {
    const command: TransactionCommandV2 = {
      flowId: "{{transactionFlow}}",
      event: "submit",
      aggregate: {
        entity: "{{aggregateEntity}}",
        id: "demo",
        expectedVersion: 0,
        expectedState: "cart",
      },
      idempotency: {
        scope: "{{aggregateEntity}}:demo",
        key: "submit-001",
        payloadDigest: "sha256:demo",
      },
    };
    expect(command).toMatchObject({
      flowId: "{{transactionFlow}}",
      event: "submit",
    });
    expect<
      undefined | TransactionOperationAdapterV2<unknown, unknown, unknown>
    >(undefined).toBeUndefined();
  });
});
