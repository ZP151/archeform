# Compiler Target Plugin Kernel Goal Ledger

Updated: 2026-08-06

Goal design:
`docs/superpowers/specs/2026-08-06-compiler-target-plugin-kernel-goal-design.md`

Implementation plan:
`docs/superpowers/plans/2026-08-06-compiler-target-plugin-kernel.md`

Branch: `feat/compiler-target-plugin-kernel`
Remote: `origin` (https://github.com/ZP151/assembler.git)

## Iteration entries

Every entry records owned task and paths, RED command and expected failure,
GREEN and regression commands with exact totals, digest-parity result or
explained disposition, review findings and repairs, the already-pushed
implementation commit hash and observed remote reachability, residual risk,
and the next task. An evidence entry never predicts the hash of the commit
that contains it.

### Stage 0: Typed Binding Task 2 reconciliation (2026-08-06)

- **Owned task:** reconcile Typed Capability Binding Task 2 with accepted
  Task 2A through fresh evidence and the existing governance state machine
  (Goal design Stage 0). Paths: governance records plus the bounded
  Task 2 test path only.
- **Decision:** the accepted Task 2A immutable composition resolution boundary
  closes Task 2's repair-round-4 repeated-read P1. No further local Task 2
  repair was needed.
- **RED (no product behavior change was required):** the recorded repeated-read
  witness (getter-backed `manifest.parameters` returning a different strict
  parameter schema on each read) is rejected with zero getter invocations by
  the Task 2A capture boundary; before Task 2A the witness produced incoherent
  parameter schemas between schema validation and binding validation.
- **GREEN / regression evidence (Node v22.11.0):**
  - focused Task 2/2A suites: 80/80 (34 typed-binding-contract + 46
    composition-contract) at fa57d52, then 83/83 (37 + 46) after the two P2
    branch tests at 0dbe0cf;
  - full `@factory/capabilities`: 279/279 at fa57d52, 282/282 at 0dbe0cf;
  - full `@factory/compiler`: 237/237;
  - Capabilities typecheck, lint, and build pass;
  - `git diff --check` clean; worktree clean at each gate.
- **Review findings and repairs:** task review found two P2 test-coverage gaps
  (`fieldRequired`/`fieldUnique` non-boolean branch; strict parameter
  graph-symbol alignment branch). Repair commit `0dbe0cf` added exactly the
  two regression tests to `packages/capabilities/test/typed-binding-contract.test.ts`
  (+25 lines, one file). Re-review returned TASK_REVIEW_PASS with no P0/P1/P2.
- **Gates completed (all cite Target-Commit `0dbe0cf`):**
  - independent task review: TASK_REVIEW_PASS (SPEC PASS, QUALITY PASS, no
    P0/P1/P2);
  - PM: `implementing -> ready_for_qa` (recorded at f530306);
  - independent behavioral QA: QA_PASS, no P0/P1/P2 (focused 83/83,
    Capabilities 282/282, Compiler 237/237, typecheck/lint/build, adversarial
    zero-getter probes, single-digest determinism probe, bounded scope);
  - PM: `ready_for_qa -> reviewed` (recorded in the typed-binding ledger);
  - independent release review and PM `reviewed -> accepted`: pending next.
- **Remote reachability:** fa57d52, 0dbe0cf, and f530306 are reachable from
  `origin/feat/compiler-target-plugin-kernel` (observed via
  `git branch -r --contains`).
- **Residual risk:** Task 2 acceptance is limited to the typed manifest and
  binding contracts; Typed Binding Graph Tasks 3-7 remain `planned` and
  blocked. Commercial Foundation Task 2 remains escalated.
- **Next task:** complete Task 2 release review and PM `reviewed -> accepted`,
  then Stage 1 (plugin kernel).

### Stage 1: Plugin kernel

- **Owned task and paths:** create
  `packages/compiler/src/core/target-plugin.ts`,
  `packages/compiler/src/core/target-registry.ts`,
  `packages/compiler/src/core/generated-files.ts`, and their focused tests;
  keep `packages/compiler/src/index.ts` a thin facade. Not started.
- **Next task:** implement Stage 1 after Stage 0 closes.

## Residual risks and stop conditions

- Any stop condition declared by the Skill (unexplained output drift, public
  contract change, dependency change, remote divergence, repeated unlocalized
  failure) returns `GOAL_NEEDS_DECISION` with evidence and no scope expansion.
- Parity failures block the affected target migration until explained; an
  intentional output change requires a separate documented decision.
- Typed Binding Task 2 must be `accepted` before Stage 1 begins; its remaining
  gates are the immediate next step.
