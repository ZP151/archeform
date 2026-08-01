model CommerceTransactionReceipt {
  id               String   @id @default(cuid())
  scope            String
  idempotencyKey   String
  payloadDigest    String
  state            String
  leaseExpiresAt   DateTime?
  leaseEpoch       Int      @default(0)
  leaseToken       String?
  terminalOutcome  Json?
  aggregateType    String?
  aggregateId      String?
  aggregateVersion Int?
  completedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([scope, idempotencyKey])
  @@index([state, leaseExpiresAt], map: "CommerceTransactionReceipt_state_leaseExpiresAt_idx")
  @@index([aggregateType, aggregateId, aggregateVersion], map: "CommerceTransactionReceipt_aggregateType_aggregateId_aggregateVersion_idx")
}

model CommerceAggregateVersion {
  id          String   @id @default(cuid())
  entity      String
  aggregateId String
  status      String
  version     Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@unique([entity, aggregateId])
  @@index([entity, aggregateId, version], map: "CommerceAggregateVersion_entity_aggregateId_version_idx")
}
