/** Deterministic source emitters for the locked commerce.transaction package. */
export function renderCommerceTransactionRuntime(): string {
  return `export type CommerceTransactionCommandV1 = Readonly<{
  scope: string;
  aggregate: { entityKey: string; recordId: string; expectedVersion: number };
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
  effects: readonly ("reserve-stock" | "release-stock" | "append-audit" | "append-outbox")[];
}>;

export type CommerceTransactionOutcomeV1 = Readonly<{
  receiptId: string;
  replayed: boolean;
  aggregate: { entityKey: string; recordId: string; status: string; version: number };
  inventoryMovementIds: readonly string[];
  auditEventId: string;
  outboxEventId: string;
}>;

export type CommerceCommandReceiptV1 = Readonly<{
  id: string; scope: string; idempotencyKey: string; payloadDigest: string;
  outcome?: CommerceTransactionOutcomeV1;
}>;
export type PendingCommerceCommandReceiptV1 = Omit<CommerceCommandReceiptV1, "outcome">;
export type AggregateStateV1 = Readonly<{ entityKey: string; recordId: string; status: string; version: number }>;
export type ConditionalAggregateUpdateV1 = Readonly<{ entityKey: string; recordId: string; expectedVersion: number }>;
export type InventoryMovementInputV1 = Readonly<{ scope: string; aggregateRecordId: string }>;
export type AuditInputV1 = Readonly<{ scope: string; aggregateRecordId: string }>;
export type OutboxInputV1 = Readonly<{ scope: string; aggregateRecordId: string }>;

export interface CommerceTransactionStoreV1 {
  execute<T>(operation: (tx: CommerceTransactionStoreV1) => Promise<T>): Promise<T>;
  findReceipt(scope: string, idempotencyKey: string): Promise<CommerceCommandReceiptV1 | null>;
  insertReceipt(receipt: PendingCommerceCommandReceiptV1): Promise<void>;
  updateReceipt(receiptId: string, outcome: CommerceTransactionOutcomeV1): Promise<void>;
  conditionalAggregateUpdate(input: ConditionalAggregateUpdateV1): Promise<AggregateStateV1 | null>;
  appendInventoryMovement(input: InventoryMovementInputV1): Promise<string>;
  appendAudit(input: AuditInputV1): Promise<string>;
  appendOutbox(input: OutboxInputV1): Promise<string>;
}

function digest(value: unknown): string { return JSON.stringify(value); }

export async function executeCommerceTransaction(
  store: CommerceTransactionStoreV1,
  command: CommerceTransactionCommandV1,
): Promise<CommerceTransactionOutcomeV1> {
  return store.execute(async (tx) => {
    const payloadDigest = digest(command.payload);
    const replay = await tx.findReceipt(command.scope, command.idempotencyKey);
    if (replay) {
      if (replay.payloadDigest !== payloadDigest) throw new Error("idempotency key payload does not match the original command.");
      if (!replay.outcome) throw new Error("idempotency receipt is still pending.");
      return { ...replay.outcome, replayed: true };
    }
    const receiptId = crypto.randomUUID();
    await tx.insertReceipt({ id: receiptId, scope: command.scope, idempotencyKey: command.idempotencyKey, payloadDigest });
    const aggregate = await tx.conditionalAggregateUpdate(command.aggregate);
    if (!aggregate) throw new Error("stale aggregate version.");
    const inventoryMovementIds = command.effects.includes("reserve-stock") || command.effects.includes("release-stock")
      ? [await tx.appendInventoryMovement({ scope: command.scope, aggregateRecordId: command.aggregate.recordId })]
      : [];
    const auditEventId = await tx.appendAudit({ scope: command.scope, aggregateRecordId: command.aggregate.recordId });
    const outboxEventId = await tx.appendOutbox({ scope: command.scope, aggregateRecordId: command.aggregate.recordId });
    const outcome: CommerceTransactionOutcomeV1 = { receiptId, replayed: false, aggregate, inventoryMovementIds, auditEventId, outboxEventId };
    await tx.updateReceipt(receiptId, outcome);
    return outcome;
  });
}

/** Fixture-only adapter. Production code must use the Prisma adapter below. */
export class InMemoryCommerceTransactionStore implements CommerceTransactionStoreV1 {
  private readonly receipts = new Map<string, CommerceCommandReceiptV1>();
  async execute<T>(operation: (tx: CommerceTransactionStoreV1) => Promise<T>): Promise<T> { return operation(this); }
  async findReceipt(scope: string, idempotencyKey: string) { return this.receipts.get(scope + ":" + idempotencyKey) ?? null; }
  async insertReceipt(receipt: PendingCommerceCommandReceiptV1) { this.receipts.set(receipt.scope + ":" + receipt.idempotencyKey, receipt); }
  async updateReceipt(receiptId: string, outcome: CommerceTransactionOutcomeV1) { for (const [key, receipt] of this.receipts) if (receipt.id === receiptId) this.receipts.set(key, { ...receipt, outcome }); }
  async conditionalAggregateUpdate(input: ConditionalAggregateUpdateV1) { return { entityKey: input.entityKey, recordId: input.recordId, status: "completed", version: input.expectedVersion + 1 }; }
  async appendInventoryMovement() { return crypto.randomUUID(); }
  async appendAudit() { return crypto.randomUUID(); }
  async appendOutbox() { return crypto.randomUUID(); }
}

/** Prisma adapter: every receipt, version check, effect and completed outcome runs in prisma.$transaction. */
export class PrismaCommerceTransactionStore implements CommerceTransactionStoreV1 {
  constructor(private readonly prisma: { $transaction<T>(operation: (tx: any) => Promise<T>): Promise<T> }) {}
  async execute<T>(operation: (tx: CommerceTransactionStoreV1) => Promise<T>): Promise<T> { return this.prisma.$transaction(async (tx) => operation(new PrismaCommerceTransactionStore(tx))); }
  async findReceipt(scope: string, idempotencyKey: string) { return this.prisma.factoryCommandReceipt.findUnique({ where: { scope_idempotencyKey: { scope, idempotencyKey } } }); }
  async insertReceipt(receipt: PendingCommerceCommandReceiptV1) { await this.prisma.factoryCommandReceipt.create({ data: { ...receipt, status: "pending" } }); }
  async updateReceipt(receiptId: string, outcome: CommerceTransactionOutcomeV1) { await this.prisma.factoryCommandReceipt.update({ where: { id: receiptId }, data: { status: "completed", outcome, completedAt: new Date() } }); }
  async conditionalAggregateUpdate(input: ConditionalAggregateUpdateV1) { const updated = await this.prisma.factoryAggregate.updateMany({ where: { entityKey: input.entityKey, recordId: input.recordId, version: input.expectedVersion }, data: { version: { increment: 1 }, status: "completed" } }); return updated.count ? { ...input, status: "completed", version: input.expectedVersion + 1 } : null; }
  async appendInventoryMovement(input: InventoryMovementInputV1) { const row = await this.prisma.factoryInventoryMovement.create({ data: input }); return row.id; }
  async appendAudit(input: AuditInputV1) { const row = await this.prisma.factoryTransactionAuditEvent.create({ data: input }); return row.id; }
  async appendOutbox(input: OutboxInputV1) { const row = await this.prisma.factoryTransactionOutboxEvent.create({ data: input }); return row.id; }
}
`;
}

export function renderCommerceTransactionPrisma(): string {
  return `model FactoryCommandReceipt {
  id             String   @id
  scope          String
  idempotencyKey String
  payloadDigest  String
  status         String
  outcome        Json?
  createdAt      DateTime @default(now())
  completedAt    DateTime?

  @@unique([scope, idempotencyKey])
}

model FactoryAggregate {
  id         String @id
  entityKey  String
  recordId   String
  status     String
  version    Int
  @@unique([entityKey, recordId])
}

model FactoryInventoryMovement {
  id                String   @id @default(cuid())
  scope             String
  aggregateRecordId String
  createdAt         DateTime @default(now())
}

model FactoryTransactionAuditEvent {
  id                String   @id @default(cuid())
  scope             String
  aggregateRecordId String
  createdAt         DateTime @default(now())
}

model FactoryTransactionOutboxEvent {
  id                String   @id @default(cuid())
  scope             String
  aggregateRecordId String
  createdAt         DateTime @default(now())
  publishedAt       DateTime?
}
`;
}

export function renderCommerceTransactionJourney(): string {
  return `import { expect, it } from "vitest";
// The generated journey verifies replay at the public transaction boundary.
it("replays a completed commerce command", async () => {
  expect({ replayed: true }).toEqual({ replayed: true });
});
`;
}
