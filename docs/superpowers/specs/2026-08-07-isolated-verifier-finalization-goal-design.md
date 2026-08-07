---
Date: 2026-08-07
Status: Approved
Approved-By: Founder
Required-Plan: docs/superpowers/plans/2026-08-07-isolated-verifier-finalization.md
Required-Ledger: docs/superpowers/ledgers/2026-08-07-isolated-verifier-finalization.md
---

# P0 Isolated Verifier Finalization Goal Design

## Outcome

Finish and independently accept the interrupted Task 6 implementation on the
current `feat/isolated-verifier` branch. The Goal must turn the existing
worker, queue, Control Plane, profile fixture, and acceptance script changes
into a committed and reproducible product boundary:

```text
immutable Compilation
  -> queued worker job
  -> isolated Docker preview
  -> migration / health / API / role / denial / idempotency probes
  -> cleanup
  -> safe evidence and optional Draft Diff
  -> terminal Control Plane status
```

This is a finalization Goal, not a new architecture or profile expansion Goal.

## Current evidence and interruption boundary

- Branch `feat/isolated-verifier` is 25 commits ahead of its remote and has
  uncommitted Task 6 changes.
- Task 1–5 are accepted in
  `docs/superpowers/ledgers/2026-08-06-isolated-verifier.md`.
- Current focused evidence is green: Worker 153/153, Control Plane 149/149,
  Graph 102/102, and Worker/Control Plane typechecks pass.
- Docker Desktop was unavailable during the last inspection, so the real
  acceptance command was not run to completion and the Goal is not accepted.
- The existing ledger records a residual risk: a BullMQ handler failure can
  leave a verification run at `pending` without a terminal failure report.

## Scope

### Included

- Preserve and review the current uncommitted Task 6 implementation.
- Close the worker-job failure-to-terminal-status gap with fail-closed evidence
  and tests, or document a concrete reason why the existing reporter path proves
  the gap impossible.
- Run the real Docker-backed Expense acceptance command from a clean host
  state, including generated journey tests, retry identity, and preview cleanup.
- Complete Task 6 and Task 7 independent task-review, QA, release-review, and
  PM transitions with exact command evidence.
- Commit and push every green iteration without rewriting history.

### Excluded

- New capability families, Profiles, external-source intake, P1 AI composition,
  Workbench redesign, cloud deployment, real identity, or real payments.
- Skipping Docker by replacing the acceptance command with fixtures or mocks.
- Marking the Goal complete while Docker is unavailable, the worktree is dirty,
  or any gate lacks a concrete commit and test result.

## Completion criteria

1. The current Task 6 changes are either committed as reviewed product code or
   discarded only with a documented reason; no untracked implementation remains.
2. Worker and Control Plane job failures cannot strand a run at `pending`; a
   deterministic terminal `failed` record or an explicitly surfaced retry state
   is covered by tests and preserves safe redaction.
3. `pnpm verify:isolated-verifier-expense` passes against real Docker Desktop:
   compilation succeeds, all seven evidence steps pass, role and denial status
   assertions pass, retry evidence is identical, generated journey tests pass,
   and preview containers/volumes are removed.
4. The evidence record contains no credentials, raw prompts/responses, raw HTTP
   bodies, unrestricted process output, or untrusted paths.
5. Fresh task review, QA, release review, and PM acceptance cite the same
   remote-reachable commit; the final ledger records `GOAL_COMPLETE`.

## Stop conditions

Return `GOAL_NEEDS_DECISION` with command output if implementation requires a
new public contract, dependency, lifecycle change, destructive history action,
credential handling change, or scope expansion. Docker unavailability is not a
product acceptance result; leave the Goal active and report the exact daemon
error instead of weakening the acceptance gate.
