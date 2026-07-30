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

Phase 1, Composition kernel. Tasks 1 and 2 have frozen the canonical lock and
physical contribution-verification contracts. Task 3 is closing the remaining
Draft-ingestion boundary before shared-commerce composition work can begin.

| Task | State | Evidence-backed status |
| --- | --- | --- |
| 1. Composition contract and canonical immutable lock | `accepted` | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input. |
| 2. Physical Graph and target contribution verification | `accepted` | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed. |
| 3. Publish and compile an immutable composition lock | `implementing` (fix round 4 of 5) | Baseline commit `a2fac21`; repair commits `169f00b`, `100d9a6`, and `f8d570b`. The pre-generation output-path collision gate is accepted. Independent review rejected free-string screening as an architecture error, so round 4 must implement the closed binding grammar before QA. |
| 4. Shared-commerce composition with different bindings | `planned` | Depends on accepted Task 3. No implementation is authorized by this ledger. |
| 5. Release gate and migrated-dispatch retirement | `planned` | Depends on accepted Tasks 3 and 4. Node 22 generated-runtime and isolated Compose evidence remains a later release gate. |

Development verification for accepted Tasks 1 and 2 ran on host Node 24. It is
valid task-development evidence but is not generated-runtime Node 22 release
evidence.

## Active ownership: Task 3 fix round 4

- Specialization: `integration`
- Contract owner: Factory Platform Integration (root controller)
- Contract status: Tasks 1 and 2 are accepted and frozen. Task 3 may consume
  only those contracts. The round-4 closed composition-binding grammar is
  frozen by the design contract and plan. Restaurant-specific compiler dispatch
  remains until Task 4 proves its replacement.
- Contract artifact:
  `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
- Task brief:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-3-r4-brief.md`
- Dependency baseline: Task 1 canonical composition lock and Task 2 physical
  contribution verifier, both `accepted`.

The assigned integration engineer may begin immediately. There is no open
product decision in the round-4 scope.

## Exact permitted paths for Task 3 fix round 4

- `packages/graph/src/model.ts`
- `packages/graph/test/application-graph.test.ts`
- `packages/capabilities/src/assets/contract.ts`
- `packages/capabilities/src/composition.ts`
- `packages/capabilities/test/composition-contract.test.ts`
- `apps/control-plane/src/lifecycle.service.ts` only if compilation fails after
  the closed grammar change
- `apps/control-plane/test/lifecycle.service.test.ts`
- `packages/compiler/test/compilation-plan.test.ts`
- `packages/compiler/test/profile-compilation.test.ts`
- `packages/compiler/test/restaurant-runtime.test.ts`
- `packages/compiler/test/restaurant-page-runtime.test.ts`
- `packages/compiler/test/restaurant-merchant-runtime.test.ts`
- `packages/capabilities/test/restaurant-profile.test.ts`

No other product path is authorized. The engineer must not change manifests,
physical package files, Workbench/Puck, Worker, compiler source, Restaurant
runtime dispatch, plans, specifications, documentation, or this ledger.

## Frozen behavior and acceptance evidence

`factory.composition/v1` is a constrained binding channel. A binding value is
only a finite number, a boolean, or an exact `{ graphSymbol }` object. Every
direct string is invalid, including a label. Free-form text is PageModel
content, not a composition binding; labels, messages, descriptions, and page
copy remain valid when they are stored and validated as PageModel props.

Task 3 fix round 4 must produce all of the following evidence before moving to
`ready_for_qa`:

- Focused RED evidence showing direct strings still parse or resolve before the
  implementation change. Coverage must include a credential-like string, a
  SQL/source/command-looking string, a normal PageModel label such as
  `Make a reservation`, and a valid Graph-symbol binding.
- Focused GREEN evidence proving the Graph parser rejects every direct string
  composition binding before Draft persistence, while the normal PageModel
  label and valid Graph symbol still parse.
- Capability evidence proving the legacy `string` parameter type and string
  value are rejected, while finite numbers, booleans, and exact Graph symbols
  continue to resolve.
- Existing Published-lock lifecycle and relevant compiler regressions remain
  green without a raw-string fallback or weakening the accepted lazy
  pre-generation output-path collision gate.
- Relevant full package tests, typechecks, focused formatting, and
  `git diff --check` pass and are recorded without including sensitive or raw
  model material.
- An independent task review confirms the change is load-bearing and confined
  to the permitted paths. Independent QA, release review, and fresh
  verification must then be reconciled before Task 3 can become `accepted`.

## Blocked decisions and risks

- Blocked decisions: none for fix round 4. A future finite enum parameter would
  require a separate, manifest-owned allowed-value contract and is not a reason
  to reopen arbitrary strings here.
- Risk: a compatibility fallback or partial denylist could reopen the rejected
  Draft-persistence channel for credentials, commands, source, or raw model
  material.
- Risk: changing lock reconstruction, publication, or compiler preflight while
  closing the grammar could regress `Draft -> Publish -> immutable
  Compilation` or the accepted pre-generation collision gate.
- Risk: Task 4 cannot safely bind shared commerce packages until Task 3 is
  accepted; Tasks 4 and 5 remain sequentially blocked by that contract gate.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the later release gate and must not be
  inferred from host Node 24 development checks.

## Explicit non-goals

- No task card or additional governance artifact is created by this ledger.
- No free-form string, label channel, or enum design is added to composition
  bindings; PageModel remains the content boundary.
- No package manifest, physical asset, Workbench/Puck, Worker, compiler source,
  Restaurant runtime dispatch, plan, specification, or unrelated documentation
  change belongs to fix round 4.
- No Task 4 recipe migration, shared-commerce proof, Task 5 dispatch removal,
  generated-runtime acceptance, or production deployment work is included.
- No arbitrary marketplace, external package download, runtime plugin
  execution, source reverse parsing, free-form code generation, real payment,
  cloud deployment, or ungoverned third-party connection is included.
- No credentials, raw prompts, raw responses, model-selected paths, URLs,
  commands, source, or deployment targets may be stored or reported.

## Next smallest valuable slice

The integration engineer writes the focused round-4 RED tests, replaces the
Graph and capability free-string/denylist behavior with the closed binding
grammar in the permitted paths, and produces the required GREEN and regression
evidence. The task then advances to `ready_for_qa`; Task 4 does not start until
Task 3 reaches `accepted`.
