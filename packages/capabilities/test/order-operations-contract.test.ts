import { describe, expect, it } from "vitest";

import {
  parseCommerceOrderCommand,
  planCommerceOrderOperation,
  type CommerceOrderCommandV1,
  type CommerceOrderStateV1,
} from "../src/index.js";

const paidOrder: CommerceOrderStateV1 = {
  orderId: "order-1",
  version: 4,
  status: "paid",
  payment: { due: "24.00", captured: "24.00", refunded: "0.00" },
  processedIdempotencyKeys: [],
};

const submittedOrder: CommerceOrderStateV1 = {
  orderId: "order-1",
  version: 2,
  status: "submitted",
  payment: { due: "24.00", captured: "0.00", refunded: "0.00" },
  processedIdempotencyKeys: [],
};

describe("Commerce order operations", () => {
  it("plans an authorised paid-order cancellation as refund plus audit", () => {
    expect(
      planCommerceOrderOperation(paidOrder, {
        command: "cancel",
        orderId: "order-1",
        expectedVersion: 4,
        idempotencyKey: "cancel-1",
        actorRole: "manager",
        reason: "duplicate order",
      }),
    ).toEqual({
      nextState: "cancelled",
      incrementVersion: true,
      paymentDelta: "refund-full",
      inventoryEffect: "none",
      auditAction: "order.cancelled",
    });
  });

  it("plans holds, partial capture, final capture, and a partial refund", () => {
    expect(
      planCommerceOrderOperation(submittedOrder, {
        command: "hold",
        orderId: "order-1",
        expectedVersion: 2,
        idempotencyKey: "hold-1",
        actorRole: "merchant",
      }),
    ).toMatchObject({
      nextState: "held",
      inventoryEffect: "reserve",
      auditAction: "order.held",
    });
    expect(
      planCommerceOrderOperation(submittedOrder, {
        command: "record-partial-payment",
        orderId: "order-1",
        expectedVersion: 2,
        idempotencyKey: "payment-1",
        actorRole: "merchant",
        amount: "8.00",
      }),
    ).toMatchObject({
      nextState: "payment-pending",
      paymentDelta: "capture-partial",
      auditAction: "order.payment.partially-recorded",
    });
    expect(
      planCommerceOrderOperation(
        {
          ...submittedOrder,
          version: 3,
          status: "payment-pending",
          payment: { due: "24.00", captured: "8.00", refunded: "0.00" },
        },
        {
          command: "capture-payment",
          orderId: "order-1",
          expectedVersion: 3,
          idempotencyKey: "payment-2",
          actorRole: "merchant",
          amount: "16.00",
        },
      ),
    ).toMatchObject({
      nextState: "paid",
      paymentDelta: "capture-final",
      auditAction: "order.payment.captured",
    });
    expect(
      planCommerceOrderOperation(paidOrder, {
        command: "refund",
        orderId: "order-1",
        expectedVersion: 4,
        idempotencyKey: "refund-1",
        actorRole: "manager",
        amount: "4.00",
        reason: "item unavailable",
      }),
    ).toMatchObject({
      nextState: "paid",
      paymentDelta: "refund-partial",
      auditAction: "order.refunded",
    });
  });

  it("rejects stale, terminal, overpayment, duplicate, and unauthorised commands", () => {
    const capture: CommerceOrderCommandV1 = {
      command: "capture-payment",
      orderId: "order-1",
      expectedVersion: 3,
      idempotencyKey: "capture-1",
      actorRole: "merchant",
      amount: "24.00",
    };

    expect(() => planCommerceOrderOperation(paidOrder, capture)).toThrow(
      "stale",
    );
    expect(() =>
      planCommerceOrderOperation(
        { ...paidOrder, status: "fulfilled" },
        {
          command: "amend",
          orderId: "order-1",
          expectedVersion: 4,
          idempotencyKey: "amend-1",
          actorRole: "merchant",
          reason: "change quantity",
        },
      ),
    ).toThrow("cannot amend");
    expect(() =>
      planCommerceOrderOperation(submittedOrder, {
        ...capture,
        expectedVersion: 2,
        amount: "24.01",
      }),
    ).toThrow("exceeds");
    expect(() =>
      planCommerceOrderOperation(
        { ...submittedOrder, processedIdempotencyKeys: ["hold-1"] },
        {
          command: "hold",
          orderId: "order-1",
          expectedVersion: 2,
          idempotencyKey: "hold-1",
          actorRole: "merchant",
        },
      ),
    ).toThrow("already processed");
    expect(() =>
      planCommerceOrderOperation(submittedOrder, {
        command: "cancel",
        orderId: "order-1",
        expectedVersion: 2,
        idempotencyKey: "cancel-1",
        actorRole: "customer",
        reason: "changed mind",
      }),
    ).toThrow("not authorised");
  });

  it.each(["url", "source", "template", "provider", "graph"])(
    "rejects a %s-shaped command field",
    (field) => {
      expect(() =>
        parseCommerceOrderCommand({
          command: "hold",
          orderId: "order-1",
          expectedVersion: 2,
          idempotencyKey: "hold-1",
          actorRole: "merchant",
          [field]: "x",
        }),
      ).toThrow("Commerce order command is invalid.");
    },
  );

  it("returns the same plan for equivalent command values", () => {
    const command: CommerceOrderCommandV1 = {
      command: "release-hold",
      orderId: "order-1",
      expectedVersion: 3,
      idempotencyKey: "release-1",
      actorRole: "merchant",
    };
    const heldOrder: CommerceOrderStateV1 = {
      ...submittedOrder,
      version: 3,
      status: "held",
    };

    expect(planCommerceOrderOperation(heldOrder, command)).toEqual(
      planCommerceOrderOperation(
        structuredClone(heldOrder),
        structuredClone(command),
      ),
    );
  });
});
