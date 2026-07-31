# Factory Pilot delivery status

Updated: 2026-08-01

## Current milestone

Typed Capability Binding Validation is the current hardening milestone.
ADRs 0006 and 0007 are `Accepted` under Factory controller authority; the
amended design, implementation plan, and seven-task ledger now govern the work.
All seven tasks follow the accepted dependency chain. Task 1, **pure typed Graph
symbol index**, is `accepted` after bounded repair round 1. Original implementation
commit
`86d5a00f26d5f331764de0e8bf7694e657cd2514` passed independent Task 1 review
and behavioral QA with no P0/P1/P2, but release review then found one
load-bearing P1 in duplicate navigation/flow identifier handling. Repair commit
`784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` passed independent re-review and
repair-round behavioral QA with no P0/P1/P2. Final release review returned
RELEASE PASS with no P0/P1/P2, and fresh verification passed.

Task 2, **typed manifest and binding contracts**, is `ready_for_qa`. Its bounded
writer is Typed Manifest Contract Integration, its contract owner is Capability
Binding Contract, and its write boundary is the exact four Capabilities paths
recorded below. Independent review of implementation commit
`4458bfc7c8ffcaef29dfebb755d8399e12000198` found two P1s, so Task 2 does not
advance. Repair round 1 commit
`a7331df0ac6a6f54f82bf61a060607777bc06dc0` stays inside the existing path
boundary and passed independent repair re-review with no P0/P1/P2. Task 2 stays
inside its exact four-path boundary. After architecture amendment commit
`36317bf`, the PM records `implementing -> ready_for_qa`. Accepted ADR-0007
assigns owner-aware Draft Graph serialization to new Task 3 without expanding
Task 2. Task 3 remains `planned` behind Task 2; physical assets are now Task 4
and remain blocked behind Task 3. Tasks 5 and 6 are serialized on the preceding
accepted task. Task 7 remains `planned` and begins only after Tasks 1 through 6
are all `accepted`.

Commercial Capability Foundation Task 2 remains `implementing` and escalated
after its five permitted repair rounds. It is blocked on accepted Typed
Capability Binding Validation Task 7 and later PM reconciliation; it is not
accepted. Commercial Foundation Tasks 3 and 4 remain `planned` and blocked.

The Application Graph remains the source of truth. External intake artifacts
remain quarantined Candidate evidence or pending-review packets; they are not
Golden capabilities, Graph input, compiler input, generated runtime authority,
provider authority, approval, or source-copy execution.

## Completed evidence

ADR-0006 fixes the typed-binding architecture under controller authority:

- `factory.capability-binding/v1` is manifest-owned and interpreted by generic
  composition validation.
- The Graph owns a capability-agnostic typed index with separate symbol
  namespaces and fields resolved only under their entity owner.
- Draft composition, verified Publish lock creation, and compiler admission
  validate the exact Graph and selected locks.
- Historical Golden bytes, digests, Published revisions, and locks remain
  immutable. New current recipes migrate to verified
  `core.location-context@1.0.1`,
  `commerce.inventory-ledger@1.0.1`, and
  `commerce.inventory@2.0.0`.
- No validator may dispatch on Profile name, package version, field name,
  source path, compiler target, or output path.

ADR-0007 fixes serialized owner-aware selection ownership under controller
authority:

- Draft Graph bindings add the owner-aware
  `{ graphSymbol: "graph.domain.<entity>", fieldKey }` value without removing
  existing number, boolean, or historic `{ graphSymbol }` values.
- Graph parsing and validation prove exact entity/field existence only;
  Capabilities retains scalar, required, unique, and manifest-kind admission.
- Historic Draft JSON stays readable without owner inference or hash rewrite.
  Published Graphs remain selection-free and immutable locks retain bindings
  and digests.
- New Task 3 owns only the Graph schema, parser/validator, hashing regressions,
  browser-entry regressions, and exact three Graph paths recorded in the ledger.

The approved design and plan are recorded at
`docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`
and
`docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`.
The governed task state is recorded in
`docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`.
This status/ledger synchronization changes no product code, source manifest,
physical package, shared contract, or existing Commercial Foundation ledger.

Typed Binding Task 1 implementation, review, and QA evidence is:

- Reviewed code commit:
  `86d5a00f26d5f331764de0e8bf7694e657cd2514`
  (`feat: index typed graph symbols`).
- The implementation changes only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, inside the exact four-path
  boundary.
- Fresh Node `v22.11.0` verification passed 30/30 focused application-Graph and
  browser-entry tests, Graph typecheck, Graph lint, and implementation diff
  checks.
- Independent Task 1 review of
  `4617cb23752e17eaa223bdddb1b3f3164472f2a3..86d5a00f26d5f331764de0e8bf7694e657cd2514`
  returned PASS with no P0/P1/P2.
- Independent behavioral QA on Node `v22.11.0` passed
  `pnpm --filter @factory/graph test -- --run` at 30/30 tests, plus Graph
  typecheck, lint, and build.
- A direct public `dist/browser.js` probe passed 17/17 owner-scoped
  duplicate/wrong/missing-field assertions and 18/18 isolated-namespace
  assertions. Wrong or missing owners and fields returned `undefined`.
- Browser/model source and built output contained no Node builtin or
  `@factory/capabilities` import. The implementation and documentation-only
  follow-up diffs were bounded and clean.
- QA returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only
  for `ready_for_qa -> reviewed`; it is not release review or acceptance.
- Release review then found one verified P1: generic `indexBy` uses
  last-write-wins `Map` construction, while semantic Graph validation omits
  duplicate navigation-entry-ID and flow-ID checks. An invalid Graph can
  therefore resolve one of those typed symbols by declaration order instead of
  failing closed.
- The PM returned Task 1 `reviewed -> implementing` and authorized bounded
  repair round 1. Earlier task-review and QA evidence remains historical but
  cannot support acceptance while this finding is open.
- Repair commit `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  makes generic indexing fail closed on duplicate keys and adds semantic
  duplicate navigation-entry-ID and flow-ID issues. The repair changes only
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`.
- Fresh Node `v22.11.0` verification passed 32/32 focused application/browser
  tests and 32/32 full Graph tests, plus Graph typecheck, lint, build, and
  repair diff checks.
- Independent re-review of
  `7a0ee76e620d92032c07c7272d2b637e6835a8cc..784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  returned PASS with no P0/P1/P2. The PM reconciled this as sufficient only for
  `implementing -> ready_for_qa`.
- Independent repair-round re-QA on Node `v22.11.0` passed 32/32 Graph tests,
  Graph typecheck, lint, build, and repair diff checks.
- Public built-browser probes proved validation, parsing, and indexing reject
  duplicate navigation-entry and flow IDs. Owner-scoped field and isolated
  namespace probes passed, and browser/model source plus built output contained
  no Node builtin or `@factory/capabilities` import.
- Re-QA confirmed the repair scope remained exactly
  `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts` and returned PASS with no
  P0/P1/P2. The PM reconciled this as `ready_for_qa -> reviewed`.
- Deferred limitation: `parseApplicationGraph` still accepts a duplicate
  domain field, while validation, `assertValidApplicationGraph`, and typed
  indexing reject it. Repair round 1 was bounded to the missing navigation/flow
  parse rejection and did not change this pre-existing parser behavior.
- Final independent release review of repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` and reconciled governance
  baseline `d6f8b994fef491ef5405fee44ae015f01de788e5` returned RELEASE PASS with
  no P0/P1/P2.
- Fresh Node `v22.11.0` acceptance verification passed 32/32 Graph tests,
  Graph typecheck, lint, build, and the bounded repair diff check. The PM
  records Task 1 `reviewed -> accepted`.
- Task 1 acceptance is limited to the pure Graph index. Typed manifests,
  serialized selections, safe assets, and Draft/Publish/compiler enforcement
  remain Tasks 2 through 6; the
  parent Foundation defect remains open.

Typed Binding Task 2 implementation and failed-review evidence is:

- Implementation commit `4458bfc7c8ffcaef29dfebb755d8399e12000198`
  (`feat: define typed capability bindings`) is a direct child of dispatch
  `bf77d90a5e2e7627ad806b7851462935b2add7e0` and changes exactly the four
  authorized Task 2 paths.
- Independent review of
  `bf77d90a5e2e7627ad806b7851462935b2add7e0..4458bfc7c8ffcaef29dfebb755d8399e12000198`
  found two P1s; Task 2 remained `implementing` at that review point.
- P1 1: strict field and non-field manifest declarations do not have exact
  own-key allowlists, and duplicate `fieldTypes` entries are accepted. Repair
  round 1 stays inside the existing Task 2 paths and writer ownership.
- Repair implementation commit
  `a7331df0ac6a6f54f82bf61a060607777bc06dc0` changes only
  `packages/capabilities/src/composition.ts` and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Independent repair re-review of
  `4458bfc7c8ffcaef29dfebb755d8399e12000198..a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  returned PASS with no P0/P1/P2. It confirmed exact strict-key allowlists,
  duplicate-`fieldTypes` rejection, preserved specific non-field rejection, and
  the exact two-path repair diff.
- Repair verification passed 45/45 focused contract tests and 188/188 full
  Capabilities tests, plus Capabilities typecheck, lint, build, and bounded diff
  checks.
- Architecture amendment commit `36317bf` finalized Task 3 ownership. The PM
  reconciles the clean implementation, verification, bounded diff, and passing
  independent re-review as `implementing -> ready_for_qa`. Behavioral QA,
  release review, and acceptance remain pending.
- P1 2: `fieldKey` can exist in the Capabilities binding type but cannot persist
  through the strict `ApplicationGraphV1` composition-binding schema, which
  accepts only `{ graphSymbol }`.
- Accepted ADR-0007 and the synchronized design/plan/ledger amendment route the
  second finding to new Task 3. Task 2 remains inside its four Capabilities
  paths, Task 3 remains `planned` until Task 2 is accepted, and this update
  authorizes no Graph implementation.

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

- Typed Binding Task 1 is `accepted` and frozen under its pure Application
  Graph Type System contract. Its deferred parser limitation remains recorded.
- Typed Binding Task 2 is `ready_for_qa` in repair round 1 under the
  accepted ADR, design, plan, and Task 1 dependency. The implementation owner
  of record remains Typed Manifest Contract Integration and the contract owner
  remains Capability Binding Contract.
- Task 2's exact allowed paths are:
  `packages/capabilities/src/assets/contract.ts`,
  `packages/capabilities/src/composition.ts`,
  `packages/capabilities/test/composition-contract.test.ts`, and
  `packages/capabilities/test/typed-binding-contract.test.ts`.
- Repair round 1 commit `a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  is present inside two of the four allowed paths and passed independent task
  re-review with no P0/P1/P2. Architecture amendment commit `36317bf` is the
  reconciled governance baseline for behavioral QA.
- Task 2 QA may not change implementation or physical package roots and
  registrations, profile recipes, public Draft composition, Publish, compiler,
  Workbench, lifecycle, historical bindings, or introduce
  Profile/package/version/field-name dispatch.
- Typed Binding Task 3 remains `planned` behind Task 2 and owns exactly:
  `packages/graph/src/model.ts`,
  `packages/graph/test/application-graph.test.ts`, and
  `packages/graph/test/browser-entry.test.ts`.
- Physical assets are now Task 4 and remain blocked until Task 3 is accepted.
  Tasks 5 and 6 remain serially blocked on their preceding accepted task. Task
  7 remains `planned` until Tasks 1 through 6 are all `accepted`.
- Commercial Foundation Task 2 remains `implementing` and escalated. No sixth
  repair is authorized; its previous exact five-path implementation boundary
  remains historical release evidence only. It cannot resume acceptance until
  Typed Binding Task 7 is accepted and the PM reconciles the parent ledger.
- This PM transition changes only the typed-binding ledger and project status.
  It modifies no implementation code, source manifest, physical package,
  shared contract, or existing Commercial Foundation ledger.

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
- Typed Binding Task 2 QA is active only against its four exact Capabilities
  paths and immutable repair commit. Task 3 remains `planned` and blocked on
  Task 2 acceptance. Tasks 4 through 6 cannot overlap or start before the
  preceding task is `accepted`.
- Physical asset Task 4 is additionally blocked on accepted Task 3 serialized
  Graph round-trip, structural validation, hash, and browser evidence.
- Typed Binding Task 7 cannot start before Tasks 1 through 6 are all
  `accepted`. Its acceptance does not automatically accept Commercial
  Foundation Task 2; the PM must reconcile that parent state separately.
- No sixth Commercial Foundation Task 2 repair is authorized. ADR-0006 governs
  the dedicated hardening project; any change to its accepted contract,
  dependency chain, or exact task paths stops downstream work for PM and
  architecture review.

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
  wrong entity or semantic type to satisfy a Foundation binding. Until Typed
  Binding Tasks 1 through 7 are accepted, immutable locks can direct location
  or inventory behavior at unrelated data, including price fields.
- Task 1 provides the pure typed index but does not define typed manifest
  requirements, serialize owner-aware selections, publish safe assets, or
  enforce binding semantics at Draft, Publish, or compiler admission. Tasks 2
  through 6 are still required before recipe migration and parent closure.
- Task 2 repair round 1 closes the unexpected-own-key and duplicate-`fieldTypes`
  defects in implementation and task re-review. Independent behavioral QA,
  release review, and fresh verification remain required before acceptance.
- Owner-aware field bindings cannot currently survive the Application Graph
  schema. ADR-0007 assigns the repair to Task 3, but the risk remains until that
  task passes independent review, QA, release review, and fresh verification.
  No downstream Draft, Publish, or compiler gate may assume the serialized
  `{ graphSymbol, fieldKey }` value exists before then.
- Repair round 1 rejects duplicate navigation-entry and flow IDs and makes
  `indexBy` fail closed. Independent re-QA, release review, and fresh
  verification passed; Task 1 is accepted.
- `parseApplicationGraph` still accepts a duplicate domain field even though
  validation, assertion, and typed indexing reject it. This is a documented
  deferred limitation outside the bounded navigation/flow repair.
- New safe versions must be created and digest-verified; accepted historical
  package roots and locks cannot be edited in place. Current recipes must
  migrate through a new Draft revision.
- Publish and compiler admission must become Graph-aware without restoring an
  unsafe lock-only overload or allowing compiler output before validation.

## Next slice

Run independent Task 2 behavioral QA against
`4458bfc7c8ffcaef29dfebb755d8399e12000198..a7331df0ac6a6f54f82bf61a060607777bc06dc0`
and architecture baseline `36317bf`, including focused/full Capabilities tests,
typecheck, lint, build, strict-key and duplicate-`fieldTypes` adversarial probes,
and bounded diff checks. Keep new serialized-Graph Task 3 `planned` behind Task
2 and physical asset Task 4 blocked behind Task 3. Leave Typed Binding Tasks 3
through 7 `planned`. Keep Commercial Foundation Task 2 `implementing` and
escalated and Tasks 3 and 4 `planned` and blocked.
