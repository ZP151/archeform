<!--
Docs-only proposed ADR. This file grants no implementation, Product Publish,
deployment, release, or repository-delivery authority.
-->

# ADR-0073: Appointment Capability Patch Migration

## Status and recommendation

**Proposed.** Recommendation: **migrate** the unpublished Appointment
experiment from immutable capability asset `scheduling.appointment@1.0.0` to
`scheduling.appointment@1.0.1`. Preserve the complete `1.0.0` package and every
existing `1.0.0` composition lock byte for byte. Register and select only the
new patch for future Appointment Drafts, composition, and Compilation.

The patch corrects invalid generated TypeScript and makes the capability module
use the receipt shape already accepted by ADR-0071. It does not change the
`appointment-booking@1.0.0` compiler profile,
`factory.generated.appointment-command/v1`,
`factory.generated.appointment-receipt/v1`,
`factory.generated.appointment-history-entry/v1`, or their accepted semantics.

This proposal grants no implementation, definition registration, Product
Publish, Compilation, database rewrite, deployment, cloud action, commit, push,
or release authority. PM must record founder acceptance, directly or through
the standing independent-review policy, for this exact ADR SHA-256 before any
implementation authority changes. ADR-0071 and ADR-0072 remain unchanged.

## Context and authority

- **CTX-001**: ADR-0071 accepted `scheduling.appointment@1.0.0`, package root
  `packages/capabilities/assets/scheduling.appointment/1.0.0`, manifest digest
  `sha256:eb3f409908e2f4708a3523767a27a0d30ad4277f2c89827b97f9e379dc82738b`,
  and template digest
  `sha256:fb6eee400b408249e8054696176e21e6bc2580b393d5e8153da81587100083fd`.
  Its digest, templates, fixtures, contract test, and composition lock are
  immutable package evidence.
- **CTX-002**: ADR-0072 selects that exact coordinate and digest and requires
  any version or digest drift to fail closed. It authorizes no generated
  template or runtime change.
- **CTX-003**: Real preview verification found that the accepted template emits
  unquoted binding substitutions and a private stale receipt shape. The
  resulting capability module is invalid TypeScript and does not implement the
  ADR-0071 receipt fields supplied by the generated `ApplicationRuntime`.
- **CTX-004**: The PM ledger records no Appointment Product Publish and does not
  count Appointment as an accepted eighth product. There is therefore no
  authorized Published Appointment Graph, immutable Appointment Compilation,
  or Appointment database to rewrite. Discovery of any such artifact is a stop
  condition, not permission to mutate it.
- **CTX-005**: `docs/tech-governance.md` treats compiler targets, generated
  templates, stable identifiers, and compatibility contracts as governed
  changes. `docs/threat-model.md` requires fixed reviewed templates,
  digest-bound immutable inputs, and fail-closed package admission.

## Current and proposed profiles

- **CUR-001**: Keep `scheduling.appointment@1.0.0` and all files below its
  package root byte identical. Never recompute its manifest under corrected
  bytes, overwrite its template, or rewrite a lock that names its coordinate or
  digest.
- **CUR-002**: Keep the accepted Node, pnpm, TypeScript, Graph, binding,
  catalogue, composition, runtime, database, queue, Compose, and provider
  profile unchanged. Add no package, dependency, schema, migration, route,
  service, credential, or external call.
- **PRO-001**: Add physical asset `scheduling.appointment@1.0.1` at exactly
  `packages/capabilities/assets/scheduling.appointment/1.0.1` with template
  digest
  `sha256:99c497034fae967f68925a47f1e490f2f9ab0da6bd07206fb9065ea7d31b2cb7`
  and canonical manifest digest
  `sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7`.
- **PRO-002**: The `1.0.1` manifest differs from `1.0.0` only by `version`,
  `packageRoot`, the corrected template digest, and the resulting
  `manifestDigest`. Its key, lifecycle, binding contract, 17 typed inputs,
  effect, provided interface, output slots, parameters, fixture, contract test,
  fixture digest, contract-test digest, and license status remain exact.
- **PRO-003**: The corrected template differs only as needed to quote the 17
  bound string values, reuse the generated `AppointmentMutationReceipt`, read
  `responseBody`, save the already accepted receipt members `command`,
  `recordId`, `responseStatus`, `responseBody`, and `createdAt`, and satisfy
  strict TypeScript at the existing transaction/context boundaries. It adds no
  command, response field, error code, state transition, authorization rule,
  persistence field, or business behavior.

## Decision

- **MIG-001**: New Appointment planning and definition admission select exactly
  `scheduling.appointment@1.0.1` with the PRO-001 manifest digest. Version
  `1.0.0` is retained as immutable historical evidence and is not selected for
  a new Draft, plan, catalogue proposal, definition, or Compilation.
- **MIG-002**: The active Appointment lock witness contains the six unchanged
  core locks plus:

  ```text
  scheduling.appointment@1.0.1    sha256:d77a8ec2a8bcaba17510b7d6a7d073b26ccc6a2857fd6644c9d80700d672a9c7
  ```

  Missing, additional, duplicate, `1.0.0`, stale-digest, custom-catalogue, or
  non-Golden variants fail closed before rendering.

- **MIG-003**: This ADR supersedes only ADR-0072's exact Appointment capability
  coordinate and digest in PRO-002, LCK-002, LCK-005, BND-001, and the
  corresponding compiler admission constants and tests. Every other ADR-0072
  eligibility, binding, numeric-domain, private-module, package-export,
  compatibility, evidence, and stop condition remains in force.
- **MIG-004**: Keep compiler profile `appointment-booking@1.0.0` and all three
  `factory.generated.appointment-*/v1` identifiers. The patch makes generated
  code conform to those contracts; it does not revise them. Any semantic or
  serialized contract change requires a separately versioned proposal.
- **MIG-005**: Do not mutate a Published Graph, composition lock, Compilation,
  receipt, history record, or database. The unaccepted source definition may be
  regenerated before its first Publish so its new immutable composition uses
  `1.0.1`. No compatibility alias may reinterpret a `1.0.0` lock as `1.0.1`.

## Security, compatibility, and supply chain

- **SEC-001**: Receipt lookup remains after server authorization and uses the
  accepted scope, idempotency key, request hash, command, record ID, response
  status/body, and creation time. No raw request body, customer name, notes,
  cancellation reason, credential, prompt, or provider response enters
  evidence.
- **SEC-002**: The template and manifest digests are verified from physical
  package bytes before registration. A correctly named directory with another
  digest, an in-place `1.0.0` edit, or a custom catalogue entry fails closed.
- **CMP-001**: The seven previously accepted product definitions, plans,
  Graphs, locks, generated paths, generated bytes, and hashes remain byte
  identical. Only the unpublished Appointment candidate changes coordinate and
  generated bytes.
- **CMP-002**: `packages/capabilities/assets/scheduling.appointment/1.0.0` must
  retain its accepted component, adapter, fixture, contract, and template
  bytes. Its template and manifest digests remain the CTX-001 values.
- **CMP-003**: Package manifests, `pnpm-lock.yaml`, licenses, third-party
  notices, Graph/API/database schemas, migrations, and generated V1
  serialization identifiers remain unchanged.
- **CMP-004**: This pre-Publish migration has no data migration. If evidence
  finds a Published or compiled Appointment `1.0.0` artifact, stop and propose
  explicit dual-reader/compiler retention and product migration; do not delete,
  rewrite, or relabel the artifact.

## Evidence gates and verification commands

- **TST-001**: Hash every retained `1.0.0` file and compare it with source base
  `b8d796961b1ff68c7d5efa1a12fe353aa370eee8`. Independently prove its template
  and manifest digests equal CTX-001.
- **TST-002**: Verify the physical `1.0.1` package, template, manifest, fixture,
  contract test, adapter, and source registry agree exactly with PRO-001 and
  PRO-002. Recompute both SHA-256 values instead of trusting literals.
- **TST-003**: Compile the exact Appointment definition twice. Both locks must
  select `1.0.1`; Graph, plan, file ordering, and every output byte must be
  deterministic. Reject `1.0.0`, either stale digest, and custom-catalogue
  substitution before rendering.
- **TST-004**: Typecheck every generated Appointment API source file, including
  `api/src/capabilities/scheduling.appointment.ts`. Run claim, replay, confirm,
  release, move, conflict, authorization, history, and receipt persistence
  tests against the shared generated runtime contract.
- **TST-005**: Re-run ADR-0072's old-seven byte gate, numeric/lock adversarial
  matrix, dual-facade evidence, root-only compiler export gate, and complete
  capability verifier. Record the exact ADR-0073 hash and absence of Product
  Publish under
  `docs/acceptance/evidence/appointment-booking/capability-1.0.1/`.

Run from the repository root after acceptance and implementation:

```powershell
pnpm --filter @factory/capabilities exec vitest run test/appointment-scheduling.test.ts test/capability-registry.test.ts test/plan-alternatives.test.ts test/product-composer.test.ts test/composition-contract.test.ts
pnpm --filter @factory/adapters exec vitest run test/appointment-definition-admission.test.ts test/product-definition-data.test.ts test/requirement-interpreter.test.ts
pnpm --filter @factory/compiler exec vitest run test/appointment-booking-runtime.test.ts test/definition-data-compatibility.test.ts test/index-exports.test.ts
pnpm --filter @factory/graph --filter @factory/capabilities --filter @factory/adapters --filter @factory/compiler typecheck
pnpm --filter @factory/graph --filter @factory/capabilities --filter @factory/adapters --filter @factory/compiler build
node scripts/verify-product-definition-data.mjs
pnpm exec prettier --check packages/capabilities/assets/scheduling.appointment packages/capabilities/src packages/capabilities/test packages/adapters/src/requirements packages/adapters/test packages/compiler/src packages/compiler/test docs/adr/adr-0073-appointment-capability-patch-migration.md
```

Before implementation, the independent ADR reviewer must confirm the frozen
PRO-001 digest targets, report P0/P1 0/0, and return
`APPROVED_FOR_STANDING_ACCEPTANCE: yes` for this exact ADR hash before PM may
authorize the migration. After implementation, a separate implementation
reviewer independently recomputes both digests and confirms `1.0.0` byte
preservation before delivery may continue.

## Rollback and stop conditions

- **RBK-001**: Before the first `1.0.1` Appointment Publish, rollback removes
  the `1.0.1` package, registration, selection, definition changes, and lock
  constants and returns Appointment admission to RED. It does not reactivate
  the known-invalid `1.0.0` template for new compilation or alter `1.0.0`.
- **RBK-002**: After a `1.0.1` Publish, retain exact `1.0.1` readers, compiler,
  template, and lock support. Disabling new admission requires a new governed
  decision; historical content is never rewritten.
- **STP-001**: Stop if any `1.0.0` byte or digest changes, if any old-seven
  output changes, or if a lock is rewritten in place.
- **STP-002**: Stop if final candidate bytes do not recompute to both PRO-001
  digests. A digest change requires an ADR amendment and new exact-hash
  acceptance.
- **STP-003**: Stop if the correction changes a generated V1 contract, public
  route, request/response semantics, persistence schema, migration, atomicity,
  authorization, tenant boundary, package dependency, or runtime topology.
- **STP-004**: Stop if any Appointment `1.0.0` Product Publish, Compilation, or
  database is discovered, or if rollback would destroy or reinterpret data.

## Consequences and alternatives

- **POS-001**: A content-addressed patch restores buildable generated output
  while preserving immutable evidence and accepted business semantics.
- **NEG-001**: Catalogue, definition, lock, and compiler admission literals
  must migrate together, increasing the focused compatibility surface.
- **ALT-001**: **Rejected — edit `1.0.0` in place.** The same stable coordinate
  would identify two template and manifest byte sets, invalidating accepted
  locks and digest-based admission.
- **ALT-002**: **Rejected — keep `1.0.0` and patch generated files after
  compilation.** This bypasses fixed-template provenance and makes compilation
  output depend on an untracked repair step.
- **ALT-003**: **Rejected — bump the generated receipt contract to V2.** The
  candidate restores the accepted V1 receipt contract and adds no semantic
  member; a V2 migration would add unnecessary API, persistence, and reader
  scope.

## Ownership

- **OWN-001**: Tech Lead owns this proposed decision and any digest amendment.
- **OWN-002**: PM owns exact-hash acceptance, confirmation that no Appointment
  Product Publish exists, serialized implementation assignment, evidence, and
  stop-condition enforcement.
- **OWN-003**: The implementation owner may add the exact `1.0.1` package and
  update only Appointment registry, catalogue, planner, definition, lock,
  compiler admission, and focused evidence/test paths. The `1.0.0` package,
  unrelated products, templates, schemas, migrations, and lockfile are frozen.
- **OWN-004**: An independent reviewer verifies digest provenance, immutable
  `1.0.0`, contract equivalence, generated typecheck/runtime evidence, old-seven
  compatibility, and exact ADR conformance before PM authorization.

## References

- `docs/adr/adr-0071-atomic-appointment-booking.md`
- `docs/adr/adr-0072-appointment-definition-composition-admission.md`
- `docs/tech-governance.md`
- `docs/threat-model.md`
- `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`
