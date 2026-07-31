---
title: "ADR-0006: Typed Capability Binding Validation"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "application-graph", "capabilities", "security"]
supersedes: ""
superseded_by: ""
---

# ADR-0006: Typed Capability Binding Validation

## Status

**Accepted**

## Context

**CTX-001**: Capability compositions currently validate only that a
`graph.<model>.<identifier>` string exists. Domain entity keys and domain field
keys share one flattened namespace.

**CTX-002**: A semantically invalid but existing field, such as `price`, can
therefore satisfy a location-code or stock-field binding. The error can enter a
Draft, immutable composition lock, and compiler input.

**CTX-003**: This defect affects every present and future Profile. Per-Profile
checks do not scale to the planned capability and Profile portfolio.

**CTX-004**: Existing Golden package bytes, digests, historic locks, and
Published revisions must remain immutable.

## Decision

**DEC-001**: Adopt `factory.capability-binding/v1`, a manifest-owned typed
binding declaration interpreted by Factory's generic composition boundary.

**DEC-002**: A field binding is an explicit object containing its owning domain
entity symbol and `fieldKey`. A manifest `domain.field` input declares the
required `ownerBinding`, accepted scalar types, and optional required/unique
constraints.

**DEC-003**: A Graph-owned typed symbol index keeps entities, fields by owner,
pages, navigation entries, roles, flows, providers, and experience tokens in
separate namespaces. Graph stays independent of capability manifests.

**DEC-004**: The Capabilities package validates selected manifest inputs and
bindings at Draft composition, verified Publish lock creation, and compiler
admission. No validator may branch on Profile name, package version, field
name, source path, or output target.

**DEC-005**: Existing unsafe package versions remain historical evidence only.
New current recipes select verified safe versions:
`core.location-context@1.0.1`,
`commerce.inventory-ledger@1.0.1`, and
`commerce.inventory@2.0.0`.

## Consequences

### Positive

- **POS-001**: A composition lock represents an unambiguous entity-owned field
  reference rather than a globally ambiguous string.
- **POS-002**: The same validation protects all Profiles, generated targets,
  and future external capability adapters.
- **POS-003**: Invalid type/ownership bindings reject before Publish
  persistence or compiler output creation.
- **POS-004**: Duplicate common field keys such as `code`, `name`, `status`,
  and `stock` remain safe across independent entities.

### Negative

- **NEG-001**: Current profiles and three Golden package versions require a
  coordinated, digest-verified migration.
- **NEG-002**: Publish lock and compiler admission APIs must become
  Graph-aware.
- **NEG-003**: Historic package versions cannot be silently made current; a
  Draft must migrate through a new revision.

## Alternatives Considered

### Per-package and per-Profile validation

- **ALT-001**: Add checks for each field binding directly to Restaurant,
  Ecommerce, and future Profile validators.
- **ALT-002**: Rejected because every new package can recreate the same defect
  and semantic checks would grow linearly with Profiles.

### Global uniqueness or scalar inference

- **ALT-003**: Require globally unique field keys or infer correctness from
  scalar type alone.
- **ALT-004**: Rejected because a numeric price is not stock and a globally
  unique field still lacks owner semantics.

### Qualified field string grammar

- **ALT-005**: Replace existing symbols with a new
  `graph.domain.<entity>.<field>` grammar.
- **ALT-006**: Deferred because it broadens Graph and lock serialization. An
  explicit field binding object provides ownership without that migration.

## Implementation Notes

- **IMP-001**: `parameters` and `inputSchema` must agree on key and required
  state for every strict typed input.
- **IMP-002**: `domain.field` requires an entity owner binding and one or more
  allowed field scalar types.
- **IMP-003**: Changed physical manifests require new version roots, updated
  evidence/digests, fixture verification, and lock migration. Never alter an
  accepted `1.0.0` package in place.
- **IMP-004**: Publish and compiler gates receive the same immutable Graph and
  selected package locks used by Draft validation.

## References

- **REF-001**: `docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`
- **REF-002**: `docs/superpowers/plans/2026-07-30-commercial-capability-foundation.md`
- **REF-003**: `docs/superpowers/ledgers/2026-07-30-commercial-capability-foundation.md`
