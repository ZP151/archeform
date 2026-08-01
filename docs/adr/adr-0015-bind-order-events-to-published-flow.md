---
title: "ADR-0015: Bind Order Events to the Published Flow"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "flow", "generated-applications"]
supersedes: "ADR-0013 DEC-002 only for commerce.order@2.1.0 fixed event vocabulary"
superseded_by: ""
---

# ADR-0015: Bind Order Events to the Published Flow

## Status

**Accepted**

## Context

**CTX-001**: Task 3 proved generated Prisma and strict TypeScript for all
three direct V2 Generic Profiles. Its generated Simple Ecommerce journey
passes, but Retail Counter fails on `issue-receipt`, and Grocery Pickup fails
on `pick` before reaching `ready` and `handoff`.

**CTX-002**: The immutable `commerce.order@2.1.0` transaction adapter accepts
only `submit`, `confirm`, `cancel`, and `fulfill`. However, its declared
profiles bind distinct Published Flow event sets, including `pay`,
`issue-receipt`, `pick`, `ready`, and `handoff`.

**CTX-003**: ADR-0013 requires the lock-bound operation adapter to validate
the event and requires journeys to derive events from exact bindings. A
Profile-name compiler alias, an arbitrary caller-provided allowlist, or a
shortened generated journey would violate those requirements.

## Decision

**DEC-001**: Preserve `commerce.order@2.1.0` byte-for-byte as an audit asset
and revoke it from new Generic V2 composition and verified publication. No
default Draft or Published Graph currently selects it.

**DEC-002**: Publish `commerce.order@2.1.1` as a controlled Factory-owned
successor. It exports a package-owned adapter factory that receives only the
event names compiled from its exact, immutable `orderFlow` binding. The
factory returns the runtime adapter that validates API event input against that
frozen declared-event set.

**DEC-003**: The compiler resolves the exact bound Flow ID from the selected
2.1.1 order package and embeds that Flow's declared events into generated code.
It does not branch on a Profile name, translate event names, or let a caller
supply/extend the allowlist. The Flow still validates the current state,
transition, roles, and effects; the package validates only membership in the
bound Flow event vocabulary.

**DEC-004**: Direct Generic V2 composition requires the exact pair
`commerce.transaction@2.2.1` and `commerce.order@2.1.1`. Historical/default
locks remain unchanged. Task 4 activation remains gated on Task 3 generated
project evidence and live PostgreSQL acceptance.

## Consequences

### Positive

- **POS-001**: One reusable order package supports the full declared Flow
  vocabulary for ecommerce, retail, grocery pickup, and future bounded order
  Profiles without per-Profile runtime code.
- **POS-002**: The Graph remains the authority for event names while the
  package remains the authority for request validation and command construction.
- **POS-003**: API callers cannot introduce an undeclared event or alter the
  compiled allowlist.

### Negative

- **NEG-001**: Another immutable package successor and explicit revocation
  rule increase catalog/version maintenance.
- **NEG-002**: Generated source must carry a compact published-Flow event
  projection, which requires focused contract and output validation.

## Alternatives Considered

### Add Profile-specific aliases in the compiler

- **ALT-001**: Map `issue-receipt` or `pick` to the four existing order terms.
- **ALT-002**: Rejected because it makes profile vocabulary implicit and loses
  the actual Flow event in audit/transaction evidence.

### Accept all caller event strings

- **ALT-003**: Remove event membership validation from the package.
- **ALT-004**: Rejected because the adapter would no longer validate the
  lock-bound operation boundary and callers could target undeclared events.

### Mutate order 2.1.0 in place

- **ALT-005**: Replace the fixed union with binding-derived validation under
  the existing version.
- **ALT-006**: Rejected because immutable package bytes and digest evidence
  must remain replayable.

## Implementation Notes

- **IMP-001**: The successor factory accepts only a non-empty, de-duplicated,
  bounded array of Flow events generated from a Published Graph. It freezes the
  set and rejects unknown API event input.
- **IMP-002**: Generate the array from the exact `orderFlow` lock binding; fail
  compilation if the binding does not resolve to one Flow with declared events.
- **IMP-003**: Update component/adapter/projection digests, canonical registry,
  composition compatibility, verified publication, compiler contribution
  selection, and generated journey tests together.

## References

- **REF-001**: `docs/adr/adr-0013-transaction-command-v2-and-durable-receipt-lease.md`
- **REF-002**: `docs/adr/adr-0014-reissue-postgres-safe-transaction-v2-asset.md`
- **REF-003**: Task 3 report at
  `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-3-report.md`
