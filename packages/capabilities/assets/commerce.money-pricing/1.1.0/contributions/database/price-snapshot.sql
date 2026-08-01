CREATE TABLE "PriceSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderEntity" TEXT NOT NULL,
  "orderRecordId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "subtotalMinor" TEXT NOT NULL,
  "discountMinor" TEXT NOT NULL,
  "taxMinor" TEXT NOT NULL,
  "totalMinor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PriceSnapshot_orderEntity_orderRecordId_key" ON "PriceSnapshot"("orderEntity", "orderRecordId");

CREATE TABLE "PriceAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "snapshotId" TEXT NOT NULL,
  "lineRecordId" TEXT NOT NULL,
  "subtotalMinor" TEXT NOT NULL,
  "discountMinor" TEXT NOT NULL,
  "taxMinor" TEXT NOT NULL,
  "totalMinor" TEXT NOT NULL,
  CONSTRAINT "PriceAllocation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PriceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PriceAllocation_snapshotId_lineRecordId_key" ON "PriceAllocation"("snapshotId", "lineRecordId");
