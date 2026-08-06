# P0 Isolated Verifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify one immutable Compilation in a fully isolated generated application and return safe evidence plus a reviewable Draft Diff when a probe fails.

**Architecture:** Keep pure contracts and diagnosis rules in `packages/graph` or `packages/compiler`, and keep Docker/process orchestration in `apps/compiler-worker`. The Control Plane persists only the immutable run identity, allowlisted evidence, and proposed Draft Diff. The verifier composes the existing compilation executor and preview runner; it does not duplicate or bypass their filesystem and cleanup guards.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS Control Plane, BullMQ worker, Docker Compose, Prisma/PostgreSQL, existing generated Web/API fixtures.

## Global Constraints

- The only compilation input is an immutable Published Graph and locked package versions/digests.
- Draft -> Publish -> immutable Compilation remains the only lifecycle.
- No generated source, Published Graph, Compilation, credentials, raw prompts, or raw AI responses may be persisted by diagnosis or verification.
- All code and documentation are English.
- Use TDD, focused tests first, and responsibility-based file splits; do not grow a new monolithic worker or controller.
- Use the existing preview-runner/artifact-writer guards for path, digest, project-name, timeout, and cleanup enforcement.

---

### Task 1: Freeze verification contracts and evidence vocabulary

**Files:**

- Create: `packages/graph/src/verification.ts`
- Modify: `packages/graph/src/index.ts`
- Test: `packages/graph/test/verification-contract.test.ts`
- Create: `docs/superpowers/ledgers/2026-08-06-isolated-verifier.md` entries for Task 1

**Interfaces:**

- Produce `VerificationRunV1`, `VerificationEvidenceV1`, `VerificationStepV1`, `DiagnosisV1`, and `DraftDiffV1` Zod-backed types.
- `VerificationRunV1` includes `verificationRunId`, immutable `compilationDigest`, profile key, status, timestamps, and ordered step IDs.
- `VerificationEvidenceV1` contains only allowlisted step status, bounded summaries, artifact digests, and cleanup facts.
- `DraftDiffV1` contains a base mutable Draft revision, constrained operations, affected paths, rationale code, and no executable source.

- [x] Write failing tests for valid records, unknown step/status rejection, secret-like fields, raw prompt/response rejection, duplicate step IDs, and conflicting retry identity.
- [x] Run `pnpm --filter @factory/graph test -- verification-contract.test.ts`; confirm the new contract tests fail before implementation.
- [x] Implement the schemas with exact-key validation and bounded string/array limits; export only the public types from the package index.
- [x] Re-run the focused test, then `pnpm --filter @factory/graph typecheck` and `pnpm --filter @factory/graph lint`.
- [x] Commit only the contract and tests with message `feat: define isolated verification contracts`.

### Task 2: Build the isolated verification lifecycle

**Files:**

- Create: `apps/compiler-worker/src/verifier/verification-lifecycle.ts`
- Create: `apps/compiler-worker/src/verifier/verification-environment.ts`
- Modify: `apps/compiler-worker/src/preview-runner.ts` only when a small reusable export is needed
- Test: `apps/compiler-worker/test/verification-lifecycle.test.ts`

**Interfaces:**

- `VerificationEnvironment` exposes `boot`, `migrate`, `health`, `request`, and `cleanup`; each operation accepts the immutable run context and returns bounded evidence.
- `runVerificationLifecycle(input, dependencies)` returns a `VerificationEvidenceV1` and always invokes cleanup in `finally`.
- The lifecycle rejects mutable Draft input, untrusted artifact paths, mismatched compilation digests, and unbounded timeouts before Docker starts.

- [x] Add failing tests for step order, timeout/cancellation cleanup, digest mismatch, path escape, and cleanup failure reporting.
- [x] Run the focused test and confirm failure.
- [x] Implement the smallest adapter over `executeCompilation`, `startPreviewRun`, and `stopPreviewRun`; do not duplicate Docker command construction.
- [x] Re-run focused tests plus existing `pnpm --filter @factory/compiler-worker test`.
- [x] Commit with message `feat: add isolated verification lifecycle`.

### Task 3: Add migration, API, role, denial, and idempotency probes

**Files:**

- Create: `apps/compiler-worker/src/verifier/probes.ts`
- Create: `apps/compiler-worker/src/verifier/role-journey.ts`
- Test: `apps/compiler-worker/test/verification-probes.test.ts`
- Reuse read-only fixtures under `packages/compiler/test/` and generated profile fixture helpers.

**Interfaces:**

- `runMigrationProbe`, `runHealthProbe`, `runApiProbe`, `runRoleJourneyProbe`, `runAuthorizationDenialProbe`, and `runIdempotencyProbe` each return one bounded `VerificationStepV1`.
- Role journeys are declared fixture data: principal role, route/action, expected status, and idempotency key; they never accept arbitrary URLs or code.

- [x] Write failing tests for successful Expense or Ecommerce submission, approval/payment role denial, repeated idempotency key, malformed response redaction, and unknown route rejection.
- [x] Run focused tests and confirm failure.
- [x] Implement fixture-driven HTTP probes with an allowlisted route/action registry and response summaries only.
- [x] Re-run focused probes and the relevant existing profile runtime suites.
- [x] Commit with message `feat: verify generated application journeys`.

### Task 4: Implement deterministic diagnosis and reviewable Draft Diff

**Files:**

- Create: `packages/graph/src/diagnosis.ts`
- Modify: `packages/graph/src/index.ts`
- Create: `apps/compiler-worker/src/verifier/diagnosis.ts`
- Test: `packages/graph/test/diagnosis-contract.test.ts`
- Test: `apps/compiler-worker/test/verification-diagnosis.test.ts`

**Interfaces:**

- `diagnoseVerification(evidence, graphSnapshot, compositionLock)` returns `DiagnosisV1` with category, stable code, affected Graph paths, and a constrained `DraftDiffV1` or `null`.
- Allowed diff operations are `replace-input`, `add-binding`, `remove-binding`, and `change-constraint`; no source path, URL, credential, shell command, or arbitrary JSON patch is accepted.

- [ ] Write failing tests for each diagnosis category, no-diff unknown failures, immutable Published Graph protection, and hostile evidence fields.
- [ ] Run both focused suites and confirm failure.
- [ ] Implement deterministic mappings from step codes to diff operations; preserve only hashes and safe summaries.
- [ ] Re-run focused suites and graph package gates.
- [ ] Commit with message `feat: add safe verification diagnosis`.

### Task 5: Persist run evidence and expose review APIs

**Files:**

- Modify: `apps/control-plane/prisma/schema.prisma`
- Create: `apps/control-plane/src/verification/verification.service.ts`
- Create: `apps/control-plane/src/verification/verification.controller.ts`
- Modify: `apps/control-plane/src/app.module.ts`
- Test: `apps/control-plane/test/verification.service.test.ts`
- Test: `apps/control-plane/test/verification.controller.test.ts`

**Interfaces:**

- Persist immutable run identity, status transitions, evidence digest, diagnosis, and Draft Diff proposal; do not persist raw request/response material.
- Endpoints are read/review oriented: create run from a Published Compilation, get bounded status/evidence, and approve a Draft Diff into a mutable Draft revision through the existing lifecycle service.

- [ ] Write failing tests for ownership of compilation identity, idempotent retry, illegal status transition, redaction, and approval refusal for invalid diffs.
- [ ] Run focused Control Plane tests and confirm failure.
- [ ] Implement Prisma migration and service/controller using existing lifecycle validation and reporter patterns.
- [ ] Run focused tests, typecheck, lint, and build for `@factory/control-plane`.
- [ ] Commit with message `feat: expose verification evidence review`.

### Task 6: Integrate the Worker queue and one end-to-end profile

**Files:**

- Modify: `apps/compiler-worker/src/main.ts` and queue registration files
- Create: `apps/compiler-worker/src/verifier/verification-job.ts`
- Create: `apps/compiler-worker/test/verification-job.test.ts`
- Create or modify: one deterministic acceptance fixture under `apps/compiler-worker/test/fixtures/`
- Create: `docs/acceptance/isolated-verifier-expense.md` or `docs/acceptance/isolated-verifier-ecommerce.md`

**Interfaces:**

- A queued verification job accepts only a Published Compilation ID, immutable artifact manifest, and derived `verificationRunId`.
- The job emits one safe evidence bundle and one final status; retries with the same identity are idempotent.

- [ ] Write failing integration tests for compile-to-cleanup, authorization denial, idempotency replay, diagnosis proposal, and immutable-state snapshots.
- [ ] Run the focused integration test and confirm failure.
- [ ] Wire the job to Control Plane reporting and the existing BullMQ worker without accepting arbitrary job payload keys.
- [ ] Run the selected profile’s generated-app tests, worker tests, Control Plane tests, and the Docker-backed acceptance command.
- [ ] Commit with message `feat: run isolated verifier end to end`.

### Task 7: Independent gates, documentation, and release hand-off

**Files:**

- Modify: `docs/project-status.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/ledgers/2026-08-06-isolated-verifier.md`
- Create: `docs/acceptance/isolated-verifier-release.md`

**Interfaces:**

- The release record maps every completion criterion to a command, result, commit, and evidence path.

- [ ] Run package tests, affected application tests, typecheck, lint, build, secret-boundary scan, `git diff --check`, and the Docker-backed profile verifier.
- [ ] Record task-review, QA, release-review, and PM transitions in the ledger; unresolved P0/P1/P2 findings block completion.
- [ ] Update roadmap/status so the next smallest slice is staged AI composition only after verifier acceptance.
- [ ] Commit docs and release evidence with message `docs: accept isolated verifier goal`.
- [ ] Push the current branch and verify the accepted commit is remote reachable; write `GOAL_COMPLETE` only after all gates pass.
