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
physical contribution-verification contracts. Task 3 has completed fix round 5
and has reconciled its final independent review with passing independent QA.
Release review and fresh verification remain before acceptance. Shared-commerce
composition work remains blocked until Task 3 is accepted.

| Task                                                   | State                               | Evidence-backed status                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Composition contract and canonical immutable lock   | `accepted`                          | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input.                                                                                                                                                                                                                                                                                                              |
| 2. Physical Graph and target contribution verification | `accepted`                          | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed.                                                                                                                                                                                                                                                                                                                 |
| 3. Publish and compile an immutable composition lock   | `reviewed` (fix round 5 reconciled) | Baseline commit `a2fac21`; repair commits `169f00b`, `100d9a6`, `f8d570b`, `26d988e`, and `e509b6c`. Final independent review approved with no P0/P1/P2. Independent QA passed with no P0/P1: Graph 18/18 focused and 19/19 full; Capabilities 19/19 focused and 108/108 full; Control Plane 63/63 focused and 111/111 full; compiler 8/8 focused and 169/169 full; Worker 3/3 focused and 74/74 full; five typechecks and targeted lint passed. Release review and fresh verification remain. |
| 4. Shared-commerce composition with different bindings | `planned`                           | Blocked on accepted Task 3. No implementation is authorized by this ledger.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 5. Release gate and migrated-dispatch retirement       | `planned`                           | Blocked on accepted Tasks 3 and 4. Node 22 generated-runtime and isolated Compose evidence remains a later release gate.                                                                                                                                                                                                                                                                                                                                                                       |

Development, review, and QA verification for Tasks 1 through 3 ran on host Node 24. It is valid task evidence but is not generated-runtime Node 22 or isolated
Compose release evidence.

## Active ownership: Task 3 release review and fresh verification

- Specialization: `release-review` and `verification`
- Contract owner: Factory Platform Integration (root controller)
- Contract status: Tasks 1 and 2 are accepted and frozen. Task 3 may consume
  only those contracts. Task 3 implementation is frozen at `e509b6c`; its
  round-5 final independent review is approved with no P0/P1/P2 findings and
  independent QA passed with no P0/P1 findings. Restaurant-specific compiler
  dispatch remains until Task 4 proves its replacement.
- Contract artifact:
  `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
- Implementation evidence:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-3-r4-report.md`
  and
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-3-r5-report.md`
- Final repair brief and review package:
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-3-r5-brief.md`
  and
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/task-3-r5-review-package.md`
- Independent QA evidence: Graph 18/18 focused and 19/19 full; Capabilities
  19/19 focused and 108/108 full; Control Plane 63/63 focused and 111/111 full;
  compiler 8/8 focused and 169/169 full; Worker 3/3 focused and 74/74 full;
  five typechecks and targeted lint passed. The QA verdict has no P0/P1.
- Dependency baseline: Task 1 canonical composition lock and Task 2 physical
  contribution verifier, both `accepted`.

Independent release review and fresh verification own the next gate. No product
edit is authorized during this handoff. A reproducible load-bearing defect
returns Task 3 to `implementing` under a separately assigned repair scope.
There is no open product decision in the reviewed Task 3 scope.

## Release review and fresh verification scope for Task 3

- Reconcile the frozen design, plan, final review, QA verdict, and committed
  implementation without changing product code, contracts, specifications, or
  downstream task scope.
- Freshly verify the load-bearing Graph, Capabilities, Control Plane, compiler,
  and Worker behavior; record exact commands, runner version, test counts,
  typechecks, targeted lint, and outcomes without sensitive material.
- Confirm that pre-existing out-of-scope aggregate lint and formatting failures
  remain unrelated and nonblocking; do not silently expand Task 3 to fix them.
- Do not start Task 4 or Task 5. Both remain blocked until their recorded
  predecessor acceptance gates are satisfied.

## Frozen behavior and reconciled QA evidence

`factory.composition/v1` is a constrained binding channel. A binding value is
only a finite number, a boolean, or an exact `{ graphSymbol }` object. Every
direct string is invalid, including a label. Free-form text is PageModel
content, not a composition binding; labels, messages, descriptions, and page
copy remain valid when they are stored and validated as PageModel props.

Independent QA reconciled all required Task 3 behavioral evidence:

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
  failures are outside Task 3 and nonblocking. Release review and fresh
  verification must still be reconciled before Task 3 can become `accepted`.

## Blocked decisions and risks

- Blocked decisions: none for Task 3 release review or fresh verification. A
  future finite enum parameter would require a separate, manifest-owned
  allowed-value contract and is not a reason to reopen arbitrary strings here.
- Risk: a compatibility fallback or partial denylist could reopen the rejected
  Draft-persistence channel for credentials, commands, source, or raw model
  material.
- Risk: changing lock reconstruction, publication, or compiler preflight while
  closing the grammar could regress the immutable Draft-to-Publish compilation
  boundary or the accepted pre-generation collision gate.
- Risk: Task 4 cannot safely bind shared commerce packages until Task 3 is
  accepted; Tasks 4 and 5 remain sequentially blocked by that contract gate.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the later release gate and must not be
  inferred from host Node 24 development checks.

## Explicit non-goals

- No task card or additional governance artifact is created by this ledger.
- No free-form string, label channel, or enum design is added to composition
  bindings; PageModel remains the content boundary.
- No product repair, package manifest, physical asset, Workbench/Puck, Worker,
  compiler source, Restaurant runtime dispatch, plan, specification, or
  unrelated documentation change belongs to this reviewed-state handoff.
- No Task 4 recipe migration, shared-commerce proof, Task 5 dispatch removal,
  generated-runtime acceptance, or production deployment work is included.
- No arbitrary marketplace, external package download, runtime plugin
  execution, source reverse parsing, free-form code generation, real payment,
  cloud deployment, or ungoverned third-party connection is included.
- No credentials, raw prompts, raw responses, model-selected paths, URLs,
  commands, source, or deployment targets may be stored or reported.

## Next smallest valuable slice

Independent release review reconciles the frozen contract, implementation,
final task review, and QA evidence while fresh verification reruns the
load-bearing checks at the current commit. If both are clean, the controller
may advance Task 3 from `reviewed` to `accepted`. Task 4 does not start until
that acceptance transition is recorded.
