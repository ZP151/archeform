CREATE TABLE "CommerceTransactionReceipt" (
  "id" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadDigest" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "leaseExpiresAt" TIMESTAMP,
  "leaseEpoch" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "terminalOutcome" JSONB,
  "aggregateType" TEXT,
  "aggregateId" TEXT,
  "aggregateVersion" INTEGER,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceTransactionReceipt_scope_idempotencyKey_key"
    UNIQUE ("scope", "idempotencyKey")
);

CREATE INDEX "CommerceTransactionReceipt_state_leaseExpiresAt_idx"
  ON "CommerceTransactionReceipt" ("state", "leaseExpiresAt");
CREATE INDEX "ctx_receipt_aggregate_v_idx"
  ON "CommerceTransactionReceipt" ("aggregateType", "aggregateId", "aggregateVersion");

CREATE TABLE "CommerceAggregateVersion" (
  "id" TEXT PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceAggregateVersion_entity_aggregateId_key"
    UNIQUE ("entity", "aggregateId")
);

CREATE INDEX "CommerceAggregateVersion_entity_aggregateId_version_idx"
  ON "CommerceAggregateVersion" ("entity", "aggregateId", "version");
