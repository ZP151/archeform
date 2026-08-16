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

Only these locations may diverge from canonical in this slice:

- `policy.roles`: the four canonical roles must remain present; additions are
  unique Graph keys 1..128.
- `policy.permissions`: each row's `role` must be a declared role, `resource` a
  Graph key, and `actions` non-empty, unique, and ordered (the existing
  `actionRank` check covers ordering). Multiple rows may share a `(role,
resource)` with distinct action subsets — the runtime merges them, so this is
  not a rejection.

`flows`, `journeys`, `fieldAuthorities` (99), and `bindingPolicies` (135) remain
canonical; flow and journey admission is deferred to the Workflow editor slice.

### Negative space

Every other location — metadata, pages, surfaces, navigation, entities,
relations, seed, scenarios, theme, integration, envelope, Composition Lock,
`flows`, `journeys`, `fieldAuthorities` (99), and `bindingPolicies` (135) —
remains canonical.

### Normalization

`normalizeAllowedRestaurantValues` restores, in addition to the existing r.6
values, the canonical `policy.roles` and `policy.permissions` via the cached
`getCanonicalRestaurantAuthority()`. The normalized Graph must hash to the
existing canonical hash. The admitted candidate is returned unnormalized (with
its role/permission additions) so the generic runtime can enforce them.

### Canonical authority extraction

`getCanonicalRestaurantAuthority()` in `@factory/capabilities` composes the
canonical Restaurant V3 Graph once from the standard product `intent` and
`experience` (source-level constants, not test fixtures) and returns the cached
authority. The compiler imports it to restore the canonical roles and
permissions during normalization.

## Security boundary

- The Published Graph remains the sole authority; the delta is validated and
  the negative space is hash-pinned.
- Every added role/permission/transition/actor is bounded and reference-checked
  before normalization; unknown, duplicate, cross-referencing, or undeclared
  entries fail closed with the fixed redacted error.
- No credential, raw prompt, raw response, or request body is logged or echoed.

## Exact implementation manifest

1. `packages/capabilities/src/restaurant/canonical-restaurant.ts`
2. `packages/capabilities/src/index.ts`
3. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
4. `packages/compiler/test/restaurant-v3-contract.test.ts`

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
