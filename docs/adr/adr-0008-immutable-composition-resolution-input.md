---
title: "ADR-0008: Immutable Composition Resolution Input Boundary"
status: "Accepted"
date: "2026-08-01"
authors: "Factory Controller"
tags: ["architecture", "capabilities", "security", "composition"]
supersedes: ""
superseded_by: ""
---

# ADR-0008: Immutable Composition Resolution Input Boundary

## Status

**Accepted**

## Context

**CTX-001**: Capability composition turns untrusted Draft selections and
package manifests into an immutable, digest-covered composition lock. A lock
may later authorize Published Graph compilation; it therefore must be derived
from one coherent input value.

**CTX-002**: Independent review found repeated reads of caller-owned records,
arrays, manifests, selections, parameters, and field-type arrays. Accessors,
prototype-supplied values, sparse arrays, and mutating values could make
validation observe a different value from canonicalization.

**CTX-003**: TypeScript `readonly` is not runtime ownership. JSON cloning,
`structuredClone`, freezing caller values, and schema parsing after arbitrary
property reads do not establish a descriptor-level no-reread boundary.

**CTX-004**: This boundary is required before Factory can safely automate
external Candidate intake or promote reusable capability packages. It does not
authorize a Candidate, Provider, source copy, physical package change, or
Profile behavior change.

## Decision

**DEC-001**: Every public capability-composition and lock-creation entry point
must first call `captureResolutionInputV1`. No matching, validation,
normalization, sorting, dependency resolution, canonicalization, or hashing
may read the original caller-owned input afterward.

**DEC-002**: Capture uses property descriptors, not ordinary property access.
Accepted records have `Object.prototype` or `null` prototype, only own
enumerable string-keyed data properties, and no accessors or symbols. Accepted
arrays have `Array.prototype`, dense own data indices `0..length-1`, no extra
properties, no inherited holes, and no accessors or symbols.

**DEC-003**: Capture recursively creates null-prototype records and dense
arrays, freezes the owned result, captures a shared object only once, and
rejects cycles. It captures every composition-bearing selection, lock, binding,
manifest, parameter, field-type array, interface, and contribution needed by
resolution.

**DEC-004**: Internal composition functions accept opaque owned snapshot types
only. A manifest contract is compiled once into immutable parameter and binding
maps; binding normalization and lock canonicalization consume that same map.

**DEC-005**: Valid ordinary JSON keeps the existing
`factory.capability/v1`, `factory.capability-binding/v1`, and
`factory.composition/v1` serialized formats and byte-identical lock digests.
Exotic input newly fails closed before any output is produced.

## Consequences

### Positive

- **POS-001**: Validation and immutable lock hashing operate over the same
  owned data, eliminating repeated-read time-of-check/time-of-use gaps.
- **POS-002**: Candidate Intake can evaluate third-party manifests without
  accepting prototype, accessor, sparse-array, or symbol-keyed semantics.
- **POS-003**: Composition internals gain explicit runtime ownership types
  instead of relying on structural `readonly` types.

### Negative

- **NEG-001**: The resolver performs a bounded deep capture before normal
  composition work and must meet a measured performance budget.
- **NEG-002**: Some previously accepted exotic JavaScript values now reject;
  only ordinary JSON is a supported public input form.
- **NEG-003**: This is a serialized shared-contract task. Profile and physical
  asset work remains blocked until it is independently accepted.

## Alternatives Considered

### Continue local validation patches

- **ALT-001**: Add more own-property and accessor checks where each review
  witness appears.
- **ALT-002**: Rejected because every raw reread creates another trust boundary
  and prior local repairs exposed further unowned array and manifest reads.

### Freeze or clone caller objects

- **ALT-003**: Freeze the caller input or use JSON/structured cloning.
- **ALT-004**: Rejected because this either mutates caller state or can observe
  accessors before validation, while losing the required descriptor policy.

### Parse with a schema library only

- **ALT-005**: Apply Zod after current resolver reads.
- **ALT-006**: Rejected because parsing does not prevent earlier or later raw
  reads from observing different object behavior.

## Implementation Notes

- **IMP-001**: Create private opaque `ResolutionInputSnapshotV1`,
  `ManifestSnapshotV1`, `SelectionSnapshotV1`, and
  `ValidatedManifestContractV1` types in
  `packages/capabilities/src/composition.ts`.
- **IMP-002**: Exported validation wrappers capture once for their own call;
  full composition captures once and calls snapshot-only internal validators.
- **IMP-003**: Preserve semantic error messages after capture. Boundary errors
  expose a stable error code and path, never raw input content.
- **IMP-004**: The initial implementation may modify only
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- **IMP-005**: No compatibility fallback, manifest rewrite, external source
  download, Provider activation, Profile dispatch, or Graph serialization work
  belongs to this ADR.

## Verification

- **VER-001**: Accessors for every captured record or array have zero getter
  invocations and fail before a lock is created.
- **VER-002**: Prototype-supplied record properties, inherited array holes,
  sparse arrays, symbols, custom prototypes, extra array properties, and cycles
  fail closed.
- **VER-003**: A changing manifest getter cannot make binding validation and
  canonical lock data diverge.
- **VER-004**: Existing valid Golden compositions and frozen lock digest
  vectors remain byte-identical; 1,000 identical resolutions retain one digest
  with p95 at or below 20 ms on Node 22.11.0.
- **VER-005**: Capabilities and Compiler test, typecheck, lint, and build gates
  pass on Node 22.11.0 before downstream Task 3 resumes.

## References

- **REF-001**: `docs/adr/adr-0006-typed-capability-binding-validation.md`
- **REF-002**: `docs/adr/adr-0007-serialized-owner-aware-composition-selections.md`
- **REF-003**: `docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`
- **REF-004**: `docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`
