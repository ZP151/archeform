import type {
  TransactionDependenciesV2,
  TransactionOperationAdapterV2,
  TransactionResultV2,
  TransactionStoreV2,
} from "./commerce-transaction-executor.js";

export type CommerceOrderTransactionRequestV2 = Readonly<{
  orderId: string;
  expectedVersion: number;
  expectedState: string;
  event: "submit" | "confirm" | "cancel" | "fulfill";
  idempotencyKey: string;
  payloadDigest: string;
}>;

export type CommerceOrderTransactionContextV2 = Readonly<{
  orderId: string;
  event: CommerceOrderTransactionRequestV2["event"];
}>;

export type CommerceOrderOperationStoreDependenciesV2 =
  TransactionDependenciesV2 & {
    readonly operationStore: TransactionStoreV2;
  };

export type OrderTransitionReceipt =
  | Readonly<{
      kind: "completed";
      receiptId: string;
      replayed: boolean;
      orderId: string;
      transition: string;
    }>
  | Readonly<{
      kind: "in-progress";
      receiptId: string;
      replayed: false;
      orderId: string;
      transition: string;
      retryAfterMs: number;
    }>;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Order transition must be an object.");
  }
  const recordValue = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "orderId",
    "expectedVersion",
    "expectedState",
    "event",
    "idempotencyKey",
    "payloadDigest",
  ]);
  if (Object.keys(recordValue).some((key) => !allowedKeys.has(key))) {
    throw new Error("Order transition contains undeclared fields.");
  }
  return recordValue;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || !candidate.trim()) {
    throw new Error(`Order transition requires '${key}'.`);
  }
  return candidate;
}

export const commerceOrderTransactionOperationAdapter: TransactionOperationAdapterV2<
  CommerceOrderTransactionRequestV2,
  CommerceOrderTransactionContextV2,
  OrderTransitionReceipt
> = {
  parseRequest(input) {
    const value = record(input);
    const event = requiredString(value, "event");
    if (!( ["submit", "confirm", "cancel", "fulfill"] as const).includes(event as never)) {
      throw new Error("Order transition is not declared.");
    }
    const expectedVersion = value.expectedVersion;
    if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
      throw new Error("Order transition requires a non-negative expected version.");
    }
    const payloadDigest = requiredString(value, "payloadDigest");
    if (!/^sha256:[a-f0-9]+$/.test(payloadDigest)) {
      throw new Error("Order transition requires a SHA-256 payload digest.");
    }
    return Object.freeze({
      orderId: requiredString(value, "orderId"),
      expectedVersion: expectedVersion as number,
      expectedState: requiredString(value, "expectedState"),
      event: event as CommerceOrderTransactionRequestV2["event"],
      idempotencyKey: requiredString(value, "idempotencyKey"),
      payloadDigest,
    });
  },
  prepare(request) {
    return Object.freeze({
      command: Object.freeze({
        flowId: "{{orderFlow}}",
        event: request.event,
        aggregate: Object.freeze({
          entity: "{{orderEntity}}",
          id: request.orderId,
          expectedVersion: request.expectedVersion,
          expectedState: request.expectedState,
        }),
        idempotency: Object.freeze({
          scope: `order:${request.orderId}`,
          key: request.idempotencyKey,
          payloadDigest: request.payloadDigest,
        }),
      }),
      context: Object.freeze({ orderId: request.orderId, event: request.event }),
    });
  },
  createStore(_context, dependencies) {
    const candidate = dependencies as CommerceOrderOperationStoreDependenciesV2;
    if (!candidate.operationStore) {
      throw new Error("Order transaction Store is unavailable.");
    }
    return candidate.operationStore;
  },
  present(result: TransactionResultV2, context) {
    if (result.kind === "in-progress") {
      return Object.freeze({
        kind: "in-progress",
        receiptId: result.receiptId,
        replayed: false,
        orderId: context.orderId,
        transition: context.event,
        retryAfterMs: result.retryAfterMs,
      });
    }
    return Object.freeze({
      kind: "completed",
      receiptId: result.receiptId,
      replayed: result.replayed,
      orderId: context.orderId,
      transition: context.event,
    });
  },
};
