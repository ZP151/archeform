---
title: "ADR-0017: Ephemeral Lifecycle Persistence for Published-Compilation Acceptance"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "testing", "lifecycle", "compilation", "isolation"]
supersedes: ""
superseded_by: ""
---

# ADR-0017: Ephemeral Lifecycle Persistence for Published-Compilation Acceptance

## Status

**Accepted**

## Context

**CTX-001**: Factory Pilot preserves one lifecycle: mutable Draft -> Publish
-> immutable Compilation. `LifecycleService.publishDraft` persists a
PublishedRevision and verified composition lock; `createCompilation` reloads
that immutable data before it creates a compiler job.

**CTX-002**: The direct Commerce V2 live test previously created a Draft graph
in process, assigned a fabricated revision identifier, and called the compiler
directly. It exercised generated runtime behavior but did not prove the
Publish/reload boundary.

**CTX-003**: The generated application's PostgreSQL schema does not contain
the Control Plane lifecycle tables. Using the existing Factory Control Plane
database would violate test isolation and risk user data. A mock cannot prove
Prisma persistence, reload, hash verification, or stored composition-lock
integrity.

## Decision

**DEC-001**: Published-compilation acceptance tests use a unique, ephemeral
Compose project with two isolated PostgreSQL services: `lifecycle-postgres`
for Control Plane lifecycle tables and `generated-postgres` for the materialised
generated application. Neither service may use existing Factory data.

**DEC-002**: The test creates a Draft through `LifecycleService`, publishes it,
then calls `createCompilation` with an injected capturing queue. It compiles
only the queue-captured, persisted PublishedRevision graph and composition
lock. It may not fabricate a published revision identifier or rewrite lock
selections after Draft creation.

**DEC-003**: Both services use explicitly pinned cached images, service
`pull_policy: never`, and Compose `--pull never`. A preflight image inspection
must fail before Compose setup when the required image is absent.

**DEC-004**: Cleanup must attempt service teardown, resource audit, and
temporary-directory deletion independently. Failures are preserved as one
error or an AggregateError after all cleanup stages run.

## Consequences

### Positive

- **POS-001**: Acceptance evidence proves the actual Draft -> Publish ->
  immutable Compilation boundary without using the existing Control Plane
  database.
- **POS-002**: Published composition locks, hashes, and compiler inputs are
  observed through the same persistence path used by the product.
- **POS-003**: Offline behavior fails closed when the cached database image is
  unavailable, and cleanup remains auditable after test failures.

### Negative

- **NEG-001**: Live acceptance creates a second temporary database service,
  increases test setup time, and requires local Docker/Compose plus cached
  images.
- **NEG-002**: The test harness must apply the Control Plane Prisma schema to
  an isolated database and instantiate a capturing queue without a Redis
  runtime.
- **NEG-003**: This decision covers acceptance tests only; it does not alter
  generated-application topology or authorize Control Plane production-source
  changes.

## Alternatives Considered

### Compile a Draft graph with a fabricated revision identifier

- **ALT-001**: Call the compiler directly from a freshly composed Draft.
- **ALT-002**: Rejected because an identifier does not prove persistence,
  Publish validation, immutable reload, or stored composition-lock integrity.

### Use the existing Factory Control Plane database

- **ALT-003**: Create and publish test records in the running local Control
  Plane database.
- **ALT-004**: Rejected because tests would observe or mutate non-test data and
  no longer be self-cleaning.

### Mock lifecycle persistence

- **ALT-005**: Stub Prisma or manufacture a queue payload in memory.
- **ALT-006**: Rejected because it would not demonstrate the persisted reload
  boundary required by this acceptance slice.

## Implementation Notes

- **IMP-001**: Test code may import existing Control Plane lifecycle services
  but must not change application production source.
- **IMP-002**: The queue captures one job payload after `createCompilation`;
  tests then compile that payload and do not read the Draft graph again.
- **IMP-003**: Tests use only safe status and digest evidence. They must not
  record allocated ports, connection strings, credentials, request bodies, raw
  model material, or Docker logs.

## References

- **REF-001**: `docs/adr/adr-0013-transaction-command-v2-and-durable-receipt-lease.md`
- **REF-002**: `apps/control-plane/src/lifecycle.service.ts`
- **REF-003**: `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-4-review-package.md`
