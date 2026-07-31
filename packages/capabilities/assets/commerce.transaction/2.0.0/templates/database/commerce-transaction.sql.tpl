CREATE TABLE "CommerceTransactionReceipt" (
  "id" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "aggregateVersion" INTEGER NOT NULL,
  "outcomeJson" JSONB NOT NULL,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceTransactionReceipt_scope_idempotencyKey_key"
    UNIQUE ("scope", "idempotencyKey")
);

CREATE TABLE "CommerceAggregateVersion" (
  "id" TEXT PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceAggregateVersion_entity_aggregateId_key"
    UNIQUE ("entity", "aggregateId")
);

CREATE TABLE "CommerceInventoryMovement" (
  "id" TEXT PRIMARY KEY,
  "receiptId" TEXT NOT NULL REFERENCES "CommerceTransactionReceipt"("id"),
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CommerceTransactionAudit" (
  "id" TEXT PRIMARY KEY,
  "receiptId" TEXT NOT NULL REFERENCES "CommerceTransactionReceipt"("id"),
  "event" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CommerceTransactionOutbox" (
  "id" TEXT PRIMARY KEY,
  "receiptId" TEXT NOT NULL REFERENCES "CommerceTransactionReceipt"("id"),
  "topic" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
