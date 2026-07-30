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

Phase 1, Composition kernel, is complete. Tasks 1 through 3 have frozen the
canonical lock, physical contribution-verification, immutable publication, and
pre-generation collision contracts. Task 4's dependency is cleared, but its
implementation remains unauthorized until exact path ownership and a bounded
task brief are recorded.

| Task                                                   | State      | Evidence-backed status                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Composition contract and canonical immutable lock   | `accepted` | Commits `d2f6517..27a8433`; final independent re-review clean. The accepted contract canonicalizes exact Golden package identities and fails closed on invalid composition input.                                                                                                                                                                                                                                                                                                              |
| 2. Physical Graph and target contribution verification | `accepted` | Commits `33f9f31..0e1cc33`; final independent re-review clean. Physical packages, digests, runtime metadata, namespaces, and contribution collisions are verified fail closed.                                                                                                                                                                                                                                                                                                                 |
| 3. Publish and compile an immutable composition lock   | `accepted` | Baseline commit `a2fac21`; repairs through `e509b6c`. Final task review and release review approved with no P0/P1/P2; independent QA passed with no P0/P1. Fresh verification passed Graph 19/19, Capabilities 108/108, Control Plane 111/111, compiler 169/169, Worker 74/74, all five typechecks, targeted Prettier, and `git diff --check`. The immutable publication, closed binding grammar, raw-before-canonicalization validation, and pre-generation collision contracts are accepted. |
| 4. Shared-commerce composition with different bindings | `planned`  | Unblocked by accepted Task 3. Implementation is not yet authorized: no Task 4 brief exists, and the plan's `corresponding` asset-file scope is not an exact path-ownership record.                                                                                                                                                                                                                                                                                                             |
| 5. Release gate and migrated-dispatch retirement       | `planned`  | Blocked on accepted Task 4. Node 22 generated-runtime and isolated Compose evidence remains this task's later release gate.                                                                                                                                                                                                                                                                                                                                                                    |

Development, review, QA, release review, and fresh verification for Tasks 1
through 3 ran on host Node 24. This is valid Task 3 acceptance evidence. It is
not generated-runtime Node 22 or isolated Compose evidence, which remains the
Task 5 release gate.

## Active ownership: Task 4 definition gate

- Specialization: `integration` planning; implementation owner unassigned
- Contract owner: Factory Platform Integration (root controller)
- Contract status: Tasks 1 through 3 are accepted and frozen. Task 4 may consume
  only those contracts. Restaurant-specific compiler dispatch remains until
  Task 4 proves its replacement.
- Contract artifact:
  `docs/superpowers/specs/2026-07-30-parameterized-capability-composition-design.md`
- Plan slice:
  `docs/superpowers/plans/2026-07-30-parameterized-capability-composition.md`
  Task 4.
- Task brief: not yet created.
- Path-ownership status: not frozen. The plan names package roots and uses
  `corresponding` adapter, fixture, test, and template files rather than an
  exact permitted-path list.
- Acceptance-evidence status: not yet frozen in a Task 4 brief and ledger
  handoff.
- Dependency baseline: Tasks 1 through 3, all `accepted`.

The root controller owns the definition gate. Task 4 is dependency-unblocked
but remains `planned`; no product edit is authorized by this ledger until the
brief, exact paths, assignment, and acceptance evidence are frozen.

## Task 4 authorization prerequisites

- Create a bounded Task 4 brief under
  `.superpowers/sdd/2026-07-30-parameterized-capability-composition/`.
- Record an assigned implementation specialization and owner, the accepted
  Task 1 through 3 contract baseline, and the frozen design artifact.
- Replace the plan's `corresponding` shorthand with an exact permitted-path
  ownership list for every manifest, adapter, fixture, test, template, registry,
  and compiler-test file the task may change.
- Record focused RED/GREEN, physical digest regeneration, cross-profile lock
  identity, different-binding output, relevant package regression, typecheck,
  formatting, and independent review evidence requirements.
- Only after those fields are reconciled may the controller move Task 4 from
  `planned` to `implementing`. Task 5 remains blocked on accepted Task 4.

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

- Blocked decisions: none for accepted Task 3. Task 4 is dependency-unblocked;
  its remaining definition gate is governance work, not a product decision. A
  future finite enum parameter would require a separate, manifest-owned
  allowed-value contract and is not a reason to reopen arbitrary strings here.
- Risk: a compatibility fallback or partial denylist could reopen the rejected
  Draft-persistence channel for credentials, commands, source, or raw model
  material.
- Risk: changing lock reconstruction, publication, or compiler preflight while
  closing the grammar could regress the immutable Draft-to-Publish compilation
  boundary or the accepted pre-generation collision gate.
- Risk: authorizing Task 4 before its exact physical-asset and test paths are
  owned could create overlapping edits or incomplete digest regeneration.
- Risk: Task 5 remains blocked until Task 4 is accepted.
- Risk: Node 22 generated-runtime evidence and isolated Compose lifecycle
  evidence are still required at the Task 5 release gate and must not be
  inferred from host Node 24 task checks.

## Explicit non-goals

- No task card or additional governance artifact is created by this ledger.
- No free-form string, label channel, or enum design is added to composition
  bindings; PageModel remains the content boundary.
- No product repair, package manifest, physical asset, Workbench/Puck, Worker,
  compiler source, Restaurant runtime dispatch, plan, specification, or
  unrelated documentation change belongs to this acceptance handoff.
- No Task 4 implementation is authorized merely by accepting Task 3. No Task 5
  dispatch removal, generated-runtime acceptance, or production deployment work
  is included.
- No arbitrary marketplace, external package download, runtime plugin
  execution, source reverse parsing, free-form code generation, real payment,
  cloud deployment, or ungoverned third-party connection is included.
- No credentials, raw prompts, raw responses, model-selected paths, URLs,
  commands, source, or deployment targets may be stored or reported.

## Next smallest valuable slice

The root controller creates the bounded Task 4 brief, freezes exact permitted
paths and acceptance evidence in this ledger, and assigns a non-overlapping
implementation owner. Only then does Task 4 advance from `planned` to
`implementing`; Task 5 remains blocked until Task 4 reaches `accepted`.
