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
  - independent release review: RELEASE PASS with no P0/P1/P2 at `0dbe0cf`;
  - PM: `reviewed -> accepted` for Task 2 (recorded in the typed-binding
    ledger and project status).
- **Remote reachability:** fa57d52, 0dbe0cf, and f530306 are reachable from
  `origin/feat/compiler-target-plugin-kernel` (observed via
  `git branch -r --contains`).
- **Residual risk:** Task 2 acceptance is limited to the typed manifest and
  binding contracts; Typed Binding Graph Tasks 3-7 remain `planned` and
  blocked. Commercial Foundation Task 2 remains escalated.
- **Next task:** Stage 1 (plugin kernel); it began after Task 2 acceptance.

### Stage 1: Plugin kernel (2026-08-06)

- **Iteration state:** `ready_for_qa` — independent task review passed at
  Target-Commit `197270e973cd10b3879662d863b31b2418032a7b`; the next gate is
  fresh independent behavioral QA against `197270e`, then PM `reviewed`, then
  release review, then PM acceptance.
- **Owned task and paths:**
  - created `packages/compiler/src/core/target-plugin.ts` (versioned
    `CompilerTargetPluginV1<TPlan>` contract, `PublishedCompilationInput`,
    `CompilationContextV1`, `CompilationTargetKey`/`CompilationTarget`/
    `compilationTargets` moved from the facade, `TargetValidationResult`);
  - created `packages/compiler/src/core/generated-files.ts` (`GeneratedFile`,
    `sha256Digest`, `assertSafeGeneratedFilePath`,
    `assertSafeGeneratedFileSet`, `sameGeneratedFileSet`);
  - created `packages/compiler/src/core/target-registry.ts`
    (`CompilerTargetRegistryV1`, `createCompilerTargetRegistryV1`,
    `assertSerializablePlan`);
  - `packages/compiler/src/index.ts` remains a thin facade: the moved types
    and the kernel are re-exported, the internal duplicate-path check was
    replaced by the stricter `assertSafeGeneratedFileSet` (path safety +
    collisions), and no target ownership migrated yet.
  - tests: `test/target-plugin.test.ts`, `test/target-registry.test.ts`,
    `test/generated-files.test.ts`.
- **RED:** the kernel did not exist; the focused contract/registry/file-rule
  suites failed with missing exports.
- **GREEN and regression evidence (Node v22.11.0):**
  - kernel focused suites: 47/47 (15 target-plugin + 15 target-registry +
    17 generated-files) at `197270e`;
  - full `@factory/compiler` suite: 284/284 serial
    (`--no-file-parallelism`, 16 files), recorded at `197270e`;
  - `@factory/compiler-worker` regression: 81/81 (recorded at the `5a692fe`
    tree; unchanged by the repair);
  - Compiler typecheck and Prettier lint pass at the clean tree;
    `git diff --check` clean;
  - facade export surface: all 38 prior exports preserved; 12 kernel symbols
    added.
- **Environment note:** a full parallel compiler run flakily times out ~5s in
  the materialize-and-execute runtime suites. Reproduced identically on the
  pre-change tree (stash test at b77f71b: same 9 failures), so it is
  pre-existing machine/timing flakiness, not an iteration regression. The
  serial run is the deterministic green evidence for this iteration.
- **Review findings and repairs:** initial independent task review of
  `5a692fe` (`feat: add target plugin kernel`) found three P2s in
  `assertSerializablePlan`: BigInt was accepted; an array-rooted cycle
  produced a RangeError; the function was ~70 lines. Repair commit `197270e`
  (`fix: close plan serializability gaps`) is bounded to
  `packages/compiler/src/core/target-registry.ts` and
  `packages/compiler/test/target-plugin.test.ts` (+62/-67) and closed all
  three with regression tests. Final re-review of the clean tree exactly at
  `197270e` returned TASK_REVIEW_PASS with SPEC PASS, QUALITY PASS, and no
  P0/P1/P2.
- **Remote reachability:** `197270e973cd10b3879662d863b31b2418032a7b` is the
  branch tip of `origin/feat/compiler-target-plugin-kernel` (observed via
  `git branch -r --contains`).
- **Residual risk:** the facade now applies path-safety rejection to all
  planned files (all current paths are static and safe; the stricter check is
  the fail-closed design intent). Target plugins for docs/policy/database do
  not exist yet; the context type is finalized when the first target lands.
- **Gates completed (cite Target-Commit
  `197270e973cd10b3879662d863b31b2418032a7b`):**
  - independent task review: TASK_REVIEW_PASS (SPEC PASS, QUALITY PASS, no
    P0/P1/P2) at the clean tree exactly at `197270e`;
  - PM: iteration state `ready_for_qa`.
- **Next task:** fresh independent behavioral QA against `197270e`, then PM
  `ready_for_qa -> reviewed`, then independent release review, then PM
  `reviewed -> accepted`, then Stage 2 (documentation target parity).

## Residual risks and stop conditions

- Any stop condition declared by the Skill (unexplained output drift, public
  contract change, dependency change, remote divergence, repeated unlocalized
  failure) returns `GOAL_NEEDS_DECISION` with evidence and no scope expansion.
- Parity failures block the affected target migration until explained; an
  intentional output change requires a separate documented decision.
- Typed Binding Task 2 is `accepted` at `0dbe0cf`; Stage 1 (plugin kernel)
  began after that acceptance. Typed Binding Graph Tasks 3-7 remain `planned`
  and blocked; Commercial Foundation Task 2 remains escalated.
