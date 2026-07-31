# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

Commercial Capability Foundation Task 2, **Restaurant and Ecommerce profile
recipes**, returned `ready_for_qa -> implementing` for fix round 3 of 5 after
release review found four P1 semantic defects in the exact release set
`35aa96e + ed3c2ba + ac43247`. Its contract owner remains Profile Composition
Integration; its dependency, Task 1 capability contracts and physical
packages, remains `accepted` and frozen. Task 2 remains limited to composing
Restaurant and Ecommerce Draft recipes from the same four accepted Foundation
identities with distinct exact Graph-symbol bindings, entities, pages, roles,
labels, and fixtures. This repair state is not acceptance and does not unlock
Foundation Tasks 3 or 4; both remain `planned`.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

Commercial Capability Foundation Task 1 is accepted and frozen. Its verified
`1.0.0` identities are `core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`; their physical
package, evidence-digest, verified-lock, and Publish-boundary contracts remain
unchanged.

Commercial Capability Foundation Task 2 completed two bounded fix rounds
within its exact five paths:

- Initial implementation `35aa96e` composed the two profile recipes. Fix round
  1, `ed3c2ba`, added configurable-line PolicyModel permissions, exact provider
  ownership, and complete cross-profile output assertions.
- The first scoped re-review found one remaining P1 in notification-provider
  coverage. Fix round 2, `ac43247`, added that ownership and an exact
  expected-effect-union assertion.
- Scoped re-review of `35aa96e + ed3c2ba + ac43247` returned PASS with all
  findings addressed and no P0/P1.
- Fresh Node `v22.11.0` verification passed 107/107 focused tests across
  `capability-registry`, `restaurant-profile`, and
  `commercial-profile-composition`; Capabilities typecheck and formatting also
  passed.
- Subsequent release review found four P1 semantic defects not covered by that
  scoped evidence. The earlier task-review and verification results remain
  historical evidence only; they do not support QA or acceptance while these
  findings are open.

The complete External Capability Intake project is accepted and frozen. Its
Task 6 writer record is
[`acceptance/external-capability-intake.md`](acceptance/external-capability-intake.md).
On Node `v22.11.0`, it records:

- A fixture-only CLI preflight of exactly 43 portfolio sources and 108 demand
  signals: 19 independent requested results, 24 independent policy-only
  blocks, stable redacted repeat output, no Candidate creation, and exact
  run-owned cleanup.
- Release-boundary regressions that reject Candidate artifacts at Golden,
  Graph, and compiler entry points; reject Golden/Graph/compiler/generated/
  runtime/provider/approval/copy-execution fields; and preserve package-root
  importer isolation.
- Independent re-QA after document repair `0b558fc` passed; PM ledger
  `77b4062` moved Task 6 `ready_for_qa -> reviewed`. Release review against
  `77b4062` then found two P2/no-P0/P1: the concurrent real
  directory-replacement race exceeded Vitest's 5-second default, and the prior
  documents were stale at `ready_for_qa`.
- Controller repair authorization `a9867b8` led to implementation commits
  `4924ec0 + dc6ca19`, which passed independent task review with no P0/P1/P2.
  PM ledger `43913ae` then moved Task 6 `implementing -> ready_for_qa`.
- Fresh re-QA at `43913ae` concurrently passed External Intake 392/392, Intake
  CLI 56/56, Graph 28/28, Capabilities 123/123, and Compiler 180/180. The
  directory and junction races completed in 6,361 ms and 3,688 ms.
- A serial Intake CLI run passed 56/56 with those races at 1,941 ms and 1,858
  ms; focused release-boundary and bulk-intake tests passed 3/3 and 1/1. All
  five affected typecheck/lint gates, targeted Prettier, `git diff --check`,
  and clean-worktree verification passed.

## Active work

- One bounded `integration` writer owns fix round 3 of 5 within Task 2's same
  exact five paths:
  `packages/capabilities/src/index.ts`,
  `packages/capabilities/src/restaurant/profile.ts`,
  `packages/capabilities/test/restaurant-profile.test.ts`, and
  `packages/capabilities/test/commercial-profile-composition.test.ts`, plus
  `packages/capabilities/test/capability-registry.test.ts` only for canonical
  Restaurant and Simple Ecommerce expected-input corrections for Task 2's four
  Foundation locks and the exact provider-uniqueness regressions below.
- The fifth-path amendment remains a test-scope correction only. It permits
  Simple Ecommerce's canonical expected input only for Task 2's four accepted
  Foundation locks. Provider-uniqueness regressions must assert exactly one
  provider for every non-overlapping effect and, for each intentionally
  overlapping inventory effect, the exact provider set
  `{commerce.inventory, commerce.inventory-ledger}`. It changes no shared
  contract, physical asset, package identity, interface, dependency, recipe
  scope, lifecycle or Publish behavior, production behavior, non-goal, or Task
  2 state.
- Release review requires fix round 3 to close these four P1 categories:
  1. Simple Ecommerce mixes `customer`/`shopper` and `operator`/`merchant`
     authorization, so one customer or merchant principal cannot complete its
     coherent end-to-end journey.
  2. Composition validates PolicyModel requirements only for
     `commerce.line-configuration`; missing authorization for identity,
     location, and inventory-ledger bindings does not fail closed.
  3. Restaurant binds `commerce.inventory-ledger` to a movement entity without
     the required location reference, unique idempotency key/index, and
     location relation needed by the accepted package contract.
  4. The full Restaurant composition has an undeclared fourth overlapping
     provider effect: both `restaurant.menu` and
     `commerce.inventory-ledger` provide `inventory.adjust`, while the reduced
     default-recipe provider regression does not exercise that path.
- The repair must keep canonical Ecommerce roles coherent across bindings,
  transitions, and permissions; validate authorization requirements for all
  four Foundation packages; make the Restaurant movement binding satisfy the
  accepted contract; and enforce provider-overlap policy on the full profile
  composition. These are semantic corrections under the frozen contract, not
  authority to change it.
- No new package identity, Task 1 contract change, compiler, Workbench,
  generated runtime, payment, identity-provider, deployment behavior, profile
  cloning, Graph `assetLocks` fallback, or Restaurant-only package fork is in
  scope.
- Foundation Tasks 3 and 4 remain `planned` until Task 2 is accepted. External
  Capability Intake remains accepted and frozen.

## Blocked decisions

- No Candidate has been approved, promoted, registered as Golden, linked to a
  Graph, provided runtime authority, or copied into Factory-owned code.
- The Task 6 fixture-only clarification excludes the plan's former public-source
  smoke probe. No public network, repository resolution/download, vendor
  contact, credentials, or external commitment is authorized by this slice.
- This slice is fixture-only and provides no public-network or live-service
  evidence. Acceptance grants no promotion, approval, Golden, Graph, compiler,
  generated-runtime, provider, or source-copy authority.
- Foundation Tasks 3 and 4 are blocked on accepted Task 2 profile composition
  metadata. Task 2 is back in `implementing`; neither downstream task is
  dispatched by this update.

## Risks and limitations

- Fixture evidence proves deterministic local behavior only; it does not prove
  availability or behavior of a live source, scanner, provider, or vendor.
- The repository-local CLI retains the accepted single-purpose `process.chdir`
  limitation for promotion-packet output anchoring; it is unchanged here.
- The preflight creates intake requests only. It cannot make a licence decision,
  promote a Candidate, or execute a source copy.
- Task 2 must not confuse accepted physical Foundation contracts with completed
  Restaurant or Ecommerce product behavior. Cross-profile bindings and
  deterministic recipe evidence are the gate.
- Task 2 intentionally records `commerce.inventory` and
  `commerce.inventory-ledger` as co-providers of `inventory.reserve`,
  `inventory.release`, and `inventory.decrement`, but release review found an
  undeclared fourth overlap on `inventory.adjust` in the full Restaurant
  composition. Fix round 3 must reject or remove that undeclared overlap.
  Before future Task 3 implementation, its compiler/runtime slice must still
  define and prove lock-derived inventory resolution that cannot double-execute
  a stock movement or select behavior by profile name. This is a downstream
  risk, not authority to start Task 3.

## Next slice

Repair Task 2's four release-review P1 categories within the exact five-path
boundary, beginning with focused failing role-journey, remove-one-permission,
movement-entity, and full-profile overlap tests. Require fresh scoped review
before returning to `ready_for_qa`. Keep Tasks 3 and 4 planned and blocked until
Task 2 is accepted.
