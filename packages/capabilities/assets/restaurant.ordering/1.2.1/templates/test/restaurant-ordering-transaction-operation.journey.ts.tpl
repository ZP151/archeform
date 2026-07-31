import { describe, expect, it } from "vitest";

import { restaurantOrderingTransactionOperationAdapter } from "../../src/capabilities/restaurant-ordering-transaction-operation-adapter.js";

describe("restaurant transaction operation", () => {
  it("rejects an untyped table session", () => {
    expect(() => restaurantOrderingTransactionOperationAdapter.parseRequest({ lines: [] })).toThrow("table session");
  });
});

