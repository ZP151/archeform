CREATE TABLE "OrderOperationReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderEntity" TEXT NOT NULL,
  "orderRecordId" TEXT NOT NULL,
  "due" TEXT NOT NULL,
  "captured" TEXT NOT NULL,
  "refunded" TEXT NOT NULL,
  "processedIdempotencyKeys" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "OrderOperationReceipt_orderEntity_orderRecordId_key" ON "OrderOperationReceipt" ("orderEntity", "orderRecordId");
