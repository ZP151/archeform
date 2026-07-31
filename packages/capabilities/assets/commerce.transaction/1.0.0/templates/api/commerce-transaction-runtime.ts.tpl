export type CommerceTransactionCommandV1 = Readonly<{
  scope: string;
  aggregate: {
    entityKey: string;
    recordId: string;
    expectedVersion: number;
  };
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
  effects: readonly (
    | "reserve-stock"
    | "release-stock"
    | "append-audit"
    | "append-outbox"
  )[];
}>;

export type CommerceTransactionOutcomeV1 = Readonly<{
  receiptId: string;
  replayed: boolean;
  aggregate: {
    entityKey: string;
    recordId: string;
    status: string;
    version: number;
  };
  inventoryMovementIds: readonly string[];
  auditEventId: string;
  outboxEventId: string;
}>;

export interface CommerceTransactionExecutorV1 {
  execute(
    command: CommerceTransactionCommandV1,
  ): Promise<CommerceTransactionOutcomeV1>;
}

export const commerceTransactionBinding = {
  aggregateEntity: "{{aggregateEntity}}",
  transactionFlow: "{{transactionFlow}}",
  actorRole: "{{actorRole}}",
} as const;
