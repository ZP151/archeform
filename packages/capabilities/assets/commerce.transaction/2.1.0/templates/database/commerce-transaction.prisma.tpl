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
  id          String   @id @default(cuid())
  entity      String
  aggregateId String
  version     Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@unique([entity, aggregateId])
}
