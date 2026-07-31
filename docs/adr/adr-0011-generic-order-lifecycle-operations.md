---
title: "ADR-0011: Generic Order Lifecycle Operations"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "transactions"]
supersedes: ""
superseded_by: ""
---

# ADR-0011: Generic Order Lifecycle Operations

## Status

**Accepted**

## Context

**CTX-001**: ADR-0010 introduced an immutable transaction operation adapter
for a transition of an existing aggregate. The current
`commerce.order@1.3.2` correctly provides that adapter, but it intentionally
does not provide the historical order-create handler.

**CTX-002**: Generic Commerce Profiles require both `order.create` and
`order.transition`. Moving their locks from `commerce.order@1.2.0` to
`1.3.2` therefore makes legacy create behaviour unavailable. Mapping Graph
effects to an internal `order.transaction.prepare` effect hides the missing
business operation and makes the Graph no longer describe the product.

**CTX-003**: Keeping `commerce.order@1.2.0` as a second sidecar package beside
the V2.1 transaction adapter would create competing ownership of the same
order lifecycle and permit a transition bypass outside the atomic executor.

**CTX-004**: Existing package roots, manifests, digests, and Published locks
remain immutable. Restaurant retains its historical Profile path until its own
typed lifecycle operation package and generated runtime migration are proven.

## Decision

**DEC-001**: Publish a new immutable `commerce.order@2.0.0` package. It is
the sole Generic Commerce order-lifecycle provider for new Draft recipes and
retains `commerce.order-event@v1`.

**DEC-002**: `commerce.order@2.0.0` provides two distinct, digest-covered
interfaces:

```text
factory.order-create-handler/v1
factory.transaction-operation-adapter/v1
```

The create handler owns only validated initial order creation. The operation
adapter owns only transition parsing, preparation, transaction-scoped Store
creation, and presentation. `order.transition` must always follow
`parse -> prepare -> createStore -> executor.execute -> present` through
`commerce.transaction@2.1.0`.

**DEC-003**: The Graph retains public business effects `order.create` and
`order.transition`. Internal adapter-stage names cannot replace those Graph
effects, Profile recipes, or policy semantics.

**DEC-004**: The compiler resolves both interfaces only from the exact
Published composition lock, contribution identity, digest, bindings, and
dependency order. It must not branch on a Profile name, mutable Draft,
arbitrary request data, source path, or selected package version special-case.

**DEC-005**: New Generic Commerce Draft recipes select exactly
`commerce.transaction@2.1.0` and `commerce.order@2.0.0`. Restaurant remains
on its historical V1 recipe during the separate Restaurant migration. Rollback
for a new uncompiled Draft is an explicit re-composition to V1 plus
`commerce.order@1.2.0`; existing Published locks continue to replay unchanged.

## Consequences

### Positive

- **POS-001**: Order creation and transitions have one versioned lifecycle
  owner without losing a required Graph business effect.
- **POS-002**: Generic Ecommerce, Retail Counter, and Grocery Pickup can use
  the same atomic transition path while retaining a bounded order-create
  implementation.
- **POS-003**: The compiler can prove which exact package owns create versus
  transition behaviour and reject missing, duplicate, incompatible, or
  tampered contributions before output.

### Negative

- **NEG-001**: One additional immutable capability package and a serialized
  contract/compiler migration are required before Generic Commerce can report
  V2.1 transaction readiness.
- **NEG-002**: Historical order handler tests must remain as V1 replay
  evidence while new V2 tests prove the two-interface lifecycle path.
- **NEG-003**: Restaurant cannot use this Generic package as a substitute for
  its typed table, line, payment, and cancellation operation boundary.

## Alternatives Considered

### Retain `commerce.order@1.2.0` beside the transition adapter

- **ALT-001**: Select the historical order handler for creation and
  `commerce.order@1.3.2` for transitions.
- **ALT-002**: Rejected because two versions would own the same lifecycle,
  create provider/effect ambiguity, and leave an easy direct transition
  bypass.

### Replace public Graph effects with an adapter-stage effect

- **ALT-003**: Remap `order.create` and `order.transition` to
  `order.transaction.prepare` in Profile recipes.
- **ALT-004**: Rejected because an internal compilation stage is not a
  business capability; the Graph would no longer communicate or validate the
  product's actual lifecycle.

### Expand the transaction core to create aggregates

- **ALT-005**: Add aggregate creation to `commerce.transaction@2.1.0`.
- **ALT-006**: Deferred because it changes the shared executor's boundary
  before the narrow Generic order lifecycle proves its contract. The bounded
  order-create handler is sufficient for this migration.

## Implementation Notes

- **IMP-001**: Add the `factory.order-create-handler/v1` manifest and
  executable contribution contract in the serialized capability-contract
  slice. The package owns strict request parsing, fixture, journey, adapter,
  and physical evidence for initial order status/version.
- **IMP-002**: The Generic compiler slice resolves one V2.1 executor, one
  transaction operation adapter, and one order-create handler from the same
  immutable lock. It retains other locked Catalog, Cart, Inventory, Payment,
  and line-configuration handlers.
- **IMP-003**: Generated output must import and execute the V2 create handler
  for creation and the V2.1 executor pipeline for transitions. Active Prisma
  schema/migrations and generated TypeScript tests are required evidence.
- **IMP-004**: A separate Restaurant implementation must introduce its own
  lifecycle operation boundary. It cannot be silently selected through this
  Generic package.

## Verification

- **VER-001**: Generic Profile locks contain exact
  `commerce.transaction@2.1.0` and `commerce.order@2.0.0` identities, digests,
  bindings, and exactly one transaction operation provider.
- **VER-002**: Creation delegates only to the locked create handler; all
  transitions delegate only to the V2.1 executor pipeline, with no controller
  or legacy transition-handler bypass.
- **VER-003**: Generic generated tests cover initial status/version,
  idempotent replay, changed-payload rejection, pending duplicate, stale
  version, rollback of aggregate/inventory/audit/outbox/receipt effects,
  active schema/migration, and generated TypeScript imports for all three
  Generic Commerce Profiles.
- **VER-004**: Missing, multiple, wrong-version, wrong-digest, or incompatible
  lifecycle contributions fail before output. Historical V1 locks remain
  replayable and Restaurant V1 remains unaffected.

## References

- **REF-001**: `docs/adr/adr-0009-executable-transaction-adapter-contract.md`
- **REF-002**: `docs/adr/adr-0010-profile-transaction-operation-adapters.md`
- **REF-003**: `docs/superpowers/plans/2026-08-01-profile-transaction-operation-adapters.md`
