---
title: "ADR-0077: Historical Booking Compiler Admission"
status: "Proposed"
date: "2026-09-24"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "compatibility", "appointment"]
supersedes: ""
superseded_by: ""
---

# ADR-0077: Historical Booking Compiler Admission

## Status and recommendation

**Proposed.** Recommendation: **keep** the accepted TypeScript compiler and
restore its historical generic booking output through one bounded private
admission exception. Keep current Appointment admission fail-closed. This
proposal defines compatibility behavior and requires independent standing
acceptance and PM authorization before implementation. It grants neither.

## Context and authority

- **CTX-001**: ADR-0071 PRO-002 preserves old generated output. ADR-0072
  FAC-001..005 requires a complete lock-bound Appointment witness and forbids
  malformed Appointment falling through to generic output. ADR-0073 changes
  the accepted capability to `scheduling.appointment@1.0.1`; it does not relax
  those requirements. `docs/tech-governance.md` and `docs/threat-model.md`
  remain the technology and security authorities.
- **CTX-002**: Commit `156165936` added a rejection whenever an undefined
  Appointment profile accompanies entities named `service`, `schedule`, and
  `appointment`. This rejects the existing TypeScript generic booking fixture
  even though it has no Appointment capability or numeric domains. The focused
  Task compatibility test reproduced the failure on Node `v22.23.2` at
  `appointment-compilation-admission.ts:78`.
- **CTX-003**: Read-only source-function probes show that deleting the name
  condition also allows current Appointment with its capability lock and both
  numeric domains removed through both admission predicates. Removing only
  the lock remains rejected by the Approval numeric selector. Single-mutation
  coverage is therefore insufficient.
- **CTX-004**: The historical authority is
  `packages/compiler/test/fixtures/approval-legacy.ts`, specifically
  `approvalLegacyFixtures.booking.input`, captured from
  `92f21089beeb184a236a1512cb4c1866f158e903`. The retained fixture file SHA-256
  is `0fef3e089a838e38091da2e78910ae460e21834eda18a12ffb272b27757a1614`.
  Its generated manifest and bundle hashes remain immutable. This is existing
  TypeScript behavior, not compatibility with archived Python or legacy console.

## Current and proposed contracts

- **PRO-001**: Keep `factory.application-graph/v1`, capability and composition
  serialization, all generated identifiers, runtime/API/schema behavior, and
  Draft -> Publish -> immutable Compilation. Keep the accepted Golden profile
  and exact tracked manifest/lockfile versions; add no dependency, framework,
  provider, package version, template, migration, or compiler target.
- **PRO-002**: Add only an unexported pure helper
  `isHistoricalGenericBookingWitness(graph, compositionLock): boolean` inside
  `packages/compiler/src/appointment-compilation-admission.ts`. It recognizes
  the conjunction below, never a title, requirement ID, product/definition key,
  label, route spelling, numeric-domain absence alone, or entity names alone.
  It neither mutates nor rewrites input and is not a public package API.

## Decision

### Historical witness

- **HIS-001**: The input is valid Graph V1. It has exactly the three business
  entities `service`, `appointment`, `schedule`, plus exactly one principal and
  one session entity resolved through the `core.identity-policy` owner
  bindings. These five entities are distinct. There are no additional entities.
  No field anywhere has `numericDomain` or `calculation`.
- **HIS-002**: Business field sets are exact, with no extra fields except the
  optional second reference in HIS-003. Required fields are:

  | Entity        | Required fields and Graph types                                                | Optional field |
  | ------------- | ------------------------------------------------------------------------------ | -------------- |
  | `service`     | `name:string`, `durationMinutes:integer`, `price:decimal`                      | none           |
  | `appointment` | `serviceKey:string`, `startsAt:datetime`, `customerName:string`, `status:enum` | `notes:text`   |
  | `schedule`    | `day:date`, `capacity:integer`                                                 | none           |

  Appointment status values are exactly `requested`, `confirmed`,
  `rescheduled`, `cancelled` in that order. Other field properties and indexes
  equal CTX-004 after the normalization in HIS-007. Missing fields, changed
  requiredness/types, additional properties, or current Appointment slots such
  as `active`, `startUtc`, `endUtc`, `timezone`, `scheduleId`, or
  `cancellationReason` do not satisfy this witness.

- **HIS-003**: Business relations are exactly Appointment -> Service,
  `many-to-one`, owned by `serviceKey`; there is no relation touching Schedule.
  The sole allowed extension is one additional required string field named
  `secondaryServiceKey` on Appointment and exactly one additional
  Appointment -> Service `many-to-one` relation owned by it. Both must occur
  together and have no other field/relation properties. This preserves the
  already-existing two-reference regression test; it is not an open-ended
  extension registry. The remaining relation is the historical Session ->
  Principal relation owned by `subjectRef`, exactly as CTX-004.
- **HIS-004**: The complete policy equals CTX-004 under HIS-007, including the
  principal/session permissions. Roles are exactly customer, staff, and
  administrator. Business permissions are exactly customer Appointment
  `create,read`; staff Appointment `read,confirm,reschedule`; administrator
  Service and Schedule `create,read,update,delete,manage`; administrator
  Appointment `read,delete,cancel,manage`. No additional permission is admitted.
- **HIS-005**: There is exactly one flow, resolved through `core.workflow`'s
  `flowKey` binding and owned by Appointment. Its initial state is `requested`;
  states and events equal CTX-004. Its complete transition set is
  `requested/confirm/confirmed/staff`,
  `confirmed/reschedule/rescheduled/staff`,
  `requested/delete/cancelled/administrator`, and
  `confirmed/cancel/cancelled/administrator`, with no additional properties.
  In particular, the current Appointment reschedule-to-requested flow cannot
  satisfy this witness even after capability and numeric-domain removal.
- **HIS-006**: The lock contains exactly the six CTX-004 package coordinates,
  package roots, manifest digests, Golden lifecycle values, and binding keys:
  `core.audit@1.0.2`, `core.crud@1.0.1`,
  `core.identity-policy@1.0.0`, `core.notification@1.1.1`,
  `core.policy-declarations@1.0.0`, and `core.workflow@1.0.1`. Bindings equal
  CTX-004 under HIS-007. Any `scheduling.appointment` coordinate, any version,
  or any additional/missing/duplicate/stale package rejects this exception.
- **HIS-007**: Use literal private structural constants derived from CTX-004;
  production code must not import or read a test fixture. Comparison includes
  complete entity definitions except their display labels, complete relations,
  complete policy, complete flows, and complete package selections. Normalize
  only principal/session entity keys and their references to two placeholders,
  the bound flow ID and its binding to one placeholder, and the CRUD route
  binding to one placeholder after resolving exactly one existing page whose
  blocks include the bound Service entity. These resolutions are unique and
  owner-aware; no suffix or name guessing is allowed. Compare keyed sets
  independent of order, reject duplicates, and preserve enum order. Do not
  ignore arbitrary extra properties. Metadata, page content, navigation,
  presentation/theme, and valid seed values are not historical selectors;
  their existing Graph/compiler validation remains in force. This permits
  existing bounded studio edits without authorizing new semantic variants.

### Integrity and facade dispatch

- **INT-001**: Before the historical helper returns true, independently require
  `compositionLock.applicationGraphChecksum === hashApplicationGraph(graph)`.
  Verify the complete composition lock, including `lockDigest` and derived
  dependency/output metadata, by recomputing it through the existing
  `createCapabilityCompositionLock` contract from the checked selections and
  checksum and comparing the canonical result. Schema failures or mismatches
  return false; do not repair the supplied lock. Existing package-source and
  physical manifest verification in normal compilation remains unchanged.
- **INT-002**: If Graph `integration.compositionSelections` is present, require
  exact canonical equality with the separate lock selections. Absence is valid
  for immutable Published input. Do not remove, synthesize, merge, or prefer one
  conflicting selection set. Test checksum mismatch, forged lock digest, and
  embedded/separate selection mismatch independently.
- **FAC-001**: Keep the shared `exactAppointmentNumericWitness` dispatch at
  both existing bundle and actual page-runtime seams. When a current profile
  exists, keep every existing current-profile check unchanged. When it is
  undefined, any `scheduling.appointment` selection in the supplied lock or
  embedded Graph selections rejects before the historical exception. For the
  existing three-name rejection condition, return false only if HIS-001..007
  and INT-001..002 pass; otherwise retain the bounded unsupported-profile
  error. Inputs outside that existing condition retain existing behavior.
- **FAC-002**: A historical match returns false, never true: it does not select
  Appointment or bypass the existing Approval numeric selector. It continues
  through the unchanged generic compiler. Both real seams execute the same
  integrity checks; the page seam may not assume bundle validation already ran.
  No public export, package subpath, test-only registration contract, or error
  payload is added. Valid current Appointment bytes remain identical.

## Consequences and limits

- **POS-001**: Frozen historical output and existing page/reference variations
  become compilable while incomplete current Appointment remains rejected.
- **NEG-001**: A small explicit historical schema contract must be maintained.
  Unlisted historical variations remain unsupported by this exception and
  require separate evidence and governance; no fuzzy matching is authorized.
- **LIM-001**: Structural equality establishes supported old semantics, not
  proof of a Graph's creation date. A newly constructed Graph matching every
  historical constraint is generic booking and acquires no atomic Appointment
  guarantee. There is no claim of cryptographically authenticated historical
  origin, automatic migration, new product registration, or hosted acceptance.
- **LIM-002**: The decision restores the existing generic runtime; it does not
  strengthen or weaken its role model, add booking capacity guarantees, alter
  tenant/identity/credential boundaries, or authorize external/provider/cloud
  actions. No copied source or package/license/supply-chain change occurs.

## Alternatives considered

- **ALT-001**: Delete the name guard or allow every graph without numeric
  domains. Reject: CTX-003 demonstrates a combined malformed-current downgrade.
- **ALT-002**: Update old fixtures or migrate their Graphs to current Appointment.
  Reject: changes historical bytes and contracts instead of restoring them.
- **ALT-003**: Whitelist complete Graph hashes. Reject: excludes the already
  supported page/theme and second-reference variations and treats presentation
  changes as separate compiler admission identities.

## Implementation ownership, verification, and rollback

- **IMP-001**: After exact-ADR independent standing acceptance and PM recording,
  one serialized writer may change only the private admission module and focused
  compiler tests. `index.ts` dispatch, public exports, fixtures/baseline bytes,
  adapters, capability assets, other profiles, and Inventory sources are frozen.
  If this cannot be implemented within that boundary, stop and return to PM.
- **TST-001**: Add a failing focused regression for historical admission, then
  prove the CTX-004 complete ordered manifest/bundle bytes twice, both with
  embedded selections and with separately locked Published input. Preserve
  fixture Graph/lock bytes before and after every invocation. Exercise the real
  registered page renderer, not only the helper. Current valid Appointment must
  retain its existing deterministic bytes at both seams.
- **TST-002**: Prove existing edited page/navigation/theme and paired
  `secondaryServiceKey` variants. Reject each unpaired/extra reference, wrong
  field owner/type/requiredness, ambiguous identity binding, extra entity,
  changed policy/flow, numeric domain/calculation, and stale/missing/extra lock.
- **TST-003**: At both seams, test current Appointment with lock removed alone,
  both domains removed alone, and lock plus both domains removed together; test
  separate and embedded lock removal/mismatch and correctly rebound checksums.
  Repeat the combined mutation with one old-looking field or flow fragment
  added: partial historical resemblance must still reject. Independently test
  historic graph checksum mismatch, lockDigest mismatch, and embedded selection
  mismatch. Keep the existing current Appointment adversarial matrix green.
- **TST-004**: Run focused historical suites and Appointment admission titles:

  ```text
  pnpm --filter @factory/compiler exec vitest run test/approval-correction-runtime.test.ts test/composition-page-runtime.test.ts test/role-journey-runtime.test.ts test/task-compatibility.test.ts
  pnpm --filter @factory/compiler exec vitest run test/definition-data-compatibility.test.ts -t Appointment
  pnpm --filter @factory/compiler typecheck
  pnpm exec prettier --check packages/compiler/src/appointment-compilation-admission.ts docs/adr/adr-0077-historical-booking-compiler-admission.md
  ```

  PM assigns the exact new test path and records focused results, current-profile
  byte evidence, unchanged baseline hashes, and the accepted ADR hash under
  `docs/acceptance/evidence/appointment-booking/historical-compiler-admission/`.
  Inventory QA/delivery ownership remains independent; these commands do not
  authorize a whole-workspace regression during its frozen review.

- **ROL-001**: Roll back only the new helper/exception and its new tests, restoring
  the prior rejection. No stored data or Graph is migrated and no generated
  artifact is overwritten. Stop on old/current output drift, current malformed
  fallback, unresolved witness ambiguity, required schema/template change, or
  write-ownership conflict. No irreversible step is proposed.
- **GOV-001**: The explicit policy choice is the bounded structural exception in
  HIS-001..007, including only the already-demonstrated second reference. There
  is no unresolved product choice delegated to the implementer. An independent
  reviewer must assess this exact decision against current authorities and
  report the standing-acceptance verdict; proposer and writer cannot supply it.

## References

- **REF-001**: `docs/tech-governance.md`; `docs/threat-model.md`.
- **REF-002**: ADR-0071, ADR-0072, and ADR-0073.
- **REF-003**: `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`,
  2026-09-24 Old generic booking/current Appointment distinction.
- **REF-004**: CTX-004 fixture and the four historical compiler test suites named
  in TST-004; `packages/compiler/test/definition-data-compatibility.test.ts`.
