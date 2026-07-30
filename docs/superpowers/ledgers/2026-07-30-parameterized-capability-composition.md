# Parameterized Capability Composition Project Ledger

Updated: 2026-07-30
Plan: `docs/superpowers/plans/2026-07-30-parameterized-capability-composition.md`
Design contract: `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
Execution record: `.superpowers/sdd/2026-07-30-parameterized-capability-composition/progress.md`

## Workflow

The only valid task states are:

`planned` → `implementing` → `ready_for_qa` → `reviewed` → `accepted`

- `planned`: scope, specialization, contract ownership, dependencies, permitted
  paths, and acceptance evidence are recorded.
- `implementing`: the assigned engineer owns the bounded change and its TDD
  evidence. A review repair returns to this state with an explicit fix round.
- `ready_for_qa`: implementation and focused verification are complete and the
  change is awaiting independent behavioral validation.
- `reviewed`: independent task review and QA are reconciled with no open
  load-bearing finding; release review and fresh verification remain required.
- `accepted`: task review, QA, release review, and fresh verification evidence
  are reconciled. Intent, a commit, or green development tests alone do not
  qualify.

## Current milestone

Phase 2, Shared commerce proof. Tasks 1 through 3 have frozen the canonical
lock, physical contribution-verification, immutable publication, and
pre-generation collision contracts. Task 4 now owns the bounded proof that
Restaurant and Ecommerce can compose the same Golden package identities through
different Graph-symbol bindings and produce different outputs. Its implementation
and scoped review completed, and independent behavioral QA passed, but broad
release review found one load-bearing compiler source-of-truth defect. Fix round
4 addressed it, passed scoped re-review, and passed repeated independent QA with
no P0/P1/P2. Repeated broad release review approved with no P0/P1/P2, and fresh
root verification passed. Task 4 is accepted and frozen. Task 5 now owns the
bounded release gate and migrated-dispatch retirement. Implementation commit
`b616a0c` passed independent task review with no P0/P1/P2; Task 5 is
`ready_for_qa`.

| Task                                                   | State          | Evidence-backed status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Composition contract and canonical immutable lock   | `accepted`     | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2. Physical Graph and target contribution verification | `accepted`     | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 3. Publish and compile an immutable composition lock   | `accepted`     | Baseline commit `a2fac21`; repairs through `e509b6c`. Final task review and release review approved with no P0/P1/P2; independent QA passed with no P0/P1. Fresh verification passed Graph 19/19, Capabilities 108/108, Control Plane 111/111, compiler 169/169, Worker 74/74, all five typechecks, targeted Prettier, and `git diff --check`. The immutable publication, closed binding grammar, raw-before-canonicalization validation, and pre-generation collision contracts are accepted.                                                                                                             |
| 4. Shared-commerce composition with different bindings | `accepted`     | Implementation range `ed87dfd`, `b2a9d45`, `6410b92`, `f054802`, and `1cfae6e`. Scoped re-review, repeated independent QA, and repeated broad release review passed with no P0/P1/P2. Fresh root verification passed Graph 23/23, Capabilities 112/112, Control Plane 115/115, compiler 173/173, Worker 74/74, five TypeScript typechecks, compiler lint, scoped Prettier, `git diff --check`, and a clean worktree. Compiler decisions come only from the verified immutable composition lock; active Workbench uses `composeDefaultCapabilityDraft`; legacy fixtures cannot substitute a published lock. |
| 5. Release gate and migrated-dispatch retirement       | `ready_for_qa` | Implementation commit `b616a0c`; independent task review found no P0/P1/P2 and approved specification compliance and quality. Review verified lock-derived migrated dispatch, the bounded unmigrated Restaurant branch, Worker composition-lock fail-closed behavior, shared Prisma relation mapping including `tableCode` and `categoryKey`, scoped documentation, and no unsafe raw or cleanup behavior. Independent QA must reproduce deterministic compiler/Worker behavior and both isolated Node 22 Restaurant and Ecommerce Compose lifecycles with exact scoped cleanup.                           |

Development, review, QA, release review, and fresh verification for Tasks 1
through 3 ran on host Node 24. This is valid Task 3 acceptance evidence. It is
not generated-runtime Node 22 or isolated Compose evidence, which remains the
Task 5 release gate.

Task 4 implementation, review, QA, and fresh verification ran on host Node
v24.18.0 while repository engines declare Node 22. This development-environment
warning is nonblocking for Task 4 acceptance. Node 22 generated-runtime and
isolated Compose evidence remain Task 5 gates.

## Active ownership: Task 5 independent release-gate QA

- Specialization and active owner: `qa`
- Contract owner: Factory Platform Integration (root controller)
- State: `ready_for_qa`
- Contract status: Tasks 1 through 4 are accepted and frozen. Task 5 consumes
  fully published immutable composition locks and generic compiler output; it
  does not reopen the Graph, capability, Publish, or compilation-input contract.
- Approved plan slice:
  `docs/superpowers/plans/2026-07-30-parameterized-capability-composition.md`
  Task 5.
- Generated task brief:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-5-brief.md`.

### Exact permitted Task 5 paths

- `packages/compiler/src/index.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `apps/compiler-worker/test/compilation-executor.test.ts`
- `docs/acceptance/restaurant-ordering-mvp.md`
- `docs/acceptance/parameterized-capability-composition.md` (new)
- `docs/project-status.md`

No other production, test, acceptance, plan, specification, or status path is
authorized. This PM transition changes no product code or contract.

### Implemented scope and independent task review

- Implementation commit: `b616a0c`.
- The implementation started with negative compiler evidence proving
  `compositionProfile` cannot select a migrated target contribution and Worker
  evidence proving a job with a mismatched persisted composition-lock artifact
  digest rejects.
- The implementation removed only `handlerBackedCapabilityPackages` and
  `resolveGeneratedRuntimeMode` behavior for core and shared-commerce assets
  proven migrated by accepted Task 4. It kept unmigrated Restaurant runtime
  modules until their own parameterized assets exist.
- Compiler behavior now comes from the published lock's resolved contributions,
  never `restaurant-ordering`, `simple-ecommerce`, or an asset-version switch.
- Independent task review approved specification compliance and code quality
  with no P0/P1/P2. It verified lock-derived migrated dispatch, the bounded
  unmigrated Restaurant branch, Worker composition-lock fail-closed behavior,
  shared Prisma relation mapping including `tableCode` and `categoryKey`, scoped
  documentation, and no unsafe raw or cleanup behavior.
- Task review explicitly deferred reproducibility of both Node 22 Compose
  lifecycles to independent QA.

### Independent QA requirements before Task 5 can leave `ready_for_qa`

- Reproduce the focused compiler composition and compilation-plan tests proving
  deterministic compilation, lock-derived migrated behavior, and no migrated
  profile/version dispatch.
- Reproduce the focused Worker executor test proving a job whose persisted
  composition-lock artifact digest differs rejects fail closed.
- Run one Restaurant and one Ecommerce Published revision as isolated generated
  applications on Node 22, using unique Compose project names and loopback ports.
- Verify each generated application's role journey and stopped-preview state.
- Verify exact label-scoped removal of each run's containers, network, volumes,
  and runtime directory. Do not touch any other Docker project.
- Reconcile the acceptance record using only redacted immutable revision IDs,
  Graph hashes, composition-lock digests, artifact counts, exact test commands,
  outcomes, and scoped cleanup results.
- Report findings by P0/P1/P2 severity. Release review and fresh verification
  remain required before `accepted`.

Dependencies are Tasks 1 through 4, all `accepted`. Independent QA owns the next
gate and may not edit product code. A reproducible load-bearing defect returns
Task 5 to `implementing` under a recorded repair round.

## Frozen implementation path ownership for Task 4

- `packages/capabilities/src/index.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/src/assets/index.ts`
- `packages/capabilities/src/assets/core/audit-v1-0-1.ts`
- `packages/capabilities/src/assets/core/crud-v1-0-1.ts`
- `packages/capabilities/src/assets/core/notification-v1-0-1.ts`
- `packages/capabilities/src/assets/core/workflow-v1-0-1.ts`
- `packages/capabilities/src/assets/commerce/catalog.ts`
- `packages/capabilities/src/assets/commerce/cart.ts`
- `packages/capabilities/src/assets/commerce/inventory-v1-0-1.ts`
- `packages/capabilities/src/assets/commerce/order.ts`
- `packages/capabilities/src/assets/commerce/simulated-payment-v1-0-1.ts`
- Only files beneath these nine exact physical asset version roots:
  - `packages/capabilities/assets/core.audit/1.0.1/`
  - `packages/capabilities/assets/core.crud/1.0.1/`
  - `packages/capabilities/assets/core.notification/1.0.1/`
  - `packages/capabilities/assets/core.workflow/1.0.1/`
  - `packages/capabilities/assets/commerce.catalog/1.0.0/`
  - `packages/capabilities/assets/commerce.cart/1.0.0/`
  - `packages/capabilities/assets/commerce.inventory/1.0.1/`
  - `packages/capabilities/assets/commerce.order/1.0.0/`
  - `packages/capabilities/assets/commerce.simulated-payment/1.0.1/`
- `packages/capabilities/test/capability-registry.test.ts`
- `packages/capabilities/test/composition-contract.test.ts`
- `packages/capabilities/test/restaurant-profile.test.ts`, only to give the
  stale test fixture helper an explicit nonempty canonical persisted composition
  lock
- `packages/graph/src/model.ts`
- `packages/graph/test/application-graph.test.ts`
- `apps/control-plane/src/lifecycle.service.ts`
- `apps/control-plane/test/lifecycle.service.test.ts`
- `packages/compiler/src/index.ts`
- `packages/compiler/test/composition-compilation.test.ts`
- `packages/compiler/test/profile-compilation.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `packages/compiler/test/restaurant-runtime.test.ts`, only to give legacy test
  inputs explicit nonempty persisted composition locks
- `packages/compiler/test/restaurant-page-runtime.test.ts`, only to give legacy
  test inputs explicit nonempty persisted composition locks
- `packages/compiler/test/restaurant-merchant-runtime.test.ts`, only to replace
  stale empty-lock fixture inputs with explicit nonempty canonical persisted
  composition locks
- `apps/workbench/lib/profile-starters.ts`
- `apps/workbench/lib/profile-starters.test.ts`
- `apps/workbench/lib/guided-application.ts`
- `apps/workbench/lib/guided-application.test.ts`

No sibling asset key or version, other Capabilities, Graph, Control Plane,
compiler, or Workbench path, Worker path, plan, specification, or project status
is authorized.

The three added compiler test files authorize fixture updates only. They do not
authorize a production source fallback, generated-runtime behavior change, or
Restaurant runtime dispatch change.

The added capability profile test path authorizes only its stale fixture helper
to supply an explicit nonempty canonical persisted composition lock. It does not
authorize a Capabilities production source, runtime, or fallback change.

## Independent QA evidence for Task 4

Independent QA behaviorally validated all of the following against the frozen
implementation:

- Generic `composeCapabilityDraft` composition over already-valid Graphs using
  finite numbers, booleans, and exact Graph-symbol bindings only.
- Every active Workbench profile choice emits exact generic composition
  selections and does not clone `profileGraphs` or rely on `assetLocks` fallback.
- Every composition Graph symbol resolves across direct Draft ingestion and all
  Draft-to-Publish routes before persistence or immutable-lock creation.
- Every public current-package admission route uses canonical dependency and
  provider resolution; an otherwise eligible Restaurant cart-only selection
  rejects without catalog.
- Complete nine-package Restaurant and Ecommerce compositions retain the same
  package key/version/digest identities, different canonical bindings, and
  different schema, routes, PageModel labels, fixtures, and role journeys.
- Every profile with Factory capabilities rejects an empty persisted composition
  lock; Restaurant runtime, page-runtime, merchant-runtime, and capability
  profile fixtures exercise explicit canonical nonempty locks without a source
  fallback or dispatch change.
- All nine physical package roots and regenerated manifest/template digests
  verify fail closed.
- The Task 4 report is reproducible from its exact RED, GREEN, final, targeted
  Prettier, and executable nine-root verification commands and outcomes.

QA recorded exact commands, the Node 24 runner, test counts, outcomes, and no
P0/P1/P2. Focused Graph 7/7, Capabilities 7/7, Workbench 2/2, Control Plane
11/11, and compiler 2/2 passed. Full Graph 23/23, Capabilities 112/112, compiler
172/172, Workbench 66/66, and Control Plane 115/115 passed. Five typechecks, the
all-profile empty-lock probe, exact nine-root verification, targeted Prettier,
and `git diff --check` also passed. The Node 24 engine warning and deferred
duplicated Graph-symbol resolver were nonblocking. Task 5 is now unblocked by
accepted Task 4.

## Repeated independent QA evidence after fix round 4

- Conflicting Graph `integration.assetLocks` could not change runtime mode
  selected from persisted `compositionLock.packages`: 1/1 passed.
- Combined compiler behavior passed 2/2; mixed persisted-lock rejection passed
  1/1, proving invalid lock state fails closed without a Graph-lock fallback and
  without retiring Task 5-reserved dispatch.
- Full Graph 23/23, Capabilities 112/112, compiler 173/173, Workbench 66/66, and
  Control Plane 115/115 passed. Five typechecks, full compiler Prettier, and diff
  checks also passed.
- Independent QA reported no P0/P1/P2. Broad release review and fresh
  verification repeated cleanly before acceptance.

Task 5 is unblocked by accepted Task 4 and remains `planned`.

## Task 4 acceptance evidence after fix round 4

- Independent release review approved with no P0/P1/P2.
- The compiler receives package, template, and runtime decisions only from the
  verified immutable composition lock.
- Active Workbench composition uses `composeDefaultCapabilityDraft`; legacy
  asset-lock and capability-profile fixtures cannot substitute for a published
  immutable lock.
- Fresh root verification passed Graph 23/23, Capabilities 112/112, Control
  Plane 115/115, compiler 173/173, Worker 74/74, five TypeScript typechecks,
  compiler lint, scoped Prettier, `git diff --check`, and a clean worktree.
- Verification ran on host Node v24.18.0 while engines declare Node 22. This is a
  nonblocking development-environment warning; isolated Node 22 generated-runtime
  and Compose acceptance remain Task 5 evidence.

## Scoped release-review repair closure: fix round 4 of 5

Broad release review requested changes with one P1:

1. **Runtime-mode selection still reads mutable Graph asset locks.**
   `packages/compiler/src/index.ts` function `resolveGeneratedRuntimeMode` reads
   `graph.integration.assetLocks` rather than persisted
   `compositionLock.packages`. Conflicting Graph locks and persisted lock
   packages can therefore select different runtime behavior for the same
   immutable compilation input.

Fix round 4 commit `1cfae6e` derives runtime mode from persisted
`compositionLock.packages` and preserves no Graph-lock fallback. Task 5-reserved
dispatch retirement remains out of scope: fix round 4 changes only the source of
truth used by the existing mode selection.

The focused regression uses conflicting Graph locks and persisted composition
lock packages to prove runtime mode is unchanged by Graph locks. Scoped
re-review approved the repair with no P0/P1/P2. Independent QA repeated this
behavior plus the relevant full compiler/five-project regression and typecheck
evidence with no P0/P1/P2. Repeated broad release review approved with no
P0/P1/P2, and fresh root verification passed. Existing Task 4 compiler
source/test paths covered the repair without path expansion.

## Frozen Task 4 behavior and acceptance evidence

`composeCapabilityDraft({ graph, selections })` consumes an already-valid base
Graph and produces a new Draft with canonical
`integration.compositionSelections`. Every binding is a finite number, a
boolean, or an exact `{ graphSymbol }` object. Shared-commerce compositions must
use Graph symbols for entity, page, route, role, field, and flow references;
Task 4 must not add a direct string or enum binding type.

### Independent-review history: fix round 1 of 5

The same integration owner must repair all four P1 findings without a separate
feature or compatibility layer:

1. **Graph-symbol resolution is not a Draft and Publish boundary.** A
   syntactically valid selection can reference an absent
   `graph.domain.missing`, `graph.page.missing`, `graph.policy.missing`, or
   `graph.flow.missing` symbol. The parser and every Draft-to-Publish route must
   reject it before persistence or immutable-lock creation while continuing to
   accept exact symbols that resolve to the matching entity, page, role, and
   flow object.
2. **The active Workbench profile path is not generic composition.** Each active
   profile choice must pass a validated default base Graph and exact
   Graph-symbol selections to `composeCapabilityDraft`. Restaurant and
   Ecommerce must produce `integration.compositionSelections` for every package
   with required parameters. The active helper must not clone `profileGraphs`
   or rely on an `assetLocks` fallback; `profileGraphs` may remain only as
   expected-output fixtures.
3. **Public shared-package admission is not dependency- and recipe-complete.**
   Any public admission path currently fails to prove that an otherwise exact
   `commerce.cart` selection is rejected when the
   `commerce.catalog-item/v1` provider is absent. A valid ordered
   catalog/cart/order/inventory/payment selection must pass exact identity,
   declared provides/requires, resolved Graph symbols, and recipe eligibility
   without profile membership. The repair must reuse the canonical composition
   resolver rather than duplicate requirement resolution in a lock helper.
4. **The compiler proof is a CRUD surrogate, not a complete immutable
   composition recipe.** The proof must compile the complete nine-package
   Restaurant and Ecommerce selections from the generic profile-choice path,
   each with its persisted immutable composition lock. It must assert the same
   package identities but different canonical bindings and generated schema,
   route, PageModel label, fixture, and role-journey artifacts, accept no legacy
   profile or asset-lock fallback, and retain pre-render collision checking.

### Open scoped re-review findings: fix round 2 of 5

The same integration owner must close all three P1s without expanding the
existing exact product paths:

1. **Every public current-package admission route must use the canonical
   dependency/provider resolver.** An exact, recipe-eligible Restaurant
   `commerce.cart`-only selection that omits the catalog provider must reject.
   The lock-only legacy API must not admit current dependency-bearing assets;
   exact identity or recipe eligibility alone is insufficient without declared
   provider resolution.
2. **Compiler generation must always consume persisted composition-lock
   packages.** Templates and the generated capability lock must be derived from
   `compositionLock.packages`, never from Graph `assetLocks`. Eliminate the
   Graph-asset-lock fallback, and update every legacy test input to carry a
   nonempty persisted composition lock. The Restaurant runtime, page-runtime,
   and merchant-runtime test fixtures may be updated only for those explicit
   locks; no source fallback or runtime dispatch change is permitted.
3. **The Task 4 report is missing exact reproducible evidence.** Append the
   exact focused RED commands and failure outcomes, focused GREEN commands and
   outcomes, and final verification commands and outcomes, including targeted
   Prettier and a fresh physical verification of all nine owned package roots.

The duplicated Graph-symbol resolver is a P2 deferred-maintenance concern. It
does not justify reopening or expanding Task 4 solely to extract a shared
helper; any future cleanup requires its own bounded scope.

### Scoped re-review closure: fix round 3 of 5

Fix round 3 closed this P1 without expanding the existing exact product paths:

1. **The production compiler has a Restaurant-only empty composition-lock
   exception near `packages/compiler/src/index.ts:591`.** Remove the exception.
   Any profile with Factory capabilities and an empty persisted composition lock
   must fail. Every Restaurant runtime, page-runtime, and merchant-runtime
   fixture helper must build an explicit nonempty canonical persisted lock that
   matches the Graph's package identity: current shared packages require valid
   bindings, while a historical package may use empty bindings only when its
   manifest declares no parameters. Add a Restaurant empty-lock rejection
   regression.

   The Restaurant capability-profile test fixture helper must likewise use an
   explicit nonempty canonical persisted composition lock; it must not preserve
   a test-only empty-lock fallback.

Round-3 evidence also proves that targeted Prettier includes every changed
source and test file, including
`packages/compiler/test/restaurant-runtime.test.ts` and
`packages/compiler/test/restaurant-page-runtime.test.ts`, and
`packages/compiler/test/restaurant-merchant-runtime.test.ts`. The Task 4 report
must name the exact executable script or command used for fresh verification of
all nine physical package roots. Targeted Prettier must also include
`packages/capabilities/test/restaurant-profile.test.ts` when changed.

Prior Task 4 implementation, review, and independent QA reconciled the following
load-bearing evidence before broad release review reopened the runtime-mode P1.
Fix round 4 implementation and scoped re-review preserved it. Independent QA
must reproduce the compiler source-of-truth behavior before Task 4 can return to
`reviewed`:

- Focused RED evidence for each of the four P1 findings before its production
  repair, followed by focused GREEN evidence for the exact boundary.
- Graph and lifecycle evidence proving all composition Graph symbols resolve at
  Draft parsing and every Draft-to-Publish route before persistence or
  immutable-lock creation, while valid entity, page, role, and flow symbols
  remain accepted.
- Workbench evidence proving every active profile choice uses a validated base
  Graph plus exact Graph-symbol selections through `composeCapabilityDraft`,
  emits required `integration.compositionSelections`, and has no active
  `profileGraphs` clone or `assetLocks` fallback.
- Public-admission evidence proving every current-package admission route uses
  the canonical dependency/provider resolver; an exact, recipe-eligible
  Restaurant cart-only selection rejects without catalog; the lock-only legacy
  API cannot admit current dependency-bearing assets; and the full ordered
  catalog/cart/order/inventory/payment recipe passes exact identity,
  provides/requires, resolved Graph symbols, and recipe eligibility without
  profile membership.
- Generated manifest and template digest regeneration for every changed
  physical package. Digests must be derived from package content, never edited
  manually, and physical verification must remain fail closed.
- Complete immutable compiler evidence proving the generic profile-choice path
  creates nine-package Restaurant and Ecommerce locks with the same package
  identities, different canonical bindings, and different generated schema,
  routes, PageModel labels, fixtures, and role journeys, without a legacy
  profile fallback and without weakening pre-render collision checks. Templates
  and generated capability-lock output must always use persisted
  `compositionLock.packages`; Graph `assetLocks` fallback is eliminated, and
  legacy test inputs carry a nonempty persisted lock.
- Focused Graph, lifecycle, Workbench, capability-registry,
  composition-contract, and compiler composition tests; affected Capabilities,
  Graph, Control Plane, Workbench, and compiler regressions; relevant
  typechecks; targeted Prettier; physical digest verification for all nine
  package roots; and `git diff --check`, with exact commands and outcomes.
- The full compiler regression suite passes 172/172 with legacy test inputs
  carrying explicit nonempty persisted locks and without adding a source
  fallback or changing runtime dispatch.
- The full Capabilities regression suite passes 112/112 with the Restaurant
  profile fixture helper carrying an explicit nonempty canonical persisted lock.
  All previously frozen Task 4 verification gates remain required.
- Compiler evidence proves the Restaurant-only empty-lock exception is removed,
  every profile with Factory capabilities rejects an empty persisted lock, all
  Restaurant runtime/page-runtime/merchant-runtime fixture helpers use canonical
  locks matching Graph identity, and the Restaurant empty-lock regression
  passes.
- Capability evidence proves the Restaurant profile fixture helper also uses an
  explicit nonempty canonical persisted lock and preserves no test-only
  empty-lock fallback.
- The Task 4 report appends the exact focused RED commands and observed failure
  outcomes, focused GREEN commands and outcomes, and final verification commands
  and outcomes, explicitly including targeted Prettier and fresh verification
  of all nine physical package roots.
- Targeted Prettier covers every changed source and test file, including all
  three Restaurant compiler fixture tests and the Restaurant capability-profile
  fixture test. The Task 4 report names the exact executable script or command
  for fresh nine-root verification.
- Final independent task re-review confirmed the original four P1 themes, all
  three scoped round-2 P1s, and the round-3 P1 are closed; the proof is
  load-bearing and confined to the permitted paths; and no compatibility
  fallback or hidden profile fork remains. Independent QA has passed; release
  review and fresh verification remain required before Task 4 can become
  `accepted`.

## Task 3 accepted evidence

`factory.composition/v1` is a constrained binding channel. A binding value is
only a finite number, a boolean, or an exact `{ graphSymbol }` object. Every
direct string is invalid, including a label. Free-form text is PageModel
content, not a composition binding; labels, messages, descriptions, and page
copy remain valid when they are stored and validated as PageModel props.

Task 3 has reconciled all required behavioral and governance evidence:

- Graph and Draft-ingestion evidence proving every direct string binding is
  rejected before persistence across initial Draft creation, proposal append,
  and direct append. Cases must include credential-like,
  SQL/source/command-looking, and ordinary label text. The same ordinary label,
  including `Make a reservation`, must remain valid as PageModel content, and
  an exact Graph-symbol binding must remain valid.
- Capability-boundary evidence proving public composition resolution and lock
  creation reject the removed `string` parameter type, every direct string,
  malformed Graph symbols, and an object containing `graphSymbol` plus an
  extra field. The extra-field case must prove the raw value is rejected before
  canonicalization; finite numbers, booleans, and exact Graph symbols must
  continue to resolve deterministically.
- Published-lock lifecycle evidence proving an empty explicit selection cannot
  suppress legacy asset locks, Publish stores the canonical composition lock
  atomically, compilation consumes only the persisted immutable lock, and
  missing, tampered, or digest-mismatched locks fail closed.
- Compiler evidence proving generic, legacy Restaurant, and package target
  collisions are rejected by the path-only pre-generation gate before content
  rendering. The rendering sentinel and relevant compiler/profile regressions
  must remain green without a raw-string fallback or a dispatch change.
- Graph passed 18/18 focused and 19/19 full; Capabilities passed 19/19 focused
  and 108/108 full; Control Plane passed 63/63 focused and 111/111 full;
  compiler passed 8/8 focused and 169/169 full; Worker passed 3/3 focused and
  74/74 full. All five relevant typechecks and targeted lint passed.
- Independent QA reported no P0/P1. Pre-existing aggregate lint and formatting
  failures are outside Task 3 and nonblocking.
- Independent release review approved Task 3 with no P0/P1/P2.
- Fresh verification passed Graph 19/19, Capabilities 108/108, Control Plane
  111/111, compiler 169/169, Worker 74/74, all five typechecks, targeted
  Prettier, and `git diff --check`.
- The fresh run used host Node 24 and emitted the known engine warning. Node 22
  generated-runtime and isolated Compose evidence remains the Task 5 release
  gate and is not a reason to withhold Task 3 acceptance.

## Blocked decisions and risks

- Blocked decisions: none for independent Task 5 QA. Tasks 1 through 4
  are accepted, and the approved plan and generated brief freeze the permitted
  paths, dispatch-removal boundary, and acceptance evidence.
- Risk: removing an unmigrated Restaurant runtime module or dispatch branch
  would exceed Task 4 proof and break behavior not yet carried by a
  parameterized asset.
- Risk: host Node 24 checks cannot substitute for the required isolated Node 22
  Restaurant and Ecommerce generated-runtime evidence.
- Risk: unscoped Docker cleanup could affect user-owned projects; cleanup must
  target only exact project labels and run-owned runtime directories.
- Risk: an acceptance record containing unredacted identifiers, credentials, or
  raw model material would violate the evidence boundary.
- Deferred nonblocking maintenance: the duplicated Graph-symbol resolver remains
  P2 and is outside Task 5.
- Risk: a compatibility fallback or partial denylist could reopen the rejected
  Draft-persistence channel for credentials, commands, source, or raw model
  material.
- Risk: shape-valid but unresolved Graph symbols could persist into a Draft or
  immutable lock unless every Draft and Publish boundary resolves them.
- Risk: a partial physical-package update or manually edited digest could leave
  TypeScript registration and Golden package content inconsistent.
- Risk: retaining the active Workbench clone or `assetLocks` fallback would
  bypass the generic selections proven only in helper tests.
- Risk: a public admission path that skips dependency and recipe eligibility
  could accept an incomplete shared-commerce package chain.
- Risk: the lock-only legacy API could admit a current dependency-bearing asset
  unless every public admission route uses the canonical provider resolver.
- Risk: a CRUD-only compiler surrogate could stay green while the complete
  nine-package immutable recipes fail to generate distinct user-facing outputs.
- Risk: a Graph `assetLocks` fallback could make templates or capability-lock
  output diverge from the persisted immutable composition lock.
- Risk: `resolveGeneratedRuntimeMode` reading Graph `assetLocks` can select
  runtime behavior that conflicts with the persisted immutable composition
  lock.
- Risk: a Restaurant-only empty-lock exception would preserve a profile-specific
  production fallback and let Factory capabilities compile without immutable
  package identity.
- Risk: missing exact commands and outcomes in the Task 4 report would make the
  RED/GREEN and nine-root verification evidence non-reproducible.
- Risk: Task 5 must retire only migrated dispatch behavior proven by accepted
  Task 4 evidence.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the Task 5 release gate and must not be
  inferred from host Node 24 task checks.

## Explicit non-goals and Task 5 boundaries

- No path outside the six exact Task 5 paths is authorized.
- No Graph, capability-package, Publish lifecycle, immutable-lock, queue, or
  compiler-input contract change is included.
- No unmigrated Restaurant runtime module or behavior is removed. Only migrated
  core/shared-commerce profile and version dispatch proven by Task 4 may retire.
- No compatibility fallback, new profile membership gate, or hard-coded
  profile/version branch is added.
- No Node 24 run qualifies as generated-runtime acceptance. Restaurant and
  Ecommerce must each pass the isolated Node 22 Compose lifecycle.
- No Docker resource outside the exact run-owned project labels and runtime
  directories may be stopped or removed.
- No production deployment work is included.
- No arbitrary marketplace, external package download, runtime plugin
  execution, source reverse parsing, free-form code generation, real payment,
  cloud deployment, or ungoverned third-party connection is included.
- No credentials, raw prompts, raw responses, model-selected paths, URLs,
  commands, source, or deployment targets may be stored or reported.

## Next smallest valuable slice

Independent QA reproduces the deterministic compiler and fail-closed Worker
evidence, then runs both isolated Node 22 Restaurant and Ecommerce Compose
lifecycles with unique project names and loopback ports. QA verifies both role
journeys, stopped-preview states, and exact label-scoped cleanup before the task
can move to `reviewed`.
