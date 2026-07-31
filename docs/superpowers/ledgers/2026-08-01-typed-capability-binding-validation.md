# Typed Capability Binding Validation Project Ledger

Updated: 2026-08-01

ADR:
`docs/adr/adr-0006-typed-capability-binding-validation.md`

Design contract:
`docs/superpowers/specs/2026-08-01-typed-capability-binding-validation-design.md`

Implementation plan:
`docs/superpowers/plans/2026-08-01-typed-capability-binding-validation.md`

Blocked parent:
`docs/superpowers/ledgers/2026-07-30-commercial-capability-foundation.md`,
Task 2.

## Controller decision and scope

ADR-0006 is `Accepted` under Factory controller authority. It freezes these
architecture decisions for this hardening project:

- Factory adopts the manifest-owned `factory.capability-binding/v1` contract.
- The Application Graph owns a pure typed symbol index with separate entity,
  field-by-owner, page, navigation, role, flow, provider, and experience-token
  namespaces.
- A field binding identifies both its owning entity symbol and `fieldKey`.
- Generic Capabilities validation interprets selected manifest requirements
  against the exact Graph at Draft composition, verified Publish lock creation,
  and compiler admission.
- Existing Golden package bytes, digests, locks, and Published revisions remain
  immutable historical evidence. New current recipes use verified safe versions
  rather than rewriting accepted versions.
- No validator may dispatch on Profile name, package version, field name,
  source path, compiler target, or output path.

This ledger and the synchronized project status are governance documents only.
They change no product code, source manifest, physical package, shared contract,
Published revision, immutable lock, compiler artifact, or lifecycle behavior.

## Workflow and state progression

The only valid task states are:

`planned` -> `implementing` -> `ready_for_qa` -> `reviewed` -> `accepted`

- `planned -> implementing`: the PM confirms every dependency is `accepted`,
  assigns one bounded owner, and re-verifies exact paths, contract artifact,
  non-goals, and focused RED command.
- `implementing -> ready_for_qa`: the bounded implementation and focused
  verification are complete, and independent task review reports no open
  P0/P1.
- `ready_for_qa -> reviewed`: independent behavioral QA passes and the PM
  reconciles its evidence and limitations.
- `reviewed -> accepted`: independent release review and fresh verification
  pass with no unresolved load-bearing finding.
- Any P0/P1, scope change, dependency change, or contract change returns the
  affected task to `implementing` after PM reconciliation. Tasks do not skip a
  state.

Only the PM changes task state. A development commit or green focused test is
not acceptance.

## Sequencing

- Tasks 1 through 5 are serialized shared-contract work. Task 2 starts only
  after Task 1 is `accepted`; Task 3 after Task 2; Task 4 after Task 3; and Task
  5 after Task 4.
- Task 6 starts only after Tasks 1 through 5 are all `accepted`.
- Task 1 has no open dependency. The PM assigned the bounded writer Typed Graph
  Index Integration and recorded `planned -> implementing` under the exact
  four Graph paths below.
- Task 1 implementation commit
  `86d5a00f26d5f331764de0e8bf7694e657cd2514` passed independent task review
  with no P0/P1/P2. Independent behavioral QA also passed with no P0/P1/P2.
  Release review then found one load-bearing P1 in duplicate identifier
  handling. The PM recorded `reviewed -> implementing` and authorized repair
  round 1 by the same bounded writer. Repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` passed independent re-review
  and repair-round behavioral QA with no P0/P1/P2. The PM recorded
  `ready_for_qa -> reviewed`. Final release review returned RELEASE PASS with
  no P0/P1/P2, and fresh verification passed. The PM recorded
  `reviewed -> accepted`.
- Task 2's Task 1 dependency is now `accepted`. The PM assigned Typed Manifest
  Contract Integration as its bounded writer and recorded
  `planned -> implementing` under the exact four Capabilities paths below.
- Task 2 implementation commit
  `4458bfc7c8ffcaef29dfebb755d8399e12000198` remained inside those paths, but
  independent task review found two P1s. Task 2 remains `implementing`; repair
  round 1 is authorized only for the in-path strict-validator defect. The
  separate Graph persistence/ownership gap requires an architecture amendment
  before Task 4. Repair commit
  `a7331df0ac6a6f54f82bf61a060607777bc06dc0` is present inside the exact
  boundary but has not passed independent re-review, so state does not advance.
- Tasks 3 through 6 remain `planned`; none is dispatched by this transition.
- No frontend/backend parallel implementation is permitted in this project.
- Commercial Capability Foundation Task 2 remains `implementing` and
  escalated. It cannot resume acceptance until this project's Task 6 is
  accepted and its evidence is reconciled.
- Commercial Capability Foundation Tasks 3 and 4 remain `planned` and blocked
  on accepted Commercial Foundation Task 2.

## Project state

| Task                                           | State          | Specialization | Contract owner                               | Contract status                                             |
| ---------------------------------------------- | -------------- | -------------- | -------------------------------------------- | ----------------------------------------------------------- |
| 1. Pure typed Graph symbol index               | `accepted`     | `integration`  | Application Graph Type System                | Release review and fresh verification passed.               |
| 2. Typed manifest and binding contracts        | `implementing` | `integration`  | Capability Binding Contract                  | Two review P1s open; repair round 1 and amendment required. |
| 3. Safe versioned physical capability assets   | `planned`      | `integration`  | Golden Capability Asset Registry             | Blocked on accepted Task 2 manifest contract.               |
| 4. Manifest-aware Draft composition validation | `planned`      | `integration`  | Draft Composition Admission                  | Blocked on accepted Tasks 1-3 and architecture amendment.   |
| 5. Graph-aware Publish and compiler admission  | `planned`      | `backend`      | Published Graph and Compiler Admission       | Blocked on accepted Tasks 1-4.                              |
| 6. Current recipe migration and acceptance     | `planned`      | `integration`  | Typed Binding Migration and Release Evidence | Blocked on accepted Tasks 1-5.                              |

## Task 1: Add a pure typed Graph symbol index

- **State:** `accepted` (repair round 1)
- **Specialization:** `integration`
- **Bounded writer:** Typed Graph Index Integration
- **Contract owner:** Application Graph Type System
- **Contract artifact:** ADR-0006 DEC-003 and the design's Graph typed symbol
  index contract.
- **Dependencies:** accepted ADR-0006, approved design/plan, and the current
  `ApplicationGraphV1`. No task dependency.
- **Produces:** `createGraphSymbolIndex(graph)` and capability-agnostic typed
  reference resolution for entities, fields by entity owner, pages,
  navigation, roles, flows, providers, and experience tokens.

### Dispatch evidence

- The PM verified accepted ADR-0006, the approved design and plan, the current
  `ApplicationGraphV1`, and no task dependency before recording
  `planned -> implementing`.
- Typed Graph Index Integration owns only the four exact paths below. Any
  additional path or contract change stops the task for PM reconciliation.
- Implementation begins with focused failing namespace and ownership tests:
  `pnpm --filter @factory/graph test -- --run test/application-graph.test.ts`.
  The expected RED is the absence of an owner-aware typed resolver.
- Before task review, the writer must run
  `pnpm --filter @factory/graph test -- --run test/application-graph.test.ts test/browser-entry.test.ts`,
  `pnpm --filter @factory/graph typecheck`, and
  `pnpm --filter @factory/graph lint`.
- This transition supplies implementation authority only. It is not Task 1
  completion, review, QA, release review, or acceptance evidence.

### Exact allowed paths

- `packages/graph/src/model.ts`
- `packages/graph/src/index.ts`
- `packages/graph/src/browser.ts`
- `packages/graph/test/application-graph.test.ts`

### Implementation and task-review evidence

- Reviewed implementation commit:
  `86d5a00f26d5f331764de0e8bf7694e657cd2514`
  (`feat: index typed graph symbols`).
- The implementation changes only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, both inside the exact
  four-path boundary. It changes no Graph serialization/schema contract,
  capability package, Publish, compiler, lifecycle, or Workbench path.
- Fresh verification on Node `v22.11.0` passed 30/30 tests in
  `test/application-graph.test.ts` and `test/browser-entry.test.ts`, plus
  Graph typecheck and lint.
- Independent Task 1 review of
  `4617cb23752e17eaa223bdddb1b3f3164472f2a3..86d5a00f26d5f331764de0e8bf7694e657cd2514`
  returned PASS with no P0/P1/P2. The PM therefore records
  `implementing -> ready_for_qa`.
- This implementation/task-review evidence alone did not constitute behavioral
  QA, release review, or acceptance.

### Behavioral QA evidence

- Independent QA ran on Node `v22.11.0` against implementation commit
  `86d5a00f26d5f331764de0e8bf7694e657cd2514`.
- `pnpm --filter @factory/graph test -- --run` passed 30/30 tests.
  `pnpm --filter @factory/graph typecheck`,
  `pnpm --filter @factory/graph lint`, and
  `pnpm --filter @factory/graph build` all passed.
- A direct public `dist/browser.js` probe passed 17/17 owner-scoped
  duplicate/wrong/missing-field assertions and 18/18 isolated-namespace
  assertions. Wrong or missing owners and fields returned `undefined`.
- Browser/model source and built output contained no Node builtin or
  `@factory/capabilities` import.
- The implementation diff
  `4617cb23752e17eaa223bdddb1b3f3164472f2a3..86d5a00f26d5f331764de0e8bf7694e657cd2514`
  changed only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`. Subsequent commits through
  PM QA baseline `b4b8abd5813c2f0d50ba056b7c238b4947a70270` changed
  documentation only, and diff checks were clean.
- Independent QA returned PASS with no P0/P1/P2. The PM reconciles this as
  `ready_for_qa -> reviewed`; release review and fresh acceptance verification
  remain required.
- Limitation: Task 1 supplies only the pure typed Graph index. Tasks 2 through
  5 remain required to define typed manifests and safe assets and enforce
  semantic bindings at Draft, Publish, and compiler admission. Task 1 alone
  does not close the parent Foundation defect.

### Release finding and repair round 1

- Release review of implementation commit
  `86d5a00f26d5f331764de0e8bf7694e657cd2514` and its reconciled evidence found
  one verified P1. The generic `indexBy` constructs a `Map` from keyed values,
  so a duplicate key silently uses the last declaration.
- Application Graph semantic validation rejects several duplicate identifier
  classes but does not reject duplicate navigation-entry IDs or duplicate flow
  IDs. Those invalid Graphs can therefore reach the index and resolve to the
  last declaration instead of failing closed.
- This is load-bearing for typed bindings because navigation and flow are
  independent typed namespaces. An ambiguous immutable Graph symbol cannot be
  allowed to resolve by declaration order.
- The prior task-review and QA results remain historical evidence, but they do
  not support acceptance while this P1 is open. The PM records
  `reviewed -> implementing`.
- Repair round 1 remains assigned to **Typed Graph Index Integration** under
  the unchanged **Application Graph Type System** contract and exact four paths.
  No new path, contract, serialization format, capability dependency, or
  downstream task is authorized.
- Begin with focused failing tests proving duplicate navigation-entry IDs and
  duplicate flow IDs are rejected and cannot be silently overwritten by the
  typed index:
  `pnpm --filter @factory/graph test -- --run test/application-graph.test.ts`.
- GREEN must add fail-closed duplicate handling for both identifier classes
  while preserving owner-aware fields, all isolated namespaces, and valid
  Graph behavior. Before re-review, run the focused application/browser tests,
  full Graph tests, Graph typecheck, lint, build, and bounded diff checks.
- Repair round 1 requires independent task re-review before the PM can return
  Task 1 to `ready_for_qa`.

### Repair implementation and re-review evidence

- Repair commit `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  (`fix: reject ambiguous graph symbols`) is a direct child of repair
  authorization `7a0ee76e620d92032c07c7272d2b637e6835a8cc`.
- The repair changes only `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, both inside the unchanged
  four-path Task 1 boundary.
- `indexBy` now throws `GraphSemanticError` on a duplicate key instead of
  retaining the last declaration. Semantic parse and validation now report
  duplicate navigation-entry IDs and duplicate flow IDs.
- Focused regressions prove `validateApplicationGraph`,
  `parseApplicationGraph`, and `createGraphSymbolIndex` all fail closed for
  each affected identifier class.
- Fresh Node `v22.11.0` verification passed 32/32 focused application/browser
  tests and 32/32 full Graph tests. Graph typecheck, lint, build, and repair
  diff checks passed.
- Independent re-review of
  `7a0ee76e620d92032c07c7272d2b637e6835a8cc..784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`
  returned PASS with no P0/P1/P2. The PM records
  `implementing -> ready_for_qa`.
- This evidence is not repair-round behavioral QA, release review, or
  acceptance.

### Repair-round behavioral QA evidence

- Independent re-QA ran on Node `v22.11.0` against repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50`.
- `pnpm --filter @factory/graph test -- --run` passed 32/32 tests.
  `pnpm --filter @factory/graph typecheck`,
  `pnpm --filter @factory/graph lint`, and
  `pnpm --filter @factory/graph build` passed; repair diff checks were clean.
- Direct public built-browser probes proved semantic validation, parsing, and
  indexing all reject duplicate navigation-entry IDs and duplicate flow IDs.
  Neither declaration resolves by order.
- Owner-scoped field probes and isolated typed-namespace probes passed after
  the generic `indexBy` hardening.
- Browser/model source and built output contained no Node builtin or
  `@factory/capabilities` import.
- The repair scope remained exactly `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`.
- Independent re-QA returned PASS with no P0/P1/P2. The PM records
  `ready_for_qa -> reviewed`; independent release review and fresh acceptance
  verification remain required.
- Deferred limitation: `parseApplicationGraph` still accepts a duplicate
  domain field, while `validateApplicationGraph`,
  `assertValidApplicationGraph`, and `createGraphSymbolIndex` reject it. This
  repair round added the missing navigation/flow parse rejection and did not
  broaden into pre-existing domain-field parse behavior.

### Final release and acceptance evidence

- Final independent release review of repair commit
  `784ebb0b3f30d3dad4cb7cc6ac7b4f1efc42fa50` and reconciled governance
  baseline `d6f8b994fef491ef5405fee44ae015f01de788e5` returned RELEASE PASS with
  no P0/P1/P2.
- Fresh Node `v22.11.0` acceptance verification passed 32/32 full Graph tests,
  Graph typecheck, lint, build, and the bounded repair diff check.
- The accepted code scope remains exactly `packages/graph/src/model.ts` and
  `packages/graph/test/application-graph.test.ts`, inside Task 1's four-path
  boundary. No product code changed after the reviewed repair.
- The deferred `parseApplicationGraph` duplicate-domain-field limitation
  remains documented. Validation, assertion, and typed indexing fail closed,
  and release review reported no load-bearing finding from that limitation
  within Task 1's bounded contract.
- The PM records `reviewed -> accepted`. Task 1 is frozen unless a new verified
  finding or contract change returns it through PM reconciliation.
- Acceptance is limited to the pure typed Graph index. Tasks 2 through 5 remain
  required to define typed manifests and safe assets and enforce semantic
  bindings at Draft, Publish, and compiler admission. Task 1 acceptance does
  not close the parent Foundation defect.

### Non-goals

- No capability-manifest import or validation in `@factory/graph`.
- No Graph serialization, lock grammar, Profile recipe, package version,
  Publish, compiler, Workbench, or lifecycle change.
- No globally merged namespace and no Profile/package/version/field-name
  dispatch.

### Acceptance evidence

- Focused RED proves no owner-aware typed index exists.
- GREEN proves a field resolves only under its declared entity, independently
  typed names remain separate, duplicate field keys across entities are safe,
  and browser exports remain Node-builtin-free.
- The original Graph verification, task review, and behavioral QA passed, but
  release review exposed the duplicate-identifier P1. Repair round 1 and
  independent re-review, re-QA, final release review, and fresh verification
  now pass. Task 1 is `accepted`.

## Task 2: Freeze typed manifest and binding contracts

- **State:** `implementing` (repair round 1)
- **Specialization:** `integration`
- **Bounded writer:** Typed Manifest Contract Integration
- **Contract owner:** Capability Binding Contract
- **Contract artifact:** ADR-0006 DEC-001/DEC-002 and
  `factory.capability-binding/v1` in the accepted design.
- **Dependencies:** Task 1 `accepted`.
- **Produces:** finite typed manifest input declarations, strict
  manifest-schema consistency, and the explicit owner-aware field-binding
  object.

### Dispatch evidence

- The PM verified accepted ADR-0006, the approved design and implementation
  plan, and Task 1 `accepted`. Task 2 has no other task dependency.
- Typed Manifest Contract Integration owns only the four exact paths below
  under the unchanged Capability Binding Contract. Any additional path,
  dependency, or contract change stops the task for PM reconciliation.
- Begin with focused failing strict-contract tests:
  `pnpm --filter @factory/capabilities test -- --run test/typed-binding-contract.test.ts test/composition-contract.test.ts`.
- Expected RED: `typed-binding-contract.test.ts` and the strict contract do not
  exist; current manifest `inputSchema.type` is free-form and a binding object
  carries only `graphSymbol`, not an owner-aware field key.
- GREEN must add the finite binding-input union, owner/scalar/required/unique
  field constraints, owner-aware field object, and strict parameter/schema
  consistency described by ADR-0006 and the plan.
- Before task review, run the two focused contract suites and Capabilities
  typecheck, lint, and bounded diff checks.
- This transition supplies Task 2 implementation authority only. It is not
  completion, review, QA, release review, or acceptance evidence.

### Exact allowed paths

- `packages/capabilities/src/assets/contract.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/test/composition-contract.test.ts`
- `packages/capabilities/test/typed-binding-contract.test.ts`

### Implementation review findings and repair round 1

- Reviewed implementation commit
  `4458bfc7c8ffcaef29dfebb755d8399e12000198`
  (`feat: define typed capability bindings`) is a direct child of Task 2
  dispatch `bf77d90a5e2e7627ad806b7851462935b2add7e0` and changes exactly the
  four Task 2 paths above.
- Independent review of
  `bf77d90a5e2e7627ad806b7851462935b2add7e0..4458bfc7c8ffcaef29dfebb755d8399e12000198`
  found two P1s. Task 2 remains `implementing`; no prior green test or
  implementation evidence advances its state.
- **P1 1 -- strict schema is not exact:** the manifest validator validates
  required values but does not enforce exact own-key allowlists for field and
  non-field input declarations, and it accepts duplicate entries in
  `fieldTypes`.
- Repair round 1 remains assigned to **Typed Manifest Contract Integration**
  under the unchanged **Capability Binding Contract** and exact four paths.
  Begin with focused failing tests proving unexpected own keys reject for each
  strict input shape and repeated scalar entries in `fieldTypes` reject.
- GREEN must enforce the exact allowed own keys for a non-field input
  (`key`, `type`, `required`) and for a field input (`key`, `type`, `required`,
  `ownerBinding`, `fieldTypes`, optional `fieldRequired`, optional
  `fieldUnique`), while preserving every previously required strict-contract
  rejection. Re-run the focused contract suites, Capabilities typecheck/lint,
  bounded diff checks, and independent task re-review.
- Repair implementation commit
  `a7331df0ac6a6f54f82bf61a060607777bc06dc0`
  (`fix: close typed binding schemas`) is a direct child of the reviewed
  implementation and changes only `packages/capabilities/src/composition.ts`
  and `packages/capabilities/test/typed-binding-contract.test.ts`. It remains
  unreviewed evidence and does not advance Task 2 from `implementing`.
- **P1 2 -- Graph persistence has no owner:** Task 2 can create a binding value
  with `fieldKey`, but the strict `ApplicationGraphV1` composition-binding
  schema accepts only `{ graphSymbol }`. A field binding therefore cannot
  survive Graph parse/serialization as the owner-aware object required by the
  accepted design.
- No current Task 2-6 exact-path boundary owns the required Application Graph
  schema, browser entry, parser/serializer, and regression-test changes. This
  is a plan/contract ownership gap, not authority to edit Graph code under Task 2.
- Before Task 4 can start, an architecture amendment must reconcile ADR/design,
  implementation plan, and project ledger ownership for the Graph field-binding
  shape and its browser/parser/serialization evidence. Until that amendment is
  accepted, Task 4 has an explicit architecture blocker.
- This PM update changes no contract and authorizes no Graph-path
  implementation.

### Blocking non-goals

- No physical package root, package registration, profile recipe, Draft entry
  point, Publish, compiler, Workbench, or lifecycle change.
- No historical binding rewrite, compatibility fallback, or free-form input
  kind.
- No Profile/package/version/field-name dispatch.

### Acceptance evidence

- Focused RED proves current manifest input types and field bindings are not
  owner-aware.
- GREEN rejects a field input without a required entity owner/scalar set,
  unknown owner bindings, duplicate schema keys, parameter/schema
  key-or-required mismatch, field constraints on non-fields, missing field keys,
  and field keys on non-field inputs.
- Contract tests, Capabilities typecheck, task review, QA, release review, and
  fresh verification pass before `accepted`.

## Task 3: Publish safe versioned physical capability assets

- **State:** `planned`
- **Specialization:** `integration`
- **Contract owner:** Golden Capability Asset Registry
- **Contract artifact:** ADR-0006 DEC-005 and the design's new Golden version
  table.
- **Dependencies:** Tasks 1 and 2 `accepted`.
- **Produces:** verified `core.location-context@1.0.1`,
  `commerce.inventory-ledger@1.0.1`, and `commerce.inventory@2.0.0` physical
  packages while every existing version remains byte-for-byte unchanged.

### Exact allowed paths

- `packages/capabilities/src/assets/core/location-context-v1-0-1.ts`
- `packages/capabilities/src/assets/commerce/inventory-ledger-v1-0-1.ts`
- `packages/capabilities/src/assets/commerce/inventory-v2-0-0.ts`
- `packages/capabilities/assets/core.location-context/1.0.1/**`
- `packages/capabilities/assets/commerce.inventory-ledger/1.0.1/**`
- `packages/capabilities/assets/commerce.inventory/2.0.0/**`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/node.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/capabilities/test/commercial-capability-assets.test.ts`

### Non-goals

- No edit to historical `core.location-context@1.0.0`,
  `commerce.inventory-ledger@1.0.0`, or `commerce.inventory@1.0.x` roots,
  source registrations, evidence, or digests.
- No recipe migration, Draft composition, Publish, compiler, Workbench,
  Profile behavior, or lifecycle change.
- No external source copy, provider activation, credential, or arbitrary
  manifest material.

### Acceptance evidence

- Focused RED proves the safe versions and physical evidence do not exist.
- GREEN verifies new manifests, component bytes, fixtures, contract evidence,
  adapters, registrations, and digests; stale or tampered evidence fails.
- Historical roots and accepted digests remain unchanged and inspectable.
- Registry/assets tests, Capabilities typecheck/lint, task review, QA, release
  review, and fresh physical verification pass before `accepted`.

## Task 4: Enforce typed validation at public Draft composition

- **State:** `planned`
- **Specialization:** `integration`
- **Contract owner:** Draft Composition Admission
- **Contract artifact:** ADR-0006 DEC-004 for Draft admission and the design's
  generic manifest-aware validation contract.
- **Dependencies:** Tasks 1, 2, and 3 `accepted`.
- **Produces:** one generic validator used by public
  `composeCapabilityDraft`, with current safe selections available for later
  migration.

### Exact allowed paths

- `packages/capabilities/src/index.ts`
- `packages/capabilities/test/commercial-profile-composition.test.ts`
- `packages/capabilities/test/composition-contract.test.ts`
- `packages/capabilities/test/typed-binding-composition.test.ts`

### Non-goals

- No Publish, compiler, Control Plane, Workbench, physical-package, or
  historical-lock change.
- No per-Profile validator, Profile/package/version/field-name dispatch, global
  field uniqueness, or scalar-only ownership inference.
- Inventory provenance, PolicyModel, and effect-overlap rules remain separate
  package semantics.

### Acceptance evidence

- Focused RED proves wrong-entity and wrong-type existing symbols pass the
  current public boundary.
- GREEN resolves every input through the typed Graph index; wrong namespace,
  owner, scalar, required, or unique semantics reject, while valid duplicate
  field names across entities pass.
- Focused composition/contract tests, full Capabilities tests, typecheck/lint,
  task review, QA, release review, and fresh verification pass before
  `accepted`.

## Task 5: Gate Publish and compiler admission with the immutable Graph

- **State:** `planned`
- **Specialization:** `backend`
- **Contract owner:** Published Graph and Compiler Admission
- **Contract artifact:** ADR-0006 DEC-004 for verified Publish and compiler
  admission.
- **Dependencies:** Tasks 1 through 4 `accepted`.
- **Produces:** Graph-aware verified-lock and compiler gates that validate the
  exact immutable Graph and selected safe locks before persistence or output
  creation.

### Exact allowed paths

- `packages/capabilities/src/node.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/composition-compilation.test.ts`
- `packages/compiler/test/typed-binding-compilation.test.ts`

### Non-goals

- No profile recipe migration, Workbench UI, generated business runtime,
  provider, payment, identity-provider, deployment, or external-source change.
- No unsafe lock-only public overload, mutable-Draft compiler input, or output
  creation before typed validation.
- No Profile/package/version/field-name/source-path/target dispatch.

### Acceptance evidence

- Focused RED proves Publish and compiler admission lack the exact Graph
  semantic input.
- GREEN proves invalid typed bindings persist no Published revision or lock and
  create no compiler target directory, file, or artifact.
- Valid immutable Graph/lock inputs remain deterministic.
- Lifecycle/compiler tests, affected typechecks/lint, task review, QA, release
  review, and fresh no-output verification pass before `accepted`.

## Task 6: Migrate current recipes and resume Foundation acceptance

- **State:** `planned`
- **Specialization:** `integration`
- **Contract owner:** Typed Binding Migration and Release Evidence
- **Contract artifact:** accepted Tasks 1-5 plus the plan's current-recipe
  migration and acceptance contract.
- **Dependencies:** Tasks 1 through 5 all `accepted`.
- **Produces:** current Restaurant and Ecommerce recipes selecting verified
  safe typed versions, owner-aware field objects, and evidence required to
  resume Commercial Capability Foundation Task 2 acceptance gates.

### Exact allowed paths

- `packages/capabilities/src/index.ts`
- `packages/capabilities/src/restaurant/profile.ts`
- `packages/capabilities/test/commercial-profile-composition.test.ts`
- `packages/capabilities/test/restaurant-profile.test.ts`
- `packages/capabilities/test/capability-registry.test.ts`
- `docs/acceptance/typed-capability-binding-validation.md`
- `docs/audits/restaurant-ordering-requirements-audit.md`
- `docs/project-status.md`

### Non-goals

- No rewrite of historical packages, locks, Published revisions, or generated
  artifacts.
- No Task 1-5 contract repair, compiler runtime exactly-once implementation,
  Workbench redesign, new Profile, external provider, payment, deployment, or
  source import.
- No claim that Task 6 acceptance automatically accepts Commercial Foundation
  Task 2; the PM must reconcile that parent ledger separately.

### Acceptance evidence

- Focused RED proves current recipes still select unsafe untyped versions.
- GREEN proves current recipes use safe locks and owner-aware field objects,
  historical locks remain inspectable but are ineligible for new Drafts, and
  Restaurant/Ecommerce bindings remain distinct and deterministic.
- Full Graph, Capabilities, Control Plane, and Compiler focused/full
  verification and typechecks pass on Node `v22.11.0`.
- Independent task review, QA, release review, acceptance documentation, audit
  reconciliation, and fresh verification pass before `accepted`.
- Commercial Foundation Task 2 acceptance remains blocked until the PM
  separately reconciles Task 6 evidence. Runtime exactly-once execution remains
  later Commercial Foundation Task 3 scope.

## Cross-task stop conditions and risks

- Any ADR/design contract, task dependency, or exact-path change stops the
  affected task and all downstream tasks for PM/architecture reconciliation.
- The missing Graph owner-aware field-binding persistence path is such a
  contract/ownership gap. Task 4 cannot start until an accepted architecture
  amendment assigns its Graph schema, browser, parser/serializer, and test
  ownership. Task 2 repair round 1 may not absorb those paths.
- Tasks 1-5 remain serialized. Task 6 cannot start early, even if a downstream
  test can be made green independently.
- Historic package roots, evidence, digests, Published revisions, and locks are
  immutable. Migration always creates a new Draft revision and selects new
  verified versions.
- Draft, verified Publish, and compiler admission must use the same exact Graph
  and selected locks. An unsafe lock-only or mutable-Draft path is a release
  blocker.
- Runtime atomicity and exactly-once stock execution across intentional
  inventory co-providers remain Commercial Foundation Task 3 scope and are not
  proven by this project.
- This PM transition authorizes only Task 2 repair round 1 by Typed Manifest
  Contract Integration in its existing exact four paths. It authorizes no
  Graph-path change and no Task 3-6 implementation.

## Next smallest valuable slice

Run independent Task 2 repair-round re-review of
`4458bfc7c8ffcaef29dfebb755d8399e12000198..a7331df0ac6a6f54f82bf61a060607777bc06dc0`
inside the unchanged four-path boundary. Separately require an accepted
architecture amendment for Graph field-binding persistence before Task 4.
Leave Tasks 3-6 `planned`.
