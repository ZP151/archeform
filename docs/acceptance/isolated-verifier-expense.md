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

which is `node scripts/verify-isolated-verifier-profile.mjs expense-approval`
(the profile-parameterized harness; `simple-ecommerce` and
`restaurant-ordering` are sibling profiles in the same command) and performs
the full loop against real infrastructure:

1. Starts the dedicated infra stack (postgres + redis) in Docker.
2. Seeds a deterministic Published Compilation (the expense-approval
   composition with one `expense-fixture-01` draft record) into PostgreSQL;
   artifact digests are computed from the real generated bundle.
3. Starts the Control Plane and the Worker on the host (the probes reach the
   generated application through the host loopback, where Docker Desktop
   publishes the isolated preview). A control-plane boot failure prints the
   captured bounded tail before teardown, so a recurrence is self-diagnosing.
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

Evidence from the green Docker-backed run at the reviewed commit `a4e835c1`
(`pnpm verify:isolated-verifier-expense`, 2026-08-08, exit 0). Earlier green
runs at `41fae0f` / `ee97b97` / `924bd5b` (previous goal) pinned digests
`062a8cdb…19520` / `5cd411e6…3cfdefe` / `433b0852…26343f`; the 2026-08-08
re-run regenerated the record after Batch 0/1 compiler and manifest changes
changed the deterministic bundle, so the values below are the current
acceptance evidence:

- Terminal status: `succeeded`; no diagnosis persisted for a passing run.
- Evidence digest: `sha256:3eae39b93e336b5f3f8a062bae3b259f0d91e4c9aa142d0ecf3cb2537b681323`.
- Compilation identity: `cmsjmb0zc0001w4nks425h1a0`, artifact digest
  `sha256:47231da9b55d307532953d7e2e08bab2091094b2aa723f5bf75fe330fe585e95`,
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

## Regression this re-run surfaced and closed

The first re-run attempt failed at control-plane boot: the Worker-side
`CompositionService` (Task 3 of this Goal) imported `PrismaService` as a
type-only import, which degrades Nest's `design:paramtypes` metadata to
`Function` and makes the application unbootable ("Nest can't resolve
dependencies of the CompositionService"). Unit suites could not observe it
(vitest's esbuild transform emits no decorator metadata), which is why the
real Docker boot path was the first to surface it.

Closed at `a4e835c1` with a one-line value-import fix plus a
DI-metadata regression test (`apps/control-plane/test/composition-di.test.ts`)
that asserts the compiled module's first constructor parameter resolves to the
`PrismaService` class — the package `test` script now builds before running
so the suite always checks compiled output. The control-plane boot was
verified against real infrastructure (`/health` 200) before the re-run, and
the re-run above then passed the full loop end-to-end.

## Deterministic checks

Worker (182, 16 files) and Control Plane (184, 18 files) suites pass in full
at the reviewed commit `a4e835c1`; both apps typecheck, build, and lint clean
(see the Task 6 Batch 2 ledger entry for the recorded test adjustments:
profile and fixture tests for the two new acceptance profiles, the
role-journey header fail-closed contract, probe fixtures moved from the
aspirational `order.place`/`order.capture-payment` routes to the real flow
events, and the control-plane DI-metadata regression).

## Security and retention

No generated source, Published Graph content, credentials, prompts, or raw
probe bodies are persisted by the verification path or retained in this
record. Every per-run credential the harness generates is a synthetic Factory
token (worker token, redis password); the only static credential is the
dedicated infra stack's own local development `factory:factory` database URL,
which is local-only and never exported. The Restaurant profile's demo table
token is the worker's authored fixture constant, set verbatim into the worker
and generated-preview environments — never read from the ambient machine.
Evidence summaries are allowlisted prose only. The acceptance teardown
restores the host (child processes terminated, infra stack stopped) without
removing existing volumes.
