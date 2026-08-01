---
title: "ADR-0016: Reissue a Strict-Type-Safe Order Adapter"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "typescript", "generated-applications"]
supersedes: ""
superseded_by: ""
---

# ADR-0016: Reissue a Strict-Type-Safe Order Adapter

## Status

**Accepted**

## Context

**CTX-001**: ADR-0015 published `commerce.order@2.1.1`, whose adapter factory
freezes the exact Published Flow event set. This correctly prevents a caller
from widening the package-owned event boundary.

**CTX-002**: Clean generated-project validation invokes each generated API's
own strict TypeScript command. The 2.1.1 adapter template fails with TS7006 on
the factory-returned `createStore` and `present` method parameters.

**CTX-003**: The preceding 2.1.0 template assigned its object literal directly
to a `TransactionOperationAdapterV2` variable, which contextually typed its
method parameters. In 2.1.1, `Object.freeze({ ... })` infers the object before
the factory return type can provide that contextual typing. This is a
digest-covered, Factory-owned package defect, not a compiler emission defect.

## Decision

**DEC-001**: Preserve `commerce.order@2.1.1` byte-for-byte as an audit asset
and revoke it from new direct Generic V2 composition and verified publication.

**DEC-002**: Publish `commerce.order@2.1.2` as the only direct Generic V2
order successor paired with `commerce.transaction@2.2.1`. The successor keeps
the same bound-Flow event semantics as 2.1.1.

**DEC-003**: The 2.1.2 template constructs an explicitly typed
`TransactionOperationAdapterV2<CommerceOrderTransactionRequestV2,
CommerceOrderTransactionContextV2, OrderTransitionReceipt>` before freezing
it. Its `createStore` and `present` parameters carry explicit source types;
the returned frozen adapter remains structurally conformant without an `any`,
suppression, compiler rewrite, or relaxed generated-project TypeScript policy.

**DEC-004**: Package evidence must include a regression that materialises the
adapter template through the generated-project strict TypeScript path. Task 3
may resume only after the exact 2.2.1/2.1.2 pair passes package, compiler, and
generated-project validation.

## Consequences

### Positive

- **POS-001**: Generated applications retain strict TypeScript as a release
  gate, so package source cannot silently rely on compiler test coverage alone.
- **POS-002**: The immutable adapter keeps the exact Published Flow boundary
  introduced by ADR-0015 without Profile-specific code or event aliases.
- **POS-003**: The fix is local to a new versioned package and preserves all
  historical digests and replayability.

### Negative

- **NEG-001**: The catalogue acquires another revocation and successor pairing
  that composition and verified publication must enforce.
- **NEG-002**: Task 3 remains blocked until the successor's package and
  generated-output evidence are independently reviewed.

## Alternatives Considered

### Relax the generated project's TypeScript gate

- **ALT-001**: Use `skipLibCheck`, implicit-any suppression, or a less strict
  generated `tsconfig`.
- **ALT-002**: Rejected because it would hide a component contract defect and
  degrade every generated application.

### Type only the compiler-emitted copy

- **ALT-003**: Rewrite the emitted 2.1.1 source in the compiler.
- **ALT-004**: Rejected because the digest-covered package, not the compiler,
  owns its source and interface.

### Mutate 2.1.1 in place

- **ALT-005**: Edit the existing template and refresh its digest.
- **ALT-006**: Rejected because published package bytes must remain immutable.

## Implementation Notes

- **IMP-001**: Create a complete `commerce.order/2.1.2` physical root and
  typed asset projection, then refresh manifest, adapter, contribution, and
  evidence digests together.
- **IMP-002**: Make direct V2 composition reject 2.1.1 with the exact strict
  TypeScript revocation reason and accept only 2.2.1/2.1.2.
- **IMP-003**: Add a focused test that proves the frozen factory emits strict
  TypeScript without diagnostics and retains the bound-Flow membership check.

## References

- **REF-001**: `docs/adr/adr-0013-transaction-command-v2-and-durable-receipt-lease.md`
- **REF-002**: `docs/adr/adr-0015-bind-order-events-to-published-flow.md`
- **REF-003**: `.superpowers/sdd/2026-08-01-transaction-command-v2-durable-receipts/task-3-report.md`
