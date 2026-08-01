import type {
  TransactionDependenciesV2,
  TransactionOperationAdapterV2,
  TransactionResultV2,
  TransactionStoreV2,
} from "./commerce-transaction-executor.js";

const maximumDeclaredOrderFlowEvents = 128;

export type CommerceOrderTransactionRequestV2 = Readonly<{
  orderId: string;
  expectedVersion: number;
  expectedState: string;
  event: string;
  idempotencyKey: string;
  payloadDigest: string;
}>;

export type CommerceOrderTransactionContextV2 = Readonly<{
  orderId: string;
  event: string;
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

function freezeDeclaredEvents(
  declaredEvents: readonly string[],
): readonly string[] {
  if (
    !Array.isArray(declaredEvents) ||
    declaredEvents.length === 0 ||
    declaredEvents.length > maximumDeclaredOrderFlowEvents
  ) {
    throw new Error("Order Flow event list must be non-empty and bounded.");
  }
  const frozenEvents = Object.freeze([...declaredEvents]);
  if (
    frozenEvents.some(
      (event) =>
        typeof event !== "string" || !event.trim() || event.trim() !== event,
    )
  ) {
    throw new Error("Order Flow event list must contain event names.");
  }
  if (new Set(frozenEvents).size !== frozenEvents.length) {
    throw new Error("Order Flow event list must contain unique event names.");
  }
  return frozenEvents;
}

export function createCommerceOrderTransactionOperationAdapter(
  declaredEvents: readonly string[],
): TransactionOperationAdapterV2<
  CommerceOrderTransactionRequestV2,
  CommerceOrderTransactionContextV2,
  OrderTransitionReceipt
> {
  const frozenDeclaredEvents = freezeDeclaredEvents(declaredEvents);
  const declaredEventSet = new Set(frozenDeclaredEvents);

  return Object.freeze({
    parseRequest(input: unknown): CommerceOrderTransactionRequestV2 {
      const value = record(input);
      const event = requiredString(value, "event");
      if (!declaredEventSet.has(event)) {
        throw new Error("Order transition is not declared.");
      }
      const expectedVersion = value.expectedVersion;
      if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
        throw new Error(
          "Order transition requires a non-negative expected version.",
        );
      }
      const payloadDigest = requiredString(value, "payloadDigest");
      if (!/^sha256:[a-f0-9]+$/.test(payloadDigest)) {
        throw new Error("Order transition requires a SHA-256 payload digest.");
      }
      return Object.freeze({
        orderId: requiredString(value, "orderId"),
        expectedVersion: expectedVersion as number,
        expectedState: requiredString(value, "expectedState"),
        event,
        idempotencyKey: requiredString(value, "idempotencyKey"),
        payloadDigest,
      });
    },
    prepare(request: CommerceOrderTransactionRequestV2) {
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
        context: Object.freeze({
          orderId: request.orderId,
          event: request.event,
        }),
      });
    },
    createStore(_context, dependencies) {
      const candidate =
        dependencies as CommerceOrderOperationStoreDependenciesV2;
      if (!candidate.operationStore) {
        throw new Error("Order transaction Store is unavailable.");
      }
      return candidate.operationStore;
    },
    present(result: TransactionResultV2, context) {
      if (result.kind === "in-progress") {
        return Object.freeze({
          kind: "in-progress" as const,
          receiptId: result.receiptId,
          replayed: false as const,
          orderId: context.orderId,
          transition: context.event,
          retryAfterMs: result.retryAfterMs,
        });
      }
      return Object.freeze({
        kind: "completed" as const,
        receiptId: result.receiptId,
        replayed: result.replayed,
        orderId: context.orderId,
        transition: context.event,
      });
    },
  });
}
