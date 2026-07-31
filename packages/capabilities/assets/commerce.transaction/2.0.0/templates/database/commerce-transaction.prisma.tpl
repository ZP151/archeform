model CommerceTransactionReceipt {
  id             String   @id @default(cuid())
  scope          String
  idempotencyKey String
  payloadDigest  String
  aggregateType  String
  aggregateId    String
  aggregateVersion Int
  outcomeJson    Json
  completedAt    DateTime?
  createdAt      DateTime @default(now())

  @@unique([scope, idempotencyKey])
  @@index([aggregateType, aggregateId, aggregateVersion])
}

model CommerceAggregateVersion {
  id        String   @id @default(cuid())
  entity    String
  aggregateId String
  version   Int      @default(0)
  updatedAt DateTime @updatedAt

  @@unique([entity, aggregateId])
}

model CommerceInventoryMovement {
  id        String   @id @default(cuid())
  receiptId String
  quantity  Int
  createdAt DateTime @default(now())

  @@index([receiptId])
}

model CommerceTransactionAudit {
  id        String   @id @default(cuid())
  receiptId String
  event     String
  createdAt DateTime @default(now())

  @@index([receiptId])
}

model CommerceTransactionOutbox {
  id        String   @id @default(cuid())
  receiptId String
  topic     String
  payload   Json
  createdAt DateTime @default(now())

  @@index([receiptId])
}
