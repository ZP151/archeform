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
different Graph-symbol bindings and produce different outputs.

| Task                                                   | State          | Evidence-backed status                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Composition contract and canonical immutable lock   | `accepted`     | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input.                                                                                                                                                                                                                                                                                                              |
| 2. Physical Graph and target contribution verification | `accepted`     | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed.                                                                                                                                                                                                                                                                                                                 |
| 3. Publish and compile an immutable composition lock   | `accepted`     | Baseline commit `a2fac21`; repairs through `e509b6c`. Final task review and release review approved with no P0/P1/P2; independent QA passed with no P0/P1. Fresh verification passed Graph 19/19, Capabilities 108/108, Control Plane 111/111, compiler 169/169, Worker 74/74, all five typechecks, targeted Prettier, and `git diff --check`. The immutable publication, closed binding grammar, raw-before-canonicalization validation, and pre-generation collision contracts are accepted. |
| 4. Shared-commerce composition with different bindings | `implementing` | Contract and exact path ownership frozen by `99801cd`. The integration owner must prove identical shared package identities, different canonical Graph-symbol bindings, different outputs, generated digest regeneration, and no profile-clone or profile-dispatch admission dependency.                                                                                                                                                                                                       |
| 5. Release gate and migrated-dispatch retirement       | `planned`      | Blocked on accepted Task 4. Node 22 generated-runtime and isolated Compose evidence remains this task's later release gate.                                                                                                                                                                                                                                                                                                                                                                    |

Development, review, QA, release review, and fresh verification for Tasks 1
through 3 ran on host Node 24. This is valid Task 3 acceptance evidence. It is
not generated-runtime Node 22 or isolated Compose evidence, which remains the
Task 5 release gate.

## Active ownership: Task 4 shared-commerce composition

- Specialization and implementation owner: `integration`
- Contract owner: Factory Platform Integration (root controller)
- Contract status: Tasks 1 through 3 are accepted and frozen. Task 4 may consume
  only those contracts. The Graph-symbol recipe realization and exact path
  ownership are frozen by commit `99801cd`. Existing Restaurant-specific
  compiler dispatch remains untouched until Task 5 removes only behavior proven
  migrated by Task 4.
- Contract artifact:
  `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
- Task brief and plan slice:
  `docs/superpowers/plans/2026-07-30-parameterized-capability-composition.md`
  Task 4, as amended by `99801cd`.
- Interface: `composeCapabilityDraft({ graph, selections })` consumes an
  already-valid Graph and accepts only finite numbers, booleans, or exact
  `{ graphSymbol }` binding objects. Task 4 does not add a string or enum
  binding contract.
- Dependency baseline: Tasks 1 through 3, all `accepted`.

The integration owner may begin within the exact paths and behavior below. No
other product path or contract change is authorized.

## Exact permitted paths for Task 4

- `packages/capabilities/src/index.ts`
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
- `packages/compiler/test/composition-compilation.test.ts`
- Only if the profile-choice adapter must switch to the generic resolver:
  - `apps/workbench/lib/profile-starters.ts`
  - `apps/workbench/lib/profile-starters.test.ts`
  - `apps/workbench/lib/guided-application.ts`
  - `apps/workbench/lib/guided-application.test.ts`

No sibling asset key or version, Graph package, Control Plane, Worker, compiler
source, plan, specification, project status, or other Workbench path is
authorized.

## Frozen Task 4 behavior and acceptance evidence

`composeCapabilityDraft({ graph, selections })` consumes an already-valid base
Graph and produces a new Draft with canonical
`integration.compositionSelections`. Every binding is a finite number, a
boolean, or an exact `{ graphSymbol }` object. Shared-commerce compositions must
use Graph symbols for entity, page, route, role, field, and flow references;
Task 4 must not add a direct string or enum binding type.

Task 4 must produce all of the following evidence before moving to
`ready_for_qa`:

- Focused RED evidence proving the current profile starter clones a
  profile-specific whole Graph and no generic resolver binds packages to an
  already-valid Graph through Graph symbols.
- Focused GREEN evidence proving Restaurant and Ecommerce compose through
  `composeCapabilityDraft` using Graph-symbol-only selections over already-valid
  Graphs. Finite-number and boolean support may remain, but no composition may
  depend on a direct string or enum binding.
- Generated manifest and template digest regeneration for every changed
  physical package. Digests must be derived from package content, never edited
  manually, and physical verification must remain fail closed.
- Cross-profile evidence proving Restaurant and Ecommerce lock the same
  `core.*` and `commerce.*` package key/version/digest identities, retain
  different canonical bindings, and compile different schema, routes, page
  labels, fixtures, and journeys.
- Evidence that generic composition does not clone `profileGraphs` and package
  admission does not depend on profile membership or hard-coded profile/version
  dispatch. Requirement/provide compatibility and recipe eligibility own
  admission. Existing unmigrated compiler dispatch is not removed in Task 4.
- Focused capability-registry and composition-contract tests, focused compiler
  composition tests, relevant package regressions, typechecks, formatting, and
  `git diff --check`, with exact commands and outcomes recorded.
- Independent task review confirming the proof is load-bearing, confined to the
  permitted paths, and introduces no compatibility fallback or hidden profile
  fork. Independent QA, release review, and fresh verification remain required
  before Task 4 can become `accepted`.

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

- Blocked decisions: none for Task 4. A future finite enum parameter would
  require a separate, manifest-owned allowed-value contract and is outside this
  task; Task 4 must not reopen arbitrary strings or add an enum binding.
- Risk: a compatibility fallback or partial denylist could reopen the rejected
  Draft-persistence channel for credentials, commands, source, or raw model
  material.
- Risk: a partial physical-package update or manually edited digest could leave
  TypeScript registration and Golden package content inconsistent.
- Risk: retaining a profile clone, membership check, or hidden profile/version
  admission branch would invalidate the shared-composition proof.
- Risk: Task 5 remains blocked until Task 4 is accepted.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the Task 5 release gate and must not be
  inferred from host Node 24 task checks.

## Explicit non-goals

- No free-form string, label channel, or enum design is added to composition
  bindings; the already-valid Graph and PageModel remain the content boundary.
- No Graph package, Control Plane, Worker, compiler source, plan, specification,
  project-status, sibling physical package version, or Workbench path outside
  the four conditional adapter files belongs to Task 4.
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

The integration owner writes the focused cross-profile RED proof, implements
`composeCapabilityDraft({ graph, selections })` and Graph-symbol-only shared
package bindings inside the permitted paths, regenerates all changed physical
digests from content, and produces the required GREEN and regression evidence.
The task then advances to `ready_for_qa`; Task 5 remains blocked until Task 4
reaches `accepted`.
