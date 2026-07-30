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
and scoped review are complete; independent behavioral QA owns the next gate.

| Task                                                   | State                                   | Evidence-backed status                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Composition contract and canonical immutable lock   | `accepted`                              | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input.                                                                                                                                                                                                                                                                                                              |
| 2. Physical Graph and target contribution verification | `accepted`                              | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed.                                                                                                                                                                                                                                                                                                                 |
| 3. Publish and compile an immutable composition lock   | `accepted`                              | Baseline commit `a2fac21`; repairs through `e509b6c`. Final task review and release review approved with no P0/P1/P2; independent QA passed with no P0/P1. Fresh verification passed Graph 19/19, Capabilities 108/108, Control Plane 111/111, compiler 169/169, Worker 74/74, all five typechecks, targeted Prettier, and `git diff --check`. The immutable publication, closed binding grammar, raw-before-canonicalization validation, and pre-generation collision contracts are accepted. |
| 4. Shared-commerce composition with different bindings | `ready_for_qa` (fix round 3 reconciled) | Implementation range `ed87dfd`, `b2a9d45`, `6410b92`, and `f054802`. Final round-3 scoped re-review approved the original P1 repair and code quality with no new P0/P1/P2. Generic Graph-symbol composition, persisted-lock-only compilation, canonical package admission, and complete nine-package proof are implemented. Independent QA, release review, and fresh verification remain.                                                                                                     |
| 5. Release gate and migrated-dispatch retirement       | `planned`                               | Blocked on accepted Task 4. Node 22 generated-runtime and isolated Compose evidence remains this task's later release gate.                                                                                                                                                                                                                                                                                                                                                                    |

Development, review, QA, release review, and fresh verification for Tasks 1
through 3 ran on host Node 24. This is valid Task 3 acceptance evidence. It is
not generated-runtime Node 22 or isolated Compose evidence, which remains the
Task 5 release gate.

Task 4 implementation and scoped review also ran on host Node 24. This is valid
development evidence only; independent QA remains required, and Node 22 plus
isolated Compose remain Task 5 gates.

## Active ownership: Task 4 independent QA

- Specialization and active owner: `qa`
- Contract owner: Factory Platform Integration (root controller)
- Contract status: Tasks 1 through 3 are accepted and frozen. Task 4 may consume
  only those contracts. The Graph-symbol recipe realization and exact path
  ownership were frozen by `99801cd` and expanded only for the four review
  repairs by `65855a0`; `f9ac86b` adds only two legacy compiler test fixtures
  that require explicit persisted locks, and `a57ea6c` adds only the merchant
  runtime test fixture for the same purpose. `afc92d9` adds only the stale
  capability-profile test fixture. Existing Restaurant-specific compiler
  dispatch remains untouched until Task 5 removes only behavior proven migrated
  by Task 4.
- Implementation status: frozen at `f054802`; implementation range is core
  `ed87dfd`, fix round 1 `b2a9d45`, fix round 2 `6410b92`, and fix round 3
  `f054802`.
- Review status: final fix-round-3 scoped re-review approved the original P1
  repair and code quality with no new P0/P1/P2.
- Contract artifact:
  `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
- Task brief and plan slice:
  `docs/superpowers/plans/2026-07-30-parameterized-capability-composition.md`
  Task 4, as amended by `99801cd`, repair commit `65855a0`, and regression-scope
  commits `f9ac86b`, `a57ea6c`, and `afc92d9`.
- Repair brief and task report:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-4-r1-brief.md`
  and
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-4-report.md`.
- Fix round 2 review package:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-4-r2-review-package.md`.
- Final fix round 3 review package:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-4-r3-review-package.md`.
- Interface: `composeCapabilityDraft({ graph, selections })` consumes an
  already-valid Graph and accepts only finite numbers, booleans, or exact
  `{ graphSymbol }` binding objects. Task 4 does not add a string or enum
  binding contract.
- Dependency baseline: Tasks 1 through 3, all `accepted`.

Independent QA owns the next gate. No product edit is authorized during this
handoff. A reproducible load-bearing defect returns Task 4 to `implementing`
under a separately recorded repair round.

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

## Independent QA scope for Task 4

Independent QA must behaviorally validate all of the following against the
frozen implementation:

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

QA must record exact commands, runner version, test counts, outcomes, and a
finding severity. Task 5 remains blocked until Task 4 reaches `accepted`.

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

Task 4 implementation and review produced the following evidence to reach
`ready_for_qa`; independent QA must now reproduce the load-bearing behavior
before the task can become `reviewed`:

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
  fallback or hidden profile fork remains. Independent QA, release review, and
  fresh verification remain required before Task 4 can become `accepted`.

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

- Blocked decisions: none for Task 4 independent QA. The duplicated Graph-symbol
  resolver is deferred P2 maintenance and must not expand this repair. A future
  finite enum parameter would require a separate, manifest-owned allowed-value
  contract and is outside this task; Task 4 must not reopen arbitrary strings or
  add an enum binding.
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
- Risk: a Restaurant-only empty-lock exception would preserve a profile-specific
  production fallback and let Factory capabilities compile without immutable
  package identity.
- Risk: missing exact commands and outcomes in the Task 4 report would make the
  RED/GREEN and nine-root verification evidence non-reproducible.
- Risk: Task 5 remains blocked until Task 4 is accepted.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the Task 5 release gate and must not be
  inferred from host Node 24 task checks.

## Explicit non-goals

- No free-form string, label channel, or enum design is added to composition
  bindings; the already-valid Graph and PageModel remain the content boundary.
- No file outside the exact permitted paths, sibling physical package version,
  Worker path, plan, specification, or project status belongs to the Task 4 QA
  handoff; the implementation path set is frozen.
- No duplicated Graph-symbol resolver extraction belongs to Task 4 solely for
  the deferred P2 maintenance concern.
- No production fallback or runtime dispatch change is authorized by the three
  added compiler regression-fixture paths.
- No Capabilities production source, runtime, or fallback change is authorized
  by the Restaurant profile test-fixture path.
- No profile-specific empty-lock exception is permitted; historical empty
  bindings are valid only for a selected package whose manifest declares no
  parameters, inside a nonempty persisted composition lock.
- No full profile Graph clone, new profile membership gate, or hard-coded
  profile/version admission branch is added.
- No Task 5 dispatch removal, Node 22 generated-runtime acceptance, isolated
  Compose lifecycle, or production deployment work is included.
- No arbitrary marketplace, external package download, runtime plugin
  execution, source reverse parsing, free-form code generation, real payment,
  cloud deployment, or ungoverned third-party connection is included.
- No credentials, raw prompts, raw responses, model-selected paths, URLs,
  commands, source, or deployment targets may be stored or reported.

## Next smallest valuable slice

Independent QA reproduces generic Graph-symbol composition, active Workbench
selections, direct Draft/Publish symbol resolution, dependent public admission,
the complete nine-package same-identity/different-binding/different-output proof,
all-profile empty-lock rejection, physical digest verification, and Task 4
report reproducibility. If QA is clean, the controller reconciles it with the
approved final review and advances Task 4 to `reviewed`. Task 5 remains blocked
until Task 4 reaches `accepted`.
