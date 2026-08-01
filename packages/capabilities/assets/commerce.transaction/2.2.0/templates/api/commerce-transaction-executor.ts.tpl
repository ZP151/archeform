export type TransactionCommandV2 = Readonly<{
  flowId: string;
  event: string;
  aggregate: Readonly<{
    entity: string;
    id: string;
    expectedVersion: number;
    expectedState: string;
  }>;
  idempotency: Readonly<{
    scope: string;
    key: string;
    payloadDigest: string;
  }>;
}>;

export type TransactionOutcomeV2 = Readonly<{
  aggregateEntity: string;
  aggregateId: string;
  aggregateVersion: number;
  actorRole: "{{actorRole}}";
  payloadDigest: string;
  event: string;
  flowId: string;
}>;

export type TransactionResultV2 =
  | Readonly<{
      kind: "completed";
      receiptId: string;
      replayed: boolean;
      outcome: TransactionOutcomeV2;
    }>
  | Readonly<{
      kind: "in-progress";
      receiptId: string;
      retryAfterMs: number;
    }>;

export type ReceiptClaimV2 =
  | Readonly<{
      kind: "claimed";
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>
  | Readonly<{
      kind: "completed";
      receiptId: string;
      outcome: TransactionOutcomeV2;
    }>
  | Readonly<{
      kind: "in-progress";
      receiptId: string;
      retryAfterMs: number;
    }>
  | Readonly<{ kind: "payload-mismatch"; receiptId: string }>;

export interface TransactionStoreV2 {
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  claimReceipt(input: Readonly<{
    scope: string;
    idempotencyKey: string;
    payloadDigest: string;
  }>): Promise<ReceiptClaimV2>;
  markReceiptRetryable(input: Readonly<{
    receiptId: string;
    leaseToken: string;
    leaseEpoch: number;
  }>): Promise<void>;
  applyExpectedAggregateVersion(input: Readonly<{
    entity: string;
    id: string;
    expectedVersion: number;
    expectedState: string;
  }>): Promise<boolean>;
  appendInventoryMovement(input: Readonly<{
    receiptId: string;
    aggregateId: string;
  }>): Promise<void>;
  appendAuditRecord(input: Readonly<{
    receiptId: string;
    event: string;
  }>): Promise<void>;
  appendOutboxEvent(input: Readonly<{
    receiptId: string;
    event: string;
  }>): Promise<void>;
  completeReceipt(input: Readonly<{
    receiptId: string;
    leaseToken: string;
    leaseEpoch: number;
    outcome: TransactionOutcomeV2;
  }>): Promise<void>;
}

export interface TransactionExecutorV2 {
  execute(command: TransactionCommandV2): Promise<TransactionResultV2>;
}

export interface TransactionDependenciesV2 {
  readonly transactionExecutor: TransactionExecutorV2;
}

export interface TransactionOperationAdapterV2<Request, Context, Response> {
  parseRequest(request: unknown): Request;
  prepare(request: Request): Readonly<{
    command: TransactionCommandV2;
    context: Context;
  }>;
  createStore(
    context: Context,
    dependencies: TransactionDependenciesV2,
  ): TransactionStoreV2;
  present(result: TransactionResultV2, context: Context): Response;
}

export class TransactionIdempotencyError extends Error {
  constructor(receiptId: string) {
    super(`idempotency payload mismatch for receipt '${receiptId}'`);
  }
}

export class TransactionStaleVersionError extends Error {
  constructor(command: TransactionCommandV2) {
    super(
      `stale aggregate version for '${command.aggregate.entity}:${command.aggregate.id}'`,
    );
  }
}

export class CommerceTransactionExecutor implements TransactionExecutorV2 {
  constructor(private readonly store: TransactionStoreV2) {}

  async execute(command: TransactionCommandV2): Promise<TransactionResultV2> {
    if (command.flowId !== "{{transactionFlow}}") {
      throw new Error("Transaction command targets an undeclared Flow.");
    }
    if (!command.event.trim()) {
      throw new Error("Transaction command requires an event.");
    }

    const claim = await this.store.claimReceipt({
      scope: command.idempotency.scope,
      idempotencyKey: command.idempotency.key,
      payloadDigest: command.idempotency.payloadDigest,
    });
    if (claim.kind === "completed") return { ...claim, replayed: true };
    if (claim.kind === "in-progress") return claim;
    if (claim.kind === "payload-mismatch") {
      throw new TransactionIdempotencyError(claim.receiptId);
    }

    try {
      return await this.store.transaction(async () => {
        const applied = await this.store.applyExpectedAggregateVersion({
          entity: command.aggregate.entity,
          id: command.aggregate.id,
          expectedVersion: command.aggregate.expectedVersion,
          expectedState: command.aggregate.expectedState,
        });
        if (!applied) throw new TransactionStaleVersionError(command);

        await this.store.appendInventoryMovement({
          receiptId: claim.receiptId,
          aggregateId: command.aggregate.id,
        });
        await this.store.appendAuditRecord({
          receiptId: claim.receiptId,
          event: command.event,
        });
        await this.store.appendOutboxEvent({
          receiptId: claim.receiptId,
          event: command.event,
        });

        const outcome: TransactionOutcomeV2 = Object.freeze({
          aggregateEntity: command.aggregate.entity,
          aggregateId: command.aggregate.id,
          aggregateVersion: command.aggregate.expectedVersion + 1,
          actorRole: "{{actorRole}}",
          payloadDigest: command.idempotency.payloadDigest,
          event: command.event,
          flowId: command.flowId,
        });
        await this.store.completeReceipt({
          receiptId: claim.receiptId,
          leaseToken: claim.leaseToken,
          leaseEpoch: claim.leaseEpoch,
          outcome,
        });
        return Object.freeze({
          kind: "completed" as const,
          receiptId: claim.receiptId,
          replayed: false,
          outcome,
        });
      });
    } catch (error) {
      await this.store.markReceiptRetryable({
        receiptId: claim.receiptId,
        leaseToken: claim.leaseToken,
        leaseEpoch: claim.leaseEpoch,
      });
      throw error;
    }
  }
}
