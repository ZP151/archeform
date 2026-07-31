model FactoryCommandReceipt {
  id             String    @id
  scope          String
  idempotencyKey String
  payloadDigest  String
  status         String
  result         Json?
  createdAt      DateTime  @default(now())
  completedAt    DateTime?

  @@unique([scope, idempotencyKey])
}

model FactoryTransactionAuditEvent {
  id                String   @id
  scope             String
  aggregateEntity   String
  aggregateRecordId String
  payload           Json
  createdAt         DateTime @default(now())
}

model FactoryTransactionOutboxEvent {
  id                String   @id
  scope             String
  aggregateEntity   String
  aggregateRecordId String
  payload           Json
  createdAt         DateTime @default(now())
  publishedAt       DateTime?
}
