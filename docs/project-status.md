# Factory Pilot delivery status

Updated: 2026-07-31

## Current milestone

Commercial Capability Foundation Task 2, **Restaurant and Ecommerce profile
recipes**, returned `ready_for_qa -> implementing` and is escalated after final
release review found one load-bearing P1 in typed Foundation binding
validation. The five permitted repair rounds are exhausted; no sixth Task 2
patch is authorized. The reviewed release set remains
`35aa96e + ed3c2ba + ac43247 + e61e790 + bf0b16f + 6433940`. Its contract owner
remains Profile Composition Integration; its dependency, Task 1 capability
contracts and physical packages, remains `accepted` and frozen. Task 2 is not
accepted. A dedicated typed-binding-validation hardening slice requires
separate contract/scope governance before implementation. Foundation Tasks 3
and 4 remain `planned` and blocked.

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
- Final fix round 5, `6433940`, stayed inside two of the same exact five paths
  and closed that P1:
  - public inventory-provenance validation resolves movement, location,
    catalog, and order targets from the selected package's exact bindings;
  - it requires exactly one `many-to-one` relation to each target, an explicit
    declared string source field, required location/catalog fields, and
    distinct source fields; and
  - public-boundary tests reject missing, wrong, or reused relation fields and
    missing catalog or order relations while preserving no-ledger composition.
- Simple Ecommerce now includes the bound stock-movement-to-order relation via
  `orderId`. No profile-name, package-version, or provenance-field-name
  dispatch was introduced.
- Final scoped re-review approved the repair with no P0/P1 and the frozen scope
  intact. Fresh Node `v22.11.0` verification passed all 162 Capabilities tests,
  including 35/35 commercial-profile-composition tests; build, typecheck,
  formatting, and repair diff checks also passed.
- Final independent QA then passed 155/155 focused Task 2 tests and 162/162 full
  Capabilities tests. Build, typecheck, formatting, exact five-path diff checks,
  56 permission removals, inventory provenance mutations, no-ledger
  composition, and exact provider-overlap checks all passed with no P0/P1/P2
  demonstrated.
- Final release review nevertheless returned FAIL with one P1. Direct
  public-package probes proved that composition accepts both
  `core.location-context.locationCodeField = graph.domain.price` and
  `commerce.inventory-ledger.stockField = graph.domain.price`. The final QA
  evidence remains historical but cannot support acceptance because it did not
  exercise wrong-entity or wrong-type field substitutions.

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

- Task 2 is `implementing` and escalated, but no writer or sixth repair is
  authorized. Its existing implementation release remains bounded to these
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
- The P1 is specific: `graphSymbolIds()` flattens domain entities and every
  field key into one untyped namespace, while
  `assertCompositionGraphSymbols()` verifies only that a submitted identifier
  exists somewhere. Public `composeCapabilityDraft` therefore cannot prove a
  field belongs to the bound entity or has the required semantic type.
- The dedicated hardening slice must validate each binding against the selected
  manifest's typed `inputSchema`, distinguish entity/page/role/field
  namespaces, require `locationCodeField` to resolve to an appropriate declared
  string field on the bound location/context contract, and require `stockField`
  to resolve to the appropriate numeric inventory field on the bound catalog
  entity. Public-entry adversarial tests must cover cross-entity and wrong-type
  substitutions.
- This status update changes no product code, shared contract, exact path
  boundary, package identity, interface, lifecycle behavior, compiler, or
  Workbench surface. It does not authorize the hardening implementation. The
  contract owner and architecture reviewer must first freeze a dedicated
  contract artifact, exact paths, and acceptance evidence.
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
  metadata. Task 2 is back in `implementing` and escalated; neither downstream
  task is dispatched by this update.
- No sixth Task 2 repair is authorized. The typed-binding-validation hardening
  work may begin only under a separately recorded and reviewed slice; any
  shared contract change must be explicit before implementation.

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
- The flattened graph-symbol namespace allows an existing field symbol from the
  wrong entity or semantic type to satisfy a Foundation binding. Until the
  dedicated hardening slice establishes typed ownership and field-kind
  validation, immutable locks can direct location or inventory behavior at
  unrelated data, including price fields.

## Next slice

Govern a dedicated typed-binding-validation hardening slice before any code
change: freeze the typed namespace, field ownership/type rules, exact write
paths, public-boundary adversarial acceptance evidence, and contract-review
result. Do not dispatch a sixth Task 2 repair. Keep Task 2 `implementing` and
escalated, and keep Tasks 3 and 4 planned and blocked.
