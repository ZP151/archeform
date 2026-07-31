# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

Commercial Capability Foundation Task 2, **Restaurant and Ecommerce profile
recipes**, returned `ready_for_qa -> implementing` for the final fix round 5 of
5 after final release review found one P1 in active generic inventory-ledger
relationship validation. The reviewed release set remains
`35aa96e + ed3c2ba + ac43247 + e61e790 + bf0b16f`. Its contract owner remains
Profile Composition Integration; its dependency, Task 1 capability contracts
and physical packages, remains `accepted` and frozen. Task 2 remains limited
to composing Restaurant and Ecommerce Draft recipes from the same four
accepted Foundation identities with distinct exact Graph-symbol bindings,
entities, pages, roles, labels, and fixtures. This final repair state is not
acceptance and does not unlock Foundation Tasks 3 or 4; both remain `planned`.

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
- Fix round 3, `e61e790`, stayed inside the same exact five paths and closed all
  four findings:
  1. Simple Ecommerce now uses coherent `shopper` and `merchant` roles across
     bindings, permissions, and fulfillment.
  2. Composition now enforces fail-closed PolicyModel requirements for all four
     Foundation packages in both profiles.
  3. Restaurant stock movements now require location scope, a unique
     idempotency key/index, and item, order, and location relations, with
     adversarial validation.
  4. Production composition now admits only the three declared inventory
     co-provider effects and rejects every other overlap through the full
     profile entry points.
- Independent scoped re-review approved the repair with all four original P1s
  addressed and no P0/P1. Fresh Node `v22.11.0` verification passed 126/126
  focused tests across the three Task 2 suites; Capabilities typecheck and
  formatting also passed.
- Independent re-QA of the four-commit set passed 145/145 focused Task 2 tests
  and 152/152 full Capabilities tests. Build, typecheck, formatting, bounded
  diff checks, and direct checks of the four fix-round-3 categories passed.
  Re-QA nevertheless returned FAIL with one P1: those green suites do not prove
  Restaurant semantic rejection on the active default composition path.
- Fix round 4, `bf0b16f`, stayed inside two of the same exact five paths and
  closed that P1:
  - public `composeCapabilityDraft` now applies package- and binding-derived
    inventory-ledger semantic validation after composition resolution and
    symbol validation;
  - the validator is bounded by selection of `commerce.inventory-ledger`,
    derives movement and location entities from its bindings, and contains no
    profile-name or package-version dispatch; and
  - active `composeDefaultCapabilityDraft -> composeCapabilityDraft`
    regressions reject a non-unique idempotency key, a missing unique
    idempotency index, and a missing movement-to-location relation.
- Independent scoped re-review approved the repair with no P0/P1. Fresh Node
  `v22.11.0` verification passed all 155 Capabilities tests, including 28/28
  commercial-profile-composition tests; build, typecheck, and formatting also
  passed.
- Second independent re-QA then passed 148/148 focused Task 2 tests and 155/155
  full Capabilities tests. Build, typecheck, formatting, exact five-path diff
  checks, 56 remove-one-permission cases, the three active ledger mutations,
  no-ledger composition, and provider-overlap rejection all passed with no
  P0/P1/P2 demonstrated.
- Final release review nevertheless returned FAIL with one P1: the active
  generic validator still accepts inventory-ledger relations with a missing or
  wrong location source field and accepts missing catalog or order provenance
  relations. The green re-QA evidence does not justify acceptance while that
  public-boundary gap remains open.

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

- One bounded `integration` writer owns the final fix round 5 of 5 within Task
  2's same exact five paths:
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
- The P1 is specific: active generic validation resolves the bound movement and
  location entities but checks only relation endpoints and `many-to-one`
  cardinality. The public `composeCapabilityDraft` boundary still accepts:
  1. deletion of the movement-to-location relation's `field`;
  2. changing that field from `locationId` to `menuItemId`;
  3. deletion of the movement-to-catalog relation; or
  4. deletion of the movement-to-order relation.
- The bounded Restaurant validator rejects all four mutations.
- Fix round 5 must make the public validator require package/binding-derived
  movement-to-location, movement-to-catalog, and movement-to-order relations
  with explicit valid source fields, and add public-boundary adversarial tests
  for all four mutations. It must not add profile-name or package-version
  dispatch. If exact field semantics cannot be derived from the frozen
  bindings, work must stop for contract review rather than guess or change the
  contract.
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
  `inventory.release`, and `inventory.decrement`. Fix round 3 now rejects the
  formerly undeclared `inventory.adjust` overlap, but future Task 3 must still
  define and prove lock-derived runtime resolution that cannot double-execute
  any of the three intentional stock movements or select behavior by profile
  name. This is a downstream risk, not authority to start Task 3.

## Next slice

Repair the public inventory-ledger relationship-validation P1 within Task 2's
exact five-path boundary, beginning with focused failing tests for a missing
location field, wrong location field, missing catalog relation, and missing
order relation. Require fresh scoped review before returning to
`ready_for_qa`. Keep Tasks 3 and 4 planned and blocked until Task 2 is accepted.
