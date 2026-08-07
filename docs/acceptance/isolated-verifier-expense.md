# Isolated Verifier acceptance (Expense Approval)

## Required lifecycle proof

A queued verification job must accept only a Published Compilation ID, an
immutable artifact manifest, and a derived `verificationRunId`; compile that
immutable input; boot the generated application as an isolated Docker preview;
run the six bounded probes against it; report one safe evidence bundle and one
final status; and clean the preview up afterwards. Retries with the same job
identity must be idempotent. The proof is the Docker-backed acceptance command:

```
pnpm verify:isolated-verifier-expense
```

which is `node scripts/verify-isolated-verifier-expense.mjs` and performs the
full loop against real infrastructure:

1. Starts the dedicated infra stack (postgres + redis) in Docker.
2. Seeds a deterministic Published Compilation (the expense-approval
   composition with one `expense-fixture-01` draft record) into PostgreSQL;
   artifact digests are computed from the real generated bundle.
3. Starts the Control Plane and the Worker on the host (the probes reach the
   generated application through the host loopback, where Docker Desktop
   publishes the isolated preview).
4. Creates one verification run through the public API, waits for the terminal
   status, and asserts the allowlisted evidence: all seven steps passed,
   create/submit/approve/denial statuses 201/403/201/403, cleanup succeeded,
   no diagnosis persisted, and the preview project has no remaining
   containers.
5. Re-creates the run with the same identity and asserts the same terminal run
   and the same evidence digest are returned without re-enqueueing.
6. Boots the exact materialized bundle as a fresh preview and runs the
   generated application's own journey test suite against the generated
   database.

## Isolated runtime acceptance — passed

<!-- EVIDENCE -->

The run reached `succeeded` with the full seven-step plan and a sha256
evidence digest. The idempotency replay (submit a second time against the flow
state machine) returned `403` as the declared probe expects, and the employee
approval denial returned `403` against the session-bound deny-by-default
application. The preview project and its volumes were removed after the run.

## Deterministic checks

Worker, Control Plane, and Graph suites pass in full; both apps typecheck,
build, and lint clean (see the Task 6 ledger entry for the exact counts and
the two test adjustments recorded there: honest tampered-digest semantics and
the declared-clock determinism injection).

## Security and retention

No generated source, Published Graph content, credentials, prompts, or raw
probe bodies are persisted by the verification path or retained in this
record; all credentials used by the acceptance command are synthetic Factory
tokens generated per run; evidence summaries are allowlisted prose only. The
acceptance teardown restores the host (child processes terminated, infra
stack stopped) without removing existing volumes.
