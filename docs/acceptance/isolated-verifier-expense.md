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

Evidence from the green Docker-backed runs (`pnpm verify:isolated-verifier-expense`,
2026-08-07, exit 0 each). The first green run is recorded at commit `41fae0f`
(digest `sha256:062a8cdb76e752688fe0052f801466baf68e46c79a4a08a6e9ad2578b5a19520`),
the hardened harness re-ran green at `ee97b97` (digest
`sha256:5cd411e6baeb451559dae79d2b5e4e782c8dc1544597a96cd3bbb84153cfdefe`),
and the final acceptance re-run at the reviewed commit `924bd5b` returned the
values below — the acceptance evidence for the finalization. The compilation
artifact digest is byte-identical across the green runs, confirming
deterministic compilation:

- Terminal status: `succeeded`; no diagnosis persisted for a passing run.
- Evidence digest: `sha256:433b08523a0924033dd4c949ad2b2034e445c23ae1ae7c5c6703fb262819343f`.
- Compilation identity: `cmsj1uvkz0001w4eo7o1gfkad`, artifact digest
  `sha256:4c54683f8a3c12e0861528a17d83e484b11ef7e049be30c0e2a38d6fd6688ece`,
  profile `expense-approval`.
- Seven step IDs, all `passed`, in plan order:
  `migration`, `health`, `employee-creates-expense`,
  `employee-submits-expense`, `manager-approves-expense`,
  `employee-denied-approval`, `cleanup`.
- Journey HTTP statuses asserted by the harness: create `201`, idempotency
  replay `403`, approve `201`, authorization denial `403`.
- Idempotent retry: re-creating the run with the same identity returned the
  same terminal run and the same evidence digest without re-enqueueing.
- Preview cleanup succeeded; no `factory-preview-*` containers or volumes
  remained after the run.
- Generated journey tests: `passed` — the bundle's own
  `api/test/journey.generated.test.ts` suite ran inside the generated api
  image against the generated database (audit length 5, capability event
  pairs, and every declared transition assertion).
- Infra: postgres + redis in Docker; control plane + worker on the host.

The idempotency replay (submit a second time against the flow state machine)
returned `403` as the declared probe expects, and the employee approval denial
returned `403` against the session-bound deny-by-default application. The
preview project and its volumes were removed after the run.

## Deterministic checks

Worker (163, 16 files), Graph (103), Control Plane (150), and Compiler (330)
suites pass in full at the final commit `924bd5b`; both apps typecheck, build,
and lint clean (see the Task 6
ledger entry for the recorded test adjustments: honest tampered-digest
semantics, the declared-clock determinism injection, the generated journey
test following the runtime-returned record through the declared flow, and
the Compiler and Worker suites' vitest timeout configurations for
bundle-materialization headroom).

## Security and retention

No generated source, Published Graph content, credentials, prompts, or raw
probe bodies are persisted by the verification path or retained in this
record. Every per-run credential the harness generates is a synthetic Factory
token (worker token, redis password); the only static credential is the
dedicated infra stack's own local development `factory:factory` database URL,
which is local-only and never exported. Evidence summaries are allowlisted
prose only. The acceptance teardown restores the host (child processes
terminated, infra stack stopped) without removing existing volumes.
