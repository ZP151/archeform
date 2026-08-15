# Compiler Admission of Restaurant Permission and Actor Additions Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0022](../../adr/adr-0022-compiler-admission-permission-actor-additions.md)
**Base:** `36ddba30c0ae65f22bd410efc878036f3552ace3`

## Outcome

Extend the Restaurant V3 compiler admission so it accepts bounded Graph-valid
additions to `policy.roles`, `policy.permissions`, `flows[].transitions`, and
`journeys` while keeping every non-permission/actor location pinned by the
canonical-hash negative-space proof. This is the remaining prerequisite for the
Workbench Access and Workflow editors.

## Existing architecture and gap

`assertRestaurantProductCompilationInput` runs `assertExactRestaurantGraph`
(exact four roles, exact seven journeys, exact 99 field authorities, exact 135
binding policies, exact permission set) and then
`normalizeAllowedRestaurantValues` -> canonical hash. Any role, permission,
transition, or journey addition changes the hash and is rejected, even though
ADR-0021 made the generated runtime enforce arbitrary Graph-valid authority.

## Frozen contracts

### Admitted locations

Only these locations may diverge from canonical, and only by bounded additions
or removals:

- `policy.roles`: a non-empty, unique, ordered array of Graph keys 1..128. The
  four canonical roles must remain present.
- `policy.permissions`: rows `{role, resource, actions}` where `role` is a
  declared role, `resource` is an existing Graph key, and `actions` is a
  non-empty, unique, ordered subset of the known action vocabulary. Duplicate
  `(role, resource)` rows are rejected. The canonical rows must remain present.
- `flows[].transitions`: each `{from, event, to, roles}` must reference states
  declared on the same flow and roles declared in `policy.roles`. The canonical
  flows and their canonical transitions must remain present.
- `journeys`: the canonical seven journey keys must remain present; each journey
  step references a declared flow and a declared actor role. New journey keys
  are not admitted in this slice.

### Negative space

Every other location — metadata, pages, surfaces, navigation, entities,
relations, seed, scenarios, theme, integration, envelope, Composition Lock,
`fieldAuthorities` (99), and `bindingPolicies` (135) — remains canonical.

### Normalization

`normalizeAllowedRestaurantValues` is extended to restore, in addition to the
existing r.6 values, the canonical `policy.roles`, `policy.permissions`,
`flows`, and `journeys`. The normalized Graph must hash to the existing
canonical hash. The admitted candidate is returned unnormalized (with its
permission/actor additions) so the generic runtime can enforce them.

### Implementation finding (2026-08-14)

Two facts block the frozen normalize-to-canonical approach as written:

1. The canonical `policy.permissions`, `flows`, and `journeys` are produced by
   `composeRestaurantProductGraph` from the Restaurant `intent` and `experience`
   (test fixtures), which the compiler does not import. The compiler can
   hardcode only the four roles.
2. The Graph V3 schema cross-references authority: journey steps require their
   actor roles to hold the matching `policy.permissions`, so the authority
   cannot be stripped to empty for a separate hash — it must be restored to the
   canonical values.

Revised approach: extract the canonical Restaurant authority
(`roles`/`permissions`/`flows`/`journeys`) into a shared source location
(`@factory/capabilities`) with a cached `getCanonicalRestaurantAuthority()`,
import it from `contracts.ts`, and restore those exact values during
normalization. Implementation is deferred to that extraction slice.

## Security boundary

- The Published Graph remains the sole authority; the delta is validated and
  the negative space is hash-pinned.
- Every added role/permission/transition/actor is bounded and reference-checked
  before normalization; unknown, duplicate, cross-referencing, or undeclared
  entries fail closed with the fixed redacted error.
- No credential, raw prompt, raw response, or request body is logged or echoed.

## Exact implementation manifest

1. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
2. `packages/compiler/test/restaurant-v3-contract.test.ts`

No fixture, Graph, Capability, Recipe, schema, facade, package, lockfile,
Control Plane, worker, Publish, provider, service, Docker, Compose, or
deployment path is writable.

## Verification and delivery

Focused TDD RED/GREEN: a bounded role/permission/transition addition is admitted
and enforced; an unknown, duplicate, cross-referencing, unbounded, or
missing-canonical entry fails closed; the non-permission/actor negative space
still reproduces the canonical hash; canonical and r.6 remain byte-identical.
Full Compiler, Graph, and Capabilities suites; no-emit and build gates; direct
Prettier and `git diff --check`; containment and static scans. One independent
Sol review; Terra and a separate final Sol release review are not required
unless review finds a stable-boundary/security P0/P1 or the repair changes this
contract. The exact delivery subject and governance manifest are frozen in the
executable plan.
