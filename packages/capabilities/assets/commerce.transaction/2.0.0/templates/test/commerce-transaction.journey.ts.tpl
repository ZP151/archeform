import { describe, expect, it } from "vitest";

import {
  CommerceTransactionExecutor,
  type CommerceTransactionClaimV1,
  type CommerceTransactionCommandV1,
  type CommerceTransactionOutcomeV1,
  type CommerceTransactionStoreV1,
} from "../../src/capabilities/commerce-transaction-executor.js";

type Receipt =
  | { readonly kind: "pending"; readonly payloadDigest: string; readonly receiptId: string }
  | {
      readonly kind: "completed";
      readonly payloadDigest: string;
      readonly receiptId: string;
      readonly outcome: CommerceTransactionOutcomeV1;
    };

class InMemoryCommerceTransactionStore implements CommerceTransactionStoreV1 {
  readonly #receipts = new Map<string, Receipt>();
  readonly #versions = new Map<string, number>();
  readonly #movements: string[] = [];
  readonly #audits: string[] = [];
  readonly #outbox: string[] = [];
  failAt: "inventory" | "audit" | "outbox" | undefined;

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const receipts = new Map(this.#receipts);
    const versions = new Map(this.#versions);
    const movements = [...this.#movements];
    const audits = [...this.#audits];
    const outbox = [...this.#outbox];
    try {
      return await operation();
    } catch (error) {
      this.#receipts.clear();
      receipts.forEach((value, key) => this.#receipts.set(key, value));
      this.#versions.clear();
      versions.forEach((value, key) => this.#versions.set(key, value));
      this.#movements.splice(0, this.#movements.length, ...movements);
      this.#audits.splice(0, this.#audits.length, ...audits);
      this.#outbox.splice(0, this.#outbox.length, ...outbox);
      throw error;
    }
  }

  async claimReceipt(input: {
    readonly scope: string;
    readonly idempotencyKey: string;
    readonly payloadDigest: string;
  }): Promise<CommerceTransactionClaimV1> {
    const receiptId = `${input.scope}:${input.idempotencyKey}`;
    const existing = this.#receipts.get(receiptId);
    if (!existing) {
      this.#receipts.set(receiptId, {
        kind: "pending",
        payloadDigest: input.payloadDigest,
        receiptId,
      });
      return { kind: "claimed", receiptId };
    }
    if (existing.payloadDigest !== input.payloadDigest) {
      return { kind: "payload-mismatch", receiptId };
    }
    if (existing.kind === "pending") return { kind: "in-progress", receiptId };
    return { kind: "completed", receiptId, outcome: existing.outcome };
  }

  async applyExpectedAggregateVersion(input: {
    readonly entity: string;
    readonly id: string;
    readonly expectedVersion: number;
  }): Promise<boolean> {
    const key = `${input.entity}:${input.id}`;
    const current = this.#versions.get(key) ?? 0;
    if (current !== input.expectedVersion) return false;
    this.#versions.set(key, current + 1);
    return true;
  }

  async appendInventoryMovement(input: { readonly receiptId: string }): Promise<void> {
    if (this.failAt === "inventory") throw new Error("inventory failed");
    this.#movements.push(input.receiptId);
  }

  async appendAuditRecord(input: { readonly receiptId: string }): Promise<void> {
    if (this.failAt === "audit") throw new Error("audit failed");
    this.#audits.push(input.receiptId);
  }

  async appendOutboxEvent(input: { readonly receiptId: string }): Promise<void> {
    if (this.failAt === "outbox") throw new Error("outbox failed");
    this.#outbox.push(input.receiptId);
  }

  async completeReceipt(input: {
    readonly receiptId: string;
    readonly outcome: CommerceTransactionOutcomeV1;
  }): Promise<void> {
    const receipt = this.#receipts.get(input.receiptId);
    if (!receipt || receipt.kind !== "pending") throw new Error("receipt not pending");
    this.#receipts.set(input.receiptId, {
      kind: "completed",
      payloadDigest: receipt.payloadDigest,
      receiptId: input.receiptId,
      outcome: input.outcome,
    });
  }

  seedPending(command: CommerceTransactionCommandV1): void {
    const receiptId = `${command.scope}:${command.idempotencyKey}`;
    this.#receipts.set(receiptId, {
      kind: "pending",
      payloadDigest: command.payloadDigest,
      receiptId,
    });
  }

  inspect(): Record<string, number> {
    return {
      receipts: this.#receipts.size,
      versions: this.#versions.size,
      movements: this.#movements.length,
      audits: this.#audits.length,
      outbox: this.#outbox.length,
    };
  }
}

const command = (): CommerceTransactionCommandV1 => ({
  scope: "{{aggregateEntity}}:demo",
  idempotencyKey: "submit-001",
  payloadDigest: "sha256:demo",
  aggregate: { entity: "{{aggregateEntity}}", id: "demo", expectedVersion: 0 },
  transition: "{{transactionFlow}}",
});

describe("commerce transaction journey", () => {
  it("replays a completed result and rejects a changed payload", async () => {
    const executor = new CommerceTransactionExecutor(new InMemoryCommerceTransactionStore());
    await expect(executor.execute(command())).resolves.toMatchObject({ kind: "completed", replayed: false });
    await expect(executor.execute(command())).resolves.toMatchObject({ kind: "completed", replayed: true });
    await expect(
      executor.execute({ ...command(), payloadDigest: "sha256:changed" }),
    ).rejects.toThrow("idempotency");
  });

  it("rejects stale versions, returns in-progress claims, and rolls back failed effects", async () => {
    const stale = new CommerceTransactionExecutor(new InMemoryCommerceTransactionStore());
    await expect(
      stale.execute({ ...command(), aggregate: { ...command().aggregate, expectedVersion: 1 } }),
    ).rejects.toThrow("stale aggregate version");

    const pendingStore = new InMemoryCommerceTransactionStore();
    pendingStore.seedPending(command());
    await expect(new CommerceTransactionExecutor(pendingStore).execute(command())).resolves.toMatchObject({ kind: "in-progress" });

    const rollbackStore = new InMemoryCommerceTransactionStore();
    rollbackStore.failAt = "audit";
    await expect(new CommerceTransactionExecutor(rollbackStore).execute(command())).rejects.toThrow("audit failed");
    expect(rollbackStore.inspect()).toEqual({ receipts: 0, versions: 0, movements: 0, audits: 0, outbox: 0 });
  });
});
