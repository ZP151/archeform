---
title: "ADR-0012: Bounded Generic Order Creation Handler"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "commerce", "authorization"]
supersedes: ""
superseded_by: ""
---

# ADR-0012: Bounded Generic Order Creation Handler

## Status

**Accepted**

## Context

**CTX-001**: ADR-0011 established that a Generic Commerce lifecycle package must provide both order creation and transaction-bound transition operations. The first registered commerce.order version 2.0.0 create template accepts only an order identifier and returns a fabricated in-memory draft.

**CTX-002**: A generated runtime.create(role, entityKey, input) cannot delegate to that callback without a compiler bypass. The template neither validates the role/entity/input envelope nor performs Factory-governed authorization or persistence.

**CTX-003**: Passing a general record store or unrestricted authorizer into a capability package would let it write a different entity or request a broader action than the published Graph lock allows.

**CTX-004**: commerce.order 2.0.0 is registered but not selected by a Published Generic Profile and has no accepted compiler output. Its immutable bytes remain replayable evidence but must not be newly selected.

## Decision

**DEC-001**: Publish commerce.order 2.0.1 as the first admissible factory.order-create-handler v1 provider for new Generic Commerce recipes. It retains the 2.0.0 transaction-operation adapter and order-event provider identity but replaces the create contribution and all affected digest-covered evidence.

**DEC-002**: The create handler has this closed boundary:

~~~ts
type OrderCreateRequestV1 = Readonly<{
  role: string;
  entityKey: string;
  input: Readonly<Record<string, unknown>>;
}>;

interface OrderCreateStoreV1 {
  createInitial(input: Readonly<Record<string, unknown>>): Promise<CreatedOrderV1>;
}

interface OrderCreateAuthorizerV1 {
  assertCreateAllowed(role: string): Promise<void>;
}

interface OrderCreateHandlerV1 {
  create(
    request: OrderCreateRequestV1,
    dependencies: Readonly<{
      store: OrderCreateStoreV1;
      authorizer: OrderCreateAuthorizerV1;
    }>,
  ): Promise<CreatedOrderV1>;
}
~~~

**DEC-003**: The compiler creates both dependencies from exact Published Graph bindings. The Store is bound to one locked order entity and its Graph flow initial state; the Authorizer is bound to that entity's create permission. They expose no arbitrary entity, action, query, endpoint, or provider access.

**DEC-004**: The handler rejects malformed role/entity/input, a mismatched entity, and caller-controlled id, status, or version before dependency calls. It authorizes once before persisting once, returns a frozen persisted record, and never constructs a synthetic order or falls back to in-memory state.

## Consequences

### Positive

- **POS-001**: Generated Generic applications delegate real creation, authorization, initial-state selection, and persistence through a lock-governed package boundary.
- **POS-002**: The package cannot use a general store to escape its selected Graph entity or use a general authorizer to request a different action.
- **POS-003**: Ecommerce, Retail Counter, and Grocery Pickup can validate the same handler contract while using remapped entities and flow initial states.

### Negative

- **NEG-001**: commerce.order 2.0.1 requires new physical evidence, fixture, source, manifest, and contribution digests; 2.0.0 remains a non-admissible historical package.
- **NEG-002**: The Generic compiler must implement two generated entity/action-bound adapters before it can select the 2.0.1 package.
- **NEG-003**: Restaurant still requires its separate typed lifecycle migration and cannot use this Generic handler as an implicit substitute.

## Alternatives Considered

### Return an initial-record intent

- **ALT-001**: Let the package validate input and return an object for the compiler to persist.
- **ALT-002**: Rejected because the package would not actually own the declared create-handler operation and compiler persistence would become a hidden bypass.

### Pass a general record store and general authorizer

- **ALT-003**: Reuse existing generic persistence and authorization callbacks.
- **ALT-004**: Rejected because a package could write other Graph entities or request arbitrary permission decisions.

### Edit commerce.order 2.0.0

- **ALT-005**: Correct the existing create template and manifest in place.
- **ALT-006**: Rejected because package evidence, digest, and historical replayability are immutable.

## Implementation Notes

- **IMP-001**: The 2.0.1 fixture includes a complete request envelope and Store-produced expected record. Tests prove authorization-before-write, exactly-once persistence, server-generated ID, Graph initial state, version zero, wrong-entity rejection, caller-controlled field rejection, and zero-write failure cases.
- **IMP-002**: New Generic composition locks select transaction 2.1.0 and order 2.0.1 only. Restaurant remains historical.
- **IMP-003**: The generated runtime adapts its validated create(role, entityKey, input) call to the bounded dependencies. Transition continues to use the exact V2.1 executor pipeline.

## Verification

- **VER-001**: The package verifier confirms physical evidence, single terminal newline, and exact contribution digests for 2.0.1; 2.0.0 bytes are unchanged.
- **VER-002**: Generated Generic runtimes for Ecommerce, Retail Counter, and Grocery Pickup prove store persistence, subsequent read visibility, remapped entity binding, and initial state/version behavior.
- **VER-003**: Missing/duplicate/wrong provider, wrong entity, malformed envelope, caller-controlled server fields, and authorization denial fail before unsafe persistence; historical V1 locks remain replayable.

## References

- **REF-001**: docs/adr/adr-0009-executable-transaction-adapter-contract.md
- **REF-002**: docs/adr/adr-0010-profile-transaction-operation-adapters.md
- **REF-003**: docs/adr/adr-0011-generic-order-lifecycle-operations.md
- **REF-004**: Independent review of commit 0d75e0a, 2026-08-01.
