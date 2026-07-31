import type {
  CommerceTransactionResultV1,
  CommerceTransactionStoreV1,
  TransactionDependenciesV1,
  TransactionOperationAdapterV1,
} from "./commerce-transaction-executor.js";

export type CommerceOrderTransactionRequestV1 = Readonly<{
  orderId: string;
  expectedVersion: number;
  transition: "submit" | "confirm" | "cancel" | "fulfill";
  idempotencyKey: string;
  payloadDigest: string;
}>;

export type CommerceOrderTransactionContextV1 = Readonly<{
  orderId: string;
  transition: CommerceOrderTransactionRequestV1["transition"];
}>;

export type CommerceOrderOperationStoreDependenciesV1 = TransactionDependenciesV1 & {
  readonly operationStore: CommerceTransactionStoreV1;
};

function assertRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Order transition must be an object.");
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Order transition requires '${key}'.`);
  }
  return value;
}

export const commerceOrderTransactionOperationAdapter: TransactionOperationAdapterV1<
  CommerceOrderTransactionRequestV1,
  CommerceOrderTransactionContextV1,
  Readonly<{ receiptId: string; replayed: boolean; orderId: string; transition: string }>
> = {
  parseRequest(request) {
    const record = assertRecord(request);
    const transition = requiredString(record, "transition");
    if (!(["submit", "confirm", "cancel", "fulfill"] as const).includes(transition as never)) {
      throw new Error("Order transition is not declared.");
    }
    const expectedVersion = record.expectedVersion;
    if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
      throw new Error("Order transition requires a non-negative expected version.");
    }
    return Object.freeze({
      orderId: requiredString(record, "orderId"),
      expectedVersion: expectedVersion as number,
      transition: transition as CommerceOrderTransactionRequestV1["transition"],
      idempotencyKey: requiredString(record, "idempotencyKey"),
      payloadDigest: requiredString(record, "payloadDigest"),
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
