---
title: "ADR-0014: Reissue PostgreSQL-safe Transaction V2 Asset"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "postgresql", "package-lifecycle"]
supersedes: "ADR-0013 DEC-001 only for the defective commerce.transaction@2.2.0 successor selection"
superseded_by: ""
---

# ADR-0014: Reissue PostgreSQL-safe Transaction V2 Asset

## Status

**Accepted**

## Context

**CTX-001**: Task 3 ran the generated API package's own `prisma generate`
command for Simple Ecommerce, Retail Counter, and Grocery Pickup. All three
failed deterministically with Prisma P1012 because
`CommerceTransactionReceipt_aggregateType_aggregateId_aggregateVersion_idx`
is 73 bytes, exceeding PostgreSQL's 63-byte identifier limit.

**CTX-002**: The invalid name is emitted by the Golden
`commerce.transaction@2.2.0` package's schema and migration contributions.
The compiler parity check correctly requires the same index name in both
assets, so a compiler rewrite would conceal rather than repair the defective
package.

**CTX-003**: No Published Graph or default Generic Draft recipe selects
`commerce.transaction@2.2.0`; Task 4 activation is still gated on generated
and live PostgreSQL acceptance. The physical 2.2.0 package must remain
available as immutable diagnostic evidence.

## Decision

**DEC-001**: Preserve `commerce.transaction@2.2.0` byte-for-byte and mark it
non-selectable for new composition or verified publication. The canonical
registry rejects a requested `commerce.transaction@2.2.0` lock with a stable
revocation reason.

**DEC-002**: Publish a new internal successor
`commerce.transaction@2.2.1`, retaining the V2 interfaces and all Task 2
behavior but replacing the invalid receipt aggregate index map name with the
same explicit PostgreSQL-safe identifier in both schema and migration. The
identifier must be ASCII and at most 63 bytes.

**DEC-003**: A direct Generic V2 selection requires
`commerce.transaction@2.2.1` with `commerce.order@2.1.0`. This does not
activate V2 in default Draft recipes and does not modify historical locks.

**DEC-004**: Package verification must calculate and reject schema or SQL
index names over PostgreSQL's 63-byte maximum. Task 3 resumes only after the
successor passes this static package check; its generated-package typecheck
continues to be the integration proof.

## Consequences

### Positive

- **POS-001**: Known-invalid package bytes stay auditable while every future
  composition fails closed rather than emitting an unusable application.
- **POS-002**: The fix remains package-owned; the compiler does not acquire a
  hidden schema rewrite or Profile-specific exception.
- **POS-003**: Static name validation prevents the same PostgreSQL limit from
  reaching generated-output acceptance again.

### Negative

- **NEG-001**: The capability catalog contains an additional patch version
  and an explicit revocation rule.
- **NEG-002**: Task 3 must restart its generated-output verification against
  2.2.1, extending the delivery path by one review cycle.

## Alternatives Considered

### Mutate `commerce.transaction@2.2.0` in place

- **ALT-001**: Replace the index name and refresh its digest under 2.2.0.
- **ALT-002**: Rejected because an existing versioned Golden package must not
  silently change after a defect is discovered.

### Rewrite the schema in the compiler

- **ALT-003**: Shorten the index name only at emission time.
- **ALT-004**: Rejected because it makes the package manifest, schema, SQL,
  and compiled output disagree and conceals a package defect.

### Ignore the identifier limit during generated validation

- **ALT-005**: Skip Prisma generation or use a looser generated typecheck.
- **ALT-006**: Rejected because the emitted package must be runnable on its
  declared PostgreSQL target.

## Implementation Notes

- **IMP-001**: Copy only Factory-owned 2.2.0 source into the new 2.2.1 package
  as a controlled successor, then update all contribution and manifest digests.
- **IMP-002**: Add 2.2.1 to the canonical registry, direct-composition
  compatibility rules, and tests. Retain 2.2.0 solely for immutable audit
  lookup; reject it before selection or verified publication.
- **IMP-003**: Verify schema/migration name equality, ASCII encoding, and
  every emitted explicit PostgreSQL index map name's byte length.

## References

- **REF-001**: `docs/adr/adr-0013-transaction-command-v2-and-durable-receipt-lease.md`
- **REF-002**: Task 3 deterministic P1012 report at
  `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-3-report.md`
- **REF-003**: PostgreSQL identifier length limit, 63 bytes.
