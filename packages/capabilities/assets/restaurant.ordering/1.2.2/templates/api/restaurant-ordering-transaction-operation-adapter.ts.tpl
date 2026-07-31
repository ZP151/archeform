import type {
  CommerceTransactionResultV1,
  CommerceTransactionStoreV1,
  TransactionDependenciesV1,
  TransactionOperationAdapterV1,
} from "./commerce-transaction-executor.js";

export type RestaurantOrderingTransactionRequestV1 = Readonly<{
  orderId: string;
  expectedVersion: number;
  transition: "submit" | "cancel" | "complete";
  idempotencyKey: string;
  payloadDigest: string;
  tableSession: Readonly<{ id: string; tableId: string }>;
  lines: readonly Readonly<{ menuItemId: string; quantity: number }> [];
  paymentEvidence: Readonly<{ kind: "simulated"; reference: string }>;
  cancellationReason?: string;
}>;

export type RestaurantOrderingTransactionContextV1 = Readonly<{
  tableSession: RestaurantOrderingTransactionRequestV1["tableSession"];
  lines: RestaurantOrderingTransactionRequestV1["lines"];
  paymentEvidence: RestaurantOrderingTransactionRequestV1["paymentEvidence"];
  cancellationReason?: string;
}>;

export type RestaurantOperationStoreDependenciesV1 = TransactionDependenciesV1 & {
  readonly operationStore: CommerceTransactionStoreV1;
};

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}
function string(recordValue: Record<string, unknown>, key: string, message: string): string {
  const value = recordValue[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
  return value;
}

export const restaurantOrderingTransactionOperationAdapter: TransactionOperationAdapterV1<
  RestaurantOrderingTransactionRequestV1,
  RestaurantOrderingTransactionContextV1,
  Readonly<{ receiptId: string; tableSessionId: string; replayed: boolean }>
> = {
  parseRequest(request) {
    const value = record(request, "Restaurant transaction must be an object.");
    const tableSessionRecord = record(value.tableSession, "A declared table session is required.");
    const lines = value.lines;
    if (!Array.isArray(lines) || !lines.length) throw new Error("Restaurant transaction requires typed lines.");
    const parsedLines = lines.map((line) => {
      const entry = record(line, "Restaurant line must be typed.");
      const quantity = entry.quantity;
      if (!Number.isInteger(quantity) || (quantity as number) < 1) throw new Error("Restaurant line quantity is invalid.");
      return Object.freeze({ menuItemId: string(entry, "menuItemId", "Restaurant line requires a menu item."), quantity: quantity as number });
    });
    const payment = record(value.paymentEvidence, "Restaurant transaction requires payment evidence.");
    if (payment.kind !== "simulated") throw new Error("Restaurant payment evidence is not declared.");
    const transition = string(value, "transition", "Restaurant transaction requires a transition.");
    if (!(["submit", "cancel", "complete"] as const).includes(transition as never)) throw new Error("Restaurant transition is not declared.");
    const expectedVersion = value.expectedVersion;
    if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) throw new Error("Restaurant transaction requires a non-negative expected version.");
    const cancellationReason = value.cancellationReason;
    if (transition === "cancel" && (typeof cancellationReason !== "string" || !cancellationReason.trim())) throw new Error("Restaurant cancellation requires a reason.");
    return Object.freeze({
      orderId: string(value, "orderId", "Restaurant transaction requires an order."),
      expectedVersion: expectedVersion as number,
      transition: transition as RestaurantOrderingTransactionRequestV1["transition"],
      idempotencyKey: string(value, "idempotencyKey", "Restaurant transaction requires an idempotency key."),
      payloadDigest: string(value, "payloadDigest", "Restaurant transaction requires a payload digest."),
      tableSession: Object.freeze({ id: string(tableSessionRecord, "id", "Restaurant table session requires an id."), tableId: string(tableSessionRecord, "tableId", "Restaurant table session requires a table." ) }),
      lines: Object.freeze(parsedLines),
      paymentEvidence: Object.freeze({ kind: "simulated" as const, reference: string(payment, "reference", "Restaurant payment evidence requires a reference.") }),
      ...(typeof cancellationReason === "string" ? { cancellationReason } : {}),
    });
  },
  prepare(request) {
    return Object.freeze({
      command: Object.freeze({
        scope: `restaurant-table-session:${request.tableSession.id}`,
        idempotencyKey: request.idempotencyKey,
        payloadDigest: request.payloadDigest,
        aggregate: Object.freeze({ entity: "{{orderEntity}}", id: request.orderId, expectedVersion: request.expectedVersion }),
        transition: "{{orderFlow}}",
      }),
      context: Object.freeze({ tableSession: request.tableSession, lines: request.lines, paymentEvidence: request.paymentEvidence, ...(request.cancellationReason ? { cancellationReason: request.cancellationReason } : {}) }),
    });
  },
  createStore(_context, dependencies) {
    const candidate = dependencies as RestaurantOperationStoreDependenciesV1;
    if (!candidate.operationStore) throw new Error("Restaurant transaction Store is unavailable.");
    return candidate.operationStore;
  },
  present(result: CommerceTransactionResultV1, context) {
    return Object.freeze({ receiptId: result.receiptId, tableSessionId: context.tableSession.id, replayed: result.kind === "completed" ? result.replayed : false });
  },
};
