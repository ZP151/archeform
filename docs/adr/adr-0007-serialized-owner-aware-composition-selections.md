---
title: "ADR-0007: Serialized Owner-Aware Composition Selections"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "application-graph", "capabilities", "serialization"]
supersedes: ""
superseded_by: ""
---

# ADR-0007: Serialized Owner-Aware Composition Selections

## Status

**Accepted**

## Context

**CTX-001**: ADR-0006 defines an unambiguous `domain.field` capability binding
as an object containing its owner entity symbol and `fieldKey`.

**CTX-002**: The Capability Binding Contract now validates and canonicalizes
that object, but `ApplicationGraphV1.integration.compositionSelections` only
serializes numbers, booleans, and `{ graphSymbol }`. Writing an owner-aware
binding back to a Draft would therefore fail Graph validation.

**CTX-003**: The owner-aware binding must remain part of the Draft Graph until
Publish creates an immutable composition lock. Deferring serialization to
package-specific code, inventing an owner from a field name, or accepting a
lock without its exact Published Graph would violate the Application Graph
source-of-truth and lifecycle boundaries.

**CTX-004**: Historic package versions, Published revisions, Graph hashes, and
composition locks are immutable evidence. Their inspection must not make them
eligible for new admission, Publish, or Compilation.

## Decision

**DEC-001**: `factory.application-graph/v1` serializes an additive
owner-aware Draft composition binding:

```ts
type SerializedCompositionBindingV1 =
  | number
  | boolean
  | { graphSymbol: string }
  | { graphSymbol: `graph.domain.${string}`; fieldKey: string };
```

**DEC-002**: Graph validation for the owner-aware form verifies only its
structural owner and field existence. The field symbol identifies an entity;
`fieldKey` must exist on that exact entity. Field scalar type, required,
unique, and manifest input-kind semantics remain Capability admission rules.

**DEC-003**: A new serialized-Graph task is inserted after the Capability
Binding Contract and before safe physical asset versions. It owns Graph schema,
parser, browser-entry, hashing, and regression tests. It does not expand the
Capability Binding Contract task.

**DEC-004**: Historic `{ graphSymbol }` Draft JSON remains readable without
rewriting. No code may infer an owner by scanning all entities or re-qualify an
unsafe historic field reference. Historic locks are inspection-only and cannot
be used as a Publish or Compilation admission fallback.

**DEC-005**: Published Graphs remain selection-free. The immutable composition
lock retains the exact bindings and digests them; Publish and Compiler
admission later validate the exact immutable Published Graph plus that lock.

## Consequences

### Positive

- **POS-001**: Drafts can persist the exact owner-aware data selected by the
  generic capability contract without an unsafe side channel.
- **POS-002**: Graph hashing changes when a new `fieldKey` changes, while an
  unchanged historic Graph retains its historic hash.
- **POS-003**: Browser and server consumers share one structural binding
  contract, preserving Graph portability.
- **POS-004**: New physical packages are not promoted before their required
  binding shape is representable in the source-of-truth Graph.

### Negative

- **NEG-001**: The hardening sequence gains a serialized Graph task and
  remains strictly serialized.
- **NEG-002**: Mixed pre-amendment Control Plane and Workbench deployments are
  unsupported during this internal schema correction.
- **NEG-003**: Graphs with old unqualified field selections require a new
  Draft revision and verified safe package selection before they can progress.

## Alternatives Considered

### Expand the Capability Binding Contract task

- **ALT-001**: Add Graph schema and parser changes to the current Capabilities
  task.
- **ALT-002**: Rejected because it merges two contract owners, invalidates the
  frozen task boundary, and obscures independent Graph review.

### Defer serialization to Draft admission

- **ALT-003**: Let a later Draft adapter translate field bindings without
  changing Graph serialization.
- **ALT-004**: Rejected because valid owner-aware selections cannot survive
  Draft persistence and the adapter would become an unauthorized source of
  truth.

### Infer owner from a globally matching field

- **ALT-005**: Search the DomainModel for a field key and infer its entity.
- **ALT-006**: Rejected because duplicate names are expected, and a scalar
  match cannot establish business semantics.

## Implementation Notes

- **IMP-001**: The inserted task may modify only `packages/graph/src/model.ts`,
  `packages/graph/test/application-graph.test.ts`, and
  `packages/graph/test/browser-entry.test.ts`.
- **IMP-002**: It must prove owner-aware round-tripping, wrong-model/wrong
  owner/missing-field rejection, duplicate field-key safety by owner,
  field-key-sensitive hashes, historic hash preservation, and browser-safe
  exports.
- **IMP-003**: It must not modify physical assets, registrations, Profile
  recipes, Publish, Compiler, Workbench, provider, deployment, or historic
  records.
- **IMP-004**: The later Publish/Compiler task receives the exact immutable
  Graph and composition lock; no lock-only admission overload is allowed.

## References

- **REF-001**: `docs/adr/adr-0006-typed-capability-binding-validation.md`
- **REF-002**: `docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`
- **REF-003**: `docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`
- **REF-004**: `docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`
