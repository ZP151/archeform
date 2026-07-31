export type CommerceTransactionCommandV1 = {
  readonly scope: string;
  readonly idempotencyKey: string;
  readonly payloadDigest: string;
  readonly aggregate: {
    readonly entity: "{{aggregateEntity}}";
    readonly id: string;
    readonly expectedVersion: number;
  };
  readonly transition: "{{transactionFlow}}";
};

export type CommerceTransactionOutcomeV1 = Readonly<{
  aggregateEntity: string;
  aggregateId: string;
  aggregateVersion: number;
  actorRole: "{{actorRole}}";
  payloadDigest: string;
  transition: string;
}>;

export type CommerceTransactionResultV1 =
  | {
      readonly kind: "completed";
      readonly receiptId: string;
      readonly replayed: boolean;
      readonly outcome: CommerceTransactionOutcomeV1;
    }
  | { readonly kind: "in-progress"; readonly receiptId: string };

export type CommerceTransactionClaimV1 =
  | { readonly kind: "claimed"; readonly receiptId: string }
  | {
      readonly kind: "completed";
      readonly receiptId: string;
      readonly outcome: CommerceTransactionOutcomeV1;
    }
  | { readonly kind: "in-progress"; readonly receiptId: string }
  | { readonly kind: "payload-mismatch"; readonly receiptId: string };

export interface CommerceTransactionStoreV1 {
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  claimReceipt(input: {
    readonly scope: string;
    readonly idempotencyKey: string;
    readonly payloadDigest: string;
  }): Promise<CommerceTransactionClaimV1>;
  applyExpectedAggregateVersion(input: {
    readonly entity: string;
    readonly id: string;
    readonly expectedVersion: number;
  }): Promise<boolean>;
  appendInventoryMovement(input: {
    readonly receiptId: string;
    readonly aggregateId: string;
  }): Promise<void>;
  appendAuditRecord(input: {
    readonly receiptId: string;
    readonly transition: string;
  }): Promise<void>;
  appendOutboxEvent(input: {
    readonly receiptId: string;
    readonly transition: string;
  }): Promise<void>;
  completeReceipt(input: {
    readonly receiptId: string;
    readonly outcome: CommerceTransactionOutcomeV1;
  }): Promise<void>;
}

export class CommerceTransactionIdempotencyError extends Error {
  constructor(receiptId: string) {
    super(`idempotency payload mismatch for receipt '${receiptId}'`);
  }
}

export class CommerceTransactionStaleVersionError extends Error {
  constructor(command: CommerceTransactionCommandV1) {
    super(
      `stale aggregate version for '${command.aggregate.entity}:${command.aggregate.id}'`,
    );
  }
}

export interface CommerceTransactionExecutorV1 {
  execute(command: CommerceTransactionCommandV1): Promise<CommerceTransactionResultV1>;
}

export class CommerceTransactionExecutor implements CommerceTransactionExecutorV1 {
  constructor(private readonly store: CommerceTransactionStoreV1) {}

  async execute(
    command: CommerceTransactionCommandV1,
  ): Promise<CommerceTransactionResultV1> {
    return this.store.transaction(async () => {
      const claim = await this.store.claimReceipt({
        scope: command.scope,
        idempotencyKey: command.idempotencyKey,
        payloadDigest: command.payloadDigest,
      });

      if (claim.kind === "completed") {
        return { ...claim, replayed: true };
      }
      if (claim.kind === "in-progress") return claim;
      if (claim.kind === "payload-mismatch") {
        throw new CommerceTransactionIdempotencyError(claim.receiptId);
      }

      const applied = await this.store.applyExpectedAggregateVersion({
        entity: command.aggregate.entity,
        id: command.aggregate.id,
        expectedVersion: command.aggregate.expectedVersion,
      });
      if (!applied) throw new CommerceTransactionStaleVersionError(command);

      await this.store.appendInventoryMovement({
        receiptId: claim.receiptId,
        aggregateId: command.aggregate.id,
      });
      await this.store.appendAuditRecord({
        receiptId: claim.receiptId,
        transition: command.transition,
      });
      await this.store.appendOutboxEvent({
        receiptId: claim.receiptId,
        transition: command.transition,
      });

      const outcome: CommerceTransactionOutcomeV1 = Object.freeze({
        aggregateEntity: command.aggregate.entity,
        aggregateId: command.aggregate.id,
        aggregateVersion: command.aggregate.expectedVersion + 1,
        actorRole: "{{actorRole}}",
        payloadDigest: command.payloadDigest,
        transition: command.transition,
      });
      await this.store.completeReceipt({ receiptId: claim.receiptId, outcome });
      return { kind: "completed", receiptId: claim.receiptId, replayed: false, outcome };
    });
  }
}
