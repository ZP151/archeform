---
name: factory-p0-compiler
description: Use when autonomously continuing the Factory Pilot P0 compiler-target-plugin execution goal in Claude Code.
disable-model-invocation: true
---

# Factory P0 Compiler Goal

Continue one bounded product goal until completion: reconcile the active typed
binding dependency, establish the compiler target plugin kernel, and migrate
documentation, policy, and database targets with byte-and-digest parity.

Governing files:

- Design: `docs/superpowers/specs/2026-08-06-compiler-target-plugin-kernel-goal-design.md`
- Plan: `docs/superpowers/plans/2026-08-06-compiler-target-plugin-kernel.md`
- Ledger: `docs/superpowers/ledgers/2026-08-06-compiler-target-plugin-kernel.md`

## Orientation

Read completely before changing product code:

1. `CLAUDE.md` and `AGENTS.md`
2. the Goal design
3. the implementation plan and Goal ledger when present
4. `docs/strategy/2026-08-02-graph-first-verified-application-factory.md`
5. `docs/roadmap.md` and the current top of `docs/project-status.md`
6. `docs/superpowers/ledgers/2026-08-01-typed-capability-binding-validation.md`
7. ADR-0006, ADR-0007, and ADR-0008
8. source and tests owned by the next incomplete task

The founder-approved design is the scope boundary. If its implementation plan
or ledger is missing, create them from the design, review them for internal
consistency, and continue. Keep the plan current when evidence changes the safe
implementation order. Do not stop for routine plan maintenance.

## Autonomous execution

Within the Goal, independently:

- inspect any non-sensitive repository source needed for understanding;
- choose cohesive architecture and responsibility-based file boundaries;
- add, edit, move, and delete files owned by the current plan task;
- run proportional tests, debug failures, and repair review findings;
- update the plan, ledger, status, and roadmap from observed evidence;
- invoke the configured reviewer, QA, release reviewer, and PM agents;
- create conventional commits and push each green iteration;
- continue to the next task without routine founder confirmation.

Use normal Claude Code, shell, package-manager, and Git tools. Do not use a
project-specific command wrapper. Prefer a feature branch or worktree, but do
not hard-code a branch or remote in the Goal. Before pushing, inspect the
current branch, remote, status, and intended diff. Never force-push, amend a
pushed commit, rewrite history, or push known-failing work.

Ask the founder only when work would change the approved outcome, a public
Graph or lifecycle contract, dependencies or external systems, credential
handling, or another declared stop condition.

## First dependency

Reconcile Typed Binding Task 2 with accepted Task 2A before plugin extraction.
Use fresh focused evidence to decide whether Task 2A closes Task 2's
repeated-read P1. Preserve the existing ledger state machine and ADRs. If a
repair remains necessary, complete only that bounded repair and its gates.

Do not begin the plugin kernel while Task 2 remains an unexplained
compiler-admission risk.

## Iteration loop

For each incomplete plan task:

1. Confirm owned paths, accepted dependencies, behavior, and evidence needed.
2. Start behavior changes with a focused failing test when practical and record
   the RED reason.
3. Implement the smallest coherent change that reaches GREEN.
4. Refactor after GREEN. Split by business or compiler responsibility, not an
   arbitrary line count, and avoid unrelated cleanup.
5. Run focused tests, affected-package typecheck and lint, formatting, and
   `git diff --check`. Expand regression and generated-runtime checks when the
   boundary changed warrants them.
6. Update the plan and ledger with safe observed evidence and known risks.
7. Review the intended diff, create a conventional commit, and push the current
   feature branch.
8. Invoke a fresh `factory-task-reviewer` against that commit. Repair P0/P1
   and P2 findings, create a new commit, and repeat review.
9. Invoke `factory-pm` to record `ready_for_qa` for the reviewed commit.
10. At a plan milestone or behavior boundary, run `factory-qa` against that
    commit. Repairs invalidate task review and every later gate.
11. Invoke `factory-pm` to record `reviewed` after QA passes.
12. Run `factory-release-reviewer` against the same commit, then invoke
    `factory-pm` to record acceptance when release review passes.
13. Record the accepted commit and exact safe test totals, commit and push the
    evidence update when needed, then continue.

The implementation context coordinates the loop but does not fabricate
independent evidence. Agent hand-offs are automatic; the founder does not relay
messages between them.

## Compiler decomposition

- Keep `packages/compiler/src/index.ts` as a thin public facade and temporary
  orchestration boundary.
- Put plugin contracts, registry, deterministic artifact rules, and fail-closed
  validation under `packages/compiler/src/core/`.
- Put target ownership under `packages/compiler/src/targets/documentation/`,
  `packages/compiler/src/targets/policy/`, and
  `packages/compiler/src/targets/database/`.
- Keep target behavior with focused tests and typed inputs/outputs.
- Do not create generic dumping grounds such as `helpers.ts` or `utils.ts`.
- Prefer new production files below 500 non-generated lines and functions below
  60 lines. Treat these as maintainability signals, not mechanical limits; log
  a responsibility-based reason for a cohesive exception.
- Do not mix Restaurant runtime, AI composition, fleet, deployment, new
  Profiles, or unrelated capability behavior into this Goal.

## Target parity

Migrate targets serially: documentation, policy, database. For each target:

1. Capture the legacy file set, bytes, and SHA-256 digests from fixed Published
   Graph fixtures.
2. Render through `supports -> plan -> render -> validate`.
3. Compare paths, bytes, and digests against the legacy output.
4. Fail closed on duplicate paths, traversal, unsupported targets,
   nondeterminism, validation failure, or unexplained drift.
5. Remove centralized renderer ownership only after parity passes.
6. Complete the task review and proportional milestone gates before starting
   the next target.

Only the immutable Published Graph, validated capability composition lock, and
explicit compiler context may drive output. Do not add profile-name semantic
branches.

## Verification

Use focused RED/GREEN tests for behavior changes. Before each iteration commit,
run focused tests plus affected-package typecheck, lint, formatting, and
`git diff --check`. Before final acceptance, run:

- the complete `@factory/compiler` suite;
- affected Graph, Capabilities, Control Plane, and Worker suites;
- documentation, policy, and database parity across all five Profiles;
- generated-application boot/migration smoke when runtime or migration bytes
  changed;
- repository formatting, secret-boundary, and provenance checks.

This Goal contains no AI product behavior, so a real model call is not useful
acceptance evidence for its deterministic compiler refactoring.

## Stop conditions

Return `GOAL_NEEDS_DECISION` with precise evidence only if:

- typed-binding governance requires changing an accepted contract or ADR;
- output drift remains unexplained;
- a public Graph, lifecycle, capability-lock, or output-slot change is needed;
- work requires a new dependency, external source, credential, provider call,
  deployment, or another Profile;
- unrelated changes overlap an owned file and cannot be preserved;
- remote history diverges or a push is rejected;
- the same unlocalized failure survives two evidence-led repair attempts.

Do not broaden scope merely to escape a stop condition.

## Completion

Return `GOAL_COMPLETE` only when the design and plan acceptance conditions are
met, required independent evidence is current, documentation agrees with the
implementation, the worktree is clean, and all Goal commits are on the selected
remote feature branch. Include commit hashes, verification commands and exact
totals, remaining product gaps, and the next recommended Goal.
