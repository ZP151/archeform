# P0 Isolated Verifier Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the interrupted isolated-verifier Task 6, prove it against real Docker infrastructure, and complete the independent release gates.

**Architecture:** Treat the current uncommitted Task 6 files as the implementation under review. Keep immutable Compilation input, worker execution, safe evidence, and Control Plane status transitions separate. Reuse the existing preview runner and artifact guards; add only the smallest terminal-status repair required by observed evidence.

**Tech Stack:** TypeScript, NestJS, BullMQ, Prisma/PostgreSQL, Redis, Docker Compose, Vitest, Node scripts.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation.
- Do not compile or verify a mutable Draft.
- Do not replace the Docker acceptance with mocks or fixtures.
- Never persist credentials, raw prompts/responses, raw HTTP bodies, unrestricted process output, or untrusted paths.
- Keep all code and documentation in English.
- Do not force-push, amend, reset, or delete the interrupted work.
- Every green implementation iteration receives focused tests, a conventional commit, and a push before the next independent gate.

---

### Task 1: Reconcile and review the interrupted Task 6 tree

**Files:**

- Review: `apps/compiler-worker/src/verifier/verification-job.ts`
- Review: `apps/compiler-worker/src/verifier/verification-profiles.ts`
- Review: `apps/compiler-worker/src/verification-reporter.ts`
- Review: `apps/compiler-worker/src/main.ts`
- Review: `apps/control-plane/src/verification-run-queue.ts`
- Review: `apps/control-plane/src/verification/verification.service.ts`
- Review: `scripts/verify-isolated-verifier-expense.mjs`
- Test: the existing Task 6 tests under `apps/compiler-worker/test/` and `apps/control-plane/test/`

**Interfaces:**

- Preserve `executeQueuedVerificationRun`, `VerificationRunQueue.enqueue`, and
  `VerificationService.createRun` as the immutable job boundary.
- The acceptance script remains the only authoritative real-runtime proof.

- [ ] Run `git diff --check` and inspect every changed/untracked path; reject unrelated edits.
- [ ] Run the focused suites: `pnpm --filter @factory/compiler-worker test`, `pnpm --filter @factory/control-plane test`, and `pnpm --filter @factory/graph test`.
- [ ] Run both app typechecks and Prettier checks; record exact totals in the continuation ledger.
- [ ] Write a failing test for any concrete defect found during review before changing product code.
- [ ] Commit the reviewed Task 6 implementation with message `feat: integrate isolated verifier acceptance` only after the focused gates are green.

### Task 2: Close the pending-run failure boundary

**Files:**

- Modify: `apps/compiler-worker/src/main.ts` or the narrow worker job adapter that owns failure reporting
- Modify: `apps/control-plane/src/verification/verification.service.ts` only if the existing report API needs a bounded failure record
- Test: `apps/compiler-worker/test/verification-job.test.ts`
- Test: `apps/control-plane/test/verification.service.test.ts`

**Interfaces:**

- A worker exception after a run is created must produce one safe terminal failure report, or a bounded explicit retry status that the API and acceptance harness can observe.
- The failure record may contain only an allowlisted diagnostic code and no process output.

- [ ] Reproduce the current handler-failure behavior with a dependency that throws after enqueue; assert the run does not remain silently `pending`.
- [ ] Run the new focused tests and confirm RED on the interrupted implementation.
- [ ] Implement the smallest fail-closed mapping using existing reporter/service contracts; do not add a second lifecycle or arbitrary error transport.
- [ ] Re-run focused tests, full Worker/Control Plane suites, typechecks, and lint.
- [ ] Commit and push with message `fix: terminate failed verification jobs safely`.

### Task 3: Execute real Docker acceptance and repair only reproducible failures

**Files:**

- Modify: `scripts/verify-isolated-verifier-expense.mjs` only for a reproduced infrastructure/product defect
- Modify: `docs/acceptance/isolated-verifier-expense.md`
- Test: the Docker command `pnpm verify:isolated-verifier-expense`

**Interfaces:**

- The command must start isolated PostgreSQL/Redis, compile the stored Published Graph, queue the verifier, prove all seven steps, assert denial/idempotency, run generated journey tests, and clean all preview resources.

- [ ] Confirm Docker Desktop server availability with `docker version`; if unavailable, stop this task without weakening the gate and record the exact daemon error.
- [ ] Run `pnpm verify:isolated-verifier-expense` from a clean host state.
- [ ] For each failure, preserve bounded stdout/stderr evidence, write a focused regression first, then fix the smallest owner.
- [ ] Re-run from a fresh slate until the command exits 0 and teardown leaves no verifier project, generated test project, or owned artifact directory.
- [ ] Replace the acceptance document placeholder with the actual bounded result: run ID, evidence digest shape, seven step IDs, generated test result, and cleanup result; exclude secrets and raw logs.
- [ ] Commit and push with message `test: accept isolated verifier against Docker`.

### Task 4: Independent release hand-off

**Files:**

- Modify: `docs/superpowers/ledgers/2026-08-07-isolated-verifier-finalization.md`
- Modify: `docs/superpowers/ledgers/2026-08-06-isolated-verifier.md` only to cross-link final Task 6/7 evidence
- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Create: `docs/acceptance/isolated-verifier-release.md`

**Interfaces:**

- The ledger maps each criterion to one concrete commit, command, result, and evidence path.

- [ ] Run the complete affected repository gates, secret/provenance checks, `git diff --check`, and the Docker acceptance again at the final commit.
- [ ] Obtain independent task review, QA, release review, and PM acceptance; any P0/P1/P2 finding reopens the owning task.
- [ ] Update status so the next Goal is staged AI composition and capability-family expansion only after this P0 acceptance.
- [ ] Commit and push the release evidence with message `docs: accept isolated verifier finalization`.
- [ ] Verify a clean worktree and remote reachability, then record `GOAL_COMPLETE`.
