import type {
  CommerceTransactionResultV1,
  CommerceTransactionStoreV1,
  TransactionDependenciesV1,
  TransactionOperationAdapterV1,
} from "./commerce-transaction-executor.js";

export type CommerceOrderTransactionRequestV1 = Readonly<{
  readonly orderId: string;
  readonly expectedVersion: number;
  readonly transition: "submit" | "confirm" | "cancel" | "fulfill";
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
}>;

export type CommerceOrderTransactionContextV1 = Readonly<{
  readonly orderId: string;
  readonly transition: CommerceOrderTransactionRequestV1["transition"];
}>;

export type CommerceOrderOperationStoreDependenciesV1 = TransactionDependenciesV1 & {
  readonly operationStore: CommerceTransactionStoreV1;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Order transition must be an object.");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || !candidate.trim()) {
    throw new Error(`Order transition requires '${key}'.`);
  }
  return candidate;
}

export const commerceOrderTransactionOperationAdapter: TransactionOperationAdapterV1<
  CommerceOrderTransactionRequestV1,
  CommerceOrderTransactionContextV1,
  Readonly<{ readonly receiptId: string; readonly replayed: boolean; readonly orderId: string; readonly transition: string }>
> = {
  parseRequest(input) {
    const value = record(input);
    const transition = requiredString(value, "transition");
    if (!( ["submit", "confirm", "cancel", "fulfill"] as const).includes(transition as never)) {
      throw new Error("Order transition is not declared.");
    }
    const expectedVersion = value.expectedVersion;
    if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
      throw new Error("Order transition requires a non-negative expected version.");
    }
    return Object.freeze({
      orderId: requiredString(value, "orderId"),
      expectedVersion: expectedVersion as number,
      transition: transition as CommerceOrderTransactionRequestV1["transition"],
      idempotencyKey: requiredString(value, "idempotencyKey"),
      payloadDigest: requiredString(value, "payloadDigest"),
    });
  },
  prepare(request) {
    return Object.freeze({
      command: Object.freeze({
        scope: `order:${request.orderId}`,
        idempotencyKey: request.idempotencyKey,
        payloadDigest: request.payloadDigest,
        aggregate: Object.freeze({ entity: "{{orderEntity}}", id: request.orderId, expectedVersion: request.expectedVersion }),
        transition: "{{orderFlow}}",
      }),
      context: Object.freeze({ orderId: request.orderId, transition: request.transition }),
    });
  },
  createStore(_context, dependencies) {
    const candidate = dependencies as CommerceOrderOperationStoreDependenciesV1;
    if (!candidate.operationStore) throw new Error("Order transaction Store is unavailable.");
    return candidate.operationStore;
  },
  present(result: CommerceTransactionResultV1, context) {
    return Object.freeze({
      receiptId: result.receiptId,
      replayed: result.kind === "completed" ? result.replayed : false,
      orderId: context.orderId,
      transition: context.transition,
    });
  },
};
