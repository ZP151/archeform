export type OrderOperationCommand =
  | "hold"
  | "release-hold"
  | "amend"
  | "cancel"
  | "record-partial-payment"
  | "capture-payment"
  | "refund";

export type OrderOperationPlan = {
  readonly nextState: string;
  readonly paymentDelta: string;
  readonly inventoryEffect: "reserve" | "release" | "none";
  readonly auditAction: string;
};

const merchantCommands = new Set<OrderOperationCommand>([
  "hold",
  "release-hold",
  "cancel",
  "record-partial-payment",
  "capture-payment",
  "refund",
]);

export function planOrderOperation(input: {
  readonly command: OrderOperationCommand;
  readonly currentState: string;
  readonly actorRole: string;
}): OrderOperationPlan {
  if (!input.command || !input.currentState || !input.actorRole) {
    throw new Error("Order operation input is invalid.");
  }
  if (merchantCommands.has(input.command) && !["merchant", "manager"].includes(input.actorRole)) {
    throw new Error("Order operation is not authorised for this role.");
  }
  if (input.command === "hold" && input.currentState === "submitted") {
    return { nextState: "held", paymentDelta: "none", inventoryEffect: "reserve", auditAction: "order.held" };
  }
  if (input.command === "release-hold" && input.currentState === "held") {
    return { nextState: "submitted", paymentDelta: "none", inventoryEffect: "release", auditAction: "order.hold-released" };
  }
  if (input.command === "amend" && ["cart", "submitted", "held", "payment-pending"].includes(input.currentState)) {
    return { nextState: input.currentState, paymentDelta: "none", inventoryEffect: "none", auditAction: "order.amended" };
  }
  if (input.command === "cancel" && ["submitted", "held", "payment-pending", "paid"].includes(input.currentState)) {
    return { nextState: "cancelled", paymentDelta: input.currentState === "paid" ? "refund-full" : "none", inventoryEffect: input.currentState === "paid" ? "none" : "release", auditAction: "order.cancelled" };
  }
  if (input.command === "record-partial-payment" && ["submitted", "payment-pending"].includes(input.currentState)) {
    return { nextState: "payment-pending", paymentDelta: "capture-partial", inventoryEffect: "none", auditAction: "order.payment.partially-recorded" };
  }
  if (input.command === "capture-payment" && ["submitted", "payment-pending"].includes(input.currentState)) {
    return { nextState: "paid", paymentDelta: "capture-final", inventoryEffect: "none", auditAction: "order.payment.captured" };
  }
  if (input.command === "refund" && ["paid", "fulfilled", "cancelled"].includes(input.currentState)) {
    return { nextState: input.currentState, paymentDelta: "refund-partial", inventoryEffect: "none", auditAction: "order.refunded" };
  }
  throw new Error(`Order operation '${input.command}' is invalid for '${input.currentState}'.`);
}

export const capabilityModule = {
  key: "{{asset.key}}",
  version: "{{asset.version}}",
  applicationId: "{{graph.metadata.id}}",
  effects: {{asset.effectsJson}},
  orderOperationsHandler: { plan: planOrderOperation },
};
