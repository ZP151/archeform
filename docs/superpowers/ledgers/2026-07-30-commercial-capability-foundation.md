# Commercial Capability Foundation Project Ledger

Updated: 2026-07-31

Plan: `docs/superpowers/plans/2026-07-30-commercial-capability-foundation.md`

Design contract: `docs/superpowers/specs/2026-07-30-commercial-capability-foundation-design.md`

Execution record: `.superpowers/sdd/2026-07-30-commercial-capability-foundation/progress.md`

## Workflow

The only valid task states are:

`planned` -> `implementing` -> `ready_for_qa` -> `reviewed` -> `accepted`

- `planned`: specialization, contract owner, exact paths, dependencies,
  non-goals, and acceptance evidence are recorded.
- `implementing`: the assigned engineer owns the bounded change and its TDD
  evidence. A repair cycle returns to this state with the finding recorded.
- `ready_for_qa`: implementation, task review, and focused verification are
  complete; independent behavioral QA remains required.
- `reviewed`: task review and QA are reconciled with no open P0/P1 finding;
  release review and fresh verification remain required.
- `accepted`: task review, QA, release review, and fresh verification are
  reconciled. A commit or green development tests alone do not qualify.

Only the PM may change task state. A task may not skip a state. Any shared
contract change stops dependent implementation and returns the affected task
to `implementing` after its scope and ownership are re-recorded.

## Current milestone

The Commercial Capability Foundation has accepted its physical package and
Publish-verification contract. The accepted design selects four reusable Golden
packages:
`core.identity-context`, `core.location-context`,
`commerce.line-configuration`, and `commerce.inventory-ledger`. Task 1 is the
contract owner for their physical package and interface boundary. Task 1's
explicit release set is implementation commit `b2f3b9e` plus repair commit
`4f320fd`. Independent QA and release review passed, and the PM reconciled the
evidence through `ready_for_qa -> reviewed -> accepted`. Task 1 is frozen and
accepted. Its acceptance satisfies Task 2's dependency. The PM moved Task 2
`planned -> implementing` under the frozen Profile Composition Integration
contract and exact five paths. After implementation `35aa96e`, two bounded
repair rounds `ed3c2ba + ac43247`, clean scoped task review, and fresh focused
verification, the PM moved Task 2 `implementing -> ready_for_qa`. Subsequent
release review found four P1 semantic defects, so the PM returned Task 2
`ready_for_qa -> implementing` for fix round 3 of 5. External Capability Intake
remains accepted and frozen; this repair state imports no external content and
grants no Candidate or provider authority. Tasks 3 through 5 remain `planned`.
Tasks 3 and 4 may run in parallel only after Task 2 is accepted because they
consume the same frozen profile composition metadata but write disjoint
compiler and Workbench paths.

| Task                                          | State          | Specialization | Contract owner                  | Contract status                                                                                     |
| --------------------------------------------- | -------------- | -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1. Capability contracts and physical packages | `accepted`     | `integration`  | Factory Capability Registry     | Release set `b2f3b9e` + `4f320fd`; QA and release review PASS, with inherited limitations recorded. |
| 2. Restaurant and Ecommerce profile recipes   | `implementing` | `integration`  | Profile Composition Integration | Fix round 3/5; release review FAIL with four open P1 semantic defects.                              |
| 3. Generic commercial generated runtime       | `planned`      | `backend`      | Compiler Runtime                | Blocked on accepted Task 2 Published Graph recipes and immutable locks.                             |
| 4. Workbench profile composition visibility   | `planned`      | `frontend`     | Workbench Product Surface       | Blocked on accepted Task 2 profile composition metadata.                                            |
| 5. Cross-profile acceptance and evidence      | `planned`      | `qa`           | Factory Release Evidence        | Blocked on accepted Tasks 1 through 4.                                                              |

## Task 1: Freeze capability contracts and physical package verification

- **State:** `accepted`
- **Specialization:** `integration`
- **Contract owner:** Factory Capability Registry
- **Contract artifact:**
  `docs/superpowers/specs/2026-07-30-commercial-capability-foundation-design.md`
  capability contracts plus the accepted `factory.capability/v1` and
  `factory.composition/v1` schemas.
- **Dependencies:** accepted Parameterized Capability Composition project;
  current physical-package verifier and immutable composition resolver.
- **Produces:** four fixed `1.0.0` Golden assets with verified physical roots,
  exact `provides`/`requires`, safe output slots, fixtures, tests, and
  deterministic dependency resolution.

### Exact allowed paths

- `packages/capabilities/src/assets/core/identity-context-v1-0-0.ts`
- `packages/capabilities/src/assets/core/location-context-v1-0-0.ts`
- `packages/capabilities/src/assets/commerce/line-configuration-v1-0-0.ts`
- `packages/capabilities/src/assets/commerce/inventory-ledger-v1-0-0.ts`
- `packages/capabilities/assets/core.identity-context/1.0.0/**`
- `packages/capabilities/assets/core.location-context/1.0.0/**`
- `packages/capabilities/assets/commerce.line-configuration/1.0.0/**`
- `packages/capabilities/assets/commerce.inventory-ledger/1.0.0/**`
- `packages/capabilities/src/assets/contract.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/node.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/capabilities/test/commercial-capability-assets.test.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`

### Fix round 1 of 5: closed review findings

1. **Physical package bytes are not verified at the actual Publish lock
   boundary.** The pure composition factory can create the canonical lock from
   registry metadata without reading the package. The repair must add a
   server-only Node factory that resolves selected registry identities,
   validates their physical package/evidence, and delegates to the unchanged
   pure factory. `lifecycle.service` must use it before any Published revision
   or lock is persisted. Browser-compatible `composition.ts` must not import
   Node filesystem code.
2. **Foundation fixtures and contract evidence are not digest-protected.** The
   four Foundation manifests must declare fixture and contract-evidence
   SHA-256 digests. Node verification must compare the exact file bytes, parse
   both files as JSON, and reject missing, malformed, symlinked, escaped, or
   mismatched evidence. Historical package identities are not expanded by this
   Foundation-only requirement.

The repair requires both a direct verified-factory tamper regression and an
actual Control Plane Publish-path tamper regression. Commit `4f320fd` closed
both P1 findings. Independent re-review also found and then confirmed closure
of one P2: evidence authentication must hash exact raw bytes, not decoded text.
The final verifier hashes the raw `Buffer`, then separately performs fatal
UTF-8 decoding and JSON parsing. Re-review returned PASS with no remaining
P0/P1/P2.

### Non-goals

- No profile Graph recipe, compiler runtime, Workbench, payment, external
  identity provider, provider credential, or third-party source copy.
- No lifecycle behavior change beyond making the existing Published-lock
  creation path call the server-only verified factory before persistence.
- No historical asset identity change and no compatibility or profile-name
  dispatch branch.
- No free-form string, source, URL, command, path, credential, or raw model
  material in a manifest, binding, fixture, artifact, log, or report.

### Acceptance evidence

- Focused RED proves the Foundation packages are not yet registered.
- Focused GREEN proves all four physical roots verify, dependencies resolve in
  deterministic order, missing providers and tampered content fail before lock
  creation, every registration agrees with its physical manifest, and fixture
  and contract-evidence exact bytes match declared digests and parse as JSON.
- Direct verified-factory and actual Control Plane Publish tests prove physical
  package/evidence tampering produces and persists no immutable lock or
  Published revision.
- Capability registry, composition-contract, and lifecycle regressions plus
  Capabilities and Control Plane typechecks pass.
- Independent task review finds no open P0/P1/P2 before transition to
  `ready_for_qa`; later QA, release review, and fresh verification are required
  before `accepted`.

### Implemented and independently reviewed evidence

- Explicit Task 1 release set:
  - implementation `b2f3b9e` (`feat: add commercial foundation capability contracts`);
  - repair `4f320fd` (`fix: verify capability packages before publish`).
- Commits `75fcd9a` (`docs: add external business logic portfolio`) and
  `61c5b45` (`docs: design external capability intake`) are independent intake
  research/design work and are explicitly excluded from the Task 1 release
  set, review scope, and acceptance claim.
- The server-only verified-lock factory resolves every selected registry
  identity, verifies its physical package, exact Foundation fixture and
  contract-evidence bytes, fatal UTF-8 decoding, and JSON parsing, then
  delegates to the unchanged pure composition factory.
- The actual `LifecycleService.publishDraft` path calls the verified factory
  before a transaction can persist a Published revision or immutable lock.
- Direct factory and real Publish-path tamper regressions passed. The Publish
  regression proves modified physical evidence rejects without persisting a
  Published revision or lock.
- Focused Capabilities verification passed 92/92; full Capabilities passed
  119/119. Focused Control Plane lifecycle passed 68/68; full Control Plane
  passed 116/116. Capabilities and Control Plane typechecks and the
  Capabilities build passed.
- The raw-byte adversarial test first failed 1/7 against text-decoded hashing,
  then passed 7/7 after the verifier changed to raw-`Buffer` hashing plus fatal
  UTF-8 decoding. Independent re-review returned PASS with no P0/P1/P2.
- Capabilities lint, scoped Prettier, and `git diff --check` passed.
- Baseline limitation: `pnpm --filter @factory/control-plane lint` still
  reports existing formatting failures in `src/graph-proposal.provider.ts` and
  `src/main.ts`. Neither file differs from repair base `c8a35e7`; both are
  outside the Task 1 write boundary, so this repair did not modify them. This
  is recorded for QA and is not represented as a passing Task 1 lint gate.

### QA, release review, and state-transition evidence

- Independent QA result: PASS. Focused Foundation verification passed 7/7 and
  the actual Publish lifecycle passed 68/68. Full Capabilities passed 119/119;
  full Control Plane passed 116/116. Both typechecks, Capabilities lint,
  `git diff --check`, the Node-builtin-denial browser-safe import check, and the
  verified-factory entrypoint isolation check passed.
- QA found no P0/P1. Its P2 limitations are inherited and explicit:
  `pnpm --filter @factory/control-plane lint` reports only unchanged formatting
  failures in `src/graph-proposal.provider.ts` and `src/main.ts`, and testing ran
  on host Node `v24.18.0` while the workspace declares `>=22.11.0 <23` because a
  Node 22 runtime and standalone browser bundler were unavailable.
- The unchanged lint files are outside Task 1 and unchanged from repair base
  `c8a35e7`. Node 22 generated-runtime evidence remains the Task 5 release gate;
  Task 1 changes package verification and Publish-time server behavior but does
  not claim generated-runtime Node 22 acceptance.
- Independent release review result: PASS after P2 provenance remediation. It
  reviewed only the explicit non-contiguous release set `b2f3b9e` + `4f320fd`,
  excluded `75fcd9a` and `61c5b45`, accepted the recorded inherited limitations,
  and found no release-blocking P0/P1.
- State transition history was preserved:
  1. `implementing -> ready_for_qa` after repair/re-review, recorded by PM commit
     `53196fa`;
  2. `ready_for_qa -> reviewed` after independent QA PASS and reconciliation;
  3. `reviewed -> accepted` after independent release review PASS and final
     evidence reconciliation in this ledger update.

Task 1 package identities, Foundation evidence digests, server-only verified
lock factory, and Publish boundary are now accepted and frozen. Reopening any
of them requires a new recorded scope and repair state.

## Task 2: Compose Foundation Graph recipes for Restaurant and Ecommerce

- **State:** `implementing`
- **Specialization:** `integration`
- **Contract owner:** Profile Composition Integration
- **Contract artifact:** accepted Task 1 package identities, interfaces, and
  the profile-recipe rules in the accepted design.
- **Dependencies:** Task 1 `accepted`.
- **Produces:** Restaurant and Ecommerce Draft recipes that select the same
  four Foundation identities with different exact Graph-symbol bindings,
  entities, pages, roles, labels, and fixtures.

Task 1 is accepted and frozen, so the PM first moved Task 2
`planned -> implementing`. One bounded `integration` writer owned only the
exact five paths below. The resulting release set is implementation `35aa96e`
plus repair commits `ed3c2ba` and `ac43247`. Clean scoped task review and fresh
focused verification supported `implementing -> ready_for_qa`, but subsequent
release review found four P1 semantic defects. The PM returned Task 2
`ready_for_qa -> implementing` for fix round 3 of 5. The Profile Composition
Integration contract, accepted Task 1 identities and interfaces, recipe rules,
dependencies, non-goals, acceptance evidence, and exact five-path boundary
remain frozen. Any new path, package identity, interface, binding grammar,
output slot, compiler/Workbench behavior, or contract change stops work for PM
and architecture review.

### Controller-authorized test-scope correction

Adding the four accepted Foundation locks necessarily changes the canonical
Restaurant selection previously asserted as exactly nine locks in
`packages/capabilities/test/capability-registry.test.ts`. The Controller's
amended authority for that existing regression file is limited to:

1. updating the canonical Restaurant expected selection for Task 2's four
   accepted Foundation locks;
2. updating Simple Ecommerce's canonical expected input only for those same
   four Foundation locks; and
3. correcting provider-uniqueness regressions so every non-overlapping effect
   asserts exactly one provider, while every intentionally overlapping
   inventory effect asserts the exact two-package provider set
   `{commerce.inventory, commerce.inventory-ledger}`.

This is a test-scope correction only. It changes no shared contract, physical
asset, package identity, interface, binding grammar, output slot, dependency,
recipe scope, lifecycle or Publish behavior, production behavior, non-goal, or
task state. It does not approve a production fix. Task 2 remains
`implementing` at the time of this amendment; Tasks 3 and 4 remain `planned`.
The later state transition is supported only by the bounded repair and review
evidence recorded below.

### Initial independent task review: FAIL

Independent task review of implementation commit `35aa96e` returned FAIL with
two P1 findings and one P2 finding:

1. P1: configurable-line Graph contributions are missing required PolicyModel
   permissions.
2. P1: the implementation exceeded the prior fifth-path test authority and
   weakened the provider invariant to at-least-one.
3. P2: the cross-profile composition proof does not assert the required output
   differences for all four Foundation bindings and representative Graph
   contributions.

The amended fifth-path authority above corrected only the test-scope boundary
for the second finding. It did not approve commit `35aa96e`, authorize a
contract change, or close any review finding. Task 2 remained `implementing`
until the bounded fix rounds and fresh re-review below.

### Exact allowed paths

- `packages/capabilities/src/index.ts`
- `packages/capabilities/src/restaurant/profile.ts`
- `packages/capabilities/test/restaurant-profile.test.ts`
- `packages/capabilities/test/commercial-profile-composition.test.ts`
- `packages/capabilities/test/capability-registry.test.ts` (only the canonical
  Restaurant and Simple Ecommerce expected-input corrections for the four
  Foundation locks and exact provider-uniqueness regressions above)

### Fix rounds 1 and 2 and superseded `ready_for_qa` evidence

- Exact release set: implementation `35aa96e`, fix round 1 `ed3c2ba`, and fix
  round 2 `ac43247`. All changes remain inside the exact five paths above.
- Fix round 1 added the missing configurable-line PolicyModel permissions,
  exact-one ownership for non-overlapping effects, exact co-provider sets for
  intentional inventory overlaps, and complete binding and representative
  Graph-output assertions for both profiles.
- Scoped re-review of fix round 1 found one remaining P1: notification-provider
  ownership was omitted from the expected effect set.
- Fix round 2 added exact `core.notification` ownership and asserted that the
  expected effects equal the complete union declared by the selected assets.
- Final scoped task re-review returned PASS with all documented findings
  addressed and no P0/P1.
- Fresh Node `v22.11.0` verification passed 107/107 tests across
  `capability-registry.test.ts`, `restaurant-profile.test.ts`, and
  `commercial-profile-composition.test.ts`. Capabilities typecheck and
  formatting passed.

The PM moved Task 2 `implementing -> ready_for_qa`. This was not acceptance,
and the later release-review findings below supersede that gate transition.

### Fix round 3 of 5: release-review P1 findings

Release review of the exact Task 2 release set returned FAIL with four P1
semantic defects:

1. **Simple Ecommerce has no coherent customer or merchant role journey.**
   Existing package bindings and permissions mix `customer` with `shopper` and
   `operator` with `merchant`. A single resolved shopper cannot complete
   catalog -> configure -> cart -> order, and a single merchant cannot complete
   inventory -> fulfillment -> audit.
2. **Composition accepts missing Foundation authorization.** PolicyModel
   enforcement covers `commerce.line-configuration` but does not fail closed
   when required identity-context, location-context, or inventory-ledger
   authority is removed.
3. **The Restaurant inventory-ledger movement binding cannot satisfy the
   accepted package contract.** Its bound movement entity lacks a required
   location reference, unique idempotency key/index, and location relation, so
   movements cannot be proven location-scoped and idempotently persisted from
   the Application Graph.
4. **The full Restaurant composition has an undeclared fourth provider
   overlap.** `restaurant.menu` and `commerce.inventory-ledger` both provide
   `inventory.adjust`. Existing exact-provider coverage exercises a reduced
   default recipe and does not enforce overlap policy on
   `composeProfileDraft`/`getProfileComposition`.

Fix round 3 remains inside the exact five paths above and must:

- use canonical Ecommerce customer and merchant roles consistently across
  every selected binding, order-flow transition, and permission, with coherent
  role-journey regressions;
- define and enforce fail-closed PolicyModel requirements for all four
  Foundation packages, with table-driven remove-one-permission tests for both
  profiles;
- make the Restaurant movement entity contract-compliant and extend
  Restaurant validation and adversarial composition tests; and
- enforce production composition overlap policy, reject every undeclared
  overlap, allow only the intended `inventory.reserve`, `inventory.release`,
  and `inventory.decrement` co-provider sets, and cover the full Restaurant
  composition entry points.

These are repairs against the frozen Profile Composition Integration and
accepted Task 1 contracts. They authorize no new path, package identity,
interface, binding grammar, output slot, dependency, compiler/Workbench
behavior, lifecycle behavior, or non-goal. The PM moved Task 2
`ready_for_qa -> implementing`; Task 2 is not accepted, and Tasks 3 and 4 remain
`planned` and blocked.

### Non-goals

- No new package identity or Task 1 contract change.
- No compiler, Workbench, generated runtime, payment, identity-provider, or
  deployment behavior.
- No literal labels in composition bindings, legacy profile cloning in the
  active path, Graph `assetLocks` fallback, or Restaurant-only package fork.

### Acceptance evidence

- Focused RED proves Foundation bindings and Graph contributions are absent.
- Focused GREEN proves matching package identities, distinct validated Graph
  symbols and output semantics, canonical nonempty locks, deterministic
  dependency order, and fail-closed invalid symbols for both profiles.
- Restaurant profile, composition-contract, and Capabilities typecheck pass.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 3: Generate generic context, configured-line, and stock-ledger runtime

- **State:** `planned`
- **Specialization:** `backend`
- **Contract owner:** Compiler Runtime
- **Contract artifact:** accepted Task 2 Published Graph recipes and immutable
  `factory.composition/v1` locks.
- **Dependencies:** Task 2 `accepted`.
- **Produces:** generic, lock-derived API and Web contributions for context
  resolution, configured-line validation and pricing, and transactional stock
  movements for both profiles.

### Exact allowed paths

- `packages/compiler/src/commercial-runtime.ts`
- `packages/compiler/src/commercial-page-runtime.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/commercial-runtime.test.ts`
- `packages/compiler/test/composition-compilation.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`

### Non-goals

- No Task 1 or Task 2 contract change, Workbench edit, external provider,
  real payment, production identity, or legacy Restaurant migration beyond the
  explicitly generic Foundation contributions.
- No profile-name/version dispatch, Graph `assetLocks` fallback, arbitrary
  source/path/URL/script execution, or direct PageModel stock mutation.

### Acceptance evidence

- Focused RED proves no generic commercial runtime contribution exists.
- Focused GREEN proves principal/location validation, option ownership and
  cardinality, availability, decimal pricing, role gates, order version,
  idempotency, atomic reserve/release/decrement/adjustment, audit evidence, and
  no mutation on every rejected command.
- Compiler composition and plan regressions, typecheck, and lint pass for both
  profiles using only immutable lock contribution digests.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 4: Expose composition value on Workbench Home and creation review

- **State:** `planned`
- **Specialization:** `frontend`
- **Contract owner:** Workbench Product Surface
- **Contract artifact:** accepted Task 2 profile composition metadata.
- **Dependencies:** Task 2 `accepted`. May execute in parallel with Task 3 only
  while the accepted Task 2 contract remains unchanged.
- **Produces:** data-derived package version, lifecycle, dependency readiness,
  customer/merchant surface, and blocked-combination visibility before Draft
  creation.

### Exact allowed paths

- `apps/workbench/components/workbench-home.tsx`
- `apps/workbench/components/guided-creation-drawer.tsx`
- `apps/workbench/components/workbench-home.test.tsx`
- `apps/workbench/components/guided-creation-drawer.test.tsx`
- `apps/workbench/lib/commercial-foundation-summary.ts`
- `apps/workbench/lib/commercial-foundation-summary.test.ts`

### Non-goals

- No registry, Graph, profile recipe, compiler, lifecycle, provider, or
  publication-contract change.
- No external repository fetch, false installed status, implicit Draft
  mutation, auto-publish, auto-compile, or replacement of Draft -> Publish ->
  immutable Compilation.
- No unrelated visual redesign; use the existing accessible light/dark tokens.

### Acceptance evidence

- Focused RED proves Foundation surfaces and blocked dependency state are not
  visible.
- Focused GREEN proves registry-derived package/version/lifecycle/dependency
  and customer/merchant surfaces appear before Draft creation; invalid recipes
  disable creation with an actionable reason.
- Workbench focused tests, accessibility behavior, typecheck, and lint pass;
  existing guided profile creation remains intact.
- Independent task review, QA, release review, and fresh verification are
  reconciled before acceptance.

## Task 5: Prove end-to-end profile acceptance and evidence boundaries

- **State:** `planned`
- **Specialization:** `qa`
- **Contract owner:** Factory Release Evidence
- **Contract artifact:** accepted Tasks 1 through 4 and
  `docs/acceptance/commercial-capability-foundation.md`.
- **Dependencies:** Tasks 1, 2, 3, and 4 `accepted`.
- **Produces:** deterministic and isolated Node 22 Restaurant and Ecommerce
  generated journeys, exact cleanup evidence, guarded live-model evidence when
  configured, an updated requirements audit, and current project status.

### Exact allowed paths

- `docs/acceptance/commercial-capability-foundation.md`
- `docs/audits/restaurant-ordering-requirements-audit.md`
- `docs/project-status.md`
- `packages/compiler/test/commercial-generated-journey.test.ts`
- `apps/compiler-worker/test/commercial-foundation-lifecycle.test.ts`

### Non-goals

- No production source, package, profile, Workbench, contract, provider,
  deployment, real identity, or real payment change.
- No fixture is reported as a real provider test; absent local OpenAI
  credentials make the guarded gate unavailable, not passed.
- No raw key, prompt, response, identifier, source, path, URL, command, or
  screenshot enters evidence. No unrelated Docker project or filesystem path
  may be touched.

### Acceptance evidence

- Focused RED then GREEN cross-profile generated journey and Worker lifecycle
  tests cover customer context, configured ordering, merchant availability,
  immutable stock ledger, and the corresponding Ecommerce journey using the
  same Foundation package identities.
- Full Graph, Capabilities, Control Plane, compiler, Worker, and Workbench
  tests/typechecks plus affected lint/format/diff checks pass.
- Fresh isolated Node 22 Compose runs verify migrations, seed, API health, Web,
  customer and merchant journeys, immutable artifacts, stopped state, and
  exact label-scoped container/network/volume/runtime-directory cleanup.
- When a local key is configured, at most five calls cross the existing
  provider boundary and only redacted call count, model identifier, outcome,
  and immutable digests are recorded. Schema-invalid or boundary-breaking
  output cannot select package paths, URLs, source, or code.
- Independent task review, QA, release review, and fresh verification report
  no unresolved load-bearing finding before Task 5 and the milestone become
  `accepted`.

## Cross-task risks and stop conditions

- A Task 1 package identity, interface, binding grammar, target slot, or
  physical-verification change immediately stops Tasks 2 through 5.
- A Task 2 profile composition metadata or binding change immediately stops
  Tasks 3 and 4. The PM must record the repair scope before work resumes.
- Task 2 intentionally preserves exact co-provider ownership by
  `commerce.inventory` and `commerce.inventory-ledger` for
  `inventory.reserve`, `inventory.release`, and `inventory.decrement`, but
  release review found an undeclared fourth overlap on `inventory.adjust`
  between `restaurant.menu` and `commerce.inventory-ledger`. Fix round 3 must
  reject or remove the undeclared overlap. Before Task 3 implementation can be
  dispatched, its compiler/runtime contract must retain lock-derived resolution
  and prove that one logical stock movement cannot be executed twice.
  Profile-name or package-version dispatch remains forbidden.
- A compiler decision based on profile name, Graph asset lock, package version
  switch, literal composition text, or mutable Draft state is a release blocker.
- TypeScript registration and physical package content can diverge if digests
  are manually edited or partial roots are staged; fresh physical verification
  is required after every owned asset change.
- The Foundation remains a reusable capability proof, not a completed POS.
  Payment, provider login, delivery, promotions, loyalty, reservation, queue,
  realtime, offline, printing, cloud deployment, and new vertical profiles
  remain explicit follow-up slices.

## Next smallest valuable slice

Repair Task 2's four release-review P1 categories within its exact five-path
scope, beginning with focused failing role-journey, remove-one-permission,
movement-entity, and full-profile provider-overlap tests. Require fresh scoped
review before any return to `ready_for_qa`. Keep Tasks 3 and 4 planned and
blocked, and preserve the accepted Task 1 physical package, evidence digest,
verified-lock, and Publish-boundary contracts unchanged.
